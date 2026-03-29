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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { playSfx, playThemeBgm, stopBgm } from '../utils/SoundManager';
import { useGameStore } from '../context/GameStore';
import GameBoard from '../components/Game/GameBoard';
import PowerProgress from '../components/UI/PowerProgress';
import LocalMultiplayerService, { LocalPlayer, LocalGameConfig } from '../services/LocalMultiplayerService';
import { formatNumber, getCurrentLanguage } from '../config/i18n';
import { TRASH_FACTS, POLLUTION_FACTS, WATER_FACTS, ENERGY_FACTS, FOREST_FACTS, THEMES } from '../themes';
import MultiplayerHUD from '../components/UI/MultiplayerHUD';
import CustomAlert from '../components/UI/CustomAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalMultiplayerGame'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    
    // For timed mode: start with durationSeconds; for moves mode: timer starts later
    const [timeRemaining, setTimeRemaining] = useState<number | null>(
        gameMode === 'timed' ? (durationSeconds || null) : null
    );
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [finished, setFinished] = useState(false);
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
            playThemeBgm(theme);
        }

        return () => {
            stopBgm();
        };
    }, []);

    // Set up P2P callbacks
    useEffect(() => {
        LocalMultiplayerService.setCallbacks({
            onRankingsUpdated: (newRankings) => {
                setRankings(newRankings);
            },
            onGameEnded: () => {
                setFinished(true);
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
                // In moves mode, check if ALL players have finished their moves
                if (isHost && gameMode === 'moves' && peerFinished) {
                    const allPlayers = LocalMultiplayerService.getPlayers();
                    const allFinished = allPlayers.every(p => p.finished);
                    if (allFinished) {
                        handleFinish();
                    }
                }
            }
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
        // Don't end the game! Just mark this player as finished and start the countdown timer
        if (gameMode === 'moves' && movesLimit && moves >= movesLimit && !myMovesExhausted) {
            setMyMovesExhausted(true);
            // Send finished=true so host knows this player is done
            LocalMultiplayerService.sendScoreUpdate(score, moves, true);
            // If host, start a countdown timer using durationSeconds for remaining players
            if (isHost && durationSeconds && durationSeconds > 0 && timeRemaining === null) {
                setTimeRemaining(durationSeconds);
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
                navigation.replace('LocalMultiplayerResults');
            }, 2000);
        }
    };

    const formatTime = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
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

    const handlePause = () => {
        setAlertConfig({
            visible: true,
            title: t('game.paused'),
            message: t('localMultiplayer.quitConfirm', 'Are you sure you want to quit this multiplayer match?'),
            buttons: [
                {
                    text: t('common.cancel', 'Cancel'),
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                    style: 'secondary'
                },
                {
                    text: t('common.quit', 'Quit'),
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        if (isHost) {
                            await LocalMultiplayerService.endGame();
                        } else {
                            await LocalMultiplayerService.stopAll();
                        }
                        navigation.replace('MainMenu');
                    },
                    style: 'danger'
                }
            ]
        });
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

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
            />

            {/* Mini Scoreboard */}
            {showScoreboard && rankings.length > 0 && (
                <View style={[styles.scoreboard, { marginHorizontal: SPACING.md }]}>
                        {rankings.slice(0, 4).map((player, index) => (
                            <View key={player.endpointId} style={styles.rankRow}>
                                <Text style={styles.rankNumber}>#{index + 1}</Text>
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

            {/* Game Board */}
            <View style={styles.boardContainer}>
                <GameBoard />
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
    powerContainer: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
    },
});

export default LocalMultiplayerGame;
