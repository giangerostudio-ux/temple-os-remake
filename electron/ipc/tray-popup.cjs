/**
 * Tray Popup Module - External BrowserWindow for tray popups
 * 
 * This module creates a reusable popup window that floats above X11 apps
 * for volume, network, calendar, and notification tray popups.
 */

const { BrowserWindow, screen, ipcMain } = require('electron');

let trayPopupWindow = null;
let trayPopupPollInterval = null;
let mainWindowRef = null;

// Shared CSS styles for all tray popups (TempleOS aesthetic)
const SHARED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
html { background: transparent; }
body {
    font-family: 'VT323', monospace;
    color: #00ff41;
    background: rgba(13, 17, 23, 0.96);
    border: 2px solid #00ff41;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.3), 0 4px 15px rgba(0,0,0,0.6);
    overflow: hidden;
    padding: 10px;
}
.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(0, 255, 65, 0.3);
    font-weight: bold;
}
.popup-content { }
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
input[type="range"] {
    accent-color: #00ff41;
    cursor: pointer;
}
.net-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px;
    border: 1px solid rgba(0, 255, 65, 0.2);
    border-radius: 6px;
    margin-bottom: 6px;
    background: rgba(0, 0, 0, 0.2);
}
.net-item.connected {
    background: rgba(0, 255, 65, 0.15);
}
.net-name { font-weight: bold; }
.net-info { font-size: 12px; opacity: 0.8; }
.status-box {
    padding: 10px;
    border: 1px solid rgba(0, 255, 65, 0.3);
    border-radius: 8px;
    background: rgba(0, 255, 65, 0.08);
    margin-bottom: 10px;
}
.status-title { font-weight: bold; color: #ffd700; }
.status-detail { font-size: 12px; opacity: 0.85; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0, 255, 65, 0.3); border-radius: 3px; }
`;

/**
 * Close any existing tray popup
 */
function closeTrayPopup() {
    if (trayPopupPollInterval) {
        clearInterval(trayPopupPollInterval);
        trayPopupPollInterval = null;
    }
    if (trayPopupWindow && !trayPopupWindow.isDestroyed()) {
        try {
            trayPopupWindow.destroy();
        } catch { }
    }
    trayPopupWindow = null;
}

/**
 * Show a tray popup with the given configuration
 * @param {Object} config - Popup configuration
 * @param {string} config.type - Popup type: 'volume', 'network', 'calendar', 'notification'
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {number} config.width - Popup width
 * @param {number} config.height - Popup height
 * @param {string} config.html - HTML content for the popup body
 * @param {string} config.taskbarPosition - 'top' or 'bottom'
 */
function showTrayPopup(config) {
    console.log('[TrayPopup] showTrayPopup called with config type:', config?.type);
    closeTrayPopup();

    const { type, x, y, width, height, html, taskbarPosition = 'bottom' } = config;

    // Get screen bounds
    const primary = screen.getPrimaryDisplay();
    const bounds = primary?.bounds || { x: 0, y: 0, width: 1920, height: 1080 };

    // Calculate position - ensure popup stays on screen
    let posX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - width - 10));
    let posY = y;

    // Adjust Y based on taskbar position
    if (taskbarPosition === 'bottom') {
        posY = bounds.y + bounds.height - height - 70; // Above taskbar
    } else {
        posY = bounds.y + 70; // Below taskbar
    }

    trayPopupWindow = new BrowserWindow({
        x: posX,
        y: posY,
        width: width,
        height: height,
        frame: false,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: true,
        show: false,
        transparent: true,
        hasShadow: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    // Set highest z-order for X11 compatibility
    trayPopupWindow.setAlwaysOnTop(true, 'screen-saver');

    // Make visible on all workspaces for X11 multi-desktop support
    trayPopupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Skip pager and taskbar on X11
    if (process.platform === 'linux') {
        try {
            trayPopupWindow.setSkipTaskbar(true);
        } catch { }
    }

    // Build full HTML document
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>${SHARED_STYLES}</style>
</head>
<body>
${html}
<script>
// Action handler - sets global variable for polling
function emitAction(action, data) {
    window.__trayPopupAction = { action, data, type: '${type}' };
}

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') emitAction('close');
});

// Auto-close on click outside (blur)
// Note: handled by blur event on window
</script>
</body>
</html>`;

    trayPopupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

    trayPopupWindow.once('ready-to-show', () => {
        if (trayPopupWindow && !trayPopupWindow.isDestroyed()) {
            trayPopupWindow.show();
            // Explicit focus for X11 - ensure popup gets input focus
            trayPopupWindow.focus();
            // Re-apply alwaysOnTop after show (some X11 WMs need this)
            trayPopupWindow.setAlwaysOnTop(true, 'screen-saver');
        }
    });

    // Poll for actions from the popup
    trayPopupPollInterval = setInterval(async () => {
        if (!trayPopupWindow || trayPopupWindow.isDestroyed()) {
            closeTrayPopup();
            return;
        }
        try {
            const action = await trayPopupWindow.webContents.executeJavaScript('window.__trayPopupAction || null');
            if (action) {
                // Clear action
                await trayPopupWindow.webContents.executeJavaScript('window.__trayPopupAction = null');

                // Send to renderer
                if (mainWindowRef && !mainWindowRef.isDestroyed()) {
                    mainWindowRef.webContents.send('tray-popup:action', action);
                }

                // Close popup on most actions
                if (action.action === 'close' || action.action === 'select') {
                    closeTrayPopup();
                }
            }
        } catch {
            closeTrayPopup();
        }
    }, 50);

    // Close on blur - use 300ms delay for X11 focus settling
    trayPopupWindow.on('blur', () => {
        setTimeout(() => {
            if (trayPopupWindow && !trayPopupWindow.isDestroyed()) {
                closeTrayPopup();
                if (mainWindowRef && !mainWindowRef.isDestroyed()) {
                    mainWindowRef.webContents.send('tray-popup:closed', { type });
                }
            }
        }, 300);
    });

    trayPopupWindow.on('closed', () => {
        closeTrayPopup();
    });

    return { success: true };
}

/**
 * Register IPC handlers for tray popup
 * @param {Function} getMainWindow - Function that returns the main window
 */
function registerTrayPopupHandlers(getMainWindow) {
    console.log('[TrayPopup] Registering tray popup handlers...');
    mainWindowRef = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    console.log('[TrayPopup] mainWindowRef initialized:', !!mainWindowRef);

    ipcMain.handle('tray-popup:show', async (event, config) => {
        console.log('[TrayPopup] IPC tray-popup:show received with config:', JSON.stringify(config, null, 2));
        try {
            // Refresh main window reference
            if (typeof getMainWindow === 'function') {
                mainWindowRef = getMainWindow();
                console.log('[TrayPopup] Refreshed mainWindowRef:', !!mainWindowRef);
            }
            const result = showTrayPopup(config);
            console.log('[TrayPopup] showTrayPopup result:', result);
            return result;
        } catch (e) {
            console.error('[TrayPopup] Error in tray-popup:show handler:', e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('tray-popup:hide', async () => {
        closeTrayPopup();
        return { success: true };
    });

    ipcMain.handle('tray-popup:update', async (event, { html }) => {
        if (!trayPopupWindow || trayPopupWindow.isDestroyed()) {
            return { success: false, error: 'No popup open' };
        }
        try {
            await trayPopupWindow.webContents.executeJavaScript(`
                document.body.innerHTML = \`${html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
            `);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });
}

module.exports = {
    registerTrayPopupHandlers,
    showTrayPopup,
    closeTrayPopup,
};
