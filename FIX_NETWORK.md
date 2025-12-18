# FIX: Network Settings (Ubuntu 24.04)

## Problem
Some network settings may have handlers but need verification. Uses NetworkManager (nmcli).

## UI Elements to Verify

```
.flight-mode-toggle          → Need to verify
.wifi-enabled-toggle         → Need to verify
.net-btn[data-net-action]    → Connect/disconnect/refresh
.saved-net-btn               → Connect/forget saved networks
.vpn-import-btn              → Import VPN profiles
.vpn-profile-btn             → Connect/disconnect VPN
.vpn-killswitch-toggle       → Kill switch
.hotspot-toggle              → Mobile hotspot
.ssh-toggle                  → SSH server
```

## Ubuntu 24.04 Backend Commands

Uses **NetworkManager** via `nmcli`.

### WiFi Commands
```bash
# List WiFi networks
nmcli device wifi list

# Connect to WiFi
nmcli device wifi connect "SSID" password "password"

# Disconnect
nmcli device disconnect wlan0

# Show connection status
nmcli general status
nmcli connection show --active

# Enable/disable WiFi
nmcli radio wifi on
nmcli radio wifi off
```

### Saved Networks
```bash
# List saved connections
nmcli connection show

# Connect to saved network
nmcli connection up "Connection Name"

# Forget/delete network
nmcli connection delete "Connection Name"
```

### VPN (OpenVPN/WireGuard)
```bash
# Import OpenVPN profile
nmcli connection import type openvpn file /path/to/config.ovpn

# Import WireGuard config
nmcli connection import type wireguard file /path/to/wg0.conf

# Connect to VPN
nmcli connection up "vpn-name"

# Disconnect VPN
nmcli connection down "vpn-name"

# Delete VPN profile
nmcli connection delete "vpn-name"

# List VPN connections
nmcli connection show | grep vpn
```

### Mobile Hotspot
```bash
# Create hotspot
nmcli device wifi hotspot ssid "MyHotspot" password "password123"

# Stop hotspot
nmcli connection down Hotspot
```

### SSH Server
```bash
# Install OpenSSH
sudo apt install openssh-server

# Start SSH
sudo systemctl start ssh

# Stop SSH
sudo systemctl stop ssh

# Check status
sudo systemctl status ssh

# Change port (edit /etc/ssh/sshd_config)
sudo nano /etc/ssh/sshd_config
# Change: Port 22 → Port 2222
sudo systemctl restart ssh
```

## Electron IPC Implementation

```typescript
// WiFi list
ipcMain.handle('listWifiNetworks', async () => {
  return new Promise((resolve) => {
    exec('nmcli -t -f SSID,SIGNAL,SECURITY,IN-USE device wifi list', (err, stdout) => {
      if (err) return resolve({ success: false, networks: [] });
      const networks = stdout.trim().split('\n').map(line => {
        const [ssid, signal, security, inUse] = line.split(':');
        return { ssid, signal: parseInt(signal), security: !!security, inUse: inUse === '*' };
      });
      resolve({ success: true, networks });
    });
  });
});

// Connect WiFi
ipcMain.handle('connectWifi', async (_, ssid: string, password: string) => {
  return new Promise((resolve) => {
    exec(`nmcli device wifi connect "${ssid}" password "${password}"`, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
});

// Disconnect
ipcMain.handle('disconnectNetwork', async () => {
  return new Promise((resolve) => {
    exec('nmcli device disconnect wlan0', (err) => {
      resolve({ success: !err });
    });
  });
});

// Set WiFi enabled
ipcMain.handle('setWifiEnabled', async (_, enabled: boolean) => {
  return new Promise((resolve) => {
    exec(`nmcli radio wifi ${enabled ? 'on' : 'off'}`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Saved networks
ipcMain.handle('listSavedNetworks', async () => {
  return new Promise((resolve) => {
    exec('nmcli -t -f NAME,UUID,TYPE connection show', (err, stdout) => {
      const networks = stdout.trim().split('\n').map(line => {
        const [name, uuid, type] = line.split(':');
        return { name, uuid, type };
      });
      resolve({ success: true, networks });
    });
  });
});

// Forget network
ipcMain.handle('forgetNetwork', async (_, uuid: string) => {
  return new Promise((resolve) => {
    exec(`nmcli connection delete "${uuid}"`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Import VPN
ipcMain.handle('importVpnProfile', async (_, filePath: string, type: 'openvpn' | 'wireguard') => {
  return new Promise((resolve) => {
    exec(`nmcli connection import type ${type} file "${filePath}"`, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
});

// Create hotspot
ipcMain.handle('createHotspot', async (_, ssid: string, password: string) => {
  return new Promise((resolve) => {
    exec(`nmcli device wifi hotspot ssid "${ssid}" password "${password}"`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Stop hotspot
ipcMain.handle('stopHotspot', async () => {
  return new Promise((resolve) => {
    exec('nmcli connection down Hotspot', (err) => {
      resolve({ success: !err });
    });
  });
});

// SSH toggle
ipcMain.handle('setSSHEnabled', async (_, enabled: boolean) => {
  return new Promise((resolve) => {
    exec(`sudo systemctl ${enabled ? 'start' : 'stop'} ssh`, (err) => {
      resolve({ success: !err });
    });
  });
});

// SSH status
ipcMain.handle('getSSHStatus', async () => {
  return new Promise((resolve) => {
    exec('systemctl is-active ssh', (err, stdout) => {
      resolve({ success: true, running: stdout.trim() === 'active' });
    });
  });
});
```

## Frontend Handlers to Verify/Add

Check if these handlers exist in `setupEventListeners`:

```typescript
// Flight mode
if (target.matches('.flight-mode-toggle')) {
  this.flightMode = (target as HTMLInputElement).checked;
  if (this.flightMode) {
    window.electronAPI?.setWifiEnabled?.(false);
    this.bluetoothEnabled = false;
  }
  this.render();
}

// WiFi toggle
if (target.matches('.wifi-enabled-toggle')) {
  const enabled = (target as HTMLInputElement).checked;
  this.networkManager.wifiEnabled = enabled;
  window.electronAPI?.setWifiEnabled?.(enabled);
  this.render();
}

// SSH toggle
if (target.matches('.ssh-toggle')) {
  const enabled = (target as HTMLInputElement).checked;
  this.sshEnabled = enabled;
  window.electronAPI?.setSSHEnabled?.(enabled);
  this.render();
}

// Hotspot toggle
if (target.matches('.hotspot-toggle')) {
  const enabled = (target as HTMLInputElement).checked;
  if (enabled) {
    window.electronAPI?.createHotspot?.(this.networkManager.hotspotSSID, this.networkManager.hotspotPassword);
  } else {
    window.electronAPI?.stopHotspot?.();
  }
  this.networkManager.hotspotEnabled = enabled;
  this.render();
}
```

## Files to Modify
1. `src/main.ts` - Verify/add network event handlers
2. Electron main process - Add nmcli IPC handlers if missing
