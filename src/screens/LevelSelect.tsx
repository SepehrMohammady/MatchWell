// Level Select Screen
import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { useGameStore } from '../context/GameStore';
import { LEVELS, THEME_CONFIGS, getThemeEmoji } from '../themes';
import { ThemeType } from '../types';
import { playSfx } from '../utils/SoundManager';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const LevelSelect: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const completedLevels = useGameStore((state) => state.completedLevels);
    const highScores = useGameStore((state) => state.highScores);

    // Handle hardware back button to go to MainMenu
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true; // Prevent default behavior
        });

        return () => backHandler.remove();
    }, []);

    const isLevelUnlocked = (levelId: number): boolean => {
        if (levelId === 1) return true;
        return completedLevels.includes(levelId - 1);
    };

    const getStars = (levelId: number): number => {
        const level = LEVELS.find(l => l.id === levelId);
        const score = highScores[levelId] || 0;
        if (!level || score === 0) return 0;

        if (score >= level.targetScore * 2) return 3;
        if (score >= level.targetScore * 1.5) return 2;
        if (score >= level.targetScore) return 1;
        return 0;
    };

    const handleLevelSelect = (levelId: number) => {
        if (isLevelUnlocked(levelId)) {
            playSfx('tile_select');
            navigation.navigate('Game', { levelId });
        }
    };

    const handleBack = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    // Group levels by theme
    const levelsByTheme = LEVELS.reduce((acc, level) => {
        if (!acc[level.theme]) {
            acc[level.theme] = [];
        }
        acc[level.theme].push(level);
        return acc;
    }, {} as Record<ThemeType, typeof LEVELS>);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Select Level</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {Object.entries(levelsByTheme).map(([themeId, levels]) => {
                    const theme = THEME_CONFIGS[themeId as ThemeType];
                    return (
                        <View key={themeId} style={styles.themeSection}>
                            <View style={styles.themeTitleContainer}>
                                <Text style={styles.themeEmoji}>
                                    {getThemeEmoji(themeId as ThemeType)}
                                </Text>
                                <View>
                                    <Text style={styles.themeName}>{theme.name}</Text>
                                    <Text style={styles.themeDescription}>{theme.description}</Text>
                                </View>
                            </View>

                            <View style={styles.levelsGrid}>
                                {levels.map((level) => {
                                    const unlocked = isLevelUnlocked(level.id);
                                    const stars = getStars(level.id);

                                    return (
                                        <TouchableOpacity
                                            key={level.id}
                                            style={[
                                                styles.levelButton,
                                                !unlocked && styles.lockedLevel,
                                                stars > 0 && styles.completedLevel,
                                            ]}
                                            onPress={() => handleLevelSelect(level.id)}
                                            disabled={!unlocked}
                                        >
                                            {unlocked ? (
                                                <>
                                                    <Text style={styles.levelNumber}>{level.id}</Text>
                                                    <View style={styles.starsRow}>
                                                        {[1, 2, 3].map((s) => (
                                                            <Text key={s} style={styles.starSmall}>
                                                                {s <= stars ? '⭐' : '☆'}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                    <Text style={styles.difficultyBadge}>
                                                        {level.difficulty === 'easy' ? '🟢' : level.difficulty === 'medium' ? '🟡' : '🔴'}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text style={styles.lockIcon}>🔒</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                {/* Coming Soon section */}
                <View style={styles.comingSoon}>
                    <Text style={styles.comingSoonTitle}>🚧 Coming Soon</Text>
                    <Text style={styles.comingSoonText}>
                        💧 Water Conservation{'\n'}
                        ⚡ Energy Efficiency{'\n'}
                        🌳 Deforestation{'\n'}
                        And more!
                    </Text>
                </View>
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 60,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    themeSection: {
        marginBottom: 24,
    },
    themeTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    themeEmoji: {
        fontSize: 36,
    },
    themeName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2ecc71',
    },
    themeDescription: {
        fontSize: 12,
        color: '#888',
        maxWidth: 250,
    },
    levelsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    levelButton: {
        width: 70,
        height: 85,
        backgroundColor: '#2c3e50',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#34495e',
    },
    lockedLevel: {
        backgroundColor: '#1a1a2e',
        borderColor: '#333',
        opacity: 0.6,
    },
    completedLevel: {
        borderColor: '#27ae60',
    },
    levelNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    starSmall: {
        fontSize: 10,
    },
    difficultyBadge: {
        fontSize: 10,
        marginTop: 4,
    },
    lockIcon: {
        fontSize: 24,
    },
    comingSoon: {
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#3498db',
        borderStyle: 'dashed',
    },
    comingSoonTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 12,
    },
    comingSoonText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
    },
});

export default LevelSelect;
