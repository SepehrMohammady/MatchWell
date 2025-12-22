// Climate Clock Component - Shows countdown to 1.5°C warming deadline
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../config/theme';
import { useTranslation } from 'react-i18next';

interface ClockData {
    years: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const CLIMATE_CLOCK_API = 'https://api.climateclock.world/v2/clock.json';

// Fallback deadline if API fails (from current API data)
const FALLBACK_DEADLINE = '2029-07-22T16:00:00+00:00';

const ClimateClock: React.FC = () => {
    const { t } = useTranslation();
    const [clockData, setClockData] = useState<ClockData | null>(null);
    const [deadline, setDeadline] = useState<Date>(new Date(FALLBACK_DEADLINE));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    // Fetch deadline from API
    useEffect(() => {
        const fetchDeadline = async () => {
            try {
                const response = await fetch(CLIMATE_CLOCK_API);
                const data = await response.json();
                if (data?.data?.modules?.carbon_deadline_1?.timestamp) {
                    setDeadline(new Date(data.data.modules.carbon_deadline_1.timestamp));
                }
                setIsLoading(false);
            } catch (err) {
                console.warn('Climate Clock API error, using fallback:', err);
                setError(true);
                setIsLoading(false);
            }
        };
        fetchDeadline();
    }, []);

    // Calculate time remaining
    const calculateTimeRemaining = useCallback(() => {
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();

        if (diff <= 0) {
            return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        const totalSeconds = Math.floor(diff / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        const totalDays = Math.floor(totalHours / 24);

        // Calculate years and remaining days
        const years = Math.floor(totalDays / 365.25);
        const remainingDays = Math.floor(totalDays % 365.25);

        return {
            years,
            days: remainingDays,
            hours: totalHours % 24,
            minutes: totalMinutes % 60,
            seconds: totalSeconds % 60,
        };
    }, [deadline]);

    // Update countdown every second
    useEffect(() => {
        const timer = setInterval(() => {
            setClockData(calculateTimeRemaining());
        }, 1000);

        // Initial calculation
        setClockData(calculateTimeRemaining());

        return () => clearInterval(timer);
    }, [calculateTimeRemaining]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={COLORS.accentDanger} />
            </View>
        );
    }

    if (!clockData) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>🌍 {t('climate.timeLeft')}</Text>
            <View style={styles.clockRow}>
                <View style={styles.timeUnit}>
                    <Text style={styles.timeValue}>{clockData.years}</Text>
                    <Text style={styles.timeLabel}>YRS</Text>
                </View>
                <Text style={styles.separator}>:</Text>
                <View style={styles.timeUnit}>
                    <Text style={styles.timeValue}>{String(clockData.days).padStart(3, '0')}</Text>
                    <Text style={styles.timeLabel}>DAYS</Text>
                </View>
                <Text style={styles.separator}>:</Text>
                <View style={styles.timeUnit}>
                    <Text style={styles.timeValue}>{String(clockData.hours).padStart(2, '0')}</Text>
                    <Text style={styles.timeLabel}>HRS</Text>
                </View>
                <Text style={styles.separator}>:</Text>
                <View style={styles.timeUnit}>
                    <Text style={styles.timeValue}>{String(clockData.minutes).padStart(2, '0')}</Text>
                    <Text style={styles.timeLabel}>MIN</Text>
                </View>
                <Text style={styles.separator}>:</Text>
                <View style={styles.timeUnit}>
                    <Text style={styles.timeValue}>{String(clockData.seconds).padStart(2, '0')}</Text>
                    <Text style={styles.timeLabel}>SEC</Text>
                </View>
            </View>
            <Text style={styles.source}>climateclock.world</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        alignItems: 'center',
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.accentDanger,
    },
    label: {
        fontSize: TYPOGRAPHY.caption,
        fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        color: COLORS.textLight,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    clockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeUnit: {
        alignItems: 'center',
        minWidth: 36,
    },
    timeValue: {
        fontSize: 18,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontWeight: TYPOGRAPHY.bold,
        color: COLORS.accentDanger,
    },
    timeLabel: {
        fontSize: 8,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        marginTop: -2,
    },
    separator: {
        fontSize: 16,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.accentDanger,
        marginHorizontal: 2,
        marginBottom: 8,
    },
    source: {
        fontSize: 8,
        fontFamily: TYPOGRAPHY.fontFamily,
        color: COLORS.textMuted,
        marginTop: SPACING.xs,
    },
});

export default ClimateClock;
