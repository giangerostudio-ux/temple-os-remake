# Task: Fix All Frontend Settings That Don't Connect to Backend

## Project Context
This is a custom Linux OS frontend (TempleOS Remake) built with:
- **Frontend**: TypeScript (`src/main.ts`) + Vite
- **Backend**: Electron (`electron/main.cjs`) with IPC handlers
- **Preload**: `electron/preload.cjs` exposes `window.electronAPI`
- **Target OS**: Ubuntu Server 24.04 LTS (the shell commands in backend must work on Ubuntu 24.04)

## Problem
Many settings in the UI are "visual only" - they render toggles/sliders but either:
1. Have no event listener in `setupEventListeners()` in `src/main.ts`
2. Have an event listener but don't call the backend via `window.electronAPI`
3. Call a backend IPC that doesn't exist or is incomplete in `electron/main.cjs`

## Your Task
1. **Audit every setting** in `getSettingsContentV2()` in `src/main.ts`
2. For each setting element (toggle, slider, button, select):
   - Find its CSS class/ID
   - Check if `setupEventListeners()` handles clicks/changes on that class
   - If handler exists, verify it calls the correct `window.electronAPI.*` method
   - If handler is missing, add it
   
3. **Cross-reference with `electron/preload.cjs`** to see all available API methods

4. **Verify backend handlers** exist in `electron/main.cjs` for each IPC channel

5. **Ensure Ubuntu 24.04 compatibility** - all shell commands must work on Ubuntu Server 24.04

---

## REQUIRED READING - Documentation Files

### Primary Reference Files (READ THESE FIRST):
| File | Description |
|------|-------------|
| `COMPREHENSIVE_AUDIT.md` | **CRITICAL** - Detailed breakdown of ALL broken features with exact IPC signatures and implementation hints |
| `BROKEN_FEATURES.md` | Overview list of broken features by category |

### Category-Specific Fix Guides (Ubuntu 24.04 commands included):
| File | Description |
|------|-------------|
| `FIX_AUDIO.md` | Audio settings - `wpctl`, `pactl`, `amixer` commands |
| `FIX_DISPLAY.md` | Display settings - `xrandr`, `swaymsg` commands |
| `FIX_MOUSE.md` | Mouse/input settings - `xinput`, `libinput` commands |
| `FIX_BLUETOOTH.md` | Bluetooth settings - `bluetoothctl` commands |
| `FIX_NETWORK.md` | Network settings - `nmcli` commands for WiFi, VPN, Hotspot, SSH |
| `FIX_SECURITY.md` | Security settings - `ufw`, `veracrypt`, `tor` commands |
| `FIX_THEMES.md` | Theme/appearance settings (mostly frontend-only) |

### Other Useful Context:
| File | Description |
|------|-------------|
| `HANDOFF.md` | Previous session handoff notes |
| `TASK.md` | Task checklist for tracking progress |
| `INTEGRATION_AUDIT.md` | Integration audit findings |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Frontend logic, event handlers in `setupEventListeners()`, settings UI in `getSettingsContentV2()` |
| `electron/main.cjs` | Backend IPC handlers (`ipcMain.handle(...)`) |
| `electron/preload.cjs` | API bridge - defines all `window.electronAPI.*` methods |
| `src/style.css` | Visual styles for settings states (CSS classes for toggles, etc.) |
| `src/system/SettingsManager.ts` | Settings persistence and theme application |

---

## Categories to Check

### System
- Audio volume slider
- Audio output/input device selection
- Display resolution, refresh rate, scale, orientation

### Network & Internet
- WiFi enable/disable, scan, connect
- VPN import/connect/disconnect
- Hotspot create/stop
- SSH server control

### Security
- Firewall (UFW) enable/disable, add/delete rules
- VeraCrypt mount/dismount volumes
- Tor daemon start/stop/status

### Accessibility
- High Contrast mode ✅ (FIXED - CSS added)
- Large Text ✅ (FIXED - CSS added)
- Reduce Motion ✅ (FIXED - CSS added)
- Color Blind modes ✅ (FIXED - CSS added)

### Mouse & Input
- Mouse speed/acceleration
- DPI settings (requires `libratbag`/`ratbagctl` on supported mice)
- Raw input toggle

### Bluetooth
- Enable/disable Bluetooth
- Scan for devices
- Connect/disconnect devices
- Pair/unpair devices

### Gaming
- Gaming Mode toggle (uses `gamemoderun` if available)

---

## Pattern to Follow

For each broken setting:

### Step 1: Find the HTML element class in `getSettingsContentV2()`
```typescript
<input type="checkbox" class="my-setting-toggle" ${this.mySetting ? 'checked' : ''}>
```

### Step 2: Add event handler in `setupEventListeners()`
```typescript
if (target.matches('.my-setting-toggle')) {
  const enabled = (target as HTMLInputElement).checked;
  this.mySetting = enabled;
  
  // Call backend if needed
  window.electronAPI?.mySettingMethod?.(enabled).then(res => {
    if (!res?.success) {
      this.showNotification('Setting', res?.error || 'Failed', 'error');
    }
  });
  
  this.queueSaveConfig();
  this.render();
  return;
}
```

### Step 3: Verify backend IPC exists in `electron/main.cjs`
```javascript
ipcMain.handle('my:settingMethod', async (event, enabled) => {
  if (process.platform !== 'linux') {
    return { success: false, error: 'Not supported on this platform' };
  }
  
  try {
    // Ubuntu 24.04 command
    const { stdout, stderr } = await execAsync(`some-ubuntu-command ${enabled ? 'on' : 'off'}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
```

### Step 4: Ensure preload exposes the method in `electron/preload.cjs`
```javascript
mySettingMethod: (enabled) => ipcRenderer.invoke('my:settingMethod', enabled),
```

---

## Already Fixed (Skip These)
- ✅ Accessibility CSS styles (High Contrast, Large Text, Reduce Motion, Color Blind)
- ✅ Setup Wizard buttons (wizard-next-btn, wizard-finish-btn, setup-again-btn, theme-color-btn)

---

## Ubuntu 24.04 Command Reference

| Feature | Command |
|---------|---------|
| Audio Volume | `wpctl set-volume @DEFAULT_AUDIO_SINK@ 0.5` or `pactl set-sink-volume @DEFAULT_SINK@ 50%` |
| Audio Devices | `wpctl status` or `pactl list sinks short` |
| Display | `xrandr --output HDMI-1 --mode 1920x1080 --rate 60` |
| Display Scale | `xrandr --output HDMI-1 --scale 1.25x1.25` |
| Mouse Speed | `xinput set-prop <device-id> 'libinput Accel Speed' 0.5` |
| WiFi List | `nmcli device wifi list` |
| WiFi Connect | `nmcli device wifi connect "SSID" password "pass"` |
| Bluetooth | `bluetoothctl power on`, `bluetoothctl scan on`, `bluetoothctl connect XX:XX:XX` |
| Firewall | `ufw enable`, `ufw allow 22/tcp`, `ufw status numbered` |
| Tor | `systemctl start tor`, `systemctl status tor` |
| SSH | `systemctl start ssh`, `systemctl enable ssh` |

---

## Testing
After implementing fixes:
1. Run `npm run build` to verify no TypeScript errors
2. Test on actual Ubuntu 24.04 system or VM
3. Verify each setting triggers the correct backend command
