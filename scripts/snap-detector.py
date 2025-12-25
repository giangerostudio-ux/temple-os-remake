#!/usr/bin/env python3
"""
X11 Snap Layout Detector - Windows 11 Style (v3 - Anti-Flicker)
================================================================
Polls XQueryPointer to detect drag-to-edge gestures in real-time.
Works even during window manager grabs (Openbox, etc.)

v3 Changes:
- STICKY ZONES: Once popup is shown, it stays until mouse leaves zone OR button released
- Track XID at drag START, don't re-check during drag (popup stealing focus doesn't break it)
- Longer hold requirement before emitting zone_enter (200ms hold)
- Only emit zone_leave if button still held AND mouse far from zone

Usage:
    python3 snap-detector.py --protected 0x1a00003 0x1b00004
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

# Configuration - ANTI-FLICKER TUNED
POLL_INTERVAL_MS = 25        # Fast polling for responsiveness
TOP_TRIGGER_ZONE = 250       # LARGE zone from top for snap layouts menu (user requested)
EDGE_TRIGGER_ZONE = 40       # pixels from left/right edge
CORNER_TRIGGER_ZONE = 70     # pixels from corner

# Anti-flicker: require holding in zone before triggering
HOLD_TIME_TOP_MS = 200       # Hold 200ms at top before popup
HOLD_TIME_EDGE_MS = 100      # Hold 100ms at edges before preview

# Anti-flicker: hysteresis - must move this far OUT of zone before zone_leave
HYSTERESIS_PIXELS = 30
TOP_HYSTERESIS_PIXELS = 60   # Larger hysteresis for top zone (popup is more important)

# Anti-flicker: grace period for re-entering same zone (skip hold time)
REENTER_GRACE_MS = 500

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
        self.drag_xid = None           # XID captured at drag START - doesn't change
        self.current_zone = None       # Current zone mouse is in
        self.zone_enter_time = 0       # When mouse entered current zone
        self.zone_activated = False    # True if we've emitted zone_enter for current zone
        self.last_activated_zone = None  # Track last zone for grace period re-entry
        self.last_zone_leave_time = 0    # When we left an activated zone
        self.running = True
        
        # EWMH atoms
        self._NET_ACTIVE_WINDOW = self.display.intern_atom('_NET_ACTIVE_WINDOW')
        
    def log(self, message):
        """Debug logging to stderr"""
        print(f"[SnapDetector] {message}", file=sys.stderr, flush=True)
        
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
        # Top zone has highest priority
        if y < TOP_TRIGGER_ZONE:
            # Very top = always snap layouts menu
            if y < 40:
                return 'top'
            # Corners in the 40-100px range
            if x < CORNER_TRIGGER_ZONE:
                return 'topleft'
            elif x > self.screen_width - CORNER_TRIGGER_ZONE:
                return 'topright'
            else:
                return 'top'
        
        # Bottom corners
        if y > self.screen_height - CORNER_TRIGGER_ZONE:
            if x < CORNER_TRIGGER_ZONE:
                return 'bottomleft'
            elif x > self.screen_width - CORNER_TRIGGER_ZONE:
                return 'bottomright'
        
        # Side edges
        if x < EDGE_TRIGGER_ZONE:
            return 'left'
        elif x > self.screen_width - EDGE_TRIGGER_ZONE:
            return 'right'
        
        return None
    
    def get_zone_with_hysteresis(self, x, y):
        """
        Get zone with hysteresis - if we're already activated in a zone,
        we stay in that zone until mouse moves HYSTERESIS_PIXELS outside it.
        This prevents flickering.
        """
        actual_zone = self.get_zone(x, y)
        
        # If no active zone, return actual zone
        if not self.zone_activated:
            return actual_zone
        
        # If we have an active zone, check if we're still "close enough" to it
        # Use larger hysteresis for top zone since the popup is more important
        if self.current_zone == 'top':
            if y < TOP_TRIGGER_ZONE + TOP_HYSTERESIS_PIXELS:
                return 'top'  # Still counts as top
        elif self.current_zone == 'left':
            if x < EDGE_TRIGGER_ZONE + HYSTERESIS_PIXELS:
                return 'left'
        elif self.current_zone == 'right':
            if x > self.screen_width - EDGE_TRIGGER_ZONE - HYSTERESIS_PIXELS:
                return 'right'
        elif self.current_zone in ('topleft', 'topright', 'bottomleft', 'bottomright'):
            # For corners, check both x and y
            if y < TOP_TRIGGER_ZONE + HYSTERESIS_PIXELS or y > self.screen_height - CORNER_TRIGGER_ZONE - HYSTERESIS_PIXELS:
                if x < CORNER_TRIGGER_ZONE + HYSTERESIS_PIXELS or x > self.screen_width - CORNER_TRIGGER_ZONE - HYSTERESIS_PIXELS:
                    return self.current_zone
        
        return actual_zone
    
    def emit(self, event_data):
        """Output a JSON event to stdout"""
        print(json.dumps(event_data), flush=True)
    
    def poll(self):
        """Single poll iteration - check mouse state and emit events"""
        try:
            result = self.root.query_pointer()
            
            x = result.root_x
            y = result.root_y
            button1_held = self.is_button1_pressed(result.mask)
            
            now = time.time() * 1000
            
            # === BUTTON PRESSED ===
            if button1_held:
                if not self.is_dragging:
                    # Drag just started - capture the XID NOW and KEEP IT
                    active_xid = self.get_active_window_xid()
                    
                    # Check if it's a protected window
                    if active_xid and active_xid not in self.protected_xids:
                        self.is_dragging = True
                        self.drag_xid = active_xid  # LOCKED for entire drag
                        self.current_zone = None
                        self.zone_enter_time = 0
                        self.zone_activated = False
                        self.log(f"Drag started, locked xid={hex(active_xid)}")
                    else:
                        # Protected window or no window - ignore
                        return
                
                # We're dragging - check zones
                if not self.is_dragging:
                    return
                
                # Use hysteresis for zone detection (prevents flickering)
                zone = self.get_zone_with_hysteresis(x, y)
                
                # Zone changed?
                if zone != self.current_zone:
                    # Left previous zone
                    if self.current_zone and self.zone_activated:
                        self.emit({'event': 'zone_leave', 'x': x, 'y': y})
                        self.last_activated_zone = self.current_zone
                        self.last_zone_leave_time = now
                        self.log(f"Left zone: {self.current_zone}")
                    
                    # Entered new zone
                    self.current_zone = zone
                    self.zone_enter_time = now if zone else 0
                    self.zone_activated = False
                    
                    # Check if re-entering a zone within grace period (skip hold time)
                    if zone and zone == self.last_activated_zone:
                        time_since_leave = now - self.last_zone_leave_time
                        if time_since_leave < REENTER_GRACE_MS:
                            # Immediate re-activation! No hold time needed.
                            self.zone_activated = True
                            self.emit({
                                'event': 'zone_enter',
                                'zone': zone,
                                'x': x,
                                'y': y,
                                'xid': hex(self.drag_xid) if self.drag_xid else None
                            })
                            self.log(f"Zone RE-ACTIVATED (grace period): {zone}")
                    
                    if zone and not self.zone_activated:
                        self.log(f"Entered zone: {zone} (will activate after hold)")
                
                # Check if we should activate the zone (held long enough)
                if zone and not self.zone_activated and self.zone_enter_time > 0:
                    hold_time = now - self.zone_enter_time
                    required_hold = HOLD_TIME_TOP_MS if zone == 'top' else HOLD_TIME_EDGE_MS
                    
                    if hold_time >= required_hold:
                        self.zone_activated = True
                        self.emit({
                            'event': 'zone_enter',
                            'zone': zone,
                            'x': x,
                            'y': y,
                            'xid': hex(self.drag_xid) if self.drag_xid else None
                        })
                        self.log(f"Zone activated: {zone}")
                
                # Stream mouse position while in activated top zone (for popup highlighting)
                if zone == 'top' and self.zone_activated:
                    self.emit({
                        'event': 'drag_position',
                        'x': x,
                        'y': y,
                        'xid': hex(self.drag_xid) if self.drag_xid else None
                    })
            
            # === BUTTON RELEASED ===
            elif self.is_dragging:
                zone = self.current_zone
                xid = self.drag_xid
                activated = self.zone_activated
                
                # Reset state
                self.is_dragging = False
                self.drag_xid = None
                self.current_zone = None
                self.zone_enter_time = 0
                self.zone_activated = False
                
                if zone and activated:
                    # Released in an ACTIVATED zone - apply snap!
                    # Query current mouse position for popup hit detection
                    result = self.root.query_pointer()
                    self.emit({
                        'event': 'snap_apply',
                        'zone': zone,
                        'x': result.root_x,
                        'y': result.root_y,
                        'xid': hex(xid) if xid else None
                    })
                    self.log(f"Snap apply: {zone} at ({result.root_x}, {result.root_y}) to {hex(xid) if xid else 'unknown'}")
                else:
                    self.emit({'event': 'drag_end'})
                    self.log("Drag ended (no activated zone)")
                    
        except Exception as e:
            self.emit({'event': 'error', 'message': str(e)})
            self.log(f"Error: {e}")
    
    def run(self):
        """Main loop"""
        self.log(f"Started v4 (anti-flicker + grace period). Screen: {self.screen_width}x{self.screen_height}")
        self.log(f"Top zone: {TOP_TRIGGER_ZONE}px, Hold time: {HOLD_TIME_TOP_MS}ms, Hysteresis: {HYSTERESIS_PIXELS}px (top: {TOP_HYSTERESIS_PIXELS}px)")
        self.log(f"Re-entry grace period: {REENTER_GRACE_MS}ms")
        self.log(f"Protected XIDs: {[hex(x) for x in self.protected_xids]}")
        
        while self.running:
            self.poll()
            time.sleep(POLL_INTERVAL_MS / 1000.0)
    
    def stop(self):
        """Stop the detector gracefully"""
        self.running = False


def main():
    parser = argparse.ArgumentParser(description='X11 Snap Layout Detector v4 (Anti-Flicker + Grace Period)')
    parser.add_argument('--protected', nargs='*', default=[], 
                        help='Protected window XIDs to ignore (hex, e.g., 0x1a00003)')
    args = parser.parse_args()
    
    detector = SnapDetector(protected_xids=args.protected)
    
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
