#!/bin/sh
# TempleOS Session Start Script
# This script is launched by LightDM for the TempleOS session

# Start Openbox window manager
openbox &

# Allow X11 access for all local apps including snaps
xhost +local: 2>/dev/null || true

# Start TempleOS Electron app
exec /opt/templeos/node_modules/.bin/electron /opt/templeos
