# TempleOS Remake - AI Prompts by Phase

## How to Use This Document

1. Copy the prompt for the current phase
2. Paste to the recommended AI model
3. Let it complete the phase
4. Verify it works
5. Come back here for the next phase prompt

---

# ✅ PHASE 2: Electron Wrapper (COMPLETE)
**Status**: Done!

## Prompt - Copy Everything Below:

```
I'm building a TempleOS remake project. The planning/research is complete.

## Project Location
d:\temple os recreation

## Current State
- Phase 1 (UI Shell) is complete - browser-based prototype works
- Vite + TypeScript project
- Main files: src/main.ts, src/style.css, index.html

## Documentation to Read First
Please read these files before starting:
- docs/research/electron-integration.md (IMPORTANT - has code examples)
- docs/PHASES.md

## Your Task: Phase 2 - Electron Wrapper

Convert this Vite web app to an Electron desktop app:

1. Install Electron and electron-builder as dev dependencies
2. Create electron/main.js for the main process
3. Create electron/preload.js for secure IPC bridge
4. Configure package.json with Electron scripts:
   - "electron:dev" - Run with Vite dev server
   - "electron:build" - Build for distribution
5. Make it load localhost:5173 in dev mode
6. Make it load dist/index.html in production
7. Window should be frameless (we have custom title bar)
8. Set up basic IPC handlers for window controls

Do NOT implement real file system or terminal yet - just get Electron working.

## When Done
Tell me: "Phase 2 complete. Electron app runs successfully."
Then STOP and wait for my next instruction.
```

---

# ⏸️ CHECKPOINT AFTER PHASE 2

Before continuing, verify:
- [ ] `npm run electron:dev` opens the app
- [ ] The TempleOS UI appears in the Electron window
- [ ] Window controls (minimize, maximize, close) work

If yes → Continue to Phase 3

---

# 🔵 PHASE 3: Linux VM Setup
**Model**: Claude Opus (recommended)
**Status**: ← CURRENT

## Prompt - Copy Everything Below:

```
I'm building a TempleOS remake project. Phase 2 (Electron) is complete.

## Project Location
d:\temple os recreation

## GitHub Repository
https://github.com/giangerostudio-ux/temple-os-remake

## Documentation to Read First
- docs/research/ubuntu-setup.md (IMPORTANT - detailed setup)
- docs/gaming-integration.md (CRITICAL - Electron + gaming architecture)
- docs/PHASES.md

## Your Task: Phase 3 - Ubuntu VM Gaming Kiosk Setup

Help me set up Ubuntu 24.04 LTS as a gaming kiosk for my Electron app:

### Part A: VM Creation
1. Download Ubuntu 24.04 LTS Server
2. Create VM with VirtualBox:
   - 4 GB RAM, 32 GB disk, enable 3D acceleration
3. Install Ubuntu Server (minimized) with user: temple

### Part B: Gaming Stack (CRITICAL - Server is NOT gaming-ready by default!)
4. Install HWE kernel: `sudo apt install linux-generic-hwe-24.04`
5. Install GPU drivers:
   - NVIDIA: `sudo ubuntu-drivers autoinstall`
   - AMD/Intel: `sudo apt install mesa-vulkan-drivers`
6. Install Sway compositor + Gamescope + GameMode
7. Install PipeWire audio
8. Install Steam (with 32-bit libs)
9. Install nodejs, git, clone project from GitHub

### Part C: Kiosk Lockdown
10. Auto-login (NO GDM/SDDM - user never sees Linux)
11. Sway auto-starts Electron with Wayland flags
12. Disable TTY switching (Ctrl+Alt+F* blocked)
13. Games launch via Gamescope

### Part D: Gaming Behavior
14. Electron shell hides when games launch
15. Shell restores when game exits

### Part E: Security
16. UFW firewall (deny incoming)

## Important Notes
- Ubuntu Server gives you a CLEAN SLATE - no UI to leak
- But Server is NOT gaming-ready - you MUST add the gaming stack
- HWE kernel is NON-NEGOTIABLE for gaming
- This is OS-architect-level work, same model as SteamOS

## Important Notes
- Refer to docs/research/ubuntu-setup.md for commands
- Refer to docs/gaming-integration.md for Electron + gaming rules
- Core principle: Electron is a launcher, NOT a window manager for games
- Games run through Gamescope for exclusive fullscreen

## When Done
Tell me: "Phase 3 complete. Ubuntu VM boots into TempleOS kiosk with Gamescope gaming."
Then STOP and wait for my next instruction.
```

---

# ⏸️ CHECKPOINT AFTER PHASE 3

Before continuing, verify:
- [ ] VM boots without manual login
- [ ] TempleOS UI appears automatically
- [ ] Can't exit to Linux desktop (kiosk mode)
- [ ] Firewall is active (`sudo ufw status`)

If yes → Continue to Phase 4

---

# 🔴 PHASE 4: Real Features
**Model**: Claude Opus (strongly recommended)

## Prompt - Copy Everything Below:

```
I'm building a TempleOS remake. Phases 2-3 are complete:
- Electron wrapper works
- Alpine Linux VM runs the app in kiosk mode

## Project Location
d:\temple os recreation (on Windows, but will run on Linux VM)

## Documentation to Read First
- docs/ui-shell-full-features.md (IMPORTANT - feature list)
- docs/templeos-authenticity.md (IMPORTANT - TempleOS features)
- docs/research/electron-integration.md (IPC patterns)
- docs/apps-and-programs.md

## Your Task: Phase 4 - Real Features + TempleOS Authenticity

Replace mock features with real Linux integration AND add TempleOS-authentic features:

### Part A: Real File Browser
1. Create IPC handlers for:
   - readDirectory(path) → returns file list
   - readFile(path) → returns contents
   - writeFile(path, content)
   - deleteFile(path)
   - renameFile(oldPath, newPath)
   - createDirectory(path)
2. Update file browser UI to use real filesystem
3. Add navigation (click folders)
4. Show file icons based on extension

### Part B: Real Terminal (Enhanced)
5. Use node-pty for real shell
6. Create IPC for terminal:
   - spawnTerminal() → returns terminal ID
   - sendInput(id, text)
   - onOutput callback
   - killTerminal(id)
7. Update terminal UI to use real shell
8. Add special TempleOS commands:
   - "god" - Random Bible verse
   - "oracle" - Random word generator (for "talking to God")
   - "hymn" - Play random hymn sound
   - "terry" - Random Terry Davis quote
   - "neofetch" - Custom system info with ASCII logo

### Part C: Oracle Window (New App)
9. Create "Oracle" app - talks to God via random words
   - Random word generator
   - User presses key to receive words
   - Display in mystical style
   - See docs/templeos-authenticity.md for UI design

### Part D: Hymn Player (New App)
10. Create "Hymn Player" app
    - List of classic hymns (Amazing Grace, etc.)
    - Play/pause/next controls
    - Display lyrics
    - Use Web Audio API or audio files

### Part E: App Launcher
11. Create function to launch external apps:
    - launchApp("steam")
    - launchApp("firefox")
12. Detect installed apps (read .desktop files)
13. Add app launcher UI with installed apps

### Part F: Settings Panel
14. Create settings UI with:
    - Theme selector (green, amber, cyan themes)
    - Font size slider
    - Toggle scanlines
    - Toggle boot animation
15. Persist settings to ~/.templeos/settings.json

### Part G: System Features
16. System monitor (CPU, RAM, disk)
17. Network status
18. Power menu (shutdown, restart, lock)
19. System Updater (check for updates)

## Important Notes
- Follow IPC patterns in electron-integration.md
- Use preload.js for secure bridge
- Read templeos-authenticity.md for Oracle and Hymn Player design
- Test each feature before moving to next

## When Done
Tell me: "Phase 4 complete. Real features + Oracle + Hymn Player + system features work."
Then STOP and wait for my next instruction.
```

---

# ⏸️ CHECKPOINT AFTER PHASE 4

Before continuing, verify:
- [ ] File browser shows real Linux files
- [ ] Terminal runs real commands (ls, cd, etc.)
- [ ] Can launch Firefox or other apps from launcher
- [ ] Settings save and persist after restart
- [ ] Shutdown/restart work
If yes → Continue to Phase 5

---

# 🔴 PHASE 5: Bootable USB
**Model**: Claude Opus (strongly recommended)

## Prompt - Copy Everything Below:

```
I'm building a TempleOS remake. Phases 2-4 are complete:
- Electron app with real features
- Running on Alpine Linux VM in kiosk mode

## Project Location
d:\temple os recreation

## Documentation to Read First
- docs/research/iso-building.md (IMPORTANT - build process)
- docs/boot-sequence.md (GRUB theme, Plymouth)
- docs/security-features.md (encryption)

## Your Task: Phase 5 - Create Bootable ISO

### Part A: ISO Build Script
1. Create build script that:
   - Starts from Alpine Linux minirootfs
   - Installs our packages
   - Copies Electron app to /opt/templeos
   - Configures auto-boot to kiosk
   - Creates squashfs

### Part B: GRUB Theme
2. Create custom GRUB theme:
   - TempleOS-styled boot menu
   - Green text on black background
   - "Giangero Studio" branding
3. Support UEFI and legacy BIOS

### Part C: Boot Experience
4. Create Plymouth boot splash:
   - TempleOS boot animation
   - Progress bar
5. Set up LUKS encryption prompt (styled)

### Part D: First-Run Wizard
6. Create setup wizard (in Electron) for first boot:
   - Welcome screen
   - Create encryption password
   - Create user account
   - Set timezone
   - Privacy options

### Part E: Build & Test
7. Build the ISO
8. Test in QEMU/VirtualBox
9. Create USB flashing instructions

## Important Notes
- Refer to iso-building.md for specific commands
- Test UEFI and BIOS boot
- ISO should be < 1GB

## When Done
Tell me: "Phase 5 complete. Bootable ISO created and tested."
Show me the ISO file size and how to flash it to USB.
```

---

# ⏸️ FINAL CHECKPOINT

Verify:
- [ ] ISO boots in VM (both UEFI and BIOS)
- [ ] First-run wizard appears
- [ ] Can create encrypted user
- [ ] Boots to TempleOS desktop
- [ ] All Phase 4 features work
- [ ] USB creation instructions work

---

# 🔴 PHASE 6: Word of God AI (Final Feature)
**Model**: Claude Opus (strongly recommended)

## Prompt - Copy Everything Below:

```
I'm building a TempleOS remake. Phases 2-5 are complete:
- Electron app with real features
- Alpine Linux kiosk mode
- Bootable ISO working

## Project Location
d:\temple os recreation

## Documentation to Read First (IMPORTANT!)
- docs/research/word-of-god-implementation.md (Technical implementation)
- docs/research/divine-terry-personality.md (Personality guide)
- docs/research/divine-terry-responses.md (Response templates)
- docs/research/terry-davis-quotes.md (Quotes database)
- docs/research/zero-account-ai-strategy.md (No accounts, local Ollama)

## Your Task: Phase 6 - Word of God Divine AI Assistant

Create the AI-powered assistant that IS the user interface. User speaks English, God does everything.

### Part A: Ollama Setup
1. Add Ollama installation to first-boot wizard:
   - Auto-install Ollama
   - Download Qwen2.5-7B-Dolphin model (~4.4 GB)
   - Show progress with Bible verse
2. Create `electron/ollama-manager.cjs`:
   - Check if Ollama installed
   - Check if model downloaded
   - Start Ollama service

### Part B: Divine Assistant Service
3. Create `electron/divine-assistant.cjs`:
   - Connect to Ollama (localhost:11434)
   - Use Qwen2.5-7B-Dolphin model (abliterated for authentic personality)
   - System prompt with Divine Terry personality (50% Jesus, 50% Terry Davis)
   - Parse commands from [EXECUTE] tags
   - Parse URLs from [OPEN_URL] tags
   - Handle dangerous command detection
4. Use personality from docs/research/divine-terry-personality.md
5. Use response templates from docs/research/divine-terry-responses.md

### Part C: Command Executor
6. Create `electron/command-executor.cjs`:
   - Execute commands via child_process
   - Detect dangerous patterns (rm -rf, dd, etc.)
   - Capture stdout/stderr
   - Return results to UI

### Part D: Word of God UI
7. Create `src/apps/word-of-god/WordOfGod.ts`:
   - Full-screen chat interface
   - Message history display
   - Command preview boxes with Execute/Copy buttons
   - Typing indicator while God thinks
   - Divine styling (gold, white, TempleOS aesthetic)
8. Make this the PRIMARY interface:
   - Remove browser app (God opens URLs when asked)
   - User speaks English → God does everything

### Part E: Browser Jokes
9. When user asks for a browser, use the famous Terry joke:
   - "What do you need Internet Explorer for? To download Firefox!"
   - Roast them lovingly, then install anyway
   - See docs/research/terry-davis-quotes.md section "Browser Jokes"

### Part F: IPC Handlers
10. Add to main.cjs:
    - divine-init: Initialize assistant
    - divine-message: Send message, get response
    - divine-execute: Run command
    - divine-execute-dangerous: Run after confirmation
11. Add to preload.cjs:
    - Expose window.divine API

## The Philosophy
- NO browser app - God opens URLs when user asks
- NO accounts needed - Ollama runs locally
- User speaks plain English: "Install Discord"
- God responds with personality + executes command
- Works offline after model download

## When Done
Tell me: "Phase 6 complete. Word of God AI works - user speaks English, God does everything."
Then STOP and wait for my next instruction.
```

---

# ⏸️ FINAL CHECKPOINT

Verify:
- [ ] Ollama installs on first boot
- [ ] Qwen2.5-7B-Dolphin model downloads
- [ ] Word of God chat interface works
- [ ] AI responds with Divine Terry personality
- [ ] Commands execute when user confirms
- [ ] Browser joke appears when user asks for browser
- [ ] "Install Discord" actually installs Discord
- [ ] Works offline (after model download)

---

# 🎉 PROJECT COMPLETE!

After Phase 6, you have:
- Bootable TempleOS-themed Linux
- Custom UI with all features
- Security (encryption, firewall)
- Works from USB
- **Word of God AI - speak English, computer obeys** ⭐

---

## Quick Reference

| Phase | Model | Difficulty | What |
|-------|-------|------------|------|
| Phase 2 | Any | Easy | Electron wrapper |
| Phase 3 | Opus | Medium | Linux VM setup |
| Phase 4 | Opus | Hard | Real features |
| Phase 5 | Opus | Hard | Bootable ISO |
| Phase 6 | Opus | Medium | **Word of God AI** ⭐ |
