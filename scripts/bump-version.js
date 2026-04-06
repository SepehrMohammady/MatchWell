#!/usr/bin/env node
/**
 * Version Bump Script - Updates ALL version files in sync
 * 
 * Usage:
 *   node scripts/bump-version.js          # bump patch (0.8.35 -> 0.8.36)
 *   node scripts/bump-version.js minor    # bump minor (0.8.35 -> 0.9.0)
 *   node scripts/bump-version.js major    # bump major (0.8.35 -> 1.0.0)
 *   node scripts/bump-version.js 1.2.3    # set exact version
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Read current version from version.ts (source of truth)
const versionTsPath = path.join(ROOT, 'src', 'config', 'version.ts');
const versionTs = fs.readFileSync(versionTsPath, 'utf8');
const majorMatch = versionTs.match(/major:\s*(\d+)/);
const minorMatch = versionTs.match(/minor:\s*(\d+)/);
const patchMatch = versionTs.match(/patch:\s*(\d+)/);

if (!majorMatch || !minorMatch || !patchMatch) {
    console.error('Could not parse current version from version.ts');
    process.exit(1);
}

let major = parseInt(majorMatch[1]);
let minor = parseInt(minorMatch[1]);
let patch = parseInt(patchMatch[1]);
const oldVersion = `${major}.${minor}.${patch}`;

// Determine new version
const arg = process.argv[2] || 'patch';
if (arg.match(/^\d+\.\d+\.\d+$/)) {
    [major, minor, patch] = arg.split('.').map(Number);
} else if (arg === 'major') {
    major++; minor = 0; patch = 0;
} else if (arg === 'minor') {
    minor++; patch = 0;
} else {
    patch++;
}

const newVersion = `${major}.${minor}.${patch}`;
const versionCode = major * 10000 + minor * 100 + patch;

console.log(`Bumping version: ${oldVersion} -> ${newVersion} (versionCode: ${versionCode})`);

// 1. version.ts
let content = fs.readFileSync(versionTsPath, 'utf8');
content = content.replace(/major:\s*\d+/, `major: ${major}`);
content = content.replace(/minor:\s*\d+/, `minor: ${minor}`);
content = content.replace(/patch:\s*\d+/, `patch: ${patch}`);
fs.writeFileSync(versionTsPath, content);
console.log('  ✅ src/config/version.ts');

// 2. package.json
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('  ✅ package.json');

// 3. package-lock.json
const lockPath = path.join(ROOT, 'package-lock.json');
if (fs.existsSync(lockPath)) {
    let lockContent = fs.readFileSync(lockPath, 'utf8');
    // Update root version and packages[""].version
    const lockJson = JSON.parse(lockContent);
    lockJson.version = newVersion;
    if (lockJson.packages && lockJson.packages['']) {
        lockJson.packages[''].version = newVersion;
    }
    fs.writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n');
    console.log('  ✅ package-lock.json');
}

// 4. android/app/build.gradle
const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${newVersion}"`);
fs.writeFileSync(gradlePath, gradle);
console.log('  ✅ android/app/build.gradle');

console.log(`\nDone! Version is now ${newVersion}`);
