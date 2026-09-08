<?php
/**
 * Register New Player
 * POST /register
 * Body: { "device_id": "uuid", "username": "PlayerName" }
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

if (empty($input['device_id'])) {
    sendError('Device ID is required');
}

if (empty($input['username'])) {
    sendError('Username is required');
}

$validation = validateUsername($input['username']);
if (!$validation['valid']) {
    sendError($validation['error']);
}

requireSupportedClient($input);

$deviceId = trim($input['device_id']);
$username = $validation['username'];

try {
    $db = getDB();
    
    // Check if device already has an account
    $stmt = $db->prepare("SELECT id, username, device_secret FROM leaderboard WHERE device_id = ?");
    $stmt->execute([$deviceId]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Already registered. Hand back its device key, minting one if this row
        // predates write auth, so the device can publish from now on.
        $secret = $existing['device_secret'];
        if ($secret === null || $secret === '') {
            $secret = generateDeviceSecret();
            $claim = $db->prepare("UPDATE leaderboard SET device_secret = ? WHERE id = ?");
            $claim->execute([$secret, $existing['id']]);
        }
        sendSuccess([
            'registered' => true,
            'username' => $existing['username'],
            'device_secret' => $secret,
            'message' => 'Device already registered'
        ]);
    }
    
    // Check if username is taken
    $stmt = $db->prepare("SELECT id FROM leaderboard WHERE LOWER(username) = LOWER(?)");
    $stmt->execute([$username]);
    
    if ($stmt->fetch()) {
        sendError('Username is already taken');
    }
    
    // Register new player, issuing the device key it will use to publish.
    $secret = generateDeviceSecret();
    $stmt = $db->prepare("INSERT INTO leaderboard (device_id, device_secret, username) VALUES (?, ?, ?)");
    $stmt->execute([$deviceId, $secret, $username]);

    sendSuccess([
        'registered' => true,
        'username' => $username,
        'device_secret' => $secret,
        'message' => 'Registration successful'
    ], 201);
    
} catch (Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
?>
