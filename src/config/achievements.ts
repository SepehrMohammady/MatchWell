// Achievements Configuration for MatchWell
import { ThemeType } from '../types';

// Achievement Categories
export type AchievementCategory = 'theme' | 'stars' | 'endless';

// Achievement Tier for endless
export type EndlessTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'earth-saver';

export interface Achievement {
    id: string;
    category: AchievementCategory;
    name: string;
    description: string;
    emoji: string;
    theme?: ThemeType; // For theme-specific achievements
    tier?: EndlessTier; // For endless score tiers
    requirement: number; // Stars for star achievements, score for endless
}

// Theme Completion Achievements (5)
export const THEME_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'theme-trash-sorting',
        category: 'theme',
        name: 'Recycler',
        description: 'Complete all Trash Sorting levels',
        emoji: '♻️',
        theme: 'trash-sorting',
        requirement: 10, // 10 levels
    },
    {
        id: 'theme-pollution',
        category: 'theme',
        name: 'Clean Air Champion',
        description: 'Complete all Pollution levels',
        emoji: '🌬️',
        theme: 'pollution',
        requirement: 10,
    },
    {
        id: 'theme-water-conservation',
        category: 'theme',
        name: 'Water Guardian',
        description: 'Complete all Water Conservation levels',
        emoji: '💧',
        theme: 'water-conservation',
        requirement: 10,
    },
    {
        id: 'theme-energy-efficiency',
        category: 'theme',
        name: 'Energy Saver',
        description: 'Complete all Energy Efficiency levels',
        emoji: '⚡',
        theme: 'energy-efficiency',
        requirement: 10,
    },
    {
        id: 'theme-deforestation',
        category: 'theme',
        name: 'Forest Protector',
        description: 'Complete all Deforestation levels',
        emoji: '🌳',
        theme: 'deforestation',
        requirement: 10,
    },
];

// Star Milestone Achievements (5)
export const STAR_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'stars-30',
        category: 'stars',
        name: 'Bronze Collector',
        description: 'Earn 30 total stars',
        emoji: '🥉',
        requirement: 30,
    },
    {
        id: 'stars-60',
        category: 'stars',
        name: 'Silver Collector',
        description: 'Earn 60 total stars',
        emoji: '🥈',
        requirement: 60,
    },
    {
        id: 'stars-90',
        category: 'stars',
        name: 'Gold Collector',
        description: 'Earn 90 total stars',
        emoji: '🥇',
        requirement: 90,
    },
    {
        id: 'stars-120',
        category: 'stars',
        name: 'Diamond Collector',
        description: 'Earn 120 total stars',
        emoji: '💎',
        requirement: 120,
    },
    {
        id: 'stars-150',
        category: 'stars',
        name: 'Star Master',
        description: 'Earn all 150 stars',
        emoji: '🏆',
        requirement: 150,
    },
];

// Endless Score Tiers Configuration
const ENDLESS_TIERS: { tier: EndlessTier; name: string; emoji: string; score: number }[] = [
    { tier: 'bronze', name: 'Bronze', emoji: '🥉', score: 50000 },
    { tier: 'silver', name: 'Silver', emoji: '🥈', score: 500000 },
    { tier: 'gold', name: 'Gold', emoji: '🥇', score: 5000000 },
    { tier: 'diamond', name: 'Diamond', emoji: '💎', score: 50000000 },
    { tier: 'earth-saver', name: 'Earth Saver', emoji: '🌍', score: 500000000 },
];

// Theme names for display
const THEME_NAMES: Record<ThemeType, string> = {
    'trash-sorting': 'Trash Sorting',
    'pollution': 'Pollution',
    'water-conservation': 'Water Conservation',
    'energy-efficiency': 'Energy Efficiency',
    'deforestation': 'Deforestation',
};

// Generate Endless Score Achievements (5 themes × 5 tiers = 25)
export const ENDLESS_ACHIEVEMENTS: Achievement[] = (() => {
    const achievements: Achievement[] = [];
    const themes: ThemeType[] = [
        'trash-sorting',
        'pollution',
        'water-conservation',
        'energy-efficiency',
        'deforestation',
    ];

    themes.forEach((theme) => {
        ENDLESS_TIERS.forEach(({ tier, name, emoji, score }) => {
            achievements.push({
                id: `endless-${theme}-${tier}`,
                category: 'endless',
                name: `${name} ${THEME_NAMES[theme]}`,
                description: `Score ${formatScore(score)} in ${THEME_NAMES[theme]} Endless`,
                emoji,
                theme,
                tier,
                requirement: score,
            });
        });
    });

    return achievements;
})();

// All achievements combined
export const ALL_ACHIEVEMENTS: Achievement[] = [
    ...THEME_ACHIEVEMENTS,
    ...STAR_ACHIEVEMENTS,
    ...ENDLESS_ACHIEVEMENTS,
];

// Helper function to format large scores
function formatScore(score: number): string {
    if (score >= 1000000000) return `${score / 1000000000}B`;
    if (score >= 1000000) return `${score / 1000000}M`;
    if (score >= 1000) return `${score / 1000}K`;
    return score.toString();
}

// Get theme order for endless score IDs
const THEME_ORDER: ThemeType[] = [
    'trash-sorting',
    'pollution',
    'water-conservation',
    'energy-efficiency',
    'deforestation',
];

// Check functions
export const checkThemeAchievement = (
    themeId: ThemeType,
    completedLevels: number[],
    getLevelsByTheme: (theme: ThemeType) => { id: number }[]
): boolean => {
    const themeLevels = getLevelsByTheme(themeId);
    return themeLevels.every((level) => completedLevels.includes(level.id));
};

export const checkStarAchievement = (
    requirement: number,
    levelMovesRemaining: Record<number, number>,
    getLevelById: (id: number) => { moves: number } | undefined,
    allLevelIds: number[]
): boolean => {
    let totalStars = 0;
    allLevelIds.forEach((levelId) => {
        const level = getLevelById(levelId);
        const movesRemaining = levelMovesRemaining[levelId];
        if (level && movesRemaining !== undefined) {
            const movesPercentage = movesRemaining / level.moves;
            if (movesPercentage >= 0.50) totalStars += 3;
            else if (movesPercentage >= 0.25) totalStars += 2;
            else totalStars += 1;
        }
    });
    return totalStars >= requirement;
};

export const checkEndlessAchievement = (
    themeId: ThemeType,
    requirement: number,
    highScores: Record<number, number>
): boolean => {
    const themeIndex = THEME_ORDER.indexOf(themeId);
    const endlessId = -(themeIndex + 1);
    const score = highScores[endlessId] || 0;
    return score >= requirement;
};

// Get total stars earned (moves-based calculation)
export const getTotalStars = (
    levelMovesRemaining: Record<number, number>,
    getLevelById: (id: number) => { moves: number } | undefined,
    allLevelIds: number[]
): number => {
    let total = 0;
    allLevelIds.forEach((levelId) => {
        const level = getLevelById(levelId);
        const movesRemaining = levelMovesRemaining[levelId];
        if (level && movesRemaining !== undefined) {
            const movesPercentage = movesRemaining / level.moves;
            if (movesPercentage >= 0.50) total += 3;
            else if (movesPercentage >= 0.25) total += 2;
            else total += 1;
        }
    });
    return total;
};
