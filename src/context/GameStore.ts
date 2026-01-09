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
const getEndlessStateKey = (theme: ThemeType) => `matchwell_endless_state_${theme}`;

interface SavedProgress {
    completedLevels: number[];
    highScores: Record<number, number>;
    levelMovesRemaining: Record<number, number>; // Best remaining moves for each level
    unseenAchievements: string[]; // Achievement IDs that user hasn't seen yet
    endlessMoves: Record<number, number>; // Moves used when achieving high score for endless (keyed by negative ID)
}

interface SavedEndlessState {
    theme: ThemeType;
    grid: (Tile | null)[][];
    score: number;
    moves: number;
    combo: number;
    powerProgress: number;
    timestamp: number;
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
    resetGameState: () => void;
    loadProgress: () => Promise<void>;
    saveProgress: () => Promise<void>;
    resetProgress: () => Promise<void>;
    saveEndlessState: () => Promise<void>;
    loadEndlessState: (theme: ThemeType) => Promise<boolean>;
    clearEndlessState: (theme?: ThemeType) => Promise<void>;
    hasEndlessState: (theme: ThemeType) => Promise<boolean>;

    // Power-up state
    powerProgress: number; // 0-15 power points
    isPowerUpActive: boolean; // User clicked power-up, waiting for block selection
    activatePowerUp: () => void;
    cancelPowerUp: () => void;
    usePowerUpOnBlock: (position: Position) => void;

    // UI State
    selectedTile: Position | null;
    isPaused: boolean;
    isProcessing: boolean;
    isEndlessMode: boolean;
    completedLevels: number[];
    highScores: Record<number, number>;
    endlessMoves: Record<number, number>; // Moves when achieving endless high score
    levelMovesRemaining: Record<number, number>; // Best remaining moves for star calculation

    // Setters
    setSelectedTile: (position: Position | null) => void;
    setIsProcessing: (value: boolean) => void;
    markLevelComplete: (levelId: number, score: number, movesRemaining: number) => void;
    saveEndlessHighScore: (theme: ThemeType, score: number, moves: number) => void;
    addUnseenAchievement: (achievementId: string) => void;
    clearUnseenAchievements: () => void;
    unseenAchievements: string[];
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
    endlessMoves: {},
    levelMovesRemaining: {},
    unseenAchievements: [],

    // Power-up state
    powerProgress: 0,
    isPowerUpActive: false,

    // Load progress from AsyncStorage
    loadProgress: async () => {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                const progress: SavedProgress = JSON.parse(saved);
                set({
                    completedLevels: progress.completedLevels || [],
                    highScores: progress.highScores || {},
                    levelMovesRemaining: progress.levelMovesRemaining || {},
                    unseenAchievements: progress.unseenAchievements || [],
                    endlessMoves: progress.endlessMoves || {},
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
            const { completedLevels, highScores, levelMovesRemaining, unseenAchievements, endlessMoves } = get();
            const progress: SavedProgress = { completedLevels, highScores, levelMovesRemaining, unseenAchievements, endlessMoves: endlessMoves || {} };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
            console.log('✅ Progress saved:', progress);
        } catch (error) {
            console.warn('Failed to save progress:', error);
        }
    },

    // Reset all progress data
    resetProgress: async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            set({
                completedLevels: [],
                highScores: {},
            });
            console.log('✅ Progress reset');
        } catch (error) {
            console.warn('Failed to reset progress:', error);
        }
    },

    // Add a new unseen achievement
    addUnseenAchievement: (achievementId: string) => {
        const { unseenAchievements, saveProgress } = get();
        if (!unseenAchievements.includes(achievementId)) {
            set({ unseenAchievements: [...unseenAchievements, achievementId] });
            saveProgress();
        }
    },

    // Clear all unseen achievements (when user views Achievements screen)
    clearUnseenAchievements: () => {
        const { saveProgress } = get();
        set({ unseenAchievements: [] });
        saveProgress();
    },

    // Save current endless mode state for resume
    saveEndlessState: async () => {
        try {
            const { grid, score, moves, combo, theme, isEndlessMode, powerProgress } = get();
            if (!isEndlessMode) return;

            const endlessState: SavedEndlessState = {
                theme,
                grid,
                score,
                moves,
                combo,
                powerProgress,
                timestamp: Date.now(),
            };
            await AsyncStorage.setItem(getEndlessStateKey(theme), JSON.stringify(endlessState));
            console.log('✅ Endless state saved:', theme, score);
        } catch (error) {
            console.warn('Failed to save endless state:', error);
        }
    },

    // Load saved endless state for a specific theme
    loadEndlessState: async (theme: ThemeType): Promise<boolean> => {
        try {
            const saved = await AsyncStorage.getItem(getEndlessStateKey(theme));
            if (!saved) return false;

            const state: SavedEndlessState = JSON.parse(saved);

            // Endless saves persist indefinitely (no expiration)

            set({
                grid: state.grid,
                score: state.score,
                moves: state.moves,
                combo: state.combo,
                theme: state.theme,
                level: 0,
                targetScore: 999999,
                movesRemaining: 0,
                isGameOver: false,
                isLevelComplete: false,
                isPaused: false,
                selectedTile: null,
                isProcessing: false,
                isEndlessMode: true,
                powerProgress: state.powerProgress || 0,
            });
            console.log('✅ Endless state loaded:', theme, state.score);
            return true;
        } catch (error) {
            console.warn('Failed to load endless state:', error);
            return false;
        }
    },

    // Clear saved endless state for a specific theme
    clearEndlessState: async (theme?: ThemeType) => {
        try {
            // If theme provided, clear only that theme; otherwise clear current theme
            const themeToUse = theme || get().theme;
            await AsyncStorage.removeItem(getEndlessStateKey(themeToUse));
            console.log('✅ Endless state cleared for:', themeToUse);
        } catch (error) {
            console.warn('Failed to clear endless state:', error);
        }
    },

    // Check if there's a saved endless state for a theme
    hasEndlessState: async (theme: ThemeType): Promise<boolean> => {
        try {
            const saved = await AsyncStorage.getItem(getEndlessStateKey(theme));
            if (!saved) return false;

            // Endless saves persist indefinitely (no expiration)
            // Just verify the saved state is valid JSON
            JSON.parse(saved);

            return true;
        } catch (error) {
            return false;
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
            level: isEndless ? 0 : levelId, // 0 for endless mode, actual level for story
            isGameOver: false,
            isLevelComplete: false,
            combo: 0,
            theme: themeToUse,
            selectedTile: null,
            isPaused: false,
            isProcessing: false,
            isEndlessMode: isEndless,
            powerProgress: 0,
            isPowerUpActive: false,
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

        // Calculate power progress for 4+ matches
        // 4-match = 2 points, 5+ match = 5 points
        const { powerProgress } = get();
        let powerGain = 0;
        matches.forEach((match) => {
            if (match.length >= 5) {
                powerGain += 5;
            } else if (match.length >= 4) {
                powerGain += 2;
            }
        });
        const newPowerProgress = Math.min(powerProgress + powerGain, 15); // Cap at 15

        // PHASE 1: Mark matched tiles (triggers fade-out animation)
        const markedGrid = cloneGrid(grid);
        matches.forEach((match) => {
            match.tiles.forEach((tile) => {
                const gridTile = markedGrid[tile.position.row][tile.position.col];
                if (gridTile) {
                    gridTile.isMatched = true;
                }
            });
        });

        // Update grid with marked tiles and score
        set({
            grid: markedGrid,
            score: newScore,
            combo: newCombo,
            powerProgress: newPowerProgress,
        });

        // PHASE 2: Wait for fade-out animation (500ms), then remove, apply gravity, and fill
        setTimeout(() => {
            // Remove matched tiles
            let newGrid = removeMatchedTiles(markedGrid, matches);

            // Apply gravity
            newGrid = applyGravity(newGrid);

            // Fill empty spaces
            newGrid = fillEmptySpaces(newGrid, theme);

            set({ grid: newGrid });

            // PHASE 3: Continue processing for cascades after a short delay
            setTimeout(() => {
                get().processMatches();
            }, 200);
        }, 500);
    },

    resetCombo: () => set({ combo: 0 }),

    pauseGame: () => set({ isPaused: true }),

    resumeGame: () => set({ isPaused: false }),

    // Reset all game state flags (used when navigating away from game)
    resetGameState: () => set({
        isPaused: false,
        isLevelComplete: false,
        isGameOver: false
    }),

    setSelectedTile: (position) => set({ selectedTile: position }),

    setIsProcessing: (value) => set({ isProcessing: value }),

    markLevelComplete: (levelId: number, score: number, movesRemaining: number) => {
        const { completedLevels, highScores, levelMovesRemaining, isEndlessMode } = get();

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

        // Save best moves remaining (higher is better)
        const currentBestMoves = levelMovesRemaining[levelId] || 0;
        const newLevelMovesRemaining = {
            ...levelMovesRemaining,
            [levelId]: Math.max(currentBestMoves, movesRemaining),
        };

        set({
            completedLevels: newCompletedLevels,
            highScores: newHighScores,
            levelMovesRemaining: newLevelMovesRemaining,
        });

        // Save progress to AsyncStorage
        get().saveProgress();
    },

    saveEndlessHighScore: (theme: ThemeType, score: number, moves: number) => {
        const { highScores, endlessMoves } = get();

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
            const newEndlessMoves = {
                ...endlessMoves,
                [endlessId]: moves,
            };

            set({ highScores: newHighScores, endlessMoves: newEndlessMoves });

            // Save progress to AsyncStorage
            get().saveProgress();
            console.log(`✅ Endless high score saved for ${theme}: ${score} in ${moves} moves`);
        }
    },

    // Power-up methods (toggle behavior - tap again to deactivate)
    activatePowerUp: () => {
        const { powerProgress, isPowerUpActive } = get();
        console.log('🔋 activatePowerUp called, powerProgress:', powerProgress, 'isPowerUpActive:', isPowerUpActive);

        // Toggle: if already active, deactivate
        if (isPowerUpActive) {
            set({ isPowerUpActive: false, selectedTile: null });
            console.log('❌ Power-up deactivated (toggled off)');
            return;
        }

        if (powerProgress >= 10) {
            set({ isPowerUpActive: true, selectedTile: null });
            console.log('✅ Power-up activated!');
            playSfx('combo');
        }
    },

    cancelPowerUp: () => {
        set({ isPowerUpActive: false });
    },

    usePowerUpOnBlock: (position: Position) => {
        const { grid, theme, powerProgress, isPowerUpActive } = get();
        console.log('⚡ usePowerUpOnBlock called:', { position, isPowerUpActive, powerProgress });
        if (!isPowerUpActive || powerProgress < 10) {
            console.log('❌ Power-up not active or not enough power');
            return;
        }

        const { row, col } = position;
        const gridSize = grid.length;
        console.log('📍 Position:', { row, col, gridSize });
        const isTopRow = row === 0;
        const isBottomRow = row === gridSize - 1;
        const isLeftCol = col === 0;
        const isRightCol = col === gridSize - 1;
        const isCorner = (isTopRow || isBottomRow) && (isLeftCol || isRightCol);
        const isDoublePower = powerProgress >= 15;
        console.log('🧱 Border checks:', { isTopRow, isBottomRow, isLeftCol, isRightCol, isCorner, isDoublePower });

        // Validate it's a border block
        if (!isTopRow && !isBottomRow && !isLeftCol && !isRightCol) {
            console.log('❌ Not a border block, canceling');
            set({ isPowerUpActive: false });
            return;
        }

        // Corners are only allowed at 15+ points
        if (isCorner && !isDoublePower) {
            console.log('❌ Corner requires 15+ power points, canceling');
            set({ isPowerUpActive: false });
            return;
        }

        console.log('✅ Valid border block, executing power-up!');
        playSfx('match_5');

        // PHASE 1: Mark tiles for removal
        const markedGrid = cloneGrid(grid);

        if (isDoublePower) {
            // At 15+ points: Remove both row and column on ANY border block
            for (let c = 0; c < gridSize; c++) {
                const tile = markedGrid[row][c];
                if (tile) tile.isMatched = true;
            }
            for (let r = 0; r < gridSize; r++) {
                const tile = markedGrid[r][col];
                if (tile) tile.isMatched = true;
            }
        } else if (isLeftCol || isRightCol) {
            // Side edge at 10-14 pts: remove row only
            for (let c = 0; c < gridSize; c++) {
                const tile = markedGrid[row][c];
                if (tile) tile.isMatched = true;
            }
        } else {
            // Top/bottom edge at 10-14 pts: remove column only
            for (let r = 0; r < gridSize; r++) {
                const tile = markedGrid[r][col];
                if (tile) tile.isMatched = true;
            }
        }

        // Count removed tiles for score bonus
        let tilesRemoved = 0;
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (markedGrid[r][c]?.isMatched) {
                    tilesRemoved++;
                }
            }
        }
        // Score bonus: 50 points per tile removed by power-up
        const { score } = get();
        const powerUpBonus = tilesRemoved * 50;
        console.log(`🎯 Power-up removed ${tilesRemoved} tiles, bonus: ${powerUpBonus}`);

        // Update grid with marked tiles, reset power-up state, and add score
        set({
            grid: markedGrid,
            isPowerUpActive: false,
            powerProgress: 0,
            score: score + powerUpBonus,
        });

        // PHASE 2: Wait for animation, then remove and fill
        setTimeout(() => {
            let newGrid = cloneGrid(markedGrid);

            // Remove marked tiles
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (newGrid[r][c]?.isMatched) {
                        newGrid[r][c] = null;
                    }
                }
            }

            // Apply gravity
            newGrid = applyGravity(newGrid);

            // Fill empty spaces
            newGrid = fillEmptySpaces(newGrid, theme);

            set({ grid: newGrid });

            // Check for new matches after power-up
            setTimeout(() => {
                get().processMatches();
            }, 200);
        }, 500);
    },
}));
