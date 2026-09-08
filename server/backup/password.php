<?php
/**
 * POST /matchwell/backup/password.php
 *
 * Changes the backup password. Only the device that currently owns the save may
 * do this, and it must still know the old password.
 *
 * Body: { username, owner_token, current_password, new_password }
 * Returns: { changed: true }
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

$username        = isset($input['username']) ? trim((string)$input['username']) : '';
$ownerToken      = isset($input['owner_token']) ? (string)$input['owner_token'] : '';
$currentPassword = isset($input['current_password']) ? (string)$input['current_password'] : '';
$newPassword     = isset($input['new_password']) ? (string)$input['new_password'] : '';

if ($username === '' || $ownerToken === '') {
    sendError('Player name and owner token are required');
}

$pw = validateBackupPassword($newPassword);
if (!$pw['valid']) {
    sendError($pw['error']);
}

try {
    $pdo = getDB();
    $account = getBackupAccount($pdo, $username);

    if (!$account) {
        sendError('No backup found for this player name', 404);
    }

    if (!tokensMatch($ownerToken, $account['owner_token'])) {
        sendError('This save is now active on another device', 409);
    }

    if (!verifyBackupPassword($currentPassword, $account['password_hash'])) {
        sendError('Current password is incorrect', 401);
    }

    $stmt = $pdo->prepare('UPDATE save_backups SET password_hash = ? WHERE id = ?');
    $stmt->execute([hashBackupPassword($newPassword), $account['id']]);

    sendSuccess(['changed' => true]);
} catch (PDOException $e) {
    error_log('backup/password: ' . $e->getMessage());
    sendError('Database error', 500);
}
