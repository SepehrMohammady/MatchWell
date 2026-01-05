// Room Lobby Screen - Wait for players, vote themes, start game
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, ThemeType } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getRoomStatus, startGame, voteTheme, leaveRoom, Participant, ThemeVote, Room } from '../services/MultiplayerService';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../utils/SoundManager';
import { THEMES, LEVELS } from '../themes';
import { useGameStore } from '../context/GameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomLobby'>;

const RoomLobby: React.FC<Props> = ({ navigation, route }) => {
    const { roomCode } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<Room | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [hostUsername, setHostUsername] = useState<string>('');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [themeVotes, setThemeVotes] = useState<ThemeVote[]>([]);
    const [myVote, setMyVote] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    // Get completed levels to filter themes
    const completedLevels = useGameStore((state) => state.completedLevels);

    // Get unlocked themes (at least one level completed in that theme)
    const unlockedThemes = THEMES.filter(theme => {
        const themeLevels = LEVELS.filter(l => l.theme === theme.id);
        return themeLevels.some(level => completedLevels.includes(level.id));
    });

    const loadRoomStatus = async () => {
        const result = await getRoomStatus(roomCode);
        if (result.error) {
            Alert.alert(t('common.error'), result.error, [
                { text: t('common.ok'), onPress: () => navigation.goBack() }
            ]);
            return;
        }

        setRoom(result.room || null);
        setIsHost(result.is_host || false);
        setHostUsername(result.host_username || '');
        setParticipants(result.participants || []);
        setThemeVotes(result.theme_votes || []);
        setLoading(false);

        // If game started, navigate to game
        if (result.room?.status === 'active') {
            navigation.replace('MultiplayerGame', {
                roomCode,
                theme: result.room.theme as ThemeType,
                gameMode: result.room.game_mode,
                targetScore: result.room.target_score,
                movesLimit: result.room.moves_limit,
            });
        } else if (result.room?.status === 'completed') {
            navigation.replace('MultiplayerResults', { roomCode });
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRoomStatus();
            const interval = setInterval(loadRoomStatus, 3000); // Poll every 3 seconds
            return () => clearInterval(interval);
        }, [roomCode])
    );

    const handleBack = () => {
        playSfx('tile_select');
        Alert.alert(
            t('multiplayer.leaveRoom'),
            t('multiplayer.leaveConfirm'),
            [
                { text: t('common.no'), style: 'cancel' },
                {
                    text: t('common.yes'), style: 'destructive', onPress: async () => {
                        await leaveRoom(roomCode);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    const handleVoteTheme = async (theme: ThemeType) => {
        playSfx('tile_select');
        setMyVote(theme);
        const result = await voteTheme(roomCode, theme);
        if (result.votes) {
            setThemeVotes(result.votes);
        }
    };

    const handleStartGame = async () => {
        if (!room) return;
        setStarting(true);
        playSfx('tile_select');

        const winningTheme = themeVotes.length > 0 ? themeVotes[0].theme_vote : room.theme;
        const result = await startGame(roomCode, winningTheme as ThemeType);

        if (result.started) {
            playSfx('tile_select');
            navigation.replace('MultiplayerGame', {
                roomCode,
                theme: (result.theme || winningTheme) as ThemeType,
                gameMode: room.game_mode,
                targetScore: room.target_score,
                movesLimit: room.moves_limit,
            });
        } else {
            Alert.alert(t('common.error'), result.error || t('multiplayer.errorStart'));
            setStarting(false);
        }
    };

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'race': return 'flag-checkered';
            case 'timed': return 'clock-outline';
            case 'moves': return 'shoe-print';
            default: return 'gamepad-variant';
        }
    };

    const renderParticipant = ({ item, index }: { item: Participant; index: number }) => (
        <View style={styles.participantRow}>
            <View style={styles.participantInfo}>
                <MaterialCommunityIcons name="account" size={24} color={COLORS.textPrimary} />
                <Text style={styles.participantName}>{item.username}</Text>
            </View>
            {item.username === hostUsername && (
                <View style={styles.hostBadge}>
                    <Text style={styles.hostText}>{t('multiplayer.host')}</Text>
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

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{room?.name}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Room Code - Prominent Display */}
            <View style={styles.roomCodeSection}>
                <Text style={styles.roomCodeLabel}>{t('multiplayer.roomCode')}</Text>
                <Text style={styles.roomCodeBig}>{roomCode}</Text>
            </View>

            {/* Room Info */}
            <View style={styles.roomInfo}>
                <View style={styles.infoCard}>
                    <MaterialCommunityIcons name={getModeIcon(room?.game_mode || '')} size={24} color={COLORS.organicWaste} />
                    <Text style={styles.infoLabel}>{t(`multiplayer.${room?.game_mode}Mode`)}</Text>
                </View>
                {room?.target_score && (
                    <View style={styles.infoCard}>
                        <MaterialCommunityIcons name="target" size={24} color={COLORS.plastic} />
                        <Text style={styles.infoLabel}>{(room.target_score / 1000)}K</Text>
                    </View>
                )}
                {room?.moves_limit && (
                    <View style={styles.infoCard}>
                        <MaterialCommunityIcons name="shoe-print" size={24} color={COLORS.accentHighlight} />
                        <Text style={styles.infoLabel}>{room.moves_limit} {t('common.moves')}</Text>
                    </View>
                )}
            </View>

            {/* Theme Voting */}
            {room?.theme_voting && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('multiplayer.voteTheme')}</Text>
                    <View style={styles.themeGrid}>
                        {unlockedThemes.map((theme) => {
                            const voteCount = themeVotes.find(v => v.theme_vote === theme.id)?.votes || 0;
                            return (
                                <TouchableOpacity
                                    key={theme.id}
                                    style={[
                                        styles.themeCard,
                                        myVote === theme.id && styles.themeCardActive,
                                        { borderColor: theme.color }
                                    ]}
                                    onPress={() => handleVoteTheme(theme.id)}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name={theme.icon} size={32} color={theme.color} />
                                    {voteCount > 0 && (
                                        <View style={styles.voteBadge}>
                                            <Text style={styles.voteCount}>{voteCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Participants */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    {t('multiplayer.players')} ({participants.length}/{room?.max_players})
                </Text>
                <FlatList
                    data={participants}
                    keyExtractor={(item, index) => `${item.username}-${index}`}
                    renderItem={renderParticipant}
                    style={styles.participantList}
                />
            </View>

            {/* Start Button (Host only) */}
            {isHost && (
                <TouchableOpacity
                    style={[styles.startButton, starting && styles.startButtonDisabled]}
                    onPress={handleStartGame}
                    disabled={starting || participants.length < 2}
                    activeOpacity={0.8}
                >
                    {starting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="play" size={28} color="#fff" />
                            <Text style={styles.startButtonText}>{t('multiplayer.startGame')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {!isHost && (
                <View style={styles.waitingContainer}>
                    <ActivityIndicator size="small" color={COLORS.organicWaste} />
                    <Text style={styles.waitingText}>{t('multiplayer.waitingHost')}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    },
    backButton: { padding: SPACING.xs },
    title: { fontSize: TYPOGRAPHY.h3, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
    placeholder: { width: 40 },
    roomCodeSection: {
        alignItems: 'center', paddingVertical: SPACING.md, marginBottom: SPACING.md,
        backgroundColor: COLORS.cardBackground, marginHorizontal: SPACING.md, borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.organicWaste,
    },
    roomCodeLabel: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    roomCodeBig: { fontSize: 36, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.bold, color: COLORS.organicWaste, letterSpacing: 6 },
    roomInfo: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
    infoCard: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
        backgroundColor: COLORS.cardBackground, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cardBorder,
    },
    infoLabel: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary },
    section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
    sectionTitle: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    themeCard: {
        width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.md, borderWidth: 2,
    },
    themeCardActive: { backgroundColor: COLORS.cardBackground + '80' },
    themeEmoji: { fontSize: 24 },
    voteBadge: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: COLORS.organicWaste, width: 18, height: 18,
        borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    },
    voteCount: { fontSize: 10, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: '#fff' },
    participantList: { maxHeight: 300 },
    participantRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.cardBackground, padding: SPACING.md, borderRadius: RADIUS.md,
        marginBottom: SPACING.xs, borderWidth: 1, borderColor: COLORS.cardBorder,
    },
    participantInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    participantName: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary },
    hostBadge: { backgroundColor: COLORS.organicWaste, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
    hostText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: '#fff' },
    startButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.organicWaste, marginHorizontal: SPACING.md, paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg, position: 'absolute', bottom: SPACING.xl, left: 0, right: 0,
    },
    startButtonDisabled: { opacity: 0.6 },
    startButtonText: { fontSize: TYPOGRAPHY.h4, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: '#fff' },
    waitingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
    waitingText: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
});

export default RoomLobby;
