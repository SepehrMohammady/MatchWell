// Leaderboard Screen - Global and per-theme rankings
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import { useGameStore } from '../context/GameStore';
import { BackIcon, TrophyIcon, StarFilledIcon, MedalIcon, RankIcon } from '../components/UI/Icons';
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
import {
    ENDLESS_ACHIEVEMENTS,
    THEME_ACHIEVEMENTS,
    STAR_ACHIEVEMENTS,
    checkThemeAchievement,
    checkStarAchievement,
    checkEndlessAchievement,
    Achievement
} from '../config/achievements';
import { LEVELS, getLevelsByTheme, getLevelById } from '../themes';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

const TABS = [
    { key: 'global', label: 'Global', icon: 'earth' },
    { key: 'trash', label: 'Trash', icon: 'recycle-variant' },
    { key: 'pollution', label: 'Air', icon: 'air-filter' },
    { key: 'water', label: 'Water', icon: 'water' },
    { key: 'energy', label: 'Energy', icon: 'flash' },
    { key: 'forest', label: 'Forest', icon: 'forest' },
];

const Leaderboard: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // Game store data
    const completedLevels = useGameStore(state => state.completedLevels);
    const highScores = useGameStore(state => state.highScores) as Record<number, number>;
    const endlessMoves = useGameStore(state => state.endlessMoves) as Record<number, number>;
    const levelMovesRemaining = useGameStore(state => state.levelMovesRemaining) as Record<number, number>;

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
    // Endless scores use negative IDs: -1 = trash, -2 = pollution, -3 = water, -4 = energy, -5 = forest
    const getEndlessScore = useCallback((themeIndex: number) => {
        return highScores[-(themeIndex + 1)] || 0;
    }, [highScores]);

    const getEndlessMoveCount = useCallback((themeIndex: number) => {
        return endlessMoves[-(themeIndex + 1)] || 0;
    }, [endlessMoves]);

    // Get all endless scores
    const endlessScoresData = {
        trash: getEndlessScore(0),
        pollution: getEndlessScore(1),
        water: getEndlessScore(2),
        energy: getEndlessScore(3),
        forest: getEndlessScore(4),
    };

    // Calculate stars from levelMovesRemaining
    // Stars: 3 if movesRemaining >= 3, 2 if >= 1, 1 otherwise for completed levels
    const getTotalStars = useCallback(() => {
        let total = 0;
        completedLevels.forEach(levelId => {
            const movesRemaining = levelMovesRemaining[levelId] || 0;
            if (movesRemaining >= 3) total += 3;
            else if (movesRemaining >= 1) total += 2;
            else total += 1;
        });
        return total;
    }, [completedLevels, levelMovesRemaining]);

    // Calculate medals from ALL achievements (theme, stars, endless)
    // This matches the logic used in Achievements screen
    const allLevelIds = useMemo(() => LEVELS.map(l => l.id), []);

    const getMedalCounts = useCallback(() => {
        const medals = { bronze: 0, silver: 0, gold: 0, diamond: 0, 'earth-saver': 0 };

        // Count ALL unlocked achievements
        const allAchievements = [...THEME_ACHIEVEMENTS, ...STAR_ACHIEVEMENTS, ...ENDLESS_ACHIEVEMENTS];

        allAchievements.forEach(achievement => {
            let isUnlocked = false;

            switch (achievement.category) {
                case 'theme':
                    isUnlocked = checkThemeAchievement(
                        achievement.theme!,
                        completedLevels,
                        getLevelsByTheme
                    );
                    break;
                case 'stars':
                    isUnlocked = checkStarAchievement(
                        achievement.requirement,
                        levelMovesRemaining,
                        getLevelById,
                        allLevelIds
                    );
                    break;
                case 'endless':
                    isUnlocked = checkEndlessAchievement(
                        achievement.theme!,
                        achievement.requirement,
                        highScores
                    );
                    break;
            }

            // Count the achievement based on its tier
            // Achievements without a tier (theme/stars) count as bronze
            if (isUnlocked) {
                const tier = achievement.tier || 'bronze';
                if (tier in medals) {
                    medals[tier as keyof typeof medals]++;
                }
            }
        });

        return medals;
    }, [completedLevels, levelMovesRemaining, highScores, allLevelIds]);

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

    const handlePublish = async (skipRegCheck = false) => {
        if (!skipRegCheck && !isRegistered) {
            setShowUsernameModal(true);
            return;
        }

        setPublishing(true);

        // Calculate total stars from actual game progress
        const totalStars = getTotalStars();
        const medals = getMedalCounts();

        // Get moves data for score per move calculation
        const endlessMovesData = {
            trash: getEndlessMoveCount(0),
            pollution: getEndlessMoveCount(1),
            water: getEndlessMoveCount(2),
            energy: getEndlessMoveCount(3),
            forest: getEndlessMoveCount(4),
        };

        // Debug: log what we're publishing
        console.log('📊 Publishing data:', {
            total_stars: totalStars,
            completed_levels: completedLevels.length,
            medals,
            endless_scores: endlessScoresData,
            endless_moves: endlessMovesData,
            highScores_raw: highScores,
        });

        const result = await publishScores({
            total_stars: totalStars,
            completed_levels: completedLevels.length,
            medals,
            endless_scores: endlessScoresData,
            endless_moves: endlessMovesData,
        });

        setPublishing(false);

        if (result.success) {
            if (result.player) {
                setPlayerInfo(result.player);
            }
            loadRankings();
            Alert.alert('Success!', 'Your score has been published to the leaderboard!');
        } else {
            Alert.alert('Error', result.error || 'Failed to publish score');
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
            Alert.alert('Welcome!', `You're now registered as "${username}". Publishing your score...`);
            handlePublish(true);
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
                <View style={styles.rankInfo}>
                    <Text style={[styles.rankUsername, isPlayer && styles.playerUsernameHighlight]}>
                        {item.username}
                        {isPlayer && ' (You)'}
                    </Text>
                    {activeTab === 'global' ? (
                        <View style={styles.rankStatsRow}>
                            <Text style={styles.rankScoreMain}>{item.total_endless?.toLocaleString() || 0}</Text>
                            <Text style={styles.rankStatLabel}> pts</Text>
                            {(item.score_per_move || 0) > 0 && (
                                <>
                                    <Text style={styles.rankStatDivider}>•</Text>
                                    <Text style={styles.rankStatValue}>{item.score_per_move}</Text>
                                    <Text style={styles.rankStatLabel}>/move</Text>
                                </>
                            )}
                        </View>
                    ) : (
                        <View style={styles.rankStatsRow}>
                            <Text style={styles.rankScoreMain}>{item.score?.toLocaleString() || 0}</Text>
                            <Text style={styles.rankStatLabel}> pts</Text>
                            {(item.score_per_move || 0) > 0 && (
                                <>
                                    <Text style={styles.rankStatDivider}>•</Text>
                                    <Text style={styles.rankStatValue}>{item.score_per_move}</Text>
                                    <Text style={styles.rankStatLabel}>/move</Text>
                                </>
                            )}
                        </View>
                    )}
                </View>
                {activeTab === 'global' && (
                    <View style={styles.rankExtraStats}>
                        <View style={styles.rankExtraStat}>
                            <StarFilledIcon size={12} color={COLORS.starFilled} />
                            <Text style={styles.rankExtraValue}>{item.total_stars}</Text>
                        </View>
                        <View style={styles.rankExtraStat}>
                            <MedalIcon size={12} color="#CD7F32" />
                            <Text style={styles.rankExtraValue}>{item.total_medals}</Text>
                        </View>
                    </View>
                )}
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
                        <MaterialCommunityIcons
                            name={tab.icon}
                            size={20}
                            color={activeTab === tab.key ? COLORS.textLight : COLORS.textMuted}
                        />
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
                    onPress={() => handlePublish()}
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
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statItemText: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textLight,
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
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundPrimary,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        marginBottom: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    tableHeaderRank: {
        width: 32,
        textAlign: 'center',
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textMuted,
        marginRight: SPACING.sm,
    },
    tableHeaderPlayer: {
        flex: 1,
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textMuted,
    },
    tableHeaderScore: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textMuted,
    },
    tableHeaderExtra: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 8,
    },
    tableHeaderSmall: {
        fontSize: TYPOGRAPHY.caption,
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
    rankInfo: {
        flex: 1,
    },
    rankStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    rankScoreMain: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textLight,
    },
    rankStatLabel: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
    },
    rankStatDivider: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textMuted,
        marginHorizontal: 6,
    },
    rankStatValue: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.accentHighlight,
    },
    rankExtraStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rankExtraStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    rankExtraValue: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textMuted,
    },
    playerUsernameHighlight: {
        color: COLORS.organicWaste,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
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
