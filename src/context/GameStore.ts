// Game State Store using Zustand with AsyncStorage persistence
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
import { playSfx } from '../utils/SoundManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'matchwell_progress';

interface SavedProgress {
    completedLevels: number[];
    highScores: Record<number, number>;
}

interface GameStore extends GameState {
    // Actions
    initializeGame: (levelId: number, isEndless?: boolean, endlessTheme?: ThemeType) => void;
    selectTile: (position: Position) => void;
    swapSelectedTiles: (pos1: Position, pos2: Position) => void;
    swapWithDirection: (position: Position, direction: 'up' | 'down' | 'left' | 'right') => void;
    processMatches: () => void;
    resetCombo: () => void;
    pauseGame: () => void;
    resumeGame: () => void;
    loadProgress: () => Promise<void>;
    saveProgress: () => Promise<void>;

    // UI State
    selectedTile: Position | null;
    isPaused: boolean;
    isProcessing: boolean;
    isEndlessMode: boolean;
    completedLevels: number[];
    highScores: Record<number, number>;

    // Setters
    setSelectedTile: (position: Position | null) => void;
    setIsProcessing: (value: boolean) => void;
    markLevelComplete: (levelId: number, score: number) => void;
    saveEndlessHighScore: (theme: ThemeType, score: number) => void;
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
    isEndlessMode: false,
    completedLevels: [],
    highScores: {},

    // Load progress from AsyncStorage
    loadProgress: async () => {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                const progress: SavedProgress = JSON.parse(saved);
                set({
                    completedLevels: progress.completedLevels || [],
                    highScores: progress.highScores || {},
                });
                console.log('✅ Progress loaded:', progress);
            }
        } catch (error) {
            console.warn('Failed to load progress:', error);
        }
    },

    // Save progress to AsyncStorage
    saveProgress: async () => {
        try {
            const { completedLevels, highScores } = get();
            const progress: SavedProgress = { completedLevels, highScores };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
            console.log('✅ Progress saved:', progress);
        } catch (error) {
            console.warn('Failed to save progress:', error);
        }
    },

    // Initialize a new game with a specific level
    initializeGame: (levelId: number, isEndless: boolean = false, endlessTheme?: ThemeType) => {
        // For endless mode, use the provided theme; otherwise get from level
        let themeToUse: ThemeType;
        let targetScore: number;
        let movesRemaining: number;

        if (isEndless && endlessTheme) {
            // Endless mode with selected theme
            themeToUse = endlessTheme;
            targetScore = 999999; // No target in endless
            movesRemaining = 0; // Start from 0, counts up
        } else {
            const level = getLevelById(levelId);
            if (!level) {
                console.error(`Level ${levelId} not found`);
                return;
            }
            themeToUse = level.theme;
            targetScore = level.targetScore;
            movesRemaining = level.moves;
        }

        const grid = createGrid(themeToUse);

        set({
            grid,
            score: 0,
            moves: 0,
            movesRemaining,
            targetScore,
            level: levelId,
            isGameOver: false,
            isLevelComplete: false,
            combo: 0,
            theme: themeToUse,
            selectedTile: null,
            isPaused: false,
            isProcessing: false,
            isEndlessMode: isEndless,
        });
    },

    // Select a tile (for swap mechanic)
    selectTile: (position: Position) => {
        const { selectedTile, grid, isProcessing, movesRemaining, isEndlessMode } = get();

        // In endless mode, don't check moves (always have moves)
        if (isProcessing || (!isEndlessMode && movesRemaining <= 0)) return;

        // If no tile selected, select this one
        if (!selectedTile) {
            playSfx('tile_select');
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
            playSfx('tile_select');
            set({ selectedTile: position });
        }
    },

    // Swap two tiles
    swapSelectedTiles: (pos1: Position, pos2: Position) => {
        const { grid, theme, movesRemaining, isEndlessMode } = get();

        // In endless mode, don't check moves
        if (!isEndlessMode && movesRemaining <= 0) return;

        // Check if swap would create a match
        if (!wouldSwapCreateMatch(grid, pos1, pos2)) {
            // Invalid swap - just deselect
            playSfx('invalid_move');
            set({ selectedTile: null });
            return;
        }

        // Perform the swap
        const newGrid = swapTiles(grid, pos1, pos2);

        set({
            grid: newGrid,
            selectedTile: null,
            moves: get().moves + 1,
            // In endless mode: increment (count up), otherwise decrement
            movesRemaining: isEndlessMode ? movesRemaining + 1 : movesRemaining - 1,
            isProcessing: true,
        });

        // Process matches after a short delay (for animation)
        setTimeout(() => {
            get().processMatches();
        }, 200);
    },

    // Swap tile in a direction (for swipe gesture)
    swapWithDirection: (position: Position, direction: 'up' | 'down' | 'left' | 'right') => {
        const { grid, movesRemaining, isProcessing, isEndlessMode } = get();

        if (isProcessing || (!isEndlessMode && movesRemaining <= 0)) return;

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
        const { grid, theme, score, combo, targetScore, movesRemaining, isEndlessMode } = get();

        // Find matches
        const matches = findAllMatches(cloneGrid(grid));

        if (matches.length === 0) {
            // No more matches - check game state
            const newCombo = 0;

            // In endless mode, never end the game for score
            if (!isEndlessMode && score >= targetScore) {
                playSfx('level_complete');
                set({
                    isLevelComplete: true,
                    isProcessing: false,
                    combo: newCombo
                });
            } else if (!isEndlessMode && movesRemaining <= 0) {
                playSfx('game_over');
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

        // Play combo sound
        playSfx('combo');

        // Play special sounds for longer matches
        const maxMatchLength = Math.max(...matches.map(m => m.length));
        if (maxMatchLength >= 5) {
            playSfx('match_5');
        } else if (maxMatchLength >= 4) {
            playSfx('match_4');
        }

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
        const { completedLevels, highScores, isEndlessMode } = get();

        // Don't save endless mode progress
        if (isEndlessMode) return;

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

        // Save progress to AsyncStorage
        get().saveProgress();
    },

    saveEndlessHighScore: (theme: ThemeType, score: number) => {
        const { highScores } = get();

        // Use negative IDs for endless high scores based on theme index
        const themeOrder: ThemeType[] = ['trash-sorting', 'pollution', 'water-conservation', 'energy-efficiency', 'deforestation'];
        const themeIndex = themeOrder.indexOf(theme);
        const endlessId = -(themeIndex + 1); // -1, -2, -3, -4, -5

        const currentHighScore = highScores[endlessId] || 0;

        // Only save if new score is higher
        if (score > currentHighScore) {
            const newHighScores = {
                ...highScores,
                [endlessId]: score,
            };

            set({ highScores: newHighScores });

            // Save progress to AsyncStorage
            get().saveProgress();
            console.log(`✅ Endless high score saved for ${theme}: ${score}`);
        }
    },
}));
