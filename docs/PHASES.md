# TempleOS Remake - Project Phases

## Overview

Project tracking with to-do lists and AI prompts. Build the OS foundation first, then add real features.

**GitHub Repository**: https://github.com/giangerostudio-ux/temple-os-remake

**Current Phase**: 🟢 Phase 3 - Linux Base (VM Setup Complete) + Phase 4 (UI Development)

---

## Quick Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: UI Shell | ✅ Complete | Visual UI with mock data |
| Phase 2: Electron Wrapper | ✅ Complete | Package as desktop app |
| Phase 3: Linux Base | ✅ VM Ready | Ubuntu 24.04 VM for testing |
| Phase 4: Real Features | 🔵 In Progress | Connect UI to real OS |
| Phase 5: Bootable USB | ⚪ Final Step | Create installable ISO (do last!) |
| Phase 6: Windows-like UX | ⚪ Ongoing | Zorin OS-inspired polish |

---

## The Approach

```
Phase 1: UI Shell          → Just the look (mockups)     ✅ DONE
Phase 2: Electron Wrapper  → Package for desktop         ✅ DONE
Phase 3: Linux Base        → VM for testing kiosk mode   ✅ VM READY
Phase 4: Real Features     → Real files, terminal, apps  ← CURRENT
Phase 5: Bootable USB      → ISO for USB install         (DO LAST)
Phase 6: Windows-like UX   → Zorin OS-inspired polish    (ONGOING)
```

> 💡 **Development Workflow**: Write code on Windows → Push to GitHub → Pull in VM to test kiosk mode → Only make ISO when fully done!

---

# ✅ Phase 1: UI Shell (Complete)

**What's done:**
- Window manager (open, close, minimize, maximize, drag)
- Desktop icons, taskbar, clock
- Boot sequence with Giangero Studio branding
- Mock apps (Terminal, Word of God, Files, Editor)

**Deferred to Phase 4:** Real file system, real terminal, settings persistence

---

# ✅ Phase 2: Electron Wrapper (Complete)

**Goal**: Package UI as standalone desktop app

**What's done:**
- Electron main process (electron/main.cjs)
- Preload script for IPC (electron/preload.cjs)
- Dev mode with Vite integration
- Build configuration for Windows/Mac/Linux
- GitHub repository set up for updates

## To-Do List
- [ ] Install Electron and configure
- [ ] Create main process (main.js)
- [ ] Set up IPC for Node.js access
- [ ] Build scripts for Windows/Mac/Linux
- [ ] Test on all platforms

## AI Prompt
```
Convert my TempleOS web prototype to an Electron app:

Project: d:\temple os recreation (Vite + TypeScript)

Steps:
1. npm install electron electron-builder --save-dev
2. Create electron/main.js for main process
3. Load the Vite build or dev server
4. Configure electron-builder for Windows/Mac/Linux
5. Add npm scripts: "electron:dev" and "electron:build"

The web app is in src/main.ts and src/style.css
```

---

# 🔵 Phase 3: Linux Base Setup

**Goal**: Set up Ubuntu 24.04 LTS with Gamescope to run Electron in kiosk mode

> ⚠️ **Changed from Alpine Linux** - Alpine's musl libc is incompatible with Steam/Proton.

## To-Do List

### VM Setup
- [x] Download Ubuntu 24.04 LTS Server
- [x] Create VM (VMware)
- [x] Install Ubuntu Server (minimized)
- [x] User account "temple"
- [x] SSH port forwarding (port 2222)

### Compositor + Kiosk Mode
- [x] Install Sway compositor
- [x] Install Gamescope (partial - not in default repos)
- [x] Configure auto-login
- [x] Auto-start Sway on boot
- [x] Clone repo to /opt/templeos
- [x] npm install & build successful
- [x] Sway config created for Electron launch
- [x] Verify Electron launches after reboot

### Apps

- [ ] ~~Install browsers~~ *(Users install via Word of God when needed)*
- [ ] Create launch scripts with Gamescope

### Security
- [ ] UFW firewall (deny incoming)
- [ ] Configure PipeWire audio

## AI Prompt
```
Help me set up Ubuntu 24.04 LTS as a gaming kiosk for my TempleOS Electron app:

GitHub: https://github.com/giangerostudio-ux/temple-os-remake

1. Create Ubuntu 24.04 LTS Server VM with Wayland
2. Install: Sway compositor, Gamescope, nodejs, steam
3. Configure auto-login to user "temple"
4. Auto-start Electron with --ozone-platform=wayland
5. Launch games through Gamescope for proper fullscreen

Goal: VM boots → auto-login → TempleOS UI appears → games launch via Gamescope
```

---

# ⚪ Phase 4: Real Features

**Goal**: Connect UI to the real Linux OS

## To-Do List

### Real File Browser
- [ ] Read actual filesystem via Node.js fs
- [ ] Navigate folders
- [ ] Create/delete/rename files
- [ ] File icons by type

### Real Terminal
- [ ] Spawn real shell (bash)
- [ ] Execute commands
- [ ] Stream output
- [ ] Handle colors (ANSI)

### App Launcher
- [ ] Detect installed apps (.desktop files)
- [ ] Launch external apps (Steam, browsers)
- [ ] Recently used apps

### Settings
- [ ] Persist to config file
- [ ] Theme switcher
- [ ] Security toggles

## AI Prompt
```
Connect my TempleOS UI to the real Linux filesystem:

1. Replace mock file browser with real fs.readdir
2. Show actual files with icons based on extension
3. Enable navigation (click folder = change directory)
4. Add breadcrumb path showing current directory
5. Right-click context menu (open, delete, rename)

The Electron app is at: d:\temple os recreation
File browser code: src/main.ts (getFileBrowserContent function)
```

---

# ⚪ Phase 5: Bootable USB

**Goal**: Create installable ISO

## To-Do List

### ISO Creation
- [ ] Build script for squashfs
- [ ] Custom GRUB theme
- [ ] UEFI + legacy BIOS support
- [ ] Test ISO in VM

### First Run Wizard
- [ ] Welcome screen
- [ ] Encryption password setup
- [ ] User account creation
- [ ] Privacy options

### Boot Experience
- [ ] Custom GRUB menu
- [ ] Plymouth boot splash
- [ ] LUKS decrypt screen
- [ ] TempleOS boot animation

### Distribution
- [ ] ISO download page
- [ ] USB creation instructions
- [ ] Update mechanism

## AI Prompt
```
Create a bootable ISO of my TempleOS Linux:

1. Base: Ubuntu 24.04 LTS Server
2. Include: My Electron app, Steam, browsers
3. Auto-boot into kiosk mode
4. Custom GRUB theme (TempleOS styled)
5. Support UEFI and legacy BIOS
6. Output: hybrid ISO for USB/CD

Tools: mkisofs, grub-mkrescue, mksquashfs
```

---

# ⚪ Phase 6: Windows-like UX (Final Polish)

**Goal**: Make the OS feel familiar and easy to use, inspired by how Zorin OS makes Linux feel like Windows

> 📍 **Current Status**: The prototype is functional but basic. This phase adds the polish that makes it feel like a real, intuitive OS.

## Research Reference

See [Zorin OS Windows UX Research](./research/zorin-os-windows-ux.md) for detailed implementation notes.

## To-Do List

### Window Management
- [ ] Window snapping (drag to edge = half screen)
- [ ] Quarter-screen tiling (drag to corners)
- [ ] Alt+Tab window switcher with previews
- [ ] Win+Left/Right keyboard shortcuts
- [ ] Visual snap indicators when dragging

### Start Menu
- [ ] Windows-style Start menu (click or Super key)
- [ ] Search bar at top
- [ ] Pinned apps grid
- [ ] All apps list
- [ ] Recent documents
- [ ] Power menu integrated

### Taskbar Improvements
- [ ] Pinned apps that persist
- [ ] Window previews on hover
- [ ] App grouping (multiple windows = one icon)
- [ ] Right-click taskbar settings
- [ ] Auto-hide option (Intellihide)

### System Tray & Quick Settings
- [ ] Click clock → calendar popup
- [ ] Volume slider popup
- [ ] Network status & quick connect
- [ ] Quick settings panel (brightness, WiFi, Bluetooth)
- [ ] Notification center

### Context Menus
- [ ] Right-click desktop menu
- [ ] Right-click file browser menu
- [ ] Right-click taskbar menu
- [ ] Consistent styling across all menus

### Keyboard Shortcuts (Windows-compatible)
- [ ] Super key → Start menu
- [ ] Alt+Tab → Window switcher
- [ ] Alt+F4 → Close window
- [ ] Win+E → Open File Explorer
- [ ] Win+D → Show desktop
- [ ] Win+L → Lock screen
- [ ] Ctrl+Shift+Esc → Task manager

## AI Prompt
```
Implement Windows-like UX features in my TempleOS Electron app:

GitHub: https://github.com/giangerostudio-ux/temple-os-remake

Priority features:
1. Window snapping - drag to edge snaps to half screen
2. Alt+Tab window switcher with app icons
3. Start menu triggered by Super key with search
4. System tray improvements (volume slider, calendar popup)
5. Right-click context menus everywhere

Research doc: docs/research/zorin-os-windows-ux.md

Goal: Make it feel as intuitive as Windows while keeping TempleOS aesthetic
```

---

# What's Next?

**Recommended next step**: Start Phase 2 (Electron Wrapper)

Copy the Phase 2 AI Prompt above and run it!

---

# Links

- [Master Plan](./master-plan.md) - Architecture overview
- [Apps & Programs](./apps-and-programs.md) - What to include
- [Gaming](./gaming-integration.md) - Steam, emulators
- [Security](./security-features.md) - Firewall, encryption
- [Browsers](./browser-integration.md) - Opera GX, Tor
- [Boot Sequence](./boot-sequence.md) - Boot experience
- [UI Shell Features](./ui-shell-full-features.md) - Full feature list
- [Ideas](./ideas-and-features.md) - Future features
- [Zorin OS UX Research](./research/zorin-os-windows-ux.md) - Windows-like UX patterns
- [Session Prompt](./SESSION-PROMPT.md) - Copy for new AI sessions
- [Quick Reference](./QUICK-REFERENCE.md) - Code structure
