// Leaderboard API Service
// Handles all API calls to the leaderboard backend

import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { VERSION } from '../config/version';

const API_BASE_URL = 'https://semo-lab.com/matchwell/leaderboard';

const DEVICE_ID_KEY = '@matchwell_device_id';
const USERNAME_KEY = '@matchwell_username';
const DEVICE_SECRET_KEY = '@matchwell_device_secret';

// Types
export interface PlayerData {
    username: string;
    total_stars: number;
    completed_levels: number;
    medals_bronze: number;
    medals_silver: number;
    medals_gold: number;
    medals_platinum: number;
    medals_earth: number;
    total_medals: number;
    endless_trash: number;
    endless_pollution: number;
    endless_water: number;
    endless_energy: number;
    endless_forest: number;
    global_rank: number;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    score?: number;
    total_stars: number;
    total_medals: number;
    total_endless?: number;
    score_per_move?: number;
    moves?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Get or create device ID
export const getDeviceId = async (): Promise<string> => {
    try {
        let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = uuidv4();
            await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    } catch (error) {
        console.error('Error getting device ID:', error);
        return uuidv4();
    }
};

// Get stored username
export const getStoredUsername = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(USERNAME_KEY);
    } catch (error) {
        console.error('Error getting username:', error);
        return null;
    }
};

// Save username locally
export const saveUsername = async (username: string): Promise<void> => {
    await AsyncStorage.setItem(USERNAME_KEY, username);
};

// API Helpers
const apiCall = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: object
): Promise<ApiResponse<T>> => {
    try {
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body && method === 'POST') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        const data = await response.json();

        return data;
    } catch (error) {
        console.error(`API call failed (${endpoint}):`, error);
        return {
            success: false,
            error: 'Network error. Please check your connection.',
        };
    }
};

// Check username availability
export const checkUsername = async (username: string): Promise<{ available: boolean; error?: string }> => {
    const response = await apiCall<{ available: boolean }>('check-username.php', 'POST', { username });

    if (!response.success) {
        return { available: false, error: response.error };
    }

    return { available: response.data?.available ?? false };
};

/**
 * The device key that authorises leaderboard writes.
 *
 * Issued by the server at registration and sent automatically with every
 * publish. It is deliberately NOT a login: the player never sees or types it.
 * Before this existed, anyone who learned a device_id could overwrite that
 * player's scores.
 *
 * It travels with a cloud backup, so restoring on another device keeps that
 * player's leaderboard entry writable there.
 */
export const getDeviceSecret = async (): Promise<string | null> => {
    return AsyncStorage.getItem(DEVICE_SECRET_KEY);
};

const saveDeviceSecret = async (secret: string): Promise<void> => {
    await AsyncStorage.setItem(DEVICE_SECRET_KEY, secret);
};

// Register new player
export const registerPlayer = async (username: string): Promise<{ success: boolean; error?: string }> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{ registered: boolean; username: string; device_secret?: string }>(
        'register.php',
        'POST',
        { device_id: deviceId, username, build: VERSION.buildNumber }
    );

    if (response.success && response.data?.registered) {
        await saveUsername(response.data.username);
        if (response.data.device_secret) {
            await saveDeviceSecret(response.data.device_secret);
        }
        return { success: true };
    }

    return { success: false, error: response.error };
};

/**
 * Change the player's name.
 *
 * Renames the leaderboard entry and, server-side, the cloud backup account in
 * the same transaction - they share the name as their key, so they must move
 * together. Authorised by the device key, not a login.
 */
export const renamePlayer = async (
    newUsername: string,
): Promise<{ success: boolean; username?: string; error?: string }> => {
    const deviceId = await getDeviceId();
    const deviceSecret = await getDeviceSecret();

    const response = await apiCall<{ username: string }>(
        'rename.php',
        'POST',
        {
            device_id: deviceId,
            device_secret: deviceSecret,
            new_username: newUsername.trim(),
            build: VERSION.buildNumber,
        }
    );

    if (response.success && response.data?.username) {
        await saveUsername(response.data.username);
        return { success: true, username: response.data.username };
    }

    return { success: false, error: response.error };
};

// Publish scores
export interface PublishData {
    total_stars: number;
    completed_levels: number;
    medals: {
        bronze: number;
        silver: number;
        gold: number;
        diamond: number;
        'earth-saver': number;
    };
    endless_scores: {
        trash: number;
        pollution: number;
        water: number;
        energy: number;
        forest: number;
    };
    endless_moves: {
        trash: number;
        pollution: number;
        water: number;
        energy: number;
        forest: number;
    };
}

export const publishScores = async (data: PublishData): Promise<{ success: boolean; player?: PlayerData; error?: string }> => {
    const deviceId = await getDeviceId();
    const deviceSecret = await getDeviceSecret();

    const response = await apiCall<{ published: boolean; player: PlayerData }>(
        'publish.php',
        'POST',
        { device_id: deviceId, device_secret: deviceSecret, build: VERSION.buildNumber, ...data }
    );

    if (response.success && response.data?.published) {
        return { success: true, player: response.data.player };
    }

    return { success: false, error: response.error };
};

// Get global leaderboard
export const getGlobalLeaderboard = async (
    limit: number = 50,
    offset: number = 0
): Promise<{ rankings: LeaderboardEntry[]; total: number; player?: PlayerData | null; error?: string }> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{
        rankings: LeaderboardEntry[];
        total: number;
        player: PlayerData | null;
    }>(`global.php?limit=${limit}&offset=${offset}&device_id=${deviceId}`);

    if (response.success && response.data) {
        return {
            rankings: response.data.rankings,
            total: response.data.total,
            player: response.data.player,
        };
    }

    return { rankings: [], total: 0, error: response.error };
};

// Get theme leaderboard
export const getThemeLeaderboard = async (
    theme: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ rankings: LeaderboardEntry[]; total: number; player?: PlayerData | null; error?: string }> => {
    const deviceId = await getDeviceId();

    // Map theme names
    const themeMap: Record<string, string> = {
        'trash-sorting': 'trash',
        'pollution': 'pollution',
        'water-conservation': 'water',
        'energy-efficiency': 'energy',
        'deforestation': 'forest',
    };

    const themeName = themeMap[theme] || theme;

    const response = await apiCall<{
        rankings: LeaderboardEntry[];
        total: number;
        player: PlayerData | null;
    }>(`theme.php?theme=${themeName}&limit=${limit}&offset=${offset}&device_id=${deviceId}`);

    if (response.success && response.data) {
        return {
            rankings: response.data.rankings,
            total: response.data.total,
            player: response.data.player,
        };
    }

    return { rankings: [], total: 0, error: response.error };
};

// Get player info
export const getPlayerInfo = async (): Promise<{ registered: boolean; player?: PlayerData; totalPlayers?: number }> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{
        registered: boolean;
        player: PlayerData;
        total_players: number;
    }>(`player.php?device_id=${deviceId}`);

    if (response.success && response.data) {
        return {
            registered: response.data.registered,
            player: response.data.player,
            totalPlayers: response.data.total_players,
        };
    }

    return { registered: false };
};
