// Match Detection System for MatchWell
import { Tile, Match, Position } from '../types';
import { GRID_SIZE, isValidPosition, cloneGrid } from './GridSystem';

// Find all horizontal matches in the grid
export const findHorizontalMatches = (grid: (Tile | null)[][]): Match[] => {
    const matches: Match[] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        let matchStart = 0;
        let currentType: string | null = null;
        let matchTiles: Tile[] = [];

        for (let col = 0; col <= GRID_SIZE; col++) {
            const tile = col < GRID_SIZE ? grid[row][col] : null;
            const tileType = tile?.type || null;

            if (tileType === currentType && tileType !== null) {
                matchTiles.push(tile!);
            } else {
                // Check if we have a match (3 or more)
                if (matchTiles.length >= 3) {
                    matches.push({
                        tiles: [...matchTiles],
                        type: 'horizontal',
                        length: matchTiles.length,
                    });
                }
                // Start new potential match
                currentType = tileType;
                matchTiles = tile ? [tile] : [];
                matchStart = col;
            }
        }
    }

    return matches;
};

// Find all vertical matches in the grid
export const findVerticalMatches = (grid: (Tile | null)[][]): Match[] => {
    const matches: Match[] = [];

    for (let col = 0; col < GRID_SIZE; col++) {
        let currentType: string | null = null;
        let matchTiles: Tile[] = [];

        for (let row = 0; row <= GRID_SIZE; row++) {
            const tile = row < GRID_SIZE ? grid[row][col] : null;
            const tileType = tile?.type || null;

            if (tileType === currentType && tileType !== null) {
                matchTiles.push(tile!);
            } else {
                // Check if we have a match (3 or more)
                if (matchTiles.length >= 3) {
                    matches.push({
                        tiles: [...matchTiles],
                        type: 'vertical',
                        length: matchTiles.length,
                    });
                }
                // Start new potential match
                currentType = tileType;
                matchTiles = tile ? [tile] : [];
            }
        }
    }

    return matches;
};

// Find all matches in the grid
export const findAllMatches = (grid: (Tile | null)[][]): Match[] => {
    const horizontalMatches = findHorizontalMatches(grid);
    const verticalMatches = findVerticalMatches(grid);

    // Combine and deduplicate matches
    const allMatches = [...horizontalMatches, ...verticalMatches];

    // Mark tiles as matched
    allMatches.forEach((match) => {
        match.tiles.forEach((tile) => {
            tile.isMatched = true;
        });
    });

    return allMatches;
};

// Check if swapping two tiles would result in a match
export const wouldSwapCreateMatch = (
    grid: (Tile | null)[][],
    pos1: Position,
    pos2: Position
): boolean => {
    // Create a temporary grid with the swap
    const tempGrid = cloneGrid(grid);
    const tile1 = tempGrid[pos1.row][pos1.col];
    const tile2 = tempGrid[pos2.row][pos2.col];

    if (!tile1 || !tile2) return false;

    // Swap positions
    tile1.position = { ...pos2 };
    tile2.position = { ...pos1 };
    tempGrid[pos1.row][pos1.col] = tile2;
    tempGrid[pos2.row][pos2.col] = tile1;

    // Check for matches
    const matches = findAllMatches(tempGrid);
    return matches.length > 0;
};

// Get all unique tiles that are part of any match
export const getMatchedTiles = (matches: Match[]): Set<string> => {
    const matchedTileIds = new Set<string>();
    matches.forEach((match) => {
        match.tiles.forEach((tile) => {
            matchedTileIds.add(tile.id);
        });
    });
    return matchedTileIds;
};

// Calculate score for matches
export const calculateMatchScore = (matches: Match[], combo: number): number => {
    let score = 0;

    matches.forEach((match) => {
        // Base score: 50 points per tile
        const baseScore = match.tiles.length * 50;

        // Bonus for longer matches
        const lengthBonus = match.length > 3 ? (match.length - 3) * 100 : 0;

        // Combo multiplier
        const comboMultiplier = 1 + (combo * 0.5);

        score += Math.floor((baseScore + lengthBonus) * comboMultiplier);
    });

    return score;
};

// Check if the grid has any possible moves
export const hasValidMoves = (grid: (Tile | null)[][]): boolean => {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const currentPos: Position = { row, col };

            // Check swap with right neighbor
            if (col < GRID_SIZE - 1) {
                const rightPos: Position = { row, col: col + 1 };
                if (wouldSwapCreateMatch(grid, currentPos, rightPos)) {
                    return true;
                }
            }

            // Check swap with bottom neighbor
            if (row < GRID_SIZE - 1) {
                const bottomPos: Position = { row: row + 1, col };
                if (wouldSwapCreateMatch(grid, currentPos, bottomPos)) {
                    return true;
                }
            }
        }
    }

    return false;
};

// Find a hint (a valid move)
export const findHint = (grid: (Tile | null)[][]): { from: Position; to: Position } | null => {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const currentPos: Position = { row, col };

            // Check swap with right neighbor
            if (col < GRID_SIZE - 1) {
                const rightPos: Position = { row, col: col + 1 };
                if (wouldSwapCreateMatch(grid, currentPos, rightPos)) {
                    return { from: currentPos, to: rightPos };
                }
            }

            // Check swap with bottom neighbor
            if (row < GRID_SIZE - 1) {
                const bottomPos: Position = { row: row + 1, col };
                if (wouldSwapCreateMatch(grid, currentPos, bottomPos)) {
                    return { from: currentPos, to: bottomPos };
                }
            }
        }
    }

    return null;
};
