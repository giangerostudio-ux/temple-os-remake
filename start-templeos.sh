#!/bin/sh
# TempleOS Session Start Script
# This script is launched by LightDM for the TempleOS session

# Ensure Openbox doesn't hijack Win-key shortcuts or trigger "Show Desktop" (which iconifies X11 apps).
# We base this off the system rc.xml and patch out the problematic bindings once per user.
OPENBOX_DIR="${HOME}/.config/openbox"
OPENBOX_RC="${OPENBOX_DIR}/rc.xml"
OPENBOX_MARKER="${OPENBOX_DIR}/.templeos-openbox-patched"
mkdir -p "${OPENBOX_DIR}" 2>/dev/null || true
if [ ! -f "${OPENBOX_RC}" ]; then
  if [ -f "/etc/xdg/openbox/rc.xml" ]; then
    cp -a "/etc/xdg/openbox/rc.xml" "${OPENBOX_RC}" 2>/dev/null || true
  elif [ -f "/etc/xdg/openbox/rc.xml.in" ]; then
    cp -a "/etc/xdg/openbox/rc.xml.in" "${OPENBOX_RC}" 2>/dev/null || true
  else
    : > "${OPENBOX_RC}"
  fi
fi
if [ ! -f "${OPENBOX_MARKER}" ]; then
  /usr/bin/env python3 /opt/templeos/scripts/patch-openbox-rcxml.py "${OPENBOX_RC}" 2>/dev/null || true
  : > "${OPENBOX_MARKER}"
fi

# Start Openbox window manager
openbox &

# Allow X11 access for all local apps including snaps
xhost +local: 2>/dev/null || true

# Start TempleOS Electron app
exec /opt/templeos/node_modules/.bin/electron /opt/templeos
