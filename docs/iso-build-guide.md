# ISO Build Guide - TempleOS Remake

## Prerequisites

This guide assumes you're building the ISO **on a Linux machine** (same architecture as target).

## Current Status ✅

The terminal is now working with:
- ✅ node-pty compiled for Electron 33.4.11
- ✅ xterm.js terminal emulator
- ✅ Full sudo/interactive command support

## Pre-Build Checklist

Before creating the ISO, ensure:

### 1. Terminal is Working

Test the terminal in your development VM:

```bash
# SSH into VM
ssh -p 2222 temple@localhost

# Verify node-pty is installed
cd /opt/templeos
node -e "require('node-pty'); console.log('OK')"
```

If you see "OK", proceed.

### 2. Rebuild node-pty for Electron (CRITICAL)

**Every time before building an ISO**, run:

```bash
cd /opt/templeos

# Rebuild node-pty for the current Electron version
npx electron-rebuild -f -w node-pty

# Verify it worked
ls -la node_modules/node-pty/build/Release/pty.node
```

You should see the compiled `pty.node` file.

### 3. Build the Frontend

```bash
npm run build
```

### 4. Test Production Build

```bash
npm run electron:build
```

This creates the distributable in `dist/`.

### 5. Generate APT Baseline (Recommended)

This makes “Uninstall (APT)” safe-by-default by preventing removal of packages that shipped with the ISO baseline.

```bash
node scripts/generate-apt-baseline.cjs
```

### 6. Generate Snap Baseline (If your ISO includes Snap apps)

This makes “Uninstall (Snap)” safe-by-default by preventing removal of snaps that shipped with the ISO baseline.

```bash
node scripts/generate-snap-baseline.cjs
```

## Files to Include in ISO

When packaging for ISO, include these folders:

```
/opt/templeos/
├── dist/              # Built frontend files
├── electron/          # Electron main process
├── node_modules/      # ALL dependencies (including node-pty)
├── package.json
├── package-lock.json
└── scripts/           # Optional: setup scripts
```

**CRITICAL**: The `node_modules/node-pty/build/Release/pty.node` file MUST be included!

## ISO Build Steps

### Step 1: Prepare the Build Environment

```bash
# On your Linux build machine:
git clone https://github.com/giangerostudio-ux/temple-os-remake.git
cd temple-os-remake

# Install dependencies
npm install

# Install Electron rebuild tool
npm install --save-dev @electron/rebuild

# Rebuild node-pty for Electron
npx electron-rebuild -f -w node-pty

# Build frontend
npm run build

# Build Electron app
npm run electron:build
```

### Step 2: Package for ISO

The built application will be in `dist/` (or wherever electron-builder outputs).

Copy the entire application folder to `/opt/templeos/` in your ISO.

### Step 3: Create Autostart (Optional)

Create `/etc/systemd/system/templeos.service`:

```ini
[Unit]
Description=TempleOS Remake
After=graphical.target

[Service]
Type=simple
User=temple
WorkingDirectory=/opt/templeos
Environment=DISPLAY=:0
ExecStart=/opt/templeos/node_modules/.bin/electron /opt/templeos
Restart=always

[Install]
WantedBy=graphical.target
```

Enable it:

```bash
sudo systemctl enable templeos.service
```

## Verification After ISO Creation

Boot the ISO and:

1. Open Terminal app
2. Run: `sudo apt update`
3. You should see a password prompt ✅

If you get "sudo: a terminal is required", the terminal is broken.

## Troubleshooting

### Terminal shows fallback mode after ISO boot

**Cause**: node-pty wasn't included or was compiled for wrong architecture.

**Fix**:
```bash
# On the ISO system:
cd /opt/templeos
npm rebuild node-pty --build-from-source
npx electron-rebuild -f -w node-pty
```

### "Cannot find module 'node-pty'"

**Cause**: `node_modules` folder wasn't included in ISO.

**Fix**: Rebuild the ISO and include the entire `node_modules/` folder.

### Wrong Node.js version error

**Cause**: node-pty was compiled for system Node.js instead of Electron.

**Fix**: Run `npx electron-rebuild -f -w node-pty` before packaging.

## Architecture Notes

- **x86_64 (Intel/AMD)**: Build on x86_64 Linux
- **ARM64 (Raspberry Pi, etc.)**: Build on ARM64 Linux
- **Cross-compilation**: Not recommended - native modules like node-pty need native builds

## Quick Reference: Build Commands

```bash
# Full build sequence
git pull origin main
npm install
npx electron-rebuild -f -w node-pty
npm run build
npm run electron:build

# Verify terminal
node -e "require('node-pty'); console.log('Terminal: OK')"
```

## Distribution Checklist

Before releasing ISO:

- [ ] Terminal works (sudo prompts for password)
- [ ] node-pty is compiled for current Electron version
- [ ] npm audit shows no critical vulnerabilities
- [ ] All apps launch correctly
- [ ] Lock screen works
- [ ] Settings persist after reboot
- [ ] Tested on clean VM

---

**Last Updated**: December 19, 2025  
**Electron Version**: 33.4.11  
**Node.js (Electron)**: Check with `process.versions.node` in Electron console  
**node-pty Version**: 1.0.0
