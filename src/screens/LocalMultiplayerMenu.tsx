// Local Multiplayer Menu - Host or Join via Bluetooth/WiFi Direct
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
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../utils/SoundManager';
import CustomAlert from '../components/UI/CustomAlert';
import LocalMultiplayerService, { LocalPlayer } from '../services/LocalMultiplayerService';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalMultiplayerMenu'>;

interface DiscoveredHost {
    endpointId: string;
    name: string;
}

const LocalMultiplayerMenu: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [scanning, setScanning] = useState(false);
    const [discoveredHosts, setDiscoveredHosts] = useState<DiscoveredHost[]>([]);
    const [connecting, setConnecting] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; buttons?: any[] }>({
        visible: false,
        title: '',
        message: ''
    });

    useEffect(() => {
        return () => {
            // Clean up: only stop discovery/advertising on unmount. We cannot call stopAll() here 
            // because successful connection also unmounts this component during navigation,
            // which would accidentally sever the freshly created connection!
            if (scanning) {
                // Actually, due to React closure, scanning might be true even on success.
                // We'll rely on the manual handleBack or explicitly use NativeModule if needed.
                LocalMultiplayerService.stopDiscoveringAndAdvertising().catch(() => {});
            }
        };
    }, [scanning]);

    const handleHost = async () => {
        playSfx('tile_select');
        const hasPerms = await LocalMultiplayerService.requestPermissions();
        if (!hasPerms) {
            setAlertConfig({
                visible: true,
                title: t('localMultiplayer.permissionRequired'),
                message: t('localMultiplayer.permissionMessage')
            });
            return;
        }
        navigation.navigate('LocalLobby', { isHost: true });
    };

    const handleScan = async () => {
        playSfx('tile_select');
        const hasPerms = await LocalMultiplayerService.requestPermissions();
        if (!hasPerms) {
            setAlertConfig({
                visible: true,
                title: t('localMultiplayer.permissionRequired'),
                message: t('localMultiplayer.permissionMessage')
            });
            return;
        }

        setScanning(true);
        setDiscoveredHosts([]);

        LocalMultiplayerService.setCallbacks({
            onPlayerJoined: (player: LocalPlayer) => {
                setDiscoveredHosts((prev) => {
                    if (prev.find((h) => h.endpointId === player.endpointId)) return prev;
                    return [...prev, { endpointId: player.endpointId, name: player.name }];
                });
            },
            onPlayerLeft: (endpointId: string) => {
                setDiscoveredHosts((prev) => prev.filter((h) => h.endpointId !== endpointId));
            },
            onConnectionStatusChanged: (status) => {
                if (status === 'connected') {
                    setConnecting(false);
                    setScanning(false);
                    navigation.navigate('LocalLobby', { isHost: false });
                }
            },
            onError: (error) => {
                setScanning(false);
                setConnecting(false);
                const isDisconnect = error.toLowerCase().includes('connection') || error.toLowerCase().includes('connect');
                setAlertConfig({
                    visible: true,
                    title: isDisconnect ? t('localMultiplayer.disconnected') : t('common.error', 'Oops!'),
                    message: error
                });
            },
        });

        await LocalMultiplayerService.startDiscovering();
    };

    const handleStopScan = () => {
        setScanning(false);
        LocalMultiplayerService.stopAll();
    };

    const handleConnectToHost = async (host: DiscoveredHost) => {
        playSfx('tile_select');
        setConnecting(true);
        await LocalMultiplayerService.connectToHost(host.endpointId);
    };

    const handleBack = () => {
        playSfx('tile_select');
        if (scanning) {
            LocalMultiplayerService.stopAll();
        }
        navigation.goBack();
    };

    const renderHostItem = ({ item }: { item: DiscoveredHost }) => (
        <TouchableOpacity
            style={styles.hostCard}
            onPress={() => handleConnectToHost(item)}
            activeOpacity={0.8}
            disabled={connecting}
        >
            <View style={styles.hostInfo}>
                <MaterialCommunityIcons name="access-point" size={28} color={COLORS.organicWaste} />
                <View style={styles.hostText}>
                    <Text style={styles.hostName}>{item.name}</Text>
                    <Text style={styles.hostSubtext}>{t('localMultiplayer.tapToJoin')}</Text>
                </View>
            </View>
            {connecting ? (
                <ActivityIndicator size="small" color={COLORS.organicWaste} />
            ) : (
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
            )}
        </TouchableOpacity>
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
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('localMultiplayer.title')}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Description */}
            <View style={styles.descSection}>
                <MaterialCommunityIcons name="access-point-network" size={32} color={COLORS.organicWaste} />
                <Text style={styles.descText}>{t('localMultiplayer.description')}</Text>
            </View>

            {/* Requirement Reminder */}
            <View style={styles.hardwareReminder}>
                <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.plastic} />
                <Text style={styles.hardwareReminderText}>
                    {t('localMultiplayer.hardwareReminder')}
                </Text>
            </View>

            {/* Action Buttons */}
            {!scanning && (
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleHost} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="access-point" size={36} color="#fff" />
                        <Text style={styles.actionTitle}>{t('localMultiplayer.hostGame')}</Text>
                        <Text style={styles.actionSubtitle}>{t('localMultiplayer.hostDescription')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.joinButton]} onPress={handleScan} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="magnify" size={36} color="#fff" />
                        <Text style={styles.actionTitle}>{t('localMultiplayer.findGame')}</Text>
                        <Text style={styles.actionSubtitle}>{t('localMultiplayer.findDescription')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Scanning State */}
            {scanning && (
                <View style={styles.scanSection}>
                    <View style={styles.scanHeader}>
                        <ActivityIndicator size="small" color={COLORS.organicWaste} />
                        <Text style={styles.scanText}>{t('localMultiplayer.searching')}</Text>
                        <TouchableOpacity onPress={handleStopScan} style={styles.stopButton}>
                            <Text style={styles.stopText}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>

                    {discoveredHosts.length > 0 ? (
                        <FlatList
                            data={discoveredHosts}
                            renderItem={renderHostItem}
                            keyExtractor={(item) => item.endpointId}
                            contentContainerStyle={styles.hostList}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="radar" size={64} color={COLORS.cardBorder} />
                            <Text style={styles.emptyText}>{t('localMultiplayer.noGamesFound')}</Text>
                            <Text style={styles.emptySubtext}>{t('localMultiplayer.noGamesHint')}</Text>
                        </View>
                    )}
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
    descSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        gap: SPACING.md,
    },
    descText: {
        flex: 1,
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    hardwareReminder: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.plastic + '20', // Give it a subtle info box background
        borderRadius: RADIUS.md,
        gap: SPACING.sm,
    },
    hardwareReminderText: {
        flex: 1,
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    actions: {
        paddingHorizontal: SPACING.md,
        gap: SPACING.md,
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
    },
    joinButton: {
        backgroundColor: COLORS.plastic,
    },
    actionTitle: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: '#fff',
        marginTop: SPACING.xs,
    },
    actionSubtitle: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    scanSection: {
        flex: 1,
        paddingHorizontal: SPACING.md,
    },
    scanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    scanText: {
        flex: 1,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
    },
    stopButton: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    stopText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.accentDanger,
    },
    hostList: {
        paddingTop: SPACING.sm,
    },
    hostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    hostInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
    },
    hostText: {
        flex: 1,
    },
    hostName: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    hostSubtext: {
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
        textAlign: 'center',
    },
});

export default LocalMultiplayerMenu;
