# Alpine Linux Setup Research

## Overview

Detailed guide for setting up Alpine Linux as the base OS for the TempleOS kiosk.

---

## Why Alpine Linux?

| Feature | Benefit |
|---------|---------|
| Tiny size (~5MB base) | Fast boot, small USB |
| Security-focused | musl libc, no bloat |
| Simple init (OpenRC) | Easy to customize |
| Rolling updates | Latest packages |
| Good documentation | Easy troubleshooting |

---

## Installation Variants

| Variant | Use Case | Size |
|---------|----------|------|
| **Standard** | General server | ~130MB |
| **Extended** | Desktop, more packages | ~600MB |
| **Virtual** | VMs, optimized | ~50MB |

**Recommended**: Extended (has X11 packages)

---

## VM Setup Steps

### 1. Download Alpine
```bash
# Get extended ISO
wget https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-extended-3.19.0-x86_64.iso
```

### 2. Create VM (VirtualBox)
```
- Name: TempleOS-Dev
- Type: Linux / Other Linux (64-bit)
- RAM: 4096 MB (minimum 2048)
- Disk: 32 GB (dynamic)
- Graphics: 128 MB VRAM
- Enable 3D acceleration
```

### 3. Install Alpine
```bash
# Boot from ISO, login as root (no password)
setup-alpine

# Follow prompts:
# - Keyboard: us
# - Hostname: temple
# - Network: eth0, DHCP
# - Root password: [SET ONE]
# - Timezone: [YOUR TIMEZONE]
# - Proxy: none
# - Mirror: fastest
# - SSH: openssh
# - Disk: sda, sys (install to disk)
```

---

## Post-Install Setup

### 1. Enable Community Repo
```bash
vi /etc/apk/repositories
# Uncomment the community line:
# http://dl-cdn.alpinelinux.org/alpine/v3.19/community
```

### 2. Update System
```bash
apk update
apk upgrade
```

### 3. Create User
```bash
adduser temple
addgroup temple wheel
addgroup temple video
addgroup temple audio
addgroup temple input
```

### 4. Enable sudo
```bash
apk add sudo
echo '%wheel ALL=(ALL) ALL' >> /etc/sudoers
```

---

## Desktop Environment Setup

### Option A: Minimal X11 (Recommended)

```bash
# Install X11 base
apk add xorg-server xf86-video-vesa xf86-input-evdev
apk add xinit xterm

# Fonts
apk add font-noto ttf-dejavu

# For VirtualBox
apk add virtualbox-guest-additions virtualbox-guest-modules-lts
```

### Option B: Wayland Kiosk (Cage)

```bash
# Cage is a kiosk Wayland compositor
apk add cage wlroots

# Run app in cage
cage -- /path/to/electron-app
```

---

## Required Packages

```bash
# Core
apk add nodejs npm git

# For Electron
apk add chromium nss cups-libs libdrm mesa-gl
apk add libxkbcommon libxrandr libxcomposite libxdamage

# For terminal emulation (node-pty)
apk add python3 make g++ linux-headers

# Audio
apk add alsa-lib pulseaudio

# For Steam (optional, needs Flatpak)
apk add flatpak
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub com.valvesoftware.Steam
```

---

## Auto-Login Setup

### Console Auto-Login
```bash
# Edit /etc/inittab
# Replace:
#   tty1::respawn:/sbin/getty 38400 tty1
# With:
#   tty1::respawn:/bin/login -f temple
```

### X11 Auto-Start

Create `/home/temple/.xinitrc`:
```bash
#!/bin/sh
exec /opt/templeos/electron-app
```

Create `/etc/profile.d/startx.sh`:
```bash
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx
fi
```

---

## Kiosk Mode Configuration

### Disable Screen Blanking
```bash
# In .xinitrc, before exec:
xset s off
xset -dpms
xset s noblank
```

### Prevent Alt+Tab, etc.
The Electron app should run in kiosk mode with `kiosk: true`

### Auto-Restart on Crash

Create `/etc/init.d/templeos`:
```bash
#!/sbin/openrc-run

name="templeos"
command="/opt/templeos/start.sh"
command_user="temple"
pidfile="/run/${RC_SVCNAME}.pid"
command_background="yes"

depend() {
  need localmount
  after bootmisc
}
```

```bash
chmod +x /etc/init.d/templeos
rc-update add templeos default
```

---

## Security Setup

### Firewall (iptables)
```bash
apk add iptables

# Block all incoming, allow outgoing
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Save rules
/etc/init.d/iptables save
rc-update add iptables default
```

### MAC Randomization
```bash
# Create /etc/network/if-pre-up.d/mac-randomize
#!/bin/sh
ip link set dev eth0 down
ip link set dev eth0 address $(hexdump -n 6 -ve '1/1 "%.2x "' /dev/urandom | awk '{print $1":"$2":"$3":"$4":"$5":"$6}')
ip link set dev eth0 up
chmod +x /etc/network/if-pre-up.d/mac-randomize
```

### Disable Swap
```bash
# Don't create swap during install, or:
swapoff -a
# Remove from /etc/fstab
```

---

## File System Layout

```
/
├── bin/, sbin/, usr/         # System (read-only later)
├── etc/
│   ├── templeos/             # Our config
│   └── ...
├── home/
│   └── temple/               # User home (on encrypted partition)
│       ├── Documents/
│       ├── Downloads/
│       └── .templeos/        # App settings
├── opt/
│   └── templeos/             # Our Electron app
│       ├── electron-app
│       ├── resources/
│       └── start.sh
└── tmp/                      # Tmpfs (RAM)
```

---

## Encryption (LUKS)

For full disk encryption, must be done during install or with manual partitioning:

```bash
# Manual setup (advanced)
apk add cryptsetup

# Create encrypted partition
cryptsetup luksFormat /dev/sda2
cryptsetup open /dev/sda2 cryptroot
mkfs.ext4 /dev/mapper/cryptroot
```

**Easier**: Use the Alpine installer's encryption option when partitioning.

---

## Testing Checklist

- [ ] System boots to login
- [ ] Auto-login works
- [ ] X11/Wayland starts
- [ ] Electron app runs
- [ ] Sound works
- [ ] Networking works
- [ ] USB devices detected
- [ ] Shutdown/reboot works
- [ ] Firewall active

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Black screen | Check video driver, try `vesa` |
| No sound | `apk add alsa-utils`, run `alsamixer` |
| Electron won't start | Install all Chromium deps |
| npm errors | Install `python3 make g++` |
| No network | `rc-service networking restart` |
