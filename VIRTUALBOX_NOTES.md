# VirtualBox Testing Notes

## Resolution Issue (800x600 Random Boots)

### Problem
VirtualBox sometimes boots TempleOS at random resolutions (800x600, 1280x720) instead of the intended 1024x768.

### Is This a Problem for the Final ISO?
**NO** - This is VirtualBox-specific. Real hardware and the final ISO won't have this issue because:
- Real graphics cards have proper EDID data and mode persistence
- Native Linux installations handle resolution reliably
- This is a VirtualBox Guest Additions quirk

### The Fixes Applied
1. Changed default fallback from 1280x720 → 1024x768
2. Added xrandr enforcement in boot scripts
3. Added resolution check in Electron startup

### Impact on Final Product
✅ **POSITIVE** - These changes make the OS more robust:
- Better default resolution (more TempleOS-authentic)
- Defensive resolution checks won't hurt anything
- Works on VirtualBox AND real hardware

### For Best VirtualBox Experience
Install Guest Additions in your Ubuntu VM:
```bash
sudo apt install virtualbox-guest-utils virtualbox-guest-x11
```

Then reboot your VM. This should make resolution changes more stable.

---

## Other VirtualBox-Specific Issues to Watch For

### Performance
- VirtualBox is slower than real hardware
- Enable 3D acceleration in VM settings for better performance
- Allocate at least 2GB RAM, 2 CPU cores

### Display
- If you resize the VirtualBox window, the resolution might change
- The OS should adapt, but you may need to restart if it glitches

### USB/Input
- VirtualBox USB passthrough can be unreliable
- Use VirtualBox Extension Pack for USB 2.0/3.0 support

---

**TL;DR**: VirtualBox quirks won't affect your final ISO. The fixes make your OS work better everywhere, not just in VirtualBox.
