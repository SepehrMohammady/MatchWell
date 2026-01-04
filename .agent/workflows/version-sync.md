---
description: How to update version numbers after code changes
---

# Version Sync Workflow
// turbo-all

After any code changes that will be committed, ALWAYS sync all version files:

## Steps:

1. **Update version.ts** - Increment patch number:
   ```
   src/config/version.ts → patch: X
   ```

2. **Update package.json** - Run npm version:
   ```powershell
   npm version 0.X.Y --no-git-tag-version
   ```
   This automatically updates both package.json AND package-lock.json

3. **Update build.gradle** - Update Android version:
   ```
   android/app/build.gradle → versionCode X, versionName "0.X.Y"
   ```

4. **Rebuild** - Always rebuild after version changes:
   ```powershell
   .\android\gradlew -p android assembleRelease
   ```

5. **Commit with version** - Include version in commit message:
   ```powershell
   git add -A
   git commit -m "vX.Y.Z: Description of changes"
   git push
   ```

## Version Files (4 total):
- `src/config/version.ts` - patch: number
- `package.json` - version: "0.X.Y"
- `package-lock.json` - version: "0.X.Y" (auto-updated by npm)
- `android/app/build.gradle` - versionCode & versionName

## Rules:
- Increment patch for bug fixes
- Increment minor for new features
- versionCode = 100 + patch (e.g., 0.7.4 → versionCode 104)
- ALWAYS update ALL 4 files together
- NEVER commit without updating version
