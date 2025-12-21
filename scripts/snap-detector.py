#!/usr/bin/env python3
"""
X11 Snap Layout Detector - Windows 11 Style (v2)
=================================================
Polls XQueryPointer to detect drag-to-edge gestures in real-time.
Works even during window manager grabs (Openbox, etc.)

v2 Changes:
- Increased top trigger zone (120px)
- Removed debounce for top zone (immediate response)
- Fixed corner/top zone priority conflict
- Better state machine for consistent detection

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

# Configuration - TUNED FOR RESPONSIVENESS
POLL_INTERVAL_MS = 30        # 30ms = ~33fps for snappy response
TOP_TRIGGER_ZONE = 120       # LARGE zone for top (snap layouts menu) - 120px
EDGE_TRIGGER_ZONE = 40       # pixels from left/right edge for direct snap
CORNER_TRIGGER_ZONE = 80     # pixels from corner for quadrant snap (but NOT at very top)
DEBOUNCE_MS = 80             # shorter debounce for quicker response

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
        self.zone_emitted = False  # Track if we've emitted zone_enter for current zone
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
        
        # TOP ZONE HAS HIGHEST PRIORITY (for snap layouts menu)
        # This ensures dragging to top always shows the layouts menu
        if y < TOP_TRIGGER_ZONE:
            # Only check corners if we're in the corner area
            # But top edge takes priority in the very top 50px
            if y < 50:
                return 'top'  # Very top - always snap layouts menu
            
            # In the 50-120px range, corners can take over
            if x < CORNER_TRIGGER_ZONE:
                return 'topleft'
            elif x > self.screen_width - CORNER_TRIGGER_ZONE:
                return 'topright'
            else:
                return 'top'  # Middle of top area
        
        # Bottom corners
        if y > self.screen_height - CORNER_TRIGGER_ZONE:
            if x < CORNER_TRIGGER_ZONE:
                return 'bottomleft'
            elif x > self.screen_width - CORNER_TRIGGER_ZONE:
                return 'bottomright'
        
        # Side edges - only if not in corner zones
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
                    self.zone_emitted = False
                    self.last_xid = active_xid
                    self.log(f"Drag started, xid={hex(active_xid)}")
                
                # Zone change detection
                if zone != self.current_zone:
                    # Left old zone
                    if self.current_zone and self.zone_emitted:
                        self.emit({'event': 'zone_leave', 'x': x, 'y': y})
                        self.log(f"Left zone: {self.current_zone}")
                    
                    # Enter new zone
                    self.current_zone = zone
                    self.zone_enter_time = now
                    self.zone_emitted = False
                    
                    if zone:
                        self.log(f"Entered zone: {zone} at ({x}, {y})")
                
                # Debounce check - emit zone_enter after staying in zone
                if zone and not self.zone_emitted:
                    time_in_zone = now - self.zone_enter_time
                    
                    # TOP zone gets NO debounce - instant popup
                    # Other zones get short debounce
                    debounce_for_zone = 0 if zone == 'top' else DEBOUNCE_MS
                    
                    if time_in_zone >= debounce_for_zone:
                        self.zone_emitted = True
                        self.emit({
                            'event': 'zone_enter',
                            'zone': zone,
                            'x': x,
                            'y': y,
                            'xid': hex(self.last_xid) if self.last_xid else None
                        })
                        self.log(f"Emitted zone_enter: {zone}")
                        
            elif self.is_dragging:
                # Button released - drag ended
                zone = self.current_zone
                xid = self.last_xid
                emitted = self.zone_emitted
                
                self.is_dragging = False
                self.current_zone = None
                self.zone_enter_time = 0
                self.zone_emitted = False
                self.last_xid = None
                
                if zone and emitted:
                    # Released in a snap zone that was already active
                    self.emit({
                        'event': 'snap_apply',
                        'zone': zone,
                        'xid': hex(xid) if xid else None
                    })
                    self.log(f"Snap apply: {zone} to {hex(xid) if xid else 'unknown'}")
                else:
                    self.emit({'event': 'drag_end'})
                    self.log("Drag ended (no zone)")
                    
        except Exception as e:
            self.emit({'event': 'error', 'message': str(e)})
            self.log(f"Error: {e}")
    
    def run(self):
        """Main loop - continuously poll and emit events"""
        self.log(f"Started v2. Screen: {self.screen_width}x{self.screen_height}")
        self.log(f"Top zone: {TOP_TRIGGER_ZONE}px, Edge: {EDGE_TRIGGER_ZONE}px, Corner: {CORNER_TRIGGER_ZONE}px")
        self.log(f"Protected XIDs: {[hex(x) for x in self.protected_xids]}")
        
        while self.running:
            self.poll()
            time.sleep(POLL_INTERVAL_MS / 1000.0)
    
    def stop(self):
        """Stop the detector gracefully"""
        self.running = False


def main():
    parser = argparse.ArgumentParser(description='X11 Snap Layout Detector v2 (Windows 11 Style)')
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
