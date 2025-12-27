// ============================================
// WINDOW MANAGER
// Phase 2 Refactoring - Extracted from main.ts
// ============================================

import type { WindowState } from '../utils/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface DragState {
    windowId: string;
    offsetX: number;
    offsetY: number;
}

export interface ResizeState {
    windowId: string;
    dir: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startXLoc: number;
    startYLoc: number;
}

export interface SnapState {
    type: string;
    rect: { x: number; y: number; width: number; height: number };
}

export interface WindowManagerCallbacks {
    onWindowsChange: () => void;
    onActiveWindowChange: (windowId: string | null) => void;
    onWindowMinimize?: (windowId: string) => void;
    onWindowFocus?: (windowId: string, wasMinimized: boolean) => void;
    onWindowClose?: (windowId: string) => void;
}

export interface CreateWindowOptions {
    id?: string;
    title: string;
    icon: string;
    x?: number;
    y?: number;
    width: number;
    height: number;
    content: string;
    maximized?: boolean;
    transparent?: boolean;
    alwaysOnTop?: boolean;
}

// ============================================
// WINDOW MANAGER CLASS
// ============================================

export class WindowManager {
    private windows: WindowState[];
    private windowIdCounter = 0;
    private callbacks: WindowManagerCallbacks;

    // Drag & Resize State
    private dragState: DragState | null = null;
    private resizeState: ResizeState | null = null;
    private snapState: SnapState | null = null;

    // Constants
    private readonly MIN_WIDTH = 200;
    private readonly MIN_HEIGHT = 150;
    private readonly SNAP_MARGIN = 20;

    constructor(callbacks: WindowManagerCallbacks, externalWindows?: WindowState[]) {
        this.callbacks = callbacks;
        // If an external array is provided, use it directly (shared reference)
        // This allows gradual migration from main.ts
        this.windows = externalWindows || [];
    }

    // ============================================
    // WINDOW CRUD OPERATIONS
    // ============================================

    /**
     * Create a new window and add it to the window list
     */
    createWindow(options: CreateWindowOptions): WindowState {
        const id = options.id || `window-${++this.windowIdCounter}`;

        // Deactivate all existing windows
        this.windows.forEach(w => w.active = false);

        const newWindow: WindowState = {
            id,
            title: options.title,
            icon: options.icon,
            x: options.x ?? 50 + (this.windows.length * 30),
            y: options.y ?? 50 + (this.windows.length * 30),
            width: options.width,
            height: options.height,
            content: options.content,
            active: true,
            minimized: false,
            maximized: options.maximized ?? false,
            transparent: options.transparent,
            alwaysOnTop: options.alwaysOnTop
        };

        this.windows.push(newWindow);
        this.callbacks.onWindowsChange();

        return newWindow;
    }

    /**
     * Get a window by its ID
     */
    getWindowById(id: string): WindowState | undefined {
        return this.windows.find(w => w.id === id);
    }

    /**
     * Find a window by ID prefix (useful for app-based lookups)
     */
    getWindowByPrefix(prefix: string): WindowState | undefined {
        return this.windows.find(w => w.id.startsWith(prefix));
    }

    /**
     * Get all windows
     */
    getAllWindows(): WindowState[] {
        return this.windows;
    }

    /**
     * Get windows for a specific workspace (if workspaceWindowIds provided)
     */
    getWindowsForWorkspace(workspaceWindowIds: string[]): WindowState[] {
        return this.windows.filter(w => workspaceWindowIds.includes(w.id));
    }

    /**
     * Get currently active window
     */
    getActiveWindow(): WindowState | undefined {
        return this.windows.find(w => w.active);
    }

    /**
     * Update a window's properties
     */
    updateWindow(id: string, updates: Partial<WindowState>): void {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            Object.assign(win, updates);
        }
    }

    /**
     * Update window content
     */
    updateWindowContent(id: string, content: string): void {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.content = content;
        }
    }

    /**
     * Remove a window from the list (does not handle cleanup callbacks)
     */
    removeWindow(id: string): WindowState | undefined {
        const index = this.windows.findIndex(w => w.id === id);
        if (index === -1) return undefined;

        const removed = this.windows.splice(index, 1)[0];

        // Activate the last window if any remain
        if (this.windows.length > 0) {
            this.windows[this.windows.length - 1].active = true;
        }

        return removed;
    }

    /**
     * Get window count
     */
    getWindowCount(): number {
        return this.windows.length;
    }

    /**
     * Generate next window ID for a given app
     */
    generateWindowId(appId: string): string {
        return `${appId}-${++this.windowIdCounter}`;
    }

    /**
     * Set windows array (used for workspace switching)
     */
    setWindows(windows: WindowState[]): void {
        this.windows = windows;
    }

    // ============================================
    // WINDOW STATE OPERATIONS
    // ============================================

    /**
     * Minimize a window
     * Returns true if successful, false if window not found
     */
    minimizeWindow(windowId: string): boolean {
        const win = this.windows.find(w => w.id === windowId);
        if (!win) return false;

        win.minimized = true;
        win.active = false;

        // Activate next non-minimized window
        const visibleWindows = this.windows.filter(w => !w.minimized);
        if (visibleWindows.length > 0) {
            visibleWindows[visibleWindows.length - 1].active = true;
        }

        if (this.callbacks.onWindowMinimize) {
            this.callbacks.onWindowMinimize(windowId);
        }

        return true;
    }

    /**
     * Maximize or restore a window
     */
    maximizeWindow(windowId: string): void {
        const win = this.windows.find(w => w.id === windowId);
        if (!win) return;

        if (win.maximized) {
            // Restore to saved bounds
            if (win.savedBounds) {
                win.x = win.savedBounds.x;
                win.y = win.savedBounds.y;
                win.width = win.savedBounds.width;
                win.height = win.savedBounds.height;
            }
            win.maximized = false;
        } else {
            // Save current bounds and maximize
            win.savedBounds = {
                x: win.x,
                y: win.y,
                width: win.width,
                height: win.height
            };
            win.x = 10;
            win.y = 10;
            // Note: Actual screen dimensions should be passed via parameter or callback
            // For now, assume 1920x1080 minus taskbar
            win.width = window.innerWidth - 20;
            win.height = window.innerHeight - 80;
            win.maximized = true;
        }

        this.callbacks.onWindowsChange();
    }

    /**
     * Focus a window (unminimize if needed, bring to front, set active)
     * Returns an object indicating what changed for DOM optimization
     */
    focusWindow(windowId: string): { success: boolean; wasMinimized: boolean; needsReorder: boolean } {
        const winIndex = this.windows.findIndex(w => w.id === windowId);
        if (winIndex === -1) {
            return { success: false, wasMinimized: false, needsReorder: false };
        }

        const win = this.windows[winIndex];
        const isTopmost = winIndex === this.windows.length - 1;

        // Already active, topmost, and visible - no action needed
        if (win.active && isTopmost && !win.minimized) {
            return { success: true, wasMinimized: false, needsReorder: false };
        }

        const wasMinimized = win.minimized;
        win.minimized = false;

        // Deactivate all, activate target
        this.windows.forEach(w => w.active = w.id === windowId);

        // Move to end of array (z-index top) if not already topmost
        const needsReorder = !isTopmost;
        if (needsReorder) {
            this.windows.splice(winIndex, 1);
            this.windows.push(win);
        }

        if (this.callbacks.onWindowFocus) {
            this.callbacks.onWindowFocus(windowId, wasMinimized);
        }

        return { success: true, wasMinimized, needsReorder };
    }

    /**
     * Toggle window visibility (minimize if active, focus if minimized/inactive)
     */
    toggleWindow(windowId: string): void {
        const win = this.windows.find(w => w.id === windowId);
        if (!win) return;

        if (win.minimized) {
            this.focusWindow(windowId);
        } else if (win.active) {
            this.minimizeWindow(windowId);
        } else {
            this.focusWindow(windowId);
        }
    }

    /**
     * Cycle through windows (Alt+Tab behavior)
     * Returns the newly active window ID or null
     */
    cycleWindows(): string | null {
        if (this.windows.length === 0) return null;

        // Find current active window index
        const activeIndex = this.windows.findIndex(w => w.active);

        // Deactivate all
        this.windows.forEach(w => w.active = false);

        // Find next window (wrap around), skipping minimized
        let nextIndex = (activeIndex + 1) % this.windows.length;
        let attempts = 0;

        while (this.windows[nextIndex].minimized && attempts < this.windows.length) {
            nextIndex = (nextIndex + 1) % this.windows.length;
            attempts++;
        }

        // Activate and restore if minimized
        const nextWin = this.windows[nextIndex];
        nextWin.active = true;
        nextWin.minimized = false;

        // Move to end of array (bring to front)
        this.windows.splice(nextIndex, 1);
        this.windows.push(nextWin);

        return nextWin.id;
    }

    /**
     * Minimize all non-minimized windows and track them for restore
     * Returns array of window IDs that were minimized
     */
    minimizeAllForShowDesktop(): string[] {
        const toMinimize = this.windows.filter(w => !w.minimized).map(w => w.id);
        for (const id of toMinimize) {
            this.minimizeWindow(id);
        }
        return toMinimize;
    }

    /**
     * Restore windows by IDs (for show desktop toggle)
     */
    restoreWindows(windowIds: string[]): void {
        for (const id of windowIds) {
            const win = this.windows.find(w => w.id === id);
            if (win) {
                win.minimized = false;
            }
        }
    }

    // ============================================
    // DRAG & RESIZE STATE
    // ============================================

    /**
     * Start dragging a window
     */
    startDrag(windowId: string, offsetX: number, offsetY: number): void {
        this.dragState = { windowId, offsetX, offsetY };
        this.focusWindow(windowId);
    }

    /**
     * Handle drag movement
     * Returns new position { x, y } or null if not dragging
     */
    handleDrag(clientX: number, clientY: number): { windowId: string; x: number; y: number } | null {
        if (!this.dragState) return null;

        const win = this.windows.find(w => w.id === this.dragState!.windowId);
        if (!win) return null;

        win.x = clientX - this.dragState.offsetX;
        win.y = clientY - this.dragState.offsetY;

        return { windowId: this.dragState.windowId, x: win.x, y: win.y };
    }

    /**
     * Check for snap zones during drag
     */
    getSnapPreview(clientX: number, clientY: number): SnapState | null {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const usableH = h - 50; // Account for taskbar
        const halfH = usableH / 2;
        const halfW = w / 2;

        let snapRect = null;
        let snapType = '';

        // Corners & Edges
        if (clientY < this.SNAP_MARGIN) {
            if (clientX < this.SNAP_MARGIN) {
                snapType = 'top-left';
                snapRect = { x: 0, y: 0, width: halfW, height: halfH };
            } else if (clientX > w - this.SNAP_MARGIN) {
                snapType = 'top-right';
                snapRect = { x: halfW, y: 0, width: halfW, height: halfH };
            } else {
                snapType = 'maximize';
                snapRect = { x: 0, y: 0, width: w, height: usableH };
            }
        } else if (clientY > h - this.SNAP_MARGIN) {
            if (clientX < this.SNAP_MARGIN) {
                snapType = 'bottom-left';
                snapRect = { x: 0, y: halfH, width: halfW, height: halfH };
            } else if (clientX > w - this.SNAP_MARGIN) {
                snapType = 'bottom-right';
                snapRect = { x: halfW, y: halfH, width: halfW, height: halfH };
            }
        } else if (clientX < this.SNAP_MARGIN) {
            snapType = 'left';
            snapRect = { x: 0, y: 0, width: halfW, height: usableH };
        } else if (clientX > w - this.SNAP_MARGIN) {
            snapType = 'right';
            snapRect = { x: halfW, y: 0, width: halfW, height: usableH };
        }

        if (snapRect) {
            this.snapState = { type: snapType, rect: snapRect };
            return this.snapState;
        }

        this.snapState = null;
        return null;
    }

    /**
     * End drag and apply snap if present
     * Returns true if snap was applied
     */
    endDrag(): boolean {
        if (!this.dragState) {
            return false;
        }

        let snapped = false;

        if (this.snapState) {
            const win = this.windows.find(w => w.id === this.dragState!.windowId);
            if (win) {
                win.x = this.snapState.rect.x;
                win.y = this.snapState.rect.y;
                win.width = this.snapState.rect.width;
                win.height = this.snapState.rect.height;
                win.maximized = this.snapState.type === 'maximize';
                snapped = true;
            }
        }

        this.dragState = null;
        this.snapState = null;

        return snapped;
    }

    /**
     * Get current drag state
     */
    getDragState(): DragState | null {
        return this.dragState;
    }

    /**
     * Get current snap state
     */
    getSnapState(): SnapState | null {
        return this.snapState;
    }

    /**
     * Start resizing a window
     */
    startResize(windowId: string, dir: string, startX: number, startY: number): void {
        const win = this.windows.find(w => w.id === windowId);
        if (!win) return;

        this.resizeState = {
            windowId,
            dir,
            startX,
            startY,
            startW: win.width,
            startH: win.height,
            startXLoc: win.x,
            startYLoc: win.y
        };

        this.focusWindow(windowId);
    }

    /**
     * Handle resize movement
     * Returns new bounds or null if not resizing
     */
    handleResize(clientX: number, clientY: number): { windowId: string; x: number; y: number; width: number; height: number } | null {
        if (!this.resizeState) return null;

        const win = this.windows.find(w => w.id === this.resizeState!.windowId);
        if (!win) return null;

        const dx = clientX - this.resizeState.startX;
        const dy = clientY - this.resizeState.startY;
        const dir = this.resizeState.dir;

        if (dir.includes('e')) {
            win.width = Math.max(this.MIN_WIDTH, this.resizeState.startW + dx);
        }
        if (dir.includes('s')) {
            win.height = Math.max(this.MIN_HEIGHT, this.resizeState.startH + dy);
        }
        if (dir.includes('w')) {
            const newW = Math.max(this.MIN_WIDTH, this.resizeState.startW - dx);
            if (newW !== win.width) {
                win.x = this.resizeState.startXLoc + (this.resizeState.startW - newW);
                win.width = newW;
            }
        }
        if (dir.includes('n')) {
            const newH = Math.max(this.MIN_HEIGHT, this.resizeState.startH - dy);
            if (newH !== win.height) {
                win.y = this.resizeState.startYLoc + (this.resizeState.startH - newH);
                win.height = newH;
            }
        }

        return { windowId: this.resizeState.windowId, x: win.x, y: win.y, width: win.width, height: win.height };
    }

    /**
     * End resize operation
     */
    endResize(): void {
        this.resizeState = null;
    }

    /**
     * Get current resize state
     */
    getResizeState(): ResizeState | null {
        return this.resizeState;
    }

    /**
     * Check if currently dragging or resizing
     */
    isInteracting(): boolean {
        return this.dragState !== null || this.resizeState !== null;
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Get visible (non-minimized) windows
     */
    getVisibleWindows(): WindowState[] {
        return this.windows.filter(w => !w.minimized);
    }

    /**
     * Get minimized windows
     */
    getMinimizedWindows(): WindowState[] {
        return this.windows.filter(w => w.minimized);
    }

    /**
     * Check if any window with given prefix exists
     */
    hasWindowWithPrefix(prefix: string): boolean {
        return this.windows.some(w => w.id.startsWith(prefix));
    }

    /**
     * Get windows sorted by z-order (last = topmost)
     */
    getWindowsByZOrder(): WindowState[] {
        return [...this.windows];
    }

    /**
     * Clear all windows
     */
    clearAllWindows(): void {
        this.windows = [];
        this.dragState = null;
        this.resizeState = null;
        this.snapState = null;
    }
}
