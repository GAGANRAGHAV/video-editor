import os
import uuid
import shutil
import subprocess
import time
from typing import Dict, List, Optional, Union
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
from enum import Enum
import json

app = FastAPI(title="Video Editing API")

# Create necessary directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("results", exist_ok=True)
os.makedirs("temp", exist_ok=True)
os.makedirs("overlays", exist_ok=True)

# In-memory job storage (replace with a database in production)
jobs = {}

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class OverlayType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"

class OverlayMetadata(BaseModel):
    id: str
    type: OverlayType
    content: str  # Text content or file path for images/videos
    position_x: float  # X position (0-1, percentage of video width)
    position_y: float  # Y position (0-1, percentage of video height)
    start_time: float  # When overlay appears (seconds)
    end_time: float  # When overlay disappears (seconds)
    width: Optional[float] = None  # Width (0-1, percentage of video width)
    height: Optional[float] = None  # Height (0-1, percentage of video height)
    font_size: Optional[int] = None  # For text overlays
    font_color: Optional[str] = None  # For text overlays, hex format

class Job(BaseModel):
    id: str
    status: JobStatus
    video_path: str
    overlays: List[OverlayMetadata]
    result_path: Optional[str] = None
    error: Optional[str] = None
    created_at: float
    completed_at: Optional[float] = None

@app.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    overlays_json: str = Form(...)
):
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Parse overlays metadata
    try:
        overlays_data = json.loads(overlays_json)
        overlays = [OverlayMetadata(**overlay) for overlay in overlays_data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid overlay metadata: {str(e)}")
    
    # Save the uploaded video
    video_path = f"uploads/{job_id}_{video.filename}"
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
    # Create job record
    job = Job(
        id=job_id,
        status=JobStatus.PENDING,
        video_path=video_path,
        overlays=overlays,
        created_at=time.time()
    )
    jobs[job_id] = job
    
    # Start processing in the background
    background_tasks.add_task(process_video, job_id)
    
    return {"job_id": job_id, "status": "pending"}

@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    return {
        "job_id": job_id,
        "status": job.status,
        "created_at": job.created_at,
        "completed_at": job.completed_at if job.status in [JobStatus.COMPLETED, JobStatus.FAILED] else None,
        "error": job.error if job.status == JobStatus.FAILED else None
    }

@app.get("/result/{job_id}")
async def get_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"Job is not completed yet. Current status: {job.status}")
    
    if not os.path.exists(job.result_path):
        raise HTTPException(status_code=500, detail="Result file not found")
    
    return FileResponse(
        path=job.result_path,
        filename=os.path.basename(job.result_path),
        media_type="video/mp4"
    )

def process_video(job_id: str):
    """Process video with overlays using ffmpeg"""
    job = jobs[job_id]
    job.status = JobStatus.PROCESSING
    
    try:
        # Prepare result path
        result_path = f"results/{job_id}_result.mp4"
        
        # Get video dimensions
        ffprobe_cmd = [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height", "-of", "json",
            job.video_path
        ]
        
        probe_result = subprocess.run(
            ffprobe_cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        
        if probe_result.returncode != 0:
            raise Exception(f"Failed to get video info: {probe_result.stderr}")
        
        video_info = json.loads(probe_result.stdout)
        video_width = int(video_info["streams"][0]["width"])
        video_height = int(video_info["streams"][0]["height"])
        
        # Process each overlay
        filter_complex = []
        input_count = 1  # Start with 1 (the main video)
        
        for idx, overlay in enumerate(job.overlays):
            if overlay.type == OverlayType.TEXT:
                # Text overlay
                text = overlay.content.replace("'", "\\'")
                
                # Calculate position in pixels
                pos_x = int(overlay.position_x * video_width)
                pos_y = int(overlay.position_y * video_height)
                
                # Create text filter
                font_size = overlay.font_size or 24
                font_color = overlay.font_color or "white"
                
                # Use the drawtext filter with enable expression for timing
                filter_complex.append(
                    f"drawtext=text='{text}':fontsize={font_size}:fontcolor={font_color}:"
                    f"x={pos_x}:y={pos_y}:"
                    f"enable='between(t,{overlay.start_time},{overlay.end_time})'"
                )
            
            elif overlay.type in [OverlayType.IMAGE, OverlayType.VIDEO]:
                # Save overlay content to a file if it's not already a file path
                overlay_path = f"overlays/{job_id}_{overlay.id}{'.mp4' if overlay.type == OverlayType.VIDEO else '.png'}"
                
                # For demo purposes, we assume overlay.content contains the file path
                # In a real app, you might need to handle base64 encoded data or URLs
                shutil.copy(overlay.content, overlay_path)
                
                # Calculate position and size in pixels
                pos_x = int(overlay.position_x * video_width)
                pos_y = int(overlay.position_y * video_height)
                
                width = int((overlay.width or 0.2) * video_width)  # Default to 20% of video width
                height = int((overlay.height or 0.2) * video_height)  # Default to 20% of video height
                
                # Add input file
                input_idx = input_count
                input_count += 1
                
                # Create scale filter
                scale_filter = f"[{input_idx}:v]scale={width}:{height}[overlay{idx}]"
                filter_complex.append(scale_filter)
                
                # Create overlay filter with timing
                overlay_filter = (
                    f"[0:v][overlay{idx}]overlay={pos_x}:{pos_y}:"
                    f"enable='between(t,{overlay.start_time},{overlay.end_time})'[v{idx}]"
                )
                filter_complex.append(overlay_filter)
                
                # Update main video stream reference
                if idx < len(job.overlays) - 1:
                    filter_complex[-1] = filter_complex[-1].replace("[v{idx}]", f"[v{idx+1}]")
                else:
                    filter_complex[-1] = filter_complex[-1].replace("[v{idx}]", "[vout]")
        
        # Prepare ffmpeg command
        ffmpeg_cmd = ["ffmpeg", "-y", "-i", job.video_path]
        
        # Add additional input files for images and videos
        for overlay in job.overlays:
            if overlay.type in [OverlayType.IMAGE, OverlayType.VIDEO]:
                ffmpeg_cmd.extend(["-i", overlay.content])
        
        # Add filter complex
        if filter_complex:
            ffmpeg_cmd.extend(["-filter_complex", ";".join(filter_complex)])
            ffmpeg_cmd.extend(["-map", "[vout]"])
            ffmpeg_cmd.extend(["-map", "0:a?"])  # Map audio if present
        
        # Add output file
        ffmpeg_cmd.extend(["-c:v", "libx264", "-preset", "medium", result_path])
        
        # Run ffmpeg
        process = subprocess.run(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if process.returncode != 0:
            raise Exception(f"FFmpeg error: {process.stderr}")
        
        # Update job status
        job.status = JobStatus.COMPLETED
        job.result_path = result_path
        job.completed_at = time.time()
    
    except Exception as e:
        # Handle errors
        job.status = JobStatus.FAILED
        job.error = str(e)
        job.completed_at = time.time()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)