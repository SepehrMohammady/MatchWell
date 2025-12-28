// Story Complete Modal - Shows when user completes Level 50 (final level)
import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    Animated,
    ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import { formatNumber, getCurrentLanguage } from '../../config/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_WIDTH = SCREEN_WIDTH - SPACING.xl * 2;

interface StoryCompleteProps {
    visible: boolean;
    onClose: () => void;
    totalStars: number;
    completedLevels: number;
}

interface SlideData {
    icon: string;
    iconColor: string;
    title: string;
    content: React.ReactNode;
}

const StoryComplete: React.FC<StoryCompleteProps> = ({ visible, onClose, totalStars, completedLevels }) => {
    const { t } = useTranslation();
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (visible) {
            setCurrentSlide(0);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const slides: SlideData[] = [
        {
            icon: 'party-popper',
            iconColor: '#FFD700',
            title: t('game.congratulations'),
            content: (
                <View style={styles.slideContent}>
                    <Text style={styles.heroText}>🎉</Text>
                    <Text style={styles.bodyText}>
                        {t('game.completedAllLevels', { count: completedLevels })}
                    </Text>
                    <Text style={styles.bodyText}>
                        {t('game.thankYouPlaying')}
                    </Text>
                </View>
            ),
        },
        {
            icon: 'star',
            iconColor: COLORS.starFilled,
            title: t('game.collectMoreStars'),
            content: (
                <View style={styles.slideContent}>
                    <View style={styles.starsRow}>
                        <MaterialCommunityIcons name="star" size={40} color={COLORS.starFilled} />
                        <Text style={styles.starCount}>{formatNumber(totalStars, getCurrentLanguage())}/150</Text>
                    </View>
                    <Text style={styles.bodyText}>
                        {t('game.replayForStars')}
                    </Text>
                </View>
            ),
        },
        {
            icon: 'medal',
            iconColor: '#CD7F32',
            title: t('game.earnMedals'),
            content: (
                <View style={styles.slideContent}>
                    <View style={styles.medalsRow}>
                        <MaterialCommunityIcons name="medal" size={36} color="#CD7F32" />
                        <MaterialCommunityIcons name="medal" size={36} color="#C0C0C0" />
                        <MaterialCommunityIcons name="medal" size={36} color="#FFD700" />
                    </View>
                    <Text style={styles.bodyText}>
                        {t('game.achievementsPage')}
                    </Text>
                </View>
            ),
        },
        {
            icon: 'infinity',
            iconColor: '#4A90E2',
            title: t('game.tryEndlessMode'),
            content: (
                <View style={styles.slideContent}>
                    <View style={styles.iconShowcase}>
                        <MaterialCommunityIcons name="infinity" size={48} color="#4A90E2" />
                    </View>
                    <Text style={styles.bodyText}>
                        {t('game.endlessChallenge')}
                    </Text>
                </View>
            ),
        },
        {
            icon: 'trophy',
            iconColor: '#FFD700',
            title: t('game.climbLeaderboard'),
            content: (
                <View style={styles.slideContent}>
                    <View style={styles.iconShowcase}>
                        <MaterialCommunityIcons name="trophy" size={48} color="#FFD700" />
                    </View>
                    <Text style={styles.bodyText}>
                        {t('game.competeWorldwide')}
                    </Text>
                    <TouchableOpacity style={styles.actionButton} onPress={onClose}>
                        <Text style={styles.actionButtonText}>{t('game.letsGo')}</Text>
                    </TouchableOpacity>
                </View>
            ),
        },
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            const nextSlide = currentSlide + 1;
            setCurrentSlide(nextSlide);
            scrollViewRef.current?.scrollTo({ x: nextSlide * CONTAINER_WIDTH, animated: true });
        } else {
            onClose();
        }
    };

    const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / CONTAINER_WIDTH);
        if (slideIndex !== currentSlide && slideIndex >= 0 && slideIndex < slides.length) {
            setCurrentSlide(slideIndex);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
                    <Text style={styles.headerTitle}>{t('game.storyComplete')}</Text>

                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScroll}
                        scrollEventThrottle={16}
                    >
                        {slides.map((slide, index) => (
                            <View key={index} style={styles.slide}>
                                <Text style={styles.slideTitle}>{slide.title}</Text>
                                {slide.content}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Pagination dots */}
                    <View style={styles.pagination}>
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index === currentSlide && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>

                    {/* Action button - show only if not on last slide */}
                    {currentSlide < slides.length - 1 && (
                        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
                            <Text style={styles.buttonText}>{t('common.next')}</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: CONTAINER_WIDTH,
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.xl,
        maxHeight: '85%',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.h2,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.organicWaste,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    slide: {
        width: CONTAINER_WIDTH,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    slideTitle: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    slideContent: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
        minHeight: 180,
        justifyContent: 'center',
    },
    heroText: {
        fontSize: 64,
        marginBottom: SPACING.md,
    },
    bodyText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.sm,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    starCount: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.starFilled,
    },
    medalsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    iconShowcase: {
        marginBottom: SPACING.md,
    },
    actionButton: {
        backgroundColor: COLORS.organicWaste,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: RADIUS.lg,
        marginTop: SPACING.md,
    },
    actionButtonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#fff',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.xs,
        marginVertical: SPACING.md,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.cardBorder,
    },
    dotActive: {
        backgroundColor: COLORS.organicWaste,
        width: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.organicWaste,
        marginHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    buttonText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: '#fff',
    },
});

export default StoryComplete;
