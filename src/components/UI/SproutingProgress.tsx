// Sprouting Progress Animation Component
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { COLORS, SPACING } from '../../config/theme';

interface SproutingProgressProps {
    progress: number; // 0 to 100
    width?: number;
    height?: number;
}

// Animated SVG components
const AnimatedG = Animated.createAnimatedComponent(G);

const SproutingProgress: React.FC<SproutingProgressProps> = ({
    progress,
    width = 300,
    height = 48,
}) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(1)).current;

    // Determine growth stage (0-3)
    const stage = progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : 3;

    useEffect(() => {
        // Animate scale based on progress
        Animated.spring(scaleAnim, {
            toValue: progress / 100,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Bounce animation when stage changes
        Animated.sequence([
            Animated.timing(bounceAnim, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.spring(bounceAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
        ]).start();
    }, [stage, progress]);

    const progressWidth = (progress / 100) * (width - 48);

    return (
        <View style={[styles.container, { width, height }]}>
            {/* Progress bar background */}
            <View style={[styles.progressBg, { width: width - 48 }]}>
                {/* Progress fill */}
                <View
                    style={[
                        styles.progressFill,
                        { width: progressWidth },
                    ]}
                />
            </View>

            {/* Sprouting plant SVG */}
            <View style={styles.plantContainer}>
                <Svg width={40} height={40} viewBox="0 0 40 40">
                    {/* Soil/Ground */}
                    <Path
                        d="M5 35C5 32 10 30 20 30C30 30 35 32 35 35C35 38 30 38 20 38C10 38 5 38 5 35Z"
                        fill={COLORS.paper}
                    />

                    {stage === 0 && (
                        /* Seed */
                        <Circle cx="20" cy="30" r="4" fill={COLORS.paper} />
                    )}

                    {stage >= 1 && (
                        /* Stem */
                        <Path
                            d={stage === 1 ? "M20 30V24" : stage === 2 ? "M20 30V18" : "M20 30V10"}
                            stroke={COLORS.organicWaste}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                    )}

                    {stage >= 1 && (
                        /* First leaf (right) */
                        <Path
                            d={stage === 1
                                ? "M20 26C22 24 26 24 26 22"
                                : "M20 22C24 18 30 18 30 14"}
                            stroke={COLORS.organicWaste}
                            strokeWidth="2"
                            strokeLinecap="round"
                            fill="none"
                        />
                    )}

                    {stage >= 2 && (
                        /* Second leaf (left) */
                        <Path
                            d="M20 18C16 14 10 14 10 10"
                            stroke={COLORS.organicWaste}
                            strokeWidth="2"
                            strokeLinecap="round"
                            fill="none"
                        />
                    )}

                    {stage >= 3 && (
                        /* Tree crown */
                        <>
                            <Circle cx="20" cy="8" r="8" fill={COLORS.organicWaste} opacity="0.9" />
                            <Circle cx="14" cy="12" r="5" fill={COLORS.organicWaste} opacity="0.7" />
                            <Circle cx="26" cy="12" r="5" fill={COLORS.organicWaste} opacity="0.7" />
                        </>
                    )}
                </Svg>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
    },
    progressBg: {
        height: 6,
        backgroundColor: COLORS.progressEmpty,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.progressFill,
        borderRadius: 3,
    },
    plantContainer: {
        marginLeft: SPACING.xs,
    },
});

export default SproutingProgress;
