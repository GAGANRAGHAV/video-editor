# Video Editor App

A React Native/Expo application that allows users to create and edit videos with text, image, and video overlays.

## Features

- **Video Selection**: Choose videos from device library or record new ones
- **Video Overlay System**: Add text, images, and video overlays to your videos
- **Real-time Preview**: See your overlays while editing with timeline control
- **Timing Control**: Set precise start and end times for each overlay
- **Real API Integration**: Upload videos to backend for processing
- **Status Polling**: Real-time updates on video processing progress
- **Video Download**: Download processed videos and save to device photo library

## Technical Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Video Playback**: expo-av
- **Media Picker**: expo-image-picker
- **File System**: expo-file-system
- **Media Library**: expo-media-library
- **UI Components**: React Native core components + custom styling
- **Slider**: @react-native-community/slider
- **Gesture Handling**: react-native-gesture-handler
- **UUID Generation**: react-native-uuid

## Project Structure

```
MyApp/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Main home screen with video editor link
│   │   └── explore.tsx        # Explore tab (default Expo content)
│   ├── video-home.tsx         # Video selection screen
│   ├── video-editor.tsx       # Main video editing interface
│   ├── video-rendering.tsx    # Processing and download screen
│   └── _layout.tsx            # App navigation layout
├── screens/                   # Legacy screens (for reference)
├── api.js                     # API functions for backend communication
├── config.js                  # API configuration and endpoints
└── README.md                  # This file
```

## API Integration

The app connects to a backend API with the following endpoints:

- `POST /upload` - Upload video with overlay metadata
- `GET /status/{jobId}` - Check processing status
- `GET /result/{jobId}` - Download processed video

### API Configuration

Edit `config.js` to set your backend URL:

```javascript
export const API_BASE_URL = 'http://your-server:8000';
```

For local development:
- Emulator: `http://localhost:8000`
- Physical device: `http://YOUR_LOCAL_IP:8000`

## Video Editor Features

### 1. Video Selection Screen (`video-home.tsx`)
- Choose from device library
- Record new video with camera
- Automatic permission handling

### 2. Video Editor Screen (`video-editor.tsx`)
- Video preview with native controls
- Timeline scrubber for navigation
- Add multiple overlay types:
  - **Text Overlays**: Custom text with positioning
  - **Image Overlays**: Photos from device library
  - **Video Overlays**: Short clips as overlays
- Real-time overlay preview
- Timing controls for each overlay
- Drag-to-position functionality (visual feedback)

### 3. Processing Screen (`video-rendering.tsx`)
- Real-time job status polling
- Progress bar with percentage
- Automatic download when complete
- Save to device photo library
- Error handling with user feedback

## Overlay System

Each overlay contains:
- **ID**: Unique identifier
- **Type**: text, image, or video
- **Content**: Text string or media URI
- **Position**: X/Y coordinates (converted to percentages for API)
- **Size**: Width/height dimensions
- **Timing**: Start and end times in seconds

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Install Expo CLI** (if not already installed):
   ```bash
   npm install -g @expo/cli
   ```

3. **Start Development Server**:
   ```bash
   npx expo start
   ```

4. **Run on Device/Emulator**:
   - iOS: Press `i` in terminal or scan QR code with Camera app
   - Android: Press `a` in terminal or scan QR code with Expo Go app

## Required Permissions

The app requests the following permissions:
- **Media Library**: To select videos and images, save processed videos
- **Camera**: To record new videos
- **File System**: To handle video file operations

## Backend Requirements

Your backend server should implement:

1. **Upload Endpoint** (`POST /upload`):
   - Accept multipart form data with video file
   - Parse overlays JSON metadata
   - Return job ID for tracking

2. **Status Endpoint** (`GET /status/{jobId}`):
   - Return processing status (processing/completed/failed)
   - Optional: progress percentage and status message

3. **Result Endpoint** (`GET /result/{jobId}`):
   - Return processed video file for download
   - Support streaming for large files

## Development Notes

### Overlay Positioning
- Overlays are positioned using absolute coordinates
- Coordinates are converted to percentages (0-1) for API compatibility
- Visual feedback shows selected overlay with green border

### Video Processing Flow
1. User selects/records video
2. User adds overlays with timing
3. Video and metadata uploaded to backend
4. Frontend polls for processing status
5. When complete, video is downloaded and saved
6. User can create another video or view saved result

### Error Handling
- Network errors are caught and displayed to user
- Permission errors provide clear guidance
- Processing failures show retry options
- File system errors are handled gracefully

## Customization

### Styling
- All styles use StyleSheet.create for performance
- Consistent color scheme (#4A90E2 for primary, #5CB85C for success)
- Responsive design with Dimensions API

### API Integration
- Easy to switch between development and production URLs
- Configurable polling intervals
- Retry logic for network requests

### Overlay Types
- Extensible system for adding new overlay types
- Each type has specific handling in the modal and preview

## Future Enhancements

- **Drag & Drop**: Physical dragging of overlays on video preview
- **Filters**: Color filters and effects for videos
- **Audio**: Background music and sound effects
- **Export Options**: Different video qualities and formats
- **Cloud Storage**: Integration with cloud storage providers
- **Social Sharing**: Direct sharing to social media platforms

## Troubleshooting

### Common Issues

1. **"Network request failed"**:
   - Check if backend server is running
   - Verify API_BASE_URL in config.js
   - For physical device, use local IP instead of localhost

2. **"Permission denied" errors**:
   - App will prompt for permissions automatically
   - Check device settings if permissions were denied

3. **Video not playing**:
   - Ensure video format is supported (MP4 recommended)
   - Check video file size and device storage

4. **Slow processing**:
   - Processing speed depends on video size and server capacity
   - Status polling continues until completion

### Debug Mode

Enable debug logging by adding console.log statements in:
- API functions (`api.js`)
- Upload process (`video-editor.tsx`)
- Status polling (`video-rendering.tsx`)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.