// ============================================
// WORKSPACE MANAGER (Virtual Desktops)
// Tier 9.2 - Virtual Desktops Implementation
// ============================================

export interface Workspace {
    id: number;
    name: string;
    windowIds: string[];
}

export interface WorkspaceManagerState {
    workspaces: Workspace[];
    activeWorkspaceId: number;
    totalWorkspaces: number;
}

const DEFAULT_WORKSPACE_COUNT = 4;
const STORAGE_KEY = 'temple_workspaces';

export class WorkspaceManager {
    private workspaces: Workspace[] = [];
    private activeWorkspaceId: number = 1;
    private totalWorkspaces: number = DEFAULT_WORKSPACE_COUNT;
    private onChangeCallback: (() => void) | null = null;

    constructor() {
        this.initializeWorkspaces();
        this.loadFromStorage();
    }

    /**
     * Initialize default workspaces
     */
    private initializeWorkspaces(): void {
        this.workspaces = [];
        for (let i = 1; i <= this.totalWorkspaces; i++) {
            this.workspaces.push({
                id: i,
                name: `Desktop ${i}`,
                windowIds: []
            });
        }
        this.activeWorkspaceId = 1;
    }

    /**
     * Load workspace state from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const state: WorkspaceManagerState = JSON.parse(stored);
                if (state.workspaces && state.workspaces.length > 0) {
                    this.workspaces = state.workspaces;
                    this.activeWorkspaceId = state.activeWorkspaceId || 1;
                    this.totalWorkspaces = state.totalWorkspaces || DEFAULT_WORKSPACE_COUNT;
                }
            }
        } catch (e) {
            console.warn('Failed to load workspace state:', e);
        }
    }

    /**
     * Save workspace state to localStorage
     */
    private saveToStorage(): void {
        try {
            const state: WorkspaceManagerState = {
                workspaces: this.workspaces,
                activeWorkspaceId: this.activeWorkspaceId,
                totalWorkspaces: this.totalWorkspaces
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save workspace state:', e);
        }
    }

    /**
     * Set callback for workspace changes
     */
    public setOnChangeCallback(callback: () => void): void {
        this.onChangeCallback = callback;
    }

    /**
     * Get the currently active workspace ID
     */
    public getActiveWorkspaceId(): number {
        return this.activeWorkspaceId;
    }

    /**
     * Get all workspaces
     */
    public getWorkspaces(): Workspace[] {
        return [...this.workspaces];
    }

    /**
     * Get current workspace
     */
    public getActiveWorkspace(): Workspace {
        return this.workspaces.find(w => w.id === this.activeWorkspaceId) || this.workspaces[0];
    }

    /**
     * Get the total number of workspaces
     */
    public getTotalWorkspaces(): number {
        return this.totalWorkspaces;
    }

    /**
     * Switch to a specific workspace
     */
    public switchToWorkspace(workspaceId: number): boolean {
        if (workspaceId < 1 || workspaceId > this.totalWorkspaces) {
            return false;
        }
        if (this.activeWorkspaceId === workspaceId) {
            return false;
        }
        this.activeWorkspaceId = workspaceId;
        this.saveToStorage();
        this.triggerChange();
        return true;
    }

    /**
     * Switch to next workspace (wraps around)
     */
    public nextWorkspace(): void {
        const next = this.activeWorkspaceId >= this.totalWorkspaces ? 1 : this.activeWorkspaceId + 1;
        this.switchToWorkspace(next);
    }

    /**
     * Switch to previous workspace (wraps around)
     */
    public previousWorkspace(): void {
        const prev = this.activeWorkspaceId <= 1 ? this.totalWorkspaces : this.activeWorkspaceId - 1;
        this.switchToWorkspace(prev);
    }

    /**
     * Add a window to the current workspace
     */
    public addWindowToCurrentWorkspace(windowId: string): void {
        const workspace = this.getActiveWorkspace();
        if (!workspace.windowIds.includes(windowId)) {
            workspace.windowIds.push(windowId);
            this.saveToStorage();
        }
    }

    /**
     * Move a window to a specific workspace
     */
    public moveWindowToWorkspace(windowId: string, targetWorkspaceId: number): boolean {
        if (targetWorkspaceId < 1 || targetWorkspaceId > this.totalWorkspaces) {
            return false;
        }

        // Remove from all workspaces first
        for (const ws of this.workspaces) {
            ws.windowIds = ws.windowIds.filter(id => id !== windowId);
        }

        // Add to target workspace
        const targetWorkspace = this.workspaces.find(w => w.id === targetWorkspaceId);
        if (targetWorkspace) {
            targetWorkspace.windowIds.push(windowId);
            this.saveToStorage();
            this.triggerChange();
            return true;
        }
        return false;
    }

    /**
     * Remove a window from all workspaces (when closing)
     */
    public removeWindow(windowId: string): void {
        for (const ws of this.workspaces) {
            ws.windowIds = ws.windowIds.filter(id => id !== windowId);
        }
        this.saveToStorage();
    }

    /**
     * Check if a window is visible in the current workspace
     */
    public isWindowInCurrentWorkspace(windowId: string): boolean {
        const workspace = this.getActiveWorkspace();
        return workspace.windowIds.includes(windowId);
    }

    /**
     * Get all window IDs for the current workspace
     */
    public getCurrentWorkspaceWindowIds(): string[] {
        return this.getActiveWorkspace().windowIds;
    }

    /**
     * Set the number of workspaces (resets workspace assignments)
     */
    public setTotalWorkspaces(count: number): void {
        if (count < 1 || count > 10) return;

        this.totalWorkspaces = count;

        // Add new workspaces if needed
        while (this.workspaces.length < count) {
            this.workspaces.push({
                id: this.workspaces.length + 1,
                name: `Desktop ${this.workspaces.length + 1}`,
                windowIds: []
            });
        }

        // Remove excess workspaces (move windows to last valid workspace)
        if (this.workspaces.length > count) {
            const lastValidWorkspace = this.workspaces[count - 1];
            for (let i = count; i < this.workspaces.length; i++) {
                lastValidWorkspace.windowIds.push(...this.workspaces[i].windowIds);
            }
            this.workspaces = this.workspaces.slice(0, count);
        }

        // Ensure active workspace is valid
        if (this.activeWorkspaceId > count) {
            this.activeWorkspaceId = count;
        }

        this.saveToStorage();
        this.triggerChange();
    }

    /**
     * Rename a workspace
     */
    public renameWorkspace(workspaceId: number, name: string): boolean {
        const workspace = this.workspaces.find(w => w.id === workspaceId);
        if (workspace) {
            workspace.name = name || `Desktop ${workspaceId}`;
            this.saveToStorage();
            this.triggerChange();
            return true;
        }
        return false;
    }

    /**
     * Get workspace info for a specific window
     */
    public getWindowWorkspace(windowId: string): Workspace | null {
        for (const ws of this.workspaces) {
            if (ws.windowIds.includes(windowId)) {
                return ws;
            }
        }
        return null;
    }

    /**
     * Check if window is on all workspaces (sticky window)
     * Note: Sticky windows are handled separately in main.ts
     */
    public isWindowOnAllWorkspaces(windowId: string): boolean {
        return this.workspaces.every(ws => ws.windowIds.includes(windowId));
    }

    /**
     * Make a window appear on all workspaces
     */
    public makeWindowSticky(windowId: string): void {
        for (const ws of this.workspaces) {
            if (!ws.windowIds.includes(windowId)) {
                ws.windowIds.push(windowId);
            }
        }
        this.saveToStorage();
        this.triggerChange();
    }

    /**
     * Remove window from all workspaces except current
     */
    public makeWindowUnsticky(windowId: string): void {
        for (const ws of this.workspaces) {
            if (ws.id !== this.activeWorkspaceId) {
                ws.windowIds = ws.windowIds.filter(id => id !== windowId);
            }
        }
        this.saveToStorage();
        this.triggerChange();
    }

    private triggerChange(): void {
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
    }

    /**
     * Render workspace switcher UI for taskbar
     */
    public renderWorkspaceSwitcher(): string {
        const workspaces = this.workspaces.map(ws => {
            const isActive = ws.id === this.activeWorkspaceId;
            const hasWindows = ws.windowIds.length > 0;
            return `
        <div class="workspace-indicator ${isActive ? 'active' : ''} ${hasWindows ? 'has-windows' : ''}"
             data-workspace-id="${ws.id}"
             title="${ws.name} (${ws.windowIds.length} windows)">
          ${ws.id}
        </div>
      `;
        }).join('');

        return `
      <div class="workspace-switcher" title="Virtual Desktops (Ctrl+Win+Left/Right)">
        ${workspaces}
      </div>
    `;
    }

    /**
     * Render workspace overview overlay
     */
    public renderWorkspaceOverview(): string {
        return `
      <div class="workspace-overview-overlay" id="workspace-overview">
        <div class="workspace-overview-title">Virtual Desktops</div>
        <div class="workspace-overview-grid">
          ${this.workspaces.map(ws => {
            const isActive = ws.id === this.activeWorkspaceId;
            return `
              <div class="workspace-preview ${isActive ? 'active' : ''}" data-workspace-id="${ws.id}">
                <div class="workspace-preview-label">${ws.name}</div>
                <div class="workspace-preview-count">${ws.windowIds.length} window${ws.windowIds.length !== 1 ? 's' : ''}</div>
              </div>
            `;
        }).join('')}
        </div>
        <div class="workspace-overview-hint">Click to switch • Esc to close</div>
      </div>
    `;
    }
}

export default WorkspaceManager;
