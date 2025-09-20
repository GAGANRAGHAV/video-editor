# 🎥 Video Editing App

A full-stack video editing application where users can upload videos, add overlays (text, images, video clips), and render the edited video on the backend.

## Project Structure

The project is divided into two main parts:

- `/backend` - FastAPI server for processing videos with ffmpeg
- `/frontend` - React Native + Expo application for the mobile UI

## Backend (FastAPI + ffmpeg)

### Features
- Upload video files
- Process videos with text, image, and video overlays
- Track processing status
- Download rendered videos

### Requirements
- Python 3.7+
- FastAPI
- ffmpeg (must be installed separately)
- Uvicorn

### Setup and Running

1. Install dependencies:
```bash
cd backend
pip install fastapi uvicorn python-multipart
```

2. Install ffmpeg:
   - Windows: Download from https://ffmpeg.org/download.html and add to PATH
   - Linux: `sudo apt-get install ffmpeg`
   - macOS: `brew install ffmpeg`

3. Start the server:
```bash
python main.py
```

The server will run on `http://localhost:8000`

### API Endpoints
- `POST /upload` - Upload a video and overlay metadata
- `GET /status/{job_id}` - Check processing status
- `GET /result/{job_id}` - Download the final rendered video

## Frontend (React Native + Expo)

### Features
- Video selection from device storage
- Add and position text overlays
- Add and position image and video overlays
- Set timing for when overlays appear and disappear
- Real-time preview of overlays on video
- Status tracking for backend processing
- Download and view processed videos

### Requirements
- Node.js 14+
- Expo CLI
- React Native

### Setup and Running

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Update API URL:
Edit `config.js` and set the correct IP address for your backend server.

3. Start the Expo development server:
```bash
npm start
```

4. Run on a device:
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator
   - Scan QR code with Expo Go app on physical device

## Usage Flow

1. Start both the backend server and frontend app
2. On the mobile app, select a video from your device
3. Add text, image or video overlays to the video
4. Position overlays by dragging them on the screen
5. Set when overlays should appear and disappear
6. Submit the video for processing
7. Monitor the processing status
8. Download and view the final rendered video

## Notes

- For demo purposes, you can use the example videos, images and clips provided in the Google Drive link from the assignment description.
- The backend needs to have write permissions to create upload/results/temp directories.
- When testing on a physical device, make sure your device and development machine are on the same network, and use the correct IP address in the config file.