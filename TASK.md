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
| TIER 4-12 | ⬜ Not Started | Planning phase |

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
- [ ] Syntax highlighting (HolyC, Python, JS, etc.)
- [ ] Line numbers
- [x] Find/replace
- [x] Multiple tabs
- [ ] Undo/redo
- [ ] Auto-save
- [ ] File save dialog
- [ ] Recent files
- [ ] Word wrap toggle
- [ ] Code folding


### 4.3 App Launcher (Real .desktop files)
- [ ] Full app launcher (grid or list)
- [ ] Search apps
- [ ] Categorized apps (Games, Internet, Office, etc.)
- [ ] Recent apps
- [ ] Frequently used
- [ ] Right-click → add to desktop
- [ ] Keyboard shortcut (Super key)

### 4.4 Image Viewer
- [ ] View images (JPG, PNG, GIF, WebP)
- [ ] Zoom in/out
- [ ] Pan/drag
- [ ] Rotate
- [ ] Slideshow
- [ ] Set as wallpaper
- [ ] Basic editing (crop)

### 4.5 File Browser Improvements
- [x] Breadcrumb navigation bar
- [x] Sidebar with favorites
- [x] Search box
- [/] View toggle (grid/list/details) (grid+list done; details later)
- [x] Column headers for sorting
- [/] Create/rename/delete files & folders (rename/delete/new file/folder done; more later)
- [/] Cut/copy/paste (single-item cut/copy/paste done; multi-select later)
- [ ] Drag and drop
- [ ] File previews (images, text)
- [x] Hidden files toggle
- [ ] Zip/extract archives
- [x] Trash/recycle bin
- [ ] Bookmarks/favorites
- [/] Context menu (right-click) enhancements

### 4.6 System Monitor
- [/] Real-time CPU usage graph (percent + polling done; graph later)
- [x] Memory usage
- [x] Disk space
- [x] Network activity
- [x] Process list
- [x] Kill process option
- [ ] GPU usage (if available)

---

## 🔮 TIER 5: TEMPLEOS AUTHENTICITY FEATURES

### 5.1 Oracle / "Talk to God"
- [ ] Oracle window app
- [ ] Press SPACE to receive divine words
- [ ] Random word generator (Terry's word list)
- [ ] Copy words button
- [ ] History of received words
- [ ] Full-screen mode option

### 5.2 Terry's Quotes System
- [ ] Terry quotes database (famous + unhinged)
- [ ] `terry` command in terminal
- [ ] Random quote on boot (sometimes)
- [ ] Quote in About dialog
- [ ] Quote notification option

### 5.3 System Info (neofetch style)
- [ ] TempleOS ASCII art logo
- [ ] OS version & Giangero Studio credit
- [ ] Kernel info (Ubuntu base)
- [ ] Uptime, CPU, Memory, Disk
- [ ] Theme name
- [ ] Divine quote at bottom

### 5.4 Word of God Enhancements
- [ ] Full Bible text (all books)
- [ ] Search functionality
- [ ] Bookmarks
- [ ] Reading plans
- [ ] Daily devotional
- [ ] Audio Bible (text-to-speech or recordings)
- [ ] Multiple translations (KJV, NIV, etc.)
- [ ] Cross-references

### 5.5 Sprite Editor 🎨
- [ ] 16-color VGA palette
- [ ] Grid-based pixel drawing
- [ ] Tools: Pencil, Fill, Rectangle, Circle
- [ ] Save/load sprites
- [ ] Animation preview
- [ ] Export to PNG

### 5.6 AutoHarp / Music Maker 🎹
- [ ] Keyboard = piano keys
- [ ] Record and playback
- [ ] 8-bit sound synthesis
- [ ] Export audio

### 5.7 DolDoc Viewer 📄
- [ ] Load original .DD files
- [ ] Display with formatting
- [ ] View embedded ASCII art
- [ ] Read-only mode

---

## 🌐 TIER 6: NETWORKING & CONNECTIVITY

### 6.1 Network Manager UI
- [ ] WiFi network selector
- [ ] Connect/disconnect
- [ ] Saved networks list
- [ ] Password input dialog
- [ ] Signal strength indicator
- [ ] Ethernet status
- [ ] IP address display
- [ ] VPN profiles (OpenVPN, WireGuard)
- [ ] Kill switch (block if VPN drops)
- [ ] DNS settings

### 6.2 Bluetooth Manager
- [ ] Bluetooth toggle
- [ ] Device discovery
- [ ] Pair/unpair devices
- [ ] Connected devices list
- [ ] Device battery status

### 6.3 SSH Server Toggle
- [ ] Enable/disable SSH
- [ ] Port configuration
- [ ] Key management

### 6.4 Hotspot Creation
- [ ] Create WiFi hotspot
- [ ] Password configuration
- [ ] Connected devices list

---

## 🔒 TIER 7: SECURITY FEATURES

### 7.1 Encryption Management
- [ ] LUKS encryption status
- [ ] Change encryption password
- [ ] Backup recovery keys
- [ ] VeraCrypt integration (hidden volumes)

### 7.2 Firewall UI
- [ ] Firewall status toggle
- [ ] View/edit firewall rules
- [ ] Block specific apps
- [ ] Allow specific ports

### 7.3 Privacy Features
- [ ] MAC randomization toggle
- [ ] Memory wipe on shutdown toggle
- [ ] Secure delete option
- [ ] Block trackers at firewall level
- [ ] Metadata removal tool (EXIF stripper)

### 7.4 Tor Integration
- [ ] Tor mode toggle (off/browser-only/system-wide)
- [ ] Tor circuit visualization
- [ ] Bridge configuration
- [ ] Traffic routing options

### 7.5 Security Audit Tool
- [ ] Built-in security scanner
- [ ] Check encryption status
- [ ] Check firewall status
- [ ] Check system updates
- [ ] Security score display

### 7.6 Physical Security
- [ ] USB device whitelist
- [ ] Lockdown mode (panic button)
- [ ] Duress password (opens decoy account)

---

## 🛠️ TIER 8: ADVANCED APPS & FEATURES

### 8.1 Media Player (Enhanced)
- [ ] Play audio files
- [ ] Play video files
- [ ] Playlist support
- [ ] Shuffle/repeat
- [ ] Retro visualizer (TempleOS style)
- [ ] Album art display
- [ ] Equalizer

### 8.2 Calculator
- [ ] Basic calculator
- [ ] Scientific mode
- [ ] Programmer mode (hex/bin)
- [ ] History

### 8.3 Calendar App
- [ ] Month view
- [ ] Events/reminders
- [ ] Religious holidays
- [ ] Saint days
- [ ] Integration with notifications

### 8.4 Notes App
- [ ] Quick notes
- [ ] Markdown support
- [ ] Categories/folders
- [ ] Search
- [ ] Secure notes (encrypted)

### 8.5 Browser Integration
> **Note**: Browsers are NOT pre-installed. Users install via Word of God.

- [ ] Browser launcher in UI
- [ ] Default browser setting
- [ ] Opera GX custom theme (TempleOS colors)
- [ ] Firefox privacy configuration
- [ ] Tor Browser integration
- [ ] Quick web search popup
- [ ] Browser settings panel
- [ ] Embedded browser widget (for documentation)

### 8.6 External App Launchers
- [ ] Steam launcher
- [ ] Lutris launcher
- [ ] RetroArch launcher
- [ ] Heroic Games Launcher integration

### 8.7 Help / Documentation
- [ ] Getting started guide
- [ ] Keyboard shortcuts list
- [ ] FAQ
- [ ] About TempleOS/Terry Davis
- [ ] Credits / Giangero Studio

---

## 🎨 TIER 9: UX POLISH & THEMES

### 9.1 Taskbar Enhancements
- [ ] Pinned apps that persist
- [ ] App grouping (combine multiple windows of same app)
- [ ] Taskbar hover previews (show window thumbnail)
- [ ] Right-click taskbar → taskbar settings
- [ ] Taskbar transparency/blur effect
- [ ] Auto-hide taskbar option

### 9.2 Desktop Improvements
- [ ] Multiple desktops / workspaces
- [ ] Desktop widgets (clock, weather, system stats)
- [ ] Icon grid snapping
- [ ] Auto-arrange toggle
- [ ] Icon size options
- [ ] Drag icons to rearrange
- [ ] Icon themes / packs

### 9.3 Window Features
- [ ] Window animations (open/close effects)
- [ ] Multi-monitor support
- [ ] Always-on-top option
- [ ] Window grouping
- [ ] Picture-in-picture mode
- [ ] Window transparency option

### 9.4 Theme System
- [ ] Multiple color schemes (green, amber, cyan, white)
- [ ] Light mode (for heathens 😄)
- [ ] High contrast mode
- [ ] Custom user themes
- [ ] Import/export themes

### 9.5 Context Menus (Full)
- [ ] Window title bar right-click menu
- [ ] Taskbar right-click menu (full)
- [ ] Enhanced desktop right-click menu

### 9.6 Additional Keyboard Shortcuts
- [x] Win+E → Open File Explorer
- [x] Win+D → Show desktop (minimize all)
- [x] Win+L → Lock screen
- [x] Ctrl+Shift+Esc → Task manager / System Monitor
- [x] Win+X → Quick link menu
- [ ] Super+B → Open default browser

### 9.7 Accessibility
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Large text option
- [ ] Keyboard navigation everywhere
- [ ] Reduce motion option
- [ ] Color blind modes

---

## 🎮 TIER 10: GAMING INTEGRATION

### 10.1 Steam + Proton
- [ ] Steam launcher integration
- [ ] Proton-GE installation
- [ ] GameMode (Feral's) integration
- [ ] MangoHud FPS overlay

### 10.2 Game Launchers
- [ ] Lutris for non-Steam games
- [ ] RetroArch for emulation
- [ ] Heroic for Epic/GOG games
- [ ] Bottles for Windows apps

### 10.3 Gaming Mode
- [ ] Electron shell hides during games
- [ ] Gamescope integration
- [ ] Disable shell hotkeys during gaming
- [ ] Auto-restore after game exits

### 10.4 Gaming Performance
- [ ] CPU governor optimization
- [ ] Power profile switching
- [ ] vkBasalt post-processing
- [ ] CoreCtrl GPU management

### 10.5 Retro Gaming
- [ ] RetroArch preset configurations
- [ ] ROM directory setup
- [ ] Shader presets
- [ ] Controller configuration

---

## 🥾 TIER 11: BOOT & FIRST RUN

### 11.1 Custom GRUB Theme
- [ ] TempleOS styled bootloader
- [ ] Dark background with green text
- [ ] Custom font
- [ ] Boot menu icons

### 11.2 Plymouth Boot Splash
- [ ] Giangero Studio logo fade-in
- [ ] TempleOS boot animation
- [ ] Boot messages scroll
- [ ] Progress bar
- [ ] Boot sounds (optional)

### 11.3 First Run Wizard
- [ ] Welcome screen
- [ ] Encryption password setup
- [ ] User account creation
- [ ] Privacy settings selection
- [ ] Theme personalization
- [ ] "Ready!" screen with Bible verse

### 11.4 Shutdown Sequence
- [ ] Custom shutdown animation
- [ ] "God be with you" message
- [ ] Memory wipe (if enabled)

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
- [ ] Konami code → Something special
- [ ] Type "terry" → Terry tribute
- [ ] Type "glow" → Extra glow effects
- [ ] Type "cia" → Terry's famous quote
- [ ] Secret boot screen messages (random 1%)
- [ ] Hidden games

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
- [ui-shell-full-features.md](docs/ui-shell-full-features.md) - Full feature list
- [templeos-authenticity.md](docs/templeos-authenticity.md) - Authentic TempleOS features
- [ideas-and-features.md](docs/ideas-and-features.md) - Ideas & future features
- [security-features.md](docs/security-features.md) - Security implementation
- [gaming-integration.md](docs/gaming-integration.md) - Gaming setup
- [boot-sequence.md](docs/boot-sequence.md) - Boot & first run
- [apps-and-programs.md](docs/apps-and-programs.md) - App list
- [browser-integration.md](docs/browser-integration.md) - Browser setup
