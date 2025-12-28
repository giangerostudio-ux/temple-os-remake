// ============================================
// TILING MANAGER (Smart Window Tiling)
// Tier 14.1 - Advanced Window Tiling
// ============================================

export type SnapZone = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'maximize' | null;

export interface WindowBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TilingState {
    windowId: string;
    zone: SnapZone;
    originalBounds: WindowBounds;
}

export interface SnapPreview {
    zone: SnapZone;
    bounds: WindowBounds;
}

export class TilingManager {
    private tiledWindows: Map<string, TilingState> = new Map();
    private taskbarPosition: 'top' | 'bottom' = 'bottom';
    private snapAssistEnabled: boolean = true;
    private pendingSnapAssist: { zone: SnapZone; snappedWindowId: string } | null = null;

    constructor() {
        this.loadSettings();
    }

    private loadSettings(): void {
        try {
            const pos = localStorage.getItem('temple_taskbar_position');
            if (pos === 'top' || pos === 'bottom') {
                this.taskbarPosition = pos;
            }
            const assist = localStorage.getItem('temple_snap_assist');
            this.snapAssistEnabled = assist !== 'false';
        } catch (e) {
            console.warn('Failed to load tiling settings:', e);
        }
    }

    /**
     * Get the usable screen bounds (accounting for taskbar position)
     */
    public getUsableBounds(): WindowBounds {
        // Taskbar: 56px height + 12px bottom margin = 68px total
        const TASKBAR_TOTAL_HEIGHT = 68;

        if (this.taskbarPosition === 'top') {
            return {
                x: 0,
                y: TASKBAR_TOTAL_HEIGHT,
                width: window.innerWidth,
                height: window.innerHeight - TASKBAR_TOTAL_HEIGHT
            };
        } else {
            return {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight - TASKBAR_TOTAL_HEIGHT
            };
        }
    }

    /**
     * Set taskbar position and recalculate bounds
     */
    public setTaskbarPosition(position: 'top' | 'bottom'): void {
        this.taskbarPosition = position;
        localStorage.setItem('temple_taskbar_position', position);
    }

    /**
     * Get current taskbar position
     */
    public getTaskbarPosition(): 'top' | 'bottom' {
        return this.taskbarPosition;
    }

    /**
     * Calculate the snap zone based on cursor position
     */
    public getSnapZone(cursorX: number, cursorY: number): SnapZone {
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const edgeThreshold = 30;
        const cornerThreshold = 60;

        const isNearTop = cursorY <= edgeThreshold;
        const isNearBottom = cursorY >= screenH - edgeThreshold;
        const isNearLeft = cursorX <= edgeThreshold;
        const isNearRight = cursorX >= screenW - edgeThreshold;

        // Corner snaps (quarter screen)
        if (cursorX <= cornerThreshold && cursorY <= cornerThreshold) return 'top-left';
        if (cursorX >= screenW - cornerThreshold && cursorY <= cornerThreshold) return 'top-right';
        if (cursorX <= cornerThreshold && cursorY >= screenH - cornerThreshold) return 'bottom-left';
        if (cursorX >= screenW - cornerThreshold && cursorY >= screenH - cornerThreshold) return 'bottom-right';

        // Edge snaps
        if (isNearTop) return 'maximize';
        if (isNearLeft) return 'left';
        if (isNearRight) return 'right';
        if (isNearBottom) return 'bottom';

        return null;
    }

    /**
     * Get the target bounds for a specific snap zone
     */
    public getSnapBounds(zone: SnapZone): WindowBounds | null {
        if (!zone) return null;

        const usable = this.getUsableBounds();
        const halfWidth = Math.floor(usable.width / 2);
        const halfHeight = Math.floor(usable.height / 2);

        switch (zone) {
            case 'left':
                return {
                    x: usable.x,
                    y: usable.y,
                    width: halfWidth,
                    height: usable.height
                };
            case 'right':
                return {
                    x: usable.x + halfWidth,
                    y: usable.y,
                    width: halfWidth,
                    height: usable.height
                };
            case 'top':
                return {
                    x: usable.x,
                    y: usable.y,
                    width: usable.width,
                    height: halfHeight
                };
            case 'bottom':
                return {
                    x: usable.x,
                    y: usable.y + halfHeight,
                    width: usable.width,
                    height: halfHeight
                };
            case 'top-left':
                return {
                    x: usable.x,
                    y: usable.y,
                    width: halfWidth,
                    height: halfHeight
                };
            case 'top-right':
                return {
                    x: usable.x + halfWidth,
                    y: usable.y,
                    width: halfWidth,
                    height: halfHeight
                };
            case 'bottom-left':
                return {
                    x: usable.x,
                    y: usable.y + halfHeight,
                    width: halfWidth,
                    height: halfHeight
                };
            case 'bottom-right':
                return {
                    x: usable.x + halfWidth,
                    y: usable.y + halfHeight,
                    width: halfWidth,
                    height: halfHeight
                };
            case 'maximize':
                return { ...usable };
            default:
                return null;
        }
    }

    /**
     * Get a snap preview (for rendering the preview overlay)
     */
    public getSnapPreview(cursorX: number, cursorY: number): SnapPreview | null {
        const zone = this.getSnapZone(cursorX, cursorY);
        if (!zone) return null;

        const bounds = this.getSnapBounds(zone);
        if (!bounds) return null;

        return { zone, bounds };
    }

    /**
     * Snap a window to a zone
     */
    public snapWindow(windowId: string, zone: SnapZone, originalBounds: WindowBounds): WindowBounds | null {
        if (!zone) {
            this.unsnap(windowId);
            return null;
        }

        const bounds = this.getSnapBounds(zone);
        if (!bounds) return null;

        // Store tiling state
        this.tiledWindows.set(windowId, {
            windowId,
            zone,
            originalBounds
        });

        // Trigger snap assist if another window should fill remaining space
        if (this.snapAssistEnabled && (zone === 'left' || zone === 'right')) {
            this.pendingSnapAssist = { zone, snappedWindowId: windowId };
        }

        return bounds;
    }

    /**
     * Unsnap a window and restore its original bounds
     */
    public unsnap(windowId: string): WindowBounds | null {
        const state = this.tiledWindows.get(windowId);
        if (state) {
            this.tiledWindows.delete(windowId);
            return state.originalBounds;
        }
        return null;
    }

    /**
     * Check if a window is currently snapped
     */
    public isSnapped(windowId: string): boolean {
        return this.tiledWindows.has(windowId);
    }

    /**
     * Get the snap state of a window
     */
    public getSnapState(windowId: string): TilingState | null {
        return this.tiledWindows.get(windowId) || null;
    }

    /**
     * Get the opposite zone for snap assist
     */
    public getOppositeZone(zone: SnapZone): SnapZone {
        switch (zone) {
            case 'left': return 'right';
            case 'right': return 'left';
            case 'top': return 'bottom';
            case 'bottom': return 'top';
            case 'top-left': return 'bottom-right';
            case 'top-right': return 'bottom-left';
            case 'bottom-left': return 'top-right';
            case 'bottom-right': return 'top-left';
            default: return null;
        }
    }

    /**
     * Check if snap assist should be triggered
     */
    public hasPendingSnapAssist(): boolean {
        return this.pendingSnapAssist !== null;
    }

    /**
     * Get pending snap assist info
     */
    public getPendingSnapAssist(): { zone: SnapZone; snappedWindowId: string } | null {
        return this.pendingSnapAssist;
    }

    /**
     * Clear pending snap assist
     */
    public clearSnapAssist(): void {
        this.pendingSnapAssist = null;
    }

    /**
     * Get the zone where snap assist should place the next window
     */
    public getSnapAssistZone(): SnapZone {
        if (!this.pendingSnapAssist) return null;
        return this.getOppositeZone(this.pendingSnapAssist.zone);
    }

    /**
     * Toggle snap assist feature
     */
    public setSnapAssistEnabled(enabled: boolean): void {
        this.snapAssistEnabled = enabled;
        localStorage.setItem('temple_snap_assist', String(enabled));
    }

    /**
     * Check if snap assist is enabled
     */
    public isSnapAssistEnabled(): boolean {
        return this.snapAssistEnabled;
    }

    /**
     * Remove window from tiling state (e.g., when closing)
     */
    public removeWindow(windowId: string): void {
        this.tiledWindows.delete(windowId);
        if (this.pendingSnapAssist?.snappedWindowId === windowId) {
            this.pendingSnapAssist = null;
        }
    }

    /**
     * Render snap preview overlay
     */
    public renderSnapPreview(preview: SnapPreview | null): string {
        if (!preview) return '';

        const { bounds, zone } = preview;
        return `
      <div class="snap-preview" 
           data-zone="${zone}"
           style="left: ${bounds.x}px; top: ${bounds.y}px; width: ${bounds.width}px; height: ${bounds.height}px;">
      </div>
    `;
    }

    /**
     * Render snap assist overlay (shows available windows to snap)
     */
    public renderSnapAssistOverlay(availableWindows: Array<{ id: string; title: string; icon: string }>): string {
        if (!this.pendingSnapAssist || availableWindows.length === 0) return '';

        const assistZone = this.getSnapAssistZone();
        const bounds = this.getSnapBounds(assistZone);
        if (!bounds) return '';

        const windowButtons = availableWindows.map(w => `
      <div class="snap-assist-window" data-window-id="${w.id}">
        <span class="snap-assist-icon">${w.icon}</span>
        <span class="snap-assist-title">${w.title}</span>
      </div>
    `).join('');

        return `
      <div class="snap-assist-overlay" 
           style="left: ${bounds.x}px; top: ${bounds.y}px; width: ${bounds.width}px; height: ${bounds.height}px;">
        <div class="snap-assist-content">
          <div class="snap-assist-header">Snap a window here</div>
          <div class="snap-assist-windows">
            ${windowButtons}
          </div>
        </div>
      </div>
    `;
    }

    /**
     * Handle keyboard tiling shortcuts
     * Returns the target zone based on the key combination
     */
    public getKeyboardSnapZone(key: string, currentZone: SnapZone): SnapZone {
        switch (key) {
            case 'ArrowLeft':
                if (currentZone === 'left') return 'left'; // Already at left edge
                if (currentZone === 'right') return null; // Unsnap and move
                if (currentZone === 'top-right') return 'top-left';
                if (currentZone === 'bottom-right') return 'bottom-left';
                return 'left';

            case 'ArrowRight':
                if (currentZone === 'right') return 'right';
                if (currentZone === 'left') return null;
                if (currentZone === 'top-left') return 'top-right';
                if (currentZone === 'bottom-left') return 'bottom-right';
                return 'right';

            case 'ArrowUp':
                if (currentZone === 'maximize') return 'maximize';
                if (currentZone === 'left') return 'top-left';
                if (currentZone === 'right') return 'top-right';
                if (currentZone === 'bottom-left') return 'left';
                if (currentZone === 'bottom-right') return 'right';
                return 'maximize';

            case 'ArrowDown':
                if (currentZone === 'maximize') return null; // Restore
                if (currentZone === 'left') return 'bottom-left';
                if (currentZone === 'right') return 'bottom-right';
                if (currentZone === 'top-left') return 'left';
                if (currentZone === 'top-right') return 'right';
                return null; // Minimize

            default:
                return currentZone;
        }
    }
}

export default TilingManager;
