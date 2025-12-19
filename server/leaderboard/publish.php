<?php
/**
 * Publish Player Data
 * POST /publish
 * Body: { 
 *   "device_id": "uuid",
 *   "total_stars": 50,
 *   "completed_levels": 20,
 *   "medals": { "bronze": 2, "silver": 1, "gold": 0, "platinum": 0, "earth": 0 },
 *   "endless_scores": { "trash": 50000, "pollution": 30000, ... }
 * }
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

if (empty($input['device_id'])) {
    sendError('Device ID is required');
}

$deviceId = trim($input['device_id']);

try {
    $db = getDB();
    
    // Check if device is registered
    $stmt = $db->prepare("SELECT id, username FROM leaderboard WHERE device_id = ?");
    $stmt->execute([$deviceId]);
    $player = $stmt->fetch();
    
    if (!$player) {
        sendError('Device not registered. Please register first.', 404);
    }
    
    // Prepare update data
    $updates = [];
    $params = [];
    
    // Stars and levels
    if (isset($input['total_stars'])) {
        $updates[] = "total_stars = ?";
        $params[] = max(0, (int)$input['total_stars']);
    }
    
    if (isset($input['completed_levels'])) {
        $updates[] = "completed_levels = ?";
        $params[] = max(0, (int)$input['completed_levels']);
    }
    
    // Medals
    if (isset($input['medals']) && is_array($input['medals'])) {
        $medals = $input['medals'];
        if (isset($medals['bronze'])) {
            $updates[] = "medals_bronze = ?";
            $params[] = max(0, (int)$medals['bronze']);
        }
        if (isset($medals['silver'])) {
            $updates[] = "medals_silver = ?";
            $params[] = max(0, (int)$medals['silver']);
        }
        if (isset($medals['gold'])) {
            $updates[] = "medals_gold = ?";
            $params[] = max(0, (int)$medals['gold']);
        }
        // Support both 'platinum' and 'diamond' keys (maps to medals_platinum)
        $platinumValue = $medals['platinum'] ?? $medals['diamond'] ?? null;
        if ($platinumValue !== null) {
            $updates[] = "medals_platinum = ?";
            $params[] = max(0, (int)$platinumValue);
        }
        // Support both 'earth' and 'earth-saver' keys (maps to medals_earth)
        $earthValue = $medals['earth'] ?? $medals['earth-saver'] ?? null;
        if ($earthValue !== null) {
            $updates[] = "medals_earth = ?";
            $params[] = max(0, (int)$earthValue);
        }
    }
    
    // Endless scores
    if (isset($input['endless_scores']) && is_array($input['endless_scores'])) {
        $scores = $input['endless_scores'];
        $themeMap = [
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
        
        foreach ($scores as $theme => $score) {
            $column = $themeMap[strtolower($theme)] ?? null;
            if ($column) {
                // Use COALESCE to handle NULL column values (GREATEST returns NULL if any arg is NULL)
                $updates[] = "$column = GREATEST(COALESCE($column, 0), ?)";
                $params[] = max(0, (int)$score);
            }
        }
    }
    
    if (empty($updates)) {
        sendError('No data to update');
    }
    
    // Execute update
    $params[] = $deviceId;
    $sql = "UPDATE leaderboard SET " . implode(', ', $updates) . " WHERE device_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    // Get updated player data with rank
    $stmt = $db->prepare("
        SELECT 
            username, total_stars, completed_levels,
            medals_bronze, medals_silver, medals_gold, medals_platinum, medals_earth,
            endless_trash, endless_pollution, endless_water, endless_energy, endless_forest,
            (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.total_stars > leaderboard.total_stars) as global_rank
        FROM leaderboard 
        WHERE device_id = ?
    ");
    $stmt->execute([$deviceId]);
    $updated = $stmt->fetch();
    
    sendSuccess([
        'published' => true,
        'player' => $updated,
        'message' => 'Your score has been published!'
    ]);
    
} catch (Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
?>
