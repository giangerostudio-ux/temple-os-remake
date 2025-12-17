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
    trashItem: (path) => ipcRenderer.invoke('fs:trash', path),
    listTrash: () => ipcRenderer.invoke('fs:listTrash'),
    restoreTrash: (trashPath, originalPath) => ipcRenderer.invoke('fs:restoreTrash', { trashPath, originalPath }),
    deleteTrashItem: (trashPath) => ipcRenderer.invoke('fs:deleteTrashItem', trashPath),
    emptyTrash: () => ipcRenderer.invoke('fs:emptyTrash'),
    mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    copyItem: (srcPath, destPath) => ipcRenderer.invoke('fs:copy', srcPath, destPath),
    getHome: () => ipcRenderer.invoke('fs:getHome'),
    getAppPath: () => ipcRenderer.invoke('fs:getAppPath'),
    openExternal: (path) => ipcRenderer.invoke('fs:openExternal', path),
    createZip: (sourcePath, targetZipPath) => ipcRenderer.invoke('fs:createZip', sourcePath, targetZipPath),
    extractZip: (zipPath, targetDir) => ipcRenderer.invoke('fs:extractZip', zipPath, targetDir),

    // ============================================
    // SYSTEM
    // ============================================
    shutdown: () => ipcRenderer.invoke('system:shutdown'),
    restart: () => ipcRenderer.invoke('system:restart'),
    lock: () => ipcRenderer.invoke('system:lock'),
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    getMonitorStats: () => ipcRenderer.invoke('monitor:getStats'),
    listProcesses: () => ipcRenderer.invoke('process:list'),
    killProcess: (pid, signal) => ipcRenderer.invoke('process:kill', { pid, signal }),
    setSystemVolume: (level) => ipcRenderer.invoke('system:setVolume', level),
    setResolution: (resolution) => ipcRenderer.invoke('system:setResolution', resolution),
    getResolutions: () => ipcRenderer.invoke('system:getResolutions'),

    // ============================================
    // CONFIG (persist settings)
    // ============================================
    loadConfig: () => ipcRenderer.invoke('config:load'),
    saveConfig: (config) => ipcRenderer.invoke('config:save', config),

    // ============================================
    // AUDIO DEVICES
    // ============================================
    listAudioDevices: () => ipcRenderer.invoke('audio:listDevices'),
    setDefaultSink: (sinkName) => ipcRenderer.invoke('audio:setDefaultSink', sinkName),
    setDefaultSource: (sourceName) => ipcRenderer.invoke('audio:setDefaultSource', sourceName),
    setAudioVolume: (level) => ipcRenderer.invoke('audio:setVolume', level),

    // ============================================
    // NETWORK
    // ============================================
    getNetworkStatus: () => ipcRenderer.invoke('network:getStatus'),
    listWifiNetworks: () => ipcRenderer.invoke('network:listWifi'),
    connectWifi: (ssid, password) => ipcRenderer.invoke('network:connectWifi', ssid, password),
    disconnectNetwork: () => ipcRenderer.invoke('network:disconnect'),
    disconnectNonVpnNetwork: () => ipcRenderer.invoke('network:disconnectNonVpn'),
    disconnectConnection: (nameOrUuid) => ipcRenderer.invoke('network:disconnectConnection', nameOrUuid),
    getWifiEnabled: () => ipcRenderer.invoke('network:getWifiEnabled'),
    setWifiEnabled: (enabled) => ipcRenderer.invoke('network:setWifiEnabled', enabled),
    listSavedNetworks: () => ipcRenderer.invoke('network:listSaved'),
    connectSavedNetwork: (nameOrUuid) => ipcRenderer.invoke('network:connectSaved', nameOrUuid),
    forgetSavedNetwork: (nameOrUuid) => ipcRenderer.invoke('network:forgetSaved', nameOrUuid),
    importVpnProfile: (kind, filePath) => ipcRenderer.invoke('network:importVpnProfile', kind, filePath),

    // ============================================
    // SSH SERVER
    // ============================================
    sshControl: (action, port) => ipcRenderer.invoke('ssh:control', action, port),

    // ============================================
    // EXIF METADATA
    // ============================================
    extractExif: (imagePath) => ipcRenderer.invoke('exif:extract', imagePath),
    stripExif: (imagePath) => ipcRenderer.invoke('exif:strip', imagePath),
    setTrackerBlocking: (enabled) => ipcRenderer.invoke('security:trackerBlocking', enabled),

    // Firewall (Tier 7.2)
    getFirewallRules: () => ipcRenderer.invoke('security:getFirewallRules'),
    addFirewallRule: (port, protocol, action) => ipcRenderer.invoke('security:addFirewallRule', port, protocol, action),
    deleteFirewallRule: (id) => ipcRenderer.invoke('security:deleteFirewallRule', id),
    toggleFirewall: (enable) => ipcRenderer.invoke('security:toggleFirewall', enable),

    // VeraCrypt (Tier 7.1)
    getVeraCryptStatus: () => ipcRenderer.invoke('security:getVeraCryptStatus'),
    mountVeraCrypt: (path, password, slot) => ipcRenderer.invoke('security:mountVeraCrypt', path, password, slot),
    dismountVeraCrypt: (slot) => ipcRenderer.invoke('security:dismountVeraCrypt', slot),

    // Hotspot (Tier 6.4)
    createHotspot: (ssid, password) => ipcRenderer.invoke('network:createHotspot', ssid, password),
    stopHotspot: () => ipcRenderer.invoke('network:stopHotspot'),

    // ============================================
    // DISPLAY (multi-monitor / scale / refresh)
    // ============================================
    getDisplayOutputs: () => ipcRenderer.invoke('display:getOutputs'),
    setDisplayMode: (outputName, mode) => ipcRenderer.invoke('display:setMode', { outputName, mode }),
    setDisplayScale: (outputName, scale) => ipcRenderer.invoke('display:setScale', { outputName, scale }),
    setDisplayTransform: (outputName, transform) => ipcRenderer.invoke('display:setTransform', { outputName, transform }),

    // ============================================
    // MOUSE / POINTER
    // ============================================
    applyMouseSettings: (settings) => ipcRenderer.invoke('mouse:apply', settings),
    getMouseDpiInfo: () => ipcRenderer.invoke('mouse:getDpiInfo'),
    setMouseDpi: (deviceId, dpi) => ipcRenderer.invoke('mouse:setDpi', { deviceId, dpi }),

    // ============================================
    // TERMINAL
    // ============================================
    execTerminal: (command, cwd) => ipcRenderer.invoke('terminal:exec', command, cwd),

    // PTY Terminal
    createPty: (options) => ipcRenderer.invoke('terminal:createPty', options),
    writePty: (id, data) => ipcRenderer.invoke('terminal:writePty', { id, data }),
    resizePty: (id, cols, rows) => ipcRenderer.invoke('terminal:resizePty', { id, cols, rows }),
    destroyPty: (id) => ipcRenderer.invoke('terminal:destroyPty', { id }),
    isPtyAvailable: () => ipcRenderer.invoke('terminal:isPtyAvailable'),
    onTerminalData: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('terminal:data', handler);
        return () => ipcRenderer.removeListener('terminal:data', handler);
    },
    onTerminalExit: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('terminal:exit', handler);
        return () => ipcRenderer.removeListener('terminal:exit', handler);
    },

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
