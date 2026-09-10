// Cloud save backup and device transfer.
//
// The account is the player's leaderboard username (already unique game-wide)
// plus a password chosen the first time backup is switched on. The save lives on
// the server together with an owner token held by whichever device is currently
// live. Signing in on another device mints a new token, so the previous device's
// token goes stale and it locks itself: the save is only ever active on one
// device at a time.
//
// Everything the player has is included: story progress, per-theme endless runs,
// sound settings, language, the leaderboard identity and both display names. The
// leaderboard identity travels with the save deliberately - otherwise "continue
// on another device" would leave the player's leaderboard entry behind.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERSION } from '../config/version';
import {
    checkUsername,
    clearLocalIdentity,
    getDeviceSecret,
    registerPlayer,
} from './LeaderboardService';

const API_BASE_URL = 'https://semo-lab.com/matchwell/backup';
const DELETE_ACCOUNT_URL = 'https://semo-lab.com/matchwell/leaderboard/delete-account.php';

const THEME_IDS = [
    'trash-sorting',
    'pollution',
    'water-conservation',
    'energy-efficiency',
    'deforestation',
];

// Every key the app persists. Keep in step with GameStore, SoundManager, i18n,
// LeaderboardService and MultiplayerMenu.
export const BACKED_UP_KEYS: string[] = [
    'matchwell_progress',                                   // levels, high scores, stars, achievements
    ...THEME_IDS.map(t => `matchwell_endless_state_${t}`),   // saved endless runs
    '@MatchWell:soundSettings',                             // music/sfx toggles and volumes
    '@matchwell_language',                                  // UI language
    '@matchwell_device_id',                                 // leaderboard identity
    '@matchwell_device_secret',                             // key that authorises leaderboard writes
    '@matchwell_username',                                  // leaderboard username
    'playerName',                                           // multiplayer display name
];

// Local bookkeeping about this device's relationship to the save. Deliberately
// NOT part of the backup payload.
const OWNER_TOKEN_KEY = '@matchwell_backup_token';
const ACCOUNT_KEY = '@matchwell_backup_account';
const AUTO_KEY = '@matchwell_backup_auto';
const LAST_BACKUP_KEY = '@matchwell_backup_last';
const LOCK_KEY = '@matchwell_backup_locked';

export const SAVE_FORMAT_VERSION = 1;

export type BackupErrorCode =
    | 'network'
    | 'superseded'      // another device signed in
    | 'bad-credentials'
    | 'not-registered'  // no leaderboard username on this device
    | 'name-taken'      // chosen name already belongs to someone else
    | 'name-not-owned'
    | 'no-account'
    | 'rate-limited'    // too many wrong passwords, account in cooldown
    | 'update-required' // build older than the server's minimum
    | 'corrupt'
    | 'weak-password'
    | 'unknown';

export interface BackupResult<T> {
    ok: boolean;
    data?: T;
    code?: BackupErrorCode;
    message?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/** Map an HTTP status + server message onto a stable code the UI can branch on. */
function classify(status: number, message?: string): BackupErrorCode {
    if (status === 426) return 'update-required';
    if (status === 429) return 'rate-limited';
    if (status === 409) return 'superseded';
    if (status === 401) return 'bad-credentials';
    if (status === 403) return 'name-not-owned';
    if (status === 404) return 'no-account';
    if (message && /password must be at least/i.test(message)) return 'weak-password';
    return 'unknown';
}

async function apiCall<T>(endpoint: string, body: Record<string, unknown>): Promise<BackupResult<T>> {
    try {
        // An absolute endpoint reaches another MatchWell API; a bare name is
        // relative to the backup one.
        const url = endpoint.startsWith('https://') ? endpoint : `${API_BASE_URL}/${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json: ApiResponse<T> = await response.json();
        if (!json.success) {
            return { ok: false, code: classify(response.status, json.error), message: json.error };
        }
        return { ok: true, data: json.data };
    } catch {
        return { ok: false, code: 'network' };
    }
}

// --- save payload ----------------------------------------------------------

export async function collectSave(): Promise<string> {
    const entries = await AsyncStorage.multiGet(BACKED_UP_KEYS);
    const data: Record<string, string> = {};
    entries.forEach(([key, value]) => {
        if (value !== null) data[key] = value;
    });
    return JSON.stringify({
        version: SAVE_FORMAT_VERSION,
        appVersion: VERSION.string,
        createdAt: new Date().toISOString(),
        data,
    });
}

/**
 * Overwrite local storage with a payload from collectSave(). Keys missing from
 * the payload are cleared, so the restored device is an exact copy rather than a
 * merge of two saves.
 */
export async function applySave(payload: string): Promise<boolean> {
    let parsed: { version?: number; data?: Record<string, string> };
    try {
        parsed = JSON.parse(payload);
    } catch {
        return false;
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return false;
    if (parsed.version !== SAVE_FORMAT_VERSION) return false;

    const incoming = parsed.data;
    const toSet: [string, string][] = [];
    const toRemove: string[] = [];

    BACKED_UP_KEYS.forEach((key) => {
        const value = incoming[key];
        if (typeof value === 'string') toSet.push([key, value]);
        else toRemove.push(key);
    });

    if (toSet.length) await AsyncStorage.multiSet(toSet);
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    return true;
}

// --- local state -----------------------------------------------------------

export interface LocalBackupState {
    account: string | null;      // username backup is enabled for
    hasToken: boolean;
    autoBackup: boolean;
    lastBackupAt: string | null;
    locked: boolean;
}

export async function getLocalState(): Promise<LocalBackupState> {
    const entries = await AsyncStorage.multiGet([
        ACCOUNT_KEY, OWNER_TOKEN_KEY, AUTO_KEY, LAST_BACKUP_KEY, LOCK_KEY,
    ]);
    const map = Object.fromEntries(entries) as Record<string, string | null>;
    return {
        account: map[ACCOUNT_KEY] ?? null,
        hasToken: !!map[OWNER_TOKEN_KEY],
        autoBackup: map[AUTO_KEY] === '1',
        lastBackupAt: map[LAST_BACKUP_KEY] ?? null,
        locked: map[LOCK_KEY] === '1',
    };
}

export async function setAutoBackup(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(AUTO_KEY, enabled ? '1' : '0');
}

async function storeSession(username: string, token: string): Promise<void> {
    await AsyncStorage.multiSet([[ACCOUNT_KEY, username], [OWNER_TOKEN_KEY, token]]);
}

async function markBackedUp(): Promise<void> {
    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export async function lockDevice(): Promise<void> {
    await AsyncStorage.setItem(LOCK_KEY, '1');
}

export async function unlockDevice(): Promise<void> {
    await AsyncStorage.removeItem(LOCK_KEY);
}

/** The leaderboard username this device is registered under, if any. */
export async function getRegisteredUsername(): Promise<string | null> {
    return AsyncStorage.getItem('@matchwell_username');
}

async function getDeviceId(): Promise<string | null> {
    return AsyncStorage.getItem('@matchwell_device_id');
}

// --- operations ------------------------------------------------------------

/**
 * Turn backup on for this device, setting the password the first time.
 *
 * The account name is the player's leaderboard name. If they already have one we
 * use it; if not, `desiredUsername` is registered on the leaderboard first, so a
 * player never has to go and set one up elsewhere before they can back up.
 */
export async function enableBackup(
    password: string,
    desiredUsername?: string,
): Promise<BackupResult<null>> {
    let username = await getRegisteredUsername();

    if (!username) {
        const wanted = (desiredUsername || '').trim();
        if (!wanted) return { ok: false, code: 'not-registered' };

        const availability = await checkUsername(wanted);
        if (availability.error) {
            return { ok: false, code: 'network', message: availability.error };
        }
        if (!availability.available) {
            return { ok: false, code: 'name-taken' };
        }

        const registration = await registerPlayer(wanted);
        if (!registration.success) {
            return { ok: false, code: 'name-taken', message: registration.error };
        }
        username = wanted;
    }

    const deviceId = await getDeviceId();
    if (!username || !deviceId) return { ok: false, code: 'not-registered' };

    const payload = await collectSave();
    const result = await apiCall<{ owner_token: string }>('enable.php', {
        username,
        password,
        device_id: deviceId,
        payload,
        app_version: VERSION.string,
        build: VERSION.buildNumber,
    });

    if (!result.ok || !result.data) return { ok: false, code: result.code, message: result.message };

    await storeSession(username, result.data.owner_token);
    await markBackedUp();
    await unlockDevice();
    return { ok: true, data: null };
}

/**
 * Push current progress to the server. Used by the manual button and by auto
 * backup. Locks this device if it has been superseded.
 */
export async function backupNow(): Promise<BackupResult<null>> {
    const [username, token] = await Promise.all([
        AsyncStorage.getItem(ACCOUNT_KEY),
        AsyncStorage.getItem(OWNER_TOKEN_KEY),
    ]);
    if (!username || !token) return { ok: false, code: 'no-account' };

    const payload = await collectSave();
    const result = await apiCall<{ updated_at: string }>('upload.php', {
        username,
        owner_token: token,
        payload,
        app_version: VERSION.string,
        build: VERSION.buildNumber,
    });

    if (!result.ok) {
        if (result.code === 'superseded') await lockDevice();
        return { ok: false, code: result.code, message: result.message };
    }

    await markBackedUp();
    return { ok: true, data: null };
}

/**
 * Sign in on this device and pull the save down. This takes the save away from
 * whichever device held it before.
 */
export async function restoreBackup(username: string, password: string): Promise<BackupResult<null>> {
    const result = await apiCall<{ owner_token: string; payload: string }>('restore.php', {
        username: username.trim(),
        password,
    });

    if (!result.ok || !result.data) return { ok: false, code: result.code, message: result.message };

    const applied = await applySave(result.data.payload);
    if (!applied) return { ok: false, code: 'corrupt' };

    // Written after the save so a failed restore never leaves this device
    // believing it owns something it did not receive.
    await storeSession(username.trim(), result.data.owner_token);
    await markBackedUp();
    await unlockDevice();
    return { ok: true, data: null };
}

/** Change the password. Only possible from the device that currently owns the save. */
export async function changePassword(
    currentPassword: string,
    newPassword: string,
): Promise<BackupResult<null>> {
    const [username, token] = await Promise.all([
        AsyncStorage.getItem(ACCOUNT_KEY),
        AsyncStorage.getItem(OWNER_TOKEN_KEY),
    ]);
    if (!username || !token) return { ok: false, code: 'no-account' };

    const result = await apiCall<{ changed: boolean }>('password.php', {
        username,
        owner_token: token,
        current_password: currentPassword,
        new_password: newPassword,
    });

    if (!result.ok) {
        if (result.code === 'superseded') await lockDevice();
        return { ok: false, code: result.code, message: result.message };
    }
    return { ok: true, data: null };
}

/**
 * Ask the server whether this device is still the live one.
 *
 * Returns null when the question cannot be answered (offline, or no account) -
 * callers must treat that as "carry on", never as "lock", so a flaky connection
 * can never lock a player out of their own game.
 */
export async function checkOwnership(): Promise<boolean | null> {
    const [username, token] = await Promise.all([
        AsyncStorage.getItem(ACCOUNT_KEY),
        AsyncStorage.getItem(OWNER_TOKEN_KEY),
    ]);
    if (!username || !token) return null;

    const result = await apiCall<{ owns: boolean; known: boolean }>('status.php', {
        username,
        owner_token: token,
    });

    if (!result.ok || !result.data) return null;
    if (!result.data.known) return null;
    return result.data.owns;
}

/** Called on launch: locks this device if the save moved elsewhere. */
export async function refreshLockState(): Promise<boolean> {
    const owns = await checkOwnership();
    if (owns === null) {
        const state = await getLocalState();
        return state.locked;
    }
    if (!owns) {
        await lockDevice();
        return true;
    }
    await unlockDevice();
    return false;
}

/**
 * Point this device's backup session at a renamed account.
 *
 * The server renames the leaderboard entry and the backup account together; this
 * keeps the local session in step. Without it the app would keep uploading under
 * the old name and get "no backup found" on its next write.
 */
export async function renameBackupAccount(newUsername: string): Promise<void> {
    const current = await AsyncStorage.getItem(ACCOUNT_KEY);
    if (!current) return; // backup not in use on this device
    await AsyncStorage.setItem(ACCOUNT_KEY, newUsername);
}

/**
 * Back up now, but only if the player switched automatic backup on.
 *
 * Called at the points where progress has actually just changed - finishing a
 * level, leaving an endless run - rather than when the app goes to background.
 * Backgrounding is not a reliable signal: swiping the app away from the recents
 * list gives no usable window to finish a network request, so those sessions
 * were never backed up at all.
 *
 * Fire and forget: never block or interrupt play, and never surface an error.
 */
export async function autoBackupIfEnabled(): Promise<void> {
    try {
        const state = await getLocalState();
        if (!state.autoBackup || !state.account || !state.hasToken || state.locked) return;
        await backupNow();
    } catch {
        // Auto backup is a convenience; a failure must stay invisible.
    }
}

/**
 * Sign this device out of cloud backup, leaving the server account untouched.
 *
 * Called when the player resets their progress. Without it, a reset device stays
 * signed in and the next backup - automatic or manual - would overwrite the
 * player's cloud save with the empty one they just created. Signing out means
 * they have to restore deliberately to get the old save back.
 */
/**
 * Erase everything the server holds about this player, then forget them here.
 *
 * Google Play requires an in-app account deletion path for any app that lets
 * users create an account, and this is it. The server drops the leaderboard
 * entry, the cloud save, and any multiplayer rooms in one transaction.
 *
 * The password is required only when a cloud save exists - it is what stops a
 * device that has already lost the save from deleting the copy it no longer
 * owns. Local progress is deliberately left alone: this removes the online
 * account, not the game on this device.
 */
export async function deleteAccount(password?: string): Promise<BackupResult<null>> {
    const [deviceId, deviceSecret] = await Promise.all([
        getDeviceId(),
        getDeviceSecret(),
    ]);

    const result = await apiCall<null>(DELETE_ACCOUNT_URL, {
        device_id: deviceId,
        device_secret: deviceSecret,
        password: password ?? '',
        build: VERSION.buildNumber,
    });

    // A device the server has never heard of has nothing to delete, so treat
    // that as done rather than as a failure the player has to act on.
    if (!result.ok && result.code !== 'no-account') return result;

    await signOutOfBackup();
    await clearLocalIdentity();
    return { ok: true, data: null };
}

export async function signOutOfBackup(): Promise<void> {
    await AsyncStorage.multiRemove([
        ACCOUNT_KEY,
        OWNER_TOKEN_KEY,
        LAST_BACKUP_KEY,
        AUTO_KEY,
        LOCK_KEY,
    ]);
}

/**
 * Give up the save that moved away and start over on this device. Clears the
 * player's data and the backup session, but leaves the server account alone -
 * it belongs to the other device now.
 */
export async function startFresh(): Promise<void> {
    await AsyncStorage.multiRemove([
        ...BACKED_UP_KEYS,
        ACCOUNT_KEY,
        OWNER_TOKEN_KEY,
        LAST_BACKUP_KEY,
        AUTO_KEY,
    ]);
    await unlockDevice();
}
