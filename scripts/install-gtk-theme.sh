#!/bin/bash
# ============================================
# TEMPLEOS REMAKE - GTK THEME INSTALLER
# ============================================
# This script installs the Divine Cyberpunk GTK theme
# for GTK3 and GTK4 applications.
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEME_DIR="$SCRIPT_DIR/../themes"

# User config directories
GTK3_USER_DIR="$HOME/.config/gtk-3.0"
GTK4_USER_DIR="$HOME/.config/gtk-4.0"

# System theme directory (for ISO installation)
SYSTEM_THEME_DIR="/usr/share/themes/TempleOS-DivineCyberpunk"

echo "============================================"
echo " TempleOS Remake - GTK Theme Installer"
echo "============================================"
echo ""

install_user_theme() {
    echo "[1/4] Creating user config directories..."
    mkdir -p "$GTK3_USER_DIR"
    mkdir -p "$GTK4_USER_DIR"

    echo "[2/4] Installing GTK3 theme..."
    if [ -f "$THEME_DIR/gtk-3.0/gtk.css" ]; then
        cp "$THEME_DIR/gtk-3.0/gtk.css" "$GTK3_USER_DIR/gtk.css"
        echo "      ✓ Installed to $GTK3_USER_DIR/gtk.css"
    else
        echo "      ✗ GTK3 theme not found at $THEME_DIR/gtk-3.0/gtk.css"
    fi

    echo "[3/4] Installing GTK4 theme..."
    if [ -f "$THEME_DIR/gtk-4.0/gtk.css" ]; then
        cp "$THEME_DIR/gtk-4.0/gtk.css" "$GTK4_USER_DIR/gtk.css"
        echo "      ✓ Installed to $GTK4_USER_DIR/gtk.css"
    else
        echo "      ✗ GTK4 theme not found at $THEME_DIR/gtk-4.0/gtk.css"
    fi

    echo "[4/4] Setting GTK settings..."
    # Create/update GTK3 settings
    GTK3_SETTINGS="$GTK3_USER_DIR/settings.ini"
    if [ ! -f "$GTK3_SETTINGS" ]; then
        cat > "$GTK3_SETTINGS" << 'EOF'
[Settings]
gtk-application-prefer-dark-theme=1
gtk-theme-name=Adwaita-dark
gtk-icon-theme-name=Papirus-Dark
gtk-cursor-theme-name=Adwaita
gtk-font-name=Sans 11
gtk-decoration-layout=:minimize,maximize,close
EOF
        echo "      ✓ Created GTK3 settings.ini"
    else
        echo "      ⊘ GTK3 settings.ini already exists, skipping"
    fi

    echo ""
    echo "============================================"
    echo " ✓ User theme installation complete!"
    echo "============================================"
    echo ""
    echo "NOTE: You may need to restart running applications"
    echo "for the theme changes to take effect."
    echo ""
}

install_system_theme() {
    echo "Installing system-wide theme (requires sudo)..."
    
    sudo mkdir -p "$SYSTEM_THEME_DIR/gtk-3.0"
    sudo mkdir -p "$SYSTEM_THEME_DIR/gtk-4.0"
    
    if [ -f "$THEME_DIR/gtk-3.0/gtk.css" ]; then
        sudo cp "$THEME_DIR/gtk-3.0/gtk.css" "$SYSTEM_THEME_DIR/gtk-3.0/gtk.css"
        echo "✓ Installed GTK3 theme to $SYSTEM_THEME_DIR/gtk-3.0/"
    fi
    
    if [ -f "$THEME_DIR/gtk-4.0/gtk.css" ]; then
        sudo cp "$THEME_DIR/gtk-4.0/gtk.css" "$SYSTEM_THEME_DIR/gtk-4.0/gtk.css"
        echo "✓ Installed GTK4 theme to $SYSTEM_THEME_DIR/gtk-4.0/"
    fi

    # Create index.theme for theme selection
    sudo tee "$SYSTEM_THEME_DIR/index.theme" > /dev/null << 'EOF'
[Desktop Entry]
Type=X-GNOME-Metatheme
Name=TempleOS Divine Cyberpunk
Comment=Dark green cyberpunk theme for TempleOS Remake
Encoding=UTF-8

[X-GNOME-Metatheme]
GtkTheme=TempleOS-DivineCyberpunk
MetacityTheme=TempleOS-DivineCyberpunk
IconTheme=Papirus-Dark
CursorTheme=Adwaita
EOF
    
    echo "✓ System theme installation complete!"
}

# Parse arguments
case "${1:-user}" in
    user)
        install_user_theme
        ;;
    system)
        install_user_theme
        install_system_theme
        ;;
    *)
        echo "Usage: $0 [user|system]"
        echo "  user   - Install for current user only (default)"
        echo "  system - Install system-wide (requires sudo)"
        exit 1
        ;;
esac
