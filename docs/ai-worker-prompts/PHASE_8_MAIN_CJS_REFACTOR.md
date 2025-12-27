# Phase 8: Split main.cjs into Modules

**Worker Assignment:** Experienced AI  
**Estimated Time:** 2-3 hours  
**Dependencies:** None  
**Risk Level:** MEDIUM

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify `electron/` directory files** - don't touch `src/` files
> - **Ignore TypeScript/build errors in `src/`** - another worker may have introduced temporary issues there
> - Phase 5 (Error Handling) or Phase 6 (Security) may also be modifying main.cjs - coordinate via git merge
> - When done, commit your changes to a branch named `phase-8-main-cjs-refactor`

---

## Context

`electron/main.cjs` is 7,173 lines with all IPC handlers in one file. This phase splits it into logical modules for maintainability.

---

## Target Structure

```
electron/
├── main.cjs                    # Entry point (~500 lines)
├── preload.cjs                 # (keep as is)
├── ipc/
│   ├── index.cjs              # Registers all handlers
│   ├── filesystem.cjs         # fs:* handlers (~400 lines)
│   ├── system.cjs             # system:* handlers (~400 lines)
│   ├── network.cjs            # network:* handlers (~500 lines)
│   ├── bluetooth.cjs          # bluetooth:* handlers (~200 lines)
│   ├── audio.cjs              # audio:* handlers (~200 lines)
│   ├── display.cjs            # display:* handlers (~300 lines)
│   ├── security.cjs           # security:* handlers (~400 lines)
│   ├── terminal.cjs           # terminal:* handlers (~200 lines)
│   └── x11.cjs                # x11:* handlers (~500 lines)
├── services/
│   ├── divine-assistant.cjs   # (already exists)
│   ├── command-executor.cjs   # (already exists)
│   └── ollama-manager.cjs     # (already exists)
└── x11/
    └── ewmh.cjs               # (already exists)
```

---

## Step-by-Step Instructions

### Step 1: Create the ipc directory

```bash
mkdir -p electron/ipc
```

### Step 2: Create shared utilities module

Create `electron/ipc/utils.cjs`:

```javascript
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Move these from main.cjs:
function execAsync(command, options = {}) {
    return new Promise((resolve) => {
        const child = exec(command, { maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}

function shEscape(value) {
    return String(value).replace(/'/g, "'\\''");
}

// Cache for command availability
const commandCache = new Map();

async function hasCommand(cmd) {
    if (commandCache.has(cmd)) return commandCache.get(cmd);
    const res = await execAsync(`command -v ${cmd}`);
    const has = !res.error && !!res.stdout;
    commandCache.set(cmd, has);
    return has;
}

function ipcSuccess(data = {}) {
    return { success: true, ...data };
}

function ipcError(message) {
    return { success: false, error: message };
}

module.exports = {
    execAsync,
    shEscape,
    hasCommand,
    ipcSuccess,
    ipcError,
    fs,
    path,
    os
};
```

### Step 3: Create filesystem.cjs

Create `electron/ipc/filesystem.cjs`:

```javascript
const { ipcMain } = require('electron');
const { fs, path, ipcSuccess, ipcError } = require('./utils.cjs');

function registerFilesystemHandlers() {
    // Copy fs:readdir handler from main.cjs
    ipcMain.handle('fs:readdir', async (event, dirPath) => {
        // ... existing implementation
    });
    
    // Copy fs:readFile handler
    ipcMain.handle('fs:readFile', async (event, filePath) => {
        // ... existing implementation
    });
    
    // ... copy all fs:* handlers
}

module.exports = { registerFilesystemHandlers };
```

### Step 4: Create other IPC modules

Repeat for each category:

**network.cjs:**
```javascript
function registerNetworkHandlers() {
    // network:getStatus
    // network:listWifi
    // network:connectWifi
    // etc.
}
```

**bluetooth.cjs:**
```javascript
function registerBluetoothHandlers() {
    // bluetooth:setEnabled
    // bluetooth:scan
    // bluetooth:connect
    // etc.
}
```

**audio.cjs:**
```javascript
function registerAudioHandlers() {
    // audio:listDevices
    // audio:setDefaultSink
    // audio:setVolume
    // etc.
}
```

**display.cjs:**
```javascript
function registerDisplayHandlers() {
    // display:getOutputs
    // display:setMode
    // display:setScale
    // etc.
}
```

**security.cjs:**
```javascript
function registerSecurityHandlers() {
    // security:trackerBlocking
    // security:getTorStatus
    // security:getFirewallRules
    // etc.
}
```

**terminal.cjs:**
```javascript
function registerTerminalHandlers() {
    // terminal:exec
    // terminal:createPty
    // terminal:writePty
    // etc.
}
```

**x11.cjs:**
```javascript
function registerX11Handlers() {
    // x11:supported
    // x11:getWindows
    // x11:activateWindow
    // etc.
}
```

### Step 5: Create index.cjs

Create `electron/ipc/index.cjs`:

```javascript
const { registerFilesystemHandlers } = require('./filesystem.cjs');
const { registerNetworkHandlers } = require('./network.cjs');
const { registerBluetoothHandlers } = require('./bluetooth.cjs');
const { registerAudioHandlers } = require('./audio.cjs');
const { registerDisplayHandlers } = require('./display.cjs');
const { registerSecurityHandlers } = require('./security.cjs');
const { registerTerminalHandlers } = require('./terminal.cjs');
const { registerX11Handlers } = require('./x11.cjs');

function registerAllHandlers() {
    registerFilesystemHandlers();
    registerNetworkHandlers();
    registerBluetoothHandlers();
    registerAudioHandlers();
    registerDisplayHandlers();
    registerSecurityHandlers();
    registerTerminalHandlers();
    registerX11Handlers();
    
    console.log('[IPC] All handlers registered');
}

module.exports = { registerAllHandlers };
```

### Step 6: Update main.cjs

```javascript
// At the top
const { registerAllHandlers } = require('./ipc/index.cjs');

// In app.whenReady():
app.whenReady().then(() => {
    registerAllHandlers();  // Add this line
    createWindow();
    // ... rest of initialization
});
```

---

## Helper: Finding Handler Locations

Use grep to find all handlers:

```bash
# Find all ipcMain.handle calls
grep -n "ipcMain.handle" electron/main.cjs

# Count by prefix
grep -o "ipcMain.handle('[^']*'" electron/main.cjs | sort | uniq -c
```

---

## Verification

1. `npm run build` - no errors
2. `npm run electron:dev` - app works
3. Test each category:
   - File browser works (filesystem)
   - WiFi settings work (network)
   - Bluetooth scanning works (bluetooth)
   - Volume control works (audio)
   - Resolution change works (display)
   - Firewall rules work (security)
   - Terminal works (terminal)
   - Window snapping works (x11)

---

## Success Criteria

- [ ] `electron/ipc/` directory created with 8+ modules
- [ ] `main.cjs` reduced from 7,173 to ~1,000 lines
- [ ] All IPC handlers still work
- [ ] No duplicate handler registrations
