// Navigation Types
import { ThemeType } from './index';

export type RootStackParamList = {
    MainMenu: undefined;
    LevelSelect: undefined;
    EndlessSelect: undefined;
    Settings: undefined;
    Achievements: undefined;
    Leaderboard: undefined;
    Game: { levelId: number; isEndless?: boolean; endlessTheme?: ThemeType; forceNew?: boolean };
    // Multiplayer screens
    MultiplayerMenu: undefined;
    CreateRoom: undefined;
    JoinRoom: undefined;
    RoomLobby: { roomCode: string };
    MultiplayerGame: { roomCode: string; theme: ThemeType; gameMode: 'race' | 'timed' | 'moves'; targetScore?: number; movesLimit?: number };
    MultiplayerResults: { roomCode: string };
};
