# TempleOS Remake - Fix All Broken Settings

## Context
You are fixing a custom Linux OS frontend (TypeScript/Electron). The main file is `src/main.ts` (~14K lines). Most settings in the Settings panel don't work because event handlers are missing or backend integration is incomplete.

## Your Task
Fix ALL broken settings by:
1. Adding missing event handlers to `setupEventListeners()` in `src/main.ts`
2. Ensuring Electron IPC handlers exist for Ubuntu 24.04 backend commands
3. Testing each fix works

## Read These Files (in order):

### 1. CRITICAL FIXES FIRST
- **`BROKEN_FEATURES.md`** - Complete audit of what's broken and why
- **`FIX_THEMES.md`** - **DO THIS FIRST** - 1-line fix that restores ALL theme/accessibility features

### 2. SYSTEM SETTINGS
- **`FIX_AUDIO.md`** - Volume, audio device selection (uses `wpctl` on Ubuntu 24.04)
- **`FIX_DISPLAY.md`** - Resolution, refresh rate, orientation (uses `xrandr`)

### 3. INPUT DEVICES
- **`FIX_MOUSE.md`** - Pointer speed, DPI, raw input (uses `xinput`)
- **`FIX_BLUETOOTH.md`** - Toggle, scan, connect devices (uses `bluetoothctl`)

### 4. NETWORK & SECURITY
- **`FIX_NETWORK.md`** - WiFi, VPN, hotspot, SSH (uses `nmcli`)
- **`FIX_SECURITY.md`** - Firewall, VeraCrypt, Tor (uses `ufw`, `veracrypt`, `systemctl`)

## Key Files to Modify
- `src/main.ts` - Add event handlers + add missing `applyTheme()` method
- Electron main process - Add IPC handlers for shell commands

## Priority Order
1. Add `applyTheme()` method (1 line - fixes themes + accessibility)
2. Add missing apps to launcher (6 entries)
3. Wire up audio settings
4. Wire up display settings
5. Wire up mouse settings
6. Wire up bluetooth settings
7. Verify network/security handlers

Each FIX_*.md file contains:
- Problem description
- Missing CSS classes
- Ubuntu 24.04 shell commands
- Electron IPC code
- Frontend event handler code

Start with `FIX_THEMES.md` then work through each file.
