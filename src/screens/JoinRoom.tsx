// Join Room Screen - Enter room code and password to join
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../config/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { joinRoom } from '../services/MultiplayerService';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../utils/SoundManager';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>;

const JoinRoom: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [roomCode, setRoomCode] = useState('');
    const [password, setPassword] = useState('');
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    const handleBack = () => {
        playSfx('tile_select');
        navigation.goBack();
    };

    const handleJoin = async () => {
        if (roomCode.length !== 6) {
            setError(t('multiplayer.errorRoomCode'));
            return;
        }
        if (password.length < 4 || password.length > 6) {
            setError(t('multiplayer.errorPassword'));
            return;
        }

        setJoining(true);
        setError('');
        playSfx('tile_select');

        const result = await joinRoom(roomCode.toUpperCase(), password);

        setJoining(false);

        if (result.room) {
            playSfx('level_win');
            navigation.replace('RoomLobby', { roomCode: roomCode.toUpperCase() });
        } else {
            setError(result.error || t('multiplayer.errorJoin'));
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('multiplayer.joinRoom')}</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                {/* Room Code */}
                <View style={styles.section}>
                    <Text style={styles.label}>{t('multiplayer.roomCode')}</Text>
                    <TextInput
                        style={styles.codeInput}
                        value={roomCode}
                        onChangeText={(text) => setRoomCode(text.toUpperCase())}
                        placeholder="ABC123"
                        placeholderTextColor={COLORS.textSecondary}
                        maxLength={6}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                </View>

                {/* Password */}
                <View style={styles.section}>
                    <Text style={styles.label}>{t('multiplayer.password')}</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="number-pad"
                        maxLength={6}
                        secureTextEntry
                    />
                </View>

                {/* Error */}
                {error ? <Text style={styles.error}>{error}</Text> : null}

                {/* Join Button */}
                <TouchableOpacity
                    style={[styles.joinButton, joining && styles.joinButtonDisabled]}
                    onPress={handleJoin}
                    disabled={joining}
                    activeOpacity={0.8}
                >
                    {joining ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="login" size={24} color="#fff" />
                            <Text style={styles.joinButtonText}>{t('multiplayer.joinRoom')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
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
    content: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
    section: { marginBottom: SPACING.xl },
    label: {
        fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm,
    },
    codeInput: {
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.xl, borderWidth: 2,
        borderColor: COLORS.organicWaste, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
        fontSize: TYPOGRAPHY.h1, fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.textPrimary,
        textAlign: 'center', letterSpacing: 8,
    },
    input: {
        backgroundColor: COLORS.cardBackground, borderRadius: RADIUS.lg, borderWidth: 1,
        borderColor: COLORS.cardBorder, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
        fontSize: TYPOGRAPHY.h3, fontFamily: TYPOGRAPHY.fontFamily, color: COLORS.textPrimary,
        textAlign: 'center', letterSpacing: 4,
    },
    error: {
        color: COLORS.hazardousWaste, fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamily,
        marginBottom: SPACING.md, textAlign: 'center'
    },
    joinButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.waterWaste, paddingVertical: SPACING.lg, borderRadius: RADIUS.lg, marginTop: SPACING.md,
    },
    joinButtonDisabled: { opacity: 0.6 },
    joinButtonText: {
        fontSize: TYPOGRAPHY.body, fontFamily: TYPOGRAPHY.fontFamilySemiBold,
        fontWeight: TYPOGRAPHY.semibold, color: '#fff'
    },
});

export default JoinRoom;
