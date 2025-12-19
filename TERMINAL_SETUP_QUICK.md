# Terminal Setup - Quick Reference

## ✅ Current Status

Your terminal is now working with:
- Real PTY support (node-pty + xterm.js)
- Full sudo/interactive command support
- Compiled for Electron 33.4.11

## 🏗️ For Future ISO Builds

### Before building ISO, run:

```bash
# On your Linux build environment:
cd /path/to/temple-os-remake

# Install dependencies (includes @electron/rebuild)
npm install

# This will automatically rebuild node-pty for Electron:
npm run electron:build
```

The `npm run electron:build` command now **automatically** runs `electron-rebuild` before building!

## 📦 What Gets Included in ISO

When you package for ISO, make sure these are included:

```
/opt/templeos/node_modules/node-pty/  ← The compiled module
```

## 🔍 Verify Terminal Before ISO Release

Boot your ISO test VM and run:

```bash
# Open Terminal app in your OS
# Type:
sudo apt update

# You should see:
# [sudo] password for temple:
```

If it asks for password ✅ = Terminal works!

If it says "sudo: a terminal is required" ❌ = Need to rebuild node-pty

## 🆘 Emergency Fix (If Terminal Breaks)

If users get a broken terminal after installing your OS, they can fix it:

```bash
# Via SSH or recovery console:
cd /opt/templeos
npm install @electron/rebuild
npx electron-rebuild -f -w node-pty
sudo reboot
```

## 📝 Technical Details

- **Terminal Type**: PTY (Pseudo-TTY)
- **Library**: node-pty 1.0.0
- **Emulator**: xterm.js 5.5.0
- **Compiled for**: Electron 33.4.11 (Node.js v20.x in Electron)
- **Architecture**: x86_64 (Intel/AMD)

---

**See also**: `docs/iso-build-guide.md` for complete build instructions
