/**
 * ContextMenu Component
 * Phase 3: UI Component Extraction
 * 
 * A reusable context menu system that supports both:
 * - DOM-based menus (Windows, macOS, non-X11 Linux)
 * - IPC-based popup menus (Linux X11 with external windows)
 */

import { type ContextMenuItem, escapeHtml } from './types';

export interface ContextMenuOptions {
    /** If true and IPC popup is available, use external popup (for X11) */
    useExternalPopup?: boolean;
    /** Callback to show external popup (X11 IPC) */
    showExternalPopup?: (x: number, y: number, items: Array<{ id: string; label?: string; divider?: boolean }>) => Promise<{ success: boolean }>;
    /** Callback to close external popup */
    closeExternalPopup?: () => Promise<{ success: boolean }>;
}

export class ContextMenu {
    private visible = false;
    private pendingActions: Map<string, () => void | Promise<void>> = new Map();
    private options: ContextMenuOptions;

    constructor(options: ContextMenuOptions = {}) {
        this.options = options;

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (this.visible && !(e.target as HTMLElement)?.closest('.context-menu')) {
                this.close();
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.visible) {
                this.close();
            }
        });
    }

    /**
     * Show context menu at given position
     */
    show(x: number, y: number, items: ContextMenuItem[]): void {
        this.close();
        this.visible = true;

        // If external popup is requested and available, use IPC
        if (this.options.useExternalPopup && this.options.showExternalPopup) {
            this.showExternalMenu(x, y, items);
            return;
        }

        // Fallback: DOM-based menu
        this.showDomMenu(x, y, items);
    }

    /**
     * Close the context menu
     */
    close(): void {
        document.querySelectorAll('.context-menu').forEach(m => m.remove());
        this.pendingActions.clear();
        this.visible = false;

        // Close external popup if applicable
        if (this.options.closeExternalPopup) {
            void this.options.closeExternalPopup();
        }
    }

    /**
     * Handle action from external popup (called via IPC callback)
     */
    handleExternalAction(actionId: string): void {
        const action = this.pendingActions.get(actionId);
        if (action) {
            this.close();
            action();
        }
    }

    /**
     * Check if menu is currently visible
     */
    isVisible(): boolean {
        return this.visible;
    }

    /**
     * Update options (e.g., when X11 windows change)
     */
    setOptions(options: Partial<ContextMenuOptions>): void {
        this.options = { ...this.options, ...options };
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    private showExternalMenu(x: number, y: number, items: ContextMenuItem[]): void {
        // Serialize items with IDs for IPC, store action callbacks
        const serializedItems = items.map((item, idx) => ({
            id: `action_${idx}`,
            label: item.label || '',
            divider: !!item.divider,
        }));

        // Store action callbacks (use same index as serialized items)
        this.pendingActions.clear();
        items.forEach((item, idx) => {
            if (!item.divider && item.action) {
                this.pendingActions.set(`action_${idx}`, item.action);
            }
        });

        void this.options.showExternalPopup!(x, y, serializedItems);
    }

    private showDomMenu(x: number, y: number, items: ContextMenuItem[]): void {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      background: rgba(13, 17, 23, 0.98);
      border: 1px solid rgba(0, 255, 65, 0.3);
      border-radius: 6px;
      padding: 6px 0;
      min-width: 180px;
      z-index: 99998;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
      font-family: 'VT323', 'Noto Color Emoji', monospace;
    `;

        items.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.style.cssText = 'height: 1px; background: rgba(0, 255, 65, 0.2); margin: 4px 8px;';
                menu.appendChild(divider);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';

                // Build content with optional icon
                const iconHtml = item.icon ? `<span class="context-menu-icon">${escapeHtml(item.icon)}</span>` : '';
                menuItem.innerHTML = `${iconHtml}<span class="context-menu-label">${escapeHtml(item.label || '')}</span>`;

                menuItem.style.cssText = `
          padding: 8px 14px;
          cursor: ${item.disabled ? 'default' : 'pointer'};
          color: ${item.disabled ? 'rgba(0, 255, 65, 0.4)' : '#00ff41'};
          font-size: 16px;
          font-family: 'VT323', 'Noto Color Emoji', monospace;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        `;

                if (!item.disabled) {
                    menuItem.addEventListener('mouseenter', () => {
                        menuItem.style.background = 'rgba(0, 255, 65, 0.15)';
                    });
                    menuItem.addEventListener('mouseleave', () => {
                        menuItem.style.background = 'transparent';
                    });
                    menuItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (item.action) {
                            this.close();
                            item.action();
                        } else if (item.submenu) {
                            // Basic submenu: close this, open new one at offset
                            this.close();
                            this.show(e.clientX + 10, e.clientY, item.submenu);
                        }
                    });
                }

                menu.appendChild(menuItem);
            }
        });

        // Add to DOM
        document.body.appendChild(menu);

        // Adjust position if menu would go off screen
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight - 50) {
            menu.style.top = `${y - rect.height}px`;
        }
    }
}

// Export a singleton instance for convenience
let contextMenuInstance: ContextMenu | null = null;

export function getContextMenu(options?: ContextMenuOptions): ContextMenu {
    if (!contextMenuInstance) {
        contextMenuInstance = new ContextMenu(options);
    } else if (options) {
        contextMenuInstance.setOptions(options);
    }
    return contextMenuInstance;
}
