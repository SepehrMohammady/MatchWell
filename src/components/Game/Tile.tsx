// Tile Component - Renders a single game tile
import React, { memo } from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
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

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: withSpring(isSelected ? 1.1 : 1, {
                        damping: 10,
                        stiffness: 150
                    })
                },
            ],
            opacity: withTiming(tile.isMatched ? 0 : 1, { duration: 200 }),
        };
    }, [isSelected, tile.isMatched]);

    const handlePress = () => {
        onPress(tile.position);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <Animated.View
                style={[
                    styles.tile,
                    { backgroundColor: tileInfo.color },
                    isSelected && styles.selectedTile,
                    animatedStyle,
                ]}
            >
                <Text style={styles.emoji}>{tileInfo.emoji}</Text>
            </Animated.View>
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
    },
    emoji: {
        fontSize: TILE_SIZE * 0.5,
        textAlign: 'center',
    },
});

export default TileComponent;

// Export dimensions for use elsewhere
export { TILE_SIZE, TILE_MARGIN, BOARD_PADDING, GRID_SIZE as GRID_DIMENSION };
