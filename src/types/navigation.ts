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
};
