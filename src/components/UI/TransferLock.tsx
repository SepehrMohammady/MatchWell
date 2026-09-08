// Shown instead of the game when this device's save has been claimed elsewhere.
//
// The save is only ever live on one device. Once another device signs in, this
// one stops being playable until the player either takes the save back (restore
// here, which deactivates the other device) or starts over.

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RNRestart from 'react-native-restart';

import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import CustomAlert from './CustomAlert';
import { restoreBackup, startFresh, getLocalState } from '../../services/BackupService';

const TransferLock: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; buttons?: any[] }>({
        visible: false, title: '', message: '',
    });

    const hideAlert = () => setAlert(prev => ({ ...prev, visible: false }));

    React.useEffect(() => {
        getLocalState().then(state => {
            if (state.account) setName(state.account);
        });
    }, []);

    const doRestore = async () => {
        if (!name.trim() || !password) return;
        setBusy(true);
        const result = await restoreBackup(name, password);
        setBusy(false);
        if (!result.ok) {
            setAlert({
                visible: true,
                title: t('common.error'),
                message: result.code === 'bad-credentials'
                    ? t('backup.errorCredentials')
                    : result.code === 'network'
                        ? t('backup.errorNetwork')
                        : t('backup.errorUnknown'),
                buttons: [{ text: t('common.ok'), onPress: hideAlert }],
            });
            return;
        }
        RNRestart.restart();
    };

    const confirmFresh = () => {
        setAlert({
            visible: true,
            title: t('backup.startFreshTitle'),
            message: t('backup.startFreshMessage'),
            buttons: [
                { text: t('common.cancel'), style: 'cancel', onPress: hideAlert },
                {
                    text: t('backup.startFreshConfirm'),
                    style: 'destructive',
                    onPress: async () => {
                        hideAlert();
                        await startFresh();
                        RNRestart.restart();
                    },
                },
            ],
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom }]}>
            <MaterialCommunityIcons name="cellphone-lock" size={56} color={COLORS.textSecondary} />
            <Text style={styles.title}>{t('backup.lockedTitle')}</Text>
            <Text style={styles.message}>{t('backup.lockedMessage')}</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('backup.lockedRestoreHere')}</Text>
                <Text style={styles.cardBody}>{t('backup.lockedRestoreHint')}</Text>
                <TextInput
                    style={styles.input}
                    placeholder={t('backup.playerName')}
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={styles.input}
                    placeholder={t('backup.password')}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={doRestore} disabled={busy}>
                    <Text style={styles.primaryButtonText}>{t('backup.restoreHere')}</Text>
                </TouchableOpacity>
                {busy && <ActivityIndicator color={COLORS.organicWaste} />}
            </View>

            <TouchableOpacity style={styles.linkButton} onPress={confirmFresh}>
                <Text style={styles.linkText}>{t('backup.startFresh')}</Text>
            </TouchableOpacity>

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
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundPrimary,
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
    },
    title: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    message: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    card: {
        alignSelf: 'stretch',
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        padding: SPACING.md,
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    cardTitle: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textPrimary,
    },
    cardBody: {
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
    linkButton: { paddingVertical: SPACING.md },
    linkText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        color: COLORS.textSecondary,
        textDecorationLine: 'underline',
    },
});

export default TransferLock;
