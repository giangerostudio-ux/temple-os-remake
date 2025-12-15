# Electron Integration Research

## Overview

Technical details for packaging the TempleOS UI as an Electron desktop application.

---

## What is Electron?

Electron = Chromium (browser) + Node.js (backend) in one app.

```
┌─────────────────────────────────────────────┐
│              Your Electron App              │
├─────────────────────────────────────────────┤
│  Main Process (Node.js)                     │
│  - File system access                       │
│  - System APIs                              │
│  - Spawns renderer processes                │
├─────────────────────────────────────────────┤
│  Renderer Process (Chromium)                │
│  - Your UI (HTML/CSS/JS)                    │
│  - Runs in browser context                  │
│  - Limited system access                    │
└─────────────────────────────────────────────┘
```

---

## Project Structure

```
temple-os-recreation/
├── electron/
│   ├── main.js           # Main process entry
│   ├── preload.js        # Bridge between main/renderer
│   └── ipc-handlers.js   # IPC message handlers
├── src/
│   ├── main.ts           # UI code (existing)
│   └── style.css         # Styles (existing)
├── dist/                 # Vite build output
├── package.json
├── electron-builder.yml  # Build config
└── vite.config.ts
```

---

## Key Concepts

### Main Process vs Renderer Process

| Main Process | Renderer Process |
|--------------|------------------|
| Node.js environment | Browser environment |
| Full system access | Sandboxed |
| One per app | One per window |
| Runs main.js | Runs your HTML/JS |

### IPC (Inter-Process Communication)

Renderer can't access filesystem directly. Must ask Main process:

```javascript
// Renderer (your UI)
const files = await window.electronAPI.readDirectory('/home');

// Main process (handles the request)
ipcMain.handle('read-directory', (event, path) => {
  return fs.readdirSync(path);
});
```

### Preload Script

Bridge between insecure renderer and secure main:

```javascript
// preload.js - exposes safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, data) => ipcRenderer.invoke('write-file', path, data),
  runCommand: (cmd) => ipcRenderer.invoke('run-command', cmd),
  launchApp: (app) => ipcRenderer.invoke('launch-app', app),
});
```

---

## Dependencies

```json
{
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "concurrently": "^8.2.0",
    "wait-on": "^7.2.0"
  },
  "dependencies": {
    "node-pty": "^1.0.0"  // For real terminal
  }
}
```

---

## Main Process (main.js)

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false,           // Custom title bar
    fullscreen: false,      // Start windowed, user can fullscreen
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load Vite dev server or built files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

// IPC Handlers
ipcMain.handle('read-directory', async (event, dirPath) => {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  return entries.map(e => ({
    name: e.name,
    isDirectory: e.isDirectory(),
    path: path.join(dirPath, e.name)
  }));
});

ipcMain.handle('launch-app', (event, appName) => {
  spawn(appName, [], { detached: true });
});
```

---

## IPC Handlers Needed

| Handler | Purpose |
|---------|---------|
| `read-directory` | List files in folder |
| `read-file` | Read file contents |
| `write-file` | Write file contents |
| `delete-file` | Delete file/folder |
| `rename-file` | Rename file/folder |
| `run-command` | Execute shell command |
| `spawn-terminal` | Create PTY terminal |
| `launch-app` | Launch external app |
| `get-system-info` | CPU, RAM, disk usage |
| `get-settings` | Load settings file |
| `save-settings` | Save settings file |
| `toggle-fullscreen` | Window control |
| `minimize-window` | Window control |
| `close-window` | Window control |

---

## Building for Distribution

### electron-builder.yml

```yaml
appId: com.giangerostudio.templeos
productName: TempleOS
directories:
  output: release

linux:
  target:
    - AppImage
    - deb
  category: System
  icon: build/icon.png

mac:
  target: dmg
  icon: build/icon.icns

win:
  target: nsis
  icon: build/icon.ico
```

### Build Commands

```bash
# Development
npm run electron:dev

# Build for current platform
npm run electron:build

# Build for Linux (from any OS)
npm run electron:build -- --linux
```

---

## Kiosk Mode (for Phase 3)

```javascript
// For running as the desktop shell on Linux
mainWindow = new BrowserWindow({
  fullscreen: true,
  kiosk: true,           // Prevents escape
  frame: false,
  alwaysOnTop: true,
  webPreferences: { ... }
});

// Prevent closing
mainWindow.on('close', (e) => {
  e.preventDefault();
});
```

---

## Security Considerations

1. **Never enable nodeIntegration** in renderer
2. **Always use contextIsolation**
3. **Validate all IPC inputs** in main process
4. **Sanitize file paths** to prevent directory traversal
5. **Limit shell commands** to whitelist

---

## Limitations

| Limitation | Workaround |
|------------|------------|
| Large bundle size (~150MB) | Expected, not fixable |
| Memory usage (~200MB+) | Optimize UI, lazy load |
| Can't run as PID 1 | Linux init runs Electron |
| GPU on Linux | May need flags for some GPUs |

---

## Useful Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [node-pty](https://github.com/microsoft/node-pty) - Terminal emulation
- [electron-store](https://github.com/sindresorhus/electron-store) - Settings
