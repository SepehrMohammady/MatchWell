// Endless Mode Theme Selection Screen - Earth-Inspired Minimal Design
import React, { useCallback, useState, useEffect } from 'react';
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
import { ThemeType } from '../types';
import { useGameStore } from '../context/GameStore';
import { THEME_CONFIGS, getLevelsByTheme } from '../themes';
import { formatNumber } from '../config/i18n';
import { playSfx, playBgm } from '../utils/SoundManager';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../config/theme';
import { getThemeIcon, LockIcon, BackIcon } from '../components/UI/Icons';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const completedLevels = useGameStore((state) => state.completedLevels);
    const highScores = useGameStore((state) => state.highScores);
    const hasEndlessState = useGameStore((state) => state.hasEndlessState);
    const loadEndlessState = useGameStore((state) => state.loadEndlessState);
    const clearEndlessState = useGameStore((state) => state.clearEndlessState);

    // Track which themes have saved state (multiple themes can have saves)
    const [savedThemes, setSavedThemes] = useState<Set<ThemeType>>(new Set());

    // Check for saved endless state when screen is focused
    useFocusEffect(
        useCallback(() => {
            const checkSavedStates = async () => {
                const themesWithSaves = new Set<ThemeType>();
                for (const theme of THEME_ORDER) {
                    const hasSaved = await hasEndlessState(theme);
                    if (hasSaved) {
                        themesWithSaves.add(theme);
                    }
                }
                setSavedThemes(themesWithSaves);
            };
            checkSavedStates();
            playBgm('bgm_menu');
        }, [hasEndlessState])
    );

    // Handle hardware back button to go to MainMenu
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });

        return () => backHandler.remove();
    }, []);

    // Check if a theme is unlocked (all levels in that theme completed in story mode)
    const isThemeUnlocked = (theme: ThemeType): boolean => {
        // ALL themes require ALL levels in that theme to be completed
        const themeLevels = getLevelsByTheme(theme);
        return themeLevels.every(level => completedLevels.includes(level.id));
    };

    // Get endless high score for a theme (stored with negative IDs)
    const getEndlessHighScore = (theme: ThemeType): number => {
        const themeIndex = THEME_ORDER.indexOf(theme);
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

    const handleContinue = async (theme: ThemeType) => {
        playSfx('tile_select');
        const loaded = await loadEndlessState(theme);
        if (loaded) {
            navigation.navigate('Game', {
                levelId: 1,
                isEndless: true,
                endlessTheme: theme
            });
        } else {
            handleThemeSelect(theme);
        }
    };

    const handleNewGame = async (theme: ThemeType) => {
        playSfx('tile_select');
        await clearEndlessState(theme);
        // Remove this theme from saved themes set
        setSavedThemes(prev => {
            const newSet = new Set(prev);
            newSet.delete(theme);
            return newSet;
        });
        navigation.navigate('Game', {
            levelId: 1,
            isEndless: true,
            endlessTheme: theme,
            forceNew: true,
        });
    };

    const handleBack = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <BackIcon size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('menu.endlessMode')}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Description */}
            <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                    {t('endless.noMoveLimit')}
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
                            activeOpacity={0.7}
                        >
                            <View style={styles.themeHeader}>
                                <View style={styles.themeIconContainer}>
                                    {unlocked ? (
                                        getThemeIcon(themeId, 28)
                                    ) : (
                                        <LockIcon size={24} color={COLORS.textMuted} />
                                    )}
                                </View>
                                <View style={styles.themeInfo}>
                                    <Text style={[
                                        styles.themeName,
                                        !unlocked && styles.lockedText
                                    ]}>
                                        {t(`themes.${themeId === 'trash-sorting' ? 'trashSorting' : themeId === 'water-conservation' ? 'waterConservation' : themeId === 'energy-efficiency' ? 'energyEfficiency' : themeId}`)}
                                    </Text>
                                    <Text style={styles.themeDescription}>
                                        {unlocked ? t(`themes.${themeId === 'trash-sorting' ? 'trashSorting' : themeId === 'water-conservation' ? 'waterConservation' : themeId === 'energy-efficiency' ? 'energyEfficiency' : themeId}Desc`) : t('achievements.locked')}
                                    </Text>
                                </View>
                            </View>

                            {unlocked && (
                                <View style={styles.statsRow}>
                                    <View style={styles.highScoreBox}>
                                        <Text style={styles.highScoreLabel}>{t('common.bestScore')}</Text>
                                        <Text style={styles.highScoreValue}>
                                            {highScore > 0 ? formatNumber(highScore) : '—'}
                                        </Text>
                                    </View>
                                    {savedThemes.has(themeId) ? (
                                        <View style={styles.resumeButtonsRow}>
                                            <TouchableOpacity
                                                style={styles.continueButton}
                                                onPress={() => handleContinue(themeId)}
                                            >
                                                <Text style={styles.continueButtonText}>{t('common.continue')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.newGameButton}
                                                onPress={() => handleNewGame(themeId)}
                                            >
                                                <Text style={styles.newGameButtonText}>{t('common.new')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.playButton}>
                                            <Text style={styles.playButtonText}>{t('game.playAgain')}</Text>
                                        </View>
                                    )}
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
    descriptionBox: {
        backgroundColor: COLORS.cardBackground,
        margin: SPACING.lg,
        padding: SPACING.lg,
        borderRadius: RADIUS.md,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accentHighlight,
        ...SHADOWS.sm,
    },
    descriptionText: {
        color: COLORS.textSecondary,
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        lineHeight: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    themeCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.sm,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    lockedCard: {
        opacity: 0.5,
    },
    themeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    themeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    themeEmoji: {
        fontSize: 20,
    },
    themeInfo: {
        flex: 1,
    },
    themeName: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    lockedText: {
        color: COLORS.textMuted,
    },
    themeDescription: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        gap: SPACING.md,
    },
    highScoreBox: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.sm,
        padding: SPACING.md,
    },
    highScoreLabel: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
    },
    highScoreValue: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.accentHighlight,
    },
    playButton: {
        backgroundColor: COLORS.organicWaste,
        borderRadius: RADIUS.sm,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
    },
    playButtonText: {
        color: COLORS.textLight,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
    },
    resumeButtonsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    continueButton: {
        backgroundColor: COLORS.organicWaste,
        borderRadius: RADIUS.sm,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    continueButtonText: {
        color: COLORS.textLight,
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
    },
    newGameButton: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.sm,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    newGameButtonText: {
        color: COLORS.textSecondary,
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: TYPOGRAPHY.medium,
    },
});

export default EndlessSelect;
