-- Adds write authentication to the leaderboard.
--
-- Until now any request carrying a known device_id could overwrite that
-- player's scores. device_secret is a random token issued at registration and
-- known only to that device, required for every write. It is not a login: the
-- app obtains and sends it automatically, and the player never sees it.
--
-- Existing rows get NULL. publish.php treats NULL as "not yet claimed" and
-- adopts the first secret it is given (trust on first use), so devices already
-- in the wild keep working and claim their secret on their next publish.

ALTER TABLE leaderboard
    ADD COLUMN device_secret VARCHAR(64) NULL AFTER device_id;
