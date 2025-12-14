// Sound Manager for MatchWell
// Handles all game audio: sound effects and background music

import Sound from 'react-native-sound';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

// Sound file references
type SoundName = 'tile_select' | 'combo' | 'invalid_move' | 'bgm_menu' | 'bgm_gameplay';

interface SoundConfig {
    filename: string;
    volume: number;
    loop: boolean;
}

const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
    tile_select: { filename: 'tile_select.mp3', volume: 0.5, loop: false },
    combo: { filename: 'combo.mp3', volume: 0.7, loop: false },
    invalid_move: { filename: 'invalid_move.mp3', volume: 0.4, loop: false },
    bgm_menu: { filename: 'bgm_menu.mp3', volume: 0.3, loop: true },
    bgm_gameplay: { filename: 'bgm_gameplay.mp3', volume: 0.25, loop: true },
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
 * Preload all sounds
 */
export const preloadSounds = async (): Promise<void> => {
    const soundNames = Object.keys(SOUND_CONFIG) as SoundName[];

    await Promise.all(
        soundNames.map((name) =>
            loadSound(name).catch((err) => {
                console.warn(`Could not preload ${name}:`, err);
            })
        )
    );

    console.log('✅ Sounds preloaded');
};

/**
 * Play a sound effect
 */
export const playSfx = async (name: SoundName): Promise<void> => {
    if (!sfxEnabled) return;
    if (name === 'bgm_menu' || name === 'bgm_gameplay') return; // Use playBgm for music

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
 * Play background music
 */
export const playBgm = async (name: 'bgm_menu' | 'bgm_gameplay'): Promise<void> => {
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
    } catch (error) {
        console.warn(`Could not play BGM ${name}:`, error);
    }
};

/**
 * Stop background music
 */
export const stopBgm = (): void => {
    if (currentBgm) {
        currentBgm.stop();
        currentBgm = null;
        currentBgmName = null;
    }
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
