<?php
/**
 * POST /matchwell/backup/upload.php
 *
 * Saves the current progress of the device that owns the account. Used both by
 * the manual "Back up now" button and by automatic backup.
 *
 * Body: { username, owner_token, payload, app_version? }
 * Returns: { updated_at }
 *
 * Rejects a device that is no longer the owner, so a device that has been
 * superseded can never overwrite the live save with its stale copy.
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

$username   = isset($input['username']) ? trim((string)$input['username']) : '';
$ownerToken = isset($input['owner_token']) ? (string)$input['owner_token'] : '';
$payload    = isset($input['payload']) ? (string)$input['payload'] : '';
$appVersion = isset($input['app_version']) ? substr((string)$input['app_version'], 0, 16) : null;

if ($username === '' || $ownerToken === '') {
    sendError('Player name and owner token are required');
}

$pv = validatePayload($payload);
if (!$pv['valid']) {
    sendError($pv['error']);
}

try {
    $pdo = getDB();
    $account = getBackupAccount($pdo, $username);

    if (!$account) {
        sendError('No backup found for this player name', 404);
    }

    if (!tokensMatch($ownerToken, $account['owner_token'])) {
        // Another device signed in; this one is no longer live.
        sendError('This save is now active on another device', 409);
    }

    $stmt = $pdo->prepare(
        'UPDATE save_backups SET payload = ?, payload_bytes = ?, app_version = ? WHERE id = ?'
    );
    $stmt->execute([$payload, strlen($payload), $appVersion, $account['id']]);

    sendSuccess(['updated_at' => (new DateTime())->format('c')]);
} catch (PDOException $e) {
    error_log('backup/upload: ' . $e->getMessage());
    sendError('Database error', 500);
}
