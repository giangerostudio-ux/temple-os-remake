#!/bin/bash
# Install emoji fonts on Ubuntu for TempleOS Remake

echo "Installing emoji fonts..."
sudo apt-get update
sudo apt-get install -y fonts-noto-color-emoji

echo "Rebuilding font cache..."
fc-cache -fv

echo "Emoji fonts installed! Please restart the application."
