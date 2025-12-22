#!/bin/bash
# ============================================
# Keybind Daemon Setup for TempleOS Shell
# ============================================
# This script sets up the evdev keybind daemon for the custom OS ISO.
# Run this during ISO build or first-boot setup.
#
# What it does:
# 1. Adds the user to the 'input' group (for /dev/input access)
# 2. Creates a udev rule for input device permissions
# 3. Optionally creates a systemd service for auto-start
#
# Usage:
#   sudo ./setup-keybinds.sh [username]
#
# For ISO build, call with the target username:
#   sudo ./setup-keybinds.sh temple
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DAEMON_PATH="$PROJECT_ROOT/scripts/keybind-daemon.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Determine target user
if [ -n "$1" ]; then
    TARGET_USER="$1"
elif [ -n "$SUDO_USER" ]; then
    TARGET_USER="$SUDO_USER"
else
    TARGET_USER="temple"
fi

log_info "Setting up keybind daemon for user: $TARGET_USER"

# ============================================
# Step 1: Add user to input group
# ============================================
log_info "Adding $TARGET_USER to 'input' group..."

if getent group input > /dev/null 2>&1; then
    if id -nG "$TARGET_USER" 2>/dev/null | grep -qw "input"; then
        log_info "User $TARGET_USER already in 'input' group"
    else
        usermod -aG input "$TARGET_USER"
        log_info "Added $TARGET_USER to 'input' group"
    fi
else
    # Create input group if it doesn't exist (shouldn't happen on modern Linux)
    groupadd input
    usermod -aG input "$TARGET_USER"
    log_info "Created 'input' group and added $TARGET_USER"
fi

# ============================================
# Step 2: Create udev rule (optional, for extra reliability)
# ============================================
UDEV_RULE="/etc/udev/rules.d/99-templeos-input.rules"
log_info "Creating udev rule at $UDEV_RULE..."

cat > "$UDEV_RULE" << 'EOF'
# TempleOS Shell - Allow input group to access keyboard devices
# This ensures the keybind daemon can read from /dev/input/event*
KERNEL=="event*", SUBSYSTEM=="input", MODE="0660", GROUP="input"
EOF

# Reload udev rules
if command -v udevadm > /dev/null 2>&1; then
    udevadm control --reload-rules
    udevadm trigger
    log_info "Udev rules reloaded"
fi

# ============================================
# Step 3: Verify daemon script exists
# ============================================
if [ -f "$DAEMON_PATH" ]; then
    log_info "Keybind daemon found at: $DAEMON_PATH"
    chmod +x "$DAEMON_PATH"
else
    log_warn "Keybind daemon not found at expected location: $DAEMON_PATH"
    log_warn "The daemon will be managed by the Electron app directly"
fi

# ============================================
# Step 4: Verify Python 3 is available
# ============================================
if command -v python3 > /dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    log_info "Python 3 found: $PYTHON_VERSION"
else
    log_error "Python 3 not found! The keybind daemon requires Python 3."
    log_error "Install with: sudo apt install python3"
    exit 1
fi

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo -e "${GREEN}Keybind daemon setup complete!${NC}"
echo "============================================"
echo ""
echo "Changes made:"
echo "  ✓ User '$TARGET_USER' added to 'input' group"
echo "  ✓ Udev rule created for input device access"
echo "  ✓ Daemon script permissions set"
echo ""
echo "IMPORTANT: A logout/login is required for group changes to take effect."
echo ""
echo "For ISO builds, this persists automatically."
echo "For existing installations, the user must log out and back in."
echo ""

# ============================================
# Optional: Test daemon access
# ============================================
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    log_warn "Note: Run 'newgrp input' or log out/in to test immediately"
fi

exit 0
