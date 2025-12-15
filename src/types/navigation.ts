// Navigation Types
export type RootStackParamList = {
    MainMenu: undefined;
    LevelSelect: undefined;
    Settings: undefined;
    Game: { levelId: number; isEndless?: boolean };
};
