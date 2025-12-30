/**
 * Floating App Window Module - External BrowserWindow for system apps
 *
 * This module creates separate BrowserWindow instances for system apps
 * (Terminal, File Manager, Settings, etc.) that float above X11 apps.
 * Uses setAlwaysOnTop(true, 'screen-saver') for X11 compatibility.
 */

const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

// Track all floating app windows
const floatingWindows = new Map(); // windowId -> BrowserWindow
let mainWindowRef = null;
let windowIdCounter = 0;

// Default window configurations for each app type
const APP_CONFIGS = {
    terminal: {
        width: 800,
        height: 500,
        minWidth: 400,
        minHeight: 300,
        title: 'Terminal'
    },
    files: {
        width: 900,
        height: 600,
        minWidth: 500,
        minHeight: 400,
        title: 'File Manager'
    },
    settings: {
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 500,
        title: 'Settings'
    },
    'system-monitor': {
        width: 600,
        height: 450,
        minWidth: 400,
        minHeight: 350,
        title: 'System Monitor'
    },
    editor: {
        width: 900,
        height: 700,
        minWidth: 500,
        minHeight: 400,
        title: 'Text Editor'
    }
};

// Shared CSS styles (TempleOS aesthetic)
const SHARED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
    height: 100%;
    overflow: hidden;
    font-family: 'VT323', monospace;
    color: #00ff41;
    background: rgba(13, 17, 23, 0.98);
}
.app-window {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 2px solid #00ff41;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.3), 0 4px 15px rgba(0,0,0,0.6);
    overflow: hidden;
}
.title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0, 255, 65, 0.15);
    border-bottom: 1px solid rgba(0, 255, 65, 0.3);
    -webkit-app-region: drag;
    cursor: move;
}
.title-bar-left {
    display: flex;
    align-items: center;
    gap: 8px;
}
.title-bar-title {
    font-weight: bold;
    font-size: 16px;
}
.title-bar-buttons {
    display: flex;
    gap: 6px;
    -webkit-app-region: no-drag;
}
.title-bar-btn {
    width: 24px;
    height: 24px;
    border: 1px solid rgba(0, 255, 65, 0.4);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.3);
    color: #00ff41;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: all 0.15s ease;
}
.title-bar-btn:hover {
    background: rgba(0, 255, 65, 0.2);
    border-color: #00ff41;
}
.title-bar-btn.close:hover {
    background: rgba(255, 0, 0, 0.3);
    border-color: #ff4444;
    color: #ff4444;
}
.app-content {
    flex: 1;
    overflow: hidden;
    padding: 10px;
}
.app-content-scroll {
    height: 100%;
    overflow-y: auto;
}
button, .btn {
    background: rgba(0, 255, 65, 0.1);
    border: 1px solid rgba(0, 255, 65, 0.4);
    color: #00ff41;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
}
button:hover, .btn:hover {
    background: rgba(0, 255, 65, 0.2);
    border-color: #00ff41;
    box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
}
input, textarea, select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 255, 65, 0.3);
    color: #00ff41;
    padding: 8px;
    border-radius: 4px;
    font-family: inherit;
    outline: none;
}
input:focus, textarea:focus, select:focus {
    border-color: #00ff41;
    box-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
}
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
::-webkit-scrollbar-thumb { background: rgba(0, 255, 65, 0.3); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 65, 0.5); }
`;

/**
 * Generate window ID
 */
function generateWindowId(appId) {
    return `${appId}-${++windowIdCounter}`;
}

/**
 * Close a specific floating window
 */
function closeFloatingWindow(windowId) {
    const win = floatingWindows.get(windowId);
    if (win && !win.isDestroyed()) {
        try {
            win.destroy();
        } catch { }
    }
    floatingWindows.delete(windowId);
}

/**
 * Close all floating windows
 */
function closeAllFloatingWindows() {
    for (const [windowId] of floatingWindows) {
        closeFloatingWindow(windowId);
    }
}

/**
 * Create a floating app window
 */
function createFloatingAppWindow(appId, config = {}) {
    const windowId = generateWindowId(appId);
    const appConfig = APP_CONFIGS[appId] || APP_CONFIGS.terminal;

    // Get screen bounds for centering
    const primary = screen.getPrimaryDisplay();
    const bounds = primary?.bounds || { x: 0, y: 0, width: 1920, height: 1080 };

    const width = config.width || appConfig.width;
    const height = config.height || appConfig.height;
    const posX = config.x !== undefined ? config.x : Math.round((bounds.width - width) / 2);
    const posY = config.y !== undefined ? config.y : Math.round((bounds.height - height) / 2);

    const win = new BrowserWindow({
        x: posX,
        y: posY,
        width: width,
        height: height,
        minWidth: appConfig.minWidth || 400,
        minHeight: appConfig.minHeight || 300,
        frame: false, // Custom title bar
        resizable: true,
        movable: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        transparent: true,
        hasShadow: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload-app-window.cjs')
        }
    });

    // Set highest z-order level for X11 compatibility (same as start menu)
    win.setAlwaysOnTop(true, 'screen-saver');

    // Store window reference
    floatingWindows.set(windowId, win);

    // Track window bounds changes
    let lastBounds = { x: posX, y: posY, width, height };
    win.on('move', () => {
        if (!win.isDestroyed()) {
            const newBounds = win.getBounds();
            lastBounds = newBounds;
        }
    });
    win.on('resize', () => {
        if (!win.isDestroyed()) {
            const newBounds = win.getBounds();
            lastBounds = newBounds;
        }
    });

    // Handle close
    win.on('closed', () => {
        floatingWindows.delete(windowId);
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.webContents.send('app-window:closed', { windowId, appId });
        }
    });

    // Wait for ready-to-show, then show() - same as working start menu
    win.once('ready-to-show', () => {
        if (win && !win.isDestroyed()) {
            win.show();
            // DO NOT call focus() - it steals focus from X11 apps
        }
    });

    return { windowId, win };
}

/**
 * Open a floating app window with content
 */
async function openAppWindow(appId, config = {}) {
    console.log(`[FloatingApp] Opening ${appId} window...`);

    const { windowId, win } = createFloatingAppWindow(appId, config);
    const appConfig = APP_CONFIGS[appId] || APP_CONFIGS.terminal;
    const title = config.title || appConfig.title;

    // Build the HTML content
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>${SHARED_STYLES}</style>
    <style>
        /* App-specific styles can go here */
        ${config.styles || ''}
    </style>
</head>
<body>
    <div class="app-window">
        <div class="title-bar">
            <div class="title-bar-left">
                <span class="title-bar-title">${title}</span>
            </div>
            <div class="title-bar-buttons">
                <button class="title-bar-btn minimize" onclick="window.appAPI?.minimize()" title="Minimize">−</button>
                <button class="title-bar-btn maximize" onclick="window.appAPI?.maximize()" title="Maximize">□</button>
                <button class="title-bar-btn close" onclick="window.appAPI?.close()" title="Close">×</button>
            </div>
        </div>
        <div class="app-content">
            <div class="app-content-scroll" id="app-content">
                ${config.html || '<div style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.6;">Loading...</div>'}
            </div>
        </div>
    </div>
    <script>
        // Store window metadata
        window.__windowId = '${windowId}';
        window.__appId = '${appId}';

        // Action emitter for IPC communication
        function emitAction(action, data) {
            window.__appAction = { action, data, windowId: '${windowId}', appId: '${appId}' };
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                emitAction('requestClose');
            }
        });

        // Custom initialization script
        ${config.script || ''}
    </script>
</body>
</html>`;

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Poll for actions (since no preload with IPC)
    const pollInterval = setInterval(async () => {
        if (!win || win.isDestroyed()) {
            clearInterval(pollInterval);
            return;
        }
        try {
            const action = await win.webContents.executeJavaScript('window.__appAction || null');
            if (action) {
                await win.webContents.executeJavaScript('window.__appAction = null');
                handleAppAction(action);
            }
        } catch {
            // Window likely destroyed
            clearInterval(pollInterval);
        }
    }, 32);  // 32ms polling to match start menu

    win.on('closed', () => {
        clearInterval(pollInterval);
    });

    return { success: true, windowId };
}

/**
 * Handle actions from app windows
 */
function handleAppAction(action) {
    const { windowId, appId, action: actionType, data } = action;

    console.log(`[FloatingApp] Action received: ${actionType} from ${windowId}`);

    switch (actionType) {
        case 'requestClose':
            closeFloatingWindow(windowId);
            break;
        case 'minimize':
            const minWin = floatingWindows.get(windowId);
            if (minWin && !minWin.isDestroyed()) {
                minWin.minimize();
            }
            break;
        case 'maximize':
            const maxWin = floatingWindows.get(windowId);
            if (maxWin && !maxWin.isDestroyed()) {
                if (maxWin.isMaximized()) {
                    maxWin.unmaximize();
                } else {
                    maxWin.maximize();
                }
            }
            break;
        default:
            // Forward action to main window
            if (mainWindowRef && !mainWindowRef.isDestroyed()) {
                mainWindowRef.webContents.send('app-window:action', action);
            }
    }
}

/**
 * Update app window content dynamically
 */
async function updateAppWindow(windowId, html) {
    const win = floatingWindows.get(windowId);
    if (!win || win.isDestroyed()) {
        return { success: false, error: 'Window not found' };
    }

    try {
        await win.webContents.executeJavaScript(`
            document.getElementById('app-content').innerHTML = \`${html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        `);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Register IPC handlers
 */
function registerFloatingAppHandlers(getMainWindow) {
    console.log('[FloatingApp] Registering floating app window handlers...');
    mainWindowRef = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;

    // Open a new floating app window
    ipcMain.handle('app-window:open', async (event, { appId, config }) => {
        console.log(`[FloatingApp] IPC app-window:open for ${appId}`);
        try {
            // Refresh main window reference
            if (typeof getMainWindow === 'function') {
                mainWindowRef = getMainWindow();
            }
            return await openAppWindow(appId, config || {});
        } catch (e) {
            console.error('[FloatingApp] Error opening window:', e);
            return { success: false, error: e.message };
        }
    });

    // Close a specific window
    ipcMain.handle('app-window:close', async (event, { windowId }) => {
        closeFloatingWindow(windowId);
        return { success: true };
    });

    // Minimize a window
    ipcMain.handle('app-window:minimize', async (event, { windowId }) => {
        const win = floatingWindows.get(windowId);
        if (win && !win.isDestroyed()) {
            win.minimize();
            return { success: true };
        }
        return { success: false, error: 'Window not found' };
    });

    // Maximize/restore a window
    ipcMain.handle('app-window:maximize', async (event, { windowId }) => {
        const win = floatingWindows.get(windowId);
        if (win && !win.isDestroyed()) {
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
            return { success: true };
        }
        return { success: false, error: 'Window not found' };
    });

    // Focus a window
    ipcMain.handle('app-window:focus', async (event, { windowId }) => {
        const win = floatingWindows.get(windowId);
        if (win && !win.isDestroyed()) {
            win.show();
            win.focus();
            win.setAlwaysOnTop(true, 'screen-saver');
            return { success: true };
        }
        return { success: false, error: 'Window not found' };
    });

    // Update window content
    ipcMain.handle('app-window:update', async (event, { windowId, html }) => {
        return await updateAppWindow(windowId, html);
    });

    // Get all open windows
    ipcMain.handle('app-window:list', async () => {
        const list = [];
        for (const [windowId, win] of floatingWindows) {
            if (!win.isDestroyed()) {
                const bounds = win.getBounds();
                const [appId] = windowId.split('-');
                list.push({ windowId, appId, bounds });
            }
        }
        return { success: true, windows: list };
    });

    // Close all floating windows
    ipcMain.handle('app-window:closeAll', async () => {
        closeAllFloatingWindows();
        return { success: true };
    });

    console.log('[FloatingApp] Handlers registered successfully');
}

module.exports = {
    registerFloatingAppHandlers,
    openAppWindow,
    closeFloatingWindow,
    closeAllFloatingWindows,
    floatingWindows
};
