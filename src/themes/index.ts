// Theme Configurations for MatchWell
import { Theme, ThemeType, TileType, Level } from '../types';

export const THEME_CONFIGS: Record<ThemeType, Theme> = {
    'trash-sorting': {
        id: 'trash-sorting',
        name: 'Trash Sorting',
        description: 'Learn to sort recyclables! Match trash to keep our planet clean.',
        tileTypes: ['plastic', 'paper', 'glass', 'metal', 'organic'],
        backgroundColor: '#87CEEB', // Sky blue
    },
    'pollution': {
        id: 'pollution',
        name: 'Clear the Air',
        description: 'Remove polluting vehicles to clean up our cities!',
        tileTypes: ['car', 'truck', 'bus', 'factory', 'bicycle'],
        backgroundColor: '#708090', // Slate gray (polluted)
    },
};

// Tile display information
export const TILE_INFO: Record<TileType, { name: string; color: string; emoji: string }> = {
    // Trash Sorting Theme
    plastic: { name: 'Plastic', color: '#3498db', emoji: '🧴' },
    paper: { name: 'Paper', color: '#a0522d', emoji: '📄' },
    glass: { name: 'Glass', color: '#27ae60', emoji: '🫙' },
    metal: { name: 'Metal', color: '#95a5a6', emoji: '🥫' },
    organic: { name: 'Organic', color: '#f39c12', emoji: '🍌' },

    // Pollution Theme
    car: { name: 'Car', color: '#e74c3c', emoji: '🚗' },
    truck: { name: 'Truck', color: '#34495e', emoji: '🚛' },
    bus: { name: 'Bus', color: '#f1c40f', emoji: '🚌' },
    factory: { name: 'Factory', color: '#2c3e50', emoji: '🏭' },
    bicycle: { name: 'Bicycle', color: '#2ecc71', emoji: '🚲' }, // Clean option

    empty: { name: 'Empty', color: 'transparent', emoji: '' },
};

// Level configurations
export const LEVELS: Level[] = [
    // Trash Sorting Levels (1-5)
    {
        id: 1,
        theme: 'trash-sorting',
        targetScore: 1000,
        moves: 20,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'easy',
        environmentalFact: 'Recycling one aluminum can saves enough energy to run a TV for 3 hours!',
    },
    {
        id: 2,
        theme: 'trash-sorting',
        targetScore: 2000,
        moves: 18,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'easy',
        environmentalFact: 'Paper can be recycled 5-7 times before the fibers become too short!',
    },
    {
        id: 3,
        theme: 'trash-sorting',
        targetScore: 3000,
        moves: 16,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'medium',
        environmentalFact: 'Glass is 100% recyclable and can be recycled endlessly without quality loss!',
    },
    {
        id: 4,
        theme: 'trash-sorting',
        targetScore: 4500,
        moves: 15,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'medium',
        environmentalFact: 'Organic waste in landfills produces methane, a powerful greenhouse gas!',
    },
    {
        id: 5,
        theme: 'trash-sorting',
        targetScore: 6000,
        moves: 14,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'hard',
        environmentalFact: 'Proper waste sorting can reduce household waste by up to 80%!',
    },

    // Pollution Levels (6-10)
    {
        id: 6,
        theme: 'pollution',
        targetScore: 3500,
        moves: 18,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'easy',
        environmentalFact: 'Transportation accounts for about 29% of greenhouse gas emissions!',
    },
    {
        id: 7,
        theme: 'pollution',
        targetScore: 5000,
        moves: 16,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'medium',
        environmentalFact: 'Electric vehicles produce zero direct emissions!',
    },
    {
        id: 8,
        theme: 'pollution',
        targetScore: 6500,
        moves: 15,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'medium',
        environmentalFact: 'Cycling instead of driving for short trips can reduce your carbon footprint significantly!',
    },
    {
        id: 9,
        theme: 'pollution',
        targetScore: 8000,
        moves: 14,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'hard',
        environmentalFact: 'Public transportation uses 50% less fuel per passenger mile than private cars!',
    },
    {
        id: 10,
        theme: 'pollution',
        targetScore: 10000,
        moves: 12,
        gridSize: { rows: 8, cols: 8 },
        difficulty: 'hard',
        environmentalFact: 'Planting trees can help absorb CO2 and clean the air we breathe!',
    },
];

// Get level by ID
export const getLevelById = (id: number): Level | undefined => {
    return LEVELS.find((level) => level.id === id);
};

// Get all levels for a theme
export const getLevelsByTheme = (theme: ThemeType): Level[] => {
    return LEVELS.filter((level) => level.theme === theme);
};

// Get max unlocked level based on completed levels
export const getMaxUnlockedLevel = (completedLevels: number[]): number => {
    if (completedLevels.length === 0) return 1;
    return Math.max(...completedLevels) + 1;
};

// Environmental messages based on progress
export const getEnvironmentalMessage = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;

    if (percentage >= 100) return '🌍 Perfect! You\'re an Eco Champion!';
    if (percentage >= 80) return '🌳 Amazing! The Earth is healing!';
    if (percentage >= 60) return '🌱 Great progress! Keep going!';
    if (percentage >= 40) return '♻️ Good start! Every action counts!';
    return '💪 You can do it! Save the planet!';
};
