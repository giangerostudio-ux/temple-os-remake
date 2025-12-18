# FIX: Audio Settings (Ubuntu 24.04 + PipeWire)

## Problem
Volume slider, audio output/input device selection don't work. UI exists but no event handlers.

## UI Elements Missing Handlers
```
.volume-slider          → No handler found
.audio-sink-select      → No handler found  
.audio-source-select    → No handler found
.audio-refresh-btn      → No handler found
```

## Ubuntu 24.04 Backend Commands

Ubuntu 24.04 uses **PipeWire** (not PulseAudio). The tool is `wpctl`.

### List Audio Devices
```bash
# List all sinks (outputs)
wpctl status

# List sinks specifically
pactl list sinks short

# List sources (inputs)  
pactl list sources short
```

### Set Default Sink (Output)
```bash
# Get sink ID first
wpctl status

# Set default sink by ID
wpctl set-default <sink_id>

# Example:
wpctl set-default 47
```

### Set Default Source (Input)
```bash
wpctl set-default <source_id>
```

### Set Volume
```bash
# Set volume to 50%
wpctl set-volume @DEFAULT_SINK@ 0.5

# Set volume to 100%
wpctl set-volume @DEFAULT_SINK@ 1.0

# Increase by 5%
wpctl set-volume @DEFAULT_SINK@ 5%+

# Decrease by 5%
wpctl set-volume @DEFAULT_SINK@ 5%-
```

### Mute/Unmute
```bash
# Toggle mute
wpctl set-mute @DEFAULT_SINK@ toggle

# Mute
wpctl set-mute @DEFAULT_SINK@ 1

# Unmute
wpctl set-mute @DEFAULT_SINK@ 0
```

## Electron IPC Implementation

### In main process (main.ts or preload):
```typescript
// List audio devices
ipcMain.handle('listAudioDevices', async () => {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    exec('pactl list sinks short && echo "---SOURCES---" && pactl list sources short', (err, stdout) => {
      if (err) return resolve({ success: false, error: err.message });
      const [sinksRaw, sourcesRaw] = stdout.split('---SOURCES---');
      const sinks = sinksRaw.trim().split('\n').filter(Boolean).map(line => {
        const [id, name, driver, format, state] = line.split('\t');
        return { id, name, driver, state };
      });
      const sources = sourcesRaw.trim().split('\n').filter(Boolean).map(line => {
        const [id, name, driver, format, state] = line.split('\t');
        return { id, name, driver, state };
      });
      resolve({ success: true, sinks, sources });
    });
  });
});

// Set default sink
ipcMain.handle('setDefaultSink', async (_, sinkId: string) => {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    exec(`wpctl set-default ${sinkId}`, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
});

// Set volume
ipcMain.handle('setVolume', async (_, level: number) => {
  const { exec } = require('child_process');
  const volume = Math.min(1, Math.max(0, level / 100));
  return new Promise((resolve) => {
    exec(`wpctl set-volume @DEFAULT_SINK@ ${volume}`, (err) => {
      resolve({ success: !err });
    });
  });
});
```

## Frontend Event Handlers (add to setupEventListeners)

```typescript
// Volume slider
app.addEventListener('input', (e) => {
  const target = e.target as HTMLElement;
  if (target.matches('.volume-slider')) {
    const level = parseInt((target as HTMLInputElement).value);
    this.volumeLevel = level;
    window.electronAPI?.setVolume?.(level);
    this.queueSaveConfig();
  }
});

// Audio device selection
app.addEventListener('change', (e) => {
  const target = e.target as HTMLSelectElement;
  if (target.matches('.audio-sink-select')) {
    window.electronAPI?.setDefaultSink?.(target.value);
  }
  if (target.matches('.audio-source-select')) {
    window.electronAPI?.setDefaultSource?.(target.value);
  }
});

// Refresh button
app.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.matches('.audio-refresh-btn')) {
    this.refreshAudioDevices();
  }
});
```

## Files to Modify
1. `src/main.ts` - Add event handlers in `setupEventListeners()`
2. Electron main process - Add IPC handlers for `wpctl` commands
