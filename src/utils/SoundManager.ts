// Sound Manager for MatchWell
// Handles all game audio: sound effects and background music
// Supports per-theme background music

import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '../types';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

// Storage key for sound settings
const SOUND_SETTINGS_KEY = '@MatchWell:soundSettings';

// Sound file references - extended with new sounds and theme music
type SoundName =
    | 'tile_select'
    | 'combo'
    | 'match_4'
    | 'match_5'
    | 'invalid_move'
    | 'level_complete'
    | 'game_over'
    | 'bgm_menu'
    | 'bgm_theme_trash'
    | 'bgm_theme_pollution'
    | 'bgm_theme_water'
    | 'bgm_theme_energy'
    | 'bgm_theme_forest';

interface SoundConfig {
    filename: string;
    volume: number;
    loop: boolean;
}

const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
    // Sound Effects
    tile_select: { filename: 'tile_select.mp3', volume: 0.5, loop: false },
    combo: { filename: 'combo.mp3', volume: 0.7, loop: false },
    match_4: { filename: 'match_4.mp3', volume: 0.6, loop: false },
    match_5: { filename: 'match_5.mp3', volume: 0.7, loop: false },
    invalid_move: { filename: 'invalid_move.mp3', volume: 0.4, loop: false },
    level_complete: { filename: 'level_complete.mp3', volume: 0.8, loop: false },
    game_over: { filename: 'game_over.mp3', volume: 0.6, loop: false },

    // Background Music
    bgm_menu: { filename: 'bgm_menu.mp3', volume: 0.4, loop: true },
    bgm_theme_trash: { filename: 'bgm_theme_trash.mp3', volume: 0.5, loop: true },
    bgm_theme_pollution: { filename: 'bgm_theme_pollution.mp3', volume: 0.5, loop: true },
    bgm_theme_water: { filename: 'bgm_theme_water.mp3', volume: 0.5, loop: true },
    bgm_theme_energy: { filename: 'bgm_theme_energy.mp3', volume: 0.5, loop: true },
    bgm_theme_forest: { filename: 'bgm_theme_forest.mp3', volume: 0.5, loop: true },
};

// Theme to BGM mapping
const THEME_BGM_MAP: Record<ThemeType, SoundName> = {
    'trash-sorting': 'bgm_theme_trash',
    'pollution': 'bgm_theme_pollution',
    'water-conservation': 'bgm_theme_water',
    'energy-efficiency': 'bgm_theme_energy',
    'deforestation': 'bgm_theme_forest',
};

// Cache for loaded sounds
const soundCache: Partial<Record<SoundName, Sound>> = {};

// Current playing background music
let currentBgm: Sound | null = null;
let currentBgmName: SoundName | null = null;

// Sound settings
let sfxEnabled = true;
let musicEnabled = true;
let sfxVolume = 1.0;
let musicVolume = 1.0;

/**
 * Load sound settings from AsyncStorage
 */
export const loadSoundSettings = async (): Promise<void> => {
    try {
        const saved = await AsyncStorage.getItem(SOUND_SETTINGS_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            sfxEnabled = settings.sfxEnabled ?? true;
            musicEnabled = settings.musicEnabled ?? true;
            sfxVolume = settings.sfxVolume ?? 1.0;
            musicVolume = settings.musicVolume ?? 1.0;
            console.log('✅ Sound settings loaded:', { sfxEnabled, musicEnabled });
        }
    } catch (error) {
        console.warn('Failed to load sound settings:', error);
    }
};

/**
 * Save sound settings to AsyncStorage
 */
const saveSoundSettings = async (): Promise<void> => {
    try {
        const settings = { sfxEnabled, musicEnabled, sfxVolume, musicVolume };
        await AsyncStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
        console.log('✅ Sound settings saved');
    } catch (error) {
        console.warn('Failed to save sound settings:', error);
    }
};

/**
 * Load a sound file and cache it
 */
const loadSound = (name: SoundName): Promise<Sound> => {
    return new Promise((resolve, reject) => {
        if (soundCache[name]) {
            resolve(soundCache[name]!);
            return;
        }

        const config = SOUND_CONFIG[name];
        const sound = new Sound(config.filename, Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.warn(`Failed to load sound: ${name}`, error);
                reject(error);
                return;
            }

            sound.setVolume(config.volume);
            if (config.loop) {
                sound.setNumberOfLoops(-1);
            }

            soundCache[name] = sound;
            resolve(sound);
        });
    });
};

/**
 * Preload essential sounds
 */
export const preloadSounds = async (): Promise<void> => {
    // Load saved settings first
    await loadSoundSettings();

    // Preload essential SFX and menu music
    const essentialSounds: SoundName[] = [
        'tile_select',
        'combo',
        'invalid_move',
        'bgm_menu',
    ];

    await Promise.all(
        essentialSounds.map((name) =>
            loadSound(name).catch((err) => {
                console.warn(`Could not preload ${name}:`, err);
            })
        )
    );

    console.log('✅ Essential sounds preloaded');
};

/**
 * Play a sound effect
 */
export const playSfx = async (name: SoundName): Promise<void> => {
    if (!sfxEnabled) return;
    // Don't play BGM through playSfx
    if (name.startsWith('bgm_')) return;

    try {
        const sound = await loadSound(name);
        sound.setVolume(SOUND_CONFIG[name].volume * sfxVolume);
        sound.stop(() => {
            sound.play((success) => {
                if (!success) {
                    console.warn(`Sound ${name} playback failed`);
                }
            });
        });
    } catch (error) {
        console.warn(`Could not play sound ${name}:`, error);
    }
};

/**
 * Play background music (menu or theme-specific)
 */
export const playBgm = async (name: SoundName): Promise<void> => {
    if (!musicEnabled) return;

    // Don't restart if same music is already playing
    if (currentBgmName === name && currentBgm) {
        return;
    }

    // Stop current music
    stopBgm();

    try {
        const sound = await loadSound(name);
        sound.setVolume(SOUND_CONFIG[name].volume * musicVolume);
        sound.play((success) => {
            if (!success) {
                console.warn(`BGM ${name} playback failed`);
            }
        });

        currentBgm = sound;
        currentBgmName = name;
        console.log(`🎵 Playing BGM: ${name}`);
    } catch (error) {
        console.warn(`Could not play BGM ${name}:`, error);
    }
};

/**
 * Play theme-specific background music
 */
export const playThemeBgm = async (theme: ThemeType): Promise<void> => {
    const bgmName = THEME_BGM_MAP[theme];
    if (bgmName) {
        await playBgm(bgmName);
    } else {
        console.warn(`No BGM found for theme: ${theme}`);
    }
};

/**
 * Stop background music - stops all cached BGM sounds to prevent overlap
 */
export const stopBgm = (): void => {
    // Stop the tracked currentBgm
    if (currentBgm) {
        currentBgm.stop();
    }

    // Also stop ALL cached BGM sounds to prevent any overlap
    const bgmNames: SoundName[] = [
        'bgm_menu',
        'bgm_theme_trash',
        'bgm_theme_pollution',
        'bgm_theme_water',
        'bgm_theme_energy',
        'bgm_theme_forest',
    ];

    bgmNames.forEach(bgmName => {
        const cachedSound = soundCache[bgmName];
        if (cachedSound) {
            cachedSound.stop();
        }
    });

    currentBgm = null;
    currentBgmName = null;
    console.log('🔇 All BGM stopped');
};

/**
 * Pause background music
 */
export const pauseBgm = (): void => {
    if (currentBgm) {
        currentBgm.pause();
    }
};

/**
 * Resume background music
 */
export const resumeBgm = (): void => {
    if (currentBgm && musicEnabled) {
        currentBgm.play();
    }
};

/**
 * Toggle sound effects
 */
export const toggleSfx = (enabled?: boolean): boolean => {
    sfxEnabled = enabled !== undefined ? enabled : !sfxEnabled;
    saveSoundSettings();
    return sfxEnabled;
};

/**
 * Toggle music
 */
export const toggleMusic = (enabled?: boolean): boolean => {
    musicEnabled = enabled !== undefined ? enabled : !musicEnabled;

    if (!musicEnabled) {
        stopBgm();
    }

    saveSoundSettings();
    return musicEnabled;
};

/**
 * Set SFX volume (0.0 - 1.0)
 */
export const setSfxVolume = (volume: number): void => {
    sfxVolume = Math.max(0, Math.min(1, volume));
};

/**
 * Set Music volume (0.0 - 1.0)
 */
export const setMusicVolume = (volume: number): void => {
    musicVolume = Math.max(0, Math.min(1, volume));

    if (currentBgm && currentBgmName) {
        currentBgm.setVolume(SOUND_CONFIG[currentBgmName].volume * musicVolume);
    }
};

/**
 * Get current settings
 */
export const getSoundSettings = () => ({
    sfxEnabled,
    musicEnabled,
    sfxVolume,
    musicVolume,
});

/**
 * Release all sounds (cleanup)
 */
export const releaseSounds = (): void => {
    stopBgm();

    Object.values(soundCache).forEach((sound) => {
        if (sound) {
            sound.release();
        }
    });

    Object.keys(soundCache).forEach((key) => {
        delete soundCache[key as SoundName];
    });
};

// Default export for convenience
export default {
    preloadSounds,
    playSfx,
    playBgm,
    playThemeBgm,
    stopBgm,
    pauseBgm,
    resumeBgm,
    toggleSfx,
    toggleMusic,
    setSfxVolume,
    setMusicVolume,
    getSoundSettings,
    releaseSounds,
};
