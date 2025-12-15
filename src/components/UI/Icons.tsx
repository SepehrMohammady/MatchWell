// Common SVG Icons for MatchWell
import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

// Pause Icon
export const PauseIcon: React.FC<IconProps> = ({ size = 24, color = '#2C3E2D' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="6" y="5" width="4" height="14" rx="1" fill={color} />
        <Rect x="14" y="5" width="4" height="14" rx="1" fill={color} />
    </Svg>
);

// Lock Icon
export const LockIcon: React.FC<IconProps> = ({ size = 24, color = '#9BA99C' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="10" width="14" height="11" rx="2" fill={color} />
        <Path
            d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10"
            stroke={color}
            strokeWidth="2"
            fill="none"
        />
    </Svg>
);

// Star Icon (for ratings)
export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({
    size = 24,
    color = '#F5A623',
    filled = true
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 2L14.9 8.6L22 9.3L17 14.1L18.2 21.2L12 17.8L5.8 21.2L7 14.1L2 9.3L9.1 8.6L12 2Z"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
    </Svg>
);

// Earth Icon
export const EarthIcon: React.FC<IconProps> = ({ size = 64, color = '#6DBE45' }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Circle cx="32" cy="32" r="28" fill="#E8EDE7" stroke={color} strokeWidth="2" />
        <Path
            d="M20 20C24 18 30 22 32 28C34 34 28 40 22 42C16 44 12 38 14 32C16 26 16 22 20 20Z"
            fill={color}
            opacity="0.6"
        />
        <Path
            d="M38 16C42 18 46 24 44 30C42 36 36 36 38 40C40 44 46 44 48 38C50 32 48 22 42 18C38 15 34 14 38 16Z"
            fill={color}
            opacity="0.4"
        />
    </Svg>
);

// Leaf/Seedling Icon (for animations)
export const SeedlingIcon: React.FC<IconProps & { stage?: number }> = ({
    size = 32,
    color = '#6DBE45',
    stage = 1 // 0 = seed, 1 = sprout, 2 = small plant, 3 = tree
}) => {
    if (stage === 0) {
        // Seed
        return (
            <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
                <Circle cx="16" cy="22" r="6" fill="#D9CAB3" />
            </Svg>
        );
    }
    if (stage === 1) {
        // Sprout
        return (
            <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
                <Circle cx="16" cy="26" r="4" fill="#D9CAB3" />
                <Path d="M16 22V16" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <Path d="M16 16C16 14 18 12 20 12" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            </Svg>
        );
    }
    if (stage === 2) {
        // Small plant
        return (
            <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
                <Circle cx="16" cy="28" r="3" fill="#D9CAB3" />
                <Path d="M16 25V12" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <Path d="M16 18C14 16 10 16 10 14" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
                <Path d="M16 14C18 12 22 12 22 10" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
            </Svg>
        );
    }
    // Tree (stage 3+)
    return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Rect x="14" y="20" width="4" height="10" fill="#D9CAB3" />
            <Circle cx="16" cy="12" r="10" fill={color} />
        </Svg>
    );
};

export default {
    PauseIcon,
    LockIcon,
    StarIcon,
    EarthIcon,
    SeedlingIcon,
};
