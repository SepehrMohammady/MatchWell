<?php
/**
 * Leave a room (before game starts)
 * POST: room_code, device_id
 */

require_once 'config.php';

$input = getJsonInput();

if (empty($input['device_id'])) sendError('Device ID is required');
if (empty($input['room_code'])) sendError('Room code is required');

$pdo = getDB();

// Find room
$room = getRoomByCode($pdo, strtoupper($input['room_code']));
if (!$room) sendError('Room not found');

// Find participant
$participant = getParticipant($pdo, $room['id'], $input['device_id']);
if (!$participant) sendError('You are not in this room');

// Can only leave before game starts
if ($room['status'] === 'active') {
    sendError('Cannot leave during active game');
}

// Remove participant
$stmt = $pdo->prepare("DELETE FROM multiplayer_participants WHERE room_id = ? AND device_id = ?");
$stmt->execute([$room['id'], $input['device_id']]);

// If host left a waiting room, delete the room
if ($room['host_device_id'] === $input['device_id'] && $room['status'] === 'waiting') {
    $stmt = $pdo->prepare("DELETE FROM multiplayer_rooms WHERE id = ?");
    $stmt->execute([$room['id']]);
    
    sendSuccess([
        'left' => true,
        'room_deleted' => true
    ]);
}

// Check if room is now empty
$count = countParticipants($pdo, $room['id']);
if ($count === 0) {
    $stmt = $pdo->prepare("DELETE FROM multiplayer_rooms WHERE id = ?");
    $stmt->execute([$room['id']]);
    
    sendSuccess([
        'left' => true,
        'room_deleted' => true
    ]);
}

sendSuccess([
    'left' => true,
    'room_deleted' => false
]);
?>
