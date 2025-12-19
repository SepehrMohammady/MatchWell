<?php
/**
 * Check Username Availability
 * POST /check-username
 * Body: { "username": "PlayerName" }
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();

if (empty($input['username'])) {
    sendError('Username is required');
}

$validation = validateUsername($input['username']);
if (!$validation['valid']) {
    sendError($validation['error']);
}

$username = $validation['username'];

try {
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM leaderboard WHERE LOWER(username) = LOWER(?)");
    $stmt->execute([$username]);
    
    $exists = $stmt->fetch() !== false;
    
    sendSuccess([
        'available' => !$exists,
        'username' => $username
    ]);
} catch (Exception $e) {
    sendError('Database error', 500);
}
?>
