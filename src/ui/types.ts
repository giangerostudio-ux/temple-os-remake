/**
 * Shared UI Component Types
 * Phase 3: UI Component Extraction
 */

// ============================================
// TASKBAR TYPES
// ============================================

export interface TaskbarItem {
    id: string;
    title: string;
    icon: string;
    active: boolean;
    minimized: boolean;
    appType?: string;
    windowCount?: number;
}

export interface X11WindowInfo {
    xidHex: string;
    title: string;
    appName?: string;
    wmClass?: string;
    iconUrl?: string;
    active: boolean;
    minimized: boolean;
}

export interface WorkspaceInfo {
    id: number;
    name: string;
    windowIds: string[];
}

export interface TaskbarCallbacks {
    onStartMenuClick: () => void;
    onAppClick: (launchKey: string, windowId?: string) => void;
    onAppContextMenu: (launchKey: string, x: number, y: number) => void;
    onX11Click: (xidHex: string) => void;
    onX11ContextMenu: (xidHex: string, x: number, y: number) => void;
    onWorkspaceClick: (workspaceId: number) => void;
    onTrayVolumeClick: () => void;
    onTrayNetworkClick: () => void;
    onTrayCalendarClick: () => void;
    onTrayNotificationClick: () => void;
}

export interface TaskbarState {
    showStartMenu: boolean;
    taskbarTransparent: boolean;
    taskbarAutoHide: boolean;
    volumeLevel: number;
    batteryStatus: { level: number; charging: boolean } | null;
    doNotDisturb: boolean;
    pinnedTaskbar: string[];
}

// ============================================
// DESKTOP TYPES
// ============================================

export interface DesktopIcon {
    id: string;
    key: string;
    label: string;
    icon: string;
    isShortcut: boolean;
}

export interface DesktopIconPosition {
    x: number;
    y: number;
}

export interface DesktopCallbacks {
    onIconClick: (key: string) => void;
    onIconDoubleClick: (key: string) => void;
    onIconContextMenu: (key: string, x: number, y: number) => void;
    onBackgroundContextMenu: (x: number, y: number) => void;
    onIconPositionChange: (key: string, x: number, y: number) => void;
    getLauncherDisplay: (key: string) => { icon: string; label: string } | null;
}

export interface DesktopState {
    iconSize: 'small' | 'large';
    autoArrange: boolean;
    iconPositions: Record<string, DesktopIconPosition>;
    shortcuts: Array<{ key: string; label: string }>;
    taskbarPosition: 'top' | 'bottom';
}

// ============================================
// CONTEXT MENU TYPES
// ============================================

export interface ContextMenuItem {
    label?: string;
    action?: () => void | Promise<void>;
    divider?: boolean;
    submenu?: ContextMenuItem[];
    disabled?: boolean;
    icon?: string;
}

export interface ContextMenuCallbacks {
    showExternalPopup?: (x: number, y: number, items: Array<{ id: string; label?: string; divider?: boolean }>) => Promise<{ success: boolean }>;
    closeExternalPopup?: () => Promise<{ success: boolean }>;
    onExternalAction?: (actionId: string) => void;
}

// ============================================
// UTILITY TYPES
// ============================================

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
