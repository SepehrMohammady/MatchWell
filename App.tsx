/**
 * MatchWell - Eco-Conscious Match-3 Game
 * Save the planet, one match at a time!
 * 
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
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
// Multiplayer Screens (Online)
import MultiplayerMenu from './src/screens/MultiplayerMenu';
import CreateRoom from './src/screens/CreateRoom';
import JoinRoom from './src/screens/JoinRoom';
import RoomLobby from './src/screens/RoomLobby';
import MultiplayerGame from './src/screens/MultiplayerGame';
import MultiplayerResults from './src/screens/MultiplayerResults';
// Local Multiplayer Screens (Bluetooth/WiFi Direct)
import LocalMultiplayerMenu from './src/screens/LocalMultiplayerMenu';
import LocalLobby from './src/screens/LocalLobby';
import LocalMultiplayerGame from './src/screens/LocalMultiplayerGame';
import LocalMultiplayerResults from './src/screens/LocalMultiplayerResults';

import BackupScreen from './src/screens/BackupScreen';
import TransferLock from './src/components/UI/TransferLock';
import { refreshLockState } from './src/services/BackupService';

// Types
import { RootStackParamList } from './src/types';

// Initialize i18n
import './src/config/i18n';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  // A save is live on one device at a time. Ask the server on launch whether this
  // device still owns it; if another device has signed in, show the lock instead
  // of the game. Being offline never locks anyone out - refreshLockState only
  // locks on a definite "no".
  const [locked, setLocked] = React.useState(false);

  React.useEffect(() => {
    refreshLockState().then(setLocked).catch(() => setLocked(false));
  }, []);

  // Automatic backup used to run here, when the app left the foreground. That is
  // not a dependable signal: swiping the app away from the recents list leaves no
  // usable window to finish a network request, so those sessions never backed up.
  // It now runs from GameScreen at the moments progress actually changes -
  // finishing a level, and leaving an endless run.

  if (locked) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#F0F4EF" />
          <View style={styles.container}>
            <TransferLock />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
            <Stack.Screen name="Backup" component={BackupScreen} />
            {/* Online Multiplayer Screens */}
            <Stack.Screen name="MultiplayerMenu" component={MultiplayerMenu} />
            <Stack.Screen name="CreateRoom" component={CreateRoom} />
            <Stack.Screen name="JoinRoom" component={JoinRoom} />
            <Stack.Screen name="RoomLobby" component={RoomLobby} />
            <Stack.Screen name="MultiplayerGame" component={MultiplayerGame} options={{ animation: 'fade' }} />
            <Stack.Screen name="MultiplayerResults" component={MultiplayerResults} />
            {/* Local Multiplayer Screens (Bluetooth/WiFi Direct) */}
            <Stack.Screen name="LocalMultiplayerMenu" component={LocalMultiplayerMenu} />
            <Stack.Screen name="LocalLobby" component={LocalLobby} />
            <Stack.Screen name="LocalMultiplayerGame" component={LocalMultiplayerGame} options={{ animation: 'fade' }} />
            <Stack.Screen name="LocalMultiplayerResults" component={LocalMultiplayerResults} />
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
