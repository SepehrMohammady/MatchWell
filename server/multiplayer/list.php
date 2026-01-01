<?php
/**
 * List player's rooms (active and recent)
 * GET: device_id
 */

require_once 'config.php';

$deviceId = $_GET['device_id'] ?? null;

if (!$deviceId) sendError('Device ID is required');

$pdo = getDB();

// Get rooms where player is participant
$stmt = $pdo->prepare("
    SELECT 
        r.room_code,
        r.room_name,
        r.game_mode,
        r.status,
        r.theme,
        r.start_time,
        r.end_time,
        r.host_device_id,
        p.current_score,
        p.has_finished,
        (SELECT COUNT(*) FROM multiplayer_participants WHERE room_id = r.id) as player_count,
        r.max_players
    FROM multiplayer_rooms r
    JOIN multiplayer_participants p ON r.id = p.room_id
    WHERE p.device_id = ?
    ORDER BY 
        CASE r.status 
            WHEN 'active' THEN 1 
            WHEN 'waiting' THEN 2 
            ELSE 3 
        END,
        r.created_at DESC
    LIMIT 20
");
$stmt->execute([$deviceId]);
$rooms = $stmt->fetchAll();

// Format response
$activeRooms = [];
$waitingRooms = [];
$completedRooms = [];

foreach ($rooms as $room) {
    $roomData = [
        'code' => $room['room_code'],
        'name' => $room['room_name'],
        'game_mode' => $room['game_mode'],
        'theme' => $room['theme'],
        'is_host' => ($room['host_device_id'] === $deviceId),
        'my_score' => $room['current_score'],
        'player_count' => $room['player_count'],
        'max_players' => $room['max_players']
    ];
    
    if ($room['status'] === 'active') {
        $roomData['time_remaining'] = $room['end_time'] ? max(0, strtotime($room['end_time']) - time()) : null;
        $activeRooms[] = $roomData;
    } elseif ($room['status'] === 'waiting') {
        $waitingRooms[] = $roomData;
    } else {
        $roomData['finished'] = true;
        $completedRooms[] = $roomData;
    }
}

sendSuccess([
    'active' => $activeRooms,
    'waiting' => $waitingRooms,
    'completed' => $completedRooms
]);
?>
