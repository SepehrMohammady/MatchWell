// Theme-specific Progress Animation Component
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, ClipPath } from 'react-native-svg';
import { ThemeType } from '../../types';
import { COLORS, SPACING } from '../../config/theme';

interface ThemeProgressProps {
    progress: number; // 0 to 100
    theme: ThemeType;
    width?: number;
    height?: number;
}

// Theme colors for progress bars
const THEME_COLORS: Record<ThemeType, { primary: string; secondary: string; bg: string }> = {
    'trash-sorting': { primary: '#4CAF50', secondary: '#8BC34A', bg: '#E8F5E9' },
    'pollution': { primary: '#2196F3', secondary: '#64B5F6', bg: '#E3F2FD' },
    'water-conservation': { primary: '#00BCD4', secondary: '#4DD0E1', bg: '#E0F7FA' },
    'energy-efficiency': { primary: '#FFC107', secondary: '#FFD54F', bg: '#FFF8E1' },
    'deforestation': { primary: '#4CAF50', secondary: '#81C784', bg: '#E8F5E9' },
};

const ThemeProgress: React.FC<ThemeProgressProps> = ({
    progress,
    theme,
    width = 300,
    height = 48,
}) => {
    const colors = THEME_COLORS[theme];
    const progressWidth = (progress / 100) * (width - 48);
    const stage = progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : 3;

    const renderThemeIcon = () => {
        switch (theme) {
            case 'trash-sorting':
                return renderTrashIcon(stage, colors);
            case 'pollution':
                return renderAirIcon(stage, colors);
            case 'water-conservation':
                return renderWaterIcon(stage, colors);
            case 'energy-efficiency':
                return renderEnergyIcon(stage, colors);
            case 'deforestation':
            default:
                return renderForestIcon(stage, colors);
        }
    };

    return (
        <View style={[styles.container, { width, height }]}>
            {/* Progress bar background */}
            <View style={[styles.progressBg, { width: width - 48, backgroundColor: colors.bg }]}>
                {/* Progress fill */}
                <View
                    style={[
                        styles.progressFill,
                        { width: progressWidth, backgroundColor: colors.primary },
                    ]}
                />
            </View>

            {/* Theme-specific icon */}
            <View style={styles.iconContainer}>
                <Svg width={40} height={40} viewBox="0 0 40 40">
                    {renderThemeIcon()}
                </Svg>
            </View>
        </View>
    );
};

// Trash: Recycling bin filling up
const renderTrashIcon = (stage: number, colors: { primary: string; secondary: string; bg: string }) => (
    <>
        {/* Bin body */}
        <Path
            d="M10 14H30V36C30 37 29 38 28 38H12C11 38 10 37 10 36V14Z"
            fill={colors.bg}
            stroke={colors.primary}
            strokeWidth="2"
        />
        {/* Bin lid */}
        <Path
            d="M8 12H32V14H8V12Z"
            fill={colors.primary}
        />
        <Path
            d="M16 10H24V12H16V10Z"
            fill={colors.primary}
        />
        {/* Recycling symbol */}
        {stage >= 1 && (
            <Path
                d="M20 20L23 24H17L20 20ZM17 26L20 30L23 26H17ZM14 24L17 20V28L14 24ZM26 24L23 20V28L26 24Z"
                fill={colors.secondary}
            />
        )}
        {/* Fill level based on stage */}
        <Rect
            x="11"
            y={38 - (stage + 1) * 6}
            width="18"
            height={(stage + 1) * 6}
            fill={colors.secondary}
            opacity="0.5"
        />
    </>
);

// Air: Sky clearing from smog
const renderAirIcon = (stage: number, colors: { primary: string; secondary: string; bg: string }) => (
    <>
        {/* Sun */}
        <Circle
            cx="20"
            cy="20"
            r={6 + stage * 2}
            fill="#FFD54F"
            opacity={0.3 + stage * 0.2}
        />
        <Circle
            cx="20"
            cy="20"
            r="5"
            fill="#FFC107"
        />
        {/* Sun rays based on stage */}
        {stage >= 1 && (
            <>
                <Path d="M20 8V12" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
                <Path d="M20 28V32" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
            </>
        )}
        {stage >= 2 && (
            <>
                <Path d="M8 20H12" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
                <Path d="M28 20H32" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
            </>
        )}
        {stage >= 3 && (
            <>
                <Path d="M11 11L14 14" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
                <Path d="M26 26L29 29" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
                <Path d="M11 29L14 26" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
                <Path d="M26 14L29 11" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
            </>
        )}
        {/* Smog clouds (fade out as stage increases) */}
        {stage < 3 && (
            <Circle cx="12" cy="32" r="4" fill="#9E9E9E" opacity={0.5 - stage * 0.15} />
        )}
        {stage < 2 && (
            <Circle cx="28" cy="34" r="3" fill="#9E9E9E" opacity={0.5 - stage * 0.2} />
        )}
    </>
);

// Water: Droplet filling up
const renderWaterIcon = (stage: number, colors: { primary: string; secondary: string; bg: string }) => (
    <>
        {/* Droplet outline */}
        <Path
            d="M20 4C20 4 8 18 8 26C8 32.6 13.4 38 20 38C26.6 38 32 32.6 32 26C32 18 20 4 20 4Z"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
        />
        {/* Water fill based on stage */}
        <Defs>
            <ClipPath id="dropClip">
                <Path d="M20 4C20 4 8 18 8 26C8 32.6 13.4 38 20 38C26.6 38 32 32.6 32 26C32 18 20 4 20 4Z" />
            </ClipPath>
        </Defs>
        <Rect
            x="8"
            y={38 - (stage + 1) * 8.5}
            width="24"
            height="34"
            fill={colors.primary}
            clipPath="url(#dropClip)"
            opacity="0.7"
        />
        {/* Sparkle when full */}
        {stage >= 3 && (
            <>
                <Circle cx="16" cy="20" r="2" fill="white" opacity="0.8" />
                <Circle cx="14" cy="24" r="1" fill="white" opacity="0.6" />
            </>
        )}
    </>
);

// Energy: Battery charging
const renderEnergyIcon = (stage: number, colors: { primary: string; secondary: string; bg: string }) => (
    <>
        {/* Battery body */}
        <Rect
            x="8"
            y="12"
            width="24"
            height="20"
            rx="2"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
        />
        {/* Battery terminal */}
        <Rect
            x="32"
            y="18"
            width="3"
            height="8"
            fill={colors.primary}
        />
        {/* Charge level bars */}
        {stage >= 0 && (
            <Rect x="11" y="15" width="4" height="14" fill={colors.secondary} opacity="0.8" />
        )}
        {stage >= 1 && (
            <Rect x="17" y="15" width="4" height="14" fill={colors.secondary} opacity="0.8" />
        )}
        {stage >= 2 && (
            <Rect x="23" y="15" width="4" height="14" fill={colors.secondary} opacity="0.8" />
        )}
        {/* Lightning bolt when full */}
        {stage >= 3 && (
            <Path
                d="M18 10L14 18H18L16 26L24 16H19L22 10H18Z"
                fill="#FFC107"
                stroke="#FF9800"
                strokeWidth="0.5"
            />
        )}
    </>
);

// Forest: Sprouting tree (existing design)
const renderForestIcon = (stage: number, colors: { primary: string; secondary: string; bg: string }) => (
    <>
        {/* Soil/Ground */}
        <Path
            d="M5 35C5 32 10 30 20 30C30 30 35 32 35 35C35 38 30 38 20 38C10 38 5 38 5 35Z"
            fill="#8D6E63"
        />
        {stage === 0 && (
            /* Seed */
            <Circle cx="20" cy="30" r="4" fill="#8D6E63" />
        )}
        {stage >= 1 && (
            /* Stem */
            <Path
                d={stage === 1 ? "M20 30V24" : stage === 2 ? "M20 30V18" : "M20 30V10"}
                stroke={colors.primary}
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
                stroke={colors.primary}
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
        )}
        {stage >= 2 && (
            /* Second leaf (left) */
            <Path
                d="M20 18C16 14 10 14 10 10"
                stroke={colors.primary}
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
        )}
        {stage >= 3 && (
            /* Tree crown */
            <>
                <Circle cx="20" cy="8" r="8" fill={colors.primary} opacity="0.9" />
                <Circle cx="14" cy="12" r="5" fill={colors.primary} opacity="0.7" />
                <Circle cx="26" cy="12" r="5" fill={colors.primary} opacity="0.7" />
            </>
        )}
    </>
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
    },
    progressBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    iconContainer: {
        marginLeft: SPACING.xs,
    },
});

export default ThemeProgress;
