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
    plastic: { icon: 'bottle-soda-classic', color: '#4A90E2' },
    paper: { icon: 'file-document-outline', color: '#D9CAB3' },
    glass: { icon: 'cup-outline', color: '#7AD1C7' },
    metal: { icon: 'archive', color: '#8E8E93' },
    organic: { icon: 'food-apple', color: '#6DBE45' },

    // Theme 2: Clear the Air (Pollution)
    car: { icon: 'car', color: '#E74C3C' },
    truck: { icon: 'truck', color: '#34495E' },
    bus: { icon: 'bus', color: '#F1C40F' },
    factory: { icon: 'factory', color: '#2C3E50' },
    bicycle: { icon: 'bicycle', color: '#2ECC71' },

    // Theme 3: Water Conservation
    droplet: { icon: 'water', color: '#3498DB' },
    faucet: { icon: 'water-pump', color: '#7F8C8D' },
    shower: { icon: 'shower', color: '#1ABC9C' },
    bottle: { icon: 'cup-water', color: '#2980B9' },
    ocean: { icon: 'wave', color: '#0077BE' },

    // Theme 4: Energy Efficiency
    bulb: { icon: 'lightbulb-outline', color: '#F1C40F' },
    solar: { icon: 'solar-panel', color: '#E67E22' },
    wind: { icon: 'wind-turbine', color: '#3498DB' },
    plug: { icon: 'power-plug', color: '#2C3E50' },
    battery: { icon: 'battery-charging', color: '#27AE60' },

    // Theme 5: Save the Forests
    tree: { icon: 'pine-tree', color: '#27AE60' },
    axe: { icon: 'axe', color: '#8B4513' },
    leaf: { icon: 'leaf', color: '#2ECC71' },
    seedling: { icon: 'sprout', color: '#90EE90' },
    forest: { icon: 'forest', color: '#228B22' },

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
