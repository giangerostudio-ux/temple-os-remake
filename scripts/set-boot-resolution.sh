#!/bin/bash
# TempleOS Remake - Resolution Boot Fixer
# Ensures 1024x768 resolution is set on boot for VirtualBox stability

# Get the primary display output name
DISPLAY_OUTPUT=$(xrandr | grep " connected" | cut -d " " -f1 | head -n 1)

if [ -z "$DISPLAY_OUTPUT" ]; then
    echo "[TempleOS Boot] Error: No display detected"
    exit 1
fi

echo "[TempleOS Boot] Display detected: $DISPLAY_OUTPUT"

# Force 1024x768 resolution
xrandr --output "$DISPLAY_OUTPUT" --mode 1024x768 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[TempleOS Boot] ✅ Successfully set 1024x768 resolution"
else
    echo "[TempleOS Boot] ⚠️  Failed to set resolution (trying fallback...)"
    # Fallback: Try to add the mode if it doesn't exist
    xrandr --newmode "1024x768_60.00"  65.00  1024 1048 1184 1344  768 771 777 806 -hsync +vsync 2>/dev/null
    xrandr --addmode "$DISPLAY_OUTPUT" 1024x768_60.00 2>/dev/null
    xrandr --output "$DISPLAY_OUTPUT" --mode 1024x768_60.00 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "[TempleOS Boot] ✅ Successfully set 1024x768 using fallback mode"
    else
        echo "[TempleOS Boot] ❌ Resolution enforcement failed - VirtualBox Guest Additions may not be installed"
    fi
fi
