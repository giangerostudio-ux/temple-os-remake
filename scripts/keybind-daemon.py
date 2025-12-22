#!/usr/bin/env python3
"""
EVDEV Keybind Daemon for TempleOS Shell
========================================
Kernel-level hotkey handler that bypasses X11 keyboard grabs.
Works even when fullscreen games or other X11 apps have exclusive input.

IMPORTANT: This daemon DIRECTLY EXECUTES actions using wmctrl/xdotool.
It also writes JSON to a file for Electron to optionally process additional UI updates.

Requirements:
    - python3 (no external deps - uses only stdlib)
    - User must be in 'input' group OR run as root
    - wmctrl and xdotool installed for direct action execution

For custom OS ISO, add user to input group:
    sudo usermod -aG input $USER

Usage:
    python3 keybind-daemon.py [--device /dev/input/eventX] [--socket /tmp/file.sock]
    
Output (JSON to stdout or file):
    {"action": "workspace-next"}
    {"action": "workspace-prev"}
    {"action": "workspace-1"}
    etc.

Author: TempleOS Shell Project
"""

import os
import sys
import json
import struct
import glob
import argparse
import signal
import subprocess

# ============================================
# LINUX INPUT EVENT CONSTANTS
# From: /usr/include/linux/input-event-codes.h
# ============================================

# Event structure format (from linux/input.h)
# struct input_event {
#     struct timeval time;  // 16 bytes on 64-bit (8+8) or 8 bytes on 32-bit (4+4)
#     unsigned short type;  // 2 bytes
#     unsigned short code;  // 2 bytes
#     unsigned int value;   // 4 bytes
# };

# Detect architecture for correct struct format
import platform
if platform.machine() in ('x86_64', 'aarch64', 'arm64'):
    EVENT_FORMAT = 'llHHI'  # 64-bit: long long (8+8) + H (2) + H (2) + I (4) = 24 bytes
else:
    EVENT_FORMAT = 'iiHHI'  # 32-bit: int int (4+4) + H (2) + H (2) + I (4) = 16 bytes
EVENT_SIZE = struct.calcsize(EVENT_FORMAT)

# Event types
EV_SYN = 0x00
EV_KEY = 0x01

# Key event values
KEY_RELEASED = 0
KEY_PRESSED = 1
KEY_REPEAT = 2

# Key codes (from linux/input-event-codes.h)
KEY_ESC = 1
KEY_1 = 2
KEY_2 = 3
KEY_3 = 4
KEY_4 = 5
KEY_5 = 6
KEY_6 = 7
KEY_7 = 8
KEY_8 = 9
KEY_9 = 10
KEY_0 = 11

KEY_TAB = 15
KEY_Q = 16
KEY_W = 17
KEY_E = 18
KEY_R = 19
KEY_T = 20
KEY_D = 32
KEY_F = 33
KEY_G = 34
KEY_L = 38

KEY_LEFTCTRL = 29
KEY_LEFTSHIFT = 42
KEY_RIGHTSHIFT = 54
KEY_LEFTALT = 56
KEY_SPACE = 57
KEY_CAPSLOCK = 58
KEY_F1 = 59
KEY_F2 = 60
KEY_F3 = 61
KEY_F4 = 62

KEY_RIGHTCTRL = 97
KEY_RIGHTALT = 100

KEY_UP = 103
KEY_LEFT = 105
KEY_RIGHT = 106
KEY_DOWN = 108

KEY_LEFTMETA = 125   # Super/Win key left
KEY_RIGHTMETA = 126  # Super/Win key right


class KeybindDaemon:
    """
    Listens to keyboard events via evdev and emits hotkey actions.
    """
    
    def __init__(self, device_path=None, output_file=None):
        self.device_path = device_path or self._find_keyboard()
        self.output_file = output_file  # If set, write actions to this file
        self.device_fd = None
        self.running = True
        
        # Modifier key states
        self.ctrl_pressed = False
        self.alt_pressed = False
        self.shift_pressed = False
        self.super_pressed = False
        
    def log(self, msg):
        """Log to stderr (stdout reserved for JSON output)"""
        print(f"[KeybindDaemon] {msg}", file=sys.stderr, flush=True)
    
    def _find_keyboard(self):
        """
        Find keyboard device by scanning /dev/input/event* and checking capabilities.
        Returns the path to the first keyboard found.
        """
        # Try to read device names from /sys/class/input
        event_devices = sorted(glob.glob('/dev/input/event*'))
        
        keyboard_keywords = ['keyboard', 'kbd', 'at translated set']
        
        for event_path in event_devices:
            try:
                # Get device name from sysfs
                event_num = os.path.basename(event_path)
                name_path = f'/sys/class/input/{event_num}/device/name'
                
                if os.path.exists(name_path):
                    with open(name_path, 'r') as f:
                        name = f.read().strip().lower()
                        
                    # Check if this looks like a keyboard
                    if any(kw in name for kw in keyboard_keywords):
                        self.log(f"Found keyboard: {name} at {event_path}")
                        return event_path
                        
            except (IOError, OSError, PermissionError):
                continue
        
        # Fallback: try common device paths
        fallback_paths = ['/dev/input/event0', '/dev/input/event1', '/dev/input/event2']
        for path in fallback_paths:
            if os.path.exists(path):
                try:
                    # Test if we can read it
                    with open(path, 'rb') as _:
                        pass
                    self.log(f"Using fallback device: {path}")
                    return path
                except (IOError, PermissionError):
                    continue
        
        raise RuntimeError(
            "No keyboard device found. Ensure you are in the 'input' group:\n"
            "  sudo usermod -aG input $USER\n"
            "Then log out and log back in."
        )
    
    def execute_action(self, action):
        """
        Directly execute the action using X11 commands.
        This bypasses Electron IPC entirely for reliable hotkey handling.
        """
        try:
            if action == 'workspace-next':
                # Get current desktop and switch to next
                subprocess.run(['xdotool', 'key', 'Super+Right'], 
                               capture_output=True, timeout=1)
                # Alternative: use wmctrl to switch to next desktop
                result = subprocess.run(['wmctrl', '-d'], capture_output=True, text=True, timeout=1)
                desktops = result.stdout.strip().split('\n')
                current = next((i for i, d in enumerate(desktops) if '*' in d), 0)
                next_desktop = (current + 1) % len(desktops) if len(desktops) > 1 else 0
                subprocess.run(['wmctrl', '-s', str(next_desktop)], timeout=1)
                self.log(f"Executed: workspace-next (switched to desktop {next_desktop})")
                
            elif action == 'workspace-prev':
                result = subprocess.run(['wmctrl', '-d'], capture_output=True, text=True, timeout=1)
                desktops = result.stdout.strip().split('\n')
                current = next((i for i, d in enumerate(desktops) if '*' in d), 0)
                prev_desktop = (current - 1) % len(desktops) if len(desktops) > 1 else 0
                subprocess.run(['wmctrl', '-s', str(prev_desktop)], timeout=1)
                self.log(f"Executed: workspace-prev (switched to desktop {prev_desktop})")
                
            elif action.startswith('workspace-') and action[-1].isdigit():
                # workspace-1, workspace-2, etc.
                ws_num = int(action.split('-')[1]) - 1  # wmctrl uses 0-indexed
                subprocess.run(['wmctrl', '-s', str(ws_num)], timeout=1)
                self.log(f"Executed: {action} (switched to desktop {ws_num})")
                
            elif action == 'show-desktop':
                subprocess.run(['wmctrl', '-k', 'on'], timeout=1)
                self.log("Executed: show-desktop")
                
            elif action == 'open-files':
                # Try common file managers
                for fm in ['nautilus', 'thunar', 'pcmanfm', 'dolphin', 'nemo']:
                    try:
                        subprocess.Popen([fm], start_new_session=True)
                        self.log(f"Executed: open-files (launched {fm})")
                        break
                    except FileNotFoundError:
                        continue
                        
            elif action == 'close-window':
                subprocess.run(['xdotool', 'getactivewindow', 'windowclose'], timeout=1)
                self.log("Executed: close-window")
                
            elif action in ('snap-left', 'snap-right', 'snap-up', 'snap-down'):
                direction = action.split('-')[1].capitalize()
                subprocess.run(['xdotool', 'key', f'Super+{direction}'], timeout=1)
                self.log(f"Executed: {action}")
                
            elif action in ('task-switcher', 'alt-tab'):
                subprocess.run(['xdotool', 'key', 'alt+Tab'], timeout=1)
                self.log(f"Executed: {action}")
                
            # Note: lock-screen needs to be handled by Electron since it's a custom UI
                
        except subprocess.TimeoutExpired:
            self.log(f"Timeout executing: {action}")
        except Exception as e:
            self.log(f"Error executing {action}: {e}")
    
    def emit(self, action):
        """
        First execute the action directly using X11 commands,
        then output as JSON for Electron to process UI updates.
        """
        # Execute directly - this is the reliable path
        self.execute_action(action)
        
        # Also write JSON for Electron (for UI sync like workspace indicator)
        output = json.dumps({'action': action})
        
        if self.output_file:
            # Write to file (append mode, with newline)
            try:
                with open(self.output_file, 'a') as f:
                    f.write(output + '\n')
                    f.flush()
            except Exception as e:
                self.log(f"Error writing to output file: {e}")
        else:
            # Write to stdout
            print(output, flush=True)
    
    def _check_hotkey(self, keycode):
        """
        Check if the current key press completes a hotkey combination.
        Called only for KEY_PRESSED events.
        """
        
        # ============================================
        # WORKSPACE SWITCHING (Ctrl+Alt combos)
        # ============================================
        if self.ctrl_pressed and self.alt_pressed and not self.super_pressed:
            
            # Ctrl+Alt+Tab: Workspace overview toggle
            if keycode == KEY_TAB and not self.shift_pressed:
                self.emit('workspace-overview')
                return True
            
            # Ctrl+Alt+Left: Previous workspace
            if keycode == KEY_LEFT and not self.shift_pressed:
                self.emit('workspace-prev')
                return True
            
            # Ctrl+Alt+Right: Next workspace
            if keycode == KEY_RIGHT and not self.shift_pressed:
                self.emit('workspace-next')
                return True
            
            # Ctrl+Alt+1-4: Direct workspace switch
            if not self.shift_pressed:
                ws_keys = {KEY_1: 1, KEY_2: 2, KEY_3: 3, KEY_4: 4}
                if keycode in ws_keys:
                    self.emit(f'workspace-{ws_keys[keycode]}')
                    return True
            
            # Ctrl+Shift+Alt+1-4: Move window to workspace
            if self.shift_pressed:
                ws_keys = {KEY_1: 1, KEY_2: 2, KEY_3: 3, KEY_4: 4}
                if keycode in ws_keys:
                    self.emit(f'move-to-workspace-{ws_keys[keycode]}')
                    return True
        
        # ============================================
        # WINDOW SNAPPING (Super+Arrow keys)
        # ============================================
        if self.super_pressed and not self.ctrl_pressed and not self.alt_pressed and not self.shift_pressed:
            snap_keys = {
                KEY_LEFT: 'snap-left',
                KEY_RIGHT: 'snap-right',
                KEY_UP: 'snap-up',
                KEY_DOWN: 'snap-down',
            }
            if keycode in snap_keys:
                self.emit(snap_keys[keycode])
                return True
            
            # Super+D: Show desktop toggle
            if keycode == KEY_D:
                self.emit('show-desktop')
                return True
            
            # Super+E: Open file manager
            if keycode == KEY_E:
                self.emit('open-files')
                return True
            
            # Super+L: Lock screen
            if keycode == KEY_L:
                self.emit('lock-screen')
                return True
            
            # Super+Tab: Alt-Tab (task switcher)
            if keycode == KEY_TAB:
                self.emit('task-switcher')
                return True
        
        # ============================================
        # ALT+F4: Close window
        # ============================================
        if self.alt_pressed and not self.ctrl_pressed and not self.super_pressed:
            if keycode == KEY_F4:
                self.emit('close-window')
                return True
            
            # Alt+Tab: Task switcher
            if keycode == KEY_TAB:
                self.emit('alt-tab')
                return True
        
        return False
    
    def _handle_event(self, ev_type, code, value):
        """Process a single input event."""
        if ev_type != EV_KEY:
            return
        
        # Update modifier states
        if code in (KEY_LEFTCTRL, KEY_RIGHTCTRL):
            self.ctrl_pressed = (value != KEY_RELEASED)
        elif code in (KEY_LEFTALT, KEY_RIGHTALT):
            self.alt_pressed = (value != KEY_RELEASED)
        elif code in (KEY_LEFTSHIFT, KEY_RIGHTSHIFT):
            self.shift_pressed = (value != KEY_RELEASED)
        elif code in (KEY_LEFTMETA, KEY_RIGHTMETA):
            self.super_pressed = (value != KEY_RELEASED)
        elif value == KEY_PRESSED:
            # Only check hotkeys on key press (not repeat or release)
            self._check_hotkey(code)
    
    def run(self):
        """Main event loop - read and process keyboard events."""
        self.log(f"Starting daemon on {self.device_path}")
        self.log(f"Event size: {EVENT_SIZE} bytes (arch: {platform.machine()})")
        
        try:
            self.device_fd = open(self.device_path, 'rb', buffering=0)
        except PermissionError:
            self.log("ERROR: Permission denied. Add user to 'input' group:")
            self.log("  sudo usermod -aG input $USER")
            self.log("Then log out and log back in.")
            sys.exit(1)
        except FileNotFoundError:
            self.log(f"ERROR: Device not found: {self.device_path}")
            sys.exit(1)
        
        self.log("Daemon running. Listening for hotkeys...")
        
        try:
            while self.running:
                # Read one event
                data = self.device_fd.read(EVENT_SIZE)
                if not data or len(data) < EVENT_SIZE:
                    continue
                
                # Unpack event structure
                try:
                    _, _, ev_type, code, value = struct.unpack(EVENT_FORMAT, data)
                    self._handle_event(ev_type, code, value)
                except struct.error:
                    continue
                    
        except KeyboardInterrupt:
            self.log("Interrupted by user")
        finally:
            self.stop()
    
    def stop(self):
        """Clean shutdown."""
        self.running = False
        if self.device_fd:
            try:
                self.device_fd.close()
            except:
                pass
        self.log("Daemon stopped")


def main():
    parser = argparse.ArgumentParser(
        description='TempleOS Keybind Daemon - Kernel-level hotkey handler',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Supported Hotkeys:
  Ctrl+Alt+Tab         Workspace overview
  Ctrl+Alt+Left/Right  Previous/Next workspace
  Ctrl+Alt+1-4         Switch to workspace 1-4
  Ctrl+Shift+Alt+1-4   Move window to workspace 1-4
  Super+Arrow          Snap window left/right/up/down
  Super+D              Show desktop
  Super+E              Open file manager
  Super+L              Lock screen
  Super+Tab            Task switcher
  Alt+Tab              Task switcher
  Alt+F4               Close window

Permissions:
  Requires 'input' group membership or root access.
  For custom OS: add user to input group in /etc/group
        """
    )
    parser.add_argument(
        '--device', '-d',
        help='Path to keyboard device (auto-detected if not specified)',
        default=None
    )
    parser.add_argument(
        '--list-devices', '-l',
        action='store_true',
        help='List available input devices and exit'
    )
    parser.add_argument(
        '--output-file', '-o',
        help='Write actions to this file instead of stdout (for file-based IPC)',
        default=None
    )
    parser.add_argument(
        '--socket', '-s',
        help='Socket path (alias for --output-file for compatibility)',
        default=None
    )
    
    args = parser.parse_args()
    
    if args.list_devices:
        print("Available input devices:")
        for event_path in sorted(glob.glob('/dev/input/event*')):
            event_num = os.path.basename(event_path)
            name_path = f'/sys/class/input/{event_num}/device/name'
            name = '(unknown)'
            if os.path.exists(name_path):
                try:
                    with open(name_path, 'r') as f:
                        name = f.read().strip()
                except:
                    pass
            print(f"  {event_path}: {name}")
        return 0
    
    # Determine output file (--socket is alias for --output-file)
    output_file = args.output_file or args.socket
    
    daemon = KeybindDaemon(device_path=args.device, output_file=output_file)
    
    # Handle signals for clean shutdown
    def signal_handler(sig, frame):
        daemon.log(f"Received signal {sig}, shutting down...")
        daemon.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        daemon.run()
    except Exception as e:
        print(f"[KeybindDaemon] Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
