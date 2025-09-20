# Video Editing App Frontend (React Native + Expo)

This is the frontend application for the video editing app. It allows users to upload videos, add various overlays (text, images, and video clips), and submit them for backend processing.

## Features

- Upload videos from device storage
- Add and position text overlays
- Add and position image overlays
- Add and position video clip overlays
- Set timing for when overlays appear and disappear
- Preview video with overlays (frontend rendering)
- Submit video for backend processing
- Check processing status
- Download and view processed video

## Requirements

- Node.js 14+
- Expo CLI
- React Native

## Installation

1. Install dependencies:

```bash
npm install
```

2. Update the API URL:

Edit the `config.js` file to update the backend API URL. If running on a physical device, make sure to use your computer's local IP address instead of localhost.

## Running the App

Start the Expo development server:

```bash
npm start
```

Then:
- Press 'a' to open in an Android emulator
- Press 'i' to open in an iOS simulator
- Scan the QR code with Expo Go app on a physical device

## Project Structure

- `/screens` - Main app screens (Home, Editor, Rendering)
- `/components` - Reusable UI components
- `/assets` - Static assets like images
- `api.js` - API client for communicating with backend
- `config.js` - Configuration settings
- `App.js` - Main application entry point

## Usage Flow

1. Launch app and select a video from device storage
2. Add text, image, or video overlays to the video
3. Position overlays by dragging them on the screen
4. Set timing for when overlays should appear/disappear
5. Submit for processing
6. Monitor processing status
7. Download and view the final rendered video