// Centralized version configuration
// Update this file when releasing new versions
// Follow semver: major.minor.patch

export const VERSION = {
    major: 0,
    minor: 2,
    patch: 29,

    // Computed version string
    get string() {
        return `${this.major}.${this.minor}.${this.patch}`;
    },

    // Build number for Android (auto-increments based on version)
    get buildNumber() {
        return this.major * 10000 + this.minor * 100 + this.patch;
    }
};

export default VERSION;
