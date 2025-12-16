const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ============================================
    // WINDOW CONTROL
    // ============================================
    closeWindow: () => ipcRenderer.invoke('close-window'),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),

    // ============================================
    // FILESYSTEM
    // ============================================
    readDir: (path) => ipcRenderer.invoke('fs:readdir', path),
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
    deleteItem: (path) => ipcRenderer.invoke('fs:delete', path),
    mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    getHome: () => ipcRenderer.invoke('fs:getHome'),
    getAppPath: () => ipcRenderer.invoke('fs:getAppPath'),
    openExternal: (path) => ipcRenderer.invoke('fs:openExternal', path),

    // ============================================
    // SYSTEM
    // ============================================
    shutdown: () => ipcRenderer.invoke('system:shutdown'),
    restart: () => ipcRenderer.invoke('system:restart'),
    lock: () => ipcRenderer.invoke('system:lock'),
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    setSystemVolume: (level) => ipcRenderer.invoke('system:setVolume', level),
    setResolution: (resolution) => ipcRenderer.invoke('system:setResolution', resolution),
    getResolutions: () => ipcRenderer.invoke('system:getResolutions'),

    // ============================================
    // EVENT LISTENERS
    // ============================================
    onLockScreen: (callback) => ipcRenderer.on('lock-screen', callback),

    // ============================================
    // HOLY UPDATER
    // ============================================
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    runUpdate: () => ipcRenderer.invoke('updater:update'),

    // ============================================
    // APP DISCOVERY (Start Menu)
    // ============================================
    getInstalledApps: () => ipcRenderer.invoke('apps:getInstalled'),
    launchApp: (app) => ipcRenderer.invoke('apps:launch', app),
});
