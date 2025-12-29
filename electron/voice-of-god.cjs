/**
 * Voice of God - Text-to-Speech Module
 *
 * Uses Piper TTS with the lessac-high voice model and applies
 * divine audio effects (pitch shift, reverb, echo, chorus) to create
 * a godly narrator voice for the Divine Assistant.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Default divine audio effect settings
const DEFAULT_SETTINGS = {
    enabled: true,
    pitch: -2,              // Semitones (deeper voice)
    reverbRoom: 0.85,       // Cathedral-sized reverb
    reverbWet: 0.4,         // 40% reverb mix
    reverbDamping: 0.7,     // High frequency damping
    echoDelay: 120,         // Echo delay in ms
    echoFeedback: 0.2,      // Echo repetition amount
    echoMix: 0.15,          // Echo mix level
    chorusEnabled: true,    // Ethereal chorus effect
    chorusRate: 0.4,        // Chorus LFO rate in Hz
    chorusDepth: 0.25,      // Chorus depth
    chorusMix: 0.2,         // Chorus mix level
    speed: 1.0              // Speaking speed multiplier
};

class VoiceOfGod {
    constructor(options = {}) {
        console.log('[VoiceOfGod] Initializing Voice of God TTS...');

        // Determine paths based on platform
        const isWindows = process.platform === 'win32';
        const piperDir = path.join(__dirname, 'piper');

        this.piperPath = isWindows
            ? path.join(piperDir, 'piper', 'piper.exe')
            : path.join(piperDir, 'piper');

        console.log('[VoiceOfGod] Piper directory:', piperDir);
        console.log('[VoiceOfGod] Piper executable:', this.piperPath);
        console.log('[VoiceOfGod] Piper exists:', fs.existsSync(this.piperPath));

        // Prefer lessac-high, fallback to bryce-medium
        const lessacPath = path.join(piperDir, 'en_US-lessac-high.onnx');
        const brycePath = path.join(piperDir, 'en_US-bryce-medium.onnx');

        console.log('[VoiceOfGod] Looking for lessac-high at:', lessacPath);
        console.log('[VoiceOfGod] Lessac exists:', fs.existsSync(lessacPath));

        if (fs.existsSync(lessacPath)) {
            this.modelPath = lessacPath;
            console.log('[VoiceOfGod] Using lessac-high voice model');
        } else if (fs.existsSync(brycePath)) {
            this.modelPath = brycePath;
            console.log('[VoiceOfGod] Fallback to bryce-medium voice model');
        } else {
            this.modelPath = null;
            console.warn('[VoiceOfGod] No voice model found');
        }

        // State
        this.speaking = false;
        this.currentProcess = null;
        this.audioQueue = [];
        this.isProcessingQueue = false;

        // Temp directory for audio files
        this.tempDir = path.join(os.tmpdir(), 'voice-of-god');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        // Load settings
        this.settings = { ...DEFAULT_SETTINGS, ...options };

        // Check Python and Pedalboard availability
        this.pythonAvailable = this._checkPython();
        this.pedalboardAvailable = this._checkPedalboard();

        if (!this.pedalboardAvailable) {
            console.warn('[VoiceOfGod] Pedalboard not available - divine effects disabled');
        }

        // Summary log
        console.log('[VoiceOfGod] Initialization complete:');
        console.log('  - Piper available:', !!this.modelPath && fs.existsSync(this.piperPath));
        console.log('  - Model:', this.modelPath ? path.basename(this.modelPath) : 'none');
        console.log('  - Python available:', this.pythonAvailable);
        console.log('  - Pedalboard available:', this.pedalboardAvailable);
        console.log('  - TTS Enabled:', this.settings.enabled);
    }

    /**
     * Check if Python 3 is available
     */
    _checkPython() {
        try {
            const cmd = process.platform === 'win32' ? 'python --version' : 'python3 --version';
            execSync(cmd, { stdio: 'pipe' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if Pedalboard is installed
     */
    _checkPedalboard() {
        if (!this.pythonAvailable) return false;
        try {
            const python = process.platform === 'win32' ? 'python' : 'python3';
            execSync(`${python} -c "import pedalboard"`, { stdio: 'pipe' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            available: !!this.modelPath && fs.existsSync(this.piperPath),
            modelLoaded: !!this.modelPath,
            modelName: this.modelPath ? path.basename(this.modelPath) : null,
            effectsAvailable: this.pedalboardAvailable,
            speaking: this.speaking,
            settings: { ...this.settings }
        };
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);
    }

    /**
     * Speak text with divine effects
     */
    async speak(text) {
        if (!this.settings.enabled) {
            console.log('[VoiceOfGod] TTS disabled');
            return { success: false, reason: 'disabled' };
        }

        if (!this.modelPath || !fs.existsSync(this.piperPath)) {
            console.error('[VoiceOfGod] Piper TTS not available');
            return { success: false, reason: 'piper_not_available' };
        }

        // Clean text for TTS
        const cleanedText = this._cleanTextForTTS(text);
        if (!cleanedText.trim()) {
            return { success: false, reason: 'empty_text' };
        }

        // Add to queue
        this.audioQueue.push(cleanedText);

        if (!this.isProcessingQueue) {
            this._processQueue();
        }

        return { success: true };
    }

    /**
     * Process the audio queue
     */
    async _processQueue() {
        if (this.audioQueue.length === 0) {
            this.isProcessingQueue = false;
            this.speaking = false;
            return;
        }

        this.isProcessingQueue = true;
        this.speaking = true;

        const text = this.audioQueue.shift();

        try {
            // Generate raw TTS audio
            const rawAudioPath = await this._generateTTS(text);

            // Apply divine effects if available
            let finalAudioPath = rawAudioPath;
            if (this.pedalboardAvailable) {
                finalAudioPath = await this._applyDivineEffects(rawAudioPath);
            }

            // Play the audio
            await this._playAudio(finalAudioPath);

            // Cleanup temp files
            this._cleanupTempFile(rawAudioPath);
            if (finalAudioPath !== rawAudioPath) {
                this._cleanupTempFile(finalAudioPath);
            }
        } catch (error) {
            console.error('[VoiceOfGod] Error:', error.message);
        }

        // Process next item in queue
        setImmediate(() => this._processQueue());
    }

    /**
     * Generate TTS audio using Piper
     */
    async _generateTTS(text) {
        return new Promise((resolve, reject) => {
            const outputPath = path.join(this.tempDir, `tts_${Date.now()}.wav`);

            const args = [
                '--model', this.modelPath,
                '--output_file', outputPath
            ];

            // Adjust speed if not default
            if (this.settings.speed !== 1.0) {
                args.push('--length_scale', String(1 / this.settings.speed));
            }

            console.log('[VoiceOfGod] Generating TTS...');

            const piper = spawn(this.piperPath, args, {
                cwd: path.dirname(this.piperPath)
            });

            this.currentProcess = piper;

            let stderr = '';
            piper.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            piper.on('close', (code) => {
                this.currentProcess = null;
                if (code === 0 && fs.existsSync(outputPath)) {
                    console.log('[VoiceOfGod] TTS generated successfully');
                    resolve(outputPath);
                } else {
                    reject(new Error(`Piper exited with code ${code}: ${stderr}`));
                }
            });

            piper.on('error', (err) => {
                this.currentProcess = null;
                reject(err);
            });

            // Write text to stdin
            piper.stdin.write(text);
            piper.stdin.end();
        });
    }

    /**
     * Apply divine audio effects using Python Pedalboard
     */
    async _applyDivineEffects(inputPath) {
        return new Promise((resolve, reject) => {
            const outputPath = inputPath.replace('.wav', '_divine.wav');
            const python = process.platform === 'win32' ? 'python' : 'python3';
            const effectsScript = path.join(__dirname, 'audio-effects.py');

            // Settings for the effects script
            const settings = JSON.stringify({
                pitch: this.settings.pitch,
                reverbRoom: this.settings.reverbRoom,
                reverbWet: this.settings.reverbWet,
                reverbDamping: this.settings.reverbDamping,
                echoDelay: this.settings.echoDelay,
                echoFeedback: this.settings.echoFeedback,
                echoMix: this.settings.echoMix,
                chorusEnabled: this.settings.chorusEnabled,
                chorusRate: this.settings.chorusRate,
                chorusDepth: this.settings.chorusDepth,
                chorusMix: this.settings.chorusMix
            });

            console.log('[VoiceOfGod] Applying divine effects...');

            const proc = spawn(python, [effectsScript, inputPath, outputPath, settings]);

            let stderr = '';
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0 && fs.existsSync(outputPath)) {
                    console.log('[VoiceOfGod] Divine effects applied');
                    resolve(outputPath);
                } else {
                    console.warn('[VoiceOfGod] Effects failed, using raw audio:', stderr);
                    resolve(inputPath); // Fallback to raw audio
                }
            });

            proc.on('error', () => {
                resolve(inputPath); // Fallback to raw audio
            });
        });
    }

    /**
     * Play audio file
     */
    async _playAudio(audioPath) {
        return new Promise((resolve, reject) => {
            let player;
            let args;

            if (process.platform === 'win32') {
                // Windows: Use PowerShell to play audio
                player = 'powershell';
                args = [
                    '-Command',
                    `(New-Object Media.SoundPlayer '${audioPath}').PlaySync()`
                ];
            } else if (process.platform === 'darwin') {
                // macOS: Use afplay
                player = 'afplay';
                args = [audioPath];
            } else {
                // Linux: Try aplay, then paplay, then ffplay
                player = 'aplay';
                args = ['-q', audioPath];
            }

            console.log('[VoiceOfGod] Playing audio...');

            const proc = spawn(player, args);
            this.currentProcess = proc;

            proc.on('close', (code) => {
                this.currentProcess = null;
                console.log('[VoiceOfGod] Audio playback complete');
                resolve();
            });

            proc.on('error', (err) => {
                this.currentProcess = null;
                // Try alternative players on Linux
                if (process.platform === 'linux' && player === 'aplay') {
                    this._playWithAlternative(audioPath).then(resolve).catch(reject);
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Try alternative audio players on Linux
     */
    async _playWithAlternative(audioPath) {
        const alternatives = ['paplay', 'ffplay -nodisp -autoexit'];

        for (const alt of alternatives) {
            try {
                const [cmd, ...args] = alt.split(' ');
                await new Promise((resolve, reject) => {
                    const proc = spawn(cmd, [...args, audioPath]);
                    proc.on('close', resolve);
                    proc.on('error', reject);
                });
                return;
            } catch {
                continue;
            }
        }

        throw new Error('No audio player available');
    }

    /**
     * Stop current speech
     */
    stop() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
        }
        this.audioQueue = [];
        this.speaking = false;
        this.isProcessingQueue = false;
        console.log('[VoiceOfGod] Speech stopped');
    }

    /**
     * Check if currently speaking
     */
    isSpeaking() {
        return this.speaking;
    }

    /**
     * Clean text for TTS (remove markdown, special chars, etc.)
     */
    _cleanTextForTTS(text) {
        return text
            // Remove markdown formatting
            .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
            .replace(/\*([^*]+)\*/g, '$1')      // Italic
            .replace(/__([^_]+)__/g, '$1')      // Bold
            .replace(/_([^_]+)_/g, '$1')        // Italic
            .replace(/`([^`]+)`/g, '$1')        // Code
            .replace(/```[\s\S]*?```/g, '')     // Code blocks
            .replace(/#+\s*/g, '')              // Headers
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links
            // Remove special characters
            .replace(/[<>]/g, '')
            .replace(/\n+/g, '. ')              // Newlines to pauses
            .replace(/\s+/g, ' ')               // Multiple spaces
            .trim();
    }

    /**
     * Clean up temporary audio files
     */
    _cleanupTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch {
            // Ignore cleanup errors
        }
    }

    /**
     * Split long text into sentences for chunked TTS
     */
    splitIntoSentences(text) {
        return text
            .split(/(?<=[.!?])\s+/)
            .filter(s => s.trim().length > 0);
    }

    /**
     * Speak long text by chunking into sentences
     */
    async speakLong(text, onProgress = null) {
        const sentences = this.splitIntoSentences(text);
        const total = sentences.length;

        for (let i = 0; i < sentences.length; i++) {
            if (!this.settings.enabled) break;

            await this.speak(sentences[i]);

            if (onProgress) {
                onProgress({ current: i + 1, total, text: sentences[i] });
            }
        }
    }
}

module.exports = { VoiceOfGod, DEFAULT_SETTINGS };
