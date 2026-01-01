<?php
/**
 * Get room status and rankings
 * GET: room_code, device_id
 */

require_once 'config.php';

$roomCode = $_GET['room_code'] ?? null;
$deviceId = $_GET['device_id'] ?? null;

if (!$roomCode) sendError('Room code is required');
if (!$deviceId) sendError('Device ID is required');

$pdo = getDB();

// Find room
$room = getRoomByCode($pdo, strtoupper($roomCode));
if (!$room) sendError('Room not found');

// Check if participant (for private rooms)
$participant = getParticipant($pdo, $room['id'], $deviceId);
if (!$participant) sendError('You are not in this room');

// Check if time expired
if ($room['status'] === 'active' && $room['end_time'] && strtotime($room['end_time']) < time()) {
    $stmt = $pdo->prepare("UPDATE multiplayer_rooms SET status = 'completed' WHERE id = ?");
    $stmt->execute([$room['id']]);
    $room['status'] = 'completed';
}

// Get participants with rankings
$participants = getRoomParticipants($pdo, $room['id']);

// Get theme votes (if voting enabled and waiting)
$themeVotes = [];
if ($room['theme_voting'] && $room['status'] === 'waiting') {
    $stmt = $pdo->prepare("
        SELECT theme_vote, COUNT(*) as votes 
        FROM multiplayer_participants 
        WHERE room_id = ? AND theme_vote IS NOT NULL
        GROUP BY theme_vote 
        ORDER BY votes DESC
    ");
    $stmt->execute([$room['id']]);
    $themeVotes = $stmt->fetchAll();
}

// Calculate time remaining
$timeRemaining = null;
if ($room['status'] === 'active' && $room['end_time']) {
    $timeRemaining = max(0, strtotime($room['end_time']) - time());
}

sendSuccess([
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
        'max_players' => $room['max_players'],
        'start_time' => $room['start_time'],
        'end_time' => $room['end_time'],
        'time_remaining' => $timeRemaining
    ],
    'is_host' => ($room['host_device_id'] === $deviceId),
    'participants' => $participants,
    'participant_count' => count($participants),
    'theme_votes' => $themeVotes,
    'my_score' => $participant['current_score'],
    'my_finished' => (bool)$participant['has_finished']
]);
?>
