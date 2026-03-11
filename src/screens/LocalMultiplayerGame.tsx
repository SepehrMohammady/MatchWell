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
import { TRASH_FACTS, POLLUTION_FACTS, WATER_FACTS, ENERGY_FACTS, FOREST_FACTS } from '../themes';
import MultiplayerHUD from '../components/UI/MultiplayerHUD';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalMultiplayerGame'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LocalMultiplayerGame: React.FC<Props> = ({ navigation, route }) => {
    const { isHost } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [rankings, setRankings] = useState<LocalPlayer[]>([]);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [finished, setFinished] = useState(false);
    const [gameInitialized, setGameInitialized] = useState(false);
    const lastSyncScore = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Game config from service
    const gameConfig = LocalMultiplayerService.getGameConfig();
    const theme = gameConfig?.theme || 'trash-sorting';
    const gameMode = gameConfig?.gameMode || 'race';
    const targetScore = gameConfig?.targetScore;
    const movesLimit = gameConfig?.movesLimit;
    const durationSeconds = gameConfig?.durationSeconds;

    // Game store state
    const score = useGameStore((s) => s.score);
    const moves = useGameStore((s) => s.moves);
    const initializeGame = useGameStore((s) => s.initializeGame);
    const isGameOver = useGameStore((s) => s.isGameOver);
    const activatePowerUp = useGameStore((s) => s.activatePowerUp);

    // Initialize game
    useEffect(() => {
        if (theme) {
            initializeGame(0, true, theme);
            setGameInitialized(true);
            playThemeBgm(theme);

            if (durationSeconds) {
                setTimeRemaining(durationSeconds);
            }
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

        // Moves mode: used all moves
        if (gameMode === 'moves' && movesLimit && moves >= movesLimit) {
            handleFinish();
        }
    }, [score, moves, finished, gameInitialized, gameMode, targetScore, movesLimit]);

    // Score sync via P2P (every 150 points)
    useEffect(() => {
        if (!gameInitialized || finished) return;

        if (score > lastSyncScore.current + 150) {
            lastSyncScore.current = score;
            LocalMultiplayerService.sendScoreUpdate(score, moves, false);
        }
    }, [score, gameInitialized, finished]);

    // Timer countdown (timed mode)
    useEffect(() => {
        if (timeRemaining === null || timeRemaining <= 0) return;

        timerRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev === null || prev <= 1) {
                    handleFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timeRemaining]);

    // Host: broadcast rankings every 2 seconds
    useEffect(() => {
        if (!isHost || !gameInitialized) return;

        const rankInterval = setInterval(() => {
            LocalMultiplayerService.broadcastRankings();
        }, 2000);

        return () => clearInterval(rankInterval);
    }, [isHost, gameInitialized]);

    const handleFinish = async () => {
        if (finished) return;
        setFinished(true);
        playSfx('level_complete');

        // Send final score
        await LocalMultiplayerService.sendScoreUpdate(score, moves, true);

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

    const getBackgroundStyle = () => {
        if (gameMode === 'race' && targetScore) {
            const progress = Math.min(score / targetScore, 1);
            const grayValue = Math.floor(128 - progress * 60);
            const blueValue = Math.floor(140 + progress * 115);
            return { backgroundColor: `rgb(${grayValue}, ${grayValue + 20}, ${blueValue})` };
        }
        return { backgroundColor: COLORS.backgroundPrimary };
    };

    const handlePause = () => {
        // Simple quit alert for multiplayer
        import('react-native').then(({ Alert }) => {
            Alert.alert(
                t('game.paused'),
                t('localMultiplayer.quitConfirm', 'Are you sure you want to quit this multiplayer match?'),
                [
                    { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                    { text: t('common.quit', 'Quit'), style: 'destructive', onPress: async () => {
                        if (isHost) {
                            await LocalMultiplayerService.endGame();
                        } else {
                            await LocalMultiplayerService.stopAll();
                        }
                        navigation.replace('MainMenu');
                    }}
                ]
            );
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
