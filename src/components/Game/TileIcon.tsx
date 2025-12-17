// Material Icon Tile Component for MatchWell
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../config/theme';

interface TileIconProps {
    type: string;
    size?: number;
    color?: string;
}

// Complete Material Icon mapping for all 25 tile types across 5 themes
const TILE_ICON_MAP: Record<string, { icon: string; color: string }> = {
    // Theme 1: Trash Sorting
    plastic: { icon: 'spray-bottle', color: '#4A90E2' },
    paper: { icon: 'file-document-outline', color: '#D9CAB3' },
    glass: { icon: 'glass-fragile', color: '#7AD1C7' },
    metal: { icon: 'screw-flat-top', color: '#8E8E93' },
    organic: { icon: 'food-apple', color: '#6DBE45' },

    // Theme 2: Clear the Air (Pollution)
    car: { icon: 'car-side', color: '#E74C3C' },
    truck: { icon: 'truck', color: '#34495E' },
    bus: { icon: 'bus-side', color: '#F1C40F' },
    motorbike: { icon: 'atv', color: '#2C3E50' },
    airplane: { icon: 'airplane', color: '#2ECC71' },

    // Theme 3: Water Conservation
    droplet: { icon: 'water', color: '#3498DB' },
    faucet: { icon: 'faucet', color: '#7F8C8D' },
    shower: { icon: 'shower-head', color: '#1ABC9C' },
    ocean: { icon: 'waves', color: '#0077BE' },
    washing: { icon: 'washing-machine', color: '#2980B9' },

    // Theme 4: Energy Efficiency
    bulb: { icon: 'lightbulb-on-outline', color: '#F1C40F' },
    solar: { icon: 'white-balance-sunny', color: '#E67E22' },
    wind: { icon: 'wind-turbine', color: '#3498DB' },
    plug: { icon: 'power-plug', color: '#2C3E50' },
    battery: { icon: 'battery-charging', color: '#27AE60' },

    // Theme 5: Save the Forests
    tree: { icon: 'pine-tree', color: '#27AE60' },
    leaf: { icon: 'leaf', color: '#2ECC71' },
    seedling: { icon: 'sprout-outline', color: '#90EE90' },
    forest: { icon: 'forest', color: '#228B22' },
    grass: { icon: 'grass', color: '#8B4513' },

    // Default/empty
    empty: { icon: 'circle-outline', color: 'transparent' },
};

export const TileIcon: React.FC<TileIconProps> = ({ type, size = 28, color }) => {
    const iconInfo = TILE_ICON_MAP[type] || TILE_ICON_MAP.empty;
    // Use white with slight transparency for visibility on colored backgrounds
    const iconColor = color || 'rgba(255, 255, 255, 0.9)';

    return (
        <MaterialCommunityIcons
            name={iconInfo.icon}
            size={size}
            color={iconColor}
        />
    );
};

// Export icon map for use elsewhere
export const getTileIconName = (type: string): string => {
    return TILE_ICON_MAP[type]?.icon || 'circle-outline';
};

export const getTileIconColor = (type: string): string => {
    return TILE_ICON_MAP[type]?.color || COLORS.textSecondary;
};

export default TileIcon;
