import './style.css';
import templeLogo from './assets/temple-logo.jpg';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentWithTab, defaultKeymap, undo, redo } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { cpp } from '@codemirror/lang-cpp';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';



// ============================================
// ELECTRON API TYPE DECLARATION
// ============================================
declare global {
  interface Window {
    electronAPI?: {
      // Filesystem
      readDir: (path: string) => Promise<{ success: boolean; entries?: FileEntry[]; error?: string }>;
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      deleteItem: (path: string) => Promise<{ success: boolean; error?: string }>;
      trashItem?: (path: string) => Promise<{ success: boolean; entry?: any; error?: string }>;
      listTrash?: () => Promise<{ success: boolean; entries?: any[]; error?: string }>;
      restoreTrash?: (trashPath: string, originalPath: string) => Promise<{ success: boolean; restored?: any; error?: string }>;
      deleteTrashItem?: (trashPath: string) => Promise<{ success: boolean; error?: string }>;
      emptyTrash?: () => Promise<{ success: boolean; error?: string }>;
      mkdir: (path: string) => Promise<{ success: boolean; error?: string }>;
      rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      copyItem?: (srcPath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
      getHome: () => Promise<string>;
      getAppPath: () => Promise<string>;
      openExternal: (path: string) => Promise<{ success: boolean; error?: string }>;
      // System
      shutdown: () => Promise<void>;
      restart: () => Promise<void>;
      lock: () => Promise<void>;
      getSystemInfo: () => Promise<SystemInfo>;
      getMonitorStats?: () => Promise<{ success: boolean; stats?: MonitorStats; error?: string }>;
      listProcesses?: () => Promise<{ success: boolean; processes?: ProcessInfo[]; unsupported?: boolean; error?: string }>;
      killProcess?: (pid: number, signal?: 'TERM' | 'KILL') => Promise<{ success: boolean; error?: string }>;
      setSystemVolume: (level: number) => Promise<void>;
      setResolution: (resolution: string) => Promise<{ success: boolean; backend?: string; error?: string }>;
      getResolutions: () => Promise<{ success: boolean; resolutions: string[]; current: string }>;
      // Config
      loadConfig?: () => Promise<{ success: boolean; config: any; error?: string }>;
      saveConfig?: (config: any) => Promise<{ success: boolean; error?: string }>;
      // Audio devices
      listAudioDevices?: () => Promise<{ success: boolean; sinks: any[]; sources: any[]; defaultSink: string | null; defaultSource: string | null; error?: string }>;
      setDefaultSink?: (sinkName: string) => Promise<{ success: boolean; error?: string }>;
      setDefaultSource?: (sourceName: string) => Promise<{ success: boolean; error?: string }>;
      setAudioVolume?: (level: number) => Promise<{ success: boolean; error?: string }>;
      // Network
      getNetworkStatus?: () => Promise<{ success: boolean; status?: any; error?: string }>;
      listWifiNetworks?: () => Promise<{ success: boolean; networks?: any[]; error?: string }>;
      connectWifi?: (ssid: string, password?: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      disconnectNetwork?: () => Promise<{ success: boolean; error?: string }>;
      getWifiEnabled?: () => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
      setWifiEnabled?: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      listSavedNetworks?: () => Promise<{ success: boolean; networks?: any[]; error?: string }>;
      connectSavedNetwork?: (nameOrUuid: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      forgetSavedNetwork?: (nameOrUuid: string) => Promise<{ success: boolean; error?: string }>;
      // Display
      getDisplayOutputs?: () => Promise<{ success: boolean; outputs?: any[]; backend?: string; error?: string }>;
      setDisplayMode?: (outputName: string, mode: string) => Promise<{ success: boolean; error?: string }>;
      setDisplayScale?: (outputName: string, scale: number) => Promise<{ success: boolean; error?: string }>;
      setDisplayTransform?: (outputName: string, transform: string) => Promise<{ success: boolean; error?: string }>;
      // Mouse / pointer
      applyMouseSettings?: (settings: any) => Promise<{ success: boolean; warnings?: string[]; error?: string }>;
      getMouseDpiInfo?: () => Promise<{ success: boolean; supported: boolean; devices?: Array<{ id: string; name: string }>; deviceId?: string; currentDpi?: number | null; dpiValues?: number[]; error?: string }>;
      setMouseDpi?: (deviceId: string | null, dpi: number) => Promise<{ success: boolean; error?: string }>;
      // Terminal
      execTerminal?: (command: string, cwd?: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>;
      // PTY Terminal
      createPty?: (options?: { cols?: number; rows?: number; cwd?: string }) => Promise<{ success: boolean; id?: string; error?: string }>;
      writePty?: (id: string, data: string) => Promise<{ success: boolean; error?: string }>;
      resizePty?: (id: string, cols: number, rows: number) => Promise<{ success: boolean; error?: string }>;
      destroyPty?: (id: string) => Promise<{ success: boolean; error?: string }>;
      isPtyAvailable?: () => Promise<{ success: boolean; available: boolean }>;
      onTerminalData?: (callback: (data: { id: string; data: string }) => void) => () => void;
      onTerminalExit?: (callback: (data: { id: string; exitCode: number }) => void) => () => void;
      // Holy Updater
      checkForUpdates: () => Promise<{ success: boolean; updatesAvailable?: boolean; behindCount?: number; error?: string }>;
      runUpdate: () => Promise<{ success: boolean; output?: string; message?: string; error?: string }>;
      // App Discovery (Start Menu)
      getInstalledApps: () => Promise<{ success: boolean; apps: InstalledApp[] }>;
      launchApp: (app: InstalledApp) => Promise<{ success: boolean; error?: string }>;
      // Window
      closeWindow: () => Promise<void>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      // Events
      onLockScreen?: (callback: () => void) => void;

    };
  }
}

interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  size: number;
  modified: string | null;
}

interface SystemInfo {
  platform: string;
  hostname: string;
  uptime: number;
  memory: { total: number; free: number };
  cpus: number;
  user: string;
}

interface MonitorStats {
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

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  rssKb: number;
  etime: string;
  command: string;
}

interface InstalledApp {
  name: string;
  icon: string;
  exec: string;
  categories: string[];
  comment?: string;
  desktopFile?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'divine';
  actions?: Array<{ id: string; label: string }>;
}

interface NetworkStatus {
  connected: boolean;
  device?: string;
  type?: string;
  connection?: string;
  ip4?: string | null;
  wifi?: { ssid: string; signal: number; security: string } | null;
}

interface WifiNetwork {
  inUse: boolean;
  ssid: string;
  signal: number;
  security: string;
}

interface AudioDevice {
  id: string;
  name: string;
  description?: string;
}

interface MouseSettings {
  speed: number; // -1..1
  raw: boolean; // disable accel
  naturalScroll: boolean;
  dpi?: number; // optional; requires ratbagd/libratbag-tools (ratbagctl)
}

interface TempleConfig {
  wallpaperImage?: string;
  themeMode?: 'dark' | 'light';
  currentResolution?: string;
  volumeLevel?: number;
  doNotDisturb?: boolean;
  lockTimeoutMs?: number;
  lockPassword?: string;
  lockPin?: string;
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
}

// ============================================
// FILE ICON HELPER
// ============================================
function getFileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return '📁';

  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    // Documents
    'txt': '📄', 'md': '📄', 'doc': '📄', 'docx': '📄', 'pdf': '📕',
    // Code
    'ts': '📜', 'js': '📜', 'py': '🐍', 'hc': '✝️', 'c': '📜', 'cpp': '📜', 'h': '📜',
    'html': '🌐', 'css': '🎨', 'json': '📋', 'xml': '📋',
    // Media
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
    'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵',
    'mp4': '🎬', 'mkv': '🎬', 'avi': '🎬', 'webm': '🎬',
    // Archives
    'zip': '📦', 'tar': '📦', 'gz': '📦', 'rar': '📦', '7z': '📦',
    // Executables
    'exe': '⚙️', 'sh': '⚙️', 'bin': '⚙️', 'AppImage': '⚙️',
  };

  return iconMap[ext] || '📄';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseName(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function ansiToHtml(line: string): string {
  // Minimal ANSI SGR support: 0 reset, 1 bold, 30-37/90-97 fg, 40-47/100-107 bg.
  const FG: Record<number, string> = {
    30: 'var(--tos-black)',
    31: 'var(--tos-red)',
    32: 'var(--tos-green)',
    33: 'var(--tos-yellow)',
    34: 'var(--tos-blue)',
    35: 'var(--tos-magenta)',
    36: 'var(--tos-cyan)',
    37: 'var(--tos-light-gray)',
    90: 'var(--tos-dark-gray)',
    91: 'var(--tos-light-red)',
    92: 'var(--tos-light-green)',
    93: 'var(--tos-yellow)',
    94: 'var(--tos-light-blue)',
    95: 'var(--tos-light-magenta)',
    96: 'var(--tos-light-cyan)',
    97: 'var(--tos-white)',
  };
  const BG: Record<number, string> = {
    40: 'var(--tos-black)',
    41: 'var(--tos-red)',
    42: 'var(--tos-green)',
    43: 'var(--tos-yellow)',
    44: 'var(--tos-blue)',
    45: 'var(--tos-magenta)',
    46: 'var(--tos-cyan)',
    47: 'var(--tos-light-gray)',
    100: 'var(--tos-dark-gray)',
    101: 'var(--tos-light-red)',
    102: 'var(--tos-light-green)',
    103: 'var(--tos-yellow)',
    104: 'var(--tos-light-blue)',
    105: 'var(--tos-light-magenta)',
    106: 'var(--tos-light-cyan)',
    107: 'var(--tos-white)',
  };

  let fg: string | null = null;
  let bg: string | null = null;
  let bold = false;

  const urlRe = /(https?:\/\/[^\s<>"']+)/g;

  const renderChunk = (text: string) => {
    if (!text) return '';
    const escaped = escapeHtml(text);
    const linked = escaped.replace(urlRe, (m) => {
      const safe = escapeHtml(m);
      return `<a class="terminal-link" data-url="${safe}">${safe}</a>`;
    });
    const style: string[] = [];
    if (fg) style.push(`color:${fg}`);
    if (bg) style.push(`background:${bg}`);
    if (bold) style.push('font-weight:700');
    if (style.length) return `<span style="${style.join(';')}">${linked}</span>`;
    return linked;
  };

  let out = '';
  let i = 0;
  let buf = '';
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\x1b' && line[i + 1] === '[') {
      // flush buffer
      out += renderChunk(buf);
      buf = '';
      const end = line.indexOf('m', i + 2);
      if (end === -1) break;
      const seq = line.slice(i + 2, end);
      const codes = seq.split(';').filter(Boolean).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
      if (codes.length === 0) codes.push(0);

      for (const c of codes) {
        if (c === 0) {
          fg = null; bg = null; bold = false;
        } else if (c === 1) {
          bold = true;
        } else if (FG[c]) {
          fg = FG[c];
        } else if (BG[c]) {
          bg = BG[c];
        } else if (c === 39) {
          fg = null;
        } else if (c === 49) {
          bg = null;
        }
      }

      i = end + 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  out += renderChunk(buf);
  return out;
}

// Bible verses for Word of God feature
const bibleVerses = [
  { text: "In the beginning God created the heaven and the earth.", ref: "Genesis 1:1" },
  { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "For God so loved the world, that he gave his only begotten Son.", ref: "John 3:16" },
  { text: "I can do all things through Christ which strengtheneth me.", ref: "Philippians 4:13" },
  { text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", ref: "Proverbs 3:5" },
  { text: "The fear of the LORD is the beginning of wisdom.", ref: "Proverbs 9:10" },
  { text: "Be strong and of a good courage; be not afraid.", ref: "Joshua 1:9" },
  { text: "And we know that all things work together for good to them that love God.", ref: "Romans 8:28" },
  { text: "Create in me a clean heart, O God; and renew a right spirit within me.", ref: "Psalm 51:10" },
  { text: "The LORD is my light and my salvation; whom shall I fear?", ref: "Psalm 27:1" },
];

// TempleOS authenticity helpers (Tier 4 terminal + Tier 5 apps will reuse these)
const oracleWordList = [
  'DIVINE', 'GLORY', 'TEMPLE', 'ALTAR', 'PROPHET', 'WISDOM', 'COVENANT', 'CHERUB', 'SERAPH', 'JUBILEE',
  'SABBATH', 'PSALM', 'GOSPEL', 'REVELATION', 'KINGDOM', 'RIGHTEOUS', 'HOLY', 'TRUTH', 'LIGHT', 'MERCY',
  'FAITH', 'GRACE', 'PEACE', 'JUDGMENT', 'BREAD', 'WATER', 'VINE', 'LAMB', 'CROWN', 'SWORD',
  'ORACLE', 'VISION', 'DREAM', 'VOICE', 'SIGN', 'SEAL', 'SCROLL', 'TRUMPET', 'THRONE', 'RIVER',
  'STONE', 'PILLAR', 'GATE', 'CITY', 'GARDEN', 'PATH', 'STAR', 'FIRE', 'WIND', 'CLOUD',
];

const terryQuotes = [
  'An idiot admires complexity, a genius admires simplicity.',
  'I like doing big things. It feels like a calling.',
  'The best programs are written when you are inspired.',
  'Keep it simple and it will work better.',
  'Computers are not about computers. They are about God.',
];

const prayers = [
  'Lord, grant me wisdom today, and keep my heart humble.',
  'Father, guide my steps and bless the work of my hands.',
  'God of peace, calm my mind and strengthen my faith.',
  'Lord Jesus Christ, have mercy on me and lead me in truth.',
  'Holy God, make me bold for good and gentle with others.',
];

const fortunes = [
  'Simplicity is divine.',
  'Write code as if you will read it in 10 years.',
  'A small, correct tool beats a large, broken one.',
  'Blessed are the curious; they debug with patience.',
  'Measure twice, cut once, and test always.',
];

interface WindowState {
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
  maximized: boolean;
  savedBounds?: { x: number; y: number; width: number; height: number };
}

class TempleOS {
  private windows: WindowState[] = [];
  private windowIdCounter = 0;
  private dragState: { windowId: string; offsetX: number; offsetY: number } | null = null;
  private snapState: { type: string; rect: { x: number; y: number; width: number; height: number } } | null = null;
  private resizeState: { windowId: string; dir: string; startX: number; startY: number; startW: number; startH: number; startXLoc: number; startYLoc: number } | null = null;

  // Tray State
  private showVolumePopup = false;
  private showCalendarPopup = false;
  private showNetworkPopup = false;
  private showNotificationPopup = false;
  private showStartMenu = false;
  private volumeLevel = 50;

  // Settings State
  private activeSettingsCategory = 'System';
  private wallpaperImage = './images/wallpaper.png'; // Default
  private themeMode = 'dark'; // 'dark' or 'light'
  private availableResolutions: string[] = ['1920x1080', '1280x720', '1024x768', '800x600'];
  private currentResolution = '1024x768';

  // File browser state
  private currentPath = '';
  private fileEntries: FileEntry[] = [];
  private trashEntries: Array<{ name: string; trashPath: string; originalPath: string; deletionDate: string; isDirectory: boolean; size: number }> = [];
  private fileSearchQuery = '';
  private fileSortMode: 'name' | 'size' | 'modified' = 'name';
  private fileSortDir: 'asc' | 'desc' = 'asc';
  private fileViewMode: 'grid' | 'list' = 'grid';
  private showHiddenFiles = false;
  private fileClipboard: { mode: 'copy' | 'cut'; srcPath: string } | null = null;
  private homePath: string | null = null;

  // Start Menu state
  private installedApps: InstalledApp[] = [];
  private startMenuSearchQuery = '';
  private startMenuCategory: 'All' | 'Games' | 'Internet' | 'Office' | 'Multimedia' | 'Development' | 'System' | 'Utilities' = 'All';
  private startMenuView: 'all' | 'recent' | 'frequent' = 'all';
  private recentApps: string[] = [];
  private appUsage: Record<string, number> = {};

  // App Launcher (full-screen overlay) state
  private showAppLauncher = false;
  private launcherSearchQuery = '';
  private launcherCategory: 'All' | 'Games' | 'Internet' | 'Office' | 'Multimedia' | 'Development' | 'System' | 'Utilities' = 'All';
  private launcherView: 'all' | 'recent' | 'frequent' = 'all';

  // Notifications State
  private notifications: Notification[] = [];
  private activeToasts: Notification[] = [];
  private recentNotificationKeyTimestamps = new Map<string, number>();


  private audioContext: AudioContext | null = null;
  private doNotDisturb = false;

  // Lock Screen State
  private isLocked = false;
  private lockInputMode: 'password' | 'pin' = 'password';

  private lockPassword = 'temple'; // User-configurable lock screen password (default: temple)
  private lockPin = '7777'; // User-configurable lock screen PIN (default: 7777)

  // Network State
  private networkStatus: NetworkStatus = { connected: false };
  private wifiNetworks: WifiNetwork[] = [];
  private networkLastError: string | null = null;
  private wifiEnabled = true;
  private savedNetworks: Array<{ name: string; uuid: string; type: string; device: string }> = [];

  // Audio Devices State
  private audioDevices: { sinks: AudioDevice[]; sources: AudioDevice[]; defaultSink: string | null; defaultSource: string | null } = {
    sinks: [],
    sources: [],
    defaultSink: null,
    defaultSource: null
  };
  private systemInfo: SystemInfo | null = null;

  // System Monitor State
  private monitorStats: MonitorStats | null = null;
  private monitorProcesses: ProcessInfo[] = [];
  private monitorQuery = '';
  private monitorSort: 'cpu' | 'mem' | 'name' | 'pid' = 'cpu';
  private monitorSortDir: 'asc' | 'desc' = 'desc';
  private monitorTimer: number | null = null;
  private monitorBusy = false;

  // Display State (multi-monitor, scale, refresh)
  private displayOutputs: Array<{ name: string; active: boolean; scale: number; transform: string; currentMode: string; modes: Array<{ width: number; height: number; refreshHz: number | null }> }> = [];
  private activeDisplayOutput: string | null = null;

  // Mouse / Pointer State
  private mouseSettings: MouseSettings = { speed: 0, raw: true, naturalScroll: false };
  private mouseDpiSupported = false;
  private mouseDpiValues: number[] = [400, 800, 1200, 1600, 2400, 3200];
  private mouseDpiDeviceId: string | null = null;

  // Pinned / shortcuts (Windows-like)
  private pinnedStart: string[] = ['builtin:terminal', 'builtin:files', 'builtin:settings', 'builtin:editor', 'builtin:hymns'];
  private pinnedTaskbar: string[] = ['builtin:files', 'builtin:terminal', 'builtin:settings'];
  private desktopShortcuts: Array<{ key: string; label: string }> = [];

  // Alt-Tab Overlay State
  private altTabOpen = false;
  private altTabIndex = 0;
  private altTabOrder: string[] = [];

  // Win+D Show Desktop toggle
  private showDesktopMode = false;
  private showDesktopRestoreIds: string[] = [];

  // Terminal State (basic shell exec)
  private terminalCwd = '';
  private terminalHistory: string[] = [];
  private terminalHistoryIndex = -1;
  private terminalBuffer: string[] = [];
  private terminalAliases: Record<string, string> = {};
  private terminalPromptTemplate = '{cwd}>';
  private terminalUiTheme: 'green' | 'cyan' | 'amber' | 'white' = 'green';
  private terminalFontFamily = '"VT323", monospace';
  private terminalFontSize = 18;
  private terminalSearchOpen = false;
  private terminalSearchQuery = '';
  private terminalSearchMatches: number[] = [];
  private terminalSearchMatchIndex = -1;
  private terminalSplitMode: 'single' | 'split-v' | 'split-h' = 'single';
  private terminalSplitSecondaryTabId: string | null = null;

  // Terminal Tabs State (PTY with xterm.js)
  private terminalTabs: Array<{
    id: string;
    ptyId: string | null;
    title: string;
    buffer: string[];
    cwd: string;
    xterm: Terminal | null;
    fitAddon: FitAddon | null;
  }> = [];
  private activeTerminalTab = 0;
  private ptySupported = false; // Set to true on Linux


  // Editor State

  private editorTabs: Array<{
    id: string;
    path: string | null;
    filename: string;
    content: string;
    modified: boolean;
    cursorPos?: number;
    cmState: EditorState | null;
    revision: number;
    lastSavedRevision: number;
  }> = [];
  private activeEditorTab = 0;
  private editorFindOpen = false;
  private editorFindQuery = '';
  private editorReplaceQuery = '';
  private editorFindMode: 'find' | 'replace' = 'find';
  private editorFindMatches: number[] = [];
  private editorFindCurrentMatch = -1;
  private editorView: EditorView | null = null;
  private editorViewTabId: string | null = null;
  private editorWordWrap = true;
  private editorRecentFiles: string[] = [];
  private editorAutosaveTimer: number | null = null;
  private readonly editorWrapCompartment = new Compartment();
  private readonly editorLanguageCompartment = new Compartment();

  // Config persistence
  private configSaveTimer: number | null = null;


  // Modal dialogs (replace browser prompt/confirm/alert)
  private modal:
    | {
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
    | null = null;
  private modalResolve: ((value: any) => void) | null = null;




  constructor() {
    this.init();
  }

  private init() {
    this.renderInitial();
    this.setupEventListeners();
    this.keepLegacyMethodsReferenced();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Electron main-process lock request
    if (window.electronAPI?.onLockScreen) {
      window.electronAPI.onLockScreen(() => this.lock());
    }

    // Hide boot screen after animation completes
    setTimeout(() => {
      const bootScreen = document.querySelector('.boot-screen') as HTMLElement;
      if (bootScreen) {
        bootScreen.style.display = 'none';
      }
    }, 4500);

    // Bootstrap async OS integration + persisted settings
    void this.bootstrap();
  }

  private keepLegacyMethodsReferenced(): void {
    // Keeps older implementations from triggering TS6133 while we transition to v2 UI.
    // (Safe: no execution, just references.)
    void this.renderNetworkPopup;
    void this.renderNotificationPopup;
    void this.getFileBrowserContent;
    void this.getSettingsContent;
    void this.cycleWindows;
    void this.handleTerminalCommand;
  }

  private async bootstrap(): Promise<void> {
    await this.loadResolutions();
    await this.loadInstalledApps();
    await this.loadConfig();
    await this.refreshMouseDpiInfo();
    await this.refreshDisplayOutputs();



    // Load initial state for system panels
    await this.refreshAudioDevices();
    await this.refreshNetworkStatus();
    await this.refreshWifiEnabled();
    await this.refreshSavedNetworks();
    await this.refreshSystemInfo();

    // Check PTY availability and setup listeners
    await this.checkPtySupport();
    this.setupPtyListeners();

    // Periodic refresh (Windows-like status panels)
    window.setInterval(() => void this.refreshNetworkStatus(), 10000);
    window.setInterval(() => void this.refreshAudioDevices(), 15000);
    window.setInterval(() => void this.refreshSystemInfo(), 30000);

    // Welcome Notification
    setTimeout(() => {
      this.showNotification('System Ready', 'TempleOS has started successfully.', 'divine', [
        { id: 'open-settings', label: 'Open Settings' }
      ]);
    }, 2000);
  }

  private async checkPtySupport(): Promise<void> {
    if (window.electronAPI?.isPtyAvailable) {
      const result = await window.electronAPI.isPtyAvailable();
      this.ptySupported = result.success && result.available;
      if (this.ptySupported) {
        console.log('PTY terminal support enabled');
      }
    }
  }


  // ============================================
  // NOTIFICATIONS SYSTEM
  // ============================================
  private showNotification(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'divine' = 'info',
    actions?: Array<{ id: string; label: string }>
  ) {
    const normalizedTitle = title.trim().toLowerCase();
    const normalizedMessage = message.trim().toLowerCase();

    // Suppress legacy debug spam (e.g. right-click/menu diagnostics).
    if (normalizedTitle === 'system' && (
      normalizedMessage === 'menu active' ||
      normalizedMessage === 'context menu active' ||
      normalizedMessage === 'start menu active'
    )) {
      return;
    }

    const now = Date.now();

    // De-dupe identical notifications arriving in a burst.
    const dedupeKey = `${type}\n${title}\n${message}`;
    const last = this.recentNotificationKeyTimestamps.get(dedupeKey);
    if (last && (now - last) < 800) return;
    this.recentNotificationKeyTimestamps.set(dedupeKey, now);

    // Prevent unbounded growth.
    if (this.recentNotificationKeyTimestamps.size > 200) {
      const it = this.recentNotificationKeyTimestamps.keys();
      for (let i = 0; i < 50; i++) {
        const k = it.next();
        if (k.done) break;
        this.recentNotificationKeyTimestamps.delete(k.value);
      }
    }

    const id = now.toString() + Math.random().toString(36).substr(2, 9);
    const notification: Notification = {
      id,
      title,
      message,
      timestamp: now,
      read: false,
      type,
      actions
    };

    // Add to history
    this.notifications.unshift(notification);

    if (!this.doNotDisturb) {
      // Add to active toasts
      this.activeToasts.push(notification);

      // Play sound
      this.playNotificationSound(type);

      // Auto dismiss toast after 5 seconds
      setTimeout(() => {
        this.activeToasts = this.activeToasts.filter(t => t.id !== id);
        this.render();
      }, 5000);
    }

    this.render();
  }

  private playNotificationSound(type: string) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // TempleOS style beeps
    const now = this.audioContext.currentTime;

    if (type === 'divine') {
      // Angelic chord
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      oscillator.start(now);
      oscillator.stop(now + 1.0);
    } else if (type === 'error') {
      // Error buzz
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(110, now);
      oscillator.frequency.linearRampToValueAtTime(55, now + 0.3);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else {
      // Standard beep
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
    }
  }

  private renderInitial() {
    const app = document.getElementById('app')!;
    app.innerHTML = `
      ${this.renderBootScreen()}
      <div class="desktop" id="desktop" style="background-image: url('${this.wallpaperImage}'); background-size: 100% 100%; background-position: center;">
        ${this.renderDesktopIcons()}
        <div id="windows-container"></div>
      </div>
      <div id="snap-preview" style="
        position: fixed;
        background: rgba(0, 255, 65, 0.15);
        border: 2px dashed #00ff41;
        border-radius: 8px;
        z-index: 9999;
        display: none;
        pointer-events: none;
       transition: all 0.1s;
       "></div>
       <div id="toast-container" class="toast-container"></div>
       <div id="alt-tab-overlay" class="alt-tab-overlay"></div>
       <div id="launcher-overlay-root" class="launcher-overlay-root"></div>
       <div id="modal-overlay" class="modal-overlay-root"></div>
       ${this.renderTaskbar()}
     `;
  }

  // Only update windows and taskbar, not the boot screen
  private render() {
    const windowsContainer = document.getElementById('windows-container')!;
    const taskbarApps = document.querySelector('.taskbar-apps')!;
    const toastContainer = document.getElementById('toast-container');
    const altTabContainer = document.getElementById('alt-tab-overlay');
    const launcherOverlayRoot = document.getElementById('launcher-overlay-root');
    const modalOverlay = document.getElementById('modal-overlay');

    // Update toasts
    if (toastContainer) {
      toastContainer.innerHTML = this.renderToasts();
    }

    if (altTabContainer) {
      altTabContainer.innerHTML = this.renderAltTabOverlay();
    }

    this.updateAppLauncherDom(launcherOverlayRoot);

    if (modalOverlay) {
      modalOverlay.innerHTML = this.renderModal();
    }

    // PRESERVE HEAVY DOM WINDOWS:
    // Keep xterm/audio alive across renders by detaching those window elements before
    // we overwrite the windows container, then re-attach afterwards.
    const preserved = new Map<string, HTMLElement>();
    const preserveById = (id: string | null | undefined) => {
      if (!id) return;
      const el = document.querySelector(`[data-window-id="${id}"]`) as HTMLElement | null;
      if (el) {
        preserved.set(id, el);
        el.remove();
      }
    };

    // Hymn player audio (keep playing even if a render happens)
    try {
      const audioEl = document.getElementById('hymn-audio') as HTMLAudioElement | null;
      if (audioEl && !audioEl.paused) {
        const wEl = audioEl.closest('.window') as HTMLElement | null;
        const wid = wEl?.dataset.windowId;
        // Only preserve if the window is arguably still "open" in our state
        if (wid && this.windows.some(w => w.id === wid)) {
          preserveById(wid);
        } else {
          // Window is closing/gone, but audio is playing.
          // Explicitly stop it to prevent "ghost audio" or zombie process
          audioEl.pause();
          audioEl.src = '';
          audioEl.load();
        }
      }
    } catch (e) {
      console.warn('Preservation error:', e);
    }

    // Terminal PTY/xterm (keep session DOM stable)
    if (this.ptySupported) {
      const termWin = this.windows.find(w => w.id.startsWith('terminal'));
      preserveById(termWin?.id);
    }

    // Editor (CodeMirror) (keep undo/redo + DOM stable)
    if (this.editorView) {
      const editorWin = this.windows.find(w => w.id.startsWith('editor'));
      preserveById(editorWin?.id);
    }

    // Update windows (only show non-minimized), EXCEPT preserved windows
    const windowsToRender = this.windows.filter(w => !w.minimized && !preserved.has(w.id));
    windowsContainer.innerHTML = windowsToRender.map(w => this.renderWindow(w)).join('');

    // Re-attach preserved windows (including minimized ones; keep them hidden but alive)
    for (const el of preserved.values()) {
      windowsContainer.appendChild(el);
    }

    // Ensure correct stacking order + bounds + active state for all present windows
    const presentOrder = this.windows.filter(w => !w.minimized || preserved.has(w.id));
    for (const w of presentOrder) {
      const el = windowsContainer.querySelector(`[data-window-id="${w.id}"]`) as HTMLElement | null;
      if (!el) continue;
      windowsContainer.appendChild(el);
      el.style.left = `${w.x}px`;
      el.style.top = `${w.y}px`;
      el.style.width = `${w.width}px`;
      el.style.height = `${w.height}px`;
      el.classList.toggle('active', !!w.active);
      el.style.display = w.minimized ? 'none' : 'flex';
    }

    // Update taskbar apps (pinned + running)
    taskbarApps.innerHTML = this.renderTaskbarAppsHtml();

    // Update tray
    const tray = document.querySelector('.taskbar-tray');
    if (tray) {
      tray.innerHTML = this.getTrayHTML();
    }

    // Update Start Menu
    const startMenuContainer = document.getElementById('start-menu-container');
    if (startMenuContainer) {
      startMenuContainer.innerHTML = this.renderStartMenu();
    }

    // Update Start Button State
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      if (this.showStartMenu) startBtn.classList.add('active');
      else startBtn.classList.remove('active');
    }
  }

  private renderBootScreen(): string {
    return `
      <div class="boot-screen">
        <div class="boot-logo">TEMPLE OS</div>
        <div class="boot-text studio">TempleOS Remake by Giangero Studio</div>
        <div class="boot-text">Initializing Divine Computing Environment...</div>
        <div class="boot-text">Loading HolyC Compiler v5.03...</div>
        <div class="boot-text">Mounting Virtual File System...</div>
        <div class="boot-text">Starting Window Manager...</div>
        <div class="boot-text">Connecting to the Word of God...</div>
        <div class="boot-text ready">System Ready. God's Temple Awaits.</div>
      </div>
    `;
  }

  // ============================================
  // MODALS (replace browser prompt/confirm/alert)
  // ============================================
  private renderModal(): string {
    if (!this.modal) return '';

    const isPrompt = this.modal.type === 'prompt';
    const showCancel = this.modal.type !== 'alert' && (this.modal.cancelText ?? 'Cancel');
    const confirmText = this.modal.confirmText ?? (this.modal.type === 'alert' ? 'OK' : 'Confirm');
    const cancelText = this.modal.cancelText ?? 'Cancel';

    return `
      <div class="modal-overlay-backdrop" style="
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
      ">
        <div class="modal-dialog" role="dialog" aria-modal="true" style="
          width: min(520px, 100%);
          background: rgba(13,17,23,0.98);
          border: 1px solid rgba(0,255,65,0.35);
          border-radius: 10px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.75);
          padding: 14px;
          font-family: 'VT323', monospace;
          color: #00ff41;
        ">
          <div style="display:flex; align-items:center; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
            <div style="font-size: 18px; color: #ffd700;">${escapeHtml(this.modal.title)}</div>
            <div style="font-size: 12px; opacity: 0.65;">TempleOS</div>
          </div>
          ${this.modal.message ? `<div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px; line-height: 1.2;">${escapeHtml(this.modal.message).replace(/\n/g, '<br>')}</div>` : ''}
          ${isPrompt ? `
            <div style="display:flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
              ${this.modal.inputLabel ? `<div style="font-size: 13px; opacity: 0.8;">${escapeHtml(this.modal.inputLabel)}</div>` : ''}
              <input class="modal-input" ${this.modal.password ? 'type="password"' : 'type="text"'} value="${escapeHtml(this.modal.inputValue || '')}" placeholder="${escapeHtml(this.modal.placeholder || '')}" style="
                width: 100%;
                background: rgba(0,255,65,0.08);
                border: 1px solid rgba(0,255,65,0.35);
                color: #00ff41;
                padding: 10px 12px;
                border-radius: 8px;
                outline: none;
                font-family: inherit;
                font-size: 16px;
              " />
            </div>
          ` : ''}
          <div style="display:flex; justify-content: flex-end; gap: 10px;">
            ${showCancel ? `<button class="modal-cancel" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 8px 12px; border-radius: 8px; cursor: pointer;">${escapeHtml(cancelText)}</button>` : ''}
            <button class="modal-confirm" style="background: #00ff41; border: 1px solid #00ff41; color: #000; padding: 8px 12px; border-radius: 8px; cursor: pointer;">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </div>
    `;
  }

  private openPromptModal(opts: { title: string; message?: string; inputLabel?: string; placeholder?: string; defaultValue?: string; password?: boolean; confirmText?: string; cancelText?: string }): Promise<string | null> {
    return new Promise((resolve) => {
      this.modalResolve?.(null);
      this.modalResolve = resolve;
      this.modal = {
        type: 'prompt',
        title: opts.title,
        message: opts.message,
        inputLabel: opts.inputLabel,
        placeholder: opts.placeholder,
        inputValue: opts.defaultValue ?? '',
        password: opts.password,
        confirmText: opts.confirmText ?? 'OK',
        cancelText: opts.cancelText ?? 'Cancel',
      };
      this.render();
      window.setTimeout(() => {
        const input = document.querySelector('.modal-input') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 10);
    });
  }

  private openConfirmModal(opts: { title: string; message?: string; confirmText?: string; cancelText?: string }): Promise<boolean> {
    return new Promise((resolve) => {
      this.modalResolve?.(false);
      this.modalResolve = resolve;
      this.modal = {
        type: 'confirm',
        title: opts.title,
        message: opts.message,
        confirmText: opts.confirmText ?? 'Confirm',
        cancelText: opts.cancelText ?? 'Cancel',
      };
      this.render();
    });
  }

  private openAlertModal(opts: { title: string; message?: string; confirmText?: string }): Promise<void> {
    return new Promise((resolve) => {
      this.modalResolve?.(undefined);
      this.modalResolve = resolve;
      this.modal = {
        type: 'alert',
        title: opts.title,
        message: opts.message,
        confirmText: opts.confirmText ?? 'OK',
      };
      this.render();
    });
  }

  private closeModal(result: any): void {
    const resolve = this.modalResolve;
    this.modalResolve = null;
    this.modal = null;
    this.render();
    if (resolve) resolve(result);
  }


  private renderVolumePopup() {
    return `
      <div class="tray-popup volume-popup" style="
        position: absolute; 
        bottom: 45px; /* Moved up slightly */
        left: -15px; 
        width: 50px; 
        height: 140px; 
        background: rgba(13,17,23,0.95); 
        border: 1px solid #00ff41; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.8);
        z-index: 10000; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        border-radius: 6px;
      ">
        <input type="range" class="volume-slider" min="0" max="100" value="${this.volumeLevel}" 
               style="
                 width: 100px; 
                 height: 20px; 
                 cursor: pointer;
                 transform: rotate(-90deg);
                 accent-color: #00ff41;
                 margin: 0;
               ">
      </div>
    `;
  }

  private renderCalendarPopup() {
    const now = new Date();
    return `
      <div class="tray-popup calendar-popup" style="
        position: absolute; 
        bottom: 40px; 
        right: 0; 
        width: 220px; 
        height: auto; 
        background: rgba(13,17,23,0.95); 
        border: 2px solid #00AA00; 
        z-index: 10000; 
        padding: 15px; 
        font-family: 'VT323', monospace; 
        color: #00ff00;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">
        <div style="text-align: center; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px; font-size: 18px;">
           ${now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div style="text-align: center; font-size: 42px; font-weight: bold; margin: 10px 0;">
           ${now.getDate()}
        </div>
         <div style="text-align: center; font-size: 14px; opacity: 0.8; margin-top: 10px; color: #ffd700;">
           Cannot have a bad day if looking at God's calendar.
        </div>
      </div>
    `;
  }

  private renderNetworkPopup() {
    return `
      <div class="tray-popup network-popup" style="
        position: absolute; 
        bottom: 40px; 
        right: 80px; 
        width: 200px; 
        background: rgba(13,17,23,0.95); 
        border: 2px solid #00ff41; 
        z-index: 10000; 
        padding: 10px; 
        font-family: 'VT323', monospace; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">
        <div style="border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 5px; font-weight: bold; color: #00ff41;">
          Network Connections
        </div>
        <div style="display: flex; align-items: center; gap: 10px; padding: 5px; background: rgba(0,255,65,0.1); border-radius: 4px;">
          <span>ðŸ“¶</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: bold;">TempleNet_5G</span>
            <span style="font-size: 12px; color: #bbb;">Connected, Secure</span>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #888; text-align: center;">
          Divine Signal Strength: 100%
        </div>
      </div>
    `;
  }

  private renderNetworkPopupV2() {
    const connected = this.networkStatus.connected;
    const ssid = this.networkStatus.wifi?.ssid;
    const signal = this.networkStatus.wifi?.signal ?? 0;
    const ip = this.networkStatus.ip4;

    const networks = this.wifiNetworks.slice(0, 8).map(n => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px; border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; background: ${n.inUse ? 'rgba(0,255,65,0.15)' : 'rgba(0,0,0,0.2)'};">
        <div style="min-width: 0; display: flex; flex-direction: column;">
          <div style="font-weight: bold; color: ${n.inUse ? '#ffd700' : '#00ff41'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.ssid}</div>
          <div style="font-size: 12px; opacity: 0.8;">${n.security ? 'Secured' : 'Open'} ΓÇó ${n.signal}%</div>
        </div>
        ${n.inUse ? `
          <button class="net-btn" data-net-action="disconnect" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 8px; border-radius: 6px; cursor: pointer;">Disconnect</button>
        ` : `
          <button class="net-btn" data-net-action="connect" data-ssid="${n.ssid}" data-sec="${n.security}" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 8px; border-radius: 6px; cursor: pointer;">Connect</button>
        `}
      </div>
    `).join('');

    return `
      <div class="tray-popup network-popup" style="
        position: absolute;
        bottom: 40px;
        right: 80px;
        width: 320px;
        background: rgba(13,17,23,0.96);
        border: 2px solid #00ff41;
        z-index: 10000;
        padding: 10px;
        font-family: 'VT323', monospace;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,255,65,0.2); padding-bottom: 6px; margin-bottom: 10px; font-weight: bold; color: #00ff41;">
          <span>Network</span>
          <div style="display: flex; gap: 8px;">
            <button class="net-btn" data-net-action="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 6px; cursor: pointer;">Refresh</button>
            <button class="net-btn" data-net-action="open-settings" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 6px; cursor: pointer;">Settings</button>
          </div>
        </div>

        <div style="padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: rgba(0,255,65,0.08); margin-bottom: 10px;">
          <div style="font-weight: bold; color: #ffd700;">${connected ? (ssid || this.networkStatus.connection || 'Connected') : 'Disconnected'}</div>
          <div style="font-size: 12px; opacity: 0.85;">${connected ? `${this.networkStatus.type || 'network'}${ip ? ` ΓÇó IP ${ip}` : ''}${ssid ? ` ΓÇó ${signal}%` : ''}` : (this.networkLastError ? this.networkLastError : 'Not connected')}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow: auto;">
          ${window.electronAPI?.listWifiNetworks ? (networks || '<div style="opacity: 0.6;">No Wi-Fi networks found.</div>') : '<div style="opacity: 0.6;">Network controls require Electron/Linux.</div>'}
        </div>
      </div>
    `;
  }

  private renderNotificationPopup() {
    return `
      <div class="tray-popup notification-popup" style="
        position: absolute; 
        bottom: 40px; 
        right: 40px; 
        width: 300px;
        max-height: 400px;
        overflow-y: auto; 
        background: rgba(13,17,23,0.95); 
        border: 2px solid #ffd700; 
        z-index: 10000; 
        padding: 10px; 
        font-family: 'VT323', monospace; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">
      ">
        <div style="border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 5px; font-weight: bold; color: #ffd700; display: flex; justify-content: space-between; align-items: center;">
          <span>Notifications</span>
          <button class="dnd-btn" style="background: none; border: none; cursor: pointer; font-size: 16px;" title="${this.doNotDisturb ? 'Turn OFF Do Not Disturb' : 'Turn ON Do Not Disturb'}">
            ${this.doNotDisturb ? '≡ƒöò' : '≡ƒöö'}
          </button>
        </div>
        <div style="padding: 5px; color: #fff;">
          ${this.notifications.length === 0 ? `
            <div style="text-align: center; margin: 20px 0;">
              <div style="font-size: 14px; margin-bottom: 5px;">No new earthly notifications.</div>
              <div style="font-size: 12px; color: #00ff41; font-style: italic;">"Be still, and know that I am God."</div>
            </div>
          ` : this.notifications.map(n => `
            <div class="notification-item ${!n.read ? 'unread' : ''}">
              <div style="font-weight: bold; color: ${this.getNotificationColor(n.type)}">${n.title}</div>
              <div style="font-size: 14px;">${n.message}</div>
              <span class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderNotificationPopupV2() {
    const unread = this.notifications.filter(n => !n.read).length;
    return `
      <div class="tray-popup notification-popup" style="
        position: absolute;
        bottom: 40px;
        right: 40px;
        width: 320px;
        max-height: 420px;
        overflow-y: auto;
        background: rgba(13,17,23,0.96);
        border: 2px solid #ffd700;
        z-index: 10000;
        padding: 10px;
        font-family: 'VT323', monospace;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">
        <div style="border-bottom: 1px solid rgba(255,215,0,0.25); padding-bottom: 6px; margin-bottom: 10px; font-weight: bold; color: #ffd700; display: flex; justify-content: space-between; align-items: center;">
          <span>Notifications ${unread ? `(${unread})` : ''}</span>
          <button class="dnd-btn" style="background: none; border: none; cursor: pointer; font-size: 16px;" title="${this.doNotDisturb ? 'Turn OFF Do Not Disturb' : 'Turn ON Do Not Disturb'}">
            ${this.doNotDisturb ? '≡ƒöò' : '≡ƒöö'}
          </button>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <button class="notif-btn" data-notif-action="mark-all-read" style="flex: 1; background: none; border: 1px solid rgba(255,215,0,0.35); color: #ffd700; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Mark all read</button>
          <button class="notif-btn" data-notif-action="clear" style="flex: 1; background: none; border: 1px solid rgba(255,215,0,0.35); color: #ffd700; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Clear</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; color: #fff;">
          ${this.notifications.length === 0 ? `
            <div style="text-align: center; padding: 20px 10px; opacity: 0.8;">
              <div style="font-size: 14px; margin-bottom: 5px;">No notifications.</div>
              <div style="font-size: 12px; color: #00ff41; font-style: italic;">"Be still, and know that I am God."</div>
              <div style="font-size: 11px; opacity: 0.7;">Psalm 46:10</div>
            </div>
          ` : this.notifications.slice(0, 25).map(n => `
            <div class="notification-item ${!n.read ? 'unread' : ''}" data-notif-id="${n.id}" style="cursor: pointer;">
              <div style="font-weight: bold; color: ${this.getNotificationColor(n.type)}">${n.title}</div>
              <div style="font-size: 14px;">${n.message}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</span>
                <button class="notif-btn" data-notif-action="dismiss" data-notif-id="${n.id}" style="background: none; border: 1px solid rgba(255,215,0,0.25); color: #ffd700; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">Dismiss</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderToasts() {
    if (this.activeToasts.length === 0) return '';

    return this.activeToasts.map(toast => `
      <div class="toast ${toast.type}" data-toast-id="${toast.id}">
        <div class="toast-header">
          <span style="color: ${this.getNotificationColor(toast.type)}">${toast.title}</span>
          <button class="toast-close" data-toast-action="dismiss" data-toast-id="${toast.id}" style="background: none; border: none; font: inherit;">x</button>
        </div>
        <div class="toast-body">${toast.message}</div>
        ${toast.actions && toast.actions.length ? `
          <div style="display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end;">
            ${toast.actions.map(a => `
              <button class="toast-action-btn" data-toast-action="action" data-toast-id="${toast.id}" data-action-id="${a.id}" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px;">${a.label}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  private getNotificationColor(type: string): string {
    switch (type) {
      case 'divine': return '#00ff41';
      case 'error': return '#ff0000';
      case 'warning': return '#ffff00';
      default: return '#fff';
    }
  }

  private formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private renderDesktopIcons(): string {
    const icons = [
      { id: 'terminal', icon: '💻', label: 'Terminal' },
      { id: 'word-of-god', icon: '✝️', label: 'Word of God' },
      { id: 'files', icon: '📁', label: 'Files' },
      { id: 'editor', icon: '📝', label: 'HolyC Editor' },
      { id: 'hymns', icon: '🎵', label: 'Hymn Player' },
      { id: 'updater', icon: '⬇️', label: 'Holy Updater' },
    ];

    const builtinKeys = new Set(icons.map(i => `builtin:${i.id}`));
    const shortcutIcons = this.desktopShortcuts
      .filter(s => s && typeof s.key === 'string' && typeof s.label === 'string' && !builtinKeys.has(s.key))
      .slice(0, 48)
      .map(s => {
        const display = this.launcherDisplayForKey(s.key);
        return {
          key: s.key,
          icon: display?.icon || '≡ƒôä',
          label: s.label
        };
      });

    return [
      ...icons.map(icon => `
      <div class="desktop-icon" data-app="${icon.id}">
        <span class="icon">${icon.icon}</span>
        <span class="label">${icon.label}</span>
      </div>
    `),
      ...shortcutIcons.map(s => `
      <div class="desktop-icon" data-launch-key="${escapeHtml(s.key)}">
        <span class="icon">${s.icon}</span>
        <span class="label">${escapeHtml(s.label)}</span>
      </div>
    `)
    ].join('');
  }

  private renderWindow(win: WindowState): string {
    return `
      <div class="window ${win.active ? 'active' : ''}" 
           data-window-id="${win.id}"
           style="left: ${win.x}px; top: ${win.y}px; width: ${win.width}px; height: ${win.height}px;">
        <!-- Resize Handles -->
        <div class="resize-handle n" data-resize-dir="n" data-window="${win.id}"></div>
        <div class="resize-handle e" data-resize-dir="e" data-window="${win.id}"></div>
        <div class="resize-handle s" data-resize-dir="s" data-window="${win.id}"></div>
        <div class="resize-handle w" data-resize-dir="w" data-window="${win.id}"></div>
        <div class="resize-handle nw" data-resize-dir="nw" data-window="${win.id}"></div>
        <div class="resize-handle ne" data-resize-dir="ne" data-window="${win.id}"></div>
        <div class="resize-handle sw" data-resize-dir="sw" data-window="${win.id}"></div>
        <div class="resize-handle se" data-resize-dir="se" data-window="${win.id}"></div>

        <div class="window-header" data-draggable="${win.id}">
          <div class="window-title">
            <span>${win.icon}</span>
            <span>${win.title}</span>
          </div>
          <div class="window-controls">
            <button class="window-btn minimize" data-action="minimize" data-window="${win.id}"></button>
            <button class="window-btn maximize" data-action="maximize" data-window="${win.id}"></button>
            <button class="window-btn close" data-action="close" data-window="${win.id}"></button>
          </div>
        </div>
        <div class="window-content">
          ${win.content}
        </div>
      </div>
    `;
  }

  private renderTaskbar(): string {
    return `
      <div id="start-menu-container">${this.renderStartMenu()}</div>
      <div class="taskbar">
        <button class="start-btn ${this.showStartMenu ? 'active' : ''}">TEMPLE</button>
        <div class="taskbar-apps">
          ${this.renderTaskbarAppsHtml()}
        </div>
        <div class="taskbar-tray">
          ${this.getTrayHTML()}
        </div>
      </div>`;
  }

  private renderTaskbarAppsHtml(): string {
    const pinned = this.pinnedTaskbar
      .slice(0, 20)
      .filter(k => !!this.launcherDisplayForKey(k));

    const pinnedBuiltinIds = new Set(
      pinned
        .filter(k => k.startsWith('builtin:'))
        .map(k => k.slice('builtin:'.length))
    );

    const pinnedHtml = pinned.map(key => {
      const display = this.launcherDisplayForKey(key);
      if (!display) return '';
      const builtinId = key.startsWith('builtin:') ? key.slice('builtin:'.length) : '';
      const active = builtinId ? !!this.windows.find(w => w.active && w.id.startsWith(builtinId)) : false;
      const running = builtinId ? !!this.windows.find(w => w.id.startsWith(builtinId) && !w.minimized) : false;
      return `
        <div class="taskbar-app pinned ${active ? 'active' : ''} ${running ? 'running' : ''}" data-launch-key="${escapeHtml(key)}" title="${escapeHtml(display.label)}">
          <span class="taskbar-icon">${display.icon}</span>
          <span class="taskbar-title">${escapeHtml(display.label)}</span>
        </div>
      `;
    }).join('');

    const unpinnedWindows = this.windows.filter(w => {
      const appId = w.id.split('-')[0];
      return !pinnedBuiltinIds.has(appId);
    });

    const windowsHtml = unpinnedWindows.map(w => `
      <div class="taskbar-app ${w.active ? 'active' : ''} ${w.minimized ? 'minimized' : ''}" data-taskbar-window="${w.id}">
        ${w.icon} ${w.title}
      </div>
    `).join('');

    const sep = (pinnedHtml && windowsHtml) ? `<div class="taskbar-sep"></div>` : '';
    return `${pinnedHtml}${sep}${windowsHtml}`;
  }

  private getTrayHTML(): string {
    return `
      <div class="tray-icon" id="tray-network" title="Network: ${this.networkStatus.connected ? (this.networkStatus.wifi?.ssid || this.networkStatus.connection || 'Connected') : 'Disconnected'}" style="position: relative; color: ${this.networkStatus.connected ? '#00ff41' : '#888'};">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
          <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
        ${this.showNetworkPopup ? this.renderNetworkPopupV2() : ''}
      </div>
      
      <div class="tray-icon" id="tray-volume" title="Volume: ${this.volumeLevel}%" style="position: relative;">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
           <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
         </svg>
         ${this.showVolumePopup ? this.renderVolumePopup() : ''}
      </div>

      <div class="tray-icon" id="tray-notification" title="Notifications" style="position: relative;">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
           <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
         </svg>
         ${this.showNotificationPopup ? this.renderNotificationPopupV2() : ''}
       </div>
 


      <div class="taskbar-clock" id="clock-container" style="cursor: pointer; position: relative;">
        <span id="clock-text">${this.formatTime()}</span>
        ${this.showCalendarPopup ? this.renderCalendarPopup() : ''}
      </div>
    `;
  }

  // ============================================
  // START MENU
  // ============================================
  private renderStartMenu(): string {
    if (!this.showStartMenu) return '';

    // Built-in pinned apps
    const legacyPinnedApps = [
      { id: 'terminal', icon: '💻', name: 'Terminal' },
      { id: 'word-of-god', icon: '✝️', name: 'Word of God' },
      { id: 'files', icon: '📁', name: 'Files' },
      { id: 'editor', icon: '📝', name: 'HolyC Editor' },
      { id: 'hymns', icon: '🎵', name: 'Hymn Player' },
      { id: 'settings', icon: '⚙️', name: 'Settings' },
    ];

    const pinnedAppsView = (this.pinnedStart.length ? this.pinnedStart : legacyPinnedApps.map(a => `builtin:${a.id}`))
      .slice(0, 24)
      .map(key => {
        const display = this.launcherDisplayForKey(key);
        if (!display) return null;
        return { key, icon: display.icon, name: display.label };
      })
      .filter(Boolean) as Array<{ key: string; icon: string; name: string }>;

    // Filter installed apps based on search query
    const query = this.startMenuSearchQuery.toLowerCase();

    const getCategory = (app: InstalledApp): typeof this.startMenuCategory => {
      const cats = (app.categories || []).map(c => c.toLowerCase());
      const name = app.name.toLowerCase();
      if (cats.some(c => c.includes('game')) || name.includes('steam')) return 'Games';
      if (cats.some(c => c.includes('network') || c.includes('internet') || c.includes('webbrowser')) || name.includes('browser')) return 'Internet';
      if (cats.some(c => c.includes('office'))) return 'Office';
      if (cats.some(c => c.includes('audio') || c.includes('video') || c.includes('graphics') || c.includes('multimedia'))) return 'Multimedia';
      if (cats.some(c => c.includes('development') || c.includes('ide') || c.includes('programming'))) return 'Development';
      if (cats.some(c => c.includes('system') || c.includes('settings'))) return 'System';
      return 'Utilities';
    };

    const keyForInstalled = (app: InstalledApp): string => this.keyForInstalledApp(app);

    const searchFiltered = (apps: InstalledApp[]) =>
      apps.filter(app =>
        app.name.toLowerCase().includes(query) ||
        app.comment?.toLowerCase().includes(query) ||
        app.categories.some(c => c.toLowerCase().includes(query))
      );

    let filteredApps: InstalledApp[] = [];
    if (query) {
      filteredApps = searchFiltered(this.installedApps);
    } else if (this.startMenuView === 'recent') {
      const map = new Map(this.installedApps.map(a => [keyForInstalled(a), a] as const));
      filteredApps = this.recentApps.map(k => map.get(k)).filter(Boolean) as InstalledApp[];
    } else if (this.startMenuView === 'frequent') {
      filteredApps = this.installedApps
        .map(a => ({ a, score: this.appUsage[keyForInstalled(a)] || 0 }))
        .filter(x => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .map(x => x.a);
    } else {
      filteredApps = this.startMenuCategory === 'All'
        ? this.installedApps.slice()
        : this.installedApps.filter(a => getCategory(a) === this.startMenuCategory);
    }

    if (!query) filteredApps = filteredApps.slice(0, 30);

    return `
      <div class="start-menu">
        <div class="start-menu-left">
          <div class="start-search-container">
            <div class="start-search-row">
              <input type="text" class="start-search-input" placeholder="🔍 Search apps..." value="${escapeHtml(this.startMenuSearchQuery)}">
              <button class="start-all-apps-btn" data-start-action="launcher" title="Open App Launcher (Super+A)">▦ All Apps</button>
            </div>
          </div>

          <div style="display: flex; gap: 10px; padding: 0 20px 10px 20px;">
            <select class="start-view-select" style="flex: 1; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.25); color: #00ff41; padding: 8px 10px; border-radius: 8px; font-family: inherit;">
              <option value="all" ${this.startMenuView === 'all' ? 'selected' : ''}>All apps</option>
              <option value="recent" ${this.startMenuView === 'recent' ? 'selected' : ''}>Recent</option>
              <option value="frequent" ${this.startMenuView === 'frequent' ? 'selected' : ''}>Frequently used</option>
            </select>
            <select class="start-category-select" style="flex: 1; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.25); color: #00ff41; padding: 8px 10px; border-radius: 8px; font-family: inherit;" ${this.startMenuView === 'all' ? '' : 'disabled'}>
              ${(['All', 'Games', 'Internet', 'Office', 'Multimedia', 'Development', 'System', 'Utilities'] as const).map(c => `<option value="${c}" ${this.startMenuCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          ${!query ? `
          <div class="start-section">
            <h3>Pinned</h3>
            <div class="start-pinned-grid">
              ${pinnedAppsView.map(app => `
                <div class="start-app-item pinned" data-launch-key="${escapeHtml(app.key)}">
                  <span class="app-icon">${app.icon}</span>
                  <span class="app-name">${escapeHtml(app.name)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="start-section">
            <h3>${query ? `Results for "${query}"` : 'All Apps'}</h3>
            <div class="start-apps-list">
              ${filteredApps.length === 0 ? `
                <div class="start-no-results">No apps found</div>
              ` : filteredApps.map(app => `
                <div class="start-app-item installed" data-launch-key="${escapeHtml(keyForInstalled(app))}" data-installed-app='${JSON.stringify({ name: app.name, exec: app.exec, desktopFile: app.desktopFile })}'>
                  <span class="app-icon">📦</span>
                  <div class="app-info">
                    <span class="app-name">${app.name}</span>
                    ${app.comment ? `<span class="app-comment">${app.comment}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="start-menu-right">
          <div class="start-user-section">
            <div class="start-user-avatar">
              <img src="${templeLogo}" draggable="false" alt="Temple" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            </div>
            <div class="start-user-name">TempleOS Remake</div>
          </div>
          
          <div class="start-quick-links">
            <div class="start-quick-link" data-path="root">💻 This PC</div>
            <div class="start-quick-link" data-path="home">🏠 Home</div>
            <div class="start-quick-link" data-path="Documents">📄 Documents</div>
            <div class="start-quick-link" data-path="Downloads">⬇️ Downloads</div>
            <div class="start-quick-link" data-path="Music">🎵 Music</div>
            <div class="start-quick-link" data-path="Pictures">🖼️ Pictures</div>
            <div class="start-quick-link" data-path="settings">⚙️ Settings</div>
          </div>
          
          <div class="start-power-section">
            <button class="start-power-btn" data-power-action="lock">🔒 Lock</button>
            <button class="start-power-btn" data-power-action="restart">🔄 Restart</button>
            <button class="start-power-btn" data-power-action="shutdown">🔴 Shutdown</button>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // APP LAUNCHER (Full-screen overlay)
  // ============================================
  private updateAppLauncherDom(root: HTMLElement | null): void {
    if (!root) return;

    if (!this.showAppLauncher) {
      if (root.innerHTML) root.innerHTML = '';
      return;
    }

    // First render (animate in)
    if (!root.firstElementChild) {
      root.innerHTML = this.renderAppLauncherOverlay();
      window.setTimeout(() => this.focusAppLauncherSearch(), 0);
      return;
    }

    // Keep focus stable: update only the grid + active states while open.
    this.refreshAppLauncherOverlayDom(root);
  }

  private focusAppLauncherSearch(): void {
    const input = document.querySelector('.launcher-search-input') as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
    }
  }

  private openAppLauncher(): void {
    if (this.showAppLauncher) return;
    this.showAppLauncher = true;
    this.launcherSearchQuery = '';
    this.showStartMenu = false;
    this.render();
  }

  private closeAppLauncher(): void {
    if (!this.showAppLauncher) return;
    this.showAppLauncher = false;
    this.launcherSearchQuery = '';
    this.updateAppLauncherDom(document.getElementById('launcher-overlay-root'));
  }

  private canonicalCategoryForInstalledApp(app: InstalledApp): 'Games' | 'Internet' | 'Office' | 'Multimedia' | 'Development' | 'System' | 'Utilities' {
    const cats = (app.categories || []).map(c => String(c || '').toLowerCase());
    const name = String(app.name || '').toLowerCase();
    if (cats.some(c => c.includes('game')) || name.includes('steam')) return 'Games';
    if (cats.some(c => c.includes('network') || c.includes('internet') || c.includes('webbrowser')) || name.includes('browser')) return 'Internet';
    if (cats.some(c => c.includes('office'))) return 'Office';
    if (cats.some(c => c.includes('audio') || c.includes('video') || c.includes('graphics') || c.includes('multimedia'))) return 'Multimedia';
    if (cats.some(c => c.includes('development') || c.includes('ide') || c.includes('programming'))) return 'Development';
    if (cats.some(c => c.includes('system') || c.includes('settings'))) return 'System';
    return 'Utilities';
  }

  private renderAppLauncherOverlay(): string {
    if (!this.showAppLauncher) return '';

    const categories = ['All', 'Games', 'Internet', 'Office', 'Multimedia', 'Development', 'System', 'Utilities'] as const;
    const views = [
      { id: 'all' as const, label: 'All' },
      { id: 'recent' as const, label: 'Recent' },
      { id: 'frequent' as const, label: 'Frequent' },
    ];

    return `
      <div class="app-launcher-overlay" role="dialog" aria-modal="true" aria-label="Application Launcher">
        <div class="app-launcher-backdrop" data-launcher-action="close"></div>
        <div class="app-launcher-panel">
          <div class="app-launcher-top">
            <div class="app-launcher-brand">
              <div class="app-launcher-title">dYs? APPLICATION LAUNCHER</div>
              <div class="app-launcher-sub">Type to search • Right‑click for ƒ+' Desktop/Pin • Esc to close</div>
            </div>
            <button class="app-launcher-close-btn" data-launcher-action="close" title="Close (Esc)">×</button>
          </div>

          <div class="app-launcher-controls">
            <input class="launcher-search-input" type="text" placeholder="Type to search…" value="${escapeHtml(this.launcherSearchQuery)}" />
            <div class="app-launcher-filters">
              <div class="launcher-view-row" role="tablist" aria-label="Launcher view">
                ${views.map(v => `
                  <button class="launcher-view-btn ${this.launcherView === v.id ? 'active' : ''}" data-launcher-view="${v.id}" role="tab" aria-selected="${this.launcherView === v.id ? 'true' : 'false'}">${v.label}</button>
                `).join('')}
              </div>
              <div class="launcher-cat-row" role="tablist" aria-label="Categories">
                ${categories.map(c => `
                  <button class="launcher-cat-btn ${this.launcherCategory === c ? 'active' : ''}" data-launcher-category="${c}" role="tab" aria-selected="${this.launcherCategory === c ? 'true' : 'false'}">${c}</button>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="app-launcher-grid" role="list">
            ${this.renderAppLauncherGridHtml()}
          </div>

          <div class="app-launcher-footer">
            <span class="app-launcher-footer-left">Super+A: Apps</span>
            <span class="app-launcher-footer-right">TempleOS Remake • God's Own Launcher</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderAppLauncherGridHtml(): string {
    type Entry = {
      key: string;
      label: string;
      kind: 'builtin' | 'installed';
      category: 'Games' | 'Internet' | 'Office' | 'Multimedia' | 'Development' | 'System' | 'Utilities';
      comment?: string;
      iconText: string;
      iconKind: 'emoji' | 'monogram';
    };

    const builtin: Entry[] = [
      { key: 'builtin:terminal', label: 'Terminal', kind: 'builtin', category: 'System', iconText: '💻', iconKind: 'emoji' },
      { key: 'builtin:word-of-god', label: 'Word of God', kind: 'builtin', category: 'Utilities', iconText: '✝️', iconKind: 'emoji' },
      { key: 'builtin:files', label: 'Files', kind: 'builtin', category: 'System', iconText: '📁', iconKind: 'emoji' },
      { key: 'builtin:editor', label: 'HolyC Editor', kind: 'builtin', category: 'Development', iconText: '📝', iconKind: 'emoji' },
      { key: 'builtin:hymns', label: 'Hymn Player', kind: 'builtin', category: 'Multimedia', iconText: '🎵', iconKind: 'emoji' },
      { key: 'builtin:updater', label: 'Holy Updater', kind: 'builtin', category: 'System', iconText: '⬇️', iconKind: 'emoji' },
      { key: 'builtin:system-monitor', label: 'Task Manager', kind: 'builtin', category: 'System', iconText: '📊', iconKind: 'emoji' },
      { key: 'builtin:settings', label: 'Settings', kind: 'builtin', category: 'System', iconText: '⚙️', iconKind: 'emoji' },
    ];

    const installed: Entry[] = this.installedApps.map(app => {
      const label = String(app.name || '').trim() || 'App';
      const first = label.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || label.slice(0, 1).toUpperCase() || '•';
      return {
        key: this.keyForInstalledApp(app),
        label,
        kind: 'installed',
        category: this.canonicalCategoryForInstalledApp(app),
        comment: app.comment || '',
        iconText: first,
        iconKind: 'monogram',
      };
    });

    const allEntries: Entry[] = [...builtin, ...installed];
    const entryByKey = new Map(allEntries.map(e => [e.key, e] as const));

    const query = this.launcherSearchQuery.trim().toLowerCase();
    const matchesQuery = (e: Entry) => {
      if (!query) return true;
      return (
        e.label.toLowerCase().includes(query) ||
        (e.comment || '').toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query)
      );
    };

    let filtered: Entry[] = [];

    if (this.launcherView === 'recent') {
      filtered = this.recentApps.map(k => entryByKey.get(k)).filter(Boolean) as Entry[];
    } else if (this.launcherView === 'frequent') {
      filtered = allEntries
        .map(e => ({ e, score: this.appUsage[e.key] || 0 }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score || a.e.label.localeCompare(b.e.label))
        .map(x => x.e);
    } else {
      filtered = allEntries.slice();
      if (this.launcherCategory !== 'All') filtered = filtered.filter(e => e.category === this.launcherCategory);
      filtered.sort((a, b) => (a.kind === b.kind ? 0 : (a.kind === 'builtin' ? -1 : 1)) || a.label.localeCompare(b.label));
    }

    filtered = filtered.filter(matchesQuery);

    if (filtered.length === 0) {
      return `<div class="launcher-no-results">No apps found.</div>`;
    }

    return filtered.map(e => `
      <div class="launcher-app-tile" role="listitem" data-launch-key="${escapeHtml(e.key)}" title="${escapeHtml(e.label)}">
        <div class="launcher-app-icon ${e.iconKind === 'monogram' ? 'mono' : 'emoji'}" data-cat="${e.category}">${escapeHtml(e.iconText)}</div>
        <div class="launcher-app-name">${escapeHtml(e.label)}</div>
        ${e.comment ? `<div class="launcher-app-comment">${escapeHtml(e.comment)}</div>` : ''}
      </div>
    `).join('');
  }

  private refreshAppLauncherOverlayDom(root: HTMLElement): void {
    const search = root.querySelector('.launcher-search-input') as HTMLInputElement | null;
    if (search && search.value !== this.launcherSearchQuery) {
      search.value = this.launcherSearchQuery;
    }

    for (const btn of Array.from(root.querySelectorAll('.launcher-view-btn')) as HTMLElement[]) {
      const v = (btn.dataset.launcherView as any) as 'all' | 'recent' | 'frequent' | undefined;
      btn.classList.toggle('active', !!v && v === this.launcherView);
      btn.setAttribute('aria-selected', !!v && v === this.launcherView ? 'true' : 'false');
    }

    for (const btn of Array.from(root.querySelectorAll('.launcher-cat-btn')) as HTMLElement[]) {
      const c = (btn.dataset.launcherCategory as any) as typeof this.launcherCategory | undefined;
      btn.classList.toggle('active', !!c && c === this.launcherCategory);
      btn.setAttribute('aria-selected', !!c && c === this.launcherCategory ? 'true' : 'false');
    }

    const grid = root.querySelector('.app-launcher-grid') as HTMLElement | null;
    if (grid) grid.innerHTML = this.renderAppLauncherGridHtml();
  }

  private async loadInstalledApps(): Promise<void> {
    if (!window.electronAPI) {
      console.warn('electronAPI not available - cannot load installed apps');
      return;
    }

    try {
      const result = await window.electronAPI.getInstalledApps();
      if (result.success) {
        this.installedApps = result.apps;

      }
    } catch (error) {
      console.error('Error loading installed apps:', error);
    }
  }

  private async refreshNetworkStatus(): Promise<void> {
    if (!window.electronAPI?.getNetworkStatus) return;

    try {
      const res = await window.electronAPI.getNetworkStatus();
      if (res.success && res.status) {
        this.networkStatus = res.status as NetworkStatus;
        this.networkLastError = null;
      } else {
        this.networkLastError = res.error || 'Failed to read network status';
        this.networkStatus = { connected: false };
      }
    } catch (e) {
      this.networkLastError = String(e);
      this.networkStatus = { connected: false };
    }

    await this.refreshWifiNetworks();
    await this.refreshWifiEnabled();
    await this.refreshSavedNetworks();

    // Update tray (contains popups + status icon)
    const tray = document.querySelector('.taskbar-tray') as HTMLElement | null;
    if (tray) tray.innerHTML = this.getTrayHTML();

    if (this.activeSettingsCategory === 'Network') {
      this.refreshSettingsWindow();
    }
  }

  private async refreshWifiNetworks(): Promise<void> {
    if (!window.electronAPI?.listWifiNetworks) return;

    try {
      const res = await window.electronAPI.listWifiNetworks();
      if (res.success && Array.isArray(res.networks)) {
        this.wifiNetworks = res.networks as WifiNetwork[];
      } else {
        this.wifiNetworks = [];
      }
    } catch {
      this.wifiNetworks = [];
    }
  }

  private async refreshWifiEnabled(): Promise<void> {
    if (!window.electronAPI?.getWifiEnabled) return;
    try {
      const res = await window.electronAPI.getWifiEnabled();
      if (res.success && typeof res.enabled === 'boolean') {
        this.wifiEnabled = res.enabled;
      }
    } catch {
      // ignore
    }

    if (this.activeSettingsCategory === 'Network') this.refreshSettingsWindow();
  }

  private async refreshSavedNetworks(): Promise<void> {
    if (!window.electronAPI?.listSavedNetworks) return;
    try {
      const res = await window.electronAPI.listSavedNetworks();
      if (res.success && Array.isArray(res.networks)) {
        this.savedNetworks = (res.networks as any[])
          .filter(n => n && typeof n.name === 'string' && typeof n.uuid === 'string')
          .map(n => ({ name: String(n.name), uuid: String(n.uuid), type: String(n.type || ''), device: String(n.device || '') }))
          .slice(0, 50);
      }
    } catch {
      // ignore
    }

    if (this.activeSettingsCategory === 'Network') this.refreshSettingsWindow();
  }

  private async connectWifiFromUi(ssid: string, security: string): Promise<void> {
    if (!window.electronAPI?.connectWifi) return;

    let password: string | undefined = undefined;
    if (security && !security.toLowerCase().includes('open')) {
      const pw = await this.openPromptModal({
        title: 'Wi-Fi Password',
        message: `Enter password for "${ssid}"`,
        inputLabel: 'Password',
        placeholder: 'Network password',
        password: true,
        confirmText: 'Connect',
        cancelText: 'Cancel'
      });
      if (pw === null) return;
      password = pw;
    }

    this.showNotification('Network', `Connecting to ${ssid}...`, 'info');
    try {
      const res = await window.electronAPI.connectWifi(ssid, password);
      if (res.success) {
        this.showNotification('Network', `Connected to ${ssid}`, 'divine');
      } else {
        this.showNotification('Network', res.error || `Failed to connect to ${ssid}`, 'error');
      }
    } catch (e) {
      this.showNotification('Network', String(e), 'error');
    }

    void this.refreshNetworkStatus();
  }

  private async refreshAudioDevices(): Promise<void> {
    if (!window.electronAPI?.listAudioDevices) return;

    try {
      const res = await window.electronAPI.listAudioDevices();
      if (res.success) {
        this.audioDevices = {
          sinks: (res.sinks || []).map((s: any) => ({ id: String(s.id ?? ''), name: String(s.name ?? ''), description: String(s.description ?? s.name ?? '') })),
          sources: (res.sources || []).map((s: any) => ({ id: String(s.id ?? ''), name: String(s.name ?? ''), description: String(s.description ?? s.name ?? '') })),
          defaultSink: res.defaultSink ?? null,
          defaultSource: res.defaultSource ?? null
        };
      }
    } catch {
      // keep previous
    }

    if (this.activeSettingsCategory === 'System') {
      this.refreshSettingsWindow();
    }
  }

  private async refreshSystemInfo(): Promise<void> {
    if (!window.electronAPI?.getSystemInfo) return;
    try {
      this.systemInfo = await window.electronAPI.getSystemInfo();
    } catch {
      // ignore
    }
  }

  private async refreshDisplayOutputs(): Promise<void> {
    if (!window.electronAPI?.getDisplayOutputs) return;
    try {
      const res = await window.electronAPI.getDisplayOutputs();
      if (res.success && Array.isArray(res.outputs)) {
        this.displayOutputs = res.outputs
          .filter(o => o && typeof o.name === 'string')
          .map(o => ({
            name: String(o.name),
            active: !!o.active,
            scale: typeof o.scale === 'number' ? o.scale : 1,
            transform: String(o.transform || 'normal'),
            currentMode: String(o.currentMode || ''),
            modes: Array.isArray(o.modes)
              ? o.modes
                .filter((m: any) => m && typeof m.width === 'number' && typeof m.height === 'number')
                .map((m: any) => ({
                  width: m.width,
                  height: m.height,
                  refreshHz: typeof m.refreshHz === 'number' ? m.refreshHz : null
                }))
              : []
          }))
          .slice(0, 10);

        if (!this.activeDisplayOutput || !this.displayOutputs.some(o => o.name === this.activeDisplayOutput)) {
          const active = this.displayOutputs.find(o => o.active) || this.displayOutputs[0] || null;
          this.activeDisplayOutput = active ? active.name : null;
        }
      }
    } catch {
      // ignore
    }

    if (this.activeSettingsCategory === 'System') this.refreshSettingsWindow();
  }

  private async refreshMouseDpiInfo(): Promise<void> {
    this.mouseDpiSupported = false;
    this.mouseDpiDeviceId = null;

    if (!window.electronAPI?.getMouseDpiInfo) return;

    try {
      const res = await window.electronAPI.getMouseDpiInfo();
      if (res.success && res.supported) {
        this.mouseDpiSupported = true;
        this.mouseDpiDeviceId = res.deviceId ?? null;
        if (Array.isArray(res.dpiValues) && res.dpiValues.length) {
          this.mouseDpiValues = res.dpiValues.slice(0, 50).filter(n => typeof n === 'number' && Number.isFinite(n)).sort((a, b) => a - b);
        }

        const fallback = this.mouseDpiValues.includes(800) ? 800 : (this.mouseDpiValues[0] ?? 800);
        const desired = this.mouseSettings.dpi ?? (res.currentDpi ?? fallback);
        if (Number.isFinite(desired) && desired > 0) {
          this.mouseSettings.dpi = Math.max(100, Math.min(20000, Math.round(desired)));
        }

        if (window.electronAPI?.setMouseDpi && this.mouseSettings.dpi && res.currentDpi && this.mouseSettings.dpi !== res.currentDpi) {
          void window.electronAPI.setMouseDpi(this.mouseDpiDeviceId, this.mouseSettings.dpi).then(r => {
            if (!r.success) this.showNotification('Mouse', r.error || 'Failed to apply DPI', 'warning');
          });
        }
      }
    } catch {
      // ignore
    }

    if (this.activeSettingsCategory === 'Devices') {
      this.refreshSettingsWindow();
    }
  }

  private launchInstalledApp(appData: string): void {
    try {
      const app = JSON.parse(appData);
      if (window.electronAPI) {
        window.electronAPI.launchApp(app);
      }
      // Track recent/frequent apps (Windows-like)
      const key = app.desktopFile ? `desktop:${app.desktopFile}` : (app.name ? `name:${app.name}` : 'unknown');
      this.recordAppLaunch(key);
      this.showStartMenu = false;
      this.render();
    } catch (error) {
      console.error('Error launching app:', error);
    }
  }

  private recordAppLaunch(key: string): void {
    if (!key) return;

    this.appUsage[key] = (this.appUsage[key] || 0) + 1;

    // Only track recent for desktop apps + built-ins
    this.recentApps = this.recentApps.filter(k => k !== key);
    this.recentApps.unshift(key);
    this.recentApps = this.recentApps.slice(0, 12);

    this.queueSaveConfig();
  }

  private builtinLauncherMeta(appId: string): { label: string; icon: string } | null {
    switch (appId) {
      case 'terminal': return { label: 'Terminal', icon: '💻' };
      case 'word-of-god': return { label: 'Word of God', icon: '✝️' };
      case 'files': return { label: 'Files', icon: '📁' };
      case 'editor': return { label: 'HolyC Editor', icon: '📝' };
      case 'hymns': return { label: 'Hymn Player', icon: '🎵' };
      case 'settings': return { label: 'Settings', icon: '⚙️' };
      case 'updater': return { label: 'Holy Updater', icon: '⬇️' };
      case 'system-monitor': return { label: 'Task Manager', icon: '📊' };
      default: return null;
    }
  }

  private keyForInstalledApp(app: InstalledApp): string {
    return app.desktopFile ? `desktop:${app.desktopFile}` : `name:${app.name}`;
  }

  private findInstalledAppByKey(key: string): InstalledApp | null {
    const raw = String(key || '');
    if (raw.startsWith('desktop:')) {
      const f = raw.slice('desktop:'.length);
      const found = this.installedApps.find(a => a.desktopFile === f);
      if (found) return found;
    }
    if (raw.startsWith('name:')) {
      const n = raw.slice('name:'.length);
      const found = this.installedApps.find(a => a.name === n);
      if (found) return found;
    }
    return null;
  }

  private launcherDisplayForKey(key: string): { label: string; icon: string } | null {
    const raw = String(key || '');
    if (raw.startsWith('builtin:')) {
      return this.builtinLauncherMeta(raw.slice('builtin:'.length));
    }
    const installed = this.findInstalledAppByKey(raw);
    if (installed) return { label: installed.name, icon: 'dY"├¥' };
    return null;
  }

  private launchByKey(key: string): void {
    const raw = String(key || '');
    if (raw.startsWith('builtin:')) {
      this.openApp(raw.slice('builtin:'.length));
      return;
    }
    const installed = this.findInstalledAppByKey(raw);
    if (installed && window.electronAPI) {
      void window.electronAPI.launchApp(installed);
      this.recordAppLaunch(this.keyForInstalledApp(installed));
      return;
    }
    this.showNotification('Apps', 'App not found.', 'warning');
  }

  private launchByKeyClosingShellUi(key: string): void {
    const raw = String(key || '');
    if (!raw) return;
    const shouldRender = this.showStartMenu || this.showAppLauncher;
    this.showStartMenu = false;
    this.closeAppLauncher();
    if (shouldRender) this.render();
    this.launchByKey(raw);
  }

  private pinStart(key: string): void {
    if (!key) return;
    if (!this.pinnedStart.includes(key)) {
      this.pinnedStart.unshift(key);
      this.pinnedStart = this.pinnedStart.slice(0, 24);
      this.queueSaveConfig();
    }
  }

  private unpinStart(key: string): void {
    this.pinnedStart = this.pinnedStart.filter(k => k !== key);
    this.queueSaveConfig();
  }

  private pinTaskbar(key: string): void {
    if (!key) return;
    if (!this.pinnedTaskbar.includes(key)) {
      this.pinnedTaskbar.push(key);
      this.pinnedTaskbar = this.pinnedTaskbar.slice(0, 20);
      this.queueSaveConfig();
    }
  }

  private unpinTaskbar(key: string): void {
    this.pinnedTaskbar = this.pinnedTaskbar.filter(k => k !== key);
    this.queueSaveConfig();
  }

  private addDesktopShortcut(key: string): void {
    if (!key) return;
    const display = this.launcherDisplayForKey(key);
    if (!display) return;
    if (this.desktopShortcuts.some(s => s.key === key)) return;
    this.desktopShortcuts.unshift({ key, label: display.label });
    this.desktopShortcuts = this.desktopShortcuts.slice(0, 48);
    this.queueSaveConfig();
    this.render();
  }

  private removeDesktopShortcut(key: string): void {
    this.desktopShortcuts = this.desktopShortcuts.filter(s => s.key !== key);
    this.queueSaveConfig();
    this.render();
  }



  private setupEventListeners() {
    const app = document.getElementById('app')!;

    // GUARD: Prevent multiple listeners on the same DOM element (handles HMR/reloads)
    if (app.dataset.listenersAttached === 'true') {

      return;
    }
    app.dataset.listenersAttached = 'true';


    // Volume Slider Input
    app.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.matches('.volume-slider')) {
        const val = parseInt(target.value, 10);
        this.updateVolume(val);
      }

      if (target.matches('.modal-input') && this.modal?.type === 'prompt') {
        this.modal.inputValue = target.value;
      }

      if (target.matches('.display-scale-slider')) {
        const scale = parseFloat(target.value);
        if (this.activeDisplayOutput && Number.isFinite(scale)) {
          const clamped = Math.max(1, Math.min(2, Math.round(scale * 100) / 100));
          const out = this.displayOutputs.find(o => o.name === this.activeDisplayOutput);
          if (out) out.scale = clamped;
          this.queueSaveConfig();
          if (window.electronAPI?.setDisplayScale) {
            void window.electronAPI.setDisplayScale(this.activeDisplayOutput, clamped).then(res => {
              if (!res.success) this.showNotification('Display', res.error || 'Failed to set scale', 'warning');
            });
          }
        }
      }

      // App launcher search (update grid without losing focus)
      if (target.matches('.launcher-search-input')) {
        this.launcherSearchQuery = target.value;
        this.updateAppLauncherDom(document.getElementById('launcher-overlay-root'));
        return;
      }

      // File browser search
      if (target.matches('.file-search-input')) {
        this.fileSearchQuery = target.value;
        this.updateFileBrowserWindow();
      }

      // Terminal search
      if (target.matches('.terminal-search-input')) {
        this.terminalSearchQuery = target.value;
        this.updateTerminalSearchMatches();
        this.updateTerminalSearchCountDom();
        this.scrollTerminalToSearchMatch();
      }
    });

    // Resolution Dropdown Change
    app.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.matches('.resolution-select')) {
        this.changeResolution(target.value);
      }

      if (target.matches('.display-output-select')) {
        const val = target.value;
        this.activeDisplayOutput = val || null;
        this.refreshSettingsWindow();
      }

      if (target.matches('.display-mode-select')) {
        const mode = target.value;
        const out = this.activeDisplayOutput;
        if (out && window.electronAPI?.setDisplayMode) {
          void window.electronAPI.setDisplayMode(out, mode).then(res => {
            if (!res.success) this.showNotification('Display', res.error || 'Failed to set display mode', 'warning');
            void this.refreshDisplayOutputs();
          });
        } else {
          // Fallback (single output)
          if (mode.includes('x')) void this.changeResolution(mode.split('@')[0]);
        }
      }

      if (target.matches('.display-transform-select')) {
        const transform = target.value;
        const out = this.activeDisplayOutput;
        if (out && window.electronAPI?.setDisplayTransform) {
          void window.electronAPI.setDisplayTransform(out, transform).then(res => {
            if (!res.success) this.showNotification('Display', res.error || 'Failed to set orientation', 'warning');
            void this.refreshDisplayOutputs();
          });
        }
      }

      if (target.matches('.file-sort-select')) {
        const val = (target.value as any) as 'name' | 'size' | 'modified';
        this.fileSortMode = val;
        this.fileSortDir = val === 'name' ? 'asc' : 'desc';
        this.updateFileBrowserWindow();
      }

      if (target.matches('.start-view-select')) {
        const val = (target.value as any) as 'all' | 'recent' | 'frequent';
        this.startMenuView = val;
        this.render();
      }

      if (target.matches('.start-category-select')) {
        const val = target.value as any;
        this.startMenuCategory = val;
        this.render();
      }

      if (target.matches('.audio-sink-select')) {
        const sink = target.value;
        if (sink && window.electronAPI?.setDefaultSink) {
          void window.electronAPI.setDefaultSink(sink).then(() => {
            this.audioDevices.defaultSink = sink;
            this.queueSaveConfig();
            this.refreshSettingsWindow();
          });
        }
      }

      if (target.matches('.audio-source-select')) {
        const source = target.value;
        if (source && window.electronAPI?.setDefaultSource) {
          void window.electronAPI.setDefaultSource(source).then(() => {
            this.audioDevices.defaultSource = source;
            this.queueSaveConfig();
            this.refreshSettingsWindow();
          });
        }
      }



      if (target.matches('.mouse-dpi-select')) {
        const dpi = parseInt(target.value, 10);
        if (!Number.isNaN(dpi) && dpi > 0) {
          this.mouseSettings.dpi = dpi;
          this.queueSaveConfig();
          if (window.electronAPI?.setMouseDpi) {
            void window.electronAPI.setMouseDpi(this.mouseDpiDeviceId, dpi).then(res => {
              if (!res.success) this.showNotification('Mouse', res.error || 'Failed to set DPI', 'warning');
            });
          }
        }
      }

      const inputTarget = e.target as HTMLInputElement;
      if (inputTarget.matches('.file-hidden-toggle')) {
        this.showHiddenFiles = inputTarget.checked;
        this.updateFileBrowserWindow();
      }

      if (inputTarget.matches('.mouse-speed-slider')) {
        const speed = parseFloat(inputTarget.value);
        if (!Number.isNaN(speed)) {
          this.mouseSettings.speed = Math.max(-1, Math.min(1, speed));
          this.queueSaveConfig();
          if (window.electronAPI?.applyMouseSettings) void window.electronAPI.applyMouseSettings(this.mouseSettings);
        }
      }

      if (inputTarget.matches('.mouse-raw-toggle')) {
        this.mouseSettings.raw = inputTarget.checked;
        this.queueSaveConfig();
        if (window.electronAPI?.applyMouseSettings) void window.electronAPI.applyMouseSettings(this.mouseSettings);
      }

      if (inputTarget.matches('.mouse-natural-toggle')) {
        this.mouseSettings.naturalScroll = inputTarget.checked;
        this.queueSaveConfig();
        if (window.electronAPI?.applyMouseSettings) void window.electronAPI.applyMouseSettings(this.mouseSettings);
      }

      if (inputTarget.matches('.wifi-enabled-toggle')) {
        this.wifiEnabled = inputTarget.checked;
        this.queueSaveConfig();
        if (window.electronAPI?.setWifiEnabled) {
          void window.electronAPI.setWifiEnabled(this.wifiEnabled).then(res => {
            if (!res.success) this.showNotification('Network', res.error || 'Failed to toggle WiΓÇæFi', 'warning');
            void this.refreshNetworkStatus();
          });
        }
      }
    });

    // Desktop icon clicks
    app.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Modal interactions (eat clicks before anything else)
      if (this.modal) {
        const confirmBtn = target.closest('.modal-confirm');
        const cancelBtn = target.closest('.modal-cancel');
        const backdrop = target.classList.contains('modal-overlay-backdrop');
        if (confirmBtn) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (this.modal.type === 'prompt') this.closeModal(this.modal.inputValue ?? '');
          else if (this.modal.type === 'confirm') this.closeModal(true);
          else this.closeModal(undefined);
          return;
        }
        if (cancelBtn || backdrop) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (this.modal.type === 'prompt') this.closeModal(null);
          else if (this.modal.type === 'confirm') this.closeModal(false);
          else this.closeModal(undefined);
          return;
        }
      }

      // Window controls - handle FIRST and return early
      const btnEl = target.closest('.window-btn') as HTMLElement;
      if (btnEl) {
        e.stopPropagation();
        const action = btnEl.dataset.action;
        const windowId = btnEl.dataset.window!;
        if (action === 'close') {
          this.closeWindow(windowId);
        } else if (action === 'minimize') {
          this.minimizeWindow(windowId);
        } else if (action === 'maximize') {
          this.maximizeWindow(windowId);
        }
        return;
      }

      // App Launcher (overlay) interactions
      const launcherActionEl = target.closest('[data-launcher-action]') as HTMLElement | null;
      if (launcherActionEl?.dataset.launcherAction === 'close') {
        this.closeAppLauncher();
        return;
      }

      const launcherViewBtn = target.closest('.launcher-view-btn') as HTMLElement | null;
      if (launcherViewBtn?.dataset.launcherView) {
        const view = (launcherViewBtn.dataset.launcherView as any) as 'all' | 'recent' | 'frequent';
        this.launcherView = view;
        if (view !== 'all') this.launcherCategory = 'All';
        this.updateAppLauncherDom(document.getElementById('launcher-overlay-root'));
        return;
      }

      const launcherCatBtn = target.closest('.launcher-cat-btn') as HTMLElement | null;
      if (launcherCatBtn?.dataset.launcherCategory) {
        const cat = launcherCatBtn.dataset.launcherCategory as any;
        if (this.launcherView === 'all') {
          this.launcherCategory = cat;
          this.updateAppLauncherDom(document.getElementById('launcher-overlay-root'));
        }
        return;
      }

      const launcherTile = target.closest('.launcher-app-tile') as HTMLElement | null;
      if (launcherTile?.dataset.launchKey) {
        const key = launcherTile.dataset.launchKey;
        this.closeAppLauncher();
        this.launchByKey(key);
        return;
      }

      // Taskbar app click
      const taskbarApp = target.closest('.taskbar-app') as HTMLElement;
      if (taskbarApp) {
        if (taskbarApp.dataset.launchKey) {
          this.launchByKey(taskbarApp.dataset.launchKey);
          return;
        }
        if (taskbarApp.dataset.taskbarWindow) {
          this.toggleWindow(taskbarApp.dataset.taskbarWindow);
          return;
        }
        return;
      }

      // Start button click
      const startBtn = target.closest('.start-btn') as HTMLElement;
      if (startBtn) {
        this.showStartMenu = !this.showStartMenu;
        if (!this.showStartMenu) {
          this.startMenuSearchQuery = ''; // Reset search when closing
        }

        this.render();
        return;
      }

      // Tray: Volume
      const volIcon = target.closest('#tray-volume');
      if (volIcon) {
        this.showVolumePopup = !this.showVolumePopup;
        this.showCalendarPopup = false;
        this.showCalendarPopup = false;
        this.showNetworkPopup = false;
        this.showNetworkPopup = false;
        this.showNotificationPopup = false;
        this.render();
        return;
      }

      // Tray: Volume Slider Change
      const volSlider = target.closest('.volume-slider');
      if (volSlider) {
        // This is handled by 'input' event, but we prevent closing popup here
        return;
      }

      // Tray: Clock/Calendar
      // Tray: Clock/Calendar
      const clock = target.closest('#clock-container');
      if (clock) {
        this.showCalendarPopup = !this.showCalendarPopup;
        this.showVolumePopup = false;
        this.showVolumePopup = false;
        this.showNetworkPopup = false;
        this.showNetworkPopup = false;
        this.showNotificationPopup = false;
        this.render();
        return;
      }

      // Tray: Network
      const networkIcon = target.closest('#tray-network');
      if (networkIcon) {
        this.showNetworkPopup = !this.showNetworkPopup;
        this.showVolumePopup = false;
        this.showCalendarPopup = false;
        this.showCalendarPopup = false;
        this.showNotificationPopup = false;
        this.showNotificationPopup = false;
        if (this.showNetworkPopup) {
          void this.refreshNetworkStatus();
        }
        this.render();
        return;
      }

      // Network popup actions
      const netBtn = target.closest('.net-btn') as HTMLElement;
      if (netBtn && netBtn.dataset.netAction) {
        const action = netBtn.dataset.netAction;
        if (action === 'refresh') {
          void this.refreshNetworkStatus();
        } else if (action === 'open-settings') {
          this.openApp('settings');
          this.activeSettingsCategory = 'Network';
          this.refreshSettingsWindow();
        } else if (action === 'disconnect') {
          if (window.electronAPI?.disconnectNetwork) {
            void window.electronAPI.disconnectNetwork().then(res => {
              if (!res.success) this.showNotification('Network', res.error || 'Disconnect failed', 'error');
              void this.refreshNetworkStatus();
            });
          }
        } else if (action === 'connect') {
          const ssid = netBtn.dataset.ssid || '';
          const sec = netBtn.dataset.sec || '';
          if (ssid) void this.connectWifiFromUi(ssid, sec);
        }
        return;
      }

      // Tray: Notifications
      const notifIcon = target.closest('#tray-notification');
      if (notifIcon) {
        this.showNotificationPopup = !this.showNotificationPopup;
        this.showVolumePopup = false;
        this.showCalendarPopup = false;
        this.showCalendarPopup = false;
        this.showNetworkPopup = false;
        this.showNetworkPopup = false;
        this.render();
        return;
      }

      // DND Toggle
      const dndBtn = target.closest('.dnd-btn');
      if (dndBtn) {
        this.doNotDisturb = !this.doNotDisturb;
        this.queueSaveConfig();
        this.render();
        return;
      }

      // Notification center actions
      const notifBtn = target.closest('.notif-btn') as HTMLElement;
      if (notifBtn && notifBtn.dataset.notifAction) {
        const action = notifBtn.dataset.notifAction;
        const id = notifBtn.dataset.notifId;
        if (action === 'clear') {
          this.notifications = [];
          this.activeToasts = [];
          this.render();
          return;
        }
        if (action === 'mark-all-read') {
          this.notifications.forEach(n => n.read = true);
          this.render();
          return;
        }
        if (action === 'dismiss' && id) {
          this.notifications = this.notifications.filter(n => n.id !== id);
          this.activeToasts = this.activeToasts.filter(t => t.id !== id);
          this.render();
          return;
        }
      }

      const notifItem = target.closest('.notification-item') as HTMLElement;
      if (notifItem && notifItem.dataset.notifId) {
        const n = this.notifications.find(x => x.id === notifItem.dataset.notifId);
        if (n) {
          n.read = true;
          this.render();
          return;
        }
      }

      // Toast actions
      const toastActionEl = target.closest('[data-toast-action]') as HTMLElement;
      if (toastActionEl && toastActionEl.dataset.toastAction && toastActionEl.dataset.toastId) {
        const toastId = toastActionEl.dataset.toastId;
        const action = toastActionEl.dataset.toastAction;

        if (action === 'dismiss') {
          this.activeToasts = this.activeToasts.filter(t => t.id !== toastId);
          const notif = this.notifications.find(n => n.id === toastId);
          if (notif) notif.read = true;
          this.render();
          return;
        }

        if (action === 'action') {
          const actionId = toastActionEl.dataset.actionId || '';
          if (actionId === 'open-settings') {
            this.openApp('settings');
            this.render();
          }
          this.activeToasts = this.activeToasts.filter(t => t.id !== toastId);
          const notif = this.notifications.find(n => n.id === toastId);
          if (notif) notif.read = true;
          this.render();
          return;
        }
      }

      // Terminal links (URLs)
      const terminalLink = target.closest('.terminal-link') as HTMLElement;
      if (terminalLink && terminalLink.dataset.url) {
        const url = terminalLink.dataset.url;
        if (window.electronAPI?.openExternal) {
          void window.electronAPI.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
        return;
      }

      // Terminal tab close (must be before tab switch!)
      const terminalClose = target.closest('.terminal-tab-close') as HTMLElement;
      if (terminalClose && terminalClose.dataset.terminalClose !== undefined) {
        e.stopPropagation(); // Prevent tab switch
        const tabIndex = parseInt(terminalClose.dataset.terminalClose);
        if (!isNaN(tabIndex) && this.terminalTabs.length > 1) {
          const tab = this.terminalTabs[tabIndex];
          // Destroy PTY if exists
          if (tab?.ptyId && window.electronAPI?.destroyPty) {
            void window.electronAPI.destroyPty(tab.ptyId);
          }
          // Dispose xterm if exists
          if (tab?.xterm) {
            tab.xterm.dispose();
          }
          this.terminalTabs.splice(tabIndex, 1);
          if (this.activeTerminalTab >= this.terminalTabs.length) {
            this.activeTerminalTab = this.terminalTabs.length - 1;
          }
          this.refreshTerminalWindow();
        }
        return;
      }

      // Terminal tab switching
      const terminalTab = target.closest('.terminal-tab') as HTMLElement;
      if (terminalTab && terminalTab.dataset.terminalTab !== undefined) {
        const tabIndex = parseInt(terminalTab.dataset.terminalTab);
        if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < this.terminalTabs.length) {
          this.activeTerminalTab = tabIndex;
          this.refreshTerminalWindow();
        }
        return;
      }


      // Terminal new tab
      const terminalNew = target.closest('.terminal-tab-new') as HTMLElement;
      if (terminalNew) {
        const newTab = {
          id: `tab-${Date.now()}`,
          ptyId: null,
          title: `Terminal ${this.terminalTabs.length + 1}`,
          buffer: [] as string[],
          cwd: this.terminalCwd || '',
          xterm: null,
          fitAddon: null
        };
        this.terminalTabs.push(newTab);

        this.activeTerminalTab = this.terminalTabs.length - 1;
        this.refreshTerminalWindow();
        return;
      }

      // Terminal tools (search / split / settings)
      const terminalActionEl = target.closest('[data-terminal-action]') as HTMLElement;
      if (terminalActionEl && terminalActionEl.dataset.terminalAction) {
        const action = terminalActionEl.dataset.terminalAction;

        if (action === 'search') {
          this.terminalSearchOpen = !this.terminalSearchOpen;
          if (!this.terminalSearchOpen) {
            this.terminalSearchQuery = '';
            this.terminalSearchMatches = [];
            this.terminalSearchMatchIndex = -1;
          } else {
            this.updateTerminalSearchMatches();
          }
          this.refreshTerminalWindow();
          return;
        }

        if (action === 'search-next') {
          this.updateTerminalSearchMatches();
          this.terminalSearchNext();
          return;
        }

        if (action === 'search-prev') {
          this.updateTerminalSearchMatches();
          this.terminalSearchPrev();
          return;
        }

        if (action === 'search-close') {
          this.terminalSearchOpen = false;
          this.terminalSearchQuery = '';
          this.terminalSearchMatches = [];
          this.terminalSearchMatchIndex = -1;
          this.refreshTerminalWindow();
          return;
        }

        if (action === 'split-v' || action === 'split-h') {
          if (this.terminalTabs.length < 2) {
            this.terminalTabs.push({
              id: `tab-${Date.now() + 1}`,
              ptyId: null,
              title: `Terminal ${this.terminalTabs.length + 1}`,
              buffer: [] as string[],
              cwd: this.terminalCwd || '',
              xterm: null,
              fitAddon: null
            });
          }

          const primary = this.terminalTabs[this.activeTerminalTab] || this.terminalTabs[0];
          const secondary = this.terminalTabs.find(t => t.id !== primary?.id) || null;
          this.terminalSplitMode = action === 'split-v' ? 'split-v' : 'split-h';
          this.terminalSplitSecondaryTabId = secondary?.id || null;
          this.refreshTerminalWindow();
          return;
        }

        if (action === 'unsplit') {
          this.terminalSplitMode = 'single';
          this.terminalSplitSecondaryTabId = null;
          this.refreshTerminalWindow();
          return;
        }

        if (action === 'settings') {
          void this.openAlertModal({
            title: 'Terminal Settings',
            message: "Use built-ins:\n- theme <green|cyan|amber|white>\n- fontsize <number>\n- prompt <template>\n- alias name='command'\n- unalias name\n\nExample: theme cyan"
          });
          return;
        }
      }

      // Editor tab switching
      const editorTab = target.closest('.editor-tab') as HTMLElement;
      if (editorTab && editorTab.dataset.editorTab !== undefined) {
        const tabIndex = parseInt(editorTab.dataset.editorTab);
        if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < this.editorTabs.length) {
          this.activeEditorTab = tabIndex;
          this.refreshEditorWindow();
        }
        return;
      }

      // Editor tab close
      const editorClose = target.closest('.editor-tab-close') as HTMLElement;
      if (editorClose && editorClose.dataset.editorClose !== undefined) {
        const tabIndex = parseInt(editorClose.dataset.editorClose);
        if (!isNaN(tabIndex) && this.editorTabs.length > 1) {
          const tab = this.editorTabs[tabIndex];
          if (tab?.modified) {
            void this.openConfirmModal({
              title: 'Unsaved Changes',
              message: `Save changes to ${tab.filename}?`,
              confirmText: 'Save',
              cancelText: 'Discard'
            }).then(async (save) => {
              if (save) {
                await this.editorSaveTab(tab.id, { forcePrompt: false });
              }

              // Close tab after decision (best-effort; tab may have moved)
              const idxNow = this.editorTabs.findIndex(t => t.id === tab.id);
              if (idxNow >= 0 && this.editorTabs.length > 1) {
                if (this.editorViewTabId === tab.id) this.editorViewTabId = null;
                this.editorTabs.splice(idxNow, 1);
                if (this.activeEditorTab >= this.editorTabs.length) {
                  this.activeEditorTab = this.editorTabs.length - 1;
                }
                this.refreshEditorWindow();
              }
            });
            return;
          }

          if (tab?.id && this.editorViewTabId === tab.id) this.editorViewTabId = null;
          this.editorTabs.splice(tabIndex, 1);
          if (this.activeEditorTab >= this.editorTabs.length) {
            this.activeEditorTab = this.editorTabs.length - 1;
          }
          this.refreshEditorWindow();
        }
        return;
      }

      // Editor new tab
      const editorNew = target.closest('.editor-tab-new') as HTMLElement;
      if (editorNew) {
        const newTab = {
          id: `editor-${Date.now()}`,
          path: null,
          filename: `untitled${this.editorTabs.length + 1}.hc`,
          content: '',
          modified: false,
          cmState: null,
          revision: 0,
          lastSavedRevision: 0
        };
        this.editorTabs.push(newTab);
        this.activeEditorTab = this.editorTabs.length - 1;
        this.refreshEditorWindow();
        return;
      }

      // Editor find/replace actions
      const editorAction = target.closest('[data-editor-action]') as HTMLElement;
      if (editorAction && editorAction.dataset.editorAction) {
        const action = editorAction.dataset.editorAction;
        switch (action) {
          case 'open':
            void this.editorOpenFromPrompt();
            break;
          case 'save':
            void this.editorSaveActive(false);
            break;
          case 'save-as':
            void this.editorSaveActive(true);
            break;
          case 'undo':
            if (this.editorView) undo(this.editorView);
            break;
          case 'redo':
            if (this.editorView) redo(this.editorView);
            break;
          case 'wrap':
            this.toggleEditorWordWrap();
            break;
          case 'recent': {
            const rect = editorAction.getBoundingClientRect();
            const items: Array<{ label?: string; action?: () => void | Promise<void>; divider?: boolean }> = this.editorRecentFiles.slice(0, 12).map(p => ({
              label: p,
              action: () => void this.editorOpenPath(p)
            }));
            if (items.length === 0) {
              items.push({ label: 'No recent files', action: () => void 0 });
            } else {
              items.push({ divider: true });
              items.push({
                label: 'Clear recent',
                action: () => {
                  this.editorRecentFiles = [];
                  this.queueSaveConfig();
                  this.refreshEditorWindow();
                }
              });
            }
            this.showContextMenu(Math.round(rect.left), Math.round(rect.bottom + 6), items);
            break;
          }
          case 'find-next':
            this.editorFindNext();
            break;
          case 'find-prev':
            this.editorFindPrev();
            break;
          case 'replace':
            this.editorReplace();
            break;
          case 'replace-all':
            this.editorReplaceAll();
            break;
          case 'find-close':
            this.editorFindOpen = false;
            this.refreshEditorWindow();
            break;
        }
        return;
      }

      // Close tray popups if clicking outside

      if (this.showVolumePopup && !target.closest('#tray-volume') && !target.closest('.volume-popup')) {
        this.showVolumePopup = false;
        this.render();
      }
      if (this.showCalendarPopup && !target.closest('#clock-container') && !target.closest('.calendar-popup')) {
        this.showCalendarPopup = false;
        this.render();
      }
      if (this.showNetworkPopup && !target.closest('#tray-network') && !target.closest('.network-popup')) {
        this.showNetworkPopup = false;
        this.render();
      }
      if (this.showNotificationPopup && !target.closest('#tray-notification') && !target.closest('.notification-popup')) {
        this.showNotificationPopup = false;
        this.render();
      }

      // Start menu: All Apps / Launcher
      const startAllAppsBtn = target.closest('.start-all-apps-btn') as HTMLElement | null;
      if (startAllAppsBtn) {
        this.openAppLauncher();
        return;
      }

      // Start menu item click (pinned apps)
      const startAppItem = target.closest('.start-app-item') as HTMLElement;
      if (startAppItem && startAppItem.dataset.launchKey) {
        this.launchByKey(startAppItem.dataset.launchKey);
        this.showStartMenu = false;
        this.render();
        return;
      }

      if (startAppItem && startAppItem.dataset.app) {
        this.openApp(startAppItem.dataset.app);
        this.showStartMenu = false;
        this.render();
        return;
      }

      // Start menu installed app click
      if (startAppItem && startAppItem.dataset.installedApp) {
        this.launchInstalledApp(startAppItem.dataset.installedApp);
        return;
      }

      // Start menu quick link click
      const quickLink = target.closest('.start-quick-link') as HTMLElement;
      if (quickLink && quickLink.dataset.path) {
        const path = quickLink.dataset.path;
        if (path === 'settings') {
          this.openApp('settings');
        } else {
          // Determine path - simple mapping for now
          if (path === 'home') {
            if (window.electronAPI) window.electronAPI.getHome().then(p => this.loadFiles(p));
          } else if (path === 'root') {
            this.loadFiles('/');
          } else if (path === 'Music') {
            if (window.electronAPI) {
              window.electronAPI.getAppPath().then(appPath => {
                const sep = appPath.includes('\\') ? '\\' : '/';
                this.loadFiles(`${appPath}${sep}music`);
              });
            }
          } else {
            // For Docs/Downloads/Pictures, we assume they are in User Home
            // This requires async, but we are in a sync handler.
            if (window.electronAPI) {
              window.electronAPI.getHome().then(home => {
                const sep = home.includes('\\') ? '\\' : '/';
                this.loadFiles(`${home}${sep}${path}`);
              });
            }
          }
          this.openApp('files');
        }
        this.showStartMenu = false;
        this.render();
        return;
      }

      // Start menu power button
      const startPowerBtn = target.closest('.start-power-btn') as HTMLElement;
      if (startPowerBtn && startPowerBtn.dataset.powerAction) {
        const action = startPowerBtn.dataset.powerAction;
        if (action === 'shutdown' && window.electronAPI) window.electronAPI.shutdown();
        if (action === 'restart' && window.electronAPI) window.electronAPI.restart();
        if (action === 'lock') this.lock();
        this.showStartMenu = false;
        return;
      }

      // Settings: audio device refresh
      const audioRefreshBtn = target.closest('.audio-refresh-btn') as HTMLElement;
      if (audioRefreshBtn) {
        void this.refreshAudioDevices().then(() => this.refreshSettingsWindow());
        return;
      }

      // Settings: display refresh
      const displayRefreshBtn = target.closest('.display-refresh-btn') as HTMLElement;
      if (displayRefreshBtn) {
        void this.refreshDisplayOutputs().then(() => this.refreshSettingsWindow());
        return;
      }

      // Settings: saved networks actions
      const savedNetBtn = target.closest('.saved-net-btn') as HTMLElement;
      if (savedNetBtn && savedNetBtn.dataset.action && savedNetBtn.dataset.key) {
        const action = savedNetBtn.dataset.action;
        const key = savedNetBtn.dataset.key;
        if (action === 'connect' && window.electronAPI?.connectSavedNetwork) {
          this.showNotification('Network', `Connecting to ${key}...`, 'info');
          void window.electronAPI.connectSavedNetwork(key).then(res => {
            if (!res.success) this.showNotification('Network', res.error || 'Connect failed', 'error');
            void this.refreshNetworkStatus();
          });
        }
        if (action === 'forget' && window.electronAPI?.forgetSavedNetwork) {
          void this.openConfirmModal({
            title: 'Forget Network',
            message: `Remove saved network "${key}"?`,
            confirmText: 'Forget',
            cancelText: 'Cancel'
          }).then(ok => {
            if (!ok) return;
            void window.electronAPI!.forgetSavedNetwork!(key).then(res => {
              if (!res.success) this.showNotification('Network', res.error || 'Forget failed', 'error');
              void this.refreshSavedNetworks();
            });
          });
        }
        return;
      }

      // Settings: theme buttons
      const themeBtn = target.closest('.theme-btn') as HTMLElement;
      if (themeBtn && themeBtn.dataset.theme) {
        const theme = themeBtn.dataset.theme === 'light' ? 'light' : 'dark';
        this.themeMode = theme;
        this.applyTheme();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
        return;
      }

      // Settings: wallpaper buttons
      const wallpaperBtn = target.closest('.wallpaper-btn') as HTMLElement;
      if (wallpaperBtn && wallpaperBtn.dataset.wallpaper) {
        this.wallpaperImage = wallpaperBtn.dataset.wallpaper;
        this.applyWallpaper();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
        return;
      }

      // Settings: about refresh
      const aboutRefreshBtn = target.closest('.about-refresh-btn') as HTMLElement;
      if (aboutRefreshBtn) {
        void this.refreshSystemInfo().then(() => this.refreshSettingsWindow());
        return;
      }

      // Click outside start menu closes it
      if (this.showStartMenu && !target.closest('.start-menu') && !target.closest('.start-btn')) {
        this.showStartMenu = false;
        this.startMenuSearchQuery = ''; // Reset search when closing
        this.render();
      }





      // Refresh Word of God - click anywhere in the word-of-god container
      const wogContent = target.closest('.word-of-god') as HTMLElement;
      if (wogContent) {
        this.refreshWordOfGod();
        return;
      }

      // Desktop icon clicks
      const iconEl = target.closest('.desktop-icon') as HTMLElement;
      if (iconEl) {
        const launchKey = iconEl.dataset.launchKey;
        if (launchKey) {
          this.launchByKey(launchKey);
          return;
        }
        if (iconEl.dataset.app) {
          const appId = iconEl.dataset.app!;
          this.openApp(appId);
          return;
        }
      }

      // Focus window (only if clicking on window but not on controls)
      const windowEl = target.closest('.window') as HTMLElement;
      if (windowEl) {
        this.focusWindow(windowEl.dataset.windowId!);

        // Focus terminal input when clicking on terminal window
        if (windowEl.dataset.windowId?.startsWith('terminal')) {
          setTimeout(() => {
            const input = document.querySelector('.terminal-input') as HTMLInputElement;
            if (input) input.focus();
          }, 10);
        }

        // Focus editor textarea when clicking on editor window
        if (windowEl.dataset.windowId?.startsWith('editor')) {
          setTimeout(() => {
            const textarea = windowEl.querySelector('textarea') as HTMLTextAreaElement;
            if (textarea) textarea.focus();
          }, 10);
        }
      }

      // ============================================
      // FILE BROWSER HANDLERS
      // ============================================

      // File/folder click in file browser
      const fileItem = target.closest('.file-item') as HTMLElement;
      if (fileItem) {
        const filePath = fileItem.dataset.filePath;
        const isDir = fileItem.dataset.isDir === 'true';
        const trashPath = fileItem.dataset.trashPath || '';
        const effectivePath = (this.currentPath === 'trash:' && trashPath) ? trashPath : (filePath || '');
        if (effectivePath && isDir) {
          this.loadFiles(effectivePath);
        } else if (effectivePath && window.electronAPI) {
          // Open file with system default app
          window.electronAPI.openExternal(effectivePath);
        }
        return;
      }

      // Breadcrumb click
      const breadcrumb = target.closest('.breadcrumb-item') as HTMLElement;
      if (breadcrumb && breadcrumb.dataset.path) {
        this.loadFiles(breadcrumb.dataset.path);
        return;
      }

      // Sidebar favorites
      const sidebarLink = target.closest('.file-sidebar-link') as HTMLElement;
      if (sidebarLink && sidebarLink.dataset.path) {
        this.loadFiles(sidebarLink.dataset.path);
        return;
      }

      // Column header sorting (list view)
      const colHeader = target.closest('.file-col-header') as HTMLElement;
      if (colHeader && colHeader.dataset.sortKey) {
        const key = colHeader.dataset.sortKey as 'name' | 'size' | 'modified';
        if (this.fileSortMode === key) {
          this.fileSortDir = this.fileSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.fileSortMode = key;
          this.fileSortDir = key === 'name' ? 'asc' : 'desc';
        }
        this.updateFileBrowserWindow();
        return;
      }

      // Navigation buttons
      const navBtn = target.closest('.nav-btn') as HTMLElement;
      if (navBtn && navBtn.dataset.nav) {
        const nav = navBtn.dataset.nav;
        if (nav === 'back') {
          // Go to parent directory
          const isWindows = this.currentPath.includes('\\');
          const separator = isWindows ? '\\' : '/';
          const parentPath = this.currentPath.split(/[/\\]/).slice(0, -1).join(separator) || (isWindows ? 'C:\\' : '/');
          this.loadFiles(parentPath);
        } else if (nav === 'home') {
          // Go to home directory
          if (window.electronAPI) {
            window.electronAPI.getHome().then(home => this.loadFiles(home));
          }
        } else if (nav === 'refresh') {
          this.loadFiles(this.currentPath);
        }
        return;
      }

      // Trash: empty
      const emptyTrashBtn = target.closest('.trash-empty-btn') as HTMLElement;
      if (emptyTrashBtn) {
        if (!window.electronAPI?.emptyTrash) return;
        void this.openConfirmModal({
          title: 'Empty Trash',
          message: 'Permanently delete all items in Trash?',
          confirmText: 'Empty',
          cancelText: 'Cancel'
        }).then(ok => {
          if (!ok) return;
          void window.electronAPI!.emptyTrash!().then(res => {
            if (!res.success) this.showNotification('Files', res.error || 'Failed to empty trash', 'error');
            void this.loadFiles('trash:');
          });
        });
        return;
      }

      // File browser view toggle
      const viewToggle = target.closest('.file-view-toggle') as HTMLElement;
      if (viewToggle && viewToggle.dataset.view) {
        this.fileViewMode = viewToggle.dataset.view === 'list' ? 'list' : 'grid';
        this.updateFileBrowserWindow();
        return;
      }

      // ============================================
      // SYSTEM MONITOR (Task Manager) HANDLERS
      // ============================================
      const monitorRefreshBtn = target.closest('.monitor-refresh-btn') as HTMLElement;
      if (monitorRefreshBtn) {
        void this.ensureSystemMonitorPolling(true);
        return;
      }

      const monitorHeader = target.closest('.monitor-col-header') as HTMLElement;
      if (monitorHeader && monitorHeader.dataset.sortKey) {
        const key = monitorHeader.dataset.sortKey as any;
        if (this.monitorSort === key) {
          this.monitorSortDir = this.monitorSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.monitorSort = key;
          this.monitorSortDir = key === 'name' ? 'asc' : 'desc';
        }
        this.refreshSystemMonitorWindowDom();
        return;
      }

      const killBtn = target.closest('.proc-kill-btn') as HTMLElement;
      if (killBtn && killBtn.dataset.pid) {
        const pid = parseInt(killBtn.dataset.pid, 10);
        const name = killBtn.dataset.name || `PID ${pid}`;
        if (!Number.isFinite(pid) || !window.electronAPI?.killProcess) return;
        void this.openConfirmModal({
          title: 'End Task',
          message: `End "${name}" (PID ${pid})?`,
          confirmText: 'End task',
          cancelText: 'Cancel'
        }).then(ok => {
          if (!ok) return;
          void window.electronAPI!.killProcess!(pid, 'TERM').then(async (res) => {
            if (!res.success) {
              const force = await this.openConfirmModal({
                title: 'Force Kill',
                message: (res.error || 'Failed to end task') + '\n\nTry SIGKILL (force)?',
                confirmText: 'Force kill',
                cancelText: 'Cancel'
              });
              if (!force) return;
              const r2 = await window.electronAPI!.killProcess!(pid, 'KILL');
              if (!r2.success) await this.openAlertModal({ title: 'Task Manager', message: r2.error || 'Force kill failed' });
            }
            void this.refreshSystemMonitorData(true);
          });
        });
        return;
      }

      // ============================================
      // HOLY UPDATER HANDLERS
      // ============================================
      const updaterBtn = target.closest('.updater-btn') as HTMLElement;
      if (updaterBtn && updaterBtn.dataset.updaterAction) {
        const action = updaterBtn.dataset.updaterAction;
        if (action === 'check') {
          this.checkForUpdates();
        } else if (action === 'update') {
          this.runUpdate();
        } else if (action === 'reboot' && window.electronAPI) {
          window.electronAPI.restart();
        }
        return;
      }

      // ============================================
      // HYMN PLAYER HANDLERS
      // ============================================
      // Hymn item click (select from playlist)
      const hymnItem = target.closest('.hymn-item') as HTMLElement;
      if (hymnItem && hymnItem.dataset.hymnIndex) {
        const idx = parseInt(hymnItem.dataset.hymnIndex, 10);
        this.playHymn(idx);
        return;
      }

      // Hymn control buttons
      const hymnControl = target.closest('.hymn-control') as HTMLElement;
      if (hymnControl && hymnControl.dataset.action) {
        const action = hymnControl.dataset.action;
        if (action === 'prev') {
          this.playHymn(this.currentHymn - 1);
        } else if (action === 'next') {
          this.playHymn(this.currentHymn + 1);
        } else if (action === 'random') {
          this.playHymn(Math.floor(Math.random() * this.hymnList.length));
        }
        return;
      }
    });

    // Window dragging & Resizing
    app.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;

      // Check for resize handle FIRST
      const resizeHandle = target.closest('.resize-handle') as HTMLElement;
      if (resizeHandle) {
        e.preventDefault();
        const windowId = resizeHandle.dataset.window!;
        const dir = resizeHandle.dataset.resizeDir!;
        const win = this.windows.find(w => w.id === windowId);
        if (win) {
          this.resizeState = {
            windowId,
            dir,
            startX: e.clientX,
            startY: e.clientY,
            startW: win.width,
            startH: win.height,
            startXLoc: win.x,
            startYLoc: win.y
          };
          this.focusWindow(windowId);
        }
        return;
      }

      // Don't start drag if clicking on buttons
      if (target.closest('.window-btn')) {
        return;
      }

      const header = target.closest('[data-draggable]') as HTMLElement;
      if (header) {
        const windowId = header.dataset.draggable!;
        const windowEl = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement;
        const rect = windowEl.getBoundingClientRect();
        this.dragState = {
          windowId,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top
        };
        this.focusWindow(windowId);
      }
    });

    document.addEventListener('mousemove', (e) => {
      // RESIZE LOGIC
      if (this.resizeState) {
        e.preventDefault();
        const win = this.windows.find(w => w.id === this.resizeState!.windowId);
        if (win) {
          const dx = e.clientX - this.resizeState.startX;
          const dy = e.clientY - this.resizeState.startY;
          const dir = this.resizeState.dir;

          const MIN_W = 200;
          const MIN_H = 150;

          if (dir.includes('e')) {
            win.width = Math.max(MIN_W, this.resizeState.startW + dx);
          }
          if (dir.includes('s')) {
            win.height = Math.max(MIN_H, this.resizeState.startH + dy);
          }
          if (dir.includes('w')) {
            const newW = Math.max(MIN_W, this.resizeState.startW - dx);
            if (newW !== win.width) { // Only move X if width actually changed
              win.x = this.resizeState.startXLoc + (this.resizeState.startW - newW);
              win.width = newW;
            }
          }
          if (dir.includes('n')) {
            const newH = Math.max(MIN_H, this.resizeState.startH - dy);
            if (newH !== win.height) { // Only move Y if height actually changed
              win.y = this.resizeState.startYLoc + (this.resizeState.startH - newH);
              win.height = newH;
            }
          }

          // Apply changes
          const windowEl = document.querySelector(`[data-window-id="${win.id}"]`) as HTMLElement;
          if (windowEl) {
            windowEl.style.width = `${win.width}px`;
            windowEl.style.height = `${win.height}px`;
            windowEl.style.left = `${win.x}px`;
            windowEl.style.top = `${win.y}px`;
          }
        }
        return; // Skip drag logic
      }

      if (this.dragState) {
        const win = this.windows.find(w => w.id === this.dragState!.windowId);
        if (win) {
          // Normal drag
          win.x = e.clientX - this.dragState.offsetX;
          win.y = e.clientY - this.dragState.offsetY;

          const windowEl = document.querySelector(`[data-window-id="${win.id}"]`) as HTMLElement;
          if (windowEl) {
            windowEl.style.left = `${win.x}px`;
            windowEl.style.top = `${win.y}px`;
          }

          // Snapping Logic
          const SNAP_MARGIN = 20;
          const { clientX: x, clientY: y } = e;
          const { innerWidth: w, innerHeight: h } = window;

          let snapRect = null;
          let snapType = '';

          // Corners & Edges
          if (y < SNAP_MARGIN) {
            if (x < SNAP_MARGIN) { snapType = 'top-left'; snapRect = { x: 0, y: 0, width: w / 2, height: h / 2 }; }
            else if (x > w - SNAP_MARGIN) { snapType = 'top-right'; snapRect = { x: w / 2, y: 0, width: w / 2, height: h / 2 }; }
            else { snapType = 'maximize'; snapRect = { x: 0, y: 0, width: w, height: h - 50 }; } // Subtract taskbar
          } else if (y > h - SNAP_MARGIN) {
            if (x < SNAP_MARGIN) { snapType = 'bottom-left'; snapRect = { x: 0, y: h / 2, width: w / 2, height: (h / 2) - 50 }; }
            else if (x > w - SNAP_MARGIN) { snapType = 'bottom-right'; snapRect = { x: w / 2, y: h / 2, width: w / 2, height: (h / 2) - 50 }; }
          } else if (x < SNAP_MARGIN) {
            snapType = 'left'; snapRect = { x: 0, y: 0, width: w / 2, height: h - 50 };
          } else if (x > w - SNAP_MARGIN) {
            snapType = 'right'; snapRect = { x: w / 2, y: 0, width: w / 2, height: h - 50 };
          }

          const preview = document.getElementById('snap-preview');
          if (preview) {
            if (snapRect) {
              preview.style.display = 'block';
              preview.style.left = `${snapRect.x}px`;
              preview.style.top = `${snapRect.y}px`;
              preview.style.width = `${snapRect.width}px`;
              preview.style.height = `${snapRect.height}px`;
              this.snapState = { type: snapType, rect: snapRect };
            } else {
              preview.style.display = 'none';
              this.snapState = null;
            }
          }
        }
      }
    });

    document.addEventListener('mouseup', () => {
      this.resizeState = null;

      // Apply snap if exists
      if (this.dragState && this.snapState) {
        const win = this.windows.find(w => w.id === this.dragState!.windowId);
        if (win) {
          win.x = this.snapState.rect.x;
          win.y = this.snapState.rect.y;
          win.width = this.snapState.rect.width;
          win.height = this.snapState.rect.height;

          // If maximized via snap, set flag
          if (this.snapState.type === 'maximize') {
            win.maximized = true;
          } else {
            win.maximized = false;
            // Save these bounds as "restored" or "normal" if we want? 
            // Actually, usually snapping IS the new state.
          }
        }
        this.render();
      }

      this.dragState = null;
      this.snapState = null;
      const preview = document.getElementById('snap-preview');
      if (preview) preview.style.display = 'none';
    });

    // Terminal input
    app.addEventListener('keydown', (e) => {
      if (this.modal) return;
      const target = e.target as HTMLElement;
      if (target.classList.contains('terminal-input')) {
        const input = target as HTMLInputElement;

        // Copy/paste like a real terminal
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
          const selection = window.getSelection()?.toString() || '';
          if (selection) {
            e.preventDefault();
            void navigator.clipboard.writeText(selection);
          }
          return;
        }
        if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') || (e.ctrlKey && e.key.toLowerCase() === 'v')) {
          e.preventDefault();
          void navigator.clipboard.readText().then(text => {
            if (!text) return;
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            input.value = input.value.slice(0, start) + text + input.value.slice(end);
            const pos = start + text.length;
            input.setSelectionRange(pos, pos);
          });
          return;
        }

        // Tab completion (fallback terminal only)
        if (e.key === 'Tab') {
          e.preventDefault();
          void this.terminalTabComplete(input);
          return;
        }

        // Ctrl+F opens terminal search
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          this.terminalSearchOpen = true;
          this.updateTerminalSearchMatches();
          this.refreshTerminalWindow();
          return;
        }

        if (e.key === 'Enter') {
          void this.handleTerminalCommandV2(input.value);
          input.value = '';
          this.terminalHistoryIndex = this.terminalHistory.length;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (this.terminalHistory.length) {
            if (this.terminalHistoryIndex < 0) this.terminalHistoryIndex = this.terminalHistory.length;
            this.terminalHistoryIndex = Math.max(0, this.terminalHistoryIndex - 1);
            input.value = this.terminalHistory[this.terminalHistoryIndex] || '';
            input.setSelectionRange(input.value.length, input.value.length);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (this.terminalHistory.length) {
            this.terminalHistoryIndex = Math.min(this.terminalHistory.length, this.terminalHistoryIndex + 1);
            input.value = this.terminalHistoryIndex >= this.terminalHistory.length ? '' : (this.terminalHistory[this.terminalHistoryIndex] || '');
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }
      }

      // Global shortcuts
      const key = e.key.toLowerCase();
      if (key === 'l' && (e.metaKey || e.ctrlKey)) { // Win+L or Ctrl+L
        e.preventDefault();
        this.lock();
      }

      // Reset auto-lock on mouse move
      // window.addEventListener('mousemove', () => this.resetAutoLockTimer());
      // window.addEventListener('click', () => this.resetAutoLockTimer());

      // ============================================
      // GLOBAL KEYBOARD SHORTCUTS
      // ============================================
      document.addEventListener('keydown', (e) => {
        if (this.modal) {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (this.modal.type === 'prompt') this.closeModal(null);
            else if (this.modal.type === 'confirm') this.closeModal(false);
            else this.closeModal(undefined);
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (this.modal.type === 'prompt') this.closeModal(this.modal.inputValue ?? '');
            else if (this.modal.type === 'confirm') this.closeModal(true);
            else this.closeModal(undefined);
            return;
          }
        }

        // Launcher overlay takes precedence over window-level shortcuts
        if (this.showAppLauncher && e.key === 'Escape') {
          e.preventDefault();
          this.closeAppLauncher();
          return;
        }

        // Editor Ctrl+F - Find
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
          const target = e.target as HTMLElement;
          const editorWindow = this.windows.find(w => w.id.startsWith('editor') && w.active);
          if (editorWindow && (target.classList.contains('editor-content') || target.closest('.editor-container'))) {
            e.preventDefault();
            this.editorFindMode = 'find';
            this.editorFindOpen = true;
            this.editorUpdateFindMatches();
            this.refreshEditorWindow();
            setTimeout(() => {
              const input = document.querySelector('.editor-find-input') as HTMLInputElement | null;
              input?.focus();
              input?.select();
            }, 50);
            return;
          }
        }

        // Editor Ctrl+H - Replace
        if (e.ctrlKey && e.key.toLowerCase() === 'h') {
          const target = e.target as HTMLElement;
          const editorWindow = this.windows.find(w => w.id.startsWith('editor') && w.active);
          if (editorWindow && (target.classList.contains('editor-content') || target.closest('.editor-container'))) {
            e.preventDefault();
            this.editorFindMode = 'replace';
            this.editorFindOpen = true;
            this.editorUpdateFindMatches();
            this.refreshEditorWindow();
            setTimeout(() => {
              const input = document.querySelector('.editor-find-input') as HTMLInputElement | null;
              input?.focus();
              input?.select();
            }, 50);
            return;
          }
        }

        // Editor F3 - Find Next, Shift+F3 - Find Prev
        if (e.key === 'F3') {
          const editorWindow = this.windows.find(w => w.id.startsWith('editor') && w.active);
          if (editorWindow && this.editorFindOpen) {
            e.preventDefault();
            if (e.shiftKey) {
              this.editorFindPrev();
            } else {
              this.editorFindNext();
            }
            return;
          }
        }

        // Win+E - File Explorer
        if (e.metaKey && e.key.toLowerCase() === 'e') {
          e.preventDefault();
          this.openApp('files');
          return;

        }

        // Super+A - App Launcher
        if (e.metaKey && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          if (this.showAppLauncher) this.closeAppLauncher();
          else this.openAppLauncher();
          return;
        }

        // Win+D - Show Desktop (minimize all)
        if (e.metaKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          this.toggleShowDesktop();
          return;
        }

        // Ctrl+Shift+Esc - Task Manager
        if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
          e.preventDefault();
          this.openApp('system-monitor');
          return;
        }

        // Win+X - Quick Link Menu
        if (e.metaKey && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          this.showContextMenu(18, window.innerHeight - 64, [
            { label: 'Files', action: () => this.openApp('files') },
            { label: 'Terminal', action: () => this.openApp('terminal') },
            { label: 'Task Manager', action: () => this.openApp('system-monitor') },
            { divider: true },
            { label: 'Settings', action: () => this.openApp('settings') },
            { divider: true },
            { label: 'Lock', action: () => this.lock() },
            { label: 'Restart', action: () => window.electronAPI?.restart() },
            { label: 'Shutdown', action: () => window.electronAPI?.shutdown() },
          ]);
          return;
        }

        // Alt+F4 - Close active window
        if (e.altKey && e.key === 'F4') {
          e.preventDefault();
          const activeWindow = this.windows.find(w => w.active && !w.minimized);
          if (activeWindow) {
            this.closeWindow(activeWindow.id);
          }
        }

        // Alt+Tab - Cycle through windows
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault();
          this.stepAltTab(e.shiftKey ? -1 : 1);
        }

        // Super/Meta opens Start Menu (Windows-like)
        if (!this.showAppLauncher && (e.key === 'Meta' || e.key === 'OS') && !e.repeat) {
          const target = e.target as HTMLElement;
          const tag = target?.tagName;
          if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
            e.preventDefault();
            this.showStartMenu = !this.showStartMenu;
            if (!this.showStartMenu) this.startMenuSearchQuery = '';
            this.render();
          }
        }

        // Escape - Close active window (optional, like some apps)
        // Only if not in an input field
        const target = e.target as HTMLElement;
        if (e.key === 'Escape' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          if (this.altTabOpen) {
            this.cancelAltTab();
            return;
          }
          const activeWindow = this.windows.find(w => w.active && !w.minimized);
          if (activeWindow) {
            this.minimizeWindow(activeWindow.id);
          }
        }

        // F5 - Refresh file browser
        if (e.key === 'F5') {
          e.preventDefault();
          const filesWindow = this.windows.find(w => w.id.startsWith('files') && !w.minimized);
          if (filesWindow) {
            this.loadFiles(this.currentPath);
          }
        }
      });

      document.addEventListener('keyup', (e) => {
        if (e.key === 'Alt' && this.altTabOpen) {
          this.commitAltTab();
        }
      });

      // ============================================
      // CONTEXT MENU (Right-Click)
      // ============================================



      // 2. Global Item Listener (Delegation for Icons, Taskbar, etc)
      app.addEventListener('contextmenu', (e) => {
        console.log('⚡ CONTEXTMENU EVENT FIRED!');
        const target = e.target as HTMLElement;

        // Determine context (Items only)
        const startAppItem = target.closest('.start-app-item, .launcher-app-tile') as HTMLElement;
        const taskbarItem = target.closest('.taskbar-app') as HTMLElement;
        const desktopIcon = target.closest('.desktop-icon') as HTMLElement;
        const fileItem = target.closest('.file-item') as HTMLElement;
        const fileBrowserEl = target.closest('.file-browser') as HTMLElement;

        // Desktop Background Check
        // Check if we clicked on desktop area but NOT on a desktop icon or window
        const clickedOnDesktopArea = target.closest('#desktop') !== null;
        const clickedOnIcon = target.closest('.desktop-icon') !== null;
        const clickedOnWindow = target.closest('.window') !== null;
        const isBackground = clickedOnDesktopArea && !clickedOnIcon && !clickedOnWindow && !desktopIcon && !fileItem && !fileBrowserEl;

        // DEBUG: Comprehensive logging
        console.group('🖱️ RIGHT-CLICK EVENT');
        console.log('📍 Position:', { x: e.clientX, y: e.clientY });
        console.log('🎯 Target:', target);
        console.log('  - tagName:', target.tagName);
        console.log('  - className:', target.className);
        console.log('  - id:', target.id);
        console.log('📦 Detected Context Items:');
        console.log('  - startAppItem:', !!startAppItem, startAppItem);
        console.log('  - taskbarItem:', !!taskbarItem, taskbarItem);
        console.log('  - desktopIcon:', !!desktopIcon, desktopIcon);
        console.log('  - fileItem:', !!fileItem, fileItem);
        console.log('  - fileBrowserEl:', !!fileBrowserEl, fileBrowserEl);
        console.log('🖥️ Desktop Detection:');
        console.log('  - clickedOnDesktopArea:', clickedOnDesktopArea);
        console.log('  - clickedOnIcon:', clickedOnIcon);
        console.log('  - clickedOnWindow:', clickedOnWindow);
        console.log('✅ Final Result:');
        console.log('  - isBackground:', isBackground);
        console.groupEnd();

        if (isBackground) {
          e.preventDefault();
          this.closeContextMenu();

          this.showContextMenu(e.clientX, e.clientY, [
            { label: '📁 Open Files', action: () => this.openApp('files') },
            { label: '💻 Open Terminal', action: () => this.openApp('terminal') },
            { divider: true },
            { label: '🔄 Refresh', action: () => this.loadFiles(this.currentPath) },
            { label: '⚙️ Settings', action: () => this.openApp('settings') },
            { divider: true },
            { label: 'ℹ️ About TempleOS', action: () => this.openSettingsToAbout() },
          ]);
          return;
        }

        if (startAppItem || taskbarItem || desktopIcon || fileItem || fileBrowserEl) {
          e.preventDefault();
          this.closeContextMenu();
        }

        if (startAppItem) {
          const key =
            startAppItem.dataset.launchKey ||
            (startAppItem.dataset.app ? `builtin:${startAppItem.dataset.app}` : '');
          const display = key ? this.launcherDisplayForKey(key) : null;
          if (key && display) {
            const pinnedStart = this.pinnedStart.includes(key);
            const pinnedTaskbar = this.pinnedTaskbar.includes(key);
            const onDesktop = this.desktopShortcuts.some(s => s.key === key);
            this.showContextMenu(e.clientX, e.clientY, [
              { label: `🚀 Open`, action: () => this.launchByKeyClosingShellUi(key) },
              { divider: true },
              { label: pinnedStart ? '📌 Unpin from Start' : '📌 Pin to Start', action: () => { pinnedStart ? this.unpinStart(key) : this.pinStart(key); this.render(); } },
              { label: pinnedTaskbar ? '📌 Unpin from Taskbar' : '📌 Pin to Taskbar', action: () => { pinnedTaskbar ? this.unpinTaskbar(key) : this.pinTaskbar(key); this.render(); } },
              { label: onDesktop ? '🗑️ Remove from Desktop' : '➕ Add to Desktop', action: () => { onDesktop ? this.removeDesktopShortcut(key) : this.addDesktopShortcut(key); } },
            ]);
            return;
          }
        }

        if (taskbarItem) {
          const key = taskbarItem.dataset.launchKey || '';
          const windowId = taskbarItem.dataset.taskbarWindow || '';
          if (key) {
            const pinnedStart = this.pinnedStart.includes(key);
            const onDesktop = this.desktopShortcuts.some(s => s.key === key);
            this.showContextMenu(e.clientX, e.clientY, [
              { label: `🚀 Open`, action: () => this.launchByKeyClosingShellUi(key) },
              { divider: true },
              { label: '📌 Unpin from Taskbar', action: () => { this.unpinTaskbar(key); this.render(); } },
              { label: pinnedStart ? '📌 Unpin from Start' : '📌 Pin to Start', action: () => { pinnedStart ? this.unpinStart(key) : this.pinStart(key); this.render(); } },
              { label: onDesktop ? '🗑️ Remove from Desktop' : '➕ Add to Desktop', action: () => { onDesktop ? this.removeDesktopShortcut(key) : this.addDesktopShortcut(key); } },
            ]);
            return;
          }
          if (windowId) {
            const appId = windowId.split('-')[0];
            const appKey = `builtin:${appId}`;
            const pinnedTaskbar = this.pinnedTaskbar.includes(appKey);
            this.showContextMenu(e.clientX, e.clientY, [
              { label: '🔼 Restore/Focus', action: () => this.toggleWindow(windowId) },
              { label: '❌ Close', action: () => this.closeWindow(windowId) },
              { divider: true },
              { label: pinnedTaskbar ? '📌 Unpin from Taskbar' : '📌 Pin to Taskbar', action: () => { pinnedTaskbar ? this.unpinTaskbar(appKey) : this.pinTaskbar(appKey); this.render(); } },
            ]);
            return;
          }
        }

        if (desktopIcon) {
          const key = desktopIcon.dataset.launchKey || (desktopIcon.dataset.app ? `builtin:${desktopIcon.dataset.app}` : '');
          if (key) {
            const pinnedStart = this.pinnedStart.includes(key);
            const pinnedTaskbar = this.pinnedTaskbar.includes(key);
            const isBuiltInDesktop = !!desktopIcon.dataset.app;
            this.showContextMenu(e.clientX, e.clientY, [
              { label: `🚀 Open`, action: () => this.launchByKey(key) },
              { divider: true },
              { label: pinnedStart ? '📌 Unpin from Start' : '📌 Pin to Start', action: () => { pinnedStart ? this.unpinStart(key) : this.pinStart(key); this.render(); } },
              { label: pinnedTaskbar ? '📌 Unpin from Taskbar' : '📌 Pin to Taskbar', action: () => { pinnedTaskbar ? this.unpinTaskbar(key) : this.pinTaskbar(key); this.render(); } },
              ...(isBuiltInDesktop ? [] : [{ label: '🗑️ Remove from Desktop', action: () => this.removeDesktopShortcut(key) }]),
            ]);
            return;
          }
        }

        if (fileItem) {
          // File/folder context menu
          const filePath = fileItem.dataset.filePath || '';
          const isDir = fileItem.dataset.isDir === 'true';
          const trashPath = fileItem.dataset.trashPath || '';
          const originalPath = fileItem.dataset.originalPath || '';
          if (this.currentPath === 'trash:' && (trashPath || filePath)) {
            const actualTrashPath = trashPath || filePath;
            const openOriginalFolder = () => {
              if (!originalPath) return;
              const isWindows = originalPath.includes('\\') || originalPath.match(/^[A-Z]:/i);
              const separator = isWindows ? '\\' : '/';
              const parent = originalPath.split(/[/\\]/).slice(0, -1).join(separator) || (isWindows ? 'C:\\' : '/');
              this.loadFiles(parent);
            };
            this.showContextMenu(e.clientX, e.clientY, [
              { label: '📂 Open', action: () => isDir ? this.loadFiles(actualTrashPath) : window.electronAPI?.openExternal(actualTrashPath) },
              { divider: true },
              { label: '♻️ Restore', action: () => void this.restoreTrashItem(actualTrashPath, originalPath) },
              { label: '❌ Delete Permanently', action: () => void this.confirmDeleteTrashItem(actualTrashPath) },
              { divider: true },
              ...(originalPath ? [{ label: '📋 Copy Original Path', action: () => navigator.clipboard.writeText(originalPath) }] : []),
              ...(originalPath ? [{ label: '📁 Open Original Folder', action: () => openOriginalFolder() }] : []),
            ]);
            return;
          }
          this.showContextMenu(e.clientX, e.clientY, [
            { label: '📂 Open', action: () => isDir ? this.loadFiles(filePath) : window.electronAPI?.openExternal(filePath) },
            { label: '📋 Copy', action: () => { this.fileClipboard = { mode: 'copy', srcPath: filePath }; this.showNotification('Files', `Copied ${getBaseName(filePath)}`, 'info'); } },
            { label: '✂️ Cut', action: () => { this.fileClipboard = { mode: 'cut', srcPath: filePath }; this.showNotification('Files', `Cut ${getBaseName(filePath)}`, 'info'); } },
            { label: '✏️ Rename', action: () => this.promptRename(filePath) },
            { label: '🗑️ Delete', action: () => this.confirmDelete(filePath) },
            { divider: true },
            { label: '📋 Copy Path', action: () => navigator.clipboard.writeText(filePath) },
          ]);
        } else if (fileBrowserEl && !target.closest('.taskbar')) {
          if (this.currentPath === 'trash:') {
            this.showContextMenu(e.clientX, e.clientY, [
              { label: '🔄 Refresh', action: () => this.loadFiles('trash:') },
              { divider: true },
              { label: '❌ Empty Trash', action: () => (document.querySelector('.trash-empty-btn') as HTMLButtonElement | null)?.click() },
            ]);
            return;
          }
          const canPaste = !!this.fileClipboard && !!this.currentPath;
          this.showContextMenu(e.clientX, e.clientY, [
            { label: '📁 New Folder', action: () => this.promptNewFolder() },
            { label: '📄 New File', action: () => this.promptNewFile() },
            { divider: true },
            ...(canPaste ? [{ label: '📋 Paste', action: () => void this.pasteIntoCurrentFolder() }] : []),
            { divider: true },
            { label: '🔄 Refresh', action: () => this.loadFiles(this.currentPath) },
          ]);
        }
      });

      // Close context menu on outside left-click/tap (keep right-click working).
      const closeContextMenuOnPointer = (ev: MouseEvent) => {
        const menu = document.querySelector('.context-menu') as HTMLElement | null;
        if (!menu) return;
        const t = ev.target as HTMLElement | null;
        if (t && t.closest('.context-menu')) return;
        if (ev.button === 2) return; // right-click should open/reposition, not instantly close
        this.closeContextMenu();
      };
      document.addEventListener('mousedown', closeContextMenuOnPointer, true);
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') this.closeContextMenu();
      });

      // Start Menu Search
      app.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;

        if (target.classList.contains('start-search-input')) {
          this.startMenuSearchQuery = target.value;
          // Re-render Start Menu with filtered results
          const startMenuEl = document.querySelector('.start-menu');
          if (startMenuEl) {
            // Get new HTML and replace
            const newHTML = this.renderStartMenu();
            startMenuEl.outerHTML = newHTML;
            // Re-focus input and restore cursor position
            const newInput = document.querySelector('.start-search-input') as HTMLInputElement;
            if (newInput) {
              newInput.focus();
              newInput.setSelectionRange(target.selectionStart, target.selectionEnd);
            }
          }
        }

        if (target.classList.contains('monitor-search-input')) {
          this.monitorQuery = target.value;
          this.refreshSystemMonitorWindowDom();
        }

        // Editor content change
        if (target.hasAttribute('data-editor-textarea')) {
          const currentTab = this.editorTabs[this.activeEditorTab];
          if (currentTab) {
            currentTab.content = target.value;
            currentTab.modified = true;
            // Update tab modified indicator without full refresh
            const tabEl = document.querySelector(`.editor-tab[data-editor-tab="${this.activeEditorTab}"]`);
            if (tabEl && !tabEl.querySelector('.editor-tab-modified')) {
              const modSpan = document.createElement('span');
              modSpan.className = 'editor-tab-modified';
              modSpan.textContent = 'ΓùÅ';
              tabEl.insertBefore(modSpan, tabEl.firstChild);
            }
          }
        }

        // Editor find input
        if (target.hasAttribute('data-editor-find-input')) {
          this.editorFindQuery = target.value;
          this.editorUpdateFindMatches();
          // Update count display without full refresh
          const countEl = document.querySelector('.editor-find-count');
          if (countEl) {
            countEl.textContent = this.editorFindMatches.length > 0
              ? `${this.editorFindCurrentMatch + 1}/${this.editorFindMatches.length}`
              : '';
          }
        }

        // Editor replace input
        if (target.hasAttribute('data-editor-replace-input')) {
          this.editorReplaceQuery = target.value;
        }
      });


      // Settings Navigation
      app.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const settingsItem = target.closest('.settings-nav-item') as HTMLElement;
        if (settingsItem && settingsItem.dataset.settingsCat) {
          this.activeSettingsCategory = settingsItem.dataset.settingsCat;
          const win = this.windows.find(w => w.id.startsWith('settings'));
          if (win) {
            win.content = this.getSettingsContentV2();
            this.render();
          }
        }
      });
    });
  }

  // Open Settings directly to About tab
  // Open Settings directly to About tab
  private openSettingsToAbout() {
    this.activeSettingsCategory = 'About';
    this.openApp('settings');
  }

  private getPathSeparator(path: string): string {
    return (path.includes('\\') || path.match(/^[A-Z]:/i)) ? '\\' : '/';
  }

  private joinPath(base: string, name: string): string {
    const sep = this.getPathSeparator(base);
    if (!base) return name;
    if (base.endsWith(sep)) return base + name;
    return base + sep + name;
  }

  private openApp(appId: string) {
    const existingWindow = this.windows.find(w => w.id.startsWith(appId));
    if (existingWindow) {
      this.focusWindow(existingWindow.id);
      return;
    }

    this.recordAppLaunch(`builtin:${appId}`);

    let windowConfig: Partial<WindowState> = {};

    switch (appId) {
      case 'terminal':
        windowConfig = {
          title: 'Terminal',
          icon: '💻',
          width: 600,
          height: 400,
          content: this.getTerminalContent()
        };
        break;
      case 'word-of-god':
        windowConfig = {
          title: 'Word of God',
          icon: '✝️',
          width: 550,
          height: 400,
          content: this.getWordOfGodContent()
        };
        break;
      case 'files':
        windowConfig = {
          title: 'File Browser',
          icon: '📁',
          width: 600,
          height: 450,
          content: this.getFileBrowserContentV2()
        };
        // Load real files after window opens
        setTimeout(() => this.loadFiles(), 100);
        break;
      case 'editor':
        windowConfig = {
          title: 'HolyC Editor',
          icon: '📝',
          width: 600,
          height: 450,
          content: this.getEditorContent()
        };
        break;
      case 'updater':
        windowConfig = {
          title: 'Holy Updater',
          icon: '⬇️',
          width: 500,
          height: 350,
          content: this.getUpdaterContent()
        };
        // Check for updates when window opens
        setTimeout(() => this.checkForUpdates(), 100);
        break;
      case 'hymns':
        windowConfig = {
          title: 'Hymn Player',
          icon: '🎵',
          width: 450,
          height: 500,
          content: this.getHymnPlayerContent()
        };
        break;
      case 'system-monitor':
        windowConfig = {
          title: 'Task Manager',
          icon: '📊',
          width: 900,
          height: 600,
          content: this.getSystemMonitorContent()
        };
        setTimeout(() => void this.ensureSystemMonitorPolling(true), 100);
        break;
      case 'settings':
        windowConfig = {
          title: 'Settings',
          icon: '⚙️',
          width: 800,
          height: 600,
          content: this.getSettingsContentV2()
        };
        break;
    }

    const newWindow: WindowState = {
      id: `${appId}-${++this.windowIdCounter}`,
      title: windowConfig.title || 'Window',
      icon: windowConfig.icon || '📄',
      x: 100 + (this.windows.length * 30),
      y: 50 + (this.windows.length * 30),
      width: windowConfig.width || 400,
      height: windowConfig.height || 300,
      content: windowConfig.content || '',
      active: true,
      minimized: false,
      maximized: false
    };

    this.windows.forEach(w => w.active = false);
    this.windows.push(newWindow);
    this.render();

    // Focus terminal input or initialize xterm
    if (appId === 'terminal') {
      setTimeout(() => {
        if (this.ptySupported) {
          // Initialize xterm.js for visible panes
          this.ensureVisibleTerminalXterms();
        } else {
          // Fallback: focus basic terminal input
          const input = document.querySelector('.terminal-input') as HTMLInputElement;
          if (input) input.focus();
        }
      }, 100);
    }

    if (appId === 'editor') {
      setTimeout(() => this.ensureEditorView(), 100);
    }
  }


  private getTerminalContent(): string {
    // Ensure at least one tab exists
    if (this.terminalTabs.length === 0) {
      this.terminalTabs.push({
        id: `tab-${Date.now()}`,
        ptyId: null,
        title: 'Terminal 1',
        buffer: [] as string[],
        cwd: this.terminalCwd || '',
        xterm: null,
        fitAddon: null
      });
    }


    const currentTab = this.terminalTabs[this.activeTerminalTab] || this.terminalTabs[0];

    const tabsHtml = this.terminalTabs.map((tab, i) => `
      <div class="terminal-tab ${i === this.activeTerminalTab ? 'active' : ''}" data-terminal-tab="${i}">
        ${escapeHtml(tab.title)}
        ${this.terminalTabs.length > 1 ? `<span class="terminal-tab-close" data-terminal-close="${i}">&times;</span>` : ''}
      </div>
    `).join('');

    const searchQuery = this.terminalSearchQuery.trim();
    const searchCountText = searchQuery
      ? (this.terminalSearchMatches.length > 0 && this.terminalSearchMatchIndex >= 0
        ? `${this.terminalSearchMatchIndex + 1}/${this.terminalSearchMatches.length}`
        : '0/0')
      : '';

    const searchBarHtml = this.terminalSearchOpen ? `
      <div class="terminal-search-bar">
        <input class="terminal-search-input" type="text" placeholder="Search output..." value="${escapeHtml(this.terminalSearchQuery)}" />
        <button class="terminal-search-btn" data-terminal-action="search-prev" title="Previous (Shift+Enter)">Prev</button>
        <button class="terminal-search-btn" data-terminal-action="search-next" title="Next (Enter)">Next</button>
        <div class="terminal-search-count">${searchCountText}</div>
        <button class="terminal-search-btn terminal-search-close" data-terminal-action="search-close" title="Close (Esc)">&times;</button>
      </div>
    ` : '';

    // Use xterm.js container if PTY is supported, otherwise fallback to basic terminal
    if (this.ptySupported && currentTab) {
      const primaryId = currentTab.id;
      const secondaryId = (this.terminalSplitMode !== 'single' && this.terminalSplitSecondaryTabId && this.terminalSplitSecondaryTabId !== primaryId && this.terminalTabs.some(t => t.id === this.terminalSplitSecondaryTabId))
        ? this.terminalSplitSecondaryTabId
        : null;

      return `
        <div class="terminal-container" data-terminal-theme="${this.terminalUiTheme}">
          <div class="terminal-tabs">
            ${tabsHtml}
            <div class="terminal-tab-new" data-terminal-new title="New Tab">+</div>
            <div class="terminal-tab-tools">
              <button class="terminal-tool" data-terminal-action="search" title="Search (Ctrl+F)">Find</button>
              ${this.terminalSplitMode === 'single' ? `
                <button class="terminal-tool" data-terminal-action="split-v" title="Split Vertical">Split V</button>
                <button class="terminal-tool" data-terminal-action="split-h" title="Split Horizontal">Split H</button>
              ` : `
                <button class="terminal-tool active" data-terminal-action="unsplit" title="Close Split">Unsplit</button>
              `}
              <button class="terminal-tool" data-terminal-action="settings" title="Terminal Settings">Settings</button>
            </div>
          </div>
          ${searchBarHtml}
          <div class="xterm-layout ${this.terminalSplitMode}">
            ${this.terminalTabs.map((tab) => `
              <div class="xterm-container ${tab.id === primaryId ? 'pane-primary' : ''} ${secondaryId && tab.id === secondaryId ? 'pane-secondary' : ''}" id="xterm-container-${tab.id}"></div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Fallback: Basic HTML terminal (no PTY)
    const prompt = this.formatTerminalPrompt((currentTab?.cwd || this.terminalCwd || 'C:/'));
    const bufferContent = currentTab?.buffer.length > 0
      ? currentTab.buffer.join('')
      : (this.terminalBuffer.length > 0
        ? this.terminalBuffer.join('')
        : `
            <div class="terminal-line system">TempleOS Terminal - Command Line</div>
            <div class="terminal-line system">Type 'help' for built-ins, or run Linux commands.</div>
            <div class="terminal-line"></div>
          `);

    return `
      <div class="terminal-container" data-terminal-theme="${this.terminalUiTheme}">
        <div class="terminal-tabs">
          ${tabsHtml}
          <div class="terminal-tab-new" data-terminal-new title="New Tab">+</div>
          <div class="terminal-tab-tools">
            <button class="terminal-tool" data-terminal-action="search" title="Search (Ctrl+F)">Find</button>
            <button class="terminal-tool" data-terminal-action="settings" title="Terminal Settings">Settings</button>
          </div>
        </div>
        ${searchBarHtml}
        <div class="terminal">
          <div class="terminal-output" id="terminal-output">
            ${bufferContent}
          </div>
          <div class="terminal-input-line">
            <span class="terminal-prompt">${escapeHtml(prompt)}</span>
            <input type="text" class="terminal-input" autofocus />
          </div>
        </div>
      </div>
    `;
  }

  private formatTerminalPrompt(cwd: string): string {
    const safeCwd = String(cwd || '').replace(/</g, '').replace(/>/g, '');
    const user = (this.systemInfo?.user || 'user').replace(/</g, '').replace(/>/g, '');
    const host = (this.systemInfo?.hostname || 'temple').replace(/</g, '').replace(/>/g, '');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return String(this.terminalPromptTemplate || '{cwd}>')
      .replaceAll('{cwd}', safeCwd)
      .replaceAll('{user}', user)
      .replaceAll('{host}', host)
      .replaceAll('{time}', time);
  }

  private getTerminalThemeForeground(): string {
    switch (this.terminalUiTheme) {
      case 'cyan': return '#00d4ff';
      case 'amber': return '#ffd700';
      case 'white': return '#c9d1d9';
      default: return '#00ff41';
    }
  }

  private getTerminalThemeSelection(): string {
    const fg = this.getTerminalThemeForeground();
    const m = fg.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const hex = m[1];
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.28)`;
    }
    return 'rgba(0, 255, 65, 0.28)';
  }

  // Initialize xterm.js for the current terminal tab
  private async initXtermForTab(tabIndex: number): Promise<void> {
    const tab = this.terminalTabs[tabIndex];
    if (!tab || tab.xterm) return; // Already initialized

    const container = document.getElementById(`xterm-container-${tab.id}`);
    if (!container) return;

    const fg = this.getTerminalThemeForeground();

    // Create xterm instance
    const xterm = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: fg,
        cursor: fg,
        cursorAccent: '#0d1117',
        selectionBackground: this.getTerminalThemeSelection(),
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
      },
      fontFamily: this.terminalFontFamily,
      fontSize: this.terminalFontSize,
      cursorBlink: true,
      scrollback: 10000
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(container);
    fitAddon.fit();

    tab.xterm = xterm;
    tab.fitAddon = fitAddon;

    // Create PTY if available
    if (window.electronAPI?.createPty) {
      const result = await window.electronAPI.createPty({
        cols: xterm.cols,
        rows: xterm.rows,
        cwd: tab.cwd || undefined
      });

      if (result.success && result.id) {
        tab.ptyId = result.id;

        // Handle terminal input -> PTY
        xterm.onData((data) => {
          if (tab.ptyId && window.electronAPI?.writePty) {
            void window.electronAPI.writePty(tab.ptyId, data);
          }
        });

        // Handle resize
        xterm.onResize(({ cols, rows }) => {
          if (tab.ptyId && window.electronAPI?.resizePty) {
            void window.electronAPI.resizePty(tab.ptyId, cols, rows);
          }
        });
      } else {
        // PTY creation failed, show error
        xterm.writeln('\x1b[31mPTY not available. Using fallback mode.\x1b[0m');
        xterm.writeln('Type commands and press Enter.');
      }
    }

    // Resize on window resize
    window.addEventListener('resize', () => {
      fitAddon.fit();
    });
  }

  private ensureVisibleTerminalXterms(): void {
    if (!this.ptySupported) return;
    if (this.terminalTabs.length === 0) return;

    const primaryIdx = Math.max(0, Math.min(this.activeTerminalTab, this.terminalTabs.length - 1));
    void this.initXtermForTab(primaryIdx);

    if (this.terminalSplitMode !== 'single' && this.terminalSplitSecondaryTabId) {
      const secondaryIdx = this.terminalTabs.findIndex(t => t.id === this.terminalSplitSecondaryTabId);
      if (secondaryIdx >= 0 && secondaryIdx !== primaryIdx) {
        void this.initXtermForTab(secondaryIdx);
      }
    }

    // Fit visible panes after any DOM/layout changes
    window.setTimeout(() => {
      const primary = this.terminalTabs[primaryIdx];
      primary?.fitAddon?.fit();
      if (this.terminalSplitMode !== 'single' && this.terminalSplitSecondaryTabId) {
        const secondaryIdx = this.terminalTabs.findIndex(t => t.id === this.terminalSplitSecondaryTabId);
        if (secondaryIdx >= 0 && secondaryIdx !== primaryIdx) {
          this.terminalTabs[secondaryIdx]?.fitAddon?.fit();
        }
      }
    }, 0);
  }

  // Handle PTY data events
  private setupPtyListeners(): void {
    if (window.electronAPI?.onTerminalData) {
      window.electronAPI.onTerminalData((data) => {
        const tab = this.terminalTabs.find(t => t.ptyId === data.id);
        if (tab?.xterm) {
          tab.xterm.write(data.data);
        }
      });
    }

    if (window.electronAPI?.onTerminalExit) {
      window.electronAPI.onTerminalExit((data) => {
        const tab = this.terminalTabs.find(t => t.ptyId === data.id);
        if (tab?.xterm) {
          tab.xterm.writeln(`\r\n\x1b[33m[Process exited with code ${data.exitCode}]\x1b[0m`);
          tab.ptyId = null;
        }
      });
    }
  }

  private updateTerminalSearchMatches(): void {
    const q = this.terminalSearchQuery.trim();
    if (!q) {
      this.terminalSearchMatches = [];
      this.terminalSearchMatchIndex = -1;
      return;
    }

    const qLower = q.toLowerCase();
    const matches: number[] = [];

    if (this.ptySupported) {
      const tab = this.terminalTabs[this.activeTerminalTab];
      const xterm = tab?.xterm as any;
      const active = xterm?.buffer?.active as any;
      const len = typeof active?.length === 'number' ? active.length : 0;
      const start = Math.max(0, len - 5000);
      for (let i = start; i < len; i++) {
        const line = active?.getLine?.(i);
        if (!line) continue;
        const text = String(line.translateToString?.(true) || '');
        if (text.toLowerCase().includes(qLower)) matches.push(i);
      }
    } else {
      const tab = this.terminalTabs[this.activeTerminalTab];
      const source = (tab?.buffer?.length ? tab.buffer : this.terminalBuffer);
      for (let i = 0; i < source.length; i++) {
        const text = source[i].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
        if (text.includes(qLower)) matches.push(i);
      }
    }

    this.terminalSearchMatches = matches;
    this.terminalSearchMatchIndex = matches.length ? 0 : -1;
  }

  private terminalSearchNext(): void {
    if (this.terminalSearchMatches.length === 0) return;
    this.terminalSearchMatchIndex = (this.terminalSearchMatchIndex + 1) % this.terminalSearchMatches.length;
    this.updateTerminalSearchCountDom();
    this.scrollTerminalToSearchMatch();
  }

  private terminalSearchPrev(): void {
    if (this.terminalSearchMatches.length === 0) return;
    this.terminalSearchMatchIndex = (this.terminalSearchMatchIndex - 1 + this.terminalSearchMatches.length) % this.terminalSearchMatches.length;
    this.updateTerminalSearchCountDom();
    this.scrollTerminalToSearchMatch();
  }

  private updateTerminalSearchCountDom(): void {
    const el = document.querySelector('.terminal-search-count') as HTMLElement | null;
    if (!el) return;
    const q = this.terminalSearchQuery.trim();
    if (!q) {
      el.textContent = '';
      return;
    }
    el.textContent = this.terminalSearchMatches.length > 0 && this.terminalSearchMatchIndex >= 0
      ? `${this.terminalSearchMatchIndex + 1}/${this.terminalSearchMatches.length}`
      : '0/0';
  }

  private scrollTerminalToSearchMatch(): void {
    if (this.terminalSearchMatchIndex < 0) return;
    const lineIndex = this.terminalSearchMatches[this.terminalSearchMatchIndex];
    if (typeof lineIndex !== 'number') return;

    if (this.ptySupported) {
      const tab = this.terminalTabs[this.activeTerminalTab];
      const xterm = tab?.xterm as any;
      if (xterm && typeof xterm.scrollToLine === 'function') {
        xterm.scrollToLine(lineIndex);
      }
      return;
    }

    const output = document.getElementById('terminal-output') as HTMLElement | null;
    if (!output) return;
    const lines = output.querySelectorAll('.terminal-line');
    const lineEl = lines.item(lineIndex) as HTMLElement | null;
    if (!lineEl) return;
    lineEl.scrollIntoView({ block: 'center' });
    lineEl.classList.add('terminal-search-hit');
    window.setTimeout(() => lineEl.classList.remove('terminal-search-hit'), 450);
  }

  private terminalBuiltinCommands(): string[] {
    return [
      'help', 'clear', 'confess',
      'cd', 'pwd',
      'alias', 'unalias', 'prompt',
      'god', 'oracle', 'hymn', 'terry', 'neofetch', 'pray', 'psalm',
      'cowsay', 'fortune', 'matrix', 'figlet', 'sl',
      'time', 'about',
    ];
  }

  private async terminalTabComplete(input: HTMLInputElement): Promise<void> {
    const full = input.value;
    const pos = input.selectionStart ?? full.length;
    const left = full.slice(0, pos);
    const right = full.slice(pos);

    const m = left.match(/(?:^|\s)([^\s]*)$/);
    const token = m?.[1] ?? '';
    const tokenStart = m ? (left.length - token.length) : pos;
    if (!token) return;

    const isCommandToken = tokenStart === 0;
    const tokenLower = token.toLowerCase();
    const tab = this.terminalTabs[this.activeTerminalTab] || this.terminalTabs[0];
    const cwd = tab?.cwd || this.terminalCwd || '';

    const apply = (replacement: string, addSpace: boolean) => {
      const next = full.slice(0, tokenStart) + replacement + (addSpace ? ' ' : '') + right;
      input.value = next;
      const nextPos = tokenStart + replacement.length + (addSpace ? 1 : 0);
      input.setSelectionRange(nextPos, nextPos);
    };

    const printSuggestions = (items: string[]) => {
      const list = items.slice(0, 40).join('  ');
      if (tab) {
        tab.buffer.push(`<div class="terminal-line system">${escapeHtml(list)}</div>`);
      } else {
        this.terminalBuffer.push(`<div class="terminal-line system">${escapeHtml(list)}</div>`);
      }
      this.refreshTerminalWindow();
    };

    const commonPrefix = (arr: string[]) => {
      if (arr.length === 0) return '';
      let p = arr[0];
      for (let i = 1; i < arr.length; i++) {
        const s = arr[i];
        let j = 0;
        while (j < p.length && j < s.length && p[j].toLowerCase() === s[j].toLowerCase()) j++;
        p = p.slice(0, j);
        if (!p) break;
      }
      return p;
    };

    const isPathLike = /[\\/]/.test(token) || token.startsWith('.') || token.startsWith('~') || token.match(/^[A-Za-z]:/);

    // Command completion
    if (isCommandToken && !isPathLike) {
      const candidates = Array.from(new Set([...this.terminalBuiltinCommands(), ...Object.keys(this.terminalAliases)])).sort();
      const matches = candidates.filter(c => c.toLowerCase().startsWith(tokenLower));
      if (matches.length === 0) return;
      if (matches.length === 1) {
        apply(matches[0], true);
        return;
      }
      const cp = commonPrefix(matches);
      if (cp && cp.length > token.length) {
        apply(cp, false);
        return;
      }
      printSuggestions(matches);
      return;
    }

    // Path completion (best-effort; requires Electron FS bridge)
    if (!window.electronAPI?.readDir) return;

    let tokenExpanded = token;
    if (tokenExpanded.startsWith('~') && this.homePath) {
      tokenExpanded = this.homePath + tokenExpanded.slice(1);
    }

    const lastSlash = Math.max(tokenExpanded.lastIndexOf('/'), tokenExpanded.lastIndexOf('\\\\'));
    const dirPart = lastSlash >= 0 ? tokenExpanded.slice(0, lastSlash + 1) : '';
    const basePart = lastSlash >= 0 ? tokenExpanded.slice(lastSlash + 1) : tokenExpanded;
    const baseLower = basePart.toLowerCase();

    const sep = this.getPathSeparator(tokenExpanded || cwd || '/');
    const isAbs = dirPart.startsWith('/') || dirPart.startsWith('\\\\') || dirPart.startsWith('//') || /^[A-Za-z]:[\\\\/]/.test(dirPart);
    const dirToList = (() => {
      const rawDir = dirPart.replace(/[\\/]+$/, '');
      if (!rawDir) return cwd || (sep === '\\' ? 'C:\\' : '/');
      if (isAbs) return rawDir;
      const base = cwd || (sep === '\\' ? 'C:\\' : '/');
      return this.joinPath(base, rawDir);
    })();

    const res = await window.electronAPI.readDir(dirToList);
    if (!res.success || !Array.isArray(res.entries)) return;

    const entries = res.entries
      .filter(e => e && typeof e.name === 'string')
      .map(e => ({ name: e.name, isDirectory: !!e.isDirectory }))
      .filter(e => e.name.toLowerCase().startsWith(baseLower))
      .map(e => e.isDirectory ? (e.name + sep) : e.name);

    if (entries.length === 0) return;
    if (entries.length === 1) {
      apply(dirPart + entries[0], false);
      return;
    }
    const cp = commonPrefix(entries);
    if (cp && cp.length > basePart.length) {
      apply(dirPart + cp, false);
      return;
    }
    printSuggestions(entries);
  }



  private async handleTerminalCommandV2(command: string): Promise<void> {
    const typed = (command || '').trim();
    if (!typed) return;

    const tab = this.terminalTabs[this.activeTerminalTab] || this.terminalTabs[0];
    if (!tab) return;
    const buf = tab.buffer;

    if (buf.length === 0 && this.terminalBuffer.length) {
      buf.push(...this.terminalBuffer);
    }

    if (!tab.cwd) tab.cwd = this.terminalCwd || this.homePath || '/';
    if (!this.terminalCwd) this.terminalCwd = tab.cwd;

    this.terminalHistory.push(typed);
    this.terminalHistoryIndex = this.terminalHistory.length;

    const prompt = this.formatTerminalPrompt(tab.cwd || this.terminalCwd || 'C:/');
    buf.push(`<div class="terminal-line">${escapeHtml(prompt)} ${escapeHtml(typed)}</div>`);

    // Alias expansion (first token only)
    let expanded = typed;
    const firstToken = typed.split(/\s+/)[0]?.toLowerCase() || '';
    const alias = firstToken ? this.terminalAliases[firstToken] : undefined;
    if (alias) {
      const rest = typed.slice(firstToken.length).trim();
      expanded = alias + (rest ? ` ${rest}` : '');
    }

    const parts = expanded.split(/\s+/);
    const base = (parts.shift() || '').toLowerCase();
    const args = parts;

    const print = (line: string, cls?: string) => {
      const klass = cls ? ` ${cls}` : '';
      buf.push(`<div class="terminal-line${klass}">${ansiToHtml(line)}</div>`);
    };

    if (base === 'help') {
      print('Built-ins:', 'system');
      print('  help                  Show this help', 'system');
      print('  clear                 Clear output', 'system');
      print('  confess               Clear history ("sins")', 'system');
      print('  cd [path]             Change directory', 'system');
      print('  pwd                   Print working directory', 'system');
      print('  alias [k=v]           Set/list aliases', 'system');
      print('  unalias <k>           Remove alias', 'system');
      print('  prompt [template]     Set prompt ({cwd} {user} {host} {time})', 'system');
      print('  theme <name>          green|cyan|amber|white', 'system');
      print('  fontsize <n>          10-32', 'system');
      print('  god                   Random Bible verse', 'system');
      print('  oracle                Random word(s)', 'system');
      print('  terry                 Random Terry quote', 'system');
      print('  neofetch              System info (Temple styled)', 'system');
      print('  pray                  Random prayer', 'system');
      print('  psalm                 Random psalm', 'system');
      print('  cowsay [msg]          ASCII cow', 'system');
      print('  fortune               Random wisdom', 'system');
      print('  matrix                Matrix rain (static)', 'system');
      print('  figlet <text>         ASCII banner', 'system');
      print('  sl                    Steam locomotive', 'system');
      print('  hymn                  Open Hymn Player (random)', 'system');
      print('Tip: You can run OS commands too (non-interactive).', 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'clear') {
      buf.length = 0;
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'confess') {
      this.terminalHistory = [];
      this.terminalHistoryIndex = -1;
      buf.length = 0;
      print('Sins forgiven. History cleared.', 'gold');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'pwd') {
      print(tab.cwd || this.terminalCwd || '', 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'cd') {
      let target = args.join(' ').trim();
      if (!target) {
        if (this.homePath) {
          tab.cwd = this.homePath;
        } else if (window.electronAPI?.getHome) {
          try {
            tab.cwd = await window.electronAPI.getHome();
            this.homePath = tab.cwd;
          } catch {
            tab.cwd = '/';
          }
        } else {
          tab.cwd = '/';
        }
        this.terminalCwd = tab.cwd;
        this.refreshTerminalWindow();
        return;
      }

      if (target.startsWith('~')) {
        if (this.homePath) {
          target = this.homePath + target.slice(1);
        } else if (window.electronAPI?.getHome) {
          try {
            const home = await window.electronAPI.getHome();
            this.homePath = home;
            target = home + target.slice(1);
          } catch {
            // ignore
          }
        }
      }

      const sep = this.getPathSeparator(tab.cwd || target);
      const isAbs = target.startsWith('/') || target.startsWith('\\\\') || target.startsWith('//') || target.match(/^[A-Za-z]:/i);
      if (!isAbs) {
        const basePath = tab.cwd || this.terminalCwd || (sep === '\\' ? 'C:\\' : '/');
        target = this.joinPath(basePath, target);
      }

      tab.cwd = target;
      this.terminalCwd = target;
      print(`CWD: ${tab.cwd}`, 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'alias') {
      if (args.length === 0) {
        const keys = Object.keys(this.terminalAliases).sort();
        if (keys.length === 0) {
          print('No aliases set.', 'system');
        } else {
          for (const k of keys) {
            print(`alias ${k}='${this.terminalAliases[k]}'`, 'system');
          }
        }
        this.refreshTerminalWindow();
        return;
      }

      const rest = typed.slice('alias'.length).trim();
      const eq = rest.indexOf('=');
      if (eq !== -1) {
        const name = rest.slice(0, eq).trim().toLowerCase();
        let value = rest.slice(eq + 1).trim();
        if (!/^[a-z0-9_\\-]+$/.test(name)) {
          print('Invalid alias name.', 'error');
          this.refreshTerminalWindow();
          return;
        }
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        this.terminalAliases[name] = value;
        this.queueSaveConfig();
        print(`alias ${name}='${value}'`, 'system');
        this.refreshTerminalWindow();
        return;
      }

      if (args.length === 1) {
        const name = args[0].toLowerCase();
        const value = this.terminalAliases[name];
        if (!value) print('Alias not found.', 'error');
        else print(`alias ${name}='${value}'`, 'system');
        this.refreshTerminalWindow();
        return;
      }

      const name = args[0].toLowerCase();
      const value = args.slice(1).join(' ');
      if (!/^[a-z0-9_\\-]+$/.test(name)) {
        print('Invalid alias name.', 'error');
        this.refreshTerminalWindow();
        return;
      }
      this.terminalAliases[name] = value;
      this.queueSaveConfig();
      print(`alias ${name}='${value}'`, 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'unalias') {
      const name = (args[0] || '').toLowerCase();
      if (!name) {
        print('Usage: unalias <name>', 'system');
        this.refreshTerminalWindow();
        return;
      }
      if (this.terminalAliases[name] !== undefined) {
        delete this.terminalAliases[name];
        this.queueSaveConfig();
        print(`Removed alias: ${name}`, 'system');
      } else {
        print('Alias not found.', 'error');
      }
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'prompt') {
      const next = args.join(' ').trim();
      if (!next) {
        print(`Prompt: ${this.terminalPromptTemplate}`, 'system');
      } else {
        this.terminalPromptTemplate = next;
        this.queueSaveConfig();
        print('Prompt updated.', 'system');
      }
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'theme') {
      const next = (args[0] || '').toLowerCase();
      if (!next) {
        print(`Theme: ${this.terminalUiTheme}`, 'system');
        this.refreshTerminalWindow();
        return;
      }
      const allowed = ['green', 'cyan', 'amber', 'white'] as const;
      if (!allowed.includes(next as any)) {
        print('Usage: theme green|cyan|amber|white', 'system');
        this.refreshTerminalWindow();
        return;
      }
      this.terminalUiTheme = next as any;
      this.queueSaveConfig();
      if (this.ptySupported) {
        const fg = this.getTerminalThemeForeground();
        const selection = this.getTerminalThemeSelection();
        for (const t of this.terminalTabs) {
          if (!t.xterm) continue;
          t.xterm.options.theme = {
            ...(t.xterm.options.theme || {}),
            foreground: fg,
            cursor: fg,
            selectionBackground: selection,
          };
          t.fitAddon?.fit();
        }
      }
      print(`Theme set: ${this.terminalUiTheme}`, 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'fontsize') {
      const n = parseInt(args[0] || '', 10);
      if (!Number.isFinite(n)) {
        print('Usage: fontsize <10-32>', 'system');
        this.refreshTerminalWindow();
        return;
      }
      this.terminalFontSize = Math.max(10, Math.min(32, Math.round(n)));
      this.queueSaveConfig();
      if (this.ptySupported) {
        for (const t of this.terminalTabs) {
          if (!t.xterm) continue;
          t.xterm.options.fontSize = this.terminalFontSize;
          t.fitAddon?.fit();
        }
      }
      print(`Font size: ${this.terminalFontSize}`, 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'oracle') {
      const count = Math.max(1, Math.min(12, parseInt(args[0] || '1', 10) || 1));
      const words: string[] = [];
      for (let i = 0; i < count; i++) {
        words.push(oracleWordList[Math.floor(Math.random() * oracleWordList.length)]);
      }
      print(`ORACLE: ${words.join(' ')}`, 'gold');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'terry') {
      const q = terryQuotes[Math.floor(Math.random() * terryQuotes.length)];
      print(q, 'gold');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'pray') {
      const p = prayers[Math.floor(Math.random() * prayers.length)];
      print(p, 'gold');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'psalm') {
      const psalms = bibleVerses.filter(v => v.ref.toLowerCase().startsWith('psalm'));
      const verse = (psalms.length ? psalms : bibleVerses)[Math.floor(Math.random() * (psalms.length ? psalms.length : bibleVerses.length))];
      print(`"${verse.text}"`, 'gold');
      print(verse.ref, 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'fortune') {
      const pick = Math.random() < 0.35
        ? bibleVerses[Math.floor(Math.random() * bibleVerses.length)].text
        : fortunes[Math.floor(Math.random() * fortunes.length)];
      print(pick, 'gold');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'cowsay') {
      const msg = (args.join(' ') || 'Moo').slice(0, 120);
      const top = ' ' + '_'.repeat(msg.length + 2);
      const mid = `< ${msg} >`;
      const bot = ' ' + '-'.repeat(msg.length + 2);
      [top, mid, bot,
        '        \\\\   ^__^',
        '         \\\\  (oo)\\\\_______',
        '            (__)\\\\       )\\\\/\\\\',
        '                ||----w |',
        '                ||     ||',
      ].forEach(l => print(l, 'system'));
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'matrix') {
      const chars = '01abcdef';
      for (let r = 0; r < 18; r++) {
        let line = '';
        for (let c = 0; c < 64; c++) line += chars[Math.floor(Math.random() * chars.length)];
        print(line, 'system');
      }
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'figlet') {
      const text = args.join(' ').trim();
      if (!text) {
        print('Usage: figlet <text>', 'system');
        this.refreshTerminalWindow();
        return;
      }
      const up = text.toUpperCase().slice(0, 48);
      const border = '='.repeat(up.length + 4);
      print(border, 'system');
      print(`| ${up} |`, 'system');
      print(border, 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'sl') {
      [
        '      ====        ________                ___________ ',
        '  _D _|  |_______/        \\\\__I_I_____===__|_________| ',
        '   |(_)---  |   H\\\\________/ |   |        =|___ ___|   ',
        '   /     |  |   H  |  |     |   |         ||_| |_||   ',
        '  |      |  |   H  |__--------------------| [___] |   ',
        '  | ________|___H__/__|_____/[][]~\\\\_______|       |   ',
        '  |/ |   |-----------I_____I [][] []  D   |=======|__ ',
      ].forEach(l => print(l, 'system'));
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'neofetch') {
      const info = this.systemInfo;
      const art = [
        'â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—',
        'â•‘  T E M P L E  O S    â•‘',
        'â•‘      R E M A K E     â•‘',
        'â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•',
      ];
      art.forEach(l => print(l, 'gold'));
      print(`OS: TempleOS Remake`, 'system');
      if (info) {
        print(`User: ${info.user}`, 'system');
        print(`Host: ${info.hostname}`, 'system');
        print(`Platform: ${info.platform}`, 'system');
        print(`Uptime: ${this.formatDuration(info.uptime)}`, 'system');
        print(`CPU: ${info.cpus} cores`, 'system');
        const used = Math.max(0, info.memory.total - info.memory.free);
        print(`Memory: ${this.formatFileSize(used)} / ${this.formatFileSize(info.memory.total)}`, 'system');
      }
      print(`Theme: ${this.themeMode}/${this.terminalUiTheme}`, 'system');
      print(`Quote: ${fortunes[Math.floor(Math.random() * fortunes.length)]}`, 'gold');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'god') {
      const verse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
      print(`"${verse.text}"`, 'gold');
      print(verse.ref, 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'hymn') {
      print('Opening Divine Hymns...', 'success');
      setTimeout(() => {
        this.openApp('hymns');
        setTimeout(() => this.playHymn(Math.floor(Math.random() * this.hymnList.length)), 200);
      }, 50);
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'time') {
      print(new Date().toLocaleString(), 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (base === 'about') {
      print('TempleOS Remake (Giangero Studio)', 'gold');
      print('A Modern OS with TempleOS Soul', 'system');
      this.refreshTerminalWindow();
      return;
    }

    if (!window.electronAPI?.execTerminal) {
      print(`Unknown command: ${typed}`, 'error');
      this.refreshTerminalWindow();
      return;
    }

    const res = await window.electronAPI.execTerminal(expanded, tab.cwd || undefined);
    if (res.success) {
      const out = (res.stdout || '').split(/\r?\n/).filter(l => l.length);
      const err = (res.stderr || '').split(/\r?\n/).filter(l => l.length);
      out.forEach(l => print(l));
      err.forEach(l => print(l, 'error'));
    } else {
      const msg = res.error || 'Command failed';
      print(msg, 'error');
      const out = (res.stdout || '').split(/\r?\n/).filter(l => l.length);
      const err = (res.stderr || '').split(/\r?\n/).filter(l => l.length);
      out.forEach(l => print(l));
      err.forEach(l => print(l, 'error'));
    }

    this.refreshTerminalWindow();
  }

  private getWordOfGodContent(): string {
    const verse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
    return `
      <div class="word-of-god">
        <h2>✝ WORD OF GOD ✝</h2>
        <p class="verse-text">"${verse.text}"</p>
        <p class="verse-reference">â€” ${verse.ref}</p>
        <p class="click-hint">🙏 Click anywhere for new word</p>
      </div>
    `;
  }

  private getFileBrowserContent(): string {
    // Show loading state initially, then render with JS after data loads
    const pathParts = this.currentPath.split(/[/\\]/).filter(p => p);
    const isWindows = this.currentPath.includes('\\') || this.currentPath.match(/^[A-Z]:/i);
    const separator = isWindows ? '\\' : '/';

    // Build breadcrumb HTML
    let breadcrumbHtml = `<span class="breadcrumb-item" data-path="${isWindows ? 'C:\\' : '/'}" style="cursor: pointer;">🏠 Root</span>`;
    let cumulativePath = isWindows ? '' : '';

    for (const part of pathParts) {
      cumulativePath += (isWindows ? (cumulativePath ? '\\' : '') : '/') + part;
      breadcrumbHtml += ` <span style="opacity: 0.5;">â€º</span> <span class="breadcrumb-item" data-path="${cumulativePath}" style="cursor: pointer;">${part}</span>`;
    }

    // Build file list HTML
    let filesHtml = '';

    if (this.fileEntries.length === 0 && this.currentPath) {
      filesHtml = '<div style="padding: 20px; opacity: 0.5;">Loading...</div>';
    } else if (this.fileEntries.length === 0) {
      filesHtml = '<div style="padding: 20px; opacity: 0.5;">Empty folder</div>';
    } else {
      // Add ".." for parent directory (unless at root)
      if (this.currentPath && this.currentPath !== '/' && !this.currentPath.match(/^[A-Z]:\\?$/i)) {
        const parentPath = this.currentPath.split(/[/\\]/).slice(0, -1).join(separator) || (isWindows ? 'C:\\' : '/');
        filesHtml += `
          <div class="file-item" data-file-path="${parentPath}" data-is-dir="true" style="cursor: pointer;">
            <span class="icon">ðŸ“‚</span>
            <span class="label" style="font-size: 12px;">..</span>
          </div>
        `;
      }

      for (const file of this.fileEntries) {
        const icon = getFileIcon(file.name, file.isDirectory);
        const sizeStr = file.isDirectory ? '' : this.formatFileSize(file.size);
        filesHtml += `
          <div class="file-item" data-file-path="${file.path}" data-is-dir="${file.isDirectory}" style="cursor: pointer;" title="${file.name}${sizeStr ? ' - ' + sizeStr : ''}">
            <span class="icon">${icon}</span>
            <span class="label" style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
          </div>
        `;
      }
    }

    return `
      <div class="file-browser" style="height: 100%; display: flex; flex-direction: column;">
        <div class="file-browser-toolbar" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,255,65,0.2); display: flex; gap: 10px; align-items: center;">
          <button class="nav-btn" data-nav="back" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">â† Back</button>
          <button class="nav-btn" data-nav="home" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">âŒ‚ Home</button>
          <button class="nav-btn" data-nav="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">â†» Refresh</button>
        </div>
        <div class="file-browser-breadcrumb" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,255,65,0.1); font-size: 13px;">
          ${breadcrumbHtml}
        </div>
        <div class="file-browser-content" style="flex: 1; overflow-y: auto; padding: 10px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
            ${filesHtml}
          </div>
        </div>
      </div>
    `;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private getTrashBrowserContentV2(): string {
    const entries = this.trashEntries
      .filter(t => !this.fileSearchQuery.trim() || t.name.toLowerCase().includes(this.fileSearchQuery.trim().toLowerCase()) || (t.originalPath || '').toLowerCase().includes(this.fileSearchQuery.trim().toLowerCase()))
      .slice(0, 200);

    const emptyState = this.trashEntries.length === 0
      ? '<div style="padding: 20px; opacity: 0.7;">Trash is empty.</div>'
      : (entries.length === 0 ? '<div style="padding: 20px; opacity: 0.7;">No items match your search.</div>' : '');

    return `
      <div class="file-browser" style="height: 100%; display: flex; flex-direction: column;">
        <div class="file-browser-toolbar" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,255,65,0.2); display: flex; gap: 10px; align-items: center;">
          <button class="nav-btn" data-nav="home" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">Home</button>
          <button class="nav-btn" data-nav="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">Refresh</button>
          <div style="flex:1;"></div>
          <button class="trash-empty-btn" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 4px 10px; cursor: pointer; border-radius: 6px;">Empty Trash</button>
        </div>
        <div class="file-browser-breadcrumb" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,255,65,0.1); font-size: 13px;">
          <span style="opacity: 0.7;">Trash</span>
        </div>
        <div style="padding: 10px; border-bottom: 1px solid rgba(0,255,65,0.12); display:flex; gap: 10px; align-items:center;">
          <input class="file-search-input" placeholder="Search trash..." value="${escapeHtml(this.fileSearchQuery)}" style="flex: 1; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.25); color: #00ff41; padding: 8px 10px; border-radius: 8px; font-family: inherit; outline: none;" />
        </div>
        <div class="file-browser-content" style="flex: 1; overflow-y: auto; padding: 10px; min-width: 0;">
          ${emptyState || `
            <div style="display: grid; grid-template-columns: 26px 1fr 1.5fr 140px; gap: 10px; padding: 6px 10px; opacity: 0.7; font-size: 12px;">
              <span></span><span>Name</span><span>Original Location</span><span>Deleted</span>
            </div>
            <div style="display:flex; flex-direction: column; gap: 6px;">
              ${entries.map(t => `
                <div class="file-item file-row" data-file-path="${escapeHtml(t.trashPath)}" data-is-dir="${t.isDirectory}" data-trash-path="${escapeHtml(t.trashPath)}" data-original-path="${escapeHtml(t.originalPath || '')}" style="cursor: pointer; display: grid; grid-template-columns: 26px 1fr 1.5fr 140px; gap: 10px; padding: 8px 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; background: rgba(0,0,0,0.15);">
                  <span style="opacity: 0.85;">${getFileIcon(t.name, t.isDirectory)}</span>
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(t.name)}</span>
                  <span style="opacity: 0.75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(t.originalPath || '')}</span>
                  <span style="opacity: 0.75;">${escapeHtml((t.deletionDate || '').replace('T', ' ').slice(0, 16))}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  private getFileBrowserContentV2(): string {
    if (this.currentPath === 'trash:') {
      return this.getTrashBrowserContentV2();
    }

    const pathParts = this.currentPath.split(/[/\\]/).filter(p => p);
    const isWindows = this.currentPath.includes('\\') || this.currentPath.match(/^[A-Z]:/i);
    const separator = isWindows ? '\\' : '/';

    let breadcrumbHtml = `<span class="breadcrumb-item" data-path="${isWindows ? 'C:\\' : '/'}" style="cursor: pointer;">This PC</span>`;
    let cumulativePath = isWindows ? '' : '';
    for (const part of pathParts) {
      cumulativePath += (isWindows ? (cumulativePath ? '\\' : '') : '/') + part;
      breadcrumbHtml += ` <span style="opacity: 0.5;">â€º</span> <span class="breadcrumb-item" data-path="${cumulativePath}" style="cursor: pointer;">${part}</span>`;
    }

    const query = this.fileSearchQuery.trim().toLowerCase();
    const files = this.fileEntries
      .filter(f => this.showHiddenFiles || !f.name.startsWith('.'))
      .filter(f => !query || f.name.toLowerCase().includes(query))
      .slice()
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        const dir = this.fileSortDir === 'desc' ? -1 : 1;
        if (this.fileSortMode === 'size') return dir * ((a.size || 0) - (b.size || 0));
        if (this.fileSortMode === 'modified') return dir * ((a.modified || '').localeCompare(b.modified || ''));
        return dir * a.name.localeCompare(b.name);
      });

    const parentPath = (() => {
      if (!this.currentPath) return null;
      if (this.currentPath === '/' || this.currentPath.match(/^[A-Z]:\\?$/i)) return null;
      return this.currentPath.split(/[/\\]/).slice(0, -1).join(separator) || (isWindows ? 'C:\\' : '/');
    })();

    const sidebarItems = (() => {
      const home = this.homePath || this.currentPath || (isWindows ? 'C:\\' : '/');
      const docs = this.joinPath(home, 'Documents');
      const downloads = this.joinPath(home, 'Downloads');
      const pictures = this.joinPath(home, 'Pictures');
      const music = this.joinPath(home, 'Music');
      return [
        { label: 'This PC', path: isWindows ? 'C:\\' : '/' },
        { label: 'Home', path: home },
        { label: 'Documents', path: docs },
        { label: 'Downloads', path: downloads },
        { label: 'Pictures', path: pictures },
        { label: 'Music', path: music },
        { label: 'Trash', path: 'trash:' },
      ];
    })();

    const emptyState = this.fileEntries.length === 0 && this.currentPath
      ? '<div style="padding: 20px; opacity: 0.6;">Loading...</div>'
      : (files.length === 0 && this.fileEntries.length > 0 ? '<div style="padding: 20px; opacity: 0.6;">No files match your search.</div>' : '');

    const gridHtml = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
        ${parentPath ? `
          <div class="file-item" data-file-path="${parentPath}" data-is-dir="true" style="cursor: pointer;" title="Parent folder">
            <span class="icon">ðŸ“</span>
            <span class="label" style="font-size: 12px;">..</span>
          </div>
        ` : ''}
        ${files.map(file => {
      const icon = getFileIcon(file.name, file.isDirectory);
      const sizeStr = file.isDirectory ? '' : this.formatFileSize(file.size);
      return `
            <div class="file-item" data-file-path="${file.path}" data-is-dir="${file.isDirectory}" style="cursor: pointer;" title="${file.name}${sizeStr ? ' - ' + sizeStr : ''}">
              <span class="icon">${icon}</span>
              <span class="label" style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
            </div>
          `;
    }).join('')}
      </div>
    `;

    const sortArrow = (key: 'name' | 'size' | 'modified') => {
      if (this.fileSortMode !== key) return '';
      return this.fileSortDir === 'asc' ? ' â–²' : ' â–¼';
    };

    const listHtml = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: grid; grid-template-columns: 26px 1fr 110px 170px; gap: 10px; padding: 6px 10px; opacity: 0.7; font-size: 12px;">
          <span></span>
          <span class="file-col-header" data-sort-key="name" style="cursor: pointer;">Name${sortArrow('name')}</span>
          <span class="file-col-header" data-sort-key="size" style="cursor: pointer;">Size${sortArrow('size')}</span>
          <span class="file-col-header" data-sort-key="modified" style="cursor: pointer;">Modified${sortArrow('modified')}</span>
        </div>
        ${parentPath ? `
          <div class="file-row file-item" data-file-path="${parentPath}" data-is-dir="true" style="cursor: pointer; display: grid; grid-template-columns: 26px 1fr 110px 170px; gap: 10px; padding: 8px 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; background: rgba(0,255,65,0.05);">
            <span class="icon">ðŸ“</span>
            <span class="label">..</span>
            <span style="opacity: 0.6;">â€”</span>
            <span style="opacity: 0.6;">â€”</span>
          </div>
        ` : ''}
        ${files.map(file => {
      const icon = getFileIcon(file.name, file.isDirectory);
      const sizeStr = file.isDirectory ? 'â€”' : this.formatFileSize(file.size);
      const mod = file.modified ? new Date(file.modified).toLocaleString() : 'â€”';
      return `
            <div class="file-row file-item" data-file-path="${file.path}" data-is-dir="${file.isDirectory}" style="cursor: pointer; display: grid; grid-template-columns: 26px 1fr 110px 170px; gap: 10px; padding: 8px 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; background: rgba(0,0,0,0.15);">
              <span class="icon">${icon}</span>
              <span class="label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
              <span style="opacity: 0.8;">${sizeStr}</span>
              <span style="opacity: 0.7; font-size: 12px;">${mod}</span>
            </div>
          `;
    }).join('')}
      </div>
    `;

    return `
      <div class="file-browser" style="height: 100%; display: flex; flex-direction: column;">
        <div class="file-browser-toolbar" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,255,65,0.2); display: flex; gap: 10px; align-items: center;">
          <button class="nav-btn" data-nav="back" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; cursor: pointer; border-radius: 6px;">âŸµ</button>
          <button class="nav-btn" data-nav="home" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; cursor: pointer; border-radius: 6px;">âŒ‚</button>
          <button class="nav-btn" data-nav="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; cursor: pointer; border-radius: 6px;">â†»</button>

          <input class="file-search-input" type="text" placeholder="Search this folder" value="${this.fileSearchQuery}"
                 style="flex: 1; min-width: 180px; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit; outline: none;">

          <select class="file-sort-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
            <option value="name" ${this.fileSortMode === 'name' ? 'selected' : ''}>Name</option>
            <option value="modified" ${this.fileSortMode === 'modified' ? 'selected' : ''}>Date</option>
            <option value="size" ${this.fileSortMode === 'size' ? 'selected' : ''}>Size</option>
          </select>

          <button class="file-view-toggle" data-view="${this.fileViewMode === 'grid' ? 'list' : 'grid'}"
                  style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
            ${this.fileViewMode === 'grid' ? 'List' : 'Grid'}
          </button>

          <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.9; user-select: none;">
            <input class="file-hidden-toggle" type="checkbox" ${this.showHiddenFiles ? 'checked' : ''} />
            Hidden
          </label>
        </div>
        <div class="file-browser-breadcrumb" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,255,65,0.1); font-size: 13px;">
          ${breadcrumbHtml}
        </div>
        <div style="flex: 1; display: flex; min-height: 0;">
          <div class="file-browser-sidebar" style="width: 190px; border-right: 1px solid rgba(0,255,65,0.15); padding: 10px; background: rgba(0,0,0,0.12); overflow: auto;">
            <div style="font-size: 12px; opacity: 0.7; margin-bottom: 8px;">Favorites</div>
            ${sidebarItems.map(item => `
              <div class="file-sidebar-link" data-path="${escapeHtml(item.path)}" style="padding: 8px 10px; border-radius: 8px; cursor: pointer; color: ${item.path === this.currentPath ? '#000' : '#00ff41'}; background: ${item.path === this.currentPath ? '#00ff41' : 'transparent'}; margin-bottom: 6px;">
                ${escapeHtml(item.label)}
              </div>
            `).join('')}
          </div>
          <div class="file-browser-content" style="flex: 1; overflow-y: auto; padding: 10px; min-width: 0;">
            ${emptyState || (this.fileViewMode === 'grid' ? gridHtml : listHtml)}
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // SETTINGS PANEL (TIER 3.1)
  // ============================================
  private getSettingsContentV2(): string {
    const svgIcons: Record<string, string> = {
      System: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
      Personalization: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="19" cy="17" r="2"></circle></svg>',
      Network: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
      Security: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
      Devices: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="6"></rect><line x1="12" y1="7" x2="12" y2="11"></line></svg>',
      About: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    };

    const categories = [
      { id: 'System', icon: svgIcons.System, label: 'System' },
      { id: 'Personalization', icon: svgIcons.Personalization, label: 'Personalization' },
      { id: 'Network', icon: svgIcons.Network, label: 'Network & Internet' },
      { id: 'Security', icon: svgIcons.Security, label: 'Security' },
      { id: 'Devices', icon: svgIcons.Devices, label: 'Mouse & Input' },
      { id: 'About', icon: svgIcons.About, label: 'About' },
    ];

    const renderSidebar = () => `
      <div class="settings-sidebar" style="
        width: 240px;
        background: rgba(0, 0, 0, 0.3);
        border-right: 1px solid rgba(0, 255, 65, 0.2);
        display: flex;
        flex-direction: column;
        padding: 10px 0;
      ">
        ${categories.map(cat => `
          <div class="settings-nav-item ${this.activeSettingsCategory === cat.id ? 'active' : ''}"
               data-settings-cat="${cat.id}"
               style="
                 padding: 10px 20px;
                 cursor: pointer;
                 display: flex;
                 align-items: center;
                 gap: 12px;
                 color: ${this.activeSettingsCategory === cat.id ? '#000' : '#00ff41'};
                 background: ${this.activeSettingsCategory === cat.id ? '#00ff41' : 'transparent'};
                 transition: all 0.2s;
               ">
            <span style="font-size: 18px; display: inline-flex;">${cat.icon}</span>
            <span style="font-size: 14px;">${cat.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    const card = (title: string, inner: string) => `
      <div style="border: 1px solid rgba(0,255,65,0.25); border-radius: 10px; padding: 14px; margin-bottom: 14px; background: rgba(0,0,0,0.18);">
        <div style="font-size: 16px; color: #ffd700; margin-bottom: 10px;">${title}</div>
        ${inner}
      </div>
    `;

    const renderSystem = () => {
      const sinkOptions = this.audioDevices.sinks.map(s => `<option value="${s.name}" ${s.name === this.audioDevices.defaultSink ? 'selected' : ''}>${s.description || s.name}</option>`).join('');
      const sourceOptions = this.audioDevices.sources.map(s => `<option value="${s.name}" ${s.name === this.audioDevices.defaultSource ? 'selected' : ''}>${s.description || s.name}</option>`).join('');



      const outputs = this.displayOutputs.slice(0, 10);
      const selectedOutput = outputs.find(o => o.name === this.activeDisplayOutput) || outputs.find(o => o.active) || outputs[0] || null;
      const modeList = selectedOutput ? selectedOutput.modes.slice() : [];
      const modeKey = (m: { width: number; height: number; refreshHz: number | null }) => `${m.width}x${m.height}${m.refreshHz ? `@${m.refreshHz}` : ''}`;
      const uniqueModes = [...new Map(modeList.map(m => [modeKey(m), m])).values()]
        .sort((a, b) => (a.width * a.height) - (b.width * b.height) || ((a.refreshHz || 0) - (b.refreshHz || 0)));
      const currentMode = selectedOutput?.currentMode || this.currentResolution;

      return `
        ${card('Sound', `
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: center;">
            <div>Volume</div>
            <input type="range" class="volume-slider" min="0" max="100" value="${this.volumeLevel}" style="width: 100%; accent-color: #00ff41;">

            <div>Output</div>
            <select class="audio-sink-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
              ${sinkOptions || '<option value=\"\">(No devices)</option>'}
            </select>

            <div>Input</div>
            <select class="audio-source-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
              ${sourceOptions || '<option value=\"\">(No devices)</option>'}
            </select>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            <button class="audio-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh devices</button>
          </div>
        `)}

        ${card('Display', `
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; align-items: center;">
            <div>Monitor</div>
            <select class="display-output-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
              ${outputs.map(o => `<option value="${escapeHtml(o.name)}" ${o.name === (selectedOutput?.name || '') ? 'selected' : ''}>${escapeHtml(o.name)}${o.active ? '' : ' (off)'}</option>`).join('') || '<option value=\"\">Display</option>'}
            </select>

            <div>Mode</div>
            <select class="display-mode-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
              ${(uniqueModes.length ? uniqueModes.map(m => {
        const k = modeKey(m);
        const label = `${m.width} x ${m.height}${m.refreshHz ? ` @ ${m.refreshHz}Hz` : ''}`;
        const selected = currentMode && k === currentMode ? 'selected' : '';
        return `<option value="${k}" ${selected}>${label}</option>`;
      }).join('') : this.availableResolutions.map(r => `<option value="${r}" ${r === this.currentResolution ? 'selected' : ''}>${r.replace('x', ' x ')}</option>`).join(''))}
            </select>

            <div>Scale</div>
            <input type="range" class="display-scale-slider" min="1" max="2" step="0.05" value="${selectedOutput ? selectedOutput.scale : 1}" style="width: 100%; accent-color: #00ff41;" ${selectedOutput ? '' : 'disabled'}>

            <div>Orientation</div>
            <select class="display-transform-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;" ${selectedOutput ? '' : 'disabled'}>
              ${(['normal', '90', '180', '270'] as const).map(t => `<option value="${t}" ${(selectedOutput?.transform || 'normal') === t ? 'selected' : ''}>${t === 'normal' ? 'Landscape' : `Rotate ${t}Â°`}</option>`).join('')}
            </select>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="display-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh displays</button>
          </div>
          <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Tip: scale works best on Wayland/Sway; on X11 some options may be limited.</div>
        `)}

        ${card('Lock Screen', `
          <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Win+L locks immediately. Password is currently fixed (\"temple\").</div>
        `)}
      `;
    };

    const renderPersonalization = () => {
      const wallpapers = [
        { id: 'default', label: 'Default', path: './images/wallpaper.png' },
      ];
      return `
        ${card('Theme', `
          <div style="display: flex; gap: 10px;">
            <button class="theme-btn" data-theme="dark" style="padding: 8px 16px; background: ${this.themeMode === 'dark' ? '#00ff41' : 'transparent'}; color: ${this.themeMode === 'dark' ? '#000' : '#00ff41'}; border: 1px solid #00ff41; cursor: pointer; border-radius: 6px;">Dark</button>
            <button class="theme-btn" data-theme="light" style="padding: 8px 16px; background: ${this.themeMode === 'light' ? '#00ff41' : 'transparent'}; color: ${this.themeMode === 'light' ? '#000' : '#00ff41'}; border: 1px solid #00ff41; cursor: pointer; border-radius: 6px;">Light</button>
          </div>
          <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Theme is applied to the shell; app themes inherit it.</div>
        `)}

        ${card('Wallpaper', `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            ${wallpapers.map(w => `
              <button class="wallpaper-btn" data-wallpaper="${w.path}" style="aspect-ratio: 16/9; border: ${this.wallpaperImage === w.path ? '2px solid #00ff41' : '1px solid rgba(0,255,65,0.3)'}; background: rgba(0,0,0,0.2); color: #00ff41; border-radius: 8px; cursor: pointer;">${w.label}</button>
            `).join('')}
          </div>
        `)}
      `;
    };

    const renderNetwork = () => {
      const connected = this.networkStatus.connected;
      const ssid = this.networkStatus.wifi?.ssid;
      const signal = this.networkStatus.wifi?.signal ?? 0;
      const ip = this.networkStatus.ip4;

      const savedWifi = this.savedNetworks.filter(n => (n.type || '').toLowerCase().includes('wifi') || (n.type || '').toLowerCase().includes('wireless')).slice(0, 12);
      const savedOther = this.savedNetworks.filter(n => !savedWifi.includes(n)).slice(0, 8);

      return `
        ${card('Status', `
          <div style="font-weight: bold; color: #ffd700; margin-bottom: 6px;">${connected ? (ssid || this.networkStatus.connection || 'Connected') : 'Disconnected'}</div>
          <div style="font-size: 12px; opacity: 0.85;">${connected ? `${this.networkStatus.type || 'network'}${ip ? ` â€¢ IP ${ip}` : ''}${ssid ? ` â€¢ ${signal}%` : ''}` : (this.networkLastError ? this.networkLastError : 'Not connected')}</div>
          <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
              <input type="checkbox" class="wifi-enabled-toggle" ${this.wifiEnabled ? 'checked' : ''} />
              <span style="opacity: 0.9;">Wiâ€‘Fi</span>
            </label>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button class="net-btn" data-net-action="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh</button>
              ${connected ? `<button class="net-btn" data-net-action="disconnect" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Disconnect</button>` : ''}
            </div>
          </div>
        `)}

        ${card('Wiâ€‘Fi Networks', `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${window.electronAPI?.listWifiNetworks ? (this.wifiNetworks.slice(0, 10).map(n => `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: ${n.inUse ? 'rgba(0,255,65,0.15)' : 'rgba(0,0,0,0.2)'};">
                <div style="min-width: 0;">
                  <div style="font-weight: bold; color: ${n.inUse ? '#ffd700' : '#00ff41'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.ssid}</div>
                  <div style="font-size: 12px; opacity: 0.8;">${n.security ? 'Secured' : 'Open'} â€¢ ${n.signal}%</div>
                </div>
                ${n.inUse ? `
                  <button class="net-btn" data-net-action="disconnect" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Disconnect</button>
                ` : `
                  <button class="net-btn" data-net-action="connect" data-ssid="${n.ssid}" data-sec="${n.security}" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Connect</button>
                `}
              </div>
            `).join('') || '<div style=\"opacity: 0.6;\">No Wiâ€‘Fi networks found.</div>') : '<div style=\"opacity: 0.6;\">Wiâ€‘Fi management requires Electron/Linux.</div>'}
          </div>
        `)}

        ${card('Saved Networks', `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${(!window.electronAPI?.listSavedNetworks) ? '<div style=\"opacity: 0.6;\">Saved networks require Electron/Linux.</div>' : ''}
            ${window.electronAPI?.listSavedNetworks ? ([
          ...savedWifi.map(n => ({ ...n, kind: 'Wiâ€‘Fi' })),
          ...savedOther.map(n => ({ ...n, kind: n.type || 'Connection' }))
        ].slice(0, 14).map(n => `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: rgba(0,0,0,0.2);">
                <div style="min-width: 0;">
                  <div style="font-weight: bold; color: #00ff41; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(n.name)}</div>
                  <div style="font-size: 12px; opacity: 0.75;">${escapeHtml(n.kind)}${n.device ? ` â€¢ ${escapeHtml(n.device)}` : ''}</div>
                </div>
                <div style="display:flex; gap: 8px; flex-shrink: 0;">
                  <button class="saved-net-btn" data-action="connect" data-key="${escapeHtml(n.uuid)}" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Connect</button>
                  <button class="saved-net-btn" data-action="forget" data-key="${escapeHtml(n.uuid)}" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Forget</button>
                </div>
              </div>
            `).join('') || '<div style=\"opacity: 0.6;\">No saved networks.</div>') : ''}
          </div>
        `)}
      `;
    };

    const renderDevices = () => {
      const values = this.mouseDpiValues.length ? this.mouseDpiValues : [400, 800, 1200, 1600];
      const selectedDpi = this.mouseSettings.dpi ?? (values.includes(800) ? 800 : (values[0] ?? 800));

      return `
      ${card('Mouse', `
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; align-items: center;">
          <div>Pointer speed</div>
          <input type="range" class="mouse-speed-slider" min="-1" max="1" step="0.1" value="${this.mouseSettings.speed}" style="width: 100%; accent-color: #00ff41;">

          <div>DPI</div>
          <select class="mouse-dpi-select" ${this.mouseDpiSupported ? '' : 'disabled'} style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: ${this.mouseDpiSupported ? '#00ff41' : 'rgba(0,255,65,0.45)'}; padding: 6px 10px; border-radius: 6px; font-family: inherit; ${this.mouseDpiSupported ? '' : 'cursor: not-allowed;'}">
            ${values.map(v => `<option value="${v}" ${v === selectedDpi ? 'selected' : ''}>${v} DPI</option>`).join('')}
          </select>

          <div>Raw input</div>
          <label style="display: inline-flex; align-items: center; gap: 8px;">
            <input type="checkbox" class="mouse-raw-toggle" ${this.mouseSettings.raw ? 'checked' : ''} />
            <span style="opacity: 0.85;">Disable acceleration</span>
          </label>
        </div>
      `)}
    `;
    };

    const renderAbout = () => {
      const info = this.systemInfo;
      return `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 64px; margin-bottom: 10px; color: #ffd700;">âœ</div>
          <h2 style="color: #ffd700; margin: 0 0 5px 0;">TempleOS Remake</h2>
          <div style="opacity: 0.85;">Version 2.5.0 (Divine Intellect)</div>
        </div>
        ${card('System', `
          <div style="display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; font-size: 14px;">
            <div style="opacity: 0.7;">Processor</div><div>Divine Intellect i9 (Mock)</div>
            <div style="opacity: 0.7;">Installed RAM</div><div>64 GB (Holy Memory)</div>
            <div style="opacity: 0.7;">System Type</div><div>64-bit Operating System</div>
            <div style="opacity: 0.7;">Registered to</div><div>Terry A. Davis</div>
          </div>
          <hr style="border: none; border-top: 1px solid rgba(0,255,65,0.2); margin: 12px 0;">
          <div style="display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; font-size: 13px; opacity: 0.8;">
            <div style="opacity: 0.7;">Platform</div><div>${info?.platform || 'â€”'}</div>
            <div style="opacity: 0.7;">Hostname</div><div>${info?.hostname || 'â€”'}</div>
            <div style="opacity: 0.7;">User</div><div>${info?.user || 'â€”'}</div>
            <div style="opacity: 0.7;">CPU Cores</div><div>${info?.cpus ?? 'â€”'}</div>
            <div style="opacity: 0.7;">Uptime</div><div>${info ? Math.floor(info.uptime / 60) + ' min' : 'â€”'}</div>
            <div style="opacity: 0.7;">Memory</div><div>${info ? `${Math.round(info.memory.free / 1024 / 1024)} MB free / ${Math.round(info.memory.total / 1024 / 1024)} MB` : 'â€”'}</div>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            <button class="about-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh</button>
          </div>
        `)}
        <div style="text-align: center; margin-top: 16px; font-size: 12px; opacity: 0.65;">
          Made with HolyC ðŸ’š by Giangero Studio<br>
          Â© 2025 Giangero Studio
        </div>
      `;
    };

    const renderSecurity = () => {
      return `
        ${card('Lock Screen Password', `
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;">
            <div>Password</div>
            <div style="display: flex; gap: 10px;">
              <input type="password" class="lock-password-field" value="${escapeHtml(this.lockPassword)}" placeholder="Password" 
                     style="flex: 1; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit;" />
              <button class="save-password-btn" style="background: #00ff41; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
            </div>
          </div>
          <div style="font-size: 12px; opacity: 0.65; margin-top: 8px;">Password for lock screen (default: temple). Leave empty to disable password.</div>
        `)}
        ${card('Lock Screen PIN', `
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;">
            <div>PIN</div>
            <div style="display: flex; gap: 10px;">
              <input type="password" class="lock-pin-field" value="${escapeHtml(this.lockPin)}" placeholder="PIN (numbers only)" inputmode="numeric" pattern="[0-9]*"
                     style="flex: 1; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit;" />
              <button class="save-pin-btn" style="background: #00ff41; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
            </div>
          </div>
          <div style="font-size: 12px; opacity: 0.65; margin-top: 8px;">PIN for lock screen (default: 7777). Leave empty to disable PIN.</div>
        `)}
        ${card('Lock Screen', `
          <button class="test-lock-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: inherit;">Test Lock Screen</button>
          <div style="font-size: 12px; opacity: 0.65; margin-top: 8px;">Test the lock screen with your current password/PIN settings.</div>
        `)}
      `;
    };

    const renderPageContent = () => {
      switch (this.activeSettingsCategory) {
        case 'System': return renderSystem();
        case 'Personalization': return renderPersonalization();
        case 'Network': return renderNetwork();
        case 'Security': return renderSecurity();
        case 'Devices': return renderDevices();
        case 'About': return renderAbout();
        default: return '<div style="padding: 20px; opacity: 0.6;">Select a category.</div>';
      }
    };

    return `
      <div class="settings-window" style="display: flex; height: 100%; background: rgba(13, 17, 23, 0.95);">
        ${renderSidebar()}
        <div class="settings-content" style="flex: 1; padding: 20px; overflow-y: auto;">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px; border-bottom: 1px solid rgba(0, 255, 65, 0.3); padding-bottom: 10px; margin-bottom: 14px;">
            <h2 style="margin: 0;">${this.activeSettingsCategory}</h2>
            <div style="font-size: 12px; opacity: 0.65;">TempleOS Settings</div>
          </div>
          ${renderPageContent()}
        </div>
      </div>
    `;
  }

  private getSettingsContent(): string {
    // SVG icons for settings sidebar (emojis don't render properly in some VMs)
    const svgIcons: Record<string, string> = {
      System: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
      Personalization: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="19" cy="17" r="2"></circle><circle cx="6" cy="12" r="3"></circle></svg>',
      Network: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
      Apps: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
      Time: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      About: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    };
    const categories = [
      { id: 'System', icon: svgIcons.System, label: 'System' },
      { id: 'Personalization', icon: svgIcons.Personalization, label: 'Personalization' },
      { id: 'Network', icon: svgIcons.Network, label: 'Network & Internet' },
      { id: 'Apps', icon: svgIcons.Apps, label: 'Apps' },
      { id: 'Time', icon: svgIcons.Time, label: 'Time & Language' },
      { id: 'About', icon: svgIcons.About, label: 'About' },
    ];

    const renderSidebar = () => `
      <div class="settings-sidebar" style="
        width: 220px;
        background: rgba(0, 0, 0, 0.3);
        border-right: 1px solid rgba(0, 255, 65, 0.2);
        display: flex;
        flex-direction: column;
        padding: 10px 0;
      ">
        ${categories.map(cat => `
          <div class="settings-nav-item ${this.activeSettingsCategory === cat.id ? 'active' : ''}" 
               data-settings-cat="${cat.id}"
               style="
                 padding: 10px 20px;
                 cursor: pointer;
                 display: flex;
                 align-items: center;
                 gap: 12px;
                 color: ${this.activeSettingsCategory === cat.id ? '#000' : '#00ff41'};
                 background: ${this.activeSettingsCategory === cat.id ? '#00ff41' : 'transparent'};
                 transition: all 0.2s;
               "
               onmouseenter="if(!this.classList.contains('active')) this.style.background='rgba(0,255,65,0.1)'"
               onmouseleave="if(!this.classList.contains('active')) this.style.background='transparent'">
            <span style="font-size: 18px;">${cat.icon}</span>
            <span style="font-size: 14px;">${cat.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    const renderPageContent = () => {
      switch (this.activeSettingsCategory) {
        case 'System':
          return `
            <div class="settings-section">
              <h3>ðŸ”Š Sound</h3>
              <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span>Volume</span>
                <input type="range" class="volume-slider" min="0" max="100" value="${this.volumeLevel}" 
                       style="width: 150px; accent-color: #00ff41;">
              </div>
              <h3>ðŸ–¥ï¸ Display</h3>
              <div class="settings-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span>Resolution</span>
                <select class="resolution-select" style="
                  background: rgba(0,255,65,0.1);
                  border: 1px solid #00ff41;
                  color: #00ff41;
                  padding: 5px 10px;
                  font-family: inherit;
                  cursor: pointer;
                ">
                  ${this.availableResolutions.map(r => `<option value="${r}" ${r === this.currentResolution ? 'selected' : ''}>${r.replace('x', ' x ')}</option>`).join('')}
                </select>
              </div>
              <div class="settings-row" style="opacity: 0.6;">Refresh Rate: 60Hz (Auto)</div>
            </div>
          `;
        case 'Personalization':
          return `
            <div class="settings-section">
              <h3>ðŸŽ¨ Theme</h3>
              <div class="settings-row" style="margin-bottom: 20px;">
                <button style="
                  padding: 8px 16px;
                  background: ${this.themeMode === 'dark' ? '#00ff41' : 'transparent'};
                  color: ${this.themeMode === 'dark' ? '#000' : '#00ff41'};
                  border: 1px solid #00ff41;
                  cursor: pointer;
                  margin-right: 10px;
                " onclick="console.log('Dark mode set')">Dark</button>
                <button style="
                  padding: 8px 16px;
                  background: ${this.themeMode === 'light' ? '#00ff41' : 'transparent'};
                  color: ${this.themeMode === 'light' ? '#000' : '#00ff41'};
                  border: 1px solid #00ff41;
                  cursor: pointer;
                  opacity: 0.5;
                " title="Not implemented yet">Light</button>
              </div>
              <h3>ðŸ–¼ï¸ Background</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div style="aspect-ratio: 16/9; background: #333; border: 2px solid #00ff41; display:flex; align-items:center; justify-content:center; cursor:pointer;">Default</div>
                <div style="aspect-ratio: 16/9; background: #222; border: 1px solid rgba(0,255,65,0.3); display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0.5;">Solid</div>
                <div style="aspect-ratio: 16/9; background: #111; border: 1px solid rgba(0,255,65,0.3); display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0.5;">Custom</div>
              </div>
            </div>
          `;
        case 'Network':
          return `
            <div class="settings-section">
              <h3>ðŸ“¡ Wi-Fi</h3>
              <div class="settings-row" style="padding: 10px; border: 1px solid #00ff41; margin-bottom: 10px;">
                <div style="font-weight: bold;">TempleNet_5G</div>
                <div style="font-size: 12px; color: #00ff41;">Connected, Secure</div>
              </div>
              <div class="settings-row" style="padding: 10px; border: 1px solid rgba(0,255,65,0.3); opacity: 0.7;">
                <div>CIA_Surveillance_Van</div>
                <div style="font-size: 12px;">Secured</div>
              </div>
            </div>
          `;
        case 'About':
          return `
            <div class="settings-section" style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">âœï¸</div>
              <h2 style="color: #ffd700;">TempleOS Remake</h2>
              <p>Version 2.4.0 (Divine Intellect)</p>
              <div style="margin: 20px 0; text-align: left; padding: 15px; border: 1px solid rgba(0,255,65,0.3);">
                <div><strong>Processor:</strong> Divine Intellect i9 (Mock)</div>
                <div><strong>Installed RAM:</strong> 64 GB (Holy Memory)</div>
                <div><strong>System Type:</strong> 64-bit Operating System</div>
                <div><strong>Registered to:</strong> Terry A. Davis</div>
              </div>
              <p style="font-size: 12px; opacity: 0.6;">Â© 2025 Giangero Studio</p>
            </div>
          `;
        default:
          return `<div style="padding: 20px; text-align: center; opacity: 0.6;">Select a category to view settings.</div>`;
      }
    };

    return `
      <div class="settings-window" style="display: flex; height: 100%; background: rgba(13, 17, 23, 0.95);">
        ${renderSidebar()}
        <div class="settings-content" style="flex: 1; padding: 20px; overflow-y: auto;">
          <h2 style="border-bottom: 1px solid rgba(0, 255, 65, 0.3); padding-bottom: 10px; margin-top: 0;">${this.activeSettingsCategory}</h2>
          ${renderPageContent()}
        </div>
      </div>
    `;
  }

  private async loadFiles(path?: string): Promise<void> {
    if (!window.electronAPI) {
      console.warn('electronAPI not available - running in browser mode');
      return;
    }

    try {
      // Get home directory if no path specified
      if (!path && !this.currentPath) {
        this.homePath = await window.electronAPI.getHome();
        this.currentPath = this.homePath;
      } else if (path) {
        this.currentPath = path;
      }

      if (this.currentPath === 'trash:') {
        await this.loadTrash();
        return;
      }

      const result = await window.electronAPI.readDir(this.currentPath);
      if (result.success && result.entries) {
        this.fileEntries = result.entries;
      } else {
        console.error('Failed to read directory:', result.error);
        this.fileEntries = [];
      }

      // Update file browser window content
      this.updateFileBrowserWindow();
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  private async loadTrash(): Promise<void> {
    if (!window.electronAPI?.listTrash) {
      this.trashEntries = [];
      this.fileEntries = [];
      this.updateFileBrowserWindow();
      return;
    }

    try {
      const res = await window.electronAPI.listTrash();
      if (res.success && Array.isArray(res.entries)) {
        this.trashEntries = res.entries
          .filter(e => e && typeof e.name === 'string' && typeof e.trashPath === 'string')
          .map(e => ({
            name: String(e.name),
            trashPath: String(e.trashPath),
            originalPath: String(e.originalPath || ''),
            deletionDate: String(e.deletionDate || ''),
            isDirectory: !!e.isDirectory,
            size: typeof e.size === 'number' ? e.size : 0
          }));
      } else {
        this.trashEntries = [];
      }
    } catch {
      this.trashEntries = [];
    }

    // Mirror into fileEntries for reuse (open works on trashPath)
    this.fileEntries = this.trashEntries.map(t => ({
      name: t.name,
      isDirectory: t.isDirectory,
      path: t.trashPath,
      size: t.size,
      modified: t.deletionDate || null
    }));

    this.updateFileBrowserWindow();
  }

  private updateFileBrowserWindow(): void {
    const filesWindow = this.windows.find(w => w.id.startsWith('files'));
    if (filesWindow) {
      filesWindow.content = this.getFileBrowserContentV2();
      this.render();
    }
  }

  private refreshTerminalWindow(): void {
    const terminalWindow = this.windows.find(w => w.id.startsWith('terminal'));
    if (terminalWindow) {
      terminalWindow.content = this.getTerminalContent();
      if (!this.ptySupported) {
        this.render();
        setTimeout(() => {
          const input = document.querySelector('.terminal-input') as HTMLInputElement | null;
          if (this.terminalSearchOpen) {
            const s = document.querySelector('.terminal-search-input') as HTMLInputElement | null;
            s?.focus();
            if (s) s.setSelectionRange(s.value.length, s.value.length);
            this.scrollTerminalToSearchMatch();
          } else {
            input?.focus();
          }
        }, 10);
        return;
      }

      const contentEl = document.querySelector(`[data-window-id="${terminalWindow.id}"] .window-content`) as HTMLElement | null;
      if (!contentEl) {
        // Fallback: if terminal DOM is missing, do a full render
        this.render();
        setTimeout(() => this.ensureVisibleTerminalXterms(), 50);
        return;
      }

      // Preserve existing xterm host elements (they contain the xterm DOM)
      const hostMap = new Map<string, HTMLElement>();
      contentEl.querySelectorAll('.xterm-container[id^="xterm-container-"]').forEach((el) => {
        const host = el as HTMLElement;
        if (!host.id) return;
        hostMap.set(host.id, host);
        host.remove();
      });

      // Re-render just the terminal window content
      contentEl.innerHTML = terminalWindow.content;

      // Replace placeholders with the preserved hosts where possible
      for (const [id, host] of hostMap) {
        const placeholder = contentEl.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
        if (placeholder) placeholder.replaceWith(host);
      }

      // Init any newly created panes and refit visible terminals
      setTimeout(() => {
        this.ensureVisibleTerminalXterms();
        if (this.terminalSearchOpen) {
          const s = document.querySelector('.terminal-search-input') as HTMLInputElement | null;
          s?.focus();
          if (s) s.setSelectionRange(s.value.length, s.value.length);
          this.scrollTerminalToSearchMatch();
        } else {
          const tab = this.terminalTabs[this.activeTerminalTab];
          tab?.xterm?.focus();
        }
      }, 10);
    }
  }

  private refreshEditorWindow(): void {
    const editorWindow = this.windows.find(w => w.id.startsWith('editor'));
    if (!editorWindow) return;

    // Persist current tab state for undo/redo preservation
    if (this.editorView && this.editorViewTabId) {
      const tab = this.editorTabs.find(t => t.id === this.editorViewTabId);
      if (tab) tab.cmState = this.editorView.state;
    }

    editorWindow.content = this.getEditorContent();

    const contentEl = document.querySelector(`[data-window-id="${editorWindow.id}"] .window-content`) as HTMLElement | null;
    if (!contentEl) {
      this.render();
      setTimeout(() => this.ensureEditorView(), 50);
      return;
    }

    const preservedEditorDom = this.editorView?.dom ?? null;
    if (preservedEditorDom) preservedEditorDom.remove();

    contentEl.innerHTML = editorWindow.content;

    if (preservedEditorDom) {
      const host = contentEl.querySelector('#editor-cm-host') as HTMLElement | null;
      if (host) host.appendChild(preservedEditorDom);
    }

    setTimeout(() => this.ensureEditorView(), 10);
  }

  private editorUpdateFindMatches(): void {
    const currentTab = this.editorTabs[this.activeEditorTab];
    if (!currentTab || !this.editorFindQuery) {
      this.editorFindMatches = [];
      this.editorFindCurrentMatch = -1;
      return;
    }

    const content = currentTab.content;
    const query = this.editorFindQuery;
    const matches: number[] = [];
    let pos = 0;

    while (pos < content.length) {
      const idx = content.indexOf(query, pos);
      if (idx === -1) break;
      matches.push(idx);
      pos = idx + 1;
    }

    this.editorFindMatches = matches;
    if (matches.length > 0 && this.editorFindCurrentMatch < 0) {
      this.editorFindCurrentMatch = 0;
    } else if (matches.length === 0) {
      this.editorFindCurrentMatch = -1;
    }
  }

  private editorFindNext(): void {
    if (this.editorFindMatches.length === 0) return;
    this.editorFindCurrentMatch = (this.editorFindCurrentMatch + 1) % this.editorFindMatches.length;
    this.editorScrollToMatch();
    this.refreshEditorWindow();
  }

  private editorFindPrev(): void {
    if (this.editorFindMatches.length === 0) return;
    this.editorFindCurrentMatch = (this.editorFindCurrentMatch - 1 + this.editorFindMatches.length) % this.editorFindMatches.length;
    this.editorScrollToMatch();
    this.refreshEditorWindow();
  }

  private editorScrollToMatch(): void {
    const pos = this.editorFindMatches[this.editorFindCurrentMatch];
    if (pos === undefined || this.editorFindCurrentMatch < 0) return;
    const from = pos;
    const to = pos + this.editorFindQuery.length;

    if (this.editorView) {
      this.editorView.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
      this.editorView.focus();
      return;
    }

    const textarea = document.querySelector('.editor-content') as HTMLTextAreaElement | null;
    if (!textarea) return;
    textarea.setSelectionRange(from, to);
    textarea.focus();
  }

  private editorReplace(): void {
    const currentTab = this.editorTabs[this.activeEditorTab];
    if (!currentTab || this.editorFindCurrentMatch < 0) return;

    const pos = this.editorFindMatches[this.editorFindCurrentMatch];
    if (pos === undefined) return;

    if (this.editorView && this.editorViewTabId === currentTab.id) {
      this.editorView.dispatch({
        changes: { from: pos, to: pos + this.editorFindQuery.length, insert: this.editorReplaceQuery }
      });
    } else {
      const before = currentTab.content.substring(0, pos);
      const after = currentTab.content.substring(pos + this.editorFindQuery.length);
      currentTab.content = before + this.editorReplaceQuery + after;
      currentTab.modified = true;
      currentTab.revision = (currentTab.revision || 0) + 1;
      currentTab.cmState = null;
    }

    this.editorUpdateFindMatches();
    this.refreshEditorWindow();
  }

  private editorReplaceAll(): void {
    const currentTab = this.editorTabs[this.activeEditorTab];
    if (!currentTab || !this.editorFindQuery) return;

    const regex = new RegExp(this.editorFindQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const next = currentTab.content.replace(regex, this.editorReplaceQuery);

    if (this.editorView && this.editorViewTabId === currentTab.id) {
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: next }
      });
    } else {
      currentTab.content = next;
      currentTab.modified = true;
      currentTab.revision = (currentTab.revision || 0) + 1;
      currentTab.cmState = null;
    }

    this.editorUpdateFindMatches();
    this.refreshEditorWindow();
  }

  private getEditorContent(): string {

    // Ensure at least one tab exists
    if (this.editorTabs.length === 0) {
      this.editorTabs.push({
        id: `editor-${Date.now()}`,
        path: null,
        filename: 'untitled.hc',
        content: '',
        modified: false,
        cmState: null,
        revision: 0,
        lastSavedRevision: 0
      });
    }

    const currentTab = this.editorTabs[this.activeEditorTab] || this.editorTabs[0];

    const tabsHtml = this.editorTabs.map((tab, i) => `
      <div class="editor-tab ${i === this.activeEditorTab ? 'active' : ''}" data-editor-tab="${i}">
        ${tab.modified ? '<span class="editor-tab-modified">â—</span>' : ''}
        ${escapeHtml(tab.filename)}
        ${this.editorTabs.length > 1 ? `<span class="editor-tab-close" data-editor-close="${i}">Ã—</span>` : ''}
      </div>
    `).join('');

    const findBarHtml = this.editorFindOpen ? `
      <div class="editor-find-bar">
        <input type="text" class="editor-find-input" placeholder="Find..." 
               value="${escapeHtml(this.editorFindQuery)}" data-editor-find-input />
        ${this.editorFindMode === 'replace' ? `
          <input type="text" class="editor-replace-input" placeholder="Replace..." 
                 value="${escapeHtml(this.editorReplaceQuery)}" data-editor-replace-input />
        ` : ''}
        <button class="editor-find-btn" data-editor-action="find-prev" title="Previous (Shift+F3)">â—€</button>
        <button class="editor-find-btn" data-editor-action="find-next" title="Next (F3)">â–¶</button>
        ${this.editorFindMode === 'replace' ? `
          <button class="editor-find-btn" data-editor-action="replace" title="Replace">Replace</button>
          <button class="editor-find-btn" data-editor-action="replace-all" title="Replace All">All</button>
        ` : ''}
        <span class="editor-find-count">${this.editorFindMatches.length > 0 ? `${this.editorFindCurrentMatch + 1}/${this.editorFindMatches.length}` : ''}</span>
        <button class="editor-find-btn editor-find-close" data-editor-action="find-close">Ã—</button>
      </div>
    ` : '';

    const toolbarHtml = `
      <div class="editor-toolbar">
        <div class="editor-meta">
          <div class="editor-file">${escapeHtml(currentTab.path || currentTab.filename)}</div>
          <div class="editor-lang">${escapeHtml(this.editorLanguageLabel(currentTab.filename))}</div>
        </div>
        <div class="editor-tools">
          <button class="editor-tool" data-editor-action="open">Open</button>
          <button class="editor-tool" data-editor-action="save" ${currentTab.modified ? '' : 'disabled'}>Save</button>
          <button class="editor-tool" data-editor-action="save-as">Save As</button>
          <span class="editor-tool-sep"></span>
          <button class="editor-tool" data-editor-action="undo">Undo</button>
          <button class="editor-tool" data-editor-action="redo">Redo</button>
          <button class="editor-tool" data-editor-action="wrap">${this.editorWordWrap ? 'Wrap: On' : 'Wrap: Off'}</button>
          <button class="editor-tool" data-editor-action="recent" ${this.editorRecentFiles.length ? '' : 'disabled'}>Recent</button>
        </div>
      </div>
    `;

    return `
      <div class="editor-container">
        <div class="editor-tabs">
          ${tabsHtml}
          <div class="editor-tab-new" data-editor-new title="New File">+</div>
        </div>
        ${toolbarHtml}
        ${findBarHtml}
        <div class="editor-cm-wrap">
          <div id="editor-cm-host" class="editor-cm-host"></div>
        </div>
      </div>
    `;
  }

  private editorLanguageLabel(filename: string): string {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'hc': return 'HolyC';
      case 'c':
      case 'h': return 'C';
      case 'cpp':
      case 'hpp': return 'C++';
      case 'ts': return 'TypeScript';
      case 'tsx': return 'TypeScript (TSX)';
      case 'js': return 'JavaScript';
      case 'jsx': return 'JavaScript (JSX)';
      case 'py': return 'Python';
      case 'json': return 'JSON';
      case 'md': return 'Markdown';
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      default: return 'Text';
    }
  }

  private editorLanguageExtension(filename: string): Extension {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (ext === 'ts') return javascript({ typescript: true });
    if (ext === 'tsx') return javascript({ typescript: true, jsx: true });
    if (ext === 'jsx') return javascript({ jsx: true });
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return javascript();
    if (ext === 'py') return python();
    if (ext === 'json') return json();
    if (ext === 'md' || ext === 'markdown') return markdown();
    if (ext === 'html' || ext === 'htm') return html();
    if (ext === 'css') return css();
    if (ext === 'hc' || ext === 'c' || ext === 'h' || ext === 'cpp' || ext === 'hpp') return cpp();
    return [];
  }

  private createEditorStateForTab(tabId: string, doc: string, filename: string): EditorState {
    const wrapExt: Extension = this.editorWordWrap ? EditorView.lineWrapping : [];
    const langExt = this.editorLanguageExtension(filename);

    const theme = EditorView.theme({
      '&': {
        height: '100%',
        backgroundColor: '#0d1117',
        color: '#00ff41',
        fontFamily: '"VT323", monospace',
        fontSize: '18px'
      },
      '.cm-content': { caretColor: '#00ff41' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#00ff41' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'rgba(0, 255, 65, 0.20)'
      },
      '.cm-gutters': {
        backgroundColor: 'rgba(0,0,0,0.35)',
        color: 'rgba(0,255,65,0.75)',
        borderRight: '1px solid rgba(0,255,65,0.2)'
      },
      '.cm-activeLine': { backgroundColor: 'rgba(0,255,65,0.06)' },
      '.cm-activeLineGutter': { backgroundColor: 'rgba(0,255,65,0.10)' }
    }, { dark: true });

    return EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        indentOnInput(),
        bracketMatching(),
        foldGutter(),
        history(),
        autocompletion(),
        closeBrackets(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        this.editorWrapCompartment.of(wrapExt),
        this.editorLanguageCompartment.of(langExt),
        theme,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          ...completionKeymap,
          ...closeBracketsKeymap,
          indentWithTab
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) this.handleEditorDocChange(tabId, update.state);
        })
      ]
    });
  }

  private handleEditorDocChange(tabId: string, state: EditorState): void {
    const tab = this.editorTabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.content = state.doc.toString();
    tab.revision = (tab.revision || 0) + 1;
    tab.modified = true;
    tab.cmState = state;

    // Update modified indicator without full refresh (best-effort)
    const idx = this.editorTabs.findIndex(t => t.id === tabId);
    const tabEl = document.querySelector(`.editor-tab[data-editor-tab="${idx}"]`) as HTMLElement | null;
    if (tabEl && !tabEl.querySelector('.editor-tab-modified')) {
      const modSpan = document.createElement('span');
      modSpan.className = 'editor-tab-modified';
      modSpan.textContent = '●';
      tabEl.insertBefore(modSpan, tabEl.firstChild);
    }

    // Enable save button
    const saveBtn = document.querySelector('.editor-tool[data-editor-action="save"]') as HTMLButtonElement | null;
    if (saveBtn) saveBtn.disabled = false;

    // Autosave (only for files with a path)
    if (tab.path) {
      if (this.editorAutosaveTimer) window.clearTimeout(this.editorAutosaveTimer);
      const expected = tab.revision;
      this.editorAutosaveTimer = window.setTimeout(() => {
        void this.editorSaveTab(tabId, { forcePrompt: false, expectedRevision: expected, silent: true });
      }, 900);
    }
  }

  private ensureEditorView(): void {
    const editorWindow = this.windows.find(w => w.id.startsWith('editor'));
    if (!editorWindow || editorWindow.minimized) return;
    const host = document.querySelector(`[data-window-id="${editorWindow.id}"] #editor-cm-host`) as HTMLElement | null;
    if (!host) return;

    const tab = this.editorTabs[this.activeEditorTab] || this.editorTabs[0];
    if (!tab) return;

    if (this.editorView) {
      // Persist previous tab state
      if (this.editorViewTabId) {
        const prev = this.editorTabs.find(t => t.id === this.editorViewTabId);
        if (prev) prev.cmState = this.editorView.state;
      }

      if (this.editorView.dom.parentElement !== host) {
        host.appendChild(this.editorView.dom);
      }

      if (this.editorViewTabId !== tab.id) {
        const nextState = tab.cmState ?? this.createEditorStateForTab(tab.id, tab.content, tab.filename);
        tab.cmState = nextState;
        this.editorView.setState(nextState);
        this.editorViewTabId = tab.id;
      }

      // Reconfigure wrap + language for the current file
      this.editorView.dispatch({
        effects: [
          this.editorWrapCompartment.reconfigure(this.editorWordWrap ? EditorView.lineWrapping : []),
          this.editorLanguageCompartment.reconfigure(this.editorLanguageExtension(tab.filename))
        ]
      });
    } else {
      const state = tab.cmState ?? this.createEditorStateForTab(tab.id, tab.content, tab.filename);
      tab.cmState = state;
      this.editorView = new EditorView({ state, parent: host });
      this.editorViewTabId = tab.id;
    }

    if (this.editorFindOpen) {
      const input = document.querySelector('.editor-find-input') as HTMLInputElement | null;
      input?.focus();
    } else {
      this.editorView?.focus();
    }
  }

  private editorAddRecentFile(path: string): void {
    const p = String(path || '').trim();
    if (!p) return;
    this.editorRecentFiles = this.editorRecentFiles.filter(x => x !== p);
    this.editorRecentFiles.unshift(p);
    this.editorRecentFiles = this.editorRecentFiles.slice(0, 20);
    this.queueSaveConfig();
  }

  private async editorOpenFromPrompt(): Promise<void> {
    const suggested = this.editorRecentFiles[0] || '';
    const path = await this.openPromptModal({
      title: 'Open File',
      message: 'Enter a file path to open.',
      defaultValue: suggested
    });
    if (path === null) return;
    const p = path.trim();
    if (!p) return;
    await this.editorOpenPath(p);
  }

  private async editorOpenPath(path: string): Promise<void> {
    if (!window.electronAPI?.readFile) {
      this.showNotification('Editor', 'File open requires Electron.', 'warning');
      return;
    }

    const res = await window.electronAPI.readFile(path);
    if (!res.success) {
      this.showNotification('Editor', res.error || 'Failed to open file', 'error');
      return;
    }

    const filename = path.split(/[\\/]/).pop() || 'untitled.hc';
    const newTab = {
      id: `editor-${Date.now()}`,
      path,
      filename,
      content: res.content || '',
      modified: false,
      cmState: null,
      revision: 0,
      lastSavedRevision: 0
    };

    this.editorTabs.push(newTab);
    this.activeEditorTab = this.editorTabs.length - 1;
    this.editorAddRecentFile(path);
    this.refreshEditorWindow();
  }

  private async editorSaveActive(forcePrompt: boolean): Promise<void> {
    const tab = this.editorTabs[this.activeEditorTab] || this.editorTabs[0];
    if (!tab) return;
    await this.editorSaveTab(tab.id, { forcePrompt });
  }

  private async editorSaveTab(tabId: string, opts: { forcePrompt: boolean; expectedRevision?: number; silent?: boolean }): Promise<void> {
    const tab = this.editorTabs.find(t => t.id === tabId);
    if (!tab) return;

    // Sync from CodeMirror for active tab
    if (this.editorView && this.editorViewTabId === tabId) {
      tab.content = this.editorView.state.doc.toString();
      tab.cmState = this.editorView.state;
    }

    if (!window.electronAPI?.writeFile) {
      if (!opts.silent) this.showNotification('Editor', 'File save requires Electron.', 'warning');
      return;
    }

    let path = tab.path;
    if (opts.forcePrompt || !path) {
      const suggested = tab.path || (this.homePath ? this.joinPath(this.homePath, tab.filename) : tab.filename);
      const next = await this.openPromptModal({
        title: 'Save File',
        message: 'Enter a file path to save.',
        defaultValue: suggested
      });
      if (next === null) return;
      path = next.trim();
      if (!path) return;
    }

    const expected = opts.expectedRevision ?? tab.revision;
    const res = await window.electronAPI.writeFile(path, tab.content);
    if (!res.success) {
      if (!opts.silent) this.showNotification('Editor', res.error || 'Save failed', 'error');
      return;
    }

    tab.path = path;
    tab.filename = path.split(/[\\/]/).pop() || tab.filename;
    this.editorAddRecentFile(path);

    if (tab.revision === expected) {
      tab.lastSavedRevision = expected;
      tab.modified = false;
    }

    this.refreshEditorWindow();
    if (!opts.silent) this.showNotification('Editor', `Saved: ${path}`, 'divine');
  }

  private toggleEditorWordWrap(): void {
    this.editorWordWrap = !this.editorWordWrap;
    this.queueSaveConfig();
    if (this.editorView) {
      this.editorView.dispatch({
        effects: this.editorWrapCompartment.reconfigure(this.editorWordWrap ? EditorView.lineWrapping : [])
      });
    }
    this.refreshEditorWindow();
  }


  private formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds || 0));
    const days = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (days || hrs) parts.push(`${hrs}h`);
    parts.push(`${mins}m`);
    return parts.join(' ');
  }

  private refreshSystemMonitorWindowDom(): void {
    const monitorWindow = this.windows.find(w => w.id.startsWith('system-monitor'));
    if (!monitorWindow) return;
    const content = this.getSystemMonitorContent();
    monitorWindow.content = content;

    const winEl = document.querySelector(`[data-window-id="${monitorWindow.id}"] .window-content`) as HTMLElement | null;
    if (!winEl) {
      this.render();
      return;
    }

    const prevScroll = (winEl.querySelector('.system-monitor-processes') as HTMLElement | null)?.scrollTop ?? 0;
    winEl.innerHTML = content;
    const nextScrollEl = winEl.querySelector('.system-monitor-processes') as HTMLElement | null;
    if (nextScrollEl) nextScrollEl.scrollTop = prevScroll;
  }

  private async refreshSystemMonitorData(force = false): Promise<void> {
    if (!window.electronAPI) return;
    if (this.monitorBusy && !force) return;
    this.monitorBusy = true;
    try {
      if (window.electronAPI.getMonitorStats) {
        const statsRes = await window.electronAPI.getMonitorStats();
        if (statsRes.success && statsRes.stats) this.monitorStats = statsRes.stats;
      }

      if (window.electronAPI.listProcesses) {
        const procRes = await window.electronAPI.listProcesses();
        if (procRes.success) this.monitorProcesses = procRes.processes || [];
      }
    } catch {
      // ignore
    } finally {
      this.monitorBusy = false;
      this.refreshSystemMonitorWindowDom();
    }
  }

  private stopSystemMonitorPolling(): void {
    if (this.monitorTimer) {
      window.clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  private stopSystemMonitorPollingIfNeeded(): void {
    if (!this.windows.some(w => w.id.startsWith('system-monitor'))) {
      this.stopSystemMonitorPolling();
    }
  }

  private async ensureSystemMonitorPolling(forceRefresh = false): Promise<void> {
    if (forceRefresh) await this.refreshSystemMonitorData(true);
    if (this.monitorTimer) return;
    this.monitorTimer = window.setInterval(() => {
      const win = this.windows.find(w => w.id.startsWith('system-monitor'));
      if (!win) {
        this.stopSystemMonitorPolling();
        return;
      }
      if (win.minimized) return;
      void this.refreshSystemMonitorData(false);
    }, 2500);
  }

  private getSystemMonitorContent(): string {
    const s = this.monitorStats;

    const cpu = s?.cpuPercent;
    const load1 = s?.loadavg?.[0];

    const memTotal = s?.memory?.total ?? 0;
    const memUsed = s?.memory?.used ?? 0;
    const memPct = memTotal ? (memUsed / memTotal) * 100 : null;

    const diskTotal = s?.disk?.total ?? 0;
    const diskUsed = s?.disk?.used ?? 0;
    const diskPct = s?.disk?.percent ?? (diskTotal ? Math.round((diskUsed / diskTotal) * 100) : null);

    const rxBps = s?.network?.rxBps ?? 0;
    const txBps = s?.network?.txBps ?? 0;

    const q = this.monitorQuery.trim().toLowerCase();
    const processes = this.monitorProcesses
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.command || '').toLowerCase().includes(q) || String(p.pid).includes(q))
      .slice()
      .sort((a, b) => {
        const dir = this.monitorSortDir === 'desc' ? -1 : 1;
        if (this.monitorSort === 'name') return dir * a.name.localeCompare(b.name);
        if (this.monitorSort === 'pid') return dir * (a.pid - b.pid);
        if (this.monitorSort === 'mem') return dir * ((a.mem || 0) - (b.mem || 0));
        return dir * ((a.cpu || 0) - (b.cpu || 0));
      })
      .slice(0, 250);

    const sortArrow = (key: string) => this.monitorSort === key ? (this.monitorSortDir === 'asc' ? ' â–²' : ' â–¼') : '';

    const statCard = (title: string, primary: string, secondary: string, percent: number | null) => `
      <div style="border: 1px solid rgba(0,255,65,0.25); border-radius: 10px; padding: 10px; background: rgba(0,0,0,0.16);">
        <div style="opacity: 0.75; font-size: 12px; margin-bottom: 6px;">${title}</div>
        <div style="font-size: 22px; color: #ffd700; line-height: 1.1;">${primary}</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 2px;">${secondary}</div>
        ${percent === null ? '' : `
          <div style="margin-top: 8px; height: 8px; background: rgba(0,255,65,0.12); border-radius: 999px; overflow: hidden;">
            <div style="height: 100%; width: ${Math.max(0, Math.min(100, percent)).toFixed(0)}%; background: rgba(0,255,65,0.65);"></div>
          </div>
        `}
      </div>
    `;

    return `
      <div class="system-monitor" style="height: 100%; display: flex; flex-direction: column; min-width: 0;">
        <div style="padding: 10px; border-bottom: 1px solid rgba(0,255,65,0.2); display: flex; gap: 10px; align-items: center;">
          <button class="monitor-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 8px; cursor: pointer;">Refresh</button>
          <input class="monitor-search-input" placeholder="Search processes..." value="${escapeHtml(this.monitorQuery)}" style="flex: 1; min-width: 120px; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.25); color: #00ff41; padding: 8px 10px; border-radius: 8px; font-family: inherit; outline: none;" />
          <div style="font-size: 12px; opacity: 0.75; white-space: nowrap;">
            ${s ? `Uptime ${this.formatDuration(s.uptime)} â€¢ ${escapeHtml(s.hostname)}` : 'Loadingâ€¦'}
          </div>
        </div>

        <div style="padding: 10px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;">
          ${statCard('CPU', cpu === null || cpu === undefined ? '--' : `${cpu.toFixed(0)}%`, `Load ${load1 === undefined ? '--' : load1.toFixed(2)} â€¢ ${s?.cpuCores ?? '--'} cores`, cpu ?? null)}
          ${statCard('Memory', memTotal ? `${(memPct || 0).toFixed(0)}%` : '--', memTotal ? `${this.formatFileSize(memUsed)} / ${this.formatFileSize(memTotal)}` : 'â€”', memPct)}
          ${statCard('Disk', diskTotal ? `${diskPct ?? 0}%` : '--', diskTotal ? `${this.formatFileSize(diskUsed)} / ${this.formatFileSize(diskTotal)}` : 'â€”', diskPct === null ? null : diskPct)}
          ${statCard('Network', `${this.formatFileSize(rxBps)}/s â†“`, `${this.formatFileSize(txBps)}/s â†‘`, null)}
        </div>

        <div class="system-monitor-processes" style="flex: 1; overflow: auto; padding: 10px; min-width: 0;">
          <div style="display: grid; grid-template-columns: 76px 1fr 72px 72px 72px 120px; gap: 10px; padding: 8px 10px; border: 1px solid rgba(0,255,65,0.18); border-radius: 8px; opacity: 0.8; font-size: 12px;">
            <span></span>
            <span class="monitor-col-header" data-sort-key="name" style="cursor: pointer;">Name${sortArrow('name')}</span>
            <span class="monitor-col-header" data-sort-key="pid" style="cursor: pointer;">PID${sortArrow('pid')}</span>
            <span class="monitor-col-header" data-sort-key="cpu" style="cursor: pointer;">CPU${sortArrow('cpu')}</span>
            <span class="monitor-col-header" data-sort-key="mem" style="cursor: pointer;">MEM${sortArrow('mem')}</span>
            <span>Time</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
            ${processes.length === 0 ? `<div style="padding: 16px; opacity: 0.7;">${this.monitorProcesses.length ? 'No processes match your search.' : 'Loading process listâ€¦'}</div>` : processes.map(p => `
              <div style="display: grid; grid-template-columns: 76px 1fr 72px 72px 72px 120px; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid rgba(0,255,65,0.18); border-radius: 8px; background: rgba(0,0,0,0.14); min-width: 0;">
                <button class="proc-kill-btn" data-pid="${p.pid}" data-name="${escapeHtml(p.name)}" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 8px; border-radius: 8px; cursor: pointer;">End</button>
                <div title="${escapeHtml(p.command || p.name)}" style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <span style="color: #ffd700;">${escapeHtml(p.name)}</span>
                  <span style="opacity: 0.65; font-size: 12px;">${p.command ? ` â€¢ ${escapeHtml(p.command)}` : ''}</span>
                </div>
                <div style="opacity: 0.85;">${p.pid}</div>
                <div style="opacity: 0.85;">${(p.cpu || 0).toFixed(1)}%</div>
                <div style="opacity: 0.85;">${(p.mem || 0).toFixed(1)}%</div>
                <div style="opacity: 0.85;">${escapeHtml(p.etime || '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // HYMN PLAYER
  // ============================================
  private hymnList = [
    { title: "Blessing - Kyrie Eleison", file: "01_Blessing_Great_Synapse_Kyrie_eleison.mp3" },
    { title: "1st Stanza: Psalm 102-103", file: "02_1st_Stanza__Psalm_102_103.mp3" },
    { title: "2nd Stanza: Psalm 145-146", file: "03_2nd_Stanza__Psalm_145_146.mp3" },
    { title: "3rd Stanza: The Beatitudes", file: "04_3rd_Stanza__The_Beatitudes.mp3" },
    { title: "Small Introit with Gospel", file: "05_Small_Introit_with_the_Gospel.mp3" },
    { title: "Trisagion Dynamis", file: "06_Trisagion_Dynamis.mp3" },
    { title: "Prokeimenon Epistle", file: "07_Prokeimenon_Epistle.mp3" },
    { title: "Alleluia Gospel", file: "08_Alleluia_Gospel.mp3" },
    { title: "Glory Be to Thee O Lord", file: "09_Glory_Be_to_Thee_O_Lord.mp3" },
    { title: "Hymn of the Cherubim", file: "10_Hymn_of_the_Cherubim_Great_Introit.mp3" },
    { title: "Creed", file: "11_Kiss_of_Peace_Symbol_of_Faith_Creed.mp3" },
    { title: "Anaphora Sanctus", file: "12_Anaphora_Sanctus.mp3" },
    { title: "Hymn To Our Lady", file: "13_Megalymaire_Hymn_To_Our_Lady.mp3" },
    { title: "Ekphonese", file: "14_Ekphonese.mp3" },
    { title: "Sunday Prayer", file: "15_Sunday_Prayer.mp3" },
    { title: "Kinonikon", file: "16_Kinonikon.mp3" },
    { title: "We Have Seen the True Light", file: "17_Ekphonese_We_Have_Seen_the_True_Light.mp3" },
    { title: "Final Prayers", file: "18_Final_Prayers_Let_the_Name_of_The_Lord.mp3" }
  ];

  private currentHymn = 0;

  private getHymnPlayerContent(): string {
    const hymnItems = this.hymnList.map((h, i) => `
      <div class="hymn-item ${i === this.currentHymn ? 'active' : ''}" data-hymn-index="${i}" style="
        padding: 10px 12px;
        cursor: pointer;
        border-bottom: 1px solid rgba(0,255,65,0.1);
        display: flex;
        align-items: center;
        gap: 10px;
        ${i === this.currentHymn ? 'background: rgba(0,255,65,0.15); color: #ffd700;' : 'color: #00ff41;'}
      ">
        <span style="opacity: 0.5; font-size: 14px;">${(i + 1).toString().padStart(2, '0')}</span>
        <span style="flex: 1; font-size: 15px;">${h.title}</span>
        ${i === this.currentHymn ? '<span>â–¶</span>' : ''}
      </div>
    `).join('');

    return `
      <div class="hymn-player" style="height: 100%; display: flex; flex-direction: column;">
        <div style="text-align: center; padding: 15px; border-bottom: 1px solid rgba(0,255,65,0.2);">
          <div style="font-size: 24px; margin-bottom: 5px;">ðŸŽµ âœï¸ ðŸŽµ</div>
          <h2 style="font-family: 'Press Start 2P', cursive; font-size: 10px; color: #ffd700; margin: 0;">DIVINE HYMNS</h2>
          <p style="font-size: 12px; opacity: 0.6; margin-top: 5px;">Orthodox Liturgical Music</p>
        </div>
        
        <div style="padding: 15px; border-bottom: 1px solid rgba(0,255,65,0.2);">
          <div style="font-size: 16px; color: #ffd700; margin-bottom: 10px; text-align: center;">${this.hymnList[this.currentHymn].title}</div>
          <audio id="hymn-audio" controls style="width: 100%; filter: sepia(0.3) hue-rotate(80deg);" src="./music/${this.hymnList[this.currentHymn].file}"></audio>
          <div style="display: flex; justify-content: center; gap: 15px; margin-top: 10px;">
            <button class="hymn-control" data-action="prev" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 15px; cursor: pointer; border-radius: 4px;">â® Prev</button>
            <button class="hymn-control" data-action="random" style="background: none; border: 1px solid rgba(255,215,0,0.3); color: #ffd700; padding: 8px 15px; cursor: pointer; border-radius: 4px;">ðŸŽ² Random</button>
            <button class="hymn-control" data-action="next" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 15px; cursor: pointer; border-radius: 4px;">Next â­</button>
          </div>
        </div>
        
        <div style="flex: 1; overflow-y: auto;">
          ${hymnItems}
        </div>
      </div>
    `;
  }

  private playHymn(index: number): void {
    // Validate index
    this.currentHymn = Math.max(0, Math.min(index, this.hymnList.length - 1));
    const hymn = this.hymnList[this.currentHymn];

    const hymnsWindow = this.windows.find(w => w.id.startsWith('hymns'));
    if (!hymnsWindow) return;

    // Check if the window is open and DOM elements exist
    const audioEl = document.getElementById('hymn-audio') as HTMLAudioElement;

    // If audio element exists, update it in-place (Smoother, no flicker)
    if (audioEl) {
      // Update Audio
      audioEl.src = `./music/${hymn.file}`;
      audioEl.play().catch(console.error);

      // Update Title (approximate selector based on structure)
      // Actually, let's just find the title text element by content or structure
      // A better way is to re-render JUST the info section, but updating text is faster
      const playerContainer = document.querySelector(`[data-window-id="${hymnsWindow.id}"] .hymn-player`) as HTMLElement;
      if (playerContainer) {
        // Update Title - 2nd child of 2nd div
        const titleDiv = playerContainer.children[1].querySelector('div');
        if (titleDiv) titleDiv.textContent = hymn.title;

        // Update Playlist Active State
        const items = playerContainer.querySelectorAll('.hymn-item');
        items.forEach((item, i) => {
          if (i === this.currentHymn) {
            item.classList.add('active');
            item.setAttribute('style', `padding: 10px 12px; cursor: pointer; border-bottom: 1px solid rgba(0,255,65,0.1); display: flex; align-items: center; gap: 10px; background: rgba(0,255,65,0.15); color: #ffd700;`);
            // Add play icon if missing
            if (!item.querySelector('span:nth-child(3)')) {
              item.insertAdjacentHTML('beforeend', '<span>â–¶</span>');
            }
          } else {
            item.classList.remove('active');
            item.setAttribute('style', `padding: 10px 12px; cursor: pointer; border-bottom: 1px solid rgba(0,255,65,0.1); display: flex; align-items: center; gap: 10px; color: #00ff41;`);
            // Remove play icon
            const playIcon = item.querySelector('span:nth-child(3)');
            if (playIcon) playIcon.remove();
          }
        });
      }
    } else {
      // Fallback: Full Re-render (Only if first load or error)
      console.warn('Audio element not found, performing full re-render');
      hymnsWindow.content = this.getHymnPlayerContent();
      this.render();
      setTimeout(() => {
        const audio = document.getElementById('hymn-audio') as HTMLAudioElement;
        if (audio) audio.play().catch(console.error);
      }, 100);
    }
  }

  private updateVolume(level: number): void {
    this.volumeLevel = level;
    if (window.electronAPI?.setAudioVolume) {
      void window.electronAPI.setAudioVolume(level);
    } else if (window.electronAPI) {
      void window.electronAPI.setSystemVolume(level);
    }

    // Application-level volume control
    const audioEl = document.getElementById('hymn-audio') as HTMLAudioElement;
    if (audioEl) {
      audioEl.volume = level / 100;
    }

    // Sync all volume sliders via DOM (don't re-render, it breaks dragging)
    document.querySelectorAll('.volume-slider').forEach((slider) => {
      const input = slider as HTMLInputElement;
      if (input.value !== String(level)) {
        input.value = String(level);
      }
    });

    // Update tray tooltip
    const volTray = document.getElementById('tray-volume');
    if (volTray) {
      volTray.title = `Volume: ${level}%`;
    }

    this.queueSaveConfig();
  }

  private refreshSettingsWindow(): void {
    const settingsWindow = this.windows.find(w => w.id.startsWith('settings'));
    if (settingsWindow) {
      settingsWindow.content = this.getSettingsContentV2();
      this.render();
    }
  }

  private async changeResolution(res: string): Promise<void> {
    this.currentResolution = res;
    this.queueSaveConfig();
    if (window.electronAPI?.setResolution) {
      try {
        const result = await window.electronAPI.setResolution(res);
        if (result && result.success === false) this.showNotification('Display', result.error || 'Failed to change resolution', 'warning');
      } catch (e) {
        this.showNotification('Display', String(e), 'warning');
      }
    }
  }

  private async loadResolutions(): Promise<void> {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.getResolutions();
        if (result.success) {
          this.availableResolutions = result.resolutions;
          this.currentResolution = result.current;
        }
      } catch (e) {
        console.error('Failed to load resolutions:', e);
      }
    }
  }

  // ============================================
  // CONFIG (persist user settings)
  // ============================================
  private async loadConfig(): Promise<void> {
    let cfg: TempleConfig = {};

    try {
      if (window.electronAPI?.loadConfig) {
        const res = await window.electronAPI.loadConfig();
        if (res?.success && res.config) cfg = res.config as TempleConfig;
      } else {
        const raw = localStorage.getItem('templeos.config');
        if (raw) cfg = JSON.parse(raw) as TempleConfig;
      }
    } catch (e) {
      console.warn('Failed to load config:', e);
    }

    if (typeof cfg.wallpaperImage === 'string') this.wallpaperImage = cfg.wallpaperImage;
    if (cfg.themeMode === 'dark' || cfg.themeMode === 'light') this.themeMode = cfg.themeMode;
    if (typeof cfg.volumeLevel === 'number') this.volumeLevel = Math.max(0, Math.min(100, cfg.volumeLevel));
    if (typeof cfg.doNotDisturb === 'boolean') this.doNotDisturb = cfg.doNotDisturb;
    if (typeof cfg.lockPassword === 'string') this.lockPassword = cfg.lockPassword;
    if (typeof cfg.lockPin === 'string') this.lockPin = cfg.lockPin;

    if (cfg.terminal) {
      const t = cfg.terminal;
      if (t.uiTheme === 'green' || t.uiTheme === 'cyan' || t.uiTheme === 'amber' || t.uiTheme === 'white') this.terminalUiTheme = t.uiTheme;
      if (typeof t.fontFamily === 'string' && t.fontFamily.trim()) this.terminalFontFamily = t.fontFamily;
      if (typeof t.fontSize === 'number') this.terminalFontSize = Math.max(10, Math.min(32, Math.round(t.fontSize)));
      if (typeof t.promptTemplate === 'string' && t.promptTemplate.trim()) this.terminalPromptTemplate = t.promptTemplate;
      if (t.aliases && typeof t.aliases === 'object') {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(t.aliases)) {
          const key = String(k || '').trim().toLowerCase();
          if (!key || !/^[a-z0-9_\\-]+$/.test(key)) continue;
          if (typeof v !== 'string') continue;
          next[key] = v;
          if (Object.keys(next).length >= 64) break;
        }
        this.terminalAliases = next;
      }
    }

    if (cfg.editor && typeof cfg.editor.wordWrap === 'boolean') {
      this.editorWordWrap = cfg.editor.wordWrap;
    }

    if (Array.isArray(cfg.recentFiles)) {
      this.editorRecentFiles = cfg.recentFiles
        .filter(x => typeof x === 'string')
        .slice(0, 20);
    }


    if (cfg.mouse) {
      if (typeof cfg.mouse.speed === 'number') this.mouseSettings.speed = Math.max(-1, Math.min(1, cfg.mouse.speed));
      if (typeof cfg.mouse.raw === 'boolean') this.mouseSettings.raw = cfg.mouse.raw;
      if (typeof cfg.mouse.naturalScroll === 'boolean') this.mouseSettings.naturalScroll = cfg.mouse.naturalScroll;
      if (typeof (cfg.mouse as any).dpi === 'number') this.mouseSettings.dpi = Math.max(100, Math.min(20000, Math.round((cfg.mouse as any).dpi)));
    }

    if (Array.isArray(cfg.pinnedStart)) {
      this.pinnedStart = cfg.pinnedStart.filter(k => typeof k === 'string').slice(0, 24);
    }
    if (Array.isArray(cfg.pinnedTaskbar)) {
      this.pinnedTaskbar = cfg.pinnedTaskbar.filter(k => typeof k === 'string').slice(0, 20);
    }
    if (Array.isArray(cfg.desktopShortcuts)) {
      this.desktopShortcuts = cfg.desktopShortcuts
        .filter(s => s && typeof s.key === 'string' && typeof s.label === 'string')
        .slice(0, 48)
        .map(s => ({ key: s.key, label: s.label }));
    }

    if (Array.isArray(cfg.recentApps)) this.recentApps = cfg.recentApps.slice(0, 20).filter(x => typeof x === 'string');
    if (cfg.appUsage && typeof cfg.appUsage === 'object') this.appUsage = cfg.appUsage as Record<string, number>;

    // Start terminal in home directory (if available)
    if (!this.terminalCwd && window.electronAPI) {
      try {
        this.terminalCwd = await window.electronAPI.getHome();
      } catch {
        this.terminalCwd = '/';
      }
    }

    if (this.terminalBuffer.length === 0) {
      this.terminalBuffer.push(`<div class="terminal-line system">TempleOS Terminal - Ready</div>`);
      this.terminalBuffer.push(`<div class="terminal-line system">CWD: ${escapeHtml(this.terminalCwd || '')}</div>`);
      this.terminalBuffer.push(`<div class="terminal-line system">Tips: cd, ls, pwd, cat, nano (non-interactive), help</div>`);
      this.terminalBuffer.push(`<div class="terminal-line"></div>`);
    }

    // Apply audio preferences (best-effort)
    if (cfg.audio?.defaultSink && window.electronAPI?.setDefaultSink) {
      await window.electronAPI.setDefaultSink(cfg.audio.defaultSink);
    }
    if (cfg.audio?.defaultSource && window.electronAPI?.setDefaultSource) {
      await window.electronAPI.setDefaultSource(cfg.audio.defaultSource);
    }
    if (window.electronAPI?.applyMouseSettings) {
      await window.electronAPI.applyMouseSettings(this.mouseSettings);
    }

    // If user saved a resolution preference, apply it after we loaded available modes.
    if (typeof cfg.currentResolution === 'string') {
      this.currentResolution = cfg.currentResolution;
      if (window.electronAPI) {
        window.electronAPI.setResolution(cfg.currentResolution);
      }
    }

    this.applyTheme();
    this.applyWallpaper();
    this.render();
  }

  private applyWallpaper(): void {
    const desktop = document.getElementById('desktop') as HTMLElement | null;
    if (desktop) {
      desktop.style.backgroundImage = `url('${this.wallpaperImage}')`;
      desktop.style.backgroundSize = '100% 100%';
      desktop.style.backgroundPosition = 'center';
    }
  }

  private applyTheme(): void {
    document.documentElement.dataset.theme = this.themeMode;
  }

  private queueSaveConfig(): void {
    if (this.configSaveTimer) window.clearTimeout(this.configSaveTimer);
    this.configSaveTimer = window.setTimeout(() => {
      this.configSaveTimer = null;
      void this.saveConfigNow();
    }, 250);
  }

  private async saveConfigNow(): Promise<void> {
    const snapshot: TempleConfig = {
      wallpaperImage: this.wallpaperImage,
      themeMode: this.themeMode as 'dark' | 'light',
      currentResolution: this.currentResolution,
      volumeLevel: this.volumeLevel,
      doNotDisturb: this.doNotDisturb,
      lockPassword: this.lockPassword,
      lockPin: this.lockPin,

      terminal: {
        aliases: this.terminalAliases,
        promptTemplate: this.terminalPromptTemplate,
        uiTheme: this.terminalUiTheme,
        fontFamily: this.terminalFontFamily,
        fontSize: this.terminalFontSize
      },

      editor: { wordWrap: this.editorWordWrap },
      recentFiles: this.editorRecentFiles.slice(0, 20),

      audio: { defaultSink: this.audioDevices.defaultSink, defaultSource: this.audioDevices.defaultSource },
      mouse: { ...this.mouseSettings },
      pinnedStart: this.pinnedStart.slice(0, 24),
      pinnedTaskbar: this.pinnedTaskbar.slice(0, 20),
      desktopShortcuts: this.desktopShortcuts.slice(0, 48),
      recentApps: this.recentApps.slice(0, 20),
      appUsage: this.appUsage
    };

    try {
      if (window.electronAPI?.saveConfig) {
        await window.electronAPI.saveConfig(snapshot);
      } else {
        localStorage.setItem('templeos.config', JSON.stringify(snapshot));
      }
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  }

  // ============================================
  // HOLY UPDATER
  // ============================================
  private updaterState: { status: string; message: string; isUpdating: boolean } = {
    status: 'idle',
    message: 'Click "Check for Updates" to see if new blessings await.',
    isUpdating: false
  };

  private getUpdaterContent(): string {
    const statusIcon = this.updaterState.status === 'success' ? 'âœ…' :
      this.updaterState.status === 'error' ? 'âŒ' :
        this.updaterState.status === 'updating' ? 'â³' :
          this.updaterState.status === 'available' ? 'ðŸ†•' : 'ðŸ”';

    return `
      <div class="updater" style="padding: 20px; text-align: center; height: 100%; display: flex; flex-direction: column;">
        <div style="font-size: 48px; margin-bottom: 15px;">â¬‡ï¸</div>
        <h2 style="margin: 0 0 10px 0; color: #ffd700;">âœ HOLY UPDATER âœ</h2>
        <p style="opacity: 0.7; margin-bottom: 20px;">Receive new blessings from the Divine Repository</p>
        
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-size: 24px; margin-bottom: 10px;">${statusIcon}</div>
          <p style="margin: 10px 0; max-width: 400px;">${this.updaterState.message}</p>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
          <button class="updater-btn" data-updater-action="check" 
                  style="background: rgba(0,255,65,0.2); border: 1px solid #00ff41; color: #00ff41; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;"
                  ${this.updaterState.isUpdating ? 'disabled' : ''}>
            ðŸ” Check for Updates
          </button>
          <button class="updater-btn" data-updater-action="update" 
                  style="background: rgba(255,215,0,0.2); border: 1px solid #ffd700; color: #ffd700; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;"
                  ${this.updaterState.isUpdating || this.updaterState.status !== 'available' ? 'disabled' : ''}>
            â¬‡ï¸ Download & Install
          </button>
          ${this.updaterState.status === 'success' ? `
          <button class="updater-btn" data-updater-action="reboot" 
                  style="background: rgba(255,100,100,0.2); border: 1px solid #ff6464; color: #ff6464; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;">
            ðŸ”„ Reboot Now
          </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private async checkForUpdates(): Promise<void> {
    if (!window.electronAPI) {
      this.updaterState = { status: 'error', message: 'Not running in Electron environment.', isUpdating: false };
      this.updateUpdaterWindow();
      return;
    }

    this.updaterState = { status: 'updating', message: 'Connecting to the Divine Repository...', isUpdating: true };
    this.updateUpdaterWindow();

    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.success) {
        if (result.updatesAvailable) {
          this.updaterState = {
            status: 'available',
            message: `ðŸ†• ${result.behindCount} new blessing${result.behindCount === 1 ? '' : 's'} available from Heaven!`,
            isUpdating: false
          };
        } else {
          this.updaterState = {
            status: 'idle',
            message: 'âœ¨ Your temple is blessed with the latest version!',
            isUpdating: false
          };
        }
      } else {
        this.updaterState = { status: 'error', message: `Error: ${result.error}`, isUpdating: false };
      }
    } catch (error) {
      this.updaterState = { status: 'error', message: `Connection failed: ${error}`, isUpdating: false };
    }

    this.updateUpdaterWindow();
  }

  private async runUpdate(): Promise<void> {
    if (!window.electronAPI) return;

    this.updaterState = { status: 'updating', message: 'ðŸ“¥ Downloading divine updates...', isUpdating: true };
    this.updateUpdaterWindow();

    try {
      const result = await window.electronAPI.runUpdate();
      if (result.success) {
        this.updaterState = {
          status: 'success',
          message: 'âœ… Update complete! Reboot to apply the new blessings.',
          isUpdating: false
        };
      } else {
        this.updaterState = { status: 'error', message: `Update failed: ${result.error}`, isUpdating: false };
      }
    } catch (error) {
      this.updaterState = { status: 'error', message: `Update error: ${error}`, isUpdating: false };
    }

    this.updateUpdaterWindow();
  }

  private updateUpdaterWindow(): void {
    const updaterWindow = this.windows.find(w => w.id.startsWith('updater'));
    if (updaterWindow) {
      updaterWindow.content = this.getUpdaterContent();
      this.render();
    }
  }

  // ============================================
  // WINDOW CYCLING (Alt+Tab)
  // ============================================
  private cycleWindows(): void {
    if (this.windows.length === 0) return;

    // Find current active window index
    const activeIndex = this.windows.findIndex(w => w.active);

    // Deactivate all
    this.windows.forEach(w => w.active = false);

    // Find next window (wrap around)
    let nextIndex = (activeIndex + 1) % this.windows.length;

    // Skip minimized windows
    let attempts = 0;
    while (this.windows[nextIndex].minimized && attempts < this.windows.length) {
      nextIndex = (nextIndex + 1) % this.windows.length;
      attempts++;
    }

    // Activate and restore if minimized
    const nextWin = this.windows[nextIndex];
    nextWin.active = true;
    const wasMinimized = nextWin.minimized;
    nextWin.minimized = false;

    // Move to end of array (bring to front)
    this.windows.splice(nextIndex, 1);
    this.windows.push(nextWin);

    // OPTIMIZED: Update DOM without full re-render (preserves audio!)
    const container = document.getElementById('windows-container');
    const winEl = document.querySelector(`[data-window-id="${nextWin.id}"]`) as HTMLElement;

    if (container && winEl) {
      // Show if was minimized
      if (wasMinimized) {
        winEl.style.display = 'flex';
      }

      // Move to end (visual front)
      container.appendChild(winEl);

      // Update active styling
      const allWindows = container.querySelectorAll('.window');
      allWindows.forEach(el => el.classList.remove('active'));
      winEl.classList.add('active');

      // Update Taskbar Only
      const taskbarApps = document.querySelector('.taskbar-apps');
      if (taskbarApps) {
        taskbarApps.innerHTML = this.renderTaskbarAppsHtml();
      }
    } else {
      // Fallback: full re-render if DOM element not found
      this.render();
    }
  }

  private stepAltTab(direction: number): void {
    if (this.windows.length === 0) return;

    // Build MRU order: active first, then previous windows.
    const order = this.windows.slice().reverse().map(w => w.id);

    if (!this.altTabOpen) {
      this.altTabOpen = true;
      this.altTabOrder = order;
      this.altTabIndex = order.length > 1 ? 1 : 0; // first press selects previous window
      this.render();
      return;
    }

    // If windows changed while alt-tab is open, refresh order but keep current selection if possible.
    this.altTabOrder = order;
    const max = Math.max(0, this.altTabOrder.length - 1);
    const next = this.altTabIndex + direction;
    this.altTabIndex = ((next % (max + 1)) + (max + 1)) % (max + 1);
    this.render();
  }

  private commitAltTab(): void {
    const selectedId = this.altTabOrder[this.altTabIndex];
    this.altTabOpen = false;
    this.altTabOrder = [];
    this.altTabIndex = 0;
    if (selectedId) this.focusWindow(selectedId);
    this.render();
  }

  private cancelAltTab(): void {
    this.altTabOpen = false;
    this.altTabOrder = [];
    this.altTabIndex = 0;
    this.render();
  }

  private renderAltTabOverlay(): string {
    if (!this.altTabOpen) return '';

    const items = this.altTabOrder
      .map(id => this.windows.find(w => w.id === id))
      .filter(Boolean) as WindowState[];

    if (items.length === 0) return '';

    const selected = items[Math.min(this.altTabIndex, items.length - 1)] || items[0];
    const previewLines = selected ? this.getAltTabPreviewLines(selected) : [];
    const selectedStatus = selected ? (selected.minimized ? 'Minimized' : 'Window') : '';

    return `
      <div class="alt-tab-scrim">
        <div class="alt-tab-panel">
          <div class="alt-tab-columns">
            <div class="alt-tab-list">
              ${items.map((w, idx) => `
                <div class="alt-tab-item ${idx === this.altTabIndex ? 'active' : ''}">
                  <span class="alt-tab-icon">${w.icon}</span>
                  <div class="alt-tab-meta">
                    <div class="alt-tab-title">${escapeHtml(w.title)}</div>
                    <div class="alt-tab-sub">${w.minimized ? 'Minimized' : 'Window'}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="alt-tab-preview">
              <div class="alt-tab-preview-head">
                <div class="alt-tab-preview-icon">${selected?.icon || ''}</div>
                <div class="alt-tab-preview-meta">
                  <div class="alt-tab-preview-title">${escapeHtml(selected?.title || '')}</div>
                  <div class="alt-tab-preview-sub">${escapeHtml(selectedStatus)}</div>
                </div>
              </div>
              <div class="alt-tab-preview-body">
                ${previewLines.length
        ? previewLines.map(l => `<div class="alt-tab-preview-line">${escapeHtml(l)}</div>`).join('')
        : `<div class="alt-tab-preview-empty">No preview available.</div>`}
              </div>
            </div>
          </div>
          <div class="alt-tab-hint">Alt+Tab to cycle â€¢ Release Alt to switch</div>
        </div>
      </div>
    `;
  }

  private getAltTabPreviewLines(win: WindowState): string[] {
    const appId = win.id.split('-')[0] || '';

    if (appId === 'terminal') {
      const tab = this.terminalTabs[this.activeTerminalTab];
      if (this.ptySupported && tab?.ptyId) return ['Real shell (PTY)', tab.cwd ? `CWD: ${tab.cwd}` : ''].filter(Boolean);
      const recent = (tab?.buffer?.length ? tab.buffer : this.terminalBuffer).slice(-10);
      const text = recent
        .map(l => l.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      return text.slice(-8);
    }

    if (appId === 'files') {
      const lines: string[] = [];
      lines.push(this.currentPath === 'trash:' ? 'Trash' : (this.currentPath || ''));
      const count = this.fileEntries.length;
      if (count) lines.push(`${count} item${count === 1 ? '' : 's'}`);
      const sample = this.fileEntries.slice(0, 5).map(e => (e.isDirectory ? `[DIR] ${e.name}` : e.name));
      return [...lines, ...sample].filter(Boolean);
    }

    if (appId === 'editor') {
      const tab = this.editorTabs[this.activeEditorTab];
      if (!tab) return [];
      const title = tab.path ? getBaseName(tab.path) : (tab.filename || 'Untitled');
      const firstLines = (tab.content || '').split(/\r?\n/).slice(0, 7).map(l => l.slice(0, 80));
      return [title, ...firstLines].filter(Boolean);
    }

    if (appId === 'settings') {
      return ['Settings', `Category: ${this.activeSettingsCategory}`];
    }

    if (appId === 'system-monitor') {
      const stats = this.monitorStats;
      const cpu = typeof stats?.cpuPercent === 'number' ? `${stats.cpuPercent.toFixed(0)}% CPU` : '';
      const mem = stats?.memory?.total ? `${this.formatFileSize(stats.memory.used)} / ${this.formatFileSize(stats.memory.total)} RAM` : '';
      const net = stats?.network ? `${this.formatFileSize(stats.network.rxBps)}/s â†“ â€¢ ${this.formatFileSize(stats.network.txBps)}/s â†‘` : '';
      return ['Task Manager', cpu, mem, net].filter(Boolean);
    }

    // Generic fallback: strip tags, show a few lines
    const plain = this.stripHtmlToText(win.content).trim();
    if (!plain) return [];
    return plain.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 8);
  }

  private stripHtmlToText(html: string): string {
    return String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(div|p|li|tr|h\d|pre|section|article)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private closeWindow(windowId: string) {
    const wasSystemMonitor = windowId.startsWith('system-monitor');
    const wasTerminal = windowId.startsWith('terminal');
    const wasEditor = windowId.startsWith('editor');
    if (wasTerminal) {
      for (const tab of this.terminalTabs) {
        if (tab?.ptyId && window.electronAPI?.destroyPty) {
          void window.electronAPI.destroyPty(tab.ptyId);
        }
        tab.xterm?.dispose();
      }
      this.terminalTabs = [];
      this.activeTerminalTab = 0;
      this.terminalSplitMode = 'single';
      this.terminalSplitSecondaryTabId = null;
      this.terminalSearchOpen = false;
      this.terminalSearchQuery = '';
      this.terminalSearchMatches = [];
      this.terminalSearchMatchIndex = -1;
    }
    if (wasEditor) {
      if (this.editorAutosaveTimer) {
        window.clearTimeout(this.editorAutosaveTimer);
        this.editorAutosaveTimer = null;
      }
      if (this.editorView && this.editorViewTabId) {
        const tab = this.editorTabs.find(t => t.id === this.editorViewTabId);
        if (tab) tab.cmState = this.editorView.state;
      }
      this.editorView?.destroy();
      this.editorView = null;
      this.editorViewTabId = null;
    }
    this.windows = this.windows.filter(w => w.id !== windowId);
    if (this.windows.length > 0) {
      this.windows[this.windows.length - 1].active = true;
    }
    this.render();
    if (wasSystemMonitor) this.stopSystemMonitorPollingIfNeeded();
  }

  private minimizeWindow(windowId: string) {
    const win = this.windows.find(w => w.id === windowId);
    if (win) {
      win.minimized = true;
      win.active = false;
      // Activate next non-minimized window
      const visibleWindows = this.windows.filter(w => !w.minimized);
      if (visibleWindows.length > 0) {
        visibleWindows[visibleWindows.length - 1].active = true;
      }

      // OPTIMIZED: Hide window via DOM instead of re-render (preserves audio playback!)
      const winEl = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement;
      if (winEl) {
        winEl.style.display = 'none';

        // Update active styling on remaining windows
        const container = document.getElementById('windows-container');
        if (container) {
          const allWindows = container.querySelectorAll('.window');
          allWindows.forEach(el => {
            const elId = el.getAttribute('data-window-id');
            const winData = this.windows.find(w => w.id === elId);
            if (winData?.active) {
              el.classList.add('active');
            } else {
              el.classList.remove('active');
            }
          });
        }

        // Update Taskbar Only
        const taskbarApps = document.querySelector('.taskbar-apps');
        if (taskbarApps) {
          taskbarApps.innerHTML = this.renderTaskbarAppsHtml();
        }
        return; // Skip full re-render
      }
    }
    // Fallback: full re-render if DOM element not found
    this.render();
  }

  private maximizeWindow(windowId: string) {
    const win = this.windows.find(w => w.id === windowId);
    if (win) {
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
        win.width = window.innerWidth - 20;
        win.height = window.innerHeight - 80;
        win.maximized = true;
      }
    }
    this.render();
  }

  private toggleWindow(windowId: string) {
    const win = this.windows.find(w => w.id === windowId);
    if (win) {
      if (win.minimized) {
        win.minimized = false;
        this.focusWindow(windowId);
      } else if (win.active) {
        this.minimizeWindow(windowId);
      } else {
        this.focusWindow(windowId);
      }
    }
  }

  private toggleShowDesktop(): void {
    if (!this.showDesktopMode) {
      this.showDesktopMode = true;
      this.showDesktopRestoreIds = this.windows.filter(w => !w.minimized).map(w => w.id);
      for (const id of this.showDesktopRestoreIds) {
        this.minimizeWindow(id);
      }
      return;
    }

    // Restore
    this.showDesktopMode = false;
    const restore = this.showDesktopRestoreIds.slice();
    this.showDesktopRestoreIds = [];
    for (const id of restore) {
      const win = this.windows.find(w => w.id === id);
      if (!win) continue;
      win.minimized = false;
    }
    // Focus last restored if any
    const last = restore.reverse().find(id => this.windows.some(w => w.id === id));
    if (last) this.focusWindow(last);
    else this.render();
  }

  private focusWindow(windowId: string) {
    const winIndex = this.windows.findIndex(w => w.id === windowId);
    if (winIndex !== -1) {
      const win = this.windows[winIndex];

      // OPTIMIZATION: If already active, topmost, and visible, do nothing.
      // This is critical for dragging: re-appending the element destroys the drag operation.
      const isTopmost = winIndex === this.windows.length - 1;
      if (win.active && isTopmost && !win.minimized) {
        return;
      }

      const wasMinimized = win.minimized;
      win.minimized = false;
      this.windows.forEach(w => w.active = w.id === windowId);

      // Move to end of array (z-index top)
      if (!isTopmost) {
        this.windows.splice(winIndex, 1);
        this.windows.push(win);
      }

      const container = document.getElementById('windows-container');
      const winEl = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement;

      if (wasMinimized && winEl) {
        // Just show the hidden element (preserves audio playback!)
        winEl.style.display = 'flex';

        // Move to end (visual front)
        if (container) container.appendChild(winEl);

        // Update active styling
        if (container) {
          const allWindows = container.querySelectorAll('.window');
          allWindows.forEach(el => el.classList.remove('active'));
        }
        winEl.classList.add('active');

        // Update Taskbar Only
        const taskbarApps = document.querySelector('.taskbar-apps');
        if (taskbarApps) {
          taskbarApps.innerHTML = this.renderTaskbarAppsHtml();
        }
      } else if (container && winEl) {
        // OPTIMIZED UPDATE: Don't destroy DOM (keeps audio playing!)
        // Move to end (visual front)
        container.appendChild(winEl);

        // Update active styling
        const allWindows = container.querySelectorAll('.window');
        allWindows.forEach(el => el.classList.remove('active'));
        winEl.classList.add('active');

        // Update Taskbar Only
        const taskbarApps = document.querySelector('.taskbar-apps');
        if (taskbarApps) {
          taskbarApps.innerHTML = this.renderTaskbarAppsHtml();
        }
      } else {
        // Fallback: full re-render if DOM element not found
        this.render();
      }
    } else {
      this.render();
    }
  }

  // ============================================
  // LOCK SCREEN
  // ============================================
  private lock(): void {
    if (this.isLocked) return;
    this.isLocked = true;

    // Create secure lock screen
    const existingLock = document.querySelector('.lock-screen');
    if (existingLock) existingLock.remove();

    const lockScreen = document.createElement('div');
    lockScreen.className = 'lock-screen';
    lockScreen.style.backgroundImage = `linear-gradient(135deg, rgba(13,17,23,0.85) 0%, rgba(26,31,46,0.85) 50%, rgba(13,17,23,0.85) 100%), url('${this.wallpaperImage}')`;
    lockScreen.style.backgroundSize = 'cover';
    lockScreen.style.backgroundPosition = 'center';
    lockScreen.innerHTML = `
      <div class="lock-panel">
        <img src="${templeLogo}" class="lock-avatar" draggable="false" alt="TempleOS">
        <div class="lock-brand">
          <div class="lock-brand-title">TEMPLE OS</div>
          <div class="lock-brand-sub">God's Own Login</div>
        </div>

        <div class="lock-clock" id="lock-clock"></div>
        <div class="lock-date" id="lock-date"></div>

        <div class="lock-input-container">
          <div class="lock-user-name">Terry A. Davis</div>

          <div class="lock-mode-toggle">
            <button class="lock-mode-btn ${this.lockInputMode === 'password' ? 'active' : ''}" data-lock-mode="password">Password</button>
            <button class="lock-mode-btn ${this.lockInputMode === 'pin' ? 'active' : ''}" data-lock-mode="pin">PIN</button>
          </div>

          <div class="lock-input-row">
            <input type="password" class="lock-password-input" placeholder="${this.lockInputMode === 'pin' ? 'PIN' : 'Password'}" inputmode="${this.lockInputMode === 'pin' ? 'numeric' : 'text'}" autocomplete="off">
            <button class="lock-reveal-btn" data-lock-action="reveal" title="Show/Hide" ${this.lockInputMode === 'pin' ? 'disabled' : ''}>ðŸ‘</button>
          </div>

          <div class="lock-caps" id="lock-caps">Caps Lock is ON</div>
          <div class="lock-message" id="lock-message">${this.lockInputMode === 'pin' ? 'Enter PIN' : 'Enter Password'}</div>

          <div class="lock-pin-pad ${this.lockInputMode === 'pin' ? '' : 'hidden'}" data-lock-pin-pad>
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="lock-pin-btn" data-pin-key="${n}">${n}</button>`).join('')}
            <button class="lock-pin-btn alt" data-pin-key="clear">CLR</button>
            <button class="lock-pin-btn" data-pin-key="0">0</button>
            <button class="lock-pin-btn alt" data-pin-key="back">âŒ«</button>
            <button class="lock-pin-enter" data-pin-key="enter">ENTER</button>
          </div>

          <div class="lock-hint">Press Enter to Unlock</div>
          <div class="lock-power">
            <button class="lock-power-btn" data-lock-power="restart">Restart</button>
            <button class="lock-power-btn danger" data-lock-power="shutdown">Shutdown</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(lockScreen);

    // Focus input
    const input = lockScreen.querySelector('.lock-password-input') as HTMLInputElement;
    if (input) setTimeout(() => input.focus(), 100);

    // Update clock
    const updateLockClock = () => {
      const lockClock = document.getElementById('lock-clock');
      const lockDate = document.getElementById('lock-date');
      if (lockClock) {
        lockClock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (lockDate) {
        lockDate.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    };
    updateLockClock();
    const clockInterval = setInterval(updateLockClock, 1000);

    // Event Listeners for Unlock
    const attemptUnlock = () => {
      const val = input.value;
      const msg = document.getElementById('lock-message');

      const ok = this.lockInputMode === 'pin' ? val === this.lockPin : val === this.lockPassword;
      if (ok) {
        clearInterval(clockInterval);
        this.unlock();
      } else {
        // Error state
        if (msg) {
          msg.textContent = this.lockInputMode === 'pin' ? 'Incorrect PIN' : 'Incorrect Password';
          msg.classList.add('error');
        }
        input.classList.add('error');
        input.value = '';

        this.playNotificationSound('error');

        setTimeout(() => {
          input.classList.remove('error');
          if (msg) {
            msg.textContent = this.lockInputMode === 'pin' ? 'Enter PIN' : 'Enter Password';
            msg.classList.remove('error');
          }
          input.focus();
        }, 1000);
      }
    };

    input.addEventListener('keydown', (e) => {
      const capsEl = document.getElementById('lock-caps');
      if (capsEl) {
        const caps = (e as KeyboardEvent).getModifierState?.('CapsLock') ?? false;
        capsEl.classList.toggle('show', caps);
      }

      if (this.lockInputMode === 'pin') {
        const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab', 'Enter'];
        if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
          e.preventDefault();
          return;
        }
        if (/^\d$/.test(e.key) && input.value.length >= 8) {
          e.preventDefault();
          return;
        }
      }

      if (e.key === 'Enter') attemptUnlock();
    });

    input.addEventListener('input', () => {
      if (this.lockInputMode === 'pin') {
        input.value = input.value.replace(/[^\d]/g, '').slice(0, 8);
      }
    });

    const setMode = (mode: 'password' | 'pin') => {
      this.lockInputMode = mode;
      const msg = document.getElementById('lock-message');
      if (msg) {
        msg.textContent = mode === 'pin' ? 'Enter PIN' : 'Enter Password';
        msg.classList.remove('error');
      }
      input.classList.remove('error');
      input.value = '';
      input.type = 'password';
      input.placeholder = mode === 'pin' ? 'PIN' : 'Password';
      input.setAttribute('inputmode', mode === 'pin' ? 'numeric' : 'text');

      const pinPad = lockScreen.querySelector('[data-lock-pin-pad]') as HTMLElement | null;
      if (pinPad) pinPad.classList.toggle('hidden', mode !== 'pin');

      const capsEl = document.getElementById('lock-caps');
      if (capsEl) capsEl.classList.remove('show');

      const reveal = lockScreen.querySelector('[data-lock-action="reveal"]') as HTMLButtonElement | null;
      if (reveal) {
        reveal.disabled = mode === 'pin';
        reveal.textContent = 'ðŸ‘';
      }

      lockScreen.querySelectorAll('[data-lock-mode]').forEach((el) => {
        const btn = el as HTMLButtonElement;
        btn.classList.toggle('active', btn.dataset.lockMode === mode);
      });

      input.focus();
    };

    lockScreen.querySelectorAll('[data-lock-mode]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const mode = (el as HTMLElement).getAttribute('data-lock-mode') === 'pin' ? 'pin' : 'password';
        setMode(mode);
      });
    });

    const revealBtn = lockScreen.querySelector('[data-lock-action="reveal"]') as HTMLButtonElement | null;
    if (revealBtn) {
      revealBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.lockInputMode === 'pin') return;
        input.type = input.type === 'password' ? 'text' : 'password';
        revealBtn.textContent = input.type === 'password' ? 'ðŸ‘' : 'ðŸ™ˆ';
        input.focus();
      });
    }

    lockScreen.querySelectorAll('[data-pin-key]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const key = (el as HTMLElement).getAttribute('data-pin-key') || '';
        if (key === 'enter') {
          attemptUnlock();
          return;
        }
        if (key === 'back') {
          input.value = input.value.slice(0, -1);
          input.focus();
          return;
        }
        if (key === 'clear') {
          input.value = '';
          input.focus();
          return;
        }
        if (/^\d$/.test(key) && input.value.length < 8) {
          input.value += key;
          input.focus();
        }
      });
    });

    lockScreen.querySelectorAll('[data-lock-power]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const action = (el as HTMLElement).getAttribute('data-lock-power');
        if (!action) return;
        void (async () => {
          const ok = await this.openConfirmModal({
            title: action === 'shutdown' ? 'Shutdown' : 'Restart',
            message: action === 'shutdown' ? 'Power off the system?' : 'Restart the system?',
            confirmText: action === 'shutdown' ? 'Shutdown' : 'Restart',
            cancelText: 'Cancel'
          });
          if (!ok) return;
          if (!window.electronAPI) return;
          if (action === 'shutdown') await window.electronAPI.shutdown();
          if (action === 'restart') await window.electronAPI.restart();
        })();
      });
    });

    // Ensure UI reflects the current mode.
    setMode(this.lockInputMode);

    // Prevent closing by clicking background (unlike before)
    lockScreen.addEventListener('click', (e) => {
      if (e.target === lockScreen) {
        input.focus();
      }
    });
  }

  private unlock(): void {
    const lockScreen = document.querySelector('.lock-screen');
    if (lockScreen) {
      lockScreen.classList.add('fadeOut'); // Add fade out if we had CSS for it
      setTimeout(() => lockScreen.remove(), 200); // Wait for potential animation
    }
    this.isLocked = false;

    this.playNotificationSound('divine');
  }

  // ============================================
  // CONTEXT MENU SYSTEM
  // ============================================
  private showContextMenu(x: number, y: number, items: Array<{ label?: string; action?: () => void | Promise<void>; divider?: boolean }>): void {
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
        menuItem.textContent = item.label || '';
        menuItem.style.cssText = `
          padding: 8px 14px;
          cursor: pointer;
          color: #00ff41;
          font-size: 16px;
          font-family: 'VT323', 'Noto Color Emoji', monospace;
        `;
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = 'rgba(0, 255, 65, 0.15)';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeContextMenu();
          if (item.action) item.action();
        });
        menu.appendChild(menuItem);
      }
    });

    // Adjust position if menu would go off screen
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight - 50) {
      menu.style.top = `${y - rect.height}px`;
    }
  }

  private closeContextMenu(): void {
    const menu = document.querySelector('.context-menu');
    if (menu) menu.remove();
  }

  private async promptRename(filePath: string): Promise<void> {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    if (!window.electronAPI) return;

    const newName = await this.openPromptModal({
      title: 'Rename',
      message: `Rename "${fileName}"`,
      inputLabel: 'New name',
      defaultValue: fileName,
      confirmText: 'Rename',
      cancelText: 'Cancel'
    });
    if (newName === null) return;

    const trimmed = newName.trim();
    if (!trimmed || trimmed === fileName || /[\\/]/.test(trimmed)) {
      await this.openAlertModal({ title: 'Files', message: 'Invalid name.' });
      return;
    }

    const parentDir = filePath.substring(0, filePath.lastIndexOf(fileName));
    const newPath = parentDir + trimmed;
    const result = await window.electronAPI.rename(filePath, newPath);
    if (result.success) {
      this.showNotification('Files', `Renamed to ${trimmed}`, 'divine');
      void this.loadFiles(this.currentPath);
    } else {
      await this.openAlertModal({ title: 'Files', message: `Rename failed: ${result.error || 'Unknown error'}` });
    }
  }

  private async confirmDelete(filePath: string): Promise<void> {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    if (!window.electronAPI) return;

    const ok = await this.openConfirmModal({
      title: 'Move to Trash',
      message: `Move "${fileName}" to Trash?`,
      confirmText: 'Trash',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    if (window.electronAPI.trashItem) {
      const res = await window.electronAPI.trashItem(filePath);
      if (res.success) {
        this.showNotification('Files', `Moved ${fileName} to Trash`, 'divine');
        void this.loadFiles(this.currentPath);
        return;
      }
      await this.openAlertModal({ title: 'Files', message: `Trash failed: ${res.error || 'Unknown error'}` });
      return;
    }

    // Fallback: permanent delete
    const result = await window.electronAPI.deleteItem(filePath);
    if (result.success) {
      this.showNotification('Files', `Deleted ${fileName}`, 'divine');
      void this.loadFiles(this.currentPath);
    } else {
      await this.openAlertModal({ title: 'Files', message: `Delete failed: ${result.error || 'Unknown error'}` });
    }
  }

  private async restoreTrashItem(trashPath: string, originalPath: string): Promise<void> {
    if (!window.electronAPI?.restoreTrash) return;
    const name = trashPath.split(/[/\\]/).pop() || 'item';
    const res = await window.electronAPI.restoreTrash(trashPath, originalPath);
    if (res.success) {
      this.showNotification('Files', `Restored ${name}`, 'divine');
      void this.loadFiles('trash:');
    } else {
      await this.openAlertModal({ title: 'Files', message: `Restore failed: ${res.error || 'Unknown error'}` });
    }
  }

  private async confirmDeleteTrashItem(trashPath: string): Promise<void> {
    if (!window.electronAPI?.deleteTrashItem) return;
    const name = trashPath.split(/[/\\]/).pop() || 'item';
    const ok = await this.openConfirmModal({
      title: 'Delete Permanently',
      message: `Permanently delete "${name}" from Trash?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!ok) return;
    const res = await window.electronAPI.deleteTrashItem(trashPath);
    if (res.success) {
      this.showNotification('Files', `Deleted ${name}`, 'divine');
      void this.loadFiles('trash:');
    } else {
      await this.openAlertModal({ title: 'Files', message: `Delete failed: ${res.error || 'Unknown error'}` });
    }
  }

  private async promptNewFolder(): Promise<void> {
    if (!window.electronAPI) return;
    const name = await this.openPromptModal({
      title: 'New Folder',
      message: 'Create a new folder in the current directory.',
      inputLabel: 'Folder name',
      placeholder: 'New folder',
      confirmText: 'Create',
      cancelText: 'Cancel'
    });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed || /[\\/]/.test(trimmed)) {
      await this.openAlertModal({ title: 'Files', message: 'Invalid folder name.' });
      return;
    }

    const dest = this.joinPath(this.currentPath || '/', trimmed);
    const result = await window.electronAPI.mkdir(dest);
    if (result.success) {
      this.showNotification('Files', `Created folder ${trimmed}`, 'divine');
      void this.loadFiles(this.currentPath);
    } else {
      await this.openAlertModal({ title: 'Files', message: `Create folder failed: ${result.error || 'Unknown error'}` });
    }
  }

  private async promptNewFile(): Promise<void> {
    if (!window.electronAPI) return;
    const name = await this.openPromptModal({
      title: 'New File',
      message: 'Create a new file in the current directory.',
      inputLabel: 'File name',
      placeholder: 'new.txt',
      confirmText: 'Create',
      cancelText: 'Cancel'
    });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed || /[\\/]/.test(trimmed)) {
      await this.openAlertModal({ title: 'Files', message: 'Invalid file name.' });
      return;
    }

    const dest = this.joinPath(this.currentPath || '/', trimmed);
    const result = await window.electronAPI.writeFile(dest, '');
    if (result.success) {
      this.showNotification('Files', `Created file ${trimmed}`, 'divine');
      void this.loadFiles(this.currentPath);
    } else {
      await this.openAlertModal({ title: 'Files', message: `Create file failed: ${result.error || 'Unknown error'}` });
    }
  }

  private async pasteIntoCurrentFolder(): Promise<void> {
    if (!window.electronAPI) return;
    if (!this.fileClipboard) return;
    if (!this.currentPath) return;

    const src = this.fileClipboard.srcPath;
    const baseName = getBaseName(src);
    if (!baseName) return;

    const dest = this.joinPath(this.currentPath, baseName);
    const ok = await this.openConfirmModal({
      title: this.fileClipboard.mode === 'copy' ? 'Copy Here' : 'Move Here',
      message: `Paste "${baseName}" into this folder?\n\nDestination:\n${dest}`,
      confirmText: this.fileClipboard.mode === 'copy' ? 'Copy' : 'Move',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    if (this.fileClipboard.mode === 'copy') {
      const res = window.electronAPI.copyItem
        ? await window.electronAPI.copyItem(src, dest)
        : await this.fallbackCopyFile(src, dest);
      if (!res.success) {
        await this.openAlertModal({ title: 'Files', message: `Paste failed: ${res.error || 'Unknown error'}` });
        return;
      }
      this.showNotification('Files', `Copied ${baseName}`, 'divine');
      this.loadFiles(this.currentPath);
      return;
    }

    // cut
    const moved = await window.electronAPI.rename(src, dest);
    if (!moved.success) {
      // fallback: copy+delete
      const copied = window.electronAPI.copyItem
        ? await window.electronAPI.copyItem(src, dest)
        : await this.fallbackCopyFile(src, dest);
      if (!copied.success) {
        await this.openAlertModal({ title: 'Files', message: `Move failed: ${moved.error || copied.error || 'Unknown error'}` });
        return;
      }
      const deleted = await window.electronAPI.deleteItem(src);
      if (!deleted.success) {
        this.showNotification('Files', `Moved ${baseName}, but failed to remove source`, 'warning');
      }
    }

    this.fileClipboard = null;
    this.showNotification('Files', `Moved ${baseName}`, 'divine');
    this.loadFiles(this.currentPath);
  }

  private async fallbackCopyFile(src: string, dest: string): Promise<{ success: boolean; error?: string }> {
    if (!window.electronAPI) return { success: false, error: 'Not running in Electron' };
    const read = await window.electronAPI.readFile(src);
    if (!read.success || typeof read.content !== 'string') return { success: false, error: read.error || 'Read failed' };
    const write = await window.electronAPI.writeFile(dest, read.content);
    if (!write.success) return { success: false, error: write.error || 'Write failed' };
    return { success: true };
  }

  private handleTerminalCommand(command: string) {
    const output = document.getElementById('terminal-output');
    if (!output) return;

    const cmd = command.trim().toLowerCase();
    let response = '';

    switch (cmd) {
      case 'help':
        response = `
<div class="terminal-line system">Available Commands:</div>
<div class="terminal-line">  help     - Show this message</div>
<div class="terminal-line">  clear    - Clear terminal</div>
<div class="terminal-line">  dir      - List files</div>
<div class="terminal-line">  god      - Receive Word of God</div>
<div class="terminal-line">  hymn     - Play a hymn</div>
<div class="terminal-line">  time     - Show current time</div>
<div class="terminal-line">  about    - About TempleOS</div>`;
        break;
      case 'clear':
        output.innerHTML = '';
        return;
      case 'dir':
        response = `
<div class="terminal-line system">Directory of C:/</div>
<div class="terminal-line">  [DIR]  Home</div>
<div class="terminal-line">  [DIR]  Programs</div>
<div class="terminal-line">  [DIR]  Demos</div>
<div class="terminal-line">        README.TXT     1,234 bytes</div>
<div class="terminal-line">        HYMN.HC        2,567 bytes</div>`;
        break;
      case 'god':
        const verse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
        response = `
<div class="terminal-line gold">"${verse.text}"</div>
<div class="terminal-line system">    â€” ${verse.ref}</div>`;
        break;
      case 'hymn':
        response = `<div class="terminal-line success">â™ª Opening Divine Hymns... â™ª</div>`;
        // Open hymn player and play random hymn
        setTimeout(() => {
          this.openApp('hymns');
          setTimeout(() => {
            this.playHymn(Math.floor(Math.random() * this.hymnList.length));
          }, 200);
        }, 100);
        break;
      case 'time':
        response = `<div class="terminal-line">${new Date().toLocaleString()}</div>`;
        break;
      case 'about':
        response = `
<div class="terminal-line gold">â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—</div>
<div class="terminal-line gold">â•‘          T E M P L E   O S             â•‘</div>
<div class="terminal-line gold">â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£</div>
<div class="terminal-line">â•‘  God's Operating System                â•‘</div>
<div class="terminal-line">â•‘  Written in HolyC - God's Language     â•‘</div>
<div class="terminal-line">â•‘  In memory of Terry A. Davis           â•‘</div>
<div class="terminal-line gold">â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£</div>
<div class="terminal-line system">â•‘  Remake by Giangero Studio             â•‘</div>
<div class="terminal-line gold">â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•</div>`;
        break;
      default:
        if (cmd) {
          response = `<div class="terminal-line error">Unknown command: ${command}</div>`;
        }
    }

    output.innerHTML += `<div class="terminal-line">C:/&gt; ${command}</div>${response}`;
    output.scrollTop = output.scrollHeight;
  }

  private refreshWordOfGod() {
    const wogWindow = this.windows.find(w => w.id.startsWith('word-of-god'));
    if (wogWindow) {
      wogWindow.content = this.getWordOfGodContent();
      this.render();
    }
  }

  private updateClock() {
    const clockText = document.getElementById('clock-text');
    if (clockText) {
      const now = new Date();
      clockText.textContent = now.toLocaleTimeString();
    }
  }


}

// Initialize TempleOS
(window as any).templeOS = new TempleOS();
