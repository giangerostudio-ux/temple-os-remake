#!/bin/bash
# Install emoji fonts for TempleOS Remake

echo "🎨 Installing Emoji Fonts for TempleOS..."

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install Noto Color Emoji font
echo "Installing Noto Color Emoji..."
sudo apt-get install -y fonts-noto-color-emoji

# Also install alternative emoji fonts as fallbacks
echo "Installing additional emoji fonts..."
sudo apt-get install -y \
    fonts-symbola \
    fonts-twemoji-svginot \
    fonts-firacode

# Rebuild font cache
echo "Rebuilding font cache..."
fc-cache -f -v

echo "✅ Emoji fonts installed successfully!"
echo ""
echo "Please restart the TempleOS application to see the changes."
echo "If icons still don't show, try rebooting your system."
