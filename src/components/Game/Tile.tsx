// Tile Component - Renders a single game tile (Simplified without reanimated)
import React, { memo } from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
import { Tile as TileType, Position } from '../../types';
import { TILE_INFO } from '../../themes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 8;
const TILE_MARGIN = 2;
const BOARD_PADDING = 10;
const TILE_SIZE = (SCREEN_WIDTH - BOARD_PADDING * 2 - TILE_MARGIN * 2 * GRID_SIZE) / GRID_SIZE;

interface TileProps {
    tile: TileType;
    isSelected: boolean;
    onPress: (position: Position) => void;
}

const TileComponent: React.FC<TileProps> = memo(({ tile, isSelected, onPress }) => {
    const tileInfo = TILE_INFO[tile.type];

    const handlePress = () => {
        onPress(tile.position);
    };

    if (tile.isMatched) {
        return <View style={styles.emptyTile} />;
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <View
                style={[
                    styles.tile,
                    { backgroundColor: tileInfo.color },
                    isSelected && styles.selectedTile,
                ]}
            >
                <Text style={styles.emoji}>{tileInfo.emoji}</Text>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        margin: TILE_MARGIN,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        // Pixel art style border
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        // Shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    selectedTile: {
        borderColor: '#FFD700',
        borderWidth: 3,
        shadowColor: '#FFD700',
        shadowOpacity: 0.8,
        transform: [{ scale: 1.1 }],
    },
    emptyTile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        margin: TILE_MARGIN,
    },
    emoji: {
        fontSize: TILE_SIZE * 0.5,
        textAlign: 'center',
    },
});

export default TileComponent;

// Export dimensions for use elsewhere
export { TILE_SIZE, TILE_MARGIN, BOARD_PADDING, GRID_SIZE as GRID_DIMENSION };
