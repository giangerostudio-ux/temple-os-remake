# ISO Build Guide - TempleOS Remake

## Prerequisites

This guide assumes you're building the ISO **on a Linux machine** (same architecture as target).

## Current Status (OK)

The terminal is now working with:
- [OK] node-pty compiled for Electron 33.4.11
- [OK] xterm.js terminal emulator
- [OK] Full sudo/interactive command support

## Pre-Build Checklist

Before creating the ISO, ensure:

### 1. Terminal is Working

Test the terminal in your development VM:

```bash
# SSH into VM
ssh -p 2222 temple@localhost

# Verify node-pty is installed
cd /opt/templeos
node -e "require('node-pty'); console.log('OK')"
```

If you see "OK", proceed.

### 2. Rebuild node-pty for Electron (CRITICAL)

**Every time before building an ISO**, run:

```bash
cd /opt/templeos

# Rebuild node-pty for the current Electron version
npx electron-rebuild -f -w node-pty

# Verify it worked
ls -la node_modules/node-pty/build/Release/pty.node
```

You should see the compiled `pty.node` file.

### 3. Build the Frontend

```bash
npm run build
```

### 4. Test Production Build

```bash
npm run electron:build
```

This creates the distributable in `dist/`.

### 5. Generate APT Baseline (Recommended)

This makes "Uninstall (APT)" safe-by-default by preventing removal of packages that shipped with the ISO baseline.

```bash
node scripts/generate-apt-baseline.cjs
```

### 6. Generate Snap Baseline (If your ISO includes Snap apps)

This makes "Uninstall (Snap)" safe-by-default by preventing removal of snaps that shipped with the ISO baseline.

```bash
node scripts/generate-snap-baseline.cjs
```

## Files to Include in ISO

When packaging for ISO, include these folders:

```
/opt/templeos/
- dist/              # Built frontend files (includes index.html + panel.html)
- electron/          # Electron main process
- node_modules/      # ALL dependencies (including node-pty)
- package.json
- package-lock.json
- package-lock.json
- scripts/           # Optional: setup scripts
- themes/            # GTK theme files (NEW)
- start-templeos.sh  # CRITICAL: Session startup script

### GTK Theme for X11 Applications

TempleOS Remake now includes a custom **Divine Cyberpunk GTK theme** that styles external X11 applications (Firefox, file managers, etc.) to match the OS aesthetic.

**Theme Features:**
- Dark backgrounds with green accents
- Title bars with green borders and proper window control buttons
- Minimize/Maximize buttons show green glow on hover
- Close button shows red glow on hover
- All inputs, scrollbars, buttons styled consistently

**Files:**
- `themes/gtk-3.0/gtk.css` - GTK3 theme (most current apps)
- `themes/gtk-4.0/gtk.css` - GTK4 theme (newer GNOME apps)
- `scripts/install-gtk-theme.sh` - Installation script

**Installation for ISO:**

Add to your first-boot/setup script:

```bash
# Install GTK theme system-wide (will apply to all users)
sudo /opt/templeos/scripts/install-gtk-theme.sh system
```

Or for manual setup in `/etc/skel/` (recommended for ISO):

```bash
# Copy theme to skeleton directory (will be copied to all new user accounts)
sudo mkdir -p /etc/skel/.config/gtk-3.0
sudo mkdir -p /etc/skel/.config/gtk-4.0

sudo cp /opt/templeos/themes/gtk-3.0/gtk.css /etc/skel/.config/gtk-3.0/gtk.css
sudo cp /opt/templeos/themes/gtk-4.0/gtk.css /etc/skel/.config/gtk-4.0/gtk.css

# Also create default GTK settings
sudo tee /etc/skel/.config/gtk-3.0/settings.ini > /dev/null << 'EOF'
[Settings]
gtk-application-prefer-dark-theme=1
gtk-theme-name=Adwaita-dark
gtk-icon-theme-name=Papirus-Dark
gtk-cursor-theme-name=Adwaita
gtk-font-name=Sans 11
gtk-decoration-layout=:minimize,maximize,close
EOF
```

**Testing the Theme:**

After installing the GTK theme, launch Firefox or any GTK app:
```bash
firefox &
```

You should see green-themed title bars and window controls instead of the default blue theme.

## X11 + Openbox (External Apps + Always-Visible Panel)

TempleOS now supports an **X11 panel window** (DOCK + STRUT + UNDER) so external apps (Firefox, etc.) cannot cover the bar, and so the OS can enumerate/control external windows for a taskbar experience.

### Openbox Theme (Divine Cyberpunk)

To ensure external windows (Firefox, Terminal) match the OS aesthetic (green borders, black title bars), you must install the **TempleOS-Divine** Openbox theme.

**Files:**
- `themes/TempleOS-Divine/` - The Openbox theme folder
- `scripts/apply-theme.sh` - Installer script

**Installation for ISO:**

Add this to your ISO setup or first-run script:

```bash
# Install Openbox theme system-wide
sudo mkdir -p /usr/share/themes/TempleOS-Divine
sudo cp -r /opt/templeos/themes/TempleOS-Divine/openbox-3 /usr/share/themes/TempleOS-Divine/

# Configure default Openbox rc.xml for new users
# (Ensure /etc/xdg/openbox/rc.xml uses <name>TempleOS-Divine</name>)
sudo sed -i 's|<name>.*</name>|<name>TempleOS-Divine</name>|' /etc/xdg/openbox/rc.xml
```

**New Features (Dec 2025):**
- **Unified Taskbar**: X11 apps appear in the main taskbar alongside built-in apps.
- **Minimized Apps**: Minimized windows remain visible (dimmed) and can be restored.
- **Context Menu**: Right-click taskbar items to Close or Minimize/Restore windows.
- **Main Window Layout**: The desktop window uses `_NET_WM_STATE_BELOW` to ensure it never obscures active windows when the Start Menu is opened.

Key requirement:
- You must run an **X11 session** (`XDG_SESSION_TYPE=x11`) with an **EWMH-compliant WM** (recommended: Openbox).

Runtime packages to include on the ISO (recommended):

```bash
sudo apt update
sudo apt install -y xorg xinit openbox wmctrl x11-utils x11-xserver-utils xdotool python3-xlib python3-pip
```

### Voice of God TTS (Optional but Recommended)

For the Word of God divine voice feature with audio effects (reverb, echo, chorus):

```bash
# Install Pedalboard for divine audio effects
pip3 install pedalboard

# Download Piper TTS (run as user, not root)
mkdir -p /opt/templeos/electron/piper && cd /opt/templeos/electron/piper
curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz
tar xzf piper.tar.gz
curl -L -o en_US-lessac-high.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx
curl -L -o en_US-lessac-high.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json
rm piper.tar.gz
```

**Note**: Users can also install TTS from the Word of God app - clicking Voice will prompt to open Terminal with install command.

Notes:
- Under Wayland (`XDG_SESSION_TYPE=wayland`), a normal app (Electron) cannot implement global window management; the panel/taskbar integration won't work the same way.
- The panel auto-hides in fullscreen when "Hide Bar On Fullscreen" is enabled (Settings -> Gaming).
- `python3-xlib` is used for **Windows 11-style Snap Layouts**: a Python daemon (`scripts/snap-detector.py`) polls `XQueryPointer` to detect drag-to-edge gestures in real-time, even during window manager grabs. Features include:
  - Drag window to top edge → snap layouts popup appears
  - Real-time hover highlighting shows which snap option is selected during drag
  - Release to snap window to the highlighted zone (maximize, halves, quarters)

### X11 boot + VirtualBox gotchas (read this)

Do NOT run `startx` over SSH or inside an existing GUI terminal. Run it from a real TTY.

Switch to a TTY in VirtualBox:

```bash
sudo chvt 3
```

Then log in on tty3 and run:

```bash
startx
```

If you see `Only console users are allowed to run the X server` or Xorg crashes with permission errors in a VM, install the legacy wrapper + allow root rights:

```bash
sudo apt update
sudo apt install -y xserver-xorg-legacy

sudo tee /etc/X11/Xwrapper.config >/dev/null <<'EOF'
allowed_users=console
needs_root_rights=yes
EOF
```

If Electron refuses to start with a `chrome-sandbox` SUID error, fix permissions (required when running Electron as a normal user):

```bash
sudo chown root:root /opt/templeos/node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 /opt/templeos/node_modules/electron/dist/chrome-sandbox
```

If you see two taskbars or the panel is unresponsive, you are likely running a mixed/old build:

```bash
cd /opt/templeos
git rev-parse --short HEAD
npm run build
```

Then restart X (tty):

```bash
pkill -f /opt/templeos/node_modules/.bin/electron || true
startx
```

### Optional: Gaming stack (Steam/Proton + launchers)

This is not required for the desktop shell to run, but is commonly expected on a "gaming OS":
- Steam (Proton is managed inside Steam)
- GameMode (gamemoderun)
- Optional launchers: Heroic, Lutris, Bottles

Package names vary by repo configuration (multiverse), but typical Ubuntu setup starts with:

```bash
sudo apt update
sudo apt install -y gamemode
```

#### Flatpak Setup + Steam Installation (Recommended)

**Why Flatpak for Steam?** The Flatpak version has better context menu and click detection compared to Snap, especially for the Steam client UI on X11.

**Quick Setup (Automated)**: Run the provided script:
```bash
sudo /opt/templeos/scripts/setup-gaming.sh
```

**Manual Setup**: Add these commands to your ISO post-install scripts:

```bash
# Install Flatpak
sudo apt install -y flatpak

# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Steam via Flatpak (recommended for best Linux compatibility)
flatpak install -y flathub com.valvesoftware.Steam
```

**Alternative (Snap)**: If you prefer Snap (works out-of-box on Ubuntu but may have UI click issues):
```bash
sudo snap install steam
```

**CRITICAL**: The `node_modules/node-pty/build/Release/pty.node` file MUST be included!

## ISO Build Steps

### Step 1: Prepare the Build Environment

```bash
# On your Linux build machine:
git clone https://github.com/giangerostudio-ux/temple-os-remake.git
cd temple-os-remake

# Install dependencies
npm install

# Install Electron rebuild tool
npm install --save-dev @electron/rebuild

# Rebuild node-pty for Electron
npx electron-rebuild -f -w node-pty

# Build frontend
npm run build

# Build Electron app
npm run electron:build
```

### Step 2: Package for ISO

The built application will be in `dist/` (or wherever electron-builder outputs).

Copy the entire application folder to `/opt/templeos/` in your ISO.

**CRITICAL**: Ensure the user owns the directory so the built-in updater works:
```bash
sudo chown -R temple:temple /opt/templeos
```

**CRITICAL**: Fix Electron sandbox permissions (must be root owned):
```bash
sudo chown root:root /opt/templeos/node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 /opt/templeos/node_modules/electron/dist/chrome-sandbox
```

**CRITICAL**: Setup keybind daemon permissions (evdev access for global hotkeys):
```bash
# Run the setup script to configure input group and udev rules
sudo /opt/templeos/scripts/setup-keybinds.sh temple

# This will:
# - Add user 'temple' to the 'input' group (for /dev/input access)
# - Create udev rule for keyboard device permissions
# - No logout needed on fresh ISO boot!
```

**CRITICAL**: Copy the `start-templeos.sh` script and make it executable:

```bash
cp start-templeos.sh /opt/templeos/
chmod +x /opt/templeos/start-templeos.sh
```

### Step 3: Create Autostart (Optional)

Create `/etc/systemd/system/templeos.service`:

```ini
[Unit]
Description=TempleOS Remake
After=graphical.target

[Service]
Type=simple
User=temple
WorkingDirectory=/opt/templeos
Environment=DISPLAY=:0
ExecStart=/opt/templeos/node_modules/.bin/electron /opt/templeos
Restart=always

[Install]
WantedBy=graphical.target
```

Enable it:

```bash
sudo systemctl enable templeos.service
```

## Verification After ISO Creation

Boot the ISO and:

1. Open Terminal app
2. Run: `sudo apt update`
3. You should see a password prompt (OK)

If you get "sudo: a terminal is required", the terminal is broken.

## Troubleshooting

### Terminal shows fallback mode after ISO boot

**Cause**: node-pty wasn't included or was compiled for wrong architecture.

**Fix**:
```bash
# On the ISO system:
cd /opt/templeos
npm rebuild node-pty --build-from-source
npx electron-rebuild -f -w node-pty
```

### "Cannot find module 'node-pty'"

**Cause**: `node_modules` folder wasn't included in ISO.

**Fix**: Rebuild the ISO and include the entire `node_modules/` folder.

### Wrong Node.js version error

**Cause**: node-pty was compiled for system Node.js instead of Electron.

**Fix**: Run `npx electron-rebuild -f -w node-pty` before packaging.

## Architecture Notes

- **x86_64 (Intel/AMD)**: Build on x86_64 Linux
- **ARM64 (Raspberry Pi, etc.)**: Build on ARM64 Linux
- **Cross-compilation**: Not recommended - native modules like node-pty need native builds

## Quick Reference: Build Commands

```bash
# Full build sequence
git pull origin main
npm install
npx electron-rebuild -f -w node-pty
npm run build
npm run electron:build

# Verify terminal
node -e "require('node-pty'); console.log('Terminal: OK')"
```

## Distribution Checklist

Before releasing ISO:

- [ ] Terminal works (sudo prompts for password)
- [ ] node-pty is compiled for current Electron version
- [ ] npm audit shows no critical vulnerabilities
- [ ] All apps launch correctly
- [ ] Lock screen works
- [ ] Settings persist after reboot
- [ ] GTK theme installed (`~/.config/gtk-3.0/gtk.css` exists)
- [ ] GTK theme applies to X11 apps (test with Firefox - should have green title bar)
- [ ] Tested on clean VM

---

**Last Updated**: December 25, 2025  
**Electron Version**: 33.4.11  
**Node.js (Electron)**: Check with `process.versions.node` in Electron console  
**node-pty Version**: 1.0.0

