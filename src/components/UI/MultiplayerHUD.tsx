// Multiplayer HUD Component - specialized for Local and Online Multiplayer
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useGameStore } from '../../context/GameStore';
import { THEME_CONFIGS } from '../../themes';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import { PauseIcon } from './Icons';
import { useTranslation } from 'react-i18next';
import { formatNumber, getCurrentLanguage } from '../../config/i18n';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MultiplayerHUDProps {
    onPause: () => void;
    gameMode: 'race' | 'timed' | 'moves';
    targetScore?: number;
    movesLimit?: number;
    timeRemaining?: number | null;
    showScoreboard: boolean;
    onToggleScoreboard: () => void;
}

const MultiplayerHUD: React.FC<MultiplayerHUDProps> = ({ 
    onPause, 
    gameMode, 
    targetScore, 
    movesLimit, 
    timeRemaining, 
    showScoreboard, 
    onToggleScoreboard 
}) => {
    const { t } = useTranslation();
    const score = useGameStore((state) => state.score);
    const moves = useGameStore((state) => state.moves);
    const theme = useGameStore((state) => state.theme);

    const formatTime = (seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            {/* Top row: Score on left, Pause on right */}
            <View style={styles.topRow}>
                <View style={styles.scoreSection}>
                    <Text style={styles.scoreValue}>{formatNumber(score, getCurrentLanguage())}</Text>
                    {gameMode === 'race' && targetScore ? (
                        <Text style={styles.targetText}>{t('multiplayer.target')}: {formatNumber(targetScore, getCurrentLanguage())}</Text>
                    ) : gameMode === 'timed' && timeRemaining !== null && timeRemaining !== undefined ? (
                        <Text style={[styles.targetText, timeRemaining <= 30 && styles.dangerText]}>
                            {t('game.time')}: {formatTime(timeRemaining)}
                        </Text>
                    ) : null}
                </View>
                <TouchableOpacity style={styles.pauseButton} onPress={onPause} activeOpacity={0.7}>
                    <PauseIcon size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Bottom row: Moves on left, Scoreboard Toggle in middle, Theme Badge on right */}
            <View style={styles.bottomRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('game.moves')}</Text>
                    <Text style={[styles.statValue, gameMode === 'moves' && movesLimit && (movesLimit - moves <= 5) ? styles.dangerText : undefined]}>
                        {formatNumber(moves, getCurrentLanguage())}{gameMode === 'moves' && movesLimit ? `/${formatNumber(movesLimit, getCurrentLanguage())}` : ''}
                    </Text>
                </View>

                {/* Scoreboard Toggle inside HUD */}
                <TouchableOpacity 
                    style={styles.scoreboardToggle} 
                    onPress={onToggleScoreboard}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons
                        name={showScoreboard ? 'chevron-up' : 'trophy'}
                        size={16}
                        color={COLORS.organicWaste}
                    />
                    <Text style={styles.scoreboardToggleText}>
                        {showScoreboard ? t('localMultiplayer.hideScoreboard') : t('localMultiplayer.showScoreboard')}
                    </Text>
                </TouchableOpacity>

                <View style={[styles.themeBadge]}>
                    <Text style={styles.themeText}>
                        {t(`themes.${theme === 'trash-sorting' ? 'trashSorting' : theme === 'water-conservation' ? 'waterConservation' : theme === 'energy-efficiency' ? 'energyEfficiency' : theme}`)}
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
        marginHorizontal: SPACING.md,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xs,
    },
    themeBadge: {
        backgroundColor: COLORS.organicWaste,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.round,
    },
    themeText: {
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
    dangerText: {
        color: '#E53935',
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
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
    },
    scoreboardToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.organicWaste + '15',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.round,
        gap: 4,
    },
    scoreboardToggleText: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.organicWaste,
    },
});

export default MultiplayerHUD;
