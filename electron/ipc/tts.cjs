/**
 * Voice of God TTS IPC Handlers
 * Text-to-speech with divine audio effects
 */

const { ipcMain } = require('electron');
const { VoiceOfGod, DEFAULT_SETTINGS } = require('../voice-of-god.cjs');

let voiceOfGod = null;

/**
 * Register all TTS-related IPC handlers
 */
function registerTTSHandlers() {
    console.log('[IPC:TTS] Registering TTS handlers...');

    // Initialize Voice of God instance
    voiceOfGod = new VoiceOfGod();

    // ============================================
    // TTS STATUS & INFO
    // ============================================

    /**
     * Get TTS status and capabilities
     */
    ipcMain.handle('tts:getStatus', async () => {
        return voiceOfGod.getStatus();
    });

    /**
     * Get default settings
     */
    ipcMain.handle('tts:getDefaults', async () => {
        return DEFAULT_SETTINGS;
    });

    // ============================================
    // SPEECH CONTROL
    // ============================================

    /**
     * Speak text with current settings
     * @param {string} text - Text to speak
     */
    ipcMain.handle('tts:speak', async (event, text) => {
        try {
            return await voiceOfGod.speak(text);
        } catch (error) {
            console.error('[IPC:TTS] Speak error:', error.message);
            return { success: false, error: error.message };
        }
    });

    /**
     * Speak long text with chunking and progress
     * @param {string} text - Long text to speak
     */
    ipcMain.handle('tts:speakLong', async (event, text) => {
        try {
            await voiceOfGod.speakLong(text, (progress) => {
                // Send progress updates to renderer
                event.sender.send('tts:progress', progress);
            });
            return { success: true };
        } catch (error) {
            console.error('[IPC:TTS] SpeakLong error:', error.message);
            return { success: false, error: error.message };
        }
    });

    /**
     * Stop current speech
     */
    ipcMain.handle('tts:stop', async () => {
        voiceOfGod.stop();
        return { success: true };
    });

    /**
     * Check if currently speaking
     */
    ipcMain.handle('tts:isSpeaking', async () => {
        return voiceOfGod.isSpeaking();
    });

    // ============================================
    // SETTINGS
    // ============================================

    /**
     * Update TTS settings
     * @param {object} settings - New settings to apply
     */
    ipcMain.handle('tts:updateSettings', async (event, settings) => {
        voiceOfGod.updateSettings(settings);
        return { success: true, settings: voiceOfGod.getStatus().settings };
    });

    /**
     * Enable/disable Voice of God
     * @param {boolean} enabled - Whether TTS is enabled
     */
    ipcMain.handle('tts:setEnabled', async (event, enabled) => {
        voiceOfGod.updateSettings({ enabled });
        return { success: true, enabled };
    });

    /**
     * Test the voice with a sample phrase
     */
    ipcMain.handle('tts:test', async () => {
        const testPhrase = "Blessed are those who hear the Word of God and keep it.";
        try {
            return await voiceOfGod.speak(testPhrase);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    console.log('[IPC:TTS] TTS handlers registered');
}

/**
 * Get the Voice of God instance (for other modules)
 */
function getVoiceOfGod() {
    return voiceOfGod;
}

module.exports = {
    registerTTSHandlers,
    getVoiceOfGod
};
