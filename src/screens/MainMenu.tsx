// Main Menu Screen - Earth Stages with Space Background
import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Image,
    ImageBackground,
    Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { preloadSounds, playBgm, playSfx } from '../utils/SoundManager';
import { useGameStore } from '../context/GameStore';
import VERSION from '../config/version';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import { SeedlingIcon } from '../components/UI/Icons';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

// Earth stage images based on story progress
const EARTH_STAGES = {
    1: require('../assets/images/01.png'), // Polluted (0-20 levels)
    2: require('../assets/images/02.png'), // Recovering (21-30 levels)
    3: require('../assets/images/03.png'), // Healing (31-50 levels)
    4: require('../assets/images/04.png'), // Thriving (all 50 levels complete)
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Get Earth stage based on completed levels
const getEarthStage = (completedLevels: number[]): number => {
    const maxLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : 0;

    if (maxLevel >= 50) return 4; // All 50 levels complete - Thriving
    if (maxLevel >= 31) return 3; // 31-50 levels - Healing
    if (maxLevel >= 21) return 2; // 21-30 levels - Recovering
    return 1; // 0-20 levels - Polluted
};

const MainMenu: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const loadProgress = useGameStore((state) => state.loadProgress);
    const completedLevels = useGameStore((state) => state.completedLevels);

    // Load progress on mount
    useEffect(() => {
        loadProgress();
        preloadSounds();
    }, [loadProgress]);

    // Handle music with focus - play menu music when screen is focused
    useFocusEffect(
        useCallback(() => {
            // Play menu music - playBgm internally stops any playing BGM first
            playBgm('bgm_menu');
            // No cleanup needed - next screen's playBgm will handle stopping
        }, [])
    );

    const earthStage = getEarthStage(completedLevels);
    const earthImage = EARTH_STAGES[earthStage as keyof typeof EARTH_STAGES];

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
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Space background with stars */}
            <View style={styles.spaceBackground}>
                {/* Simple star pattern */}
                {Array.from({ length: 50 }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.star,
                            {
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                width: Math.random() * 2 + 1,
                                height: Math.random() * 2 + 1,
                                opacity: Math.random() * 0.5 + 0.3,
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Earth image section */}
            <View style={styles.earthSection}>
                <Image
                    source={earthImage}
                    style={styles.earthImage}
                    resizeMode="contain"
                />
            </View>

            {/* Title section */}
            <View style={styles.titleSection}>
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

            {/* Bottom seedling decoration */}
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
        backgroundColor: '#030303', // Space black
        paddingHorizontal: SPACING.xl,
    },
    spaceBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#030303', // Space black with stars
    },
    star: {
        position: 'absolute',
        backgroundColor: '#ffffff',
        borderRadius: 10,
    },
    spacer: {
        flex: 0.5,
    },
    earthSection: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    earthImage: {
        width: SCREEN_WIDTH * 0.55,
        height: SCREEN_WIDTH * 0.55,
    },
    titleSection: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    title: {
        fontSize: TYPOGRAPHY.h1,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontWeight: TYPOGRAPHY.bold,
        color: '#ffffff',
        marginBottom: SPACING.xs,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
    },
    buttonContainer: {
        alignItems: 'center',
        gap: SPACING.md,
    },
    playButton: {
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xxl * 2,
        borderRadius: RADIUS.round,
        width: '100%',
        alignItems: 'center',
    },
    playButtonText: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: '#ffffff',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xxl * 2,
        borderRadius: RADIUS.round,
        width: '100%',
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: TYPOGRAPHY.medium,
        color: '#ffffff',
    },
    settingsButton: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
    },
    settingsButtonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    bottomDecor: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: SPACING.md,
    },
    seedlingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.lg,
    },
    version: {
        fontSize: TYPOGRAPHY.tiny,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: 'rgba(255, 255, 255, 0.3)',
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
});

export default MainMenu;
