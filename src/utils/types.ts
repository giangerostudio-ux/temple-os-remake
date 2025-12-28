// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FileEntry {
    name: string;
    isDirectory: boolean;
    path: string;
    size: number;
    modified: string | null;
    isBookmark?: boolean;  // For sidebar bookmarks
}

// Extended file entry for sidebar items with bookmark flag
export interface SidebarFileEntry extends FileEntry {
    isBookmark?: boolean;
}

export interface SystemInfo {
    platform: string;
    hostname: string;
    uptime: number;
    memory: { total: number; free: number };
    cpus: number;
    user: string;
}

export interface MonitorStats {
    platform: string;
    hostname: string;
    uptime: number;
    loadavg: number[];
    cpuPercent: number | null;
    cpuCores: number;
    memory: { total: number; free: number; used: number };
    disk: { total: number; used: number; avail: number; percent: number | null } | null;
    network: { rxBps: number; txBps: number; rxBytes: number; txBytes: number } | null;
}

export interface BatteryStatus {
    present: boolean;
    percent: number | null;
    state: string;
    isCharging: boolean | null;
    timeToEmptySec: number | null;
    timeToFullSec: number | null;
    source?: string;
}

export interface ProcessInfo {
    pid: number;
    name: string;
    cpu: number;
    mem: number;
    rssKb: number;
    etime: string;
    command: string;
}

export interface InstalledApp {
    id?: string;
    name: string;
    genericName?: string;
    icon: string;
    iconPath?: string | null;
    iconUrl?: string | null;
    exec: string;
    categories: string[];
    keywords?: string[];
    comment?: string;
    desktopFile?: string;
    source?: 'user' | 'system' | 'snap' | 'flatpak-user' | 'flatpak-system' | string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    type: 'info' | 'warning' | 'error' | 'divine';
    actions?: Array<{ id: string; label: string }>;
}

export interface NetworkDeviceStatus {
    device: string;
    type: string;
    state: string;
    connection: string;
}

export interface VpnStatus {
    connected: boolean;
    device?: string;
    type?: string;
    connection?: string;
    state?: string;
}

export interface NetworkStatus {
    connected: boolean;
    device?: string;
    type?: string;
    connection?: string;
    ip4?: string | null;
    wifi?: { ssid: string; signal: number; security: string } | null;
    devices?: NetworkDeviceStatus[];
    vpn?: VpnStatus;
}

export interface WifiNetwork {
    inUse: boolean;
    ssid: string;
    signal: number;
    security: string;
}

export interface VeraCryptVolume {
    slot: number;
    source: string;
    mountPoint: string;
    mapper: string;
}

export interface FirewallRule {
    id: number;
    to: string;
    action: 'ALLOW' | 'DENY' | 'REJECT';
    from: string;
}

export interface AudioDevice {
    id: string;
    name: string;
    description?: string;
}

export interface MouseSettings {
    speed: number; // -1..1
    raw: boolean; // disable accel
    naturalScroll: boolean;
    dpi?: number;
}

export interface TempleConfig {
    wallpaperImage?: string;
    themeMode?: 'dark' | 'light';
    themeColor?: 'green' | 'amber' | 'cyan' | 'white';
    highContrast?: boolean;
    customThemes?: Array<{
        name: string;
        mainColor: string;
        bgColor: string;
        textColor: string;
        glowColor?: string;
    }>;
    activeCustomTheme?: string; // name of active custom theme, if any
    currentResolution?: string;
    volumeLevel?: number;
    doNotDisturb?: boolean;
    lockTimeoutMs?: number;
    lockPassword?: string;
    lockPin?: string;
    time?: {
        timezone?: string;
        autoTime?: boolean;
    };
    accessibility?: {
        largeText?: boolean;
        reduceMotion?: boolean;
        colorBlindMode?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
    };
    effects?: {
        jellyMode?: boolean;
        heavenlyPulse?: boolean;
        heavenlyPulseIntensity?: number;
    };
    network?: {
        vpnKillSwitchEnabled?: boolean;
        vpnKillSwitchMode?: 'auto' | 'strict';
        hotspotSSID?: string;
        hotspotPassword?: string;
        dataUsageDailyLimit?: number;
        dataUsageTrackingEnabled?: boolean;
        torMode?: 'off' | 'browser-only' | 'system-wide';
    };
    terminal?: {
        aliases?: Record<string, string>;
        promptTemplate?: string;
        uiTheme?: 'green' | 'cyan' | 'amber' | 'white';
        fontFamily?: string;
        fontSize?: number;
    };
    editor?: { wordWrap?: boolean };
    recentFiles?: string[];
    audio?: { defaultSink?: string | null; defaultSource?: string | null };
    mouse?: Partial<MouseSettings>;
    pinnedStart?: string[];
    pinnedTaskbar?: string[];
    desktopShortcuts?: Array<{ key: string; label: string }>;
    recentApps?: string[];
    appUsage?: Record<string, number>;
    fileBookmarks?: string[];
}

export interface WindowState {
    id: string;
    title: string;
    icon: string;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    active: boolean;
    minimized: boolean;
    maximized?: boolean;
    opened?: boolean;
    transparent?: boolean;
    alwaysOnTop?: boolean;
    savedBounds?: { x: number; y: number; width: number; height: number };
}

// Image Viewer State
export interface ImageViewerState {
    src: string;
    zoom: number;
    rotate: number;
    offsetX: number;
    offsetY: number;
    isDragging?: boolean;
    dragStartX?: number;
    dragStartY?: number;
    slideshow?: {
        active: boolean;
        interval: number;
        currentIndex: number;
        files: string[];
    };
    cropMode?: boolean;
    cropRect?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

// Terminal Tab State
export interface TerminalTab {
    id: string;
    ptyId: string | null;
    title: string;
    buffer: string[];
    cwd: string;
    xterm: import('@xterm/xterm').Terminal | null;
    fitAddon: import('@xterm/addon-fit').FitAddon | null;
    // Extended properties for UI management
    resizeObserver?: ResizeObserver;
    windowResizeHandler?: () => void;
}

// Editor Tab State
export interface EditorTab {
    id: string;
    path: string | null;
    filename: string;
    content: string;
    modified: boolean;
    cursorPos?: number;
    cmState: import('@codemirror/state').EditorState | null;
    revision: number;
    lastSavedRevision: number;
}

// Display Output State
export interface DisplayOutput {
    name: string;
    id?: number;
    active: boolean;
    scale: number;
    bounds?: { x: number; y: number; width: number; height: number };
    transform: string;
    currentMode: string;
    modes: Array<{ width: number; height: number; refreshHz: number | null }>;
}

// Bluetooth Device
export interface BluetoothDevice {
    name: string;
    connected: boolean;
    type: 'headphone' | 'phone' | 'mouse' | 'keyboard';
}

// Modal Dialog State
export interface ModalState {
    type: 'prompt' | 'confirm' | 'alert';
    title: string;
    message?: string;
    inputLabel?: string;
    inputValue?: string;
    placeholder?: string;
    password?: boolean;
    confirmText?: string;
    cancelText?: string;
}

// CPU History for graphing
export interface CPUHistoryPoint {
    timestamp: number;
    usage: number;
}

// Media Player State
export interface MediaPlayerState {
    playlist: string[];
    currentIndex: number;
    shuffle: boolean;
    repeat: 'none' | 'one' | 'all';
    equalizerPreset: 'flat' | 'rock' | 'pop' | 'techno';
    visualizerMode: 'bars' | 'wave' | 'circle';
    volume: number;
    isPlaying: boolean;
}

// Notification Action
export interface NotificationAction {
    id: string;
    label: string;
}

// Prompt Dialog Options
export interface PromptOptions {
    title: string;
    message?: string;
    inputLabel?: string;
    defaultValue?: string;
    placeholder?: string;
    password?: boolean;
    confirmText?: string;
    cancelText?: string;
}

// Confirm Dialog Options
export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
}

// Theme Color Type
export type ThemeColor = 'green' | 'amber' | 'cyan' | 'white';

// Theme Mode Type
export type ThemeMode = 'dark' | 'light';

// Desktop Icon Size Type
export type DesktopIconSize = 'small' | 'large';

// Notification Type
export type NotificationType = 'info' | 'warning' | 'error' | 'divine';

// Color Blind Mode Type
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

// Taskbar Position Type
export type TaskbarPosition = 'top' | 'bottom';

// Terminal UI Theme Type
export type TerminalUiTheme = 'green' | 'cyan' | 'amber' | 'white';

// Context Menu Item
export interface ContextMenuItem {
    label?: string;
    action?: () => void | Promise<void>;
    divider?: boolean;
    submenu?: ContextMenuItem[];
}

// Trash Entry
export interface TrashEntry {
    name: string;
    trashPath: string;
    originalPath: string;
    deletionDate: string;
    size: number;
    isDirectory: boolean;
}

// Saved Network Entry
export interface SavedNetwork {
    name: string;
    uuid: string;
    type: string;
    device: string;
}

// Snap Direction
export type SnapDirection = 'left' | 'right' | 'top' | 'bottom' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'maximize';

// Launcher View Type
export type LauncherView = 'all' | 'recent' | 'frequent';

// File Sort Key
export type FileSortKey = 'name' | 'size' | 'modified';

// Calculator Mode
export type CalculatorMode = 'basic' | 'scientific' | 'programmer';

// Calculator Base (matches Calculator.Base)
export type CalculatorBase = 'HEX' | 'DEC' | 'OCT' | 'BIN';

// Sprite Tool (matches main.ts property type)
export type SpriteTool = 'pencil' | 'eraser' | 'fill' | 'eyedropper';

// Equalizer Preset
export type EqualizerPreset = 'flat' | 'rock' | 'pop' | 'techno';

// Display Mode
export interface DisplayMode {
    width: number;
    height: number;
    refreshHz: number | null;
}

// Launcher Category Type
export type LauncherCategory = 'All' | 'Games' | 'Internet' | 'Office' | 'Multimedia' | 'Development' | 'System' | 'Utilities';

// Monitor Sort Key Type
export type MonitorSortKey = 'pid' | 'name' | 'cpu' | 'mem';

// Help Tab Type (matches HelpApp.currentTab)
export type HelpTab = 'guide' | 'shortcuts' | 'faq' | 'tribute' | 'about';

// Start Menu Category Type
export type StartMenuCategory = 'All' | 'Games' | 'Internet' | 'Office' | 'Multimedia' | 'Development' | 'System' | 'Utilities';

// Uninstall App Result Type
export interface UninstallResult {
    success: boolean;
    error?: string;
    needsPassword?: boolean;
    wrongPassword?: boolean;
    unsupported?: boolean;
}

// WebKit AudioContext type extension
export interface WebkitWindow extends Window {
    webkitAudioContext?: typeof AudioContext;
}

// GodlyNotes global function types
export interface GodlyNotesGlobals {
    createBoardPrompt: () => Promise<void>;
    switchBoard: (id: string) => void;
    deleteBoardPrompt: (id: string) => void;
    addNoteList: (title: string) => void;
    deleteNoteList: (id: string) => void;
    addNoteCard: (listId: string, content: string) => void;
    deleteNoteCard: (listId: string, cardId: string) => void;
    editNoteCardPrompt: (listId: string, cardId: string) => Promise<void>;
    renameBoardPrompt: (id: string, currentName: string) => Promise<void>;
    renameListPrompt: (id: string, currentTitle: string) => Promise<void>;
}

// Button with execution flag for command throttling
export interface ThrottledButton extends HTMLButtonElement {
    __executing?: boolean;
}

// Global window type augmentation
declare global {
    interface Window extends GodlyNotesGlobals {
        templeOS: unknown;  // TempleOS class instance
        webkitAudioContext?: typeof AudioContext;
    }
}

