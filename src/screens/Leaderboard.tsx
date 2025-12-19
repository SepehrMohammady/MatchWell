// Leaderboard Screen - Global and per-theme rankings
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Modal,
    TextInput,
    ScrollView,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import { useGameStore } from '../context/GameStore';
import { BackIcon, TrophyIcon, StarFilledIcon } from '../components/UI/Icons';
import {
    getGlobalLeaderboard,
    getThemeLeaderboard,
    getPlayerInfo,
    registerPlayer,
    publishScores,
    checkUsername,
    getStoredUsername,
    LeaderboardEntry,
    PlayerData,
} from '../services/LeaderboardService';
import { ENDLESS_ACHIEVEMENTS } from '../config/achievements';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

const TABS = [
    { key: 'global', label: 'Global' },
    { key: 'trash', label: 'Trash' },
    { key: 'pollution', label: 'Air' },
    { key: 'water', label: 'Water' },
    { key: 'energy', label: 'Energy' },
    { key: 'forest', label: 'Forest' },
];

const Leaderboard: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // Game store data
    const completedLevels = useGameStore(state => state.completedLevels);
    const highScores = useGameStore(state => state.highScores) as Record<string, number>;

    // State
    const [activeTab, setActiveTab] = useState('global');
    const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [playerInfo, setPlayerInfo] = useState<PlayerData | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [username, setUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [publishing, setPublishing] = useState(false);
    const [totalPlayers, setTotalPlayers] = useState(0);

    // Calculate medals from achievements
    const getMedalCounts = useCallback(() => {
        const medals = { bronze: 0, silver: 0, gold: 0, platinum: 0, earth: 0 };
        const themes = ['trash-sorting', 'pollution', 'water-conservation', 'energy-efficiency', 'deforestation'];

        themes.forEach(theme => {
            const themeScore = highScores[theme] || 0;
            const themeAchievements = ENDLESS_ACHIEVEMENTS.filter(a => a.theme === theme);

            themeAchievements.forEach(achievement => {
                if (themeScore >= achievement.requirement) {
                    const tier = achievement.id.split('_').pop();
                    if (tier && medals.hasOwnProperty(tier)) {
                        medals[tier as keyof typeof medals]++;
                    }
                }
            });
        });

        return medals;
    }, [highScores]);

    // Load player info on mount
    useEffect(() => {
        loadPlayerInfo();
    }, []);

    // Load rankings when tab changes
    useEffect(() => {
        loadRankings();
    }, [activeTab]);

    const loadPlayerInfo = async () => {
        const info = await getPlayerInfo();
        setIsRegistered(info.registered);
        if (info.player) {
            setPlayerInfo(info.player);
        }
        if (info.totalPlayers) {
            setTotalPlayers(info.totalPlayers);
        }

        // Also get stored username
        const storedName = await getStoredUsername();
        if (storedName) {
            setUsername(storedName);
        }
    };

    const loadRankings = async () => {
        setLoading(true);

        let result;
        if (activeTab === 'global') {
            result = await getGlobalLeaderboard();
        } else {
            const themeMap: Record<string, string> = {
                trash: 'trash-sorting',
                pollution: 'pollution',
                water: 'water-conservation',
                energy: 'energy-efficiency',
                forest: 'deforestation',
            };
            result = await getThemeLeaderboard(themeMap[activeTab] || activeTab);
        }

        setRankings(result.rankings);
        if (result.player) {
            setPlayerInfo(result.player as PlayerData);
        }
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRankings();
        setRefreshing(false);
    };

    const handlePublish = async () => {
        if (!isRegistered) {
            setShowUsernameModal(true);
            return;
        }

        setPublishing(true);

        // Calculate total stars - estimate 2 stars average per completed level
        const totalStars = completedLevels.length * 2;
        const medals = getMedalCounts();

        const result = await publishScores({
            total_stars: totalStars,
            completed_levels: completedLevels.length,
            medals,
            endless_scores: {
                trash: highScores['trash-sorting'] || 0,
                pollution: highScores['pollution'] || 0,
                water: highScores['water-conservation'] || 0,
                energy: highScores['energy-efficiency'] || 0,
                forest: highScores['deforestation'] || 0,
            },
        });

        setPublishing(false);

        if (result.success) {
            if (result.player) {
                setPlayerInfo(result.player);
            }
            loadRankings();
        }
    };

    const handleRegister = async () => {
        if (!username.trim()) {
            setUsernameError('Please enter a username');
            return;
        }

        if (username.length < 3) {
            setUsernameError('Username must be at least 3 characters');
            return;
        }

        setUsernameError('');

        // Check availability
        const availability = await checkUsername(username);
        if (!availability.available) {
            setUsernameError(availability.error || 'Username is not available');
            return;
        }

        // Register
        const result = await registerPlayer(username);
        if (result.success) {
            setIsRegistered(true);
            setShowUsernameModal(false);
            handlePublish();
        } else {
            setUsernameError(result.error || 'Registration failed');
        }
    };

    const renderRankItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
        const isPlayer = playerInfo && item.username === playerInfo.username;
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        const rankColor = item.rank <= 3 ? rankColors[item.rank - 1] : COLORS.textMuted;

        return (
            <View style={[styles.rankItem, isPlayer && styles.rankItemHighlight]}>
                <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
                    <Text style={styles.rankNumber}>{item.rank}</Text>
                </View>
                <Text style={[styles.rankUsername, isPlayer && styles.playerUsername]}>
                    {item.username}
                    {isPlayer && ' (You)'}
                </Text>
                <View style={styles.rankScore}>
                    {activeTab === 'global' ? (
                        <>
                            <StarFilledIcon size={14} color={COLORS.starFilled} />
                            <Text style={styles.rankScoreText}>{item.total_stars}</Text>
                        </>
                    ) : (
                        <Text style={styles.rankScoreText}>
                            {item.score?.toLocaleString()}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <BackIcon size={24} color={COLORS.textLight} />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <TrophyIcon size={24} color={COLORS.accentHighlight} />
                    <Text style={styles.headerText}>Leaderboard</Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            {/* Player Card */}
            {isRegistered && playerInfo && (
                <View style={styles.playerCard}>
                    <Text style={styles.playerUsername}>{playerInfo.username}</Text>
                    <View style={styles.playerStats}>
                        <View style={styles.playerStat}>
                            <Text style={styles.statValue}>#{playerInfo.global_rank}</Text>
                            <Text style={styles.statLabel}>Rank</Text>
                        </View>
                        <View style={styles.playerStat}>
                            <Text style={styles.statValue}>{playerInfo.total_stars}</Text>
                            <Text style={styles.statLabel}>Stars</Text>
                        </View>
                        <View style={styles.playerStat}>
                            <Text style={styles.statValue}>{playerInfo.total_medals}</Text>
                            <Text style={styles.statLabel}>Medals</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsContainer}
                contentContainerStyle={styles.tabsContent}
            >
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Rankings List */}
            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={COLORS.organicWaste} />
                </View>
            ) : (
                <FlatList
                    data={rankings}
                    renderItem={renderRankItem}
                    keyExtractor={(item, index) => `${item.username}-${index}`}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.organicWaste} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No rankings yet</Text>
                            <Text style={styles.emptySubtext}>Be the first to publish your score!</Text>
                        </View>
                    }
                />
            )}

            {/* Publish Button */}
            <View style={[styles.publishContainer, { paddingBottom: insets.bottom + SPACING.md }]}>
                <TouchableOpacity
                    style={styles.publishButton}
                    onPress={handlePublish}
                    disabled={publishing}
                >
                    {publishing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.publishButtonText}>
                            {isRegistered ? 'Publish My Score' : 'Join Leaderboard'}
                        </Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.totalPlayers}>{totalPlayers} players worldwide</Text>
            </View>

            {/* Username Modal */}
            <Modal visible={showUsernameModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Your Username</Text>
                        <Text style={styles.modalSubtitle}>
                            This will be shown on the leaderboard
                        </Text>

                        <TextInput
                            style={styles.usernameInput}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter username"
                            placeholderTextColor={COLORS.textMuted}
                            maxLength={20}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        {usernameError ? (
                            <Text style={styles.errorText}>{usernameError}</Text>
                        ) : null}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButtonSecondary}
                                onPress={() => setShowUsernameModal(false)}
                            >
                                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonPrimary}
                                onPress={handleRegister}
                            >
                                <Text style={styles.modalButtonPrimaryText}>Join</Text>
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
        backgroundColor: COLORS.backgroundDark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    backButton: {
        padding: SPACING.sm,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    headerText: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textLight,
    },
    headerRight: {
        width: 40,
    },
    playerCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
    },
    playerUsername: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.organicWaste,
        marginBottom: SPACING.sm,
    },
    playerStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    playerStat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textLight,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
    },
    tabsContainer: {
        maxHeight: 50,
        marginBottom: SPACING.sm,
    },
    tabsContent: {
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    tab: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    tabActive: {
        backgroundColor: COLORS.organicWaste,
    },
    tabText: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.textLight,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: SPACING.md,
        paddingBottom: 100,
    },
    rankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    rankItemHighlight: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderWidth: 1,
        borderColor: COLORS.organicWaste,
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    rankNumber: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: '#000',
    },
    rankUsername: {
        flex: 1,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textLight,
    },
    rankScore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    rankScoreText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textLight,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: SPACING.xxl,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textLight,
    },
    emptySubtext: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
    },
    publishContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.backgroundDark,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    publishButton: {
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
        width: '100%',
        alignItems: 'center',
    },
    publishButtonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: '#fff',
    },
    totalPlayers: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
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
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    modalSubtitle: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    usernameInput: {
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    errorText: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.accentDanger,
        marginBottom: SPACING.sm,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    modalButtonSecondary: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
    },
    modalButtonSecondaryText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    modalButtonPrimary: {
        flex: 1,
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    modalButtonPrimaryText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: '#fff',
    },
});

export default Leaderboard;
