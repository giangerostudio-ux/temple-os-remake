# TempleOS Remake - Project Phases

## Overview

Project tracking with to-do lists and AI prompts. Build the OS foundation first, then add real features.

**GitHub Repository**: https://github.com/giangerostudio-ux/temple-os-remake

**Current Phase**: 🟢 Phase 2 - Electron Wrapper ✅ → Ready for Phase 3!

---

## Quick Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: UI Shell | ✅ Complete | Visual UI with mock data |
| Phase 2: Electron Wrapper | ✅ Complete | Package as desktop app |
| Phase 3: Linux Base | 🔵 Next | Alpine Linux + kiosk mode |
| Phase 4: Real Features | ⚪ Pending | Connect UI to real OS |
| Phase 5: Bootable USB | ⚪ Pending | Create installable ISO |

---

## The Approach

```
Phase 1: UI Shell          → Just the look (mockups)     ✅ DONE
Phase 2: Electron Wrapper  → Package for desktop         ✅ DONE
Phase 3: Linux Base        → Set up Alpine + kiosk       ← NEXT
Phase 4: Real Features     → Real files, terminal, apps
Phase 5: Bootable USB      → ISO for USB install
```

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
- [ ] Download Ubuntu 24.04 LTS Server
- [ ] Create VM (VirtualBox or QEMU)
- [ ] Install Ubuntu Server (minimized)
- [ ] User account "temple"

### Compositor + Kiosk Mode
- [ ] Install Sway or minimal Wayland compositor
- [ ] Install Gamescope for gaming
- [ ] Configure auto-login
- [ ] Auto-start Electron with Wayland flags
- [ ] Gaming mode: hide shell when games launch

### Apps
- [ ] Install Steam (native .deb)
- [ ] Install browsers (Firefox, Tor)
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

1. Base: Alpine Linux minirootfs
2. Include: My Electron app, Steam, browsers
3. Auto-boot into kiosk mode
4. Custom GRUB theme (TempleOS styled)
5. Support UEFI and legacy BIOS
6. Output: hybrid ISO for USB/CD

Tools: mkisofs, grub-mkrescue, mksquashfs
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
- [Ideas](./ideas-and-features.md) - Future features
- [Session Prompt](./SESSION-PROMPT.md) - Copy for new AI sessions
- [Quick Reference](./QUICK-REFERENCE.md) - Code structure
