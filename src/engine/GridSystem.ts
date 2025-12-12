// Grid System for MatchWell Match-3 Game
import { Tile, TileType, Position, Match, ThemeType } from '../types';
import { THEME_CONFIGS } from '../themes';

export const GRID_SIZE = 8;

// Generate a unique ID for each tile
const generateTileId = (): string => {
    return `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get available tile types for a theme
export const getTileTypesForTheme = (theme: ThemeType): TileType[] => {
    const themeConfig = THEME_CONFIGS[theme];
    return themeConfig?.tileTypes || ['plastic', 'paper', 'glass', 'metal', 'organic'];
};

// Create a new tile at a position
export const createTile = (
    position: Position,
    theme: ThemeType,
    excludeTypes: TileType[] = []
): Tile => {
    const availableTypes = getTileTypesForTheme(theme).filter(
        (t) => !excludeTypes.includes(t)
    );
    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];

    return {
        id: generateTileId(),
        type: randomType,
        position: { ...position },
        isMatched: false,
        isFalling: false,
        isSelected: false,
    };
};

// Initialize a new grid with no initial matches
export const createGrid = (theme: ThemeType): (Tile | null)[][] => {
    const grid: (Tile | null)[][] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        grid[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            // Get types that would create a match
            const excludeTypes: TileType[] = [];

            // Check horizontal (2 tiles to the left)
            if (col >= 2) {
                const left1 = grid[row][col - 1];
                const left2 = grid[row][col - 2];
                if (left1 && left2 && left1.type === left2.type) {
                    excludeTypes.push(left1.type);
                }
            }

            // Check vertical (2 tiles above)
            if (row >= 2) {
                const up1 = grid[row - 1][col];
                const up2 = grid[row - 2][col];
                if (up1 && up2 && up1.type === up2.type) {
                    excludeTypes.push(up1.type);
                }
            }

            grid[row][col] = createTile({ row, col }, theme, excludeTypes);
        }
    }

    return grid;
};

// Check if two positions are adjacent (including diagonals = false for Match-3)
export const areAdjacent = (pos1: Position, pos2: Position): boolean => {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

// Swap two tiles in the grid
export const swapTiles = (
    grid: (Tile | null)[][],
    pos1: Position,
    pos2: Position
): (Tile | null)[][] => {
    const newGrid = grid.map((row) => [...row]);
    const tile1 = newGrid[pos1.row][pos1.col];
    const tile2 = newGrid[pos2.row][pos2.col];

    if (tile1) tile1.position = { ...pos2 };
    if (tile2) tile2.position = { ...pos1 };

    newGrid[pos1.row][pos1.col] = tile2;
    newGrid[pos2.row][pos2.col] = tile1;

    return newGrid;
};

// Check if a position is valid within the grid
export const isValidPosition = (pos: Position): boolean => {
    return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
};

// Get tile at a position
export const getTileAt = (
    grid: (Tile | null)[][],
    pos: Position
): Tile | null => {
    if (!isValidPosition(pos)) return null;
    return grid[pos.row][pos.col];
};

// Clone the grid for immutable updates
export const cloneGrid = (grid: (Tile | null)[][]): (Tile | null)[][] => {
    return grid.map((row) =>
        row.map((tile) => (tile ? { ...tile, position: { ...tile.position } } : null))
    );
};

// Remove matched tiles from grid (set to null)
export const removeMatchedTiles = (
    grid: (Tile | null)[][],
    matches: Match[]
): (Tile | null)[][] => {
    const newGrid = cloneGrid(grid);

    matches.forEach((match) => {
        match.tiles.forEach((tile) => {
            newGrid[tile.position.row][tile.position.col] = null;
        });
    });

    return newGrid;
};

// Apply gravity - tiles fall down to fill empty spaces
export const applyGravity = (grid: (Tile | null)[][]): (Tile | null)[][] => {
    const newGrid = cloneGrid(grid);

    for (let col = 0; col < GRID_SIZE; col++) {
        let emptyRow = GRID_SIZE - 1;

        // Start from bottom and move up
        for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (newGrid[row][col] !== null) {
                if (row !== emptyRow) {
                    // Move tile down
                    const tile = newGrid[row][col]!;
                    tile.position = { row: emptyRow, col };
                    tile.isFalling = true;
                    newGrid[emptyRow][col] = tile;
                    newGrid[row][col] = null;
                }
                emptyRow--;
            }
        }
    }

    return newGrid;
};

// Fill empty spaces with new tiles from top
export const fillEmptySpaces = (
    grid: (Tile | null)[][],
    theme: ThemeType
): (Tile | null)[][] => {
    const newGrid = cloneGrid(grid);

    for (let col = 0; col < GRID_SIZE; col++) {
        for (let row = 0; row < GRID_SIZE; row++) {
            if (newGrid[row][col] === null) {
                newGrid[row][col] = createTile({ row, col }, theme);
                newGrid[row][col]!.isFalling = true;
            }
        }
    }

    return newGrid;
};

// Count empty spaces in the grid
export const countEmptySpaces = (grid: (Tile | null)[][]): number => {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (grid[row][col] === null) count++;
        }
    }
    return count;
};
