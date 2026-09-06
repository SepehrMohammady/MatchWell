// Game Board Component - Renders the 8x8 grid of tiles with swipe support
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, AccessibilityInfo } from 'react-native';
import { useGameStore } from '../../context/GameStore';
import TileComponent, { BOARD_PADDING, TILE_SIZE, TILE_MARGIN, GRID_DIMENSION, SwipeDirection } from './Tile';
import { Position } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GameBoard: React.FC = () => {
    const grid = useGameStore((state) => state.grid);
    const selectedTile = useGameStore((state) => state.selectedTile);
    const selectTile = useGameStore((state) => state.selectTile);
    const swapWithDirection = useGameStore((state) => state.swapWithDirection);
    const isPowerUpActive = useGameStore((state) => state.isPowerUpActive);
    const usePowerUpOnBlock = useGameStore((state) => state.usePowerUpOnBlock);
    const cancelPowerUp = useGameStore((state) => state.cancelPowerUp);

    const gridSize = grid.length;

    // One shared pulse drives the board frame and every targetable tile, so the
    // orange outline blinks in sync and costs a single native-driven animation.
    const pulse = useRef(new Animated.Value(1)).current;
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        let alive = true;
        AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
            if (alive) setReduceMotion(enabled);
        });
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => {
            alive = false;
            sub?.remove?.();
        };
    }, []);

    useEffect(() => {
        // A steady pulse rather than a hard on/off blink: it draws the eye without
        // strobing. Held solid when the system asks for reduced motion.
        if (!isPowerUpActive || reduceMotion) {
            pulse.setValue(1);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.25,
                    duration: 550,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 550,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => {
            loop.stop();
            pulse.setValue(1);
        };
    }, [isPowerUpActive, reduceMotion, pulse]);

    // Check if a position is a border block
    const isBorderBlock = useCallback((row: number, col: number): boolean => {
        return row === 0 || row === gridSize - 1 || col === 0 || col === gridSize - 1;
    }, [gridSize]);

    const handleTilePress = useCallback((position: Position) => {
        // Get fresh state to avoid stale closure issues
        const currentIsPowerUpActive = useGameStore.getState().isPowerUpActive;
        console.log('🖱️ Tile pressed:', { position, currentIsPowerUpActive, gridSize });
        if (currentIsPowerUpActive) {
            // In power-up mode, only border blocks are valid targets
            const isBorder = isBorderBlock(position.row, position.col);
            console.log('🎯 Is border block?', isBorder);
            if (isBorder) {
                usePowerUpOnBlock(position);
            } else {
                // Clicked non-border block, cancel power-up
                cancelPowerUp();
            }
        } else {
            selectTile(position);
        }
    }, [selectTile, isBorderBlock, usePowerUpOnBlock, cancelPowerUp, gridSize]);

    const handleTileSwipe = useCallback((position: Position, direction: SwipeDirection) => {
        // Get fresh state to avoid stale closure issues  
        const currentIsPowerUpActive = useGameStore.getState().isPowerUpActive;
        if (currentIsPowerUpActive) return; // Disable swipe in power-up mode
        if (!direction) return;
        swapWithDirection(position, direction);
    }, [swapWithDirection]);

    const isSelected = useCallback((row: number, col: number): boolean => {
        return selectedTile?.row === row && selectedTile?.col === col;
    }, [selectedTile]);

    if (!grid || grid.length === 0) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.board}>
                {isPowerUpActive && (
                    <Animated.View
                        pointerEvents="none"
                        style={[styles.boardPulseRing, { opacity: pulse }]}
                    />
                )}
                {grid.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.row}>
                        {row.map((tile, colIndex) => {
                            if (!tile) {
                                return (
                                    <View
                                        key={`empty-${rowIndex}-${colIndex}`}
                                        style={styles.emptyTile}
                                    />
                                );
                            }

                            const isBorder = isBorderBlock(rowIndex, colIndex);
                            const isCorner = (rowIndex === 0 || rowIndex === gridSize - 1) &&
                                (colIndex === 0 || colIndex === gridSize - 1);
                            const powerProgress = useGameStore.getState().powerProgress;
                            // Only highlight corners if at 15+ power
                            const canTarget = isBorder && (!isCorner || powerProgress >= 15);

                            return (
                                <TileComponent
                                    key={tile.id}
                                    tile={tile}
                                    isSelected={isSelected(rowIndex, colIndex)}
                                    onPress={handleTilePress}
                                    onSwipe={handleTileSwipe}
                                    isPowerUpTarget={isPowerUpActive && canTarget}
                                    pulse={pulse}
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
        direction: 'ltr',
    },
    row: {
        flexDirection: 'row',
        direction: 'ltr', // Force LTR to prevent RTL hitbox misalignment
    },
    emptyTile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        margin: TILE_MARGIN,
    },
    // Sits exactly over the board's own 4px frame and pulses orange while the
    // power-up is armed.
    boardPulseRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderWidth: 4,
        borderColor: '#FFA726',
        borderRadius: 12,
        zIndex: 2,
    },
});

export default GameBoard;
