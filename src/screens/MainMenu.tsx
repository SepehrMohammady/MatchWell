// Main Menu Screen - Earth Stages with Space Background
import React, { useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Image,
    ImageBackground,
    Dimensions,
    ScrollView,
    BackHandler,
    Alert,
    Animated,
    Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { preloadSounds, playBgm, playSfx } from '../utils/SoundManager';
import { useGameStore } from '../context/GameStore';
import VERSION from '../config/version';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import { SeedlingIcon, TrophyIcon, MedalIcon, SettingsIcon } from '../components/UI/Icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ClimateClock from '../components/UI/ClimateClock';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

// Earth stage images based on story progress
const EARTH_STAGES = {
    1: require('../assets/images/earth_1.png'), // Polluted (0-20 levels)
    2: require('../assets/images/earth_2.png'), // Recovering (21-30 levels)
    3: require('../assets/images/earth_3.png'), // Healing (31-50 levels)
    4: require('../assets/images/earth_4.png'), // Thriving (all 50 levels complete)
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
    const { t } = useTranslation();
    const loadProgress = useGameStore((state) => state.loadProgress);
    const completedLevels = useGameStore((state) => state.completedLevels);
    const unseenAchievements = useGameStore((state) => state.unseenAchievements);

    const [soundsReady, setSoundsReady] = React.useState(false);

    // Load progress and preload sounds on mount
    useEffect(() => {
        loadProgress();
        preloadSounds().then(() => {
            setSoundsReady(true);
        });
    }, [loadProgress]);

    // Earth rotation animation
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 60000, // 60 seconds for full rotation
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [rotateAnim]);

    const earthRotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // Play menu music when screen is focused AND sounds are ready
    useFocusEffect(
        useCallback(() => {
            if (soundsReady) {
                playBgm('bgm_menu');
            }
        }, [soundsReady])
    );

    // Handle back button - show exit confirmation
    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                Alert.alert(
                    t('common.exitApp'),
                    t('common.exitConfirm'),
                    [
                        { text: t('common.no'), style: 'cancel', onPress: () => { } },
                        { text: t('common.yes'), style: 'destructive', onPress: () => BackHandler.exitApp() },
                    ],
                    { cancelable: true }
                );
                return true; // Prevent default back action
            });
            return () => backHandler.remove();
        }, [t])
    );

    const earthStage = getEarthStage(completedLevels);
    const earthImage = EARTH_STAGES[earthStage as keyof typeof EARTH_STAGES];

    const handleMultiplayer = () => {
        playSfx('tile_select');
        navigation.navigate('MultiplayerMenu');
    };

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

    const handleAchievements = () => {
        playSfx('tile_select');
        navigation.navigate('Achievements');
    };

    const handleLeaderboard = () => {
        playSfx('tile_select');
        navigation.navigate('Leaderboard');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
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

                {/* Climate Clock at top */}
                <View style={styles.climateClockSection}>
                    <ClimateClock />
                </View>

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* Earth image section with slow rotation */}
                <View style={styles.earthSection}>
                    <Animated.Image
                        source={earthImage}
                        style={[
                            styles.earthImage,
                            { transform: [{ rotate: earthRotation }] }
                        ]}
                        resizeMode="contain"
                    />
                </View>

                {/* Title section */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>MatchWell</Text>
                    <Text style={styles.subtitle}>{t('menu.tagline')}</Text>
                </View>

                {/* Primary buttons: Story Mode, Endless Mode, and Multiplayer */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.primaryButton} onPress={handlePlay} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="book-open-variant" size={20} color="#ffffff" style={{ marginRight: SPACING.sm }} />
                        <Text style={styles.primaryButtonText}>{t('menu.storyMode')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleEndless} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="infinity" size={20} color="#ffffff" style={{ marginRight: SPACING.sm }} />
                        <Text style={styles.primaryButtonText}>{t('menu.endlessMode')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleMultiplayer} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="account-group" size={20} color="#ffffff" style={{ marginRight: SPACING.sm }} />
                        <Text style={styles.primaryButtonText}>{t('menu.multiplayer')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Secondary buttons: Achievements, Leaderboard, Settings */}
                <View style={styles.secondaryButtonContainer}>
                    <TouchableOpacity style={styles.tertiaryButton} onPress={handleAchievements} activeOpacity={0.7}>
                        <View style={styles.tertiaryButtonContent}>
                            <MedalIcon size={16} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.tertiaryButtonText}>{t('menu.achievements')}</Text>
                            {unseenAchievements.length > 0 && (
                                <View style={styles.redDot} />
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tertiaryButton} onPress={handleLeaderboard} activeOpacity={0.7}>
                        <View style={styles.tertiaryButtonContent}>
                            <TrophyIcon size={16} color="#FFD700" />
                            <Text style={styles.tertiaryButtonText}>{t('leaderboard.title')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tertiaryButton} onPress={handleSettings} activeOpacity={0.7}>
                        <View style={styles.tertiaryButtonContent}>
                            <SettingsIcon size={16} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.tertiaryButtonText}>{t('menu.settings')}</Text>
                        </View>
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
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030303', // Space black
    },
    scrollContent: {
        flexGrow: 1,
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
    climateClockSection: {
        marginTop: SPACING.sm,
    },
    spacer: {
        flex: 0.3,
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
        fontFamily: TYPOGRAPHY.fontFamilyBlack,
        color: '#ffffff',
        marginBottom: SPACING.xs,
        letterSpacing: 2,
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
    // Primary buttons: Story Mode, Endless Mode
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xxl * 2,
        borderRadius: RADIUS.round,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: TYPOGRAPHY.medium,
        color: '#ffffff',
    },
    // Container for secondary buttons (Achievements, Leaderboard, Settings)
    secondaryButtonContainer: {
        width: '100%',
        marginTop: SPACING.lg,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    // Tertiary buttons: smaller, equal width
    tertiaryButton: {
        flex: 1,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: RADIUS.lg,
        alignItems: 'center',
    },
    tertiaryButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
    },
    tertiaryButtonText: {
        fontSize: TYPOGRAPHY.tiny,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    // Legacy styles kept for compatibility
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
    achievementButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        marginLeft: SPACING.sm,
    },
    leaderboardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    leaderboardButtonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#FFD700',
    },
});

export default MainMenu;
