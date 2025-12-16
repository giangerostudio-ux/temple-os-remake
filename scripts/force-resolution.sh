#!/bin/bash

# Attempt to force 1920x1080 resolution
echo "Attempting to force 1920x1080 resolution..."

# Try using xrandr (X11)
if command -v xrandr &> /dev/null; then
    # Get the display name (e.g., Virtual1, VGA-1)
    DISP=$(xrandr | grep " connected" | cut -d ' ' -f1 | head -n 1)
    
    if [ -n "$DISP" ]; then
        echo "Detected display: $DISP"
        # Add new mode just in case
        xrandr --newmode "1920x1080_60.00"  173.00  1920 2048 2248 2576  1080 1083 1088 1120 -hsync +vsync 2>/dev/null
        xrandr --addmode $DISP 1920x1080_60.00 2>/dev/null
        
        # Apply
        xrandr --output $DISP --mode 1920x1080_60.00
        
        # Also try simpler build-in command if the above fails
        xrandr -s 1920x1080 2>/dev/null
        echo "Resolution command sent."
    else
        echo "No display detected via xrandr."
    fi
else
    echo "xrandr not found (Are you using Wayland?)"
fi
