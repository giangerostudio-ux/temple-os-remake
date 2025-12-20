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

# Allow X11 access for all local apps including snaps
xhost +local: 2>/dev/null || true

# Start TempleOS Electron app
exec /opt/templeos/node_modules/.bin/electron /opt/templeos
