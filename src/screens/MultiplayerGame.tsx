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
import PowerProgress from '../components/UI/PowerProgress';
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
    const [endlessFactIndex, setEndlessFactIndex] = useState(0);
    const [gameInitialized, setGameInitialized] = useState(false);
    const lastSyncScore = useRef(0);

    // Game store state
    const score = useGameStore((s) => s.score);
    const moves = useGameStore((s) => s.moves);
    const initializeGame = useGameStore((s) => s.initializeGame);
    const isGameOver = useGameStore((s) => s.isGameOver);
    const activatePowerUp = useGameStore((s) => s.activatePowerUp);

    // Initialize game once theme is available
    useEffect(() => {
        if (theme) {
            initializeGame(0, true, theme);
            setGameInitialized(true);
            playBgm('bgm_menu');
        }
    }, [theme, initializeGame]);

    // Rotate facts every 60 seconds
    useEffect(() => {
        const factTimer = setInterval(() => {
            setEndlessFactIndex(prev => prev + 1);
        }, 60000);
        return () => clearInterval(factTimer);
    }, []);

    // Check game end conditions (only after game is initialized)
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
    }, [score, moves, finished, gameInitialized]);

    // Sync score to server periodically (only after game is initialized)
    useEffect(() => {
        if (!gameInitialized || finished) return;

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
    }, [score, gameInitialized]);

    // Poll for rankings and time
    useFocusEffect(
        useCallback(() => {
            // Reset for new room
            lastSyncScore.current = 0;

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

            // Fetch immediately on mount
            pollStatus();

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
        // If no rankings yet, player is #1
        if (rankings.length === 0) return 1;
        // Count how many players have a HIGHER score than me
        // My rank = number of players with higher scores + 1
        let higherCount = 0;
        for (const r of rankings) {
            if (r.current_score > score) higherCount++;
        }
        return higherCount + 1;
    };

    // Get translated fact based on theme
    const getTranslatedFact = () => {
        // Map theme to translation key
        const themeKeyMap: Record<string, string> = {
            'trash-sorting': 'trash',
            'water-conservation': 'water',
            'energy-efficiency': 'energy',
            'deforestation': 'forest',
            'pollution': 'pollution'
        };
        const themeKey = themeKeyMap[theme] || 'trash';
        const facts = t(`facts.${themeKey}`, { returnObjects: true }) as string[];
        // Handle case where translation returns the key itself (not an array)
        if (!Array.isArray(facts) || facts.length === 0) {
            return '';
        }
        return facts[endlessFactIndex % facts.length] || '';
    };

    const handleExit = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* HUD Card */}
            <View style={styles.hudCard}>
                {/* Top Row */}
                <View style={styles.hudTopRow}>
                    <View style={styles.hudLeft}>
                        <Text style={styles.scoreValue}>{formatNumber(score, getCurrentLanguage())}</Text>
                        {gameMode === 'race' && targetScore && (
                            <Text style={styles.targetText}>{t('game.targetScore', { score: formatNumber(targetScore, getCurrentLanguage()) })}</Text>
                        )}
                    </View>
                    <View style={styles.hudRight}>
                        <TouchableOpacity style={styles.pauseButton} onPress={handleExit}>
                            <MaterialCommunityIcons name="home" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Row */}
                <View style={styles.hudBottomRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>{t('common.moves')}</Text>
                        <Text style={styles.statValue}>{formatNumber(moves, getCurrentLanguage())}</Text>
                    </View>
                    {/* Rank badge first, then timer */}
                    <TouchableOpacity
                        style={[styles.rankBadge, { backgroundColor: COLORS.organicWaste }]}
                        onPress={() => setShowScoreboard(!showScoreboard)}
                    >
                        <Text style={styles.rankBadgeText}>#{getMyRank()}</Text>
                        <MaterialCommunityIcons name="account-group" size={16} color="#fff" />
                    </TouchableOpacity>
                    {timeRemaining !== null && (
                        <View style={styles.timerBadge}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color="#fff" />
                            <Text style={styles.timerBadgeText}>{formatTime(timeRemaining)}</Text>
                        </View>
                    )}
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

            {/* Environmental Fact */}
            <View style={styles.factContainer}>
                <Text style={styles.factIcon}>💡</Text>
                <Text style={styles.factText}>{getTranslatedFact()}</Text>
            </View>

            {/* Power-up Progress Bar with dark background */}
            <View style={styles.powerContainer}>
                <PowerProgress
                    theme={theme}
                    onActivate={() => activatePowerUp()}
                />
            </View>

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
    // HUD Card - matches Story mode
    hudCard: {
        padding: SPACING.md, backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.lg,
        margin: SPACING.sm, borderWidth: 1, borderColor: COLORS.cardBorder,
    },
    hudTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
    hudBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hudLeft: { alignItems: 'flex-start' },
    hudRight: { alignItems: 'flex-end' },
    scoreValue: { fontSize: 32, fontFamily: TYPOGRAPHY.fontFamilyBold, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary, letterSpacing: -1, lineHeight: 36 },
    targetText: { fontSize: TYPOGRAPHY.bodySmall, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textMuted },
    pauseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', alignItems: 'center' },
    stat: { alignItems: 'flex-start' },
    statLabel: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textMuted },
    statValue: { fontSize: TYPOGRAPHY.h2, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
    timerBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: COLORS.accentHighlight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.round },
    timerBadgeText: { fontSize: TYPOGRAPHY.bodySmall, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: '#fff' },
    rankBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.round },
    rankBadgeText: { fontSize: TYPOGRAPHY.bodySmall, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: '#fff' },
    // Fact container - dark background for visibility
    factContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, marginHorizontal: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder },
    factIcon: { fontSize: 20, marginRight: SPACING.sm },
    factText: { flex: 1, fontSize: TYPOGRAPHY.bodySmall, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    // Power container - much darker for visibility
    powerContainer: { backgroundColor: '#1a1a2e', marginHorizontal: SPACING.sm, marginTop: SPACING.xs, padding: SPACING.xs, borderRadius: RADIUS.md },
    // Scoreboard
    scoreboardOverlay: { position: 'absolute', top: 150, right: SPACING.md, left: SPACING.md, backgroundColor: COLORS.cardBackground + 'F0', borderRadius: RADIUS.lg, padding: SPACING.md, zIndex: 100, borderWidth: 1, borderColor: COLORS.cardBorder },
    scoreboardTitle: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm, textAlign: 'center' },
    rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm },
    rankNum: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.organicWaste, width: 30 },
    rankName: { flex: 1, fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary },
    rankScore: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.textPrimary },
    gridContainer: { flex: 1 },
    finishedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.backgroundPrimary + 'E0', justifyContent: 'center', alignItems: 'center', zIndex: 200 },
    finishedText: { fontSize: TYPOGRAPHY.h2, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginTop: SPACING.md },
    finishedScore: { fontSize: TYPOGRAPHY.h1, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.organicWaste, marginTop: SPACING.sm },
});

export default MultiplayerGame;
