// Cloud Backup & Device Transfer
//
// The account is the player's leaderboard name plus a password. A save is only
// ever live on one device: restoring here takes it away from the other device.

import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    ActivityIndicator,
    BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RNRestart from 'react-native-restart';

import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import { playSfx } from '../utils/SoundManager';
import CustomAlert from '../components/UI/CustomAlert';
import {
    LocalBackupState,
    getLocalState,
    getRegisteredUsername,
    enableBackup,
    backupNow,
    restoreBackup,
    changePassword,
    setAutoBackup,
    BackupErrorCode,
} from '../services/BackupService';

type Props = NativeStackScreenProps<RootStackParamList, 'Backup'>;

type AlertConfig = { visible: boolean; title: string; message: string; buttons?: any[] };

const BackupScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [state, setState] = useState<LocalBackupState | null>(null);
    const [registeredName, setRegisteredName] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Enable form
    const [newPassword, setNewPassword] = useState('');
    const [desiredName, setDesiredName] = useState('');
    // Restore form
    const [restoreName, setRestoreName] = useState('');
    const [restorePassword, setRestorePassword] = useState('');
    // Change password form
    const [showChangePw, setShowChangePw] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [changedPassword, setChangedPassword] = useState('');

    const [alert, setAlert] = useState<AlertConfig>({ visible: false, title: '', message: '' });
    const hideAlert = () => setAlert(prev => ({ ...prev, visible: false }));
    const showAlert = (title: string, message: string, buttons?: any[]) =>
        setAlert({ visible: true, title, message, buttons: buttons || [{ text: t('common.ok'), onPress: hideAlert }] });

    const refresh = useCallback(async () => {
        const [local, name] = await Promise.all([getLocalState(), getRegisteredUsername()]);
        setState(local);
        setRegisteredName(name);
        if (!restoreName && name) setRestoreName(name);
    }, [restoreName]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const handleBack = useCallback(() => {
        playSfx('tile_select');
        navigation.goBack();
    }, [navigation]);

    React.useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });
        return () => sub.remove();
    }, [handleBack]);

    /** Turn a service error code into something a player can act on. */
    const explain = (code?: BackupErrorCode, fallbackMessage?: string): string => {
        switch (code) {
            case 'network': return t('backup.errorNetwork');
            case 'superseded': return t('backup.errorSuperseded');
            case 'bad-credentials': return t('backup.errorCredentials');
            case 'name-taken': return t('backup.errorNameTaken');
            case 'name-not-owned': return t('backup.errorNameNotOwned');
            case 'no-account': return t('backup.errorNoAccount');
            case 'rate-limited': return t('backup.errorRateLimited');
            case 'update-required': return t('backup.errorUpdateRequired');
            case 'corrupt': return t('backup.errorCorrupt');
            case 'weak-password': return t('backup.errorWeakPassword');
            default: return fallbackMessage || t('backup.errorUnknown');
        }
    };

    const doEnable = async () => {
        if (!registeredName && desiredName.trim().length < 3) {
            showAlert(t('common.error'), t('backup.errorNameLength'));
            return;
        }
        if (newPassword.length < 6) {
            showAlert(t('common.error'), t('backup.errorWeakPassword'));
            return;
        }
        setBusy(true);
        const result = await enableBackup(newPassword, desiredName);
        setBusy(false);
        if (!result.ok) {
            showAlert(t('common.error'), explain(result.code, result.message));
            return;
        }
        setNewPassword('');
        await refresh();
        playSfx('level_complete');
        showAlert(t('backup.enabledTitle'), t('backup.enabledMessage'));
    };

    const doBackupNow = async () => {
        setBusy(true);
        const result = await backupNow();
        setBusy(false);
        await refresh();
        if (!result.ok) {
            showAlert(t('common.error'), explain(result.code, result.message));
            return;
        }
        playSfx('tile_select');
        showAlert(t('backup.backedUpTitle'), t('backup.backedUpMessage'));
    };

    // The important warning: restoring here deactivates the other device.
    const confirmRestore = () => {
        if (!restoreName.trim() || !restorePassword) {
            showAlert(t('common.error'), t('backup.errorCredentials'));
            return;
        }
        showAlert(
            t('backup.restoreWarningTitle'),
            t('backup.restoreWarningMessage'),
            [
                { text: t('common.cancel'), style: 'cancel', onPress: hideAlert },
                { text: t('backup.restoreConfirm'), style: 'destructive', onPress: () => { hideAlert(); doRestore(); } },
            ]
        );
    };

    const doRestore = async () => {
        setBusy(true);
        const result = await restoreBackup(restoreName, restorePassword);
        setBusy(false);
        if (!result.ok) {
            showAlert(t('common.error'), explain(result.code, result.message));
            return;
        }
        setRestorePassword('');
        // Language, sound settings and progress all changed underneath the running
        // app, so restart rather than trying to re-hydrate every store by hand.
        showAlert(t('backup.restoredTitle'), t('backup.restoredMessage'), [
            { text: t('common.ok'), onPress: () => RNRestart.restart() },
        ]);
    };

    const doChangePassword = async () => {
        if (changedPassword.length < 6) {
            showAlert(t('common.error'), t('backup.errorWeakPassword'));
            return;
        }
        setBusy(true);
        const result = await changePassword(currentPassword, changedPassword);
        setBusy(false);
        if (!result.ok) {
            showAlert(t('common.error'), explain(result.code, result.message));
            return;
        }
        setCurrentPassword('');
        setChangedPassword('');
        setShowChangePw(false);
        showAlert(t('backup.passwordChangedTitle'), t('backup.passwordChangedMessage'));
    };

    const toggleAuto = async (value: boolean) => {
        await setAutoBackup(value);
        playSfx('tile_select');
        await refresh();
        if (value) doBackupNow();
    };

    const enabled = !!state?.account && state.hasToken;

    const formatWhen = (iso: string | null) => {
        if (!iso) return t('backup.never');
        try {
            return new Date(iso).toLocaleString();
        } catch {
            return iso;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('backup.title')}</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.noticeCard}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.noticeText}>{t('backup.oneDeviceNotice')}</Text>
                </View>

                {/* This device */}
                <Text style={styles.sectionTitle}>{t('backup.thisDevice')}</Text>
                <View style={styles.card}>
                    {!registeredName ? (
                        // No leaderboard name yet: let the player choose one here. It is
                        // registered on the leaderboard as part of turning backup on, so
                        // they never have to go and set one up somewhere else first.
                        <>
                            <Text style={styles.cardBody}>{t('backup.chooseNameMessage')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('backup.playerName')}
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={20}
                                value={desiredName}
                                onChangeText={setDesiredName}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={t('backup.choosePassword')}
                                placeholderTextColor={COLORS.textMuted}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TouchableOpacity style={styles.primaryButton} onPress={doEnable} disabled={busy}>
                                <Text style={styles.primaryButtonText}>{t('backup.enableBackup')}</Text>
                            </TouchableOpacity>
                        </>
                    ) : enabled ? (
                        <>
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>{t('backup.account')}</Text>
                                <Text style={styles.rowValue}>{state?.account}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>{t('backup.lastBackup')}</Text>
                                <Text style={styles.rowValue}>{formatWhen(state?.lastBackupAt ?? null)}</Text>
                            </View>

                            <View style={styles.switchRow}>
                                <View style={styles.switchText}>
                                    <Text style={styles.rowLabel}>{t('backup.autoBackup')}</Text>
                                    <Text style={styles.hint}>{t('backup.autoBackupHint')}</Text>
                                </View>
                                <Switch
                                    value={!!state?.autoBackup}
                                    onValueChange={toggleAuto}
                                    trackColor={{ false: COLORS.backgroundSecondary, true: COLORS.organicWaste }}
                                />
                            </View>

                            <TouchableOpacity style={styles.primaryButton} onPress={doBackupNow} disabled={busy}>
                                <Text style={styles.primaryButtonText}>{t('backup.backUpNow')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => setShowChangePw(v => !v)}
                            >
                                <Text style={styles.linkText}>{t('backup.changePassword')}</Text>
                            </TouchableOpacity>

                            {showChangePw && (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('backup.currentPassword')}
                                        placeholderTextColor={COLORS.textMuted}
                                        secureTextEntry
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('backup.newPassword')}
                                        placeholderTextColor={COLORS.textMuted}
                                        secureTextEntry
                                        value={changedPassword}
                                        onChangeText={setChangedPassword}
                                    />
                                    <TouchableOpacity style={styles.primaryButton} onPress={doChangePassword} disabled={busy}>
                                        <Text style={styles.primaryButtonText}>{t('backup.savePassword')}</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <View style={styles.row}>
                                <Text style={styles.rowLabel}>{t('backup.account')}</Text>
                                <Text style={styles.rowValue}>{registeredName}</Text>
                            </View>
                            <Text style={styles.cardBody}>{t('backup.enableMessage')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('backup.choosePassword')}
                                placeholderTextColor={COLORS.textMuted}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TouchableOpacity style={styles.primaryButton} onPress={doEnable} disabled={busy}>
                                <Text style={styles.primaryButtonText}>{t('backup.enableBackup')}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Restore on this device */}
                <Text style={styles.sectionTitle}>{t('backup.restoreTitle')}</Text>
                <View style={styles.card}>
                    <Text style={styles.cardBody}>{t('backup.restoreMessage')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('backup.playerName')}
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={restoreName}
                        onChangeText={setRestoreName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={t('backup.password')}
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry
                        value={restorePassword}
                        onChangeText={setRestorePassword}
                    />
                    <TouchableOpacity style={styles.dangerButton} onPress={confirmRestore} disabled={busy}>
                        <Text style={styles.dangerButtonText}>{t('backup.restoreHere')}</Text>
                    </TouchableOpacity>
                </View>

                {busy && (
                    <View style={styles.busyRow}>
                        <ActivityIndicator color={COLORS.organicWaste} />
                    </View>
                )}
            </ScrollView>

            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                buttons={alert.buttons}
                onDismiss={hideAlert}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.cardBackground,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    title: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textPrimary,
    },
    content: { padding: SPACING.md, paddingBottom: SPACING.xl },
    noticeCard: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignItems: 'flex-start',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    noticeText: {
        flex: 1,
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },
    card: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    cardBody: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLabel: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        color: COLORS.textPrimary,
    },
    rowValue: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        flexShrink: 1,
        textAlign: 'right',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    switchText: { flex: 1 },
    hint: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.backgroundPrimary,
    },
    primaryButton: {
        backgroundColor: COLORS.organicWaste,
        borderRadius: RADIUS.sm,
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#FFFFFF',
    },
    dangerButton: {
        borderWidth: 1,
        borderColor: '#C0392B',
        borderRadius: RADIUS.sm,
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    dangerButtonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#C0392B',
    },
    linkButton: { paddingVertical: SPACING.xs, alignItems: 'center' },
    linkText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        color: COLORS.textSecondary,
        textDecorationLine: 'underline',
    },
    busyRow: { paddingVertical: SPACING.md, alignItems: 'center' },
});

export default BackupScreen;
