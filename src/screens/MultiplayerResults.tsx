// Multiplayer Results Screen - Show final rankings
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getRoomStatus, Participant, Room } from '../services/MultiplayerService';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { playSfx, playBgm } from '../utils/SoundManager';
import { formatNumber, getCurrentLanguage } from '../config/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'MultiplayerResults'>;

const MultiplayerResults: React.FC<Props> = ({ navigation, route }) => {
    const { roomCode } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<Room | null>(null);
    const [rankings, setRankings] = useState<Participant[]>([]);
    const [myRank, setMyRank] = useState(0);
    const [myScore, setMyScore] = useState<number | null>(null);

    useEffect(() => {
        playBgm('bgm_menu');
    }, []);

    // Poll for updates while game is active
    useFocusEffect(
        useCallback(() => {
            loadResults();

            const pollInterval = setInterval(() => {
                loadResults();
            }, 5000);

            return () => clearInterval(pollInterval);
        }, [roomCode])
    );

    const loadResults = async () => {
        const result = await getRoomStatus(roomCode);
        if (result.room) {
            setRoom(result.room);
        }
        if (result.participants) {
            // Server already returns participants in correct rank order
            // (completion_time > 0 first sorted by fastest, then others by score)
            setRankings(result.participants);

            // Store my score for (You) identification
            if (result.my_score !== undefined) {
                setMyScore(result.my_score);
            }

            // Find my rank
            const myIndex = result.participants.findIndex((p: Participant) => p.current_score === result.my_score);
            setMyRank(myIndex >= 0 ? myIndex + 1 : result.participants.length);
        }
        setLoading(false);

        // Play victory sound if winner
        if (result.participants && result.participants.length > 0) {
            const topPlayer = result.participants[0];
            if (topPlayer.current_score === result.my_score) {
                playSfx('tile_select');
            }
        }
    };

    const handleExit = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    // Check if game is still active
    const isGameActive = room?.status === 'active';

    const getRankStyle = (index: number) => {
        switch (index) {
            case 0: return { backgroundColor: '#FFD700' }; // Gold
            case 1: return { backgroundColor: '#C0C0C0' }; // Silver
            case 2: return { backgroundColor: '#CD7F32' }; // Bronze
            default: return { backgroundColor: COLORS.cardBackground };
        }
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return '🥇';
            case 1: return '🥈';
            case 2: return '🥉';
            default: return null;
        }
    };

    const formatCompletionTime = (seconds: number | undefined): string => {
        if (!seconds) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const renderRankItem = ({ item, index }: { item: Participant; index: number }) => (
        <View style={[styles.rankCard, index < 3 && styles.topRankCard]}>
            <View style={[styles.rankBadge, getRankStyle(index)]}>
                {getRankIcon(index) ? (
                    <Text style={styles.rankEmoji}>{getRankIcon(index)}</Text>
                ) : (
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                )}
            </View>
            <View style={styles.rankInfo}>
                <Text style={styles.rankName}>
                    {item.username}{item.current_score === myScore ? ` (${t('multiplayer.you')})` : ''}
                </Text>
                <Text style={styles.rankScore}>
                    {formatNumber(item.current_score, getCurrentLanguage())}
                </Text>
            </View>
            {room?.game_mode === 'race' && (
                <View style={styles.timeContainer}>
                    <MaterialCommunityIcons
                        name={item.completion_time && item.completion_time > 0 ? 'check-circle' : 'clock-outline'}
                        size={16}
                        color={item.completion_time && item.completion_time > 0 ? COLORS.organicWaste : COLORS.textSecondary}
                    />
                    <Text style={styles.timeText}>
                        {item.completion_time && item.completion_time > 0 ? formatCompletionTime(item.completion_time) : t('multiplayer.dnf')}
                    </Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={COLORS.organicWaste} />
            </View>
        );
    }

    const winner = rankings[0];
    const isWinner = myRank === 1;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{t('multiplayer.results')}</Text>
                <Text style={styles.roomName}>{room?.name}</Text>
                {/* Game Status Badge */}
                <View style={[styles.statusBadge, isGameActive ? styles.statusActive : styles.statusCompleted]}>
                    <MaterialCommunityIcons
                        name={isGameActive ? 'play-circle' : 'check-circle'}
                        size={14}
                        color="#fff"
                    />
                    <Text style={styles.statusText}>
                        {isGameActive ? t('multiplayer.gameActive') : t('multiplayer.gameComplete')}
                    </Text>
                </View>
            </View>

            {/* Winner Celebration */}
            <View style={styles.winnerSection}>
                <Text style={styles.trophy}>🏆</Text>
                <Text style={styles.winnerLabel}>{t('multiplayer.winner')}</Text>
                <Text style={styles.winnerName}>{winner?.username}</Text>
                <Text style={styles.winnerScore}>
                    {formatNumber(winner?.current_score || 0, getCurrentLanguage())}
                </Text>
            </View>

            {/* Your Result */}
            {!isWinner && (
                <View style={styles.yourResult}>
                    <Text style={styles.yourRankLabel}>{t('multiplayer.yourRank')}</Text>
                    <Text style={styles.yourRank}>#{myRank}</Text>
                </View>
            )}

            {/* Full Rankings */}
            <View style={styles.rankingsSection}>
                <Text style={styles.sectionTitle}>{t('multiplayer.finalRankings')}</Text>
                <FlatList
                    data={rankings}
                    keyExtractor={(item) => item.username}
                    renderItem={renderRankItem}
                    style={styles.rankingsList}
                    contentContainerStyle={styles.rankingsContent}
                />
            </View>

            {/* Exit Button */}
            <TouchableOpacity
                style={[styles.exitButton, { marginBottom: Math.max(insets.bottom, SPACING.lg) }]}
                onPress={handleExit}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="exit-to-app" size={24} color="#fff" />
                <Text style={styles.exitButtonText}>{t('multiplayer.backToMenu')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', paddingVertical: SPACING.md },
    title: { fontSize: TYPOGRAPHY.h2, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
    roomName: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary, marginTop: SPACING.xs },
    winnerSection: { alignItems: 'center', paddingVertical: SPACING.lg },
    trophy: { fontSize: 64 },
    winnerLabel: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary, marginTop: SPACING.sm },
    winnerName: { fontSize: TYPOGRAPHY.h2, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.organicWaste, marginTop: SPACING.xs },
    winnerScore: { fontSize: TYPOGRAPHY.h3, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary },
    yourResult: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingBottom: SPACING.md },
    yourRankLabel: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    yourRank: { fontSize: TYPOGRAPHY.h3, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.plastic },
    rankingsSection: { flex: 1, paddingHorizontal: SPACING.md },
    sectionTitle: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
    rankingsList: { flex: 1 },
    rankingsContent: { paddingBottom: SPACING.lg },
    rankCard: {
        flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.md,
        marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.cardBorder,
    },
    topRankCard: { borderWidth: 2 },
    rankBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
    rankEmoji: { fontSize: 20 },
    rankNumber: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.textPrimary },
    rankInfo: { flex: 1 },
    rankName: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
    rankScore: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    timeContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    timeText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    exitButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.textSecondary, marginHorizontal: SPACING.md, marginBottom: SPACING.lg,
        paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
    },
    exitButtonText: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: '#fff' },
    // Status badge styles
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.round, marginTop: SPACING.sm },
    statusActive: { backgroundColor: COLORS.accentHighlight },
    statusCompleted: { backgroundColor: COLORS.organicWaste },
    statusText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: '#fff' },
});

export default MultiplayerResults;
