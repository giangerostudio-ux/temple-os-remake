/**
 * Standalone Terminal Window for Popout
 * Multi-tab support with independent PTY sessions
 */

import { PopoutTerminalManager } from './popout-terminal-manager';
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
const tabsContainer = document.querySelector('.terminal-tabs') as HTMLElement;
const terminalLayout = document.querySelector('.xterm-layout') as HTMLElement;

if (!tabsContainer || !terminalLayout) {
    throw new Error('Terminal containers not found');
}

// Check if we have API access
if (!window.electronAPI) {
    terminalLayout.innerHTML = '<div style="color: #ff4444; padding: 20px;">Error: electronAPI not available</div>';
    throw new Error('electronAPI not available in popout window');
}

// Initialize terminal manager
const terminalManager = new PopoutTerminalManager(tabsContainer, terminalLayout);

console.log('[Terminal Window] Initialized with tab support');

// Toolbar button handlers
const findBtn = document.querySelector('.toolbar-btn[title="Find"]');
const splitVBtn = document.querySelector('.toolbar-btn[title="Split Vertical"]');
const splitHBtn = document.querySelector('.toolbar-btn[title="Split Horizontal"]');
const settingsBtn = document.querySelector('.toolbar-btn[title="Settings"]');

findBtn?.addEventListener('click', () => {
    console.log('[Terminal] Find clicked - Phase 6.2 feature');
});

splitVBtn?.addEventListener('click', () => {
    console.log('[Terminal] Split V clicked - Phase 6.3 feature');
});

splitHBtn?.addEventListener('click', () => {
    console.log('[Terminal] Split H clicked - Phase 6.3 feature');
});

settingsBtn?.addEventListener('click', () => {
    console.log('[Terminal] Settings clicked - Phase 6.4 feature');
});

// Cleanup on window close
window.addEventListener('beforeunload', async () => {
    await terminalManager.cleanup();
});

console.log('[Terminal Window] Multi-tab terminal ready');
