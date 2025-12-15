// HUD Component - Earth-Inspired Minimal Design with Sprouting Progress
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useGameStore } from '../../context/GameStore';
import { THEME_CONFIGS } from '../../themes';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import { PauseIcon } from './Icons';
import SproutingProgress from './SproutingProgress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HUDProps {
    onPause: () => void;
}

const HUD: React.FC<HUDProps> = ({ onPause }) => {
    const score = useGameStore((state) => state.score);
    const targetScore = useGameStore((state) => state.targetScore);
    const movesRemaining = useGameStore((state) => state.movesRemaining);
    const level = useGameStore((state) => state.level);
    const combo = useGameStore((state) => state.combo);
    const theme = useGameStore((state) => state.theme);
    const isEndlessMode = useGameStore((state) => state.isEndlessMode);
    const highScores = useGameStore((state) => state.highScores);

    const themeConfig = THEME_CONFIGS[theme];

    // Calculate progress for story mode
    const progress = isEndlessMode ? 100 : Math.min((score / targetScore) * 100, 100);

    // Get endless high score for display
    const themeOrder = ['trash-sorting', 'pollution', 'water-conservation', 'energy-efficiency', 'deforestation'];
    const themeIndex = themeOrder.indexOf(theme);
    const savedHighScore = highScores[-(themeIndex + 1)] || 0;
    const displayBestScore = isEndlessMode ? Math.max(score, savedHighScore) : savedHighScore;

    return (
        <View style={styles.container}>
            {/* Top row: Level/Theme and Pause */}
            <View style={styles.topRow}>
                <View style={[styles.levelBadge, isEndlessMode && styles.endlessBadge]}>
                    <Text style={styles.levelText}>
                        {isEndlessMode ? themeConfig.name : `Level ${level}`}
                    </Text>
                </View>
                <TouchableOpacity style={styles.pauseButton} onPress={onPause} activeOpacity={0.7}>
                    <PauseIcon size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Score section */}
            <View style={styles.scoreSection}>
                <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
                {isEndlessMode ? (
                    <Text style={styles.targetText}>
                        Best: {displayBestScore > 0 ? displayBestScore.toLocaleString() : '—'}
                    </Text>
                ) : (
                    <Text style={styles.targetText}>Target: {targetScore.toLocaleString()}</Text>
                )}
            </View>

            {/* Sprouting Progress - only for story mode */}
            {!isEndlessMode && (
                <SproutingProgress
                    progress={progress}
                    width={SCREEN_WIDTH - SPACING.lg * 4}
                    height={48}
                />
            )}

            {/* Bottom row: Moves and Combo */}
            <View style={styles.bottomRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{isEndlessMode ? 'Moves' : 'Moves left'}</Text>
                    <Text style={[
                        styles.statValue,
                        !isEndlessMode && movesRemaining <= 5 && styles.lowMoves,
                    ]}>
                        {movesRemaining}
                    </Text>
                </View>
                {combo > 1 && (
                    <View style={styles.comboBadge}>
                        <Text style={styles.comboText}>×{combo}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.lg,
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        margin: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    levelBadge: {
        backgroundColor: COLORS.organicWaste,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.round,
    },
    endlessBadge: {
        backgroundColor: COLORS.accentHighlight,
    },
    levelText: {
        color: COLORS.textLight,
        fontWeight: TYPOGRAPHY.semibold,
        fontSize: TYPOGRAPHY.bodySmall,
    },
    pauseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scoreSection: {
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    scoreValue: {
        color: COLORS.textPrimary,
        fontSize: 40,
        fontWeight: TYPOGRAPHY.bold,
        letterSpacing: -1,
    },
    targetText: {
        color: COLORS.textMuted,
        fontSize: TYPOGRAPHY.bodySmall,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    stat: {
        alignItems: 'flex-start',
    },
    statLabel: {
        color: COLORS.textMuted,
        fontSize: TYPOGRAPHY.caption,
    },
    statValue: {
        color: COLORS.textPrimary,
        fontSize: TYPOGRAPHY.h2,
        fontWeight: TYPOGRAPHY.semibold,
    },
    lowMoves: {
        color: COLORS.accentDanger,
    },
    comboBadge: {
        backgroundColor: COLORS.accentHighlight,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.round,
    },
    comboText: {
        color: COLORS.textLight,
        fontWeight: TYPOGRAPHY.bold,
        fontSize: TYPOGRAPHY.body,
    },
});

export default HUD;
