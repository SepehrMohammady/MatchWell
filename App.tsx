/**
 * MatchWell - Eco-Conscious Match-3 Game
 * Save the planet, one match at a time!
 * 
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import MainMenu from './src/screens/MainMenu';
import LevelSelect from './src/screens/LevelSelect';
import EndlessSelect from './src/screens/EndlessSelect';
import GameScreen from './src/screens/GameScreen';
import Settings from './src/screens/Settings';
import Achievements from './src/screens/Achievements';
import Leaderboard from './src/screens/Leaderboard';
// Multiplayer Screens
import MultiplayerMenu from './src/screens/MultiplayerMenu';
import CreateRoom from './src/screens/CreateRoom';
import JoinRoom from './src/screens/JoinRoom';
import RoomLobby from './src/screens/RoomLobby';
import MultiplayerGame from './src/screens/MultiplayerGame';
import MultiplayerResults from './src/screens/MultiplayerResults';

// Types
import { RootStackParamList } from './src/types';

// Initialize i18n
import './src/config/i18n';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="MainMenu"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#1a1a2e' },
            }}
          >
            <Stack.Screen name="MainMenu" component={MainMenu} />
            <Stack.Screen name="LevelSelect" component={LevelSelect} />
            <Stack.Screen name="EndlessSelect" component={EndlessSelect} />
            <Stack.Screen
              name="Game"
              component={GameScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Achievements" component={Achievements} />
            <Stack.Screen name="Leaderboard" component={Leaderboard} />
            {/* Multiplayer Screens */}
            <Stack.Screen name="MultiplayerMenu" component={MultiplayerMenu} />
            <Stack.Screen name="CreateRoom" component={CreateRoom} />
            <Stack.Screen name="JoinRoom" component={JoinRoom} />
            <Stack.Screen name="RoomLobby" component={RoomLobby} />
            <Stack.Screen name="MultiplayerGame" component={MultiplayerGame} options={{ animation: 'fade' }} />
            <Stack.Screen name="MultiplayerResults" component={MultiplayerResults} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
