<?php
/**
 * Get Global Leaderboard
 * GET /global?limit=50&offset=0
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

$limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
$offset = max(0, (int)($_GET['offset'] ?? 0));
$deviceId = $_GET['device_id'] ?? null;

try {
    $db = getDB();
    
    // Get total count
    $stmt = $db->query("SELECT COUNT(*) as total FROM leaderboard");
    $total = $stmt->fetch()['total'];
    
    // Get rankings sorted by total stars
    $stmt = $db->prepare("
        SELECT 
            username, 
            total_stars, 
            completed_levels,
            medals_bronze, medals_silver, medals_gold, medals_platinum, medals_earth,
            (medals_bronze + medals_silver + medals_gold + medals_platinum + medals_earth) as total_medals,
            endless_trash, endless_pollution, endless_water, endless_energy, endless_forest,
            (endless_trash + endless_pollution + endless_water + endless_energy + endless_forest) as total_endless
        FROM leaderboard 
        ORDER BY total_stars DESC, total_medals DESC, total_endless DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $rankings = $stmt->fetchAll();
    
    // Add rank numbers
    foreach ($rankings as $i => &$player) {
        $player['rank'] = $offset + $i + 1;
    }
    
    // Get current player's rank if device_id provided
    $playerRank = null;
    if ($deviceId) {
        $stmt = $db->prepare("
            SELECT 
                username,
                total_stars,
                (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.total_stars > leaderboard.total_stars) as rank
            FROM leaderboard 
            WHERE device_id = ?
        ");
        $stmt->execute([$deviceId]);
        $playerRank = $stmt->fetch();
    }
    
    sendSuccess([
        'rankings' => $rankings,
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset,
        'player' => $playerRank
    ]);
    
} catch (Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
?>
