// MatchWell Theme Configuration
// Earth-inspired minimal design language

export const COLORS = {
    // Earth Palette - Primary Colors
    backgroundPrimary: '#F0F4EF',      // Soft sage white
    backgroundSecondary: '#E8EDE7',    // Slightly darker sage
    backgroundDark: '#2C3E2D',         // Dark forest (for contrast sections)

    // Tile Colors
    organicWaste: '#6DBE45',           // Fresh green
    paper: '#D9CAB3',                  // Warm beige
    plastic: '#4A90E2',                // Calm blue
    glass: '#7AD1C7',                  // Soft teal
    metal: '#8E8E93',                  // Neutral gray

    // Accent Colors
    accentHighlight: '#F5A623',        // Warm amber
    accentSuccess: '#6DBE45',          // Same as organic (success = eco)
    accentWarning: '#E67E22',          // Orange warning
    accentDanger: '#E74C3C',           // Red danger

    // Text Colors
    textPrimary: '#2C3E2D',            // Dark forest
    textSecondary: '#6B7B6C',          // Muted forest
    textLight: '#FFFFFF',              // White for dark backgrounds
    textMuted: '#9BA99C',              // Very muted green-gray

    // UI Elements
    cardBackground: '#FFFFFF',
    cardBorder: '#E0E5DF',
    shadowColor: 'rgba(44, 62, 45, 0.1)',
    overlay: 'rgba(44, 62, 45, 0.7)',

    // Progress States
    progressEmpty: '#E0E5DF',
    progressFill: '#6DBE45',

    // Star Colors
    starFilled: '#F5A623',
    starEmpty: '#D0D5CF',
};

export const TYPOGRAPHY = {
    fontFamily: 'Nunito-Regular',
    fontFamilyMedium: 'Nunito-Medium',
    fontFamilySemiBold: 'Nunito-SemiBold',
    fontFamilyBold: 'Nunito-Bold',
    fontFamilyExtraBold: 'Nunito-ExtraBold',
    fontFamilyBlack: 'Nunito-Black',

    // Font Sizes
    h1: 32,
    h2: 24,
    h3: 20,
    h4: 18,
    body: 16,
    bodySmall: 14,
    caption: 12,
    tiny: 10,

    // Font Weights
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 999,
};

export const SHADOWS = {
    sm: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: COLORS.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 8,
    },
};

// Tile configuration for the new design
export const TILE_COLORS = {
    'trash-sorting': {
        organic: COLORS.organicWaste,
        paper: COLORS.paper,
        plastic: COLORS.plastic,
        glass: COLORS.glass,
        metal: COLORS.metal,
    },
    'pollution': {
        cloud: '#87CEEB',
        factory: '#8E8E93',
        tree: COLORS.organicWaste,
        wind: '#7AD1C7',
        solar: COLORS.accentHighlight,
    },
    'water-conservation': {
        droplet: COLORS.plastic,
        faucet: '#8E8E93',
        plant: COLORS.organicWaste,
        rain: '#7AD1C7',
        bucket: '#D9CAB3',
    },
    'energy-efficiency': {
        bulb: COLORS.accentHighlight,
        solar: '#FFD93D',
        wind: '#7AD1C7',
        plug: '#8E8E93',
        battery: COLORS.organicWaste,
    },
    'deforestation': {
        tree: COLORS.organicWaste,
        seedling: '#90EE90',
        axe: '#8E8E93',
        bird: '#7AD1C7',
        leaf: '#6DBE45',
    },
};

export default {
    COLORS,
    TYPOGRAPHY,
    SPACING,
    RADIUS,
    SHADOWS,
    TILE_COLORS,
};
