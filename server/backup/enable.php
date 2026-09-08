<?php
/**
 * POST /matchwell/backup/enable.php
 *
 * Turns on backup for a player, setting the password the first time.
 *
 * Body: { username, password, device_id, payload, app_version? }
 * Returns: { owner_token, updated_at }
 *
 * The username must be one this device already owns on the leaderboard, so a
 * player cannot claim a backup account for somebody else's name. If an account
 * already exists the password must match - that is what lets a returning device
 * re-enable backup without wiping the existing account.
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

$username = isset($input['username']) ? trim((string)$input['username']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';
$deviceId = isset($input['device_id']) ? (string)$input['device_id'] : '';
$payload  = isset($input['payload']) ? (string)$input['payload'] : '';
$appVersion = isset($input['app_version']) ? substr((string)$input['app_version'], 0, 16) : null;

if ($username === '' || $deviceId === '') {
    sendError('Player name and device are required');
}

$pw = validateBackupPassword($password);
if (!$pw['valid']) {
    sendError($pw['error']);
}

$pv = validatePayload($payload);
if (!$pv['valid']) {
    sendError($pv['error']);
}

try {
    $pdo = getDB();

    if (!deviceOwnsLeaderboardName($pdo, $username, $deviceId)) {
        sendError('This player name is not registered to this device', 403);
    }

    $account = getBackupAccount($pdo, $username);
    $token = generateOwnerToken();

    if ($account) {
        // Existing account: the password is the proof of ownership.
        if (!verifyBackupPassword($password, $account['password_hash'])) {
            sendError('Incorrect password for this player name', 401);
        }
        $stmt = $pdo->prepare(
            'UPDATE save_backups
                SET owner_token = ?, payload = ?, payload_bytes = ?, app_version = ?
              WHERE id = ?'
        );
        $stmt->execute([$token, $payload, strlen($payload), $appVersion, $account['id']]);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO save_backups (username, password_hash, owner_token, payload, payload_bytes, app_version)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $username,
            hashBackupPassword($password),
            $token,
            $payload,
            strlen($payload),
            $appVersion,
        ]);
    }

    sendSuccess([
        'owner_token' => $token,
        'updated_at'  => (new DateTime())->format('c'),
    ]);
} catch (PDOException $e) {
    error_log('backup/enable: ' . $e->getMessage());
    sendError('Database error', 500);
}
