import { API_ENDPOINTS } from './config';
import * as FileSystem from 'expo-file-system';

// Upload video with overlay metadata
export const uploadVideo = async (videoUri, overlays) => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Append video file
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error('Video file does not exist');
    }
    
    // Get filename from URI
    const fileName = videoUri.split('/').pop();
    
    // Create file object for form data
    formData.append('video', {
      uri: videoUri,
      name: fileName,
      type: 'video/mp4', // Change if you support other formats
    });
    
    // Append overlays as JSON
    formData.append('overlays_json', JSON.stringify(overlays));
    
    // Send request
    const response = await fetch(API_ENDPOINTS.UPLOAD, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

// Check job status
export const checkJobStatus = async (jobId) => {
  try {
    const response = await fetch(API_ENDPOINTS.STATUS(jobId));
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Status check failed: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking job status:', error);
    throw error;
  }
};

// Download rendered video
export const downloadVideo = async (jobId, destinationUri) => {
  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      API_ENDPOINTS.RESULT(jobId),
      destinationUri,
      {}
    );
    
    const result = await downloadResumable.downloadAsync();
    return result;
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
};