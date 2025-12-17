// Theme Configurations for MatchWell
// 4 Themes x 10 Levels = 40 Total Levels
import { Theme, ThemeType, TileType, Level } from '../types';

export const THEME_CONFIGS: Record<ThemeType, Theme> = {
    'trash-sorting': {
        id: 'trash-sorting',
        name: 'Trash Sorting',
        description: 'Learn to sort recyclables! Match trash to keep our planet clean.',
        tileTypes: ['plastic', 'paper', 'glass', 'metal', 'organic'],
        backgroundColor: '#87CEEB',
    },
    'pollution': {
        id: 'pollution',
        name: 'Clear the Air',
        description: 'Remove polluting vehicles to clean up our cities!',
        tileTypes: ['car', 'truck', 'bus', 'motorbike', 'airplane'],
        backgroundColor: '#708090',
    },
    'water-conservation': {
        id: 'water-conservation',
        name: 'Water Conservation',
        description: 'Save water! Every drop counts for our future.',
        tileTypes: ['droplet', 'faucet', 'shower', 'washing', 'ocean'],
        backgroundColor: '#4169E1',
    },
    'energy-efficiency': {
        id: 'energy-efficiency',
        name: 'Energy Efficiency',
        description: 'Use clean energy! Power the world sustainably.',
        tileTypes: ['bulb', 'solar', 'wind', 'plug', 'battery'],
        backgroundColor: '#FFD700',
    },
    'deforestation': {
        id: 'deforestation',
        name: 'Save the Forests',
        description: 'Plant trees! Protect our forests for future generations.',
        tileTypes: ['tree', 'leaf', 'seedling', 'forest', 'grass'],
        backgroundColor: '#228B22',
    },
};

// Tile display information
export const TILE_INFO: Record<TileType, { name: string; color: string; emoji: string }> = {
    // Trash Sorting Theme
    plastic: { name: 'Plastic', color: '#3498db', emoji: '🧴' },
    paper: { name: 'Paper', color: '#a0522d', emoji: '📄' },
    glass: { name: 'Glass', color: '#27ae60', emoji: '🫙' },
    metal: { name: 'Metal', color: '#95a5a6', emoji: '🔩' },
    organic: { name: 'Organic', color: '#f39c12', emoji: '🍌' },

    // Pollution Theme
    car: { name: 'Car', color: '#e74c3c', emoji: '🚗' },
    truck: { name: 'Truck', color: '#34495e', emoji: '🚛' },
    bus: { name: 'Bus', color: '#f1c40f', emoji: '🚌' },
    motorbike: { name: 'Motorbike', color: '#2c3e50', emoji: '🏍️' },
    airplane: { name: 'Airplane', color: '#2ecc71', emoji: '✈️' },

    // Water Conservation Theme
    droplet: { name: 'Droplet', color: '#3498db', emoji: '💧' },
    faucet: { name: 'Faucet', color: '#7f8c8d', emoji: '🚰' },
    shower: { name: 'Shower', color: '#1abc9c', emoji: '🚿' },
    washing: { name: 'Washing', color: '#2980b9', emoji: '🧺' },
    ocean: { name: 'Ocean', color: '#0077be', emoji: '🌊' },

    // Energy Efficiency Theme
    bulb: { name: 'Bulb', color: '#f1c40f', emoji: '💡' },
    solar: { name: 'Solar', color: '#e67e22', emoji: '☀️' },
    wind: { name: 'Wind', color: '#3498db', emoji: '🌀' },
    plug: { name: 'Plug', color: '#2c3e50', emoji: '🔌' },
    battery: { name: 'Battery', color: '#27ae60', emoji: '🔋' },

    // Deforestation Theme
    tree: { name: 'Tree', color: '#27ae60', emoji: '🌲' },
    leaf: { name: 'Leaf', color: '#2ecc71', emoji: '🍃' },
    seedling: { name: 'Seedling', color: '#90ee90', emoji: '🌱' },
    forest: { name: 'Forest', color: '#228b22', emoji: '🌳' },
    grass: { name: 'Grass', color: '#8b4513', emoji: '🌿' },

    empty: { name: 'Empty', color: 'transparent', emoji: '' },
};

// Environmental facts by theme
const TRASH_FACTS = [
    'Recycling one aluminum can saves enough energy to run a TV for 3 hours!',
    'Paper can be recycled 5-7 times before the fibers become too short!',
    'Glass is 100% recyclable and can be recycled endlessly without quality loss!',
    'Organic waste in landfills produces methane, a powerful greenhouse gas!',
    'Proper waste sorting can reduce household waste by up to 80%!',
    'Recycling one ton of plastic saves 7.4 cubic yards of landfill space!',
    'It takes 500 years for a plastic bottle to decompose in a landfill!',
    'Composting food scraps reduces methane emissions significantly!',
    'E-waste is the fastest growing waste stream in the world!',
    'The average person generates 4.5 pounds of trash per day!',
];

const POLLUTION_FACTS = [
    'Transportation accounts for about 29% of greenhouse gas emissions!',
    'Electric vehicles produce zero direct emissions!',
    'Cycling instead of driving can reduce your carbon footprint significantly!',
    'Public transportation uses 50% less fuel per passenger mile than private cars!',
    'Planting trees can help absorb CO2 and clean the air we breathe!',
    'Air pollution causes 7 million premature deaths worldwide every year!',
    'Walking instead of driving prevents 1 pound of CO2 per mile!',
    'Carpooling with one other person cuts your emissions in half!',
    'Remote work can reduce your carbon footprint by up to 54%!',
    'Green spaces in cities can reduce urban temperatures by up to 5°C!',
];

const WATER_FACTS = [
    'Only 3% of Earth\'s water is freshwater, and most is frozen!',
    'Turning off the tap while brushing saves 8 gallons of water daily!',
    'A leaky faucet can waste over 3,000 gallons of water per year!',
    'Shorter showers can save up to 150 gallons of water per month!',
    'Rainwater harvesting can reduce household water use by 50%!',
    'Agriculture uses 70% of the world\'s freshwater supply!',
    'One dripping tap can waste enough water to fill a bathtub in a week!',
    'Low-flow showerheads can save 2,700 gallons of water annually!',
    'Fixing leaks can save the average household 10,000 gallons per year!',
    'Water is the essence of life - conservation ensures our future!',
];

const ENERGY_FACTS = [
    'LED bulbs use 75% less energy than traditional incandescent lighting!',
    'Solar panels can reduce electricity bills by 50% to 100%!',
    'Wind energy could power the world 18 times over!',
    'Unplugging devices when not in use can save 10% on electricity!',
    'Energy-efficient appliances can cut utility bills by 30%!',
    'Renewable energy creates 3x more jobs than fossil fuels!',
    'A single wind turbine can power up to 500 homes!',
    'Smart thermostats can save 10-15% on heating and cooling costs!',
    'Solar energy is the fastest-growing power source worldwide!',
    'Batteries are key to storing clean energy for when the sun doesn\'t shine!',
];

const FOREST_FACTS = [
    'Forests are home to 80% of Earth\'s terrestrial biodiversity!',
    'One tree can absorb 48 pounds of CO2 per year!',
    'We lose 18 million acres of forest each year - that\'s 27 soccer fields per minute!',
    'Planting trees is one of the most effective ways to combat climate change!',
    'Forests provide oxygen, clean water, and homes for wildlife!',
    'Bamboo can grow up to 3 feet in 24 hours - nature\'s fastest renewable!',
    'Forest restoration can bring back lost biodiversity in decades!',
    'Old-growth forests store more carbon than young forests!',
    'Paper made from recycled fibers saves 17 trees per ton!',
    'Protecting forests protects our future - every tree counts!',
];

// Generate levels for a theme
const generateLevelsForTheme = (
    theme: ThemeType,
    startId: number,
    facts: string[]
): Level[] => {
    const levels: Level[] = [];
    for (let i = 0; i < 10; i++) {
        const levelNum = i + 1;
        levels.push({
            id: startId + i,
            theme,
            targetScore: 1000 + i * 500 + Math.floor(i / 3) * 1000,
            moves: 20 - Math.min(6, Math.floor(i * 0.8)),
            gridSize: { rows: 8, cols: 8 },
            difficulty: i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard',
            environmentalFact: facts[i],
        });
    }
    return levels;
};

// Level configurations - 4 themes x 10 levels = 40 total
export const LEVELS: Level[] = [
    ...generateLevelsForTheme('trash-sorting', 1, TRASH_FACTS),
    ...generateLevelsForTheme('pollution', 11, POLLUTION_FACTS),
    ...generateLevelsForTheme('water-conservation', 21, WATER_FACTS),
    ...generateLevelsForTheme('energy-efficiency', 31, ENERGY_FACTS),
    ...generateLevelsForTheme('deforestation', 41, FOREST_FACTS),
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

// Get theme emoji for display
export const getThemeEmoji = (theme: ThemeType): string => {
    switch (theme) {
        case 'trash-sorting': return '♻️';
        case 'pollution': return '🏭';
        case 'water-conservation': return '💧';
        case 'energy-efficiency': return '⚡';
        case 'deforestation': return '🌲';
        default: return '🌍';
    }
};
