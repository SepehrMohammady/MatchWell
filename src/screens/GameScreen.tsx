// Game Screen - Main gameplay screen
import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Text,
    TouchableOpacity,
    ImageBackground,
    StatusBar,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../context/GameStore';
import GameBoard from '../components/Game/GameBoard';
import HUD from '../components/UI/HUD';
import { THEME_CONFIGS, getLevelById } from '../themes';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { playBgm, stopBgm, pauseBgm, resumeBgm, playSfx, getSoundSettings, toggleSfx, toggleMusic } from '../utils/SoundManager';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

const GameScreen: React.FC<Props> = ({ navigation, route }) => {
    const { levelId } = route.params;
    const insets = useSafeAreaInsets();

    const initializeGame = useGameStore((state) => state.initializeGame);
    const isGameOver = useGameStore((state) => state.isGameOver);
    const isLevelComplete = useGameStore((state) => state.isLevelComplete);
    const score = useGameStore((state) => state.score);
    const targetScore = useGameStore((state) => state.targetScore);
    const theme = useGameStore((state) => state.theme);
    const level = useGameStore((state) => state.level);
    const isPaused = useGameStore((state) => state.isPaused);
    const pauseGame = useGameStore((state) => state.pauseGame);
    const resumeGameState = useGameStore((state) => state.resumeGame);
    const markLevelComplete = useGameStore((state) => state.markLevelComplete);

    const levelConfig = getLevelById(levelId);
    const themeConfig = THEME_CONFIGS[theme];

    // Sound settings state
    const [sfxEnabled, setSfxEnabled] = useState(true);
    const [musicEnabled, setMusicEnabled] = useState(true);

    // Load sound settings when pausing
    useEffect(() => {
        if (isPaused) {
            const settings = getSoundSettings();
            setSfxEnabled(settings.sfxEnabled);
            setMusicEnabled(settings.musicEnabled);
        }
    }, [isPaused]);

    // Start gameplay music when entering the game
    useEffect(() => {
        playBgm('bgm_gameplay');

        return () => {
            stopBgm();
        };
    }, []);

    // Initialize the game level with isEndless flag
    useEffect(() => {
        const isEndless = route.params?.isEndless || false;
        initializeGame(levelId, isEndless);
    }, [levelId, initializeGame, route.params?.isEndless]);

    useEffect(() => {
        if (isLevelComplete) {
            markLevelComplete(levelId, score);
        }
    }, [isLevelComplete, levelId, score, markLevelComplete]);

    const handlePause = useCallback(() => {
        pauseBgm();
        pauseGame();
    }, [pauseGame]);

    const handleResume = useCallback(() => {
        resumeBgm();
        resumeGameState();
    }, [resumeGameState]);


    const handleRestart = useCallback(() => {
        initializeGame(levelId);
    }, [levelId, initializeGame]);

    const handleNextLevel = useCallback(() => {
        const nextLevelId = levelId + 1;
        if (getLevelById(nextLevelId)) {
            initializeGame(nextLevelId);
            navigation.setParams({ levelId: nextLevelId });
        } else {
            navigation.navigate('LevelSelect');
        }
    }, [levelId, initializeGame, navigation]);

    const handleBackToMenu = useCallback(() => {
        resumeGameState(); // Dismiss the pause menu first
        navigation.navigate('MainMenu');
    }, [navigation, resumeGameState]);

    const handleBackToLevels = useCallback(() => {
        resumeGameState(); // Dismiss the pause menu first
        navigation.navigate('LevelSelect');
    }, [navigation, resumeGameState]);

    const handleSfxToggle = (value: boolean) => {
        setSfxEnabled(value);
        toggleSfx(value);
        if (value) playSfx('tile_select');
    };

    const handleMusicToggle = (value: boolean) => {
        setMusicEnabled(value);
        toggleMusic(value);
    };

    // Calculate sky color based on score progress
    const getBackgroundStyle = () => {
        const progress = Math.min(score / targetScore, 1);
        // Interpolate from gray (polluted) to blue (clean)
        const grayValue = Math.floor(128 - progress * 60);
        const blueValue = Math.floor(140 + progress * 115);
        return {
            backgroundColor: `rgb(${grayValue}, ${grayValue + 20}, ${blueValue})`,
        };
    };

    return (
        <View style={[styles.container, getBackgroundStyle(), { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />

            <HUD onPause={handlePause} />

            <View style={styles.boardContainer}>
                <GameBoard />
            </View>

            {/* Environmental Fact */}
            {levelConfig?.environmentalFact && (
                <View style={styles.factContainer}>
                    <Text style={styles.factIcon}>💡</Text>
                    <Text style={styles.factText}>{levelConfig.environmentalFact}</Text>
                </View>
            )}

            {/* Pause Modal */}
            <Modal visible={isPaused} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>⏸️ Paused</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={handleResume}>
                            <Text style={styles.modalButtonText}>▶️ Resume</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={handleRestart}>
                            <Text style={styles.modalButtonText}>🔄 Restart</Text>
                        </TouchableOpacity>

                        {/* Sound Controls */}
                        <View style={styles.soundControlsContainer}>
                            <View style={styles.soundRow}>
                                <Text style={styles.soundLabel}>🎵 Music</Text>
                                <Switch
                                    value={musicEnabled}
                                    onValueChange={handleMusicToggle}
                                    trackColor={{ false: '#333', true: '#27ae60' }}
                                    thumbColor={musicEnabled ? '#2ecc71' : '#666'}
                                />
                            </View>
                            <View style={styles.soundRow}>
                                <Text style={styles.soundLabel}>🔊 SFX</Text>
                                <Switch
                                    value={sfxEnabled}
                                    onValueChange={handleSfxToggle}
                                    trackColor={{ false: '#333', true: '#27ae60' }}
                                    thumbColor={sfxEnabled ? '#2ecc71' : '#666'}
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={handleBackToLevels}>
                            <Text style={styles.modalButtonText}>📋 Levels</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={handleBackToMenu}>
                            <Text style={styles.modalButtonText}>🏠 Main Menu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Level Complete Modal */}
            <Modal visible={isLevelComplete} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🎉 Level Complete!</Text>
                        <Text style={styles.scoreText}>Score: {score.toLocaleString()}</Text>
                        <View style={styles.starsContainer}>
                            <Text style={styles.star}>{score >= targetScore ? '⭐' : '☆'}</Text>
                            <Text style={styles.star}>{score >= targetScore * 1.5 ? '⭐' : '☆'}</Text>
                            <Text style={styles.star}>{score >= targetScore * 2 ? '⭐' : '☆'}</Text>
                        </View>
                        <Text style={styles.environmentMessage}>🌍 You're helping save the planet!</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={handleNextLevel}>
                            <Text style={styles.modalButtonText}>➡️ Next Level</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={handleRestart}>
                            <Text style={styles.modalButtonText}>🔄 Play Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={handleBackToLevels}>
                            <Text style={styles.modalButtonText}>📋 Levels</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Game Over Modal */}
            <Modal visible={isGameOver} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>😢 Out of Moves!</Text>
                        <Text style={styles.scoreText}>Score: {score.toLocaleString()}</Text>
                        <Text style={styles.targetText}>Target was: {targetScore.toLocaleString()}</Text>
                        <Text style={styles.encourageText}>Don't give up! The planet needs you! 🌎</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={handleRestart}>
                            <Text style={styles.modalButtonText}>🔄 Try Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.secondaryButton]} onPress={handleBackToLevels}>
                            <Text style={styles.modalButtonText}>📋 Levels</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    boardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    factContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        margin: 10,
        padding: 12,
        borderRadius: 12,
    },
    factIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    factText: {
        flex: 1,
        color: '#fff',
        fontSize: 12,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#2c3e50',
        borderRadius: 20,
        padding: 24,
        width: '80%',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#34495e',
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    scoreText: {
        fontSize: 24,
        color: '#FFD700',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    targetText: {
        fontSize: 16,
        color: '#aaa',
        marginBottom: 12,
    },
    starsContainer: {
        flexDirection: 'row',
        marginVertical: 16,
    },
    star: {
        fontSize: 40,
        marginHorizontal: 8,
    },
    environmentMessage: {
        fontSize: 14,
        color: '#2ecc71',
        marginBottom: 20,
        textAlign: 'center',
    },
    encourageText: {
        fontSize: 14,
        color: '#3498db',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: '#27ae60',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 25,
        marginVertical: 6,
        minWidth: 200,
    },
    secondaryButton: {
        backgroundColor: '#7f8c8d',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    soundControlsContainer: {
        backgroundColor: '#34495e',
        borderRadius: 12,
        padding: 12,
        marginVertical: 10,
        width: '100%',
    },
    soundRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    soundLabel: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
});

export default GameScreen;
