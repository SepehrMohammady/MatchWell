<?php
/**
 * Vote for theme (before game starts)
 * POST: room_code, device_id, theme
 */

require_once 'config.php';

$input = getJsonInput();

if (empty($input['device_id'])) sendError('Device ID is required');
if (empty($input['room_code'])) sendError('Room code is required');
if (empty($input['theme'])) sendError('Theme is required');

$pdo = getDB();

// Find room
$room = getRoomByCode($pdo, strtoupper($input['room_code']));
if (!$room) sendError('Room not found');

// Check voting is enabled
if (!$room['theme_voting']) sendError('Theme voting is not enabled for this room');

// Check room status
if ($room['status'] !== 'waiting') {
    sendError('Voting is only allowed before game starts');
}

// Find participant
$participant = getParticipant($pdo, $room['id'], $input['device_id']);
if (!$participant) sendError('You are not in this room');

// Valid themes
$validThemes = ['trash-sorting', 'pollution', 'water-conservation', 'energy-efficiency', 'deforestation'];
if (!in_array($input['theme'], $validThemes)) {
    sendError('Invalid theme');
}

// Update vote
$stmt = $pdo->prepare("
    UPDATE multiplayer_participants 
    SET theme_vote = ? 
    WHERE room_id = ? AND device_id = ?
");
$stmt->execute([$input['theme'], $room['id'], $input['device_id']]);

// Get current vote counts
$stmt = $pdo->prepare("
    SELECT theme_vote, COUNT(*) as votes 
    FROM multiplayer_participants 
    WHERE room_id = ? AND theme_vote IS NOT NULL
    GROUP BY theme_vote 
    ORDER BY votes DESC
");
$stmt->execute([$room['id']]);
$votes = $stmt->fetchAll();

sendSuccess([
    'voted' => true,
    'theme' => $input['theme'],
    'votes' => $votes
]);
?>
