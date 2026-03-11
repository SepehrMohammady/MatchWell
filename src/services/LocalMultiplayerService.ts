// Local Multiplayer Service
// Handles Bluetooth/WiFi Direct peer-to-peer multiplayer via Google Nearby Connections API
// Uses transport abstraction for future iOS/Windows support

let NearbyConnection: any = null;
let Strategy: any = { P2P_STAR: 2 };
let Payload: any = { BYTES: 1 };
let NearbyInitError: string | null = null;

try {
    const NC = require('react-native-google-nearby-connection');
    NearbyConnection = NC.default || NC;
    Strategy = NC.Strategy || Strategy;
    Payload = NC.Payload || Payload;
} catch (e: any) {
    NearbyInitError = String(e.message || e);
    console.warn('⚠️ react-native-google-nearby-connection not available:', e);
}
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeType } from '../types';
import { getDeviceId } from './LeaderboardService';
import { useGameStore } from '../context/GameStore';

const SERVICE_ID = 'com.matchwell.local_multiplayer';

// ============================================================
// Types
// ============================================================

export type LocalGameMode = 'race' | 'timed' | 'moves';

export interface LocalPlayer {
    endpointId: string;
    name: string;
    score: number;
    moves: number;
    finished: boolean;
    connected: boolean;
}

export interface LocalGameConfig {
    gameMode: LocalGameMode;
    theme?: ThemeType;
    themeVoting?: boolean;
    targetScore?: number;
    movesLimit?: number;
    durationSeconds?: number;
}

// Message types for P2P communication
export type MessageType =
    | 'PLAYER_INFO'
    | 'GAME_CONFIG'
    | 'GAME_START'
    | 'SCORE_UPDATE'
    | 'RANKINGS'
    | 'GAME_END'
    | 'PLAYER_LEFT'
    | 'VOTE_THEME'
    | 'VOTE_UPDATE';

export interface P2PMessage {
    type: MessageType;
    payload: any;
    timestamp: number;
}

// Callbacks
export interface LocalMultiplayerCallbacks {
    onPlayerJoined?: (player: LocalPlayer) => void;
    onPlayerLeft?: (endpointId: string) => void;
    onGameConfigReceived?: (config: LocalGameConfig) => void;
    onGameStarted?: (config: LocalGameConfig) => void;
    onRankingsUpdated?: (rankings: LocalPlayer[]) => void;
    onGameEnded?: () => void;
    onScoreUpdate?: (endpointId: string, score: number, moves: number, finished: boolean) => void;
    onError?: (error: string) => void;
    onConnectionStatusChanged?: (status: 'advertising' | 'discovering' | 'connected' | 'disconnected' | 'idle') => void;
    onThemeVoteReceived?: (endpointId: string, themeId: string) => void;
    onVotesUpdated?: (votes: Record<string, string>) => void;
}

// ============================================================
// Local Multiplayer Service
// ============================================================

class LocalMultiplayerServiceImpl {
    private isHost: boolean = false;
    private playerName: string = 'Player';
    private players: Map<string, LocalPlayer> = new Map();
    private gameConfig: LocalGameConfig | null = null;
    private callbacks: LocalMultiplayerCallbacks = {};
    private connectedEndpoints: Set<string> = new Set();
    private eventSubscriptions: any[] = [];
    private gameStarted: boolean = false;
    private hostEndpointId: string | null = null;

    private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

    // --------------------------------------------------------
    // Setup / Teardown
    // --------------------------------------------------------

    setCallbacks(callbacks: LocalMultiplayerCallbacks) {
        this.callbacks = callbacks;
    }

    async getPlayerName(): Promise<string> {
        const name = await AsyncStorage.getItem('playerName');
        this.playerName = name || 'Player';
        return this.playerName;
    }

    getPlayerNameSync(): string {
        return this.playerName;
    }

    // --------------------------------------------------------
    // Permissions
    // --------------------------------------------------------

    async requestPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            const apiLevel = Platform.Version;
            const permissions: any[] = [
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ];

            // Android 12+ (API 31+)
            if (apiLevel >= 31) {
                permissions.push(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                );
            }

            // Android 13+ (API 33+)
            if (apiLevel >= 33) {
                permissions.push('android.permission.NEARBY_WIFI_DEVICES');
            }

            const results = await PermissionsAndroid.requestMultiple(permissions);
            const allGranted = Object.values(results).every(
                (r) => r === PermissionsAndroid.RESULTS.GRANTED
            );

            if (!allGranted) {
                console.warn('❌ Not all permissions granted for local multiplayer');
                this.callbacks.onError?.('Bluetooth and location permissions are required for local multiplayer.');
            }
            return allGranted;
        } catch (error) {
            console.error('Permission request error:', error);
            return false;
        }
    }

    // --------------------------------------------------------
    // Host: Advertise
    // --------------------------------------------------------

    async startAdvertising(config: LocalGameConfig): Promise<void> {
        try {
            this.isHost = true;
            this.gameConfig = config;
            this.gameStarted = false;
            this.players.clear();
            this.connectedEndpoints.clear();
            await this.getPlayerName();

            if (!NearbyConnection) {
                this.callbacks.onError?.(`Local multiplayer init failed. Module crashed on load: ${NearbyInitError || 'Unknown Error'}`);
                return;
            }

            this.setupEventListeners();

            await NearbyConnection.startAdvertising(
                this.playerName,
                SERVICE_ID,
                Strategy.P2P_STAR  // Star topology: host connects to multiple clients
            );
            console.log('📡 Started advertising as:', this.playerName);
            this.callbacks.onConnectionStatusChanged?.('advertising');
        } catch (error) {
            console.error('Failed to start advertising:', error);
            this.callbacks.onError?.(`Failed to start hosting. Error: ${String(error)}. Please check Bluetooth and WiFi settings.`);
        }
    }

    // --------------------------------------------------------
    // Client: Discover
    // --------------------------------------------------------

    async startDiscovering(): Promise<void> {
        try {
            this.isHost = false;
            this.gameStarted = false;
            this.players.clear();
            this.connectedEndpoints.clear();
            this.hostEndpointId = null;
            await this.getPlayerName();

            if (!NearbyConnection) {
                this.callbacks.onError?.(`Local multiplayer init failed. Module crashed on load: ${NearbyInitError || 'Unknown Error'}`);
                return;
            }

            this.setupEventListeners();
            await NearbyConnection.startDiscovering(
                SERVICE_ID,
                Strategy.P2P_STAR
            );
            console.log('🔍 Started discovering nearby games...');
            this.callbacks.onConnectionStatusChanged?.('discovering');
        } catch (error) {
            console.error('Failed to start discovering:', error);
            this.callbacks.onError?.(`Failed to search for games. Error: ${String(error)}. Please check Bluetooth and WiFi settings.`);
        }
    }

    // --------------------------------------------------------
    // Connection Management
    // --------------------------------------------------------

    async connectToHost(endpointId: string): Promise<void> {
        if (this.connectionTimeout) {
            console.warn('⚠️ Connection already in progress, ignoring double tap.');
            return;
        }

        try {
            console.log('🛑 Stopping discovery to prevent channel conflict & 8009 IO error');
            await NearbyConnection.stopDiscovering(SERVICE_ID);
            
            await NearbyConnection.connectToEndpoint(SERVICE_ID, endpointId);
            console.log('🔗 Connecting to host:', endpointId);
            
            // Set a 15-second timeout in case Play Services hangs and doesn't fire an event
            this.connectionTimeout = setTimeout(() => {
                console.warn('⏱ Connection request timed out for', endpointId);
                this.connectionTimeout = null;
                this.callbacks.onError?.('Connection timed out. The host may be out of range, or rejecting the connection (OS firewall).');
                this.callbacks.onConnectionStatusChanged?.('disconnected');
            }, 15000);
            
        } catch (error) {
            console.error('Failed to connect to host:', error);
            this.connectionTimeout = null;
            this.callbacks.onError?.('Failed to connect to host.');
        }
    }

    // --------------------------------------------------------
    // Messaging
    // --------------------------------------------------------

    private async sendMessage(endpointId: string, message: P2PMessage): Promise<void> {
        try {
            const json = JSON.stringify(message);
            await NearbyConnection.sendBytes(SERVICE_ID, endpointId, json);
        } catch (error) {
            console.warn('Failed to send message to', endpointId, error);
        }
    }

    private async broadcastMessage(message: P2PMessage): Promise<void> {
        const promises = Array.from(this.connectedEndpoints).map(
            (endpointId) => this.sendMessage(endpointId, message)
        );
        await Promise.all(promises);
    }

    // Host: send game config to a specific player
    async sendGameConfig(endpointId: string): Promise<void> {
        if (!this.gameConfig) return;
        await this.sendMessage(endpointId, {
            type: 'GAME_CONFIG',
            payload: this.gameConfig,
            timestamp: Date.now(),
        });
    }

    // Host: start the game for all players
    async startGame(): Promise<void> {
        if (!this.isHost || !this.gameConfig) return;
        this.gameStarted = true;
        await this.broadcastMessage({
            type: 'GAME_START',
            payload: this.gameConfig,
            timestamp: Date.now(),
        });
        this.callbacks.onGameStarted?.(this.gameConfig);
    }

    // Client: send score update to host
    async sendScoreUpdate(score: number, moves: number, finished: boolean): Promise<void> {
        if (this.isHost) {
            // Host updates own score directly
            this.updateHostScore(score, moves, finished);
            return;
        }
        if (!this.hostEndpointId) return;
        await this.sendMessage(this.hostEndpointId, {
            type: 'SCORE_UPDATE',
            payload: { score, moves, finished, name: this.playerName },
            timestamp: Date.now(),
        });
    }

    // Client: send theme vote
    async sendThemeVote(themeId: string): Promise<void> {
        if (this.isHost || !this.hostEndpointId) return;
        await this.sendMessage(this.hostEndpointId, {
            type: 'VOTE_THEME',
            payload: { themeId },
            timestamp: Date.now(),
        });
    }

    // Host: broadcast theme votes
    async broadcastVotes(votes: Record<string, string>): Promise<void> {
        if (!this.isHost) return;
        await this.broadcastMessage({
            type: 'VOTE_UPDATE',
            payload: { votes },
            timestamp: Date.now(),
        });
    }

    // Host: update own score and broadcast rankings
    private updateHostScore(score: number, moves: number, finished: boolean): void {
        // Host's own data (endpointId = 'host')
        const hostPlayer: LocalPlayer = {
            endpointId: 'host',
            name: this.playerName,
            score,
            moves,
            finished,
            connected: true,
        };
        this.players.set('host', hostPlayer);
        this.broadcastRankings();
    }

    // Host: broadcast rankings
    async broadcastRankings(): Promise<void> {
        if (!this.isHost) return;
        
        // The host's player object is already inside this.players (with endpointId = 'host').
        // So we just take all the values.
        const rankings = Array.from(this.players.values()).sort((a, b) => b.score - a.score);

        await this.broadcastMessage({
            type: 'RANKINGS',
            payload: { rankings },
            timestamp: Date.now(),
        });
        this.callbacks.onRankingsUpdated?.(rankings);
    }

    // Host: end the game
    async endGame(): Promise<void> {
        if (!this.isHost) return;
        this.gameStarted = false;

        // Ensure final rankings are broadcast one last time to act as definitive
        await this.broadcastRankings();

        await this.broadcastMessage({
            type: 'GAME_END',
            payload: { finalRankings: this.getRankings() },
            timestamp: Date.now(),
        });
        this.callbacks.onGameEnded?.();
    }

    // --------------------------------------------------------
    // Rankings
    // --------------------------------------------------------

    getRankings(): LocalPlayer[] {
        return Array.from(this.players.values())
            .sort((a, b) => b.score - a.score);
    }

    getPlayers(): LocalPlayer[] {
        return Array.from(this.players.values());
    }

    getPlayerCount(): number {
        return this.players.size;
    }

    getIsHost(): boolean {
        return this.isHost;
    }

    getGameConfig(): LocalGameConfig | null {
        return this.gameConfig;
    }

    isGameStarted(): boolean {
        return this.gameStarted;
    }

    isConnectedToHost(): boolean {
        return !!this.hostEndpointId;
    }

    getConnectionStatus(): string {
        if (this.isHost) {
            return this.connectedEndpoints.size > 0 ? 'connected' : 'advertising';
        }
        return this.hostEndpointId ? 'connected' : 'disconnected';
    }

    // --------------------------------------------------------
    // Event Listeners
    // --------------------------------------------------------

    private setupEventListeners(): void {
        this.removeEventListeners();

        // Discovery events
        this.eventSubscriptions.push(
            NearbyConnection.onEndpointDiscovered(({ endpointId, endpointName, serviceId }: any) => {
                if (serviceId !== SERVICE_ID) return;
                console.log('🎯 Discovered endpoint:', endpointName, endpointId);
                // Auto-connect if client
                if (!this.isHost) {
                    this.callbacks.onPlayerJoined?.({
                        endpointId,
                        name: endpointName,
                        score: 0,
                        moves: 0,
                        finished: false,
                        connected: false,
                    });
                }
            })
        );

        this.eventSubscriptions.push(
            NearbyConnection.onEndpointLost(({ endpointId }: any) => {
                console.log('📴 Lost endpoint:', endpointId);
                if (!this.isHost) {
                    this.callbacks.onPlayerLeft?.(endpointId);
                }
            })
        );

        // Connection events
        this.eventSubscriptions.push(
            NearbyConnection.onConnectionInitiatedToEndpoint(({ endpointId, endpointName, incomingConnection }: any) => {
                console.log('🤝 Connection initiated:', endpointName, 'incoming:', incomingConnection);
                // Auto-accept all connections
                NearbyConnection.acceptConnection(SERVICE_ID, endpointId);
            })
        );

        this.eventSubscriptions.push(
            NearbyConnection.onConnectedToEndpoint(({ endpointId, endpointName }: any) => {
                console.log('✅ Connected to:', endpointName, endpointId);
                this.connectedEndpoints.add(endpointId);
                
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }

                if (this.isHost) {
                    // Host: add player to list
                    const player: LocalPlayer = {
                        endpointId,
                        name: endpointName,
                        score: 0,
                        moves: 0,
                        finished: false,
                        connected: true,
                    };
                    this.players.set(endpointId, player);
                    this.callbacks.onPlayerJoined?.(player);
                    // Send game config to new player
                    this.sendGameConfig(endpointId);
                } else {
                    // Client: store host endpoint
                    this.hostEndpointId = endpointId;
                    this.callbacks.onConnectionStatusChanged?.('connected');
                    // Send player info to host
                    this.sendMessage(endpointId, {
                        type: 'PLAYER_INFO',
                        payload: { name: this.playerName },
                        timestamp: Date.now(),
                    });
                }
            })
        );

        this.eventSubscriptions.push(
            NearbyConnection.onDisconnectedFromEndpoint(({ endpointId }: any) => {
                console.log('❌ Disconnected from:', endpointId);
                this.connectedEndpoints.delete(endpointId);
                
                if (!this.isHost && this.hostEndpointId === endpointId) {
                    this.callbacks.onError?.('Lost connection to host.');
                }

                if (this.isHost) {
                    const player = this.players.get(endpointId);
                    if (player) {
                        player.connected = false;
                    }
                    this.callbacks.onPlayerLeft?.(endpointId);
                    this.broadcastRankings();
                } else {
                    this.hostEndpointId = null;
                    this.callbacks.onConnectionStatusChanged?.('disconnected');
                }
            })
        );

        this.eventSubscriptions.push(
            NearbyConnection.onEndpointConnectionFailed(({ endpointId, statusCode }: any) => {
                console.error('❌ Connection failed:', endpointId, 'status:', statusCode);
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                
                let errorMsg = `Connection failed (Status: ${statusCode}). Please try again.`;
                if (statusCode === 8003) errorMsg = 'Connection rejected by host (8003).';
                if (statusCode === 8011) errorMsg = 'Bluetooth/WiFi error (8011) during connection.';
                if (statusCode === 8012) errorMsg = 'Host no longer discoverable (8012) - Endpoint unknown.';
                
                this.callbacks.onError?.(errorMsg);
            })
        );

        // Payload events
        this.eventSubscriptions.push(
            NearbyConnection.onReceivePayload(({ endpointId, payloadId, payloadType }: any) => {
                if (payloadType === Payload.BYTES) {
                    NearbyConnection.readBytes(SERVICE_ID, endpointId, payloadId)
                        .then(({ bytes }: any) => {
                            try {
                                const message: P2PMessage = JSON.parse(bytes);
                                this.handleMessage(endpointId, message);
                            } catch (e) {
                                console.warn('Failed to parse message:', e);
                            }
                        })
                        .catch((e: any) => console.warn('Failed to read bytes:', e));
                }
            })
        );
    }

    // --------------------------------------------------------
    // Message Handler
    // --------------------------------------------------------

    private handleMessage(endpointId: string, message: P2PMessage): void {
        console.log('📨 Received:', message.type, 'from:', endpointId);

        switch (message.type) {
            case 'PLAYER_INFO':
                if (this.isHost) {
                    const player = this.players.get(endpointId);
                    if (player) {
                        player.name = message.payload.name;
                        this.callbacks.onPlayerJoined?.(player);
                    }
                    this.broadcastRankings();
                }
                break;

            case 'GAME_CONFIG':
                if (!this.isHost) {
                    this.gameConfig = message.payload;
                    this.callbacks.onGameConfigReceived?.(message.payload);
                }
                break;

            case 'GAME_START':
                if (!this.isHost) {
                    this.gameConfig = message.payload;
                    this.gameStarted = true;
                    this.callbacks.onGameStarted?.(message.payload);
                }
                break;

            case 'SCORE_UPDATE':
                if (this.isHost) {
                    const { score, moves, finished, name } = message.payload;
                    const player = this.players.get(endpointId);
                    if (player) {
                        player.score = score;
                        player.moves = moves;
                        player.finished = finished;
                        if (name) player.name = name;
                    }
                    this.callbacks.onScoreUpdate?.(endpointId, score, moves, finished);
                    this.broadcastRankings();
                }
                break;

            case 'RANKINGS':
                if (!this.isHost) {
                    const rankings = message.payload.rankings as LocalPlayer[];
                    this.players.clear();
                    rankings.forEach((p) => this.players.set(p.endpointId, p));
                    this.callbacks.onRankingsUpdated?.(rankings);
                }
                break;

            case 'GAME_END':
                if (!this.isHost) {
                    this.gameStarted = false;
                    if (message.payload?.finalRankings) {
                        // Accept the host's final definitive rankings exactly as-is
                        this.players.clear();
                        message.payload.finalRankings.forEach((p: LocalPlayer) => {
                            this.players.set(p.endpointId, p);
                        });
                        this.callbacks.onRankingsUpdated?.(message.payload.finalRankings);
                    }
                    this.callbacks.onGameEnded?.();
                }
                break;
                
            case 'VOTE_THEME':
                if (this.isHost) {
                    this.callbacks.onThemeVoteReceived?.(endpointId, message.payload.themeId);
                }
                break;

            case 'VOTE_UPDATE':
                if (!this.isHost) {
                    this.callbacks.onVotesUpdated?.(message.payload.votes);
                }
                break;

            case 'PLAYER_LEFT':
                this.callbacks.onPlayerLeft?.(endpointId);
                break;
        }
    }

    // --------------------------------------------------------
    // Cleanup
    // --------------------------------------------------------

    private removeEventListeners(): void {
        this.eventSubscriptions.forEach((sub) => {
            if (sub && typeof sub.remove === 'function') {
                sub.remove();
            }
        });
        this.eventSubscriptions = [];
    }

    async stopDiscoveringAndAdvertising(): Promise<void> {
        try { await NearbyConnection.stopAdvertising(SERVICE_ID); } catch (e) { /* ignore */ }
        try { await NearbyConnection.stopDiscovering(SERVICE_ID); } catch (e) { /* ignore */ }
    }

    async stopAll(): Promise<void> {
        await this.stopDiscoveringAndAdvertising();

        // Disconnect all endpoints
        for (const endpointId of this.connectedEndpoints) {
            try {
                await NearbyConnection.disconnectFromEndpoint(SERVICE_ID, endpointId);
            } catch (e) { /* ignore */ }
        }

        this.removeEventListeners();
        this.connectedEndpoints.clear();
        this.players.clear();
        this.gameConfig = null;
        this.gameStarted = false;
        this.hostEndpointId = null;
        this.callbacks.onConnectionStatusChanged?.('idle');
        console.log('🔌 Local multiplayer stopped');
    }

    // --------------------------------------------------------
    // Config update (host only)
    // --------------------------------------------------------

    async updateGameConfig(config: LocalGameConfig): Promise<void> {
        if (!this.isHost) return;
        this.gameConfig = config;
        await this.broadcastMessage({
            type: 'GAME_CONFIG',
            payload: config,
            timestamp: Date.now(),
        });
    }
}

// Singleton instance
export const LocalMultiplayerService = new LocalMultiplayerServiceImpl();
export default LocalMultiplayerService;
