#!/bin/sh
# TempleOS Session Start Script
# This script is launched by LightDM for the TempleOS session

# Ensure Openbox doesn't hijack Win-key shortcuts or trigger "Show Desktop" (which iconifies X11 apps).
# We base this off the system rc.xml and patch out the problematic bindings once per user.
OPENBOX_DIR="${HOME}/.config/openbox"
OPENBOX_RC="${OPENBOX_DIR}/rc.xml"
OPENBOX_MARKER="${OPENBOX_DIR}/.templeos-openbox-patched"
OPENBOX_MARKER_VER="templeos-openbox-patched-v2"
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
# If the config is empty or malformed, re-seed/patch it (Openbox will error on "Document is empty").
if [ ! -s "${OPENBOX_RC}" ] || ! grep -q "<openbox_config" "${OPENBOX_RC}" 2>/dev/null; then
  rm -f "${OPENBOX_MARKER}" 2>/dev/null || true
fi
if [ ! -f "${OPENBOX_MARKER}" ] || ! grep -q "${OPENBOX_MARKER_VER}" "${OPENBOX_MARKER}" 2>/dev/null; then
  /usr/bin/env python3 /opt/templeos/scripts/patch-openbox-rcxml.py "${OPENBOX_RC}" 2>/dev/null || true
  printf "%s\n" "${OPENBOX_MARKER_VER}" > "${OPENBOX_MARKER}" 2>/dev/null || true
fi

# Start Openbox window manager
openbox --sm-disable --config-file "${OPENBOX_RC}" &

# Wait for Openbox to initialize
sleep 0.3

# CRITICAL: Disable Openbox's virtual desktops to prevent black screen issues.
# The Electron shell uses its OWN virtual workspace system (minimize/show windows).
# Using wmctrl desktop switching causes the Electron shell to "disappear".
wmctrl -n 1 2>/dev/null || true

# Allow X11 access for all local apps including snaps
xhost +local: 2>/dev/null || true

# CRITICAL: Force GTK3/4 apps (like Firefox) to use system borders (Openbox)
# instead of drawing their own ugly client-side headers.
export MOZ_GTK_TITLEBAR_DECORATION=system
export GTK_CSD=0

# CRITICAL: Force 1024x768 resolution (VirtualBox stability fix)
# VirtualBox sometimes boots at 800x600 depending on Guest Additions state
RESOLUTION_SCRIPT="/opt/templeos/scripts/set-boot-resolution.sh"
if [ -f "${RESOLUTION_SCRIPT}" ]; then
  bash "${RESOLUTION_SCRIPT}" 2>/dev/null || true
else
  # Fallback inline enforcement
  DISPLAY_OUTPUT=$(xrandr | grep " connected" | cut -d " " -f1 | head -n 1)
  if [ -n "${DISPLAY_OUTPUT}" ]; then
    xrandr --output "${DISPLAY_OUTPUT}" --mode 1024x768 2>/dev/null || true
    echo "[TempleOS Boot] Forced 1024x768 resolution on ${DISPLAY_OUTPUT}"
  fi
fi

# Start keybind daemon (evdev-based global hotkeys that bypass X11 grabs)
# This MUST run before Electron so the daemon can capture keypresses
KEYBIND_DAEMON="/opt/templeos/scripts/keybind-daemon.py"
KEYBIND_SOCKET="/tmp/templeos-keybind.sock"
if [ -f "${KEYBIND_DAEMON}" ]; then
  # Kill any existing daemon
  pkill -f keybind-daemon.py 2>/dev/null || true
  rm -f "${KEYBIND_SOCKET}" 2>/dev/null || true
  
  # Start daemon with socket mode
  python3 "${KEYBIND_DAEMON}" --socket "${KEYBIND_SOCKET}" &
  KEYBIND_PID=$!
  echo "[TempleOS] Started keybind daemon (PID: ${KEYBIND_PID})"
  
  # Give daemon time to create socket
  sleep 0.3
fi

# Start TempleOS Electron app
exec /opt/templeos/node_modules/.bin/electron /opt/templeos
