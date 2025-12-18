// Game Screen - Main gameplay screen
import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Text,
    TouchableOpacity,
    ImageBackground,
    StatusBar,
    BackHandler,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStore } from '../context/GameStore';
import GameBoard from '../components/Game/GameBoard';
import HUD from '../components/UI/HUD';
import { THEME_CONFIGS, getLevelById, getLevelsByTheme, LEVELS } from '../themes';
import { THEME_ACHIEVEMENTS, STAR_ACHIEVEMENTS, ENDLESS_ACHIEVEMENTS, checkThemeAchievement, checkStarAchievement, checkEndlessAchievement, Achievement } from '../config/achievements';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { playBgm, playThemeBgm, pauseBgm, resumeBgm, stopBgm, playSfx, getSoundSettings, toggleSfx, toggleMusic } from '../utils/SoundManager';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import { PauseIcon, PlayIcon, RestartIcon, MusicIcon, MusicOffIcon, VolumeIcon, VolumeOffIcon, HomeIcon, PaletteIcon, ListIcon, StarFilledIcon, StarEmptyIcon, TrophyIcon, EmoticonSadIcon, ArrowRightIcon } from '../components/UI/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const GameScreen: React.FC<Props> = ({ navigation, route }) => {
    const { levelId } = route.params;
    const insets = useSafeAreaInsets();

    const initializeGame = useGameStore((state) => state.initializeGame);
    const isGameOver = useGameStore((state) => state.isGameOver);
    const isLevelComplete = useGameStore((state) => state.isLevelComplete);
    const score = useGameStore((state) => state.score);
    const targetScore = useGameStore((state) => state.targetScore);
    const theme = useGameStore((state) => state.theme);
    const level = useGameStore((state) => state.level);
    const isPaused = useGameStore((state) => state.isPaused);
    const pauseGame = useGameStore((state) => state.pauseGame);
    const resumeGameState = useGameStore((state) => state.resumeGame);
    const resetGameState = useGameStore((state) => state.resetGameState);
    const markLevelComplete = useGameStore((state) => state.markLevelComplete);
    const isEndlessMode = useGameStore((state) => state.isEndlessMode);
    const movesRemaining = useGameStore((state) => state.movesRemaining);
    const saveEndlessHighScore = useGameStore((state) => state.saveEndlessHighScore);
    const saveEndlessState = useGameStore((state) => state.saveEndlessState);
    const clearEndlessState = useGameStore((state) => state.clearEndlessState);
    const grid = useGameStore((state) => state.grid);
    const completedLevels = useGameStore((state) => state.completedLevels);
    const highScores = useGameStore((state) => state.highScores);
    const levelMovesRemaining = useGameStore((state) => state.levelMovesRemaining);
    const addUnseenAchievement = useGameStore((state) => state.addUnseenAchievement);

    const levelConfig = getLevelById(levelId);
    const themeConfig = THEME_CONFIGS[theme];

    // Sound settings state
    const [sfxEnabled, setSfxEnabled] = useState(true);
    const [musicEnabled, setMusicEnabled] = useState(true);
    const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    // Load sound settings when pausing
    useEffect(() => {
        if (isPaused) {
            const settings = getSoundSettings();
            setSfxEnabled(settings.sfxEnabled);
            setMusicEnabled(settings.musicEnabled);
        }
    }, [isPaused]);

    // Initialize the game level with isEndless flag and optional endlessTheme
    // Only skip initialization if resuming ENDLESS mode (grid populated AND already in endless mode)
    useEffect(() => {
        const isEndless = route.params?.isEndless || false;
        const endlessTheme = route.params?.endlessTheme;

        // In story mode, always re-initialize
        // In endless mode, only skip if already in endless mode AND grid is populated (resuming)
        const isResumingEndless = isEndless && isEndlessMode && grid.length > 0;
        if (!isResumingEndless) {
            initializeGame(levelId, isEndless, endlessTheme);
        }
    }, [levelId, initializeGame, route.params?.isEndless, route.params?.endlessTheme, grid.length, isEndlessMode]);

    // Play theme music only when screen is focused (prevents restart after stopBgm)
    useFocusEffect(
        useCallback(() => {
            const isEndless = route.params?.isEndless || false;
            const endlessTheme = route.params?.endlessTheme;
            const themeToPlay = (isEndless && endlessTheme) ? endlessTheme : getLevelById(levelId)?.theme || 'trash-sorting';
            playThemeBgm(themeToPlay);

            // Stop music when leaving the screen
            return () => {
                stopBgm();
            };
        }, [levelId, route.params?.isEndless, route.params?.endlessTheme])
    );

    // Helper to show toast for new achievement
    const showAchievementToast = useCallback((achievement: Achievement) => {
        setToastAchievement(achievement);
        addUnseenAchievement(achievement.id);
        playSfx('level_complete');

        Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setToastAchievement(null);
                });
            }, 3000);
        });
    }, [addUnseenAchievement, toastOpacity]);

    // Check for new achievements when level completes
    useEffect(() => {
        if (isLevelComplete) {
            markLevelComplete(levelId, score, movesRemaining);

            const allLevelIds = LEVELS.map(l => l.id);
            const updatedCompletedLevels = [...completedLevels, levelId];
            const updatedMovesRemaining = { ...levelMovesRemaining, [levelId]: movesRemaining };

            // Check theme achievements (story mode only)
            if (!isEndlessMode && theme) {
                const themeAchievement = THEME_ACHIEVEMENTS.find(a => a.theme === theme);
                if (themeAchievement) {
                    const wasCompleted = checkThemeAchievement(theme, completedLevels, getLevelsByTheme);
                    const isNowCompleted = checkThemeAchievement(theme, updatedCompletedLevels, getLevelsByTheme);
                    if (!wasCompleted && isNowCompleted) {
                        showAchievementToast(themeAchievement);
                        return; // Only show one toast at a time
                    }
                }
            }

            // Check star achievements (story mode only)
            if (!isEndlessMode) {
                for (const starAchievement of STAR_ACHIEVEMENTS) {
                    const wasEarned = checkStarAchievement(starAchievement.requirement, levelMovesRemaining, getLevelById, allLevelIds);
                    const isNowEarned = checkStarAchievement(starAchievement.requirement, updatedMovesRemaining, getLevelById, allLevelIds);
                    if (!wasEarned && isNowEarned) {
                        showAchievementToast(starAchievement);
                        return; // Only show one toast at a time
                    }
                }
            }

            // Check endless achievements (endless mode only)
            if (isEndlessMode && theme) {
                for (const endlessAchievement of ENDLESS_ACHIEVEMENTS.filter(a => a.theme === theme)) {
                    const wasEarned = checkEndlessAchievement(theme, endlessAchievement.requirement, highScores);
                    const updatedHighScores = { ...highScores };
                    const themeIndex = ['trash-sorting', 'pollution', 'water-conservation', 'energy-efficiency', 'deforestation'].indexOf(theme);
                    const endlessId = -(themeIndex + 1);
                    if (score > (updatedHighScores[endlessId] || 0)) {
                        updatedHighScores[endlessId] = score;
                    }
                    const isNowEarned = checkEndlessAchievement(theme, endlessAchievement.requirement, updatedHighScores);
                    if (!wasEarned && isNowEarned) {
                        showAchievementToast(endlessAchievement);
                        return; // Only show one toast at a time
                    }
                }
            }
        }
    }, [isLevelComplete, levelId, score, movesRemaining, markLevelComplete, isEndlessMode, theme, completedLevels, levelMovesRemaining, highScores, showAchievementToast]);

    // Save endless high score when score changes in endless mode
    useEffect(() => {
        if (isEndlessMode && score > 0) {
            saveEndlessHighScore(theme, score);
        }
    }, [isEndlessMode, score, theme, saveEndlessHighScore]);

    // Handle hardware back button to open pause menu
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!isPaused && !isLevelComplete && !isGameOver) {
                pauseBgm();
                pauseGame();
                return true; // Prevent default back behavior
            }
            return false;
        });

        return () => backHandler.remove();
    }, [isPaused, isLevelComplete, isGameOver, pauseGame]);

    const handlePause = useCallback(() => {
        // Don't pause BGM - theme music continues during pause
        pauseGame();
    }, [pauseGame]);

    const handleResume = useCallback(() => {
        // BGM was never paused, just resume game state
        resumeGameState();
    }, [resumeGameState]);


    const handleRestart = useCallback(() => {
        // Preserve endless mode settings when restarting
        const isEndless = route.params?.isEndless || false;
        const endlessTheme = route.params?.endlessTheme;
        initializeGame(levelId, isEndless, endlessTheme);
    }, [levelId, initializeGame, route.params?.isEndless, route.params?.endlessTheme]);

    const handleNextLevel = useCallback(() => {
        const nextLevelId = levelId + 1;
        if (getLevelById(nextLevelId)) {
            initializeGame(nextLevelId);
            navigation.setParams({ levelId: nextLevelId });
        } else {
            stopBgm(); // Stop theme music before going to level select
            navigation.navigate('LevelSelect');
        }
    }, [levelId, initializeGame, navigation]);

    const handleBackToMenu = useCallback(async () => {
        if (isEndlessMode && !isGameOver) {
            await saveEndlessState(); // Save endless state for resume
        }
        resetGameState(); // Reset all game state flags before navigating
        stopBgm(); // Stop theme music to prevent overlap
        navigation.navigate('MainMenu');
    }, [navigation, resetGameState, isEndlessMode, isGameOver, saveEndlessState]);

    const handleBackToLevels = useCallback(async () => {
        if (isEndlessMode && !isGameOver) {
            await saveEndlessState(); // Save endless state for resume
        }
        resetGameState(); // Reset all game state flags before navigating
        stopBgm(); // Stop theme music to prevent overlap
        // Navigate to appropriate screen based on mode
        if (isEndlessMode) {
            navigation.navigate('EndlessSelect');
        } else {
            navigation.navigate('LevelSelect');
        }
    }, [navigation, resetGameState, isEndlessMode, isGameOver, saveEndlessState]);

    const handleSfxToggle = (value: boolean) => {
        setSfxEnabled(value);
        toggleSfx(value);
        if (value) playSfx('tile_select');
    };

    const handleMusicToggle = (value: boolean) => {
        setMusicEnabled(value);
        toggleMusic(value);
        if (value) {
            // Start playing theme music when enabled
            playThemeBgm(theme);
        }
    };

    // Calculate sky color based on score progress
    const getBackgroundStyle = () => {
        const progress = Math.min(score / targetScore, 1);
        // Interpolate from gray (polluted) to blue (clean)
        const grayValue = Math.floor(128 - progress * 60);
        const blueValue = Math.floor(140 + progress * 115);
        return {
            backgroundColor: `rgb(${grayValue}, ${grayValue + 20}, ${blueValue})`,
        };
    };

    return (
        <View style={[styles.container, getBackgroundStyle(), { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Achievement Toast Notification */}
            {toastAchievement && (
                <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
                    <Text style={styles.toastEmoji}>{toastAchievement.emoji}</Text>
                    <View style={styles.toastTextContainer}>
                        <Text style={styles.toastTitle}>🎉 Achievement Unlocked!</Text>
                        <Text style={styles.toastName}>{toastAchievement.name}</Text>
                    </View>
                </Animated.View>
            )}

            <HUD onPause={handlePause} />

            <View style={styles.boardContainer}>
                <GameBoard />
            </View>

            {/* Environmental Fact */}
            {levelConfig?.environmentalFact && (
                <View style={styles.factContainer}>
                    <Text style={styles.factIcon}>💡</Text>
                    <Text style={styles.factText}>{levelConfig.environmentalFact}</Text>
                </View>
            )}

            {/* Pause Modal */}
            <Modal visible={isPaused} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalTitleRow}>
                            <PauseIcon size={24} color={COLORS.textPrimary} />
                            <Text style={styles.modalTitle}>Paused</Text>
                        </View>
                        <TouchableOpacity style={styles.modalButton} onPress={handleResume}>
                            <PlayIcon size={20} color="#fff" />
                            <Text style={styles.modalButtonText}>Resume</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={handleRestart}>
                            <RestartIcon size={20} color="#fff" />
                            <Text style={styles.modalButtonText}>Restart</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={handleBackToLevels}>
                            {isEndlessMode ? (
                                <PaletteIcon size={20} color={COLORS.textSecondary} />
                            ) : (
                                <ListIcon size={20} color={COLORS.textSecondary} />
                            )}
                            <Text style={styles.secondaryButtonText}>
                                {isEndlessMode ? 'Themes' : 'Levels'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={handleBackToMenu}>
                            <HomeIcon size={20} color={COLORS.textSecondary} />
                            <Text style={styles.secondaryButtonText}>Main Menu</Text>
                        </TouchableOpacity>

                        {/* Sound Toggle Footer */}
                        <View style={styles.soundToggleFooter}>
                            <TouchableOpacity
                                style={[styles.soundToggleButton, musicEnabled && styles.soundToggleActive]}
                                onPress={() => handleMusicToggle(!musicEnabled)}
                            >
                                {musicEnabled ? (
                                    <MusicIcon size={24} color={COLORS.organicWaste} />
                                ) : (
                                    <MusicOffIcon size={24} color={COLORS.textMuted} />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.soundToggleButton, sfxEnabled && styles.soundToggleActive]}
                                onPress={() => handleSfxToggle(!sfxEnabled)}
                            >
                                {sfxEnabled ? (
                                    <VolumeIcon size={24} color={COLORS.organicWaste} />
                                ) : (
                                    <VolumeOffIcon size={24} color={COLORS.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Level Complete Modal */}
            <Modal visible={isLevelComplete} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <TrophyIcon size={48} color={COLORS.organicWaste} />
                        </View>
                        <Text style={styles.modalTitle}>Level Complete!</Text>
                        <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
                        <Text style={styles.scoreLabel}>Score</Text>

                        {/* Star Rating - based on moves remaining percentage */}
                        <View style={styles.starsContainer}>
                            <StarFilledIcon size={32} />
                            {levelConfig && levelConfig.moves > 0 && (movesRemaining / levelConfig.moves) >= 0.25
                                ? <StarFilledIcon size={32} />
                                : <StarEmptyIcon size={32} />}
                            {levelConfig && levelConfig.moves > 0 && (movesRemaining / levelConfig.moves) >= 0.50
                                ? <StarFilledIcon size={32} />
                                : <StarEmptyIcon size={32} />}
                        </View>

                        <Text style={styles.movesLeftText}>{movesRemaining} moves remaining</Text>

                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity style={styles.modalButton} onPress={handleNextLevel}>
                                <ArrowRightIcon size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Next Level</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={handleRestart}>
                                <RestartIcon size={20} color={COLORS.textSecondary} />
                                <Text style={styles.secondaryButtonText}>Play Again</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.textButton} onPress={handleBackToLevels}>
                                <Text style={styles.textButtonLabel}>Back to Levels</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Game Over Modal */}
            <Modal visible={isGameOver} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <EmoticonSadIcon size={48} color={COLORS.accentDanger} />
                        </View>
                        <Text style={styles.modalTitle}>Out of Moves</Text>
                        <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
                        <Text style={styles.scoreLabel}>Your Score</Text>
                        <Text style={styles.targetText}>Target: {targetScore.toLocaleString()}</Text>

                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity style={styles.modalButton} onPress={handleRestart}>
                                <RestartIcon size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Try Again</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.textButton} onPress={handleBackToLevels}>
                                <Text style={styles.textButtonLabel}>Back to Levels</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    boardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    factContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        margin: 10,
        padding: 12,
        borderRadius: 12,
    },
    factIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    factText: {
        flex: 1,
        color: '#fff',
        fontSize: 12,
        fontFamily: TYPOGRAPHY.fontFamily,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '85%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    scoreText: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.accentHighlight,
        fontWeight: TYPOGRAPHY.bold,
        marginBottom: SPACING.sm,
    },
    targetText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    starsContainer: {
        flexDirection: 'row',
        marginVertical: SPACING.lg,
    },
    star: {
        fontSize: 36,
        marginHorizontal: SPACING.sm,
        color: COLORS.starEmpty,
    },
    environmentMessage: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.organicWaste,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    encourageText: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.md,
        marginVertical: SPACING.xs,
        minWidth: 180,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    secondaryButton: {
        backgroundColor: COLORS.backgroundSecondary,
    },
    modalButtonText: {
        color: COLORS.textLight,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        textAlign: 'center',
    },
    secondaryButtonText: {
        color: COLORS.textSecondary,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: TYPOGRAPHY.medium,
        textAlign: 'center',
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    soundControlsContainer: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginVertical: SPACING.md,
        width: '100%',
    },
    soundRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
    },
    soundLabel: {
        flex: 1,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        color: COLORS.textPrimary,
        fontWeight: TYPOGRAPHY.medium,
    },
    celebration: {
        fontSize: 28,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    movesLeftText: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.organicWaste,
        marginBottom: SPACING.sm,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    scoreLabel: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        marginBottom: SPACING.lg,
    },
    modalButtonsContainer: {
        width: '100%',
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    textButton: {
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    textButtonLabel: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    soundToggleFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.xl,
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.cardBorder,
    },
    soundToggleButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    soundToggleActive: {
        backgroundColor: 'rgba(139, 195, 74, 0.15)',
    },
    achievementBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderWidth: 1,
        borderColor: '#FFD700',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    achievementEmoji: {
        fontSize: 40,
        marginRight: SPACING.md,
    },
    achievementTextContainer: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: '#B8860B',
        marginBottom: 2,
    },
    achievementName: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#B8860B',
    },
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: SPACING.lg,
        right: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderWidth: 2,
        borderColor: '#FFD700',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        zIndex: 1000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    toastEmoji: {
        fontSize: 36,
        marginRight: SPACING.md,
    },
    toastTextContainer: {
        flex: 1,
    },
    toastTitle: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: '#FFD700',
        marginBottom: 2,
    },
    toastName: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#FFFFFF',
    },
});

export default GameScreen;
