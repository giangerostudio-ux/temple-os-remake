# FIX: Security Settings (Ubuntu 24.04)

## Problem
Multiple security settings have UI but are either visual-only (toggle state but no backend) or missing event handlers.

## UI Elements and Status

### Firewall (UFW)
```
.firewall-toggle     → Handler exists? Need to verify
.fw-add-btn          → Handler exists? Need to verify
.fw-delete-btn       → Handler exists? Need to verify
.fw-refresh-btn      → Handler exists? Need to verify
```

### VeraCrypt
```
.vc-mount-btn        → Handler exists? Need to verify
.vc-dismount-btn     → Handler exists? Need to verify
.vc-refresh-btn      → Handler exists? Need to verify
```

### Tor
```
.sec-toggle[data-sec-key="tor"] → Handler exists? Need to verify
```

### Other Security Toggles (VISUAL ONLY - no backend)
```
.sec-toggle[data-sec-key="encryption"]      → Local state only
.sec-toggle[data-sec-key="mac"]             → Local state only
.sec-toggle[data-sec-key="shred"]           → Local state only
.sec-toggle[data-sec-key="tracker-blocking"] → Local state only
```

---

## UFW Firewall (Ubuntu 24.04)

### Commands
```bash
# Check status
sudo ufw status verbose

# Enable firewall
sudo ufw enable

# Disable firewall
sudo ufw disable

# Allow port
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp

# Deny port
sudo ufw deny 8080/tcp

# Delete rule by number
sudo ufw status numbered
sudo ufw delete 2

# Reset all rules
sudo ufw reset
```

### Electron IPC for UFW
```typescript
// Check UFW status
ipcMain.handle('getFirewallStatus', async () => {
  return new Promise((resolve) => {
    exec('sudo ufw status verbose', (err, stdout) => {
      const enabled = stdout.includes('Status: active');
      resolve({ success: true, enabled });
    });
  });
});

// Enable/disable firewall
ipcMain.handle('setFirewallEnabled', async (_, enabled: boolean) => {
  return new Promise((resolve) => {
    exec(`sudo ufw ${enabled ? 'enable' : 'disable'} --force`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Add rule
ipcMain.handle('addFirewallRule', async (_, port: number, protocol: string, action: string) => {
  const cmd = action === 'ALLOW' 
    ? `sudo ufw allow ${port}/${protocol}`
    : `sudo ufw deny ${port}/${protocol}`;
  return new Promise((resolve) => {
    exec(cmd, (err) => {
      resolve({ success: !err });
    });
  });
});

// List rules
ipcMain.handle('listFirewallRules', async () => {
  return new Promise((resolve) => {
    exec('sudo ufw status numbered', (err, stdout) => {
      // Parse output like "[ 1] 22/tcp ALLOW Anywhere"
      const rules = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/\[\s*(\d+)\]\s+(.+?)\s+(ALLOW|DENY|REJECT)\s+(.+)/);
        if (match) {
          rules.push({ id: match[1], to: match[2], action: match[3], from: match[4] });
        }
      }
      resolve({ success: true, rules });
    });
  });
});

// Delete rule
ipcMain.handle('deleteFirewallRule', async (_, ruleNumber: number) => {
  return new Promise((resolve) => {
    exec(`sudo ufw delete ${ruleNumber} --force`, (err) => {
      resolve({ success: !err });
    });
  });
});
```

---

## VeraCrypt (Ubuntu 24.04)

### Install
```bash
sudo apt install veracrypt
# Or download from veracrypt.io
```

### Commands
```bash
# List mounted volumes
veracrypt --list

# Mount volume (interactive - asks for password)
sudo veracrypt /path/to/volume.hc /mnt/veracrypt1

# Mount with password (non-interactive) - SECURITY RISK
sudo veracrypt --password="pass" /path/to/volume.hc /mnt/veracrypt1

# Mount with stdin password
echo "password" | sudo veracrypt --stdin /path/to/volume.hc /mnt/veracrypt1

# Dismount specific volume
sudo veracrypt --dismount /mnt/veracrypt1

# Dismount all
sudo veracrypt --dismount
```

### Electron IPC for VeraCrypt
```typescript
// List mounted volumes
ipcMain.handle('listVeraCryptVolumes', async () => {
  return new Promise((resolve) => {
    exec('veracrypt --text --list', (err, stdout) => {
      if (err || !stdout.trim()) {
        return resolve({ success: true, volumes: [] });
      }
      // Parse output
      const volumes = [];
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        // "1: /path/to/vol.hc /mnt/vc1 - -"
        const match = line.match(/(\d+):\s+(.+?)\s+(.+?)\s+/);
        if (match) {
          volumes.push({ slot: match[1], source: match[2], mountPoint: match[3] });
        }
      }
      resolve({ success: true, volumes });
    });
  });
});

// Mount volume (will need GUI prompt for password)
ipcMain.handle('mountVeraCrypt', async (_, volumePath: string, mountPoint: string, password: string) => {
  return new Promise((resolve) => {
    // Using stdin for password
    const child = spawn('sudo', ['veracrypt', '--stdin', volumePath, mountPoint], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.write(password + '\n');
    child.stdin.end();
    
    child.on('close', (code) => {
      resolve({ success: code === 0 });
    });
  });
});

// Dismount
ipcMain.handle('dismountVeraCrypt', async (_, mountPoint: string) => {
  return new Promise((resolve) => {
    exec(`sudo veracrypt --dismount ${mountPoint}`, (err) => {
      resolve({ success: !err });
    });
  });
});
```

---

## Tor Service (Ubuntu 24.04)

### Install
```bash
sudo apt install tor
```

### Commands
```bash
# Start Tor
sudo systemctl start tor

# Stop Tor
sudo systemctl stop tor

# Check status
sudo systemctl status tor

# Enable at boot
sudo systemctl enable tor

# Check if Tor is running
curl --socks5 localhost:9050 https://check.torproject.org/api/ip
```

### Electron IPC for Tor
```typescript
// Check Tor status
ipcMain.handle('getTorStatus', async () => {
  return new Promise((resolve) => {
    exec('systemctl is-active tor', (err, stdout) => {
      const running = stdout.trim() === 'active';
      resolve({ success: true, running });
    });
  });
});

// Start/stop Tor
ipcMain.handle('setTorEnabled', async (_, enabled: boolean) => {
  return new Promise((resolve) => {
    exec(`sudo systemctl ${enabled ? 'start' : 'stop'} tor`, (err) => {
      resolve({ success: !err });
    });
  });
});
```

---

## Visual-Only Settings (No Real Backend)

These settings toggle state but have **no actual Linux implementation**:

| Setting | What it should do | Linux Implementation Needed |
|---------|------------------|----------------------------|
| LUKS Encryption Toggle | Encrypt/decrypt disk | **DANGEROUS** - requires `cryptsetup`, cannot hot-swap |
| MAC Randomization | Randomize MAC on reconnect | `macchanger` before network connect |
| Secure Delete | Shred files on delete | Use `shred` instead of `rm` |
| Tracker Blocking | Block ads/trackers | Modify `/etc/hosts` or use `pihole` |

### MAC Randomization
```bash
# Install macchanger
sudo apt install macchanger

# Randomize MAC (requires interface down)
sudo ip link set eth0 down
sudo macchanger -r eth0
sudo ip link set eth0 up
```

### Secure Delete
```bash
# Instead of rm, use shred
shred -vfz -n 5 file.txt

# For directories
find /path/to/dir -type f -exec shred -vfz {} \;
rm -rf /path/to/dir
```

---

## Files to Modify
1. `src/main.ts` - Verify/add event handlers for security settings
2. Electron main process - Add IPC handlers for ufw, veracrypt, systemctl
