// Multiplayer Menu Screen - Entry point for multiplayer mode
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    FlatList,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { listMyRooms, RoomListItem } from '../services/MultiplayerService';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../utils/SoundManager';

type Props = NativeStackScreenProps<RootStackParamList, 'MultiplayerMenu'>;

const MultiplayerMenu: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeRooms, setActiveRooms] = useState<RoomListItem[]>([]);
    const [waitingRooms, setWaitingRooms] = useState<RoomListItem[]>([]);
    const [completedRooms, setCompletedRooms] = useState<RoomListItem[]>([]);

    const loadRooms = async () => {
        const result = await listMyRooms();
        if (!result.error) {
            setActiveRooms(result.active || []);
            setWaitingRooms(result.waiting || []);
            setCompletedRooms(result.completed || []);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadRooms();
        }, [])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadRooms();
    };

    const handleCreateRoom = () => {
        playSfx('tile_select');
        navigation.navigate('CreateRoom');
    };

    const handleJoinRoom = () => {
        playSfx('tile_select');
        navigation.navigate('JoinRoom');
    };

    const handleRoomPress = (roomCode: string) => {
        playSfx('tile_select');
        navigation.navigate('RoomLobby', { roomCode });
    };

    const handleBack = () => {
        playSfx('tile_select');
        navigation.goBack();
    };

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'race': return 'flag-checkered';
            case 'timed': return 'clock-outline';
            case 'moves': return 'shoe-print';
            default: return 'gamepad-variant';
        }
    };

    const renderRoomItem = ({ item }: { item: RoomListItem }) => (
        <TouchableOpacity
            style={styles.roomCard}
            onPress={() => handleRoomPress(item.code)}
            activeOpacity={0.8}
        >
            <View style={styles.roomHeader}>
                <MaterialCommunityIcons
                    name={getModeIcon(item.game_mode)}
                    size={24}
                    color={COLORS.organicWaste}
                />
                <Text style={styles.roomName}>{item.name}</Text>
                {item.is_host && (
                    <View style={styles.hostBadge}>
                        <Text style={styles.hostText}>{t('multiplayer.host')}</Text>
                    </View>
                )}
            </View>
            <View style={styles.roomInfo}>
                <Text style={styles.roomCode}>{item.code}</Text>
                <Text style={styles.playerCount}>
                    {item.player_count}/{item.max_players} {t('multiplayer.players')}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderSection = (title: string, rooms: RoomListItem[], emptyText: string) => (
        rooms.length > 0 && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {rooms.map((room) => (
                    <View key={room.code}>
                        {renderRoomItem({ item: room })}
                    </View>
                ))}
            </View>
        )
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('multiplayer.title')}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleCreateRoom} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="plus-circle" size={32} color="#fff" />
                    <Text style={styles.actionText}>{t('multiplayer.createRoom')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.joinButton]} onPress={handleJoinRoom} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="login" size={32} color="#fff" />
                    <Text style={styles.actionText}>{t('multiplayer.joinRoom')}</Text>
                </TouchableOpacity>
            </View>

            {/* Room Lists */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.organicWaste} />
                </View>
            ) : (
                <FlatList
                    data={[]}
                    renderItem={() => null}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.organicWaste} />
                    }
                    ListHeaderComponent={
                        <>
                            {renderSection(t('multiplayer.activeGames'), activeRooms, t('multiplayer.noActiveGames'))}
                            {renderSection(t('multiplayer.waitingRooms'), waitingRooms, t('multiplayer.noWaitingRooms'))}
                            {renderSection(t('multiplayer.completedGames'), completedRooms, t('multiplayer.noCompletedGames'))}
                            {activeRooms.length === 0 && waitingRooms.length === 0 && completedRooms.length === 0 && (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="account-group" size={64} color={COLORS.cardBorder} />
                                    <Text style={styles.emptyText}>{t('multiplayer.noRooms')}</Text>
                                    <Text style={styles.emptySubtext}>{t('multiplayer.createOrJoin')}</Text>
                                </View>
                            )}
                        </>
                    }
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
    },
    backButton: {
        padding: SPACING.xs,
    },
    title: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    actions: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
    },
    joinButton: {
        backgroundColor: COLORS.waterWaste,
    },
    actionText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.xl,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    roomCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    roomHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    roomName: {
        flex: 1,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    hostBadge: {
        backgroundColor: COLORS.organicWaste,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    hostText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: '#fff',
    },
    roomInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roomCode: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    playerCount: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginTop: SPACING.md,
    },
    emptySubtext: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
});

export default MultiplayerMenu;
