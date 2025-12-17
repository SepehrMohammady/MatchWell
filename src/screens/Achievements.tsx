// Achievements Screen - Minimal Flat Design
import React, { useCallback, useMemo } from 'react';
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
import { LEVELS, getLevelsByTheme, getLevelById } from '../themes';
import { playSfx, playBgm } from '../utils/SoundManager';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import {
    THEME_ACHIEVEMENTS,
    STAR_ACHIEVEMENTS,
    ENDLESS_ACHIEVEMENTS,
    checkThemeAchievement,
    checkStarAchievement,
    checkEndlessAchievement,
    getTotalStars,
    Achievement,
} from '../config/achievements';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

const Achievements: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const completedLevels = useGameStore((state) => state.completedLevels);
    const highScores = useGameStore((state) => state.highScores);
    const levelMovesRemaining = useGameStore((state) => state.levelMovesRemaining);
    const clearUnseenAchievements = useGameStore((state) => state.clearUnseenAchievements);

    // Clear unseen achievements when screen is focused
    useFocusEffect(
        useCallback(() => {
            clearUnseenAchievements();
            playBgm('bgm_menu');
        }, [clearUnseenAchievements])
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

    const handleBack = () => {
        playSfx('tile_select');
        navigation.goBack();
    };

    // All level IDs for star calculation
    const allLevelIds = useMemo(() => LEVELS.map((l: { id: number }) => l.id), []);

    // Check if achievement is unlocked
    const isUnlocked = useCallback(
        (achievement: Achievement): boolean => {
            switch (achievement.category) {
                case 'theme':
                    return checkThemeAchievement(
                        achievement.theme!,
                        completedLevels,
                        getLevelsByTheme
                    );
                case 'stars':
                    return checkStarAchievement(
                        achievement.requirement,
                        levelMovesRemaining,
                        getLevelById,
                        allLevelIds
                    );
                case 'endless':
                    return checkEndlessAchievement(
                        achievement.theme!,
                        achievement.requirement,
                        highScores
                    );
                default:
                    return false;
            }
        },
        [completedLevels, highScores, levelMovesRemaining, allLevelIds]
    );

    // Count unlocked achievements
    const unlockedCount = useMemo(() => {
        let count = 0;
        [...THEME_ACHIEVEMENTS, ...STAR_ACHIEVEMENTS, ...ENDLESS_ACHIEVEMENTS].forEach((a) => {
            if (isUnlocked(a)) count++;
        });
        return count;
    }, [isUnlocked]);

    const totalCount =
        THEME_ACHIEVEMENTS.length + STAR_ACHIEVEMENTS.length + ENDLESS_ACHIEVEMENTS.length;

    // Get total stars for display
    const totalStars = useMemo(
        () => getTotalStars(levelMovesRemaining, getLevelById, allLevelIds),
        [levelMovesRemaining, allLevelIds]
    );

    // Render a single achievement
    const renderAchievement = (achievement: Achievement) => {
        const unlocked = isUnlocked(achievement);
        return (
            <View
                key={achievement.id}
                style={[styles.achievementRow, !unlocked && styles.achievementLocked]}
            >
                <Text style={[styles.achievementEmoji, !unlocked && styles.emojiLocked]}>
                    {unlocked ? achievement.emoji : '🔒'}
                </Text>
                <View style={styles.achievementInfo}>
                    <Text style={[styles.achievementName, !unlocked && styles.textLocked]}>
                        {achievement.name}
                    </Text>
                    <Text style={[styles.achievementDesc, !unlocked && styles.textLocked]}>
                        {achievement.description}
                    </Text>
                </View>
            </View>
        );
    };

    // Group endless achievements by theme
    const endlessByTheme = useMemo(() => {
        const grouped: Record<string, Achievement[]> = {};
        ENDLESS_ACHIEVEMENTS.forEach((a) => {
            const theme = a.theme!;
            if (!grouped[theme]) grouped[theme] = [];
            grouped[theme].push(a);
        });
        return grouped;
    }, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Achievements</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{unlockedCount}/{totalCount} Medals</Text>
                <Text style={styles.summaryDivider}>•</Text>
                <Text style={styles.summaryText}>★ {totalStars}/150 Stars</Text>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Theme Completion Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Theme Completion</Text>
                    {THEME_ACHIEVEMENTS.map(renderAchievement)}
                </View>

                {/* Star Milestones Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Star Milestones</Text>
                    {STAR_ACHIEVEMENTS.map(renderAchievement)}
                </View>

                {/* Endless Mode Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Endless Mode</Text>
                    {Object.entries(endlessByTheme).map(([theme, achievements]) => (
                        <View key={theme} style={styles.endlessGroup}>
                            <Text style={styles.endlessThemeName}>
                                {achievements[0].name.split(' ').slice(1).join(' ')}
                            </Text>
                            <View style={styles.endlessTierRow}>
                                {achievements.map((a) => {
                                    const unlocked = isUnlocked(a);
                                    return (
                                        <View
                                            key={a.id}
                                            style={[
                                                styles.endlessTier,
                                                !unlocked && styles.endlessTierLocked,
                                            ]}
                                        >
                                            <Text style={styles.endlessEmoji}>
                                                {unlocked ? a.emoji : '🔒'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        gap: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    summaryText: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    summaryDivider: {
        color: COLORS.textMuted,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    achievementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xs,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.sm,
    },
    achievementLocked: {
        opacity: 0.5,
    },
    achievementEmoji: {
        fontSize: 24,
        marginRight: SPACING.md,
    },
    emojiLocked: {
        opacity: 0.6,
    },
    achievementInfo: {
        flex: 1,
    },
    achievementName: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    achievementDesc: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    textLocked: {
        color: COLORS.textMuted,
    },
    endlessGroup: {
        marginBottom: SPACING.md,
    },
    endlessThemeName: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    endlessTierRow: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    endlessTier: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    endlessTierLocked: {
        opacity: 0.4,
    },
    endlessEmoji: {
        fontSize: 18,
    },
});

export default Achievements;
