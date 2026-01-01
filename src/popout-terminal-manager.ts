/**
 * PopoutTerminalManager - Manages multiple terminal tabs in the popout window
 * Each tab has its own PTY instance and xterm.js terminal
 */

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export interface TerminalTab {
    id: string;
    ptyId: string | null;
    title: string;
    xterm: Terminal | null;
    fitAddon: FitAddon | null;
    buffer: string[];
    cwd: string;
    container: HTMLElement | null;
}

export class PopoutTerminalManager {
    private tabs: TerminalTab[] = [];
    private activeTabIndex: number = 0;
    private readonly tabsContainer: HTMLElement;
    private readonly terminalLayout: HTMLElement;

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

            tab.xterm = new Terminal({
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

            tab.fitAddon = new FitAddon();
            tab.xterm.loadAddon(tab.fitAddon);
            tab.xterm.open(tab.container);

            // Fit terminal
            setTimeout(() => {
                if (tab.fitAddon) {
                    tab.fitAddon.fit();
                }
            }, 10);
        }

        // Initialize PTY if needed
        if (!tab.ptyId && window.electronAPI?.createPty) {
            const result = await window.electronAPI.createPty({
                cols: tab.xterm.cols,
                rows: tab.xterm.rows,
                cwd: undefined
            });

            if (result.success && result.id) {
                tab.ptyId = result.id;
                console.log('[TerminalManager] PTY created for tab:', tab.id, 'ptyId:', tab.ptyId);

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
