# X11 Keybind Blocking Research & Solutions

> [!TIP]
> **STATUS: IMPLEMENTED** ✅
> - Python daemon: `scripts/keybind-daemon.py`
> - Setup script: `scripts/setup-keybinds.sh`
> - Electron integration: `electron/main.cjs` (startKeybindDaemon)
> - Handler expansion: `src/main.ts` (onGlobalShortcut)

## Problem Statement

When X11 applications (Firefox, Chromium, terminals, games, etc.) have keyboard focus, global shortcuts like `Ctrl+Alt+Arrow` keys (workspace switching) are **blocked**. The current implementation using Electron's `globalShortcut` API fails because:

1. **Electron's `globalShortcut` uses `XGrabKey`** - This is an X11-level keyboard grab
2. **X11 apps can grab the keyboard during certain operations** - Fullscreen games, modal dialogs, drag operations
3. **Only one application can hold a specific key grab at a time** - When X11 apps have active grabs, Electron's grabs fail silently

---

## Current Implementation Analysis

### Location: `electron/main.cjs` (Lines 6419-6458)

```javascript
// GLOBAL SHORTCUTS FOR WORKSPACE KEYBINDS
app.whenReady().then(() => {
    // Super key tap: Toggle Start Menu
    globalShortcut.register('Super', () => {...});
    
    // Ctrl+Alt+Tab: Cycle to next workspace
    globalShortcut.register('Control+Alt+Tab', () => {...});
    
    // Ctrl+Alt+Left/Right: Prev/Next workspace
    globalShortcut.register('Control+Alt+Left', () => {...});
    globalShortcut.register('Control+Alt+Right', () => {...});
    
    // Ctrl+Alt+1-4: Direct workspace switch
    for (let i = 1; i <= 4; i++) {
        globalShortcut.register(`Control+Alt+${i}`, () => {...});
    }
});
```

### Current Python Scripts

The project already uses Python with `python3-xlib` for X11 interaction:
- **`scripts/snap-detector.py`** - Uses Xlib for mouse tracking during window snaps
- **`scripts/patch-openbox-rcxml.py`** - Patches Openbox config to remove conflicting keybinds

---

## Why XGrabKey Fails

### The X11 Keyboard Grab System

1. **Passive Grabs (XGrabKey)**: Register interest in a key combo - receive events when pressed
2. **Active Grabs (XGrabKeyboard)**: Exclusive keyboard capture - used by fullscreen apps, games, modal dialogs

When an X11 application performs an **active keyboard grab**, it intercepts all keyboard events *before* they reach any passive grabs. This is by design for:
- Fullscreen games needing all input
- Modal dialogs preventing background interaction
- Drag-and-drop operations
- Screen lockers

### Electron's globalShortcut Internals

Electron's `globalShortcut.register()` calls `XGrabKey()` internally. This creates a **passive grab** on the root window, which:
- ✅ Works when Electron/X11 desktop has focus
- ✅ Works when non-grabbing X11 apps have focus
- ❌ **Fails when X11 apps perform active keyboard grabs**

---

## Solution Options (Ranked by Reliability)

### 1. 🏆 **EVDEV - Kernel-Level Input (RECOMMENDED)**

Bypass X11 entirely by reading directly from `/dev/input/eventX` devices.

**How it works**:
- Reads raw keyboard events from the Linux kernel
- Processes events *before* X11 ever sees them
- Cannot be blocked by any X11 application

**Pros**:
- 100% reliable - works regardless of X11 state
- Works during fullscreen games, screen locks, etc.
- Zero conflicts with other applications

**Cons**:
- Requires root permissions OR input group membership
- Must identify correct keyboard device
- Need to handle multiple keyboards if present

**Python Implementation**:
```python
#!/usr/bin/env python3
"""
EVDEV Keybind Daemon - Kernel-level hotkey handler
Works even when X11 apps grab the keyboard
"""
import os
import sys
import json
import struct
import fcntl
import select

# Input event structure (from linux/input.h)
EVENT_FORMAT = 'llHHI'  # time_sec, time_usec, type, code, value
EVENT_SIZE = struct.calcsize(EVENT_FORMAT)

# Event types
EV_KEY = 0x01

# Key codes (from linux/input-event-codes.h)
KEY_LEFTCTRL = 29
KEY_LEFTALT = 56
KEY_RIGHTCTRL = 97
KEY_RIGHTALT = 100
KEY_LEFT = 105
KEY_RIGHT = 106
KEY_UP = 103
KEY_DOWN = 108
KEY_1 = 2
KEY_2 = 3
KEY_3 = 4
KEY_4 = 5
KEY_TAB = 15

class EvdevKeybindDaemon:
    def __init__(self, device_path=None):
        self.device_path = device_path or self._find_keyboard()
        self.ctrl_pressed = False
        self.alt_pressed = False
        
    def _find_keyboard(self):
        """Find the first keyboard device"""
        for i in range(20):
            path = f'/dev/input/event{i}'
            if os.path.exists(path):
                try:
                    with open(path, 'rb') as f:
                        # Try to get device name
                        name = fcntl.ioctl(f, 0x80804506, b'\x00' * 256)
                        name = name.decode('utf-8', errors='ignore').strip('\x00').lower()
                        if 'keyboard' in name or 'kbd' in name:
                            return path
                except (IOError, OSError):
                    continue
        raise RuntimeError("No keyboard device found")
    
    def emit(self, action):
        """Output action as JSON to stdout"""
        print(json.dumps({'action': action}), flush=True)
    
    def run(self):
        with open(self.device_path, 'rb') as device:
            print(f'[EvdevDaemon] Listening on {self.device_path}', file=sys.stderr)
            
            while True:
                data = device.read(EVENT_SIZE)
                if not data:
                    continue
                    
                _, _, ev_type, code, value = struct.unpack(EVENT_FORMAT, data)
                
                if ev_type != EV_KEY:
                    continue
                
                # Track modifier state
                if code in (KEY_LEFTCTRL, KEY_RIGHTCTRL):
                    self.ctrl_pressed = (value > 0)
                elif code in (KEY_LEFTALT, KEY_RIGHTALT):
                    self.alt_pressed = (value > 0)
                elif value == 1:  # Key press (not repeat or release)
                    self._check_hotkey(code)
    
    def _check_hotkey(self, code):
        """Check if current key completes a hotkey combo"""
        if not (self.ctrl_pressed and self.alt_pressed):
            return
            
        actions = {
            KEY_LEFT: 'workspace-prev',
            KEY_RIGHT: 'workspace-next',
            KEY_TAB: 'workspace-overview',
            KEY_1: 'workspace-1',
            KEY_2: 'workspace-2',
            KEY_3: 'workspace-3',
            KEY_4: 'workspace-4',
        }
        
        if code in actions:
            self.emit(actions[code])

if __name__ == '__main__':
    daemon = EvdevKeybindDaemon()
    daemon.run()
```

**Integration with Electron**:
```javascript
// In main.cjs - spawn the evdev daemon
const { spawn } = require('child_process');

function startKeybindDaemon() {
    const daemon = spawn('sudo', ['python3', 'scripts/keybind-daemon.py'], {
        stdio: ['ignore', 'pipe', 'inherit']
    });
    
    daemon.stdout.on('data', (data) => {
        try {
            const { action } = JSON.parse(data.toString().trim());
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('global-shortcut', action);
            }
        } catch {}
    });
    
    return daemon;
}
```

---

### 2. **SXHKD - Simple X HotKey Daemon**

External daemon that uses XGrabKey with priority handling.

**Installation**:
```bash
sudo apt install sxhkd
```

**Configuration** (`~/.config/sxhkd/sxhkdrc`):
```bash
# Workspace switching
ctrl + alt + Left
    echo '{"action":"workspace-prev"}' | socat - UNIX:/tmp/templeos-hotkeys.sock

ctrl + alt + Right
    echo '{"action":"workspace-next"}' | socat - UNIX:/tmp/templeos-hotkeys.sock

ctrl + alt + Tab
    echo '{"action":"workspace-overview"}' | socat - UNIX:/tmp/templeos-hotkeys.sock

ctrl + alt + {1,2,3,4}
    echo '{{"action":"workspace-{1,2,3,4}"}}' | socat - UNIX:/tmp/templeos-hotkeys.sock
```

**Pros**:
- Well-tested, battle-hardened daemon
- Easy configuration syntax
- Can execute any command

**Cons**:
- Still uses XGrabKey - may conflict with some fullscreen apps
- External dependency
- May need to reload config on changes

---

### 3. **Python pynput with uinput Backend**

Higher-level Python library with optional evdev/uinput support.

**Installation**:
```bash
pip install pynput
```

**Implementation**:
```python
#!/usr/bin/env python3
from pynput import keyboard
import json
import sys

class HotkeyDaemon:
    def __init__(self):
        self.current_keys = set()
        
    def emit(self, action):
        print(json.dumps({'action': action}), flush=True)
        
    def on_press(self, key):
        self.current_keys.add(key)
        self._check_combo()
        
    def on_release(self, key):
        self.current_keys.discard(key)
    
    def _check_combo(self):
        ctrl = keyboard.Key.ctrl_l in self.current_keys or keyboard.Key.ctrl_r in self.current_keys
        alt = keyboard.Key.alt_l in self.current_keys or keyboard.Key.alt_r in self.current_keys
        
        if not (ctrl and alt):
            return
            
        if keyboard.Key.left in self.current_keys:
            self.emit('workspace-prev')
        elif keyboard.Key.right in self.current_keys:
            self.emit('workspace-next')
        elif keyboard.Key.tab in self.current_keys:
            self.emit('workspace-overview')
        # ... etc
    
    def run(self):
        with keyboard.Listener(on_press=self.on_press, on_release=self.on_release) as listener:
            listener.join()

if __name__ == '__main__':
    HotkeyDaemon().run()
```

**Pros**:
- Cross-platform (if needed for future)
- High-level API
- Can use uinput backend for root-level access

**Cons**:
- Default Xlib backend has same XGrabKey limitations
- uinput backend requires root

---

### 4. **XGrabKey with Priority (python-xlib)**

Direct X11 binding with aggressive grab techniques.

**Note**: This is essentially what Electron already does but with more control.

```python
from Xlib import X, display, XK

def register_global_hotkey(keysym, modifiers):
    d = display.Display()
    root = d.screen().root
    keycode = d.keysym_to_keycode(keysym)
    
    # Grab with all modifier combinations to catch NumLock/CapsLock states
    for extra in [0, X.LockMask, X.Mod2Mask, X.LockMask | X.Mod2Mask]:
        root.grab_key(keycode, modifiers | extra, 1, X.GrabModeAsync, X.GrabModeAsync)
    
    d.sync()
```

**Cons**:
- Same fundamental XGrabKey limitations as Electron
- May work slightly better with timing/priority but not guaranteed

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TempleOS Shell                          │
│                    (Electron Main)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ IPC
                      │ global-shortcut events
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Keybind Daemon (Python)                     │
│              scripts/keybind-daemon.py                      │
│                                                             │
│  ┌─────────────┐    ┌─────────────────────────────────┐    │
│  │  EVDEV      │ OR │  XGrabKey (fallback)            │    │
│  │  /dev/input │    │  Works when no active grabs     │    │
│  │  Kernel-lvl │    │                                  │    │
│  └─────────────┘    └─────────────────────────────────┘    │
│         │                       │                          │
│         └───────────┬───────────┘                          │
│                     │                                       │
│                     ▼                                       │
│              JSON stdout                                    │
│         {"action": "workspace-next"}                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create Python Keybind Daemon

1. Create `scripts/keybind-daemon.py` with evdev support
2. Add fallback to XGrabKey for non-root mode
3. Handle multiple keyboard devices
4. Output JSON actions to stdout

### Phase 2: Integrate with Electron

1. Spawn daemon in `main.cjs` on app ready
2. Parse JSON output and forward as IPC messages
3. Keep existing `globalShortcut` as secondary fallback
4. Handle daemon respawn on crash

### Phase 3: Configuration

1. Create config file for custom keybinds
2. Add UI in Settings to customize shortcuts
3. Support for gaming mode (disable hotkeys when fullscreen game active)

### Phase 4: Permissions & Setup

1. Document input group membership requirement
2. Add setup script to add user to `input` group
3. Fallback gracefully if permissions unavailable

---

## Permissions Requirements

For evdev access without root:

```bash
# Add user to input group
sudo usermod -aG input $USER

# Logout/login required for group change to take effect
# Or use: newgrp input
```

For development/testing:
```bash
# Run daemon with sudo
sudo python3 scripts/keybind-daemon.py
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `scripts/keybind-daemon.py` | **NEW** | Main Python daemon using evdev |
| `electron/main.cjs` | **MODIFY** | Spawn daemon, parse output |
| `scripts/setup-keybinds.sh` | **NEW** | Setup script for permissions |
| `docs/keybind-setup.md` | **NEW** | User documentation |

---

## Testing Checklist

- [ ] Open Firefox/Chromium in fullscreen mode
- [ ] Press Ctrl+Alt+Left/Right - should switch workspaces
- [ ] Open a game (Steam game) in fullscreen
- [ ] Press Ctrl+Alt+1-4 - should switch to specific workspace
- [ ] Test with screen lock active
- [ ] Test with modal dialogs open
- [ ] Test daemon auto-restart on crash

---

## References

- [X11 XGrabKey Documentation](https://www.x.org/releases/X11R7.7/doc/libX11/libX11/libX11.html#XGrabKey)
- [Linux evdev Interface](https://www.kernel.org/doc/html/latest/input/input.html)
- [python3-evdev](https://python-evdev.readthedocs.io/)
- [sxhkd GitHub](https://github.com/baskerville/sxhkd)
- [pynput Documentation](https://pynput.readthedocs.io/)

---

## Conclusion

**The recommended solution is the evdev-based Python daemon** because:

1. ✅ Works 100% of the time regardless of X11 state
2. ✅ The project already uses Python scripts for X11 interaction
3. ✅ Integration pattern already established with `snap-detector.py`
4. ✅ No external daemon dependencies (self-contained)
5. ✅ Can be extended to support custom keybinds easily

The only tradeoff is the need for root access or input group membership, which is acceptable for a kiosk-style operating system replacement.
