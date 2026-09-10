// Settings Screen - Earth-Inspired Minimal Design
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Switch,
    Linking,
    ScrollView,
    Modal,
    TextInput,
    I18nManager,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import {
    getSoundSettings,
    toggleSfx,
    toggleMusic,
    playSfx,
    playBgm
} from '../utils/SoundManager';
import VERSION from '../config/version';
import { useGameStore } from '../context/GameStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../config/theme';
import { BackIcon } from '../components/UI/Icons';
import CustomAlert from '../components/UI/CustomAlert';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LanguageCode, changeLanguage, getCurrentLanguage, formatNumber } from '../config/i18n';
import RNRestart from 'react-native-restart';
import { signOutOfBackup, renameBackupAccount, deleteAccount } from '../services/BackupService';
import { getStoredUsername, renamePlayer } from '../services/LeaderboardService';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const Settings: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t, i18n } = useTranslation();
    const [sfxEnabled, setSfxEnabled] = useState(true);
    const [musicEnabled, setMusicEnabled] = useState(true);
    const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [needsRestart, setNeedsRestart] = useState(false);
    // Player name (the leaderboard name, which is also the backup account key).
    const [playerName, setPlayerName] = useState<string | null>(null);
    const [showNameModal, setShowNameModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [nameError, setNameError] = useState('');
    const [savingName, setSavingName] = useState(false);
    // Deleting the account asks for the backup password only when the server
    // says one is needed, so a player without a cloud save is never prompted.
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; buttons?: any[] }>({
        visible: false,
        title: '',
        message: '',
    });

    const showAlert = (title: string, message: string, buttons?: any[]) =>
        setAlertConfig({ visible: true, title, message, buttons });
    const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    useEffect(() => {
        const settings = getSoundSettings();
        setSfxEnabled(settings.sfxEnabled);
        setMusicEnabled(settings.musicEnabled);
        getStoredUsername().then(setPlayerName);
    }, []);

    const handleSaveName = async () => {
        const wanted = newName.trim();
        if (wanted === playerName) { setShowNameModal(false); return; }
        if (wanted.length < 3 || wanted.length > 20) {
            setNameError(t('backup.errorNameLength'));
            return;
        }
        setSavingName(true);
        setNameError('');
        const result = await renamePlayer(wanted);
        setSavingName(false);
        if (!result.success || !result.username) {
            setNameError(result.error || t('backup.errorNameTaken'));
            return;
        }
        // The backup account is keyed on the name, so move the local session too.
        await renameBackupAccount(result.username);
        setPlayerName(result.username);
        setShowNameModal(false);
        playSfx('level_complete');
        showAlert(
            t('settings.nameChangedTitle'),
            t('settings.nameChangedMessage', { name: result.username }),
            [{ text: t('common.ok'), onPress: hideAlert }]
        );
    };

    const runDelete = async (password?: string) => {
        setDeletingAccount(true);
        const result = await deleteAccount(password);
        setDeletingAccount(false);

        if (!result.ok) {
            // The server asks for the password only if a cloud save exists.
            if (result.code === 'bad-credentials') {
                setDeleteError(password ? t('backup.errorCredentials') : '');
                setShowDeleteModal(true);
                return;
            }
            const key = result.code === 'network' ? 'backup.errorNetwork'
                : result.code === 'rate-limited' ? 'backup.errorRateLimited'
                : 'backup.errorUnknown';
            showAlert(t('common.error'), t(key), [{ text: t('common.ok'), onPress: hideAlert }]);
            return;
        }

        setShowDeleteModal(false);
        setDeletePassword('');
        setPlayerName(null);
        showAlert(
            t('settings.deleteAccountDone'),
            t('settings.deleteAccountDoneMessage'),
            [{ text: t('common.ok'), onPress: hideAlert }]
        );
    };

    const handleDeleteAccount = () => {
        playSfx('tile_select');
        showAlert(
            t('settings.deleteAccountTitle'),
            t('settings.deleteAccountMessage'),
            [
                { text: t('common.cancel'), onPress: hideAlert },
                {
                    text: t('settings.deleteAccountConfirm'),
                    style: 'destructive',
                    onPress: () => { hideAlert(); runDelete(); },
                },
            ]
        );
    };

    // Play menu music when screen is focused
    useFocusEffect(
        useCallback(() => {
            playBgm('bgm_menu');
        }, [])
    );

    const handleSfxToggle = (value: boolean) => {
        setSfxEnabled(value);
        toggleSfx(value);
        if (value) {
            playSfx('tile_select');
        }
    };

    const handleMusicToggle = (value: boolean) => {
        setMusicEnabled(value);
        toggleMusic(value);
        if (value) {
            // Start playing menu music when enabled
            playBgm('bgm_menu');
        }
    };

    const handleBack = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    const resetProgress = useGameStore((state) => state.resetProgress);

    const handleResetData = () => {
        showAlert(
            t('settings.resetProgress'),
            t('settings.resetWarning'),
            [
                { text: t('common.cancel'), style: 'cancel', onPress: hideAlert },
                {
                    text: t('common.yes'),
                    style: 'destructive',
                    onPress: async () => {
                        await resetProgress();
                        // Also sign out of cloud backup. Staying signed in would let
                        // the next backup overwrite the player's cloud save with the
                        // empty one they just created - so a reset means signing in
                        // again to get the old save back.
                        await signOutOfBackup();
                        showAlert(t('common.ok'), t('settings.resetProgress'), [{ text: t('common.ok'), onPress: hideAlert }]);
                    },
                },
            ]
        );
    };

    const handleLanguageSelect = async (lang: LanguageCode) => {
        setShowLanguageModal(false);
        if (lang === currentLang) return;

        const needsAppRestart = await changeLanguage(lang);
        setCurrentLang(lang);

        if (needsAppRestart) {
            setNeedsRestart(true);
        }
    };

    const handleRestart = () => {
        RNRestart.restart();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onDismiss={hideAlert}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <BackIcon size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Settings Options - Scrollable */}
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Sound Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.sound')}</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('settings.music')}</Text>
                            <Text style={styles.settingDescription}>{t('settings.backgroundMusic')}</Text>
                        </View>
                        <Switch
                            value={musicEnabled}
                            onValueChange={handleMusicToggle}
                            trackColor={{ false: COLORS.cardBorder, true: COLORS.organicWaste }}
                            thumbColor={musicEnabled ? COLORS.textLight : COLORS.textMuted}
                        />
                    </View>

                    <View style={[styles.settingRow, styles.lastRow]}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('settings.sfx')}</Text>
                            <Text style={styles.settingDescription}>{t('settings.tileSounds')}</Text>
                        </View>
                        <Switch
                            value={sfxEnabled}
                            onValueChange={handleSfxToggle}
                            trackColor={{ false: COLORS.cardBorder, true: COLORS.organicWaste }}
                            thumbColor={sfxEnabled ? COLORS.textLight : COLORS.textMuted}
                        />
                    </View>
                </View>

                {/* Language Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.language')}</Text>

                    <TouchableOpacity
                        style={[styles.settingRow, styles.lastRow]}
                        onPress={() => setShowLanguageModal(true)}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('settings.selectLanguage')}</Text>
                            <Text style={styles.settingDescription}>{LANGUAGES[currentLang].nativeName}</Text>
                        </View>
                        <Text style={styles.linkIcon}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Player name - only meaningful once they have one. */}
                {playerName && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('backup.playerName')}</Text>
                        <TouchableOpacity
                            style={[styles.settingRow, styles.lastRow]}
                            onPress={() => { playSfx('tile_select'); setNewName(playerName); setNameError(''); setShowNameModal(true); }}
                        >
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>{playerName}</Text>
                                <Text style={styles.settingDescription}>{t('settings.changePlayerNameHint')}</Text>
                            </View>
                            <Text style={styles.linkIcon}>›</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Backup & Transfer */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('backup.title')}</Text>
                    <TouchableOpacity
                        style={[styles.settingRow, styles.lastRow]}
                        onPress={() => { playSfx('tile_select'); navigation.navigate('Backup'); }}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>{t('backup.title')}</Text>
                            <Text style={styles.settingDescription}>{t('backup.settingsHint')}</Text>
                        </View>
                        <Text style={styles.linkIcon}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.resetProgress')}</Text>

                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleResetData}
                    >
                        <Text style={styles.dangerButtonText}>{t('settings.resetAllProgress')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dangerButton, styles.deleteAccountButton]}
                        onPress={handleDeleteAccount}
                    >
                        <Text style={styles.dangerButtonText}>{t('settings.deleteAccount')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.deleteAccountHint}>{t('settings.deleteAccountHint')}</Text>
                </View>

                {/* Testers Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.testers')}</Text>

                    <View style={styles.aboutCard}>
                        <View style={styles.aboutCardRow}>
                            <Text style={styles.testersThankYou}>{t('settings.testersThanks')}</Text>
                        </View>
                        {/* Alphabetical by first name. */}
                        <View style={styles.aboutCardRow}>
                            <Text style={styles.testerName}>Hoda Mostafanezhad</Text>
                        </View>
                        <View style={styles.aboutCardRow}>
                            <Text style={styles.testerName}>Houriyeh Emadoleslami</Text>
                        </View>
                        <View style={[styles.aboutCardRow, styles.aboutCardLastRow]}>
                            <Text style={styles.testerName}>Majid Mohammadi</Text>
                        </View>
                    </View>
                </View>

                {/* About Section - FeedWell Style */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('settings.about')}</Text>

                    <View style={styles.aboutCard}>
                        {/* App Name */}
                        <View style={styles.aboutCardRow}>
                            <Text style={styles.aboutAppName}>MatchWell</Text>
                        </View>

                        {/* Version */}
                        <View style={styles.aboutCardRow}>
                            <Text style={styles.aboutCardLabel}>{t('settings.version')}</Text>
                            <Text style={styles.aboutCardValue}>{VERSION.string}</Text>
                        </View>

                        {/* Developer */}
                        <TouchableOpacity
                            style={styles.aboutCardRow}
                            onPress={() => Linking.openURL('https://sepehrmohammady.ir/')}
                        >
                            <View>
                                <Text style={styles.aboutCardLabel}>{t('settings.developer')}</Text>
                                <Text style={styles.aboutCardValue}>Sepehr Mohammady</Text>
                            </View>
                            <Text style={styles.linkIcon}>↗</Text>
                        </TouchableOpacity>

                        {/* Source Code */}
                        <TouchableOpacity
                            style={styles.aboutCardRow}
                            onPress={() => Linking.openURL('https://github.com/SepehrMohammady/MatchWell')}
                        >
                            <View>
                                <Text style={styles.aboutCardLabel}>{t('settings.sourceCode')}</Text>
                                <Text style={styles.aboutCardValue}>github.com/SepehrMohammady/MatchWell</Text>
                            </View>
                            <Text style={styles.linkIcon}>⎋</Text>
                        </TouchableOpacity>

                        {/* Privacy Policy */}
                        <TouchableOpacity
                            style={[styles.aboutCardRow, styles.aboutCardLastRow]}
                            onPress={() => Linking.openURL('https://semo-lab.com/matchwell/privacy-policy/')}
                        >
                            <View style={styles.aboutCardTextGroup}>
                                <Text style={styles.aboutCardLabel}>{t('settings.privacyPolicy')}</Text>
                                <Text style={styles.aboutCardValue}>{t('settings.privacyDesc')}</Text>
                            </View>
                            <Text style={styles.linkIcon}>↗</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tagline */}
                <View style={styles.taglineContainer}>
                    <Text style={styles.tagline}>🌱 {t('menu.tagline')}</Text>
                    <Text style={styles.copyright}>© 2026 Sepehr Mohammady. Open source under MIT License.</Text>
                </View>
            </ScrollView>

            {/* Change Player Name */}
            <Modal
                visible={showNameModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowNameModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.nameModal}>
                        <Text style={styles.modalTitle}>{t('settings.changePlayerName')}</Text>
                        <Text style={styles.nameModalHint}>{t('settings.changePlayerNameMessage')}</Text>
                        <TextInput
                            style={styles.nameInput}
                            value={newName}
                            onChangeText={(v) => { setNewName(v); setNameError(''); }}
                            placeholder={t('backup.playerName')}
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={20}
                        />
                        {!!nameError && <Text style={styles.nameError}>{nameError}</Text>}
                        <View style={styles.nameModalButtons}>
                            <TouchableOpacity
                                style={styles.nameCancelButton}
                                onPress={() => setShowNameModal(false)}
                            >
                                <Text style={styles.nameCancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.nameSaveButton}
                                onPress={handleSaveName}
                                disabled={savingName}
                            >
                                <Text style={styles.nameSaveText}>
                                    {savingName ? t('common.loading') : t('common.save')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Confirm account deletion with the backup password */}
            <Modal
                visible={showDeleteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.nameModal}>
                        <Text style={styles.modalTitle}>{t('settings.deleteAccountTitle')}</Text>
                        <Text style={styles.nameModalHint}>{t('settings.deleteAccountPasswordPrompt')}</Text>
                        <TextInput
                            style={styles.nameInput}
                            value={deletePassword}
                            onChangeText={(v) => { setDeletePassword(v); setDeleteError(''); }}
                            placeholder={t('backup.password')}
                            placeholderTextColor={COLORS.textMuted}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {!!deleteError && <Text style={styles.nameError}>{deleteError}</Text>}
                        <View style={styles.nameModalButtons}>
                            <TouchableOpacity
                                style={styles.nameCancelButton}
                                onPress={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                            >
                                <Text style={styles.nameCancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nameSaveButton, styles.deleteConfirmButton]}
                                onPress={() => runDelete(deletePassword)}
                                disabled={deletingAccount}
                            >
                                <Text style={styles.nameSaveText}>
                                    {deletingAccount ? t('common.loading') : t('settings.deleteAccountConfirm')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Language Selection Modal */}
            <Modal
                visible={showLanguageModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowLanguageModal(false)}
                >
                    <View style={styles.languageModal}>
                        <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
                        <ScrollView style={styles.languageList}>
                            {(Object.keys(LANGUAGES) as LanguageCode[]).map((langCode) => (
                                <TouchableOpacity
                                    key={langCode}
                                    style={[
                                        styles.languageItem,
                                        currentLang === langCode && styles.languageItemSelected
                                    ]}
                                    onPress={() => handleLanguageSelect(langCode)}
                                >
                                    <Text style={[
                                        styles.languageNativeName,
                                        currentLang === langCode && styles.languageTextSelected
                                    ]}>
                                        {LANGUAGES[langCode].nativeName}
                                    </Text>
                                    <Text style={[
                                        styles.languageEnglishName,
                                        currentLang === langCode && styles.languageTextSelected
                                    ]}>
                                        {LANGUAGES[langCode].name}
                                    </Text>
                                    {currentLang === langCode && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowLanguageModal(false)}
                        >
                            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Restart Required Modal */}
            <Modal
                visible={needsRestart}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setNeedsRestart(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.restartModal}>
                        <Text style={styles.modalTitle}>{t('settings.restartRequired')}</Text>
                        <View style={styles.restartButtonRow}>
                            <TouchableOpacity
                                style={styles.restartLaterButton}
                                onPress={() => setNeedsRestart(false)}
                            >
                                <Text style={styles.restartLaterText}>{t('settings.restartLater')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.restartNowButton}
                                onPress={handleRestart}
                            >
                                <Text style={styles.restartNowText}>{t('settings.restartNow')}</Text>
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
        backgroundColor: COLORS.backgroundPrimary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
        backgroundColor: COLORS.cardBackground,
    },
    backButton: {
        padding: SPACING.sm,
    },
    backButtonText: {
        color: COLORS.organicWaste,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
    },
    title: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 60,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xxl,
    },
    section: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.sm,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.md,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.backgroundSecondary,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    settingInfo: {
        flex: 1,
    },
    settingLabel: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: TYPOGRAPHY.medium,
        color: COLORS.textPrimary,
    },
    settingDescription: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.backgroundSecondary,
    },
    aboutLabel: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
    },
    aboutValue: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.textPrimary,
        fontWeight: TYPOGRAPHY.medium,
    },
    taglineContainer: {
        alignItems: 'center',
        marginTop: SPACING.xl,
    },
    taglineEmoji: {
        fontSize: 24,
        marginBottom: SPACING.sm,
    },
    tagline: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    dangerButton: {
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 1,
        borderColor: COLORS.accentDanger,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    dangerButtonText: {
        color: COLORS.accentDanger,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
    },
    aboutCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    aboutCardRow: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.backgroundSecondary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    aboutCardLastRow: {
        borderBottomWidth: 0,
    },
    aboutAppName: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    aboutAppDesc: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    aboutCardLabel: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    aboutCardValue: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    // Lets a multi-line description wrap instead of pushing the link arrow
    // off the row.
    aboutCardTextGroup: {
        flex: 1,
        paddingRight: SPACING.md,
    },
    linkIcon: {
        fontSize: TYPOGRAPHY.body,
        color: COLORS.textMuted,
    },
    copyright: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    testersThankYou: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    testerName: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    languageModal: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        width: '100%',
        maxHeight: '80%',
    },
    deleteAccountButton: {
        marginTop: SPACING.md,
    },
    deleteAccountHint: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    deleteConfirmButton: {
        backgroundColor: COLORS.accentDanger,
    },
    nameModal: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    nameModalHint: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    nameInput: {
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
        backgroundColor: COLORS.backgroundPrimary,
        marginTop: SPACING.sm,
    },
    nameError: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: '#C0392B',
    },
    nameModalButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    nameCancelButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.backgroundSecondary,
        alignItems: 'center',
    },
    nameCancelText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        color: COLORS.textPrimary,
    },
    nameSaveButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.organicWaste,
        alignItems: 'center',
    },
    nameSaveText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#FFFFFF',
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    languageList: {
        maxHeight: 400,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    languageItemSelected: {
        backgroundColor: COLORS.organicWaste + '20',
        borderRadius: RADIUS.md,
    },
    languageNativeName: {
        flex: 1,
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    languageEnglishName: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginEnd: SPACING.md,
    },
    languageTextSelected: {
        color: COLORS.organicWaste,
    },
    checkmark: {
        fontSize: TYPOGRAPHY.h3,
        color: COLORS.organicWaste,
        fontWeight: TYPOGRAPHY.bold,
    },
    modalCloseButton: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.cardBorder,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    restartModal: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        width: '100%',
    },
    restartButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    restartLaterButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.cardBorder,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    restartLaterText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    restartNowButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.organicWaste,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    restartNowText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textLight,
    },
});

export default Settings;
