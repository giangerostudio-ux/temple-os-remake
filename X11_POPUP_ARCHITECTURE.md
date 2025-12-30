# X11 Floating Popup Architecture

This document explains how the start menu's floating popup works on X11 and how to replicate the pattern for other popups (tray popups, app windows).

## Overview

The start menu has **TWO implementations**:
1. **INLINE (DOM-based)** - For non-X11 environments or when no external apps are running
2. **POPOUT (BrowserWindow)** - For X11 environments when external apps (Firefox, etc.) are running

## The Working Pattern (Start Menu)

### Main Process (electron/main.cjs:3509-3620)

```javascript
let startMenuPopup = null;
let startMenuPollInterval = null;

ipcMain.handle('startmenu:show', async (event, config) => {
    // Close existing
    closeStartMenuPopupSync();

    // Get screen bounds
    const primary = screen.getPrimaryDisplay();
    const bounds = primary?.bounds || { x: 0, y: 0, width: 1920, height: 1080 };

    // 1. Create BrowserWindow with show: false
    startMenuPopup = new BrowserWindow({
        x: posX,
        y: posY,
        width: 620,
        height: 560,
        frame: false,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: true,
        show: false,           // CRITICAL: Start hidden
        transparent: true,
        hasShadow: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // 2. Set z-order IMMEDIATELY after creation, BEFORE loading content
    startMenuPopup.setAlwaysOnTop(true, 'screen-saver');

    // 3. Generate and load HTML
    const html = buildStartMenuHtml(config);
    startMenuPopup.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // 4. Wait for ready-to-show, THEN show() - NO focus() call
    startMenuPopup.once('ready-to-show', () => {
        if (startMenuPopup && !startMenuPopup.isDestroyed()) {
            startMenuPopup.show();
            // DO NOT call focus() - it breaks X11 floating
        }
    });

    // 5. Poll for actions every 32ms
    startMenuPollInterval = setInterval(async () => {
        if (!startMenuPopup || startMenuPopup.isDestroyed()) {
            closeStartMenuPopupSync();
            return;
        }
        try {
            const action = await startMenuPopup.webContents.executeJavaScript(
                'window.__startMenuAction || null'
            );
            if (action) {
                await startMenuPopup.webContents.executeJavaScript(
                    'window.__startMenuAction = null'
                );
                mainWindow.webContents.send('startmenu:action', action);
                closeStartMenuPopupSync();
            }
        } catch {
            closeStartMenuPopupSync();
        }
    }, 32);

    // 6. Blur handler with 300ms delay (for X11 focus settling)
    startMenuPopup.on('blur', () => {
        setTimeout(() => {
            if (startMenuPopup && !startMenuPopup.isDestroyed()) {
                closeStartMenuPopupSync();
                mainWindow.webContents.send('startmenu:closed', {});
            }
        }, 300);
    });

    return { success: true };
});
```

### Renderer (src/main.ts:4202-4293)

```typescript
private async toggleStartMenu(): Promise<void> {
    // Debounce
    const now = Date.now();
    if (now - this.lastStartMenuToggleMs < 200) return;
    this.lastStartMenuToggleMs = now;

    // KEY DECISION: Check if X11 windows exist
    const shouldUsePopup =
        this.x11Windows.length > 0 &&              // Has external X11 windows?
        window.electronAPI?.showStartMenuPopup &&  // API available?
        !this.useInlineStartMenu;                  // Not forced inline?

    if (shouldUsePopup) {
        // Use external BrowserWindow popup
        this.startMenuPopupOpen = true;
        this.showStartMenu = false;  // Disable inline

        window.electronAPI!.showStartMenuPopup!({
            taskbarHeight: 58,
            taskbarPosition: this.taskbarPosition,
            pinnedApps: [...],
            installedApps: [...],
            logoUrl: this.cachedLogoBase64
        });
    } else {
        // Fallback to inline DOM popup
        this.showStartMenu = !this.showStartMenu;
        if (!this.showStartMenu) {
            this.startMenuSearchQuery = '';
        }
        this.render();
    }
}
```

## Critical Implementation Details

### 1. BrowserWindow Options
```javascript
{
    frame: false,           // No native frame
    resizable: false,       // Fixed size
    movable: false,         // Can't be dragged
    alwaysOnTop: true,      // Stay on top
    skipTaskbar: true,      // Don't show in taskbar
    focusable: true,        // Can receive focus
    show: false,            // START HIDDEN
    transparent: true,      // Support transparency
    hasShadow: true         // Drop shadow
}
```

### 2. Order of Operations (CRITICAL)
1. `new BrowserWindow({ show: false })`
2. `setAlwaysOnTop(true, 'screen-saver')` - BEFORE loading content
3. `loadURL(html)`
4. `ready-to-show` event → `show()` - NO focus()

### 3. Polling Pattern
- 32ms interval (not 50ms)
- Use `executeJavaScript()` to read `window.__action`
- Clear action after reading
- Send to main window via IPC

### 4. Blur Handling
- 300ms delay before closing
- Allows X11 focus to settle
- Prevents premature closing

## x11Windows Check

The renderer tracks external X11 windows:

```typescript
private x11Windows: Array<{
    xidHex: string;
    title: string;
    active: boolean;
    minimized: boolean;
}> = [];

// Updated via IPC listener
window.electronAPI.onX11WindowsChanged((payload) => {
    this.x11Windows = payload.windows;
});
```

**Only use external popup when `x11Windows.length > 0`**

## IPC Communication Flow

```
RENDERER                      MAIN PROCESS                   POPUP WINDOW
────────                      ────────────                   ────────────
Click volume icon
    │
    ├─► x11Windows.length > 0?
    │       │
    │       └─► YES: showTrayPopup(config)
    │                    │
    │                    └───────────────► ipcMain.handle('tray-popup:show')
    │                                              │
    │                                              ├─► new BrowserWindow()
    │                                              ├─► setAlwaysOnTop('screen-saver')
    │                                              ├─► loadURL(html)
    │                                              └─► Poll every 32ms ◄────────┐
    │                                                       │                    │
    │                                                       └─► executeJS() ────┤
    │                                                                            │
    │                                     User clicks ─► __trayPopupAction = {...}
    │                                                       │
    │   mainWindow.send('tray-popup:action') ◄─────────────┘
    │          │
    └─► onTrayPopupAction(action)
              │
              └─► Handle action (setVolume, disconnect, etc.)
```

## Files Reference

| File | Purpose |
|------|---------|
| `electron/main.cjs:3509-3620` | Start menu popup handler (working reference) |
| `electron/ipc/tray-popup.cjs` | Tray popup module (needs to match pattern) |
| `electron/ipc/floating-app-window.cjs` | App window module (needs to match pattern) |
| `src/main.ts` | Renderer with x11Windows check |
| `electron/preload.cjs` | IPC API exposure |
