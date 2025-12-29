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
    speed: 1.0,             // Speaking speed multiplier
    volume: 1.0             // Volume level (0.0 to 2.0, 1.0 = normal)
};

class VoiceOfGod {
    constructor(options = {}) {
        console.log('[VoiceOfGod] Initializing Voice of God TTS...');

        // Determine paths based on platform
        const isWindows = process.platform === 'win32';
        this.piperDir = path.join(__dirname, 'piper');

        this.piperPath = isWindows
            ? path.join(this.piperDir, 'piper', 'piper.exe')
            : path.join(this.piperDir, 'piper', 'piper');  // tar extracts to piper/ subdir

        console.log('[VoiceOfGod] Piper directory:', this.piperDir);
        console.log('[VoiceOfGod] Piper executable:', this.piperPath);
        console.log('[VoiceOfGod] Piper exists:', fs.existsSync(this.piperPath));

        // Prefer bryce-medium (deeper male voice), fallback to lessac-high
        const brycePath = path.join(this.piperDir, 'en_US-bryce-medium.onnx');
        const lessacPath = path.join(this.piperDir, 'en_US-lessac-high.onnx');

        console.log('[VoiceOfGod] Looking for bryce-medium at:', brycePath);
        console.log('[VoiceOfGod] Bryce exists:', fs.existsSync(brycePath));

        if (fs.existsSync(brycePath)) {
            this.modelPath = brycePath;
            console.log('[VoiceOfGod] Using bryce-medium voice model (deeper male voice)');
        } else if (fs.existsSync(lessacPath)) {
            this.modelPath = lessacPath;
            console.log('[VoiceOfGod] Fallback to lessac-high voice model');
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
        console.log('  - Windows SAPI fallback:', process.platform === 'win32' ? 'available' : 'N/A');
    }

    /**
     * Check if Python 3 is available and find the right executable
     */
    _checkPython() {
        // Try multiple possible Python commands
        const pythonCmds = process.platform === 'win32'
            ? ['python', 'python3', 'py -3']
            : ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'];

        for (const cmd of pythonCmds) {
            try {
                const result = execSync(`${cmd} --version`, { stdio: 'pipe', timeout: 5000 });
                const version = result.toString().trim();
                console.log(`[VoiceOfGod] Found Python: ${cmd} -> ${version}`);
                // Store the working Python command
                this.pythonCmd = cmd.split(' ')[0]; // Handle 'py -3' case
                if (cmd === 'py -3') {
                    this.pythonArgs = ['-3'];
                } else {
                    this.pythonArgs = [];
                }
                return true;
            } catch {
                continue;
            }
        }
        console.log('[VoiceOfGod] No Python found');
        return false;
    }

    /**
     * Check if Pedalboard is installed
     */
    _checkPedalboard() {
        if (!this.pythonAvailable) {
            console.log('[VoiceOfGod] Pedalboard check: Python not available');
            return false;
        }

        // Try multiple Python paths and methods
        const pythonPaths = process.platform === 'win32'
            ? [this.pythonCmd, 'python', 'python3']
            : [this.pythonCmd, '/usr/bin/python3', 'python3', 'python'];

        for (const python of pythonPaths) {
            if (!python) continue;
            try {
                // Use shell: true to get proper environment
                const env = { ...process.env };

                const cmd = `${python} -c "import pedalboard; print('OK')"`;
                console.log('[VoiceOfGod] Checking pedalboard with:', cmd);

                const result = execSync(cmd, {
                    stdio: 'pipe',
                    timeout: 10000,
                    shell: true,
                    env: env
                });

                const output = result.toString().trim();
                console.log('[VoiceOfGod] Pedalboard check result:', output);

                if (output === 'OK') {
                    // Store which Python works
                    this.pythonCmd = python;
                    console.log('[VoiceOfGod] Pedalboard found using:', python);
                    return true;
                }
            } catch (err) {
                console.log(`[VoiceOfGod] Pedalboard check failed with ${python}:`, err.message);
                if (err.stderr) {
                    console.log('[VoiceOfGod] stderr:', err.stderr.toString().substring(0, 200));
                }
                // Continue to try next Python path
            }
        }

        console.log('[VoiceOfGod] Pedalboard not found in any Python installation');
        return false;
    }

    /**
     * Re-check pedalboard availability (call after installing)
     */
    recheckEffects() {
        const wasAvailable = this.pedalboardAvailable;
        this.pedalboardAvailable = this._checkPedalboard();
        console.log('[VoiceOfGod] Effects re-check:', wasAvailable, '->', this.pedalboardAvailable);
        return this.pedalboardAvailable;
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
            settings: { ...this.settings },
            piperDir: this.piperDir  // Absolute path for install command
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
        console.log('[VoiceOfGod] speak() called, enabled:', this.settings.enabled);
        console.log('[VoiceOfGod] piperPath:', this.piperPath, 'exists:', fs.existsSync(this.piperPath));
        console.log('[VoiceOfGod] modelPath:', this.modelPath, 'exists:', this.modelPath ? fs.existsSync(this.modelPath) : false);

        if (!this.settings.enabled) {
            console.log('[VoiceOfGod] TTS disabled');
            return { success: false, reason: 'disabled' };
        }

        // Clean text for TTS
        const cleanedText = this._cleanTextForTTS(text);
        if (!cleanedText.trim()) {
            console.log('[VoiceOfGod] Empty text after cleaning');
            return { success: false, reason: 'empty_text' };
        }

        // Check if Piper is available
        if (this.modelPath && fs.existsSync(this.piperPath)) {
            console.log('[VoiceOfGod] Piper available! Queueing text...');
            // Use Piper TTS
            this.audioQueue.push(cleanedText);
            if (!this.isProcessingQueue) {
                this._processQueue();
            }
            return {
                success: true,
                effectsAvailable: this.pedalboardAvailable,
                effectsInstallCommand: 'sudo apt-get install -y python3-pip && sudo python3 -m pip install --break-system-packages pedalboard scipy numpy'
            };
        }

        // Piper not installed - return status so frontend can prompt installation
        console.warn('[VoiceOfGod] Piper TTS not installed');
        return {
            success: false,
            reason: 'piper_not_installed',
            installInstructions: this._getPiperInstallInstructions()
        };
    }

    /**
     * Get Piper installation instructions for current platform
     */
    _getPiperInstallInstructions() {
        const isWindows = process.platform === 'win32';
        const piperDir = path.join(__dirname, 'piper');

        if (isWindows) {
            return {
                platform: 'windows',
                piperDir: piperDir,
                steps: [
                    'Download Piper from: https://github.com/rhasspy/piper/releases',
                    'Get piper_windows_amd64.zip',
                    'Extract to: ' + piperDir,
                    'Download voice model: https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx',
                    'Place .onnx file in: ' + piperDir
                ],
                downloadUrl: 'https://github.com/rhasspy/piper/releases/latest',
                modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx'
            };
        } else {
            return {
                platform: 'linux',
                piperDir: piperDir,
                steps: [
                    'Install via package manager or download from GitHub',
                    'Download piper_linux_x86_64.tar.gz from releases',
                    'Extract to: ' + piperDir,
                    'Download voice model and place in same directory'
                ],
                downloadUrl: 'https://github.com/rhasspy/piper/releases/latest',
                modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx',
                command: `mkdir -p "${piperDir}" && cd "${piperDir}" && curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz && tar xzf piper.tar.gz && curl -L -o en_US-lessac-high.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx && curl -L -o en_US-lessac-high.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json`
            };
        }
    }

    /**
     * Speak using Windows built-in SAPI (Speech API)
     * This is a fallback when Piper is not available
     */
    async _speakWithWindowsSAPI(text) {
        return new Promise((resolve) => {
            console.log('[VoiceOfGod] Using Windows SAPI fallback...');
            this.speaking = true;

            // Escape text for PowerShell - handle quotes and special chars
            const escapedText = text
                .replace(/'/g, "''")  // Escape single quotes for PowerShell
                .replace(/"/g, '\\"') // Escape double quotes
                .replace(/\n/g, ' ')  // Remove newlines
                .slice(0, 2000);       // Limit length to avoid command line issues

            // Use Add-Type to access .NET Speech Synthesis
            const psScript = `
                Add-Type -AssemblyName System.Speech
                $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
                $synth.Rate = 0
                $synth.Volume = 100
                $synth.Speak('${escapedText}')
            `.replace(/\n/g, '; ').trim();

            const proc = spawn('powershell', ['-NoProfile', '-Command', psScript], {
                windowsHide: true
            });

            this.currentProcess = proc;

            proc.on('close', (code) => {
                this.currentProcess = null;
                this.speaking = false;
                if (code === 0) {
                    console.log('[VoiceOfGod] Windows SAPI speech complete');
                    resolve({ success: true });
                } else {
                    console.warn('[VoiceOfGod] Windows SAPI exited with code:', code);
                    resolve({ success: false, reason: 'sapi_error' });
                }
            });

            proc.on('error', (err) => {
                this.currentProcess = null;
                this.speaking = false;
                console.error('[VoiceOfGod] Windows SAPI error:', err.message);
                resolve({ success: false, reason: 'sapi_error', error: err.message });
            });
        });
    }

    /**
     * Process the audio queue
     */
    async _processQueue() {
        console.log('[VoiceOfGod] _processQueue called, queue length:', this.audioQueue.length);

        if (this.audioQueue.length === 0) {
            console.log('[VoiceOfGod] Queue empty, stopping');
            this.isProcessingQueue = false;
            this.speaking = false;
            return;
        }

        this.isProcessingQueue = true;
        this.speaking = true;

        const text = this.audioQueue.shift();
        console.log('[VoiceOfGod] Processing text:', text.substring(0, 50) + '...');

        try {
            // Generate raw TTS audio
            console.log('[VoiceOfGod] Step 1: Generating TTS...');
            const rawAudioPath = await this._generateTTS(text);
            console.log('[VoiceOfGod] Step 1 complete:', rawAudioPath);

            // Apply divine effects if available
            let finalAudioPath = rawAudioPath;
            if (this.pedalboardAvailable) {
                console.log('[VoiceOfGod] Step 2: Applying divine effects...');
                finalAudioPath = await this._applyDivineEffects(rawAudioPath);
                console.log('[VoiceOfGod] Step 2 complete:', finalAudioPath);
            } else {
                console.log('[VoiceOfGod] Step 2: Skipping effects (not available)');
            }

            // Play the audio
            console.log('[VoiceOfGod] Step 3: Playing audio...');
            await this._playAudio(finalAudioPath);
            console.log('[VoiceOfGod] Step 3 complete');

            // Cleanup temp files
            this._cleanupTempFile(rawAudioPath);
            if (finalAudioPath !== rawAudioPath) {
                this._cleanupTempFile(finalAudioPath);
            }
            console.log('[VoiceOfGod] Cleanup complete');
        } catch (error) {
            console.error('[VoiceOfGod] Queue processing error:', error.message);
            console.error('[VoiceOfGod] Error stack:', error.stack);
        }

        // Process next item in queue
        console.log('[VoiceOfGod] Scheduling next queue item...');
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

            // Timeout: kill process if it takes more than 60 seconds
            const timeout = setTimeout(() => {
                console.warn('[VoiceOfGod] Piper TTS timed out after 60s');
                try { piper.kill('SIGTERM'); } catch { }
                reject(new Error('Piper TTS generation timed out'));
            }, 60000);

            let stderr = '';
            piper.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            piper.on('close', (code) => {
                clearTimeout(timeout);
                this.currentProcess = null;
                if (code === 0 && fs.existsSync(outputPath)) {
                    console.log('[VoiceOfGod] TTS generated successfully');
                    resolve(outputPath);
                } else {
                    reject(new Error(`Piper exited with code ${code}: ${stderr}`));
                }
            });

            piper.on('error', (err) => {
                clearTimeout(timeout);
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
        const outputPath = inputPath.replace('.wav', '_divine.wav');
        const python = this.pythonCmd || (process.platform === 'win32' ? 'python' : 'python3');
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
            chorusMix: this.settings.chorusMix,
            volume: this.settings.volume
        });

        console.log('[VoiceOfGod] Applying divine effects...');
        console.log('[VoiceOfGod] Python:', python);
        console.log('[VoiceOfGod] Script:', effectsScript);
        console.log('[VoiceOfGod] Input:', inputPath, 'exists:', fs.existsSync(inputPath));

        try {
            // Use execSync with shell: true (same as pedalboard check - proven to work)
            // Escape the JSON settings for shell
            const escapedSettings = settings.replace(/'/g, "'\\''");
            const cmd = `${python} "${effectsScript}" "${inputPath}" "${outputPath}" '${escapedSettings}'`;
            console.log('[VoiceOfGod] Running effects command...');

            execSync(cmd, {
                stdio: 'pipe',
                timeout: 30000,
                shell: true,
                env: process.env
            });

            if (fs.existsSync(outputPath)) {
                const size = fs.statSync(outputPath).size;
                console.log('[VoiceOfGod] Divine effects applied, output size:', size);
                return outputPath;
            } else {
                console.warn('[VoiceOfGod] Output file not created, using raw audio');
                return inputPath;
            }
        } catch (err) {
            console.error('[VoiceOfGod] Effects failed:', err.message);
            if (err.stderr) {
                console.error('[VoiceOfGod] stderr:', err.stderr.toString().substring(0, 500));
            }
            return inputPath; // Fallback to raw audio
        }
    }

    /**
     * Play audio file
     */
    async _playAudio(audioPath) {
        return new Promise((resolve, reject) => {
            // Check if audio file exists
            if (!fs.existsSync(audioPath)) {
                console.error('[VoiceOfGod] Audio file not found:', audioPath);
                reject(new Error('Audio file not found'));
                return;
            }

            const fileSize = fs.statSync(audioPath).size;
            console.log('[VoiceOfGod] Playing audio file:', audioPath, 'size:', fileSize, 'bytes');

            if (fileSize < 100) {
                console.error('[VoiceOfGod] Audio file too small, likely empty');
                reject(new Error('Audio file too small'));
                return;
            }

            let player;
            let args;

            if (process.platform === 'win32') {
                // Windows: Use PowerShell to play audio with proper escaping
                player = 'powershell';
                // Escape single quotes in path
                const escapedPath = audioPath.replace(/'/g, "''");
                args = [
                    '-NoProfile',
                    '-Command',
                    `try { (New-Object Media.SoundPlayer '${escapedPath}').PlaySync(); Write-Host 'OK' } catch { Write-Error $_.Exception.Message; exit 1 }`
                ];
            } else if (process.platform === 'darwin') {
                // macOS: Use afplay
                player = 'afplay';
                args = [audioPath];
            } else {
                // Linux: Try aplay first (works on servers), then paplay (PulseAudio)
                player = 'aplay';
                args = ['-q', audioPath]; // -q for quiet (no stats output)
            }

            console.log('[VoiceOfGod] Running:', player, args.join(' ').substring(0, 100) + '...');

            const proc = spawn(player, args);
            this.currentProcess = proc;

            let stdout = '';
            let stderr = '';

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                this.currentProcess = null;
                if (code === 0) {
                    console.log('[VoiceOfGod] Audio playback complete');
                } else {
                    console.error('[VoiceOfGod] Audio playback failed, code:', code, 'stderr:', stderr);
                }
                resolve(); // Resolve anyway to continue queue
            });

            proc.on('error', (err) => {
                this.currentProcess = null;
                console.error('[VoiceOfGod] Audio player error:', err.message);
                // Try alternative players on Linux
                if (process.platform === 'linux') {
                    console.log('[VoiceOfGod] Trying alternative audio players...');
                    this._playWithAlternative(audioPath).then(resolve).catch(() => resolve());
                } else {
                    resolve(); // Resolve anyway to continue queue
                }
            });
        });
    }

    /**
     * Try alternative audio players on Linux
     */
    async _playWithAlternative(audioPath) {
        const alternatives = [
            { cmd: 'paplay', args: [audioPath] },
            { cmd: 'aplay', args: ['-q', audioPath] },
            { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', audioPath] },
            { cmd: 'mpv', args: ['--no-video', '--really-quiet', audioPath] }
        ];

        for (const { cmd, args } of alternatives) {
            try {
                console.log('[VoiceOfGod] Trying:', cmd);
                await new Promise((resolve, reject) => {
                    const proc = spawn(cmd, args);
                    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Exit code ${code}`)));
                    proc.on('error', reject);
                });
                console.log('[VoiceOfGod] Success with:', cmd);
                return;
            } catch (err) {
                console.log('[VoiceOfGod]', cmd, 'failed:', err.message);
                continue;
            }
        }

        console.error('[VoiceOfGod] All audio players failed');
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
