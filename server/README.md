# MatchWell server APIs

Three PHP APIs, deployed under `https://semo-lab.com/matchwell/`:

| Folder | Deployed to | Purpose |
|---|---|---|
| `leaderboard/` | `/matchwell/leaderboard/` | Global and per-theme rankings |
| `multiplayer/` | `/matchwell/multiplayer/` | Online rooms, scores, theme voting |
| `backup/` | `/matchwell/backup/` | Cloud save + single-device transfer |

`multiplayer/config.php` and `backup/config.php` both
`require_once __DIR__ . '/../leaderboard/config.php'`, so the database
credentials live in exactly one file. Deploy `leaderboard/` first.

## The server runs nginx, not Apache

This matters, and it is easy to get wrong when reading this repo.

`leaderboard/.htaccess` is **inert in production**. nginx ignores `.htaccess`
entirely. Its rewrite rules are also stale — they still reference the old
`/semolab/` deployment path — and nothing depends on them, because the app calls
the `.php` files directly rather than using clean URLs.

Protection of sensitive files comes from **generic nginx rules** covering
`/matchwell/*/config.php` and `/matchwell/*/schema.sql`, plus directory listing
being off. That is why:

- `config.php` and `schema.sql` already return 403 in every folder, including
  any new one, which inherits the rule automatically.
- Adding an `.htaccess` to a folder does **nothing**. Do not add one to make a
  directory look protected — a file that appears to secure something but has no
  effect is worse than no file, because the next person auditing this will
  believe it.

If a folder needs response headers (for example `Cache-Control: no-store` on the
save endpoints, which return personal data), those must be added to the **nginx
config**, not to an `.htaccess`.

## Privacy note on rate limiting

The application code stores no IP addresses in any table, and the backup
brute-force lockout is keyed on the account rather than the client IP.

That is a deliberate choice about what the *application database* holds, not a
claim that IPs are never recorded: nginx keeps access logs containing IPs,
rotated after roughly two weeks, and the published privacy policy discloses
this. IP-based rate limiting at the nginx layer is therefore compatible with the
policy as written.

## Deploying changes

1. Upload the changed folder.
2. Run any new `schema.sql` against the leaderboard database.
3. `php -l` every changed file — this repo is developed on a machine without
   PHP, so syntax is not verified before commit.
