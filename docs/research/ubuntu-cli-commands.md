# Ubuntu CLI Command Reference

Essential commands for maintaining the TempleOS Kiosk OS.

---

## System Information

```bash
uname -a                    # All system info
uname -r                    # Kernel version (check HWE!)
hostnamectl                 # Hostname and OS details
lscpu                       # CPU architecture
timedatectl status          # System time
lsb_release -a              # Ubuntu version
```

---

## System Monitoring

```bash
top                         # Real-time processes
htop                        # Better process viewer (install first)
df -h                       # Disk usage (human-readable)
free -m                     # Memory usage in MB
kill <process_id>           # Terminate a process
ps aux                      # List all processes
uptime                      # System uptime
```

---

## File Management

```bash
ls                          # List files
ls -la                      # List all with details
touch <filename>            # Create empty file
cp <source> <dest>          # Copy file
mv <source> <dest>          # Move/rename file
rm <filename>               # Delete file
rm -rf <directory>          # Delete directory (careful!)
```

---

## Directory Navigation

```bash
pwd                         # Current directory
cd <directory>              # Change directory
cd ..                       # Go up one level
cd ~                        # Go to home
mkdir <dirname>             # Create directory
mkdir -p path/to/dir        # Create nested directories
```

---

## File Permissions

```bash
chmod [who][+/-][perms] <file>    # Change permissions
chmod u+x <file>                   # Make executable
chmod 755 <file>                   # rwxr-xr-x
chown [user]:[group] <file>        # Change owner
```

---

## Service Management (systemd)

```bash
sudo systemctl start <service>    # Start service
sudo systemctl stop <service>     # Stop service
sudo systemctl restart <service>  # Restart service
sudo systemctl status <service>   # Check status
sudo systemctl enable <service>   # Enable on boot
sudo systemctl disable <service>  # Disable on boot
sudo systemctl daemon-reload      # Reload systemd configs

# Logs
journalctl -f                     # Follow live logs
journalctl -u <unit_name>         # Logs for specific service
journalctl --since "1 hour ago"   # Recent logs
```

---

## Package Management (apt)

```bash
sudo apt update                   # Update package lists
sudo apt upgrade                  # Upgrade packages
sudo apt full-upgrade             # Full system upgrade
sudo apt install <package>        # Install package
sudo apt remove <package>         # Remove package
sudo apt autoremove               # Remove unused packages
sudo apt search <term>            # Search packages
apt list --installed              # List installed
```

---

## Network Commands

```bash
ip addr                           # Show IP addresses
ip link                           # Network interfaces
ping <host>                       # Test connectivity
ss -tuln                          # Show listening ports
curl <url>                        # Fetch URL
wget <url>                        # Download file
```

---

## Firewall (UFW)

```bash
sudo ufw status                   # Check firewall status
sudo ufw enable                   # Enable firewall
sudo ufw disable                  # Disable firewall
sudo ufw allow <port>             # Open port
sudo ufw deny <port>              # Block port
sudo ufw allow ssh                # Allow SSH
```

---

## Text Editing & Viewing

```bash
nano <file>                       # Edit with nano
cat <file>                        # Display file
less <file>                       # Page through file
head <file>                       # First 10 lines
tail <file>                       # Last 10 lines
tail -f <file>                    # Follow file (live logs)
grep <pattern> <file>             # Search in file
```

---

## Searching

```bash
find /path -name "filename"       # Find by name
find /path -type f -name "*.log"  # Find files by extension
grep -r "pattern" /path           # Search in files recursively
which <command>                   # Find command location
```

---

## Archiving & Compression

```bash
tar -czvf archive.tar.gz <files>  # Create tar.gz
tar -xvf archive.tar.gz           # Extract tar.gz
zip -r archive.zip <directory>    # Create zip
unzip archive.zip                 # Extract zip
```

---

## Background Jobs

```bash
<command> &                       # Run in background
jobs                              # List background jobs
fg <job_number>                   # Bring to foreground
bg <job_number>                   # Continue in background
nohup <command> &                 # Run after logout
screen                            # Terminal multiplexer
```

---

## Cron Jobs

```bash
crontab -e                        # Edit cron jobs
crontab -l                        # List cron jobs

# Cron format: minute hour day month weekday command
# Examples:
# 0 * * * * /script.sh           # Every hour
# 0 0 * * * /script.sh           # Daily at midnight
# */5 * * * * /script.sh         # Every 5 minutes
```

---

## User Management

```bash
whoami                            # Current user
sudo adduser <username>           # Add user
sudo deluser <username>           # Delete user
sudo usermod -aG <group> <user>   # Add user to group
passwd                            # Change password
su - <username>                   # Switch user
```

---

## TempleOS-Specific Commands

### Gaming Stack
```bash
# Check HWE kernel
uname -r                          # Should show 6.8+

# GPU drivers
ubuntu-drivers devices            # Detect GPU
sudo ubuntu-drivers autoinstall   # Install drivers
nvidia-smi                        # NVIDIA status

# Steam
steam                             # Launch Steam
steam -bigpicture                 # Big Picture mode
gamescope -- steam                # Steam via Gamescope
```

### Kiosk Management
```bash
# Restart Electron shell
sudo systemctl restart sway

# Check auto-login
cat /etc/systemd/system/getty@tty1.service.d/autologin.conf

# View shell logs
journalctl -u sway -f
```

### Updates
```bash
# Update TempleOS app from GitHub
cd /opt/templeos
git pull origin main
npm install
npm run electron:build

# System updates
sudo apt update && sudo apt upgrade
```

---

## Shutdown & Reboot

```bash
sudo reboot                       # Reboot
sudo shutdown now                 # Shutdown immediately
sudo shutdown -h +10              # Shutdown in 10 minutes
```

---

## Quick Reference Table

| Task | Command |
|------|---------|
| Update system | `sudo apt update && sudo apt upgrade` |
| Check kernel | `uname -r` |
| Check disk space | `df -h` |
| Check memory | `free -m` |
| View logs | `journalctl -f` |
| Restart service | `sudo systemctl restart <service>` |
| Firewall status | `sudo ufw status` |
| GPU info | `nvidia-smi` or `glxinfo` |

---

## Gamescope (Gaming Compositor)

```bash
# Basic usage
gamescope -- <game>                    # Run game through Gamescope
gamescope -- %command%                 # Steam launch option

# Resolution & Framerate
gamescope -W 1920 -H 1080 -- <game>   # Output resolution
gamescope -w 1280 -h 720 -- <game>    # Internal render resolution
gamescope -r 60 -- <game>             # Limit to 60 FPS
gamescope -o 30 -- <game>             # FPS when unfocused

# Display modes
gamescope -f -- <game>                # Fullscreen
gamescope -b -- <game>                # Borderless window

# Upscaling
gamescope -F fsr -- <game>            # AMD FSR upscaling
gamescope -F nis -- <game>            # NVIDIA NIS upscaling
gamescope -S integer -- <game>        # Integer scaling
gamescope --sharpness 4 -- <game>     # Sharpness (0-20)

# HDR
gamescope --hdr-enabled -- <game>     # Enable HDR

# With MangoHud
gamescope --mangoapp -- <game>        # MangoHud on top
```

### Gamescope Keyboard Shortcuts (In-Game)
| Shortcut | Action |
|----------|--------|
| Super + F | Toggle fullscreen |
| Super + N | Toggle nearest neighbor |
| Super + U | Toggle FSR |
| Super + Y | Toggle NIS |
| Super + I/O | Increase/decrease sharpness |
| Super + S | Screenshot |

---

## Sway (Wayland Compositor)

### Essential Shortcuts (Mod = Super/Windows key)
| Shortcut | Action |
|----------|--------|
| Mod + Enter | Open terminal |
| Mod + d | Application launcher |
| Mod + Shift + Q | Close window |
| Mod + Shift + E | Exit Sway |
| Mod + Shift + C | Reload config |
| Mod + F | Fullscreen |
| Mod + Space | Toggle tiling/floating |
| Mod + Arrow keys | Move focus |
| Mod + Shift + Arrows | Move window |
| Mod + 1-9 | Switch workspace |
| Mod + Shift + 1-9 | Move window to workspace |
| Mod + R | Resize mode |

### Sway Commands
```bash
sway                              # Start Sway
swaymsg exit                      # Exit Sway
swaymsg reload                    # Reload config
swaymsg "workspace 1"             # Switch workspace via script
```

---

## MangoHud (Performance Overlay)

```bash
# Enable for single game (Steam launch option)
mangohud %command%

# Enable for all Steam games
mangohud steam-runtime

# Enable for any application
mangohud <application>
MANGOHUD=1 <application>

# Configuration
mangohud --config /path/to/config    # Custom config
mangohud --fps-only <app>            # Show only FPS
mangohud --full <app>                # Full stats

# Config location: ~/.config/MangoHud/MangoHud.conf
```

### MangoHud Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| RShift + F12 | Toggle overlay |
| RShift + F11 | Change position |
| RShift + F10 | Toggle preset |

---

## GameMode (Performance Optimizer)

```bash
# Run with GameMode
gamemoderun <game>
gamemoderun %command%              # Steam launch option

# Combine with MangoHud
mangohud gamemoderun <game>

# Config: /etc/gamemode.ini or ~/.config/gamemode.ini
```

---

## Steam + Proton

```bash
# Launch Steam
steam                              # Normal mode
steam -bigpicture                  # Big Picture mode
gamescope -f -- steam -bigpicture  # Via Gamescope

# Launch specific game
steam steam://run/<GAME_ID>

# Proton environment variables (Steam launch options)
PROTON_ENABLE_NVAPI=1 %command%    # Enable NVIDIA features
DXVK_ENABLE_NVAPI=1 %command%      # Enable DLSS/RTX
PROTON_LOG=1 %command%             # Enable logging
PROTON_USE_WINED3D=1 %command%     # Use OpenGL instead of Vulkan
```

---

## Electron (Wayland Flags)

```bash
# Run Electron on Wayland
./electron-app --ozone-platform=wayland --enable-features=UseOzonePlatform

# Auto-detect platform
./electron-app --ozone-platform-hint=auto

# With window decorations
./electron-app --enable-features=UseOzonePlatform,WaylandWindowDecorations

# Debugging
electron --inspect=9229 .         # Debug main process
electron --inspect-brk=9229 .     # Break on first line
electron --enable-logging         # Enable Chrome logging
```

---

## Node.js / npm

```bash
# Version info
node -v                           # Node version
npm -v                            # npm version

# Project setup
npm init                          # Create package.json
npm init -y                       # Create with defaults
npm install                       # Install dependencies
npm ci                            # Clean install (CI/CD)

# Package management
npm install <package>             # Install package
npm install -g <package>          # Install globally
npm install --save-dev <package>  # Install as dev dependency
npm uninstall <package>           # Remove package
npm update                        # Update all packages
npm outdated                      # Check for updates
npm audit                         # Security scan
npm audit fix                     # Auto-fix vulnerabilities

# Scripts
npm start                         # Run start script
npm test                          # Run test script
npm run <script-name>             # Run custom script
npm run dev                       # Common dev server

# Cache
npm cache clean --force           # Clear cache
```

---

## Git

```bash
# Basics
git status                        # Check status
git add -A                        # Stage all changes
git commit -m "message"           # Commit
git push                          # Push to remote
git pull                          # Pull from remote

# Branching
git branch                        # List branches
git checkout <branch>             # Switch branch
git checkout -b <new-branch>      # Create and switch

# History
git log --oneline -10             # Last 10 commits
git diff                          # Show changes

# Undoing
git checkout -- <file>            # Discard file changes
git reset --hard HEAD             # Reset to last commit
git stash                         # Stash changes
git stash pop                     # Apply stashed changes
```

---

## GPU Commands

```bash
# NVIDIA
nvidia-smi                        # GPU status
nvidia-settings                   # GUI settings
watch -n 1 nvidia-smi             # Live monitoring

# AMD/Intel (Mesa)
glxinfo | grep "OpenGL"           # OpenGL info
vulkaninfo                        # Vulkan info
vainfo                            # Video acceleration info

# General
lspci | grep VGA                  # List GPUs
lspci -k | grep -A 2 VGA          # GPU with drivers
```

---

## PipeWire Audio

```bash
# Status
wpctl status                      # WirePlumber status
pactl info                        # PulseAudio info
pw-cli ls Node                    # List nodes

# Volume
wpctl set-volume @DEFAULT_SINK@ 50%     # Set volume
wpctl set-mute @DEFAULT_SINK@ toggle    # Toggle mute
```

---

## 🔗 Online Documentation (When Command Not Found)

### Official Documentation
| Tool | URL |
|------|-----|
| **Ubuntu Manual** | https://manpages.ubuntu.com |
| **Arch Wiki** | https://wiki.archlinux.org (excellent for all Linux) |
| **Gamescope** | https://github.com/ValveSoftware/gamescope |
| **Sway** | https://github.com/swaywm/sway/wiki |
| **MangoHud** | https://github.com/flightlessmango/MangoHud |
| **GameMode** | https://github.com/FeralInteractive/gamemode |
| **Electron** | https://www.electronjs.org/docs |
| **Steam/Proton** | https://github.com/ValveSoftware/Proton |
| **ProtonDB** | https://www.protondb.com (game compatibility) |

### Command Lookup
| Resource | URL |
|----------|-----|
| **explainshell** | https://explainshell.com (explains any command) |
| **tldr pages** | https://tldr.sh (simplified man pages) |
| **cheat.sh** | https://cheat.sh (curl cheat.sh/command) |
| **Linux Command Library** | https://linuxcommandlibrary.com |

### Quick CLI Help
```bash
man <command>                     # Manual page
<command> --help                  # Help flag
tldr <command>                    # Simplified help (install tldr first)
curl cheat.sh/<command>           # Online cheat sheet
```
