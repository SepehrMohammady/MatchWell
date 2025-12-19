<?php
/**
 * MatchWell Leaderboard API Configuration
 * Upload this folder to: /semolab/matchwell/leaderboard/
 */

// Database Configuration - UPDATE THESE VALUES
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_database_user');
define('DB_PASS', 'your_database_password');

// API Configuration
define('API_VERSION', '1.0');
define('MAX_USERNAME_LENGTH', 20);
define('MIN_USERNAME_LENGTH', 3);

// CORS Headers for React Native
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Connection
function getDB() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        sendError('Database connection failed', 500);
        exit();
    }
}

// Response Helpers
function sendSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit();
}

function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit();
}

// Get JSON Input
function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON input');
    }
    return $data;
}

// Validate Username
function validateUsername($username) {
    $username = trim($username);
    
    if (strlen($username) < MIN_USERNAME_LENGTH) {
        return ['valid' => false, 'error' => 'Username must be at least ' . MIN_USERNAME_LENGTH . ' characters'];
    }
    
    if (strlen($username) > MAX_USERNAME_LENGTH) {
        return ['valid' => false, 'error' => 'Username must be at most ' . MAX_USERNAME_LENGTH . ' characters'];
    }
    
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        return ['valid' => false, 'error' => 'Username can only contain letters, numbers, and underscores'];
    }
    
    return ['valid' => true, 'username' => $username];
}
?>
