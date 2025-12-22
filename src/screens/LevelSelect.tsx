// Level Select Screen - Earth-Inspired Minimal Design
import React, { useEffect, useCallback, useRef } from 'react';
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
import { LEVELS, THEME_CONFIGS } from '../themes';
import { ThemeType } from '../types';
import { playSfx, playBgm } from '../utils/SoundManager';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../config/theme';
import { LockIcon, StarFilledIcon, BackIcon, getThemeIcon } from '../components/UI/Icons';
import { useTranslation } from 'react-i18next';
import { formatNumber, getCurrentLanguage } from '../config/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

const LevelSelect: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const completedLevels = useGameStore((state) => state.completedLevels);
    const highScores = useGameStore((state) => state.highScores);

    const levelMovesRemaining = useGameStore((state) => state.levelMovesRemaining);

    // Handle hardware back button to go to MainMenu
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });

        return () => backHandler.remove();
    }, []);

    // ScrollView ref for auto-scrolling
    const scrollViewRef = useRef<ScrollView>(null);
    const themePositions = useRef<Record<string, number>>({});
    const hasScrolled = useRef(false);

    // Find the in-progress theme (first theme that has some but not all levels completed)
    const getInProgressTheme = useCallback((): ThemeType | null => {
        const themeOrder: ThemeType[] = ['trash-sorting', 'pollution', 'water-conservation', 'energy-efficiency', 'deforestation'];

        for (const themeId of themeOrder) {
            const themeLevels = LEVELS.filter(l => l.theme === themeId);
            const completedInTheme = themeLevels.filter(l => completedLevels.includes(l.id)).length;

            // Theme is in-progress if some but not all levels are completed
            if (completedInTheme > 0 && completedInTheme < themeLevels.length) {
                return themeId;
            }
            // If no levels completed in this theme but previous themes are complete, this is the current theme
            if (completedInTheme === 0) {
                return themeId;
            }
        }
        return null;
    }, [completedLevels]);

    // Auto-scroll to in-progress theme after layout
    useEffect(() => {
        if (!hasScrolled.current && scrollViewRef.current) {
            const inProgressTheme = getInProgressTheme();
            if (inProgressTheme) {
                // Retry a few times to ensure layout is complete
                const attemptScroll = (attempts: number) => {
                    const position = themePositions.current[inProgressTheme];
                    if (position !== undefined && position > 0) {
                        scrollViewRef.current?.scrollTo({
                            y: position - 50, // Slight offset for better visibility
                            animated: true,
                        });
                        hasScrolled.current = true;
                    } else if (attempts > 0) {
                        setTimeout(() => attemptScroll(attempts - 1), 200);
                    }
                };
                // Start with delay to allow initial layout
                setTimeout(() => attemptScroll(5), 500);
            }
        }
    }, [getInProgressTheme]);

    const onThemeLayout = (themeId: string, y: number) => {
        themePositions.current[themeId] = y;
    };

    // Play menu music when screen is focused
    useFocusEffect(
        useCallback(() => {
            playBgm('bgm_menu');
        }, [])
    );

    const isLevelUnlocked = (levelId: number): boolean => {
        if (levelId === 1) return true;
        return completedLevels.includes(levelId - 1);
    };

    // Stars based on moves remaining (percentage of total moves saved)
    const getStars = (levelId: number): number => {
        const level = LEVELS.find(l => l.id === levelId);
        const movesRemaining = levelMovesRemaining[levelId] || 0;
        if (!level || !completedLevels.includes(levelId)) return 0;

        // Calculate percentage of moves remaining
        const totalMoves = level.moves;
        const percentRemaining = (movesRemaining / totalMoves) * 100;

        // 3 stars: 50%+ moves remaining
        // 2 stars: 25-49% moves remaining
        // 1 star: completed with less than 25% moves remaining
        if (percentRemaining >= 50) return 3;
        if (percentRemaining >= 25) return 2;
        return 1;
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

    // Get total stars for a theme
    const getTotalThemeStars = (themeLevels: typeof LEVELS): { earned: number; total: number } => {
        let earned = 0;
        const total = themeLevels.length * 3; // Max 3 stars per level
        themeLevels.forEach(level => {
            earned += getStars(level.id);
        });
        return { earned, total };
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
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <BackIcon size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('menu.selectLevel')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {Object.entries(levelsByTheme).map(([themeId, levels]) => {
                    const theme = THEME_CONFIGS[themeId as ThemeType];
                    const themeStars = getTotalThemeStars(levels);
                    return (
                        <View
                            key={themeId}
                            style={styles.themeSection}
                            onLayout={(event) => onThemeLayout(themeId, event.nativeEvent.layout.y)}
                        >
                            <View style={styles.themeTitleContainer}>
                                <View style={styles.themeIconContainer}>
                                    {getThemeIcon(themeId as ThemeType, 24)}
                                </View>
                                <View style={styles.themeTextContainer}>
                                    <View style={styles.themeNameRow}>
                                        <Text style={styles.themeName}>{t(`themes.${themeId === 'trash-sorting' ? 'trashSorting' : themeId === 'water-conservation' ? 'waterConservation' : themeId === 'energy-efficiency' ? 'energyEfficiency' : themeId}`)}</Text>
                                        <View style={styles.themeStarsContainer}>
                                            <StarFilledIcon size={14} />
                                            <Text style={styles.themeStarsText}>
                                                {formatNumber(themeStars.earned, getCurrentLanguage())}/{formatNumber(themeStars.total, getCurrentLanguage())}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.themeDescription}>{t(`themes.${themeId === 'trash-sorting' ? 'trashSorting' : themeId === 'water-conservation' ? 'waterConservation' : themeId === 'energy-efficiency' ? 'energyEfficiency' : themeId}Desc`)}</Text>
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
                                            activeOpacity={0.7}
                                        >
                                            {unlocked ? (
                                                <>
                                                    <Text style={styles.levelNumber}>{formatNumber(level.id, getCurrentLanguage())}</Text>
                                                    <View style={styles.starsRow}>
                                                        {[1, 2, 3].map((s) => (
                                                            <Text key={s} style={[
                                                                styles.starSmall,
                                                                s <= stars && styles.starFilled
                                                            ]}>
                                                                ★
                                                            </Text>
                                                        ))}
                                                    </View>
                                                </>
                                            ) : (
                                                <LockIcon size={24} color={COLORS.textMuted} />
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
                    <Text style={styles.comingSoonTitle}>{t('game.comingSoon')}</Text>
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
        backgroundColor: COLORS.cardBackground,
    },
    backButton: {
        padding: SPACING.sm,
    },
    backButtonText: {
        color: COLORS.organicWaste,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
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
    themeTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        gap: SPACING.md,
    },
    themeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    themeEmoji: {
        fontSize: 24,
    },
    themeTextContainer: {
        flex: 1,
    },
    themeName: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    themeNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    themeStarsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    themeStarsText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.starFilled,
    },
    themeDescription: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    levelsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    levelButton: {
        width: 64,
        height: 72,
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    lockedLevel: {
        backgroundColor: COLORS.backgroundSecondary,
        opacity: 0.5,
    },
    completedLevel: {
        borderWidth: 2,
        borderColor: COLORS.organicWaste,
    },
    levelNumber: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    starSmall: {
        fontSize: 10,
        color: COLORS.starEmpty,
    },
    starFilled: {
        color: COLORS.starFilled,
    },
    lockIcon: {
        fontSize: 20,
    },
    comingSoon: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
        marginTop: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderStyle: 'dashed',
    },
    comingSoonTitle: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    comingSoonText: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default LevelSelect;
