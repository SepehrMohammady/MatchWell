# MatchWell — account deletion (server + website work)

Google Play requires any app that lets users create an account to offer account
deletion, both **in the app** and **via a public web page**. The in-app half is
done and ships in MatchWell 0.8.54. This document covers the three pieces that
need you.

Until item 1 is deployed, the in-app **Delete account** button fails with a
network error. Nothing is lost — the app only clears local state after the
server confirms — but the button is dead until the file is live.

---

## 1. Deploy the new endpoint

**File:** `server/leaderboard/delete-account.php` (in the repo, ready to upload)
**URL:** `POST https://semo-lab.com/matchwell/leaderboard/delete-account.php`

No schema change, no config change. It uses the existing helpers and the same
database as the other APIs.

**Request**

```json
{ "device_id": "...", "device_secret": "...", "password": "", "build": 854 }
```

**Response**

```json
{ "success": true, "data": { "deleted": { "leaderboard": 1, "backup": 1, "rooms": 0, "participants": 0 } } }
```

**What it deletes**, in one transaction across all four tables:

| Table | Rows removed | Matched on |
|---|---|---|
| `save_backups` | cloud save payload + password hash | `username` |
| `multiplayer_participants` | this player in any room | `device_id` |
| `multiplayer_rooms` | rooms this player hosts (participants first) | `host_device_id` |
| `leaderboard` | username, stats, device key | `id` |

**Authorisation**

- The device key (`device_secret`) authorises the delete, same as `publish.php`
  and `rename.php`.
- **Additionally**, if the player has a cloud save, the backup `password` is
  required. Without that rule a device that had already lost the save to another
  device would still hold a valid device key and could wipe the copy it no
  longer owns.
- Wrong passwords go through the existing lockout (5 attempts, 15 minutes) and a
  dummy bcrypt burn keeps "does this player have a backup" undetectable from
  response timing.

**Please verify after deploying**

```bash
# 1. Wrong method -> 405
curl -s -o /dev/null -w '%{http_code}\n' \
  https://semo-lab.com/matchwell/leaderboard/delete-account.php

# 2. Unregistered device -> 404
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"device_id":"00000000-dead-beef-0000-000000000000","device_secret":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","build":854}' \
  https://semo-lab.com/matchwell/leaderboard/delete-account.php

# 3. Real account, no password -> 401 "Backup password is required"
#    (do NOT run this against PlayReview - see the warning below)
```

> **Do not delete the `PlayReview` account.** It is the demo account declared to
> Google Play in *Sign in details*, and Play reuses those credentials on every
> future update review. If it is ever removed, the next review fails.

---

## 2. New page: account deletion instructions

**URL:** `https://semo-lab.com/matchwell/delete-account/`
(matching the existing `https://semo-lab.com/matchwell/privacy-policy/`)

This URL goes into the Play Console *Data safety* form, so Google will crawl and
read it. Their requirements are that the page must:

- refer to MatchWell or SeMo Lab by name,
- prominently show the steps to request deletion,
- state which data is deleted and which is kept, plus any retention period.

It does **not** need to be a working web form. Explaining the in-app steps plus
an email fallback satisfies the requirement, and the in-app path already does
the real work.

Suggested content:

> ### Deleting your MatchWell account
>
> MatchWell can be played entirely offline and does not require an account. An
> account is only created if you turn on cloud backup or publish a score to the
> leaderboard.
>
> **In the app** — Settings → Delete account. Confirm, and enter your backup
> password if you have cloud backup switched on. Deletion is immediate.
>
> **If you no longer have the app installed** — email
> `<support address>` with your player name. We will delete the account and
> confirm by reply.
>
> **What is deleted:** your leaderboard entry (player name, stars, completed
> levels, medals, endless scores and moves), your cloud backup (saved game and
> password), and any multiplayer rooms you created. All of it is removed
> immediately and permanently, and your player name becomes available again.
>
> **What is kept:** your game progress stays on your own device — deleting the
> account does not erase the game you have on your phone. Use *Reset All
> Progress* in Settings for that.
>
> **Server access logs** record IP addresses for up to two weeks for security
> and abuse prevention, and are then deleted automatically. They are not linked
> to your player name.

Please confirm the support email address before publishing — I have used a
placeholder above.

---

## 3. Updates to the existing pages

### Privacy policy (`/matchwell/privacy-policy/`)

Add a deletion section, and check these facts still match the live site. The
policy already discloses IP logging, which is correct.

> **Deleting your data.** You can delete your account and everything we store
> about you at any time from Settings → Delete account in the app, or by
> following the steps at https://semo-lab.com/matchwell/delete-account/. This
> removes your leaderboard entry, your cloud backup and any multiplayer rooms
> immediately and permanently.

Two things to state accurately if they are not already there:

- Cloud backup stores a **bcrypt hash** of the backup password, never the
  password itself.
- Nothing else expires on its own. Leaderboard entries and cloud backups are
  kept until the player deletes them; only the nginx access logs rotate (~2
  weeks).

### Landing page (`/matchwell/`)

Add a link to the deletion page alongside the existing privacy policy link, so
the requirement is discoverable without digging. Something like
`Privacy Policy · Delete your account` in the footer is enough.

If the landing page lists features, note that MatchWell is a **paid** app with
**no ads and no in-app purchases** — that matches what has been declared to Play
and is worth keeping consistent.

---

## Summary of what I need back

1. `delete-account.php` deployed, with the three curl checks above passing.
2. `/matchwell/delete-account/` live (I will paste the URL into Play Console).
3. Privacy policy and landing page updated.
4. The support email address you want on the deletion page.
