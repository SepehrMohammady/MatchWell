<?php
/**
 * POST /matchwell/backup/status.php
 *
 * Asks whether this device still owns the save.
 *
 * Body: { username, owner_token }
 * Returns: { owns, known, updated_at }
 *
 * - owns=true            -> this device is the live one
 * - owns=false           -> another device signed in; caller should lock itself
 * - known=false          -> no backup account for that name; caller carries on
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();
$username   = isset($input['username']) ? trim((string)$input['username']) : '';
$ownerToken = isset($input['owner_token']) ? (string)$input['owner_token'] : '';

if ($username === '' || $ownerToken === '') {
    sendError('Player name and owner token are required');
}

try {
    $pdo = getDB();
    $account = getBackupAccount($pdo, $username);

    if (!$account) {
        // Nothing on the server. Report "not known" rather than "not owned", so a
        // deleted account can never lock a player out of their own game.
        sendSuccess(['owns' => true, 'known' => false, 'updated_at' => null]);
    }

    sendSuccess([
        'owns'       => tokensMatch($ownerToken, $account['owner_token']),
        'known'      => true,
        'updated_at' => $account['updated_at'],
    ]);
} catch (PDOException $e) {
    error_log('backup/status: ' . $e->getMessage());
    sendError('Database error', 500);
}
