// Level Select Screen - Minimal Flat Design
import React, { useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { useGameStore } from '../context/GameStore';
import { LEVELS, THEME_CONFIGS, getLevelsByTheme } from '../themes';
import { ThemeType, Level } from '../types';
import { playSfx, playBgm } from '../utils/SoundManager';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import { LockIcon } from '../components/UI/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const LevelSelect: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const completedLevels = useGameStore((state) => state.completedLevels);
    const levelMovesRemaining = useGameStore((state) => state.levelMovesRemaining);

    // Play menu music when screen is focused
    useFocusEffect(
        useCallback(() => {
            playBgm('bgm_menu');
        }, [])
    );

    // Handle back button
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                handleBack();
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [])
    );

    // Check if level is unlocked (first level always unlocked, others need previous level complete)
    const isLevelUnlocked = (levelId: number): boolean => {
        if (levelId === 1) return true;
        return completedLevels.includes(levelId - 1);
    };

    // Stars based on moves remaining (percentage of total moves saved)
    const getStars = (levelId: number): number => {
        const movesRemaining = levelMovesRemaining[levelId];
        if (movesRemaining === undefined) return 0;

        const level = LEVELS.find((l) => l.id === levelId);
        if (!level) return 0;

        const movesPercentage = movesRemaining / level.moves;
        if (movesPercentage >= 0.50) return 3;
        if (movesPercentage >= 0.25) return 2;
        return 1;
    };

    const handleLevelSelect = (levelId: number) => {
        playSfx('tile_select');
        navigation.navigate('Game', { levelId });
    };

    const handleBack = () => {
        playSfx('tile_select');
        navigation.goBack();
    };

    // Get total stars for a theme
    const getTotalThemeStars = (themeLevels: Level[]): { earned: number; total: number } => {
        let earned = 0;
        themeLevels.forEach((level: Level) => {
            earned += getStars(level.id);
        });
        return { earned, total: themeLevels.length * 3 };
    };

    // Group levels by theme
    const levelsByTheme = LEVELS.reduce((acc: Record<ThemeType, Level[]>, level: Level) => {
        if (!acc[level.theme]) {
            acc[level.theme] = [];
        }
        acc[level.theme].push(level);
        return acc;
    }, {} as Record<ThemeType, Level[]>);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Levels</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {Object.entries(levelsByTheme).map(([themeId, levels]: [string, Level[]]) => {
                    const theme = THEME_CONFIGS[themeId as ThemeType];
                    const themeStars = getTotalThemeStars(levels);
                    return (
                        <View key={themeId} style={styles.themeSection}>
                            {/* Theme Header */}
                            <View style={styles.themeHeader}>
                                <Text style={styles.themeName}>{theme.name}</Text>
                                <Text style={styles.themeStars}>★ {themeStars.earned}/{themeStars.total}</Text>
                            </View>

                            {/* Level Grid */}
                            <View style={styles.levelsGrid}>
                                {levels.map((level: Level) => {
                                    const unlocked = isLevelUnlocked(level.id);
                                    const stars = getStars(level.id);

                                    return (
                                        <TouchableOpacity
                                            key={level.id}
                                            style={[
                                                styles.levelButton,
                                                stars > 0 && styles.completedLevel,
                                                !unlocked && styles.lockedLevel,
                                            ]}
                                            onPress={() => handleLevelSelect(level.id)}
                                            disabled={!unlocked}
                                            activeOpacity={0.7}
                                        >
                                            {unlocked ? (
                                                <>
                                                    <Text style={[
                                                        styles.levelNumber,
                                                        stars > 0 && styles.completedText
                                                    ]}>
                                                        {level.id}
                                                    </Text>
                                                    <View style={styles.starsRow}>
                                                        {[1, 2, 3].map((s) => (
                                                            <Text
                                                                key={s}
                                                                style={[
                                                                    styles.star,
                                                                    s <= stars && styles.starFilled
                                                                ]}
                                                            >
                                                                ★
                                                            </Text>
                                                        ))}
                                                    </View>
                                                </>
                                            ) : (
                                                <LockIcon size={20} color={COLORS.textMuted} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundPrimary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    backButton: {
        padding: SPACING.sm,
    },
    backButtonText: {
        color: COLORS.organicWaste,
        fontSize: TYPOGRAPHY.body,
        fontWeight: '600',
    },
    title: {
        fontSize: TYPOGRAPHY.h3,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 60,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    themeSection: {
        marginBottom: SPACING.xl,
    },
    themeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    themeName: {
        fontSize: TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    themeStars: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.starFilled,
        fontWeight: '600',
    },
    levelsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    levelButton: {
        width: 56,
        height: 64,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    completedLevel: {
        backgroundColor: COLORS.cardBackground,
        borderColor: COLORS.organicWaste,
    },
    lockedLevel: {
        opacity: 0.4,
    },
    levelNumber: {
        fontSize: TYPOGRAPHY.h4,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    completedText: {
        color: COLORS.textPrimary,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 1,
    },
    star: {
        fontSize: 8,
        color: COLORS.starEmpty,
    },
    starFilled: {
        color: COLORS.starFilled,
    },
});

export default LevelSelect;
