<?php
/**
 * Start game (host only)
 * POST: room_code, device_id, theme? (if theme_voting was enabled, use winning vote)
 */

require_once 'config.php';

$input = getJsonInput();

if (empty($input['device_id'])) sendError('Device ID is required');
if (empty($input['room_code'])) sendError('Room code is required');

$pdo = getDB();

// Find room
$room = getRoomByCode($pdo, strtoupper($input['room_code']));
if (!$room) sendError('Room not found');

// Check if host
if ($room['host_device_id'] !== $input['device_id']) {
    sendError('Only the host can start the game');
}

// Check status
if ($room['status'] !== 'waiting') {
    sendError('Game already started or completed');
}

// Determine theme
$theme = $room['theme'];
if ($room['theme_voting'] && !empty($input['theme'])) {
    $theme = $input['theme'];
} elseif ($room['theme_voting']) {
    // Count votes and pick winner
    $stmt = $pdo->prepare("
        SELECT theme_vote, COUNT(*) as votes 
        FROM multiplayer_participants 
        WHERE room_id = ? AND theme_vote IS NOT NULL
        GROUP BY theme_vote 
        ORDER BY votes DESC 
        LIMIT 1
    ");
    $stmt->execute([$room['id']]);
    $winner = $stmt->fetch();
    if ($winner) {
        $theme = $winner['theme_vote'];
    }
}

// Calculate end time
$startTime = date('Y-m-d H:i:s');
$endTime = null;
if ($room['duration_seconds']) {
    $endTime = date('Y-m-d H:i:s', time() + $room['duration_seconds']);
}

// Update room
$stmt = $pdo->prepare("
    UPDATE multiplayer_rooms 
    SET status = 'active', theme = ?, start_time = ?, end_time = ?
    WHERE id = ?
");
$stmt->execute([$theme, $startTime, $endTime, $room['id']]);

sendSuccess([
    'started' => true,
    'theme' => $theme,
    'start_time' => $startTime,
    'end_time' => $endTime,
    'game_mode' => $room['game_mode'],
    'target_score' => $room['target_score'],
    'moves_limit' => $room['moves_limit']
]);
?>
