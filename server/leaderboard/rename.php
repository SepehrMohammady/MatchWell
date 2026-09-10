<?php
/**
 * POST /matchwell/leaderboard/rename.php
 *
 * Changes a player's name.
 *
 * Body: { device_id, device_secret, new_username, build? }
 * Returns: { username }
 *
 * The name is the player's identity in two places - their leaderboard row and,
 * if they use cloud backup, their backup account - so both are renamed together
 * inside one transaction. Leaving them out of step would strand the save: the
 * app would look for a backup account under a name that no longer exists.
 *
 * Authorised by the device key, so only the device that owns the entry can
 * rename it. This is not a login; the app sends the key automatically.
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

requireSupportedClient($input);

if (empty($input['device_id'])) {
    sendError('Device ID is required');
}
if (empty($input['new_username'])) {
    sendError('New name is required');
}

$validation = validateUsername($input['new_username']);
if (!$validation['valid']) {
    sendError($validation['error']);
}

$deviceId     = trim($input['device_id']);
$deviceSecret = isset($input['device_secret']) ? (string)$input['device_secret'] : '';
$newUsername  = $validation['username'];

try {
    $db = getDB();

    $player = authorisePlayerWrite($db, $deviceId, $deviceSecret);
    $oldUsername = $player['username'];

    if (strcasecmp($oldUsername, $newUsername) === 0) {
        // Same name (possibly different case): nothing to do, but not an error.
        sendSuccess(['username' => $oldUsername, 'message' => 'Name unchanged']);
    }

    $db->beginTransaction();

    // Taken by somebody else?
    $stmt = $db->prepare("SELECT id FROM leaderboard WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1");
    $stmt->execute([$newUsername, $player['id']]);
    if ($stmt->fetch()) {
        $db->rollBack();
        sendError('Username is already taken', 409);
    }

    $stmt = $db->prepare("UPDATE leaderboard SET username = ? WHERE id = ?");
    $stmt->execute([$newUsername, $player['id']]);

    // Keep the backup account in step. Only a missing table is tolerated - that
    // is an installation without the backup API. Any other failure must abort the
    // rename: committing it on its own would strand the save under a name the app
    // can no longer find.
    try {
        $stmt = $db->prepare("UPDATE save_backups SET username = ? WHERE username = ?");
        $stmt->execute([$newUsername, $oldUsername]);
    } catch (PDOException $inner) {
        if ($inner->getCode() !== '42S02') {
            throw $inner;
        }
        error_log('leaderboard/rename: no save_backups table, backup rename skipped');
    }

    $db->commit();

    sendSuccess(['username' => $newUsername, 'message' => 'Name changed']);
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('leaderboard/rename: ' . $e->getMessage());
    sendError('Database error', 500);
}
