<?php
/**
 * Get Player Info
 * GET /player.php?device_id=uuid
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

$deviceId = $_GET['device_id'] ?? null;

if (empty($deviceId)) {
    sendError('Device ID is required');
}

try {
    $db = getDB();
    
    $stmt = $db->prepare("
        SELECT 
            username, 
            total_stars, 
            completed_levels,
            medals_bronze, medals_silver, medals_gold, medals_platinum, medals_earth,
            (medals_bronze + medals_silver + medals_gold + medals_platinum + medals_earth) as total_medals,
            endless_trash, endless_pollution, endless_water, endless_energy, endless_forest,
            (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.total_stars > leaderboard.total_stars) as global_rank,
            updated_at
        FROM leaderboard 
        WHERE device_id = ?
    ");
    $stmt->execute([$deviceId]);
    $player = $stmt->fetch();
    
    if (!$player) {
        sendSuccess([
            'registered' => false,
            'player' => null
        ]);
    }
    
    // Get total players for context
    $stmt = $db->query("SELECT COUNT(*) as total FROM leaderboard");
    $totalPlayers = $stmt->fetch()['total'];
    
    sendSuccess([
        'registered' => true,
        'player' => $player,
        'total_players' => (int)$totalPlayers
    ]);
    
} catch (Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
?>
