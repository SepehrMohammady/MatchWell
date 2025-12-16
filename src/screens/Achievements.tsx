// Achievements Screen - Earth-Inspired Minimal Design
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
import { RootStackParamList, ThemeType } from '../types';
import { useGameStore } from '../context/GameStore';
import { getLevelsByTheme, LEVELS, getLevelById } from '../themes';
import { playSfx, playBgm } from '../utils/SoundManager';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../config/theme';
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

    // Handle hardware back button
    React.useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });
        return () => backHandler.remove();
    }, []);

    // Play menu music when screen is focused
    useFocusEffect(
        useCallback(() => {
            playBgm('bgm_menu');
        }, [])
    );

    const handleBack = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    // All level IDs for star calculation
    const allLevelIds = useMemo(() => LEVELS.map((l) => l.id), []);

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
                        highScores,
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
        [completedLevels, highScores, allLevelIds]
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
        () => getTotalStars(highScores, getLevelById, allLevelIds),
        [highScores, allLevelIds]
    );

    // Render a single achievement medal
    const renderAchievement = (achievement: Achievement) => {
        const unlocked = isUnlocked(achievement);
        return (
            <View
                key={achievement.id}
                style={[styles.medalCard, !unlocked && styles.medalLocked]}
            >
                <Text style={[styles.medalEmoji, !unlocked && styles.medalEmojiLocked]}>
                    {unlocked ? achievement.emoji : '🔒'}
                </Text>
                <View style={styles.medalInfo}>
                    <Text style={[styles.medalName, !unlocked && styles.medalTextLocked]}>
                        {achievement.name}
                    </Text>
                    <Text style={[styles.medalDescription, !unlocked && styles.medalTextLocked]}>
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
            <View style={styles.summaryBox}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{unlockedCount}/{totalCount}</Text>
                    <Text style={styles.summaryLabel}>Medals</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>⭐ {totalStars}/150</Text>
                    <Text style={styles.summaryLabel}>Stars</Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Theme Completion Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎯 Theme Completion</Text>
                    <View style={styles.medalGrid}>
                        {THEME_ACHIEVEMENTS.map(renderAchievement)}
                    </View>
                </View>

                {/* Star Milestones Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⭐ Star Milestones</Text>
                    <View style={styles.medalGrid}>
                        {STAR_ACHIEVEMENTS.map(renderAchievement)}
                    </View>
                </View>

                {/* Endless Score Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>♾️ Endless Mode</Text>
                    {Object.entries(endlessByTheme).map(([theme, achievements]) => (
                        <View key={theme} style={styles.endlessThemeGroup}>
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
                                                styles.endlessMedal,
                                                !unlocked && styles.endlessMedalLocked,
                                            ]}
                                        >
                                            <Text style={styles.endlessMedalEmoji}>
                                                {unlocked ? a.emoji : '🔒'}
                                            </Text>
                                            <Text style={styles.endlessMedalTier}>
                                                {a.tier === 'bronze' ? 'Bronze' :
                                                    a.tier === 'silver' ? 'Silver' :
                                                        a.tier === 'gold' ? 'Gold' :
                                                            a.tier === 'diamond' ? 'Diamond' :
                                                                a.tier === 'earth-saver' ? 'Earth' : ''}
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
        backgroundColor: COLORS.backgroundPrimary,
    },
    backButton: {
        paddingVertical: SPACING.xs,
        paddingRight: SPACING.md,
    },
    backButtonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: TYPOGRAPHY.medium,
        color: COLORS.textSecondary,
    },
    title: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 60,
    },
    summaryBox: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        marginHorizontal: SPACING.lg,
        marginVertical: SPACING.md,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.md,
        gap: SPACING.xl,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    summaryLabel: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.cardBorder,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    section: {
        marginTop: SPACING.lg,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    medalGrid: {
        gap: SPACING.sm,
    },
    medalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        ...SHADOWS.sm,
    },
    medalLocked: {
        backgroundColor: COLORS.backgroundSecondary,
        opacity: 0.7,
    },
    medalEmoji: {
        fontSize: 32,
        marginRight: SPACING.md,
    },
    medalEmojiLocked: {
        opacity: 0.5,
    },
    medalInfo: {
        flex: 1,
    },
    medalName: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    medalDescription: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    medalTextLocked: {
        color: COLORS.textMuted,
    },
    endlessThemeGroup: {
        marginBottom: SPACING.md,
    },
    endlessThemeName: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: TYPOGRAPHY.medium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    endlessTierRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    endlessMedal: {
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        minWidth: 56,
    },
    endlessMedalLocked: {
        backgroundColor: COLORS.backgroundSecondary,
        opacity: 0.6,
    },
    endlessMedalEmoji: {
        fontSize: 20,
    },
    endlessMedalTier: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textMuted,
        marginTop: 2,
    },
});

export default Achievements;
