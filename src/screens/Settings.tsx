// Settings Screen - Earth-Inspired Minimal Design
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import {
    getSoundSettings,
    toggleSfx,
    toggleMusic,
    playSfx,
    playBgm
} from '../utils/SoundManager';
import VERSION from '../config/version';
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

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>

                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Version</Text>
                        <Text style={styles.aboutValue}>{VERSION.string}</Text>
                    </View>

                    <View style={[styles.aboutRow, styles.lastRow]}>
                        <Text style={styles.aboutLabel}>Developer</Text>
                        <Text style={styles.aboutValue}>SepehrMohammady</Text>
                    </View>
                </View>

                {/* Tagline */}
                <View style={styles.taglineContainer}>
                    <Text style={styles.taglineEmoji}>🌱</Text>
                    <Text style={styles.tagline}>Save the planet, one match at a time</Text>
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
});

export default Settings;
