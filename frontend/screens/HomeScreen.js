import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

export default function HomeScreen({ navigation }) {
  const [videoUri, setVideoUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Select video from device library
  const pickVideo = async () => {
    setIsLoading(true);
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert('Permission to access media library is required!');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });
      
      if (!result.canceled) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      alert('Error picking video: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to editor with selected video
  const goToEditor = () => {
    if (videoUri) {
      navigation.navigate('Editor', { videoUri });
    } else {
      alert('Please select a video first.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Editor</Text>
      <Text style={styles.subtitle}>Upload a video to begin editing</Text>
      
      <TouchableOpacity 
        style={styles.uploadButton} 
        onPress={pickVideo}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Select Video</Text>
        )}
      </TouchableOpacity>
      
      {videoUri ? (
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>Preview:</Text>
          <Video
            source={{ uri: videoUri }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="cover"
            shouldPlay={false}
            isLooping={true}
            style={styles.videoPreview}
            useNativeControls
          />
          
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={goToEditor}
          >
            <Text style={styles.buttonText}>Edit Video</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No video selected</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
    marginBottom: 20,
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  videoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    backgroundColor: '#000',
    marginBottom: 20,
  },
  editButton: {
    backgroundColor: '#5CB85C',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
});