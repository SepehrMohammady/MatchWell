-- MatchWell Save Backup Database Schema
-- Run this SQL to create the save backup table.
--
-- Model: a save belongs to an account identified by the player's leaderboard
-- username (already unique) plus a password. Exactly one device holds a valid
-- owner_token at a time, which is what keeps the save active on only one device:
-- signing in elsewhere mints a new token and the previous device's copy stops
-- matching, so it locks itself.

CREATE TABLE IF NOT EXISTS save_backups (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- The player's leaderboard username. Unique across the game, and the same
    -- name shown on the leaderboard, so there is only one identity to remember.
    username VARCHAR(20) NOT NULL UNIQUE,

    -- bcrypt via password_hash(). Never stored or transmitted in the clear.
    password_hash VARCHAR(255) NOT NULL,

    -- Secret held by the device that currently owns the save. Rotated on every
    -- successful restore, which is what deactivates the previous device.
    owner_token VARCHAR(64) NOT NULL,

    -- The save itself: a JSON blob of the app's stored keys.
    payload MEDIUMTEXT NOT NULL,
    payload_bytes INT NOT NULL DEFAULT 0,

    app_version VARCHAR(16) NULL,
    last_restored_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_owner_token (owner_token),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
