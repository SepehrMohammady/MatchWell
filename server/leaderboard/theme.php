<?php
/**
 * Get Theme Leaderboard
 * GET /theme.php?theme=trash&limit=50&offset=0
 * Theme options: trash, pollution, water, energy, forest
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

$theme = strtolower($_GET['theme'] ?? '');
$limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));
$offset = max(0, (int)($_GET['offset'] ?? 0));
$deviceId = $_GET['device_id'] ?? null;

// Map theme names to columns
$themeColumns = [
    'trash' => 'endless_trash',
    'trash-sorting' => 'endless_trash',
    'pollution' => 'endless_pollution',
    'water' => 'endless_water',
    'water-conservation' => 'endless_water',
    'energy' => 'endless_energy',
    'energy-efficiency' => 'endless_energy',
    'forest' => 'endless_forest',
    'deforestation' => 'endless_forest'
];

if (!isset($themeColumns[$theme])) {
    sendError('Invalid theme. Valid themes: trash, pollution, water, energy, forest');
}

$column = $themeColumns[$theme];

// Map theme to moves column
$movesColumns = [
    'trash' => 'moves_trash',
    'trash-sorting' => 'moves_trash',
    'pollution' => 'moves_pollution',
    'water' => 'moves_water',
    'water-conservation' => 'moves_water',
    'energy' => 'moves_energy',
    'energy-efficiency' => 'moves_energy',
    'forest' => 'moves_forest',
    'deforestation' => 'moves_forest'
];
$movesColumn = $movesColumns[$theme];

try {
    $db = getDB();
    
    // Get total count of players with scores in this theme
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM leaderboard WHERE COALESCE($column, 0) > 0");
    $stmt->execute();
    $total = $stmt->fetch()['total'];
    
    // Get rankings for this theme with moves and score per move
    $stmt = $db->prepare("
        SELECT 
            username, 
            COALESCE($column, 0) as score,
            COALESCE($movesColumn, 0) as moves,
            total_stars,
            (medals_bronze + medals_silver + medals_gold + medals_platinum + medals_earth) as total_medals
        FROM leaderboard 
        WHERE COALESCE($column, 0) > 0
        ORDER BY $column DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $rankings = $stmt->fetchAll();
    
    // Add rank numbers and score per move
    foreach ($rankings as $i => &$player) {
        $player['rank'] = $offset + $i + 1;
        $moves = (int)$player['moves'];
        $score = (int)$player['score'];
        $player['score_per_move'] = $moves > 0 ? round($score / $moves, 1) : 0;
    }
    
    // Get current player's data if device_id provided
    $playerData = null;
    if ($deviceId) {
        $stmt = $db->prepare("
            SELECT 
                username,
                COALESCE($column, 0) as score,
                COALESCE($movesColumn, 0) as moves,
                total_stars,
                (medals_bronze + medals_silver + medals_gold + medals_platinum + medals_earth) as total_medals,
                (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE COALESCE(l2.$column, 0) > COALESCE(leaderboard.$column, 0)) as `rank`
            FROM leaderboard 
            WHERE device_id = ?
        ");
        $stmt->execute([$deviceId]);
        $playerData = $stmt->fetch();
        if ($playerData) {
            $moves = (int)$playerData['moves'];
            $score = (int)$playerData['score'];
            $playerData['score_per_move'] = $moves > 0 ? round($score / $moves, 1) : 0;
        }
    }
    
    sendSuccess([
        'theme' => $theme,
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
