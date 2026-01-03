<?php
/**
 * Create a new multiplayer room
 * POST: room_name, password, game_mode, target_score?, duration_seconds?, moves_limit?, 
 *       theme?, theme_voting?, max_players?, device_id
 */

require_once 'config.php';

$input = getJsonInput();

// Required fields
if (empty($input['device_id'])) sendError('Device ID is required');
if (empty($input['room_name'])) sendError('Room name is required');
if (empty($input['password'])) sendError('Password is required');
if (empty($input['game_mode'])) sendError('Game mode is required');

// Validate room name
$nameCheck = validateRoomName($input['room_name']);
if (!$nameCheck['valid']) sendError($nameCheck['error']);

// Validate password length
$password = $input['password'];
if (strlen($password) < PASSWORD_MIN_LENGTH || strlen($password) > PASSWORD_MAX_LENGTH) {
    sendError('Password must be ' . PASSWORD_MIN_LENGTH . '-' . PASSWORD_MAX_LENGTH . ' characters');
}

// Validate game mode
$validModes = ['race', 'timed', 'moves'];
if (!in_array($input['game_mode'], $validModes)) {
    sendError('Invalid game mode. Must be: race, timed, or moves');
}

// Mode-specific validation
$gameMode = $input['game_mode'];
$targetScore = null;
$durationSeconds = null;
$movesLimit = null;

if ($gameMode === 'race') {
    if (empty($input['target_score'])) sendError('Target score required for race mode');
    if (empty($input['duration_seconds'])) sendError('Time limit required for race mode');
    $targetScore = (int)$input['target_score'];
    $durationSeconds = (int)$input['duration_seconds'];
} elseif ($gameMode === 'timed') {
    if (empty($input['duration_seconds'])) sendError('Duration required for timed mode');
    $durationSeconds = (int)$input['duration_seconds'];
} elseif ($gameMode === 'moves') {
    if (empty($input['moves_limit'])) sendError('Moves limit required for moves mode');
    $movesLimit = (int)$input['moves_limit'];
    $durationSeconds = isset($input['duration_seconds']) ? (int)$input['duration_seconds'] : null;
}

$pdo = getDB();

// Generate unique room code
$roomCode = null;
$attempts = 0;
while ($attempts < 10) {
    $code = generateRoomCode();
    $existing = getRoomByCode($pdo, $code);
    if (!$existing) {
        $roomCode = $code;
        break;
    }
    $attempts++;
}

if (!$roomCode) sendError('Could not generate room code, please try again');

// Get username - prefer from request, fallback to players table, then default
$hostUsername = 'Player';
if (!empty($input['username'])) {
    $hostUsername = substr($input['username'], 0, 20); // Limit to 20 chars
} else {
    try {
        $stmt = $pdo->prepare("SELECT username FROM players WHERE device_id = ?");
        $stmt->execute([$input['device_id']]);
        $player = $stmt->fetch();
        if ($player && !empty($player['username'])) {
            $hostUsername = $player['username'];
        }
    } catch (Exception $e) {
        // Players table might not exist or query failed - use default username
    }
}

// Create room
$stmt = $pdo->prepare("
    INSERT INTO multiplayer_rooms 
    (room_code, room_name, password_hash, host_device_id, game_mode, target_score, 
     duration_seconds, moves_limit, theme, theme_voting, max_players)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

try {
    $stmt->execute([
        $roomCode,
        $nameCheck['name'],
        hashPassword($password),
        $input['device_id'],
        $gameMode,
        $targetScore,
        $durationSeconds,
        $movesLimit,
        $input['theme'] ?? null,
        isset($input['theme_voting']) && $input['theme_voting'] ? 1 : 0,
        $input['max_players'] ?? 20
    ]);
} catch (PDOException $e) {
    error_log('MatchWell Multiplayer Create Error: ' . $e->getMessage());
    sendError('Failed to create room: ' . $e->getMessage());
}

$roomId = $pdo->lastInsertId();

// Auto-join host as first participant
$stmt = $pdo->prepare("
    INSERT INTO multiplayer_participants (room_id, device_id, username)
    VALUES (?, ?, ?)
");
$stmt->execute([$roomId, $input['device_id'], $hostUsername]);

sendSuccess([
    'created' => true,
    'room_code' => $roomCode,
    'room_id' => $roomId
]);
?>
