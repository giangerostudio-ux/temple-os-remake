# ISO Building Process Research

> [!WARNING]
> This document still references Alpine Linux. The project now uses **Ubuntu 24.04 LTS**.
> Updates pending to align with Ubuntu base. See [ubuntu-setup.md](./ubuntu-setup.md) for current setup.

## Overview

How to create a bootable ISO image of the TempleOS Linux distribution.

---

## The Build Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                      BUILD PROCESS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Alpine Base        ─→  Download minirootfs              │
│  2. Add Packages       ─→  Install our software             │
│  3. Configure System   ─→  Auto-login, kiosk, security      │
│  4. Add Electron App   ─→  Copy built app to /opt           │
│  5. Create Squashfs    ─→  Compress filesystem              │
│  6. Build ISO          ─→  Add bootloader, create ISO       │
│  7. Test               ─→  Boot in VM                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| `apk` | Alpine package manager |
| `mksquashfs` | Create compressed filesystem |
| `grub-mkrescue` | Create bootable ISO with GRUB |
| `xorriso` | ISO manipulation |
| `mtools` | UEFI boot support |
| `qemu` | Testing the ISO |

```bash
# On Alpine build system
apk add alpine-sdk squashfs-tools grub grub-efi xorriso mtools qemu
```

---

## Directory Structure

```
build/
├── rootfs/                 # The filesystem we're building
│   ├── bin/
│   ├── etc/
│   ├── home/
│   ├── opt/templeos/       # Our Electron app
│   └── ...
├── iso/                    # ISO staging
│   ├── boot/
│   │   ├── grub/
│   │   │   ├── grub.cfg    # GRUB menu
│   │   │   └── themes/     # Custom theme
│   │   └── vmlinuz         # Kernel
│   ├── EFI/                # UEFI boot
│   └── rootfs.sfs          # Squashfs image
└── output/
    └── templeos-1.0.iso    # Final ISO
```

---

## Build Script Outline

```bash
#!/bin/bash
# build-iso.sh

set -e

VERSION="1.0"
BUILD_DIR="./build"
ROOTFS="$BUILD_DIR/rootfs"
ISO_DIR="$BUILD_DIR/iso"
OUTPUT="./output/templeos-${VERSION}.iso"

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$ROOTFS" "$ISO_DIR/boot/grub"

echo "=== Step 1: Download Alpine minirootfs ==="
wget -O alpine-minirootfs.tar.gz \
  "https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-minirootfs-3.19.0-x86_64.tar.gz"
tar -xzf alpine-minirootfs.tar.gz -C "$ROOTFS"

echo "=== Step 2: Install packages ==="
# Chroot into rootfs and install packages
cp /etc/resolv.conf "$ROOTFS/etc/"
chroot "$ROOTFS" /bin/sh <<'EOF'
apk add --no-cache \
  linux-lts linux-firmware \
  nodejs npm \
  chromium nss cups-libs libdrm mesa-gl \
  xorg-server xinit xf86-video-vesa \
  openrc \
  sudo \
  ca-certificates
EOF

echo "=== Step 3: Copy Electron app ==="
mkdir -p "$ROOTFS/opt/templeos"
cp -r ../dist/electron-app/* "$ROOTFS/opt/templeos/"

echo "=== Step 3b: Install Voice of God TTS ==="
# Copy Piper TTS files
mkdir -p "$ROOTFS/opt/templeos/piper"
cp -r ../electron/piper/* "$ROOTFS/opt/templeos/piper/"

# Install Python + Pedalboard for divine audio effects
chroot "$ROOTFS" /bin/sh <<'EOF'
pip3 install pedalboard numpy --break-system-packages
EOF

echo "=== Step 4: Configure system ==="
# Add startup scripts, auto-login, etc.
# (See alpine-linux-setup.md for details)

echo "=== Step 5: Create squashfs ==="
mksquashfs "$ROOTFS" "$ISO_DIR/rootfs.sfs" -comp xz -noappend

echo "=== Step 6: Copy kernel ==="
cp "$ROOTFS/boot/vmlinuz-lts" "$ISO_DIR/boot/vmlinuz"
cp "$ROOTFS/boot/initramfs-lts" "$ISO_DIR/boot/initrd"

echo "=== Step 7: Create GRUB config ==="
cat > "$ISO_DIR/boot/grub/grub.cfg" <<'GRUB'
set timeout=5
set default=0

menuentry "TempleOS - Giangero Studio" {
    linux /boot/vmlinuz quiet splash
    initrd /boot/initrd
}

menuentry "TempleOS - Recovery Mode" {
    linux /boot/vmlinuz single
    initrd /boot/initrd
}
GRUB

echo "=== Step 8: Build ISO ==="
grub-mkrescue -o "$OUTPUT" "$ISO_DIR"

echo "=== Done! ISO at $OUTPUT ==="
```

---

## GRUB Theme

Custom TempleOS-styled boot menu:

```
/boot/grub/themes/templeos/
├── theme.txt
├── background.png       # Dark background
├── terminal_box_*.png   # Menu styling
├── select_*.png         # Selection highlight
└── font.pf2             # VT323 font
```

**theme.txt**:
```
# TempleOS GRUB Theme
title-text: ""
desktop-image: "background.png"
desktop-color: "#0d1117"

+ boot_menu {
    left = 30%
    width = 40%
    top = 40%
    height = 30%
    item_font = "VT323 Regular 24"
    item_color = "#00ff41"
    selected_item_color = "#ffd700"
    item_height = 40
    item_padding = 10
    item_spacing = 5
}

+ label {
    top = 20%
    left = 0
    width = 100%
    align = "center"
    text = "T E M P L E  O S"
    font = "VT323 Regular 48"
    color = "#00ff41"
}

+ label {
    top = 28%
    left = 0
    width = 100%
    align = "center"
    text = "Giangero Studio"
    font = "VT323 Regular 16"
    color = "#00d4ff"
}
```

---

## UEFI Support

For modern systems:

```bash
# Create EFI boot image
mkdir -p "$ISO_DIR/EFI/BOOT"
grub-mkimage -O x86_64-efi -o "$ISO_DIR/EFI/BOOT/BOOTX64.EFI" \
  -p /boot/grub \
  part_gpt part_msdos fat iso9660 normal boot linux

# grub-mkrescue handles this automatically
```

---

## Persistence (Live USB with Storage)

For keeping user data on the USB:

```
USB Drive:
├── Partition 1: FAT32, 4GB (ISO/boot files)
├── Partition 2: ext4 encrypted, rest (user data)
```

The init script mounts partition 2 as `/home` if present.

---

## Init Script Modifications

For live boot, need to mount squashfs:

```bash
# /etc/init.d/live-boot
mount -t squashfs /cdrom/rootfs.sfs /mnt/root
mount -t overlay overlay -o lowerdir=/mnt/root,upperdir=/mnt/rw,workdir=/mnt/work /mnt/union
```

---

## Testing the ISO

```bash
# Test with QEMU (BIOS)
qemu-system-x86_64 -cdrom templeos-1.0.iso -m 2048 -enable-kvm

# Test with QEMU (UEFI)
qemu-system-x86_64 -cdrom templeos-1.0.iso -m 2048 -enable-kvm \
  -bios /usr/share/ovmf/OVMF.fd
```

---

## ISO Size Targets

| Component | Size |
|-----------|------|
| Base Alpine | ~50 MB |
| X11 + deps | ~100 MB |
| Electron app | ~150 MB |
| Steam (optional) | ~500 MB |
| **Total (no Steam)** | **~300 MB** |
| **Total (with Steam)** | **~800 MB** |

### Voice of God TTS (included)

| Component | Size |
|-----------|------|
| Piper TTS binary | ~15 MB |
| en_US-lessac-high.onnx | ~120 MB |
| espeak-ng-data | ~25 MB |
| Python + Pedalboard | ~50 MB |
| **TTS Total** | **~210 MB** |

> Updated total with TTS: ~510 MB (no Steam), ~1 GB (with Steam)

---

## Automation (CI/CD)

GitHub Actions workflow for building:

```yaml
name: Build ISO
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build ISO
        run: ./scripts/build-iso.sh
      - name: Upload ISO
        uses: actions/upload-artifact@v4
        with:
          name: templeos-iso
          path: output/*.iso
```

---

## Distribution

| Platform | Method |
|----------|--------|
| GitHub | Releases page |
| Website | Direct download |
| Torrent | Optional |
| USB Creator | Balena Etcher instructions |

---

## USB Creation Instructions (for users)

```
1. Download templeos-1.0.iso
2. Download Balena Etcher (balena.io/etcher)
3. Insert USB drive (8GB+ recommended)
4. Open Etcher, select ISO, select drive, Flash!
5. Boot from USB
```
