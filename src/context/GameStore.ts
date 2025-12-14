// Game State Store using Zustand
import { create } from 'zustand';
import { GameState, Tile, ThemeType, Position, Match } from '../types';
import {
    createGrid,
    swapTiles,
    cloneGrid,
    removeMatchedTiles,
    applyGravity,
    fillEmptySpaces,
    areAdjacent
} from '../engine/GridSystem';
import {
    findAllMatches,
    calculateMatchScore,
    wouldSwapCreateMatch,
    hasValidMoves
} from '../engine/MatchDetector';
import { getLevelById, LEVELS } from '../themes';

interface GameStore extends GameState {
    // Actions
    initializeGame: (levelId: number) => void;
    selectTile: (position: Position) => void;
    swapSelectedTiles: (pos1: Position, pos2: Position) => void;
    swapWithDirection: (position: Position, direction: 'up' | 'down' | 'left' | 'right') => void;
    processMatches: () => void;
    resetCombo: () => void;
    pauseGame: () => void;
    resumeGame: () => void;

    // UI State
    selectedTile: Position | null;
    isPaused: boolean;
    isProcessing: boolean;
    completedLevels: number[];
    highScores: Record<number, number>;

    // Setters
    setSelectedTile: (position: Position | null) => void;
    setIsProcessing: (value: boolean) => void;
    markLevelComplete: (levelId: number, score: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
    // Initial state
    grid: [],
    score: 0,
    moves: 0,
    movesRemaining: 20,
    targetScore: 1000,
    level: 1,
    isGameOver: false,
    isLevelComplete: false,
    combo: 0,
    theme: 'trash-sorting',

    // UI state
    selectedTile: null,
    isPaused: false,
    isProcessing: false,
    completedLevels: [],
    highScores: {},

    // Initialize a new game with a specific level
    initializeGame: (levelId: number) => {
        const level = getLevelById(levelId);
        if (!level) {
            console.error(`Level ${levelId} not found`);
            return;
        }

        const grid = createGrid(level.theme);

        set({
            grid,
            score: 0,
            moves: 0,
            movesRemaining: level.moves,
            targetScore: level.targetScore,
            level: levelId,
            isGameOver: false,
            isLevelComplete: false,
            combo: 0,
            theme: level.theme,
            selectedTile: null,
            isPaused: false,
            isProcessing: false,
        });
    },

    // Select a tile (for swap mechanic)
    selectTile: (position: Position) => {
        const { selectedTile, grid, isProcessing, movesRemaining } = get();

        if (isProcessing || movesRemaining <= 0) return;

        // If no tile selected, select this one
        if (!selectedTile) {
            set({ selectedTile: position });
            return;
        }

        // If same tile clicked, deselect
        if (selectedTile.row === position.row && selectedTile.col === position.col) {
            set({ selectedTile: null });
            return;
        }

        // If adjacent tile clicked, attempt swap
        if (areAdjacent(selectedTile, position)) {
            get().swapSelectedTiles(selectedTile, position);
        } else {
            // Select the new tile instead
            set({ selectedTile: position });
        }
    },

    // Swap two tiles
    swapSelectedTiles: (pos1: Position, pos2: Position) => {
        const { grid, theme, movesRemaining } = get();

        if (movesRemaining <= 0) return;

        // Check if swap would create a match
        if (!wouldSwapCreateMatch(grid, pos1, pos2)) {
            // Invalid swap - just deselect
            set({ selectedTile: null });
            return;
        }

        // Perform the swap
        const newGrid = swapTiles(grid, pos1, pos2);

        set({
            grid: newGrid,
            selectedTile: null,
            moves: get().moves + 1,
            movesRemaining: movesRemaining - 1,
            isProcessing: true,
        });

        // Process matches after a short delay (for animation)
        setTimeout(() => {
            get().processMatches();
        }, 200);
    },

    // Swap tile in a direction (for swipe gesture)
    swapWithDirection: (position: Position, direction: 'up' | 'down' | 'left' | 'right') => {
        const { grid, movesRemaining, isProcessing } = get();

        if (isProcessing || movesRemaining <= 0) return;

        // Calculate target position based on direction
        let targetPos: Position;
        switch (direction) {
            case 'up':
                targetPos = { row: position.row - 1, col: position.col };
                break;
            case 'down':
                targetPos = { row: position.row + 1, col: position.col };
                break;
            case 'left':
                targetPos = { row: position.row, col: position.col - 1 };
                break;
            case 'right':
                targetPos = { row: position.row, col: position.col + 1 };
                break;
        }

        // Check if target is within bounds
        if (targetPos.row < 0 || targetPos.row >= 8 || targetPos.col < 0 || targetPos.col >= 8) {
            return; // Out of bounds
        }

        // Attempt the swap
        get().swapSelectedTiles(position, targetPos);
    },

    // Process all matches, apply gravity, fill, repeat
    processMatches: () => {
        const { grid, theme, score, combo, targetScore, movesRemaining } = get();

        // Find matches
        const matches = findAllMatches(cloneGrid(grid));

        if (matches.length === 0) {
            // No more matches - check game state
            const newCombo = 0;

            // Check for game over or level complete
            if (score >= targetScore) {
                set({
                    isLevelComplete: true,
                    isProcessing: false,
                    combo: newCombo
                });
            } else if (movesRemaining <= 0) {
                set({
                    isGameOver: true,
                    isProcessing: false,
                    combo: newCombo
                });
            } else if (!hasValidMoves(grid)) {
                // No valid moves - reshuffle
                const newGrid = createGrid(theme);
                set({
                    grid: newGrid,
                    isProcessing: false,
                    combo: newCombo
                });
            } else {
                set({
                    isProcessing: false,
                    combo: newCombo
                });
            }
            return;
        }

        // Calculate score
        const matchScore = calculateMatchScore(matches, combo);
        const newScore = score + matchScore;
        const newCombo = combo + 1;

        // Remove matched tiles
        let newGrid = removeMatchedTiles(grid, matches);

        // Apply gravity
        newGrid = applyGravity(newGrid);

        // Fill empty spaces
        newGrid = fillEmptySpaces(newGrid, theme);

        set({
            grid: newGrid,
            score: newScore,
            combo: newCombo,
        });

        // Continue processing for cascades
        setTimeout(() => {
            get().processMatches();
        }, 300);
    },

    resetCombo: () => set({ combo: 0 }),

    pauseGame: () => set({ isPaused: true }),

    resumeGame: () => set({ isPaused: false }),

    setSelectedTile: (position) => set({ selectedTile: position }),

    setIsProcessing: (value) => set({ isProcessing: value }),

    markLevelComplete: (levelId: number, score: number) => {
        const { completedLevels, highScores } = get();

        const newCompletedLevels = completedLevels.includes(levelId)
            ? completedLevels
            : [...completedLevels, levelId];

        const currentHighScore = highScores[levelId] || 0;
        const newHighScores = {
            ...highScores,
            [levelId]: Math.max(currentHighScore, score),
        };

        set({
            completedLevels: newCompletedLevels,
            highScores: newHighScores,
        });
    },
}));
