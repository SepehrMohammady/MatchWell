<?php
/**
 * POST /matchwell/backup/restore.php
 *
 * Signs in on a device and hands it the save.
 *
 * Body: { username, password }
 * Returns: { owner_token, payload, app_version, updated_at }
 *
 * Rotating owner_token here is the whole enforcement mechanism: the device that
 * previously held the save now has a stale token, so its next status check
 * reports owns=false and it locks itself. Only one device is ever live.
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

$username = isset($input['username']) ? trim((string)$input['username']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';

if ($username === '' || $password === '') {
    sendError('Enter your player name and password');
}

try {
    $pdo = getDB();

    // Serialise concurrent restores so two devices cannot both believe they won.
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT * FROM save_backups WHERE username = ? LIMIT 1 FOR UPDATE');
    $stmt->execute([$username]);
    $account = $stmt->fetch();

    // Same message either way, so the endpoint cannot be used to discover which
    // player names have backups.
    if (!$account || !verifyBackupPassword($password, $account['password_hash'])) {
        $pdo->rollBack();
        sendError('Player name or password is incorrect', 401);
    }

    $token = generateOwnerToken();

    $update = $pdo->prepare(
        'UPDATE save_backups SET owner_token = ?, last_restored_at = NOW() WHERE id = ?'
    );
    $update->execute([$token, $account['id']]);

    $pdo->commit();

    sendSuccess([
        'owner_token' => $token,
        'payload'     => $account['payload'],
        'app_version' => $account['app_version'],
        'updated_at'  => $account['updated_at'],
    ]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('backup/restore: ' . $e->getMessage());
    sendError('Database error', 500);
}
