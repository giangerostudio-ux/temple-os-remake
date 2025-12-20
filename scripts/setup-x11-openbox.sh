#!/usr/bin/env bash
set -euo pipefail

# TempleOS: X11 + Openbox bootstrap for Ubuntu Server minimal.
#
# Safe-by-default behavior:
# - Installs required packages for Xorg + Openbox + EWMH bridge tooling
# - Writes ~/.xinitrc (backs up if it already exists)
# - Does NOT change autologin or systemd by default
#
# Usage:
#   ./scripts/setup-x11-openbox.sh [/opt/templeos]

APP_DIR="${1:-/opt/templeos}"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script must be run on Linux."
  exit 1
fi

echo "[1/4] Installing X11/Openbox prerequisites..."
sudo apt-get update
sudo apt-get install -y \
  xorg xinit openbox \
  wmctrl x11-utils x11-xserver-utils

echo "[2/4] Writing ~/.xinitrc (with backup)..."
XINITRC="${HOME}/.xinitrc"
if [[ -f "${XINITRC}" ]]; then
  cp -a "${XINITRC}" "${XINITRC}.bak.$(date +%s)"
fi

cat > "${XINITRC}" <<EOF
#!/bin/sh
set -e

# Start the window manager
openbox-session &

# Start the TempleOS Electron shell
export TEMPLE_X11_DESKTOP_HINTS=0
exec "${APP_DIR}/node_modules/.bin/electron" "${APP_DIR}"
EOF
chmod +x "${XINITRC}"

echo "[3/4] Creating Openbox autostart (optional nice-to-haves)..."
mkdir -p "${HOME}/.config/openbox"
AUTOSTART="${HOME}/.config/openbox/autostart"
if [[ -f "${AUTOSTART}" ]]; then
  cp -a "${AUTOSTART}" "${AUTOSTART}.bak.$(date +%s)"
fi

cat > "${AUTOSTART}" <<'EOF'
# Openbox autostart for TempleOS
# Keep this minimal; add compositing later if you need it.

# Example: set a background (optional)
# xsetroot -solid "#000000" &

# Power management / blanking defaults (optional)
xset s off &
xset -dpms &

EOF

echo "[4/4] Done."
echo
echo "Next:"
echo "  - Reboot to a TTY, then run: startx"
echo "  - In a GUI terminal, verify: echo \"XDG_SESSION_TYPE=\$XDG_SESSION_TYPE DISPLAY=\$DISPLAY WAYLAND_DISPLAY=\$WAYLAND_DISPLAY\""
echo "  - Install apps with apt/snap and confirm they appear in the panel launcher search."

