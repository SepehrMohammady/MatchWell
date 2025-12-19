-- MatchWell Leaderboard Database Schema
-- Run this SQL to create the leaderboard table

CREATE TABLE IF NOT EXISTS leaderboard (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    username VARCHAR(20) NOT NULL UNIQUE,
    
    -- Story Mode Stats
    total_stars INT DEFAULT 0,
    completed_levels INT DEFAULT 0,
    
    -- Medals Count (achievements)
    medals_bronze INT DEFAULT 0,
    medals_silver INT DEFAULT 0,
    medals_gold INT DEFAULT 0,
    medals_platinum INT DEFAULT 0,
    medals_earth INT DEFAULT 0,
    
    -- Endless Mode High Scores per Theme
    endless_trash INT DEFAULT 0,
    endless_pollution INT DEFAULT 0,
    endless_water INT DEFAULT 0,
    endless_energy INT DEFAULT 0,
    endless_forest INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_device (device_id),
    INDEX idx_total_stars (total_stars DESC),
    INDEX idx_endless_trash (endless_trash DESC),
    INDEX idx_endless_pollution (endless_pollution DESC),
    INDEX idx_endless_water (endless_water DESC),
    INDEX idx_endless_energy (endless_energy DESC),
    INDEX idx_endless_forest (endless_forest DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
