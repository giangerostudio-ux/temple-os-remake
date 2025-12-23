/**
 * Ollama Manager - Manages Ollama service and model downloads
 * For the Word of God AI Assistant
 */

const { exec, spawn } = require('child_process');
const http = require('http');
const https = require('https');

const OLLAMA_HOST = 'http://localhost:11434';
// Use llama3.2:3b for testing - smaller and definitely available
// Production should use: 'dolphin-qwen2.5:7b' (abliterated/uncensored)
const DEFAULT_MODEL = 'llama3.2:3b';

class OllamaManager {
  constructor() {
    this.model = DEFAULT_MODEL;
    this.isDownloading = false;
    this.downloadProgress = 0;
  }

  /**
   * Check if Ollama is installed and running
   * @returns {Promise<{installed: boolean, running: boolean, error?: string}>}
   */
  async checkStatus() {
    try {
      // First check if ollama command exists
      const installed = await this._checkInstalled();
      if (!installed) {
        return { installed: false, running: false, error: 'Ollama is not installed' };
      }

      // Check if ollama server is running
      const running = await this._checkRunning();
      return { installed: true, running };
    } catch (error) {
      return { installed: false, running: false, error: error.message };
    }
  }

  /**
   * Check if Ollama is installed
   */
  async _checkInstalled() {
    return new Promise((resolve) => {
      const command = process.platform === 'win32' ? 'where ollama' : 'which ollama';
      exec(command, (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Check if Ollama server is running
   */
  async _checkRunning() {
    return new Promise((resolve) => {
      const req = http.get(`${OLLAMA_HOST}/api/tags`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Start Ollama server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      const ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      });
      ollamaProcess.unref();

      // Wait a bit for server to start
      setTimeout(async () => {
        const running = await this._checkRunning();
        if (running) {
          resolve(true);
        } else {
          reject(new Error('Failed to start Ollama server'));
        }
      }, 3000);
    });
  }

  /**
   * Check if the model is downloaded
   * @returns {Promise<{downloaded: boolean, size?: string}>}
   */
  async checkModel() {
    try {
      const models = await this._listModels();
      const model = models.find(m => m.name === this.model || m.name.startsWith(this.model.split(':')[0]));
      if (model) {
        return { downloaded: true, size: this._formatBytes(model.size) };
      }
      return { downloaded: false };
    } catch (error) {
      return { downloaded: false, error: error.message };
    }
  }

  /**
   * List available models
   */
  async _listModels() {
    return new Promise((resolve, reject) => {
      http.get(`${OLLAMA_HOST}/api/tags`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.models || []);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Download/pull the model with progress callback
   * @param {Function} onProgress - Callback with progress info {status, completed, total, percent}
   * @returns {Promise<boolean>}
   */
  async downloadModel(onProgress) {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    this.isDownloading = true;
    this.downloadProgress = 0;

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ name: this.model, stream: true });

      const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/pull',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      console.log('[OllamaManager] Starting model download:', this.model);

      const req = http.request(options, (res) => {
        let buffer = '';
        let lastStatus = '';
        let downloadStarted = false;

        console.log('[OllamaManager] Response status:', res.statusCode);

        if (res.statusCode !== 200) {
          this.isDownloading = false;
          reject(new Error(`HTTP ${res.statusCode}: Failed to start download`));
          return;
        }

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // Process complete JSON lines
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const progress = JSON.parse(line);
              
              console.log('[OllamaManager] Progress:', progress.status, progress.completed, '/', progress.total);

              if (progress.error) {
                this.isDownloading = false;
                console.error('[OllamaManager] Download error:', progress.error);
                reject(new Error(progress.error));
                return;
              }

              lastStatus = progress.status || '';
              
              // Track if actual download has started
              if (progress.total && progress.total > 0) {
                downloadStarted = true;
              }

              const progressInfo = {
                status: progress.status || 'downloading',
                completed: progress.completed || 0,
                total: progress.total || 0,
                percent: progress.total ? Math.round((progress.completed / progress.total) * 100) : 0
              };

              this.downloadProgress = progressInfo.percent;
              
              if (onProgress) {
                onProgress(progressInfo);
              }

              // Check if download is complete
              if (progress.status === 'success') {
                console.log('[OllamaManager] Download complete!');
                this.isDownloading = false;
                resolve(true);
                return;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete data
              console.log('[OllamaManager] Parse error (partial data):', e.message);
            }
          }
        });

        res.on('end', () => {
          console.log('[OllamaManager] Stream ended, lastStatus:', lastStatus);
          this.isDownloading = false;
          
          // If we got a success status or the model is being verified, consider it done
          if (lastStatus === 'success' || lastStatus.includes('verifying') || lastStatus.includes('writing')) {
            resolve(true);
          } else if (!downloadStarted && lastStatus === '') {
            // No data received - something went wrong
            reject(new Error('No response from Ollama. Is the service running?'));
          } else {
            // Assume success if stream ended without error
            resolve(true);
          }
        });

        res.on('error', (error) => {
          console.error('[OllamaManager] Response error:', error);
          this.isDownloading = false;
          reject(error);
        });
      });

      req.on('error', (error) => {
        console.error('[OllamaManager] Request error:', error);
        this.isDownloading = false;
        reject(error);
      });

      req.setTimeout(300000, () => { // 5 minute timeout
        console.error('[OllamaManager] Request timeout');
        req.destroy();
        this.isDownloading = false;
        reject(new Error('Download request timed out'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Get installation instructions based on platform
   */
  getInstallInstructions() {
    const platform = process.platform;
    
    if (platform === 'linux') {
      return {
        command: 'curl -fsSL https://ollama.com/install.sh | sh',
        manual: 'Visit https://ollama.com/download for manual installation',
        platform: 'linux'
      };
    } else if (platform === 'darwin') {
      return {
        command: 'brew install ollama',
        manual: 'Visit https://ollama.com/download for manual installation',
        platform: 'macos'
      };
    } else if (platform === 'win32') {
      return {
        command: null,
        manual: 'Download from https://ollama.com/download/windows',
        platform: 'windows'
      };
    }

    return {
      command: null,
      manual: 'Visit https://ollama.com for installation instructions',
      platform: 'unknown'
    };
  }

  /**
   * Format bytes to human readable
   */
  _formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get the full status of Ollama and model
   */
  async getFullStatus() {
    const ollamaStatus = await this.checkStatus();
    
    if (!ollamaStatus.installed) {
      return {
        ready: false,
        ollamaInstalled: false,
        ollamaRunning: false,
        modelDownloaded: false,
        installInstructions: this.getInstallInstructions(),
        error: 'Ollama is not installed'
      };
    }

    if (!ollamaStatus.running) {
      // Try to start it
      try {
        await this.startServer();
      } catch (e) {
        return {
          ready: false,
          ollamaInstalled: true,
          ollamaRunning: false,
          modelDownloaded: false,
          error: 'Ollama is installed but not running. Please start it manually.'
        };
      }
    }

    const modelStatus = await this.checkModel();

    return {
      ready: modelStatus.downloaded,
      ollamaInstalled: true,
      ollamaRunning: true,
      modelDownloaded: modelStatus.downloaded,
      modelSize: modelStatus.size,
      modelName: this.model,
      error: modelStatus.downloaded ? null : 'Model not downloaded'
    };
  }
}

module.exports = { OllamaManager, DEFAULT_MODEL, OLLAMA_HOST };
