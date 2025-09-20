import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import screens
import HomeScreen from './screens/HomeScreen';
import EditorScreen from './screens/EditorScreen';
import RenderingScreen from './screens/RenderingScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Video Editor' }} 
          />
          <Stack.Screen 
            name="Editor" 
            component={EditorScreen}
            options={{ title: 'Edit Video' }}
          />
          <Stack.Screen 
            name="Rendering" 
            component={RenderingScreen}
            options={{ title: 'Processing Video' }}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}