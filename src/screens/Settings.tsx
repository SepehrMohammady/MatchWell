// Settings Screen - Earth-Inspired Minimal Design
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Switch,
    Alert,
    Linking,
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

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const Settings: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [sfxEnabled, setSfxEnabled] = useState(true);
    const [musicEnabled, setMusicEnabled] = useState(true);

    useEffect(() => {
        const settings = getSoundSettings();
        setSfxEnabled(settings.sfxEnabled);
        setMusicEnabled(settings.musicEnabled);
    }, []);

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
        Alert.alert(
            'Reset Progress',
            'Are you sure you want to reset all your progress? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await resetProgress();
                        Alert.alert('Done', 'All progress has been reset.');
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Settings Options */}
            <View style={styles.content}>
                {/* Sound Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sound</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Music</Text>
                            <Text style={styles.settingDescription}>Background music</Text>
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
                            <Text style={styles.settingLabel}>Sound effects</Text>
                            <Text style={styles.settingDescription}>Tile sounds & feedback</Text>
                        </View>
                        <Switch
                            value={sfxEnabled}
                            onValueChange={handleSfxToggle}
                            trackColor={{ false: COLORS.cardBorder, true: COLORS.organicWaste }}
                            thumbColor={sfxEnabled ? COLORS.textLight : COLORS.textMuted}
                        />
                    </View>
                </View>

                {/* Data Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data</Text>

                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={handleResetData}
                    >
                        <Text style={styles.dangerButtonText}>Reset All Progress</Text>
                    </TouchableOpacity>
                </View>

                {/* About Section - FeedWell Style */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>

                    <View style={styles.aboutCard}>
                        {/* App Name & Description */}
                        <View style={styles.aboutCardRow}>
                            <Text style={styles.aboutAppName}>MatchWell</Text>
                            <Text style={styles.aboutAppDesc}>Eco-conscious match-3 puzzle game</Text>
                        </View>

                        {/* Version */}
                        <View style={styles.aboutCardRow}>
                            <Text style={styles.aboutCardLabel}>Version</Text>
                            <Text style={styles.aboutCardValue}>{VERSION.string}</Text>
                        </View>

                        {/* Developer */}
                        <TouchableOpacity
                            style={styles.aboutCardRow}
                            onPress={() => Linking.openURL('https://github.com/SepehrMohammady')}
                        >
                            <View>
                                <Text style={styles.aboutCardLabel}>Developer</Text>
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
                                <Text style={styles.aboutCardLabel}>Source Code</Text>
                                <Text style={styles.aboutCardValue}>github.com/SepehrMohammady/MatchWell</Text>
                            </View>
                            <Text style={styles.linkIcon}>⎋</Text>
                        </TouchableOpacity>

                        {/* Privacy */}
                        <View style={[styles.aboutCardRow, styles.aboutCardLastRow]}>
                            <Text style={styles.aboutCardLabel}>Privacy</Text>
                            <Text style={styles.aboutCardValue}>No data is collected or shared</Text>
                        </View>
                    </View>
                </View>

                {/* Tagline */}
                <View style={styles.taglineContainer}>
                    <Text style={styles.tagline}>🌱 Save the planet, one match at a time</Text>
                    <Text style={styles.copyright}>© 2025 Sepehr Mohammady. Open source under MIT License.</Text>
                </View>
            </View>
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
        padding: SPACING.lg,
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
        backgroundColor: COLORS.backgroundDark,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
    },
    aboutCardRow: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
        color: COLORS.textLight,
    },
    aboutAppDesc: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
    },
    aboutCardLabel: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textLight,
    },
    aboutCardValue: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
    },
    linkIcon: {
        fontSize: TYPOGRAPHY.body,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    copyright: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
});

export default Settings;
