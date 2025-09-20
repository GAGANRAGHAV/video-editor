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

# Add CORS middleware for frontend communication
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Video Editing API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Backend is reachable"}

# Create necessary directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("results", exist_ok=True)
os.makedirs("temp", exist_ok=True)
os.makedirs("overlays", exist_ok=True)

# In-memory job storage
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
    content: str
    position_x: float
    position_y: float
    start_time: float
    end_time: float
    width: Optional[float] = None
    height: Optional[float] = None
    font_size: Optional[int] = None
    font_color: Optional[str] = None

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
    overlays: str = Form(...)  # Changed from overlays_json
):
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Parse overlays metadata
    try:
        overlays_data = json.loads(overlays)
        overlay_list = [OverlayMetadata(**overlay) for overlay in overlays_data]
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
        overlays=overlay_list,
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
        # Check if ffmpeg is available
        try:
            subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise Exception("FFmpeg is not installed or not in PATH. Please install FFmpeg.")
        
        # Prepare result path
        result_path = f"results/{job_id}_result.mp4"
        
        if not job.overlays:
            # No overlays, just copy the original video
            shutil.copy(job.video_path, result_path)
        else:
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
            
            # Build FFmpeg command
            ffmpeg_cmd = ["ffmpeg", "-y", "-i", job.video_path]
            
            # Process text overlays using drawtext filter
            text_filters = []
            for overlay in job.overlays:
                if overlay.type == OverlayType.TEXT:
                    text = overlay.content.replace("'", "\\'").replace(":", "\\:")
                    pos_x = int(overlay.position_x * video_width)
                    pos_y = int(overlay.position_y * video_height)
                    font_size = overlay.font_size or 24
                    font_color = overlay.font_color or "white"
                    
                    text_filter = (
                        f"drawtext=text='{text}':fontsize={font_size}:fontcolor={font_color}:"
                        f"x={pos_x}:y={pos_y}:"
                        f"enable='between(t,{overlay.start_time},{overlay.end_time})'"
                    )
                    text_filters.append(text_filter)
            
            if text_filters:
                # Apply text overlays
                filter_complex = ",".join(text_filters)
                ffmpeg_cmd.extend(["-vf", filter_complex])
            
            # Add output settings
            ffmpeg_cmd.extend(["-c:v", "libx264", "-preset", "medium", "-c:a", "copy", result_path])
            
            # Run ffmpeg
            print(f"Running FFmpeg command: {' '.join(ffmpeg_cmd)}")
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
        print(f"Job {job_id} completed successfully. Result saved to: {result_path}")
    
    except Exception as e:
        print(f"Error processing job {job_id}: {str(e)}")
        job.status = JobStatus.FAILED
        job.error = str(e)
        job.completed_at = time.time()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)