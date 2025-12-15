# TempleOS Gaming Integration

## Overview

Full gaming support through Steam, Proton, emulators, and native games. The goal is to make this a viable gaming OS while maintaining the TempleOS aesthetic.

---

## Steam + Proton

### What is Proton?
Proton is Valve's compatibility layer that lets you run Windows games on Linux. It's built into Steam.

### Setup Steps (for the OS build)
1. Install Steam from package manager
2. Enable Steam Play for all titles
3. Install Proton-GE (community version, better compatibility)

### Game Compatibility
Check: **[ProtonDB.com](https://www.protondb.com)**

| Rating | Meaning | % of Games |
|--------|---------|------------|
| 🟢 Platinum | Perfect out of box | ~40% |
| 🟢 Gold | Works with minor tweaks | ~25% |
| 🟡 Silver | Playable with issues | ~15% |
| 🟠 Bronze | Runs but problems | ~10% |
| 🔴 Borked | Doesn't work | ~10% |

**~80% of Steam games work well on Linux!**

---

## Games That Work Great

### AAA Titles
- ✅ Elden Ring
- ✅ Cyberpunk 2077
- ✅ GTA V
- ✅ Red Dead Redemption 2
- ✅ Baldur's Gate 3
- ✅ Hogwarts Legacy
- ✅ The Witcher 3
- ✅ Horizon Zero Dawn

### Multiplayer
- ✅ Counter-Strike 2
- ✅ Dota 2
- ✅ Team Fortress 2
- ✅ Rocket League
- ⚠️ Fortnite (needs workarounds)
- ❌ Valorant (anti-cheat blocks Linux)

### Indie
- ✅ Minecraft (native)
- ✅ Terraria
- ✅ Stardew Valley
- ✅ Hollow Knight
- ✅ Hades
- ✅ Celeste

---

## Non-Steam Gaming

### Lutris
**Purpose**: Run GOG, Epic, Battle.net, and other games

**Games it handles**:
- World of Warcraft
- Diablo series
- Overwatch
- Epic Games Store titles
- GOG games

### Heroic Games Launcher
**Purpose**: Epic and GOG games with a nice UI

### Bottles
**Purpose**: Run Windows apps/games in isolated containers

---

## Retro Gaming / Emulation

### RetroArch
All-in-one emulator frontend that supports:

| System | Core | Compatibility |
|--------|------|---------------|
| NES | FCEUmm | ⭐⭐⭐⭐⭐ |
| SNES | Snes9x | ⭐⭐⭐⭐⭐ |
| Game Boy | Gambatte | ⭐⭐⭐⭐⭐ |
| GBA | mGBA | ⭐⭐⭐⭐⭐ |
| N64 | Mupen64Plus | ⭐⭐⭐⭐ |
| PS1 | Beetle PSX | ⭐⭐⭐⭐⭐ |
| PS2 | PCSX2 | ⭐⭐⭐⭐ |
| PSP | PPSSPP | ⭐⭐⭐⭐⭐ |
| Wii/GameCube | Dolphin | ⭐⭐⭐⭐⭐ |
| Nintendo DS | DeSmuME | ⭐⭐⭐⭐⭐ |
| 3DS | Citra | ⭐⭐⭐⭐ |
| Switch | Yuzu/Ryujinx | ⭐⭐⭐ |

### Standalone Emulators
| Emulator | System | Why standalone? |
|----------|--------|-----------------|
| Dolphin | Wii/GC | Better performance |
| PCSX2 | PS2 | More features |
| RPCS3 | PS3 | Complex emulation |
| Cemu | Wii U | Better compat |

---

## Gaming UI Integration

### In the TempleOS Desktop

```
┌────────────────────────────────────────────────────┐
│                    🎮 GAMES                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  STEAM   │  │  LUTRIS  │  │ RETROARCH │        │
│  │    🎮    │  │    🎯    │  │    🕹️     │        │
│  └──────────┘  └──────────┘  └──────────┘        │
│                                                    │
│  Recent Games:                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ 🎮 Elden Ring         │ Last played: Today   │  │
│  │ 🎮 Cyberpunk 2077     │ Last played: 2 days  │  │
│  │ 🎮 Minecraft          │ Last played: 1 week  │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Features
- Quick launch recent games
- Show currently playing
- Game time tracking
- Game-specific settings (per-game Proton version)

---

## Gaming Performance

### Optimizations to Include
1. **GameMode** - Optimizes CPU governor for gaming
2. **MangoHud** - FPS overlay and performance stats
3. **vkBasalt** - Post-processing (sharpening, etc.)
4. **CoreCtrl** - GPU overclocking/fan control

### Kernel Options
- Use `linux-zen` or `linux-tkg` kernel for better gaming performance
- Configure CPU scaling
- Disable unnecessary services during gaming

---

## Built-in Retro Games (TempleOS Style)

These will be built INTO the TempleOS UI itself, styled to match:

### 1. Divine Snake 🐍
Classic snake game with TempleOS graphics

### 2. Holy Tetris
Falling blocks with VGA-style graphics

### 3. Temple Minesweeper 💣
Classic minesweeper

### 4. After Egypt Clone
Recreation of Terry's original game

### 5. Word of God Quiz
Bible trivia game

### 6. Terminal Roguelike
ASCII dungeon crawler

---

## Anti-Cheat Considerations

Some games use anti-cheat that blocks Linux:

| Anti-Cheat | Linux Support |
|------------|---------------|
| EAC (Easy Anti-Cheat) | ⚠️ Game-specific |
| BattlEye | ⚠️ Game-specific |
| Vanguard (Valorant) | ❌ No |
| RICOCHET (CoD) | ❌ No |

**Note**: Developers must enable Linux support for EAC/BattlEye. Many have!

---

## Installation Priority

### Phase 1 (Essential)
1. Steam + Proton
2. GameMode
3. MangoHud

### Phase 2 (Expanded)
4. Lutris
5. RetroArch
6. Heroic Games Launcher

### Phase 3 (Complete)
7. Individual emulators
8. Bottles
9. Wine-GE
