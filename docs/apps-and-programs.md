# TempleOS Apps & Programs

## Overview

This document outlines all the apps that will be included in the TempleOS Remake, categorized by whether they're built into the UI or launched externally.

---

## Built-In Apps (Part of TempleOS UI)

These run INSIDE your Electron app - custom-built with your TempleOS aesthetic.

### 💻 Terminal
**Status**: ✅ Implemented (basic)

**Features to add**:
- Real shell commands (via Node.js child_process)
- Command history (up/down arrows)
- Tab completion
- Copy/paste support
- Multiple terminal tabs
- Customizable colors

**Commands**:
```
help, clear, dir/ls, cd, cat, echo, pwd, 
mkdir, rm, cp, mv, whoami, date, time,
god (Word of God), hymn, about, neofetch
```

---

### ✝️ Word of God
**Status**: ✅ Implemented

**Features to add**:
- Full Bible integration (searchable)
- Daily verse on boot
- Verse of the day notification
- Audio reading option
- Multiple translations

---

### 📁 File Browser
**Status**: ✅ Implemented (real filesystem)

**Features to add**:
- Drag and drop
- File preview (images, text, video)
- Context menu (right-click)
- Bookmarks/favorites
- Search functionality

---

### 📝 HolyC Editor / Text Editor
**Status**: ✅ Implemented (basic)

**Features to add**:
- Syntax highlighting (HolyC, Python, JS, etc.)
- Line numbers
- Find/replace
- Multiple tabs
- Auto-save
- Code folding

---

### ⚙️ Settings Panel
**Status**: ✅ Implemented (core)

**Features**:
- Theme customization
  - Colors (use VGA palette or custom)
  - Font size
  - Scanline effect toggle
- Security settings
  - Tor toggle
  - Firewall status
  - Encryption status
- System info
  - CPU, RAM, disk usage
  - Network status
- Sound settings
- Display settings

---

### 🖥️ System Monitor
**Status**: ✅ Implemented (basic)

**Features**:
- Real-time CPU usage graph
- Memory usage
- Disk space
- Network activity
- Process list
- Kill process option

---

### 🖼️ Image Viewer
**Status**: ❌ Not started

**Features**:
- View images (JPG, PNG, GIF, WebP)
- Zoom in/out
- Slideshow mode
- Basic editing (rotate, crop)

---

### 🎵 Music Player
**Status**: ❌ Not started

**Features**:
- Play local music files
- Playlist support
- Album art display
- Equalizer
- Retro visualizer (TempleOS style)

---

### 📹 Video Player
**Status**: ❌ Not started

**Features**:
- Play video files (MP4, MKV, AVI)
- Full-screen mode
- Subtitles support
- Playback speed control

---

### 🧮 Calculator
**Status**: ❌ Not started

**Features**:
- Basic calculator
- Scientific mode
- Programmer mode (hex, binary)
- History

---

### 📅 Calendar
**Status**: ❌ Not started

**Features**:
- View calendar
- Religious holidays
- Saint days
- Reminders

---

### 📓 Notes
**Status**: ❌ Not started

**Features**:
- Quick notes
- Markdown support
- Categories/folders
- Search

---

### 🕹️ Built-in Mini Games
**Status**: ❌ Not started

**Ideas**:
- Snake (classic)
- Tetris clone
- Minesweeper
- Simple maze game
- "After Egypt" style game (like original TempleOS)
- Memory card game

---

## External Apps (Launched from UI)

These are real Linux apps that open in separate windows.

### 🌐 Browsers

> [!NOTE]
> **Optional**: Browsers are NOT pre-installed. Users install via Word of God.

| App | Notes |
|-----|-------|
| **Opera GX** | Gaming browser, customizable themes |
| **Firefox** | Standard browser, privacy-focused |
| **Tor Browser** | Anonymous browsing |
| **Chromium** | If Opera GX unavailable |

**Implementation**:
- Add launcher buttons in UI
- Theme Opera GX to match TempleOS colors
- Tor Browser for security mode

---

### 🎮 Gaming

| App | Purpose |
|-----|---------|
| **Steam** | Main game store + Proton |
| **Lutris** | Non-Steam Windows games |
| **RetroArch** | Retro console emulation |
| **Heroic Games Launcher** | Epic/GOG games |

---

### 📦 Productivity

| App | Purpose |
|-----|---------|
| **LibreOffice** | Documents, spreadsheets |
| **GIMP** | Image editing |
| **Kdenlive** | Video editing |
| **Audacity** | Audio editing |
| **OBS Studio** | Streaming/recording |

---

### 💬 Communication

| App | Purpose |
|-----|---------|
| **Discord** | Gaming chat (Electron app) |
| **Element** | Matrix chat (secure) |
| **Thunderbird** | Email client |

---

### 👨‍💻 Development

| App | Purpose |
|-----|---------|
| **VS Code** | Code editor |
| **Git** | Version control |
| **Docker** | Containers |

---

## App Launcher Design

In the TempleOS UI, we'll have an app launcher that shows all available apps:

```
┌────────────────────────────────────────────┐
│           🚀 APPLICATION LAUNCHER          │
├────────────────────────────────────────────┤
│                                            │
│  📁 Files    💻 Terminal   ✝️ Word of God   │
│                                            │
│  📝 Editor   ⚙️ Settings   🖥️ Monitor       │
│                                            │
│  ─────────── External Apps ──────────────  │
│                                            │
│  🌐 Opera GX  🦊 Firefox   🧅 Tor Browser  │
│                                            │
│  🎮 Steam     🎯 Lutris    🕹️ RetroArch    │
│                                            │
│  📄 Office    🎨 GIMP      💬 Discord      │
│                                            │
└────────────────────────────────────────────┘
```

---

## Priority Order for Development

### High Priority (Core Experience)
1. Terminal (real shell integration)
2. File Browser (real file system)
3. Settings Panel
4. App Launcher

### Medium Priority (Useful)
5. System Monitor
6. Text Editor improvements
7. Music Player
8. Image Viewer

### Lower Priority (Nice to have)
9. Video Player
10. Calculator
11. Notes
12. Calendar
13. Mini Games
