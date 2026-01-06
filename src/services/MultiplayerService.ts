// Multiplayer API Service
// Handles all API calls to the multiplayer backend

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId } from './LeaderboardService';
import { ThemeType } from '../types';

const API_BASE_URL = 'https://sepehrmohammady.ir/semolab/matchwell/multiplayer';

// Types
export type GameMode = 'race' | 'timed' | 'moves';
export type RoomStatus = 'waiting' | 'active' | 'completed';

export interface Room {
    id: number;
    code: string;
    name: string;
    game_mode: GameMode;
    target_score?: number;
    duration_seconds?: number;
    moves_limit?: number;
    theme?: ThemeType;
    theme_voting: boolean;
    status: RoomStatus;
    max_players: number;
    start_time?: string;
    end_time?: string;
    time_remaining?: number;
}

export interface Participant {
    device_id?: string;
    username: string;
    current_score: number;
    moves_used: number;
    completion_time?: number;
    has_finished: boolean;
    theme_vote?: string;
}

export interface ThemeVote {
    theme_vote: string;
    votes: number;
}

export interface RoomListItem {
    code: string;
    name: string;
    game_mode: GameMode;
    theme?: string;
    is_host: boolean;
    my_score: number;
    player_count: number;
    max_players: number;
    time_remaining?: number;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// API Helper
const apiCall = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: object
): Promise<ApiResponse<T>> => {
    try {
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (body && method === 'POST') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error(`Multiplayer API call failed (${endpoint}):`, error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
};

// Create a new room
export interface CreateRoomParams {
    room_name: string;
    password: string;
    game_mode: GameMode;
    target_score?: number;
    duration_seconds?: number;
    moves_limit?: number;
    theme?: ThemeType;
    theme_voting?: boolean;
    max_players?: number;
}

export const createRoom = async (params: CreateRoomParams): Promise<{ room_code?: string; error?: string }> => {
    const deviceId = await getDeviceId();
    const username = await AsyncStorage.getItem('playerName') || 'Player';

    const response = await apiCall<{ created: boolean; room_code: string }>('create.php', 'POST', {
        device_id: deviceId,
        username,
        ...params
    });

    if (response.success && response.data?.created) {
        return { room_code: response.data.room_code };
    }
    return { error: response.error };
};

// Join a room
export const joinRoom = async (roomCode: string, password: string): Promise<{ room?: Room; error?: string }> => {
    const deviceId = await getDeviceId();
    const username = await AsyncStorage.getItem('playerName') || 'Player';

    const response = await apiCall<{ joined: boolean; room: Room }>('join.php', 'POST', {
        device_id: deviceId,
        room_code: roomCode,
        password,
        username
    });

    if (response.success && response.data?.joined) {
        return { room: response.data.room };
    }
    return { error: response.error };
};

// Leave a room
export const leaveRoom = async (roomCode: string): Promise<{ success: boolean; error?: string }> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{ left: boolean }>('leave.php', 'POST', {
        device_id: deviceId,
        room_code: roomCode
    });

    return { success: response.success && (response.data?.left ?? false), error: response.error };
};

// Start game (host only)
export const startGame = async (roomCode: string, theme?: ThemeType): Promise<{
    started?: boolean;
    theme?: string;
    start_time?: string;
    end_time?: string;
    error?: string
}> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{
        started: boolean;
        theme: string;
        start_time: string;
        end_time: string;
        game_mode: GameMode;
        target_score?: number;
        moves_limit?: number;
    }>('start.php', 'POST', {
        device_id: deviceId,
        room_code: roomCode,
        theme
    });

    if (response.success && response.data?.started) {
        return response.data;
    }
    return { error: response.error };
};

// Vote for theme
export const voteTheme = async (roomCode: string, theme: ThemeType): Promise<{ votes?: ThemeVote[]; error?: string }> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{ voted: boolean; votes: ThemeVote[] }>('vote.php', 'POST', {
        device_id: deviceId,
        room_code: roomCode,
        theme
    });

    if (response.success && response.data?.voted) {
        return { votes: response.data.votes };
    }
    return { error: response.error };
};

// Update score during game
export const updateScore = async (
    roomCode: string,
    score: number,
    movesUsed: number,
    finished: boolean = false
): Promise<{
    rankings?: Participant[];
    room_status?: RoomStatus;
    error?: string
}> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{
        updated: boolean;
        rankings: Participant[];
        room_status: RoomStatus;
    }>('update-score.php', 'POST', {
        device_id: deviceId,
        room_code: roomCode,
        score,
        moves_used: movesUsed,
        finished
    });

    if (response.success && response.data?.updated) {
        return { rankings: response.data.rankings, room_status: response.data.room_status };
    }
    return { error: response.error };
};

// Get room status
export const getRoomStatus = async (roomCode: string): Promise<{
    room?: Room;
    is_host?: boolean;
    participants?: Participant[];
    theme_votes?: ThemeVote[];
    my_score?: number;
    my_username?: string;
    my_device_id?: string;
    my_finished?: boolean;
    host_username?: string;
    error?: string;
}> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{
        room: Room;
        is_host: boolean;
        host_username: string;
        participants: Participant[];
        theme_votes: ThemeVote[];
        my_score: number;
        my_username: string;
        my_device_id: string;
        my_finished: boolean;
    }>(`status.php?room_code=${roomCode}&device_id=${deviceId}`);

    if (response.success && response.data) {
        return response.data;
    }
    return { error: response.error };
};

// List player's rooms
export const listMyRooms = async (): Promise<{
    active?: RoomListItem[];
    waiting?: RoomListItem[];
    completed?: RoomListItem[];
    error?: string;
}> => {
    const deviceId = await getDeviceId();

    const response = await apiCall<{
        active: RoomListItem[];
        waiting: RoomListItem[];
        completed: RoomListItem[];
    }>(`list.php?device_id=${deviceId}`);

    if (response.success && response.data) {
        return response.data;
    }
    return { error: response.error };
};
