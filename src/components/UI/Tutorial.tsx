// Tutorial Component - Visual instructions for new players
import React, { useState, useRef, useEffect } from 'react';
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
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_WIDTH = SCREEN_WIDTH - SPACING.xl * 2;

interface TutorialProps {
    visible: boolean;
    onClose: () => void;
}

interface TutorialSlide {
    icon: string;
    iconColor: string;
    title: string;
    description: string;
    visual: React.ReactNode;
}

const Tutorial: React.FC<TutorialProps> = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Fade in animation
    useEffect(() => {
        if (visible) {
            setCurrentSlide(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const slides: TutorialSlide[] = [
        {
            icon: 'swap-horizontal',
            iconColor: '#4A90E2',
            title: t('tutorial.slide1Title'),
            description: t('tutorial.slide1Desc'),
            visual: (
                <View style={styles.visualContainer}>
                    <View style={styles.tileRow}>
                        <View style={[styles.demoTile, { backgroundColor: '#4A90E2' }]}>
                            <MaterialCommunityIcons name="spray-bottle" size={24} color="rgba(255,255,255,0.9)" />
                        </View>
                        <View style={[styles.demoTile, styles.demoTileHighlight, { backgroundColor: '#D9CAB3' }]}>
                            <MaterialCommunityIcons name="file-document-outline" size={24} color="rgba(255,255,255,0.9)" />
                        </View>
                        <View style={[styles.demoTile, { backgroundColor: '#4A90E2' }]}>
                            <MaterialCommunityIcons name="spray-bottle" size={24} color="rgba(255,255,255,0.9)" />
                        </View>
                    </View>
                    <MaterialCommunityIcons name="arrow-down" size={24} color={COLORS.textMuted} style={{ marginVertical: 8 }} />
                    <View style={styles.tileRow}>
                        <View style={[styles.demoTile, styles.demoTileMatched, { backgroundColor: '#4A90E2' }]}>
                            <MaterialCommunityIcons name="spray-bottle" size={24} color="rgba(255,255,255,0.9)" />
                        </View>
                        <View style={[styles.demoTile, styles.demoTileMatched, { backgroundColor: '#4A90E2' }]}>
                            <MaterialCommunityIcons name="spray-bottle" size={24} color="rgba(255,255,255,0.9)" />
                        </View>
                        <View style={[styles.demoTile, styles.demoTileMatched, { backgroundColor: '#4A90E2' }]}>
                            <MaterialCommunityIcons name="spray-bottle" size={24} color="rgba(255,255,255,0.9)" />
                        </View>
                    </View>
                </View>
            ),
        },
        {
            icon: 'target',
            iconColor: '#27AE60',
            title: t('tutorial.slide2Title'),
            description: t('tutorial.slide2Desc'),
            visual: (
                <View style={styles.visualContainer}>
                    <View style={styles.statBox}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Score</Text>
                            <Text style={styles.statValue}>4,200</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Target</Text>
                            <Text style={[styles.statValue, { color: COLORS.organicWaste }]}>5,000</Text>
                        </View>
                    </View>
                    <View style={styles.progressDemo}>
                        <View style={[styles.progressFill, { width: '84%' }]} />
                    </View>
                    <View style={styles.movesInfo}>
                        <MaterialCommunityIcons name="shoe-print" size={18} color={COLORS.textSecondary} />
                        <Text style={styles.movesText}>8 moves left</Text>
                    </View>
                </View>
            ),
        },
        {
            icon: 'lightning-bolt',
            iconColor: '#FFA726',
            title: t('tutorial.slide3Title'),
            description: t('tutorial.slide3Desc'),
            visual: (
                <View style={styles.visualContainer}>
                    <View style={styles.powerUpDemo}>
                        <View style={styles.matchRow}>
                            <Text style={styles.matchLabel}>4-match</Text>
                            <Text style={styles.powerPoints}>+2 power</Text>
                        </View>
                        <View style={styles.matchRow}>
                            <Text style={styles.matchLabel}>5-match</Text>
                            <Text style={styles.powerPoints}>+5 power</Text>
                        </View>
                    </View>
                    <View style={styles.powerBarDemo}>
                        <View style={styles.powerTrack}>
                            <View style={[styles.powerFill, { width: '70%', backgroundColor: '#FFA726' }]} />
                        </View>
                        <View style={styles.earthIconDemo}>
                            <MaterialCommunityIcons name="earth" size={24} color="#FFA726" />
                        </View>
                    </View>
                    <Text style={styles.powerHint}>10+ = Single line • 15 = Cross pattern</Text>
                </View>
            ),
        },
        {
            icon: 'trophy',
            iconColor: '#FFD700',
            title: t('tutorial.slide4Title'),
            description: t('tutorial.slide4Desc'),
            visual: (
                <View style={styles.visualContainer}>
                    <View style={styles.starsRow}>
                        {[1, 2, 3].map((star) => (
                            <MaterialCommunityIcons
                                key={star}
                                name="star"
                                size={40}
                                color={star <= 2 ? COLORS.starFilled : COLORS.starEmpty}
                            />
                        ))}
                    </View>
                    <Text style={styles.starHint}>More moves = More stars</Text>
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
                <View style={styles.container}>
                    <Text style={styles.headerTitle}>{t('tutorial.howToPlay')}</Text>

                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleScroll}
                        scrollEventThrottle={16}
                        style={{ direction: 'ltr' }}
                    >
                        {slides.map((slide, index) => (
                            <View key={index} style={styles.slide}>
                                <View style={[styles.iconCircle, { backgroundColor: slide.iconColor + '20' }]}>
                                    <MaterialCommunityIcons name={slide.icon} size={32} color={slide.iconColor} />
                                </View>
                                <Text style={styles.slideTitle}>{slide.title}</Text>
                                <Text style={styles.slideDescription}>{slide.description}</Text>
                                {slide.visual}
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

                    {/* Action button */}
                    <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
                        <Text style={styles.buttonText}>
                            {currentSlide === slides.length - 1 ? t('tutorial.letsPlay') : t('common.next')}
                        </Text>
                        {currentSlide < slides.length - 1 && (
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
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
        width: SCREEN_WIDTH - SPACING.xl * 2,
        backgroundColor: COLORS.cardBackground,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.xl,
        maxHeight: '80%',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.h3,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold,
        color: COLORS.textPrimary,
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
        marginBottom: SPACING.xs,
    },
    slideDescription: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    visualContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    tileRow: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    demoTile: {
        width: 50,
        height: 50,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    demoTileHighlight: {
        borderWidth: 2,
        borderColor: '#4A90E2',
        borderStyle: 'dashed',
    },
    demoTileMatched: {
        backgroundColor: 'rgba(39, 174, 96, 0.2)',
        borderWidth: 2,
        borderColor: '#27AE60',
    },
    demoEmoji: {
        fontSize: 24,
    },
    statBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        gap: SPACING.lg,
        marginBottom: SPACING.md,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textMuted,
    },
    statValue: {
        fontSize: TYPOGRAPHY.h4,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textPrimary,
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.cardBorder,
    },
    progressDemo: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: SPACING.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.organicWaste,
        borderRadius: 4,
    },
    movesInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    movesText: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textSecondary,
    },
    powerUpDemo: {
        marginBottom: SPACING.md,
    },
    matchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 150,
        marginBottom: SPACING.xs,
    },
    matchLabel: {
        fontSize: TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    powerPoints: {
        fontSize: TYPOGRAPHY.body,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: '#FFA726',
    },
    powerBarDemo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    powerTrack: {
        width: 150,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    powerFill: {
        height: '100%',
        borderRadius: 4,
    },
    earthIconDemo: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 167, 38, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    powerHint: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textMuted,
    },
    starsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    starHint: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textMuted,
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

export default Tutorial;
