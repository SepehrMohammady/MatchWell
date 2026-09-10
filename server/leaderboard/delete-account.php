<?php
/**
 * POST /matchwell/leaderboard/delete-account.php
 *
 * Erases everything the server holds about a player.
 *
 * Body: { device_id, device_secret, password?, build? }
 * Returns: { deleted: { leaderboard, backup, rooms, participants } }
 *
 * Google Play requires any app that lets users create an account to offer
 * account deletion, so this is the endpoint behind Settings > Delete account.
 *
 * Authorised by the device key, like every other write. The extra rule is the
 * backup password: if the player has a cloud save, deleting it needs that
 * password as well. Without that, a device that lost the save to another device
 * would still hold a valid device key and could wipe the copy it no longer owns.
 *
 * Deleting is deliberately all-or-nothing across the four tables. A partial
 * delete would strand rows keyed on a username or device that no longer exists.
 */

require_once __DIR__ . '/../backup/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

requireSupportedClient($input);

if (empty($input['device_id'])) {
    sendError('Device ID is required');
}

$deviceId     = trim($input['device_id']);
$deviceSecret = isset($input['device_secret']) ? (string)$input['device_secret'] : '';
$password     = isset($input['password']) ? (string)$input['password'] : '';

try {
    $db = getDB();

    $player   = authorisePlayerWrite($db, $deviceId, $deviceSecret);
    $username = $player['username'];

    // A cloud save is the one thing the device key alone must not be able to
    // destroy - the password is what proves the player still owns it.
    $account = getBackupAccount($db, $username);
    if ($account) {
        if (accountIsLocked($account)) {
            sendError('Too many failed attempts. Try again in a few minutes.', 429);
        }
        if ($password === '') {
            sendError('Backup password is required to delete this account', 401);
        }
        if (!verifyBackupPassword($password, $account['password_hash'])) {
            registerFailedAttempt($db, $account);
            sendError('Player name or password is incorrect', 401);
        }
        clearFailedAttempts($db, $account);
    } elseif ($password !== '') {
        // No cloud save to check the password against. Burn an equivalent amount
        // of time so "has a backup" is not detectable from how fast we answer.
        burnPasswordCheck($password);
    }

    $db->beginTransaction();

    $deleted = ['leaderboard' => 0, 'backup' => 0, 'rooms' => 0, 'participants' => 0];

    // 1. The cloud save, with the password hash it was protected by.
    $stmt = $db->prepare("DELETE FROM save_backups WHERE username = ?");
    $stmt->execute([$username]);
    $deleted['backup'] = $stmt->rowCount();

    // 2. Rooms this device hosts, and everyone sitting in them. Participants go
    //    first so the rooms are never left with orphaned rows behind them.
    $stmt = $db->prepare(
        "DELETE FROM multiplayer_participants
          WHERE room_id IN (SELECT id FROM multiplayer_rooms WHERE host_device_id = ?)"
    );
    $stmt->execute([$deviceId]);
    $deleted['participants'] = $stmt->rowCount();

    $stmt = $db->prepare("DELETE FROM multiplayer_rooms WHERE host_device_id = ?");
    $stmt->execute([$deviceId]);
    $deleted['rooms'] = $stmt->rowCount();

    // 3. This player sitting in anyone else's room.
    $stmt = $db->prepare("DELETE FROM multiplayer_participants WHERE device_id = ?");
    $stmt->execute([$deviceId]);
    $deleted['participants'] += $stmt->rowCount();

    // 4. The identity itself, last: the username and device key everything above
    //    was keyed on. This frees the name for someone else to take.
    $stmt = $db->prepare("DELETE FROM leaderboard WHERE id = ?");
    $stmt->execute([$player['id']]);
    $deleted['leaderboard'] = $stmt->rowCount();

    $db->commit();

    sendSuccess(['deleted' => $deleted, 'message' => 'Account deleted']);
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('leaderboard/delete-account: ' . $e->getMessage());
    sendError('Database error', 500);
}
