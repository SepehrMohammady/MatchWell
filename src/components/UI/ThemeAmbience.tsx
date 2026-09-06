// Ambient drifting theme icons for the game background.
//
// The level background is a solid colour that interpolates from polluted grey to
// clean blue as the player scores. This layer sits on top of it and slowly drifts
// the current theme's own icons upward, the way the main menu drifts its stars, so
// the board sits on something alive rather than a flat fill.
//
// Two things matter here:
//  - Cost. Every icon is static; only two container views are animated, both on the
//    native driver, so the drift costs nothing per frame on the JS thread while the
//    board is animating matches.
//  - Contrast. The background sweeps a wide range (roughly rgb(128,148,140) to
//    rgb(68,88,255)), so the icons are drawn in white at low opacity rather than in
//    their own theme colours - a blue droplet would vanish against the clean-sky end
//    of that range.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    Animated,
    Dimensions,
    Easing,
    StyleSheet,
    View,
} from 'react-native';
import TileIcon from '../Game/TileIcon';
import { THEME_CONFIGS } from '../../themes';
import { ThemeType } from '../../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Near/far layers give a little parallax. Kept deliberately sparse.
const LAYERS = [
    { count: 7, size: 96, opacity: 0.10, duration: 52000 },
    { count: 6, size: 58, opacity: 0.06, duration: 84000 },
];

// Deterministic pseudo-random placement: the layout must not change between
// renders, or the icons would jump around mid-drift.
const seeded = (i: number, salt: number): number => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
};

interface Props {
    theme: ThemeType;
    /**
     * Icon colour. Must contrast with the screen's own background: white on the
     * mid-to-dark backgrounds of Story/Endless and local multiplayer, but a dark
     * tint on the light sage background of online multiplayer, where white would
     * be invisible.
     */
    tint?: string;
}

const ThemeAmbience: React.FC<Props> = ({ theme, tint = '#FFFFFF' }) => {
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

    const tileTypes = useMemo(() => THEME_CONFIGS[theme]?.tileTypes ?? [], [theme]);

    // One Animated.Value per layer, created once.
    const drift = useRef(LAYERS.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        if (reduceMotion) return;
        const animations = LAYERS.map((layer, index) => {
            drift[index].setValue(0);
            return Animated.loop(
                Animated.timing(drift[index], {
                    toValue: 1,
                    duration: layer.duration,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
        });
        animations.forEach((a) => a.start());
        return () => animations.forEach((a) => a.stop());
    }, [drift, reduceMotion]);

    // Each layer holds its icons twice, stacked a screen apart, and scrolls by
    // exactly one screen height - so the loop point is invisible.
    const layers = useMemo(() => {
        if (tileTypes.length === 0) return [];
        return LAYERS.map((layer, layerIndex) => {
            const salt = layerIndex * 17 + 3;
            const items = Array.from({ length: layer.count }).map((_, i) => {
                const type = tileTypes[(i + layerIndex) % tileTypes.length];
                const left = seeded(i, salt) * (SCREEN_W - layer.size);
                const top = (i / layer.count) * SCREEN_H + seeded(i, salt + 1) * (SCREEN_H / layer.count);
                const rotate = `${Math.round(seeded(i, salt + 2) * 360)}deg`;
                return { key: `${layerIndex}-${i}`, type, left, top, rotate };
            });
            return { layer, items };
        });
    }, [tileTypes]);

    if (layers.length === 0) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {layers.map(({ layer, items }, layerIndex) => {
                const translateY = drift[layerIndex].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -SCREEN_H],
                });
                return (
                    <Animated.View
                        key={`layer-${layerIndex}`}
                        style={[
                            styles.layer,
                            { opacity: layer.opacity },
                            reduceMotion ? null : { transform: [{ translateY }] },
                        ]}
                    >
                        {/* Two copies, one screen apart, for a seamless wrap. */}
                        {[0, 1].map((copy) =>
                            items.map((item) => (
                                <View
                                    key={`${item.key}-${copy}`}
                                    style={[
                                        styles.icon,
                                        {
                                            left: item.left,
                                            top: item.top + copy * SCREEN_H,
                                            transform: [{ rotate: item.rotate }],
                                        },
                                    ]}
                                >
                                    <TileIcon type={item.type} size={layer.size} color={tint} />
                                </View>
                            ))
                        )}
                    </Animated.View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    layer: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: SCREEN_W,
        // Two stacked copies.
        height: SCREEN_H * 2,
    },
    icon: {
        position: 'absolute',
    },
});

export default React.memo(ThemeAmbience);
