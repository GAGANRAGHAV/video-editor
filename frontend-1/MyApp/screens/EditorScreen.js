import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { apiUploadVideo } from '../api';
import uuid from 'react-native-uuid';

const SCREEN_WIDTH = Dimensions.get('window').width;
const VIDEO_HEIGHT = 250;

export default function EditorScreen({ route, navigation }) {
  const { videoUri } = route.params;
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: SCREEN_WIDTH, height: VIDEO_HEIGHT });
  const [overlays, setOverlays] = useState([]);
  const [isAddingOverlay, setIsAddingOverlay] = useState(false);
  const [newOverlayType, setNewOverlayType] = useState('text');
  const [newOverlayContent, setNewOverlayContent] = useState('');
  const [newOverlayTiming, setNewOverlayTiming] = useState({ start: 0, end: 5 });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);

  // Handle video playback position changes
  useEffect(() => {
    if (status.isPlaying) {
      const interval = setInterval(() => {
        if (videoRef.current) {
          videoRef.current.getStatusAsync().then((videoStatus) => {
            setCurrentTime(videoStatus.positionMillis / 1000);
          });
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status.isPlaying]);

  // Add a new overlay
  const addOverlay = async () => {
    if (newOverlayType === 'text' && !newOverlayContent) {
      Alert.alert('Error', 'Please enter text content');
      return;
    }

    let content = newOverlayContent;
    
    // For image/video overlays, pick from media library
    if (newOverlayType !== 'text') {
      try {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
          Alert.alert('Error', 'Permission to access media library is required');
          return;
        }
        
        const mediaType = newOverlayType === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos;
        
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: mediaType,
          allowsEditing: true,
          quality: 1,
        });
        
        if (result.canceled) {
          return;
        }
        
        content = result.assets[0].uri;
      } catch (error) {
        console.error('Error picking media:', error);
        Alert.alert('Error', `Error selecting media: ${error.message}`);
        return;
      }
    }

    // Create a new overlay
    const newOverlay = {
      id: uuid.v4(),
      type: newOverlayType,
      content: content,
      position: {
        x: Math.random() * (videoSize.width - 100),
        y: Math.random() * (videoSize.height - 50),
      },
      size: {
        width: newOverlayType === 'text' ? 150 : 100,
        height: newOverlayType === 'text' ? 50 : 100,
      },
      startTime: newOverlayTiming.start,
      endTime: newOverlayTiming.end,
    };
    
    setOverlays([...overlays, newOverlay]);
    setIsAddingOverlay(false);
    setNewOverlayContent('');
    setNewOverlayType('text');
    setNewOverlayTiming({ start: 0, end: 5 });
  };

  // Update overlay position when dragged
  const updateOverlayPosition = (id, newPosition) => {
    setOverlays(
      overlays.map((overlay) =>
        overlay.id === id
          ? { ...overlay, position: newPosition }
          : overlay
      )
    );
  };

  // Remove an overlay
  const removeOverlay = (id) => {
    setOverlays(overlays.filter((overlay) => overlay.id !== id));
    setSelectedOverlayId(null);
  };

  // Select overlay for editing
  const selectOverlay = (id) => {
    setSelectedOverlayId(id);
  };

  // Update overlay timing
  const updateOverlayTiming = (id, start, end) => {
    setOverlays(
      overlays.map((overlay) =>
        overlay.id === id
          ? { ...overlay, startTime: start, endTime: end }
          : overlay
      )
    );
  };

  // Submit video for processing
  const handleSubmit = async () => {
    if (overlays.length === 0) {
      Alert.alert('Warning', 'No overlays added. Do you want to continue?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        { text: 'Continue', onPress: submitVideo },
      ]);
    } else {
      submitVideo();
    }
  };

  // Upload video and overlays to backend
  const submitVideo = async () => {
    setIsUploading(true);
    try {
      // Format overlays for API
      const formattedOverlays = overlays.map((overlay) => {
        // Convert from pixels to percentage (0-1)
        const posX = overlay.position.x / videoSize.width;
        const posY = overlay.position.y / videoSize.height;
        const width = overlay.size.width / videoSize.width;
        const height = overlay.size.height / videoSize.height;

        return {
          id: overlay.id,
          type: overlay.type,
          content: overlay.content,
          position_x: posX,
          position_y: posY,
          start_time: overlay.startTime,
          end_time: overlay.endTime,
          width: width,
          height: height,
          font_size: overlay.type === 'text' ? 24 : undefined,
          font_color: overlay.type === 'text' ? 'white' : undefined,
        };
      });

      // Upload to server
      const result = await apiUploadVideo(videoUri, formattedOverlays);
      
      // Navigate to rendering screen with job ID
      navigation.navigate('Rendering', { jobId: result.job_id });
    } catch (error) {
      console.error('Error submitting video:', error);
      Alert.alert('Error', `Failed to upload video: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Video Preview */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode="contain"
          onPlaybackStatusUpdate={setStatus}
          useNativeControls
        />
        
        {/* Overlays on top of video */}
        {overlays.map((overlay) => (
          <View
            key={overlay.id}
            style={[
              styles.overlay,
              {
                left: overlay.position.x,
                top: overlay.position.y,
                width: overlay.size.width,
                height: overlay.size.height,
                borderColor: selectedOverlayId === overlay.id ? '#00ff00' : 'transparent',
                borderWidth: selectedOverlayId === overlay.id ? 2 : 0,
                display: (currentTime >= overlay.startTime && currentTime <= overlay.endTime) 
                  ? 'flex' : 'none',
              },
            ]}
            onTouchEnd={() => selectOverlay(overlay.id)}
          >
            {overlay.type === 'text' ? (
              <Text style={styles.overlayText}>{overlay.content}</Text>
            ) : overlay.type === 'image' ? (
              <Image source={{ uri: overlay.content }} style={styles.overlayMedia} />
            ) : (
              <Video
                source={{ uri: overlay.content }}
                style={styles.overlayMedia}
                resizeMode="cover"
                shouldPlay
                isLooping
                isMuted
              />
            )}
          </View>
        ))}
      </View>

      {/* Timeline slider */}
      <View style={styles.timelineContainer}>
        <Text>Timeline: {currentTime.toFixed(1)}s</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={status.durationMillis ? status.durationMillis / 1000 : 100}
          value={currentTime}
          onValueChange={setCurrentTime}
          minimumTrackTintColor="#4A90E2"
          maximumTrackTintColor="#d3d3d3"
        />
      </View>

      {/* Overlay controls */}
      <ScrollView style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Overlays</Text>
        
        {/* List of added overlays */}
        {overlays.length === 0 ? (
          <Text style={styles.emptyText}>No overlays added yet</Text>
        ) : (
          overlays.map((overlay) => (
            <View key={overlay.id} style={styles.overlayItem}>
              <Text style={styles.overlayItemTitle}>
                {overlay.type === 'text'
                  ? `Text: "${overlay.content.substring(0, 20)}${overlay.content.length > 20 ? '...' : ''}"`
                  : overlay.type === 'image'
                  ? 'Image overlay'
                  : 'Video overlay'}
              </Text>
              <Text>
                Time: {overlay.startTime}s - {overlay.endTime}s
              </Text>
              <View style={styles.overlayItemButtons}>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: '#4A90E2' }]}
                  onPress={() => selectOverlay(overlay.id)}
                >
                  <Text style={styles.smallButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: '#d9534f' }]}
                  onPress={() => removeOverlay(overlay.id)}
                >
                  <Text style={styles.smallButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Selected overlay timing editor */}
        {selectedOverlayId && (
          <View style={styles.selectedOverlayEditor}>
            <Text style={styles.sectionTitle}>Edit Timing</Text>
            <Text>Start Time:</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={status.durationMillis ? status.durationMillis / 1000 : 100}
              value={overlays.find(o => o.id === selectedOverlayId).startTime}
              onValueChange={(value) => {
                const overlay = overlays.find(o => o.id === selectedOverlayId);
                updateOverlayTiming(
                  selectedOverlayId,
                  value,
                  Math.max(overlay.endTime, value + 0.5)
                );
              }}
            />
            <Text>End Time:</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={status.durationMillis ? status.durationMillis / 1000 : 100}
              value={overlays.find(o => o.id === selectedOverlayId).endTime}
              onValueChange={(value) => {
                const overlay = overlays.find(o => o.id === selectedOverlayId);
                updateOverlayTiming(
                  selectedOverlayId,
                  Math.min(overlay.startTime, value - 0.5),
                  value
                );
              }}
            />
          </View>
        )}

        {/* Add overlay button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddingOverlay(true)}
        >
          <Text style={styles.buttonText}>Add Overlay</Text>
        </TouchableOpacity>

        {/* Submit button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit for Processing</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Add Overlay Modal */}
      <Modal
        visible={isAddingOverlay}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddingOverlay(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Overlay</Text>
            
            {/* Overlay type selection */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newOverlayType === 'text' && styles.selectedTypeButton,
                ]}
                onPress={() => setNewOverlayType('text')}
              >
                <Text>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newOverlayType === 'image' && styles.selectedTypeButton,
                ]}
                onPress={() => setNewOverlayType('image')}
              >
                <Text>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newOverlayType === 'video' && styles.selectedTypeButton,
                ]}
                onPress={() => setNewOverlayType('video')}
              >
                <Text>Video</Text>
              </TouchableOpacity>
            </View>

            {/* Text content input (for text overlays) */}
            {newOverlayType === 'text' && (
              <TextInput
                style={styles.textInput}
                placeholder="Enter text"
                value={newOverlayContent}
                onChangeText={setNewOverlayContent}
                multiline
              />
            )}

            {/* Timing controls */}
            <Text>Start Time (seconds):</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={status.durationMillis ? status.durationMillis / 1000 : 100}
              value={newOverlayTiming.start}
              onValueChange={(value) =>
                setNewOverlayTiming({ ...newOverlayTiming, start: value })
              }
            />
            <Text>{newOverlayTiming.start.toFixed(1)}s</Text>

            <Text>End Time (seconds):</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={status.durationMillis ? status.durationMillis / 1000 : 100}
              value={newOverlayTiming.end}
              onValueChange={(value) =>
                setNewOverlayTiming({ ...newOverlayTiming, end: value })
              }
            />
            <Text>{newOverlayTiming.end.toFixed(1)}s</Text>

            {/* Action buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#d9534f' }]}
                onPress={() => setIsAddingOverlay(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#5CB85C' }]}
                onPress={addOverlay}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  videoContainer: {
    width: '100%',
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  timelineContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  controlsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  overlayItem: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  overlayItemTitle: {
    fontWeight: 'bold',
  },
  overlayItemButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: '#5CB85C',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  overlayMedia: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 5,
    borderRadius: 5,
  },
  selectedTypeButton: {
    backgroundColor: '#e6f2ff',
    borderColor: '#4A90E2',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  selectedOverlayEditor: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
});