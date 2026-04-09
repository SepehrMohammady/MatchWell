// Local Multiplayer Game Screen - Gameplay with P2P score sync
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Dimensions,
    TouchableOpacity,
    BackHandler,
    Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { playSfx, playThemeBgm, stopBgm, getSoundSettings, toggleSfx, toggleMusic } from '../utils/SoundManager';
import { MusicIcon, MusicOffIcon, VolumeIcon, VolumeOffIcon } from '../components/UI/Icons';
import { useGameStore } from '../context/GameStore';
import GameBoard from '../components/Game/GameBoard';
import PowerProgress from '../components/UI/PowerProgress';
import LocalMultiplayerService, { LocalPlayer, LocalGameConfig } from '../services/LocalMultiplayerService';
import { formatNumber, formatTimeLocalized, getCurrentLanguage } from '../config/i18n';
import { TRASH_FACTS, POLLUTION_FACTS, WATER_FACTS, ENERGY_FACTS, FOREST_FACTS, THEMES } from '../themes';
import MultiplayerHUD from '../components/UI/MultiplayerHUD';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalMultiplayerGame'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MOVES_COUNTDOWN_SECONDS = 30; // Grace period after first player finishes in moves mode

const LocalMultiplayerGame: React.FC<Props> = ({ navigation, route }) => {
    const { isHost } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [rankings, setRankings] = useState<LocalPlayer[]>([]);
    const [endlessFactIndex, setEndlessFactIndex] = useState(0);
    const [gameInitialized, setGameInitialized] = useState(false);
    
    // Game config from service
    const gameConfig = LocalMultiplayerService.getGameConfig();
    const theme = gameConfig?.theme || 'trash-sorting';
    const gameMode = gameConfig?.gameMode || 'race';
    const targetScore = gameConfig?.targetScore;
    const movesLimit = gameConfig?.movesLimit;
    const durationSeconds = gameConfig?.durationSeconds;
    const movesCountdownSeconds = gameConfig?.movesCountdownSeconds ?? 30;
    
    // For timed mode: start with durationSeconds; for moves mode: timer starts later
    const [timeRemaining, setTimeRemaining] = useState<number | null>(
        gameMode === 'timed' ? (durationSeconds || null) : null
    );
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [finished, setFinished] = useState(false);
    const [pauseVisible, setPauseVisible] = useState(false);
    const [sfxEnabled, setSfxEnabled] = useState(true);
    const [musicEnabled, setMusicEnabled] = useState(true);
    // Moves mode: this player used all their moves (but game continues for others)
    const [myMovesExhausted, setMyMovesExhausted] = useState(false);
    const isFinishing = useRef(false);
    const lastSyncScore = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Refs to always have the latest score/moves for async callbacks
    const scoreRef = useRef(0);
    const movesRef = useRef(0);

    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; buttons?: any[] }>({
        visible: false,
        title: '',
        message: ''
    });

    // Load sound settings whenever pause opens
    useEffect(() => {
        if (pauseVisible) {
            const s = getSoundSettings();
            setSfxEnabled(s.sfxEnabled);
            setMusicEnabled(s.musicEnabled);
        }
    }, [pauseVisible]);

    // Game store state
    const score = useGameStore((s) => s.score);
    const moves = useGameStore((s) => s.moves);
    const initializeGame = useGameStore((s) => s.initializeGame);
    const isGameOver = useGameStore((s) => s.isGameOver);
    const activatePowerUp = useGameStore((s) => s.activatePowerUp);

    // Keep refs in sync with latest values
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { movesRef.current = moves; }, [moves]);

    // Initialize game
    useEffect(() => {
        if (theme) {
            initializeGame(0, true, theme);
            setGameInitialized(true);
        }
    }, []);

    // BGM: play on focus, stop on blur (same pattern as GameScreen - prevents overlap with menu music)
    useFocusEffect(
        useCallback(() => {
            if (theme) {
                playThemeBgm(theme);
            }
            return () => {
                stopBgm();
            };
        }, [theme])
    );

    // Set up P2P callbacks
    useEffect(() => {
        LocalMultiplayerService.setCallbacks({
            onRankingsUpdated: (newRankings) => {
                setRankings(newRankings);
            },
            onGameEnded: () => {
                setFinished(true);
                stopBgm();
                navigation.replace('LocalMultiplayerResults');
            },
            onPlayerLeft: (endpointId) => {
                // Update rankings
                setRankings(LocalMultiplayerService.getPlayers().sort((a,b) => b.score - a.score));
            },
            onScoreUpdate: (endpointId, peerScore, peerMoves, peerFinished) => {
                // If a client reaches the target in race mode, the host must end the game for everyone
                if (isHost && gameMode === 'race' && peerFinished) {
                    handleFinish();
                }
                // In moves mode, when any player finishes:
                if (isHost && gameMode === 'moves' && peerFinished) {
                    const allPlayers = LocalMultiplayerService.getPlayers();
                    const allFinished = allPlayers.every(p => p.finished);
                    if (allFinished) {
                        // All done, end game immediately
                        handleFinish();
                    } else {
                        // First player finished - start countdown for remaining players
                        startMovesCountdown();
                    }
                }
            },
            onCountdownStart: (seconds) => {
                // Client received countdown start from host
                if (timeRemaining === null) {
                    setTimeRemaining(seconds);
                }
            },
        });
    }, []);

    // Block back button during game
    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                return true; // Block back during local game
            });
            return () => backHandler.remove();
        }, [])
    );

    // Check game end conditions
    useEffect(() => {
        if (!gameInitialized || finished) return;

        // Race mode: reached target
        if (gameMode === 'race' && targetScore && score >= targetScore) {
            handleFinish();
        }

        // Moves mode: this player used all moves
        // Disable the board and start countdown for remaining players
        if (gameMode === 'moves' && movesLimit && moves >= movesLimit && !myMovesExhausted) {
            setMyMovesExhausted(true);
            // Send finished=true so host knows this player is done
            LocalMultiplayerService.sendScoreUpdate(score, moves, true);
            // If host, check if all done or start countdown
            if (isHost) {
                const allPlayers = LocalMultiplayerService.getPlayers();
                const allFinished = allPlayers.every(p => p.finished);
                if (allFinished) {
                    handleFinish();
                } else {
                    startMovesCountdown();
                }
            }
        }

        // Timed mode: out of time
        // Wait until timeRemaining hits 0 via the timer interval
    }, [score, moves, finished, gameInitialized, gameMode, targetScore, movesLimit, myMovesExhausted]);

    // Timer countdown
    useEffect(() => {
        if (!gameInitialized || finished) return;
        if (timeRemaining === null || timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                    handleFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, gameInitialized, finished]);

    // Score sync via P2P (every 1 second)
    useEffect(() => {
        if (!gameInitialized || finished || isFinishing.current) return;

        const syncInterval = setInterval(() => {
            const latestScore = scoreRef.current;
            const latestMoves = movesRef.current;
            if (latestScore !== lastSyncScore.current) {
                lastSyncScore.current = latestScore;
                LocalMultiplayerService.sendScoreUpdate(latestScore, latestMoves, myMovesExhausted);
            }
        }, 1000);

        return () => clearInterval(syncInterval);
    }, [gameInitialized, finished, myMovesExhausted]);

    // Host: broadcast rankings every 2 seconds
    useEffect(() => {
        if (!isHost || !gameInitialized) return;

        const rankInterval = setInterval(() => {
            LocalMultiplayerService.broadcastRankings();
        }, 2000);

        return () => clearInterval(rankInterval);
    }, [isHost, gameInitialized]);

    // Host: start countdown for remaining players in moves mode
    const countdownStartedRef = useRef(false);
    const startMovesCountdown = useCallback(() => {
        if (!isHost || countdownStartedRef.current) return;
        countdownStartedRef.current = true;
        const seconds = movesCountdownSeconds > 0 ? movesCountdownSeconds : MOVES_COUNTDOWN_SECONDS;
        setTimeRemaining(seconds);
        LocalMultiplayerService.broadcastCountdownStart(seconds);
    }, [isHost, movesCountdownSeconds]);

    const handleFinish = async () => {
        console.log(`[LocalMultiplayerGame] handleFinish called. isHost=${isHost}`);
        if (finished || isFinishing.current) return;
        isFinishing.current = true;
        setFinished(true);
        playSfx('tile_select');

        // Use refs to get latest score/moves (avoids stale closure)
        const finalScore = scoreRef.current;
        const finalMoves = movesRef.current;

        console.log(`[LocalMultiplayerGame] Sending final score: ${finalScore}, moves: ${finalMoves}`);
        await LocalMultiplayerService.sendScoreUpdate(finalScore, finalMoves, true);

        if (isHost) {
            // Wait a moment for final scores to arrive, then end game
            setTimeout(async () => {
                await LocalMultiplayerService.endGame();
                stopBgm();
                navigation.replace('LocalMultiplayerResults');
            }, 2000);
        }
    };

    const formatTime = (seconds: number): string => {
        return formatTimeLocalized(seconds, getCurrentLanguage());
    };

    const getThemeFacts = () => {
        switch (theme) {
            case 'trash-sorting': return TRASH_FACTS;
            case 'pollution': return POLLUTION_FACTS;
            case 'water-conservation': return WATER_FACTS;
            case 'energy-efficiency': return ENERGY_FACTS;
            case 'deforestation': return FOREST_FACTS;
            default: return TRASH_FACTS;
        }
    };

    const getTranslatedFact = () => {
        const themeKey = theme === 'trash-sorting' ? 'trash' : theme === 'water-conservation' ? 'water' : theme === 'energy-efficiency' ? 'energy' : theme === 'deforestation' ? 'forest' : theme;
        const facts = t(`facts.${themeKey}`, { returnObjects: true }) as string[];
        return facts?.[0] || '';
    };

    // Calculate a dynamic background color based on game progress
    const getBackgroundStyle = () => {
        // Find theme colors to interpolate between
        const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
        // Use a generic polluted/dark grayish color as starting point
        const startColor = { r: 68, g: 80, b: 140 }; // A dark dusky blue instead of generic gray
        
        // Extract RGB from theme color (assuming #RRGGBB format)
        let endColor = { r: 52, g: 152, b: 219 }; // fallback blue
        if (currentTheme.color.startsWith('#') && currentTheme.color.length === 7) {
            endColor = {
                r: parseInt(currentTheme.color.slice(1, 3), 16),
                g: parseInt(currentTheme.color.slice(3, 5), 16),
                b: parseInt(currentTheme.color.slice(5, 7), 16)
            };
        }

        let progress = 0;
        
        if (gameMode === 'race' && targetScore) {
            progress = Math.min(score / targetScore, 1);
        } else if (gameMode === 'moves' && movesLimit) {
            progress = Math.min(moves / movesLimit, 1);
        } else if (gameMode === 'timed' && timeRemaining !== null && durationSeconds) {
            // progress from 0 (start) to 1 (end of time)
            progress = 1 - Math.max(timeRemaining / durationSeconds, 0);
        }

        // Keep it slightly dimmed so tiles stand out more
        progress = progress * 0.7;

        // Interpolate colors
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * progress);
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * progress);
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * progress);

        return { backgroundColor: `rgb(${r}, ${g}, ${b})` };
    };

    const handleSfxToggle = () => {
        const next = !sfxEnabled;
        setSfxEnabled(next);
        toggleSfx(next);
        if (next) playSfx('tile_select');
    };

    const handleMusicToggle = () => {
        const next = !musicEnabled;
        setMusicEnabled(next);
        toggleMusic(next); // false → stopBgm(); true → no-op (caller starts playback below)
        if (next) {
            playThemeBgm(theme);
        }
    };

    const handlePause = () => {
        setPauseVisible(true);
    };

    const handleResume = () => {
        setPauseVisible(false);
        playSfx('tile_select');
    };

    const handleQuit = async () => {
        setPauseVisible(false);
        stopBgm();
        if (isHost) {
            await LocalMultiplayerService.endGame();
        } else {
            await LocalMultiplayerService.stopAll();
        }
        navigation.replace('MainMenu');
    };

    return (
        <View style={[styles.container, getBackgroundStyle(), { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <MultiplayerHUD
                onPause={handlePause}
                gameMode={gameMode}
                targetScore={targetScore}
                movesLimit={movesLimit}
                timeRemaining={timeRemaining}
                showScoreboard={showScoreboard}
                onToggleScoreboard={() => setShowScoreboard(!showScoreboard)}
            />

            {/* Pause Modal */}
            <Modal visible={pauseVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('game.paused')}</Text>

                        <TouchableOpacity style={styles.modalButton} onPress={handleResume} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="play" size={20} color="#fff" />
                            <Text style={styles.modalButtonText}>{t('common.resume', 'Resume')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modalButton, styles.dangerButton]} onPress={handleQuit} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="exit-to-app" size={20} color="#fff" />
                            <Text style={styles.modalButtonText}>{t('common.quit', 'Quit')}</Text>
                        </TouchableOpacity>

                        {/* Sound controls */}
                        <View style={styles.soundToggleFooter}>
                            <TouchableOpacity
                                style={[styles.soundToggleButton, musicEnabled && styles.soundToggleActive]}
                                onPress={handleMusicToggle}
                                activeOpacity={0.7}
                            >
                                {musicEnabled
                                    ? <MusicIcon size={24} color={COLORS.organicWaste} />
                                    : <MusicOffIcon size={24} color={COLORS.textMuted} />}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.soundToggleButton, sfxEnabled && styles.soundToggleActive]}
                                onPress={handleSfxToggle}
                                activeOpacity={0.7}
                            >
                                {sfxEnabled
                                    ? <VolumeIcon size={24} color={COLORS.organicWaste} />
                                    : <VolumeOffIcon size={24} color={COLORS.textMuted} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Mini Scoreboard */}
            {showScoreboard && rankings.length > 0 && (
                <View style={[styles.scoreboard, { marginHorizontal: SPACING.md }]}>
                        {rankings.slice(0, 4).map((player, index) => (
                            <View key={player.endpointId} style={styles.rankRow}>
                                <Text style={styles.rankNumber}>#{formatNumber(index + 1, getCurrentLanguage())}</Text>
                                <Text style={styles.rankName} numberOfLines={1}>
                                    {player.name}
                                </Text>
                                <Text style={styles.rankScore}>{formatNumber(player.score)}</Text>
                                {player.finished && (
                                    <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                                )}
                            </View>
                        ))}
                    </View>
                )}

            {/* Environmental Fact - between HUD and board */}
            <View style={styles.factContainer}>
                <Text style={styles.factIcon}>💡</Text>
                <Text style={styles.factText}>{getTranslatedFact()}</Text>
            </View>

            {/* Power Progress - Top */}
            <View style={styles.powerContainer}>
                <PowerProgress theme={theme} onActivate={activatePowerUp} />
            </View>

            {/* Game Board - disabled when moves exhausted */}
            <View style={styles.boardContainer} pointerEvents={myMovesExhausted ? 'none' : 'auto'}>
                <GameBoard />
                {/* Moves exhausted overlay */}
                {myMovesExhausted && (
                    <View style={styles.movesExhaustedOverlay}>
                        <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
                        <Text style={styles.movesExhaustedText}>
                            {t('localMultiplayer.movesCompleted', 'Moves completed!')}
                        </Text>
                        <Text style={styles.movesExhaustedSubtext}>
                            {t('localMultiplayer.waitingForOthers', 'Waiting for other players...')}
                        </Text>
                        {timeRemaining !== null && timeRemaining > 0 && (
                            <Text style={[styles.movesExhaustedTimer, timeRemaining <= 10 && styles.dangerText]}>
                                {formatTime(timeRemaining)}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    factContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.xs,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    factIcon: {
        fontSize: 20,
        marginRight: SPACING.sm,
    },
    factText: {
        flex: 1,
        color: '#fff',
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        lineHeight: 18,
    },
    scoreboard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginTop: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: 3,
    },
    rankNumber: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.organicWaste,
        width: 24,
    },
    rankName: {
        flex: 1,
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
    },
    rankScore: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    boardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    movesExhaustedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    movesExhaustedText: {
        color: '#fff',
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        marginTop: SPACING.md,
    },
    movesExhaustedSubtext: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        marginTop: SPACING.xs,
    },
    movesExhaustedTimer: {
        color: '#fff',
        fontSize: TYPOGRAPHY.h1,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        marginTop: SPACING.md,
    },
    dangerText: {
        color: '#E53935',
    },
    powerContainer: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
    },
    // Pause modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    modalContent: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '100%',
        alignItems: 'center',
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        width: '100%',
    },
    dangerButton: {
        backgroundColor: '#E53935',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
    },
    soundToggleFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.xl,
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.cardBorder,
        width: '100%',
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
});

export default LocalMultiplayerGame;
