# FIX: Display Settings (Ubuntu 24.04)

## Problem
Display resolution, refresh rate, scale, orientation settings don't work. UI exists but no event handlers.

## UI Elements Missing Handlers
```
.display-output-select     → No handler (monitor picker)
.display-mode-select       → No handler (resolution)
.display-scale-slider      → No handler
.display-transform-select  → No handler (orientation)
.display-move-btn          → No handler
.display-refresh-btn       → No handler
```

## Ubuntu 24.04 Backend Commands

For **X11**: Use `xrandr`  
For **Wayland/Sway**: Use `wlr-randr` or `swaymsg`

### List Displays and Resolutions
```bash
# X11
xrandr

# Wayland (if using wlr-randr)
wlr-randr
```

### Set Resolution (X11)
```bash
# List available modes
xrandr --listmonitors

# Set resolution
xrandr --output HDMI-1 --mode 1920x1080

# Set resolution with refresh rate
xrandr --output HDMI-1 --mode 1920x1080 --rate 60
```

### Set Orientation/Rotation (X11)
```bash
# Normal (landscape)
xrandr --output HDMI-1 --rotate normal

# 90 degrees (portrait left)
xrandr --output HDMI-1 --rotate left

# 180 degrees (upside down)
xrandr --output HDMI-1 --rotate inverted

# 270 degrees (portrait right)
xrandr --output HDMI-1 --rotate right
```

### Set Scale (X11 - limited support)
```bash
# Scale 1.5x
xrandr --output HDMI-1 --scale 1.5x1.5
```

### Wayland/Sway Commands
```bash
# List outputs
swaymsg -t get_outputs

# Set resolution
swaymsg output HDMI-A-1 resolution 1920x1080

# Set scale
swaymsg output HDMI-A-1 scale 1.5

# Set rotation
swaymsg output HDMI-A-1 transform 90
```

### Move Window to Display (Electron)
```javascript
// In Electron main process
const { screen, BrowserWindow } = require('electron');

// Get all displays
const displays = screen.getAllDisplays();

// Move window to specific display
function moveWindowToDisplay(win, displayIndex) {
  const display = displays[displayIndex];
  if (display) {
    win.setBounds({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height
    });
  }
}
```

## Electron IPC Implementation

### In main process:
```typescript
const { exec } = require('child_process');
const { screen, BrowserWindow } = require('electron');

// Get displays
ipcMain.handle('getDisplays', async () => {
  return new Promise((resolve) => {
    exec('xrandr --query', (err, stdout) => {
      if (err) return resolve({ success: false });
      
      const displays = [];
      const lines = stdout.split('\n');
      let currentDisplay = null;
      
      for (const line of lines) {
        // Output line: "HDMI-1 connected primary 1920x1080+0+0"
        const outputMatch = line.match(/^(\S+)\s+(connected|disconnected)\s*(primary)?\s*(\d+x\d+\+\d+\+\d+)?/);
        if (outputMatch) {
          if (currentDisplay) displays.push(currentDisplay);
          currentDisplay = {
            name: outputMatch[1],
            connected: outputMatch[2] === 'connected',
            primary: !!outputMatch[3],
            modes: []
          };
        }
        // Resolution line: "   1920x1080     60.00*+  59.94"
        const modeMatch = line.match(/^\s+(\d+x\d+)\s+([\d.]+)\*/);
        if (modeMatch && currentDisplay) {
          currentDisplay.currentMode = modeMatch[1];
          currentDisplay.currentRefresh = parseFloat(modeMatch[2]);
        }
      }
      if (currentDisplay) displays.push(currentDisplay);
      
      resolve({ success: true, displays });
    });
  });
});

// Set resolution
ipcMain.handle('setResolution', async (_, output: string, mode: string) => {
  return new Promise((resolve) => {
    exec(`xrandr --output ${output} --mode ${mode}`, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
});

// Set orientation
ipcMain.handle('setOrientation', async (_, output: string, rotation: string) => {
  const rotationMap = { 'normal': 'normal', '90': 'left', '180': 'inverted', '270': 'right' };
  return new Promise((resolve) => {
    exec(`xrandr --output ${output} --rotate ${rotationMap[rotation] || 'normal'}`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Move window to display
ipcMain.handle('moveWindowToDisplay', async (_, displayName: string) => {
  const displays = screen.getAllDisplays();
  const win = BrowserWindow.getFocusedWindow();
  const targetDisplay = displays.find(d => d.label === displayName || d.id.toString() === displayName);
  
  if (win && targetDisplay) {
    win.setBounds(targetDisplay.bounds);
    return { success: true };
  }
  return { success: false };
});
```

## Frontend Event Handlers

```typescript
// Add to setupEventListeners()

app.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  
  if (target.matches('.display-output-select')) {
    this.activeDisplayOutput = target.value;
    this.refreshSettingsWindow();
  }
  
  if (target.matches('.display-mode-select')) {
    const mode = target.value; // "1920x1080@60"
    window.electronAPI?.setResolution?.(this.activeDisplayOutput, mode);
  }
  
  if (target.matches('.display-transform-select')) {
    const rotation = target.value; // "normal", "90", "180", "270"
    window.electronAPI?.setOrientation?.(this.activeDisplayOutput, rotation);
  }
});

app.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.matches('.display-scale-slider')) {
    // Scale changes - may only work on Wayland
    const scale = parseFloat(target.value);
    window.electronAPI?.setDisplayScale?.(this.activeDisplayOutput, scale);
  }
});

app.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  
  if (target.matches('.display-move-btn')) {
    const output = target.dataset.output;
    if (output) {
      window.electronAPI?.moveWindowToDisplay?.(output);
    }
  }
  
  if (target.matches('.display-refresh-btn')) {
    this.refreshDisplayOutputs();
  }
});
```

## Files to Modify
1. `src/main.ts` - Add event handlers in `setupEventListeners()`
2. Electron main process - Add xrandr IPC handlers
