/**
 * Standalone Terminal Window for Popout
 * This runs in a separate BrowserWindow with full electronAPI access
 */

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

// Window controls (use polling pattern for floating windows)
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');

// Declare global action variable for polling
declare global {
    interface Window {
        __floatingAction?: string | null;
    }
}

minimizeBtn?.addEventListener('click', () => {
    window.__floatingAction = 'minimize';
});

maximizeBtn?.addEventListener('click', () => {
    window.__floatingAction = 'maximize';
});

closeBtn?.addEventListener('click', () => {
    window.__floatingAction = 'close';
});

// Terminal setup
const container = document.getElementById('terminal-container');
if (!container) {
    throw new Error('Terminal container not found');
}

// Check if we have API access
if (!window.electronAPI) {
    container.innerHTML = '<div style="color: #ff4444; padding: 20px;">Error: electronAPI not available</div>';
    throw new Error('electronAPI not available in popout window');
}

// Theme colors (matching TempleOS green theme)
const terminalTheme = {
    background: '#0d1117',
    foreground: '#00ff41',
    cursor: '#00ff41',
    cursorAccent: '#0d1117',
    selectionBackground: 'rgba(0, 255, 65, 0.3)',
    black: '#0a0a0f',
    red: '#ff3366',
    green: '#00ff41',
    yellow: '#ffff00',
    blue: '#4a9eff',
    magenta: '#ff00ff',
    cyan: '#00d4ff',
    white: '#c9d1d9',
    brightBlack: '#2a2a3a',
    brightRed: '#ff6b6b',
    brightGreen: '#55ff55',
    brightYellow: '#ffff00',
    brightBlue: '#4a9eff',
    brightMagenta: '#ff88ff',
    brightCyan: '#7fffff',
    brightWhite: '#ffffff'
};

// Create xterm instance
const xterm = new Terminal({
    theme: terminalTheme,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
    lineHeight: 1.4,
    cursorBlink: true,
    scrollback: 10000,
    allowProposedApi: true
});

const fitAddon = new FitAddon();
xterm.loadAddon(fitAddon);

// Open terminal in container
xterm.open(container);

// Initial fit
const performFit = () => {
    try {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            fitAddon.fit();
            xterm.refresh(0, xterm.rows - 1);
        }
    } catch (e) {
        console.warn('Xterm fit failed:', e);
    }
};

// Multiple fit attempts for proper initialization
requestAnimationFrame(() => {
    performFit();

    setTimeout(() => {
        const originalSize = xterm.options.fontSize ?? 14;
        xterm.options.fontSize = originalSize + 1;
        requestAnimationFrame(() => {
            xterm.options.fontSize = originalSize;
            performFit();
        });
    }, 50);

    setTimeout(performFit, 200);
    setTimeout(performFit, 500);
});

// Resize handling
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const safeResize = () => {
    if (container.offsetParent === null) return;
    if (container.clientWidth <= 0 || container.clientHeight <= 0) return;

    try {
        fitAddon.fit();

        // Force font cache invalidation
        const originalSize = xterm.options.fontSize ?? 14;
        xterm.options.fontSize = originalSize + 1;
        requestAnimationFrame(() => {
            xterm.options.fontSize = originalSize;
            xterm.refresh(0, xterm.rows - 1);
        });
    } catch (e) {
        console.warn('Safe resize failed:', e);
    }
};

const debouncedResize = () => {
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(safeResize, 100);
};

const resizeObserver = new ResizeObserver(() => {
    debouncedResize();
});
resizeObserver.observe(container);

window.addEventListener('resize', debouncedResize);

// PTY integration
let ptyId: string | null = null;

async function initializePty() {
    console.log('[Terminal Window] initializePty called');
    console.log('[Terminal Window] window.electronAPI exists?', !!window.electronAPI);
    console.log('[Terminal Window] isPtyAvailable exists?', !!window.electronAPI?.isPtyAvailable);

    try {
        // Check if PTY is available
        const isPtyAvailable = window.electronAPI?.isPtyAvailable && await window.electronAPI.isPtyAvailable();
        console.log('[Terminal Window] isPtyAvailable result:', isPtyAvailable);

        if (!isPtyAvailable) {
            xterm.writeln('\x1b[31mPTY not available. Terminal functionality limited.\x1b[0m');
            xterm.writeln('Install node-pty and restart the application.');
            console.warn('[Terminal Window] PTY not available');
            return;
        }


        // Create PTY
        if (!window.electronAPI?.createPty) {
            xterm.writeln('\x1b[31mPTY API not available.\x1b[0m');
            console.error('[Terminal Window] createPty API not found');
            return;
        }
        console.log('[Terminal Window] Creating PTY with cols:', xterm.cols, 'rows:', xterm.rows);

        const result = await window.electronAPI.createPty({
            cols: xterm.cols,
            rows: xterm.rows,
            cwd: undefined // Use default cwd
        });

        if (result.success && result.id) {
            ptyId = result.id;

            // Connect terminal input to PTY
            xterm.onData((data) => {
                if (ptyId && window.electronAPI?.writePty) {
                    void window.electronAPI.writePty(ptyId, data);
                }
            });

            // Handle resize events
            xterm.onResize(({ cols, rows }) => {
                if (ptyId && window.electronAPI?.resizePty) {
                    void window.electronAPI.resizePty(ptyId, cols, rows);
                }
            });

            console.log('[Terminal Window] PTY created:', ptyId);
        } else {
            xterm.writeln('\x1b[31mFailed to create PTY.\x1b[0m');
            console.error('[Terminal Window] PTY creation failed:', result.error);
        }
    } catch (e) {
        xterm.writeln('\x1b[31mError initializing terminal.\x1b[0m');
        console.error('[Terminal Window] PTY init error:', e);
    }
}

// Listen for PTY data
if (window.electronAPI?.onTerminalData) {
    window.electronAPI.onTerminalData((data) => {
        if (data.id === ptyId && xterm) {
            xterm.write(data.data);
        }
    });
}

// Listen for PTY exit
if (window.electronAPI?.onTerminalExit) {
    window.electronAPI.onTerminalExit((data) => {
        if (data.id === ptyId && xterm) {
            xterm.writeln(`\r\n\x1b[33m[Process exited with code ${data.exitCode}]\x1b[0m`);
            ptyId = null;
        }
    });
}

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    if (ptyId && window.electronAPI?.destroyPty) {
        void window.electronAPI.destroyPty(ptyId);
    }
    resizeObserver.disconnect();
    xterm.dispose();
});

// Initialize PTY after xterm is ready
setTimeout(async () => {
    console.log('[Terminal Window] Starting PTY initialization...');
    try {
        await initializePty();
        console.log('[Terminal Window] PTY initialization complete');
    } catch (error) {
        console.error('[Terminal Window] PTY initialization error:', error);
        xterm.writeln('\x1b[31mFailed to initialize PTY: ' + String(error) + '\x1b[0m');
    }
}, 100);

console.log('[Terminal Window] Initialized successfully');
