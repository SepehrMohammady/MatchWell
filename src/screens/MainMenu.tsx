// Main Menu Screen
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useEffect } from 'react';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MainMenu: React.FC<Props> = ({ navigation }) => {
    const titleScale = useSharedValue(1);
    const earthRotation = useSharedValue(0);

    useEffect(() => {
        // Title pulse animation
        titleScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        );

        // Earth rotation
        earthRotation.value = withRepeat(
            withTiming(360, { duration: 20000 }),
            -1,
            false
        );
    }, []);

    const titleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: titleScale.value }],
    }));

    const earthStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${earthRotation.value}deg` }],
    }));

    const handlePlay = () => {
        navigation.navigate('LevelSelect');
    };

    const handleEndless = () => {
        // Start endless mode with level 1 settings but infinite moves
        navigation.navigate('Game', { levelId: 1 });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Decorative elements */}
            <View style={styles.decorTop}>
                <Text style={styles.cloud}>☁️</Text>
                <Text style={[styles.cloud, styles.cloudRight]}>☁️</Text>
            </View>

            {/* Title section */}
            <View style={styles.titleSection}>
                <Animated.Text style={[styles.earth, earthStyle]}>🌍</Animated.Text>
                <Animated.Text style={[styles.title, titleStyle]}>
                    MatchWell
                </Animated.Text>
                <Text style={styles.subtitle}>Save the Planet, One Match at a Time!</Text>
            </View>

            {/* Menu buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
                    <Text style={styles.playButtonText}>🎮 Play</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleEndless}>
                    <Text style={styles.secondaryButtonText}>♾️ Endless Mode</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom decoration */}
            <View style={styles.bottomDecor}>
                <Text style={styles.treeEmoji}>🌲</Text>
                <Text style={styles.treeEmoji}>🌳</Text>
                <Text style={styles.treeEmoji}>🌲</Text>
                <Text style={styles.treeEmoji}>🌴</Text>
                <Text style={styles.treeEmoji}>🌳</Text>
            </View>

            {/* Version and credits */}
            <Text style={styles.version}>v1.0.0 • Made with 💚 for Earth</Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    decorTop: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    cloud: {
        fontSize: 40,
        opacity: 0.5,
    },
    cloudRight: {
        marginTop: 30,
    },
    titleSection: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    earth: {
        fontSize: 80,
        marginBottom: 16,
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#2ecc71',
        textShadowColor: 'rgba(46, 204, 113, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#87CEEB',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: 40,
        gap: 16,
    },
    playButton: {
        backgroundColor: '#27ae60',
        paddingVertical: 20,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    playButtonText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3498db',
    },
    secondaryButtonText: {
        color: '#3498db',
        fontSize: 20,
        fontWeight: '600',
    },
    bottomDecor: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingBottom: 20,
        gap: 10,
    },
    treeEmoji: {
        fontSize: 32,
    },
    version: {
        color: '#666',
        fontSize: 12,
        paddingBottom: 20,
    },
});

export default MainMenu;
