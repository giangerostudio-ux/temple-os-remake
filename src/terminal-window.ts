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

// Load settings BEFORE creating terminal manager
interface TerminalSettings {
    fontSize: number;
    theme: string;
    scrollback: number;
}

function loadSettings(): TerminalSettings {
    const defaults: TerminalSettings = {
        fontSize: 14,
        theme: 'templeOS',  // TempleOS green by default!
        scrollback: 10000
    };

    try {
        const saved = localStorage.getItem('terminalSettings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
        return defaults;
    }
}

// Initialize terminal manager
const terminalManager = new PopoutTerminalManager(tabsContainer, terminalLayout);

console.log('[Terminal Window] Initialized with tab support');

// Apply settings to initial tab
const currentSettings = loadSettings();
applySettings(currentSettings);

// Toolbar button handlers
const findBtn = document.querySelector('.toolbar-btn[title="Find"]');
const splitVBtn = document.querySelector('.toolbar-btn[title="Split Vertical"]');
const splitHBtn = document.querySelector('.toolbar-btn[title="Split Horizontal"]');
const settingsBtn = document.querySelector('.toolbar-btn[title="Settings"]');

// Search bar elements
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchPrevBtn = document.getElementById('search-prev');
const searchNextBtn = document.getElementById('search-next');
const searchCloseBtn = document.getElementById('search-close');
const searchCount = document.getElementById('search-count');

// Track search state
let currentMatchIndex = 0;
let totalMatches = 0;

// Helper to count matches in terminal buffer
function updateSearchCount(query: string) {
    const activeTab = terminalManager.getActiveTab();
    if (!activeTab?.xterm || !query) {
        if (searchCount) searchCount.textContent = '';
        return;
    }

    // Get all terminal buffer content
    const buffer = activeTab.xterm.buffer.active;
    let content = '';
    for (let i = 0; i < buffer.length; i++) {
        content += buffer.getLine(i)?.translateToString() || '';
    }

    // Count matches (case-insensitive)
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    totalMatches = matches ? matches.length : 0;

    // Update display
    if (searchCount) {
        if (totalMatches > 0) {
            searchCount.textContent = `${currentMatchIndex + 1}/${totalMatches}`;
        } else {
            searchCount.textContent = '0/0';
        }
    }
}

console.log('[Search] Elements found:', {
    searchBar: !!searchBar,
    searchInput: !!searchInput,
    findBtn: !!findBtn,
    searchPrevBtn: !!searchPrevBtn,
    searchNextBtn: !!searchNextBtn
});

// Find button - toggle search bar
findBtn?.addEventListener('click', () => {
    console.log('[Search] Find button clicked');
    if (searchBar) {
        searchBar.classList.toggle('visible');
        console.log('[Search] Search bar visible:', searchBar.classList.contains('visible'));
        if (searchBar.classList.contains('visible')) {
            searchInput?.focus();
        }
    }
});

// Search input - search as you type
searchInput?.addEventListener('input', () => {
    const activeTab = terminalManager.getActiveTab();
    console.log('[Search] Input changed:', searchInput.value, 'activeTab:', !!activeTab, 'searchAddon:', !!activeTab?.searchAddon);
    if (activeTab?.searchAddon && searchInput.value) {
        currentMatchIndex = 0; // Reset to first match
        activeTab.searchAddon.findNext(searchInput.value);
        updateSearchCount(searchInput.value);
    } else {
        updateSearchCount('');
    }
});

// Search previous
searchPrevBtn?.addEventListener('click', () => {
    const activeTab = terminalManager.getActiveTab();
    console.log('[Search] Prev clicked, value:', searchInput?.value);
    if (activeTab?.searchAddon && searchInput?.value) {
        activeTab.searchAddon.findPrevious(searchInput.value);
        currentMatchIndex = Math.max(0, currentMatchIndex - 1);
        updateSearchCount(searchInput.value);
    }
});

// Search next
searchNextBtn?.addEventListener('click', () => {
    const activeTab = terminalManager.getActiveTab();
    console.log('[Search] Next clicked, value:', searchInput?.value);
    if (activeTab?.searchAddon && searchInput?.value) {
        activeTab.searchAddon.findNext(searchInput.value);
        currentMatchIndex = Math.min(totalMatches - 1, currentMatchIndex + 1);
        updateSearchCount(searchInput.value);
    }
});

// Close search bar
searchCloseBtn?.addEventListener('click', () => {
    console.log('[Search] Close clicked');
    searchBar?.classList.remove('visible');
    if (searchInput) searchInput.value = '';
    updateSearchCount('');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+F to open search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        console.log('[Search] Ctrl+F pressed');
        searchBar?.classList.add('visible');
        searchInput?.focus();
    }

    // Escape to close search
    if (e.key === 'Escape' && searchBar?.classList.contains('visible')) {
        console.log('[Search] Escape pressed');
        searchBar.classList.remove('visible');
        if (searchInput) searchInput.value = '';
        updateSearchCount('');
    }

    // Enter for next, Shift+Enter for previous (when search is focused)
    if (searchInput === document.activeElement) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const activeTab = terminalManager.getActiveTab();
            console.log('[Search] Enter pressed, shift:', e.shiftKey);
            if (activeTab?.searchAddon && searchInput.value) {
                if (e.shiftKey) {
                    activeTab.searchAddon.findPrevious(searchInput.value);
                    currentMatchIndex = Math.max(0, currentMatchIndex - 1);
                } else {
                    activeTab.searchAddon.findNext(searchInput.value);
                    currentMatchIndex = Math.min(totalMatches - 1, currentMatchIndex + 1);
                }
                updateSearchCount(searchInput.value);
            }
        }
    }
});

splitVBtn?.addEventListener('click', () => {
    console.log('[Terminal] Split V clicked');
    if (terminalManager.getSplitMode() === 'vertical') {
        // Already vertical, unsplit
        terminalManager.setSplitMode('single');
    } else {
        // Enable vertical split
        terminalManager.setSplitMode('vertical');
    }
});

splitHBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[Terminal] Split H clicked');
    if (terminalManager.getSplitMode() === 'horizontal') {
        // Already horizontal, unsplit
        terminalManager.setSplitMode('single');
    } else {
        // Enable horizontal split
        terminalManager.setSplitMode('horizontal');
    }
});

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close');
const settingsSaveBtn = document.getElementById('settings-save');
const settingsCancelBtn = document.getElementById('settings-cancel');

const fontSizeInput = document.getElementById('font-size') as HTMLInputElement;
const fontSizeValue = document.getElementById('font-size-value');
const themeSelect = document.getElementById('theme') as HTMLSelectElement;
const scrollbackInput = document.getElementById('scrollback') as HTMLInputElement;

// Load settings from localStorage
interface TerminalSettings {
    fontSize: number;
    theme: string;
    scrollback: number;
}

function saveSettings(settings: TerminalSettings): void {
    localStorage.setItem('terminalSettings', JSON.stringify(settings));
}

// Apply settings to all terminals
function applySettings(settings: TerminalSettings): void {
    const tabs = terminalManager.getTabs();
    tabs.forEach(tab => {
        if (tab.xterm) {
            // Apply font size
            tab.xterm.options.fontSize = settings.fontSize;

            // Apply theme
            const themes = {
                dark: {
                    background: '#000000',
                    foreground: '#ffffff',
                    cursor: '#ffffff'
                },
                light: {
                    background: '#ffffff',
                    foreground: '#000000',
                    cursor: '#000000'
                },
                templeOS: {
                    background: '#0d1117',  // Original dark blue-grey
                    foreground: '#00ff00',  // Pure bright green
                    cursor: '#00ff00'
                }
            };

            const theme = themes[settings.theme as keyof typeof themes] || themes.dark;
            tab.xterm.options.theme = theme;

            // Apply scrollback
            tab.xterm.options.scrollback = settings.scrollback;

            // Fit terminal after settings change
            if (tab.fitAddon) {
                setTimeout(() => tab.fitAddon?.fit(), 50);
            }
        }
    });
}

// Initialize UI with current settings
const uiSettings = loadSettings();
fontSizeInput.value = uiSettings.fontSize.toString();
if (fontSizeValue) fontSizeValue.textContent = `${uiSettings.fontSize}px`;
themeSelect.value = uiSettings.theme;
scrollbackInput.value = uiSettings.scrollback.toString();

// Font size slider
fontSizeInput?.addEventListener('input', () => {
    if (fontSizeValue) fontSizeValue.textContent = `${fontSizeInput.value}px`;
});

// Open settings modal
settingsBtn?.addEventListener('click', () => {
    console.log('[Terminal] Settings clicked');
    settingsModal?.classList.add('visible');
});

// Close settings modal
settingsCloseBtn?.addEventListener('click', () => {
    settingsModal?.classList.remove('visible');
});

settingsCancelBtn?.addEventListener('click', () => {
    settingsModal?.classList.remove('visible');
});

// Save settings
settingsSaveBtn?.addEventListener('click', () => {
    const newSettings: TerminalSettings = {
        fontSize: parseInt(fontSizeInput.value),
        theme: themeSelect.value,
        scrollback: parseInt(scrollbackInput.value)
    };

    saveSettings(newSettings);
    applySettings(newSettings);
    settingsModal?.classList.remove('visible');

    console.log('[Settings] Saved:', newSettings);
});

// Cleanup on window close
window.addEventListener('beforeunload', async () => {
    await terminalManager.cleanup();
});

console.log('[Terminal Window] Multi-tab terminal ready');
