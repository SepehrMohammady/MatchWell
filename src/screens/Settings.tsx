// Settings Screen - Sound and game settings
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import {
    getSoundSettings,
    toggleSfx,
    toggleMusic,
    playSfx
} from '../utils/SoundManager';
import VERSION from '../config/version';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const Settings: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [sfxEnabled, setSfxEnabled] = useState(true);
    const [musicEnabled, setMusicEnabled] = useState(true);

    useEffect(() => {
        const settings = getSoundSettings();
        setSfxEnabled(settings.sfxEnabled);
        setMusicEnabled(settings.musicEnabled);
    }, []);

    const handleSfxToggle = (value: boolean) => {
        setSfxEnabled(value);
        toggleSfx(value);
        if (value) {
            playSfx('tile_select');
        }
    };

    const handleMusicToggle = (value: boolean) => {
        setMusicEnabled(value);
        toggleMusic(value);
    };

    const handleBack = () => {
        playSfx('tile_select');
        navigation.navigate('MainMenu');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>⚙️ Settings</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Settings Options */}
            <View style={styles.content}>
                {/* Sound Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔊 Sound</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Music</Text>
                            <Text style={styles.settingDescription}>Background music</Text>
                        </View>
                        <Switch
                            value={musicEnabled}
                            onValueChange={handleMusicToggle}
                            trackColor={{ false: '#333', true: '#27ae60' }}
                            thumbColor={musicEnabled ? '#2ecc71' : '#666'}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Sound Effects</Text>
                            <Text style={styles.settingDescription}>Tile sounds & feedback</Text>
                        </View>
                        <Switch
                            value={sfxEnabled}
                            onValueChange={handleSfxToggle}
                            trackColor={{ false: '#333', true: '#27ae60' }}
                            thumbColor={sfxEnabled ? '#2ecc71' : '#666'}
                        />
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ℹ️ About</Text>

                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Version</Text>
                        <Text style={styles.aboutValue}>{VERSION.string}</Text>
                    </View>

                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Developer</Text>
                        <Text style={styles.aboutValue}>SepehrMohammady</Text>
                    </View>

                    <Text style={styles.tagline}>
                        🌍 Save the planet, one match at a time!
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 60,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        backgroundColor: '#2c3e50',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2ecc71',
        marginBottom: 16,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#34495e',
    },
    settingInfo: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    settingDescription: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#34495e',
    },
    aboutLabel: {
        fontSize: 14,
        color: '#888',
    },
    aboutValue: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },
    tagline: {
        fontSize: 14,
        color: '#27ae60',
        textAlign: 'center',
        marginTop: 16,
        fontStyle: 'italic',
    },
});

export default Settings;
