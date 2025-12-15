// Main Menu Screen - Earth-Inspired Minimal Design (No Emojis)
import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { preloadSounds, playBgm, playSfx, stopBgm } from '../utils/SoundManager';
import { useGameStore } from '../context/GameStore';
import VERSION from '../config/version';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../config/theme';
import { EarthIcon, SeedlingIcon } from '../components/UI/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

const MainMenu: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const loadProgress = useGameStore((state) => state.loadProgress);

    // Preload sounds, load saved progress, and start menu music
    useEffect(() => {
        loadProgress();

        preloadSounds().then(() => {
            playBgm('bgm_menu');
        });

        return () => {
            stopBgm();
        };
    }, [loadProgress]);

    const handlePlay = () => {
        playSfx('tile_select');
        navigation.navigate('LevelSelect');
    };

    const handleEndless = () => {
        playSfx('tile_select');
        navigation.navigate('EndlessSelect');
    };

    const handleSettings = () => {
        playSfx('tile_select');
        navigation.navigate('Settings');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Title section */}
            <View style={styles.titleSection}>
                <View style={styles.earthContainer}>
                    <EarthIcon size={80} color={COLORS.organicWaste} />
                </View>
                <Text style={styles.title}>MatchWell</Text>
                <Text style={styles.subtitle}>Save the planet, one match at a time</Text>
            </View>

            {/* Menu buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.8}>
                    <Text style={styles.playButtonText}>Play story</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleEndless} activeOpacity={0.8}>
                    <Text style={styles.secondaryButtonText}>Endless mode</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingsButton} onPress={handleSettings} activeOpacity={0.6}>
                    <Text style={styles.settingsButtonText}>Settings</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom ambient decoration */}
            <View style={styles.bottomDecor}>
                <View style={styles.seedlingRow}>
                    <SeedlingIcon size={24} color={COLORS.organicWaste} />
                    <SeedlingIcon size={28} color={COLORS.organicWaste} />
                    <SeedlingIcon size={24} color={COLORS.organicWaste} />
                </View>
            </View>

            {/* Version */}
            <Text style={styles.version}>v{VERSION.string}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundPrimary,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spacer: {
        height: SPACING.xxl,
    },
    titleSection: {
        alignItems: 'center',
        paddingVertical: SPACING.xxl,
    },
    earthContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.lg,
    },
    title: {
        fontSize: TYPOGRAPHY.h1,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: SPACING.xxl,
        gap: SPACING.md,
    },
    playButton: {
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    playButtonText: {
        color: COLORS.textLight,
        fontSize: TYPOGRAPHY.h3,
        fontWeight: TYPOGRAPHY.semibold,
    },
    secondaryButton: {
        backgroundColor: COLORS.cardBackground,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.cardBorder,
        ...SHADOWS.sm,
    },
    secondaryButtonText: {
        color: COLORS.textPrimary,
        fontSize: TYPOGRAPHY.h4,
        fontWeight: TYPOGRAPHY.medium,
    },
    settingsButton: {
        backgroundColor: 'transparent',
        paddingVertical: SPACING.md,
        alignItems: 'center',
    },
    settingsButtonText: {
        color: COLORS.textSecondary,
        fontSize: TYPOGRAPHY.body,
        fontWeight: TYPOGRAPHY.medium,
    },
    bottomDecor: {
        paddingBottom: SPACING.lg,
    },
    seedlingRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
        opacity: 0.7,
        alignItems: 'flex-end',
    },
    version: {
        color: COLORS.textMuted,
        fontSize: TYPOGRAPHY.caption,
        paddingBottom: SPACING.lg,
    },
});

export default MainMenu;
