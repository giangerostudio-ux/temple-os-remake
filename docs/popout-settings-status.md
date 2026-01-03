# Popout Settings Window - Current Status

**Date:** 2026-01-03  
**Objective:** Achieve full feature parity between inline and popout Settings windows

---

## ✅ What We've Completed

### 1. Settings Sync Infrastructure ✅
- **IPC-based config persistence** replacing `localStorage`
- **Real-time sync** via `config:changed` broadcast across all windows
- **Files Modified:**
  - `electron/ipc/system.cjs` - Added broadcast to `config:save`
  - `electron/preload.cjs` - Added `onConfigChanged` listener
  - `src/settings-window.ts` - Replaced localStorage with IPC
  - `src/main.ts` - Added type definitions

### 2. UI Parity - 3 Categories ✅

#### System Category
**UI Components:**
- Sound (volume slider, audio output/input selects, refresh button)
- Time & Date (auto-time toggle, timezone selector)
- Memory Optimization (Clean RAM button)
- Display (monitor select, mode, scale slider 75%-200%, orientation, refresh)
- Lock Screen (info text)
- Gaming (Gaming Mode toggle)

#### Personalization Category
**UI Components:**
- Theme (Dark/Light buttons)
- Color Scheme (4 color circles: green, amber, cyan, white)
- Custom Themes (Create/Import buttons)
- Visual Effects (Window Animations, Auto-hide Taskbar, Heavenly Pulse + intensity slider)
- Wallpaper (preview + Select File button)
- Divine Settings (Terry Quotes toggle)
- Performance (Lite Mode toggle)

#### Network Category
**UI Components:**
- Status (connection info, Flight Mode, WiFi toggles, Refresh/Disconnect buttons)
- Wi-Fi Networks (list placeholder)
- Saved Networks (netplan-enp0s3, lo with Connect/Forget buttons)
- VPN Profiles (Import OpenVPN/WireGuard buttons)
- VPN Kill Switch (toggle, mode dropdown, status)
- Mobile Hotspot (toggle, settings info, Edit button)
- SSH Server (toggle, port input, status, Regenerate Keys/View Public Key buttons)

### 3. Event Handlers Attached ✅
- **~300 lines** of comprehensive event handlers
- Handlers use **class-based selectors** (`.volume-slider`, `.theme-btn`, etc.)
- `attachContentHandlers()` called after every `renderContent()` to re-attach after DOM updates

---

## ❌ What's NOT Working - THE PROBLEM

### Event Handlers Only Log, Don't Do Anything

**Current Behavior:**
```typescript
// Example: Theme button handler
content.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const theme = (e.target as HTMLElement).dataset.theme;
        console.log('[Settings] Theme:', theme);  // ✅ This works
        state.theme = theme || 'dark';             // ✅ This works
        saveSettings();                             // ✅ This works
        renderContent();                            // ✅ This works
        // ❌ BUT: Nothing actually changes visually!
    });
});
```

**What inline settings does:**
```typescript
// Inline settings ACTUALLY applies the theme
applyTheme(theme);  // Changes CSS variables, updates DOM
sendToAllWindows('theme:changed', theme);  // Broadcasts to all windows
updateTaskbar(theme);  // Updates taskbar colors
// Shows visual feedback immediately
```

### Specific Issues

| Control | Logs to Console? | Saves to State? | **Actually Works?** |
|---------|-----------------|----------------|-------------------|
| Theme Dark/Light | ✅ Yes | ✅ Yes | ❌ **No - doesn't change theme** |
| Color Scheme | ✅ Yes | ✅ Yes | ❌ **No - doesn't change colors** |
| Volume Slider | ✅ Yes | ✅ Yes | ❌ **No - doesn't change volume** |
| Gaming Mode | ✅ Yes | ✅ Yes | ❌ **No - doesn't disable hotkeys** |
| Pulse Intensity | ✅ Yes (updates %) | ✅ Yes | ❌ **No - doesn't change pulse** |
| WiFi Toggle | ✅ Yes | ✅ Yes | ❌ **No - doesn't enable/disable WiFi** |
| SSH Toggle | ✅ Yes | ✅ Yes | ❌ **No - doesn't start/stop SSH** |

**In summary:** Handlers fire, log to console, save to `state` object, but **don't apply any actual changes**.

---

## 🚧 What Needs to Be Done

### Phase 1: Wire Up Core Functionality

For each control, the handler needs to:

1. **Apply the change locally** (update DOM, styles, etc.)
2. **Send IPC to main process** (if system-level change)
3. **Broadcast to other windows** (if needed)
4. **Show visual feedback**

#### Priority Controls to Fix:

**Theme Buttons (Dark/Light):**
```typescript
// Current (doesn't work):
state.theme = theme;
saveSettings();

// Needs to be:
state.theme = theme;
document.documentElement.setAttribute('data-theme', theme); // Apply to DOM
await window.electronAPI?.applyTheme(theme);  // Apply system-wide
saveSettings();  // Persist
```

**Volume Slider:**
```typescript
// Current (doesn't work):
console.log('[Settings] Volume changed:', value);
if (window.electronAPI?.setSystemVolume) {
    await window.electronAPI.setSystemVolume(value);  // This probably doesn't exist!
}

// Needs:
// 1. Verify IPC handler exists in electron/main.cjs
// 2. Actually implement setSystemVolume IPC handler
// 3. Return success/failure
// 4. Show visual feedback
```

**Gaming Mode Toggle:**
```typescript
// Current (doesn't work):
state.gamingMode = checked;
saveSettings();
if (window.electronAPI?.setGamingMode) {
    await window.electronAPI.setGamingMode(checked);  // Probably doesn't exist!
}

// Needs:
// 1. Implement setGamingMode IPC handler in electron/main.cjs
// 2. Disable/enable global hotkeys
// 3. Update keybind-daemon.py
// 4. Show confirmation toast
```

### Phase 2: IPC Handler Audit

**Check which IPC handlers actually exist:**
- [ ] `setSystemVolume` - Does it exist?
- [ ] `listAudioDevices` - Does it exist?
- [ ] `getDisplayOutputs` - Does it exist?
- [ ] `setWifiEnabled` - Does it exist?
- [ ] `getNetworkStatus` - Does it exist?
- [ ] `setGamingMode` - Does it exist?
- [ ] `createHotspot` / `stopHotspot` - Do they exist?
- [ ] `sshControl` - Does it exist?

**Many of these probably DON'T exist yet** and need to be implemented.

### Phase 3: Remaining Categories

Still need to port UI + handlers for:
- [ ] Gaming
- [ ] Security
- [ ] Accessibility
- [ ] Devices
- [ ] Bluetooth
- [ ] About

---

## 📁 Files Modified

### Already Changed:
- `src/settings-window.ts` - **1,135 lines** - Main settings window logic
- `settings-window.html` - Updated CSS for sidebar icons
- `electron/ipc/system.cjs` - Added config broadcast
- `electron/preload.cjs` - Added onConfigChanged
- `src/main.ts` - Added type definitions

### Need to Change:
- `electron/main.cjs` or `electron/ipc/*.cjs` - Add missing IPC handlers
- `scripts/keybind-daemon.py` - Gaming mode integration
- Possibly `src/system/SettingsManager.ts` - Apply theme logic

---

## 🎯 Next Steps - Recommended Approach

### Option A: Fix Existing Controls First (Recommended)
1. **Audit** - Check which IPC handlers exist vs. which we need
2. **Implement** - Add missing IPC handlers one by one
3. **Wire up** - Connect handlers to actually apply changes
4. **Test** - Verify each control works like inline
5. **Then** continue with remaining categories

### Option B: Continue Adding UI
- Port remaining 6 categories (Gaming, Security, etc.)
- Do one big IPC implementation pass at the end
- Risk: Lots of broken UI accumulating

### Option C: Hybrid
- Fix **just** the most important controls (theme, gaming mode, volume)
- Port 1-2 more categories
- Fix those
- Repeat

---

## 🐛 Known Issues

1. **Event handlers only log** - Don't apply changes
2. **Many IPC handlers missing** - Need to implement them
3. **No visual feedback** - No toasts/confirmations when things change
4. **No error handling** - If IPC fails, user doesn't know

---

## 💡 Key Insights

- **The UI looks perfect** - Visually matches inline exactly
- **Event listeners work** - Clicks are detected, console logs prove it
- **The logic is incomplete** - Handlers need to actually DO something
- **This is normal** - We built the UI layer, now need the logic layer

---

## 📝 For Next Session

**Start here:**
1. Open `electron/preload.cjs` - See what IPC handlers are exposed
2. Open `electron/ipc/system.cjs` - See what handlers exist
3. Pick ONE control (recommend: theme buttons)
4. Trace from click → handler → IPC → actual change
5. Make that ONE control fully work
6. Repeat for other controls

**Test workflow:**
1. Edit handler in `src/settings-window.ts`
2. Run `npm run build`
3. Restart Electron app
4. Test in popout Settings
5. Check console for errors
6. Repeat until it works

---

