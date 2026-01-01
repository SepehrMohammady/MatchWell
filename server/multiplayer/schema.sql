-- MatchWell Multiplayer Mode Database Schema
-- Run this SQL to create the multiplayer tables

-- Multiplayer Rooms Table
CREATE TABLE IF NOT EXISTS multiplayer_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_code VARCHAR(8) UNIQUE NOT NULL,
    room_name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    host_device_id VARCHAR(50) NOT NULL,
    game_mode ENUM('race', 'timed', 'moves') NOT NULL,
    target_score INT DEFAULT NULL,
    duration_seconds INT DEFAULT NULL,
    moves_limit INT DEFAULT NULL,
    theme VARCHAR(30) DEFAULT NULL,
    theme_voting BOOLEAN DEFAULT FALSE,
    status ENUM('waiting', 'active', 'completed') DEFAULT 'waiting',
    max_players INT DEFAULT 20,
    start_time DATETIME DEFAULT NULL,
    end_time DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_room_code (room_code),
    INDEX idx_host (host_device_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Multiplayer Participants Table
CREATE TABLE IF NOT EXISTS multiplayer_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    username VARCHAR(30) NOT NULL,
    current_score INT DEFAULT 0,
    moves_used INT DEFAULT 0,
    completion_time INT DEFAULT NULL,
    theme_vote VARCHAR(30) DEFAULT NULL,
    has_finished BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME DEFAULT NULL,
    FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_player (room_id, device_id),
    INDEX idx_room (room_id),
    INDEX idx_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
