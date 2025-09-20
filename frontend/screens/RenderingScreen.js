import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { checkJobStatus } from '../api';
import { API_ENDPOINTS } from '../config';

export default function RenderingScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [status, setStatus] = useState({
    status: 'pending',
    created_at: null,
    completed_at: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoUri, setVideoUri] = useState(null);

  // Poll for job status
  useEffect(() => {
    let interval;
    
    const checkStatus = async () => {
      try {
        const jobStatus = await checkJobStatus(jobId);
        setStatus(jobStatus);
        setLoading(false);
        
        // If job is completed or failed, stop polling
        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking job status:', error);
        setLoading(false);
        Alert.alert('Error', `Failed to check processing status: ${error.message}`);
        clearInterval(interval);
      }
    };
    
    // Check status immediately
    checkStatus();
    
    // Then check every 2 seconds
    interval = setInterval(checkStatus, 2000);
    
    // Clean up
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId]);

  // Handle video download
  const handleDownload = async () => {
    try {
      setLoading(true);
      setDownloadProgress(0);
      
      // Create file URL in app cache
      const fileUri = `${FileSystem.cacheDirectory}rendered_video_${jobId}.mp4`;
      
      // Progress callback
      const progressCallback = (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
      };
      
      // Start download
      const downloadResumable = FileSystem.createDownloadResumable(
        API_ENDPOINTS.RESULT(jobId),
        fileUri,
        {},
        progressCallback
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result.status === 200) {
        setVideoUri(result.uri);
      } else {
        throw new Error(`Download failed with status ${result.status}`);
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      Alert.alert('Error', `Failed to download video: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle go home
  const handleGoHome = () => {
    navigation.popToTop();
  };

  // Render different content based on job status
  const renderContent = () => {
    if (loading && !videoUri) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Checking status...</Text>
        </View>
      );
    }
    
    switch (status.status) {
      case 'pending':
        return (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.statusText}>Your video is in queue for processing...</Text>
          </View>
        );
      
      case 'processing':
        return (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.statusText}>Processing your video...</Text>
            <Text style={styles.infoText}>This may take a few minutes depending on video length and complexity.</Text>
          </View>
        );
      
      case 'completed':
        if (videoUri) {
          return (
            <View style={styles.contentContainer}>
              <Text style={styles.successText}>Video processing complete!</Text>
              
              <Video
                source={{ uri: videoUri }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode="contain"
                shouldPlay={false}
                isLooping
                style={styles.video}
                useNativeControls
              />
              
              <TouchableOpacity
                style={styles.homeButton}
                onPress={handleGoHome}
              >
                <Text style={styles.buttonText}>Edit Another Video</Text>
              </TouchableOpacity>
            </View>
          );
        } else {
          return (
            <View style={styles.centerContent}>
              <Text style={styles.successText}>Video processing complete!</Text>
              
              {downloadProgress > 0 && downloadProgress < 1 ? (
                <View style={styles.downloadProgressContainer}>
                  <Text style={styles.downloadText}>Downloading: {Math.round(downloadProgress * 100)}%</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${downloadProgress * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={handleDownload}
                >
                  <Text style={styles.buttonText}>Download and Preview</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }
      
      case 'failed':
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Processing Failed</Text>
            <Text style={styles.errorDetail}>{status.error || 'Unknown error occurred'}</Text>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleGoHome}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Unknown Status</Text>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleGoHome}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Video Processing</Text>
        <Text style={styles.jobId}>Job ID: {jobId}</Text>
      </View>
      
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  jobId: {
    fontSize: 12,
    color: '#999',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  statusText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5CB85C',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8d7da',
    borderRadius: 4,
  },
  downloadButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  homeButton: {
    backgroundColor: '#5CB85C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadProgressContainer: {
    width: '100%',
    marginVertical: 24,
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  progressBar: {
    height: 10,
    width: '80%',
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  video: {
    width: '100%',
    height: 250,
    marginVertical: 24,
    backgroundColor: '#000',
    borderRadius: 8,
  },
});