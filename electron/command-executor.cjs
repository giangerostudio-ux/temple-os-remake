/**
 * Command Executor - Safe command execution for the Word of God
 * Handles regular commands, dangerous commands, and URL opening
 */

const { exec, spawn } = require('child_process');
const { shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Commands that require extra confirmation (dangerous)
const DANGEROUS_PATTERNS = [
  // Destructive file operations
  /^sudo\s+rm\s+-rf?\s/i,
  /^rm\s+-rf?\s+\//i,
  /\brm\s+-rf?\s+~/i,
  // Disk/partition operations
  /\bdd\s+if=/i,
  /\bmkfs\b/i,
  /\bfdisk\b/i,
  /\bparted\b/i,
  /\bformat\b/i,
  // Device writes
  /\b>>\s*\/dev\//i,
  /\b>\s*\/dev\//i,
  // Dangerous permission changes
  /\bchmod\s+777\s+\//i,
  /\bchown\s+-R\s+.*\s+\//i,
  /\bsudo\s+rm\s+.*\s+\//i,
  // Fork bomb
  /:\s*\(\)\s*\{.*\|.*&.*\}/i,
  // System service attacks
  /\bsystemctl\s+(disable|stop)\s+(NetworkManager|systemd|dbus)/i,
  // Remote code execution via download
  /curl.*\|\s*(ba)?sh/i,
  /wget.*\|\s*(ba)?sh/i,
  /curl.*\|\s*python/i,
  /wget.*\|\s*python/i,
  // Shell escape/execution
  /\beval\s/i,
  /\bexec\s/i,
  // Password/credential manipulation
  /\bpasswd\b/i,
  /\bsudo\s+su\b/i,
  /\bvisudo\b/i,
  // Sensitive file access
  /\/etc\/shadow/i,
  /\/etc\/passwd/i,
  /\/etc\/sudoers/i,
  // Container/namespace escape
  /\bchroot\b/i,
  /\bnsenter\b/i,
  // Root shell access
  /\bsudo\s+-i\b/i,
  /\bsudo\s+-s\b/i,
];

// Allowlist of safe commands for AI-executed operations (read-only, safe)
const ALLOWED_AI_COMMANDS = [
  /^ls(\s|$)/,
  /^cat\s/,
  /^pwd$/,
  /^whoami$/,
  /^date$/,
  /^df(\s|$)/,
  /^free(\s|$)/,
  /^uname(\s|$)/,
  /^echo\s/,
  /^head\s/,
  /^tail\s/,
  /^wc(\s|$)/,
  /^grep\s/,
  /^find\s/,
  /^file\s/,
  /^stat\s/,
  /^which\s/,
  /^type\s/,
  /^hostname$/,
  /^uptime$/,
  /^id$/,
  /^groups$/,
  /^printenv(\s|$)/,
  /^env(\s|$)/,
];

function isCommandAllowedForAI(command) {
  const trimmed = command.trim();
  return ALLOWED_AI_COMMANDS.some(pattern => pattern.test(trimmed));
}

// Log file for executed commands
const LOG_DIR = path.join(os.homedir(), '.templeos-remake');
const LOG_FILE = path.join(LOG_DIR, 'command-history.log');

class CommandExecutor {
  constructor() {
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('Failed to create log directory:', e);
    }
  }

  /**
   * Check if a command is dangerous
   * @param {string} command - The command to check
   * @returns {boolean}
   */
  isDangerous(command) {
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
  }

  /**
   * Log a command execution
   * @param {string} command - The command
   * @param {string} result - The result (success/error)
   * @param {string} output - Command output
   */
  logCommand(command, result, output = '') {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${result}] ${command}\n${output ? `Output: ${output.substring(0, 500)}\n` : ''}\n`;
      fs.appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
      console.error('Failed to log command:', e);
    }
  }

  /**
   * Execute a command
   * @param {string} command - The command to execute
   * @param {Object} options - Execution options
   * @param {string} options.cwd - Working directory
   * @param {number} options.timeout - Timeout in milliseconds
   * @param {Function} options.onOutput - Callback for streaming output
   * @returns {Promise<{success: boolean, stdout: string, stderr: string, code: number}>}
   */
  async execute(command, options = {}) {
    const { cwd = os.homedir(), timeout = 60000, onOutput } = options;

    // Check if dangerous (should have been confirmed already)
    if (this.isDangerous(command)) {
      console.warn('Executing dangerous command:', command);
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const child = spawn('sh', ['-c', command], {
        cwd,
        env: { ...process.env, TERM: 'xterm-256color' },
        shell: true
      });

      // For Windows, use cmd instead
      const isWindows = process.platform === 'win32';
      const proc = isWindows
        ? spawn('cmd', ['/c', command], { cwd, env: process.env })
        : spawn('sh', ['-c', command], { cwd, env: { ...process.env, TERM: 'xterm-256color' } });

      proc.stdout.on('data', (data) => {
        const str = data.toString();
        stdout += str;
        if (onOutput) onOutput({ type: 'stdout', data: str });
      });

      proc.stderr.on('data', (data) => {
        const str = data.toString();
        stderr += str;
        if (onOutput) onOutput({ type: 'stderr', data: str });
      });

      proc.on('close', (code) => {
        if (settled) return;
        settled = true;

        const result = {
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code
        };

        this.logCommand(command, result.success ? 'SUCCESS' : 'ERROR', result.stdout || result.stderr);
        resolve(result);
      });

      proc.on('error', (error) => {
        if (settled) return;
        settled = true;

        const result = {
          success: false,
          stdout: '',
          stderr: error.message,
          code: -1
        };

        this.logCommand(command, 'ERROR', error.message);
        resolve(result);
      });

      // Timeout handling
      if (timeout > 0) {
        setTimeout(() => {
          if (settled) return;
          settled = true;

          try { proc.kill('SIGTERM'); } catch (e) { }

          const result = {
            success: false,
            stdout: stdout.trim(),
            stderr: 'Command timed out',
            code: -1
          };

          this.logCommand(command, 'TIMEOUT', 'Command exceeded timeout');
          resolve(result);
        }, timeout);
      }
    });
  }

  /**
   * Execute a command with streaming output
   * @param {string} command - The command to execute
   * @param {Function} onData - Callback for each chunk of output
   * @returns {Promise<{success: boolean, code: number}>}
   */
  async executeStream(command, onData) {
    return this.execute(command, { onOutput: onData });
  }

  /**
   * Open a URL in the default browser
   * @param {string} url - The URL to open
   * @returns {Promise<boolean>}
   */
  async openUrl(url) {
    try {
      // Validate URL
      const validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol - only http and https are allowed');
      }

      await shell.openExternal(url);
      this.logCommand(`[OPEN_URL] ${url}`, 'SUCCESS');
      return true;
    } catch (error) {
      this.logCommand(`[OPEN_URL] ${url}`, 'ERROR', error.message);
      return false;
    }
  }

  /**
   * Get command history
   * @param {number} limit - Number of entries to return
   * @returns {string[]}
   */
  getHistory(limit = 50) {
    try {
      if (!fs.existsSync(LOG_FILE)) return [];
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      const entries = content.split('\n\n').filter(e => e.trim());
      return entries.slice(-limit);
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear command history
   */
  clearHistory() {
    try {
      fs.writeFileSync(LOG_FILE, '');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get a description of what a command does (for UI preview)
   * @param {string} command - The command to describe
   * @returns {string}
   */
  describeCommand(command) {
    const cmd = command.trim().toLowerCase();

    // Package installation
    if (cmd.includes('apt install') || cmd.includes('apt-get install')) {
      const pkg = cmd.match(/install\s+(-y\s+)?(.+)/)?.[2] || 'package';
      return `Install ${pkg} using APT package manager`;
    }
    if (cmd.includes('flatpak install')) {
      const pkg = cmd.match(/install\s+(-y\s+)?(\S+\s+)?(\S+)/)?.[3] || 'application';
      return `Install ${pkg} using Flatpak`;
    }
    if (cmd.includes('snap install')) {
      const pkg = cmd.match(/install\s+(.+)/)?.[1] || 'package';
      return `Install ${pkg} using Snap`;
    }

    // System updates
    if (cmd.includes('apt update')) return 'Update package lists';
    if (cmd.includes('apt upgrade')) return 'Upgrade installed packages';

    // File operations
    if (cmd.startsWith('rm ')) return 'Delete files or directories';
    if (cmd.startsWith('cp ')) return 'Copy files or directories';
    if (cmd.startsWith('mv ')) return 'Move or rename files';
    if (cmd.startsWith('mkdir ')) return 'Create a directory';
    if (cmd.startsWith('ls ')) return 'List directory contents';
    if (cmd.startsWith('cat ')) return 'Display file contents';

    // Network
    if (cmd.includes('nmcli')) return 'Network configuration command';
    if (cmd.includes('ping ')) return 'Test network connectivity';
    if (cmd.includes('curl ') || cmd.includes('wget ')) return 'Download from URL';

    // System
    if (cmd.includes('systemctl')) return 'Manage system services';
    if (cmd.includes('sudo')) return 'Execute with administrator privileges';

    return 'Execute terminal command';
  }
}

module.exports = { CommandExecutor, DANGEROUS_PATTERNS, ALLOWED_AI_COMMANDS, isCommandAllowedForAI };
