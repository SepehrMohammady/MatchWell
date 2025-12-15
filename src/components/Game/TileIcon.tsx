// SVG Tile Icons for MatchWell
import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, G } from 'react-native-svg';
import { COLORS } from '../../config/theme';

interface TileIconProps {
    size?: number;
    type: string;
    theme?: string;
}

// Organic/Leaf Icon
const OrganicIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Path
            d="M20 8C12 8 8 16 8 24C8 28 12 32 20 32C28 32 32 24 24 16C28 20 26 28 20 28C14 28 12 24 14 18C16 12 20 8 20 8Z"
            fill={color}
        />
        <Path
            d="M20 16V28"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
        />
    </Svg>
);

// Paper/Document Icon
const PaperIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Path
            d="M10 8H24L30 14V32H10V8Z"
            fill={color}
        />
        <Path
            d="M24 8V14H30"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
            fill="none"
        />
        <Rect x="14" y="18" width="12" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
        <Rect x="14" y="23" width="8" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
    </Svg>
);

// Plastic/Bottle Icon
const PlasticIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Rect x="16" y="4" width="8" height="4" rx="1" fill={color} />
        <Path
            d="M14 8H26L28 14V34C28 35 27 36 26 36H14C13 36 12 35 12 34V14L14 8Z"
            fill={color}
        />
        <Ellipse cx="20" cy="22" rx="4" ry="6" fill="rgba(255,255,255,0.2)" />
    </Svg>
);

// Glass/Jar Icon
const GlassIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Rect x="10" y="4" width="20" height="4" rx="1" fill={color} opacity="0.8" />
        <Path
            d="M12 8H28V34C28 35 27 36 26 36H14C13 36 12 35 12 34V8Z"
            fill={color}
            opacity="0.6"
        />
        <Path
            d="M16 12V28"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </Svg>
);

// Metal/Can Icon
const MetalIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Ellipse cx="20" cy="8" rx="10" ry="4" fill={color} />
        <Path
            d="M10 8V32C10 34.2 14.5 36 20 36C25.5 36 30 34.2 30 32V8"
            fill={color}
        />
        <Ellipse cx="20" cy="32" rx="10" ry="4" fill={color} opacity="0.8" />
        <Path
            d="M12 16H28"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
        />
        <Path
            d="M12 24H28"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
        />
    </Svg>
);

// Tile color mapping
const TILE_COLORS: Record<string, string> = {
    organic: COLORS.organicWaste,
    paper: COLORS.paper,
    plastic: COLORS.plastic,
    glass: COLORS.glass,
    metal: COLORS.metal,
    // Pollution theme
    cloud: '#87CEEB',
    factory: COLORS.metal,
    tree: COLORS.organicWaste,
    wind: COLORS.glass,
    solar: COLORS.accentHighlight,
    // Water conservation
    droplet: COLORS.plastic,
    faucet: COLORS.metal,
    plant: COLORS.organicWaste,
    rain: COLORS.glass,
    bucket: COLORS.paper,
    // Energy efficiency
    bulb: COLORS.accentHighlight,
    plug: COLORS.metal,
    battery: COLORS.organicWaste,
    // Deforestation
    seedling: '#90EE90',
    axe: COLORS.metal,
    bird: COLORS.glass,
    leaf: COLORS.organicWaste,
};

// Main TileIcon component
export const TileIcon: React.FC<TileIconProps> = ({ size = 36, type }) => {
    const color = TILE_COLORS[type] || COLORS.textSecondary;

    switch (type) {
        case 'organic':
        case 'tree':
        case 'plant':
        case 'leaf':
            return <OrganicIcon size={size} color={color} />;
        case 'paper':
        case 'bucket':
            return <PaperIcon size={size} color={color} />;
        case 'plastic':
        case 'droplet':
        case 'rain':
            return <PlasticIcon size={size} color={color} />;
        case 'glass':
        case 'cloud':
        case 'wind':
        case 'bird':
            return <GlassIcon size={size} color={color} />;
        case 'metal':
        case 'factory':
        case 'faucet':
        case 'axe':
        case 'plug':
            return <MetalIcon size={size} color={color} />;
        case 'solar':
        case 'bulb':
            return (
                <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                    <Circle cx="20" cy="18" r="10" fill={color} />
                    <Rect x="16" y="28" width="8" height="4" rx="1" fill={color} opacity="0.7" />
                    <Rect x="17" y="32" width="6" height="2" rx="1" fill={color} opacity="0.5" />
                </Svg>
            );
        case 'seedling':
            return (
                <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                    <Path d="M20 36V20" stroke={color} strokeWidth="2" strokeLinecap="round" />
                    <Path d="M20 24C16 20 10 20 10 16C14 16 18 18 20 24Z" fill={color} />
                    <Path d="M20 18C24 14 30 14 30 10C26 10 22 12 20 18Z" fill={color} opacity="0.7" />
                </Svg>
            );
        case 'battery':
            return (
                <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                    <Rect x="8" y="12" width="24" height="16" rx="2" fill={color} />
                    <Rect x="32" y="18" width="4" height="6" rx="1" fill={color} />
                    <Rect x="12" y="16" width="8" height="8" fill="rgba(255,255,255,0.3)" />
                </Svg>
            );
        default:
            // Default circular icon
            return (
                <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
                    <Circle cx="20" cy="20" r="14" fill={color} />
                </Svg>
            );
    }
};

export default TileIcon;
