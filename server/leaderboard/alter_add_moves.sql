-- ALTER script to add moves columns to existing leaderboard table
-- Run this to update your database with moves tracking

ALTER TABLE leaderboard
ADD COLUMN moves_trash INT DEFAULT 0 AFTER endless_forest,
ADD COLUMN moves_pollution INT DEFAULT 0 AFTER moves_trash,
ADD COLUMN moves_water INT DEFAULT 0 AFTER moves_pollution,
ADD COLUMN moves_energy INT DEFAULT 0 AFTER moves_water,
ADD COLUMN moves_forest INT DEFAULT 0 AFTER moves_energy;
