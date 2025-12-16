#!/bin/bash

# TempleOS Remake - VirtualBox Guest Additions Installer Helper
# Run this inside the Ubuntu VM

echo "✝️  TempleOS Remake - Configuring Divine Display Drivers..."

# 1. Update and install build dependencies
echo "Installing build essentials..."
sudo apt update
sudo apt install -y build-essential dkms linux-headers-$(uname -r)

# 2. Instructions for the user
echo ""
echo "======================================================="
echo "Dependency installation complete."
echo "Now, please follow these steps manually:"
echo ""
echo "1. In the VirtualBox window menu bar (top of screen):"
echo "   Go to 'Devices' -> 'Insert Guest Additions CD image...'"
echo ""
echo "2. Then run these commands:"
echo "   sudo mkdir -p /mnt/cdrom"
echo "   sudo mount /dev/cdrom /mnt/cdrom"
echo "   sudo /mnt/cdrom/VBoxLinuxAdditions.run"
echo ""
echo "3. After it finishes, REBOOT the VM:"
echo "   sudo reboot"
echo "======================================================="
