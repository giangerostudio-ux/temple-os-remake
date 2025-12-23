#!/bin/bash
# TempleOS Gaming Stack Setup
# Installs Flatpak, Flathub, and Steam for optimal Linux gaming experience

set -e

echo "🎮 TempleOS Gaming Stack Setup"
echo "================================"
echo ""

# Check if running with appropriate privileges
if [[ $EUID -eq 0 ]]; then
   echo "❌ Do not run this script as root. Run as normal user."
   echo "   The script will ask for sudo password when needed."
   exit 1
fi

# 1. Install GameMode (performance optimization for games)
echo "📦 Installing GameMode..."
sudo apt update
sudo apt install -y gamemode
echo "✅ GameMode installed"
echo ""

# 2. Install Flatpak
echo "📦 Installing Flatpak..."
if command -v flatpak &> /dev/null; then
    echo "⏭️  Flatpak already installed, skipping"
else
    sudo apt install -y flatpak
    echo "✅ Flatpak installed"
fi
echo ""

# 3. Add Flathub repository
echo "🌐 Adding Flathub repository..."
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
echo "✅ Flathub repository added"
echo ""

# 4. Install Steam via Flatpak
echo "🎮 Installing Steam (Flatpak)..."
if flatpak list | grep -q "com.valvesoftware.Steam"; then
    echo "⏭️  Steam already installed, skipping"
else
    flatpak install -y flathub com.valvesoftware.Steam
    echo "✅ Steam installed"
fi
echo ""

# 5. Summary
echo "✨ Gaming Stack Setup Complete!"
echo ""
echo "Installed:"
echo "  ✅ GameMode (gamemoderun)"
echo "  ✅ Flatpak"
echo "  ✅ Flathub repository"
echo "  ✅ Steam (Flatpak)"
echo ""
echo "📝 Notes:"
echo "  • Launch Steam from Start Menu or run: flatpak run com.valvesoftware.Steam"
echo "  • Flatpak Steam has better UI compatibility than Snap version"
echo "  • Proton is managed automatically inside Steam settings"
echo ""
echo "🎯 Optional: Install additional launchers:"
echo "  • Heroic Games Launcher: flatpak install flathub com.heroicgameslauncher.hgl"
echo "  • Lutris: sudo snap install lutris"
echo "  • Bottles: flatpak install flathub com.usebottles.bottles"
echo ""
