const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ============================================
    // WINDOW CONTROL
    // ============================================
    closeWindow: () => ipcRenderer.invoke('close-window'),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    setWindowBounds: (bounds) => ipcRenderer.invoke('window:setBounds', bounds),
    inputWakeUp: () => ipcRenderer.invoke('input-wake-up'),

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

    // FILE BOOKMARKS (synced between inline and popout)
    getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
    addBookmark: (path) => ipcRenderer.invoke('bookmarks:add', path),
    removeBookmark: (path) => ipcRenderer.invoke('bookmarks:remove', path),
    onBookmarksChanged: (callback) => {
        const handler = (event, bookmarks) => callback(bookmarks);
        ipcRenderer.on('bookmarks:changed', handler);
        return () => ipcRenderer.removeListener('bookmarks:changed', handler);
    },

    // OPEN WITH / DEFAULT APPS
    getMimeType: (path) => ipcRenderer.invoke('fs:getMimeType', path),
    getAppsForMimeType: (mimeType) => ipcRenderer.invoke('apps:getAppsForMimeType', mimeType),
    getDefaultApp: (mimeType) => ipcRenderer.invoke('apps:getDefaultApp', mimeType),
    setDefaultApp: (mimeType, appId) => ipcRenderer.invoke('apps:setDefaultApp', mimeType, appId),
    openWith: (filePath, appExec) => ipcRenderer.invoke('fs:openWith', filePath, appExec),

    // ============================================
    // SYSTEM
    // ============================================
    shutdown: () => ipcRenderer.invoke('system:shutdown'),
    restart: () => ipcRenderer.invoke('system:restart'),
    lock: () => ipcRenderer.invoke('system:lock'),
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    isCommandAvailable: (cmd) => ipcRenderer.invoke('system:isCommandAvailable', cmd),
    getMonitorStats: () => ipcRenderer.invoke('monitor:getStats'),
    getBatteryStatus: () => ipcRenderer.invoke('system:getBattery'),
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
    onConfigChanged: (callback) => {
        const handler = (event, config) => callback(config);
        ipcRenderer.on('config:changed', handler);
        return () => ipcRenderer.removeListener('config:changed', handler);
    },

    // ============================================
    // AUDIO DEVICES
    // ============================================
    listAudioDevices: () => ipcRenderer.invoke('audio:listDevices'),
    setDefaultSink: (sinkName) => ipcRenderer.invoke('audio:setDefaultSink', sinkName),
    setDefaultSource: (sourceName) => ipcRenderer.invoke('audio:setDefaultSource', sourceName),
    setAudioVolume: (level) => ipcRenderer.invoke('audio:setVolume', level),

    // ============================================
    // BLUETOOTH (BlueZ via bluetoothctl)
    // ============================================
    setBluetoothEnabled: (enabled) => ipcRenderer.invoke('bluetooth:setEnabled', enabled),
    setBluetoothEnabledWithPassword: (enabled, password) => ipcRenderer.invoke('bluetooth:setEnabledWithPassword', enabled, password),
    scanBluetoothDevices: () => ipcRenderer.invoke('bluetooth:scan'),
    getPairedBluetoothDevices: () => ipcRenderer.invoke('bluetooth:listPaired'),
    connectBluetoothDevice: (mac) => ipcRenderer.invoke('bluetooth:connect', mac),
    disconnectBluetoothDevice: (mac) => ipcRenderer.invoke('bluetooth:disconnect', mac),

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
    setMacRandomization: (enabled) => ipcRenderer.invoke('security:setMacRandomization', enabled),
    getTorStatus: () => ipcRenderer.invoke('security:getTorStatus'),
    setTorEnabled: (enabled) => ipcRenderer.invoke('security:setTorEnabled', enabled),
    installTor: () => ipcRenderer.invoke('security:installTor'),

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

    // Security
    triggerLockdown: () => ipcRenderer.invoke('trigger-lockdown'),
    setDns: (iface, primary, secondary) => ipcRenderer.invoke('set-dns', iface, primary, secondary),

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
    // DIVINE ASSISTANT (Word of God AI)
    // ============================================
    divineGetStatus: () => ipcRenderer.invoke('divine:getStatus'),
    divineConfigure: (config) => ipcRenderer.invoke('divine:configure', config),
    divineDownloadModel: () => ipcRenderer.invoke('divine:downloadModel'),
    divineSendMessage: (message) => ipcRenderer.invoke('divine:sendMessage', message),
    divineExecuteCommand: (command, options) => ipcRenderer.invoke('divine:executeCommand', command, options),
    divineOpenUrl: (url) => ipcRenderer.invoke('divine:openUrl', url),
    divineIsDangerous: (command) => ipcRenderer.invoke('divine:isDangerous', command),
    divineGetGreeting: () => ipcRenderer.invoke('divine:getGreeting'),
    divineClearHistory: () => ipcRenderer.invoke('divine:clearHistory'),
    divineAbort: () => ipcRenderer.invoke('divine:abort'),
    divineGetCommandHistory: (limit) => ipcRenderer.invoke('divine:getCommandHistory', limit),
    divineGetInstallInstructions: () => ipcRenderer.invoke('divine:getInstallInstructions'),
    onDivineDownloadProgress: (callback) => {
        const handler = (event, progress) => callback(progress);
        ipcRenderer.on('divine:downloadProgress', handler);
        return () => ipcRenderer.removeListener('divine:downloadProgress', handler);
    },
    onDivineStreamChunk: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('divine:streamChunk', handler);
        return () => ipcRenderer.removeListener('divine:streamChunk', handler);
    },
    onDivineCommandOutput: (callback) => {
        const handler = (event, output) => callback(output);
        ipcRenderer.on('divine:commandOutput', handler);
        return () => ipcRenderer.removeListener('divine:commandOutput', handler);
    },

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
    uninstallApp: (app) => ipcRenderer.invoke('apps:uninstall', app),
    uninstallAppWithPassword: (app, password) => ipcRenderer.invoke('apps:uninstallWithPassword', { app, password }),
    onAppsChanged: (callback) => {
        const handler = (event, payload) => callback(payload);
        ipcRenderer.on('apps:changed', handler);
        return () => ipcRenderer.removeListener('apps:changed', handler);
    },

    // ============================================
    // X11 WINDOW BRIDGE (External app taskbar)
    // ============================================
    x11Supported: () => ipcRenderer.invoke('x11:supported'),
    getActiveX11Window: () => ipcRenderer.invoke('x11:getActiveWindow'),
    getX11Windows: () => ipcRenderer.invoke('x11:getWindows'),
    activateX11Window: (xidHex) => ipcRenderer.invoke('x11:activateWindow', xidHex),
    closeX11Window: (xidHex) => ipcRenderer.invoke('x11:closeWindow', xidHex),
    minimizeX11Window: (xidHex) => ipcRenderer.invoke('x11:minimizeWindow', xidHex),
    unminimizeX11Window: (xidHex) => ipcRenderer.invoke('x11:unminimizeWindow', xidHex),
    setX11WindowAlwaysOnTop: (xidHex, enabled) => ipcRenderer.invoke('x11:setAlwaysOnTop', xidHex, enabled),
    snapX11Window: (xidHex, mode, taskbarConfig) => ipcRenderer.invoke('x11:snapWindow', xidHex, mode, taskbarConfig),
    onX11WindowsChanged: (callback) => {
        const handler = (event, payload) => callback(payload);
        ipcRenderer.on('x11:windowsChanged', handler);
        return () => ipcRenderer.removeListener('x11:windowsChanged', handler);
    },
    onX11SnapLayoutsSuggest: (callback) => {
        const handler = (event, payload) => callback(payload);
        ipcRenderer.on('x11:snapLayouts:suggest', handler);
        return () => ipcRenderer.removeListener('x11:snapLayouts:suggest', handler);
    },
    getSnapLayoutsEnabled: () => ipcRenderer.invoke('x11:getSnapLayoutsEnabled'),
    setSnapLayoutsEnabled: (enabled) => ipcRenderer.invoke('x11:setSnapLayoutsEnabled', enabled),
    getTilingState: () => ipcRenderer.invoke('x11:getTilingState'),
    setOccupiedSlot: (xidHex, slot) => ipcRenderer.invoke('x11:setOccupiedSlot', xidHex, slot),
    getNextSlot: () => ipcRenderer.invoke('x11:getNextSlot'),

    // X11 Virtual Desktops (Workspaces)
    switchX11Desktop: (desktopIndex) => ipcRenderer.invoke('x11:switchDesktop', desktopIndex),
    getCurrentX11Desktop: () => ipcRenderer.invoke('x11:getCurrentDesktop'),
    getX11DesktopCount: () => ipcRenderer.invoke('x11:getDesktopCount'),
    moveX11WindowToDesktop: (xidHex, desktopIndex) => ipcRenderer.invoke('x11:moveWindowToDesktop', xidHex, desktopIndex),

    getPanelPolicy: () => ipcRenderer.invoke('shell:getPanelPolicy'),
    setHideBarOnFullscreen: (enabled) => ipcRenderer.invoke('shell:setHideBarOnFullscreen', enabled),
    setGamingMode: (enabled) => ipcRenderer.invoke('shell:setGamingMode', enabled),
    setTaskbarPosition: (position) => ipcRenderer.invoke('settings:setTaskbarPosition', position),
    hasExternalPanel: () => ipcRenderer.invoke('shell:hasExternalPanel'),

    panelToggleStartMenu: () => ipcRenderer.invoke('panel:toggleStartMenu'),
    onShellToggleStartMenu: (callback) => {
        const handler = (event, payload) => callback(payload);
        ipcRenderer.on('shell:toggleStartMenu', handler);
        return () => ipcRenderer.removeListener('shell:toggleStartMenu', handler);
    },

    // ============================================
    // CONTEXT MENU POPUP (Linux X11 floating menus)
    // ============================================
    showContextMenuPopup: (x, y, items) => ipcRenderer.invoke('contextmenu:show', { x, y, items }),
    closeContextMenuPopup: () => ipcRenderer.invoke('contextmenu:close'),
    onContextMenuAction: (callback) => {
        const handler = (event, actionId) => callback(actionId);
        ipcRenderer.on('contextmenu:executeAction', handler);
        return () => ipcRenderer.removeListener('contextmenu:executeAction', handler);
    },

    // ============================================
    // START MENU POPUP (Linux X11 floating Start Menu)
    // ============================================
    showStartMenuPopup: (config) => ipcRenderer.invoke('startmenu:show', config),
    hideStartMenuPopup: () => ipcRenderer.invoke('startmenu:hide'),
    onStartMenuAction: (callback) => {
        const handler = (event, action) => callback(action);
        ipcRenderer.on('startmenu:action', handler);
        return () => ipcRenderer.removeListener('startmenu:action', handler);
    },
    onStartMenuClosed: (callback) => {
        const handler = (event, payload) => callback(payload);
        ipcRenderer.on('startmenu:closed', handler);
        return () => ipcRenderer.removeListener('startmenu:closed', handler);
    },

    // ============================================
    // GLOBAL SHORTCUTS (system-wide keybinds from main process)
    // ============================================
    onGlobalShortcut: (callback) => {
        const handler = (event, action) => callback(action);
        ipcRenderer.on('global-shortcut', handler);
        return () => ipcRenderer.removeListener('global-shortcut', handler);
    },

    // ============================================
    // VOICE OF GOD (TTS with divine effects)
    // ============================================
    ttsGetStatus: () => ipcRenderer.invoke('tts:getStatus'),
    ttsGetDefaults: () => ipcRenderer.invoke('tts:getDefaults'),
    ttsSpeak: (text) => ipcRenderer.invoke('tts:speak', text),
    ttsSpeakLong: (text) => ipcRenderer.invoke('tts:speakLong', text),
    ttsStop: () => ipcRenderer.invoke('tts:stop'),
    ttsIsSpeaking: () => ipcRenderer.invoke('tts:isSpeaking'),
    ttsUpdateSettings: (settings) => ipcRenderer.invoke('tts:updateSettings', settings),
    ttsSetEnabled: (enabled) => ipcRenderer.invoke('tts:setEnabled', enabled),
    ttsTest: () => ipcRenderer.invoke('tts:test'),
    ttsRecheckEffects: () => ipcRenderer.invoke('tts:recheckEffects'),
    onTtsProgress: (callback) => {
        const handler = (event, progress) => callback(progress);
        ipcRenderer.on('tts:progress', handler);
        return () => ipcRenderer.removeListener('tts:progress', handler);
    },

    // ============================================
    // TRAY POPUP (X11-compatible floating popups)
    // ============================================
    showTrayPopup: (config) => ipcRenderer.invoke('tray-popup:show', config),
    hideTrayPopup: () => ipcRenderer.invoke('tray-popup:hide'),
    updateTrayPopup: (html) => ipcRenderer.invoke('tray-popup:update', { html }),
    onTrayPopupAction: (callback) => {
        const handler = (event, action) => callback(action);
        ipcRenderer.on('tray-popup:action', handler);
        return () => ipcRenderer.removeListener('tray-popup:action', handler);
    },
    onTrayPopupClosed: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('tray-popup:closed', handler);
        return () => ipcRenderer.removeListener('tray-popup:closed', handler);
    },

    // ============================================
    // FLOATING APP WINDOWS (X11-compatible system apps)
    // ============================================
    // NEW: Use inline handler (same pattern as Start Menu - guaranteed to work)
    openFloatingApp: (appId, config) => ipcRenderer.invoke('floatingApp:open', { appId, config }),
    closeFloatingApp: (windowId) => ipcRenderer.invoke('floatingApp:close', { windowId }),
    onFloatingAppClosed: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('floatingApp:closed', handler);
        return () => ipcRenderer.removeListener('floatingApp:closed', handler);
    },
    // Legacy: external module handlers (may have issues)
    openAppWindow: (appId, config) => ipcRenderer.invoke('app-window:open', { appId, config }),
    closeAppWindow: (windowId) => ipcRenderer.invoke('app-window:close', { windowId }),
    minimizeAppWindow: (windowId) => ipcRenderer.invoke('app-window:minimize', { windowId }),
    maximizeAppWindow: (windowId) => ipcRenderer.invoke('app-window:maximize', { windowId }),
    focusAppWindow: (windowId) => ipcRenderer.invoke('app-window:focus', { windowId }),
    updateAppWindow: (windowId, html) => ipcRenderer.invoke('app-window:update', { windowId, html }),
    listAppWindows: () => ipcRenderer.invoke('app-window:list'),
    closeAllAppWindows: () => ipcRenderer.invoke('app-window:closeAll'),
    onAppWindowAction: (callback) => {
        const handler = (event, action) => callback(action);
        ipcRenderer.on('app-window:action', handler);
        return () => ipcRenderer.removeListener('app-window:action', handler);
    },
    onAppWindowClosed: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on('app-window:closed', handler);
        return () => ipcRenderer.removeListener('app-window:closed', handler);
    },
});
