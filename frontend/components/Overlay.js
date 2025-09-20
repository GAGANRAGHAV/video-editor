import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { Video } from 'expo-av';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

// Overlay component for text, images, and video clips
export default function Overlay({
  id,
  type,
  content,
  position,
  size,
  onPositionChange,
  containerDimensions,
  startTime,
  endTime,
  currentTime,
}) {
  // Calculate if overlay should be visible at current time
  const isVisible = currentTime >= startTime && currentTime <= endTime;

  // Setup gesture handling for drag
  const translateX = useSharedValue(position.x);
  const translateY = useSharedValue(position.y);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
      
      // Keep overlay within container bounds
      if (translateX.value < 0) translateX.value = 0;
      if (translateY.value < 0) translateY.value = 0;
      if (translateX.value > containerDimensions.width - size.width) {
        translateX.value = containerDimensions.width - size.width;
      }
      if (translateY.value > containerDimensions.height - size.height) {
        translateY.value = containerDimensions.height - size.height;
      }
    })
    .onEnd(() => {
      // Update parent component with new position
      onPositionChange(id, {
        x: translateX.value,
        y: translateY.value,
      });
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Don't render if not visible at current time
  if (!isVisible) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.overlay,
          {
            width: size.width,
            height: size.height,
          },
          animatedStyle,
        ]}
      >
        {type === 'text' ? (
          <Text style={styles.overlayText}>{content}</Text>
        ) : type === 'image' ? (
          <Image source={{ uri: content }} style={styles.overlayMedia} />
        ) : (
          <Video
            source={{ uri: content }}
            style={styles.overlayMedia}
            resizeMode="cover"
            shouldPlay={true}
            isLooping={true}
            isMuted={true}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  overlayMedia: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
});