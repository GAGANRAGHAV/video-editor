import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { checkJobStatus, downloadVideo } from '../api';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export default function VideoRenderingScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Processing your video...');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedVideoUri, setDownloadedVideoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollJobStatus = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setIsProcessing(false);
        return;
      }

      try {
        const response = await checkJobStatus(jobId);
        
        if (response.status === 'completed') {
          setIsProcessing(false);
          setProgress(100);
          setStatus('Video processing complete!');
          clearInterval(pollInterval);
        } else if (response.status === 'failed') {
          setIsProcessing(false);
          setError(response.error || 'Video processing failed');
          clearInterval(pollInterval);
        } else {
          // Update progress if available
          if (response.progress !== undefined) {
            setProgress(response.progress);
          }
          
          // Update status message if available
          if (response.message) {
            setStatus(response.message);
          }
        }
      } catch (error: any) {
        console.error('Error checking job status:', error);
        setError(`Failed to check status: ${error.message}`);
        setIsProcessing(false);
        clearInterval(pollInterval);
      }
    };

    // Start polling immediately
    pollJobStatus();
    
    // Set up polling interval (every 2 seconds)
    pollInterval = setInterval(pollJobStatus, 2000);

    // Cleanup interval on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId]);

  const handleDownload = async () => {
    if (!jobId) {
      Alert.alert('Error', 'No job ID available');
      return;
    }

    try {
      setIsDownloading(true);
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permission to save videos');
        return;
      }

      // Create destination path using documentDirectory
      const fileName = `edited_video_${jobId}.mp4`;
      const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

      // Download the video
      const downloadResult = await downloadVideo(jobId, destinationUri);
      
      if (downloadResult && downloadResult.uri) {
        // Save to device photo library
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Video Editor', asset, false);
        
        setDownloadedVideoUri(downloadResult.uri);
        
        Alert.alert(
          'Success!',
          'Your edited video has been saved to your photo library.',
          [
            {
              text: 'OK',
              onPress: () => {
                // You can add additional actions here if needed
              },
            },
          ]
        );
      } else {
        throw new Error('Download failed - no file received');
      }
    } catch (error: any) {
      console.error('Error downloading video:', error);
      Alert.alert('Download Error', `Failed to download video: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGoHome = () => {
    router.push('/video-home');
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Processing Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          <TouchableOpacity
            style={styles.homeButton}
            onPress={handleGoHome}
          >
            <Text style={styles.buttonText}>Go Back Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Video Processing</Text>
        <Text style={styles.jobId}>Job ID: {jobId}</Text>

        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.status}>{status}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress)}% Complete
              </Text>
            </View>
            <Text style={styles.pollingText}>
              Checking status every 2 seconds...
            </Text>
          </View>
        ) : (
          <View style={styles.completeContainer}>
            <Text style={styles.completeIcon}>✅</Text>
            <Text style={styles.completeText}>{status}</Text>
            
            {downloadedVideoUri && (
              <Text style={styles.savedText}>
                Video saved to your device! 📱
              </Text>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  (isDownloading || downloadedVideoUri) && styles.disabledButton
                ]}
                onPress={handleDownload}
                disabled={isDownloading || !!downloadedVideoUri}
              >
                {isDownloading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>
                    {downloadedVideoUri ? 'Downloaded ✓' : 'Download Video'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButton}
                onPress={handleGoHome}
              >
                <Text style={styles.buttonText}>Create Another Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  jobId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  processingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  status: {
    fontSize: 16,
    color: '#333',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  pollingText: {
    fontSize: 12,
    color: '#999',
    marginTop: 20,
    fontStyle: 'italic',
  },
  completeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  completeIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  completeText: {
    fontSize: 18,
    color: '#5CB85C',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  savedText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 30,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d9534f',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  downloadButton: {
    backgroundColor: '#5CB85C',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  homeButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
