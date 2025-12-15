// Navigation Types
import { ThemeType } from './index';

export type RootStackParamList = {
    MainMenu: undefined;
    LevelSelect: undefined;
    EndlessSelect: undefined;
    Settings: undefined;
    Game: { levelId: number; isEndless?: boolean; endlessTheme?: ThemeType };
};
