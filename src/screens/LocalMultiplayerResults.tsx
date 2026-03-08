// Local Multiplayer Results Screen - Final rankings
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { playSfx, stopBgm } from '../utils/SoundManager';
import LocalMultiplayerService, { LocalPlayer } from '../services/LocalMultiplayerService';
import { formatNumber } from '../config/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalMultiplayerResults'>;

const LocalMultiplayerResults: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [rankings, setRankings] = useState<LocalPlayer[]>([]);

    useEffect(() => {
        stopBgm();
        const finalRankings = LocalMultiplayerService.getRankings();
        setRankings(finalRankings);

        if (finalRankings.length > 0) {
            playSfx('level_complete');
        }
    }, []);

    // Handle back button
    useFocusEffect(
        useCallback(() => {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                handleExit();
                return true;
            });
            return () => backHandler.remove();
        }, [])
    );

    const handleExit = () => {
        playSfx('tile_select');
        LocalMultiplayerService.stopAll();
        navigation.popToTop();
    };

    const handlePlayAgain = () => {
        playSfx('tile_select');
        LocalMultiplayerService.stopAll();
        navigation.replace('LocalMultiplayerMenu');
    };

    const getMedalIcon = (index: number): string => {
        switch (index) {
            case 0: return 'medal';
            case 1: return 'medal-outline';
            case 2: return 'medal-outline';
            default: return 'account';
        }
    };

    const getMedalColor = (index: number): string => {
        switch (index) {
            case 0: return '#FFD700'; // Gold
            case 1: return '#C0C0C0'; // Silver
            case 2: return '#CD7F32'; // Bronze
            default: return COLORS.textSecondary;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{t('localMultiplayer.results')}</Text>
                <Text style={styles.subtitle}>{t('localMultiplayer.gameOver')}</Text>
            </View>

            {/* Rankings */}
            <View style={styles.rankingsContainer}>
                {rankings.map((player, index) => (
                    <View
                        key={player.endpointId}
                        style={[
                            styles.rankCard,
                            index === 0 && styles.rankCardFirst,
                        ]}
                    >
                        <View style={styles.rankLeft}>
                            <View style={[styles.rankBadge, { backgroundColor: getMedalColor(index) + '20' }]}>
                                <MaterialCommunityIcons
                                    name={getMedalIcon(index)}
                                    size={index === 0 ? 32 : 24}
                                    color={getMedalColor(index)}
                                />
                            </View>
                            <View style={styles.rankInfo}>
                                <Text style={[styles.rankName, index === 0 && styles.rankNameFirst]}>
                                    {player.name}
                                </Text>
                                <Text style={styles.rankMoves}>
                                    {formatNumber(player.moves)} {t('game.moves').toLowerCase()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.rankRight}>
                            <Text style={[styles.rankScore, index === 0 && styles.rankScoreFirst]}>
                                {formatNumber(player.score)}
                            </Text>
                            {player.finished ? (
                                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                            ) : (
                                <MaterialCommunityIcons name="close-circle" size={16} color={'#E53935'} />
                            )}
                        </View>
                    </View>
                ))}

                {rankings.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="trophy-broken" size={64} color={COLORS.cardBorder} />
                        <Text style={styles.emptyText}>{t('localMultiplayer.noResults')}</Text>
                    </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="replay" size={24} color="#fff" />
                    <Text style={styles.buttonText}>{t('localMultiplayer.playAgain')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exitButton} onPress={handleExit} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="home" size={24} color={COLORS.textPrimary} />
                    <Text style={styles.exitText}>{t('localMultiplayer.backToMenu')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundPrimary,
    },
    header: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    title: {
        fontSize: TYPOGRAPHY.h1,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    rankingsContainer: {
        flex: 1,
        paddingHorizontal: SPACING.md,
    },
    rankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    rankCardFirst: {
        borderColor: '#FFD700',
        borderWidth: 2,
    },
    rankLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
    },
    rankBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankInfo: {
        flex: 1,
    },
    rankName: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
    },
    rankNameFirst: {
        fontSize: TYPOGRAPHY.h3,
    },
    rankMoves: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
    },
    rankRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    rankScore: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.organicWaste,
    },
    rankScoreFirst: {
        fontSize: TYPOGRAPHY.h2,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },
    actions: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    playAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
    },
    buttonText: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: '#fff',
    },
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.cardBackground,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    exitText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textPrimary,
    },
});

export default LocalMultiplayerResults;
