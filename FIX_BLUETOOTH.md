# FIX: Bluetooth Settings (Ubuntu 24.04)

## Problem
Bluetooth toggle, scan, connect buttons don't work. UI exists with mock data, no real backend.

## UI Elements Missing Handlers
```
.bt-enable-toggle    → No handler
.bt-scan-btn         → No handler
.bt-connect-btn      → No handler
```

## Ubuntu 24.04 Backend Commands

Uses **BlueZ** via `bluetoothctl`.

### Check Bluetooth Status
```bash
# Check if bluetooth service is running
systemctl status bluetooth

# Start bluetooth service
sudo systemctl start bluetooth
sudo systemctl enable bluetooth
```

### Using bluetoothctl

```bash
# Enter interactive mode
bluetoothctl

# Inside bluetoothctl:
power on              # Turn on Bluetooth adapter
power off             # Turn off Bluetooth adapter
scan on               # Start scanning for devices
scan off              # Stop scanning
devices               # List discovered devices
paired-devices        # List paired devices
pair XX:XX:XX:XX:XX   # Pair with device (use MAC address)
trust XX:XX:XX:XX:XX  # Trust device
connect XX:XX:XX:XX   # Connect to device
disconnect XX:XX:XX   # Disconnect device
remove XX:XX:XX       # Remove/forget device
exit                  # Exit bluetoothctl
```

### Non-Interactive Commands
```bash
# Power on
bluetoothctl power on

# Start scan (runs in background)
bluetoothctl scan on &

# List devices (after scanning)
bluetoothctl devices

# Pair and connect
bluetoothctl pair XX:XX:XX:XX:XX:XX
bluetoothctl trust XX:XX:XX:XX:XX:XX
bluetoothctl connect XX:XX:XX:XX:XX:XX

# Disconnect
bluetoothctl disconnect XX:XX:XX:XX:XX:XX
```

## Electron IPC Implementation

```typescript
const { exec, spawn } = require('child_process');

// Enable/disable Bluetooth
ipcMain.handle('setBluetoothEnabled', async (_, enabled: boolean) => {
  return new Promise((resolve) => {
    exec(`bluetoothctl power ${enabled ? 'on' : 'off'}`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Scan for devices (returns after timeout)
ipcMain.handle('scanBluetoothDevices', async () => {
  return new Promise((resolve) => {
    // Start scan
    exec('bluetoothctl scan on', () => {});
    
    // Wait 5 seconds then get devices
    setTimeout(() => {
      exec('bluetoothctl devices', (err, stdout) => {
        exec('bluetoothctl scan off', () => {});
        
        if (err) return resolve({ success: false });
        
        const devices = stdout.trim().split('\n').map(line => {
          // "Device XX:XX:XX:XX:XX:XX Device Name"
          const match = line.match(/Device\s+([A-F0-9:]+)\s+(.+)/i);
          if (match) {
            return { mac: match[1], name: match[2] };
          }
          return null;
        }).filter(Boolean);
        
        resolve({ success: true, devices });
      });
    }, 5000);
  });
});

// Get paired devices
ipcMain.handle('getPairedBluetoothDevices', async () => {
  return new Promise((resolve) => {
    exec('bluetoothctl paired-devices', (err, stdout) => {
      if (err) return resolve({ success: false, devices: [] });
      
      const devices = stdout.trim().split('\n').map(line => {
        const match = line.match(/Device\s+([A-F0-9:]+)\s+(.+)/i);
        if (match) return { mac: match[1], name: match[2] };
        return null;
      }).filter(Boolean);
      
      resolve({ success: true, devices });
    });
  });
});

// Connect to device
ipcMain.handle('connectBluetoothDevice', async (_, mac: string) => {
  return new Promise((resolve) => {
    exec(`bluetoothctl connect ${mac}`, (err, stdout) => {
      const success = stdout.includes('Connection successful');
      resolve({ success, error: err?.message });
    });
  });
});

// Disconnect device
ipcMain.handle('disconnectBluetoothDevice', async (_, mac: string) => {
  return new Promise((resolve) => {
    exec(`bluetoothctl disconnect ${mac}`, (err) => {
      resolve({ success: !err });
    });
  });
});
```

## Frontend Event Handlers

```typescript
// Add to setupEventListeners()

app.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  
  if (target.matches('.bt-enable-toggle')) {
    const enabled = target.checked;
    this.bluetoothEnabled = enabled;
    window.electronAPI?.setBluetoothEnabled?.(enabled);
    this.render();
  }
});

app.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  
  if (target.matches('.bt-scan-btn')) {
    if (this.bluetoothScanning) return;
    this.bluetoothScanning = true;
    this.render();
    
    window.electronAPI?.scanBluetoothDevices?.().then((res) => {
      this.bluetoothScanning = false;
      if (res.success && res.devices) {
        this.bluetoothDevices = res.devices.map(d => ({
          name: d.name,
          mac: d.mac,
          connected: false,
          type: 'unknown'
        }));
      }
      this.render();
    });
  }
  
  if (target.matches('.bt-connect-btn')) {
    const mac = target.dataset.mac;
    const device = this.bluetoothDevices.find(d => d.mac === mac);
    
    if (device && mac) {
      if (device.connected) {
        window.electronAPI?.disconnectBluetoothDevice?.(mac).then(() => {
          device.connected = false;
          this.render();
        });
      } else {
        window.electronAPI?.connectBluetoothDevice?.(mac).then((res) => {
          device.connected = res.success;
          this.render();
        });
      }
    }
  }
});
```

## Note: Hardware Requirement
Bluetooth requires:
1. A Bluetooth adapter (USB dongle or built-in)
2. BlueZ package installed: `sudo apt install bluez`
3. Bluetooth service running: `sudo systemctl enable --now bluetooth`

## Files to Modify
1. `src/main.ts` - Add event handlers, update bluetoothDevices type to include `mac`
2. Electron main process - Add bluetoothctl IPC handlers
