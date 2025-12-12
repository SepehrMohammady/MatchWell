// Game Types for MatchWell

export type TileType =
    | 'plastic'
    | 'paper'
    | 'glass'
    | 'metal'
    | 'organic'
    | 'car'
    | 'truck'
    | 'bus'
    | 'factory'
    | 'bicycle'
    | 'empty';

export interface Position {
    row: number;
    col: number;
}

export interface Tile {
    id: string;
    type: TileType;
    position: Position;
    isMatched: boolean;
    isFalling: boolean;
    isSelected: boolean;
}

export interface Match {
    tiles: Tile[];
    type: 'horizontal' | 'vertical' | 'l-shape' | 't-shape';
    length: number;
}

export interface GameState {
    grid: (Tile | null)[][];
    score: number;
    moves: number;
    movesRemaining: number;
    targetScore: number;
    level: number;
    isGameOver: boolean;
    isLevelComplete: boolean;
    combo: number;
    theme: ThemeType;
}

export type ThemeType = 'trash-sorting' | 'pollution';

export interface Theme {
    id: ThemeType;
    name: string;
    description: string;
    tileTypes: TileType[];
    backgroundColor: string;
    backgroundImage?: string;
}

export interface Level {
    id: number;
    theme: ThemeType;
    targetScore: number;
    moves: number;
    gridSize: { rows: number; cols: number };
    difficulty: 'easy' | 'medium' | 'hard';
    environmentalFact?: string;
}

export interface GameEntity {
    position: Position;
    size: { width: number; height: number };
    renderer: React.ComponentType<any>;
    [key: string]: any;
}

export interface TouchEvent {
    id: string;
    type: 'start' | 'move' | 'end';
    event: {
        pageX: number;
        pageY: number;
    };
}

export interface SwipeDirection {
    direction: 'up' | 'down' | 'left' | 'right';
    from: Position;
    to: Position;
}
