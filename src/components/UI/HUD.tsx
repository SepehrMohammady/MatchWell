// HUD Component - Earth-Inspired Minimal Design with Sprouting Progress
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useGameStore } from '../../context/GameStore';
import { THEME_CONFIGS } from '../../themes';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import { PauseIcon } from './Icons';
import ThemeProgress from './ThemeProgress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HUDProps {
    onPause: () => void;
}

const HUD: React.FC<HUDProps> = ({ onPause }) => {
    const score = useGameStore((state) => state.score);
    const targetScore = useGameStore((state) => state.targetScore);
    const movesRemaining = useGameStore((state) => state.movesRemaining);
    const moves = useGameStore((state) => state.moves);
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
            {/* Top row: Score on left, Pause on right */}
            <View style={styles.topRow}>
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
                <TouchableOpacity style={styles.pauseButton} onPress={onPause} activeOpacity={0.7}>
                    <PauseIcon size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Theme-specific Progress - only for story mode */}
            {!isEndlessMode && (
                <ThemeProgress
                    progress={progress}
                    theme={theme}
                    width={SCREEN_WIDTH - SPACING.lg * 4}
                    height={40}
                />
            )}

            {/* Bottom row: Moves on left, Combo in middle, Level on right */}
            <View style={styles.bottomRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{isEndlessMode ? 'Moves' : 'Moves left'}</Text>
                    <Text style={[
                        styles.statValue,
                        !isEndlessMode && movesRemaining <= 5 && styles.lowMoves,
                    ]}>
                        {isEndlessMode ? moves : movesRemaining}
                    </Text>
                </View>
                {combo > 1 && (
                    <View style={styles.comboBadge}>
                        <Text style={styles.comboText}>×{combo}</Text>
                    </View>
                )}
                <View style={[styles.levelBadge, isEndlessMode && styles.endlessBadge]}>
                    <Text style={styles.levelText}>
                        {isEndlessMode ? themeConfig.name : `Level ${level}`}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.md,
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        margin: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xs,
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
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
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
        alignItems: 'flex-start',
    },
    scoreValue: {
        color: COLORS.textPrimary,
        fontSize: 32,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontWeight: TYPOGRAPHY.bold,
        letterSpacing: -1,
        lineHeight: 36,
    },
    targetText: {
        color: COLORS.textMuted,
        fontFamily: TYPOGRAPHY.fontFamily,
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
        fontFamily: TYPOGRAPHY.fontFamily,
        fontSize: TYPOGRAPHY.caption,
    },
    statValue: {
        color: COLORS.textPrimary,
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
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
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontWeight: TYPOGRAPHY.bold,
        fontSize: TYPOGRAPHY.body,
    },
});

export default HUD;
