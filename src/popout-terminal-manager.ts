/**
 * PopoutTerminalManager - Manages multiple terminal tabs in the popout window
 * Each tab has its own PTY instance and xterm.js terminal
 */

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';

export interface TerminalTab {
    id: string;
    ptyId: string | null;
    title: string;
    xterm: Terminal | null;
    fitAddon: FitAddon | null;
    searchAddon: SearchAddon | null;
    buffer: string[];
    cwd: string;
    container: HTMLElement | null;
}

export class PopoutTerminalManager {
    private tabs: TerminalTab[] = [];
    private activeTabIndex: number = 0;
    private readonly tabsContainer: HTMLElement;
    private readonly terminalLayout: HTMLElement;
    private splitMode: 'single' | 'vertical' | 'horizontal' = 'single';
    private splitSecondaryTabId: string | null = null;

    constructor(tabsContainer: HTMLElement, terminalLayout: HTMLElement) {
        this.tabsContainer = tabsContainer;
        this.terminalLayout = terminalLayout;

        // Create initial tab
        this.createTab();
    }

    /**
     * Create a new terminal tab
     */
    createTab(title?: string): TerminalTab {
        const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tabNumber = this.tabs.length + 1;

        const tab: TerminalTab = {
            id: tabId,
            ptyId: null,
            title: title || `Terminal ${tabNumber}`,
            xterm: null,
            fitAddon: null,
            searchAddon: null,
            buffer: [],
            cwd: '',
            container: null
        };

        this.tabs.push(tab);
        this.renderTabs();
        this.switchTab(this.tabs.length - 1);

        return tab;
    }

    /**
     * Switch to a specific tab by index
     */
    switchTab(index: number): void {
        if (index < 0 || index >= this.tabs.length) return;

        this.activeTabIndex = index;
        this.renderTabs();
        this.showActiveTerminal();
    }

    /**
     * Close a tab by index
     */
    async closeTab(index: number): Promise<void> {
        if (this.tabs.length === 1) {
            console.log('[TerminalManager] Cannot close last tab');
            return;
        }

        const tab = this.tabs[index];

        // Destroy PTY if exists
        if (tab.ptyId && window.electronAPI?.destroyPty) {
            await window.electronAPI.destroyPty(tab.ptyId);
        }

        // Dispose xterm
        if (tab.xterm) {
            tab.xterm.dispose();
        }

        // Remove container
        if (tab.container) {
            tab.container.remove();
        }

        // Remove from tabs array
        this.tabs.splice(index, 1);

        // Adjust active tab index
        if (this.activeTabIndex >= this.tabs.length) {
            this.activeTabIndex = this.tabs.length - 1;
        }

        this.renderTabs();
        this.showActiveTerminal();
    }

    /**
     * Get the currently active tab
     */
    getActiveTab(): TerminalTab | null {
        return this.tabs[this.activeTabIndex] || null;
    }

    /**
     * Get all tabs
     */
    getTabs(): TerminalTab[] {
        return this.tabs;
    }

    /**
     * Set split mode
     */
    setSplitMode(mode: 'single' | 'vertical' | 'horizontal'): void {
        this.splitMode = mode;

        if (mode === 'single') {
            // Unsplit - show only active tab
            this.splitSecondaryTabId = null;
        } else {
            // Split - find or create secondary tab
            if (this.tabs.length === 1) {
                // Create a second tab for split view
                void this.createTab();
            }
            // Use the tab after active as secondary
            const secondaryIndex = (this.activeTabIndex + 1) % this.tabs.length;
            this.splitSecondaryTabId = this.tabs[secondaryIndex].id;
        }

        this.updateLayout();
    }

    /**
     * Get split mode
     */
    getSplitMode(): 'single' | 'vertical' | 'horizontal' {
        return this.splitMode;
    }

    /**
     * Update layout based on split mode
     */
    private updateLayout(): void {
        // Update layout class
        this.terminalLayout.className = `xterm-layout ${this.splitMode}`;

        // Show/hide containers based on split mode
        const primaryId = this.tabs[this.activeTabIndex]?.id;
        const secondaryId = this.splitSecondaryTabId;

        this.tabs.forEach((tab) => {
            if (!tab.container) return;

            if (this.splitMode === 'single') {
                // Single mode: show only active
                tab.container.style.display = tab.id === primaryId ? 'block' : 'none';
                tab.container.className = 'xterm-container';
            } else {
                // Split mode: show primary and secondary
                if (tab.id === primaryId) {
                    tab.container.style.display = 'block';
                    tab.container.className = 'xterm-container pane-primary';
                } else if (tab.id === secondaryId) {
                    tab.container.style.display = 'block';
                    tab.container.className = 'xterm-container pane-secondary';
                } else {
                    tab.container.style.display = 'none';
                    tab.container.className = 'xterm-container';
                }
            }
        });

        // Fit both visible terminals
        setTimeout(() => {
            this.tabs.forEach((tab) => {
                if (tab.container?.style.display === 'block' && tab.fitAddon) {
                    tab.fitAddon.fit();
                }
            });
        }, 50);
    }

    /**
     * Initialize xterm for a tab  
     */
    async initializeXterm(tab: TerminalTab): Promise<void> {
        // Create container if doesn't exist
        if (!tab.container) {
            tab.container = document.createElement('div');
            tab.container.className = 'xterm-container';
            tab.container.id = `xterm-container-${tab.id}`;
            this.terminalLayout.appendChild(tab.container);
        }

        // Create xterm if doesn't exist
        if (!tab.xterm) {
            const theme = {
                background: '#0d1117',  // Original dark blue-grey
                foreground: '#00ff00',  // Pure bright green
                cursor: '#00ff00',
                cursorAccent: '#0d1117',
                selectionBackground: 'rgba(0, 255, 0, 0.3)',
                black: '#000000',
                red: '#ff4444',
                green: '#00ff00',  // Pure bright green
                yellow: '#ffff00',
                blue: '#4444ff',
                magenta: '#ff44ff',
                cyan: '#44ffff',
                white: '#ffffff',
                brightBlack: '#666666',
                brightRed: '#ff6666',
                brightGreen: '#00ff00',  // Same vibrant green
                brightYellow: '#ffff66',
                brightBlue: '#6666ff',
                brightMagenta: '#ff66ff',
                brightCyan: '#66ffff',
                brightWhite: '#ffffff'
            };

            tab.xterm = new Terminal({
                theme: theme,
                fontFamily: 'Fira Code, monospace',
                fontSize: 14,
                cursorBlink: true,
                cursorStyle: 'block',
                scrollback: 10000,
                allowTransparency: true
            });

            tab.fitAddon = new FitAddon();
            tab.xterm.loadAddon(tab.fitAddon);

            tab.searchAddon = new SearchAddon();
            tab.xterm.loadAddon(tab.searchAddon);

            tab.xterm.open(tab.container);

            // Fit terminal and wait for it to be fully ready
            setTimeout(() => {
                if (tab.fitAddon) {
                    tab.fitAddon.fit();
                }
            }, 10);
        }

        // Initialize PTY if needed
        if (!tab.ptyId && window.electronAPI?.createPty) {
            // Set up event listeners BEFORE creating PTY to catch all data
            // Connect input
            tab.xterm.onData((data) => {
                if (tab.ptyId && window.electronAPI?.writePty) {
                    void window.electronAPI.writePty(tab.ptyId, data);
                }
            });

            // Handle resize
            tab.xterm.onResize(({ cols, rows }) => {
                if (tab.ptyId && window.electronAPI?.resizePty) {
                    void window.electronAPI.resizePty(tab.ptyId, cols, rows);
                }
            });

            // Listen for PTY data
            if (window.electronAPI?.onTerminalData) {
                window.electronAPI.onTerminalData((data) => {
                    if (data.id === tab.ptyId && tab.xterm) {
                        tab.xterm.write(data.data);
                    }
                });
            }

            // Listen for PTY exit
            if (window.electronAPI?.onTerminalExit) {
                window.electronAPI.onTerminalExit((data) => {
                    if (data.id === tab.ptyId && tab.xterm) {
                        tab.xterm.writeln(`\r\n\x1b[33m[Process exited with code ${data.exitCode}]\x1b[0m`);
                        tab.ptyId = null;
                    }
                });
            }

            // Wait for xterm to be fully ready before creating PTY
            // This prevents the first line from being garbled
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await window.electronAPI.createPty({
                cols: tab.xterm.cols,
                rows: tab.xterm.rows,
                cwd: undefined
            });

            if (result.success && result.id) {
                tab.ptyId = result.id;
                console.log('[TerminalManager] PTY created for tab:', tab.id, 'ptyId:', tab.ptyId);
            }
        }
    }

    /**
     * Render the tabs UI
     */
    private renderTabs(): void {
        const tabsHtml = this.tabs.map((tab, index) => {
            const isActive = index === this.activeTabIndex;
            const closeButton = this.tabs.length > 1
                ? `<span class="terminal-tab-close" data-tab-close="${index}">×</span>`
                : '';

            return `
        <div class="terminal-tab ${isActive ? 'active' : ''}" data-tab-index="${index}">
          ${this.escapeHtml(tab.title)}
          ${closeButton}
        </div>
      `;
        }).join('');

        // Find or create tabs container
        let tabsBar = this.tabsContainer.querySelector('.terminal-tabs-bar');
        if (!tabsBar) {
            tabsBar = document.createElement('div');
            tabsBar.className = 'terminal-tabs-bar';
            this.tabsContainer.appendChild(tabsBar);
        }

        tabsBar.innerHTML = `
      ${tabsHtml}
      <div class="terminal-tab-add" data-tab-new>+</div>
    `;

        // Add event listeners
        this.attachTabListeners();
    }

    /**
     * Attach event listeners to tabs
     */
    private attachTabListeners(): void {
        // Tab click
        this.tabsContainer.querySelectorAll('[data-tab-index]').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const index = parseInt(target.dataset.tabIndex || '0', 10);
                this.switchTab(index);
            });
        });

        // Close button click
        this.tabsContainer.querySelectorAll('[data-tab-close]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = e.currentTarget as HTMLElement;
                const index = parseInt(target.dataset.tabClose || '0', 10);
                void this.closeTab(index);
            });
        });

        // New tab button
        const newTabBtn = this.tabsContainer.querySelector('[data-tab-new]');
        newTabBtn?.addEventListener('click', () => {
            this.createTab();
        });
    }

    /**
     * Show the active terminal and hide others
     */
    private showActiveTerminal(): void {
        // Initialize xterm for active tab if needed
        const activeTab = this.tabs[this.activeTabIndex];
        if (activeTab && !activeTab.xterm) {
            void this.initializeXterm(activeTab);
        }

        // Give xterm a moment to initialize before showing
        setTimeout(() => {
            this.tabs.forEach((tab, index) => {
                if (tab.container) {
                    tab.container.style.display = index === this.activeTabIndex ? 'block' : 'none';
                }
            });

            // Fit active terminal
            if (activeTab?.fitAddon) {
                setTimeout(() => {
                    activeTab.fitAddon?.fit();
                }, 10);
            }
        }, 100);
    }

    /**
     * Cleanup all tabs
     */
    async cleanup(): Promise<void> {
        for (const tab of this.tabs) {
            if (tab.ptyId && window.electronAPI?.destroyPty) {
                await window.electronAPI.destroyPty(tab.ptyId);
            }
            if (tab.xterm) {
                tab.xterm.dispose();
            }
        }
        this.tabs = [];
    }

    /**
     * Escape HTML for safe rendering
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
