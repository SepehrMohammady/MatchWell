// HUD Component - Displays score, moves, and level info
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../context/GameStore';
import { getEnvironmentalMessage } from '../../themes';

interface HUDProps {
    onPause: () => void;
}

const HUD: React.FC<HUDProps> = ({ onPause }) => {
    const score = useGameStore((state) => state.score);
    const targetScore = useGameStore((state) => state.targetScore);
    const movesRemaining = useGameStore((state) => state.movesRemaining);
    const level = useGameStore((state) => state.level);
    const combo = useGameStore((state) => state.combo);

    const progress = Math.min((score / targetScore) * 100, 100);
    const message = getEnvironmentalMessage(score, targetScore);

    return (
        <View style={styles.container}>
            {/* Top row: Level and Pause */}
            <View style={styles.topRow}>
                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Level {level}</Text>
                </View>
                <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
                    <Text style={styles.pauseIcon}>⏸️</Text>
                </TouchableOpacity>
            </View>

            {/* Score section */}
            <View style={styles.scoreSection}>
                <Text style={styles.scoreLabel}>SCORE</Text>
                <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
                <Text style={styles.targetText}>Target: {targetScore.toLocaleString()}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>

            {/* Environmental message */}
            <Text style={styles.environmentalMessage}>{message}</Text>

            {/* Bottom row: Moves and Combo */}
            <View style={styles.bottomRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>MOVES</Text>
                    <Text style={[
                        styles.statValue,
                        movesRemaining <= 5 && styles.lowMoves
                    ]}>
                        {movesRemaining}
                    </Text>
                </View>
                {combo > 1 && (
                    <View style={styles.comboBadge}>
                        <Text style={styles.comboText}>🔥 x{combo}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 16,
        margin: 10,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelBadge: {
        backgroundColor: '#27ae60',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    levelText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    pauseButton: {
        padding: 8,
    },
    pauseIcon: {
        fontSize: 24,
    },
    scoreSection: {
        alignItems: 'center',
        marginBottom: 8,
    },
    scoreLabel: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 2,
    },
    scoreValue: {
        color: '#FFD700',
        fontSize: 36,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    targetText: {
        color: '#888',
        fontSize: 14,
    },
    progressContainer: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginVertical: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#2ecc71',
        borderRadius: 4,
    },
    environmentalMessage: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 14,
        fontStyle: 'italic',
        marginVertical: 8,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    stat: {
        alignItems: 'center',
    },
    statLabel: {
        color: '#aaa',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    statValue: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    lowMoves: {
        color: '#e74c3c',
    },
    comboBadge: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    comboText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default HUD;
