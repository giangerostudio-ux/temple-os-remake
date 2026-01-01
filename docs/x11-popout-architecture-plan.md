# X11 Popout Architecture Implementation Plan

## Problem Statement

**Context**: The TempleOS shell runs as an Electron window. When X11 applications (Firefox, Steam, games) are launched, they run as separate X11 windows that can cover the Electron window. **Inline apps (Terminal, Files) become inaccessible** when covered by X11 apps.

**Solution Needed**: Popout windows that float above X11 apps and have full functionality.

**Current State**: Popout windows exist but are non-functional (static HTML only).

---

## Root Cause Analysis

### What Works: Start Menu Popout

The Start Menu popout works because it only needs to:
1. Display a list of apps (passed as config at creation time)
2. Handle clicks via polling (`window.__startMenuAction`)
3. Send actions back to main window

**No dynamic API calls required after initial render.**

### What's Broken: Terminal/Files Popouts

Looking at [main.cjs lines 3774-3955](file:///d:/temple%20os%20recreation/electron/main.cjs#L3774-L3955):

```javascript
// Line 3804-3807: NO PRELOAD SCRIPT
webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    // Missing: preload: path.join(__dirname, 'preload.cjs')
}

// Line 3899: DATA URI LOADING
win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
```

**Result**: Popout windows have:
- ❌ No `window.electronAPI` (100+ APIs)
- ❌ No PTY access for Terminal (xterm.js can't connect to shell)
- ❌ No filesystem access for Files (`readDir()`, `writeFile()`, etc.)
- ❌ Static HTML only - can't respond to user interactions

### Comparison Table

| Aspect | Inline Apps | Popout Apps (Current) |
|--------|-------------|----------------------|
| **Preload** | `preload.cjs` (100+ APIs) | None |
| **Loading** | Part of main renderer | Data URI (static HTML) |
| **Terminal** | xterm.js + node-pty | Static HTML placeholder |
| **File Manager** | Dynamic `readDir()` calls | Hardcoded HTML snapshot |
| **Interactivity** | Full | None (except close/minimize) |

---

## Proposed Solution

### Option 1: Add Preload + File URL Loading (Recommended)

Give popout windows the same capabilities as the main window.

#### [MODIFY] [main.cjs](file:///d:/temple%20os%20recreation/electron/main.cjs#L3804-L3807)

Add preload script to `floatingApp:open` handler:

```diff
 webPreferences: {
     nodeIntegration: false,
     contextIsolation: true,
+    preload: path.join(__dirname, 'preload.cjs')
 }
```

#### [MODIFY] [main.cjs](file:///d:/temple%20os%20recreation/electron/main.cjs#L3899)

Change from data URI to file URL loading:

```diff
- win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
+ // Load appropriate standalone app HTML
+ if (appId === 'terminal') {
+     win.loadFile(path.join(app.getAppPath(), 'dist', 'terminal-window.html'));
+ } else if (appId === 'files') {
+     win.loadFile(path.join(app.getAppPath(), 'dist', 'files-window.html'));
+ } else {
+     // Fallback for other apps - use data URI with preload
+     win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
+ }
```

#### [NEW] Create Standalone App Entry Points

These are self-contained HTML/JS files that initialize themselves:

##### `terminal-window.html`
- Loads xterm.js
- Calls `window.electronAPI.createPty()` on init
- Connect xterm → PTY → xterm data loop
- Full terminal functionality

##### `files-window.html`
- Calls `window.electronAPI.readDir()` on init
- Renders file listings dynamically
- Context menus via `window.electronAPI.showContextMenuPopup()`
- Full filesystem functionality

#### [MODIFY] Vite Build Configuration

Add multi-entry support for standalone windows.

---

### Option 2: Minimal Fix - Add Preload Only (Simpler)

Keep data URI loading but add preload script for API access.

**Limitation**: Some features (like xterm.js) may not work via data URI due to CSP/module loading restrictions.

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `electron/main.cjs` | MODIFY | Add preload, change loading method |
| `src/terminal-window.html` | NEW | Standalone terminal entry |
| `src/terminal-window.ts` | NEW | Terminal-specific initialization |
| `src/files-window.html` | NEW | Standalone file manager entry |
| `src/files-window.ts` | NEW | File manager initialization |
| `vite.config.ts` | MODIFY | Add multi-entry build |

---

## Verification Plan

### No Automated Tests Available

The project does not have UI component tests. Verification must be manual.

### Manual Test 1: Popout Terminal

**Prerequisites**: Build project with `npm run build`, run with `npm run electron:dev` on Linux VM with X11

**Steps**:
1. Open the TempleOS shell
2. Launch Firefox from Start Menu (creates X11 window)
3. Wait for Firefox to fully load
4. Open Terminal from Start Menu
5. **Verify**: Terminal appears above Firefox
6. **Verify**: Terminal has a working prompt (not "Loading...")
7. Type `ls` and press Enter
8. **Verify**: Command output appears
9. Type `cd /home` and press Enter  
10. **Verify**: Directory changes (pwd shows `/home`)

### Manual Test 2: Popout File Manager

**Steps**:
1. With Firefox open, open File Manager from Start Menu
2. **Verify**: File Manager appears above Firefox
3. **Verify**: Current directory contents load (not empty/loading)
4. Double-click a folder
5. **Verify**: Navigation works (folder opens)
6. Right-click on a file
7. **Verify**: Context menu appears

### Manual Test 3: Window Controls

**Steps**:
1. Open popout Terminal
2. Click minimize button (−)
3. **Verify**: Window minimizes
4. Click on taskbar to restore
5. Click maximize button (□)
6. **Verify**: Window maximizes
7. Click close button (×)
8. **Verify**: Window closes

---

## Rollback Strategy

- All changes are in `electron/` and `src/` directories
- `git checkout .` restores previous state
- Build artifacts (`dist/`) are regenerated with `npm run build`

---

## Questions for User

1. **Do you want Option 1 (full refactor) or Option 2 (minimal fix)?**
2. **Which apps need popout support?** Currently: terminal, files, settings, system-monitor, editor
3. **Any specific X11 apps to test against?** (Firefox, Steam, specific games?)
