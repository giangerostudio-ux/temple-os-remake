# Hardware Requirements Research

## Overview

Minimum and recommended hardware specifications for running TempleOS Linux.

---

## Target Hardware

| Target | Description |
|--------|-------------|
| Primary | Modern x64 PCs and laptops |
| Secondary | Older hardware (5-10 years old) |
| Virtualization | VirtualBox, QEMU, VMware |

---

## Minimum Requirements

| Component | Minimum | Notes |
|-----------|---------|-------|
| **CPU** | x86_64, 2 cores | SSE2 required |
| **RAM** | 2 GB | 1 GB without gaming |
| **Storage** | 8 GB | For live USB |
| **Graphics** | Any with VESA | Will work, may be slow |
| **Network** | Ethernet or WiFi | For updates, browsing |

---

## Recommended Requirements

| Component | Recommended | Notes |
|-----------|-------------|-------|
| **CPU** | x86_64, 4+ cores | For gaming |
| **RAM** | 8 GB | 16 GB for heavy gaming |
| **Storage** | 64 GB+ SSD | For installed apps + games |
| **Graphics** | AMD or Intel | Best Linux support |
| **Network** | Gigabit Ethernet | For downloads |

---

## Graphics Card Compatibility

### Tier 1: Best Support (AMD)
- AMD GPUs have open-source drivers (Mesa/AMDGPU)
- Plug and play, no extra setup
- Good Proton/gaming support

### Tier 2: Good Support (Intel)
- Intel integrated graphics work out of box
- Good for non-gaming use
- Newer Intel dGPUs work well

### Tier 3: Needs Work (NVIDIA)
- Proprietary drivers required
- Must install nvidia-legacy or nouveau
- Can cause issues with Wayland
- Persistence mode may need config

### Driver Installation

```bash
# AMD (automatic)
apk add linux-firmware-amdgpu mesa-dri-gallium

# Intel (automatic)
apk add linux-firmware-intel mesa-dri-gallium

# NVIDIA (manual)
apk add nvidia-legacy   # For GTX 600-900 series
apk add nvidia          # For RTX cards
```

---

## WiFi Compatibility

### Works Out of Box
- Most Intel WiFi (iwlwifi)
- Atheros (ath9k, ath10k)
- Realtek (many models)
- Broadcom (some models)

### May Need Firmware
- Broadcom (wl driver)
- Some Realtek USB adapters
- MediaTek (newer chips)

```bash
# Install WiFi firmware
apk add linux-firmware-other
apk add wireless-tools wpa_supplicant
```

### Problematic
- Very new chips (wait for Linux support)
- Obscure brands
- Some Realtek USB (rt2x00)

---

## USB Boot Compatibility

### UEFI vs Legacy BIOS

| Mode | Support |
|------|---------|
| UEFI | Full support |
| Legacy BIOS | Full support |
| Secure Boot | Supported (signed bootloader) |

### USB 2.0 vs 3.0
- Both work
- USB 3.0 much faster boot
- Recommend USB 3.0 drive

---

## Laptop Considerations

### Works Well
- ThinkPads (excellent Linux support)
- Dell XPS (mostly good)
- System76 (designed for Linux)
- Framework (open hardware)

### May Have Issues
- Surface devices (touchscreen, WiFi)
- Gaming laptops (hybrid graphics)
- Very new models (driver lag)

### Features to Check
| Feature | Status |
|---------|--------|
| WiFi | Usually works |
| Bluetooth | Usually works |
| Touchpad | Usually works |
| Touchscreen | Hit or miss |
| Fingerprint | Often doesn't work |
| Suspend/Sleep | Usually works |
| Webcam | Usually works |
| Special keys | May need config |

---

## Virtualization

### VirtualBox
```
Settings:
- RAM: 4 GB+
- Video Memory: 128 MB
- Enable 3D Acceleration
- Storage: 32 GB
- Network: Bridged or NAT
- Install Guest Additions for better performance
```

### QEMU/KVM
```bash
qemu-system-x86_64 \
  -m 4096 \
  -cpu host \
  -enable-kvm \
  -smp 4 \
  -vga qxl \
  -device virtio-net-pci,netdev=net0 \
  -netdev user,id=net0 \
  -drive file=templeos.img,format=qcow2 \
  -cdrom templeos.iso
```

### VMware
- Works with VMware Player/Workstation
- Install open-vm-tools for guest integration
- Enable 3D acceleration

---

## Known Hardware Issues

| Hardware | Issue | Workaround |
|----------|-------|------------|
| NVIDIA Optimus | Hybrid graphics complex | Use `prime-run` or disable dGPU |
| Broadcom WiFi | May need proprietary driver | `broadcom-wl` package |
| Realtek USB WiFi | Some models need firmware | Check specific model |
| Fingerprint readers | Often no Linux driver | Can't use |
| Some webcams | May need uvc driver | Usually auto |
| RGB keyboards | May not have control | Third-party tools |

---

## Hardware Recommendations for Purchase

### Budget (~$200-400)
- Refurbished ThinkPad T480/T490
- Used Dell OptiPlex
- Any PC with AMD APU

### Mid-Range (~$500-800)
- System76 Lemur Pro
- Framework Laptop (base config)
- Any AMD Ryzen laptop

### Performance (~$1000+)
- System76 Thelio
- Framework Laptop (upgraded)
- Custom build with AMD GPU

---

## Peripheral Support

| Device Type | Support |
|-------------|---------|
| USB Keyboards | ✅ Works |
| USB Mice | ✅ Works |
| USB Storage | ✅ Works |
| USB Audio | ✅ Usually works |
| USB Webcams | ✅ Usually works |
| USB Game Controllers | ✅ Works |
| Bluetooth Devices | ⚠️ Usually works |
| Printers | ⚠️ CUPS, may need setup |
| Scanners | ⚠️ SANE, may need setup |
| Drawing Tablets | ⚠️ Wacom works, others vary |

---

## Memory Requirements Breakdown

| Component | RAM Usage |
|-----------|-----------|
| Kernel + base system | ~100 MB |
| X11/Wayland | ~50 MB |
| Electron app | ~200-400 MB |
| **Total base** | **~350-550 MB** |
| Firefox | +300-500 MB |
| Steam (idle) | +300 MB |
| Game (varies) | +2-8 GB |

**Recommendation**: 8 GB minimum for gaming
