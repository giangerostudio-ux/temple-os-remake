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

// Search bar elements
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchPrevBtn = document.getElementById('search-prev');
const searchNextBtn = document.getElementById('search-next');
const searchCloseBtn = document.getElementById('search-close');
const searchCount = document.getElementById('search-count');

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
        activeTab.searchAddon.findNext(searchInput.value);
    }
});

// Search previous
searchPrevBtn?.addEventListener('click', () => {
    const activeTab = terminalManager.getActiveTab();
    console.log('[Search] Prev clicked, value:', searchInput?.value);
    if (activeTab?.searchAddon && searchInput?.value) {
        activeTab.searchAddon.findPrevious(searchInput.value);
    }
});

// Search next
searchNextBtn?.addEventListener('click', () => {
    const activeTab = terminalManager.getActiveTab();
    console.log('[Search] Next clicked, value:', searchInput?.value);
    if (activeTab?.searchAddon && searchInput?.value) {
        activeTab.searchAddon.findNext(searchInput.value);
    }
});

// Close search bar
searchCloseBtn?.addEventListener('click', () => {
    console.log('[Search] Close clicked');
    searchBar?.classList.remove('visible');
    if (searchInput) searchInput.value = '';
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
                } else {
                    activeTab.searchAddon.findNext(searchInput.value);
                }
            }
        }
    }
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
