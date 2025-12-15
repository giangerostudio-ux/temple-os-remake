# Ubuntu 24.04 LTS Setup Guide

## Overview

Detailed guide for setting up Ubuntu 24.04 LTS as the base OS for the TempleOS kiosk with Steam/gaming support.

> [!WARNING]
> **Previously we planned to use Alpine Linux**, but Alpine's musl libc is incompatible with Steam, Proton, and many gaming components. Ubuntu 24.04 LTS provides full glibc compatibility.

---

## Why Ubuntu 24.04 LTS?

| Feature | Benefit |
|---------|---------|
| glibc-based | Steam, Proton, Wine all work |
| HWE Kernel | Latest hardware support |
| 5 years LTS | Long-term stability |
| Mesa/GPU | Modern drivers out of box |
| Huge community | Easy troubleshooting |

### Comparison

| Component | Alpine (musl) | Ubuntu (glibc) |
|-----------|--------------|----------------|
| Steam | ❌ Won't work | ✅ Native |
| Proton | ❌ Incompatible | ✅ Full support |
| Electron | ⚠️ Extra setup | ✅ Works perfectly |
| GPU drivers | ⚠️ Limited | ✅ NVIDIA/AMD/Intel |

---

## ⚠️ CRITICAL: Gaming Stack Requirements

> [!IMPORTANT]
> Ubuntu Server is the correct base, but it is NOT gaming-ready by default. You must explicitly add and manage the gaming stack. This is OS-architect-level work.

### What Ubuntu Server Gives You (Clean Slate)

- ✅ No GNOME, No KDE, No display manager
- ✅ No compositor, no graphical assumptions
- ✅ Nothing can "leak" visually except what you install
- ⚠️ Ships with GA kernel (conservative, ages poorly for gaming)
- ⚠️ Uses older Mesa by default
- ⚠️ Does NOT install GPU drivers

### What You Must Add (The Gaming Stack)

```
Ubuntu Server (clean base)
    ↓
+ HWE Kernel (non-negotiable)
+ GPU Drivers (NVIDIA/AMD/Intel)
+ Mesa Updates (keep fresh)
+ Wayland Compositor (Sway)
+ Gamescope
+ Steam + Proton
+ PipeWire Audio
+ Your Electron Shell
    ↓
= Gaming-Ready Kiosk OS
```

---

## 1. HWE Kernel (Non-Negotiable for Gaming)

> [!CAUTION]
> Without HWE, your OS will age poorly for gaming. New GPUs, better scheduler, anti-cheat compatibility, controller fixes, and performance improvements ALL depend on newer kernels.

Ubuntu LTS has two kernel tracks:
- **GA (General Availability)**: Very stable, but ages fast
- **HWE (Hardware Enablement)**: Newer kernels backported over time ← **USE THIS**

```bash
# Install HWE kernel
sudo apt install --install-recommends linux-generic-hwe-24.04

# Verify after reboot
uname -r
# Should show something like 6.8.x or newer
```

---

## 2. GPU Drivers (Must Install Explicitly)

### NVIDIA (Proprietary Required)
```bash
# Detect GPU
ubuntu-drivers devices

# Install recommended driver
sudo ubuntu-drivers autoinstall

# Or install specific version
sudo apt install nvidia-driver-545
```

> [!WARNING]
> Nouveau (open-source) is NOT sufficient for gaming. You MUST use proprietary NVIDIA drivers.

### AMD / Intel (Mesa)
```bash
# Mesa is used for AMD/Intel
sudo apt install mesa-vulkan-drivers mesa-va-drivers

# For newer Mesa (if needed), add Ubuntu Graphics PPA:
# sudo add-apt-repository ppa:kisak/kisak-mesa
# sudo apt update && sudo apt upgrade
```

---

## 3. Mesa Strategy

Mesa controls Vulkan, OpenGL, and Proton compatibility.

| Approach | Pros | Cons |
|----------|------|------|
| Ubuntu point releases | Stable, tested | May lag behind |
| kisak-mesa PPA | Fresher drivers | Less tested |
| Freezing forever | ❌ DON'T DO THIS | Games will break |

**Recommended**: Track Ubuntu's point release graphics updates. Add PPA only if specific games require it.

---

## 4. Steam + Proton (Core System Component)

> Steam is not "just another app" — it's a core system component for a gaming OS.

```bash
# Enable 32-bit packages (required)
sudo dpkg --add-architecture i386
sudo apt update

# Install Steam
sudo apt install steam

# Proton updates automatically via Steam
# Enable Steam Play for all titles in Steam settings
```

### Optional but Recommended
```bash
# Gamescope (Valve's compositor)
sudo apt install gamescope

# GameMode (performance optimization)
sudo apt install gamemode
```

---

## 5. Complete Gaming Stack Install Script

```bash
#!/bin/bash
# Ubuntu Server → Gaming OS conversion

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install HWE kernel
sudo apt install --install-recommends linux-generic-hwe-24.04

# 3. Install GPU drivers (NVIDIA example)
sudo ubuntu-drivers autoinstall
# OR for AMD/Intel:
# sudo apt install mesa-vulkan-drivers

# 4. Install compositor + gaming tools
sudo apt install -y sway gamescope gamemode

# 5. Install audio (PipeWire)
sudo apt install -y pipewire pipewire-audio pipewire-pulse wireplumber

# 6. Install Steam
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install -y steam

# 7. Install Node.js for Electron
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# 8. Reboot to apply kernel
sudo reboot
```

---

## Future-Proofing Strategy

This is the same model used by **SteamOS**:

| Component | Update Strategy |
|-----------|-----------------|
| Ubuntu LTS base | Stable, 5-year support |
| HWE Kernel | Auto-updates with point releases |
| GPU drivers | Ubuntu-managed or PPA |
| Mesa | Ubuntu point releases (+ PPA if needed) |
| Proton | Valve maintains independently |
| Your Shell | You control via GitHub |

> [!TIP]
> You are now making **OS-architect-level decisions**, not distro-hopper decisions. This is exactly where you should be.

---

## ⚠️ Electron + Gaming Warning

> [!IMPORTANT]
> When running Electron alongside games, you must handle focus and fullscreen correctly:

| Issue | Problem | Solution |
|-------|---------|----------|
| Focus stealing | Electron overlay interrupts games | Disable overlay during gameplay |
| Fullscreen mode | Compositor forces windowed | Allow exclusive fullscreen |
| Window priority | Shell covers game | Lower shell z-order during games |

### Implementation Requirements

```javascript
// When launching a game:
1. Hide or minimize the Electron shell
2. Allow exclusive fullscreen mode
3. Don't intercept game hotkeys (Alt+Tab, etc.)
4. Restore shell when game exits
```

---

## VM Setup Steps

### 1. Download Ubuntu 24.04 LTS Server

**Download**: https://ubuntu.com/download/server

Get: **Ubuntu Server 24.04.x LTS** (~2.5GB)

> Use Server edition for minimal install, we'll add only what we need.

### 2. Create VM (VirtualBox)

```
- Name: TempleOS-Dev
- Type: Linux / Ubuntu (64-bit)
- RAM: 4096 MB (minimum 2048)
- Disk: 32 GB (dynamic)
- Graphics: 128 MB VRAM
- Enable 3D acceleration
```

### 3. Install Ubuntu

1. Boot from ISO
2. Choose language, keyboard
3. Choose **"Ubuntu Server (minimized)"** for smaller install
4. Configure network (DHCP)
5. Create user:
   - Name: `temple`
   - Username: `temple`
   - Password: [your choice]
6. Skip Ubuntu Pro
7. Install OpenSSH server (optional but useful)
8. Skip snaps
9. Wait for install, reboot

---

## Post-Install Setup

### 1. Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Compositor (Choose One)

**Option A: X11 + Openbox (Simple)**
```bash
sudo apt install -y xorg xinit x11-xserver-utils openbox
```

**Option B: Wayland + Sway + Gamescope (Recommended for Gaming)**
```bash
# Sway (Wayland compositor)
sudo apt install -y sway

# Gamescope (Valve's gaming compositor - essential for proper fullscreen)
sudo apt install -y gamescope

# Fonts
sudo apt install -y fonts-noto fonts-dejavu

# Audio (PipeWire - better for gaming)
sudo apt install -y pipewire pipewire-audio pipewire-pulse wireplumber

# GameMode (performance optimization)
sudo apt install -y gamemode
```

> [!TIP]
> **Gamescope** is Valve's compositor that isolates games from your UI. This is how Steam Deck works. Games launched through Gamescope get exclusive fullscreen without conflicting with Electron.

### 3. Install Node.js & Electron Dependencies

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Git
sudo apt install -y git

# Electron/Chromium dependencies
sudo apt install -y \
  libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libdrm2 \
  libgbm1 libasound2
```

### 4. Install Steam (Optional)

```bash
# Enable 32-bit packages (required for Steam)
sudo dpkg --add-architecture i386
sudo apt update

# Install Steam
sudo apt install -y steam
```

### 5. Install GPU Drivers

```bash
# For NVIDIA
sudo apt install -y nvidia-driver-535

# For AMD (included by default via Mesa)
sudo apt install -y mesa-vulkan-drivers

# For Intel
sudo apt install -y intel-media-va-driver
```

---

## Kiosk Configuration

### 1. Configure Auto-Login

Create `/etc/systemd/system/getty@tty1.service.d/autologin.conf`:

```bash
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d/
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin temple --noclear %I $TERM
EOF
```

### 2. Auto-Start X11

Add to `/home/temple/.bash_profile`:

```bash
echo 'if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    startx
fi' >> ~/.bash_profile
```

### 3. Configure Openbox for Kiosk

Create `/home/temple/.xinitrc`:

```bash
cat > ~/.xinitrc << 'EOF'
#!/bin/sh
# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Start Openbox window manager
openbox &

# Start TempleOS Electron app
/opt/templeos/temple-os-electron --kiosk
EOF
chmod +x ~/.xinitrc
```

### 4. Clone and Build TempleOS App

```bash
sudo mkdir -p /opt/templeos
sudo chown temple:temple /opt/templeos
git clone https://github.com/giangerostudio-ux/temple-os-remake.git /opt/templeos
cd /opt/templeos
npm install
npm run electron:build
```

---

## Security Setup

### 1. Configure Firewall (UFW)

```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
```

### 2. Disable Swap (Optional)

```bash
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab
```

---

## ⚠️ CRITICAL: Preventing Linux UI Leaks

> [!IMPORTANT]
> The user must NEVER see the Linux desktop or any system UI. This is how Steam Deck, consoles, arcade cabinets, and kiosk systems work - they all run Linux, but users never see it.

### 1. Do NOT Install a Desktop Environment

```bash
# ❌ NEVER install these:
# - gnome-shell, gnome-session
# - kde-plasma-desktop
# - xfce4, lxde, mate
# 
# ✅ ONLY install:
# - Minimal Wayland compositor (Sway) or X11 (Openbox)
# - Your Electron app
# - Nothing else with UI
```

### 2. Auto-Login Directly Into Your Session

```bash
# No GDM, SDDM, or LightDM login screens!
# Boot → Auto-login → Compositor → Electron shell
# The autologin.conf we created earlier handles this
```

### 3. Single Compositor, Single Shell

```
Boot Process:
1. Systemd starts
2. Auto-login activates
3. Wayland compositor launches (Sway)
4. Electron shell launches IMMEDIATELY
5. Nothing else is allowed to present UI
```

### 4. Lock Escape Hatches (Recommended for Production)

```bash
# Disable TTY switching (Ctrl+Alt+F1-F6)
# Add to /etc/default/grub:
GRUB_CMDLINE_LINUX="console=tty1"

# Then run:
sudo update-grub

# Remove logout / user switching from your Electron app
# Hide system hotkeys while not in dev mode
```

### 5. Disable Dangerous Key Combos

In your Electron app, capture and block:
```javascript
// Block Ctrl+Alt+Delete, Alt+F4, etc. during normal operation
// Only allow in "dev mode" or "maintenance mode"
```

### Proven Architecture

This is exactly how these systems work:

| System | Base OS | User sees Linux? |
|--------|---------|------------------|
| **Steam Deck** | Arch Linux | ❌ Never (unless Desktop Mode) |
| **PlayStation** | FreeBSD | ❌ Never |
| **Nintendo Switch** | Linux-based | ❌ Never |
| **Arcade Cabinets** | Various Linux | ❌ Never |
| **ATMs / Kiosks** | Ubuntu/Debian | ❌ Never |

## Gaming Integration

### Launching Games (with Gamescope)

```javascript
// In Electron main process
function launchGame(gamePath) {
  // 1. Disable shell hotkeys and mute UI
  disableShellHotkeys();
  mainWindow.hide();
  
  // 2. Launch via Gamescope for isolation
  const gameProcess = spawn('gamescope', [
    '-f',  // fullscreen
    '--',
    gamePath
  ]);
  
  // 3. Restore shell when game exits
  gameProcess.on('close', () => {
    mainWindow.show();
    mainWindow.focus();
    enableShellHotkeys();
  });
}
```

### Steam Integration

```bash
# Launch Steam via Gamescope (recommended)
gamescope -f -- steam -bigpicture

# Or launch specific game
gamescope -f -- steam steam://run/GAME_ID
```

---

## Testing Checklist

- [ ] System boots and auto-logs in
- [ ] X11/Openbox starts
- [ ] Electron app runs in kiosk mode
- [ ] Sound works
- [ ] Network works
- [ ] Steam launches (if installed)
- [ ] Games run in fullscreen
- [ ] Shell restores after game exit
- [ ] Firewall is active

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Black screen | Check GPU drivers, try `nomodeset` boot option |
| No sound | `pulseaudio --start`, check `alsamixer` |
| Electron won't start | Check all dependencies installed |
| Steam crashes | Ensure 32-bit libs installed |
| No network | `sudo systemctl restart NetworkManager` |
