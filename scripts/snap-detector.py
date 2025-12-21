#!/usr/bin/env python3
"""
X11 Snap Layout Detector - Windows 11 Style
============================================
Polls XQueryPointer to detect drag-to-edge gestures in real-time.
Works even during window manager grabs (Openbox, etc.)

Usage:
    python3 snap-detector.py --protected 0x1a00003 0x1b00004

Outputs JSON events to stdout:
    {"event": "zone_enter", "zone": "top", "x": 500, "y": 30, "xid": "0x2800003"}
    {"event": "zone_leave"}
    {"event": "snap_apply", "zone": "left", "xid": "0x2800003"}
    {"event": "drag_end"}
"""

import json
import sys
import time
import argparse
import signal

try:
    from Xlib import X, display, Xatom
except ImportError:
    print('{"event": "error", "message": "python3-xlib not installed. Run: sudo apt install python3-xlib"}', flush=True)
    sys.exit(1)

# Configuration
POLL_INTERVAL_MS = 40        # 40ms = 25fps, responsive enough for smooth UX
TOP_TRIGGER_ZONE = 80        # pixels from top for snap layouts menu
EDGE_TRIGGER_ZONE = 30       # pixels from left/right edge for direct snap
CORNER_TRIGGER_ZONE = 60     # pixels from corner for quadrant snap
DEBOUNCE_MS = 150            # delay before registering zone entry (prevents flicker)

# Button masks (from X11)
Button1Mask = 1 << 8  # Left mouse button (256)


class SnapDetector:
    def __init__(self, protected_xids=None):
        self.display = display.Display()
        self.root = self.display.screen().root
        self.screen_width = self.root.get_geometry().width
        self.screen_height = self.root.get_geometry().height
        
        # Store protected XIDs (main Electron window, etc.)
        self.protected_xids = set()
        for xid in (protected_xids or []):
            try:
                if isinstance(xid, str):
                    self.protected_xids.add(int(xid, 16) if xid.startswith('0x') else int(xid))
                else:
                    self.protected_xids.add(int(xid))
            except (ValueError, TypeError):
                pass
        
        # State tracking
        self.is_dragging = False
        self.current_zone = None
        self.zone_enter_time = 0
        self.last_xid = None
        self.running = True
        
        # EWMH atoms
        self._NET_ACTIVE_WINDOW = self.display.intern_atom('_NET_ACTIVE_WINDOW')
        
    def log(self, message):
        """Debug logging to stderr (doesn't interfere with JSON output)"""
        print(f"[SnapDetector] {message}", file=sys.stderr, flush=True)
        
    def add_protected_xid(self, xid):
        """Add a window XID that should be ignored"""
        try:
            self.protected_xids.add(int(xid, 16) if isinstance(xid, str) and xid.startswith('0x') else int(xid))
        except (ValueError, TypeError):
            pass
        
    def get_active_window_xid(self):
        """Get the currently active/focused window XID"""
        try:
            response = self.root.get_full_property(self._NET_ACTIVE_WINDOW, X.AnyPropertyType)
            if response and response.value and len(response.value) > 0:
                xid = response.value[0]
                if xid and xid > 0:
                    return xid
        except Exception:
            pass
        return None
    
    def is_button1_pressed(self, mask):
        """Check if left mouse button is currently held down"""
        return bool(mask & Button1Mask)
    
    def get_zone(self, x, y):
        """Determine which snap zone the mouse coordinates are in"""
        # Corners first (they have priority over edges)
        if y < CORNER_TRIGGER_ZONE:
            if x < CORNER_TRIGGER_ZONE:
                return 'topleft'
            elif x > self.screen_width - CORNER_TRIGGER_ZONE:
                return 'topright'
        
        if y > self.screen_height - CORNER_TRIGGER_ZONE:
            if x < CORNER_TRIGGER_ZONE:
                return 'bottomleft'
            elif x > self.screen_width - CORNER_TRIGGER_ZONE:
                return 'bottomright'
        
        # Top edge - triggers the full snap layouts menu (like Windows 11)
        if y < TOP_TRIGGER_ZONE:
            return 'top'
        
        # Side edges - direct left/right snap
        if x < EDGE_TRIGGER_ZONE:
            return 'left'
        elif x > self.screen_width - EDGE_TRIGGER_ZONE:
            return 'right'
        
        return None
    
    def emit(self, event_data):
        """Output a JSON event to stdout"""
        print(json.dumps(event_data), flush=True)
    
    def poll(self):
        """Single poll iteration - check mouse state and emit events"""
        try:
            # XQueryPointer returns current mouse position AND button state
            result = self.root.query_pointer()
            
            x = result.root_x
            y = result.root_y
            button1_held = self.is_button1_pressed(result.mask)
            
            # Get currently active window
            active_xid = self.get_active_window_xid()
            
            # Check if active window is protected (skip these)
            is_protected = active_xid in self.protected_xids if active_xid else True
            
            now = time.time() * 1000  # Current time in ms
            
            # === STATE MACHINE ===
            
            if button1_held and not is_protected and active_xid:
                zone = self.get_zone(x, y)
                
                if not self.is_dragging:
                    # Drag just started
                    self.is_dragging = True
                    self.current_zone = None
                    self.zone_enter_time = 0
                    self.last_xid = active_xid
                
                # Zone change detection with debounce
                if zone != self.current_zone:
                    if zone:
                        # Entered a new zone
                        if self.current_zone is None:
                            # First zone entry - start debounce timer
                            self.zone_enter_time = now
                            self.current_zone = zone
                        elif (now - self.zone_enter_time) > DEBOUNCE_MS:
                            # Debounce passed, emit zone enter
                            self.current_zone = zone
                            self.zone_enter_time = now
                            self.emit({
                                'event': 'zone_enter',
                                'zone': zone,
                                'x': x,
                                'y': y,
                                'xid': hex(self.last_xid) if self.last_xid else None
                            })
                        else:
                            # Still debouncing, update potential zone
                            self.current_zone = zone
                    else:
                        # Left all zones
                        if self.current_zone:
                            self.emit({'event': 'zone_leave', 'x': x, 'y': y})
                        self.current_zone = None
                        self.zone_enter_time = 0
                elif zone and self.current_zone == zone and self.zone_enter_time > 0:
                    # Still in same zone - check if debounce passed
                    if (now - self.zone_enter_time) > DEBOUNCE_MS:
                        # Debounce passed, emit zone enter if not already emitted
                        self.emit({
                            'event': 'zone_enter',
                            'zone': zone,
                            'x': x,
                            'y': y,
                            'xid': hex(self.last_xid) if self.last_xid else None
                        })
                        self.zone_enter_time = 0  # Clear so we don't emit again
                        
            elif self.is_dragging:
                # Button released - drag ended
                zone = self.current_zone
                xid = self.last_xid
                
                self.is_dragging = False
                self.current_zone = None
                self.zone_enter_time = 0
                self.last_xid = None
                
                if zone:
                    # Released in a snap zone - apply the snap!
                    self.emit({
                        'event': 'snap_apply',
                        'zone': zone,
                        'xid': hex(xid) if xid else None
                    })
                else:
                    self.emit({'event': 'drag_end'})
                    
        except Exception as e:
            self.emit({'event': 'error', 'message': str(e)})
    
    def run(self):
        """Main loop - continuously poll and emit events"""
        self.log(f"Started. Screen: {self.screen_width}x{self.screen_height}, Protected: {[hex(x) for x in self.protected_xids]}")
        
        while self.running:
            self.poll()
            time.sleep(POLL_INTERVAL_MS / 1000.0)
    
    def stop(self):
        """Stop the detector gracefully"""
        self.running = False


def main():
    parser = argparse.ArgumentParser(description='X11 Snap Layout Detector (Windows 11 Style)')
    parser.add_argument('--protected', nargs='*', default=[], 
                        help='Protected window XIDs that should be ignored (hex, e.g., 0x1a00003)')
    args = parser.parse_args()
    
    detector = SnapDetector(protected_xids=args.protected)
    
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        detector.log("Shutting down...")
        detector.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        detector.run()
    except KeyboardInterrupt:
        detector.stop()


if __name__ == '__main__':
    main()
