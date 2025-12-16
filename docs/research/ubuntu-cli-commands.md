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
