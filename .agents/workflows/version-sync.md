---
description: How to update version numbers after code changes
---
// turbo-all

# Version Sync Workflow

When bumping the version, **ALL** of the following files must be updated in sync. Failing to update any one of them causes version mismatches.

## Files to Update

### 1. `src/config/version.ts` (source of truth)
Update the `patch` (or `minor`/`major`) field:
```ts
export const VERSION = {
    major: 0,
    minor: 7,
    patch: XX,  // <-- bump this
```

### 2. `package.json`
Update the `"version"` field:
```json
"version": "0.7.XX",
```

### 3. `package-lock.json`
Update **both** `"version"` fields (lines 3 and ~9):
```json
"version": "0.7.XX",
```
> **Alternatively**, run `npm install` after updating `package.json` to auto-sync.

### 4. `android/app/build.gradle`
Update both `versionCode` and `versionName`:
```gradle
versionCode 1XX        // major*10000 + minor*100 + patch
versionName "0.7.XX"
```

## Steps

1. Decide the new version: `MAJOR.MINOR.PATCH`
2. Update `src/config/version.ts` with the new patch/minor/major
3. Update `package.json` → `"version"`
4. Update `package-lock.json` → both `"version"` fields (search for old version)
5. Update `android/app/build.gradle` → `versionCode` and `versionName`
6. Verify no stale versions remain:
```powershell
Select-String -Path src\config\version.ts, package.json, android\app\build.gradle -Pattern "version" | Select-Object -First 10
```
7. Search for old version across codebase:
```powershell
git grep "OLD_VERSION" -- "*.ts" "*.json" "*.gradle"
```

## Quick Checklist

- [ ] `src/config/version.ts` → patch field
- [ ] `package.json` → `"version"`
- [ ] `package-lock.json` → both `"version"` entries
- [ ] `android/app/build.gradle` → `versionCode` + `versionName`
- [ ] `git grep` for old version → zero results
