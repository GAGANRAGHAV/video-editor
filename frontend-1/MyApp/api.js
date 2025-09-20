import { API_ENDPOINTS } from './config';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export const uploadVideo = async (videoUri, overlays) => {
  try {
    console.log('=== UPLOAD DEBUG INFO ===');
    console.log('API Endpoint:', API_ENDPOINTS.UPLOAD);
    console.log('Video URI:', videoUri);
    console.log('Overlays:', overlays);

    const formData = new FormData();
    
    // Add video file
    formData.append('video', {
      uri: videoUri,
      type: 'video/mp4',
      name: 'video.mp4',
    });
    
    // Add overlays
    formData.append('overlays', JSON.stringify(overlays));
    
    console.log('FormData prepared, making request...');

    const response = await fetch(API_ENDPOINTS.UPLOAD, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    console.log('Job ID returned:', result.job_id);
    return result;

  } catch (error) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error message:', error.message);
    
    if (error.message.includes('Network request failed')) {
      throw new Error(`Cannot connect to server. Please check:
        1. Backend server is running
        2. IP address is correct: ${API_ENDPOINTS.UPLOAD}
        3. Device is on the same network`);
    }
    
    throw error;
  }
};

// Check job status
export const checkJobStatus = async (jobId) => {
  try {
    console.log('=== STATUS CHECK DEBUG ===');
    console.log('Job ID:', jobId);
    console.log('Status endpoint:', API_ENDPOINTS.STATUS(jobId));
    
    const response = await fetch(API_ENDPOINTS.STATUS(jobId));
    
    console.log('Status response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Status error response:', errorText);
      throw new Error(`Status check failed: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Status result:', result);
    return result;
  } catch (error) {
    console.error('Error checking job status:', error);
    throw error;
  }
};

// Download rendered video with proper permissions
export const downloadVideo = async (jobId) => {
  try {
    console.log('=== DOWNLOAD DEBUG ===');
    console.log('Job ID:', jobId);
    console.log('Download URL:', API_ENDPOINTS.RESULT(jobId));
    
    // Request media library permissions first
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission is required to save the video');
    }
    
    // Create a temporary file path
    const fileName = `edited_video_${jobId}.mp4`;
    const tempUri = FileSystem.documentDirectory + fileName;
    
    console.log('Downloading to temp location:', tempUri);
    
    // Download the file to temporary location
    const downloadResult = await FileSystem.downloadAsync(
      API_ENDPOINTS.RESULT(jobId),
      tempUri
    );
    
    console.log('Download result:', downloadResult);
    
    if (downloadResult.status !== 200) {
      throw new Error('Failed to download video from server');
    }
    
    // Save to media library
    console.log('Saving to media library...');
    const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
    console.log('Asset created:', asset);
    
    // Optionally create an album for your app's videos
    try {
      const album = await MediaLibrary.getAlbumAsync('VideoEditor');
      if (album == null) {
        await MediaLibrary.createAlbumAsync('VideoEditor', asset, false);
        console.log('Created VideoEditor album');
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        console.log('Added to existing VideoEditor album');
      }
    } catch (albumError) {
      console.log('Album creation failed (not critical):', albumError);
    }
    
    // Clean up temporary file
    try {
      await FileSystem.deleteAsync(downloadResult.uri);
      console.log('Cleaned up temporary file');
    } catch (cleanupError) {
      console.log('Cleanup failed (not critical):', cleanupError);
    }
    
    return {
      success: true,
      asset: asset,
      message: 'Video saved to gallery successfully!'
    };
    
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
};