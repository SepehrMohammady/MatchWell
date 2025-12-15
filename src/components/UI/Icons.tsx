// Common UI Icons using Material Community Icons
import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../config/theme';

interface IconProps {
    size?: number;
    color?: string;
}

// Pause Icon
export const PauseIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.textPrimary }) => (
    <MaterialCommunityIcons name="pause" size={size} color={color} />
);

// Play Icon
export const PlayIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.textPrimary }) => (
    <MaterialCommunityIcons name="play" size={size} color={color} />
);

// Lock Icon
export const LockIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.textMuted }) => (
    <MaterialCommunityIcons name="lock" size={size} color={color} />
);

// Star Icons
export const StarFilledIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.starFilled }) => (
    <MaterialCommunityIcons name="star" size={size} color={color} />
);

export const StarEmptyIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.starEmpty }) => (
    <MaterialCommunityIcons name="star-outline" size={size} color={color} />
);

// Earth Icon
export const EarthIcon: React.FC<IconProps> = ({ size = 64, color = COLORS.organicWaste }) => (
    <MaterialCommunityIcons name="earth" size={size} color={color} />
);

// Sprout/Seedling Icon
export const SeedlingIcon: React.FC<IconProps> = ({ size = 32, color = COLORS.organicWaste }) => (
    <MaterialCommunityIcons name="sprout" size={size} color={color} />
);

// Settings/Gear Icon
export const SettingsIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.textSecondary }) => (
    <MaterialCommunityIcons name="cog" size={size} color={color} />
);

// Back Arrow Icon
export const BackIcon: React.FC<IconProps> = ({ size = 24, color = COLORS.organicWaste }) => (
    <MaterialCommunityIcons name="arrow-left" size={size} color={color} />
);

// Theme icons for theme selection
export const getThemeIcon = (theme: string, size = 32, color?: string): React.ReactNode => {
    const iconMap: Record<string, { name: string; defaultColor: string }> = {
        'trash-sorting': { name: 'recycle', defaultColor: '#27AE60' },
        'pollution': { name: 'factory', defaultColor: '#708090' },
        'water-conservation': { name: 'water', defaultColor: '#3498DB' },
        'energy-efficiency': { name: 'flash', defaultColor: '#F5A623' },
        'deforestation': { name: 'pine-tree', defaultColor: '#228B22' },
    };

    const iconInfo = iconMap[theme] || { name: 'earth', defaultColor: COLORS.organicWaste };

    return (
        <MaterialCommunityIcons
            name={iconInfo.name}
            size={size}
            color={color || iconInfo.defaultColor}
        />
    );
};

export default {
    PauseIcon,
    PlayIcon,
    LockIcon,
    StarFilledIcon,
    StarEmptyIcon,
    EarthIcon,
    SeedlingIcon,
    SettingsIcon,
    BackIcon,
    getThemeIcon,
};
