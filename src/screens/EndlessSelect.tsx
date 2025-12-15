// Endless Mode Theme Selection Screen
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { ThemeType } from '../types';
import { useGameStore } from '../context/GameStore';
import { THEME_CONFIGS, getThemeEmoji, getLevelsByTheme } from '../themes';
import { playSfx } from '../utils/SoundManager';

type Props = NativeStackScreenProps<RootStackParamList, 'EndlessSelect'>;

// Theme order for display
const THEME_ORDER: ThemeType[] = [
    'trash-sorting',
    'pollution',
    'water-conservation',
    'energy-efficiency',
    'deforestation',
];

const EndlessSelect: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const completedLevels = useGameStore((state) => state.completedLevels);
    const highScores = useGameStore((state) => state.highScores);

    // Check if a theme is unlocked (at least one level completed in that theme)
    const isThemeUnlocked = (theme: ThemeType): boolean => {
        // First theme is always unlocked
        if (theme === 'trash-sorting') return true;

        // Get the previous theme in order
        const themeIndex = THEME_ORDER.indexOf(theme);
        if (themeIndex <= 0) return true;

        const prevTheme = THEME_ORDER[themeIndex - 1];
        const prevThemeLevels = getLevelsByTheme(prevTheme);

        // Theme is unlocked if at least 5 levels of previous theme are completed
        const completedInPrevTheme = prevThemeLevels.filter(
            level => completedLevels.includes(level.id)
        ).length;

        return completedInPrevTheme >= 5;
    };

    // Get endless high score for a theme (stored with negative IDs)
    const getEndlessHighScore = (theme: ThemeType): number => {
        const themeIndex = THEME_ORDER.indexOf(theme);
        // Use negative IDs for endless mode high scores (-1 to -5)
        return highScores[-(themeIndex + 1)] || 0;
    };

    const handleThemeSelect = (theme: ThemeType) => {
        if (isThemeUnlocked(theme)) {
            playSfx('tile_select');
            navigation.navigate('Game', {
                levelId: 1,
                isEndless: true,
                endlessTheme: theme
            });
        }
    };

    const handleBack = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>♾️ Endless Mode</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Description */}
            <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                    Play endlessly! No move limit - just keep matching and beat your high score!
                </Text>
            </View>

            {/* Theme Selection */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {THEME_ORDER.map((themeId) => {
                    const theme = THEME_CONFIGS[themeId];
                    const unlocked = isThemeUnlocked(themeId);
                    const highScore = getEndlessHighScore(themeId);

                    return (
                        <TouchableOpacity
                            key={themeId}
                            style={[
                                styles.themeCard,
                                !unlocked && styles.lockedCard,
                            ]}
                            onPress={() => handleThemeSelect(themeId)}
                            disabled={!unlocked}
                        >
                            <View style={styles.themeHeader}>
                                <Text style={styles.themeEmoji}>
                                    {unlocked ? getThemeEmoji(themeId) : '🔒'}
                                </Text>
                                <View style={styles.themeInfo}>
                                    <Text style={[
                                        styles.themeName,
                                        !unlocked && styles.lockedText
                                    ]}>
                                        {theme.name}
                                    </Text>
                                    <Text style={styles.themeDescription}>
                                        {unlocked ? theme.description : 'Complete 5 levels of previous theme to unlock'}
                                    </Text>
                                </View>
                            </View>

                            {unlocked && (
                                <View style={styles.highScoreContainer}>
                                    <Text style={styles.highScoreLabel}>Best Score</Text>
                                    <Text style={styles.highScoreValue}>
                                        {highScore > 0 ? highScore.toLocaleString() : '---'}
                                    </Text>
                                </View>
                            )}

                            {unlocked && (
                                <View style={styles.playButton}>
                                    <Text style={styles.playButtonText}>▶ Play</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 60,
    },
    descriptionBox: {
        backgroundColor: '#2c3e50',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#9b59b6',
    },
    descriptionText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 0,
    },
    themeCard: {
        backgroundColor: '#2c3e50',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#34495e',
    },
    lockedCard: {
        opacity: 0.6,
        borderColor: '#555',
    },
    themeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    themeEmoji: {
        fontSize: 40,
        marginRight: 12,
    },
    themeInfo: {
        flex: 1,
    },
    themeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2ecc71',
        marginBottom: 4,
    },
    lockedText: {
        color: '#888',
    },
    themeDescription: {
        fontSize: 12,
        color: '#aaa',
    },
    highScoreContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    highScoreLabel: {
        fontSize: 14,
        color: '#888',
    },
    highScoreValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFD700',
    },
    playButton: {
        backgroundColor: '#27ae60',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    playButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EndlessSelect;
