<?php
/**
 * Update player score during game
 * POST: room_code, device_id, score, moves_used, finished?
 */

require_once 'config.php';

$input = getJsonInput();

if (empty($input['device_id'])) sendError('Device ID is required');
if (empty($input['room_code'])) sendError('Room code is required');
if (!isset($input['score'])) sendError('Score is required');

$pdo = getDB();

// Find room
$room = getRoomByCode($pdo, strtoupper($input['room_code']));
if (!$room) sendError('Room not found');

// Check room status
if ($room['status'] !== 'active') {
    sendError('Game is not active');
}

// Check if time expired (for timed games)
if ($room['end_time'] && strtotime($room['end_time']) < time()) {
    // Mark room as completed
    $stmt = $pdo->prepare("UPDATE multiplayer_rooms SET status = 'completed' WHERE id = ?");
    $stmt->execute([$room['id']]);
    sendError('Game time has expired');
}

// Find participant
$participant = getParticipant($pdo, $room['id'], $input['device_id']);
if (!$participant) sendError('You are not in this room');

if ($participant['has_finished']) {
    sendError('You have already finished');
}

$score = (int)$input['score'];
$movesUsed = isset($input['moves_used']) ? (int)$input['moves_used'] : $participant['moves_used'];
$finished = isset($input['finished']) ? (bool)$input['finished'] : false;
$completionTime = null;

// Check if player reached target (for race mode)
if ($room['game_mode'] === 'race' && $room['target_score'] && $score >= $room['target_score']) {
    $finished = true;
    // Calculate completion time from start
    $completionTime = time() - strtotime($room['start_time']);
}

// Check if moves exhausted (for moves mode)
if ($room['game_mode'] === 'moves' && $room['moves_limit'] && $movesUsed >= $room['moves_limit']) {
    $finished = true;
}

// Update participant
$finishedAt = $finished ? date('Y-m-d H:i:s') : null;

$stmt = $pdo->prepare("
    UPDATE multiplayer_participants 
    SET current_score = ?, moves_used = ?, has_finished = ?, 
        completion_time = COALESCE(?, completion_time), finished_at = COALESCE(?, finished_at)
    WHERE room_id = ? AND device_id = ?
");
$stmt->execute([
    $score, 
    $movesUsed, 
    $finished ? 1 : 0, 
    $completionTime,
    $finishedAt,
    $room['id'], 
    $input['device_id']
]);

// Check if all players finished
if ($finished && allParticipantsFinished($pdo, $room['id'])) {
    $stmt = $pdo->prepare("UPDATE multiplayer_rooms SET status = 'completed' WHERE id = ?");
    $stmt->execute([$room['id']]);
}

// Get updated rankings
$rankings = getRoomParticipants($pdo, $room['id']);

sendSuccess([
    'updated' => true,
    'score' => $score,
    'finished' => $finished,
    'completion_time' => $completionTime,
    'rankings' => $rankings,
    'room_status' => $room['status']
]);
?>
