// Tile Component - Renders a single game tile with swipe support
import React, { memo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Tile as TileType, Position } from '../../types';
import { TILE_INFO } from '../../themes';
import { TileIcon } from './TileIcon';
import { COLORS, RADIUS } from '../../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_SIZE = 8;
const TILE_MARGIN = 2;
const BOARD_PADDING = 10;

// Calculate tile size based on both width and available height
// For height: subtract HUD (~160px) + fact card (~80px) + nav bar (~60px) + safe areas (~80px)
const TILE_SIZE_BY_WIDTH = (SCREEN_WIDTH - BOARD_PADDING * 2 - TILE_MARGIN * 2 * GRID_SIZE) / GRID_SIZE;
const AVAILABLE_HEIGHT_FOR_BOARD = SCREEN_HEIGHT - 380; // HUD + fact + nav + padding
const TILE_SIZE_BY_HEIGHT = (AVAILABLE_HEIGHT_FOR_BOARD - BOARD_PADDING * 2 - TILE_MARGIN * 2 * GRID_SIZE) / GRID_SIZE;

// Use the smaller of the two to ensure board fits in both dimensions
const TILE_SIZE = Math.min(TILE_SIZE_BY_WIDTH, TILE_SIZE_BY_HEIGHT);
const SWIPE_THRESHOLD = TILE_SIZE * 0.3; // Minimum distance to register swipe

export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | null;

interface TileProps {
  tile: TileType;
  isSelected: boolean;
  onPress: (position: Position) => void;
  onSwipe: (position: Position, direction: SwipeDirection) => void;
  isPowerUpTarget?: boolean;
}

const TileComponent: React.FC<TileProps> = memo(({ tile, isSelected, onPress, onSwipe, isPowerUpTarget = false }) => {
  const tileInfo = TILE_INFO[tile.type];

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Track if this is a swipe or tap
  const isSwipe = useRef(false);

  // Animate selection
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.15 : 1,
      friction: 10,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  // Animate matched tiles (fade out)
  React.useEffect(() => {
    if (tile.isMatched) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(1);
    }
  }, [tile.isMatched, opacityAnim, scaleAnim]);

  // Determine swipe direction
  const getSwipeDirection = useCallback((dx: number, dy: number): SwipeDirection => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      return null; // No significant movement
    }

    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only become responder if there's significant movement
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        isSwipe.current = false;
        // Visual feedback on touch
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // Limit movement to tile size
        const clampedDx = Math.max(-TILE_SIZE / 2, Math.min(TILE_SIZE / 2, dx));
        const clampedDy = Math.max(-TILE_SIZE / 2, Math.min(TILE_SIZE / 2, dy));

        translateX.setValue(clampedDx);
        translateY.setValue(clampedDy);

        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
          isSwipe.current = true;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;

        // Reset position with animation
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: isSelected ? 1.15 : 1,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        const direction = getSwipeDirection(dx, dy);

        if (direction && isSwipe.current) {
          // It's a swipe
          onSwipe(tile.position, direction);
        } else {
          // It's a tap
          onPress(tile.position);
        }
      },
      onPanResponderTerminate: () => {
        // Reset if gesture is cancelled
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  if (tile.isMatched) {
    return (
      <Animated.View
        style={[
          styles.tile,
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.tile,
        { backgroundColor: tileInfo.color },
        isSelected && styles.selectedTile,
        isPowerUpTarget && styles.powerUpTarget,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateX },
            { translateY },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TileIcon type={tile.type} size={TILE_SIZE * 0.7} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: TILE_MARGIN,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    // Minimal shadow
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedTile: {
    borderColor: COLORS.accentHighlight,
    borderWidth: 2,
  },
  powerUpTarget: {
    borderColor: '#FF1744',
    borderWidth: 3,
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default TileComponent;

// Export dimensions for use elsewhere
export { TILE_SIZE, TILE_MARGIN, BOARD_PADDING, GRID_SIZE as GRID_DIMENSION };
