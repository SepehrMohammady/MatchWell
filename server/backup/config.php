<?php
/**
 * MatchWell Save Backup API Configuration
 * Upload this folder to: /matchwell/backup/
 *
 * Reuses the leaderboard database credentials and response helpers so there is
 * only one place to configure the DB.
 */

require_once __DIR__ . '/../leaderboard/config.php';

define('MIN_BACKUP_PASSWORD', 6);
define('MAX_BACKUP_PASSWORD', 64);

// A full save is a few KB of JSON; a generous ceiling that still stops anyone
// using the endpoint as free storage.
define('MAX_PAYLOAD_BYTES', 512 * 1024);

/**
 * Cryptographically random token proving ownership of a save.
 */
function generateOwnerToken() {
    return bin2hex(random_bytes(24));
}

function hashBackupPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyBackupPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Constant-time comparison so an owner token cannot be guessed byte by byte.
 */
function tokensMatch($a, $b) {
    return is_string($a) && is_string($b) && hash_equals($b, $a);
}

function validateBackupPassword($password) {
    if (!is_string($password)) {
        return ['valid' => false, 'error' => 'Password is required'];
    }
    $len = strlen($password);
    if ($len < MIN_BACKUP_PASSWORD) {
        return ['valid' => false, 'error' => 'Password must be at least ' . MIN_BACKUP_PASSWORD . ' characters'];
    }
    if ($len > MAX_BACKUP_PASSWORD) {
        return ['valid' => false, 'error' => 'Password is too long'];
    }
    return ['valid' => true];
}

/**
 * Validate an uploaded save payload.
 */
function validatePayload($payload) {
    if (!is_string($payload) || $payload === '') {
        return ['valid' => false, 'error' => 'Save payload is required'];
    }
    if (strlen($payload) > MAX_PAYLOAD_BYTES) {
        return ['valid' => false, 'error' => 'Save is too large to back up'];
    }
    json_decode($payload, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return ['valid' => false, 'error' => 'Save payload must be valid JSON'];
    }
    return ['valid' => true];
}

// Brute-force protection for password checks. The endpoint and its payload are
// public (the app is open source), so an unthrottled restore endpoint would let
// anyone grind a 6-character password.
define('MAX_FAILED_ATTEMPTS', 5);
define('LOCKOUT_MINUTES', 15);

/**
 * True while an account is in cooldown after too many wrong passwords.
 */
function accountIsLocked($account) {
    return !empty($account['locked_until']) && strtotime($account['locked_until']) > time();
}

/**
 * Record a wrong password. Locks the account for a short cooldown once the
 * threshold is reached, then resets the counter.
 */
function registerFailedAttempt($pdo, $account) {
    $attempts = (int)$account['failed_attempts'] + 1;
    if ($attempts >= MAX_FAILED_ATTEMPTS) {
        $until = (new DateTime('+' . LOCKOUT_MINUTES . ' minutes'))->format('Y-m-d H:i:s');
        $stmt = $pdo->prepare('UPDATE save_backups SET failed_attempts = 0, locked_until = ? WHERE id = ?');
        $stmt->execute([$until, $account['id']]);
        return;
    }
    $stmt = $pdo->prepare('UPDATE save_backups SET failed_attempts = ? WHERE id = ?');
    $stmt->execute([$attempts, $account['id']]);
}

/**
 * Clear the counter after a successful password check.
 */
function clearFailedAttempts($pdo, $account) {
    if ((int)$account['failed_attempts'] === 0 && empty($account['locked_until'])) {
        return;
    }
    $stmt = $pdo->prepare('UPDATE save_backups SET failed_attempts = 0, locked_until = NULL WHERE id = ?');
    $stmt->execute([$account['id']]);
}

/**
 * Fetch a backup account by username.
 */
function getBackupAccount($pdo, $username) {
    $stmt = $pdo->prepare('SELECT * FROM save_backups WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    return $stmt->fetch();
}

/**
 * Confirm the caller really is the leaderboard player behind this username.
 * Stops someone claiming a backup account for a name that is not theirs.
 */
function deviceOwnsLeaderboardName($pdo, $username, $deviceId) {
    $stmt = $pdo->prepare('SELECT device_id FROM leaderboard WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    if (!$row) {
        return false;
    }
    return hash_equals((string)$row['device_id'], (string)$deviceId);
}
