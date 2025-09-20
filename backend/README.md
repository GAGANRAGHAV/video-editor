# Video Editing App Backend (FastAPI)

This is the backend server for the video editing application. It provides endpoints for uploading videos, processing them with overlays, and retrieving the rendered results.

## Requirements

- Python 3.7+
- FastAPI
- FFmpeg (must be installed and available in PATH)
- Uvicorn

## Installation

```bash
pip install fastapi uvicorn python-multipart
```

Make sure you have FFmpeg installed:
- Windows: Download from https://ffmpeg.org/download.html and add to PATH
- Linux: `sudo apt-get install ffmpeg`
- macOS: `brew install ffmpeg`

## Usage

Start the server:

```bash
python main.py
```

The server will run on `http://localhost:8000`

## API Endpoints

- `POST /upload` - Upload a video and overlay metadata
- `GET /status/{job_id}` - Check processing status
- `GET /result/{job_id}` - Download the final rendered video

## Directory Structure

- `/uploads` - Stores uploaded videos
- `/overlays` - Stores overlay files (images, videos)
- `/results` - Stores rendered output videos
- `/temp` - Temporary files for processing