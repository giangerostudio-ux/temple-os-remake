# FIX: Mouse & Input Settings (Ubuntu 24.04)

## Problem
Mouse speed, DPI, raw input toggle don't work. UI exists but no event handlers.

## UI Elements Missing Handlers
```
.mouse-speed-slider    → No handler
.mouse-dpi-select      → No handler
.mouse-raw-toggle      → No handler
```

## Ubuntu 24.04 Backend Commands

Uses **libinput** via `xinput` on X11.

### List Input Devices
```bash
xinput list

# Example output:
# ⎡ Virtual core pointer                    	id=2	[master pointer  (3)]
# ⎜   ↳ Logitech USB Optical Mouse            	id=8	[slave  pointer  (2)]
```

### Get Device Properties
```bash
xinput list-props "Logitech USB Optical Mouse"

# Or by ID:
xinput list-props 8
```

### Set Pointer Speed/Acceleration
```bash
# Get property ID first
xinput list-props 8 | grep "Accel Speed"

# Set acceleration/speed (-1 to 1, where 0 is default)
xinput set-prop 8 "libinput Accel Speed" 0.5

# Disable acceleration (raw input)
xinput set-prop 8 "libinput Accel Profile Enabled" 0, 1
# (First value = adaptive/default, Second value = flat/raw)
```

### Set Natural Scrolling
```bash
# Enable natural scrolling
xinput set-prop 8 "libinput Natural Scrolling Enabled" 1

# Disable
xinput set-prop 8 "libinput Natural Scrolling Enabled" 0
```

### Note on DPI
DPI is typically a **hardware setting** on the mouse itself, not controllable via software for most mice. Some gaming mice with custom drivers (like Logitech G Hub, Razer Synapse) have their own utilities.

For basic mice, DPI selection in the UI should be informational only or use `xinput` to adjust effective sensitivity.

## Electron IPC Implementation

```typescript
const { exec } = require('child_process');

// List mouse devices
ipcMain.handle('listMouseDevices', async () => {
  return new Promise((resolve) => {
    exec('xinput list --short | grep -i "pointer\\|mouse"', (err, stdout) => {
      if (err) return resolve({ success: false });
      const devices = stdout.trim().split('\n').map(line => {
        const match = line.match(/(.+?)\s+id=(\d+)/);
        if (match) return { name: match[1].trim(), id: match[2] };
        return null;
      }).filter(Boolean);
      resolve({ success: true, devices });
    });
  });
});

// Set mouse speed
ipcMain.handle('setMouseSpeed', async (_, deviceId: string, speed: number) => {
  // speed should be -1 to 1
  return new Promise((resolve) => {
    exec(`xinput set-prop ${deviceId} "libinput Accel Speed" ${speed}`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Set raw input (disable acceleration)
ipcMain.handle('setMouseRawInput', async (_, deviceId: string, enabled: boolean) => {
  // Accel Profile: 0,1 = flat (raw), 1,0 = adaptive (accelerated)
  const profile = enabled ? '0, 1' : '1, 0';
  return new Promise((resolve) => {
    exec(`xinput set-prop ${deviceId} "libinput Accel Profile Enabled" ${profile}`, (err) => {
      resolve({ success: !err });
    });
  });
});
```

## Frontend Event Handlers

```typescript
// Add to setupEventListeners()

app.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  
  if (target.matches('.mouse-speed-slider')) {
    const speed = parseFloat(target.value); // -1 to 1
    this.mouseSettings.speed = speed;
    window.electronAPI?.setMouseSpeed?.('all', speed);
    this.queueSaveConfig();
  }
});

app.addEventListener('change', (e) => {
  const target = e.target as HTMLElement;
  
  if (target.matches('.mouse-dpi-select')) {
    const dpi = parseInt((target as HTMLSelectElement).value);
    this.mouseSettings.dpi = dpi;
    // Note: DPI is typically hardware-controlled
    this.queueSaveConfig();
    this.showNotification('Mouse', `DPI set to ${dpi} (software setting)`, 'info');
  }
  
  if (target.matches('.mouse-raw-toggle')) {
    const raw = (target as HTMLInputElement).checked;
    this.mouseSettings.raw = raw;
    window.electronAPI?.setMouseRawInput?.('all', raw);
    this.queueSaveConfig();
  }
});
```

## Files to Modify
1. `src/main.ts` - Add event handlers
2. Electron main process - Add xinput IPC handlers
