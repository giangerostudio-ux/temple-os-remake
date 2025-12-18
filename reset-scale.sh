#!/bin/bash
# Quick fix script to reset display scale in TempleOS config

CONFIG_FILE="$HOME/.config/templeos/config.json"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Config file not found at $CONFIG_FILE"
    echo "Trying alternative location..."
    CONFIG_FILE="$HOME/temple-os-remake/config.json"
fi

if [ -f "$CONFIG_FILE" ]; then
    echo "Found config at: $CONFIG_FILE"
    echo "Creating backup..."
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
    
    # Remove display scale settings using sed
    # This will reset your display back to normal
    sed -i 's/"scale":[^,}]*/"scale":1.0/g' "$CONFIG_FILE"
    
    echo "✅ Display scale reset to 1.0 (100%)"
    echo "Restart your TempleOS app now!"
else
    echo "❌ Config file not found!"
    echo "Just delete any config file you find and restart the app."
fi
