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
  wmctrl x11-utils x11-xserver-utils xdotool \
  curl  # Needed for Ollama install

# Install Ollama for Word of God AI
echo "[1.5/4] Installing Ollama for Word of God AI..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/setup-ollama.sh" ]]; then
  bash "${SCRIPT_DIR}/setup-ollama.sh"
elif [[ -f "${APP_DIR}/scripts/setup-ollama.sh" ]]; then
  bash "${APP_DIR}/scripts/setup-ollama.sh"
else
  # Inline install if script not found
  if ! command -v ollama &> /dev/null; then
    echo "    Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    sudo systemctl enable ollama 2>/dev/null || true
    sudo systemctl start ollama 2>/dev/null || true
  fi
fi

echo "[2/4] Writing ~/.xinitrc (with backup)..."
XINITRC="${HOME}/.xinitrc"
if [[ -f "${XINITRC}" ]]; then
  cp -a "${XINITRC}" "${XINITRC}.bak.$(date +%s)"
fi

cat > "${XINITRC}" <<EOF
#!/bin/sh
set -e

# Start the window manager
openbox --sm-disable --config-file "${HOME}/.config/openbox/rc.xml" &

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

echo "[4/5] Writing Openbox rc.xml (disable Show Desktop + Win key binds)..."
RC_DIR="${HOME}/.config/openbox"
RC_XML="${RC_DIR}/rc.xml"
mkdir -p "${RC_DIR}"
if [[ -f "${RC_XML}" ]]; then
  cp -a "${RC_XML}" "${RC_XML}.bak.$(date +%s)"
else
  if [[ -f "/etc/xdg/openbox/rc.xml" ]]; then
    cp -a "/etc/xdg/openbox/rc.xml" "${RC_XML}"
  elif [[ -f "/etc/xdg/openbox/rc.xml.in" ]]; then
    cp -a "/etc/xdg/openbox/rc.xml.in" "${RC_XML}"
  else
    echo "WARN: Could not find /etc/xdg/openbox/rc.xml to base config on."
    touch "${RC_XML}"
  fi
fi

python3 "${APP_DIR}/scripts/patch-openbox-rcxml.py" "${RC_XML}" || true

echo "[5/5] Done."
echo
echo "Next:"
echo "  - Reboot to a TTY, then run: startx"
echo "  - In a GUI terminal, verify: echo \"XDG_SESSION_TYPE=\$XDG_SESSION_TYPE DISPLAY=\$DISPLAY WAYLAND_DISPLAY=\$WAYLAND_DISPLAY\""
echo "  - Install apps with apt/snap and confirm they appear in the panel launcher search."
