<?php
/**
 * MatchWell Multiplayer API Configuration
 * Uses shared config from leaderboard
 */

require_once __DIR__ . '/../leaderboard/config.php';

// Multiplayer-specific constants
define('MAX_ROOM_NAME_LENGTH', 50);
define('MIN_ROOM_NAME_LENGTH', 3);
define('ROOM_CODE_LENGTH', 6);
define('PASSWORD_MIN_LENGTH', 4);
define('PASSWORD_MAX_LENGTH', 6);

// Generate random room code
function generateRoomCode() {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like O/0, I/1
    $code = '';
    for ($i = 0; $i < ROOM_CODE_LENGTH; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
}

// Validate room name
function validateRoomName($name) {
    $name = trim($name);
    
    if (strlen($name) < MIN_ROOM_NAME_LENGTH) {
        return ['valid' => false, 'error' => 'Room name must be at least ' . MIN_ROOM_NAME_LENGTH . ' characters'];
    }
    
    if (strlen($name) > MAX_ROOM_NAME_LENGTH) {
        return ['valid' => false, 'error' => 'Room name must be at most ' . MAX_ROOM_NAME_LENGTH . ' characters'];
    }
    
    return ['valid' => true, 'name' => $name];
}

// Hash password for storage
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

// Verify password
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Get room by code
function getRoomByCode($pdo, $code) {
    $stmt = $pdo->prepare("SELECT * FROM multiplayer_rooms WHERE room_code = ?");
    $stmt->execute([$code]);
    return $stmt->fetch();
}

// Get participant in room
function getParticipant($pdo, $roomId, $deviceId) {
    $stmt = $pdo->prepare("SELECT * FROM multiplayer_participants WHERE room_id = ? AND device_id = ?");
    $stmt->execute([$roomId, $deviceId]);
    return $stmt->fetch();
}

// Get all participants in room
function getRoomParticipants($pdo, $roomId) {
    $stmt = $pdo->prepare("
        SELECT username, current_score, moves_used, completion_time, has_finished, theme_vote
        FROM multiplayer_participants 
        WHERE room_id = ? 
        ORDER BY 
            CASE WHEN has_finished = 1 THEN 0 ELSE 1 END,
            CASE WHEN completion_time IS NULL OR completion_time <= 0 THEN 1 ELSE 0 END,
            completion_time ASC,
            current_score DESC
    ");
    $stmt->execute([$roomId]);
    return $stmt->fetchAll();
}

// Count participants in room
function countParticipants($pdo, $roomId) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM multiplayer_participants WHERE room_id = ?");
    $stmt->execute([$roomId]);
    return $stmt->fetchColumn();
}

// Check if all participants finished
function allParticipantsFinished($pdo, $roomId) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM multiplayer_participants WHERE room_id = ? AND has_finished = 0");
    $stmt->execute([$roomId]);
    return $stmt->fetchColumn() == 0;
}
?>
