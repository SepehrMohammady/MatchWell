// Game Types for MatchWell

export type TileType =
    // Trash Sorting Theme
    | 'plastic'
    | 'paper'
    | 'glass'
    | 'metal'
    | 'organic'
    // Pollution Theme
    | 'car'
    | 'truck'
    | 'bus'
    | 'factory'
    | 'bicycle'
    // Water Conservation Theme
    | 'droplet'
    | 'faucet'
    | 'shower'
    | 'bottle'
    | 'ocean'
    // Energy Efficiency Theme
    | 'bulb'
    | 'solar'
    | 'wind'
    | 'plug'
    | 'battery'
    // Deforestation Theme
    | 'tree'
    | 'axe'
    | 'leaf'
    | 'seedling'
    | 'forest'
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

export type ThemeType = 'trash-sorting' | 'pollution' | 'water-conservation' | 'energy-efficiency' | 'deforestation';


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

// Re-export navigation types
export * from './navigation';
