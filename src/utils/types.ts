// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FileEntry {
    name: string;
    isDirectory: boolean;
    path: string;
    size: number;
    modified: string | null;
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
    name: string;
    icon: string;
    exec: string;
    categories: string[];
    comment?: string;
    desktopFile?: string;
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
    currentResolution?: string;
    volumeLevel?: number;
    doNotDisturb?: boolean;
    lockTimeoutMs?: number;
    lockPassword?: string;
    lockPin?: string;
    network?: {
        vpnKillSwitchEnabled?: boolean;
        vpnKillSwitchMode?: 'auto' | 'strict';
        hotspotSSID?: string;
        hotspotPassword?: string;
        dataUsageDailyLimit?: number;
        dataUsageTrackingEnabled?: boolean;
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
    xterm: any | null; // Terminal from @xterm/xterm
    fitAddon: any | null; // FitAddon from @xterm/addon-fit
}

// Editor Tab State
export interface EditorTab {
    id: string;
    path: string | null;
    filename: string;
    content: string;
    modified: boolean;
    cursorPos?: number;
    cmState: any | null; // EditorState from @codemirror/state
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
