/**
 * Taskbar Component
 * Phase 3: UI Component Extraction
 * 
 * Handles taskbar rendering including:
 * - Start button
 * - Workspace switcher
 * - Pinned apps and running windows
 * - X11 external windows
 * - System tray
 */

import type { TaskbarItem, X11WindowInfo, WorkspaceInfo, TaskbarCallbacks, TaskbarState } from './types';
import { escapeHtml } from './types';

// ============================================
// TASKBAR CLASS
// ============================================

export class Taskbar {
  private state: TaskbarState;
  private callbacks: TaskbarCallbacks;

  constructor(state: TaskbarState, callbacks: TaskbarCallbacks) {
    this.state = state;
    this.callbacks = callbacks;
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  updateState(newState: Partial<TaskbarState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): TaskbarState {
    return this.state;
  }

  getCallbacks(): TaskbarCallbacks {
    return this.callbacks;
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  /**
   * Render complete taskbar HTML
   */
  render(options: {
    startMenuHtml: string;
    workspaces: WorkspaceInfo[];
    activeWorkspaceId: number;
    windows: TaskbarItem[];
    x11Windows: X11WindowInfo[];
    getLauncherDisplay: (key: string) => { icon: string; label: string } | null;
    getWindowCountForWorkspace: (workspaceId: number) => number;
  }): string {
    const extraClasses = [
      this.state.taskbarTransparent ? 'taskbar-transparent' : ''
    ].filter(Boolean).join(' ');

    return `
      <div id="start-menu-container">${options.startMenuHtml}</div>
      <div class="taskbar ${extraClasses}">
        <button class="start-btn ${this.state.showStartMenu ? 'active' : ''}">TEMPLE</button>
        ${this.renderWorkspaceSwitcher(options.workspaces, options.activeWorkspaceId, options.getWindowCountForWorkspace)}
        <div class="taskbar-apps">
          ${this.renderTaskbarApps(options.windows, options.x11Windows, options.getLauncherDisplay)}
        </div>
        <div class="taskbar-tray">
          ${this.renderTray()}
        </div>
      </div>
    `;
  }

  // ============================================
  // WORKSPACE SWITCHER
  // ============================================

  private renderWorkspaceSwitcher(
    workspaces: WorkspaceInfo[],
    activeId: number,
    getWindowCount: (workspaceId: number) => number
  ): string {
    const indicators = workspaces.map(ws => {
      const isActive = ws.id === activeId;
      const windowCount = getWindowCount(ws.id);
      const hasWindows = windowCount > 0;
      return `
        <div class="workspace-indicator ${isActive ? 'active' : ''} ${hasWindows ? 'has-windows' : ''}"
             data-workspace-id="${ws.id}"
             title="${ws.name} (${windowCount} window${windowCount !== 1 ? 's' : ''})${isActive ? ' - Current' : ''}">
          ${ws.id}
        </div>
      `;
    }).join('');

    return `
      <div class="workspace-switcher" title="Virtual Desktops (Ctrl+Alt+Arrows)">
        ${indicators}
      </div>
    `;
  }

  // ============================================
  // TASKBAR APPS
  // ============================================

  private renderTaskbarApps(
    windows: TaskbarItem[],
    x11Windows: X11WindowInfo[],
    getLauncherDisplay: (key: string) => { icon: string; label: string } | null
  ): string {
    // Render pinned apps
    const pinned = this.state.pinnedTaskbar
      .slice(0, 20)
      .filter(k => !!getLauncherDisplay(k));

    const pinnedBuiltinIds = new Set(
      pinned
        .filter(k => k.startsWith('builtin:'))
        .map(k => k.slice('builtin:'.length))
    );

    // Pinned apps HTML with window counts
    const pinnedHtml = pinned.map(key => {
      const display = getLauncherDisplay(key);
      if (!display) return '';

      const builtinId = key.startsWith('builtin:') ? key.slice('builtin:'.length) : '';
      const appWindows = builtinId ? windows.filter(w => w.id.startsWith(builtinId)) : [];
      const windowCount = appWindows.length;
      const active = appWindows.some(w => w.active);
      const running = appWindows.some(w => !w.minimized);
      const countBadge = windowCount > 1 ? `<span class="taskbar-count-badge">${windowCount}</span>` : '';

      return `
        <div class="taskbar-app pinned ${active ? 'active' : ''} ${running ? 'running' : ''}" 
             data-launch-key="${escapeHtml(key)}" 
             data-app-type="${escapeHtml(builtinId)}"
             data-window-count="${windowCount}"
             title="${escapeHtml(display.label)}${windowCount > 1 ? ` (${windowCount} windows)` : ''}"
             tabindex="0" role="button" aria-label="${escapeHtml(display.label)}">
          <span class="taskbar-icon" aria-hidden="true">${display.icon}</span>
          <span class="taskbar-title">${escapeHtml(display.label)}</span>
          ${countBadge}
        </div>
      `;
    }).join('');

    // Group unpinned windows by app type
    const unpinnedWindows = windows.filter(w => {
      const appId = w.id.split('-')[0];
      return !pinnedBuiltinIds.has(appId);
    });

    const groupedWindows = new Map<string, TaskbarItem[]>();
    for (const w of unpinnedWindows) {
      const appType = w.id.split('-')[0];
      if (!groupedWindows.has(appType)) {
        groupedWindows.set(appType, []);
      }
      groupedWindows.get(appType)!.push(w);
    }

    // Render grouped unpinned windows
    const windowsHtml = Array.from(groupedWindows.entries()).map(([appType, group]) => {
      if (group.length === 1) {
        const w = group[0];
        return `
          <div class="taskbar-app ${w.active ? 'active' : ''} ${w.minimized ? 'minimized' : ''}" 
               data-taskbar-window="${w.id}" tabindex="0" role="button" aria-label="${w.title}">
            <span class="taskbar-icon">${w.icon}</span> 
            <span class="taskbar-title">${w.title}</span>
          </div>
        `;
      } else {
        const anyActive = group.some(w => w.active);
        const anyMinimized = group.every(w => w.minimized);
        const firstWindow = group[0];
        return `
          <div class="taskbar-app taskbar-group ${anyActive ? 'active' : ''} ${anyMinimized ? 'minimized' : ''}" 
               data-app-group="${appType}"
               data-window-count="${group.length}"
               tabindex="0" role="button" aria-label="${group.length} ${appType} windows">
            <span class="taskbar-icon">${firstWindow.icon}</span> 
            <span class="taskbar-title">${firstWindow.title.split(' ')[0]}</span>
            <span class="taskbar-count-badge" aria-hidden="true">${group.length}</span>
          </div>
        `;
      }
    }).join('');

    const sep = (pinnedHtml && windowsHtml) ? `<div class="taskbar-sep"></div>` : '';

    // Render X11 external windows
    const x11Html = this.renderX11Windows(x11Windows);
    const x11Sep = (pinnedHtml || windowsHtml) && x11Html ? `<div class="taskbar-sep"></div>` : '';

    return `${pinnedHtml}${sep}${windowsHtml}${x11Sep}${x11Html}`;
  }

  // ============================================
  // X11 WINDOWS
  // ============================================

  private renderX11Windows(x11Windows: X11WindowInfo[]): string {
    if (x11Windows.length === 0) return '';

    return x11Windows
      .filter(w => w && w.xidHex && (w.title || w.appName || w.wmClass))
      .slice(0, 10)
      .map(w => {
        const icon = w.iconUrl
          ? `<img class="taskbar-x11-icon" src="${escapeHtml(w.iconUrl)}" alt="" onerror="this.style.display='none'">`
          : `<span class="taskbar-icon-fallback">🖥️</span>`;
        const title = w.appName || w.title || w.wmClass || 'App';
        const shortTitle = title.length > 20 ? title.slice(0, 18) + '…' : title;
        return `
          <div class="taskbar-app taskbar-x11-app ${w.active ? 'active' : ''} ${w.minimized ? 'minimized' : ''}" 
               data-x11-xid="${escapeHtml(w.xidHex)}" 
               title="${escapeHtml(title)}"
               tabindex="0" role="button" aria-label="${escapeHtml(title)}">
            ${icon}
            <span class="taskbar-x11-title">${escapeHtml(shortTitle)}</span>
          </div>
        `;
      }).join('');
  }

  /**
   * Render just X11 windows HTML (for efficient partial updates)
   */
  renderX11WindowsOnly(x11Windows: X11WindowInfo[]): string {
    return this.renderX11Windows(x11Windows);
  }

  // ============================================
  // SYSTEM TRAY
  // ============================================

  private renderTray(): string {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    // Volume indicator
    const volumeIcon = this.state.volumeLevel === 0 ? '🔇' :
      this.state.volumeLevel < 30 ? '🔈' :
        this.state.volumeLevel < 70 ? '🔉' : '🔊';

    // Battery indicator (if supported)
    let batteryHtml = '';
    if (this.state.batteryStatus) {
      const level = this.state.batteryStatus.level;
      const charging = this.state.batteryStatus.charging;
      const batteryIcon = charging ? '🔌' : level < 20 ? '🪫' : '🔋';
      batteryHtml = `
        <div class="tray-item tray-battery" title="Battery: ${level}%${charging ? ' (Charging)' : ''}">
          ${batteryIcon} ${level}%
        </div>
      `;
    }

    // Notification indicator
    const notifIcon = this.state.doNotDisturb ? '🔕' : '🔔';

    return `
      <div class="tray-item tray-volume" title="Volume: ${this.state.volumeLevel}%">
        ${volumeIcon}
      </div>
      <div class="tray-item tray-network" title="Network">
        📶
      </div>
      ${batteryHtml}
      <div class="tray-item tray-notification" title="${this.state.doNotDisturb ? 'Do Not Disturb' : 'Notifications'}">
        ${notifIcon}
      </div>
      <div class="tray-item tray-clock" title="${dateStr}">
        <span class="tray-time">${timeStr}</span>
        <span class="tray-date">${dateStr}</span>
      </div>
    `;
  }

  /**
   * Get just the tray HTML (for clock updates)
   */
  renderTrayOnly(): string {
    return this.renderTray();
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createTaskbar(state: TaskbarState, callbacks: TaskbarCallbacks): Taskbar {
  return new Taskbar(state, callbacks);
}
