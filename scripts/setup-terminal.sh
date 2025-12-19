#!/bin/bash
# ============================================
# TempleOS Remake - Terminal Setup Script
# ============================================
# This script installs the dependencies needed for
# the real PTY terminal (sudo, interactive commands, etc.)
#
# Run this ONCE after installing the OS:
#   chmod +x scripts/setup-terminal.sh
#   ./scripts/setup-terminal.sh
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           ✝ TempleOS Terminal Setup ✝                      ║"
echo "║         Installing Real Terminal Support                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root (we need sudo for apt)
if [ "$EUID" -eq 0 ]; then
    SUDO=""
else
    SUDO="sudo"
fi

echo "[1/4] Updating package lists..."
$SUDO apt-get update -qq

echo "[2/4] Installing build tools for node-pty..."
$SUDO apt-get install -y build-essential python3 make g++

echo "[3/4] Installing node-pty native module..."
cd "$(dirname "$0")/.."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found. Please install Node.js first."
    exit 1
fi

# Rebuild node-pty specifically for this system
npm rebuild node-pty || {
    echo ""
    echo "node-pty rebuild failed. Trying fresh install..."
    npm install node-pty --save-optional
}

echo "[4/4] Verifying installation..."
node -e "try { require('node-pty'); console.log('✓ node-pty loaded successfully!'); } catch(e) { console.log('✗ node-pty failed:', e.message); process.exit(1); }"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ✓ Terminal Setup Complete!                         ║"
echo "║                                                             ║"
echo "║  Restart the application to enable the real terminal.      ║"
echo "║  You can now use sudo, interactive commands, and more!     ║"
echo "╚════════════════════════════════════════════════════════════╝"
