#!/usr/bin/env python3
"""
X11 Global Keybind Listener
===========================
Grabs global hotkeys on the root window to ensure they work even when
aggressive X11 applications (like Firefox/Chrome) have focus.

Keybinds:
- Ctrl+Alt+Left/Right: Workspace Prev/Next
- Ctrl+Alt+1/2/3/4: Switch to Workspace 1-4
- Ctrl+Alt+Tab: Toggle Overview
"""

import sys
import json
import time
import signal
from Xlib import X, XK, display

# Configuration
POLL_INTERVAL_SEC = 0.05

class KeybindListener:
    def __init__(self):
        try:
            self.display = display.Display()
            self.root = self.display.screen().root
            self.root.change_attributes(event_mask=X.KeyPressMask)
        except Exception as e:
            self.log(f"Failed to connect to X11 display: {e}")
            sys.exit(1)

        self.running = True
        self.keycodes = {}
        self.grabbed_keys = []

    def log(self, message):
        """Debug logging to stderr"""
        print(f"[KeybindListener] {message}", file=sys.stderr, flush=True)

    def emit(self, event_name):
        """Output a JSON event to stdout"""
        print(json.dumps({"event": event_name}), flush=True)

    def get_keycode(self, keysym):
        return self.display.keysym_to_keycode(keysym)

    def grab_key(self, keysym, modifiers, event_name):
        keycode = self.get_keycode(keysym)
        if not keycode:
            self.log(f"Could not finding keycode for keysym {keysym}")
            return

        try:
            # Grab on root window
            # grab_key(keycode, modifiers, owner_events, pointer_mode, keyboard_mode)
            self.root.grab_key(
                keycode,
                modifiers,
                1, # owner_events = True
                X.GrabModeAsync,
                X.GrabModeAsync
            )
            self.grabbed_keys.append({
                "keycode": keycode,
                "modifiers": modifiers,
                "event": event_name
            })
            self.log(f"Grabbed key: {event_name} (code={keycode}, mod={modifiers})")
        except Exception as e:
            self.log(f"Failed to grab key {event_name}: {e}")

    def setup_grabs(self):
        # Modifiers: Control + Alt (Mod1)
        # Note: We might need to handle NumLock (Mod2) variants too strictly speaking,
        # but pure Ctrl+Alt is usually Mod1Mask | ControlMask
        mods = X.Mod1Mask | X.ControlMask
        
        # We also grab with NumLock (Mod2) and CapsLock (Lock) combinations
        # to ensure it works regardless of lock states.
        # Common lock masks: Lock (Caps), Mod2 (Num), Lock|Mod2
        extra_masks = [0, X.LockMask, X.Mod2Mask, X.LockMask | X.Mod2Mask]

        binds = [
            (XK.XK_Left, "workspace-prev"),
            (XK.XK_Right, "workspace-next"),
            (XK.XK_Up, "workspace-overview"), # Optional alt for overview
            (XK.XK_Tab, "workspace-overview"),
            (XK.XK_1, "workspace-1"),
            (XK.XK_2, "workspace-2"),
            (XK.XK_3, "workspace-3"),
            (XK.XK_4, "workspace-4"),
        ]

        for keysym, event_name in binds:
            for extra in extra_masks:
                self.grab_key(keysym, mods | extra, event_name)

    def run(self):
        self.setup_grabs()
        self.log("Listening for keybinds...")

        while self.running:
            try:
                # pending_events returns number of events in queue
                while self.display.pending_events() > 0:
                    event = self.display.next_event()
                    if event.type == X.KeyPress:
                        self.handle_keypress(event)
                
                # Sleep briefly to reduce CPU usage
                time.sleep(POLL_INTERVAL_SEC)
            except KeyboardInterrupt:
                self.stop()
            except Exception as e:
                self.log(f"Error in loop: {e}")
                time.sleep(1)

    def handle_keypress(self, event):
        # Check against our grabbed keys
        # We only really care about keycode here because X11 only delivers 
        # KeyPress events for keys we explicitly grabbed on Root.
        for bind in self.grabbed_keys:
            if bind["keycode"] == event.detail:
                # Match! Emit event
                self.emit(bind["event"])
                return

    def stop(self):
        self.running = False
        # Ungrab all keys (optional, OS cleans up on exit usually)
        try:
             self.root.ungrab_key(X.AnyKey, X.AnyModifier)
        except:
            pass

def main():
    listener = KeybindListener()

    def signal_handler(sig, frame):
        listener.log("Shutting down...")
        listener.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    listener.run()

if __name__ == '__main__':
    main()
