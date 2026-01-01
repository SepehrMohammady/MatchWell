// Multiplayer Game Screen - Play with live scoreboard
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { updateScore, getRoomStatus, Participant } from '../services/MultiplayerService';
import { useTranslation } from 'react-i18next';
import { playSfx, playBgm } from '../utils/SoundManager';
import { useGameStore } from '../context/GameStore';
import GameBoard from '../components/Game/GameBoard';
import { formatNumber, getCurrentLanguage } from '../config/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'MultiplayerGame'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MultiplayerGame: React.FC<Props> = ({ navigation, route }) => {
    const { roomCode, theme, gameMode, targetScore, movesLimit } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [rankings, setRankings] = useState<Participant[]>([]);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [finished, setFinished] = useState(false);
    const lastSyncScore = useRef(0);

    // Game store state
    const score = useGameStore((s) => s.score);
    const moves = useGameStore((s) => s.moves);
    const initializeGame = useGameStore((s) => s.initializeGame);
    const isGameOver = useGameStore((s) => s.isGameOver);

    // Initialize game
    useEffect(() => {
        initializeGame(0, true, theme);
        playBgm('bgm_menu');
    }, []);

    // Check game end conditions
    useEffect(() => {
        if (finished) return;

        // Race mode: reached target
        if (gameMode === 'race' && targetScore && score >= targetScore) {
            handleFinish();
        }

        // Moves mode: used all moves
        if (gameMode === 'moves' && movesLimit && moves >= movesLimit) {
            handleFinish();
        }
    }, [score, moves, finished]);

    // Sync score to server periodically
    useEffect(() => {
        if (finished) return;

        const syncScore = async () => {
            if (score > lastSyncScore.current + 500) { // Sync every 500 points
                lastSyncScore.current = score;
                const result = await updateScore(roomCode, score, moves, false);
                if (result.rankings) {
                    setRankings(result.rankings);
                }
                if (result.room_status === 'completed') {
                    navigation.replace('MultiplayerResults', { roomCode });
                }
            }
        };

        syncScore();
    }, [score]);

    // Poll for rankings and time
    useFocusEffect(
        useCallback(() => {
            const pollStatus = async () => {
                const result = await getRoomStatus(roomCode);
                if (result.room) {
                    setTimeRemaining(result.room.time_remaining || null);
                    if (result.room.status === 'completed') {
                        navigation.replace('MultiplayerResults', { roomCode });
                    }
                }
                if (result.participants) {
                    setRankings(result.participants);
                }
            };

            const interval = setInterval(pollStatus, 5000);
            return () => clearInterval(interval);
        }, [roomCode])
    );

    // Timer countdown
    useEffect(() => {
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
    }, [timeRemaining]);

    const handleFinish = async () => {
        if (finished) return;
        setFinished(true);
        playSfx('tile_select');

        await updateScore(roomCode, score, moves, true);

        // Wait a moment then navigate to results
        setTimeout(() => {
            navigation.replace('MultiplayerResults', { roomCode });
        }, 2000);
    };

    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getMyRank = () => {
        const myEntry = rankings.findIndex(r => r.current_score === score);
        return myEntry >= 0 ? myEntry + 1 : rankings.length + 1;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* HUD */}
            <View style={styles.hud}>
                {/* Score & Rank */}
                <View style={styles.hudLeft}>
                    <Text style={styles.scoreLabel}>{t('common.score')}</Text>
                    <Text style={styles.scoreValue}>{formatNumber(score, getCurrentLanguage())}</Text>
                    <Text style={styles.rankText}>#{getMyRank()}</Text>
                </View>

                {/* Target/Moves */}
                <View style={styles.hudCenter}>
                    {gameMode === 'race' && targetScore && (
                        <View style={styles.targetContainer}>
                            <MaterialCommunityIcons name="target" size={20} color={COLORS.organicWaste} />
                            <Text style={styles.targetText}>
                                {formatNumber(score, getCurrentLanguage())}/{formatNumber(targetScore, getCurrentLanguage())}
                            </Text>
                        </View>
                    )}
                    {gameMode === 'moves' && movesLimit && (
                        <View style={styles.targetContainer}>
                            <MaterialCommunityIcons name="shoe-print" size={20} color={COLORS.accentHighlight} />
                            <Text style={styles.targetText}>{moves}/{movesLimit}</Text>
                        </View>
                    )}
                </View>

                {/* Timer & Scoreboard Toggle */}
                <View style={styles.hudRight}>
                    {timeRemaining !== null && (
                        <View style={styles.timerContainer}>
                            <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.textSecondary} />
                            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.scoreboardButton}
                        onPress={() => setShowScoreboard(!showScoreboard)}
                    >
                        <MaterialCommunityIcons
                            name={showScoreboard ? 'close' : 'account-group'}
                            size={24}
                            color={COLORS.textPrimary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Scoreboard Overlay */}
            {showScoreboard && (
                <View style={styles.scoreboardOverlay}>
                    <Text style={styles.scoreboardTitle}>{t('multiplayer.liveRankings')}</Text>
                    {rankings.slice(0, 5).map((player, index) => (
                        <View key={player.username} style={styles.rankRow}>
                            <Text style={styles.rankNum}>#{index + 1}</Text>
                            <Text style={styles.rankName}>{player.username}</Text>
                            <Text style={styles.rankScore}>
                                {formatNumber(player.current_score, getCurrentLanguage())}
                            </Text>
                            {player.has_finished && (
                                <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.organicWaste} />
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Game Grid */}
            <View style={styles.gridContainer}>
                <GameBoard />
            </View>

            {/* Finished Overlay */}
            {finished && (
                <View style={styles.finishedOverlay}>
                    <MaterialCommunityIcons name="flag-checkered" size={64} color={COLORS.organicWaste} />
                    <Text style={styles.finishedText}>{t('multiplayer.finished')}</Text>
                    <Text style={styles.finishedScore}>
                        {formatNumber(score, getCurrentLanguage())}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
    hud: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    },
    hudLeft: { alignItems: 'flex-start' } as any,
    scoreLabel: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    scoreValue: { fontSize: TYPOGRAPHY.h2, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
    rankText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.organicWaste },
    hudCenter: { alignItems: 'center', flex: 1 } as any,
    targetContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs } as any,
    targetText: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary },
    hudRight: { alignItems: 'flex-end', gap: SPACING.xs } as any,
    timerContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs } as any,
    timerText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    scoreboardButton: { padding: SPACING.xs },
    scoreboardOverlay: {
        position: 'absolute', top: 80, right: SPACING.md, left: SPACING.md,
        backgroundColor: COLORS.cardBackground + 'F0', borderRadius: RADIUS.lg,
        padding: SPACING.md, zIndex: 100, borderWidth: 1, borderColor: COLORS.cardBorder,
    } as any,
    scoreboardTitle: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
    rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm } as any,
    rankNum: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.organicWaste, width: 30 },
    rankName: { flex: 1, fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary },
    rankScore: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.textPrimary },
    gridContainer: { flex: 1 },
    finishedOverlay: {
        ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.backgroundPrimary + 'E0',
        justifyContent: 'center', alignItems: 'center', zIndex: 200,
    } as any,
    finishedText: { fontSize: TYPOGRAPHY.h2, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginTop: SPACING.md },
    finishedScore: { fontSize: TYPOGRAPHY.h1, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.organicWaste, marginTop: SPACING.sm },
});

export default MultiplayerGame;
