# Terminal Setup Guide

## Overview

TempleOS Remake includes a **real terminal** powered by `node-pty` and `xterm.js`. This provides:

- ✅ Full shell access (bash, zsh, etc.)
- ✅ Interactive commands (sudo password prompts)
- ✅ Tab completion
- ✅ Command history
- ✅ ANSI color support
- ✅ Copy/paste
- ✅ Multiple tabs
- ✅ Split panes

## Requirements

The terminal requires `node-pty`, a native Node.js module that needs to be **compiled** for your system.

### Ubuntu/Debian Dependencies

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

### Fedora/RHEL Dependencies

```bash
sudo dnf install -y @development-tools python3 make gcc-c++
```

### Arch Linux Dependencies

```bash
sudo pacman -S base-devel python
```

## Quick Setup

Run the setup script:

```bash
chmod +x scripts/setup-terminal.sh
./scripts/setup-terminal.sh
```

This will:
1. Install build tools
2. Compile `node-pty` for your system
3. Verify the installation

After running the script, **restart the application** for changes to take effect.

## Manual Installation

If the script doesn't work, try:

```bash
# Navigate to project directory
cd /path/to/temple-os-recreation

# Install build tools (Ubuntu)
sudo apt install -y build-essential python3

# Rebuild node-pty
npm rebuild node-pty

# Or reinstall
npm install node-pty --save

# Verify installation
node -e "require('node-pty'); console.log('OK')"
```

## Troubleshooting

### "PTY not available"

This means `node-pty` failed to load. Check:

1. Are build tools installed? (`gcc --version`)
2. Is Python 3 installed? (`python3 --version`)
3. Check for errors in Electron console (View > Toggle Developer Tools)

### "sudo: a terminal is required to read the password"

This error appears when using the **fallback terminal** (no PTY). Run the setup script above to enable the real terminal.

### Black/Empty Terminal

The terminal might be initializing slowly. Wait a few seconds or:

1. Close the terminal window
2. Reopen it from the start menu or taskbar

### Build Errors on macOS

On macOS, you also need Xcode Command Line Tools:

```bash
xcode-select --install
```

## Fallback Mode

If `node-pty` isn't available, the terminal falls into **fallback mode**:

| Feature | Real PTY | Fallback |
|---------|----------|----------|
| Basic commands (ls, cat, cd) | ✅ | ✅ |
| Interactive commands | ✅ | ❌ |
| sudo password prompts | ✅ | ❌ |
| nano/vim | ✅ | ❌ |
| Tab completion | ✅ | ✅ (limited) |

Fallback mode runs commands via `bash -lc`, which doesn't provide a TTY.

## Technical Details

- **PTY Library**: `node-pty` (native module)
- **Terminal Emulator**: `@xterm/xterm` (web-based)
- **Fit Addon**: `@xterm/addon-fit` (auto-resize)
- **Shell**: Uses `$SHELL` environment variable or `/bin/bash`
