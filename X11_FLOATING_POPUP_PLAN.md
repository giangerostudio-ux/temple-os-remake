# X11 Floating Popup System - Complete Implementation Plan

## Overview

Make ALL popups and system app windows float above X11 apps (Firefox, etc.) using separate BrowserWindow instances with `setAlwaysOnTop(true, 'screen-saver')`.

## Current State Analysis

### Problem
- **Tray popups** (volume, network, calendar, notifications) - Infrastructure exists but NOT working on X11
- **System apps** (terminal, file manager, settings) - Rendered as DOM windows inside main BrowserWindow, cannot float above X11 apps

### Existing Infrastructure
- [electron/ipc/tray-popup.cjs](electron/ipc/tray-popup.cjs) - Module exists with X11 support code
- [electron/main.cjs:7620](electron/main.cjs#L7620) - Module registered
- [electron/preload.cjs:323-335](electron/preload.cjs#L323-L335) - API exposed
- [src/main.ts:2909](src/main.ts#L2909) - `showExternalTrayPopup()` method exists

### Diagnosis: Why Tray Popups Aren't Working
Need to investigate:
1. Is the IPC handler being called? (Check console logs)
2. Is the BrowserWindow being created?
3. Is `setAlwaysOnTop(true, 'screen-saver')` being called?
4. Is main window stealing focus back?

---

## Implementation Plan

### Phase 1: Fix Tray Popups (Volume, Network, Calendar, Notifications)

#### Step 1.1: Debug Existing Tray Popup System

**Files to check:**
- [electron/ipc/tray-popup.cjs](electron/ipc/tray-popup.cjs)
- [src/main.ts](src/main.ts) - `showExternalTrayPopup()` method

**Add debugging:**
1. Verify `registerTrayPopupHandlers` is called with valid mainWindow
2. Check if `showTrayPopup()` creates the BrowserWindow
3. Verify `setAlwaysOnTop(true, 'screen-saver')` is called AFTER window creation
4. Check if blur event is closing the popup too quickly

#### Step 1.2: Fix Potential Issues in tray-popup.cjs

**Known issues to fix:**
1. Add proper error handling and logging
2. Ensure `setAlwaysOnTop` is called on the right window
3. Increase blur delay for X11 focus settling (150ms → 300ms)
4. Add `setVisibleOnAllWorkspaces(true)` for multi-workspace support

#### Step 1.3: Add Notification Popup to External System

**File**: [src/main.ts](src/main.ts)

**Location**: Lines 8049-8060

**Change notification click handler to use external popup** (same as volume/network/calendar):
```typescript
const notifIcon = target.closest('#tray-notification');
if (notifIcon) {
  this.showVolumePopup = false;
  this.showCalendarPopup = false;
  this.showNetworkPopup = false;
  window.electronAPI?.hideTrayPopup?.();

  if (this.showNotificationPopup) {
    this.showNotificationPopup = false;
    window.electronAPI?.hideTrayPopup?.();
    this.render();
  } else {
    this.showNotificationPopup = true;
    void this.showExternalTrayPopup('notification').then(success => {
      if (success) this.showNotificationPopup = false;
      this.render();
    });
  }
  return;
}
```

#### Step 1.4: Add Notification HTML Generation

**File**: [src/main.ts](src/main.ts)

**Location**: In `showExternalTrayPopup()` method (~line 2909)

**Add notification case:**
```typescript
} else if (type === 'notification') {
  width = 350;
  height = Math.min(400, 150 + (this.notificationManager.notifications.length * 70));
  html = this.buildNotificationPopupHtml();
}
```

**Add helper method:**
```typescript
private buildNotificationPopupHtml(): string {
  const notifications = this.notificationManager.notifications;
  const unreadCount = notifications.filter(n => !n.read).length;
  // Return HTML with notification list and action buttons
}
```

#### Step 1.5: Handle Notification Actions

**File**: [src/main.ts](src/main.ts)

**Location**: In `onTrayPopupAction` callback (~line 1575)

**Add notification action handling:**
```typescript
} else if (action.type === 'notification') {
  if (action.action === 'markAllRead') this.notificationManager.markAllRead();
  else if (action.action === 'clearAll') this.notificationManager.clearAll();
  else if (action.action === 'dismiss') this.notificationManager.dismissNotification(action.data);
  else if (action.action === 'click') this.notificationManager.clickNotification(action.data);
}
```

---

### Phase 2: Floating System App Windows

#### Step 2.1: Create Floating App Window Module

**New file**: `electron/ipc/floating-app-window.cjs`

This module will create separate BrowserWindow instances for system apps:
- Terminal
- File Manager
- Settings
- System Monitor
- Text Editor
- Image Viewer
- etc.

**Key features:**
- `setAlwaysOnTop(true, 'screen-saver')` for X11 compatibility
- Movable, resizable windows
- IPC bridge for app-specific functionality
- Window management (minimize, maximize, close)
- Position/size persistence

#### Step 2.2: Add App Window IPC Handlers

**File**: [electron/main.cjs](electron/main.cjs)

**Add handlers:**
- `ipcMain.handle('app-window:open')` - Open app in floating window
- `ipcMain.handle('app-window:close')` - Close specific window
- `ipcMain.handle('app-window:minimize')` - Minimize window
- `ipcMain.handle('app-window:maximize')` - Maximize/restore window
- `ipcMain.handle('app-window:focus')` - Focus window

#### Step 2.3: Add App Window Preload API

**File**: [electron/preload.cjs](electron/preload.cjs)

**Add methods:**
```javascript
openAppWindow: (appId, config) => ipcRenderer.invoke('app-window:open', { appId, config }),
closeAppWindow: (windowId) => ipcRenderer.invoke('app-window:close', { windowId }),
onAppWindowEvent: (callback) => { /* ... */ },
```

#### Step 2.4: Modify System App Launch Logic

**File**: [src/main.ts](src/main.ts)

**Modify `openApp()` method** to use floating windows for system apps:
```typescript
private async openApp(appId: string, options?: AppOptions): Promise<void> {
  // Check if app should use floating window
  const floatingApps = ['terminal', 'files', 'settings', 'system-monitor', 'editor'];

  if (floatingApps.includes(appId) && window.electronAPI?.openAppWindow) {
    // Open as floating BrowserWindow
    await window.electronAPI.openAppWindow(appId, {
      width: defaultWidths[appId],
      height: defaultHeights[appId],
      // ... other config
    });
  } else {
    // Fallback to DOM-based window
    this.createDomWindow(appId, options);
  }
}
```

#### Step 2.5: Create App-Specific HTML Templates

Each floating app window needs its own HTML/CSS/JS:
- Terminal: PTY integration, tabs, themes
- File Manager: Directory listing, navigation, operations
- Settings: Config panels, toggles, inputs
- System Monitor: Real-time stats, graphs
- Editor: Text editing, syntax highlighting

---

## Critical Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| [electron/ipc/tray-popup.cjs](electron/ipc/tray-popup.cjs) | 1 | Debug/fix X11 floating |
| [src/main.ts](src/main.ts) | 1 | Add notification popup, fix handlers |
| [electron/ipc/floating-app-window.cjs](electron/ipc/floating-app-window.cjs) | 2 | NEW - Floating app window module |
| [electron/main.cjs](electron/main.cjs) | 2 | Register floating app handlers |
| [electron/preload.cjs](electron/preload.cjs) | 2 | Add floating app API |

---

## Implementation Order

1. **First**: Debug and fix tray-popup.cjs (figure out why popups don't float)
2. **Then**: Add notification popup to external system
3. **Then**: Create floating-app-window.cjs module
4. **Finally**: Migrate system apps to floating windows

---

## Progress Tracking

### Phase 1 - Tray Popups
- [x] Step 1.1: Debug existing tray popup system
- [x] Step 1.2: Fix issues in tray-popup.cjs
- [x] Step 1.3: Add notification click handler to use external popup
- [x] Step 1.4: Add notification HTML generation
- [x] Step 1.5: Handle notification actions

### Phase 2 - System Apps
- [x] Step 2.1: Create floating-app-window.cjs module
- [x] Step 2.2: Add app window IPC handlers
- [x] Step 2.3: Add app window preload API
- [x] Step 2.4: Modify openApp() to use floating windows
- [x] Step 2.5: Create app-specific HTML templates (reused existing content generators)

---

## Testing Checklist

### Phase 1 - Tray Popups
- [ ] Volume popup floats above Firefox
- [ ] Calendar popup floats above Firefox
- [ ] Network popup floats above Firefox
- [ ] Notification popup floats above Firefox
- [ ] Popups close on Escape key
- [ ] Popups close on blur
- [ ] Actions work (volume slider, network connect, etc.)

### Phase 2 - System Apps
- [ ] Terminal opens as floating window above X11 apps
- [ ] File Manager opens as floating window above X11 apps
- [ ] Settings opens as floating window above X11 apps
- [ ] Windows can be moved, resized, minimized
- [ ] App functionality works (PTY terminal, file operations, etc.)
- [ ] Window positions persist across sessions

---

## Notes

- The X11 magic: `setAlwaysOnTop(true, 'screen-saver')` must be called AFTER BrowserWindow creation
- Blur delay should be 200-300ms to allow X11 focus to settle
- Consider adding `setVisibleOnAllWorkspaces(true)` for multi-workspace support
- System apps will require significant IPC bridging for their functionality
