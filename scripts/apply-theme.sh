#!/bin/bash
# Apply TempleOS Divine Theme to Openbox
# This script installs the theme and updates rc.xml

THEME_NAME="TempleOS-Divine"
SOURCE_DIR="$(dirname "$0")/../themes/$THEME_NAME"
DEST_DIR="$HOME/.local/share/themes/$THEME_NAME"
RC_XML="$HOME/.config/openbox/rc.xml"

# Enhance error handling
set -e

echo "[Divine Theme] Installing $THEME_NAME..."

# 1. Install Theme
mkdir -p "$HOME/.local/share/themes"
rm -rf "$DEST_DIR"
cp -r "$SOURCE_DIR" "$DEST_DIR"
echo "[Divine Theme] Theme copied to $DEST_DIR"

# 2. Update rc.xml to use the new theme
if [ -f "$RC_XML" ]; then
    # Use sed to replace the theme name in the <theme><name>...</name></theme> block
    # We look for the <theme> block and replace the content of <name> inside it.
    # This simple regex assumes standard formatting. A python script would be more robust but this is faster.
    
    # Backup first
    cp "$RC_XML" "$RC_XML.bak"
    
    # We use a temp file to avoid in-place race conditions or corruption
    # This sed command finds <name>...</name> specifically inside a <theme> block context if possible,
    # but for simplicity we'll just replace the first occurrence of <name>sometheme</name> after <theme>
    # Actually, simpler: Openbox rc.xml usually has <theme><name>Clearlooks</name>...
    
    # Update theme name using a python one-liner for XML safety
    python3 -c "
import xml.etree.ElementTree as ET
import os

rc_path = '$RC_XML'
tree = ET.parse(rc_path)
root = tree.getroot()

# Handle XML namespace if present (Openbox config usually has one)
# We can just search with the namespace, or strip it. 
# Let's try finding with namespace first, then without.
namespaces = {'ob': 'http://openbox.org/3.4/rc'}

def find_node(parent, tag):
    # Try with namespace
    node = parent.find('ob:' + tag, namespaces)
    if node is None:
        # Try without namespace
        node = parent.find(tag)
    return node

# Find theme/name node
theme_node = find_node(root, 'theme')
if theme_node is not None:
    name_node = find_node(theme_node, 'name')
    if name_node is not None:
        name_node.text = '$THEME_NAME'
        tree.write(rc_path)
        print('[Divine Theme] Updated rc.xml theme to $THEME_NAME')
    else:
        print('[Divine Theme] Error: <name> tag not found in <theme>')
else:
    print('[Divine Theme] Error: <theme> tag not found in rc.xml')
"
else
    echo "[Divine Theme] Warning: $RC_XML not found. Is Openbox installed?"
fi

# 3. Reconfigure Openbox to apply changes
if pgrep openbox > /dev/null; then
    openbox --reconfigure
    echo "[Divine Theme] Openbox reconfigured. Theme should be active."
else
    echo "[Divine Theme] Openbox is not running. Theme will apply on next start."
fi

echo "[Divine Theme] Done."
