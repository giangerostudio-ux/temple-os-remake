/**
 * IPC Handler Registration Index
 * Central module that registers all IPC handlers from sub-modules
 */

const { registerFilesystemHandlers } = require('./filesystem.cjs');
const { registerSystemHandlers } = require('./system.cjs');
const { registerAudioHandlers } = require('./audio.cjs');
const { registerNetworkHandlers } = require('./network.cjs');
const { registerBluetoothHandlers } = require('./bluetooth.cjs');
const { registerDisplayHandlers } = require('./display.cjs');
const { registerTerminalHandlers } = require('./terminal.cjs');
const { registerSecurityHandlers } = require('./security.cjs');
const { registerTTSHandlers } = require('./tts.cjs');

/**
 * Register all IPC handlers
 * @param {Function} getMainWindow - Function that returns the main BrowserWindow
 */
function registerAllHandlers(getMainWindow) {
    console.log('[IPC] Registering all handlers...');

    // Filesystem handlers (fs:*, exif:*)
    registerFilesystemHandlers();

    // System handlers (system:*, monitor:*, process:*, config:*)
    registerSystemHandlers(getMainWindow);

    // Audio handlers (audio:*)
    registerAudioHandlers();

    // Network handlers (network:*)
    registerNetworkHandlers();

    // Bluetooth handlers (bluetooth:*)
    registerBluetoothHandlers();

    // Display handlers (display:*, mouse:*, resolution)
    registerDisplayHandlers();

    // Terminal handlers (terminal:*)
    registerTerminalHandlers(getMainWindow);

    // Security handlers (security:*, ssh:*, dns, lockdown)
    registerSecurityHandlers();

    // TTS handlers (tts:*) - Voice of God
    registerTTSHandlers();

    console.log('[IPC] All modular handlers registered');
}

// Export utilities for other modules that may need them
const utils = require('./utils.cjs');

module.exports = {
    registerAllHandlers,
    ...utils
};
