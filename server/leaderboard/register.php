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

$deviceId = trim($input['device_id']);
$username = $validation['username'];

try {
    $db = getDB();
    
    // Check if device already has an account
    $stmt = $db->prepare("SELECT id, username FROM leaderboard WHERE device_id = ?");
    $stmt->execute([$deviceId]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        sendSuccess([
            'registered' => true,
            'username' => $existing['username'],
            'message' => 'Device already registered'
        ]);
    }
    
    // Check if username is taken
    $stmt = $db->prepare("SELECT id FROM leaderboard WHERE LOWER(username) = LOWER(?)");
    $stmt->execute([$username]);
    
    if ($stmt->fetch()) {
        sendError('Username is already taken');
    }
    
    // Register new player
    $stmt = $db->prepare("INSERT INTO leaderboard (device_id, username) VALUES (?, ?)");
    $stmt->execute([$deviceId, $username]);
    
    sendSuccess([
        'registered' => true,
        'username' => $username,
        'message' => 'Registration successful'
    ], 201);
    
} catch (Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
?>
