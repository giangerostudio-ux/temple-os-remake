/**
 * Desktop Component
 * Phase 3: UI Component Extraction
 * 
 * Handles desktop icons, drag-drop positioning, and sorting.
 */

import type { DesktopIcon, DesktopIconPosition, DesktopCallbacks, DesktopState } from './types';
import { escapeHtml } from './types';

// ============================================
// CONSTANTS
// ============================================

const CELL_W = 100;
const CELL_H = 100;
const GAP = 10;
const PADDING = 20;
const OVERLAP_THRESHOLD = 50;

// ============================================
// ICON DEFINITIONS
// ============================================

function getNeonIcon(path: string): string {
    return `<svg viewBox="0 0 24 24" class="icon-neon" width="40" height="40">${path}</svg>`;
}

export const BUILTIN_ICONS: DesktopIcon[] = [
    { id: 'terminal', key: 'builtin:terminal', icon: getNeonIcon('<rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8l4 4-4 4" /><path d="M14 16h4" />'), label: 'Terminal', isShortcut: false },
    { id: 'word-of-god', key: 'builtin:word-of-god', icon: getNeonIcon('<path d="M12 2v20M2 8h20" />'), label: 'Word of God', isShortcut: false },
    { id: 'files', key: 'builtin:files', icon: getNeonIcon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />'), label: 'Files', isShortcut: false },
    { id: 'editor', key: 'builtin:editor', icon: getNeonIcon('<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />'), label: 'HolyC Editor', isShortcut: false },
    { id: 'hymns', key: 'builtin:hymns', icon: getNeonIcon('<path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />'), label: 'Hymn Player', isShortcut: false },
    { id: 'updater', key: 'builtin:updater', icon: getNeonIcon('<path d="M5.5 5c.5.5 1.5 3.5 1.5 5s-1 3 1 4c2 1 2.5-.5 2.5-2.5s-.75-6-1.5-7.5c-.5-1-1 0-1 0s-.5-2-1-2-.5 1-.5 1-1-1-1.5-1 0 .5 0 .5z"/><path d="M5.3 11.5c1.5 0 2 2 3 2s.5-1.5 1.5-1.5 5-2.5 5-5.5 1.5-1.5 1.5-.5c.5 0 1 .8 1 1.5 0 .5 0 1-.5 1.5.5 0 1 1 .5 1.5.5 1.5-.5 3-1.5 3.5 0 .5-1 1.5-2 1 0 0-.5 1.5-1.5 1 0 0 1.5.8 2 1 1.5.5 3.5.5 3.5.5s0 .5-1 1c0 0 .5.5 0 1s-1 .5-1 .5.5 1-1 .5-3-2-3-2-2.5.5-4.5-.5-3-3-3-4-1.5-.5-2-.5 1-1 1.5-1c0 0 0-1 1.5-1z"/>'), label: 'Holy Updater', isShortcut: false },
    { id: 'help', key: 'builtin:help', icon: getNeonIcon('<circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor"/>'), label: 'Help', isShortcut: false },
    { id: 'godly-notes', key: 'builtin:godly-notes', icon: getNeonIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />'), label: 'Godly Notes', isShortcut: false },
    { id: 'trash', key: 'builtin:trash', icon: getNeonIcon('<polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />'), label: 'Trash', isShortcut: false },
];

// ============================================
// DESKTOP CLASS
// ============================================

export class Desktop {
    private state: DesktopState;
    private callbacks: DesktopCallbacks;
    private draggingIcon: { key: string; offsetX: number; offsetY: number; startX: number; startY: number; hasMoved: boolean } | null = null;

    constructor(state: DesktopState, callbacks: DesktopCallbacks) {
        this.state = state;
        this.callbacks = callbacks;
    }

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    updateState(newState: Partial<DesktopState>): void {
        this.state = { ...this.state, ...newState };
    }

    getState(): DesktopState {
        return this.state;
    }

    // ============================================
    // RENDER METHODS
    // ============================================

    /**
     * Render all desktop icons
     */
    renderIcons(containerWidth: number, containerHeight: number): string {
        const builtinKeys = new Set(BUILTIN_ICONS.map(i => i.key));

        // Get shortcut icons (non-builtin)
        const shortcutIcons = this.state.shortcuts
            .filter(s => s && typeof s.key === 'string' && typeof s.label === 'string' && !builtinKeys.has(s.key))
            .slice(0, 48)
            .map(s => {
                const display = this.callbacks.getLauncherDisplay(s.key);
                return {
                    id: s.key,
                    key: s.key,
                    icon: display?.icon || '📄',
                    label: s.label,
                    isShortcut: true
                };
            });

        const allIcons: DesktopIcon[] = [...BUILTIN_ICONS, ...shortcutIcons];
        const cols = Math.max(1, Math.floor((containerWidth - PADDING * 2) / (CELL_W + GAP)));

        return allIcons.map((icon, index) => {
            const position = this.calculateIconPosition(icon.key, index, cols, containerWidth, containerHeight);

            // Adjust y position when taskbar is at top
            const taskbarOffset = this.state.taskbarPosition === 'top' ? 60 : 0;
            const finalY = position.y + taskbarOffset;

            const style = `position: absolute; left: ${position.x}px; top: ${finalY}px;`;
            const appAttr = icon.isShortcut
                ? `data-launch-key="${escapeHtml(icon.key)}"`
                : `data-app="${escapeHtml(icon.id)}"`;

            const sizeClass = `size-${this.state.iconSize}`;
            return `
        <div class="desktop-icon ${sizeClass}" ${appAttr} tabindex="0" role="button" aria-label="${escapeHtml(icon.label)}" style="${style}">
          <span class="icon" aria-hidden="true">${icon.icon}</span>
          <span class="label">${escapeHtml(icon.label)}</span>
        </div>
      `;
        }).join('');
    }

    /**
     * Calculate icon position based on auto-arrange setting
     */
    private calculateIconPosition(key: string, index: number, cols: number, containerWidth: number, containerHeight: number): DesktopIconPosition {
        if (this.state.autoArrange) {
            // Auto-flow: Row-major layout
            const row = Math.floor(index / cols);
            const col = index % cols;
            return {
                x: PADDING + col * (CELL_W + GAP),
                y: PADDING + row * (CELL_H + GAP)
            };
        }

        // Free positioning - use stored position or find default
        const stored = this.state.iconPositions[key];
        if (stored) {
            // Clamp to viewport bounds
            const safeMaxX = containerWidth - CELL_W - 5;
            const safeMaxY = containerHeight - CELL_H - 50;

            let x = stored.x;
            let y = stored.y;

            if (x < 5) x = 10;
            if (y < 5) y = 10;
            if (x > safeMaxX) x = Math.max(10, safeMaxX);
            if (y > safeMaxY) y = Math.max(10, safeMaxY);

            // Notify if position was clamped
            if (x !== stored.x || y !== stored.y) {
                this.callbacks.onIconPositionChange(key, x, y);
            }

            return { x, y };
        }

        // Default to grid position for unknown icons
        const row = Math.floor(index / cols);
        const col = index % cols;
        return {
            x: PADDING + col * (CELL_W + GAP),
            y: PADDING + row * (CELL_H + GAP)
        };
    }

    // ============================================
    // DRAG & DROP HANDLING
    // ============================================

    /**
     * Handle icon drag start
     */
    handleDragStart(e: MouseEvent, iconEl: HTMLElement): void {
        if (this.state.autoArrange) return; // Locked

        const rect = iconEl.getBoundingClientRect();
        const key = iconEl.dataset.launchKey || (iconEl.dataset.app ? `builtin:${iconEl.dataset.app}` : '');

        if (!key) return;

        iconEl.focus();
        this.draggingIcon = {
            key,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            startX: e.clientX,
            startY: e.clientY,
            hasMoved: false
        };

        iconEl.classList.add('dragging');
        iconEl.style.zIndex = '1000';
    }

    /**
     * Handle icon drag move
     */
    handleDragMove(e: MouseEvent): void {
        if (!this.draggingIcon) return;

        const key = this.draggingIcon.key;
        const iconEl = this.findIconElement(key);
        if (!iconEl) return;

        // Check if we've moved enough to consider this a drag (not a click)
        const dx = Math.abs(e.clientX - this.draggingIcon.startX);
        const dy = Math.abs(e.clientY - this.draggingIcon.startY);
        const DRAG_THRESHOLD = 5;

        if (!this.draggingIcon.hasMoved && dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
            return; // Not dragging yet
        }

        this.draggingIcon.hasMoved = true;

        // Update position
        let newX = e.clientX - this.draggingIcon.offsetX;
        let newY = e.clientY - this.draggingIcon.offsetY;

        // Constrain to viewport
        const container = document.getElementById('desktop');
        if (container) {
            const bounds = container.getBoundingClientRect();
            newX = Math.max(0, Math.min(newX, bounds.width - CELL_W));
            newY = Math.max(0, Math.min(newY, bounds.height - CELL_H - 50));
        }

        iconEl.style.left = `${newX}px`;
        iconEl.style.top = `${newY}px`;
    }

    /**
     * Handle icon drag end
     */
    handleDragEnd(): void {
        if (!this.draggingIcon) return;

        const key = this.draggingIcon.key;
        const hasMoved = this.draggingIcon.hasMoved;
        const iconEl = this.findIconElement(key);

        if (iconEl) {
            iconEl.classList.remove('dragging');
            iconEl.style.zIndex = '';

            if (hasMoved) {
                // Save new position with collision detection
                let x = parseInt(iconEl.style.left || '0', 10);
                let y = parseInt(iconEl.style.top || '0', 10);

                // Remove taskbar offset before saving
                const taskbarOffset = this.state.taskbarPosition === 'top' ? 60 : 0;
                y -= taskbarOffset;

                // Collision detection
                const finalPos = this.resolveCollision(key, x, y);

                // Update visual position if collision resolved
                if (finalPos.x !== x || finalPos.y !== y) {
                    iconEl.style.left = `${finalPos.x}px`;
                    iconEl.style.top = `${finalPos.y + taskbarOffset}px`;
                }

                this.callbacks.onIconPositionChange(key, finalPos.x, finalPos.y);
            } else {
                // Click, not drag - trigger icon click
                this.callbacks.onIconClick(key);
            }
        }

        this.draggingIcon = null;
    }

    /**
     * Resolve collision with other icons using spiral search
     */
    private resolveCollision(key: string, x: number, y: number): DesktopIconPosition {
        // Check for collision
        let hasCollision = false;
        for (const [otherKey, otherPos] of Object.entries(this.state.iconPositions)) {
            if (otherKey === key) continue;

            const dx = Math.abs(x - otherPos.x);
            const dy = Math.abs(y - otherPos.y);

            if (dx < OVERLAP_THRESHOLD && dy < OVERLAP_THRESHOLD) {
                hasCollision = true;
                break;
            }
        }

        if (!hasCollision) return { x, y };

        // Find nearest empty cell using spiral search
        const maxSearchRadius = 10;

        for (let radius = 1; radius <= maxSearchRadius; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                    const testX = x + dx * (CELL_W + GAP);
                    const testY = y + dy * (CELL_H + GAP);

                    if (testX < 0 || testY < 0) continue;

                    // Check if position is free
                    let isFree = true;
                    for (const [otherKey, otherPos] of Object.entries(this.state.iconPositions)) {
                        if (otherKey === key) continue;

                        const testDx = Math.abs(testX - otherPos.x);
                        const testDy = Math.abs(testY - otherPos.y);

                        if (testDx < OVERLAP_THRESHOLD && testDy < OVERLAP_THRESHOLD) {
                            isFree = false;
                            break;
                        }
                    }

                    if (isFree) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }

        return { x, y }; // Fallback
    }

    /**
     * Find icon element by key
     */
    private findIconElement(key: string): HTMLElement | null {
        return document.querySelector(`.desktop-icon[data-launch-key="${key}"]`) as HTMLElement
            || document.querySelector(`.desktop-icon[data-app="${key.replace('builtin:', '')}"]`) as HTMLElement;
    }

    // ============================================
    // SORTING
    // ============================================

    /**
     * Sort desktop icons by criteria
     */
    sortIcons(criteria: 'name' | 'type'): Record<string, DesktopIconPosition> {
        const allIcons = [...BUILTIN_ICONS, ...this.state.shortcuts.map(s => ({ ...s, id: s.key, isShortcut: true, icon: '' }))];

        // Sort icons
        const sorted = [...allIcons].sort((a, b) => {
            if (criteria === 'name') {
                return a.label.localeCompare(b.label);
            } else {
                // Sort by type: builtins first, then shortcuts
                const aIsBuiltin = !a.isShortcut;
                const bIsBuiltin = !b.isShortcut;
                if (aIsBuiltin !== bIsBuiltin) return aIsBuiltin ? -1 : 1;
                return a.label.localeCompare(b.label);
            }
        });

        // Assign grid positions
        const container = document.getElementById('desktop');
        const width = container?.clientWidth || window.innerWidth;
        const cols = Math.max(1, Math.floor((width - PADDING * 2) / (CELL_W + GAP)));

        const newPositions: Record<string, DesktopIconPosition> = {};
        sorted.forEach((icon, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            newPositions[icon.key] = {
                x: PADDING + col * (CELL_W + GAP),
                y: PADDING + row * (CELL_H + GAP)
            };
        });

        return newPositions;
    }

    // ============================================
    // PUBLIC HELPERS
    // ============================================

    isDragging(): boolean {
        return this.draggingIcon !== null;
    }

    getDraggingKey(): string | null {
        return this.draggingIcon?.key || null;
    }
}
