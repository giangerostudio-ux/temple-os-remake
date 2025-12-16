# TempleOS UI Shell - Full Feature Research

## Overview

This document outlines ALL the features the UI shell will need to function as a complete Linux desktop replacement. **This is research only** - implementation happens in Phase 4 after Linux base is set up.

---

## Current Status (Phase 1 - Minimal Prototype)

What we have now:
- ✅ Basic window manager
- ✅ Desktop icons (static)
- ✅ Taskbar with clock
- ✅ Mock Terminal, File Browser, Word of God, Editor
- ✅ Boot sequence

What it lacks:
- Real filesystem access
- Real shell commands
- System integration
- Settings persistence
- Notifications
- Networking UI
- etc.

---

## Full Feature List (For Phase 4+)

### 1. Window Manager (Expand)

**Current**: Open, close, minimize, maximize, drag
**Needed**:
- [ ] Window resizing (drag edges/corners)
- [ ] Window snapping (drag to edge = half screen)
- [ ] Keyboard shortcuts (Alt+F4, Alt+Tab, etc.)
- [ ] Window animations (open/close effects)
- [ ] Multi-monitor support
- [ ] Always-on-top option
- [ ] Window grouping

---

### 2. File Manager (Real)

**Current**: Fake file list
**Needed**:
- [ ] Real filesystem via Node.js fs
- [ ] Navigation (folder tree + breadcrumbs)
- [ ] Create/rename/delete files & folders
- [ ] Cut/copy/paste
- [ ] Drag and drop
- [ ] File previews (images, text, video)
- [ ] Search functionality
- [ ] Bookmarks/favorites
- [ ] Context menu (right-click)
- [ ] File permissions display
- [ ] Hidden files toggle
- [ ] Sort by name/date/size
- [ ] Grid/list view toggle
- [ ] Zip/extract archives
- [ ] Trash/recycle bin

---

### 3. Terminal (Real)

**Current**: Mock commands
**Needed**:
- [ ] Real shell (bash/zsh via pty.js)
- [ ] Command history (up/down arrows)
- [ ] Tab completion
- [ ] ANSI color support
- [ ] Copy/paste
- [ ] Multiple tabs
- [ ] Split panes
- [ ] Scrollback buffer
- [ ] Search in output
- [ ] Clickable URLs
- [ ] Custom fonts/colors
- [ ] Bell sound

---

### 4. Settings Panel

**Current**: Not implemented
**Needed**:
- [ ] **Appearance**
  - Theme colors
  - Font family/size
  - Icon theme
  - Wallpaper
  - Scanline effect toggle
  - Window transparency
- [ ] **Display**
  - Resolution
  - Refresh rate
  - Scaling
  - Night mode/blue light filter
- [ ] **Sound**
  - Volume control
  - Output device selection
  - System sounds toggle
- [ ] **Network** (see below)
- [ ] **Security** (see below)
- [ ] **Users**
  - Change password
  - Profile picture
- [ ] **Date/Time**
  - Timezone
  - Format
- [ ] **About**
  - Version info
  - Credits
  - Giangero Studio

---

### 5. Networking UI

**Current**: None
**Needed**:
- [ ] WiFi network selector
- [ ] Connect/disconnect
- [ ] Saved networks
- [ ] Password input
- [ ] Signal strength
- [ ] Ethernet status
- [ ] IP address display
- [ ] VPN toggle
- [ ] Tor toggle (from security settings)
- [ ] Hotspot creation
- [ ] Bluetooth manager

---

### 6. System Tray / Status Bar

**Current**: Just clock and open apps
**Needed**:
- [ ] Network status icon
- [ ] Volume icon + slider
- [ ] Battery indicator (laptops)
- [ ] Bluetooth icon
- [ ] Notification count
- [ ] Quick settings dropdown
- [ ] Date/calendar popup

---

### 7. Notifications

**Current**: None
**Needed**:
- [ ] Toast notifications (pop up in corner)
- [ ] Notification history panel
- [ ] Do Not Disturb mode
- [ ] App-specific settings
- [ ] Actions in notifications
- [ ] Sound on notification

---

### 8. App Launcher / Start Menu

**Current**: Just desktop icons
**Needed**:
- [ ] Full app launcher (grid or list)
- [ ] Search apps
- [ ] Categorized apps (Games, Internet, Office, etc.)
- [ ] Recent apps
- [ ] Frequently used
- [ ] Right-click → add to desktop
- [ ] Keyboard shortcut (Super key)

---

### 9. Security UI

**Current**: None (backend planned)
**Needed**:
- [ ] Firewall status and toggle
- [ ] Firewall rules viewer
- [ ] Tor mode toggle
- [ ] MAC randomization toggle
- [ ] Memory wipe toggle
- [ ] Security audit button
- [ ] Encryption status
- [ ] Change encryption password

---

### 10. Power Management

**Current**: None
**Needed**:
- [ ] Shutdown button
- [ ] Restart button
- [ ] Sleep/suspend
- [ ] Lock screen
- [ ] Log out
- [ ] Power profiles (laptop)

---

### 11. Lock Screen

**Current**: None
**Needed**:
- [ ] Password/PIN entry
- [ ] Clock display
- [ ] Auto-lock after timeout
- [ ] Lock on lid close (laptop)
- [ ] Custom wallpaper

---

### 12. Text Editor (Full)

**Current**: Plain textarea
**Needed**:
- [ ] Syntax highlighting
- [ ] Line numbers
- [ ] Find/replace
- [ ] Multiple tabs
- [ ] Undo/redo
- [ ] Auto-save
- [ ] File save dialog
- [ ] Recent files
- [ ] Word wrap toggle

---

### 13. Image Viewer

**Current**: None
**Needed**:
- [ ] View images
- [ ] Zoom in/out
- [ ] Pan/drag
- [ ] Rotate
- [ ] Slideshow
- [ ] Basic editing (crop)
- [ ] Set as wallpaper

---

### 14. Media Player

**Current**: None
**Needed**:
- [ ] Play audio files
- [ ] Play video files
- [ ] Playlist
- [ ] Shuffle/repeat
- [ ] Volume control
- [ ] Visualizer (retro style)
- [ ] Album art

---

### 15. Calculator

**Current**: None
**Needed**:
- [ ] Basic calculator
- [ ] Scientific mode
- [ ] Programmer mode (hex/bin)
- [ ] History

---

### 16. Calendar

**Current**: None
**Needed**:
- [ ] Month view
- [ ] Events/reminders
- [ ] Religious holidays
- [ ] Integration with notifications

---

### 17. Games Launcher

**Current**: None
**Needed**:
- [ ] Show installed games (Steam, etc.)
- [ ] Launch games
- [ ] Recently played
- [ ] Game time tracking
- [ ] Built-in retro games

---

### 18. App Store / Package Manager

**Current**: None
**Needed**:
- [ ] Browse available apps
- [ ] Install/uninstall
- [ ] Updates
- [ ] Categories
- [ ] Search

---

### 19. Help / Documentation

**Current**: None
**Needed**:
- [ ] Getting started guide
- [ ] Keyboard shortcuts list
- [ ] FAQ
- [ ] About TempleOS/Terry Davis
- [ ] Credits

---

## Priority Order for Implementation

### Essential (Must have for usable OS)
1. Real file browser
2. Real terminal
3. Settings panel
4. App launcher
5. Power management (shutdown/restart)
6. Lock screen

### Important (Expected features)
7. Notifications
8. Network UI
9. System tray icons
10. Text editor improvements
11. Security UI

### Nice to Have (Polish)
12. Image viewer
13. Media player
14. Calculator
15. Calendar
16. Games launcher
17. App store

---

## Implementation Notes

All these features require **Phase 3 (Linux Base)** to be complete first:
- File browser needs real filesystem
- Terminal needs real shell
- Network UI needs NetworkManager
- Settings need config files
- etc.

**Don't implement these in Phase 1 or 2** - they would be mock features that need to be rewritten.

---

## Next Steps

1. Complete Phase 2 (Electron wrapper)
2. Complete Phase 3 (Linux base)
3. Then implement these features in Phase 4
4. **Phase 6: Windows-like UX polish** - Make it feel like Windows
   - See [Zorin OS UX Research](./research/zorin-os-windows-ux.md) for patterns
