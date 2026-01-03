<?php
/**
 * Join an existing multiplayer room
 * POST: room_code, password, device_id
 */

require_once 'config.php';

$input = getJsonInput();

// Required fields
if (empty($input['device_id'])) sendError('Device ID is required');
if (empty($input['room_code'])) sendError('Room code is required');
if (empty($input['password'])) sendError('Password is required');

$pdo = getDB();

// Find room
$room = getRoomByCode($pdo, strtoupper($input['room_code']));
if (!$room) sendError('Room not found');

// Check room status
if ($room['status'] === 'completed') sendError('This room has already finished');
if ($room['status'] === 'active') sendError('Game already in progress');

// Verify password
if (!verifyPassword($input['password'], $room['password_hash'])) {
    sendError('Incorrect password');
}

// Check if already in room
$existing = getParticipant($pdo, $room['id'], $input['device_id']);
if ($existing) {
    sendSuccess([
        'joined' => true,
        'already_in_room' => true,
        'room' => [
            'id' => $room['id'],
            'name' => $room['room_name'],
            'game_mode' => $room['game_mode'],
            'status' => $room['status']
        ]
    ]);
}

// Check max players
$currentCount = countParticipants($pdo, $room['id']);
if ($currentCount >= $room['max_players']) {
    sendError('Room is full');
}

// Get username - prefer from request, fallback to players table, then default
$username = 'Player' . ($currentCount + 1);
if (!empty($input['username'])) {
    $username = substr($input['username'], 0, 20); // Limit to 20 chars
} else {
    try {
        $stmt = $pdo->prepare("SELECT username FROM players WHERE device_id = ?");
        $stmt->execute([$input['device_id']]);
        $player = $stmt->fetch();
        if ($player && !empty($player['username'])) {
            $username = $player['username'];
        }
    } catch (Exception $e) {
        // Use default username
    }
}

// Join room
try {
    $stmt = $pdo->prepare("
        INSERT INTO multiplayer_participants (room_id, device_id, username)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$room['id'], $input['device_id'], $username]);
} catch (PDOException $e) {
    error_log('MatchWell Join Error: ' . $e->getMessage());
    sendError('Failed to join room: ' . $e->getMessage());
}

sendSuccess([
    'joined' => true,
    'room' => [
        'id' => $room['id'],
        'code' => $room['room_code'],
        'name' => $room['room_name'],
        'game_mode' => $room['game_mode'],
        'target_score' => $room['target_score'],
        'duration_seconds' => $room['duration_seconds'],
        'moves_limit' => $room['moves_limit'],
        'theme' => $room['theme'],
        'theme_voting' => (bool)$room['theme_voting'],
        'status' => $room['status'],
        'max_players' => $room['max_players']
    ]
]);
?>
