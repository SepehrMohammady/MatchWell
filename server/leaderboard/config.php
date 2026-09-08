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

/**
 * Minimum app build allowed to WRITE (register, publish, back up, play online).
 *
 * 0 disables the gate, which is correct during testing. Set this to the first
 * Play Store build number at launch: older test builds then get a clear "please
 * update" instead of being able to register names or push scores into the clean
 * production data. Reads are deliberately left ungated so an old build can still
 * show the leaderboard while telling the player to update.
 */
define('MIN_SUPPORTED_BUILD', 0);

/**
 * Reject writes from builds older than MIN_SUPPORTED_BUILD.
 * Clients send `build` (versionCode). A missing build is treated as ancient.
 */
function requireSupportedClient($input) {
    if (MIN_SUPPORTED_BUILD <= 0) {
        return;
    }
    $build = isset($input['build']) ? (int)$input['build'] : 0;
    if ($build < MIN_SUPPORTED_BUILD) {
        sendError('This version of MatchWell is no longer supported. Please update to continue.', 426);
    }
}

/**
 * Random token proving a request comes from the device that owns a leaderboard
 * entry. Issued at registration and sent automatically by the app - this is not
 * a login and the player never sees or types it.
 */
function generateDeviceSecret() {
    return bin2hex(random_bytes(24));
}

/**
 * Authorise a leaderboard write.
 *
 * Returns the player row on success and never returns on failure.
 *
 * Rows created before write auth existed have a NULL secret. The first write to
 * such a row adopts the secret it is given (trust on first use) so devices
 * already in the wild keep working; every later write must match it.
 */
function authorisePlayerWrite($db, $deviceId, $providedSecret) {
    $stmt = $db->prepare("SELECT id, username, device_secret FROM leaderboard WHERE device_id = ?");
    $stmt->execute([$deviceId]);
    $player = $stmt->fetch();

    if (!$player) {
        sendError('Device not registered. Please register first.', 404);
    }

    if ($player['device_secret'] === null || $player['device_secret'] === '') {
        if (!is_string($providedSecret) || strlen($providedSecret) < 16) {
            sendError('Device key is required', 401);
        }
        $claim = $db->prepare("UPDATE leaderboard SET device_secret = ? WHERE id = ?");
        $claim->execute([$providedSecret, $player['id']]);
        $player['device_secret'] = $providedSecret;
        return $player;
    }

    if (!is_string($providedSecret) || !hash_equals($player['device_secret'], $providedSecret)) {
        sendError('This device is not allowed to update that player', 403);
    }

    return $player;
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
