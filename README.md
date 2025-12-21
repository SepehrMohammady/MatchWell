<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android-brightgreen" alt="Platform">
  <img src="https://img.shields.io/badge/React%20Native-0.83-blue" alt="React Native">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

<h1 align="center">🌍 MatchWell</h1>

<p align="center">
  <strong>Save the Planet, One Match at a Time!</strong>
</p>

<p align="center">
  An eco-conscious Match-3 puzzle game that teaches environmental responsibility through fun gameplay.
  <br>
  Match trash to recycle ♻️ • Clear pollution to clean the air 🌤️ • Watch the world heal 🌱
</p>

---

## 🎮 Gameplay

Match 3 or more items in a row or column to clear them from the board. Complete level objectives before running out of moves!

| Feature | Description |
|---------|-------------|
| 🧩 **Match-3 Mechanics** | Classic puzzle gameplay with satisfying combos |
| 🌍 **5 Environmental Themes** | Trash Sorting, Pollution, Water Conservation, Energy Efficiency, Deforestation |
| ⭐ **50 Story Levels** | 10 levels per theme with progressive difficulty |
| ♾️ **Endless Mode** | Unlimited play, no move limits, high score tracking |
| 🏆 **35 Achievements** | Theme completion, star milestones, endless score tiers |
| 🔥 **Combo System** | Chain reactions multiply your score |
| 🌎 **Power-Up System** | Match 4+ to charge Earth power, clear rows/columns |
| 📖 **Tutorial** | Visual how-to-play guide for new players |
| 📚 **Eco Facts** | Learn real environmental facts as you play |
| 🎵 **Themed Music** | Unique background music for each theme |
| 🌐 **Global Leaderboard** | Compete worldwide, track score per move |
| 🌎 **Earth Progression** | Watch Earth heal as you complete more levels |
| 🎯 **Dynamic App Icon** | App icon changes when you complete all 50 levels |

---

## 🎨 Themes

| Theme | Icon | Description |
|-------|------|-------------|
| **Trash Sorting** | ♻️ | Learn to separate recyclables: plastic, paper, glass, metal, organic |
| **Pollution** | 🏭 | Remove polluting vehicles from cities: cars, trucks, buses, factories |
| **Water Conservation** | 💧 | Save water resources: droplets, showers, faucets, waves |
| **Energy Efficiency** | ⚡ | Conserve energy: light bulbs, plugs, batteries, solar, wind |
| **Deforestation** | 🌳 | Protect forests: pine trees, palm trees, logs, seedlings, leaves |

---

## ⭐ Star System

Stars are awarded based on **moves remaining** when completing a level:

| Moves Remaining | Stars |
|-----------------|-------|
| ≥50% of total | ⭐⭐⭐ |
| 25-49% of total | ⭐⭐☆ |
| <25% of total | ⭐☆☆ |

**Maximum: 150 stars** (50 levels × 3 stars each)

---

## 🏆 Achievements

### Theme Completion (5)
Complete all 10 levels of a theme to earn its medal:
- ♻️ **Recycler** - Trash Sorting
- 🌬️ **Clean Air Champion** - Pollution
- 💧 **Water Guardian** - Water Conservation
- ⚡ **Energy Saver** - Energy Efficiency
- 🌳 **Forest Protector** - Deforestation

### Star Milestones (5)
| Achievement | Requirement |
|-------------|-------------|
| 🥉 Bronze Collector | 30 stars |
| 🥈 Silver Collector | 60 stars |
| 🥇 Gold Collector | 90 stars |
| 💎 Diamond Collector | 120 stars |
| 🏆 Star Master | 150 stars |

### Endless Score Tiers (25)
5 tiers per theme (Bronze → Silver → Gold → Diamond → Earth Saver)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio

### Installation

```bash
# Clone the repository
git clone https://github.com/SepehrMohammady/MatchWell.git
cd MatchWell

# Install dependencies
npm install

# Run on Android
npx react-native run-android
```

### Build Release APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`

---

## 📖 Documentation

Open `icon-preview.html` in a browser to see:
- All theme icons
- UI icons
- Star calculation details
- Achievement requirements
- Game mechanics guide

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React Native | Cross-platform framework |
| TypeScript | Type-safe development |
| Zustand | State management |
| React Navigation | Screen navigation |
| react-native-sound | Audio playback |
| react-native-change-icon | Dynamic app icon |
| AsyncStorage | Progress persistence |

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Add new environmental themes
- Improve translations

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  Made with 💚 for Earth
  <br>
  <strong>Every match counts. Every action matters.</strong>
</p>
