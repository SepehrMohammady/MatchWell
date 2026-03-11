// Local Lobby Screen - Host configures game, clients wait
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Alert,
    ActivityIndicator,
    BackHandler,
    TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, ThemeType } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../utils/SoundManager';
import LocalMultiplayerService, { LocalPlayer, LocalGameConfig, LocalGameMode } from '../services/LocalMultiplayerService';
import { THEMES as THEME_LIST, LEVELS } from '../themes';
import { useGameStore } from '../context/GameStore';
import CustomAlert from '../components/UI/CustomAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalLobby'>;

const GAME_MODES: { key: LocalGameMode; icon: string; labelKey: string }[] = [
    { key: 'race', icon: 'flag-checkered', labelKey: 'multiplayer.raceMode' },
    { key: 'timed', icon: 'clock-outline', labelKey: 'multiplayer.timedMode' },
    { key: 'moves', icon: 'shoe-print', labelKey: 'multiplayer.movesMode' },
];

const TARGET_SCORE_OPTIONS = [10000, 50000, 100000, 250000, 500000];
const MOVES_OPTIONS = [50, 100, 150, 200];

const THEMES: ThemeType[] = [
    'trash-sorting',
    'pollution',
    'water-conservation',
    'energy-efficiency',
    'deforestation',
];

const LocalLobby: React.FC<Props> = ({ navigation, route }) => {
    const { isHost } = route.params;
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [players, setPlayers] = useState<LocalPlayer[]>([]);
    const [selectedMode, setSelectedMode] = useState<LocalGameMode>('race');
    const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>('trash-sorting');
    const [targetScore, setTargetScore] = useState(50000);
    const [movesLimit, setMovesLimit] = useState(100);
    const [durationDays, setDurationDays] = useState('0');
    const [durationHours, setDurationHours] = useState('0');
    const [durationMinutes, setDurationMinutes] = useState('0');
    
    const [isAdvertising, setIsAdvertising] = useState(false);
    const [gameConfig, setGameConfig] = useState<LocalGameConfig | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>(() => LocalMultiplayerService.getConnectionStatus());
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; buttons?: any[] }>({
        visible: false,
        title: '',
        message: ''
    });

    // Get completed levels to filter themes
    const completedLevels = useGameStore((state) => state.completedLevels);

    // Get unlocked themes (at least one level completed in that theme)
    const unlockedThemes = THEME_LIST.filter(theme => {
        const themeLevels = LEVELS.filter(l => l.theme === theme.id);
        return themeLevels.some(level => completedLevels.includes(level.id));
    });

    // Calculate duration in seconds from inputs
    const getDurationSeconds = () => {
        const days = parseInt(durationDays) || 0;
        const hours = parseInt(durationHours) || 0;
        const minutes = parseInt(durationMinutes) || 0;
        return (days * 86400) + (hours * 3600) + (minutes * 60);
    };

    useEffect(() => {
        const init = async () => {
            LocalMultiplayerService.setCallbacks({
                onPlayerJoined: (player) => {
                    setPlayers([...LocalMultiplayerService.getPlayers()]);
                    playSfx('tile_select');
                },
                onPlayerLeft: (endpointId) => {
                    setPlayers([...LocalMultiplayerService.getPlayers()]);
                },
                onGameConfigReceived: (config) => {
                    setGameConfig(config);
                    setSelectedMode(config.gameMode);
                    setSelectedTheme(config.theme);
                    if (config.targetScore) setTargetScore(config.targetScore);
                    if (config.movesLimit) setMovesLimit(config.movesLimit);
                    if (config.durationSeconds) {
                        const days = Math.floor(config.durationSeconds / 86400);
                        const hours = Math.floor((config.durationSeconds % 86400) / 3600);
                        const minutes = Math.floor((config.durationSeconds % 3600) / 60);
                        setDurationDays(days.toString());
                        setDurationHours(hours.toString());
                        setDurationMinutes(minutes.toString());
                    }
                },
                onGameStarted: (config) => {
                    playSfx('combo');
                    navigation.replace('LocalMultiplayerGame', { isHost });
                },
                onConnectionStatusChanged: (status) => {
                    setConnectionStatus(status);
                },
                onError: (error) => {
                    setAlertConfig({
                        visible: true,
                        title: t('common.error'),
                        message: error
                    });
                },
            });

            try {
                if (isHost) {
                    const config: LocalGameConfig = {
                        gameMode: selectedMode,
                        theme: selectedTheme || 'trash-sorting',
                        targetScore: selectedMode === 'race' ? targetScore : undefined,
                        movesLimit: selectedMode === 'moves' ? movesLimit : undefined,
                        durationSeconds: selectedMode === 'timed' ? getDurationSeconds() : undefined,
                    };
                    await LocalMultiplayerService.startAdvertising(config);
                    setIsAdvertising(true);
                }
            } catch (err) {
                setAlertConfig({
                    visible: true,
                    title: 'Fatal Init Error',
                    message: String(err)
                });
            }
        };

        init();

        return () => {
            // Don't stop on unmount if navigating to game
        };
    }, []);

    // Handle back button
    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                handleLeave();
                return true;
            });
            return () => backHandler.remove();
        }, [])
    );

    // Host: update config when settings change
    useEffect(() => {
        if (isHost && isAdvertising) {
            const config: LocalGameConfig = {
                gameMode: selectedMode,
                theme: selectedTheme || 'trash-sorting',
                targetScore: selectedMode === 'race' ? targetScore : undefined,
                movesLimit: selectedMode === 'moves' ? movesLimit : undefined,
                durationSeconds: selectedMode === 'timed' ? getDurationSeconds() : undefined,
            };
            LocalMultiplayerService.updateGameConfig(config);
        }
    }, [selectedMode, selectedTheme, targetScore, durationDays, durationHours, durationMinutes, movesLimit, isHost, isAdvertising]);

    const handleLeave = () => {
        playSfx('tile_select');
        LocalMultiplayerService.stopAll();
        navigation.goBack();
    };

    const handleStartGame = async () => {
        if (players.length < 1) {
            setAlertConfig({
                visible: true,
                title: t('localMultiplayer.waitForPlayers'),
                message: t('localMultiplayer.needOnePlayer')
            });
            return;
        }
        playSfx('combo');
        await LocalMultiplayerService.startGame();
        navigation.replace('LocalMultiplayerGame', { isHost: true });
    };

    const getModeName = (mode: LocalGameMode): string => {
        const modeConfig = GAME_MODES.find(m => m.key === mode);
        return modeConfig ? t(modeConfig.labelKey) : mode;
    };

    const renderOptionRow = (
        title: string,
        options: { label: string; value: number }[],
        selected: number,
        onSelect: (value: number) => void
    ) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.optionRow}>
                {options.map(({ label, value }) => (
                    <TouchableOpacity
                        key={value}
                        style={[styles.optionButton, selected === value && styles.optionButtonActive]}
                        onPress={() => { onSelect(value); playSfx('tile_select'); }}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.optionText, selected === value && styles.optionTextActive]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundPrimary} />
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onDismiss={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>
                    {isHost ? t('localMultiplayer.lobby') : t('localMultiplayer.waitingRoom')}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Connection Status */}
                <View style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: isAdvertising || connectionStatus === 'connected' ? '#4CAF50' : COLORS.textSecondary }]} />
                        <Text style={styles.statusText}>
                            {isHost
                                ? (isAdvertising ? t('localMultiplayer.waitingForPlayers') : t('localMultiplayer.settingUp'))
                                : (connectionStatus === 'connected' ? t('localMultiplayer.connectedToHost') : t('localMultiplayer.connecting'))
                            }
                        </Text>
                    </View>
                    {isHost && isAdvertising && (
                        <View style={styles.pulseContainer}>
                            <ActivityIndicator size="small" color={COLORS.organicWaste} />
                        </View>
                    )}
                </View>

                {/* Players List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('localMultiplayer.players')} ({isHost ? players.length + 1 : Math.max(1, players.length)})
                    </Text>
                    
                    {/* Host's own view of themselves */}
                    {isHost && (
                        <View style={styles.playerCard}>
                            <MaterialCommunityIcons name="crown" size={24} color={COLORS.organicWaste} />
                            <Text style={styles.playerName}>{t('localMultiplayer.you_host')}</Text>
                        </View>
                    )}

                    {/* All other players (or everyone, for client) */}
                    {players.map((player) => {
                        const isMe = !isHost && player.name === LocalMultiplayerService.getPlayerNameSync();
                        const isThisHost = player.endpointId === 'host';
                        
                        return (
                            <View key={player.endpointId} style={styles.playerCard}>
                                <MaterialCommunityIcons
                                    name={isThisHost ? 'crown' : 'account'}
                                    size={24}
                                    color={player.connected ? COLORS.textPrimary : COLORS.textSecondary}
                                />
                                <Text style={[styles.playerName, !player.connected && styles.disconnected]}>
                                    {isMe ? `${player.name} (${t('localMultiplayer.you')})` : player.name}
                                </Text>
                                {!player.connected && (
                                    <Text style={styles.disconnectedLabel}>{t('localMultiplayer.disconnected')}</Text>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Game Config (Host Only) */}
                {isHost && (
                    <>
                        {/* Game Mode */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('multiplayer.gameMode')}</Text>
                            <View style={styles.modeRow}>
                                {GAME_MODES.map((mode) => (
                                    <TouchableOpacity
                                        key={mode.key}
                                        style={[
                                            styles.modeButton,
                                            selectedMode === mode.key && styles.modeButtonActive,
                                        ]}
                                        onPress={() => { playSfx('tile_select'); setSelectedMode(mode.key); }}
                                    >
                                        <MaterialCommunityIcons
                                            name={mode.icon}
                                            size={24}
                                            color={selectedMode === mode.key ? '#fff' : COLORS.textSecondary}
                                        />
                                        <Text style={[
                                            styles.modeText,
                                            selectedMode === mode.key && styles.modeTextActive,
                                        ]}>
                                            {getModeName(mode.key)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Mode-specific settings */}
                        {selectedMode === 'race' && renderOptionRow(
                            t('multiplayer.targetScore'),
                            TARGET_SCORE_OPTIONS.map(v => ({ label: `${v / 1000}K`, value: v })),
                            targetScore,
                            setTargetScore
                        )}

                        {selectedMode === 'timed' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t('multiplayer.duration')}</Text>
                                <View style={styles.durationRow}>
                                    <View style={styles.durationInput}>
                                        <TextInput
                                            style={styles.durationField}
                                            value={durationDays}
                                            onChangeText={setDurationDays}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            placeholder="0"
                                            placeholderTextColor={COLORS.textSecondary}
                                        />
                                        <Text style={styles.durationLabel}>{t('multiplayer.days')}</Text>
                                    </View>
                                    <View style={styles.durationInput}>
                                        <TextInput
                                            style={styles.durationField}
                                            value={durationHours}
                                            onChangeText={setDurationHours}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            placeholder="0"
                                            placeholderTextColor={COLORS.textSecondary}
                                        />
                                        <Text style={styles.durationLabel}>{t('multiplayer.hours')}</Text>
                                    </View>
                                    <View style={styles.durationInput}>
                                        <TextInput
                                            style={styles.durationField}
                                            value={durationMinutes}
                                            onChangeText={setDurationMinutes}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            placeholder="0"
                                            placeholderTextColor={COLORS.textSecondary}
                                        />
                                        <Text style={styles.durationLabel}>{t('multiplayer.minutes')}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {selectedMode === 'moves' && renderOptionRow(
                            t('multiplayer.movesLimit'),
                            MOVES_OPTIONS.map(v => ({ label: `${v}`, value: v })),
                            movesLimit,
                            setMovesLimit
                        )}

                        {/* Theme Selection */}
                        <View style={styles.section}>
                            <View style={styles.themeHeader}>
                                <Text style={styles.sectionTitle}>{t('multiplayer.theme')}</Text>
                            </View>
                            <View style={styles.themeGrid}>
                                {unlockedThemes.length > 0 ? unlockedThemes.map((theme) => (
                                    <TouchableOpacity
                                        key={theme.id}
                                        style={[
                                            styles.themeCard,
                                            selectedTheme === theme.id && styles.themeCardActive,
                                            { borderColor: theme.color }
                                        ]}
                                        onPress={() => { setSelectedTheme(theme.id); playSfx('tile_select'); }}
                                        activeOpacity={0.8}
                                    >
                                        <MaterialCommunityIcons name={theme.icon} size={32} color={theme.color} />
                                    </TouchableOpacity>
                                )) : (
                                    <Text style={styles.noThemesText}>{t('multiplayer.noUnlockedThemes')}</Text>
                                )}
                            </View>
                        </View>
                    </>
                )}

                {/* Client: Show received config */}
                {!isHost && gameConfig && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('localMultiplayer.gameSettings')}</Text>
                        <View style={styles.configCard}>
                            <View style={styles.configRow}>
                                <Text style={styles.configLabel}>{t('multiplayer.gameMode')}</Text>
                                <Text style={styles.configValue}>{getModeName(gameConfig.gameMode)}</Text>
                            </View>
                            <View style={styles.configRow}>
                                <Text style={styles.configLabel}>{t('multiplayer.theme')}</Text>
                                <Text style={styles.configValue}>
                                    {gameConfig.theme
                                        ? t(`themes.${THEME_LIST.find(t => t.id === gameConfig.theme)?.id?.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) || gameConfig.theme.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`)
                                        : ''}
                                </Text>
                            </View>
                            {gameConfig.targetScore && (
                                <View style={styles.configRow}>
                                    <Text style={styles.configLabel}>{t('multiplayer.targetScore')}</Text>
                                    <Text style={styles.configValue}>{gameConfig.targetScore.toLocaleString()}</Text>
                                </View>
                            )}
                            {gameConfig.durationSeconds && (
                                <View style={styles.configRow}>
                                    <Text style={styles.configLabel}>{t('multiplayer.duration')}</Text>
                                    <Text style={styles.configValue}>{Math.floor(gameConfig.durationSeconds / 60)}:{String(gameConfig.durationSeconds % 60).padStart(2, '0')}</Text>
                                </View>
                            )}
                            {gameConfig.movesLimit && (
                                <View style={styles.configRow}>
                                    <Text style={styles.configLabel}>{t('multiplayer.movesLimit')}</Text>
                                    <Text style={styles.configValue}>{gameConfig.movesLimit}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Start Button (Host Only) */}
            {isHost && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
                    <TouchableOpacity
                        style={[styles.startButton, players.length < 1 && styles.startButtonDisabled]}
                        onPress={handleStartGame}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
                        <Text style={styles.startText}>{t('localMultiplayer.startGame')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Waiting message (Client) */}
            {!isHost && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
                    <View style={styles.waitingFooter}>
                        <ActivityIndicator size="small" color={COLORS.organicWaste} />
                        <Text style={styles.waitingText}>{t('localMultiplayer.waitingForHost')}</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundPrimary,
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
    content: {
        paddingHorizontal: SPACING.md,
        paddingBottom: 100,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
    },
    pulseContainer: {},
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
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    playerName: {
        flex: 1,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
    },
    disconnected: {
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    disconnectedLabel: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: '#E53935',
    },
    modeRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    modeButton: {
        flex: 1,
        alignItems: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        backgroundColor: COLORS.cardBackground,
    },
    modeButtonActive: {
        backgroundColor: COLORS.organicWaste,
        borderColor: COLORS.organicWaste,
    },
    modeText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    modeTextActive: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    optionButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    optionButtonActive: {
        backgroundColor: COLORS.organicWaste,
        borderColor: COLORS.organicWaste,
    },
    optionText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    optionTextActive: {
        color: '#fff',
    },
    themeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    themeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    themeCard: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
    },
    themeCardActive: {
        backgroundColor: COLORS.organicWaste + '30',
    },
    noThemesText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    durationRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    durationInput: {
        flex: 1,
        alignItems: 'center',
    },
    durationField: {
        width: '100%',
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        paddingVertical: SPACING.sm,
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    durationLabel: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    configCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    configRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
    },
    configLabel: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    configValue: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    footer: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
    },
    startButtonDisabled: {
        opacity: 0.5,
    },
    startText: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: '#fff',
    },
    waitingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.lg,
    },
    waitingText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
});

export default LocalLobby;
