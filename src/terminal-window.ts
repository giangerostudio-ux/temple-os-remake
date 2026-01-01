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
    fontFamily: 'Fira Code, Consolas, "Courier New", monospace',
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
    console.log('[Terminal] Starting PTY init...');

    try {
        // Check PTY availability
        if (!window.electronAPI?.isPtyAvailable || !window.electronAPI?.createPty) {
            xterm.writeln('\\x1b[31mPTY API not available.\\x1b[0m');
            console.error('[Terminal] PTY APIs missing');
            return;
        }

        const ptyCheck = await window.electronAPI.isPtyAvailable();
        const isPtyAvailable = typeof ptyCheck === 'boolean' ? ptyCheck : ptyCheck?.success;

        if (!isPtyAvailable) {
            xterm.writeln('\\x1b[31mPTY not available.\\x1b[0m');
            console.warn('[Terminal] PTY not available');
            return;
        }

        // Create PTY
        const result = await window.electronAPI.createPty({
            cols: xterm.cols,
            rows: xterm.rows,
            cwd: undefined
        });

        if (!result.success || !result.id) {
            xterm.writeln('\\x1b[31mFailed to create PTY.\\x1b[0m');
            console.error('[Terminal] PTY creation failed');
            return;
        }

        ptyId = result.id;
        console.log('[Terminal] ✅ PTY created:', ptyId);

        // Connect xterm input to PTY
        xterm.onData((data) => {
            console.log('[Terminal] 📤 onData -', data.length, 'chars, ptyId:', ptyId);
            if (ptyId && window.electronAPI?.writePty) {
                void window.electronAPI.writePty(ptyId, data);
                console.log('[Terminal] ✏️  Sent to PTY:', ptyId);
            }
        });

        // Handle terminal resize
        xterm.onResize(({ cols, rows }) => {
            if (ptyId && window.electronAPI?.resizePty) {
                void window.electronAPI.resizePty(ptyId, cols, rows);
            }
        });

        // Listen for data FROM the PTY - CRITICAL
        console.log('[Terminal] 🎧 Registering onTerminalData for ptyId:', ptyId);
        if (window.electronAPI?.onTerminalData) {
            window.electronAPI.onTerminalData((data) => {
                console.log('[Terminal] 📥 onTerminalData - id:', data.id, 'ptyId:', ptyId, 'match:', data.id === ptyId, 'len:', data.data?.length);
                if (data.id === ptyId) {
                    console.log('[Terminal] ✅ MATCH - Writing:', data.data?.substring(0, 30));
                    xterm.write(data.data);
                } else {
                    console.warn('[Terminal] ❌ MISMATCH - got:', data.id, 'want:', ptyId);
                }
            });
            console.log('[Terminal] ✅ onTerminalData listener registered');
        } else {
            console.error('[Terminal] ❌ onTerminalData API missing!');
        }

        // Listen for PTY exit
        if (window.electronAPI?.onTerminalExit) {
            window.electronAPI.onTerminalExit((data) => {
                if (data.id === ptyId) {
                    xterm.writeln(`\\r\\n\\x1b[33m[Process exited with code ${data.exitCode}]\\x1b[0m`);
                    ptyId = null;
                }
            });
        }

        console.log('[Terminal] ✅ PTY fully initialized!');
    } catch (e) {
        xterm.writeln('\\x1b[31mError initializing PTY.\\x1b[0m');
        console.error('[Terminal] Error:', e);
    }
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (ptyId && window.electronAPI?.destroyPty) {
        void window.electronAPI.destroyPty(ptyId);
    }
    resizeObserver.disconnect();
    xterm.dispose();
});

// Initialize after delay
setTimeout(() => {
    void initializePty();
}, 100);

console.log('[Terminal] Window initialized');
