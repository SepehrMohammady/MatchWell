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
    
    // Get total count of players with any endless scores
    $stmt = $db->query("SELECT COUNT(*) as total FROM leaderboard WHERE (COALESCE(endless_trash,0) + COALESCE(endless_pollution,0) + COALESCE(endless_water,0) + COALESCE(endless_energy,0) + COALESCE(endless_forest,0)) > 0");
    $total = $stmt->fetch()['total'];
    
    // Get rankings sorted by total endless score (sum of all themes)
    $stmt = $db->prepare("
        SELECT 
            username, 
            total_stars, 
            (medals_bronze + medals_silver + medals_gold + medals_platinum + medals_earth) as total_medals,
            COALESCE(endless_trash,0) as endless_trash, 
            COALESCE(endless_pollution,0) as endless_pollution, 
            COALESCE(endless_water,0) as endless_water, 
            COALESCE(endless_energy,0) as endless_energy, 
            COALESCE(endless_forest,0) as endless_forest,
            (COALESCE(endless_trash,0) + COALESCE(endless_pollution,0) + COALESCE(endless_water,0) + COALESCE(endless_energy,0) + COALESCE(endless_forest,0)) as total_endless,
            COALESCE(moves_trash,0) as moves_trash,
            COALESCE(moves_pollution,0) as moves_pollution,
            COALESCE(moves_water,0) as moves_water,
            COALESCE(moves_energy,0) as moves_energy,
            COALESCE(moves_forest,0) as moves_forest,
            (COALESCE(moves_trash,0) + COALESCE(moves_pollution,0) + COALESCE(moves_water,0) + COALESCE(moves_energy,0) + COALESCE(moves_forest,0)) as total_moves
        FROM leaderboard 
        WHERE (COALESCE(endless_trash,0) + COALESCE(endless_pollution,0) + COALESCE(endless_water,0) + COALESCE(endless_energy,0) + COALESCE(endless_forest,0)) > 0
        ORDER BY total_endless DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $rankings = $stmt->fetchAll();
    
    // Add rank numbers and score per move
    foreach ($rankings as $i => &$player) {
        $player['rank'] = $offset + $i + 1;
        $totalMoves = (int)$player['total_moves'];
        $totalEndless = (int)$player['total_endless'];
        $player['score_per_move'] = $totalMoves > 0 ? round($totalEndless / $totalMoves, 1) : 0;
    }
    
    // Get current player's data if device_id provided
    $playerData = null;
    if ($deviceId) {
        $stmt = $db->prepare("
            SELECT 
                username,
                total_stars,
                (medals_bronze + medals_silver + medals_gold + medals_platinum + medals_earth) as total_medals,
                (COALESCE(endless_trash,0) + COALESCE(endless_pollution,0) + COALESCE(endless_water,0) + COALESCE(endless_energy,0) + COALESCE(endless_forest,0)) as total_endless,
                (COALESCE(moves_trash,0) + COALESCE(moves_pollution,0) + COALESCE(moves_water,0) + COALESCE(moves_energy,0) + COALESCE(moves_forest,0)) as total_moves,
                (SELECT COUNT(*) + 1 FROM leaderboard l2 
                 WHERE (COALESCE(l2.endless_trash,0) + COALESCE(l2.endless_pollution,0) + COALESCE(l2.endless_water,0) + COALESCE(l2.endless_energy,0) + COALESCE(l2.endless_forest,0)) > 
                       (COALESCE(leaderboard.endless_trash,0) + COALESCE(leaderboard.endless_pollution,0) + COALESCE(leaderboard.endless_water,0) + COALESCE(leaderboard.endless_energy,0) + COALESCE(leaderboard.endless_forest,0))
                ) as `rank`
            FROM leaderboard 
            WHERE device_id = ?
        ");
        $stmt->execute([$deviceId]);
        $playerData = $stmt->fetch();
        if ($playerData) {
            $totalMoves = (int)$playerData['total_moves'];
            $totalEndless = (int)$playerData['total_endless'];
            $playerData['score_per_move'] = $totalMoves > 0 ? round($totalEndless / $totalMoves, 1) : 0;
        }
    }
    
    sendSuccess([
        'rankings' => $rankings,
        'total' => (int)$total,
        'limit' => $limit,
        'offset' => $offset,
        'player' => $playerData
    ]);
    
} catch (Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
?>
