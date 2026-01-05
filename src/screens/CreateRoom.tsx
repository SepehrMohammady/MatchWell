// Create Room Screen - Set up a new multiplayer room
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, ThemeType } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createRoom, GameMode } from '../services/MultiplayerService';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../utils/SoundManager';
import { THEMES, LEVELS } from '../themes';
import { useGameStore } from '../context/GameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRoom'>;

const GAME_MODES: { mode: GameMode; icon: string; labelKey: string }[] = [
    { mode: 'race', icon: 'flag-checkered', labelKey: 'multiplayer.raceMode' },
    { mode: 'timed', icon: 'clock-outline', labelKey: 'multiplayer.timedMode' },
    { mode: 'moves', icon: 'shoe-print', labelKey: 'multiplayer.movesMode' },
];



const TARGET_SCORE_OPTIONS = [10000, 50000, 100000, 250000, 500000];
const MOVES_OPTIONS = [50, 100, 150, 200];

const CreateRoom: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [roomName, setRoomName] = useState('');
    const [password, setPassword] = useState('');
    const [gameMode, setGameMode] = useState<GameMode>('race');
    const [targetScore, setTargetScore] = useState(50000);
    const [durationDays, setDurationDays] = useState('0');
    const [durationHours, setDurationHours] = useState('0');
    const [durationMinutes, setDurationMinutes] = useState('0');
    const [movesLimit, setMovesLimit] = useState(100);
    const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null);
    const [themeVoting, setThemeVoting] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    // Get completed levels to filter themes
    const completedLevels = useGameStore((state) => state.completedLevels);

    // Get unlocked themes (at least one level completed in that theme)
    const unlockedThemes = THEMES.filter(theme => {
        const themeLevels = LEVELS.filter(l => l.theme === theme.id);
        return themeLevels.some(level => completedLevels.includes(level.id));
    });

    // Calculate duration in seconds from inputs
    const getDurationSeconds = () => {
        const days = parseInt(durationDays) || 0;
        const hours = parseInt(durationHours) || 0;
        const minutes = parseInt(durationMinutes) || 0;
        return (days * 86400) + (hours * 3600) + (minutes * 60);
    };
    const handleBack = () => {
        playSfx('tile_select');
        navigation.goBack();
    };

    const handleCreate = async () => {
        if (!roomName.trim()) {
            setError(t('multiplayer.errorRoomName'));
            return;
        }
        if (password.length < 4 || password.length > 6) {
            setError(t('multiplayer.errorPassword'));
            return;
        }
        if (!themeVoting && !selectedTheme) {
            setError(t('multiplayer.errorTheme'));
            return;
        }

        setCreating(true);
        setError('');
        playSfx('tile_select');

        const result = await createRoom({
            room_name: roomName.trim(),
            password,
            game_mode: gameMode,
            target_score: gameMode === 'race' ? targetScore : undefined,
            duration_seconds: getDurationSeconds(),
            moves_limit: gameMode === 'moves' ? movesLimit : undefined,
            theme: themeVoting ? undefined : selectedTheme || undefined,
            theme_voting: themeVoting,
        });

        setCreating(false);

        if (result.room_code) {
            playSfx('tile_select');
            navigation.replace('RoomLobby', { roomCode: result.room_code });
        } else {
            setError(result.error || t('multiplayer.errorCreate'));
        }
    };

    const renderModeSelector = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('multiplayer.gameMode')}</Text>
            <View style={styles.modeRow}>
                {GAME_MODES.map(({ mode, icon, labelKey }) => (
                    <TouchableOpacity
                        key={mode}
                        style={[styles.modeButton, gameMode === mode && styles.modeButtonActive]}
                        onPress={() => { setGameMode(mode); playSfx('tile_select'); }}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons
                            name={icon}
                            size={24}
                            color={gameMode === mode ? '#fff' : COLORS.textSecondary}
                        />
                        <Text style={[styles.modeText, gameMode === mode && styles.modeTextActive]}>
                            {t(labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderOptionRow = (
        title: string,
        options: { label: string; value: number }[],
        selected: number,
        onSelect: (value: number) => void
    ) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.optionRow}>
                {options.map(({ label, value }) => (
                    <TouchableOpacity
                        key={value}
                        style={[styles.optionButton, selected === value && styles.optionButtonActive]}
                        onPress={() => { onSelect(value); playSfx('tile_select'); }}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.optionText, selected === value && styles.optionTextActive]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderThemeSelector = () => (
        <View style={styles.section}>
            <View style={styles.themeHeader}>
                <Text style={styles.sectionTitle}>{t('multiplayer.theme')}</Text>
                <TouchableOpacity
                    style={styles.votingToggle}
                    onPress={() => { setThemeVoting(!themeVoting); playSfx('tile_select'); }}
                >
                    <MaterialCommunityIcons
                        name={themeVoting ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={24}
                        color={COLORS.organicWaste}
                    />
                    <Text style={styles.votingText}>{t('multiplayer.enableVoting')}</Text>
                </TouchableOpacity>
            </View>
            {!themeVoting && (
                <View style={styles.themeGrid}>
                    {unlockedThemes.length > 0 ? unlockedThemes.map((theme) => (
                        <TouchableOpacity
                            key={theme.id}
                            style={[
                                styles.themeCard,
                                selectedTheme === theme.id && styles.themeCardActive,
                                { borderColor: theme.color }
                            ]}
                            onPress={() => { setSelectedTheme(theme.id); playSfx('tile_select'); }}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name={theme.icon} size={32} color={theme.color} />
                        </TouchableOpacity>
                    )) : (
                        <Text style={styles.noThemesText}>{t('multiplayer.noUnlockedThemes')}</Text>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundPrimary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('multiplayer.createRoom')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
                {/* Room Name */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('multiplayer.roomName')}</Text>
                    <TextInput
                        style={styles.input}
                        value={roomName}
                        onChangeText={setRoomName}
                        placeholder={t('multiplayer.roomNamePlaceholder')}
                        placeholderTextColor={COLORS.textSecondary}
                        maxLength={50}
                    />
                </View>

                {/* Password */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('multiplayer.password')}</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="4-6 digits"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="number-pad"
                        maxLength={6}
                        secureTextEntry
                    />
                </View>

                {/* Game Mode */}
                {renderModeSelector()}

                {/* Target Score (Race mode) */}
                {gameMode === 'race' && renderOptionRow(
                    t('multiplayer.targetScore'),
                    TARGET_SCORE_OPTIONS.map(v => ({ label: `${v / 1000}K`, value: v })),
                    targetScore,
                    setTargetScore
                )}

                {/* Duration - Custom Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('multiplayer.duration')}</Text>
                    <View style={styles.durationRow}>
                        <View style={styles.durationInput}>
                            <TextInput
                                style={styles.durationField}
                                value={durationDays}
                                onChangeText={setDurationDays}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="0"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <Text style={styles.durationLabel}>{t('multiplayer.days')}</Text>
                        </View>
                        <View style={styles.durationInput}>
                            <TextInput
                                style={styles.durationField}
                                value={durationHours}
                                onChangeText={setDurationHours}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="0"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <Text style={styles.durationLabel}>{t('multiplayer.hours')}</Text>
                        </View>
                        <View style={styles.durationInput}>
                            <TextInput
                                style={styles.durationField}
                                value={durationMinutes}
                                onChangeText={setDurationMinutes}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="0"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <Text style={styles.durationLabel}>{t('multiplayer.minutes')}</Text>
                        </View>
                    </View>
                </View>

                {/* Moves Limit (Moves mode) */}
                {gameMode === 'moves' && renderOptionRow(
                    t('multiplayer.movesLimit'),
                    MOVES_OPTIONS.map(v => ({ label: `${v}`, value: v })),
                    movesLimit,
                    setMovesLimit
                )}

                {/* Theme */}
                {renderThemeSelector()}

                {/* Error */}
                {error ? <Text style={styles.error}>{error}</Text> : null}

                {/* Create Button */}
                <TouchableOpacity
                    style={[styles.createButton, creating && styles.createButtonDisabled]}
                    onPress={handleCreate}
                    disabled={creating}
                    activeOpacity={0.8}
                >
                    {creating ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="plus-circle" size={24} color="#fff" />
                            <Text style={styles.createButtonText}>{t('multiplayer.createRoom')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    },
    backButton: { padding: SPACING.xs },
    title: {
        fontSize: TYPOGRAPHY.h2, fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary,
    },
    placeholder: { width: 40 },
    form: { flex: 1 },
    formContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl * 2 },
    section: { marginBottom: SPACING.lg },
    sectionTitle: {
        fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.lg, borderWidth: 1,
        borderColor: COLORS.cardBorder, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
        fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary,
    },
    modeRow: { flexDirection: 'row', gap: SPACING.sm },
    modeButton: {
        flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.cardBorder,
    },
    modeButtonActive: { backgroundColor: COLORS.organicWaste, borderColor: COLORS.organicWaste },
    modeText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary, marginTop: SPACING.xs },
    modeTextActive: { color: '#fff' },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    optionButton: {
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.cardBorder,
    },
    optionButtonActive: { backgroundColor: COLORS.organicWaste, borderColor: COLORS.organicWaste },
    optionText: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    optionTextActive: { color: '#fff' },
    themeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    votingToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    votingText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary },
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    themeCard: {
        width: 56, height: 56, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.lg, borderWidth: 2,
    },
    themeCardActive: { backgroundColor: COLORS.organicWaste + '30' },
    themeEmoji: { fontSize: 28, marginBottom: SPACING.xs },
    themeName: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary, textAlign: 'center' },
    noThemesText: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary, fontStyle: 'italic' },
    durationRow: { flexDirection: 'row', gap: SPACING.md },
    durationInput: { flex: 1, alignItems: 'center' },
    durationField: {
        width: '100%', backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.cardBorder, paddingVertical: SPACING.sm,
        fontSize: TYPOGRAPHY.h3, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.textPrimary, textAlign: 'center',
    },
    durationLabel: { fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textSecondary, marginTop: SPACING.xs },
    error: { color: COLORS.accentDanger, fontSize: TYPOGRAPHY.caption, fontFamily: TYPOGRAPHY.fontFamily, marginBottom: SPACING.md, textAlign: 'center' },
    createButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.organicWaste, paddingVertical: SPACING.lg, borderRadius: RADIUS.lg, marginTop: SPACING.md,
    },
    createButtonDisabled: { opacity: 0.6 },
    createButtonText: { fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontWeight: TYPOGRAPHY.semibold, color: '#fff' },
});

export default CreateRoom;
