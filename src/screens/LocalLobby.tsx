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
import { THEMES as THEME_LIST } from '../themes';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalLobby'>;

const GAME_MODES: { key: LocalGameMode; icon: string }[] = [
    { key: 'race', icon: 'flag-checkered' },
    { key: 'timed', icon: 'clock-outline' },
    { key: 'moves', icon: 'shoe-print' },
];

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
    const [selectedTheme, setSelectedTheme] = useState<ThemeType>('trash-sorting');
    const [targetScore, setTargetScore] = useState(5000);
    const [durationSeconds, setDurationSeconds] = useState(120);
    const [movesLimit, setMovesLimit] = useState(50);
    const [isAdvertising, setIsAdvertising] = useState(false);
    const [gameConfig, setGameConfig] = useState<LocalGameConfig | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>('');

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
                    if (config.durationSeconds) setDurationSeconds(config.durationSeconds);
                    if (config.movesLimit) setMovesLimit(config.movesLimit);
                },
                onGameStarted: (config) => {
                    playSfx('combo');
                    navigation.replace('LocalMultiplayerGame', { isHost });
                },
                onConnectionStatusChanged: (status) => {
                    setConnectionStatus(status);
                },
                onError: (error) => {
                    Alert.alert(t('common.error'), error);
                },
            });

            if (isHost) {
                const config: LocalGameConfig = {
                    gameMode: selectedMode,
                    theme: selectedTheme,
                    targetScore: selectedMode === 'race' ? targetScore : undefined,
                    movesLimit: selectedMode === 'moves' ? movesLimit : undefined,
                    durationSeconds: selectedMode === 'timed' ? durationSeconds : undefined,
                };
                await LocalMultiplayerService.startAdvertising(config);
                setIsAdvertising(true);
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
                theme: selectedTheme,
                targetScore: selectedMode === 'race' ? targetScore : undefined,
                movesLimit: selectedMode === 'moves' ? movesLimit : undefined,
                durationSeconds: selectedMode === 'timed' ? durationSeconds : undefined,
            };
            LocalMultiplayerService.updateGameConfig(config);
        }
    }, [selectedMode, selectedTheme, targetScore, durationSeconds, movesLimit, isHost, isAdvertising]);

    const handleLeave = () => {
        playSfx('tile_select');
        LocalMultiplayerService.stopAll();
        navigation.goBack();
    };

    const handleStartGame = async () => {
        if (players.length < 1) {
            Alert.alert(t('localMultiplayer.waitForPlayers'), t('localMultiplayer.needOnePlayer'));
            return;
        }
        playSfx('combo');
        await LocalMultiplayerService.startGame();
        navigation.replace('LocalMultiplayerGame', { isHost: true });
    };

    const getThemeColor = (theme: ThemeType): string => {
        const themeData = THEME_LIST.find((t) => t.id === theme);
        return themeData?.color || COLORS.organicWaste;
    };

    const getThemeName = (theme: ThemeType): string => {
        return t(`themes.${theme}`);
    };

    const getModeName = (mode: LocalGameMode): string => {
        return t(`multiplayer.mode_${mode}`);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundPrimary} />

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
                        {t('localMultiplayer.players')} ({players.length + 1})
                    </Text>
                    {/* Host/Self */}
                    <View style={styles.playerCard}>
                        <MaterialCommunityIcons
                            name={isHost ? 'crown' : 'account'}
                            size={24}
                            color={COLORS.organicWaste}
                        />
                        <Text style={styles.playerName}>
                            {LocalMultiplayerService.getPlayerCount() >= 0 ? (isHost ? t('localMultiplayer.you_host') : t('localMultiplayer.you')) : ''}
                        </Text>
                    </View>
                    {/* Other players */}
                    {players.map((player) => (
                        <View key={player.endpointId} style={styles.playerCard}>
                            <MaterialCommunityIcons
                                name="account"
                                size={24}
                                color={player.connected ? COLORS.textPrimary : COLORS.textSecondary}
                            />
                            <Text style={[styles.playerName, !player.connected && styles.disconnected]}>
                                {player.name}
                            </Text>
                            {!player.connected && (
                                <Text style={styles.disconnectedLabel}>{t('localMultiplayer.disconnected')}</Text>
                            )}
                        </View>
                    ))}
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
                        {selectedMode === 'race' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t('multiplayer.targetScore')}</Text>
                                <View style={styles.valueRow}>
                                    <TouchableOpacity
                                        style={styles.adjustButton}
                                        onPress={() => setTargetScore(Math.max(1000, targetScore - 1000))}
                                    >
                                        <MaterialCommunityIcons name="minus" size={24} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.valueText}>{targetScore.toLocaleString()}</Text>
                                    <TouchableOpacity
                                        style={styles.adjustButton}
                                        onPress={() => setTargetScore(Math.min(50000, targetScore + 1000))}
                                    >
                                        <MaterialCommunityIcons name="plus" size={24} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {selectedMode === 'timed' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t('multiplayer.duration')}</Text>
                                <View style={styles.valueRow}>
                                    <TouchableOpacity
                                        style={styles.adjustButton}
                                        onPress={() => setDurationSeconds(Math.max(30, durationSeconds - 30))}
                                    >
                                        <MaterialCommunityIcons name="minus" size={24} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.valueText}>{Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, '0')}</Text>
                                    <TouchableOpacity
                                        style={styles.adjustButton}
                                        onPress={() => setDurationSeconds(Math.min(600, durationSeconds + 30))}
                                    >
                                        <MaterialCommunityIcons name="plus" size={24} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {selectedMode === 'moves' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t('multiplayer.movesLimit')}</Text>
                                <View style={styles.valueRow}>
                                    <TouchableOpacity
                                        style={styles.adjustButton}
                                        onPress={() => setMovesLimit(Math.max(10, movesLimit - 10))}
                                    >
                                        <MaterialCommunityIcons name="minus" size={24} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.valueText}>{movesLimit}</Text>
                                    <TouchableOpacity
                                        style={styles.adjustButton}
                                        onPress={() => setMovesLimit(Math.min(200, movesLimit + 10))}
                                    >
                                        <MaterialCommunityIcons name="plus" size={24} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Theme Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('multiplayer.theme')}</Text>
                            <View style={styles.themeRow}>
                                {THEMES.map((theme) => (
                                    <TouchableOpacity
                                        key={theme}
                                        style={[
                                            styles.themeButton,
                                            { borderColor: getThemeColor(theme) },
                                            selectedTheme === theme && { backgroundColor: getThemeColor(theme) },
                                        ]}
                                        onPress={() => { playSfx('tile_select'); setSelectedTheme(theme); }}
                                    >
                                        <Text style={[
                                            styles.themeText,
                                            selectedTheme === theme && styles.themeTextActive,
                                        ]}>
                                            {getThemeName(theme)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
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
                                <Text style={styles.configValue}>{getThemeName(gameConfig.theme)}</Text>
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
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.lg,
    },
    adjustButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueText: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        minWidth: 100,
        textAlign: 'center',
    },
    themeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    themeButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        borderWidth: 2,
    },
    themeText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    themeTextActive: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
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
