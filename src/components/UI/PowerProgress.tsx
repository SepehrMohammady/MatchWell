// Power-up Progress Bar Component
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useGameStore } from '../../context/GameStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import { ThemeType } from '../../types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Use Earth icon for all story mode power-ups
const POWER_ICON = { name: 'earth', color: '#FF5722' }; // Orange-red Earth

interface PowerProgressProps {
    theme: ThemeType;
    onActivate: () => void;
}

const PowerProgress: React.FC<PowerProgressProps> = ({ theme, onActivate }) => {
    const powerProgress = useGameStore((state) => state.powerProgress);
    const isPowerUpActive = useGameStore((state) => state.isPowerUpActive);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const flashAnim = useRef(new Animated.Value(1)).current;

    const isReady = powerProgress >= 10;
    const isMaxPower = powerProgress >= 15;

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: powerProgress / 15, // 15 is max
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [powerProgress, progressAnim]);

    // Glow animation when ready
    useEffect(() => {
        if (isReady) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: false,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            glowAnim.setValue(0);
        }
    }, [isReady, glowAnim]);

    // Flash animation when at max power
    useEffect(() => {
        if (isMaxPower) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(flashAnim, {
                        toValue: 0.3,
                        duration: 300,
                        useNativeDriver: false,
                    }),
                    Animated.timing(flashAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        } else {
            flashAnim.setValue(1);
        }
    }, [isMaxPower, flashAnim]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
    });

    // Level 1 threshold (10 points) = 66.7% of max (15)
    const level1Position = (10 / 15) * 100;

    return (
        <View style={styles.container}>
            <View style={styles.progressContainer}>
                {/* Progress bar track */}
                <View style={styles.progressTrack}>
                    {/* Level 1 threshold marker */}
                    <View style={[styles.thresholdMarker, { left: `${level1Position}%` }]} />

                    {/* Progress fill */}
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressWidth,
                                backgroundColor: isMaxPower ? '#FF1744' : (isReady ? '#FF5722' : '#666'),
                            }
                        ]}
                    />

                    {/* Glow effect */}
                    {isReady && (
                        <Animated.View
                            style={[
                                styles.glowEffect,
                                { opacity: glowOpacity }
                            ]}
                        />
                    )}
                </View>
            </View>

            {/* Power-up icon button */}
            <TouchableOpacity
                style={[
                    styles.iconButton,
                    isReady && styles.iconButtonReady,
                    isPowerUpActive && styles.iconButtonActive,
                ]}
                onPress={isReady ? onActivate : undefined}
                disabled={!isReady}
                activeOpacity={isReady ? 0.7 : 1}
            >
                <Animated.View style={{ opacity: isMaxPower ? flashAnim : 1 }}>
                    <MaterialCommunityIcons
                        name={POWER_ICON.name}
                        size={20}
                        color={isReady ? POWER_ICON.color : '#666'}
                    />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        gap: SPACING.sm,
    },
    progressContainer: {
        flex: 1,
    },
    progressTrack: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    thresholdMarker: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        zIndex: 1,
    },
    glowEffect: {
        position: 'absolute',
        top: -4,
        left: 0,
        right: 0,
        bottom: -4,
        backgroundColor: '#FF5722',
        borderRadius: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconButtonReady: {
        backgroundColor: 'rgba(255, 87, 34, 0.2)',
        borderColor: '#FF5722',
    },
    iconButtonActive: {
        backgroundColor: '#FF5722',
        borderColor: '#E64A19',
    },
});

export default PowerProgress;
