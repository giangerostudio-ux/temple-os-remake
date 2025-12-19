# TempleOS Remake - Master Task List

> **A Modern OS with TempleOS Soul** - Full internet, any resolution, proper security, but with authentic Terry Davis vibes.
> 
> *"God's Operating System - Remade for the Modern Age"*

---

## 📊 Project Status Overview

| Tier | Status | Progress |
|------|--------|----------|
| TIER 1: Quick Wins | ✅ Complete | 4/4 items |
| TIER 2: Medium Effort | ✅ Complete | 4/4 items |
| TIER 3: Significant Effort | ✅ Complete | 4/4 items |
| TIER 4: Core Apps | ✅ Complete | 6/6 items |
| TIER 5: Authenticity | ✅ Complete | 7/7 items |
| TIER 6: Networking | ✅ Complete | 5/5 items |
| TIER 7: Security | ✅ Complete | 6/6 items |
| TIER 8-13 | ⬜ Not Started | Planning phase |
| TIER 14: Zorin OS-Inspired | ⬜ Not Started | 0/5 sections |

---

## ✅ TIER 1: QUICK WINS (Completed)
- [x] 1.1 Keyboard Shortcuts (Alt+F4, Alt+Tab, etc.)
- [x] 1.2 Power Management (Shutdown, Restart, Lock)
- [x] 1.3 Context Menus (Desktop, File Browser)
- [x] 1.4 Hymn Player (Playlist, Controls, Theme)

---

## ✅ TIER 2: MEDIUM EFFORT (Complete)
- [x] **2.1 Start Menu (TEMPLE Button)**
    - [x] Open/Close toggling
    - [x] Render Start Menu overlay panel
    - [x] Search bar (filter apps)
    - [x] Pinned apps grid
    - [x] Quick folders (Home, Documents, etc.)
    - [x] User profile display
    - [x] Integrated Power options
    - [x] **Real App Search** (scan .desktop files from /usr/share/applications)
    - [x] Super key opens Start Menu
- [x] **2.2 Window Snapping**
    - [x] Drag to edges (Left, Right, Top)
    - [x] Corner snapping (Quarter screen)
    - [x] Visual snap preview
    - [x] Apply snap on release
- [x] **2.3 Window Resizing**
    - [x] Edge dragging support
    - [x] Cursor changes
    - [x] Min-width/height constraints
- [x] **2.4 System Tray Enhancements**
    - [x] Volume slider popup
    - [x] Network status
    - [x] Calendar popup (clock click)
    - [x] Notification indicator

---

## ✅ Refinements & Fixes (Completed)
- [x] Improve Window Resizing (Larger hit area)
- [x] Fix Hymn Player playback bug
- [x] Fix main.ts Syntax Errors (Missing Class, Duplicates)
- [x] Set custom default wallpaper (`wallpaper temple os remake.png`)
- [x] Fix Holy Updater (Pathing issue on Windows)
- [x] Fix Typescript Build Errors (Unused variables)
- [x] Implement Real System Volume Control (`amixer` IPC)
- [x] Fix Tray Icons Visibility (Replaced Emojis with SVGs)
- [x] Fix Wallpaper Scaling on Desktop (Text Cutoff)
- [x] Refactor Tray Rendering (Fix Click Responsiveness)
- [x] Implement App-Level Audio Volume Control
- [x] Setup VM Fullscreen (Guest Additions)
- [x] Fix Hymn Player Minimize (Audio stops when minimized)

---

## 🔎 Integration Audit TODOs (Backend Reality)

- [x] Decide whether the "Ubuntu server backend" is meant to be remote (SSH/HTTP). Current IPC runs locally in the Electron main process (see `INTEGRATION_AUDIT.md`).
- [x] Implement a real OS lock for Linux (`system:lock` is currently UI-only; consider `loginctl lock-session` / `xdg-screensaver lock` / `dm-tool lock`).
- [x] Add battery status IPC + UI (no `upower`/`acpi` integration exists yet).
- [x] Add Linux `bounds` to `display:getOutputs` (sway `rect` / xrandr geometry) so Settings "Move Here" can reposition the window on Ubuntu.
- [x] Replace or clearly label simulated features (e.g., Tor circuit is currently fake in the UI; no IPC).
- [x] Replace/disable non-Linux mock fallbacks (apps list, network status, WiFi enabled, tracker blocking, volume set, display fallback output, updater dev-mode fallback).

## 🔨 TIER 3: SIGNIFICANT EFFORT (In Progress)

### 3.1 Settings Panel ✅
- [x] Settings Window Layout (Sidebar + Content)
- [x] System Page (Sound devices, volume, display resolution + lock timeout)
- [x] Personalization Page (Wallpaper changer)
- [x] Network & About Pages (nmcli Wi‑Fi connect/disconnect + system info)
- [x] Integrate with Start Menu & Tray

### 3.2 Notifications System 🔄
- [x] Toast notification component (pop up in corner)
- [x] Notification history panel
- [x] Do Not Disturb mode
- [x] App-specific notifications
- [x] Actions in notifications
- [x] Sound on notification
- [x] Notification indicator badge

### 3.3 Lock Screen
- [x] Password/PIN entry UI (Password + PIN keypad)
- [x] Clock display with date
- [x] Custom wallpaper support
- [x] Auto-lock after timeout (settings configurable)
- [x] Lock on keyboard shortcut (Win+L)

### 3.4 Alt+Tab Window Switcher (Visual)
- [x] Alt+Tab triggers window switcher overlay
- [x] Show app icons and window previews
- [x] Keep holding Alt, press Tab to cycle
- [x] Release Alt to switch
- [x] Alt+Shift+Tab goes backward
- [x] Highlight active selection

---

## 💪 TIER 4: CORE APPS & FUNCTIONALITY

### 4.1 Real Terminal (PTY Shell)
- [x] Real shell (node-pty + xterm.js; fallback exec still supported)
- [x] Command history (up/down arrows)
- [x] Tab completion
- [x] ANSI color support
- [x] Copy/paste
- [x] Multiple tabs
- [x] Split panes (like tmux)
- [x] Scrollback buffer
- [x] Search in output
- [x] Clickable URLs
- [x] Custom fonts/colors
- [x] Alias support
- [x] Custom prompts

#### Special TempleOS Commands:
- [x] `god` - Random Bible verse
- [x] `oracle` - Random word generator
- [x] `hymn` - Play random hymn
- [x] `terry` - Terry Davis quote
- [x] `neofetch` - System info (TempleOS styled)
- [x] `pray` - Random prayer
- [x] `psalm` - Random psalm
- [x] `confess` - Clear terminal history ("sins")

#### Fun Terminal Commands:
- [x] `cowsay` - ASCII cow with message
- [x] `fortune` - Random quote/wisdom
- [x] `matrix` - Matrix rain animation
- [x] `figlet` - ASCII text art
- [x] `sl` - Steam locomotive (for typos)

### 4.2 Text Editor Enhancements
- [x] Syntax highlighting (HolyC, Python, JS, etc.)
- [x] Line numbers
- [x] Find/replace
- [x] Multiple tabs
- [x] Undo/redo
- [x] Auto-save
- [x] File save dialog
- [x] Recent files
- [x] Word wrap toggle
- [x] Code folding


### 4.3 App Launcher (Real .desktop files)
- [x] Full app launcher (grid or list)
- [x] Search apps
- [x] Categorized apps (Games, Internet, Office, etc.)
- [x] Recent apps
- [x] Frequently used
- [x] Right-click → add to desktop
- [x] Keyboard shortcut (Super key)

### 4.4 Image Viewer
- [x] View images (JPG, PNG, GIF, WebP)
- [x] Zoom in/out
- [x] Pan/drag
- [x] Rotate
- [x] Slideshow
- [x] Set as wallpaper
- [x] Basic editing (crop)

### 4.5 File Browser Improvements
- [x] Breadcrumb navigation bar
- [x] Sidebar with favorites
- [x] Search box
- [/] View toggle (grid/list/details) (grid+list done; details later)
- [x] Column headers for sorting
- [/] Create/rename/delete files & folders (rename/delete/new file/folder done; more later)
- [/] Cut/copy/paste (single-item cut/copy/paste done; multi-select later)
- [x] Drag and drop
- [x] File previews (images, text)
- [x] Hidden files toggle
- [x] Zip/extract archives
- [x] Trash/recycle bin
- [x] Bookmarks/favorites
- [x] Context menu (right-click) enhancements

### 4.6 System Monitor
- [x] Real-time CPU usage graph
- [x] Memory usage
- [x] Disk space
- [x] Network activity
- [x] Process list
- [x] Kill process option
- [x] GPU usage (if available)

---

## 🔮 TIER 5: TEMPLEOS AUTHENTICITY FEATURES

### 5.1 Oracle / "Talk to God"
- [x] Oracle window app
- [x] Press SPACE to receive divine words
- [x] Random word generator (Terry's word list)
- [x] Copy words button
- [x] History of received words
- [x] Full-screen mode option (Standard window maximization)

### 5.2 Terry's Quotes System
- [x] Terry quotes database (famous + unhinged)
- [x] `terry` command in terminal
- [x] Random quote on boot (sometimes)
- [x] Quote in About dialog
- [x] Quote notification option

### 5.3 System Info (neofetch style)
### 5.3 System Info (neofetch style)
- [x] TempleOS ASCII art logo
- [x] OS version & Giangero Studio credit
- [x] Kernel info (Divine Intellect)
- [x] Uptime, CPU, Memory, Disk
- [x] Theme name
- [x] Divine quote at bottom

### 5.4 HolyC Compiler Integration
- [x] Run HolyC code from Editor (F5)
- [x] Basic JIT Interpreter (Print method)
- [x] Execution feedback in Terminal

### 5.5 Sprite Editor 🎨
- [x] 16-color VGA palette
- [x] Grid-based pixel drawing
- [x] Tools: Pencil, Fill, Eyedropper
- [x] Save sprites (JSON download)
- [x] Animation preview
- [x] Export to PNG

### 5.6 AutoHarp / Music Maker 🎹
- [x] Keyboard = piano keys
- [x] Record and playback
- [x] 8-bit sound synthesis
- [x] Export audio (JSON save)

### 5.7 DolDoc Viewer 📄
- [x] Load original .DD files (mocked/intercepted)
- [x] Display with formatting
- [x] View embedded ASCII art (basic placeholder)
- [x] Read-only mode

---

## 🌐 TIER 6: NETWORKING & CONNECTIVITY

- [x] Network Manager UI
- [x] WiFi network selector
- [x] Connect/disconnect
- [x] Saved networks list
- [x] Password input dialog
- [x] Signal strength indicator
- [x] Ethernet status
- [x] IP address display
- [x] VPN profiles (OpenVPN, WireGuard) - functional (nmcli import/connect/disconnect)
- [x] Kill switch (block if VPN drops) - functional (disconnect non-VPN via nmcli)
- [x] DNS settings
- [x] Network management refactored into dedicated manager module


### 6.2 Bluetooth Manager
- [x] Bluetooth toggle
- [x] Device discovery (Mocked)
- [x] Device pairing / unpairing (Mocked)
- [x] Supported profiles icon (Headphone, etc.)

### 6.3 Mobile Hotspot
- [x] Share connection
- [x] Set SSID/Password (UI only)

### 6.4 Flight Mode
- [x] Toggle all radios
- [x] Status indicator

### 6.5 Data Usage
- [x] Usage graph (Implemented in Network popup)
- [x] Limit setting (Functional in Settings)
- [x] Daily totals (RX/TX) (Tracked in NetworkManager)
- [x] Reset function (Functional)

### 6.6 Time & Date Settings
- [ ] GMT/Timezone selection (Auto/Manual)
- [ ] Network Time Protocol (NTP) toggle

### 6.3 SSH Server Toggle
- [x] Enable/disable SSH
- [x] Port configuration
- [x] Key management

### 6.4 Hotspot Creation
- [x] Share connection
- [x] Set SSID/Password (UI only)
- [x] Hotspot created via dedicated manager
- [x] Connected devices list (UI placeholder)


---

## 🔒 TIER 7: SECURITY FEATURES

### 7.1 Encryption Management
- [x] LUKS encryption status
- [x] Change encryption password (UI only)
- [x] Backup recovery keys (UI only)
- [x] VeraCrypt integration (hidden volumes)

### 7.2 Firewall UI
- [x] Firewall status toggle
- [x] View/edit firewall rules (Functional via UFW)
- [ ] Block specific apps
- [x] Allow specific ports

### 7.3 Privacy Features
- [x] MAC randomization toggle
- [x] Memory wipe on shutdown toggle
- [x] Secure delete option
- [x] Block trackers at firewall level (DNS blocking via /etc/hosts)
- [x] Metadata removal tool (EXIF stripper) - functional (JPEG/PNG)

### 7.4 Tor Integration
- [ ] Tor mode toggle (off/browser-only/system-wide)
- [ ] Tor circuit visualization
- [ ] Bridge configuration
- [ ] Traffic routing options

### 7.5 Security Audit Tool
- [x] Built-in security scanner
- [x] Check encryption status
- [x] Check firewall status
- [x] Check system updates
- [x] Security score display

### 7.6 System Optimization
- [ ] Memory Cleaner (Auto-clean at 90% usage)
- [ ] "Mem Reduct" style manual trigger

### 7.6 Physical Security - ✅ Completed
- [x] USB device whitelist
- [x] Lockdown mode (panic button)
- [x] Duress password (opens decoy session)

---

## 🛠️ TIER 8: ADVANCED APPS & FEATURES

### 8.1 Media Player (Enhanced)
- [x] Play audio files
- [x] Play video files
- [x] Playlist support
- [x] Shuffle/repeat
- [x] Retro visualizer (TempleOS style)
- [ ] Album art display
- [x] Equalizer

### 8.2 Calculator
- [x] Basic calculator
- [x] Scientific mode
- [x] Programmer mode (hex/bin)
- [x] History

### 8.3 Calendar App
- [x] Month view
- [x] Events/reminders (Holidays)
- [x] Religious holidays
- [x] Saint days
- [x] Integration with notifications

### 8.4 Notes App
- [x] Quick notes
- [x] Markdown support
- [ ] Categories/folders
- [ ] Search
- [x] Secure notes (encrypted)
- [ ] Godly Notes (Trello-like Kanban Board)

### 8.5 Browser Integration
> **Note**: Skipped per user request. Authentication to external world is limited to Network Manager.
- [x] ~~Browser launcher in UI~~ (Skipped)


### 8.6 External App Launchers
> **Note**: Skipped. No Steam/Gaming integration needed for this version.
- [x] ~~Steam launcher~~ (Skipped)


### 8.7 Help / Documentation
- [x] Getting started guide
- [x] Keyboard shortcuts list
- [x] FAQ
- [x] About TempleOS/Terry Davis
- [x] Credits / Giangero Studio

---

## 🎨 TIER 9: UX POLISH & THEMES

### 9.1 Taskbar Enhancements
- [x] Pinned apps that persist
- [x] App grouping (combine multiple windows of same app)
- [x] Taskbar hover previews (show window thumbnail)
- [x] Right-click taskbar → taskbar settings
- [x] Taskbar transparency/blur effect
- [x] Auto-hide taskbar option

### 9.2 Desktop Improvements
- [x] Multiple desktops / workspaces (4 desktops, Ctrl+Win+Arrows, Win+Tab overview)
- [x] Desktop widgets (clock, weather, system stats)
- [x] Icon grid snapping
- [x] Auto-arrange toggle
- [x] Icon size options
- [ ] Drag icons to rearrange
- [ ] Icon themes / packs

### 9.3 Window Features
- [x] Window animations (open/close effects)
- [x] Multi-monitor support
- [x] Always-on-top option
- [x] Window grouping (Ctrl+Shift+G to group, Ctrl+Shift+U to ungroup, Ctrl+Shift+T to test)
- [x] Picture-in-picture mode (Media Player PiP implemented)
- [x] Window transparency option

### 9.4 Theme System
- [x] Multiple color schemes (green, amber, cyan, white)
- [x] Light mode (for heathens 😄)
- [x] High contrast mode (Ctrl+Alt+H to toggle)
- [x] Custom user themes (Ctrl+Alt+T to create, Ctrl+Alt+N to cycle)
- [x] Import/export themes (Ctrl+Alt+E to export, Ctrl+Alt+I to import)

### 9.5 Context Menus (Full)
- [x] Window title bar right-click menu
- [x] Taskbar right-click menu (full)
- [x] Enhanced desktop right-click menu

### 9.6 Additional Keyboard Shortcuts
- [x] Win+E → Open File Explorer
- [x] Win+D → Show desktop (minimize all)
- [x] Win+L → Lock screen
- [x] Ctrl+Shift+Esc → Task manager / System Monitor
- [x] Win+X → Quick link menu
- [x] Super+B → Open default browser

### 9.7 Accessibility
- [x] Screen reader support (Basic ARIA attributes)
- [x] High contrast mode
- [x] Large text option
- [x] Keyboard navigation everywhere (Tabindex + Enter/Space handlers)
- [x] Reduce motion option
- [x] Color blind modes

---

## 🎮 TIER 10: GAMING INTEGRATION

### 10.1 Steam + Proton
- [x] Steam launcher integration
- [ ] Proton-GE installation
- [x] GameMode (Feral's) integration
- [ ] MangoHud FPS overlay

### 10.2 Game Launchers
- [x] Lutris for non-Steam games
- [ ] RetroArch for emulation
- [x] Heroic for Epic/GOG games
- [x] Bottles for Windows apps

### 10.3 Gaming Mode
- [ ] Electron shell hides during games
- [ ] Gamescope integration
- [x] Disable shell hotkeys during gaming
- [ ] Auto-restore after game exits

### 10.4 Gaming Performance
- [ ] CPU governor optimization
- [ ] Power profile switching
- [ ] vkBasalt post-processing
- [ ] CoreCtrl GPU management

### 10.5 Retro Gaming
- [ ] RetroArch preset configurations
- [ ] ROM directory setup

---

## 🥾 TIER 11: BOOT & FIRST RUN (Shell Implementation)

### 11.1 Shell Boot Screen
- [x] Initializing Divine Environment animation
- [x] HolyC loading simulation
- [x] Dynamic boot quote display
- [x] Transition to Desktop

### 11.2 First Run Wizard
- [x] Welcome screen
- [x] Theme personalization
- [x] "Ready!" screen with Bible verse
- [ ] Account integration (Optional)

### 11.3 Shutdown Sequence
- [x] Custom shutdown animation
- [x] "God be with you" message
- [x] Memory wipe (if enabled)

---

## 🕹️ TIER 12: MINI-GAMES (Optional/Fun)

> These are optional fun additions - not critical for OS functionality.

### 12.1 After Egypt (Terry's Game Clone)
- [ ] Side-scrolling action game
- [ ] Biblical Exodus theme
- [ ] Retro graphics style
- [ ] Keyboard controls
- [ ] Score system
- [ ] Multiple levels

### 12.2 Divine Snake 🐍
- [ ] Classic snake game
- [ ] Holy/cross collectibles
- [ ] TempleOS green theme
- [ ] High score system
- [ ] Increasing difficulty

### 12.3 Temple Minesweeper 💣
- [ ] Classic minesweeper
- [ ] Cross icons instead of flags
- [ ] Divine difficulty levels (Easy, Medium, Hard)
- [ ] Timer and score

### 12.4 Holy Tetris 🧱
- [ ] Falling blocks game
- [ ] TempleOS color palette
- [ ] Score and levels
- [ ] Next piece preview

### 12.5 Word of God Quiz 📖
- [ ] Bible trivia game
- [ ] Multiple choice questions
- [ ] Score tracking
- [ ] Difficulty levels

### 12.6 Bible Hangman
- [ ] Guess the verse
- [ ] Category selection
- [ ] Scoring system

### 12.7 Hymn Hero 🎵
- [ ] Guitar Hero style but with hymns
- [ ] Note matching gameplay
- [ ] Score and streak

### 12.8 ASCII Roguelike
- [ ] Dungeon crawler
- [ ] ASCII graphics
- [ ] Procedural generation
- [ ] Items and enemies

### 12.9 Games Hub
- [ ] Built-in games list/launcher
- [ ] Recently played
- [ ] Game time tracking
- [ ] High scores

---

## 🐣 TIER 13: EASTER EGGS (Optional/Fun)

### 13.1 Hidden Features
- [x] Konami code → Something special
- [x] Type "terry" → Terry tribute
- [x] Type "glow" → Extra glow effects
- [x] Type "cia" → Terry's famous quote
- [x] Secret boot screen messages (random 1%)
- [ ] Hidden games

---

## 📱 TIER 14: ZORIN OS-INSPIRED FEATURES

> **Inspiration from Zorin OS** - Steal their best ideas, make them better, and apply our TempleOS soul.
> 
> *These features are inspired by Zorin OS's excellent UX design for making Linux feel approachable.*

### 14.1 Advanced Window Tiling
- [x] Smart window suggestions (Snap Assist fills empty space)
- [x] Keyboard-driven tiling (Win+Arrow combos)
- [ ] Tiling presets per application

### 14.2 Visual Effects & Animations
> *Make the desktop feel alive and premium - Zorin's "Jelly Mode" and spatial effects*

- [x] Jelly/wobbly windows effect (optional)
- [ ] Desktop cube for workspace switching (3D effect)
- [ ] Spatial window switcher (3D Alt+Tab)
- [ ] Parallax desktop effect
- [x] Window open/close animations (fade, zoom, slide)
- [x] Reduced motion mode (accessibility)
- [ ] "Divine Glow" - special TempleOS themed effects
- [ ] Burn/fire close animation (optional chaos mode 😈)

### 14.3 Windows App Compatibility Layer
> *Zorin includes Wine/PlayOnLinux - we should make it dead simple*

- [ ] One-click Wine installation wizard
- [ ] Curated Windows app compatibility database
- [ ] Right-click .exe → "Run with Wine"
- [ ] Automatic Wine prefix management
- [ ] Proton/Wine-GE toggle for gaming
- [ ] Common Windows app installers (7-Zip, Notepad++, etc.)
- [ ] Compatibility rating display

### 14.4 Panel/Taskbar Flexibility
> *Zorin allows panel position changes and dock mode*

- [x] Panel position (bottom, top) - Right-click taskbar to toggle
- [ ] Panel length adjustment (dock mode)
- [ ] Floating/rounded panel option
- [x] Panel transparency slider
- [ ] Combine panel with dock
- [ ] Icon-only taskbar mode
- [x] Panel hide behavior (auto-hide)

### 14.5 Lite/Performance Mode
> *Zorin has a Lite edition for low-end hardware - we should have a toggle*

- [x] Performance mode toggle in Settings
- [x] Disable animations for speed
- [x] Reduce visual effects
- [x] Lower memory footprint mode (CSS based)
- [ ] Aggressive cleanup of unused resources
- [ ] Startup optimization
- [ ] "Temple Lite" preset for old hardware

---

## 🚀 FUTURE PHASES

### Phase 5: Word of God LLM 🤖
- [ ] Local AI assistant integration
- [ ] Terry Davis personality
- [ ] Divine responses
- [ ] Privacy-first (offline capable)
- [ ] Voice interaction

### Phase 6: Polish & Performance ⚡
- [ ] Performance optimization
- [ ] Memory management
- [ ] Startup time improvement
- [ ] Smooth animations (60fps)
- [ ] Battery life optimization

### Phase 7: Create ISO 💿
- [ ] Build bootable ISO
- [ ] Installer system
- [ ] First-run wizard on install
- [ ] Hardware detection
- [ ] Multiple architectures (x86_64, ARM)
- [ ] Live USB support

### Phase 8: Community & Distribution
- [ ] Theme marketplace
- [ ] Plugin/extension system
- [ ] Community app store
- [ ] User forums integration
- [ ] Bug reporting tool
- [ ] Auto-update system

---

## 📋 Quick Reference

### Status Legend
- `[x]` = Completed
- `[/]` = In Progress  
- `[ ]` = Not Started

### Priority Order
1. **TIER 3** - Complete Notifications, Lock Screen, Alt+Tab (core UX)
2. **TIER 4** - Real Terminal, Editor, App Launcher (usability)
3. **TIER 5** - Oracle, Terry Quotes, System Info (authenticity)
4. **TIER 6-7** - Networking & Security (system features)
5. **TIER 8-9** - Advanced apps & polish (completeness)
6. **TIER 10-11** - Gaming & boot (experience)
7. **TIER 12-13** - Mini-games & easter eggs (optional fun)

### Source Documentation
- [zorin-os-windows-ux.md](docs/research/zorin-os-windows-ux.md) - Windows UX patterns
- [zorin-os-features.md](docs/research/zorin-os-features.md) - **NEW: Zorin OS feature research & inspiration**
- [ui-shell-full-features.md](docs/ui-shell-full-features.md) - Full feature list
- [templeos-authenticity.md](docs/templeos-authenticity.md) - Authentic TempleOS features
- [ideas-and-features.md](docs/ideas-and-features.md) - Ideas & future features
- [security-features.md](docs/security-features.md) - Security implementation
- [gaming-integration.md](docs/gaming-integration.md) - Gaming setup
- [boot-sequence.md](docs/boot-sequence.md) - Boot & first run
- [apps-and-programs.md](docs/apps-and-programs.md) - App list
- [browser-integration.md](docs/browser-integration.md) - Browser setup
