/**
 * Preload script for floating app windows
 * Provides window control API to the app window renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appAPI', {
    // Window controls
    minimize: () => {
        const windowId = window.__windowId;
        if (windowId) {
            ipcRenderer.invoke('app-window:minimize', { windowId });
        }
    },
    maximize: () => {
        const windowId = window.__windowId;
        if (windowId) {
            ipcRenderer.invoke('app-window:maximize', { windowId });
        }
    },
    close: () => {
        const windowId = window.__windowId;
        if (windowId) {
            ipcRenderer.invoke('app-window:close', { windowId });
        }
    },

    // Get window info
    getWindowId: () => window.__windowId,
    getAppId: () => window.__appId,

    // Send action to main process
    sendAction: (action, data) => {
        const windowId = window.__windowId;
        const appId = window.__appId;
        if (windowId) {
            ipcRenderer.send('app-window:userAction', { windowId, appId, action, data });
        }
    },

    // Request content update
    requestUpdate: (html) => {
        const windowId = window.__windowId;
        if (windowId) {
            return ipcRenderer.invoke('app-window:update', { windowId, html });
        }
    }
});
