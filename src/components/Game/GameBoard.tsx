// Game Board Component - Renders the 8x8 grid of tiles
import React, { useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useGameStore } from '../../context/GameStore';
import TileComponent, { BOARD_PADDING, TILE_SIZE, TILE_MARGIN, GRID_DIMENSION } from './Tile';
import { Position } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GameBoard: React.FC = () => {
    const grid = useGameStore((state) => state.grid);
    const selectedTile = useGameStore((state) => state.selectedTile);
    const selectTile = useGameStore((state) => state.selectTile);

    const handleTilePress = useCallback((position: Position) => {
        selectTile(position);
    }, [selectTile]);

    const isSelected = useCallback((row: number, col: number): boolean => {
        return selectedTile?.row === row && selectedTile?.col === col;
    }, [selectedTile]);

    if (!grid || grid.length === 0) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.board}>
                {grid.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.row}>
                        {row.map((tile, colIndex) => {
                            if (!tile) return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.emptyTile} />;

                            return (
                                <TileComponent
                                    key={tile.id}
                                    tile={tile}
                                    isSelected={isSelected(rowIndex, colIndex)}
                                    onPress={handleTilePress}
                                />
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: BOARD_PADDING,
    },
    board: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 12,
        padding: 8,
        // Add border for game board frame
        borderWidth: 4,
        borderColor: '#4a4a4a',
    },
    row: {
        flexDirection: 'row',
    },
    emptyTile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        margin: TILE_MARGIN,
    },
});

export default GameBoard;
