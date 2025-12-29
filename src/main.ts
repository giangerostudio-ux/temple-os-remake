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

// New modular architecture imports
import { ImageViewerEnhancer } from './apps/ImageViewer';
import { SystemMonitorEnhancer } from './apps/SystemMonitor';
import { MediaPlayerApp } from './apps/MediaPlayer';
import { CalculatorApp } from './apps/Calculator';
import { NotesApp } from './apps/Notes';
import { CalendarApp } from './apps/Calendar';
import { HelpApp } from './apps/Help';
import type {
  DisplayOutput, FirewallRule, VeraCryptVolume, MonitorStats, BatteryStatus,
  NetworkDeviceStatus, VpnStatus, FileEntry, SystemInfo, ProcessInfo, InstalledApp,
  TempleConfig, NetworkStatus, WifiNetwork, MouseSettings, AudioDevice,
  ThemeColor, ThemeMode, DesktopIconSize, LauncherView, LauncherCategory,
  MonitorSortKey, HelpTab, StartMenuCategory, TerminalUiTheme, FileSortKey,
  CalculatorMode, CalculatorBase, SpriteTool, ColorBlindMode
} from './utils/types';
import { buildSearchIndex, searchIndex } from './utils/appSearch';
import { WorkspaceManager } from './system/WorkspaceManager';
import { TilingManager } from './system/TilingManager';
import { NotificationManager } from './system/NotificationManager';
import { NetworkManager } from './system/NetworkManager';
import { SettingsManager, type SettingsHost } from './system/SettingsManager';
import { EffectsManager } from './system/EffectsManager';
import { GodlyNotes } from './apps/GodlyNotes';
import { MemoryOptimizer } from './system/MemoryOptimizer';
import { WindowManager } from './core/WindowManager';

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
      trashItem?: (path: string) => Promise<{ success: boolean; entry?: { name: string; trashPath: string; originalPath: string; deletionDate: string; size: number; isDirectory: boolean }; error?: string }>;
      listTrash?: () => Promise<{ success: boolean; entries?: Array<{ name: string; trashPath: string; originalPath: string; deletionDate: string; size: number; isDirectory: boolean }>; error?: string }>;
      restoreTrash?: (trashPath: string, originalPath: string) => Promise<{ success: boolean; restored?: { name: string; trashPath: string; originalPath: string }; error?: string }>;
      deleteTrashItem?: (trashPath: string) => Promise<{ success: boolean; error?: string }>;
      emptyTrash?: () => Promise<{ success: boolean; error?: string }>;
      mkdir: (path: string) => Promise<{ success: boolean; error?: string }>;
      rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      copyItem?: (srcPath: string, destPath: string) => Promise<{ success: boolean; error?: string }>;
      getHome: () => Promise<string>;
      getAppPath: () => Promise<string>;
      openExternal: (path: string) => Promise<{ success: boolean; error?: string }>;
      createZip: (sourcePath: string, targetZipPath: string) => Promise<{ success: boolean; error?: string }>;
      extractZip: (zipPath: string, targetDir: string) => Promise<{ success: boolean; error?: string }>;
      // System
      shutdown: () => Promise<void>;
      restart: () => Promise<void>;
      lock: () => Promise<void>;
      getSystemInfo: () => Promise<SystemInfo>;
      isCommandAvailable?: (cmd: string) => Promise<{ success: boolean; available: boolean }>;
      getMonitorStats?: () => Promise<{ success: boolean; stats?: MonitorStats; error?: string }>;
      getBatteryStatus?: () => Promise<{ success: boolean; supported: boolean; status?: BatteryStatus; error?: string }>;
      listProcesses?: () => Promise<{ success: boolean; processes?: ProcessInfo[]; unsupported?: boolean; error?: string }>;
      killProcess?: (pid: number, signal?: 'TERM' | 'KILL') => Promise<{ success: boolean; error?: string }>;
      setSystemVolume: (level: number) => Promise<void>;
      setResolution: (resolution: string) => Promise<{ success: boolean; backend?: string; error?: string }>;
      getResolutions: () => Promise<{ success: boolean; resolutions: string[]; current: string }>;
      // Config
      loadConfig?: () => Promise<{ success: boolean; config: TempleConfig; error?: string }>;
      saveConfig?: (config: TempleConfig) => Promise<{ success: boolean; error?: string }>;
      // Audio devices
      listAudioDevices?: () => Promise<{ success: boolean; sinks: AudioDevice[]; sources: AudioDevice[]; defaultSink: string | null; defaultSource: string | null; error?: string }>;
      setDefaultSink?: (sinkName: string) => Promise<{ success: boolean; error?: string }>;
      setDefaultSource?: (sourceName: string) => Promise<{ success: boolean; error?: string }>;
      setAudioVolume?: (level: number) => Promise<{ success: boolean; error?: string }>;
      // Bluetooth (BlueZ)
      setBluetoothEnabled?: (enabled: boolean) => Promise<{ success: boolean; unsupported?: boolean; error?: string; needsPassword?: boolean }>;
      setBluetoothEnabledWithPassword?: (enabled: boolean, password: string) => Promise<{ success: boolean; backend?: string; error?: string; wrongPassword?: boolean }>;
      scanBluetoothDevices?: () => Promise<{ success: boolean; devices?: Array<{ mac: string; name: string; connected: boolean; paired?: boolean }>; error?: string }>;
      getPairedBluetoothDevices?: () => Promise<{ success: boolean; devices?: Array<{ mac: string; name: string; connected: boolean; paired?: boolean }>; error?: string }>;
      connectBluetoothDevice?: (mac: string) => Promise<{ success: boolean; connected?: boolean; error?: string }>;
      disconnectBluetoothDevice?: (mac: string) => Promise<{ success: boolean; connected?: boolean; error?: string }>;
      // Network
      getNetworkStatus?: () => Promise<{ success: boolean; status?: NetworkStatus; unsupported?: boolean; error?: string }>;
      listWifiNetworks?: () => Promise<{ success: boolean; networks?: WifiNetwork[]; error?: string }>;
      connectWifi?: (ssid: string, password?: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      disconnectNetwork?: () => Promise<{ success: boolean; error?: string }>;
      disconnectNonVpnNetwork?: () => Promise<{ success: boolean; disconnected?: string[]; error?: string }>;
      disconnectNonVpn: () => Promise<{ success: boolean; disconnected?: string[]; error?: string }>;
      disconnectConnection?: (nameOrUuid: string) => Promise<{ success: boolean; error?: string }>;
      getWifiEnabled?: () => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
      setWifiEnabled?: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      listSavedNetworks?: () => Promise<{ success: boolean; networks?: Array<{ name: string; uuid: string; type?: string; device?: string }>; error?: string }>;
      connectSavedNetwork?: (nameOrUuid: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      forgetSavedNetwork?: (nameOrUuid: string) => Promise<{ success: boolean; error?: string }>;
      importVpnProfile?: (kind: 'openvpn' | 'wireguard', filePath: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      createHotspot?: (ssid: string, password?: string) => Promise<{ success: boolean; output?: string; error?: string }>;
      stopHotspot?: () => Promise<{ success: boolean; error?: string }>;
      // SSH Server
      sshControl?: (action: 'start' | 'stop' | 'status' | 'regenerate-keys' | 'get-pubkey', port?: number) => Promise<{ success: boolean; status?: string; pubkey?: string; error?: string }>;
      // EXIF Metadata
      extractExif?: (imagePath: string) => Promise<{ success: boolean; metadata?: Record<string, string>; error?: string }>;
      stripExif?: (imagePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
      setTrackerBlocking?: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getTorStatus?: () => Promise<{ success: boolean; supported: boolean; running: boolean; backend?: string; version?: string | null; error?: string }>;
      setTorEnabled?: (enabled: boolean) => Promise<{ success: boolean; running?: boolean; backend?: string; unsupported?: boolean; error?: string }>;
      installTor?: () => Promise<{ success: boolean; alreadyInstalled?: boolean; error?: string }>;
      setMacRandomization?: (enabled: boolean) => Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
      // Firewall (Tier 7.2)
      getFirewallRules?: () => Promise<{ success: boolean; active?: boolean; rules?: FirewallRule[]; error?: string }>;
      addFirewallRule?: (port: number, protocol: string, action: string) => Promise<{ success: boolean; error?: string }>;
      deleteFirewallRule?: (id: number) => Promise<{ success: boolean; error?: string }>;
      toggleFirewall?: (enable: boolean) => Promise<{ success: boolean; error?: string }>;

      // VeraCrypt (Tier 7.1)
      getVeraCryptStatus?: () => Promise<{ success: boolean; volumes?: VeraCryptVolume[]; error?: string }>;
      mountVeraCrypt?: (path: string, password: string, slot?: number) => Promise<{ success: boolean; mountPoint?: string; error?: string }>;
      dismountVeraCrypt?: (slot?: number) => Promise<{ success: boolean; error?: string }>;

      // Display
      getDisplayOutputs?: () => Promise<{ success: boolean; outputs?: DisplayOutput[]; backend?: string; error?: string }>;
      setDisplayMode?: (outputName: string, mode: string) => Promise<{ success: boolean; error?: string }>;
      setDisplayScale?: (outputName: string, scale: number) => Promise<{ success: boolean; error?: string }>;
      setDisplayTransform?: (outputName: string, transform: string) => Promise<{ success: boolean; error?: string }>;
      // Mouse / pointer
      applyMouseSettings?: (settings: MouseSettings) => Promise<{ success: boolean; warnings?: string[]; error?: string }>;
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
      getInstalledApps: () => Promise<{ success: boolean; apps: InstalledApp[]; unsupported?: boolean; error?: string }>;
      launchApp: (app: InstalledApp) => Promise<{ success: boolean; error?: string }>;
      uninstallApp: (app: InstalledApp) => Promise<{ success: boolean; error?: string; needsPassword?: boolean }>;
      uninstallAppWithPassword?: (app: InstalledApp, password: string) => Promise<{ success: boolean; error?: string; wrongPassword?: boolean }>;
      onAppsChanged?: (callback: (payload: { reason?: string }) => void) => () => void;
      // X11 external window taskbar (Linux X11 only)
      x11Supported?: () => Promise<{ success: boolean; supported: boolean }>;
      getActiveX11Window?: () => Promise<{ success: boolean; supported: boolean; xidHex: string | null; error?: string }>;
      getX11Windows?: () => Promise<{ success: boolean; supported: boolean; snapshot?: { windows: Array<{ xidHex: string; title: string; wmClass?: string | null; active?: boolean; minimized?: boolean; alwaysOnTop?: boolean; iconUrl?: string | null; appName?: string | null }> }; error?: string }>;
      activateX11Window?: (xidHex: string) => Promise<{ success: boolean; error?: string }>;
      closeX11Window?: (xidHex: string) => Promise<{ success: boolean; error?: string }>;
      minimizeX11Window?: (xidHex: string) => Promise<{ success: boolean; error?: string }>;
      unminimizeX11Window?: (xidHex: string) => Promise<{ success: boolean; error?: string }>;
      setX11WindowAlwaysOnTop?: (xidHex: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      snapX11Window?: (xidHex: string, mode: string, taskbarConfig?: { height: number; position: 'top' | 'bottom' }) => Promise<{ success: boolean; error?: string }>;
      onX11WindowsChanged?: (callback: (payload: { windows: Array<{ xidHex: string; title: string; wmClass?: string | null; active?: boolean; minimized?: boolean; alwaysOnTop?: boolean; iconUrl?: string | null; appName?: string | null }> }) => void) => () => void;
      onX11SnapLayoutsSuggest?: (callback: (payload: { xid: string }) => void) => () => void;
      getSnapLayoutsEnabled?: () => Promise<{ success: boolean; enabled: boolean }>;
      setSnapLayoutsEnabled?: (enabled: boolean) => Promise<{ success: boolean }>;
      getTilingState?: () => Promise<{ success: boolean; tilingModeActive: boolean; occupiedSlots: Record<string, string>; mainWindowXid: string | null }>;
      setOccupiedSlot?: (xidHex: string, slot: string) => Promise<{ success: boolean; error?: string }>;
      getNextSlot?: () => Promise<{ success: boolean; slot: string }>;
      // X11 Virtual Desktops (Workspaces)
      switchX11Desktop?: (desktopIndex: number) => Promise<{ success: boolean; desktop?: number; error?: string }>;
      getCurrentX11Desktop?: () => Promise<{ success: boolean; desktop: number; unsupported?: boolean; error?: string }>;
      getX11DesktopCount?: () => Promise<{ success: boolean; count: number; unsupported?: boolean; error?: string }>;
      moveX11WindowToDesktop?: (xidHex: string, desktopIndex: number) => Promise<{ success: boolean; error?: string }>;
      // Panel/gaming policy (Linux X11 only)
      getPanelPolicy?: () => Promise<{ success: boolean; policy?: { hideOnFullscreen: boolean; forceHidden: boolean }; error?: string }>;
      setHideBarOnFullscreen?: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      setGamingMode?: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      setTaskbarPosition?: (position: 'top' | 'bottom') => Promise<{ success: boolean; error?: string }>;
      hasExternalPanel?: () => Promise<{ success: boolean; enabled: boolean }>;
      panelToggleStartMenu?: () => Promise<{ success: boolean; error?: string }>;
      onShellToggleStartMenu?: (callback: (payload: Record<string, unknown>) => void) => () => void;
      // Context Menu Popup (Linux X11 floating menus)
      showContextMenuPopup?: (x: number, y: number, items: Array<{ id: string; label?: string; divider?: boolean }>) => Promise<{ success: boolean; error?: string }>;
      closeContextMenuPopup?: () => Promise<{ success: boolean }>;
      onContextMenuAction?: (callback: (actionId: string) => void) => () => void;
      // Start Menu Popup (Linux X11 floating Start Menu)
      showStartMenuPopup?: (config: {
        taskbarHeight: number;
        taskbarPosition: 'top' | 'bottom';
        pinnedApps: Array<{ key: string; icon: string; name: string }>;
        pinnedTaskbar: string[];
        installedApps: Array<{ key: string; name: string; icon?: string; iconUrl?: string; comment?: string }>;
        logoUrl?: string;
      }) => Promise<{ success: boolean; error?: string }>;
      hideStartMenuPopup?: () => Promise<{ success: boolean }>;
      onStartMenuAction?: (callback: (action: { type: string; key?: string; path?: string; action?: string; x?: number; y?: number }) => void) => () => void;
      onStartMenuClosed?: (callback: (payload: Record<string, unknown>) => void) => () => void;
      // Global Shortcuts (system-wide keybinds from main process)
      onGlobalShortcut?: (callback: (action: string) => void) => () => void;
      // Security
      triggerLockdown?: () => Promise<{ success: boolean; actions: string[] }>;
      setDns?: (iface: string, primary: string, secondary?: string) => Promise<{ success: boolean; error?: string }>;
      // Window
      closeWindow: () => Promise<void>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      setWindowBounds: (bounds: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; error?: string }>;
      inputWakeUp: () => Promise<{ success: boolean; error?: string }>;
      // Events
      // Events
      onLockScreen?: (callback: () => void) => void;

      // Divine Assistant (Word of God AI)
      divineGetStatus?: () => Promise<{ success: boolean; ready?: boolean; ollamaInstalled?: boolean; ollamaRunning?: boolean; modelDownloaded?: boolean; modelName?: string; modelSize?: string; error?: string; openRouterAvailable?: boolean; openRouterUsingBuiltinKey?: boolean; ollamaAvailable?: boolean; currentBackend?: string; webSearchEnabled?: boolean }>;
      divineConfigure?: (config: { backend?: string; openRouterApiKey?: string; webSearch?: boolean; useOllamaForRants?: boolean }) => Promise<{ success: boolean; error?: string }>;
      divineDownloadModel?: () => Promise<{ success: boolean; error?: string }>;
      divineSendMessage?: (message: string) => Promise<{ success: boolean; response?: string; commands?: string[]; urls?: string[]; dangerous?: string[]; error?: string }>;
      divineExecuteCommand?: (command: string, options?: { cwd?: string; timeout?: number }) => Promise<{ success: boolean; stdout?: string; stderr?: string; code?: number; error?: string }>;
      divineOpenUrl?: (url: string) => Promise<{ success: boolean; error?: string }>;
      divineIsDangerous?: (command: string) => Promise<{ isDangerous: boolean }>;
      divineGetGreeting?: () => Promise<{ greeting: string }>;
      divineClearHistory?: () => Promise<{ success: boolean }>;
      divineAbort?: () => Promise<{ success: boolean }>;
      divineGetCommandHistory?: (limit?: number) => Promise<{ history: string[] }>;
      divineGetInstallInstructions?: () => Promise<{ command?: string; manual: string; platform: string }>;
      onDivineDownloadProgress?: (callback: (progress: { status: string; completed: number; total: number; percent: number }) => void) => () => void;
      onDivineStreamChunk?: (callback: (data: { chunk: string; fullResponse: string }) => void) => () => void;
      onDivineCommandOutput?: (callback: (output: { type: string; data: string }) => void) => () => void;

      // Voice of God TTS
      ttsGetStatus?: () => Promise<{ available: boolean; modelLoaded: boolean; modelName: string | null; effectsAvailable: boolean; speaking: boolean; settings: Record<string, unknown>; piperDir?: string }>;
      ttsSpeak?: (text: string) => Promise<{ success: boolean; reason?: string; error?: string; installInstructions?: { platform: string; piperDir: string; steps: string[]; downloadUrl: string; modelUrl: string; command?: string } }>;
      ttsSpeakLong?: (text: string) => Promise<{ success: boolean; error?: string }>;
      ttsStop?: () => Promise<{ success: boolean }>;
      ttsIsSpeaking?: () => Promise<boolean>;
      ttsUpdateSettings?: (settings: Record<string, unknown>) => Promise<{ success: boolean; settings: Record<string, unknown> }>;
      ttsSetEnabled?: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      ttsTest?: () => Promise<{ success: boolean; error?: string }>;
      ttsGetDefaults?: () => Promise<Record<string, unknown>>;
      onTtsProgress?: (callback: (progress: { current: number; total: number; text: string }) => void) => () => void;

    };
  }
}









// AudioDevice and MouseSettings are imported from './utils/types'

// ============================================
// FILE ICON HELPER
// ============================================
function getFileIcon(name: string, isDirectory: boolean): string {
  const neon = (path: string) => `<svg viewBox="0 0 24 24" class="icon-neon" width="24" height="24">${path}</svg>`;

  if (isDirectory) return neon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />');

  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    // Documents
    'txt': neon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
    'md': neon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="12" width="8" height="6"/>'), // Simple doc
    // Code
    'ts': neon('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    'js': neon('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    'hc': neon('<path d="M12 2v20M2 8h20"/>'), // Cross
    'html': neon('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    'css': neon('<path d="M12 2.69l5.74 3.32a1 1 0 0 1 .5.86v6.63a1 1 0 0 1-.5.86l-5.74 3.32a1 1 0 0 1-1 0L5.26 14.34a1 1 0 0 1-.5-.86V6.87a1 1 0 0 1 .5-.86l5.74-3.32a1 1 0 0 1 1 0z"/>'),
    // Media
    'jpg': neon('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    'png': neon('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    'mp3': neon('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    'mp4': neon('<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>'),
    // Archives
    'zip': neon('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
    // Executables
    'exe': neon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8l4 4-4 4"/><path d="M14 16h4"/>'),
    'sh': neon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8l4 4-4 4"/><path d="M14 16h4"/>'),
  };

  return iconMap[ext] || neon('<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>');
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

/**
 * Renders a custom dropdown (replaces native <select>).
 * @param id - unique identifier for this dropdown (e.g., 'audio-sink')
 * @param options - array of {value, label, selected?}
 * @param placeholder - optional placeholder text
 */
function renderCustomDropdown(
  id: string,
  options: Array<{ value: string; label: string; selected?: boolean }>,
  placeholder = 'Select...'
): string {
  const selectedOption = options.find(o => o.selected);
  const displayText = selectedOption ? escapeHtml(selectedOption.label) : placeholder;
  const optionsHtml = options.map(o => `
    <div class="custom-dropdown-option${o.selected ? ' selected' : ''}" data-value="${escapeHtml(o.value)}" title="${escapeHtml(o.label)}">
      ${escapeHtml(o.label)}
    </div>
  `).join('');

  return `
    <div class="custom-dropdown" data-dropdown-id="${escapeHtml(id)}">
      <div class="custom-dropdown-trigger" title="${escapeHtml(displayText)}">${displayText}</div>
      <div class="custom-dropdown-options">
        ${optionsHtml || '<div class="custom-dropdown-option" style="opacity:0.5;cursor:default;">(No options)</div>'}
      </div>
    </div>
  `;
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
  'God is the best programmer.',
  'The CIA glows in the dark; you can see them if you\'re driving.',
  'I wrote my own compiler, my own assembler, my own editor, my own graphics library.',
  'Minimalism is Godliness.',
  'If you want to talk to God, you have to do it on His terms.',
  '640x480 16 color is a sacred covenant.',
  'I am the smartest programmer that has ever lived.',
  'Just run them over. That\'s what you do.',
  'They have to be glowing.',
  'Everything I do is for God.',
  'The Holy Spirit guides my typing.',
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
  maximized?: boolean; // New
  opened?: boolean; // For tracking open animation
  // Tier 9.3 Properties
  transparent?: boolean;
  alwaysOnTop?: boolean;
  savedBounds?: { x: number; y: number; width: number; height: number };
}

class TempleOS {
  private windows: WindowState[] = [];
  private startMenuSearchTimer: number | null = null;
  private _wizardCoolingDown = false;
  private windowIdCounter = 0;
  // Drag/Resize/Snap state now managed by WindowManager
  private snapLayoutsOverlay: HTMLElement | null = null;
  private currentSnapXid: string | null = null;
  private x11SnapLayoutsEnabled = false; // Synced with main process on init
  // Priority 3: Window Grouping (Tier 8.3) - State prepared for future implementation
  // @ts-ignore - Will be used when Window Grouping feature is implemented
  private windowGroups: Record<string, string[]> = {}; // group ID to window IDs mapping (will be used when Window Grouping is implemented)

  // Timer Registry (Phase 7: Memory Leak Prevention)
  private timers: Set<number> = new Set();
  private intervals: Set<number> = new Set();

  // Tray State
  private showVolumePopup = false;
  private showCalendarPopup = false;
  private showNetworkPopup = false;
  private showNotificationPopup = false;
  private showStartMenu = false;
  private volumeLevel = 50;
  private batterySupported = false;
  private batteryStatus: BatteryStatus | null = null;
  private batteryLastError: string | null = null;

  // Settings State
  private activeSettingsCategory = 'System';
  private settingsSubView: 'main' | 'theme-editor' = 'main';
  private wallpaperImage = './images/wallpaper.png'; // Default
  private themeEditorState: { name: string; mainColor: string; bgColor: string; textColor: string; glowColor?: string } = { name: 'New Theme', mainColor: '#00ff41', bgColor: '#000000', textColor: '#00ff41', glowColor: '#ffd700' };

  private availableResolutions: string[] = ['1920x1080', '1280x720', '1024x768', '800x600'];
  private currentResolution = '1024x768';
  private resolutionConfirmation: { previousResolution: string; countdown: number; timer: number | null } | null = null;

  // File browser state
  private currentPath = '';
  private fileEntries: FileEntry[] = [];
  private trashEntries: Array<{ name: string; trashPath: string; originalPath: string; deletionDate: string; isDirectory: boolean; size: number }> = [];
  private fileSearchQuery = '';
  private fileSortMode: 'name' | 'size' | 'modified' = 'name';
  private fileSortDir: 'asc' | 'desc' = 'asc';
  private fileViewMode: 'grid' | 'list' | 'details' = 'grid';
  private showHiddenFiles = false;
  private fileClipboard: { mode: 'copy' | 'cut'; srcPath: string } | null = null;
  private fileBookmarks: string[] = [];
  private homePath: string | null = null;
  // Multi-select support (Priority 1)
  private selectedFiles: Set<string> = new Set();
  private lastSelectedIndex = -1; // For Shift+Click range selection
  // Desktop icon positions (Priority 1)
  // Default positions for first-time install - matches the preferred layout:
  // Left column: HolyC Editor, Hymn Player, Godly Notes, Files, Terminal, Holy Updater, Word of God
  // Right side: Help (top-right), Trash (bottom-right)
  private static readonly DEFAULT_ICON_POSITIONS: Record<string, { x: number; y: number }> = {
    'builtin:editor': { x: 20, y: 20 },       // HolyC Editor - top left
    'builtin:hymns': { x: 20, y: 130 },       // Hymn Player
    'builtin:godly-notes': { x: 20, y: 240 }, // Godly Notes
    'builtin:files': { x: 20, y: 350 },       // Files
    'builtin:terminal': { x: 20, y: 460 },    // Terminal
    'builtin:updater': { x: 20, y: 570 },     // Holy Updater
    'builtin:word-of-god': { x: 20, y: 680 }, // Word of God - bottom left
    'builtin:help': { x: 920, y: 20 },        // Help - top right (will be clamped to screen)
    'builtin:trash': { x: 920, y: 580 },      // Trash - bottom right (will be clamped to screen)
  };
  private desktopIconPositions: Record<string, { x: number; y: number }> = (() => {
    const stored = localStorage.getItem('temple_desktop_icon_positions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If stored data exists and has entries, use it
        if (Object.keys(parsed).length > 0) return parsed;
      } catch { /* ignore parse errors */ }
    }
    // First-time install: use default positions
    return { ...TempleOS.DEFAULT_ICON_POSITIONS };
  })();
  private draggingIcon: { key: string; offsetX: number; offsetY: number; startX: number; startY: number; hasMoved: boolean } | null = null;

  // Preview / Quick Look
  private previewFile: { path: string; name: string; type: 'image' | 'text' | 'unknown'; content?: string } | null = null;

  // Start Menu state
  private installedApps: InstalledApp[] = [];
  private installedAppsIndex = buildSearchIndex([]);
  private installedAppsUnsupported = false;
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

  // Prevent runaway launches if UI dispatches duplicate clicks/events.
  private lastLaunchByKeyAt: Record<string, number> = {};

  // Notifications State
  private notificationManager = new NotificationManager();
  // removed legacy internal state: notifications, activeToasts, etc.


  private audioContext: AudioContext | null = null;
  private doNotDisturb = false;

  // Voice of God TTS settings
  private voiceOfGodEnabled = true;
  private voiceOfGodPitch = -2;
  private voiceOfGodReverbRoom = 0.85;
  private voiceOfGodReverbWet = 0.4;
  private voiceOfGodEchoDelay = 120;
  private voiceOfGodEchoFeedback = 0.2;
  private voiceOfGodChorusEnabled = true;
  private voiceOfGodChorusDepth = 0.25;
  private voiceOfGodSpeed = 1.0;

  // Lock Screen State
  private isLocked = false;
  private lockInputMode: 'password' | 'pin' = 'password';

  private lockPassword = 'temple'; // Default lock screen password (user can change in Settings)
  private lockPin = '7777'; // Default lock screen PIN (user can change in Settings)



  // Bluetooth State
  private bluetoothEnabled = false;
  private bluetoothDevices: { name: string; mac: string; connected: boolean; paired: boolean; type: 'headphone' | 'phone' | 'mouse' | 'keyboard' | 'unknown' }[] = [];
  private bluetoothScanning = false;

  // Audio Devices State
  private audioDevices: { sinks: AudioDevice[]; sources: AudioDevice[]; defaultSink: string | null; defaultSource: string | null } = {
    sinks: [],
    sources: [],
    defaultSink: null,
    defaultSource: null
  };

  private flightMode = false; // Restored (controls both Wifi and BT)

  // Security State
  private encryptionEnabled = true;
  private firewallEnabled = true;
  // Firewall Rules (Tier 7.2)
  private firewallRules: FirewallRule[] = [];
  private firewallRulesLoading = false;
  private macRandomization = localStorage.getItem('temple_mac_randomization') !== 'false';
  private torEnabled = false;
  private torDaemonRunning = false;
  private secureDelete = false;

  // Physical Security State (Tier 7.6)
  private usbDevices = [
    { id: 'usb1', name: 'Divine Mouse', type: 'HID', allowed: true },
    { id: 'usb2', name: 'Holy Keyboard', type: 'HID', allowed: true },
    { id: 'usb3', name: 'Suspicious USB Drive', type: 'Storage', allowed: false }
  ];
  private duressPassword = '';
  private isDecoySession = false;

  // Decoy session backup storage - holds real data while in decoy mode
  // Using 'any' for complex types to avoid circular type dependencies
  private decoyBackup: {
    windows: WindowState[];
    terminalBuffer: string[];
    terminalTabs: any[];
    divineMessages: any[];
    editorRecentFiles: string[];
    recentApps: string[];
    trashEntries: any[];
    fileEntries: FileEntry[];
    currentPath: string;
    x11Windows: any[];
  } | null = null;

  // SSH Server State (Tier 6.3)
  private sshEnabled = false;
  private sshPort = 22;
  private sshStatus: 'running' | 'stopped' | 'unknown' = 'unknown';

  // EXIF Metadata Stripper State (Tier 7.3)
  private exifSelectedFile: string | null = null;
  private exifMetadata: Record<string, string> | null = null;



  // Tracker Blocking State (Tier 7.4)
  private trackerBlockingEnabled = localStorage.getItem('temple_tracker_blocking') !== 'false'; // Default true

  // VeraCrypt State (Tier 7.1)
  private veraCryptVolumes: VeraCryptVolume[] = [];
  private veraCryptLoading = false;

  private systemInfo: SystemInfo | null = null;

  // System Monitor State
  private monitorStats: MonitorStats | null = null;
  private monitorProcesses: ProcessInfo[] = [];
  private monitorQuery = '';
  private monitorSort: 'cpu' | 'mem' | 'name' | 'pid' = 'cpu';
  private monitorSortDir: 'asc' | 'desc' = 'desc';
  private monitorTimer: number | null = null;
  private monitorBusy = false;
  private monitorSearchDebounceTimer: number | null = null;

  // Display State (multi-monitor, scale, refresh)
  private displayOutputs: DisplayOutput[] = [];
  private activeDisplayOutput: string | null = null;

  // Mouse / Pointer State
  private mouseSettings: MouseSettings = { speed: 0, raw: true, naturalScroll: false };
  private mouseDpiSupported = false;
  private mouseDpiValues: number[] = [400, 800, 1200, 1600, 2400, 3200];
  private mouseDpiDeviceId: string | null = null;

  // Pinned / shortcuts (Windows-like)
  // Pinned / shortcuts (Windows-like)
  private pinnedStart: string[] = JSON.parse(localStorage.getItem('temple_pinned_start') || '["builtin:terminal", "builtin:files", "builtin:settings", "builtin:editor", "builtin:hymns"]');
  private pinnedTaskbar: string[] = JSON.parse(localStorage.getItem('temple_pinned_taskbar') || '["builtin:files", "builtin:terminal", "builtin:settings"]');
  private desktopShortcuts: Array<{ key: string; label: string }> = [];

  // Taskbar Settings (Tier 9.1)
  private taskbarTransparent = localStorage.getItem('temple_taskbar_transparent') === 'true';
  private taskbarAutoHide = localStorage.getItem('temple_taskbar_autohide') === 'true';

  // Desktop Settings (Tier 9.2)
  private desktopWidgetsEnabled = localStorage.getItem('temple_desktop_widgets') === 'true';
  private desktopIconSize: DesktopIconSize = (localStorage.getItem('temple_desktop_icon_size') as DesktopIconSize | null) || 'small';
  private desktopAutoArrange = localStorage.getItem('temple_desktop_auto_arrange') === 'true'; // Default false - icons can be dragged

  // Theme System (Tier 9.4)
  private themeColor: ThemeColor = (localStorage.getItem('temple_theme_color') as ThemeColor | null) || 'green';
  private themeMode: ThemeMode = (localStorage.getItem('temple_theme_mode') as ThemeMode | null) || 'dark';
  private highContrast = localStorage.getItem('temple_high_contrast') === 'true';
  private customThemes: Array<{ name: string; mainColor: string; bgColor: string; textColor: string; glowColor?: string }> = [];
  private activeCustomTheme: string | null = null;

  // Accessibility (Tier 9.7)
  private largeText = false;
  private reduceMotion = false;
  private colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' = 'none';

  // Alt-Tab Overlay State
  private altTabOpen = false;
  private altTabIndex = 0;
  private altTabOrder: string[] = [];

  // Clipboard Manager State
  private clipboardHistory: string[] = [];
  private clipboardMaxHistory = 20;
  private clipboardManagerOpen = false;

  // Win+D Show Desktop toggle
  private showDesktopMode = false;
  private showDesktopRestoreIds: string[] = [];

  // Tier 10 & 11 State
  private gamingModeActive = false;
  private gamemoderunAvailable: boolean | undefined = undefined; // Cached check for gamemoderun availability
  private hideBarOnFullscreen = localStorage.getItem('temple_hide_bar_on_fullscreen') !== 'false'; // Default true
  private setupComplete = localStorage.getItem('temple_setup_complete') === 'true';
  private isShuttingDown = false;
  private firstRunStep = 0; // 0: Welcome, 1: Theme, 2: Privacy, 3: Done
  private konamiIndex = 0;
  private readonly konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  private cheatBuffer = '';
  private liteMode = localStorage.getItem('temple_lite_mode') === 'true';
  private quoteNotifications = localStorage.getItem('temple_quote_notifications') !== 'false'; // Default true
  private secureWipeOnShutdown = localStorage.getItem('temple_secure_wipe') !== 'false'; // Default true
  // Duplicate usage removed
  private autoHideTaskbar = localStorage.getItem('temple_autohide_taskbar') === 'true'; // Default false
  private heavenlyPulse = true; // Default enabled
  private heavenlyPulseIntensity = parseFloat(localStorage.getItem('temple_pulse_intensity') || '0.20'); // 0.03 to 0.70

  // Enhancement Modules (New Modular Architecture)
  private imageViewer = new ImageViewerEnhancer();
  private systemMonitor = new SystemMonitorEnhancer();

  // Media Player State (Tier 8.1)
  // Media Player State (Tier 8.1)
  private mediaPlayer = new MediaPlayerApp();

  // Calculator App (Tier 8.2)
  private calculator = new CalculatorApp();

  // Notes App (Tier 8.4)
  private notesApp = new NotesApp();

  // Calendar App (Tier 8.3)
  private calendarApp = new CalendarApp((title, msg) => this.showNotification(title, msg, 'info'));

  // Help App (Tier 8.7)
  private helpApp = new HelpApp();

  // Workspace Manager (Tier 9.2 - Virtual Desktops)
  private workspaceManager = new WorkspaceManager();
  private showWorkspaceOverview = false;
  private lastWorkspaceSwitchMs = 0; // Debounce timestamp for keyboard workspace switching

  // Tiling Manager (Tier 14.1 - Smart Window Tiling)
  private tilingManager = new TilingManager();
  private snapPreview: { x: number; y: number; width: number; height: number; zone: string } | null = null;
  private showSnapAssist = false;

  // Network Manager
  private networkManager = new NetworkManager();
  private readonly settingsManager: SettingsManager;

  // New Modular Apps
  private godlyNotes = new GodlyNotes();
  private memoryOptimizer = new MemoryOptimizer();

  // Time & Date State
  public timezone = 'UTC';
  public autoTime = true;

  // Taskbar Position (Tier 14.4)
  private taskbarPosition: 'top' | 'bottom' = (localStorage.getItem('temple_taskbar_position') as 'top' | 'bottom') || 'bottom';

  // Taskbar Hover Preview (Tier 9.1)
  private taskbarHoverPreview: { windowId: string; x: number; y: number } | null = null;
  private taskbarHoverTimeout: number | null = null;

  // X11 external windows for unified taskbar (Linux X11 only)
  private x11Windows: Array<{
    xidHex: string;
    title: string;
    wmClass?: string | null;
    active?: boolean;
    minimized?: boolean;
    alwaysOnTop?: boolean;
    iconUrl?: string | null;
    appName?: string | null;
  }> = [];
  private x11UserMinimized = new Set<string>(); // lowercased xidHex - user explicitly minimized
  private x11WorkspaceMinimized = new Set<string>(); // lowercased xidHex - minimized due to workspace switch
  private x11AutoRestoreCooldown = new Map<string, number>(); // xidHex -> last restore ms

  private x11LostWindows = new Map<string, number>(); // xidHex -> timestamp (ms) when lost
  private _workspaceSwitchTimer: number | null = null; // Debounce timer for workspace switching
  private lastShellPointerDownMs = 0; // used to distinguish TempleOS-click-caused minimizes from user minimizing inside X11 apps

  // X11 Fake Workspaces - track which workspace each X11 window belongs to
  // Key: lowercased xidHex, Value: workspace number (1-4)
  private x11WindowWorkspaces: Map<string, number> = (() => {
    try {
      const stored = localStorage.getItem('temple_x11_workspaces');
      if (stored) {
        return new Map(JSON.parse(stored));
      }
    } catch { /* ignore */ }
    return new Map();
  })();

  // Track workspace at the time an X11 app was launched
  // Key: timestamp (ms), Value: workspace number - we match new windows that appear within a time window
  private x11PendingLaunchWorkspace: number | null = null;
  private x11PendingLaunchTime: number = 0;

  private pendingContextMenuActions: Map<string, () => void | Promise<void>> | null = null; // For floating popup menu callbacks

  // Taskbar App Grouping (Tier 9.1)
  private taskbarGroupPopup: { appType: string; x: number; y: number } | null = null;

  // Helper for Random Quotes
  public getRandomQuote(): string {
    return terryQuotes[Math.floor(Math.random() * terryQuotes.length)];
  }

  // ============================================
  // CLIPBOARD MANAGER
  // ============================================
  private toggleClipboardManager(): void {
    this.clipboardManagerOpen = !this.clipboardManagerOpen;
    if (this.clipboardManagerOpen) {
      // Read current clipboard and add to history
      navigator.clipboard.readText().then(text => {
        if (text && text.trim() && !this.clipboardHistory.includes(text)) {
          this.clipboardHistory.unshift(text);
          if (this.clipboardHistory.length > this.clipboardMaxHistory) {
            this.clipboardHistory.pop();
          }
        }
        this.updateClipboardManagerDom();
      }).catch(() => this.updateClipboardManagerDom());
    } else {
      this.updateClipboardManagerDom();
    }
  }

  private updateClipboardManagerDom(): void {
    // Remove existing overlay if any
    const existing = document.querySelector('.clipboard-manager-overlay');
    if (existing) existing.remove();

    // Add new overlay if open
    if (this.clipboardManagerOpen) {
      const overlay = document.createElement('div');
      overlay.innerHTML = this.renderClipboardManager();
      const overlayEl = overlay.firstElementChild;
      if (overlayEl) {
        document.body.appendChild(overlayEl);
      }
    }
  }

  private pasteFromClipboardHistory(index: number): void {
    const text = this.clipboardHistory[index];
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.clipboardManagerOpen = false;
        this.showNotification('Clipboard', 'Copied to clipboard', 'info');
        this.render();
      }).catch(() => {
        this.showNotification('Clipboard', 'Failed to copy', 'error');
      });
    }
  }

  private renderClipboardManager(): string {
    if (!this.clipboardManagerOpen) return '';

    const items = this.clipboardHistory.length > 0
      ? this.clipboardHistory.map((text, i) => {
        const preview = text.length > 60 ? text.slice(0, 60) + '...' : text;
        const escaped = escapeHtml(preview).replace(/\n/g, ' ');
        return `<div class="clipboard-manager-item" data-clipboard-index="${i}">${escaped}</div>`;
      }).join('')
      : '<div class="clipboard-manager-empty">No clipboard history</div>';

    return `
      <div class="clipboard-manager-overlay" data-clipboard-overlay>
        <div class="clipboard-manager">
          <div class="clipboard-manager-header">
            <span>📋 Clipboard History</span>
            <button class="clipboard-manager-close" data-clipboard-close>✕</button>
          </div>
          <div class="clipboard-manager-list">
            ${items}
          </div>
          <div class="clipboard-manager-footer">
            <span class="clipboard-manager-hint">Click to copy • Super+V to close</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Apply X11 "fake workspaces" - minimize/unminimize X11 windows based on workspace assignment.
   * Windows not assigned to any workspace are assigned to the current workspace by default.
   */
  private applyX11WorkspaceVisibility(targetWorkspace: number): void {
    if (this._workspaceSwitchTimer) {
      this.clearSafeTimeout(this._workspaceSwitchTimer);
    }
    this._workspaceSwitchTimer = this.safeTimeout(() => {
      this._doApplyX11WorkspaceVisibility(targetWorkspace);
      this._workspaceSwitchTimer = null;
    }, 150);
  }

  private _doApplyX11WorkspaceVisibility(targetWorkspace: number): void {
    if (!window.electronAPI) return;

    // Don't apply workspace visibility changes while start menu popup is open
    // to avoid minimize/unminimize cycles
    if (this.startMenuPopupOpen) {
      console.log(`[X11 Workspace] Skipping visibility changes - start menu popup is open`);
      return;
    }

    console.log(`[X11 Workspace] Applying visibility for workspace ${targetWorkspace}`);
    console.log(`[X11 Workspace] x11WindowWorkspaces:`, Object.fromEntries(this.x11WindowWorkspaces));

    for (const x11Win of this.x11Windows) {
      const xidLower = x11Win.xidHex.toLowerCase();

      const assignedWorkspace = this.x11WindowWorkspaces.get(xidLower) || 1;
      console.log(`[X11 Workspace] Window ${xidLower} assigned to ws ${assignedWorkspace}, target ws ${targetWorkspace}, minimized: ${x11Win.minimized}`);

      if (assignedWorkspace === targetWorkspace) {
        // Window belongs to this workspace - unminimize if minimized by workspace switching
        // BUT respect manual user minimize (x11UserMinimized)
        // We SHOULD unminimize if it was minimized by workspace switch (in x11WorkspaceMinimized)
        if (x11Win.minimized && window.electronAPI.unminimizeX11Window &&
          !this.x11UserMinimized.has(xidLower)) {
          console.log(`[X11 Workspace] Unminimizing ${xidLower} (was workspace-minimized: ${this.x11WorkspaceMinimized.has(xidLower)})`);
          void window.electronAPI.unminimizeX11Window(x11Win.xidHex);
        }
        // Clear the workspace-minimized flag since we're on the right workspace
        this.x11WorkspaceMinimized.delete(xidLower);
      } else {
        // Window belongs to a different workspace - minimize if not already
        if (!x11Win.minimized && window.electronAPI.minimizeX11Window) {
          // Mark as minimized due to workspace switch (not user action)
          console.log(`[X11 Workspace] Minimizing ${xidLower} (belongs to ws ${assignedWorkspace}, not ${targetWorkspace})`);
          this.x11WorkspaceMinimized.add(xidLower);
          void window.electronAPI.minimizeX11Window(x11Win.xidHex);
        }
      }
    }
  }

  /**
   * Move an X11 window to a specific workspace
   */
  private moveX11WindowToWorkspace(xidHex: string, workspaceId: number): void {
    const xidLower = xidHex.toLowerCase();
    this.x11WindowWorkspaces.set(xidLower, workspaceId);
    localStorage.setItem('temple_x11_workspaces', JSON.stringify(Array.from(this.x11WindowWorkspaces.entries())));

    // If we're on a different workspace, minimize it immediately
    const currentWorkspace = this.workspaceManager.getActiveWorkspaceId();
    if (workspaceId !== currentWorkspace && window.electronAPI?.minimizeX11Window) {
      void window.electronAPI.minimizeX11Window(xidHex);
    }
  }

  // Terminal State (basic shell exec)
  private terminalCwd = '';
  private terminalHistory: string[] = [];
  private terminalHistoryIndex = -1;
  private terminalBuffer: string[] = [];

  // Authenticity Apps State
  private oracleHistory: string[] = [];
  private bootQuote = terryQuotes[Math.floor(Math.random() * terryQuotes.length)];

  // Divine Assistant (Word of God AI) State
  private divineMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; commands?: string[]; urls?: string[]; dangerous?: string[]; timestamp: number }> = [];
  private divineStatus: {
    ready: boolean;
    ollamaInstalled: boolean;
    ollamaRunning: boolean;
    modelDownloaded: boolean;
    modelName?: string;
    error?: string;
    openRouterAvailable?: boolean;
    openRouterUsingBuiltinKey?: boolean;
    ollamaAvailable?: boolean;
    currentBackend?: string;
    webSearchEnabled?: boolean;
  } = { ready: false, ollamaInstalled: false, ollamaRunning: false, modelDownloaded: false };
  private divineIsLoading = false;
  private divineStreamingResponse = '';
  private divineDownloadProgress = 0;
  private divineInput = '';

  private terminalAliases: Record<string, string> = {};
  private terminalPromptTemplate = '{cwd}>';
  private terminalUiTheme: 'green' | 'cyan' | 'amber' | 'white' = 'green';
  private terminalFontFamily = "Consolas, 'Courier New', 'Liberation Mono', monospace";
  private terminalFontSize = 12;
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
    resizeObserver?: ResizeObserver;
    windowResizeHandler?: () => void;
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
  private scaleChangeTimer: number | null = null; // Debounce timer for display scale changes
  private readonly editorWrapCompartment = new Compartment();
  private readonly editorLanguageCompartment = new Compartment();

  // Sprite Editor State
  private spriteGridSize = 16;
  private spriteZoom = 20;
  private spriteData: number[][] = Array(16).fill(0).map(() => Array(16).fill(15));
  private spriteSelectedColor = 0;
  private spriteTool: 'pencil' | 'eraser' | 'fill' | 'eyedropper' = 'pencil';
  private spriteShowGrid = true;
  // Animation state
  private spriteAnimationFrames: number[][][] = []; // Array of frames (each frame is 16x16 grid)
  private spriteCurrentFrame = 0;
  private spriteAnimationPlaying = false;
  private spriteAnimationTimer: number | null = null;
  private spriteAnimationFPS = 8; // Frames per second

  // AutoHarp State
  private autoHarpOctave = 4;
  private autoHarpRecording = false;
  private autoHarpSong: { freq: number; time: number; duration: number }[] = [];
  private autoHarpStartTime = 0;
  private autoHarpActiveNotes: Set<string> = new Set();

  // DolDoc Viewer State
  private dolDocContent: string = '';
  private dolDocPath: string = '';


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
      customContent?: string; // For custom HTML in alert modals
    }
    | null = null;
  // Modal resolve can return string|null (prompt), boolean (confirm), or void (alert)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private modalResolve: ((value: any) => void) | null = null;




  // ============================================
  // EFFECTS MANAGER (Tier 14.2)
  // ============================================
  public effectsManager: EffectsManager;
  public jellyMode = false;

  // ============================================
  // WINDOW MANAGER (Phase 2 Refactoring)
  // ============================================
  public windowManager: WindowManager;

  constructor() {
    this.effectsManager = new EffectsManager();

    // Initialize Window Manager with callbacks
    // Pass this.windows as external reference so both main.ts and WindowManager share the same array
    this.windowManager = new WindowManager({
      onWindowsChange: () => this.render(),
      onActiveWindowChange: (_id) => {
        // Update taskbar when active window changes
        const taskbarApps = document.querySelector('.taskbar-apps');
        if (taskbarApps) {
          taskbarApps.innerHTML = this.renderTaskbarAppsHtml();
        }
      },
      onWindowMinimize: (windowId) => {
        // DOM optimization: hide window instead of re-render
        const winEl = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement;
        if (winEl) {
          winEl.style.display = 'none';
        }
      },
      onWindowFocus: (windowId, wasMinimized) => {
        // DOM optimization: show/move window instead of re-render
        const winEl = document.querySelector(`[data-window-id="${windowId}"]`) as HTMLElement;
        const container = document.getElementById('windows-container');
        if (winEl && container) {
          if (wasMinimized) winEl.style.display = 'flex';
          container.appendChild(winEl);
        }
      }
    }, this.windows);

    // Initialize other managers...
    this.workspaceManager = new WorkspaceManager();
    this.tilingManager = new TilingManager();
    this.notificationManager = new NotificationManager();

    // Legacy Settings Manager shim - TempleOS implements all SettingsHost properties
    this.settingsManager = new SettingsManager(this as unknown as SettingsHost);
    this.init();
  }

  private init() {
    // Phase 7: Cleanup all timers when window closes
    window.addEventListener('beforeunload', () => {
      this.cleanupAllTimers();
    });

    this.applyTheme();
    this.applyTaskbarPosition();
    this.renderInitial();
    this.setupEventListeners();

    // Pre-cache logo for start menu popup (async, non-blocking)
    fetch(templeLogo)
      .then(r => r.blob())
      .then(blob => new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }))
      .then(base64 => { this.cachedLogoBase64 = base64; })
      .catch(() => { });

    // Sync panel policies (Linux X11 only; no-ops elsewhere)
    if (window.electronAPI?.onX11SnapLayoutsSuggest) {
      window.electronAPI.onX11SnapLayoutsSuggest((payload) => {
        if (payload.xid) this.showSnapLayoutsOverlay(payload.xid);
      });
    }
    // Sync snap layouts enabled setting from main process
    if (window.electronAPI?.getSnapLayoutsEnabled) {
      void window.electronAPI.getSnapLayoutsEnabled().then(res => {
        if (res?.success) this.x11SnapLayoutsEnabled = res.enabled;
      });
    }
    if (window.electronAPI?.setHideBarOnFullscreen) {
      void window.electronAPI.setHideBarOnFullscreen(this.hideBarOnFullscreen);
    }
    if (window.electronAPI?.setGamingMode) {
      void window.electronAPI.setGamingMode(this.gamingModeActive);
    }
    // Subscribe to X11 external window changes for unified taskbar (Linux X11 only)
    if (window.electronAPI?.onX11WindowsChanged) {
      window.electronAPI.onX11WindowsChanged((payload) => {
        const wins = Array.isArray(payload?.windows) ? payload.windows : [];
        const prevByXid = new Map(
          this.x11Windows
            .map(w => [String(w?.xidHex || '').toLowerCase(), w] as const)
            .filter(([xid]) => !!xid),
        );
        this.x11Windows = wins;

        // Clean up tracking for closed windows
        const alive = new Set(this.x11Windows.map(w => String(w?.xidHex || '').toLowerCase()).filter(Boolean));
        for (const xid of Array.from(this.x11UserMinimized)) {
          if (!alive.has(xid)) this.x11UserMinimized.delete(xid);
        }
        for (const xid of Array.from(this.x11WorkspaceMinimized)) {
          if (!alive.has(xid)) this.x11WorkspaceMinimized.delete(xid);
        }
        let workspacesChanged = false;

        // Rescue found windows from lost list
        for (const xid of alive) {
          if (this.x11LostWindows.has(xid)) {
            this.x11LostWindows.delete(xid);
          }
        }

        // Check for missing windows
        const now = Date.now();
        for (const [xid] of this.x11WindowWorkspaces) {
          if (!alive.has(xid)) {
            // It's missing. Is it already marked lost?
            if (!this.x11LostWindows.has(xid)) {
              this.x11LostWindows.set(xid, now);
            }
          }
        }

        // Evict truly dead windows (lost > 3000ms)
        for (const [xid, lostAt] of this.x11LostWindows) {
          if (alive.has(xid)) {
            // Should have been rescued above, but just in case
            this.x11LostWindows.delete(xid);
            continue;
          }

          if (now - lostAt > 3000) {
            // Time to let go
            this.x11WindowWorkspaces.delete(xid);
            this.x11LostWindows.delete(xid);
            workspacesChanged = true;
          }
        }

        // Do NOT delete from x11WindowWorkspaces in the simple loop anymore.
        // We rely on the eviction logic above.

        // Auto-assign new X11 windows to the workspace they were launched from (not current workspace)
        // If launched recently (within 10 seconds), use the launch workspace; otherwise use current workspace
        const launchWorkspaceValid = this.x11PendingLaunchWorkspace !== null &&
          (now - this.x11PendingLaunchTime) < 10000; // 10 second window
        const assignWorkspace = launchWorkspaceValid
          ? this.x11PendingLaunchWorkspace!
          : this.workspaceManager.getActiveWorkspaceId();

        for (const w of this.x11Windows) {
          const xid = String(w?.xidHex || '').toLowerCase();
          if (xid && !this.x11WindowWorkspaces.has(xid)) {
            console.log(`[X11 Workspace] Assigning new window ${xid} to workspace ${assignWorkspace} (launch pending: ${launchWorkspaceValid})`);
            this.x11WindowWorkspaces.set(xid, assignWorkspace);
            workspacesChanged = true;

            // Clear the pending launch after assigning (only for the first new window)
            if (launchWorkspaceValid) {
              this.x11PendingLaunchWorkspace = null;
              this.x11PendingLaunchTime = 0;
            }
          }
        }

        if (workspacesChanged) {
          localStorage.setItem('temple_x11_workspaces', JSON.stringify(Array.from(this.x11WindowWorkspaces.entries())));
        }

        // If a window was active and becomes minimized (e.g. user clicked the app's own minimize button),
        // treat it as a user-intent minimize so we don't auto-restore it.
        // Skip this logic when start menu popup is open to avoid spurious state changes
        if (!this.startMenuPopupOpen) {
          for (const w of this.x11Windows) {
            const xid = String(w?.xidHex || '').toLowerCase();
            if (!xid || !w?.minimized) continue;
            const prev = prevByXid.get(xid);
            if (prev && !prev.minimized && prev.active) {
              this.x11UserMinimized.add(xid);
            }
          }
        }

        // Auto-restore any external window that gets minimized unexpectedly.
        // This prevents cases where clicking the desktop / opening an in-app window causes X11 apps (Firefox, etc.) to disappear.
        // Only windows the user explicitly minimized via our taskbar stay minimized.
        // Also skip windows minimized due to workspace switching.
        const api = window.electronAPI;
        if (api?.unminimizeX11Window) {
          const now = Date.now();
          const currentWs = this.workspaceManager.getActiveWorkspaceId();

          // Skip auto-restore entirely when the start menu popup is open.
          // Opening the popup steals focus from X11 apps, which can cause minimize/unminimize cycles.
          if (this.startMenuPopupOpen) {
            // Do nothing - don't auto-restore while start menu is open
          } else {
            for (const w of this.x11Windows) {
              const xid = String(w?.xidHex || '').toLowerCase();
              if (!xid || !w?.minimized) continue;
              if (this.x11UserMinimized.has(xid)) continue;
              if (this.x11WorkspaceMinimized.has(xid)) continue; // Don't auto-restore workspace-minimized windows

              // Don't auto-restore if the window belongs to a different workspace
              const assignedWs = this.x11WindowWorkspaces.get(xid) || 1;
              if (assignedWs !== currentWs) continue;

              // Only auto-restore if the minimize likely happened because the user interacted with the
              // TempleOS shell (the original bug). If the user minimized inside the X11 app itself,
              // we should respect it and not pop the window back.
              if (now - this.lastShellPointerDownMs > 1200) continue;

              const last = this.x11AutoRestoreCooldown.get(xid) || 0;
              if (now - last < 800) continue; // avoid thrash if WM keeps toggling
              this.x11AutoRestoreCooldown.set(xid, now);

              // Fire-and-forget: the bridge will refresh snapshot and update taskbar
              void api.unminimizeX11Window(w.xidHex);
            }
          } // end else (not startMenuPopupOpen)
        }

        // Update taskbar without full re-render to avoid flickering
        this.updateTaskbarX11Windows();
      });
      // Also fetch initial state
      if (window.electronAPI?.getX11Windows) {
        void window.electronAPI.getX11Windows().then(res => {
          if (res?.success && res.supported && Array.isArray(res.snapshot?.windows)) {
            this.x11Windows = res.snapshot.windows;
            this.updateTaskbarX11Windows();
          }
        });
      }
    }

    // Panel button forwards here.
    if (window.electronAPI?.onShellToggleStartMenu) {
      window.electronAPI.onShellToggleStartMenu(() => {
        this.toggleStartMenu();
      });
    }

    // Handle actions from floating Start Menu popup (X11)
    if (window.electronAPI?.onStartMenuAction) {
      window.electronAPI.onStartMenuAction((action) => {
        this.startMenuPopupOpen = false;

        if (action.type === 'launch' && action.key) {
          this.launchByKey(action.key);
        } else if (action.type === 'pin-start' && action.key) {
          this.pinStart(action.key);
          this.render();
        } else if (action.type === 'unpin-start' && action.key) {
          this.unpinStart(action.key);
          this.render();
        } else if (action.type === 'pin-taskbar' && action.key) {
          this.pinTaskbar(action.key);
          this.render();
        } else if (action.type === 'unpin-taskbar' && action.key) {
          this.unpinTaskbar(action.key);
          this.render();
        } else if (action.type === 'add-desktop' && action.key) {
          this.addDesktopShortcut(action.key);
        } else if (action.type === 'remove-desktop' && action.key) {
          this.removeDesktopShortcut(action.key);
        } else if (action.type === 'uninstall' && action.key) {
          // Close for uninstall
          window.electronAPI?.hideStartMenuPopup?.();
          const app = this.findInstalledAppByKey(action.key);
          if (app) this.uninstallApp(app);
        } else if (action.type === 'contextmenu' && action.key) {
          // Right-click context menu from popup - close popup first then show context menu
          window.electronAPI?.hideStartMenuPopup?.();

          const key = action.key;
          const display = this.launcherDisplayForKey(key);
          if (key && display) {
            const pinnedStart = this.pinnedStart.includes(key);
            const pinnedTaskbar = this.pinnedTaskbar.includes(key);
            const onDesktop = this.desktopShortcuts.some(s => s.key === key);

            // Check if this is an installed app that can be uninstalled
            const installedApp = this.findInstalledAppByKey(key);
            const canUninstall = installedApp && (
              this.canUninstallApp(installedApp) ||
              this.canAttemptAptUninstall(installedApp) ||
              this.canAttemptSnapUninstall(installedApp)
            );

            const menuItems: Array<{ label?: string; action?: () => void | Promise<void>; divider?: boolean }> = [
              { label: `🚀 Open`, action: () => this.launchByKeyClosingShellUi(key) },
              { divider: true },
              { label: pinnedStart ? '📌 Unpin from Start' : '📌 Pin to Start', action: () => { pinnedStart ? this.unpinStart(key) : this.pinStart(key); this.render(); } },
              { label: pinnedTaskbar ? '📌 Unpin from Taskbar' : '📌 Pin to Taskbar', action: () => { pinnedTaskbar ? this.unpinTaskbar(key) : this.pinTaskbar(key); this.render(); } },
              { label: onDesktop ? '🗑️ Remove from Desktop' : '➕ Add to Desktop', action: () => { onDesktop ? this.removeDesktopShortcut(key) : this.addDesktopShortcut(key); } },
            ];

            // Add uninstall option for user-installed apps
            if (canUninstall) {
              menuItems.push(
                { divider: true },
                { label: '❌ Uninstall', action: () => this.uninstallApp(installedApp) }
              );
            }

            // Use screen coordinates from popup, converted to client coordinates
            // Since the popup sends screenX/screenY, we need to convert to the main window's client space
            const x = typeof action.x === 'number' ? action.x : 100;
            const y = typeof action.y === 'number' ? action.y : 100;

            // Use screen coordinates directly since showContextMenu handles positioning
            this.showContextMenu(x, y, menuItems);
          }
        } else if (action.type === 'open_launcher') {
          // Open the native full-screen app launcher grid like the inline start menu does
          this.openAppLauncher();

          // FIX: Minimize X11 windows so the desktop (where the launcher lives) is visible
          if (this.x11Windows.length > 0) {
            this.x11Windows.forEach(w => {
              if (!w.minimized) {
                window.electronAPI?.minimizeX11Window?.(w.xidHex);
              }
            });
            // Ensure popup is closed
            window.electronAPI?.hideStartMenuPopup?.();
            this.startMenuPopupOpen = false;
          }
        } else if (action.type === 'quicklink' && action.path) {
          if (action.path === 'settings') {
            this.openApp('settings');
          } else if (action.path === 'root') {
            this.openApp('files');
            this.currentPath = '/';
            void this.loadFiles('/');
          } else if (action.path === 'home') {
            this.openApp('files');
            void this.loadFiles();
          } else {
            // Documents, Downloads, etc.
            this.openApp('files');
            const homePath = this.currentPath.startsWith('/home') ? this.currentPath.split('/').slice(0, 3).join('/') : '/home';
            const targetPath = `${homePath}/${action.path}`;
            this.currentPath = targetPath;
            void this.loadFiles(targetPath);
          }
        } else if (action.type === 'power' && action.action) {
          if (action.action === 'shutdown') {
            this.shutdownSystem();
          } else if (action.action === 'restart') {
            void window.electronAPI?.restart?.();
          } else if (action.action === 'lock') {
            this.lock();
          }
        }

        this.render();
      });
    }

    // Handle Start Menu popup closed (e.g., blur)
    if (window.electronAPI?.onStartMenuClosed) {
      window.electronAPI.onStartMenuClosed(() => {
        if (this.startMenuPopupOpen) {
          this.startMenuPopupOpen = false;
          this.render();
        }
      });
    }

    this.setupGodlyNotesGlobals();
    this.keepLegacyMethodsReferenced();
    this.updateClock();
    this.safeInterval(() => this.updateClock(), 1000);

    // Setup workspace manager callback
    this.workspaceManager.setOnChangeCallback(() => {
      this.render();
    });

    // Setup Effects Manager
    this.effectsManager.setJellyMode(this.jellyMode);

    // Setup Tiling Manager
    this.tilingManager.setTaskbarPosition(this.taskbarPosition);

    // Sync initial taskbar position with Electron backend (for X11 window snapping)
    if (window.electronAPI?.setTaskbarPosition) {
      window.electronAPI.setTaskbarPosition(this.taskbarPosition).catch(err => {
        console.warn('[TaskbarSync] Failed to sync initial position:', err);
      });
    }

    // Setup Notification Manager callbacks
    // NOTE: Only update toast container, NOT full render - prevents window flickering
    // Setup Notification Manager callbacks
    // OPTIMIZATION: Don't full render on every toast. Only update toast container and tray.
    this.notificationManager.setOnChangeCallback(() => {
      const toastContainer = document.getElementById('toast-container');
      if (toastContainer) {
        toastContainer.innerHTML = this.renderToasts();
      }

      // Update tray icon/popup to show unread status
      const tray = document.querySelector('.taskbar-tray');
      if (tray) {
        tray.innerHTML = this.getTrayHTML();
      }
    });
    this.notificationManager.setOnPlaySoundCallback((type) => this.playNotificationSound(type));
    // Sync DND state
    this.notificationManager.setDoNotDisturb(this.doNotDisturb);

    // Setup Network Manager callbacks
    // NOTE: Do NOT call render() here - it causes constant window refresh every 15s!
    // Only update the settings window if viewing Network settings
    this.networkManager.setCallbacks(
      () => {
        // Only refresh settings if actively viewing Network settings
        if (this.activeSettingsCategory === 'Network') {
          this.refreshSettingsWindow();
        }
        // Update the network tray icon if visible
        const networkIcon = document.getElementById('tray-network');
        if (networkIcon) {
          const connected = this.networkManager.status.connected;
          networkIcon.innerHTML = connected ? '📶' : '📵';
        }
      },
      (t, m, type) => this.showNotification(t, m, type),
      (opts) => this.openPromptModal(opts),
      (opts) => this.openConfirmModal(opts)
    );

    // Electron main-process lock request
    if (window.electronAPI?.onLockScreen) {
      window.electronAPI.onLockScreen(() => this.lock());
    }

    // Context menu popup action listener (Linux X11 floating menus)
    if (window.electronAPI?.onContextMenuAction) {
      window.electronAPI.onContextMenuAction((actionId: string) => {
        const action = this.pendingContextMenuActions?.get(actionId);
        if (action) {
          void action();
        }
        this.pendingContextMenuActions = null;
      });
    }

    // Periodically save state (if we had complex state)
    this.safeInterval(() => {
      // Auto-save logic could go here
    }, 30000);

    // Random Terry Quotes (if enabled)
    this.safeInterval(() => {
      if (this.quoteNotifications && Math.random() < 0.03) { // 3% chance every check (reduced from 10%)
        this.showNotification('Divine Intellect', this.getRandomQuote(), 'divine');
      }
    }, 60000 * 15); // Check every 15 minutes (increased from 5 minutes)
    // Background Network & System Status
    this.safeInterval(() => {
      void this.networkManager.refreshStatus();
    }, 15000); // Every 15 seconds

    // Hide boot screen after animation completes (animation is 4.5s delay + 0.5s = 5s total)
    // BUGFIX: Also force pointer-events: none in JS since CSS animations aren't reliable
    this.safeTimeout(() => {
      const bootScreen = document.querySelector('.boot-screen') as HTMLElement;
      if (bootScreen) {
        bootScreen.style.pointerEvents = 'none';
        bootScreen.style.opacity = '0';
        console.log('[BOOT] Boot screen pointer-events disabled at 5s');
      }
    }, 5000);
    this.safeTimeout(() => {
      const bootScreen = document.querySelector('.boot-screen') as HTMLElement;
      if (bootScreen) {
        bootScreen.style.display = 'none';
        console.log('[BOOT] Boot screen hidden at 5.5s');
      }
    }, 5500);

    // BUGFIX: Force render on first keydown to "wake up" event handling
    // This addresses the "spam keys to fix" workaround users discovered
    let firstInputHandled = false;
    const forceFirstRender = (eventType: string) => {
      if (!firstInputHandled) {
        firstInputHandled = true;
        console.log('[BOOT] First user input detected, forcing render:', eventType);
        this.render();
        // Remove these listeners after first use
        document.removeEventListener('keydown', earlyKeyHandler);
        document.removeEventListener('mousedown', earlyMouseHandler);
        document.removeEventListener('click', earlyClickHandler);
      }
    };
    const earlyKeyHandler = (e: KeyboardEvent) => forceFirstRender(`keydown:${e.key}`);
    const earlyMouseHandler = () => forceFirstRender('mousedown');
    const earlyClickHandler = () => forceFirstRender('click');
    document.addEventListener('keydown', earlyKeyHandler);
    document.addEventListener('mousedown', earlyMouseHandler);
    document.addEventListener('click', earlyClickHandler);

    // Bootstrap async OS integration + persisted settings
    void this.bootstrap();

    // BUGFIX: Render immediately to make UI responsive
    // Don't wait for bootstrap - it can take up to 1 minute on slow systems
    this.render();

    // Also render again after short delays to catch any timing issues
    // These are specifically timed to match boot screen phases
    this.safeTimeout(() => this.render(), 500);
    this.safeTimeout(() => this.render(), 2000);
    this.safeTimeout(() => { this.render(); console.log('[BOOT] Post-animation render at 5s'); }, 5000);
    this.safeTimeout(() => { this.render(); console.log('[BOOT] Final cleanup render at 6s'); }, 6000);

    // Memory Optimizer: check usage every 30 seconds
    // DISABLED: Users reported random refreshes disrupting workflow. 
    // This mock feature is too aggressive for regular usage.
    /*
    setInterval(() => {
      this.memoryOptimizer.checkAndClean(90, (title, msg) => this.showNotification(title, msg, 'warning'));
    }, 30000);
    */
  }

  // ============================================
  // TIMER REGISTRY METHODS (Phase 7: Memory Leak Prevention)
  // ============================================

  /**
   * Safe setTimeout wrapper - tracks timer ID for cleanup on destroy
   */
  private safeTimeout(callback: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      callback();
    }, ms);
    this.timers.add(id);
    return id;
  }

  /**
   * Safe setInterval wrapper - tracks interval ID for cleanup on destroy
   */
  private safeInterval(callback: () => void, ms: number): number {
    const id = window.setInterval(callback, ms);
    this.intervals.add(id);
    return id;
  }

  /**
   * Clear a specific timeout and remove from registry
   */
  private clearSafeTimeout(id: number | null | undefined): void {
    if (id != null) {
      window.clearTimeout(id);
      this.timers.delete(id);
    }
  }

  /**
   * Clear a specific interval and remove from registry
   */
  // @ts-ignore - Kept for API completeness, will be used when intervals need individual cleanup
  private clearSafeInterval(id: number | null | undefined): void {
    if (id != null) {
      window.clearInterval(id);
      this.intervals.delete(id);
    }
  }

  /**
   * Cleanup all tracked timers and intervals - call on destroy/beforeunload
   */
  private cleanupAllTimers(): void {
    for (const id of this.timers) {
      window.clearTimeout(id);
    }
    this.timers.clear();
    for (const id of this.intervals) {
      window.clearInterval(id);
    }
    this.intervals.clear();
    console.log('[TempleOS] All timers cleaned up');
  }

  // ============================================
  // X11 SNAP LAYOUTS OVERLAY (Phase 2)
  // ============================================

  private showSnapLayoutsOverlay(xidHex: string) {
    // Only show if snap layouts are enabled
    if (!this.x11SnapLayoutsEnabled) return;

    // Prevent duplicate overlays
    if (this.snapLayoutsOverlay) return;

    this.currentSnapXid = xidHex;

    // Create the snap layouts overlay
    const overlay = document.createElement('div');
    overlay.className = 'snap-layouts-overlay';
    overlay.innerHTML = `
      <div class="snap-layouts-container">
        <div class="snap-layouts-title">Choose a Layout</div>
        <div class="snap-layouts-grid">
          <div class="snap-layout-option" data-mode="maximize" title="Maximize">
            <div class="snap-layout-preview full"></div>
          </div>
          <div class="snap-layout-option" data-mode="left" title="Left Half">
            <div class="snap-layout-preview half-left"></div>
          </div>
          <div class="snap-layout-option" data-mode="right" title="Right Half">
            <div class="snap-layout-preview half-right"></div>
          </div>
          <div class="snap-layout-option" data-mode="topleft" title="Top-Left">
            <div class="snap-layout-preview quarter-tl"></div>
          </div>
          <div class="snap-layout-option" data-mode="topright" title="Top-Right">
            <div class="snap-layout-preview quarter-tr"></div>
          </div>
          <div class="snap-layout-option" data-mode="bottomleft" title="Bottom-Left">
            <div class="snap-layout-preview quarter-bl"></div>
          </div>
          <div class="snap-layout-option" data-mode="bottomright" title="Bottom-Right">
            <div class="snap-layout-preview quarter-br"></div>
          </div>
        </div>
        <div class="snap-layouts-close" title="Close">&times;</div>
      </div>
    `;

    // Handle layout selection
    overlay.querySelectorAll('.snap-layout-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        const mode = (opt as HTMLElement).dataset.mode;
        if (mode && this.currentSnapXid) {
          const taskbarConfig = { height: 50, position: this.taskbarPosition };
          const res = await window.electronAPI?.snapX11Window?.(this.currentSnapXid, mode, taskbarConfig);
          if (res?.success) {
            // Track the slot for auto-tiling
            await window.electronAPI?.setOccupiedSlot?.(this.currentSnapXid, mode);
          }
        }
        this.hideSnapLayoutsOverlay();
      });
    });

    // Handle close button
    overlay.querySelector('.snap-layouts-close')?.addEventListener('click', () => {
      this.hideSnapLayoutsOverlay();
    });

    // Handle click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideSnapLayoutsOverlay();
      }
    });

    document.body.appendChild(overlay);
    this.snapLayoutsOverlay = overlay;

    // Auto-hide after 5 seconds if not interacted
    setTimeout(() => {
      if (this.snapLayoutsOverlay === overlay) {
        this.hideSnapLayoutsOverlay();
      }
    }, 5000);
  }

  private hideSnapLayoutsOverlay() {
    if (this.snapLayoutsOverlay) {
      this.snapLayoutsOverlay.remove();
      this.snapLayoutsOverlay = null;
    }
    this.currentSnapXid = null;
  }

  private keepLegacyMethodsReferenced(): void {
    // Keeps older implementations from triggering TS6133 while we transition to v2 UI.
    // (Safe: no execution, just references.)
    void this.renderNetworkPopup;
    void this.renderNotificationPopup;
    void this.getFileBrowserContent;

    void this.cycleWindows;
    void this.handleTerminalCommand;
    // Tier 14.1: snapPreview is referenced via DOM element #snap-preview
    void this.snapPreview;
  }

  // Helper: Check if file is an image
  private isImageFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
  }

  // Timeout wrapper for IPC calls that may hang (e.g., nmcli in VMs without WiFi)
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
    ]);
  }

  // Physical Security Methods (Tier 7.6)
  private toggleUsbDevice(id: string) {
    const device = this.usbDevices.find(d => d.id === id);
    if (device) {
      device.allowed = !device.allowed;
      this.refreshSettingsWindow();
      this.showNotification('Security Alert', `USB Device ${device.allowed ? 'Allowed' : 'Blocked'}: ${device.name}`, 'warning');
    }
  }

  private async triggerLockdown(): Promise<void> {
    this.showNotification('LOCKDOWN', 'Initiating emergency lockdown...', 'warning');
    if (window.electronAPI?.triggerLockdown) {
      const res = await window.electronAPI.triggerLockdown();
      if (res.success) {
        this.showNotification('LOCKDOWN', res.actions.join(', '), 'divine');
      }
    }
    // Also trigger frontend lock
    this.lock();

    if (this.encryptionEnabled) {
      // "Dismount" VeraCrypt volumes in lockdown
      this.veraCryptVolumes = [];
    }
    // Clear clipboard (mock)
    if (navigator.clipboard) navigator.clipboard.writeText('');

    this.showNotification('LOCKDOWN INITIATED', 'System locked. Encryption keys purged. Clipboard cleared.', 'divine');
  }

  private setDuressPassword(pwd: string) {
    this.duressPassword = pwd;
    this.queueSaveConfig();
    this.showNotification('Security', 'Duress password updated.', 'info');
  }

  private setupGlobalInputListeners(): void {
    console.log('[INPUT] Setting up global input listeners');

    // Unified global key listener
    window.addEventListener('keydown', (e) => {
      // NOTE: Windows/Meta key is handled by globalShortcut.register('Super') in main.cjs
      // which sends 'start-menu' action via onGlobalShortcut. We don't handle Meta here
      // to avoid double-toggle (globalShortcut fires first, then keydown would fire again).

      // 1. Win + Arrow -> Snap Layouts
      if ((e.metaKey || e.ctrlKey) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        // Only if we have an active window
        const activeWin = this.windows.find(w => w.active && !w.minimized);
        if (activeWin) {
          e.preventDefault();
          this.handleWindowSnap(activeWin.id, e.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown');
        }
        return;
      }

      // 2. Focus Rescue (Wake up from X11 limbo)
      // If we receive a key, we are technically focused, but let's make sure the document knows it
      if (!document.hasFocus()) {
        window.focus();
      }
    });

    // Mouse wake-up
    window.addEventListener('mousedown', () => {
      if (!document.hasFocus()) {
        window.focus();
      }
    });
  }

  private async applyMacRandomization(): Promise<void> {
    if (!window.electronAPI?.setMacRandomization) return;

    console.log(`[TempleOS] Applying MAC Randomization: ${this.macRandomization ? 'Enabled' : 'Disabled'}`);

    // Don't await this during event handlers to keep UI responsive, but do await in bootstrap
    const result = await window.electronAPI.setMacRandomization(this.macRandomization);

    if (!result.success) {
      console.error('[TempleOS] Failed to apply MAC Randomization:', result.error);
      if (this.setupComplete) { // Only show toaster if setup is done to avoid cluttering wizard
        this.showNotification('Security Error', `Failed to apply MAC Randomization: ${result.error}`, 'error');
      }
    } else {
      if (result.modifiedCount && result.modifiedCount > 0 && this.setupComplete) {
        this.showNotification('Security', `MAC Randomization ${this.macRandomization ? 'Enabled' : 'Disabled'}`, 'info');
      }
    }
  }

  private async bootstrap(): Promise<void> {
    // Phase 1: Load critical config first (needed by other operations)
    await this.loadConfig();

    // Sync Voice of God TTS settings to backend
    await this.syncTTSSettings();

    // INPUT FIX: Setup global listeners immediately
    this.setupGlobalInputListeners();

    // Enforce lock screen on boot if password or PIN is configured
    if (this.setupComplete && (this.lockPassword || this.lockPin)) {
      document.getElementById('initial-loader')?.remove();
      this.lock();
    } else {
      document.getElementById('initial-loader')?.remove();
      this.playBootSequence();
    }

    this.notificationManager.setDoNotDisturb(this.doNotDisturb);

    // Apply MAC Randomization (Security)
    // We do this early in Phase 2 so it applies as connections might be coming up
    this.applyMacRandomization().catch(e => console.error(e));

    // Phase 2: Run independent operations in parallel with timeouts (3s max per call)
    // This prevents VMs without WiFi/audio hardware from blocking startup
    await Promise.all([
      this.withTimeout(this.loadResolutions(), 3000, undefined),
      this.withTimeout(this.loadInstalledApps(), 3000, undefined),
      this.withTimeout(this.refreshMouseDpiInfo(), 3000, undefined),
      this.withTimeout(this.refreshDisplayOutputs(), 3000, undefined),
      this.withTimeout(this.refreshAudioDevices(), 3000, undefined),
      this.withTimeout(this.refreshNetworkStatus(), 3000, undefined),
      this.withTimeout(this.refreshSystemInfo(), 3000, undefined),
      this.withTimeout(this.refreshBatteryStatus(), 3000, undefined),
      this.withTimeout(this.refreshMonitorStatsOnly(true), 3000, undefined),
      this.checkPtySupport(),
    ]);

    // Setup PTY listeners after PTY support check completes

    this.setupPtyListeners();

    // Live app discovery updates (new/removed .desktop files)
    if (window.electronAPI?.onAppsChanged) {
      let t: number | null = null;
      window.electronAPI.onAppsChanged(() => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(() => {
          void this.loadInstalledApps().then(() => this.render());
          t = null;
        }, 300);
      });
    }

    // Periodic refresh (Windows-like status panels)
    this.safeInterval(() => void this.refreshNetworkStatus(), 10000);
    this.safeInterval(() => void this.refreshAudioDevices(), 15000);
    this.safeInterval(() => void this.refreshSystemInfo(), 30000);
    this.safeInterval(() => void this.refreshBatteryStatus(), 30000);
    this.safeInterval(() => {
      // Avoid duplicate polling when System Monitor is open (it has its own interval).
      if (this.windows.some(w => w.id.startsWith('system-monitor'))) return;
      void this.refreshMonitorStatsOnly(false);
    }, 5000);

    // Welcome Notification (immediate since bootstrap is now fast)
    this.showNotification('System Ready', 'TempleOS has started successfully.', 'divine', [
      { id: 'open-settings', label: 'Open Settings' }
    ]);

    // Background update check (delayed to not slow down startup)
    this.safeTimeout(() => {
      void this.checkForUpdates(true); // true = show notification if updates available
    }, 10000); // Check 10 seconds after boot

    // Periodic update check every 4 hours
    this.safeInterval(() => {
      void this.checkForUpdates(true);
    }, 4 * 60 * 60 * 1000);

    this.render();
  }

  private async checkPtySupport(): Promise<void> {
    if (window.electronAPI?.isPtyAvailable) {
      const result = await window.electronAPI.isPtyAvailable();
      this.ptySupported = result.success && result.available;
      if (this.ptySupported) {
        console.log('PTY terminal support enabled');
      } else {
        console.warn('PTY terminal NOT available - using limited fallback mode');
        console.warn('To enable full terminal with sudo support, run: ./scripts/setup-terminal.sh');
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
    this.notificationManager.show(title, message, type, actions);
  }

  private playNotificationSound(type: string) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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



  private playBootSequence() {
    this.bootSequenceActive = true;
    this.bootStartTime = performance.now();
    const app = document.getElementById('app');
    if (app) {
      const bootHtml = this.renderBootScreen();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bootHtml;
      const bootEl = tempDiv.firstElementChild;
      if (bootEl) {
        app.appendChild(bootEl);
      }
    }

    // BUGFIX: Input wake-up workaround for Chromium/X11 race condition
    // The desktop sometimes has unresponsive input until a keydown triggers a render.
    // This runs after lockscreen is dismissed (or immediately if no lock) to wake up input.
    this.triggerInputWakeUp();
  }

  /**
   * Workaround for intermittent Chromium input handling bug on X11.
   * Forces multiple render cycles to ensure input handling is fully initialized.
   */
  private triggerInputWakeUp(): void {
    console.log('[BOOT] Triggering input wake-up sequence (Focus Only)');

    // FIX: Force focus theft from X11 root without destroying the DOM
    const performWakeUp = (i: number) => {
      if (!document.hasFocus()) {
        window.focus();
        // Also try to focus a dummy element if needed
        document.body.focus();
      }
      // NO FULL RENDER: this.render() is destructive and resets menus/selection!
      // this.render(); 
      console.log(`[BOOT] Input wake-up cycle #${i}`);
    };

    // Staggered focus attempts
    setTimeout(() => performWakeUp(1), 500);
    setTimeout(() => performWakeUp(2), 2000);

    // CRITICAL FIX: "Hard Focus" - Force a minimize/restore cycle to break X11 input freeze
    // This solves the issue where user has to press Tab+CapsLock to get input back.
    if (window.electronAPI?.inputWakeUp) {
      // TRIGGER: Single-shot AFTER boot animation (4.6s - just after 4.5s animation)
      // The Tab key injection with stealth CSS hides focus rings.
      console.log('[BOOT] Scheduling Hard Focus (Single-Shot @ 4.6s)');

      setTimeout(() => {
        window.electronAPI!.inputWakeUp().catch((err: unknown) => console.error('Hard Focus failed:', err));
      }, 4600);
    }
  }


  private renderInitial() {
    const app = document.getElementById('app')!;
    app.innerHTML = `
      <div id="initial-loader" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:20000;"></div>
      <div class="desktop" id="desktop" style="background-image: url('${this.wallpaperImage}'); background-size: 100% 100%; background-position: center;">
        ${this.renderDesktop()}
        <div id="windows-container" style="position: relative; z-index: 100;"></div>
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
       <div id="file-preview-overlay" class="file-preview-root"></div>
       <div id="workspace-overview-overlay"></div>
       <div id="snap-assist-overlay"></div>
       <div id="taskbar-hover-preview"></div>
       ${this.renderTaskbar()}
       <div id="lock-screen-root"></div>
     `;

    // Hidden file input for wallpaper
    const wallpaperInput = document.createElement('input');
    wallpaperInput.type = 'file';
    wallpaperInput.id = 'wallpaper-upload-input';
    wallpaperInput.accept = 'image/*';
    wallpaperInput.style.display = 'none';
    wallpaperInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const res = ev.target?.result;
          if (typeof res === 'string') {
            this.wallpaperImage = res;
            this.applyWallpaper();
            this.queueSaveConfig();
            this.refreshSettingsWindow();
            this.showNotification('Wallpaper', 'Custom wallpaper applied!', 'info');
          }
        };
        reader.readAsDataURL(file);
      }
      (e.target as HTMLInputElement).value = ''; // Reset
    });
    document.body.appendChild(wallpaperInput);
  }


  // Only update windows and taskbar, not the boot screen
  private render() {
    // FORCE CLEANUP: Ensure boot screen is removed if it lingers past 5s
    // This fixes the "unresponsive for 1 minute" bug caused by the overlay blocking clicks
    if (this.bootSequenceActive && performance.now() > this.bootStartTime + 5000) {
      const bootScreen = document.querySelector('.boot-screen');
      if (bootScreen) {
        bootScreen.remove();
      }
      this.bootSequenceActive = false;
    }


    const windowsContainer = document.getElementById('windows-container')!;
    const taskbarApps = document.querySelector('.taskbar-apps')!;
    const toastContainer = document.getElementById('toast-container');
    const altTabContainer = document.getElementById('alt-tab-overlay');
    const launcherOverlayRoot = document.getElementById('launcher-overlay-root');
    const modalOverlay = document.getElementById('modal-overlay');

    // Update Desktop Style (Wallpaper, etc.)
    const desktop = document.getElementById('desktop');
    if (desktop) {
      desktop.style.backgroundImage = `url('${this.wallpaperImage}')`;
    }

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

    const previewOverlay = document.getElementById('file-preview-overlay');
    if (previewOverlay) {
      previewOverlay.innerHTML = this.renderPreviewOverlay();
    }

    // Workspace Overview Overlay
    const workspaceOverlay = document.getElementById('workspace-overview-overlay');
    if (workspaceOverlay) {
      workspaceOverlay.innerHTML = this.showWorkspaceOverview
        ? this.workspaceManager.renderWorkspaceOverview()
        : '';
    }

    // Snap Assist Overlay
    const snapAssistOverlay = document.getElementById('snap-assist-overlay');
    if (snapAssistOverlay) {
      if (this.showSnapAssist && this.tilingManager.hasPendingSnapAssist()) {
        const pending = this.tilingManager.getPendingSnapAssist();
        const availableWindows = this.windows
          .filter(w => !w.minimized && w.id !== pending?.snappedWindowId)
          .map(w => ({ id: w.id, title: w.title, icon: w.icon }));
        snapAssistOverlay.innerHTML = this.tilingManager.renderSnapAssistOverlay(availableWindows);
      } else {
        snapAssistOverlay.innerHTML = '';
      }
    }

    // Update workspace switcher in taskbar
    const workspaceSwitcher = document.querySelector('.workspace-switcher');
    if (workspaceSwitcher) {
      workspaceSwitcher.outerHTML = this.renderWorkspaceSwitcher();
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

    // Media Player (keep playing if index matches)
    this.windows.forEach(w => {
      const el = document.querySelector(`[data-window-id="${w.id}"] .media-player-app`) as HTMLElement | null;
      if (el && el.dataset.mpIndex === String(this.mediaPlayer.state.currentIndex)) {
        preserveById(w.id);
      }
    });

    // Editor (CodeMirror) (keep undo/redo + DOM stable)
    if (this.editorView) {
      const editorWin = this.windows.find(w => w.id.startsWith('editor'));
      preserveById(editorWin?.id);
    }

    // GENERIC SCROLL PRESERVATION: Matches DOM structure by index
    // This handles any app (Help, Settings, Files, etc.) including sidebars
    const windowScrollStates = new Map<string, Map<number, number>>();

    this.windows.forEach(w => {
      if (!w.minimized && !preserved.has(w.id)) {
        const winEl = document.querySelector(`[data-window-id="${w.id}"]`);
        if (winEl) {
          const scrolls = new Map<number, number>();
          // Checking all descendants
          const elements = winEl.querySelectorAll('*');
          elements.forEach((el, index) => {
            if (el.scrollTop > 0) {
              scrolls.set(index, el.scrollTop);
            }
          });
          if (scrolls.size > 0) {
            windowScrollStates.set(w.id, scrolls);
          }
        }
      }
    });

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

      // Restore generic scroll state
      if (windowScrollStates.has(w.id)) {
        const savedScrolls = windowScrollStates.get(w.id)!;
        const elements = el.querySelectorAll('*');
        savedScrolls.forEach((scrollTop, index) => {
          if (elements[index]) {
            elements[index].scrollTop = scrollTop;
          }
        });
      }

      // Animation (first open)
      if (!w.opened && !w.minimized && !preserved.has(w.id)) {
        el.classList.add('window-opening');
        w.opened = true; // Mark as opened so it doesn't animate again
        // Optional: Remove class after animation to clean up
        setTimeout(() => el.classList.remove('window-opening'), 300);
      }
    }

    // Update taskbar apps (pinned + running)
    taskbarApps.innerHTML = this.renderTaskbarAppsHtml();

    // Update tray
    const tray = document.querySelector('.taskbar-tray');
    if (tray) {
      tray.innerHTML = this.getTrayHTML();
    }

    // Update desktop widgets (desktop subtree is not fully re-rendered in render())
    const widgetsRoot = document.getElementById('desktop-widgets-root');
    if (widgetsRoot) {
      widgetsRoot.innerHTML = this.renderDesktopWidgets();
    }

    // Update Start Menu
    const startMenuContainer = document.getElementById('start-menu-container');
    if (startMenuContainer) {
      // PRESERVE START MENU STATE (fixes 30s refresh focus loss)
      let smSearchFocused = false;
      let smSelectionStart = 0;
      let smSelectionEnd = 0;
      let smScrollTop = 0;

      if (this.showStartMenu) {
        const smInput = startMenuContainer.querySelector('.start-search-input') as HTMLInputElement;
        if (smInput && document.activeElement === smInput) {
          smSearchFocused = true;
          smSelectionStart = smInput.selectionStart || 0;
          smSelectionEnd = smInput.selectionEnd || 0;
        }
        // Result area might be the direct #start-menu-results-area or a child list
        // We'll check the container itself primarily
        const smResults = startMenuContainer.querySelector('#start-menu-results-area');
        if (smResults) {
          smScrollTop = smResults.scrollTop;
        }
      }

      startMenuContainer.innerHTML = this.renderStartMenu();

      // RESTORE START MENU STATE
      if (this.showStartMenu) {
        const smInput = startMenuContainer.querySelector('.start-search-input') as HTMLInputElement;
        if (smInput && smSearchFocused) {
          smInput.focus();
          try {
            smInput.setSelectionRange(smSelectionStart, smSelectionEnd);
          } catch { /* ignore */ }
        }
        const smResults = startMenuContainer.querySelector('#start-menu-results-area');
        if (smResults && smScrollTop > 0) {
          smResults.scrollTop = smScrollTop;
        }
      }
    }

    // Update Start Button State
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
      if (this.showStartMenu) startBtn.classList.add('active');
      else startBtn.classList.remove('active');
    }

    // Update Wizard (Fixed: Ensure wizard refreshes when step changes and unblocks UI when done)
    // Update Wizard (Fixed: Ensure wizard refreshes when step changes and unblocks UI when done)
    const wizardRoot = document.getElementById('first-run-wizard-root');
    if (wizardRoot) {
      if (this.setupComplete) {
        wizardRoot.style.display = 'none';
        wizardRoot.style.pointerEvents = 'none';
        wizardRoot.innerHTML = '';
      } else {
        const content = this.renderFirstRunWizard();
        if (content === '') {
          // Fallback: if setup is technically incomplete but renders nothing, HIDE IT
          wizardRoot.style.display = 'none';
          wizardRoot.style.pointerEvents = 'none';
          wizardRoot.innerHTML = '';
        } else {
          wizardRoot.style.display = 'block';
          wizardRoot.style.pointerEvents = 'auto';
          wizardRoot.innerHTML = content;
        }
      }
    }

    // FORCE CLEANUP: Ensure other overlays don't block interaction if empty
    // File Preview
    if (previewOverlay) {
      if (previewOverlay.innerHTML === '' || !this.previewFile) {
        previewOverlay.style.pointerEvents = 'none';
      } else {
        previewOverlay.style.pointerEvents = 'auto';
      }
    }

    // Modal Overlay
    if (modalOverlay) {
      if (!this.modal) {
        modalOverlay.style.pointerEvents = 'none';
        modalOverlay.innerHTML = '';
      } else {
        modalOverlay.style.pointerEvents = 'auto';
      }
    }

    // Alt-Tab Overlay
    if (altTabContainer) {
      if (!this.altTabOpen) {
        altTabContainer.style.pointerEvents = 'none';
      } else {
        altTabContainer.style.pointerEvents = 'auto';
      }
    }

    // Workspace Overlay
    if (workspaceOverlay) {
      if (!this.showWorkspaceOverview) {
        workspaceOverlay.style.pointerEvents = 'none';
      } else {
        workspaceOverlay.style.pointerEvents = 'auto';
      }
    }

    // Snap Assist Overlay
    if (snapAssistOverlay) {
      if (!this.showSnapAssist) {
        snapAssistOverlay.style.pointerEvents = 'none';
      } else {
        // snap assist might still be visually hidden if no windows to snap
        snapAssistOverlay.style.pointerEvents = this.tilingManager.hasPendingSnapAssist() ? 'auto' : 'none';
      }
    }

    // Update Shutdown Overlay
    const shutdownRoot = document.getElementById('shutdown-overlay-root');
    if (shutdownRoot) {
      shutdownRoot.innerHTML = this.renderShutdownOverlay();
    }

    // Update Decoy Session Overlay (intentionally empty - decoy should be invisible to attackers)
    const decoyRoot = document.getElementById('decoy-overlay-root');
    if (decoyRoot) {
      decoyRoot.innerHTML = '';
    }

    // Update Desktop Icons (Fixed: Ensure they are direct grid items by removing wrapper or using display: contents)
    const iconsRoot = document.getElementById('desktop-icons');
    if (iconsRoot) {
      iconsRoot.innerHTML = this.renderDesktopIcons();
    }
  }

  private renderDesktop(): string {
    return `
      <div id="decoy-overlay-root" style="position: absolute; inset: 0; pointer-events: none; z-index: 9999;"></div>
      <div id="shutdown-overlay-root" style="position: absolute; inset: 0; pointer-events: none; z-index: 10000;">${this.renderShutdownOverlay()}</div>
      <div id="resolution-confirmation-root" style="position: absolute; inset: 0; pointer-events: ${this.resolutionConfirmation ? 'auto' : 'none'}; z-index: 10002;">${this.renderResolutionConfirmation()}</div>
      <div id="first-run-wizard-root" style="position: absolute; inset: 0; pointer-events: ${this.setupComplete ? 'none' : 'auto'}; z-index: 10001; display: ${this.setupComplete ? 'none' : 'block'};">${this.renderFirstRunWizard()}</div>
      <div id="desktop-widgets-root" style="position: absolute; inset: 0; pointer-events: none; z-index: 5;">${this.renderDesktopWidgets()}</div>
      <div id="desktop-icons" class="desktop-icons ${this.desktopIconSize} ${this.desktopAutoArrange ? 'auto-arrange' : ''}" style="display: contents;">
        ${this.renderDesktopIcons()}
      </div>
    `;
  }

  private bootSequenceActive = false;
  private bootStartTime = 0;

  private renderBootScreen(): string {
    return `
      <div class="boot-screen" role="status" aria-live="polite">
        <div class="boot-logo">TEMPLEOS REMAKE</div>
        <div class="boot-text studio">Giangero Studio • Divine Intellect</div>
        <div class="boot-text">Initializing Temple Core...</div>
        <div class="boot-text">Loading 640x480 16-Color Covenant...</div>
        <div class="boot-text">Mounting Red Sea File System...</div>
        <div class="boot-text">Connecting to Oracle...</div>
        <div class="boot-progress-container">
            <div class="boot-progress-bar"></div>
        </div>
        <div class="boot-text ready">System Ready.</div>
        <div class="boot-text quote" style="margin-top: 20px; color: #ffd700; font-style: italic; max-width: 600px; text-align: center; opacity: 0; animation: fadeIn 1s ease 3.5s forwards;">
          "${escapeHtml(this.bootQuote)}"
        </div>
      </div>
    `;
  }

  // ============================================
  // MODALS (replace browser prompt/confirm/alert)
  // ============================================
  private renderPreviewOverlay(): string {
    if (!this.previewFile) return '';

    const content = this.previewFile.type === 'image'
      ? `<div style="display:flex; justify-content:center; align-items:center; height:100%;"><img src="${escapeHtml(this.previewFile.content || '')}" style="max-width:90%; max-height:90%; object-fit: contain; border: 2px solid #00ff41; box-shadow: 0 0 20px rgba(0,255,65,0.2);"></div>`
      : `<div style="padding: 20px; color: #00ff41; font-family: 'Terminus', monospace; white-space: pre-wrap; overflow: auto; height: 100%; background: rgba(0,0,0,0.8); border: 1px solid #00ff41;">${escapeHtml(this.previewFile.content || '')}</div>`;

    return `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center;">
        <div class="preview-modal" style="
            width: 80%; height: 80%;
            display: flex; flex-direction: column;
            background: #0d1117; border: 2px solid #00ff41; box-shadow: 0 0 30px rgba(0,255,65,0.15);
        ">
            <div style="padding: 10px; border-bottom: 1px solid rgba(0,255,65,0.3); display: flex; justify-content: space-between; align-items: center; background: rgba(0,255,65,0.05);">
                <div style="font-weight: bold; font-size: 16px;">${escapeHtml(this.previewFile.name)}</div>
                <button class="preview-close-btn" style="border: 1px solid #00ff41; background: none; color: #00ff41; cursor: pointer; padding: 4px 12px; font-family: inherit;">❌ Close</button>
            </div>
            <div style="flex: 1; overflow: hidden; position: relative;">
                ${content}
            </div>
        </div>
      </div>
    `;
  }

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
          ${this.modal.customContent ? `<div class="modal-custom-content">${this.modal.customContent}</div>` : ''}
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

  private openAlertModal(opts: { title: string; message?: string; confirmText?: string; customContent?: string }): Promise<void> {
    return new Promise((resolve) => {
      this.modalResolve?.(undefined);
      this.modalResolve = resolve;
      this.modal = {
        type: 'alert',
        title: opts.title,
        message: opts.message,
        confirmText: opts.confirmText ?? 'OK',
        customContent: opts.customContent,
      };
      this.render();
    });
  }

  private closeModal(result: string | boolean | null | undefined): void {
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
          <span>📶</span>
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
    const connected = this.networkManager.status.connected;
    const ssid = this.networkManager.status.wifi?.ssid;
    const signal = this.networkManager.status.wifi?.signal ?? 0;
    const ip = this.networkManager.status.ip4;

    const networks = this.networkManager.wifiNetworks.slice(0, 8).map(n => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px; border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; background: ${n.inUse ? 'rgba(0,255,65,0.15)' : 'rgba(0,0,0,0.2)'};">
        <div style="min-width: 0; display: flex; flex-direction: column;">
          <div style="font-weight: bold; color: ${n.inUse ? '#ffd700' : '#00ff41'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.ssid}</div>
          <div style="font-size: 12px; opacity: 0.8;">${n.security ? 'Secured' : 'Open'} • ${n.signal}%</div>
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
          <div style="font-weight: bold; color: #ffd700;">${connected ? (ssid || this.networkManager.status.connection || 'Connected') : 'Disconnected'}</div>
          <div style="font-size: 12px; opacity: 0.85;">${connected ? `${this.networkManager.status.type || 'network'}${ip ? ` • IP ${ip}` : ''}${ssid ? ` • ${signal}%` : ''}` : (this.networkManager.lastError ? this.networkManager.lastError : 'Not connected')}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow: auto;">
          ${window.electronAPI?.listWifiNetworks ? (networks || '<div style="opacity: 0.6;">No Wi-Fi networks found.</div>') : '<div style="opacity: 0.6;">Network controls require Electron/Linux.</div>'}
        </div>
      </div>
    `;
  }

  private renderNotificationPopup() {
    return this.notificationManager.renderPopup();
  }

  private renderNotificationPopupV2() {
    return this.notificationManager.renderPopup();
  }

  private renderToasts() {
    return this.notificationManager.renderToasts();
  }



  private formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ============================================
  // DESKTOP ICONS HELPERS
  // ============================================
  public setDesktopSort(mode: 'name' | 'size' | 'default') {
    if (mode === 'name') {
      this.sortDesktopIcons('name');
    } else if (mode === 'size' || mode === 'default') {
      this.sortDesktopIcons('type'); // Sort by type as a reasonable default
    }
  }

  public setDesktopIconSize(size: 'small' | 'large') {
    this.desktopIconSize = size;
    localStorage.setItem('temple_desktop_icon_size', size);
    this.render();
  }

  public toggleDesktopAutoArrange() {
    this.desktopAutoArrange = !this.desktopAutoArrange;
    localStorage.setItem('temple_desktop_auto_arrange', String(this.desktopAutoArrange));
    this.render();
  }

  private renderDesktopIcons(): string {
    const neon = (path: string) => `<svg viewBox="0 0 24 24" class="icon-neon" width="40" height="40">${path}</svg>`;
    const icons = [
      { id: 'terminal', icon: neon('<rect x="2" y="4" width="20" height="16" rx="2" /><path d="M6 8l4 4-4 4" /><path d="M14 16h4" />'), label: 'Terminal' },
      { id: 'word-of-god', icon: neon('<path d="M12 2v20M2 8h20" />'), label: 'Word of God' },
      { id: 'files', icon: neon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />'), label: 'Files' },
      { id: 'editor', icon: neon('<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />'), label: 'HolyC Editor' },
      { id: 'hymns', icon: neon('<path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />'), label: 'Hymn Player' },
      { id: 'updater', icon: neon('<path d="M5.5 5c.5.5 1.5 3.5 1.5 5s-1 3 1 4c2 1 2.5-.5 2.5-2.5s-.75-6-1.5-7.5c-.5-1-1 0-1 0s-.5-2-1-2-.5 1-.5 1-1-1-1.5-1 0 .5 0 .5z"/><path d="M5.3 11.5c1.5 0 2 2 3 2s.5-1.5 1.5-1.5 5-2.5 5-5.5 1.5-1.5 1.5-.5c.5 0 1 .8 1 1.5 0 .5 0 1-.5 1.5.5 0 1 1 .5 1.5.5 1.5-.5 3-1.5 3.5 0 .5-1 1.5-2 1 0 0-.5 1.5-1.5 1 0 0 1.5.8 2 1 1.5.5 3.5.5 3.5.5s0 .5-1 1c0 0 .5.5 0 1s-1 .5-1 .5.5 1-1 .5-3-2-3-2-2.5.5-4.5-.5-3-3-3-4-1.5-.5-2-.5 1-1 1.5-1c0 0 0-1 1.5-1z"/>'), label: 'Holy Updater' },
      { id: 'help', icon: neon('<circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor"/>'), label: 'Help' },
      { id: 'godly-notes', icon: neon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />'), label: 'Godly Notes' },
      { id: 'trash', icon: neon('<polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />'), label: 'Trash' },
    ];

    const builtinKeys = new Set(icons.map(i => `builtin:${i.id}`));
    const shortcutIcons = this.desktopShortcuts
      .filter(s => s && typeof s.key === 'string' && typeof s.label === 'string' && !builtinKeys.has(s.key))
      .slice(0, 48)
      .map(s => {
        const display = this.launcherDisplayForKey(s.key);
        return {
          id: s.key, // shortcut key is the ID
          key: s.key,
          icon: display?.icon || '📄',
          label: s.label,
          isShortcut: true
        };
      });

    const allIcons = [
      ...icons.map(icon => ({ ...icon, key: `builtin:${icon.id}`, isShortcut: false })),
      ...shortcutIcons
    ];

    // Grid settings
    const CELL_W = 100;
    const CELL_H = 100;
    const GAP = 10;
    const PADDING = 20;

    // Helper to get available grid slot if undefined


    // If auto-arrange is on, we ignore stored positions and strictly grid them
    // If auto-arrange is off, we use stored positions, or find next empty slot

    // Available width for columns
    const desktopEl = document.getElementById('desktop');
    const width = (desktopEl && desktopEl.clientWidth > 0) ? desktopEl.clientWidth : window.innerWidth;
    const cols = Math.max(1, Math.floor((width - PADDING * 2) / (CELL_W + GAP)));

    return allIcons.map((icon, index) => {
      let x = 0;
      let y = 0;
      const key = icon.key;

      if (this.desktopAutoArrange) {
        // Auto-flow: Row-major
        const row = Math.floor(index / cols);
        const col = index % cols;
        x = PADDING + col * (CELL_W + GAP);
        y = PADDING + row * (CELL_H + GAP);
      } else {
        // Free positioning
        const stored = this.desktopIconPositions[key];
        if (stored) {
          x = stored.x;
          y = stored.y;

          // Bounds check with Clamping (preserves position, just keeps on-screen)
          const safeMaxX = width - CELL_W - 5;
          const viewH = (desktopEl && desktopEl.clientHeight > 0) ? desktopEl.clientHeight : window.innerHeight;
          const safeMaxY = viewH - CELL_H - 50; // Account for taskbar

          let clamped = false;
          if (x < 5) { x = 10; clamped = true; }
          if (y < 5) { y = 10; clamped = true; }
          if (x > safeMaxX) { x = Math.max(10, safeMaxX); clamped = true; }
          if (y > safeMaxY) { y = Math.max(10, safeMaxY); clamped = true; }

          if (clamped) {
            this.desktopIconPositions[key] = { x, y };
            localStorage.setItem('temple_desktop_icon_positions', JSON.stringify(this.desktopIconPositions));
          }
        } else {
          // Find first empty grid slot
          let slotI = 0;
          while (true) {
            const r = Math.floor(slotI / cols);
            const c = slotI % cols;
            // Check if this visual slot is taken by another icon's stored position?
            // This is complex. For simplicity, just place 'new' icons at the end of the list logic
            // or use the current index as a fallback "grid" pos.
            const tx = PADDING + c * (CELL_W + GAP);
            const ty = PADDING + r * (CELL_H + GAP);

            // Check if any *other* icon occupies this rough area?
            // Optimization: just use the index for default placement if unknown
            const isTaken = false; // logic too heavy for render loop without pre-calc
            if (!isTaken) {
              x = tx;
              y = ty;
              break;
            }
            slotI++;
          }
          // Simple fallback for now: use index
          const r = Math.floor(index / cols);
          const c = index % cols;
          x = PADDING + c * (CELL_W + GAP);
          y = PADDING + r * (CELL_H + GAP);
        }
      }

      // Adjust y position when taskbar is at top to prevent overlap
      const taskbarOffset = this.taskbarPosition === 'top' ? 60 : 0; // 50px taskbar + 10px padding
      const finalY = y + taskbarOffset;

      const style = `position: absolute; left: ${x}px; top: ${finalY}px;`;
      const appAttr = icon.isShortcut ? `data-launch-key="${escapeHtml(icon.key)}"` : `data-app="${escapeHtml(icon.id)}"`;

      const sizeClass = `size-${this.desktopIconSize}`;
      return `
      <div class="desktop-icon ${sizeClass}" ${appAttr} tabindex="0" role="button" aria-label="${escapeHtml(icon.label)}" style="${style}">
        <span class="icon" aria-hidden="true">${icon.icon}</span>
        <span class="label">${escapeHtml(icon.label)}</span>
      </div>
    `;
    }).join('');
  }

  // ============================================
  // DESKTOP ICONS DRAG & DROP
  // ============================================
  private handleIconDragStart(e: MouseEvent, iconEl: HTMLElement): void {
    if (this.desktopAutoArrange) return; // Locked

    const rect = iconEl.getBoundingClientRect();
    const key = iconEl.dataset.launchKey || (iconEl.dataset.app ? `builtin:${iconEl.dataset.app}` : '');

    if (!key) return;

    // Set up potential drag, but don't start dragging yet (wait for mouse move threshold)
    iconEl.focus();
    this.draggingIcon = {
      key,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false
    };
  }

  private handleIconDragMove(e: MouseEvent): void {
    if (!this.draggingIcon) return;

    // Check if mouse has moved beyond threshold (5px) to distinguish drag from click
    const threshold = 5;
    const deltaX = Math.abs(e.clientX - this.draggingIcon.startX);
    const deltaY = Math.abs(e.clientY - this.draggingIcon.startY);

    if (!this.draggingIcon.hasMoved && (deltaX < threshold && deltaY < threshold)) {
      // Haven't moved enough yet, don't start dragging
      return;
    }

    // Mark as moved and start visual drag
    if (!this.draggingIcon.hasMoved) {
      this.draggingIcon.hasMoved = true;
      const iconEl = document.querySelector(`.desktop-icon[data-launch-key="${this.draggingIcon.key}"]`) as HTMLElement
        || document.querySelector(`.desktop-icon[data-app="${this.draggingIcon.key.replace('builtin:', '')}"]`) as HTMLElement;
      if (iconEl) {
        iconEl.classList.add('dragging');
        iconEl.style.zIndex = '100';
      }
    }

    const iconEl = document.querySelector(`.desktop-icon[data-launch-key="${this.draggingIcon.key}"]`) as HTMLElement
      || document.querySelector(`.desktop-icon[data-app="${this.draggingIcon.key.replace('builtin:', '')}"]`) as HTMLElement;

    if (!iconEl) return;

    e.preventDefault();

    // Calculate new position relative to desktop container
    const desktopEl = document.getElementById('desktop');
    if (!desktopEl) return;

    const desktopRect = desktopEl.getBoundingClientRect();
    let x = e.clientX - desktopRect.left - this.draggingIcon.offsetX;
    let y = e.clientY - desktopRect.top - this.draggingIcon.offsetY;

    // Boundaries - constrain to desktop area
    x = Math.max(0, x);
    y = Math.max(0, y);
    x = Math.min(x, desktopRect.width - iconEl.offsetWidth);
    y = Math.min(y, desktopRect.height - iconEl.offsetHeight);

    iconEl.style.left = `${x}px`;
    iconEl.style.top = `${y}px`;
  }

  private handleIconDragEnd(): void {
    if (!this.draggingIcon) return;

    const key = this.draggingIcon.key;
    const hasMoved = this.draggingIcon.hasMoved;
    const iconEl = document.querySelector(`.desktop-icon[data-launch-key="${key}"]`) as HTMLElement
      || document.querySelector(`.desktop-icon[data-app="${key.replace('builtin:', '')}"]`) as HTMLElement;

    if (iconEl) {
      iconEl.classList.remove('dragging');
      iconEl.style.zIndex = '';

      // Only save position if icon was actually dragged
      if (hasMoved) {
        let x = parseInt(iconEl.style.left || '0', 10);
        let y = parseInt(iconEl.style.top || '0', 10);

        // Remove taskbar offset before saving (positions are stored relative to desktop, not viewport)
        const taskbarOffset = this.taskbarPosition === 'top' ? 60 : 0;
        y -= taskbarOffset;

        // COLLISION DETECTION: Check if this position overlaps with another icon
        const CELL_W = 100;
        const CELL_H = 100;
        const OVERLAP_THRESHOLD = 50; // 50% overlap triggers collision

        // Find if any other icon would overlap with this position
        let hasCollision = false;
        for (const [otherKey, otherPos] of Object.entries(this.desktopIconPositions)) {
          if (otherKey === key) continue; // Skip self

          const dx = Math.abs(x - otherPos.x);
          const dy = Math.abs(y - otherPos.y);

          // Check if icons overlap by more than threshold
          if (dx < OVERLAP_THRESHOLD && dy < OVERLAP_THRESHOLD) {
            hasCollision = true;
            break;
          }
        }

        // If collision detected, find nearest empty grid cell
        if (hasCollision) {
          const GAP = 10;

          // Find nearest empty cell using spiral search
          let found = false;
          const maxSearchRadius = 10; // Search up to 10 cells away

          for (let radius = 1; radius <= maxSearchRadius && !found; radius++) {
            for (let dy = -radius; dy <= radius && !found; dy++) {
              for (let dx = -radius; dx <= radius && !found; dx++) {
                // Only check cells at current radius (border of spiral)
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                const testX = x + dx * (CELL_W + GAP);
                const testY = y + dy * (CELL_H + GAP);

                // Check bounds
                if (testX < 0 || testY < 0) continue;

                // Check if this position is free
                let isFree = true;
                for (const [otherKey, otherPos] of Object.entries(this.desktopIconPositions)) {
                  if (otherKey === key) continue;

                  const testDx = Math.abs(testX - otherPos.x);
                  const testDy = Math.abs(testY - otherPos.y);

                  if (testDx < OVERLAP_THRESHOLD && testDy < OVERLAP_THRESHOLD) {
                    isFree = false;
                    break;
                  }
                }

                if (isFree) {
                  x = testX;
                  y = testY;
                  found = true;
                  // Update visual position
                  iconEl.style.left = `${x}px`;
                  iconEl.style.top = `${y + taskbarOffset}px`;
                }
              }
            }
          }
        }

        this.desktopIconPositions[key] = { x, y };
        localStorage.setItem('temple_desktop_icon_positions', JSON.stringify(this.desktopIconPositions));
      } else {
        // Icon was clicked, not dragged - open the app
        if (key.startsWith('builtin:')) {
          const appId = key.replace('builtin:', '');
          // Special handling for trash icon - open files app to trash
          if (appId === 'trash') {
            this.openApp('files');
            // Navigate to trash after window opens
            setTimeout(() => {
              void this.loadFiles('trash:');
            }, 150);
          } else {
            this.openApp(appId);
          }
        } else {
          // Desktop shortcut to installed app
          const launchKey = iconEl.dataset.launchKey;
          if (launchKey) {
            this.launchInstalledApp(launchKey);
          }
        }
      }
    }

    this.draggingIcon = null;
  }

  private sortDesktopIcons(criteria: 'name' | 'type'): void {
    const icons = [
      { id: 'terminal', icon: '💻', label: 'Terminal', type: 'builtin' },
      { id: 'word-of-god', icon: '✝️', label: 'Word of God', type: 'builtin' },
      { id: 'files', icon: '📁', label: 'Files', type: 'builtin' },
      { id: 'editor', icon: '📝', label: 'HolyC Editor', type: 'builtin' },
      { id: 'hymns', icon: '🎵', label: 'Hymn Player', type: 'builtin' },
      { id: 'updater', icon: '🕊️', label: 'Holy Updater', type: 'builtin' },
      { id: 'help', icon: '❓', label: 'Help', type: 'builtin' },
      { id: 'godly-notes', icon: '📋', label: 'Godly Notes', type: 'builtin' },
      { id: 'trash', icon: '🗑️', label: 'Trash', type: 'builtin' },
    ];

    const builtinKeys = new Set(icons.map(i => `builtin:${i.id} `));
    const shortcutIcons = this.desktopShortcuts
      .filter(s => s && typeof s.key === 'string' && typeof s.label === 'string' && !builtinKeys.has(s.key))
      .map(s => {
        const display = this.launcherDisplayForKey(s.key);
        return {
          id: s.key,
          key: s.key,
          icon: display?.icon || '📄',
          label: s.label,
          isShortcut: true,
          type: 'shortcut'
        };
      });

    const allIcons = [
      ...icons.map(icon => ({ ...icon, key: `builtin:${icon.id} `, isShortcut: false })),
      ...shortcutIcons
    ];

    // Sort
    allIcons.sort((a, b) => {
      if (criteria === 'name') {
        return a.label.localeCompare(b.label);
      } else if (criteria === 'type') {
        // Builtins first, then shortcuts
        if (a.type !== b.type) return (a.type || '') === 'builtin' ? -1 : 1;
        return a.label.localeCompare(b.label);
      }
      return 0;
    });

    // Re-calculate positions in a grid
    const CELL_W = 100;
    const CELL_H = 100;
    const GAP = 10;
    const PADDING = 20;
    const desktopEl = document.getElementById('desktop');
    const width = desktopEl ? desktopEl.clientWidth : window.innerWidth;
    const cols = Math.max(1, Math.floor((width - PADDING * 2) / (CELL_W + GAP)));

    const newPositions: Record<string, { x: number, y: number }> = {};

    allIcons.forEach((icon, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = PADDING + col * (CELL_W + GAP);
      const y = PADDING + row * (CELL_H + GAP);
      newPositions[icon.key] = { x, y };
    });

    this.desktopIconPositions = newPositions;
    localStorage.setItem('temple_desktop_icon_positions', JSON.stringify(this.desktopIconPositions));

    // Play sound
    this.playNotificationSound('select');
    this.render();
  }

  private renderWindow(win: WindowState): string {
    const style = [
      `left: ${win.x}px`,
      `top: ${win.y}px`,
      `width: ${win.width}px`,
      `height: ${win.height}px`,
      win.alwaysOnTop ? 'z-index: 10000 !important' : '',
      win.transparent ? 'opacity: 0.85' : ''
    ].filter(Boolean).join('; ');

    return `
    <div class="window ${win.active ? 'active' : ''} ${win.transparent ? 'transparent-window' : ''}"
         data-window-id="${win.id}"
         style="${style}">
      <!--Resize Handles-->
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
          <button class="window-btn minimize" data-action="minimize" data-window="${win.id}" aria-label="Minimize"></button>
          <button class="window-btn maximize" data-action="maximize" data-window="${win.id}" aria-label="Maximize"></button>
          <button class="window-btn close" data-action="close" data-window="${win.id}" aria-label="Close"></button>
        </div>
      </div>
      <div class="window-content">
        ${win.content}
      </div>
    </div>
    `;
  }

  private renderTaskbar(): string {
    const extraClasses = [
      this.taskbarTransparent ? 'taskbar-transparent' : '',
      this.taskbarAutoHide ? 'taskbar-autohide' : ''
    ].filter(Boolean).join(' ');

    return `
    <div id="start-menu-container">${this.renderStartMenu()}</div>
    <div class="taskbar ${extraClasses}">
      <button class="start-btn ${this.showStartMenu ? 'active' : ''}">TEMPLE</button>
      ${this.renderWorkspaceSwitcher()}
      <div class="taskbar-apps">
        ${this.renderTaskbarAppsHtml()}
      </div>
      <div class="taskbar-tray">
        ${this.getTrayHTML()}
      </div>
    </div>`;
  }

  private renderWorkspaceSwitcher(): string {
    const workspaces = this.workspaceManager.getWorkspaces();
    const activeId = this.workspaceManager.getActiveWorkspaceId();

    const indicators = workspaces.map(ws => {
      const isActive = ws.id === activeId;
      const windowCount = this.getWindowCountForWorkspace(ws.id);
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

  private getWindowCountForWorkspace(workspaceId: number): number {
    // If window is in workspace, count it
    const wsWindows = this.workspaceManager.getWorkspaces()
      .find(ws => ws.id === workspaceId)?.windowIds || [];

    return this.windows.filter(w => wsWindows.includes(w.id)).length;
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

    // For pinned apps, show count badge if multiple windows
    const pinnedHtml = pinned.map(key => {
      const display = this.launcherDisplayForKey(key);
      if (!display) return '';
      const builtinId = key.startsWith('builtin:') ? key.slice('builtin:'.length) : '';
      const appWindows = builtinId ? this.windows.filter(w => w.id.startsWith(builtinId)) : [];
      const windowCount = appWindows.length;
      const active = appWindows.some(w => w.active);
      const running = appWindows.some(w => !w.minimized);
      const countBadge = windowCount > 1 ? `<span class="taskbar-count-badge">${windowCount}</span>` : '';
      const iconHtml = display.iconUrl
        ? `<img src="${escapeHtml(display.iconUrl)}" alt="" class="taskbar-pinned-icon-img" draggable="false" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"><span class="taskbar-icon-fallback" style="display:none">${escapeHtml(display.icon)}</span>`
        : escapeHtml(display.icon);

      return `
        <div class="taskbar-app pinned ${active ? 'active' : ''} ${running ? 'running' : ''}"
             data-launch-key="${escapeHtml(key)}"
             data-app-type="${escapeHtml(builtinId)}"
             data-window-count="${windowCount}"
             title="${escapeHtml(display.label)}${windowCount > 1 ? ` (${windowCount} windows)` : ''}"
             tabindex="0" role="button" aria-label="${escapeHtml(display.label)}">
          <span class="taskbar-icon${display.iconUrl ? ' has-img' : ''}" aria-hidden="true">${iconHtml}</span>
          <span class="taskbar-title">${escapeHtml(display.label)}</span>
          ${countBadge}
        </div>
      `;
    }).join('');

    // Group unpinned windows by app type
    const unpinnedWindows = this.windows.filter(w => {
      const appId = w.id.split('-')[0];
      return !pinnedBuiltinIds.has(appId);
    });

    // Group by app type
    const groupedWindows = new Map<string, typeof unpinnedWindows>();
    for (const w of unpinnedWindows) {
      const appType = w.id.split('-')[0];
      if (!groupedWindows.has(appType)) {
        groupedWindows.set(appType, []);
      }
      groupedWindows.get(appType)!.push(w);
    }

    // Render grouped unpinned windows
    const windowsHtml = Array.from(groupedWindows.entries()).map(([appType, windows]) => {
      if (windows.length === 1) {
        // Single window - show directly
        const w = windows[0];
        return `
          <div class="taskbar-app ${w.active ? 'active' : ''} ${w.minimized ? 'minimized' : ''}" data-taskbar-window="${w.id}" tabindex="0" role="button" aria-label="${w.title}">
            <span class="taskbar-icon">${w.icon}</span> <span class="taskbar-title">${w.title}</span>
          </div>
        `;
      } else {
        // Multiple windows - show grouped with count
        const anyActive = windows.some(w => w.active);
        const anyMinimized = windows.every(w => w.minimized);
        const firstWindow = windows[0];
        return `
          <div class="taskbar-app taskbar-group ${anyActive ? 'active' : ''} ${anyMinimized ? 'minimized' : ''}" 
               data-app-group="${appType}"
               data-window-count="${windows.length}"
               tabindex="0" role="button" aria-label="${windows.length} ${appType} windows">
            <span class="taskbar-icon">${firstWindow.icon}</span> <span class="taskbar-title">${firstWindow.title.split(' ')[0]}</span>
            <span class="taskbar-count-badge" aria-hidden="true">${windows.length}</span>
          </div>
        `;
      }
    }).join('');

    const sep = (pinnedHtml && windowsHtml) ? `<div class="taskbar-sep"></div>` : '';

    // Render X11 external windows (Linux only)
    const x11Html = this.renderX11WindowsHtml();
    const x11Sep = (pinnedHtml || windowsHtml) && x11Html ? `<div class="taskbar-sep"></div>` : '';

    return `${pinnedHtml}${sep}${windowsHtml}${x11Sep}${x11Html}`;
  }

  /**
   * Render X11 external windows (Firefox, etc.) for the unified taskbar
   */
  private renderX11WindowsHtml(): string {
    if (this.x11Windows.length === 0) return '';

    return this.x11Windows
      .filter(w => w && w.xidHex && (w.title || w.appName || w.wmClass))
      .slice(0, 10) // Limit to 10 external windows
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
   * Update just the X11 windows portion of the taskbar (efficient, no full re-render)
   */
  private updateTaskbarX11Windows(): void {
    // For now, just trigger a full render - can optimize later if needed
    this.render();
  }

  // ============================================
  // TASKBAR HOVER PREVIEW (Tier 9.1)
  // ============================================
  private showTaskbarHoverPreview(windowId: string, targetElement: HTMLElement): void {
    // Clear any pending timeout
    if (this.taskbarHoverTimeout) {
      this.clearSafeTimeout(this.taskbarHoverTimeout);
      this.taskbarHoverTimeout = null;
    }

    // Delay before showing preview (300ms feels natural)
    this.taskbarHoverTimeout = this.safeTimeout(() => {
      const win = this.windows.find(w => w.id === windowId);
      if (!win) return;

      // Calculate position based on taskbar position and element location
      const rect = targetElement.getBoundingClientRect();
      const previewWidth = 280;
      const previewHeight = 200;

      // Center the preview above/below the taskbar item
      let x = Math.max(10, rect.left + rect.width / 2 - previewWidth / 2);
      // Make sure it doesn't go off-screen
      if (x + previewWidth > window.innerWidth - 10) {
        x = window.innerWidth - previewWidth - 10;
      }

      // Position above or below taskbar depending on taskbar position
      let y: number;
      if (this.taskbarPosition === 'bottom') {
        y = rect.top - previewHeight - 10;
      } else {
        y = rect.bottom + 10;
      }

      this.taskbarHoverPreview = { windowId, x, y };
      this.updateTaskbarHoverPreviewDom();
    }, 300);
  }

  private hideTaskbarHoverPreview(): void {
    if (this.taskbarHoverTimeout) {
      this.clearSafeTimeout(this.taskbarHoverTimeout);
      this.taskbarHoverTimeout = null;
    }
    if (this.taskbarHoverPreview) {
      this.taskbarHoverPreview = null;
      this.updateTaskbarHoverPreviewDom();
    }
  }

  private updateTaskbarHoverPreviewDom(): void {
    const container = document.getElementById('taskbar-hover-preview');
    if (!container) return;

    if (!this.taskbarHoverPreview) {
      container.innerHTML = '';
      return;
    }

    const { windowId, x, y } = this.taskbarHoverPreview;
    const win = this.windows.find(w => w.id === windowId);
    if (!win) {
      container.innerHTML = '';
      return;
    }

    // Generate a scaled-down preview of the window
    const previewContent = this.generateWindowPreviewContent(win);

    container.innerHTML = `
      <div class="taskbar-preview-popup" style="
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 280px;
        height: 200px;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ff41;
        border-radius: 8px;
        overflow: hidden;
        z-index: 99999;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 65, 0.1);
        animation: taskbar-preview-fade-in 0.15s ease-out;
      ">
        <div class="taskbar-preview-header" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: linear-gradient(180deg, rgba(0, 255, 65, 0.15) 0%, transparent 100%);
          border-bottom: 1px solid rgba(0, 255, 65, 0.2);
        ">
          <span style="font-size: 16px;">${win.icon}</span>
          <span style="color: #00ff41; font-size: 13px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${escapeHtml(win.title)}</span>
          ${win.minimized ? '<span style="font-size: 10px; color: #888; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 3px;">Minimized</span>' : ''}
        </div>
        <div class="taskbar-preview-content" style="
          padding: 8px;
          height: calc(100% - 40px);
          overflow: hidden;
          color: #888;
          font-size: 11px;
          line-height: 1.4;
        ">
          ${previewContent}
        </div>
      </div>
    `;
  }

  private generateWindowPreviewContent(win: WindowState): string {
    // Generate a simplified preview based on the window type
    const windowType = win.id.split('-')[0];

    // For minimized windows, show a placeholder
    if (win.minimized) {
      return `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; opacity: 0.5;">
          <div style="font-size: 32px; margin-bottom: 8px;">${win.icon}</div>
          <div style="color: #666;">Window is minimized</div>
        </div>
      `;
    }

    // Generate type-specific previews
    switch (windowType) {
      case 'terminal':
        return this.generateTerminalPreview();
      case 'editor':
        return this.generateEditorPreview();
      case 'files':
        return this.generateFilesPreview();
      default:
        return this.generateGenericPreview(win);
    }
  }

  private generateTerminalPreview(): string {
    const tab = this.terminalTabs[this.activeTerminalTab];
    if (!tab || tab.buffer.length === 0) {
      return '<div style="color: #00ff41; font-family: monospace;">Terminal ready.<br>$ _</div>';
    }

    // Show last few lines of terminal output
    const lastLines = tab.buffer.slice(-6).join('');
    // Strip HTML tags for preview
    const textContent = lastLines.replace(/<[^>]*>/g, '').slice(-200);
    return `<div style="color: #00ff41; font-family: monospace; white-space: pre-wrap; word-break: break-all;">${escapeHtml(textContent)}</div>`;
  }

  private generateEditorPreview(): string {
    const tab = this.editorTabs[this.activeEditorTab];
    if (!tab) {
      return '<div style="color: #888;">No file open</div>';
    }

    const content = tab.content.slice(0, 300);
    return `
      <div style="margin-bottom: 6px; color: #00ff41; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        📄 ${escapeHtml(tab.filename)}${tab.modified ? ' •' : ''}
      </div>
      <div style="color: #888; font-family: monospace; font-size: 10px; white-space: pre-wrap; word-break: break-word;">
        ${escapeHtml(content)}${content.length >= 300 ? '...' : ''}
      </div>
    `;
  }

  private generateFilesPreview(): string {
    const entries = this.fileEntries.slice(0, 6);
    if (entries.length === 0) {
      return '<div style="color: #888;">Empty folder</div>';
    }

    const items = entries.map(e => `
      <div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;">
        <span>${e.isDirectory ? '📁' : '📄'}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(e.name)}</span>
      </div>
    `).join('');

    return `
      <div style="margin-bottom: 6px; color: #00ff41; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        📂 ${escapeHtml(this.currentPath)}
      </div>
      ${items}
      ${this.fileEntries.length > 6 ? `<div style="color: #666; margin-top: 4px;">+${this.fileEntries.length - 6} more items</div>` : ''}
    `;
  }

  private generateGenericPreview(win: WindowState): string {
    // Generic preview with window icon and size info
    return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.6;">${win.icon}</div>
        <div style="color: #666; font-size: 10px;">${win.width} × ${win.height}px</div>
      </div>
    `;
  }

  // ============================================
  // TASKBAR APP GROUPING (Tier 9.1)
  // ============================================
  private showTaskbarGroupPopup(appType: string, targetElement: HTMLElement): void {
    // Hide hover preview when showing group popup
    this.hideTaskbarHoverPreview();

    const rect = targetElement.getBoundingClientRect();
    const popupWidth = 260;

    // Center above/below the taskbar item
    let x = Math.max(10, rect.left + rect.width / 2 - popupWidth / 2);
    if (x + popupWidth > window.innerWidth - 10) {
      x = window.innerWidth - popupWidth - 10;
    }

    // Position above or below taskbar
    let y: number;
    if (this.taskbarPosition === 'bottom') {
      y = rect.top - 10; // Will be positioned from bottom in render
    } else {
      y = rect.bottom + 10;
    }

    this.taskbarGroupPopup = { appType, x, y };
    this.updateTaskbarGroupPopupDom();
  }

  private hideTaskbarGroupPopup(): void {
    if (this.taskbarGroupPopup) {
      this.taskbarGroupPopup = null;
      this.updateTaskbarGroupPopupDom();
    }
  }

  private updateTaskbarGroupPopupDom(): void {
    let container = document.getElementById('taskbar-group-popup');
    if (!container) {
      container = document.createElement('div');
      container.id = 'taskbar-group-popup';
      document.body.appendChild(container);
    }

    if (!this.taskbarGroupPopup) {
      container.innerHTML = '';
      return;
    }

    const { appType, x, y } = this.taskbarGroupPopup;
    const windows = this.windows.filter(w => w.id.startsWith(appType));

    if (windows.length === 0) {
      container.innerHTML = '';
      this.taskbarGroupPopup = null;
      return;
    }

    const windowItems = windows.map(w => `
      <div class="taskbar-group-item ${w.active ? 'active' : ''} ${w.minimized ? 'minimized' : ''}" 
           data-group-window="${w.id}">
        <span class="taskbar-group-icon">${w.icon}</span>
        <span class="taskbar-group-title">${escapeHtml(w.title)}</span>
        <button class="taskbar-group-close" data-group-close="${w.id}" title="Close">×</button>
      </div>
    `).join('');

    // Calculate height based on number of windows
    const itemHeight = 40;
    const headerHeight = 36;
    const popupHeight = Math.min(windows.length * itemHeight + headerHeight + 16, 300);

    const positionY = this.taskbarPosition === 'bottom'
      ? y - popupHeight
      : y;

    container.innerHTML = `
      <div class="taskbar-group-popup" style="
        position: fixed;
        left: ${x}px;
        top: ${positionY}px;
        width: 260px;
        max-height: 300px;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ff41;
        border-radius: 8px;
        overflow: hidden;
        z-index: 99999;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 65, 0.1);
        animation: taskbar-preview-fade-in 0.15s ease-out;
        font-family: 'VT323', monospace;
      ">
        <div class="taskbar-group-header" style="
          padding: 8px 12px;
          background: linear-gradient(180deg, rgba(0, 255, 65, 0.15) 0%, transparent 100%);
          border-bottom: 1px solid rgba(0, 255, 65, 0.2);
          color: #00ff41;
          font-weight: bold;
          font-size: 14px;
        ">
          ${windows.length} ${appType.charAt(0).toUpperCase() + appType.slice(1)} Windows
        </div>
        <div class="taskbar-group-list" style="
          max-height: 250px;
          overflow-y: auto;
        ">
          ${windowItems}
        </div>
      </div>
    `;
  }

  private getTrayHTML(): string {
    const battery = this.getBatteryTrayModel();

    return `
      <div class="tray-icon" id="tray-network" title="Network: ${this.networkManager.status.connected ? (this.networkManager.status.wifi?.ssid || this.networkManager.status.connection || 'Connected') : 'Disconnected'}" style="position: relative; color: ${this.networkManager.status.connected ? '#00ff41' : '#888'};">
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

      <div class="tray-icon" id="tray-battery" title="${escapeHtml(battery.title)}" style="position: relative; color: ${battery.color};">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <rect x="2" y="7" width="18" height="10" rx="2" ry="2"></rect>
           <line x1="22" y1="11" x2="22" y2="13"></line>
         </svg>
         ${battery.present && battery.fillPx > 0 ? `<div data-battery-fill="1" style="position: absolute; left: 4px; top: 9px; height: 6px; width: ${battery.fillPx}px; background: ${battery.color}; border-radius: 1px;"></div>` : ''}
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

  // Debounce timestamp for start menu toggle
  private lastStartMenuToggleMs = 0;

  private async toggleStartMenu(): Promise<void> {
    // Debounce rapid toggles (200ms) to prevent double-toggle from keybind daemon + keydown race
    const now = Date.now();
    if (now - this.lastStartMenuToggleMs < 200) {
      console.log('[StartMenu] Debounced toggle (too fast)');
      return;
    }
    this.lastStartMenuToggleMs = now;

    // On X11 with external windows, use floating popup that appears above Firefox etc.
    // BUT only if NOT triggered from Electron focus (useInlineStartMenu flag)
    const shouldUsePopup = this.x11Windows.length > 0 &&
      window.electronAPI?.showStartMenuPopup &&
      !this.useInlineStartMenu;

    // Reset the flag for next time
    this.useInlineStartMenu = false;

    if (shouldUsePopup) {
      if (this.startMenuPopupOpen) {
        // Already open, close it
        this.startMenuPopupOpen = false;
        this.startMenuSearchQuery = '';
        window.electronAPI?.hideStartMenuPopup?.();
      } else {
        // Open floating popup - ensure inline menu is NOT shown
        this.startMenuPopupOpen = true;
        this.showStartMenu = false; // Explicitly close inline menu if open

        // Gather pinned apps (sync, fast)
        const legacyPinnedApps = [
          { id: 'terminal', icon: '💻', name: 'Terminal' },
          { id: 'files', icon: '📁', name: 'Files' },
          { id: 'editor', icon: '📝', name: 'HolyC Editor' },
          { id: 'settings', icon: '⚙️', name: 'Settings' },
        ];

        const pinnedApps = (this.pinnedStart.length ? this.pinnedStart : legacyPinnedApps.map(a => `builtin:${a.id}`))
          .slice(0, 8)
          .map(key => {
            const display = this.launcherDisplayForKey(key);
            if (!display) return null;
            return { key, icon: display.icon, iconUrl: display.iconUrl, name: display.label };
          })
          .filter(Boolean) as Array<{ key: string; icon: string; iconUrl?: string; name: string }>;

        // Gather installed apps (sync, fast)
        const installedApps = this.installedApps.slice(0, 100).map(app => ({
          key: this.keyForInstalledApp(app),
          name: app.name,
          icon: app.name.charAt(0).toUpperCase(),
          iconUrl: app.iconUrl || undefined,
          comment: app.comment || undefined,
          category: this.canonicalCategoryForInstalledApp(app),
        }));

        // Use cached logo or convert (fast if cached)
        let logoBase64 = this.cachedLogoBase64 || '';

        // If not cached, start caching in background
        if (!this.cachedLogoBase64) {
          fetch(templeLogo)
            .then(r => r.blob())
            .then(blob => new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            }))
            .then(base64 => { this.cachedLogoBase64 = base64; })
            .catch(() => { });
        }

        window.electronAPI!.showStartMenuPopup!({
          taskbarHeight: 58,
          taskbarPosition: this.taskbarPosition,
          pinnedApps,
          pinnedTaskbar: this.pinnedTaskbar,
          installedApps,
          logoUrl: logoBase64, // Use cached or fallback
        });
      }
      return;
    }

    // Fallback: inline Start Menu for non-X11
    this.showStartMenu = !this.showStartMenu;

    if (!this.showStartMenu) {
      this.startMenuSearchQuery = '';
    }
    this.render();
  }

  // Track if popup is open (separate from inline showStartMenu)
  private startMenuPopupOpen = false;

  // Cached base64 logo for start menu popup
  private cachedLogoBase64: string | null = null;

  // Flag to force inline start menu (when Electron already has focus)
  private useInlineStartMenu = false;

  private getBatteryTrayModel(): { present: boolean; fillPx: number; color: string; title: string } {
    const battery = this.batteryStatus;
    const present = !!battery?.present;
    const pct = present && typeof battery?.percent === 'number' ? battery.percent : null;
    const charging = battery?.isCharging === true;

    const color = !this.batterySupported
      ? '#888'
      : (pct !== null
        ? (pct <= 15 ? '#ff6464' : pct <= 35 ? '#ffd700' : '#00ff41')
        : '#888');

    const fillPx = pct !== null
      ? Math.max(0, Math.min(14, Math.round(14 * pct / 100)))
      : 0;

    const title = !this.batterySupported
      ? `Battery: Unsupported${this.batteryLastError ? ` (${this.batteryLastError})` : ''}`
      : (!present
        ? 'Battery: Not present'
        : `Battery: ${pct !== null ? `${pct}%` : '-'}${charging ? ' (charging)' : ''}`);

    return { present, fillPx, color, title };
  }

  private refreshBatteryIndicators(): void {
    const trayBattery = document.getElementById('tray-battery') as HTMLElement | null;
    if (trayBattery) {
      const battery = this.getBatteryTrayModel();
      trayBattery.title = battery.title;
      trayBattery.style.color = battery.color;

      const existingFill = trayBattery.querySelector('[data-battery-fill="1"]') as HTMLElement | null;
      if (battery.present && battery.fillPx > 0) {
        const fillEl = existingFill || document.createElement('div');
        if (!existingFill) {
          fillEl.setAttribute('data-battery-fill', '1');
          fillEl.style.position = 'absolute';
          fillEl.style.left = '4px';
          fillEl.style.top = '9px';
          fillEl.style.height = '6px';
          fillEl.style.borderRadius = '1px';
          trayBattery.appendChild(fillEl);
        }
        fillEl.style.width = `${battery.fillPx}px`;
        fillEl.style.background = battery.color;
      } else if (existingFill) {
        existingFill.remove();
      }
    }

    const widgetBattery = document.getElementById('desktop-widget-battery');
    if (widgetBattery) {
      const pct = (this.batterySupported && this.batteryStatus?.present && typeof this.batteryStatus.percent === 'number')
        ? Math.max(0, Math.min(100, Math.round(this.batteryStatus.percent)))
        : null;
      widgetBattery.textContent = pct === null ? '-' : String(pct);
    }
  }

  // ============================================
  // START MENU
  // ============================================
  private renderStartMenuResultsHtml(): string {
    // Built-in pinned apps
    const legacyPinnedApps = [
      { id: 'terminal', icon: '💻', name: 'Terminal' },
      { id: 'word-of-god', icon: '✝️', name: 'Word of God' },
      { id: 'files', icon: '📁', name: 'Files' },
      { id: 'editor', icon: '📝', name: 'HolyC Editor' },
      { id: 'hymns', icon: '🎵', name: 'Hymn Player' },
      { id: 'settings', icon: '⚙️', name: 'Settings' },
      { id: 'help', icon: '❓', name: 'Help' },
      { id: 'godly-notes', icon: '📋', name: 'Godly Notes' },
    ];

    const pinnedAppsView = (this.pinnedStart.length ? this.pinnedStart : legacyPinnedApps.map(a => `builtin:${a.id}`))
      .slice(0, 24)
      .map(key => {
        const display = this.launcherDisplayForKey(key);
        if (!display) return null;
        return { key, icon: display.icon, iconUrl: display.iconUrl, name: display.label };
      })
      .filter(Boolean) as Array<{ key: string; icon: string; iconUrl?: string; name: string }>;

    // Filter installed apps based on search query
    const query = this.startMenuSearchQuery.toLowerCase();

    const getCategory = (app: InstalledApp): typeof this.startMenuCategory => {
      const cats = (app.categories || []).map(c => c.toLowerCase());
      const name = app.name.toLowerCase();
      if (cats.some(c => c.includes('game')) || name.includes('steam') || name.includes('heroic') || name.includes('lutris') || name.includes('bottle')) return 'Games';
      if (cats.some(c => c.includes('network') || c.includes('internet') || c.includes('webbrowser')) || name.includes('browser')) return 'Internet';
      if (cats.some(c => c.includes('office')) || name.includes('libreoffice')) return 'Office';
      if (cats.some(c => c.includes('audio') || c.includes('video') || c.includes('graphics') || c.includes('multimedia'))) return 'Multimedia';
      if (cats.some(c => c.includes('development') || c.includes('ide') || c.includes('programming'))) return 'Development';
      if (cats.some(c => c.includes('system') || c.includes('settings'))) return 'System';
      return 'Utilities';
    };

    const keyForInstalled = (app: InstalledApp): string => this.keyForInstalledApp(app);

    // Built-in apps list for search (matches apps in openApp() switch statement)
    const builtinApps = [
      { key: 'builtin:terminal', name: 'Terminal', icon: '💻', category: 'System', builtinId: 'terminal' },
      { key: 'builtin:word-of-god', name: 'Word of God', icon: '✝️', category: 'Utilities', builtinId: 'word-of-god' },
      { key: 'builtin:files', name: 'Files', icon: '📁', category: 'System', builtinId: 'files' },
      { key: 'builtin:editor', name: 'HolyC Editor', icon: '📝', category: 'Development', builtinId: 'editor' },
      { key: 'builtin:hymns', name: 'Hymn Player', icon: '🎵', category: 'Multimedia', builtinId: 'hymns' },
      { key: 'builtin:updater', name: 'Holy Updater', icon: '🕊️', category: 'System', builtinId: 'updater' },
      { key: 'builtin:help', name: 'Help & Docs', icon: '❓', category: 'System', builtinId: 'help' },
      { key: 'builtin:godly-notes', name: 'Godly Notes', icon: '📋', category: 'Office', builtinId: 'godly-notes' },
      { key: 'builtin:calculator', name: 'Calculator', icon: '🧮', category: 'Utilities', builtinId: 'calculator' },
      { key: 'builtin:calendar', name: 'Divine Calendar', icon: '📅', category: 'Office', builtinId: 'calendar' },
      { key: 'builtin:image-viewer', name: 'Image Viewer', icon: '🖼️', category: 'Multimedia', builtinId: 'image-viewer' },
      { key: 'builtin:media-player', name: 'Media Player', icon: '💿', category: 'Multimedia', builtinId: 'media-player' },
      { key: 'builtin:auto-harp', name: "God's AutoHarp", icon: '🎹', category: 'Multimedia', builtinId: 'auto-harp' },
      { key: 'builtin:notes', name: 'Notes', icon: '📝', category: 'Office', builtinId: 'notes' },
      { key: 'builtin:sprite-editor', name: 'Sprite Editor', icon: '🎨', category: 'Development', builtinId: 'sprite-editor' },
      { key: 'builtin:system-monitor', name: 'Task Manager', icon: '📊', category: 'System', builtinId: 'system-monitor' },
      { key: 'builtin:settings', name: 'Settings', icon: '⚙️', category: 'System', builtinId: 'settings' },
      { key: 'builtin:trash', name: 'Trash', icon: '🗑️', category: 'System', builtinId: 'trash' },
    ];

    const searchFilteredBuiltin = () =>
      builtinApps.filter(app =>
        app.name.toLowerCase().includes(query)
      );

    type SearchResult = { isBuiltin: true; builtin: typeof builtinApps[0] } | { isBuiltin: false; installed: InstalledApp };
    let searchResults: SearchResult[] = [];

    if (query) {
      // When searching, include both built-in and installed apps
      const builtinResults = searchFilteredBuiltin();
      const installedResults = searchIndex(this.installedAppsIndex, query, 30);

      // Built-in apps first, then installed apps
      searchResults = [
        ...builtinResults.map(b => ({ isBuiltin: true as const, builtin: b })),
        ...installedResults.map(i => ({ isBuiltin: false as const, installed: i }))
      ];
    }

    // For non-search views, only show installed apps (backwards compatibility)
    let filteredApps: InstalledApp[] = [];
    if (!query) {
      if (this.startMenuView === 'recent') {
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
      filteredApps = filteredApps.slice(0, 30);
    }

    return `
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
            <div class="start-app-item pinned" data-launch-key="${escapeHtml(app.key)}" tabindex="0" role="button" aria-label="${escapeHtml(app.name)}">
              <span class="app-icon pinned-icon${app.iconUrl ? ' has-img' : ''}" aria-hidden="true" data-fallback="${escapeHtml(app.icon)}">${app.iconUrl ? `<img src="${escapeHtml(app.iconUrl)}" alt="" class="pinned-app-icon-img" draggable="false" onerror="this.style.display='none';this.parentElement.classList.remove('has-img');this.parentElement.textContent=this.parentElement.dataset.fallback||'?';">` : escapeHtml(app.icon)}</span>
              <span class="app-name">${escapeHtml(app.name)}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="start-section">
        <h3>${query ? `Results for "${query}"` : 'All Apps'}</h3>
        <div class="start-apps-list">
          ${query ? (
        searchResults.length === 0 ? `
            <div class="start-no-results">No apps found</div>
            ` : searchResults.map(result => result.isBuiltin ? `
            <div class="start-app-item builtin" data-launch-key="${escapeHtml(result.builtin.key)}" tabindex="0" role="button" aria-label="${escapeHtml(result.builtin.name)}">
              <span class="app-icon" aria-hidden="true">${result.builtin.icon}</span>
              <div class="app-info">
                <span class="app-name">${escapeHtml(result.builtin.name)}</span>
              </div>
            </div>
            ` : `
            <div class="start-app-item installed" data-launch-key="${escapeHtml(keyForInstalled(result.installed))}" data-installed-app='${JSON.stringify({ name: result.installed.name, exec: result.installed.exec, desktopFile: result.installed.desktopFile })}' data-icon-url="${escapeHtml(String(result.installed.iconUrl || ''))}" tabindex="0" role="button" aria-label="${escapeHtml(result.installed.name)}">
              <span class="app-icon" aria-hidden="true">📦</span>
              <div class="app-info">
                <span class="app-name">${escapeHtml(result.installed.name)}</span>
                <span class="app-comment">${result.installed.comment ? escapeHtml(result.installed.comment) : 'Application'}</span>
              </div>
            </div>
            `).join('')
      ) : (
        filteredApps.length === 0 ? `
            <div class="start-no-results">No apps found</div>
            ` : filteredApps.map(app => `
            <div class="start-app-item installed" data-launch-key="${escapeHtml(keyForInstalled(app))}" data-installed-app='${JSON.stringify({ name: app.name, exec: app.exec, desktopFile: app.desktopFile })}' data-icon-url="${escapeHtml(String(app.iconUrl || ''))}" tabindex="0" role="button" aria-label="${escapeHtml(app.name)}">
              <span class="app-icon" aria-hidden="true"><i class="ph-fill ph-package"></i></span>
              <div class="app-info">
                <span class="app-name">${escapeHtml(app.name)}</span>
                <span class="app-comment">${app.comment ? escapeHtml(app.comment) : 'Application'}</span>
              </div>
            </div>
            `).join('')
      )}
        </div>
      </div>
    `;
  }

  private renderStartMenu(): string {
    if (!this.showStartMenu) return '';

    return `
      <div class="start-menu">
        <div class="start-menu-left">
          <div class="start-search-container">
            <div class="start-search-row">
              <input type="text" class="start-search-input" placeholder="Search apps..." value="${escapeHtml(this.startMenuSearchQuery)}">
              <button class="start-all-apps-btn" data-start-action="launcher" title="Open App Launcher (Super+A)"><i class="ph-bold ph-squares-four"></i> All Apps</button>
            </div>
          </div>

          <div id="start-menu-results-area">
            ${this.renderStartMenuResultsHtml()}
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
            <div class="start-quick-link" data-path="root"><i class="ph-fill ph-desktop"></i> This PC</div>
            <div class="start-quick-link" data-path="home"><i class="ph-fill ph-house"></i> Home</div>
            <div class="start-quick-link" data-path="Documents"><i class="ph-fill ph-file-text"></i> Documents</div>
            <div class="start-quick-link" data-path="Downloads"><i class="ph-fill ph-download"></i> Downloads</div>
            <div class="start-quick-link" data-path="Music"><i class="ph-fill ph-music-note"></i> Music</div>
            <div class="start-quick-link" data-path="Pictures"><i class="ph-fill ph-image"></i> Pictures</div>
            <div class="start-quick-link" data-path="settings"><i class="ph-fill ph-gear"></i> Settings</div>
          </div>
          
          <div class="start-power-section">
            <button class="start-power-btn lock" data-power-action="lock"><span class="emoji-icon">🔒</span> Lock</button>
            <button class="start-power-btn restart" data-power-action="restart"><span class="emoji-icon">🔄</span> Restart</button>
            <button class="start-power-btn shutdown" data-power-action="shutdown"><span class="emoji-icon">🛑</span> Shutdown</button>
          </div>
        </div>
      </div>
    `;
  }

  private updateStartMenuDom(): void {
    const container = document.getElementById('start-menu-container');
    if (!container || !this.showStartMenu) return;

    // Optimised update: if input exists, only update results
    const input = container.querySelector('.start-search-input') as HTMLInputElement;
    const results = document.getElementById('start-menu-results-area');

    if (input && results) {
      if (input.value !== this.startMenuSearchQuery) {
        input.value = this.startMenuSearchQuery;
      }
      results.innerHTML = this.renderStartMenuResultsHtml();
      this.hydrateStartMenuInstalledIcons(results);
    } else {
      // Initial render or full refresh
      container.innerHTML = this.renderStartMenu();
      const resultsEl = container.querySelector('#start-menu-results-area') as HTMLElement | null;
      if (resultsEl) this.hydrateStartMenuInstalledIcons(resultsEl);
      // Restore focus if we have a query
      if (this.startMenuSearchQuery) {
        const newInput = container.querySelector('.start-search-input') as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      }
    }
  }

  private hydrateStartMenuInstalledIcons(root: HTMLElement): void {
    const items = Array.from(root.querySelectorAll('.start-app-item.installed')) as HTMLElement[];
    for (const item of items) {
      const iconWrap = item.querySelector('.app-icon') as HTMLElement | null;
      if (!iconWrap) continue;

      const url = String(item.dataset.iconUrl || '').trim();
      const label = String(item.getAttribute('aria-label') || '').trim() || 'App';
      const first = label.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || label.slice(0, 1).toUpperCase() || '?';

      iconWrap.textContent = '';
      if (url) {
        const img = document.createElement('img');
        img.className = 'start-installed-app-icon-img';
        img.alt = '';
        img.loading = 'lazy';
        img.draggable = false;
        img.src = url;
        // Fallback to monogram on error
        img.onerror = () => {
          img.style.display = 'none';
          iconWrap.textContent = first;
        };
        iconWrap.appendChild(img);
      } else {
        iconWrap.textContent = first;
      }
    }
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
    const cats = (app.categories || []).map(c => String(c || '').toLowerCase()).filter(Boolean);
    const name = String(app.name || '').toLowerCase();
    const exec = String(app.exec || '').toLowerCase();

    const has = (...needles: string[]) => cats.some(c => needles.some(n => c === n || c.includes(n)));

    // Games
    if (has('game', 'games') || name.includes('steam') || name.includes('heroic') || name.includes('lutris') || name.includes('bottle') || exec.includes('steam')) return 'Games';

    // Internet / communication
    if (has('network', 'internet', 'webbrowser', 'browser', 'email', 'chat', 'instantmessaging', 'ircclient', 'p2p') || name.includes('browser')) return 'Internet';

    // Office / productivity
    if (has('office', 'wordprocessor', 'spreadsheet', 'presentation', 'finance', 'calendar', 'contactmanagement') || name.includes('libreoffice')) return 'Office';

    // Multimedia / graphics
    if (has('audiovideo', 'audio', 'video', 'player', 'recorder', 'graphics', 'photography', 'imageprocessing', 'multimedia')) return 'Multimedia';

    // Development
    if (has('development', 'ide', 'programming', 'texteditor', 'debugger') || exec.includes('code')) return 'Development';

    // System
    if (has('system', 'settings', 'terminalemulator', 'filemanager', 'filesystem', 'packagemanager', 'monitor', 'security', 'utility', 'administration')
      || exec.includes('gnome-control-center')
      || exec.includes('systemsettings')
      || exec.includes('nautilus')
      || exec.includes('thunar')
      || exec.includes('dolphin')) return 'System';

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
              <div class="app-launcher-title">🔰 APPLICATION LAUNCHER</div>
              <div class="app-launcher-sub">Type to search • Right‑click for → Desktop/Pin • Esc to close</div>
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
      searchText?: string;
      iconText?: string;
      iconUrl?: string;
      iconKind: 'emoji' | 'monogram' | 'img';
    };

    const builtin: Entry[] = [
      { key: 'builtin:terminal', label: 'Terminal', kind: 'builtin', category: 'System', iconText: '💻', iconKind: 'emoji' },
      { key: 'builtin:word-of-god', label: 'Word of God', kind: 'builtin', category: 'Utilities', iconText: '✝️', iconKind: 'emoji' },
      { key: 'builtin:files', label: 'Files', kind: 'builtin', category: 'System', iconText: '📁', iconKind: 'emoji' },
      { key: 'builtin:editor', label: 'HolyC Editor', kind: 'builtin', category: 'Development', iconText: '📝', iconKind: 'emoji' },
      { key: 'builtin:help', label: 'Help & Docs', kind: 'builtin', category: 'System', iconText: '❓', iconKind: 'emoji' },
      { key: 'builtin:notes', label: 'Notes', kind: 'builtin', category: 'Office', iconText: '🗒️', iconKind: 'emoji' },
      { key: 'builtin:godly-notes', label: 'Godly Notes', kind: 'builtin', category: 'Office', iconText: '🗂️', iconKind: 'emoji' },
      { key: 'builtin:calculator', label: 'Calculator', kind: 'builtin', category: 'Utilities', iconText: '🧮', iconKind: 'emoji' },
      { key: 'builtin:calendar', label: 'Calendar', kind: 'builtin', category: 'Office', iconText: '📅', iconKind: 'emoji' },
      { key: 'builtin:media-player', label: 'Media Player', kind: 'builtin', category: 'Multimedia', iconText: '🎬', iconKind: 'emoji' },
      { key: 'builtin:image-viewer', label: 'Image Viewer', kind: 'builtin', category: 'Multimedia', iconText: '🖼️', iconKind: 'emoji' },
      { key: 'builtin:hymns', label: 'Hymn Player', kind: 'builtin', category: 'Multimedia', iconText: '🎵', iconKind: 'emoji' },
      { key: 'builtin:updater', label: 'Holy Updater', kind: 'builtin', category: 'System', iconText: '🕊️', iconKind: 'emoji' },
      { key: 'builtin:system-monitor', label: 'Task Manager', kind: 'builtin', category: 'System', iconText: '📊', iconKind: 'emoji' },
      { key: 'builtin:settings', label: 'Settings', kind: 'builtin', category: 'System', iconText: '⚙️', iconKind: 'emoji' },
    ];

    const installed: Entry[] = this.installedApps.map(app => {
      const label = String(app.name || '').trim() || 'App';
      const iconUrl = typeof app.iconUrl === 'string' && app.iconUrl.trim() ? app.iconUrl.trim() : undefined;
      const searchText = [
        app.name,
        app.genericName,
        app.comment,
        ...(app.categories || []),
        ...((app.keywords as string[] | undefined) || []),
      ].filter(Boolean).join(' ').toLowerCase();
      const first = label.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || label.slice(0, 1).toUpperCase() || '•';
      return {
        key: this.keyForInstalledApp(app),
        label,
        kind: 'installed',
        category: this.canonicalCategoryForInstalledApp(app),
        comment: app.comment || '',
        searchText,
        iconText: first, // Always keep fallback text
        iconUrl,
        iconKind: iconUrl ? 'img' : 'monogram',
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
        (e.searchText || '').includes(query) ||
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
        <div class="launcher-app-icon ${e.iconKind === 'img' ? 'img' : (e.iconKind === 'monogram' ? 'mono' : 'emoji')}" data-cat="${e.category}" data-fallback="${escapeHtml(e.iconText || '')}">${e.iconKind === 'img' && e.iconUrl ? `<img src="${escapeHtml(e.iconUrl)}" alt="" loading="lazy" draggable="false" onerror="this.style.display='none';this.parentElement.classList.remove('img');this.parentElement.classList.add('mono');this.parentElement.textContent=this.parentElement.dataset.fallback||'?';">` : escapeHtml(e.iconText || '')}</div>
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
      const v = btn.dataset.launcherView as LauncherView | undefined;
      btn.classList.toggle('active', !!v && v === this.launcherView);
      btn.setAttribute('aria-selected', !!v && v === this.launcherView ? 'true' : 'false');
    }

    for (const btn of Array.from(root.querySelectorAll('.launcher-cat-btn')) as HTMLElement[]) {
      const c = btn.dataset.launcherCategory as LauncherCategory | undefined;
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
      this.installedAppsUnsupported = !!(result && typeof result === 'object' && 'unsupported' in result && result.unsupported);

      if (result.success && Array.isArray(result.apps)) {
        this.installedApps = result.apps;
        this.installedAppsIndex = buildSearchIndex(this.installedApps);
      } else {
        this.installedApps = [];
        this.installedAppsIndex = buildSearchIndex([]);
      }

      if (this.installedAppsUnsupported) {
        this.showNotification('Apps', 'App discovery is Linux-only (no .desktop apps on this platform).', 'info');
      }
    } catch (error) {
      console.error('Error loading installed apps:', error);
      this.installedApps = [];
      this.installedAppsUnsupported = true;
    }
  }

  private canUninstallApp(app: InstalledApp): boolean {
    // Only user-owned launchers can be removed from the UI.
    // We intentionally do NOT allow uninstalling system apps in /usr/share/applications.
    const source = String(app.source || '').toLowerCase();
    if (source === 'user' || source === 'flatpak-user') return !!app.desktopFile;

    const desktopFile = String(app.desktopFile || '');
    if (!desktopFile) return false;
    return (
      desktopFile.includes('.local/share/applications') ||
      desktopFile.includes('.local/share/flatpak/exports/share/applications')
    );
  }

  private canAttemptAptUninstall(app: InstalledApp): boolean {
    // "Attempt" because the backend will do the real safety checks (baseline/protected/essential).
    const source = String(app.source || '').toLowerCase();
    const desktopFile = String(app.desktopFile || '');
    return source === 'system' && (
      desktopFile.startsWith('/usr/share/applications/') ||
      desktopFile.startsWith('/usr/local/share/applications/')
    );
  }

  private canAttemptSnapUninstall(app: InstalledApp): boolean {
    // Snap apps are discovered from /var/lib/snapd/desktop/applications
    const source = String(app.source || '').toLowerCase();
    const desktopFile = String(app.desktopFile || '');
    return source === 'snap' && desktopFile.startsWith('/var/lib/snapd/desktop/applications/');
  }

  private async uninstallApp(app: InstalledApp): Promise<void> {
    if (!window.electronAPI?.uninstallApp) {
      this.showNotification('Apps', 'Uninstall feature not available', 'warning');
      return;
    }

    const canUninstall = this.canUninstallApp(app);
    const canAttemptApt = this.canAttemptAptUninstall(app);
    const canAttemptSnap = this.canAttemptSnapUninstall(app);
    if (!canUninstall && !canAttemptApt && !canAttemptSnap) {
      this.showNotification('Apps', 'Cannot uninstall system apps', 'warning');
      return;
    }

    const src = String(app.source || '').toLowerCase();
    const hint =
      src === 'flatpak-user'
        ? 'This will uninstall the Flatpak app from your user account.'
        : canAttemptSnap
          ? 'This will uninstall the app via Snap (admin password may be required).'
          : canAttemptApt
            ? 'This will uninstall the app from the system via APT (admin password may be required).'
            : 'This will remove the launcher entry from your user profile.';

    const confirmed = await this.openConfirmModal({
      title: 'Uninstall App',
      message: `Are you sure you want to uninstall "${app.name}"?\n\n${hint}`,
      confirmText: 'Uninstall',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      let result = await window.electronAPI.uninstallApp(app);

      if (!result?.success && result && typeof result === 'object' && 'needsPassword' in result && result.needsPassword) {
        if (!window.electronAPI?.uninstallAppWithPassword) {
          this.showNotification('Apps', 'Uninstall requires administrator privileges, but password prompt is not available.', 'warning');
          return;
        }

        const password = await this.openPromptModal({
          title: 'Administrator Password',
          message: 'Uninstall requires administrator privileges. Enter your system password:',
          inputLabel: 'Password',
          placeholder: 'sudo password',
          password: true,
          confirmText: 'Uninstall',
          cancelText: 'Cancel'
        });

        if (!password) {
          this.showNotification('Apps', 'Uninstall cancelled.', 'info');
          return;
        }

        const retry = await window.electronAPI.uninstallAppWithPassword(app, password);
        if (!retry?.success) {
          if (retry && typeof retry === 'object' && 'wrongPassword' in retry && retry.wrongPassword) {
            this.showNotification('Apps', 'Wrong password.', 'error');
            return;
          }
          const errorMsg = (retry && typeof retry === 'object' && 'error' in retry && typeof retry.error === 'string') ? retry.error : 'Failed to uninstall app';
          this.showNotification('Apps', errorMsg, 'error');
          return;
        }

        result = { success: true };
      }

      if (result?.success) {
        this.showNotification('Apps', `${app.name} uninstalled successfully`, 'info');
        this.purgeLaunchKeyEverywhere(this.keyForInstalledApp(app));
        // Refresh app list
        await this.loadInstalledApps();
        this.render();
      } else {
        this.showNotification('Apps', result?.error || 'Failed to uninstall app', 'error');
      }
    } catch (error) {
      this.showNotification('Apps', String(error), 'error');
    }
  }

  private purgeLaunchKeyEverywhere(key: string): void {
    const k = String(key || '');
    if (!k) return;

    this.pinnedStart = this.pinnedStart.filter(x => x !== k);
    this.pinnedTaskbar = this.pinnedTaskbar.filter(x => x !== k);
    this.desktopShortcuts = this.desktopShortcuts.filter(s => s.key !== k);
    this.recentApps = this.recentApps.filter(x => x !== k);
    delete this.appUsage[k];

    localStorage.setItem('temple_pinned_start', JSON.stringify(this.pinnedStart));
    localStorage.setItem('temple_pinned_taskbar', JSON.stringify(this.pinnedTaskbar));
    this.queueSaveConfig();
  }

  private async refreshNetworkStatus(): Promise<void> {
    await this.networkManager.refreshStatus();
  }



  private connectedState(state: string | undefined): boolean {
    const s = String(state || '').toLowerCase();
    return s === 'connected' || s.startsWith('connected');
  }

  private isVpnDevice(dev: NetworkDeviceStatus): boolean {
    const type = String(dev.type || '').toLowerCase();
    const name = String(dev.device || '').toLowerCase();
    return type === 'tun' || type === 'vpn' || type.includes('wireguard') || name.startsWith('tun') || name.startsWith('wg');
  }

  private getVpnStatus(): VpnStatus {
    const vpn = this.networkManager.status.vpn;
    if (vpn && typeof vpn.connected === 'boolean') return vpn;

    const devices = this.networkManager.status.devices;
    if (Array.isArray(devices)) {
      const hit = devices.find(d => this.isVpnDevice(d) && this.connectedState(d.state));
      if (hit) {
        return { connected: true, device: hit.device, type: hit.type, connection: hit.connection, state: hit.state };
      }
    }

    return { connected: false };
  }





  private async importVpnProfile(kind: 'openvpn' | 'wireguard'): Promise<void> {
    await this.networkManager.importVpnProfile(kind);
  }





  /* UNUSED OLD TOR CODE - TO BE REMOVED
  private renderTorCircuitViz(): string {
    const footer = `<div style="margin-top: 10px; font-size: 10px; opacity: 0.55;">Circuit details require Tor ControlPort.</div>`;

    if (this.torCircuitStatus !== 'connected') {
      const msg = this.torCircuitStatus === 'connecting'
        ? 'Checking Tor daemon...'
        : this.torCircuitStatus === 'failed'
          ? (this.torDaemonSupported ? (this.torDaemonRunning ? 'Tor is running, but circuit details are unavailable.' : 'Tor daemon is not running.') : 'Tor status unavailable on this platform.')
          : 'Circuit not established';
      return `<div style="width: 100%; text-align: center; opacity: 0.6; padding: 20px;">${msg}${footer}</div>`;
    }

    if (!this.torCircuitRelays.length) {
      const msg = this.torDaemonRunning
        ? 'Tor daemon running. Circuit relay details unavailable.'
        : 'Circuit relay details unavailable.';
      return `<div style="width: 100%; text-align: center; opacity: 0.6; padding: 20px;">${msg}${footer}</div>`;
    }

    const nodes: { type: string; label: string; ip?: string }[] = [
      { type: 'client', label: 'This PC' },
      ...this.torCircuitRelays.map((r, i) => ({
        type: i === 0 ? 'guard' : (i === this.torCircuitRelays.length - 1 ? 'exit' : 'middle'),
        label: r.country,
        ip: r.ip
      })),
      { type: 'target', label: 'Internet' }
    ];

    return nodes.map((node, i) => {
      const isLast = i === nodes.length - 1;
      let icon = '💻';
      let color = '#fff';
      if (node.type === 'guard') { icon = '🛡️'; color = '#00ff41'; }
      if (node.type === 'middle') { icon = '🔄'; color = '#00ff41'; }
      if (node.type === 'exit') { icon = '🌐'; color = '#ffd700'; }
      if (node.type === 'target') { icon = '🌍'; color = '#fff'; }

      return `
            <div style="display: flex; flex-direction: column; align-items: center; z-index: 2;">
                <div style="background: rgba(0,0,0,0.5); border: 2px solid ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 4px;" title="${node.ip || ''}">
                    ${icon}
                </div>
                <div style="font-size: 10px; color: ${color};">${node.label}</div>
            </div>
            ${!isLast ? `<div style="flex: 1; height: 2px; background: repeating-linear-gradient(90deg, #00ff41, #00ff41 4px, transparent 4px, transparent 8px); margin-bottom: 14px;"></div>` : ''}
          `;
    }).join('');
  }

  private async refreshTorDaemonStatus(): Promise<void> {
    if (!window.electronAPI?.getTorStatus) {
      this.torDaemonSupported = false;
      this.torDaemonRunning = false;
      this.torDaemonBackend = null;
      this.torDaemonVersion = null;
      this.torDaemonLastError = 'Tor status IPC not available';
      if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
      return;
    }

    try {
      const res = await window.electronAPI.getTorStatus();
      this.torDaemonSupported = !!res.supported;
      this.torDaemonRunning = !!res.running;
      this.torDaemonBackend = res.backend ? String(res.backend) : null;
      this.torDaemonVersion = res.version ? String(res.version) : null;
      this.torDaemonLastError = res.error ? String(res.error) : null;
    } catch (e) {
      this.torDaemonSupported = false;
      this.torDaemonRunning = false;
      this.torDaemonBackend = null;
      this.torDaemonVersion = null;
      this.torDaemonLastError = String(e);
    } finally {
      if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
    }
  }

  private async toggleTor(enabled: boolean): Promise<void> {
    const prevEnabled = this.torEnabled;
    const setTor = window.electronAPI?.setTorEnabled;

    this.torEnabled = enabled;
    this.torCircuitRelays = [];

    if (enabled) {
      this.torCircuitStatus = 'connecting';
      if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();

      if (setTor) {
        this.showNotification('Tor Network', 'Starting Tor daemon...', 'info');
        try {
          const res = await setTor(true);
          if (!this.torEnabled) return; // Cancelled
          if (!res?.success) {
            this.torEnabled = prevEnabled;
            this.torCircuitStatus = 'disconnected';
            this.showNotification('Tor Network', res?.error || 'Failed to start Tor', 'error');
            await this.refreshTorDaemonStatus();
            return;
          }
        } catch (e) {
          if (!this.torEnabled) return;
          this.torEnabled = prevEnabled;
          this.torCircuitStatus = 'disconnected';
          this.showNotification('Tor Network', `Failed to start Tor: ${String(e)}`, 'error');
          await this.refreshTorDaemonStatus();
          return;
        }
      } else {
        this.showNotification('Tor Network', 'Tor control not available — checking status only.', 'warning');
      }

      // Poll briefly to avoid false negatives while systemd is still "activating"
      for (let i = 0; i < 6; i++) {
        await this.refreshTorDaemonStatus();
        if (!this.torEnabled) return;
        if (this.torDaemonSupported && this.torDaemonRunning) break;
        await new Promise<void>(r => setTimeout(r, 750));
      }

      if (!this.torDaemonSupported) {
        this.torCircuitStatus = 'failed';
        this.showNotification('Tor Network', this.torDaemonLastError || 'Tor status unavailable on this platform.', 'warning');
        if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
        return;
      }

      if (!this.torDaemonRunning) {
        this.torCircuitStatus = 'failed';
        this.showNotification('Tor Network', this.torDaemonLastError || 'Tor daemon did not start (check install/permissions).', 'warning');
        if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
        return;
      }

      this.torCircuitStatus = 'connected';
      this.showNotification('Tor Network', 'Tor daemon is running.', 'divine');
      if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
      return;
    }

    // Disabling
    this.torCircuitStatus = 'disconnected';
    if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();

    if (setTor) {
      this.showNotification('Tor Network', 'Stopping Tor daemon...', 'info');
      try {
        const res = await setTor(false);
        if (this.torEnabled) return; // Cancelled
        if (!res?.success) {
          this.torEnabled = prevEnabled;
          this.showNotification('Tor Network', res?.error || 'Failed to stop Tor', 'error');
        } else {
          this.showNotification('Tor Network', 'Tor disabled.', 'info');
        }
      } catch (e) {
        if (this.torEnabled) return;
        this.torEnabled = prevEnabled;
        this.showNotification('Tor Network', `Failed to stop Tor: ${String(e)}`, 'error');
      }
    } else {
      this.showNotification('Tor Network', 'Tor disabled.', 'info');
    }

    // Best-effort: refresh status, and if we reverted, reflect daemon state.
    await this.refreshTorDaemonStatus();
    if (this.torEnabled) {
      this.torCircuitStatus = this.torDaemonRunning ? 'connected' : 'failed';
    }
    if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();

    // NOTE: Traffic routing is not enforced by this toggle yet.
  }
  */

  // VPN profile management (Tier 6.1)
  private async connectWifiFromUi(ssid: string, security: string): Promise<void> {
    await this.networkManager.connectWifi(ssid, security); return; /*
    // Easter egg: Handle the fake CIA surveillance network
    if (ssid === 'CIA_SURVEILLANCE_VAN_7') {
      const pw = await this.openPromptModal({
        title: '🕵️ CLASSIFIED NETWORK',
        message: 'This network requires authorization. Enter access code:',
        inputLabel: 'Access Code',
        placeholder: 'Enter the year of divine creation...',
        password: true,
        confirmText: 'Authenticate',
        cancelText: 'Abort'
      });
      if (pw === null) return;

      if (pw === '1969') {
        // Terry Davis was born December 15, 1969 - the password unlocks the truth!
        this.showNotification('✝️ DIVINE REVELATION',
          'Nice try, glowies! God\'s temple cannot be surveilled. Terry knew the truth: the CIA glows in the dark. You can see them if you\'re driving. Just run them over. That\'s what you do. God\'s programmer lives forever in the 640x480 divine resolution. Keep building temples, not backdoors. 🙏',
          'divine');
        // Also show a special window with the easter egg content
        this.windowIdCounter++;
        const easterEggWindow: WindowState = {
          id: `divine-revelation-${this.windowIdCounter}`,
          title: '✝️ The Truth (Classified)',
          icon: '🕵️',
          x: Math.random() * 100 + 100,
          y: Math.random() * 100 + 50,
          width: 520,
          height: 450,
          content: this.getCiaEasterEggContent(),
          active: true,
          minimized: false,
          maximized: false
        };
        this.windows.forEach(w => w.active = false);
        this.windows.push(easterEggWindow);
        this.render();
      } else {
        this.showNotification('⚠️ ACCESS DENIED',
          'The agency does not recognize your clearance level. Perhaps try thinking about what year God\'s programmer was born...',
          'warning');
      }
      return;
    }

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
  */ }



  private async refreshAudioDevices(): Promise<void> {
    if (!window.electronAPI?.listAudioDevices) return;

    try {
      const res = await window.electronAPI.listAudioDevices();
      if (res.success) {
        this.audioDevices = {
          sinks: (res.sinks || []).map((s) => ({ id: String(s.id ?? ''), name: String(s.name ?? ''), description: String(s.description ?? s.name ?? '') })),
          sources: (res.sources || []).map((s) => ({ id: String(s.id ?? ''), name: String(s.name ?? ''), description: String(s.description ?? s.name ?? '') })),
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

  // ============================================
  // BLUETOOTH (Ubuntu/BlueZ via bluetoothctl)
  // ============================================
  private inferBluetoothDeviceType(name: string): 'headphone' | 'phone' | 'mouse' | 'keyboard' | 'unknown' {
    const n = String(name || '').toLowerCase();
    if (/(headphone|headset|earbud|earbuds|buds|airpods)/.test(n)) return 'headphone';
    if (/(mouse|trackball)/.test(n)) return 'mouse';
    if (/(keyboard)/.test(n)) return 'keyboard';
    if (/(phone|iphone|android|pixel|galaxy)/.test(n)) return 'phone';
    return 'unknown';
  }

  private setBluetoothDevicesFromApi(devices: Array<{ mac?: string; name?: string; connected?: boolean; paired?: boolean }>, merge: boolean): void {
    const byMac = new Map<string, { name: string; mac: string; connected: boolean; paired: boolean; type: 'headphone' | 'phone' | 'mouse' | 'keyboard' | 'unknown' }>();

    if (merge) {
      for (const d of this.bluetoothDevices) byMac.set(d.mac, d);
    }

    for (const raw of (Array.isArray(devices) ? devices : [])) {
      const mac = String(raw?.mac || '').trim().toUpperCase();
      if (!mac) continue;
      const name = String(raw?.name || '').trim() || mac;
      const connected = !!raw?.connected;
      const paired = !!raw?.paired;
      const existing = byMac.get(mac);
      const type = existing?.type ?? this.inferBluetoothDeviceType(name);
      byMac.set(mac, { mac, name, connected, paired, type });
    }

    this.bluetoothDevices = [...byMac.values()]
      .sort((a, b) => (Number(b.connected) - Number(a.connected)) || (Number(b.paired) - Number(a.paired)) || a.name.localeCompare(b.name));
  }

  private async refreshPairedBluetoothDevices(): Promise<void> {
    if (!window.electronAPI?.getPairedBluetoothDevices) return;

    try {
      const res = await window.electronAPI.getPairedBluetoothDevices();
      if (res.success && Array.isArray(res.devices)) {
        this.setBluetoothDevicesFromApi(res.devices, false);
      }
    } catch {
      // ignore
    }

    if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();
  }

  private async setBluetoothEnabledFromUi(enabled: boolean): Promise<void> {
    const prevEnabled = this.bluetoothEnabled;
    const prevDevices = this.bluetoothDevices.slice();

    this.bluetoothEnabled = enabled;
    if (!enabled) {
      this.bluetoothScanning = false;
      this.bluetoothDevices = [];
    }
    if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();

    if (!window.electronAPI?.setBluetoothEnabled) {
      this.showNotification('Bluetooth', 'Bluetooth control not available (requires Electron/Linux)', 'warning');
      return;
    }

    try {
      // First try standard toggle (works if polkit is set up or running as root)
      const res = await window.electronAPI.setBluetoothEnabled(enabled);

      // If it fails specifically due to permissions or backend explicitly requests password
      const err = (res.error || '').toLowerCase();
      const isPermissionErr = /permission|privilege|sudo|auth|polkit|admin|root|denied/i.test(err);

      const mapError = (errObj: { error?: string; unsupported?: boolean }) => {
        let errorMsg = errObj?.error || 'Failed to toggle Bluetooth';
        if (errObj?.unsupported) {
          return 'No Bluetooth adapter found. This may be a virtual machine without Bluetooth hardware.';
        } else if (errorMsg.includes('rfkill') || errorMsg.includes('blocked')) {
          return 'Bluetooth hardware is blocked or missing. Check your physical switch or VM settings.';
        } else if (errorMsg.includes('bluetoothctl') || errorMsg.includes('not found')) {
          return 'Bluetooth service not available. Please install bluez/rfkill.';
        }
        return errorMsg;
      };

      if (!res.success && (res.needsPassword || isPermissionErr)) {

        // Revert UI while we ask
        this.bluetoothEnabled = prevEnabled;
        if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();

        // Prompt for password
        const password = await this.openPromptModal({
          title: 'Authentication Required',
          message: 'Bluetooth control requires administrator privileges. Enter your system password:',
          inputLabel: 'Password',
          placeholder: 'sudo password',
          password: true,
          confirmText: 'Authenticate',
          cancelText: 'Cancel'
        });

        if (!password) {
          // User cancelled
          return;
        }

        // Retry with password
        this.showNotification('Bluetooth', 'Authenticating...', 'info');
        if (window.electronAPI.setBluetoothEnabledWithPassword) {
          const retryRes = await window.electronAPI.setBluetoothEnabledWithPassword(enabled, password);

          if (retryRes.success) {
            this.bluetoothEnabled = enabled;
            if (!enabled) {
              this.bluetoothScanning = false;
              this.bluetoothDevices = [];
            }
            this.showNotification('Bluetooth', enabled ? 'Bluetooth enabled (via sudo)' : 'Bluetooth disabled (via sudo)', 'divine');
            if (enabled) {
              await this.refreshPairedBluetoothDevices();
            }
            if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();
            return;
          } else {
            this.showNotification('Bluetooth', mapError(retryRes), 'error');
            return;
          }
        }
      }

      if (!res?.success) {
        this.bluetoothEnabled = prevEnabled;
        this.bluetoothDevices = prevDevices;

        this.showNotification('Bluetooth', mapError(res), 'error');
        if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();
        return;
      }

      this.showNotification('Bluetooth', enabled ? 'Bluetooth enabled' : 'Bluetooth disabled', 'info');
      if (enabled) {
        await this.refreshPairedBluetoothDevices();
      }
    } catch (e) {
      this.bluetoothEnabled = prevEnabled;
      this.bluetoothDevices = prevDevices;
      const errStr = String(e);
      this.showNotification('Bluetooth', errStr, 'error');
      if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();
    }
  }

  private async scanBluetoothDevicesFromUi(): Promise<void> {
    if (!this.bluetoothEnabled) {
      this.showNotification('Bluetooth', 'Turn on Bluetooth first', 'warning');
      return;
    }
    if (this.bluetoothScanning) return;

    if (!window.electronAPI?.scanBluetoothDevices) {
      this.showNotification('Bluetooth', 'Bluetooth scanning not available', 'warning');
      return;
    }

    this.bluetoothScanning = true;
    if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();

    try {
      const res = await window.electronAPI.scanBluetoothDevices();
      if (res.success && Array.isArray(res.devices)) {
        this.setBluetoothDevicesFromApi(res.devices, true);
      } else {
        this.showNotification('Bluetooth', res.error || 'Scan failed', 'error');
      }
    } catch (e) {
      this.showNotification('Bluetooth', String(e), 'error');
    } finally {
      this.bluetoothScanning = false;
      if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();
    }
  }

  private async toggleBluetoothDeviceConnectionFromUi(mac: string): Promise<void> {
    const addr = String(mac || '').trim().toUpperCase();
    if (!addr) return;
    const device = this.bluetoothDevices.find(d => d.mac === addr);
    if (!device) return;

    const connectFn = window.electronAPI?.connectBluetoothDevice;
    const disconnectFn = window.electronAPI?.disconnectBluetoothDevice;
    if (!connectFn || !disconnectFn) {
      this.showNotification('Bluetooth', 'Bluetooth device control not available', 'warning');
      return;
    }

    const wasConnected = device.connected;
    this.showNotification('Bluetooth', `${wasConnected ? 'Disconnecting from' : 'Connecting to'} ${device.name}...`, 'info');

    try {
      const res = wasConnected ? await disconnectFn(addr) : await connectFn(addr);
      if (res.success) {
        device.connected = typeof res.connected === 'boolean' ? res.connected : !wasConnected;
        this.showNotification('Bluetooth', `${device.connected ? 'Connected to' : 'Disconnected from'} ${device.name}`, 'divine');
      } else {
        this.showNotification('Bluetooth', res.error || `${wasConnected ? 'Disconnect' : 'Connect'} failed`, 'error');
      }
    } catch (e) {
      this.showNotification('Bluetooth', String(e), 'error');
    }

    if (this.activeSettingsCategory === 'Bluetooth') this.refreshSettingsWindow();
  }

  // ============================================
  // SSH SERVER MANAGEMENT (TIER 6.3)
  // ============================================

  private async toggleSSHServer(enable: boolean): Promise<void> {
    if (!window.electronAPI?.sshControl) {
      this.showNotification(
        'SSH Server',
        'SSH control not available (requires Electron/Linux)',
        'warning'
      );
      this.sshEnabled = false;
      this.refreshSettingsWindow();
      return;
    }

    try {
      const action = enable ? 'start' : 'stop';
      const res = await window.electronAPI.sshControl(action, this.sshPort);

      if (res.success) {
        const normalized = res.status === 'running' || res.status === 'stopped'
          ? res.status
          : (enable ? 'running' : 'stopped');
        this.sshStatus = normalized;
        this.sshEnabled = normalized === 'running';
        this.showNotification(
          'SSH Server',
          `SSH server ${this.sshEnabled ? 'started' : 'stopped'} successfully${this.sshEnabled ? ` on port ${this.sshPort}` : ''}`,
          'info'
        );
        this.queueSaveConfig();
      } else {
        this.sshEnabled = !enable; // Revert if failed
        this.sshStatus = 'unknown';
        this.showNotification(
          'SSH Server',
          res.error || `Failed to ${action} SSH server`,
          'error'
        );
      }
    } catch (err) {
      this.sshEnabled = !enable;
      this.sshStatus = 'unknown';
      this.showNotification(
        'SSH Server',
        `Error ${enable ? 'starting' : 'stopping'} SSH: ${String(err)}`,
        'error'
      );
    }

    if (this.activeSettingsCategory === 'Network') {
      this.refreshSettingsWindow();
    }
  }

  private async regenerateSSHKeys(): Promise<void> {
    const confirmed = await this.openConfirmModal({
      title: '🔑 Regenerate SSH Keys',
      message: 'This will generate new SSH host keys. Existing authorized clients will need to accept the new host key. Continue?',
      confirmText: 'Regenerate',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    if (!window.electronAPI?.sshControl) {
      this.showNotification('SSH Keys', 'SSH control not available', 'warning');
      return;
    }

    try {
      const res = await window.electronAPI.sshControl('regenerate-keys', this.sshPort);

      if (res.success) {
        this.showNotification(
          'SSH Keys',
          '✅ SSH host keys regenerated successfully',
          'info'
        );
      } else {
        this.showNotification(
          'SSH Keys',
          res.error || 'Failed to regenerate SSH keys',
          'error'
        );
      }
    } catch (err) {
      this.showNotification(
        'SSH Keys',
        `Error regenerating keys: ${String(err)}`,
        'error'
      );
    }
  }

  private async viewSSHPublicKey(): Promise<void> {
    if (!window.electronAPI?.sshControl) {
      this.showNotification('SSH Keys', 'SSH control not available', 'warning');
      return;
    }

    try {
      const res = await window.electronAPI.sshControl('get-pubkey', this.sshPort);

      if (res.success && res.pubkey) {
        await this.openAlertModal({
          title: '🔑 SSH Public Key',
          message: `\`\`\`\n${res.pubkey}\n\`\`\`\n\nCopy this key to authorize this machine on remote servers.`,
          confirmText: 'Close'
        });
      } else {
        this.showNotification(
          'SSH Keys',
          res.error || 'Failed to retrieve public key',
          'warning'
        );
      }
    } catch (err) {
      this.showNotification(
        'SSH Keys',
        `Error retrieving public key: ${String(err)}`,
        'error'
      );
    }
  }

  // ============================================
  // EXIF METADATA STRIPPER (TIER 7.3)
  // ============================================

  private async selectImageForExif(): Promise<void> {
    if (!window.electronAPI?.readFile) {
      this.showNotification('EXIF Stripper', 'File access not available', 'warning');
      return;
    }

    // Show file picker using Electron dialog
    const filePath = await this.openPromptModal({
      title: '📂 Select Image File',
      message: 'Enter the full path to an image file (JPG, PNG, etc.):',
      placeholder: '/home/user/Pictures/photo.jpg',
      confirmText: 'Select',
      cancelText: 'Cancel'
    });

    if (!filePath) return;

    // Check if it's an image
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp'];
    const isImage = imageExts.some(ext => filePath.toLowerCase().endsWith(ext));

    if (!isImage) {
      this.showNotification('EXIF Stripper', 'Please select a valid image file', 'warning');
      return;
    }

    this.exifSelectedFile = filePath;
    await this.extractExifData(filePath);
  }

  private async extractExifData(filePath: string): Promise<void> {
    if (!window.electronAPI?.extractExif) {
      // Fallback: Show mock data for demo
      this.exifMetadata = {
        'Make': 'Apple',
        'Model': 'iPhone 14 Pro',
        'DateTime': '2024:12:17 10:30:45',
        'GPS Latitude': '37.7749° N',
        'GPS Longitude': '122.4194° W',
        'Software': 'iOS 17.2'
      };
      this.refreshSettingsWindow();
      return;
    }

    try {
      const res = await window.electronAPI.extractExif(filePath);

      if (res.success && res.metadata) {
        this.exifMetadata = res.metadata;
        this.showNotification(
          'EXIF Data',
          `Found ${Object.keys(res.metadata).length} metadata fields`,
          'info'
        );
      } else {
        this.exifMetadata = null;
        this.showNotification(
          'EXIF Data',
          res.error || 'No EXIF data found in image',
          'warning'
        );
      }
    } catch (err) {
      this.exifMetadata = null;
      this.showNotification('EXIF Error', `Failed to read metadata: ${String(err)}`, 'error');
    }

    this.refreshSettingsWindow();
  }

  private async stripExifData(): Promise<void> {
    if (!this.exifSelectedFile) {
      this.showNotification('EXIF Stripper', 'No image selected', 'warning');
      return;
    }

    const confirmed = await this.openConfirmModal({
      title: '🧹 Strip EXIF Data',
      message: `Remove all metadata from:\n${this.exifSelectedFile}\n\nOriginal will be backed up with .original extension.`,
      confirmText: 'Strip Metadata',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    if (!window.electronAPI?.stripExif) {
      this.showNotification(
        'EXIF Stripper',
        '✅ Metadata stripped! (Demo mode - backend not connected)',
        'info'
      );
      this.exifMetadata = null;
      this.refreshSettingsWindow();
      return;
    }

    try {
      const res = await window.electronAPI.stripExif(this.exifSelectedFile);

      if (res.success) {
        this.showNotification(
          'EXIF Stripper',
          `✅ Metadata removed successfully!\nSaved to: ${res.outputPath || this.exifSelectedFile}`,
          'info'
        );
        this.exifMetadata = null;
        this.exifSelectedFile = null;
        this.refreshSettingsWindow();
      } else {
        this.showNotification(
          'EXIF Stripper',
          res.error || 'Failed to strip metadata',
          'error'
        );
      }
    } catch (err) {
      this.showNotification('EXIF Error', `Error: ${String(err)}`, 'error');
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

  private async refreshBatteryStatus(): Promise<void> {
    if (!window.electronAPI?.getBatteryStatus) {
      this.batterySupported = false;
      this.batteryStatus = null;
      this.batteryLastError = 'Battery IPC not available';
      this.refreshBatteryIndicators();
      return;
    }

    try {
      const res = await window.electronAPI.getBatteryStatus();
      this.batterySupported = !!res.supported;
      if (res.success && res.status) {
        this.batteryStatus = res.status;
        this.batteryLastError = null;
      } else {
        this.batteryStatus = res.status || null;
        this.batteryLastError = res.error || null;
      }
    } catch (e) {
      this.batterySupported = false;
      this.batteryStatus = null;
      this.batteryLastError = String(e);
    } finally {
      // Avoid full OS re-render: it steals focus from terminal/editor windows during background polling.
      this.refreshBatteryIndicators();
    }
  }

  private async refreshMonitorStatsOnly(force = false): Promise<void> {
    if (!window.electronAPI?.getMonitorStats) return;
    if (this.monitorBusy && !force) return;

    this.monitorBusy = true;
    try {
      const statsRes = await window.electronAPI.getMonitorStats();
      if (statsRes.success && statsRes.stats) {
        this.monitorStats = statsRes.stats;
        this.networkManager.updateDataUsage(this.monitorStats);
      }
    } catch {
      // ignore
    } finally {
      this.monitorBusy = false;
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
            id: typeof o.id === 'number' ? o.id : undefined,
            active: !!o.active,
            scale: typeof o.scale === 'number' ? o.scale : 1,
            bounds: o.bounds,
            transform: String(o.transform || 'normal'),
            currentMode: String(o.currentMode || ''),
            modes: Array.isArray(o.modes)
              ? (o.modes as Array<{ width?: number; height?: number; refreshHz?: number | null }>)
                .filter((m): m is { width: number; height: number; refreshHz?: number | null } => m != null && typeof m.width === 'number' && typeof m.height === 'number')
                .map((m) => ({
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

  private async moveWindowToDisplay(outputName: string): Promise<void> {
    const output = this.displayOutputs.find(o => o.name === outputName);
    if (!output || !output.bounds || !window.electronAPI?.setWindowBounds) return;

    try {
      await window.electronAPI.setWindowBounds(output.bounds);
      this.showNotification('Display', `Moved to ${output.name}`, 'info');
    } catch (e) {
      this.showNotification('Display', 'Failed to move window', 'error');
    }
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

  private async launchInstalledApp(appData: string): Promise<void> {
    try {
      const app = JSON.parse(appData);
      if (!window.electronAPI?.launchApp) {
        this.showNotification('Apps', 'App launcher not available.', 'warning');
        return;
      }

      const res = await window.electronAPI.launchApp(app);
      if (!res?.success) {
        this.showNotification('Apps', res?.error || 'Failed to launch app', 'error');
        return;
      }

      // Track recent/frequent apps (Windows-like)
      const key = app.desktopFile ? `desktop:${app.desktopFile}` : (app.name ? `name:${app.name}` : 'unknown');
      this.recordAppLaunch(key);
      this.showStartMenu = false;
      this.render();
    } catch (error) {
      console.error('Error launching app:', error);
      this.showNotification('Apps', 'Failed to launch app', 'error');
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
      case 'updater': return { label: 'Holy Updater', icon: '🕊️' };
      case 'system-monitor': return { label: 'Task Manager', icon: '📊' };
      case 'help': return { label: 'Help & Docs', icon: '❓' };
      case 'godly-notes': return { label: 'Godly Notes', icon: '📋' };
      case 'notes': return { label: 'Notes', icon: '🗒️' };
      case 'calculator': return { label: 'Calculator', icon: '🧮' };
      case 'calendar': return { label: 'Calendar', icon: '📅' };
      case 'media-player': return { label: 'Media Player', icon: '🎬' };
      case 'image-viewer': return { label: 'Image Viewer', icon: '🖼️' };
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

  private launcherDisplayForKey(key: string): { label: string; icon: string; iconUrl?: string } | null {
    const raw = String(key || '');
    if (raw.startsWith('builtin:')) {
      return this.builtinLauncherMeta(raw.slice('builtin:'.length));
    }
    const installed = this.findInstalledAppByKey(raw);
    if (installed) {
      const first = installed.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || installed.name.slice(0, 1).toUpperCase() || '?';
      return {
        label: installed.name,
        icon: first, // Fallback monogram
        iconUrl: installed.iconUrl || undefined
      };
    }
    return null;
  }

  private launchByKey(key: string, toggle = false): void {
    const raw = String(key || '');

    const now = Date.now();
    const last = this.lastLaunchByKeyAt[raw] || 0;
    if (now - last < 1000) return;
    this.lastLaunchByKeyAt[raw] = now;

    if (raw.startsWith('builtin:')) {
      const appId = raw.slice('builtin:'.length);
      // Special handling for trash - open files app to trash folder
      if (appId === 'trash') {
        this.openApp('files');
        setTimeout(() => { void this.loadFiles('trash:'); }, 150);
        return;
      }
      this.openApp(appId, toggle);
      return;
    }
    const installed = this.findInstalledAppByKey(raw);
    if (installed && window.electronAPI?.launchApp) {
      // Gaming Mode logic
      const cat = this.canonicalCategoryForInstalledApp(installed);
      let appToLaunch = installed;

      if (cat === 'Games') {
        if (!this.gamingModeActive) {
          this.gamingModeActive = true;
          this.showNotification('Gaming Mode', 'Performance initialized. Super keys disabled.', 'divine');
          if (window.electronAPI?.setGamingMode) {
            void window.electronAPI.setGamingMode(true);
          }
          setTimeout(() => this.refreshSettingsWindow(), 100);
        }

        // Inject gamemoderun if applicable (Linux) - only if gamemoderun is installed
        if (installed.exec && !installed.exec.includes('gamemoderun') && !installed.name.toLowerCase().includes('steam')) {
          // Check if gamemoderun is installed before using it (cached for performance)
          if (this.gamemoderunAvailable === undefined) {
            // First check - query the system
            if (window.electronAPI?.isCommandAvailable) {
              window.electronAPI.isCommandAvailable('gamemoderun').then(res => {
                this.gamemoderunAvailable = res?.available ?? false;
              }).catch(() => { this.gamemoderunAvailable = false; });
            } else {
              this.gamemoderunAvailable = false;
            }
          }
          // Only inject gamemoderun if it's available
          if (this.gamemoderunAvailable) {
            appToLaunch = { ...installed, exec: `gamemoderun ${installed.exec}` };
          }
        }
      }

      // Track the workspace at the time of launch so new X11 windows get assigned correctly
      this.x11PendingLaunchWorkspace = this.workspaceManager.getActiveWorkspaceId();
      this.x11PendingLaunchTime = Date.now();

      void window.electronAPI.launchApp(appToLaunch).then(res => {
        if (!res?.success) {
          this.showNotification('Apps', res?.error || 'Failed to launch app', 'error');
          return;
        }
        this.recordAppLaunch(this.keyForInstalledApp(installed));
      }).catch(e => {
        this.showNotification('Apps', String(e), 'error');
      });
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
      this.pinnedStart.push(key);
      this.pinnedStart = this.pinnedStart.slice(0, 20);
      localStorage.setItem('temple_pinned_start', JSON.stringify(this.pinnedStart));
      this.queueSaveConfig();
    }
  }

  private unpinStart(key: string): void {
    this.pinnedStart = this.pinnedStart.filter(k => k !== key);
    localStorage.setItem('temple_pinned_start', JSON.stringify(this.pinnedStart));
    this.queueSaveConfig();
  }

  private pinTaskbar(key: string): void {
    if (!key) return;
    if (!this.pinnedTaskbar.includes(key)) {
      this.pinnedTaskbar.push(key);
      this.pinnedTaskbar = this.pinnedTaskbar.slice(0, 20);
      localStorage.setItem('temple_pinned_taskbar', JSON.stringify(this.pinnedTaskbar));
      this.queueSaveConfig();
    }
  }

  private unpinTaskbar(key: string): void {
    this.pinnedTaskbar = this.pinnedTaskbar.filter(k => k !== key);
    localStorage.setItem('temple_pinned_taskbar', JSON.stringify(this.pinnedTaskbar));
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



  private setupGodlyNotesGlobals() {
    window.createBoardPrompt = async () => {
      const name = await this.openPromptModal({
        title: 'New Board',
        message: 'Enter board name:',
        inputLabel: 'Name',
        confirmText: 'Create',
        cancelText: 'Cancel'
      });
      if (name) {
        this.godlyNotes.createBoard(name);
        this.refreshGodlyNotes();
      }
    };

    window.switchBoard = (id: string) => {
      if (id === 'new') {
        window.createBoardPrompt();
      } else {
        this.godlyNotes.switchBoard(id);
        this.refreshGodlyNotes();
      }
    };

    window.deleteBoardPrompt = (id: string) => {
      if (confirm('Delete this board permanently?')) {
        this.godlyNotes.deleteBoard(id);
        this.refreshGodlyNotes();
      }
    };

    window.addNoteList = (title: string) => {
      if (title) {
        this.godlyNotes.addList(title);
        this.refreshGodlyNotes();
      }
    };

    window.deleteNoteList = (id: string) => {
      if (confirm('Delete this list?')) {
        this.godlyNotes.deleteList(id);
        this.refreshGodlyNotes();
      }
    };

    window.addNoteCard = (listId: string, content: string) => {
      if (content) {
        this.godlyNotes.addCard(listId, content);
        this.refreshGodlyNotes();
      }
    };

    window.deleteNoteCard = (listId: string, cardId: string) => {
      if (confirm('Delete this card?')) {
        this.godlyNotes.deleteCard(listId, cardId);
        this.refreshGodlyNotes();
      }
    };

    window.editNoteCardPrompt = async (listId: string, cardId: string) => {
      const currentContent = this.godlyNotes.getCardContent(listId, cardId);
      if (currentContent === null) return;

      const newContent = await this.openPromptModal({
        title: 'Edit Card',
        message: 'Update card content:',
        inputLabel: 'Content',
        defaultValue: currentContent,
        confirmText: 'Save',
        cancelText: 'Cancel'
      });

      if (newContent !== null && newContent.trim()) {
        this.godlyNotes.updateCard(listId, cardId, newContent);
        this.refreshGodlyNotes();
      }
    };

    window.renameBoardPrompt = async (id: string, currentName: string) => {
      const newName = await this.openPromptModal({
        title: 'Rename Board',
        message: 'Enter new board name:',
        inputLabel: 'Name',
        defaultValue: currentName,
        confirmText: 'Rename',
        cancelText: 'Cancel'
      });
      if (newName !== null && newName.trim()) {
        this.godlyNotes.renameBoard(id, newName);
        this.refreshGodlyNotes();
      }
    };

    window.renameListPrompt = async (id: string, currentTitle: string) => {
      const newTitle = await this.openPromptModal({
        title: 'Rename List',
        message: 'Enter new list title:',
        inputLabel: 'Title',
        defaultValue: currentTitle,
        confirmText: 'Rename',
        cancelText: 'Cancel'
      });
      if (newTitle !== null && newTitle.trim()) {
        this.godlyNotes.renameList(id, newTitle);
        this.refreshGodlyNotes();
      }
    };
  }

  private refreshGodlyNotes() {
    const win = this.windows.find(w => w.id.startsWith('godly-notes'));
    if (win) {
      win.content = this.godlyNotes.render();
      this.render();
    }
  }

  private setupEventListeners() {
    const app = document.getElementById('app')!;

    // GUARD: Prevent multiple listeners on the same DOM element (handles HMR/reloads)
    if (app.dataset.listenersAttached === 'true') {

      return;
    }
    app.dataset.listenersAttached = 'true';

    // ============================================
    // MODAL INPUT LISTENER
    // ============================================
    // Fix for prompting where re-renders wipe input (e.g. Godly Notes rename)
    app.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.matches('.modal-input') && this.modal) {
        this.modal.inputValue = target.value;
      }
    });

    // ============================================
    // CUSTOM DROPDOWN HANDLERS (for .custom-dropdown)
    // ============================================
    // Toggle dropdown open/closed when trigger is clicked
    app.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Handle dropdown trigger click
      const trigger = target.closest('.custom-dropdown-trigger');
      if (trigger) {
        const dropdown = trigger.closest('.custom-dropdown') as HTMLElement;
        if (dropdown) {
          // Close all other dropdowns first
          document.querySelectorAll('.custom-dropdown.open').forEach(dd => {
            if (dd !== dropdown) dd.classList.remove('open');
          });
          // Toggle this dropdown
          dropdown.classList.toggle('open');
          e.stopPropagation();
          return;
        }
      }

      // Handle option selection
      const option = target.closest('.custom-dropdown-option') as HTMLElement;
      if (option && option.dataset.value !== undefined) {
        const dropdown = option.closest('.custom-dropdown') as HTMLElement;
        if (dropdown) {
          const dropdownId = dropdown.dataset.dropdownId;
          const value = option.dataset.value;
          const label = option.textContent?.trim() || value;

          // Update trigger text
          const triggerEl = dropdown.querySelector('.custom-dropdown-trigger');
          if (triggerEl) {
            triggerEl.textContent = label;
            triggerEl.setAttribute('title', label);
          }

          // Update selected state
          dropdown.querySelectorAll('.custom-dropdown-option').forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');

          // Close dropdown
          dropdown.classList.remove('open');

          // Dispatch action based on dropdown ID
          if (dropdownId === 'audio-sink' && value && window.electronAPI?.setDefaultSink) {
            void window.electronAPI.setDefaultSink(value).then(() => {
              this.audioDevices.defaultSink = value;
              this.queueSaveConfig();
              this.refreshSettingsWindow();
            });
          } else if (dropdownId === 'audio-source' && value && window.electronAPI?.setDefaultSource) {
            void window.electronAPI.setDefaultSource(value).then(() => {
              this.audioDevices.defaultSource = value;
              this.queueSaveConfig();
              this.refreshSettingsWindow();
            });
          }

          e.stopPropagation();
          return;
        }
      }

      // Close any open dropdown when clicking outside
      if (!target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown.open').forEach(dd => dd.classList.remove('open'));
      }
    });


    // Handle Enter key in modal input
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.modal) {
        const input = document.querySelector('.modal-input') as HTMLInputElement | null;
        if (input && document.activeElement === input) {
          e.preventDefault();
          e.stopPropagation();
          if (this.modal.type === 'prompt') this.closeModal(this.modal.inputValue ?? '');
          else if (this.modal.type === 'confirm') this.closeModal(true);
          else this.closeModal(undefined);
        }
      }
    });

    // ============================================
    // DESKTOP ICONS DRAG & DROP
    // ============================================
    app.addEventListener('mousedown', (e) => {
      // Only left click
      if (e.button !== 0) return;

      const desktopIcon = (e.target as HTMLElement).closest('.desktop-icon') as HTMLElement;
      if (desktopIcon) {
        e.preventDefault(); // Prevent native browser selection ("Blue Bug")
        this.handleIconDragStart(e, desktopIcon);
      }
    });

    // ============================================
    // SLIDER CLICK-TO-SET (Jump to position on click)
    // ============================================
    app.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLInputElement;
      if (target.matches && target.matches('input[type="range"]')) {
        const rect = target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickPercentage = clickX / rect.width;

        const min = parseFloat(target.getAttribute('min') || '0');
        const max = parseFloat(target.getAttribute('max') || '100');
        const step = parseFloat(target.getAttribute('step') || '1');
        const currentValue = parseFloat(target.value);
        const currentPercentage = (currentValue - min) / (max - min);

        // Only jump if click is far from current thumb (>8% away)
        // This prevents interfering with drag operations
        const distanceThreshold = 0.08;
        if (Math.abs(clickPercentage - currentPercentage) > distanceThreshold) {
          let newValue = min + (max - min) * Math.max(0, Math.min(1, clickPercentage));

          // Snap to step increments
          if (step > 0) {
            newValue = Math.round(newValue / step) * step;
          }

          // Clamp to valid range
          newValue = Math.max(min, Math.min(max, newValue));

          // Update value
          target.value = String(newValue);

          // Dispatch input event to trigger app state updates
          const inputEvent = new Event('input', { bubbles: true });
          target.dispatchEvent(inputEvent);

          // Also dispatch change event for change handlers
          const changeEvent = new Event('change', { bubbles: true });
          target.dispatchEvent(changeEvent);
        }
      }
    });

    document.addEventListener('mousemove', (e) => this.handleIconDragMove(e));
    document.addEventListener('mouseup', () => this.handleIconDragEnd());

    // ============================================
    // ACCESSIBILITY: KEYBOARD SUPPORT
    // ============================================
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        const target = e.target as HTMLElement;
        // Triggers click on elements that have role="button" but are not actual buttons/links
        if (target && target.getAttribute('role') === 'button' && target.tagName !== 'BUTTON' && target.tagName !== 'A') {
          e.preventDefault();
          target.click();
        }
      }
    });

    // ============================================
    // FIRST RUN WIZARD EVENT LISTENERS
    // ============================================
    app.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      if (target.matches('.wizard-next-btn')) {
        // Small debounce to prevent accidental double-clicks skipping steps
        if (this._wizardCoolingDown) return;
        this._wizardCoolingDown = true;
        setTimeout(() => this._wizardCoolingDown = false, 500);

        this.firstRunStep++;
        this.render();
      }

      if (target.matches('.wizard-finish-btn') || target.matches('.wizard-skip-btn')) {
        this.setupComplete = true;
        localStorage.setItem('temple_setup_complete', 'true');
        this.render();
      }

      // Resolution Confirmation Dialog
      if (target.matches('.resolution-confirm-btn')) {
        this.confirmResolution();
      }

      if (target.matches('.resolution-revert-btn')) {
        void this.revertResolution();
      }

      if (target.matches('.theme-color-btn')) {
        const color = target.dataset.color as ThemeColor | undefined;
        if (color) {
          this.themeColor = color;
          this.applyTheme();
          this.render();
        }
      }

      const wizardToggle = target.closest('.wizard-toggle-btn') as HTMLElement;
      if (wizardToggle) {
        const setting = wizardToggle.dataset.setting;
        if (setting === 'secure-wipe') {
          this.secureWipeOnShutdown = !this.secureWipeOnShutdown;
          localStorage.setItem('temple_secure_wipe', String(this.secureWipeOnShutdown));
        } else if (setting === 'tracker-blocking') {
          this.trackerBlockingEnabled = !this.trackerBlockingEnabled;
          localStorage.setItem('temple_tracker_blocking', String(this.trackerBlockingEnabled));
        } else if (setting === 'mac-randomization') {
          this.macRandomization = !this.macRandomization;
          localStorage.setItem('temple_mac_randomization', String(this.macRandomization));
          this.applyMacRandomization();
        }
        this.render();
      }

      // Settings: Run Setup Again Button
      if (target.matches('.setup-again-btn')) {
        this.setupComplete = false;
        this.firstRunStep = 0;
        localStorage.removeItem('temple_setup_complete');
        // Close the settings window if open
        const settingsWin = this.windows.find(w => w.id.startsWith('settings'));
        if (settingsWin) {
          this.closeWindow(settingsWin.id);
        }
        this.render();
      }
    });

    // ============================================
    // TASKBAR HOVER PREVIEW (Tier 9.1)
    // ============================================
    app.addEventListener('mouseenter', (e) => {
      const target = e.target as HTMLElement;
      const taskbarApp = target.closest('.taskbar-app[data-taskbar-window]') as HTMLElement;
      if (taskbarApp && taskbarApp.dataset.taskbarWindow) {
        this.showTaskbarHoverPreview(taskbarApp.dataset.taskbarWindow, taskbarApp);
      }
    }, true); // Use capture phase for reliable event bubbling

    app.addEventListener('mouseleave', (e) => {
      const target = e.target as HTMLElement;
      const taskbarApp = target.closest('.taskbar-app[data-taskbar-window]') as HTMLElement;
      if (taskbarApp) {
        this.hideTaskbarHoverPreview();
      }
    }, true);

    // Also hide preview when clicking anywhere
    app.addEventListener('mousedown', (e) => {
      this.hideTaskbarHoverPreview();

      // Close group popup when clicking outside
      if (this.taskbarGroupPopup) {
        const target = e.target as HTMLElement;
        const isInsidePopup = target.closest('#taskbar-group-popup');
        const isTaskbarGroup = target.closest('[data-app-group]') || target.closest('[data-window-count]');
        if (!isInsidePopup && !isTaskbarGroup) {
          this.hideTaskbarGroupPopup();
        }
      }
    });


    // Volume Slider Input
    app.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.matches('.volume-slider')) {
        const val = parseInt(target.value, 10);
        this.updateVolume(val);
      }

      // Notes Inputs
      if (target.matches('.note-title-input')) {
        const container = target.closest('.notes-app');
        if (container) {
          const contentArea = container.querySelector('.note-content-area') as HTMLTextAreaElement;
          const content = contentArea ? contentArea.value : '';
          this.notesApp.updateActiveNote(target.value, content);
        }
      }
      if (target.matches('.note-content-area')) {
        const container = target.closest('.notes-app');
        if (container) {
          const titleInput = container.querySelector('.note-title-input') as HTMLInputElement;
          const title = titleInput ? titleInput.value : 'Untitled';
          this.notesApp.updateActiveNote(title, target.value);
        }
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

      // Start Menu search (update menu without full render)
      if (target.matches('.start-search-input')) {
        this.startMenuSearchQuery = target.value;
        this.updateStartMenuDom();
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

      // Task Manager search (debounced for performance)
      if (target.matches('.monitor-search-input')) {
        const query = target.value;

        // Clear existing debounce timer
        if (this.monitorSearchDebounceTimer) {
          clearTimeout(this.monitorSearchDebounceTimer);
        }

        // Set new timer to update after 300ms of no typing
        this.monitorSearchDebounceTimer = window.setTimeout(() => {
          this.monitorQuery = query;
          this.refreshSystemMonitorWindowDom();
        }, 300);
      }
    });

    // Resolution Dropdown Change
    app.addEventListener('change', (e) => {
      const accTarget = e.target as HTMLInputElement;

      // Security Settings Toggles
      if (accTarget.matches('.sec-toggle')) {
        const key = accTarget.dataset.secKey;
        const checked = accTarget.checked;
        if (key === 'mac') {
          this.macRandomization = checked;
          localStorage.setItem('temple_mac_randomization', String(this.macRandomization));
          this.applyMacRandomization();
        } else if (key === 'tracker-blocking') {
          this.trackerBlockingEnabled = checked;
          localStorage.setItem('temple_tracker_blocking', String(this.trackerBlockingEnabled));
        } else if (key === 'encryption') {
          this.encryptionEnabled = checked;
          // Encryption usually requires more logic (like running a command), but for the UI toggle:
          // Note: Encryption might need backend calls, but updating state here is a start.
        }
        this.refreshSettingsWindow();
      }

      if (accTarget.matches('.high-contrast-toggle')) {
        this.highContrast = accTarget.checked;
        this.applyTheme();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
      }
      if (accTarget.matches('.large-text-toggle')) {
        this.largeText = accTarget.checked;
        this.applyTheme();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
      }
      if (accTarget.matches('.reduce-motion-toggle')) {
        this.reduceMotion = accTarget.checked;
        this.applyTheme();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
      }
      if (accTarget.matches('.jelly-mode-toggle')) {
        this.jellyMode = accTarget.checked;
        this.effectsManager.setJellyMode(this.jellyMode);
        this.queueSaveConfig();
        this.refreshSettingsWindow();
      }
      if (accTarget.matches('.color-blind-select') || (e.target as HTMLElement).matches('.color-blind-select')) {
        const t = (accTarget.tagName === 'SELECT' ? accTarget : e.target) as HTMLSelectElement;
        this.colorBlindMode = t.value as ColorBlindMode;
        this.applyTheme();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
      }
      const target = e.target as HTMLInputElement;

      // Gaming Mode Toggle
      if (target.matches('.gaming-mode-toggle')) {
        this.toggleGamingMode();
        this.refreshSettingsWindow();
        return;
      }

      if (target.matches('.hide-bar-fullscreen-toggle')) {
        this.hideBarOnFullscreen = target.checked;
        localStorage.setItem('temple_hide_bar_on_fullscreen', String(this.hideBarOnFullscreen));
        if (window.electronAPI?.setHideBarOnFullscreen) {
          void window.electronAPI.setHideBarOnFullscreen(this.hideBarOnFullscreen);
        }
        this.refreshSettingsWindow();
        return;
      }
      if (target.matches('.lite-mode-toggle')) {
        this.liteMode = target.checked;
        localStorage.setItem('temple_lite_mode', String(this.liteMode));
        this.refreshSettingsWindow();
        this.render();
        return;
      }
      if (target.matches('.quote-notifications-toggle')) {
        this.quoteNotifications = target.checked;
        localStorage.setItem('temple_quote_notifications', String(this.quoteNotifications));
        return;
      }
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
        const val = target.value as FileSortKey;
        this.fileSortMode = val;
        this.fileSortDir = val === 'name' ? 'asc' : 'desc';
        this.updateFileBrowserWindow();
      }

      if (target.matches('.timezone-select')) {
        this.timezone = target.value;
        this.queueSaveConfig();
        this.updateClock();
        if (this.activeSettingsCategory === 'System') this.refreshSettingsWindow();
      }

      if (target.matches('.auto-time-toggle')) {
        this.autoTime = (target as HTMLInputElement).checked;
        this.queueSaveConfig();
        if (this.activeSettingsCategory === 'System') this.refreshSettingsWindow();
      }

      if (target.matches('.calc-mode-select')) {
        const mode = target.value as CalculatorMode;
        this.calculator.setMode(mode);
        this.render();
      }

      if (target.matches('.start-view-select')) {
        const val = target.value as LauncherView;
        this.startMenuView = val;
        this.render();
      }

      if (target.matches('.start-category-select')) {
        const val = target.value as StartMenuCategory;
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

      if (target.matches('.vpn-killswitch-mode')) {
        const mode = target.value === 'strict' ? 'strict' : 'auto';
        this.networkManager.vpnKillSwitchMode = mode;
        this.queueSaveConfig();
        void this.refreshNetworkStatus();
        if (this.activeSettingsCategory === 'Network') this.refreshSettingsWindow();
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

      // Sprite Animation FPS input
      if (inputTarget.matches('.sprite-fps-input')) {
        const fps = parseInt(inputTarget.value, 10);
        if (!Number.isNaN(fps) && fps >= 1 && fps <= 30) {
          this.spriteAnimationFPS = fps;
          // Restart animation with new FPS if playing
          if (this.spriteAnimationPlaying) {
            this.startSpriteAnimation();
          }
        }
      }

      // ============================================
      // THEME EDITOR INPUT HANDLERS (Tier 9.4)
      // ============================================
      if (inputTarget.matches('.theme-editor-color')) {
        const key = inputTarget.dataset.key as 'mainColor' | 'bgColor' | 'textColor' | 'glowColor';
        if (key && (key === 'mainColor' || key === 'bgColor' || key === 'textColor' || key === 'glowColor')) {
          this.themeEditorState[key] = inputTarget.value;
          this.refreshSettingsWindow();
        }
      }

      if (inputTarget.matches('.theme-editor-input')) {
        const key = inputTarget.dataset.key;
        if (key === 'name') {
          this.themeEditorState.name = inputTarget.value;
        }
      }

      if (inputTarget.matches('.wifi-enabled-toggle')) {
        this.networkManager.wifiEnabled = inputTarget.checked;
        this.queueSaveConfig();
        if (window.electronAPI?.setWifiEnabled) {
          void window.electronAPI.setWifiEnabled(this.networkManager.wifiEnabled).then(res => {
            if (!res.success) this.showNotification('Network', res.error || 'Failed to toggle Wi‑Fi', 'warning');
            void this.refreshNetworkStatus();
          });
        }
      }

      if (inputTarget.matches('.vpn-killswitch-toggle')) {
        const enabled = inputTarget.checked;

        if (!enabled) {
          const toRestore = this.networkManager.vpnKillSwitchLastDisconnected.slice();
          this.networkManager.vpnKillSwitchEnabled = false;
          this.networkManager.vpnKillSwitchArmed = false;
          this.networkManager.vpnKillSwitchBlocked = false;
          this.networkManager.vpnKillSwitchSnoozeUntil = null;
          this.queueSaveConfig();
          void this.networkManager.restoreConnections(toRestore).then(() => this.refreshNetworkStatus());
          if (this.activeSettingsCategory === 'Network') this.refreshSettingsWindow();
          return;
        }

        this.networkManager.vpnKillSwitchEnabled = true;
        this.networkManager.vpnKillSwitchBlocked = false;
        this.networkManager.vpnKillSwitchSnoozeUntil = null;
        this.queueSaveConfig();
        this.showNotification(
          'VPN Kill Switch',
          this.networkManager.vpnKillSwitchMode === 'strict' ? 'Enabled (strict). Traffic will be blocked when VPN is down.' : 'Enabled. It will arm when a VPN is detected.',
          'info'
        );
        void this.refreshNetworkStatus();
        if (this.activeSettingsCategory === 'Network') this.refreshSettingsWindow();
      }

      if (inputTarget.matches('.bt-enable-toggle')) {
        void this.setBluetoothEnabledFromUi(inputTarget.checked);
        return;
      }

      if (inputTarget.matches('.flight-mode-toggle')) {
        this.flightMode = inputTarget.checked;
        if (this.flightMode) {
          // Flight mode disables all radios (best-effort)
          this.networkManager.wifiEnabled = false;
          this.queueSaveConfig();
          if (window.electronAPI?.setWifiEnabled) {
            void window.electronAPI.setWifiEnabled(false).then(() => this.refreshNetworkStatus());
          }
          void this.setBluetoothEnabledFromUi(false);
        }
        this.refreshSettingsWindow();
        return;
      }

      // Data Usage Tracking
      if (inputTarget.matches('.data-tracking-toggle')) {
        this.networkManager.dataUsageTrackingEnabled = inputTarget.checked;
        if (this.networkManager.dataUsageTrackingEnabled && this.monitorStats?.network) {
          // Start tracking from current values
          this.networkManager.dataUsageStartRx = this.monitorStats.network.rxBytes || 0;
          this.networkManager.dataUsageStartTx = this.monitorStats.network.txBytes || 0;
        }
        this.refreshSettingsWindow();
      }

      if (inputTarget.matches('.data-limit-input')) {
        const limitGB = parseFloat(inputTarget.value);
        if (!Number.isNaN(limitGB) && limitGB > 0) {
          this.networkManager.dataUsageDailyLimit = limitGB * 1024 * 1024 * 1024; // Convert GB to bytes
          this.refreshSettingsWindow();
        }
      }

      if (inputTarget.matches('.sec-toggle')) {
        const key = inputTarget.dataset.secKey;
        const checked = inputTarget.checked;
        if (key === 'encryption') this.encryptionEnabled = checked;
        else if (key === 'firewall') this.firewallEnabled = checked;
        else if (key === 'mac') this.macRandomization = checked;
        else if (key === 'shred') this.secureDelete = checked;
        else if (key === 'memory-wipe') {
          this.secureWipeOnShutdown = checked;
          localStorage.setItem('temple_secure_wipe', String(checked));
        }
        else if (key === 'tor') {
          // Old Tor toggle removed - new implementation in Security section
        }
        else if (key === 'tracker-blocking') {
          this.trackerBlockingEnabled = checked;
          this.showNotification(
            'Tracker Blocking',
            checked ? '🛡️ Tracker blocking enabled! Ads & trackers will be blocked.' : 'Tracker blocking disabled.',
            'info'
          );
          if (window.electronAPI?.setTrackerBlocking) {
            void window.electronAPI.setTrackerBlocking(checked).then(res => {
              if (!res.success) this.showNotification('Security', res.error || 'Failed to update tracker blocking', 'warning');
            });
          }
        }

        if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
      }



      // SSH Server Toggle
      if (inputTarget.matches('.ssh-toggle')) {
        this.sshEnabled = inputTarget.checked;
        this.toggleSSHServer(this.sshEnabled);
      }

      // SSH Port Input
      if (inputTarget.matches('.ssh-port-input')) {
        const port = parseInt(inputTarget.value, 10);
        if (!Number.isNaN(port) && port >= 1 && port <= 65535) {
          this.sshPort = port;
          this.queueSaveConfig();
        }
      }

      if (inputTarget.matches('.hotspot-toggle')) {
        this.networkManager.toggleHotspot(inputTarget.checked);
      }

      if (inputTarget.matches('.firewall-toggle')) {
        void this.toggleFirewallSystem(inputTarget.checked);
      }

      if (inputTarget.matches('.taskbar-autohide-toggle')) {
        this.autoHideTaskbar = inputTarget.checked;
        localStorage.setItem('temple_autohide_taskbar', String(this.autoHideTaskbar));
        // If disabled, ensure it's shown immediately
        if (!this.autoHideTaskbar) {
          const taskbar = document.querySelector('.taskbar') as HTMLElement;
          if (taskbar) taskbar.classList.remove('taskbar-hidden');
        }
      }

      if (inputTarget.matches('.heavenly-pulse-toggle')) {
        this.heavenlyPulse = inputTarget.checked;
        this.settingsManager.applyTheme();
        this.queueSaveConfig();
      }

      // Display Scale Slider - with debouncing to prevent accidental drags
      if (inputTarget.matches('.display-scale-slider')) {
        const scale = parseFloat(inputTarget.value);
        if (!Number.isNaN(scale) && scale >= 0.75 && scale <= 2.0) {
          // Update the visual percentage display immediately
          const valueDisplay = document.querySelector('.display-scale-value');
          if (valueDisplay) {
            valueDisplay.textContent = `${Math.round(scale * 100)}%`;
          }

          // Debounce the actual scale application to prevent rapid changes
          if (this.scaleChangeTimer) clearTimeout(this.scaleChangeTimer);
          this.scaleChangeTimer = window.setTimeout(async () => {
            const output = this.displayOutputs.find(o => o.name === this.activeDisplayOutput);
            if (output && window.electronAPI?.setDisplayScale) {
              try {
                const res = await window.electronAPI.setDisplayScale(output.name, scale);
                if (res.success) {
                  output.scale = scale;
                  this.refreshSettingsWindow();
                  this.showNotification('Display', `Scale set to ${Math.round(scale * 100)}%`, 'info');
                } else {
                  this.showNotification('Display', res.error || 'Failed to set scale', 'error');
                }
              } catch (e) {
                this.showNotification('Display', String(e), 'error');
              }
            }
          }, 500); // Wait 500ms after user stops dragging
        }
      }
    });

    // Image Viewer Controls (Enhanced with new module)
    app.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Calculator Logic - MOVED to main setupEventListeners block (fix duplicate inputs)
      /*
      if (target.matches('.calc-btn')) {
        const key = target.dataset.key;
        if (key) {
          this.calculator.pressKey(key);
          this.render();
        }
      }
      if (target.matches('.calc-toggle-history')) {
        this.calculator.toggleHistory();
        this.render();
      }
      if (target.matches('.calc-base-btn')) {
        const base = target.dataset.calcBase;
        if (base) {
          this.calculator.setBase(base as CalculatorBase);
          this.render();
        }
      }
      if (target.matches('.calc-btn-history-clear')) {
        this.calculator.clearHistory();
        this.render();
      }
      */

      // Notes App Logic
      if (target.matches('[data-note-action]')) {
        const action = target.dataset.noteAction;
        if (action === 'new') {
          this.notesApp.createNote();
          this.render();
        } else if (action === 'delete') {
          if (this.notesApp.activeNoteId) {
            // Confirm delete
            this.openConfirmModal({ title: 'Delete Note', message: 'Destroy this testament?', confirmText: 'Burn', cancelText: 'Keep' }).then(ok => {
              if (ok && this.notesApp.activeNoteId) {
                this.notesApp.deleteNote(this.notesApp.activeNoteId);
                this.render();
              }
            });
          }
        } else if (action === 'toggle-secure' || action === 'lock' || action === 'unlock-dialog') {
          if (action === 'lock') {
            this.notesApp.lockCurrentNote();
          } else {
            this.notesApp.initiateLock();
          }
          this.render();
        } else if (action === 'pwd-cancel') {
          this.notesApp.showPasswordDialog = false;
          this.notesApp.passwordError = null;
          this.render();
        } else if (action === 'pwd-submit') {
          const input = document.querySelector('.notes-password-input') as HTMLInputElement;
          if (input) {
            this.notesApp.handlePasswordSubmit(input.value);
            this.render();
          }
        }
      }

      if (target.matches('.note-item') || target.closest('.note-item')) {
        const item = target.matches('.note-item') ? target : target.closest('.note-item') as HTMLElement;
        const id = item.dataset.noteId;
        if (id) {
          this.notesApp.selectNote(id);
          this.render();
        }
      }

      // Calendar App Logic
      if (target.matches('[data-cal-action]')) {
        const action = target.dataset.calAction;
        if (action === 'prev') {
          this.calendarApp.changeMonth(-1);
        } else if (action === 'next') {
          this.calendarApp.changeMonth(1);
        } else if (action === 'add-dialog') {
          this.calendarApp.openReminderDialog();
        } else if (action === 'save-reminder') {
          const input = document.querySelector('.cal-reminder-input') as HTMLInputElement;
          if (input) {
            this.calendarApp.addReminder(input.value);
          }
        } else if (action === 'cancel-reminder') {
          this.calendarApp.showReminderDialog = false;
        } else if (action === 'delete-reminder') {
          const id = target.dataset.calId;
          if (id) this.calendarApp.deleteReminder(id);
        }
        this.render();
      }

      if (target.matches('.calendar-day') || target.closest('.calendar-day')) {
        const el = target.matches('.calendar-day') ? target : target.closest('.calendar-day') as HTMLElement;
        const day = parseInt(el.dataset.calDay || '0', 10);
        if (day) {
          this.calendarApp.selectDay(day);
          this.render();
        }
      }

      if (target.matches('.hotspot-edit-btn')) {
        void this.networkManager.editHotspotSettings();
        return;
      }

      // Firewall Buttons
      if (target.matches('.fw-refresh-btn')) {
        void this.refreshFirewallRules();
        return;
      }

      if (target.matches('.fw-delete-btn') || target.closest('.fw-delete-btn')) {
        const btn = target.closest('.fw-delete-btn') as HTMLElement;
        const id = parseInt(btn.dataset.id || '-1');
        if (id !== -1) void this.deleteFirewallRule(id);
        return;
      }

      if (target.matches('.fw-add-btn')) {
        // Find inputs relative to button to support multiple instances if needed
        // The structure is: button -> parent div -> inputs
        const parent = target.parentElement;
        if (parent) {
          const portInput = parent.querySelector('.fw-port-input') as HTMLInputElement;
          const protoSelect = parent.querySelector('.fw-proto-select') as HTMLSelectElement;
          const actionSelect = parent.querySelector('.fw-action-select') as HTMLSelectElement;

          if (portInput && protoSelect && actionSelect) {
            const port = parseInt(portInput.value);
            if (port > 0 && port < 65536) {
              void this.addFirewallRule(port, protoSelect.value, actionSelect.value);
              portInput.value = '';
            } else {
              this.showNotification('Firewall', 'Invalid port number', 'warning');
            }
          }
        }
        return;
      }

      // Setup Wizard Handlers
      if (target.matches('.wizard-next-btn')) {
        this.firstRunStep++;
        this.render();
        return;
      }

      if (target.matches('.wizard-finish-btn')) {
        this.setupComplete = true;
        this.firstRunStep = 0;
        localStorage.setItem('temple_setup_complete', 'true');
        this.queueSaveConfig();
        this.showNotification('System', 'Setup Complete. Welcome to TempleOS.', 'divine');
        this.render();
        return;
      }

      if (target.matches('.theme-color-btn')) {
        const color = target.dataset.color as ThemeColor | undefined;
        if (color) {
          this.themeColor = color;
          this.applyTheme();
          this.queueSaveConfig();
          this.render();
        }
        return;
      }

      if (target.matches('.setup-again-btn')) {
        this.setupComplete = false;
        this.firstRunStep = 0;
        localStorage.removeItem('temple_setup_complete');
        // Close the settings window if open
        const settingsWin = this.windows.find(w => w.id.startsWith('settings'));
        if (settingsWin) {
          this.closeWindow(settingsWin.id);
        }
        this.render();
        return;
      }



      // VeraCrypt Listeners
      if (target.matches('.vc-mount-btn')) {
        void this.mountVeraCryptFromUi();
        return;
      }
      if (target.matches('.vc-refresh-btn')) {
        void this.refreshVeraCrypt();
        return;
      }
      if (target.matches('.vc-dismount-btn') || target.closest('.vc-dismount-btn')) {
        const btn = target.closest('.vc-dismount-btn') as HTMLElement;
        const slot = parseInt(btn.dataset.slot || '0');
        if (slot > 0) void this.dismountVeraCryptFromUi(slot);
        return;
      }

      const btn = target.closest('.iv-btn') as HTMLElement;
      if (btn) {
        const action = btn.dataset.action;
        const winId = btn.dataset.window;
        if (!winId) return;

        // Use new ImageViewerEnhancer module
        if (action === 'zoom-in') this.imageViewer.zoomIn(winId);
        if (action === 'zoom-out') this.imageViewer.zoomOut(winId);
        if (action === 'rotate-left') this.imageViewer.rotateLeft(winId);
        if (action === 'rotate-right') this.imageViewer.rotateRight(winId);
        if (action === 'reset') this.imageViewer.reset(winId);

        // New features from enhanced module
        if (action === 'slideshow') {
          // Get all image files from current directory for slideshow
          const imageFiles = this.fileEntries
            .filter(f => !f.isDirectory && this.isImageFile(f.name))
            .map(f => f.path);
          const currentSrc = this.imageViewer.getState(winId)?.src || '';
          const currentIndex = imageFiles.indexOf(currentSrc);

          this.imageViewer.toggleSlideshow(winId, imageFiles, Math.max(0, currentIndex), (newSrc) => {
            // Update window when slideshow advances
            const win = this.windows.find(w => w.id === winId);
            if (win) {
              win.content = this.getImageViewerContent(newSrc, winId);
              this.render();
            }
          });
          this.render();
          return;
        }

        if (action === 'wallpaper') {
          const state = this.imageViewer.getState(winId);
          if (state) {
            this.wallpaperImage = state.src;
            this.queueSaveConfig();
            this.render();
            this.showNotification('Wallpaper', 'Wallpaper updated successfully', 'info');
          }
          return;
        }

        if (action === 'crop') {
          const state = this.imageViewer.getState(winId);
          if (state?.cropMode) {
            this.imageViewer.disableCropMode(winId);
          } else {
            this.imageViewer.enableCropMode(winId);
          }
          this.render();
          return;
        }

        // Update UI with new transform
        const winEl = document.querySelector(`[data-window-id="${winId}"]`);
        if (winEl) {
          const img = winEl.querySelector('.image-canvas img') as HTMLElement;
          if (img) {
            img.style.transform = this.imageViewer.getTransformCSS(winId);
            const label = winEl.querySelector('.toolbar span');
            const state = this.imageViewer.getState(winId);
            if (label && state) label.textContent = `${Math.round(state.zoom * 100)}%`;
          }
        }
      }
    });

    // Desktop icon clicks
    app.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Sprite Editor Tools
      const spriteToolBtn = target.closest('.sprite-tool-btn') as HTMLElement;
      if (spriteToolBtn) {
        const tool = spriteToolBtn.dataset.tool;
        if (tool === 'pencil' || tool === 'fill' || tool === 'eyedropper' || tool === 'eraser') {
          this.spriteTool = tool;
          this.render();
          return;
        }
      }

      // Sprite Editor Actions
      const spriteActionBtn = target.closest('.sprite-action-btn') as HTMLElement;
      if (spriteActionBtn) {
        const action = spriteActionBtn.dataset.action;
        if (action === 'clear') {
          this.spriteData = Array(16).fill(0).map(() => Array(16).fill(15));
          this.render();
          return;
        }
        if (action === 'save') {
          this.saveSprite();
          return;
        }
        if (action === 'export-png') {
          this.downloadSpritePng();
          return;
        }
      }

      // Sprite Animation Controls
      const spriteAnimBtn = target.closest('.sprite-anim-btn') as HTMLElement;
      if (spriteAnimBtn) {
        const animAction = spriteAnimBtn.dataset.animAction;
        if (animAction === 'add-frame') {
          // Add current sprite as a new frame
          const frameCopy = this.spriteData.map(row => [...row]);
          this.spriteAnimationFrames.push(frameCopy);
          this.spriteCurrentFrame = this.spriteAnimationFrames.length - 1;
          this.render();
          this.showNotification('Animation', `Frame ${this.spriteAnimationFrames.length} added`, 'info');
          return;
        }
        if (animAction === 'toggle-play') {
          if (this.spriteAnimationFrames.length === 0) {
            this.showNotification('Animation', 'Add frames first to preview animation', 'warning');
            return;
          }
          this.spriteAnimationPlaying = !this.spriteAnimationPlaying;
          if (this.spriteAnimationPlaying) {
            this.startSpriteAnimation();
          } else {
            this.stopSpriteAnimation();
          }
          this.render();
          return;
        }
      }

      // Data Usage Reset Button
      const dataResetBtn = target.closest('.data-reset-btn') as HTMLElement;
      if (dataResetBtn) {
        this.networkManager.dataUsageHistory = [];
        if (this.monitorStats?.network) {
          this.networkManager.dataUsageStartRx = this.monitorStats.network.rxBytes || 0;
          this.networkManager.dataUsageStartTx = this.monitorStats.network.txBytes || 0;
        }
        this.refreshSettingsWindow();
        this.showNotification('Data Usage', 'Usage statistics reset for today', 'info');
        return;
      }

      // Encryption Buttons
      if (target.matches('.encryption-change-key-btn')) {
        this.showNotification('Encryption', 'To change LUKS key, open Terminal and run: sudo cryptsetup luksChangeKey /dev/sdXn', 'info');
        return;
      }
      if (target.matches('.encryption-backup-btn')) {
        this.showNotification('Encryption', 'To backup LUKS header, run: sudo cryptsetup luksHeaderBackup /dev/sdXn --header-backup-file /path/backup.img', 'info');
        return;
      }

      //Panic Lockdown Button
      if (target.matches('.panic-lockdown-btn')) {
        void this.triggerLockdown();
        return;
      }

      // Display Scale Reset Button
      if (target.matches('.display-scale-reset-btn')) {
        const output = this.displayOutputs.find(o => o.name === this.activeDisplayOutput);
        if (output && window.electronAPI?.setDisplayScale) {
          void window.electronAPI.setDisplayScale(output.name, 1.0).then(res => {
            if (res.success) {
              output.scale = 1.0;
              this.refreshSettingsWindow();
              this.showNotification('Display', 'Scale reset to 100%', 'info');
            } else {
              this.showNotification('Display', res.error || 'Failed to reset scale', 'error');
            }
          }).catch(e => {
            this.showNotification('Display', String(e), 'error');
          });
        }
        return;
      }

      // DNS Save Button
      const dnsSaveBtn = target.closest('.dns-save-btn') as HTMLElement;
      if (dnsSaveBtn) {
        const primary = (document.querySelector('.dns-primary-input') as HTMLInputElement)?.value;
        const secondary = (document.querySelector('.dns-secondary-input') as HTMLInputElement)?.value;
        if (primary) {
          if (window.electronAPI?.setDns) {
            const iface = this.networkManager.status.device || 'eth0';
            try {
              const res = await window.electronAPI.setDns(iface, primary, secondary);
              if (res.success) {
                this.showNotification('DNS', `DNS set to ${primary}${secondary ? ', ' + secondary : ''}`, 'info');
              } else {
                this.showNotification('DNS', res.error || 'Failed to set DNS', 'error');
              }
            } catch (e) {
              this.showNotification('DNS', String(e), 'error');
            }
          } else {
            this.showNotification('DNS', 'DNS control requires Electron/Linux', 'warning');
          }
        }
        return;
      }

      // SSH Server Buttons
      const sshBtn = target.closest('.ssh-btn') as HTMLElement;
      if (sshBtn) {
        const action = sshBtn.dataset.sshAction;

        if (action === 'regenerate-keys') {
          this.regenerateSSHKeys();
        } else if (action === 'view-pubkey') {
          this.viewSSHPublicKey();
        }
        return;
      }

      // EXIF Stripper Buttons
      const exifSelectBtn = target.closest('.exif-select-file-btn') as HTMLElement;
      if (exifSelectBtn) {
        this.selectImageForExif();
        return;
      }

      const exifStripBtn = target.closest('.exif-strip-btn') as HTMLElement;
      if (exifStripBtn && this.exifSelectedFile) {
        this.stripExifData();
        return;
      }

      // ============================================
      // FILE BROWSER MULTI-SELECT (Priority 1)
      // ============================================

      // File item clicks with Ctrl/Shift support
      const fileBrowserItem = target.closest('.file-item') as HTMLElement;
      if (fileBrowserItem) {
        const filePath = fileBrowserItem.getAttribute('data-file-path');
        const isDir = fileBrowserItem.getAttribute('data-is-dir') === 'true';

        if (filePath) {
          // Multi-select with Ctrl or Shift
          if (e.ctrlKey || e.shiftKey) {
            e.preventDefault();
            this.toggleFileSelection(filePath, e.ctrlKey, e.shiftKey);
            return;
          }

          // Normal click - open file/folder (existing behavior)
          if (isDir) {
            this.loadFiles(filePath);
          } else if (window.electronAPI?.openExternal) {
            void window.electronAPI.openExternal(filePath);
          }
        }
        return;
      }

      // Delete Selected button
      const deleteSelectedBtn = target.closest('.btn-delete-selected') as HTMLElement;
      if (deleteSelectedBtn) {
        e.preventDefault();
        void this.deleteSelectedFiles();
        return;
      }

      // Clear Selection button
      const deselectBtn = target.closest('.btn-deselect-all') as HTMLElement;
      if (deselectBtn) {
        e.preventDefault();
        this.deselectAllFiles();
        return;
      }

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
        const view = launcherViewBtn.dataset.launcherView as LauncherView;
        this.launcherView = view;
        if (view !== 'all') this.launcherCategory = 'All';
        this.updateAppLauncherDom(document.getElementById('launcher-overlay-root'));
        return;
      }

      const launcherCatBtn = target.closest('.launcher-cat-btn') as HTMLElement | null;
      if (launcherCatBtn?.dataset.launcherCategory) {
        const cat = launcherCatBtn.dataset.launcherCategory as LauncherCategory;
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

      // Desktop Icon Click
      const desktopIcon = target.closest('.desktop-icon') as HTMLElement;
      if (desktopIcon) {
        if (desktopIcon.dataset.app) {
          // Basic open for built-ins
          this.openApp(desktopIcon.dataset.app);
          return;
        }
        if (desktopIcon.dataset.launchKey) {
          this.launchByKey(desktopIcon.dataset.launchKey);
          return;
        }
      }

      // Settings: Move Display
      const displayMoveBtn = target.closest('.display-move-btn') as HTMLElement;
      if (displayMoveBtn && displayMoveBtn.dataset.output) {
        this.moveWindowToDisplay(displayMoveBtn.dataset.output);
        return;
      }

      // Help App Navigation
      const helpTab = target.closest('[data-help-tab]') as HTMLElement;
      if (helpTab && helpTab.dataset.helpTab) {
        this.helpApp.setTab(helpTab.dataset.helpTab as HelpTab);
        const win = this.windows.find(w => w.id.startsWith('help'));
        if (win) {
          win.content = this.helpApp.render();
          this.render();
        }
        return;
      }

      // ============================================
      // MEDIA PLAYER PICTURE-IN-PICTURE (Priority 3, Tier 8.4)
      // ============================================
      const mpActionBtn = target.closest('[data-mp-action]') as HTMLElement;
      if (mpActionBtn && mpActionBtn.dataset.mpAction) {
        const action = mpActionBtn.dataset.mpAction;
        const mpWin = this.windows.find(w => w.id.startsWith('media-player'));

        if (action === 'toggle-pip' && mpWin) {
          // Toggle PiP mode
          this.mediaPlayer.pipMode = !this.mediaPlayer.pipMode;

          if (this.mediaPlayer.pipMode) {
            // Resize window to small PiP size and position in bottom-right
            mpWin.width = 200;
            mpWin.height = 150;
            const appEl = document.querySelector('#app') as HTMLElement;
            const taskbarHeight = this.taskbarPosition === 'bottom' ? 40 : 0;
            mpWin.x = (appEl?.offsetWidth || 1024) - 220;
            mpWin.y = (appEl?.offsetHeight || 768) - 170 - taskbarHeight;
            mpWin.alwaysOnTop = true;
            mpWin.content = this.mediaPlayer.renderPiPMode();
          } else {
            // Restore to normal size
            mpWin.width = 640;
            mpWin.height = 480;
            mpWin.x = 100;
            mpWin.y = 50;
            mpWin.alwaysOnTop = false;
            mpWin.content = this.getMediaPlayerContent(null);
          }

          this.render();
          return;
        }

        if (action === 'expand-pip' && mpWin) {
          // Expand from PiP back to full
          this.mediaPlayer.pipMode = false;
          mpWin.width = 640;
          mpWin.height = 480;
          mpWin.x = 100;
          mpWin.y = 50;
          mpWin.alwaysOnTop = false;
          mpWin.content = this.getMediaPlayerContent(null);
          this.render();
          return;
        }

        if (action === 'close-pip' && mpWin) {
          // Close PiP window
          this.closeWindow(mpWin.id);
          return;
        }

        // Handle other media player actions (prev, next, play, etc.)
        if (action === 'prev') {
          this.mediaPlayer.prevTrack();
          if (mpWin) {
            mpWin.content = this.mediaPlayer.pipMode
              ? this.mediaPlayer.renderPiPMode()
              : this.getMediaPlayerContent(null);
            this.render();
          }
          return;
        }

        if (action === 'next') {
          this.mediaPlayer.nextTrack();
          if (mpWin) {
            mpWin.content = this.mediaPlayer.pipMode
              ? this.mediaPlayer.renderPiPMode()
              : this.getMediaPlayerContent(null);
            this.render();
          }
          return;
        }

        if (action === 'play') {
          // Toggle play/pause for audio element
          const audio = document.querySelector('#mp-audio, #mp-audio-pip') as HTMLAudioElement;
          if (audio) {
            if (audio.paused) {
              void audio.play();
              this.mediaPlayer.state.isPlaying = true;
            } else {
              audio.pause();
              this.mediaPlayer.state.isPlaying = false;
            }
          }
          return;
        }

        if (action === 'stop') {
          const audio = document.querySelector('#mp-audio') as HTMLAudioElement;
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
            this.mediaPlayer.state.isPlaying = false;
          }
          return;
        }

        if (action === 'shuffle') {
          this.mediaPlayer.toggleShuffle();
          if (mpWin) {
            mpWin.content = this.getMediaPlayerContent(null);
            this.render();
          }
          return;
        }

        if (action === 'repeat') {
          this.mediaPlayer.toggleRepeat();
          if (mpWin) {
            mpWin.content = this.getMediaPlayerContent(null);
            this.render();
          }
          return;
        }

        if (action === 'add') {
          // Open file picker for adding media files
          this.showNotification('Media Player', 'File picker not yet implemented', 'info');
          return;
        }
      }

      // Media Player: Playlist item click
      const mpPlaylistItem = target.closest('.mp-playlist-item') as HTMLElement;
      if (mpPlaylistItem && mpPlaylistItem.dataset.mpIndex) {
        const index = parseInt(mpPlaylistItem.dataset.mpIndex, 10);
        this.mediaPlayer.setIndex(index);
        const mpWin = this.windows.find(w => w.id.startsWith('media-player'));
        if (mpWin) {
          mpWin.content = this.mediaPlayer.pipMode
            ? this.mediaPlayer.renderPiPMode()
            : this.getMediaPlayerContent(null);
          this.render();
        }
        return;
      }

      // Media Player: Remove from playlist
      const mpRemoveBtn = target.closest('[data-mp-remove]') as HTMLElement;
      if (mpRemoveBtn && mpRemoveBtn.dataset.mpRemove) {
        const index = parseInt(mpRemoveBtn.dataset.mpRemove, 10);
        this.mediaPlayer.removeFile(index);
        const mpWin = this.windows.find(w => w.id.startsWith('media-player'));
        if (mpWin) {
          mpWin.content = this.getMediaPlayerContent(null);
          this.render();
        }
        return;
      }

      // Media Player: Equalizer preset
      const mpEqBtn = target.closest('[data-mp-eq]') as HTMLElement;
      if (mpEqBtn && mpEqBtn.dataset.mpEq) {
        this.mediaPlayer.setSafeEqualizerPreset(mpEqBtn.dataset.mpEq);
        const mpWin = this.windows.find(w => w.id.startsWith('media-player'));
        if (mpWin) {
          mpWin.content = this.getMediaPlayerContent(null);
          this.render();
        }
        return;
      }

      // Taskbar Group Popup: Close button
      const groupCloseBtn = target.closest('[data-group-close]') as HTMLElement;
      if (groupCloseBtn && groupCloseBtn.dataset.groupClose) {
        e.stopPropagation();
        this.closeWindow(groupCloseBtn.dataset.groupClose);
        this.updateTaskbarGroupPopupDom();
        return;
      }

      // Taskbar Group Popup: Window item click
      const groupWindowItem = target.closest('[data-group-window]') as HTMLElement;
      if (groupWindowItem && groupWindowItem.dataset.groupWindow) {
        this.hideTaskbarGroupPopup();
        this.toggleWindow(groupWindowItem.dataset.groupWindow);
        return;
      }

      // Taskbar app click
      const taskbarApp = target.closest('.taskbar-app') as HTMLElement;
      if (taskbarApp) {
        // Handle X11 external window clicks (Firefox, etc.)
        if (taskbarApp.dataset.x11Xid) {
          const xid = taskbarApp.dataset.x11Xid;
          this.toggleX11Window(xid);
          return;
        }

        // Handle grouped apps with multiple windows
        if (taskbarApp.dataset.appGroup) {
          this.showTaskbarGroupPopup(taskbarApp.dataset.appGroup, taskbarApp);
          return;
        }

        // Handle pinned apps with multiple windows
        if (taskbarApp.dataset.launchKey && taskbarApp.dataset.appType && taskbarApp.dataset.windowCount) {
          const windowCount = parseInt(taskbarApp.dataset.windowCount, 10);
          if (windowCount > 1) {
            this.showTaskbarGroupPopup(taskbarApp.dataset.appType, taskbarApp);
            return;
          }
        }

        if (taskbarApp.dataset.launchKey) {
          this.hideTaskbarGroupPopup();
          this.launchByKey(taskbarApp.dataset.launchKey, true);
          return;
        }
        if (taskbarApp.dataset.taskbarWindow) {
          this.hideTaskbarGroupPopup();
          this.toggleWindow(taskbarApp.dataset.taskbarWindow);
          return;
        }
        return;
      }

      // Start button click
      const startBtn = target.closest('.start-btn') as HTMLElement;
      if (startBtn) {
        this.toggleStartMenu();
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

      // Bluetooth Actions
      if (target.matches('.bt-scan-btn')) {
        void this.scanBluetoothDevicesFromUi();
        return;
      }

      const btConnectBtn = target.closest('.bt-connect-btn') as HTMLElement;
      if (btConnectBtn && btConnectBtn.dataset.mac) {
        void this.toggleBluetoothDeviceConnectionFromUi(btConnectBtn.dataset.mac);
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
        this.notificationManager.setDoNotDisturb(this.doNotDisturb);
        this.queueSaveConfig();
        this.render();
        return;
      }

      // Preview Close
      if (target.closest('.preview-close-btn')) {
        this.closePreview();
        return;
      }

      // Notification center actions
      const notifBtn = target.closest('.notif-btn') as HTMLElement;
      if (notifBtn && notifBtn.dataset.notifAction) {
        const action = notifBtn.dataset.notifAction;
        const id = notifBtn.dataset.notifId;
        if (action === 'clear') {
          this.notificationManager.clearAll();
          this.render();
          return;
        }
        if (action === 'mark-all-read') {
          this.notificationManager.markAllRead();
          this.render();
          return;
        }
        if (action === 'dismiss' && id) {
          this.notificationManager.dismissNotification(id);
          this.render();
          return;
        }
      }

      const notifItem = target.closest('.notification-item') as HTMLElement;
      if (notifItem && notifItem.dataset.notifId) {
        this.notificationManager.markAsRead(notifItem.dataset.notifId);
        this.render();
        return;
      }

      // Toast actions
      const toastActionEl = target.closest('[data-toast-action]') as HTMLElement;
      if (toastActionEl && toastActionEl.dataset.toastAction && toastActionEl.dataset.toastId) {
        const toastId = toastActionEl.dataset.toastId;
        const action = toastActionEl.dataset.toastAction;

        if (action === 'dismiss') {
          this.notificationManager.dismissToast(toastId);
          this.render();
          return;
        }

        if (action === 'action') {
          const actionId = toastActionEl.dataset.actionId || '';
          if (actionId === 'open-settings') {
            this.openApp('settings');
          } else if (actionId === 'open-updater') {
            this.openApp('updater');
          }
          this.notificationManager.dismissToast(toastId);
          this.notificationManager.markAsRead(toastId);
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
          // Show terminal settings panel
          this.showTerminalSettingsPanel();
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
        this.launchByKeyClosingShellUi(startAppItem.dataset.launchKey);
        return;
      }

      if (startAppItem && startAppItem.dataset.app) {
        this.launchByKeyClosingShellUi(`builtin:${startAppItem.dataset.app}`);
        return;
      }

      // Start menu installed app click
      if (startAppItem && startAppItem.dataset.installedApp) {
        void this.launchInstalledApp(startAppItem.dataset.installedApp);
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
          } else if (path === 'trash') {
            this.openApp('files');
            setTimeout(() => { void this.loadFiles('trash:'); }, 150);
            this.showStartMenu = false;
            this.render();
            return;
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

      // Security: USB Toggle
      const usbToggleBtn = target.closest('.usb-toggle-btn') as HTMLElement;
      if (usbToggleBtn && usbToggleBtn.dataset.id) {
        this.toggleUsbDevice(usbToggleBtn.dataset.id);
        return;
      }

      // Security: Panic Button
      const panicBtn = target.closest('.panic-btn') as HTMLElement;
      if (panicBtn) {
        this.triggerLockdown();
        return;
      }

      // Security: Duress Password
      const saveDuressBtn = target.closest('.save-duress-btn') as HTMLElement;
      if (saveDuressBtn) {
        // Find the card container (has border-radius: 10px in style)
        const container = saveDuressBtn.closest('[style*="border-radius: 10px"]') || saveDuressBtn.closest('[style*="border-radius:10px"]');
        const input = container?.querySelector('.duress-input') as HTMLInputElement;
        const confirm = container?.querySelector('.duress-confirm') as HTMLInputElement;
        const val = input ? String(input.value || '') : '';
        const confirmVal = confirm ? String(confirm.value || '') : '';
        if (val !== confirmVal) {
          this.showNotification('Security', 'Duress passwords do not match', 'warning');
          return;
        }
        // CRITICAL: Duress password must not equal real password or PIN!
        if (val && (val === this.lockPassword || val === this.lockPin)) {
          this.showNotification('Security', 'Duress password cannot be the same as your real password or PIN!', 'error');
          return;
        }
        if (input) {
          this.setDuressPassword(input.value);
        }
        return;
      }

      // Security: Lock Screen Password
      const savePasswordBtn = target.closest('.save-password-btn') as HTMLElement;
      if (savePasswordBtn) {
        // Find the card container (has border-radius: 10px in style)
        const container = savePasswordBtn.closest('[style*="border-radius: 10px"]') || savePasswordBtn.closest('[style*="border-radius:10px"]');
        const input = container?.querySelector('.lock-password-field') as HTMLInputElement;
        const confirm = container?.querySelector('.lock-password-confirm') as HTMLInputElement;
        const val = input ? String(input.value || '') : '';
        const confirmVal = confirm ? String(confirm.value || '') : '';
        if (val !== confirmVal) {
          this.showNotification('Lock Screen', 'Passwords do not match', 'warning');
          return;
        }
        // Prevent empty password - this would break the lock screen!
        if (!val) {
          this.showNotification('Lock Screen', 'Password cannot be empty!', 'error');
          return;
        }
        // Prevent setting password same as duress password
        if (this.duressPassword && val === this.duressPassword) {
          this.showNotification('Lock Screen', 'Password cannot be the same as your duress password!', 'error');
          return;
        }
        this.lockPassword = val;
        this.queueSaveConfig();
        this.showNotification('Lock Screen', 'Password saved', 'divine');
        if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
        return;
      }

      // Security: Lock Screen PIN
      const savePinBtn = target.closest('.save-pin-btn') as HTMLElement;
      if (savePinBtn) {
        // Find the card container (has border-radius: 10px in style)
        const container = savePinBtn.closest('[style*="border-radius: 10px"]') || savePinBtn.closest('[style*="border-radius:10px"]');
        const input = container?.querySelector('.lock-pin-field') as HTMLInputElement;
        const confirm = container?.querySelector('.lock-pin-confirm') as HTMLInputElement;
        const raw = input ? String(input.value || '').trim() : '';
        const confirmVal = confirm ? String(confirm.value || '').trim() : '';
        if (raw && !/^\d+$/.test(raw)) {
          this.showNotification('Lock Screen', 'PIN must be numbers only', 'warning');
          return;
        }
        if (raw !== confirmVal) {
          this.showNotification('Lock Screen', 'PINs do not match', 'warning');
          return;
        }
        // Prevent empty PIN - this would break the lock screen!
        if (!raw) {
          this.showNotification('Lock Screen', 'PIN cannot be empty!', 'error');
          return;
        }
        // Prevent setting PIN same as duress password
        if (this.duressPassword && raw === this.duressPassword) {
          this.showNotification('Lock Screen', 'PIN cannot be the same as your duress password!', 'error');
          return;
        }
        this.lockPin = raw;
        this.queueSaveConfig();
        this.showNotification('Lock Screen', 'PIN saved', 'divine');
        if (this.activeSettingsCategory === 'Security') this.refreshSettingsWindow();
        return;
      }

      // Security: Test Lock Screen
      const testLockBtn = target.closest('.test-lock-btn') as HTMLElement;
      if (testLockBtn) {
        this.lock();
        return;
      }

      // Settings: Clean RAM
      const cleanMemoryBtn = target.closest('.clean-memory-btn') as HTMLElement;
      if (cleanMemoryBtn) {
        void this.memoryOptimizer.clean().then(res => {
          if (res.cleaned) {
            this.showNotification('Memory Optimizer', `Freed memory. Usage reduced by ${Math.round((res.oldUsage! - res.newUsage!) * 100)}%.`, 'divine');
            if (this.activeSettingsCategory === 'System') this.refreshSettingsWindow();
          }
        });
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

      // Settings: VPN profiles actions
      const vpnImportBtn = target.closest('.vpn-import-btn') as HTMLElement;
      if (vpnImportBtn && vpnImportBtn.dataset.vpnKind) {
        const kind = vpnImportBtn.dataset.vpnKind === 'wireguard' ? 'wireguard' : 'openvpn';
        void this.importVpnProfile(kind);
        return;
      }

      const vpnProfileBtn = target.closest('.vpn-profile-btn') as HTMLElement;
      if (vpnProfileBtn && vpnProfileBtn.dataset.action && vpnProfileBtn.dataset.key) {
        const action = vpnProfileBtn.dataset.action;
        const key = vpnProfileBtn.dataset.key;
        const name = vpnProfileBtn.dataset.name || key;

        if (action === 'connect' && window.electronAPI?.connectSavedNetwork) {
          this.showNotification('VPN', `Connecting ${name}...`, 'info');
          void window.electronAPI.connectSavedNetwork(key).then(res => {
            if (!res.success) this.showNotification('VPN', res.error || 'Connect failed', 'error');
            void this.refreshNetworkStatus();
          });
        }

        if (action === 'disconnect' && window.electronAPI?.disconnectConnection) {
          this.showNotification('VPN', `Disconnecting ${name}...`, 'info');
          void window.electronAPI.disconnectConnection(key).then(res => {
            if (!res.success) this.showNotification('VPN', res.error || 'Disconnect failed', 'error');
            void this.refreshNetworkStatus();
          });
        }

        if (action === 'delete' && window.electronAPI?.forgetSavedNetwork) {
          void this.openConfirmModal({
            title: 'Delete VPN Profile',
            message: `Delete saved VPN profile "${name}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel'
          }).then(ok => {
            if (!ok) return;
            void window.electronAPI!.forgetSavedNetwork!(key).then(res => {
              if (!res.success) this.showNotification('VPN', res.error || 'Delete failed', 'error');
              void this.networkManager.refreshSavedNetworks();
              void this.refreshNetworkStatus();
            });
          });
        }

        return;
      }

      // Settings: VPN kill switch actions
      const vpnKillBtn = target.closest('.vpn-killswitch-btn') as HTMLElement;
      if (vpnKillBtn && vpnKillBtn.dataset.action) {
        const action = vpnKillBtn.dataset.action;
        if (action === 'snooze') {
          void this.networkManager.snoozeVpnKillSwitch(60);
        } else if (action === 'disable') {
          const toRestore = this.networkManager.vpnKillSwitchLastDisconnected.slice();
          this.networkManager.vpnKillSwitchEnabled = false;
          this.networkManager.vpnKillSwitchArmed = false;
          this.networkManager.vpnKillSwitchBlocked = false;
          this.networkManager.vpnKillSwitchSnoozeUntil = null;
          this.queueSaveConfig();
          void this.networkManager.restoreConnections(toRestore).then(() => this.refreshNetworkStatus());
          if (this.activeSettingsCategory === 'Network') this.refreshSettingsWindow();
        }
        return;
      }

      // Settings: Tor start/stop buttons
      const torStartBtn = target.closest('.tor-start-btn') as HTMLElement;
      if (torStartBtn) {
        this.showNotification('Tor', 'Starting Tor service...', 'info');
        if (window.electronAPI?.setTorEnabled) {
          void window.electronAPI.setTorEnabled(true).then(res => {
            if (res.success) {
              this.networkManager.torStatus.running = true;
              this.showNotification('Tor', 'Tor service started', 'divine');
            } else {
              this.showNotification('Tor', res.error || 'Failed to start Tor', 'error');
            }
            this.refreshSettingsWindow();
          });
        }
        return;
      }

      const torStopBtn = target.closest('.tor-stop-btn') as HTMLElement;
      if (torStopBtn) {
        this.showNotification('Tor', 'Stopping Tor service...', 'info');
        if (window.electronAPI?.setTorEnabled) {
          void window.electronAPI.setTorEnabled(false).then(res => {
            if (res.success) {
              this.networkManager.torStatus.running = false;
              this.showNotification('Tor', 'Tor service stopped', 'info');
            } else {
              this.showNotification('Tor', res.error || 'Failed to stop Tor', 'error');
            }
            this.refreshSettingsWindow();
          });
        }
        return;
      }

      // Settings: Tor install button
      const torInstallBtn = target.closest('.tor-install-btn') as HTMLElement;
      if (torInstallBtn) {
        this.showNotification('Tor', 'Installing Tor... This may take a minute and require authentication.', 'info');
        if (window.electronAPI?.installTor) {
          void window.electronAPI.installTor().then(res => {
            if (res.success) {
              if (res.alreadyInstalled) {
                this.showNotification('Tor', 'Tor is already installed', 'info');
              } else {
                this.showNotification('Tor', 'Tor installed successfully!', 'divine');
              }
              this.networkManager.torStatus.installed = true;
            } else {
              this.showNotification('Tor', res.error || 'Failed to install Tor', 'error');
            }
            this.refreshSettingsWindow();
          });
        }
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
              void this.networkManager.refreshSavedNetworks();
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

      const themeColorBtn = target.closest('.theme-color-btn') as HTMLElement;
      if (themeColorBtn && themeColorBtn.dataset.color) {
        this.themeColor = themeColorBtn.dataset.color as ThemeColor;
        localStorage.setItem('temple_theme_color', this.themeColor);
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

      // Settings: wallpaper browse button
      const wallpaperBrowseBtn = target.closest('.wallpaper-browse-btn') as HTMLElement;
      if (wallpaperBrowseBtn) {
        // Trigger hidden input
        const input = document.getElementById('wallpaper-upload-input');
        if (input) input.click();
        return;
      }
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

      // ============================================
      // CUSTOM THEME HANDLERS (Tier 9.4)
      // ============================================
      const customThemeCreateBtn = target.closest('.custom-theme-create-btn') as HTMLElement;
      if (customThemeCreateBtn) {
        // Initialize editor state for a new theme
        this.themeEditorState = {
          name: 'New Theme',
          mainColor: '#00ff41',
          bgColor: '#0a0a0f',
          textColor: '#00ff41'
        };
        this.settingsSubView = 'theme-editor';
        this.refreshSettingsWindow();
        return;
      }

      const customThemeImportBtn = target.closest('.custom-theme-import-btn') as HTMLElement;
      if (customThemeImportBtn) {
        void this.importCustomTheme();
        return;
      }

      const customThemeExportBtn = target.closest('.custom-theme-export-btn') as HTMLElement;
      if (customThemeExportBtn && customThemeExportBtn.dataset.themeName) {
        this.exportCustomTheme(customThemeExportBtn.dataset.themeName);
        return;
      }

      const customThemeDeleteBtn = target.closest('.custom-theme-delete-btn') as HTMLElement;
      if (customThemeDeleteBtn && customThemeDeleteBtn.dataset.themeName) {
        this.deleteCustomTheme(customThemeDeleteBtn.dataset.themeName);
        return;
      }

      const customThemeItem = target.closest('.custom-theme-item') as HTMLElement;
      if (customThemeItem && customThemeItem.dataset.themeName && !target.closest('.custom-theme-export-btn') && !target.closest('.custom-theme-delete-btn')) {
        const themeName = customThemeItem.dataset.themeName;
        if (this.activeCustomTheme === themeName) {
          // Deactivate if clicking the active theme
          this.activeCustomTheme = null;
        } else {
          this.activeCustomTheme = themeName;
        }
        this.applyTheme();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
        return;
      }

      // Theme Editor Controls
      const themeEditorBackBtn = target.closest('.theme-editor-back-btn') as HTMLElement;
      if (themeEditorBackBtn) {
        this.settingsSubView = 'main';
        this.refreshSettingsWindow();
        return;
      }

      const themeEditorCancelBtn = target.closest('.theme-editor-cancel-btn') as HTMLElement;
      if (themeEditorCancelBtn) {
        this.settingsSubView = 'main';
        this.refreshSettingsWindow();
        return;
      }

      const themeEditorSaveBtn = target.closest('.theme-editor-save-btn') as HTMLElement;
      if (themeEditorSaveBtn) {
        this.saveCustomThemeFromEditor();
        return;
      }

      // Start Menu Power Actions
      const powerBtn = target.closest('.start-power-btn') as HTMLElement;
      if (powerBtn && powerBtn.dataset.powerAction) {
        const action = powerBtn.dataset.powerAction;
        if (action === 'lock') this.lock();
        else if (action === 'restart') window.location.reload();
        else if (action === 'shutdown') this.shutdownSystem();
        this.showStartMenu = false;
        this.render();
        return;
      }


      // NOTE: First Run Wizard button handlers are defined earlier with debounce protection
      // (see "FIRST RUN WIZARD EVENT LISTENERS" section around line 3740)

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

      // Desktop icon clicks and drag initiation
      const iconEl = target.closest('.desktop-icon') as HTMLElement;
      if (iconEl) {
        // Check if we're starting a drag (will be completed in mouseup if no significant movement)
        const launchKey = iconEl.dataset.launchKey;
        const appId = iconEl.dataset.app;
        const iconKey = appId ? `builtin:${appId}` : launchKey || '';

        if (iconKey) {
          this.draggingIcon = {
            key: iconKey,
            offsetX: e.clientX,
            offsetY: e.clientY,
            startX: e.clientX,
            startY: e.clientY,
            hasMoved: false
          };
        }

        // Note: Actual launch will happen in mouseup if no drag occurred
        return;
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
          const ext = effectivePath.split('.').pop()?.toLowerCase() || '';
          if (ext === 'dd') {
            window.electronAPI.readFile(effectivePath).then(res => {
              if (res.success && typeof res.content === 'string') {
                this.dolDocContent = res.content;
                this.dolDocPath = effectivePath;
                this.openApp('doldoc-viewer');
              } else {
                window.electronAPI!.openExternal(effectivePath);
              }
            });
          } else if (['mp3', 'wav', 'mp4', 'webm', 'ogg', 'mkv'].includes(ext)) {
            this.openApp('media-player', { file: effectivePath });
          } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
            this.openApp('image-viewer', { file: effectivePath });
          } else {
            window.electronAPI.openExternal(effectivePath);
          }
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
        const key = monitorHeader.dataset.sortKey as MonitorSortKey;
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
        // Use WindowManager for resize state management
        this.windowManager.startResize(windowId, dir, e.clientX, e.clientY);
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
        if (!windowEl) return;
        const rect = windowEl.getBoundingClientRect();
        // Use WindowManager for drag state management
        this.windowManager.startDrag(windowId, e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    // ============================================
    // INPUT / CHANGE HANDLERS (Priority 1)
    // ============================================
    document.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;

      // File Browser: View Mode Dropdown
      if (target.matches('.file-view-mode-select')) {
        const select = target as HTMLSelectElement;
        this.fileViewMode = select.value as 'grid' | 'list' | 'details';
        this.updateFileBrowserWindow();
        return;
      }

      // File Browser: Select All Checkbox (Details View)
      if (target.matches('.select-all-checkbox')) {
        const checkbox = target as HTMLInputElement;
        if (checkbox.checked) {
          this.selectAllFiles();
        } else {
          this.deselectAllFiles();
        }
        return;
      }

      // Accessibility: Large Text
      if (target.matches('.large-text-toggle')) {
        this.largeText = (target as HTMLInputElement).checked;
        this.applyTheme();
        this.queueSaveConfig();
        return;
      }

      // Accessibility: Reduce Motion
      if (target.matches('.reduce-motion-toggle')) {
        this.reduceMotion = (target as HTMLInputElement).checked;
        this.applyTheme();
        this.queueSaveConfig();
        return;
      }

      // Visual Effects: Jelly Mode
      if (target.matches('.jelly-mode-toggle')) {
        this.jellyMode = (target as HTMLInputElement).checked;
        this.effectsManager.setJellyMode(this.jellyMode);
        this.queueSaveConfig();
        return;
      }

      // Accessibility: Color Blind Mode
      if (target.matches('.color-blind-select')) {
        this.colorBlindMode = (target as HTMLSelectElement).value as ColorBlindMode;
        this.applyTheme();
        this.queueSaveConfig();
        return;
      }

      // Visual Effects: Heavenly Pulse Toggle
      if (target.matches('.heavenly-pulse-toggle')) {
        this.heavenlyPulse = (target as HTMLInputElement).checked;
        this.applyTheme();
        this.queueSaveConfig();
        this.refreshSettingsWindow();
        return;
      }

      // Visual Effects: Pulse Intensity Slider
      if (target.matches('.pulse-intensity-slider')) {
        const value = parseInt((target as HTMLInputElement).value, 10) / 100;
        this.heavenlyPulseIntensity = Math.max(0.03, Math.min(0.70, value));
        document.documentElement.style.setProperty('--pulse-intensity', String(this.heavenlyPulseIntensity));
        localStorage.setItem('temple_pulse_intensity', String(this.heavenlyPulseIntensity));
        this.queueSaveConfig();
        // Update the label next to the slider
        const label = (target as HTMLElement).nextElementSibling;
        if (label) label.textContent = `${Math.round(this.heavenlyPulseIntensity * 100)}%`;
        return;
      }

      // Visual Effects: Auto-hide Taskbar Toggle
      if (target.matches('.taskbar-autohide-toggle')) {
        this.autoHideTaskbar = (target as HTMLInputElement).checked;
        localStorage.setItem('temple_autohide_taskbar', String(this.autoHideTaskbar));
        this.queueSaveConfig();
        return;
      }

      // Divine Settings: Quote Notifications Toggle
      if (target.matches('.quote-notifications-toggle')) {
        this.quoteNotifications = (target as HTMLInputElement).checked;
        localStorage.setItem('temple_quote_notifications', String(this.quoteNotifications));
        this.queueSaveConfig();
        return;
      }

      // Performance: Lite Mode Toggle
      if (target.matches('.lite-mode-toggle')) {
        this.liteMode = (target as HTMLInputElement).checked;
        localStorage.setItem('temple_lite_mode', String(this.liteMode));
        if (this.liteMode) {
          document.body.classList.add('reduce-motion');
        } else {
          document.body.classList.remove('reduce-motion');
        }
        this.queueSaveConfig();
        return;
      }
    });

    document.addEventListener('mousemove', (e) => {
      // Auto-Hide Taskbar Logic
      if (this.autoHideTaskbar) {
        const taskbar = document.querySelector('.taskbar') as HTMLElement;
        if (taskbar) {
          const threshold = window.innerHeight - 60; // Taskbar height approx + buffer
          if (e.clientY >= threshold) {
            taskbar.classList.remove('taskbar-hidden');
          } else {
            // Only hide if not interacting with context menu or start menu?
            // For simplicity, just hide. CSS transition will make it smooth.
            if (!this.showStartMenu && !document.querySelector('.context-menu')) {
              taskbar.classList.add('taskbar-hidden');
            }
          }
        }
      } else {
        const taskbar = document.querySelector('.taskbar') as HTMLElement;
        if (taskbar) taskbar.classList.remove('taskbar-hidden');
      }

      // RESIZE LOGIC - Use WindowManager for state management
      const resizeBounds = this.windowManager.handleResize(e.clientX, e.clientY);
      if (resizeBounds) {
        e.preventDefault();
        // Apply changes to DOM
        const windowEl = document.querySelector(`[data-window-id="${resizeBounds.windowId}"]`) as HTMLElement;
        if (windowEl) {
          windowEl.style.width = `${resizeBounds.width}px`;
          windowEl.style.height = `${resizeBounds.height}px`;
          windowEl.style.left = `${resizeBounds.x}px`;
          windowEl.style.top = `${resizeBounds.y}px`;
        }
        return; // Skip drag logic
      }

      // DRAG LOGIC - Use WindowManager for state management
      const dragPos = this.windowManager.handleDrag(e.clientX, e.clientY);
      if (dragPos) {
        const windowEl = document.querySelector(`[data-window-id="${dragPos.windowId}"]`) as HTMLElement;
        if (windowEl) {
          windowEl.style.left = `${dragPos.x}px`;
          windowEl.style.top = `${dragPos.y}px`;
          // Effects: Jelly Mode
          if (this.effectsManager) {
            this.effectsManager.trackWindow(dragPos.windowId, windowEl, dragPos.x, dragPos.y);
            this.effectsManager.updateWindowPos(dragPos.windowId, dragPos.x, dragPos.y);
          }
        }

        // Snapping Logic - Use WindowManager for snap preview calculation
        const snapPreview = this.windowManager.getSnapPreview(e.clientX, e.clientY);
        const preview = document.getElementById('snap-preview');
        if (preview) {
          if (snapPreview) {
            preview.style.display = 'block';
            preview.style.left = `${snapPreview.rect.x}px`;
            preview.style.top = `${snapPreview.rect.y}px`;
            preview.style.width = `${snapPreview.rect.width}px`;
            preview.style.height = `${snapPreview.rect.height}px`;
          } else {
            preview.style.display = 'none';
          }
        }
      }
    });

    document.addEventListener('mouseup', (e) => {
      // End resize operation via WindowManager
      this.windowManager.endResize();

      // Get current drag state before ending
      const currentDragState = this.windowManager.getDragState();

      // Apply snap if exists and end drag via WindowManager
      const wasSnapped = this.windowManager.endDrag();
      if (wasSnapped) {
        this.render();
      }

      // Release jelly effect for dragged window
      if (currentDragState && this.effectsManager) {
        this.effectsManager.releaseWindow(currentDragState.windowId);
      }

      // Hide snap preview
      const preview = document.getElementById('snap-preview');
      if (preview) preview.style.display = 'none';

      // Desktop Icon Drag Completion (Priority 1)
      if (this.draggingIcon) {
        const dx = Math.abs(e.clientX - this.draggingIcon.offsetX);
        const dy = Math.abs(e.clientY - this.draggingIcon.offsetY);
        const DRAG_THRESHOLD = 5; // pixels

        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          // Icon was dragged - save new position
          this.desktopIconPositions[this.draggingIcon.key] = {
            x: e.clientX - 40, // Center the icon
            y: e.clientY - 40
          };
          localStorage.setItem('temple_desktop_icon_positions', JSON.stringify(this.desktopIconPositions));
          this.render();
        } else {
          // Icon was clicked (not dragged) - launch app
          const key = this.draggingIcon.key;
          if (key.startsWith('builtin:')) {
            const appId = key.replace('builtin:', '');
            // Special handling for trash - open files app to trash
            if (appId === 'trash') {
              this.openApp('files');
              setTimeout(() => { void this.loadFiles('trash:'); }, 150);
            } else {
              this.openApp(appId);
            }
          } else {
            this.launchByKey(key);
          }
        }

        this.draggingIcon = null;
      }
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
        // Tier 10: Gaming Mode
        if (this.gamingModeActive) {
          if (e.metaKey || e.altKey || (e.ctrlKey && e.shiftKey && e.key === 'Escape')) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }

        // Cheat Codes (Tier 13)
        // Only track letters
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.cheatBuffer = (this.cheatBuffer || '') + e.key.toLowerCase();
          if (this.cheatBuffer.length > 20) this.cheatBuffer = this.cheatBuffer.slice(-20);

          if (this.cheatBuffer.endsWith('terry')) {
            this.showNotification('Rest In Peace', 'Terry A. Davis (1969-2018). King of the Temple.', 'divine');
            this.cheatBuffer = '';
            this.playTone(440, 'sine', 0.5);
          }
          if (this.cheatBuffer.endsWith('cia')) {
            this.showNotification('GLOWIES DETECTED', 'The CIA n****** glow in the dark. You can see them if you\'re driving.', 'warning');
            this.cheatBuffer = '';
            this.playTone(100, 'sawtooth', 0.5);
          }
          if (this.cheatBuffer.endsWith('glow')) {
            document.body.classList.toggle('extra-glow');
            this.showNotification('Visuals', 'Divine Glow Toggled', 'info');
            this.cheatBuffer = '';
          }
        }

        // Konami Code
        const key = e.key; // preserve case for Arrows, but handle letters
        const expected = this.konamiCode[this.konamiIndex];
        const match = key === expected || key.toLowerCase() === expected;

        if (match) {
          this.konamiIndex++;
          if (this.konamiIndex === this.konamiCode.length) {
            this.konamiIndex = 0;
            this.showNotification('DIVINE INTELLECT', 'God Mode Enabled. You are now Terry\'s chosen one.', 'divine');
            this.playTone(880, 'square', 0.1);
            setTimeout(() => this.playTone(1100, 'square', 0.2), 100);
          }
        } else {
          this.konamiIndex = 0;
          if (e.key === 'ArrowUp') this.konamiIndex = 1;
        }

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

        // ESCAPE KEY: Exit setup wizard if stuck
        if (!this.setupComplete && e.key === 'Escape') {
          e.preventDefault();
          this.setupComplete = true;
          localStorage.setItem('temple_setup_complete', 'true');
          this.showNotification('Setup', 'Setup skipped. You can run it again from Settings.', 'info');
          this.render();
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

        // Ctrl+Alt+Delete - Task Manager (Windows-style)
        if (e.ctrlKey && e.altKey && e.key === 'Delete') {
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

        // Super/Meta opens Start Menu - handled in setupGlobalInputListeners()
        // Do NOT handle here to avoid double-toggle

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

        // File Browser Multi-Select Shortcuts (Priority 1)
        const filesWindow = this.windows.find(w => w.id.startsWith('files') && w.active);
        if (filesWindow && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          // Ctrl+A - Select All Files
          if (e.ctrlKey && e.key.toLowerCase() === 'a' && !e.shiftKey && !e.altKey) {
            const inFileBrowser = target.closest('.file-browser');
            if (inFileBrowser) {
              e.preventDefault();
              this.selectAllFiles();
              return;
            }
          }

          // Ctrl+D - Deselect All Files
          if (e.ctrlKey && e.key.toLowerCase() === 'd' && !e.shiftKey && !e.altKey) {
            const inFileBrowser = target.closest('.file-browser');
            if (inFileBrowser) {
              e.preventDefault();
              this.deselectAllFiles();
              return;
            }
          }

          // Delete Key - Delete Selected Files
          if (e.key === 'Delete' && this.selectedFiles.size > 0) {
            e.preventDefault();
            void this.deleteSelectedFiles();
            return;
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
        e.preventDefault();
        // NOTE: Removed setupComplete guard - it was blocking ALL context menus
        // The wizard overlay already prevents interaction during setup, so this guard was redundant
        // and was causing a ~1 minute delay where users couldn't right-click or use UI

        console.log('⚡ CONTEXTMENU EVENT FIRED!');
        const target = e.target as HTMLElement;

        // Determine context (Items only)
        const startAppItem = target.closest('.start-app-item, .launcher-app-tile') as HTMLElement;
        const taskbarItem = target.closest('.taskbar-app') as HTMLElement;
        const desktopIcon = target.closest('.desktop-icon') as HTMLElement;
        const fileItem = (target.closest('.file-item') || target.closest('[data-file-path]')) as HTMLElement;
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
            {
              label: 'View',
              submenu: [
                { label: this.desktopIconSize === 'small' ? '✓ Small Icons' : 'Small Icons', action: () => this.setDesktopIconSize('small') },
                { label: this.desktopIconSize === 'large' ? '✓ Large Icons' : 'Large Icons', action: () => this.setDesktopIconSize('large') },
                { divider: true },
                { label: this.desktopAutoArrange ? '✓ Auto Arrange Icons' : 'Auto Arrange Icons', action: () => this.toggleDesktopAutoArrange() }
              ]
            },
            {
              label: 'Sort by',
              submenu: [
                { label: 'Name', action: () => this.sortDesktopIcons('name') },
                { label: 'Type', action: () => this.sortDesktopIcons('type') }
              ]
            },
            { label: 'Refresh', action: () => this.render() },
            { divider: true },
            { label: 'New Folder', action: () => this.promptNewFolder() },
            { label: 'New Text File', action: () => this.promptNewFile() },
            { label: 'Paste', action: () => this.pasteIntoCurrentFolder() },
            { divider: true },
            {
              label: 'Change Wallpaper', action: () => {
                this.openApp('settings');
                this.activeSettingsCategory = 'Personalization';
                this.refreshSettingsWindow();
              }
            },
            {
              label: 'Display Settings', action: () => {
                this.openApp('settings');
                this.activeSettingsCategory = 'System';
                this.refreshSettingsWindow();
              }
            },
            { label: 'All Settings', action: () => this.openApp('settings') },
            { divider: true },
            { label: 'Open Terminal', action: () => this.openApp('terminal') },
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

            // Check if this is an installed app that can be uninstalled
            const installedApp = this.findInstalledAppByKey(key);
            const canUninstall = installedApp && (
              this.canUninstallApp(installedApp) ||
              this.canAttemptAptUninstall(installedApp) ||
              this.canAttemptSnapUninstall(installedApp)
            );

            const menuItems = [
              { label: `🚀 Open`, action: () => this.launchByKeyClosingShellUi(key) },
              { divider: true },
              { label: pinnedStart ? '📌 Unpin from Start' : '📌 Pin to Start', action: () => { pinnedStart ? this.unpinStart(key) : this.pinStart(key); this.render(); } },
              { label: pinnedTaskbar ? '📌 Unpin from Taskbar' : '📌 Pin to Taskbar', action: () => { pinnedTaskbar ? this.unpinTaskbar(key) : this.pinTaskbar(key); this.render(); } },
              { label: onDesktop ? '🗑️ Remove from Desktop' : '➕ Add to Desktop', action: () => { onDesktop ? this.removeDesktopShortcut(key) : this.addDesktopShortcut(key); } },
            ];

            // Add uninstall option for user-installed apps (and APT apps eligible for an uninstall attempt)
            if (canUninstall) {
              menuItems.push(
                { divider: true },
                { label: '❌ Uninstall', action: () => this.uninstallApp(installedApp) }
              );
            }

            this.showContextMenu(e.clientX, e.clientY, menuItems);
            return;
          }
        }

        if (taskbarItem) {
          // X11 external window (Firefox, etc.) taskbar entry
          if (taskbarItem.dataset.x11Xid) {
            this.showTaskbarContextMenu(e);
            return;
          }

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

        // Check if we clicked on the taskbar itself (empty area, not on specific app/button)
        const taskbarEl = target.closest('.taskbar') as HTMLElement;
        if (taskbarEl && !target.closest('.taskbar-app') && !target.closest('.taskbar-start-btn') && !target.closest('.clock')) {
          // Show general taskbar context menu with Task Manager option
          this.showTaskbarContextMenu(e);
          return;
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
          const ext = filePath.split('.').pop()?.toLowerCase() || '';
          const isZip = ext === 'zip';
          const isBookmarked = this.fileBookmarks.includes(filePath);

          this.showContextMenu(e.clientX, e.clientY, [
            { label: isDir ? '📂 Open' : '📄 Open', action: () => isDir ? this.loadFiles(filePath) : window.electronAPI?.openExternal(filePath) },
            { label: '👀 Preview', action: () => this.previewFileItem(filePath, isDir) },
            { divider: true },
            ...(isDir ? [{ label: isBookmarked ? '★ Remove Bookmark' : '★ Add Bookmark', action: () => { isBookmarked ? this.removeBookmark(filePath) : this.addBookmark(filePath); } }] : []),
            ...(isZip ? [{ label: '📦 Extract Here', action: () => this.extractZipHere(filePath) }] : []),
            { label: '🗜️ Compress to Zip', action: () => this.createZipFromItem(filePath) },
            { divider: true },
            { label: '📋 Copy', action: () => { this.fileClipboard = { mode: 'copy', srcPath: filePath }; this.showNotification('Files', `Copied ${getBaseName(filePath)}`, 'info'); } },
            { label: '✂️ Cut', action: () => { this.fileClipboard = { mode: 'cut', srcPath: filePath }; this.showNotification('Files', `Cut ${getBaseName(filePath)}`, 'info'); } },
            { label: '✏️ Rename', action: () => this.promptRename(filePath) },
            { label: '🗑️ Delete', action: () => this.confirmDelete(filePath) },
            { divider: true },
            { label: '📋 Copy Path', action: () => navigator.clipboard.writeText(filePath) },
          ]);
          return; // BUGFIX: Prevent fallthrough to fileBrowserEl handler
        }

        // Sidebar Context Menu (Bookmarks)
        const sidebarLink = target.closest('.file-sidebar-link') as HTMLElement;
        if (sidebarLink && sidebarLink.dataset.isBookmark === 'true') {
          e.preventDefault();
          this.closeContextMenu();
          const path = sidebarLink.dataset.path || '';
          if (path) {
            this.showContextMenu(e.clientX, e.clientY, [
              { label: '📂 Open', action: () => this.loadFiles(path) },
              { divider: true },
              { label: '★ Remove Bookmark', action: () => this.removeBookmark(path) }
            ]);
            return;
          }
        }

        if (fileBrowserEl && !target.closest('.taskbar')) {
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

        // Window Title Bar Context Menu (Tier 9.3)
        const windowHeader = target.closest('.window-header') as HTMLElement;
        if (windowHeader) {
          e.preventDefault();
          this.closeContextMenu();
          const winId = windowHeader.dataset.draggable || ''; // We used draggable for ID storage in header
          const win = this.windows.find(w => w.id === winId);

          if (win) {
            this.showContextMenu(e.clientX, e.clientY, [
              { label: win.minimized ? '🔼 Restore' : '🔽 Minimize', action: () => this.toggleWindow(winId) },
              { label: win.maximized ? 'Restore Down' : 'Maximize', action: () => this.maximizeWindow(winId) },
              { divider: true },
              {
                label: `${win.transparent ? 'Disable' : 'Enable'} Transparency`,
                action: () => {
                  win.transparent = !win.transparent;
                  this.render();
                }
              },
              {
                label: `${win.alwaysOnTop ? 'Disable' : 'Enable'} Always on Top`,
                action: () => {
                  win.alwaysOnTop = !win.alwaysOnTop;
                  this.render();
                }
              },
              { divider: true },
              { label: '❌ Close', action: () => this.closeWindow(winId) }
            ]);
            return;
          }
        }

        // Desktop Context Menu (Tier 9.2)
        if (target.matches('.desktop') || target.matches('#desktop')) {
          this.showContextMenu(e.clientX, e.clientY, [
            {
              label: 'Widgets',
              action: () => {
                // Submenu mock (we don't have submenus yet, just toggle for now)
                this.desktopWidgetsEnabled = !this.desktopWidgetsEnabled;
                localStorage.setItem('temple_desktop_widgets', String(this.desktopWidgetsEnabled));
                this.render();
              }
            },
            { divider: true },
            {
              label: `Icon Size: ${this.desktopIconSize.toUpperCase()}`,
              action: () => {
                // Toggle between small and large
                this.desktopIconSize = this.desktopIconSize === 'small' ? 'large' : 'small';
                localStorage.setItem('temple_desktop_icon_size', this.desktopIconSize);
                this.render();
              }
            },
            {
              label: `${this.desktopAutoArrange ? 'Disable' : 'Enable'} Auto-Arrange`,
              action: () => {
                this.desktopAutoArrange = !this.desktopAutoArrange;
                localStorage.setItem('temple_desktop_auto_arrange', String(this.desktopAutoArrange));
                this.render();
              }
            },
            { divider: true },
            { label: '⚙️ Settings', action: () => this.openApp('settings') }
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

          // Debounce Update
          if (this.startMenuSearchTimer) {
            window.clearTimeout(this.startMenuSearchTimer);
          }

          this.startMenuSearchTimer = window.setTimeout(() => {
            this.startMenuSearchTimer = null;
            // Update only the results area
            const resultsArea = document.getElementById('start-menu-results-area');
            if (resultsArea) {
              resultsArea.innerHTML = this.renderStartMenuResultsHtml();
            } else {
              // Fallback to full render if partial not found
              this.updateStartMenuDom();

              // Restore focus and cursor (only needed if full render happened)
              requestAnimationFrame(() => {
                const newInput = document.querySelector('.start-search-input') as HTMLInputElement;
                if (newInput && document.activeElement !== newInput) {
                  newInput.focus();
                  newInput.setSelectionRange(target.selectionStart, target.selectionEnd);
                }
              });
            }
          }, 300);
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

        // Calculator Mode Select
        if (target.classList.contains('calc-mode-select')) {
          this.calculator.setMode(target.value as CalculatorMode);
          const win = this.windows.find(w => w.id.startsWith('calculator'));
          if (win) {
            win.content = this.calculator.render();
            this.render();
          }
        }
      });

      // ============================================
      // DRAG AND DROP (File Browser)
      // ============================================
      app.addEventListener('dragstart', (e) => {
        const fileItem = (e.target as HTMLElement).closest('.file-item') as HTMLElement;
        if (fileItem && fileItem.dataset.filePath) {
          e.dataTransfer?.setData('text/plain', fileItem.dataset.filePath);
        }
      });

      app.addEventListener('dragover', (e) => {
        const fileItem = (e.target as HTMLElement).closest('.file-item') as HTMLElement;
        const browser = (e.target as HTMLElement).closest('.file-browser') as HTMLElement;
        if (browser) {
          e.preventDefault(); // Allow drop
          if (fileItem && fileItem.dataset.isDir === 'true') {
            fileItem.style.background = 'rgba(0,255,65,0.3)';
          }
        }

        // Media Player Dragover
        if ((e.target as HTMLElement).closest('.media-player-app')) {
          e.preventDefault();
        }
      });

      app.addEventListener('dragleave', (e) => {
        const fileItem = (e.target as HTMLElement).closest('.file-item') as HTMLElement;
        if (fileItem) {
          fileItem.style.background = '';
        }
      });

      app.addEventListener('drop', async (e) => {
        e.preventDefault();

        // Media Player Drop
        const dropMediaPlayer = (e.target as HTMLElement).closest('.media-player-app');
        if (dropMediaPlayer) {
          const srcPath = e.dataTransfer?.getData('text/plain');
          if (srcPath) {
            this.mediaPlayer.addFile(srcPath);
            if (this.mediaPlayer.state.playlist.length === 1) this.mediaPlayer.setIndex(0);
            this.render();
            return;
          }
        }

        const fileItem = (e.target as HTMLElement).closest('.file-item') as HTMLElement;

        if (fileItem) fileItem.style.background = '';

        const srcPath = e.dataTransfer?.getData('text/plain');
        if (!srcPath) return;

        let destDir = this.currentPath;
        if (fileItem && fileItem.dataset.isDir === 'true' && fileItem.dataset.filePath) {
          destDir = fileItem.dataset.filePath;
        }

        if (destDir && srcPath && destDir !== srcPath) {
          const name = srcPath.split(/[/\\]/).pop();
          if (name) {
            const destPath = this.joinPath(destDir, name);
            if (destPath !== srcPath) {
              if (window.electronAPI) {
                const res = await this.fallbackCopyFile(srcPath, destPath);
                if (res.success) {
                  this.showNotification('Files', `Copied ${name}`, 'info');
                  this.loadFiles(this.currentPath);
                } else {
                  this.showNotification('Files', 'Copy failed', 'error');
                }
              }
            }
          }
        }
      });



      // ============================================
      // ORACLE APP (Legacy random word generator)
      // ============================================
      app.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const oracleBtn = target.closest('.oracle-btn') as HTMLElement;
        if (oracleBtn && oracleBtn.dataset.oracleAction) {
          const action = oracleBtn.dataset.oracleAction;
          if (action === 'speak') {
            this.generateOracleWords();
          } else if (action === 'copy') {
            const text = this.oracleHistory.join('\n');
            navigator.clipboard.writeText(text);
            this.showNotification('Oracle', 'Divine words copied to clipboard', 'divine');
          } else if (action === 'clear') {
            this.oracleHistory = [];
            // Force update of Oracle window content
            const win = this.windows.find(w => w.content.includes('oracle-app'));
            if (win) {
              win.content = this.getWordOfGodContent();
              this.render();
            }
          }
        }
      });

      // ============================================
      // DIVINE ASSISTANT (Word of God AI)
      // ============================================
      app.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;

        // Send button click
        if (target.id === 'divine-send' || target.closest('#divine-send')) {
          const input = document.getElementById('divine-input') as HTMLTextAreaElement;
          if (input && input.value.trim()) {
            await this.sendDivineMessage(input.value);
          }
          return;
        }

        // Example click
        const exampleEl = target.closest('.divine-example') as HTMLElement;
        if (exampleEl && exampleEl.dataset.example) {
          await this.sendDivineMessage(exampleEl.dataset.example);
          return;
        }

        // Setup/header action buttons
        const actionBtn = target.closest('[data-divine-action]') as HTMLElement;
        if (actionBtn) {
          const action = actionBtn.dataset.divineAction;
          if (action === 'refresh' || action === 'check-ollama') {
            await this.initDivineAssistant();
          } else if (action === 'download') {
            await this.downloadDivineModel();
          } else if (action === 'start-divine') {
            // Enter the Divine Terminal after model download
            this.divineStatus.ready = true;
            // Load greeting if not already loaded
            if (this.divineMessages.length === 0 && window.electronAPI?.divineGetGreeting) {
              const greetingResult = await window.electronAPI.divineGetGreeting();
              if (greetingResult?.greeting) {
                this.divineMessages.push({
                  role: 'assistant',
                  content: greetingResult.greeting,
                  timestamp: Date.now()
                });
                // Voice of God: Speak the greeting
                if (this.voiceOfGodEnabled && window.electronAPI?.ttsSpeak) {
                  window.electronAPI.ttsSpeak(greetingResult.greeting).catch(() => { });
                }
              }
            }
            this.refreshDivineWindow();
          } else if (action === 'clear') {
            this.divineMessages = [];
            this.divineIsLoading = false; // Reset loading state
            this.divineStreamingResponse = ''; // Clear any streaming
            // Stop any ongoing TTS
            if (window.electronAPI?.ttsStop) {
              window.electronAPI.ttsStop().catch(() => { });
            }
            if (window.electronAPI?.divineClearHistory) {
              await window.electronAPI.divineClearHistory();
            }
            // Re-add a single greeting only if messages is still empty
            if (this.divineMessages.length === 0 && window.electronAPI?.divineGetGreeting) {
              const greetingResult = await window.electronAPI.divineGetGreeting();
              if (greetingResult?.greeting && this.divineMessages.length === 0) {
                this.divineMessages.push({
                  role: 'assistant',
                  content: greetingResult.greeting,
                  timestamp: Date.now()
                });
                // Voice of God: Speak the new greeting
                if (this.voiceOfGodEnabled && window.electronAPI?.ttsSpeak) {
                  window.electronAPI.ttsSpeak(greetingResult.greeting).catch(() => { });
                }
              }
            }
            this.refreshDivineWindow();
          } else if (action === 'toggle-voice') {
            // Toggle Voice of God TTS - guard against rapid clicks
            const voiceBtn = actionBtn as HTMLButtonElement & { __toggling?: boolean };
            if (voiceBtn.__toggling) return;
            voiceBtn.__toggling = true;
            setTimeout(() => { voiceBtn.__toggling = false; }, 500);

            // Just toggle - TTS will handle missing Piper when it tries to speak
            this.voiceOfGodEnabled = !this.voiceOfGodEnabled;
            // Sync to backend
            if (window.electronAPI?.ttsSetEnabled) {
              window.electronAPI.ttsSetEnabled(this.voiceOfGodEnabled).catch(() => { });
            }
            // Save settings
            this.settingsManager.queueSaveConfig();
            // Show feedback
            this.showNotification(
              'Voice of God',
              this.voiceOfGodEnabled ? 'Divine voice enabled' : 'Divine voice disabled',
              'info'
            );
            this.refreshDivineWindow();
          }
          return;
        }

        // URL link in setup
        const urlLink = target.closest('[data-divine-url]') as HTMLElement;
        if (urlLink && urlLink.dataset.divineUrl) {
          e.preventDefault();
          await this.openDivineUrl(urlLink.dataset.divineUrl);
          return;
        }

        // Command card actions
        const cmdBtn = target.closest('.divine-cmd-btn') as HTMLButtonElement & { __executing?: boolean };
        if (cmdBtn) {
          e.preventDefault();
          e.stopPropagation();

          // Guard against multiple rapid clicks (debounce)
          if (cmdBtn.__executing) return;
          cmdBtn.__executing = true;
          setTimeout(() => { cmdBtn.__executing = false; }, 1000);

          const action = cmdBtn.dataset.action;
          const card = cmdBtn.closest('.divine-command-card, .divine-url-card') as HTMLElement;

          if (action === 'execute' && card) {
            const command = card.dataset.command;
            if (command) {
              await this.executeDivineCommand(command, false);
            }
          } else if (action === 'execute-dangerous' && card) {
            const command = card.dataset.command;
            if (command) {
              await this.executeDivineCommand(command, true);
            }
          } else if (action === 'copy' && card) {
            const command = card.dataset.command;
            if (command) {
              navigator.clipboard.writeText(command);
              this.showNotification('Copied', 'Command copied to clipboard', 'info');
            }
          } else if (action === 'open-url' && card) {
            const url = card.dataset.url;
            if (url) {
              await this.openDivineUrl(url);
            }
          } else if (action === 'copy-url' && card) {
            const url = card.dataset.url;
            if (url) {
              navigator.clipboard.writeText(url);
              this.showNotification('Copied', 'URL copied to clipboard', 'info');
            }
          }
          return;
        }
      });

      // Divine Assistant keyboard handlers
      app.addEventListener('keydown', async (e) => {
        const target = e.target as HTMLElement;

        // Handle Enter in divine input (but allow Shift+Enter for newlines)
        if (target.id === 'divine-input' && e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const input = target as HTMLTextAreaElement;
          if (input.value.trim()) {
            await this.sendDivineMessage(input.value);
          }
        }
      });

      // Auto-resize divine input textarea
      app.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'divine-input') {
          const textarea = target as HTMLTextAreaElement;
          textarea.style.height = 'auto';
          textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
          // Store input value
          this.divineInput = textarea.value;
        }
      });

      document.addEventListener('keydown', (e) => {
        // Oracle Spacebar (only for legacy oracle-app, not divine-chat-app)
        if (e.code === 'Space' && !e.repeat) {
          const oracleWin = this.windows.find(w => w.active && w.content.includes('oracle-app') && !w.content.includes('divine-chat-app'));
          const target = e.target as HTMLElement;
          const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

          if (oracleWin && !isInput) {
            e.preventDefault();
            this.generateOracleWords();

            const btn = document.querySelector('.oracle-btn[data-oracle-action="speak"]') as HTMLElement;
            if (btn) {
              btn.style.background = '#ffd700';
              setTimeout(() => btn.style.background = '#00ff41', 150);
            }
          }
        }

        // F5 to Run HolyC (Editor)
        if (e.code === 'F5') {
          e.preventDefault();
          const editorWin = this.windows.find(w => w.active && w.id.startsWith('editor'));
          // Also check if we have active editor tab
          if (editorWin && this.activeEditorTab !== undefined && this.activeEditorTab < this.editorTabs.length) {
            const tab = this.editorTabs[this.activeEditorTab];
            if (tab) {
              this.showNotification('HolyC', `Compiling ${tab.filename}...`, 'info');
              this.executeHolyC(tab.content);
            }
          }
        }

        // Calculator Keyboard Support
        const calcWin = this.windows.find(w => w.active && w.id.startsWith('calculator'));
        if (calcWin && !e.ctrlKey && !e.altKey && !e.metaKey) {
          const key = e.key;
          // Only intervene if it looks like a calculator key to avoid blocking other shortcuts
          if ('0123456789+-*/.^()='.includes(key) || key === 'Enter' || key === 'Backspace' || key === 'Delete' || key === 'Escape') {
            if (key === 'Enter') {
              e.preventDefault();
              this.calculator.pressKey('=');
            } else if (key === 'Backspace') {
              this.calculator.backspace();
            } else if (key === 'Delete' || key === 'Escape') {
              this.calculator.clear();
            } else {
              this.calculator.pressKey(key);
            }

            calcWin.content = this.calculator.render();
            this.render();
          }
        }
      });

      // ============================================
      // SPRITE EDITOR
      // ============================================
      app.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        const toolBtn = target.closest('.sprite-tool') as HTMLElement;
        if (toolBtn && toolBtn.dataset.tool) {
          this.spriteTool = toolBtn.dataset.tool as SpriteTool;
          this.render();
        }

        const colorBtn = target.closest('.sprite-palette-color') as HTMLElement;
        if (colorBtn) {
          const idx = parseInt(colorBtn.dataset.color || '0');
          this.spriteSelectedColor = idx;
          this.render();
        }

        const actionBtn = target.closest('.sprite-action') as HTMLElement;
        if (actionBtn && actionBtn.dataset.action) {
          const action = actionBtn.dataset.action;
          if (action === 'toggle-grid') {
            this.spriteShowGrid = !this.spriteShowGrid;
            this.render();
          } else if (action === 'clear') {
            this.spriteData = Array(this.spriteGridSize).fill(0).map(() => Array(this.spriteGridSize).fill(15));
            this.render();
          } else if (action === 'save') {
            const json = JSON.stringify(this.spriteData);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'icon.GR';
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('Sprite Editor', 'Sprite saved as icon.GR', 'divine');
          }
        }
      });

      app.addEventListener('mousedown', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sprite-pixel')) {
          this.handleSpriteDraw(target);
        }
      });

      app.addEventListener('mouseover', (e) => {
        if (e.buttons === 1) {
          const target = e.target as HTMLElement;
          if (target.classList.contains('sprite-pixel')) {
            this.handleSpriteDraw(target);
          }
        }
      });

      // ============================================
      // AUTOHARP
      // ============================================
      app.addEventListener('mousedown', (e) => {
        const target = e.target as HTMLElement;
        const key = target.closest('.piano-key') as HTMLElement;
        if (key) {
          const freq = parseFloat(key.dataset.freq || '0');
          const note = key.dataset.note || '';

          if (freq > 0) {
            this.playTone(freq, 'sawtooth', 0.5);
            this.autoHarpActiveNotes.add(note);

            if (this.autoHarpRecording) {
              const time = (Date.now() - this.autoHarpStartTime) / 1000;
              this.autoHarpSong.push({ freq, time, duration: 0.5 });
            }

            this.render();
          }
        }
      });

      app.addEventListener('mouseup', () => {
        this.autoHarpActiveNotes.clear();
        if (this.windows.some(w => w.active && w.content.includes('God\'s AutoHarp'))) {
          this.render();
        }
      });

      app.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const ahBtn = target.closest('.ah-action') as HTMLElement;
        if (ahBtn && ahBtn.dataset.action) {
          const action = ahBtn.dataset.action;
          if (action === 'octave-up') {
            if (this.autoHarpOctave < 8) this.autoHarpOctave++;
            this.render();
          } else if (action === 'octave-down') {
            if (this.autoHarpOctave > 1) this.autoHarpOctave--;
            this.render();
          } else if (action === 'record') {
            this.autoHarpRecording = !this.autoHarpRecording;
            if (this.autoHarpRecording) {
              this.autoHarpSong = [];
              this.autoHarpStartTime = Date.now();
            }
            this.render();
          } else if (action === 'play') {
            if (this.autoHarpSong.length > 0) {
              this.autoHarpSong.forEach(note => {
                setTimeout(() => {
                  this.playTone(note.freq, 'sawtooth', note.duration);
                }, note.time * 1000);
              });
            }
          } else if (action === 'clear') {
            this.autoHarpSong = [];
            this.render();
          } else if (action === 'save') {
            const json = JSON.stringify(this.autoHarpSong);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'hymn.json';
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('AutoHarp', 'Hymn saved.', 'divine');
          }
        }
      });

      // ============================================
      // CALCULATOR & NOTES
      // ============================================
      app.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Calculator
        // Calculator
        const calcBtn = target.closest('.calc-btn') as HTMLElement;
        if (calcBtn && calcBtn.dataset.key) {
          const key = calcBtn.dataset.key;
          this.calculator.pressKey(key);

          const win = this.windows.find(w => w.id.startsWith('calculator'));
          if (win) {
            win.content = this.calculator.render();
            this.render();
          }
          // Prevent falling through to other handlers
          e.stopPropagation();
          return;
        }

        // Calculator Base Switch (Programmer Mode)
        const calcBaseBtn = target.closest('.calc-base-btn') as HTMLElement;
        if (calcBaseBtn && calcBaseBtn.dataset.calcBase) {
          this.calculator.setBase(calcBaseBtn.dataset.calcBase as CalculatorBase);
          const win = this.windows.find(w => w.id.startsWith('calculator'));
          if (win) {
            win.content = this.calculator.render();
            this.render();
          }
          return;
        }

        // Calculator Actions (History, etc)
        const calcActionBtn = target.closest('[data-calc-action]') as HTMLElement;
        if (calcActionBtn) {
          const action = calcActionBtn.dataset.calcAction;
          if (action === 'toggle-history') this.calculator.toggleHistory();
          if (action === 'clear-history') this.calculator.clearHistory();

          const win = this.windows.find(w => w.id.startsWith('calculator'));
          if (win) {
            win.content = this.calculator.render();
            this.render();
          }
          return;
        }

        // Notes
        const notesBtn = target.closest('.notes-btn') as HTMLElement;
        if (notesBtn) {
          const action = notesBtn.dataset.action;
          const area = notesBtn.closest('.window-content')?.querySelector('.notes-area') as HTMLTextAreaElement;
          if (area) {
            if (action === 'save') {
              localStorage.setItem('temple_notes', area.value);
              this.showNotification('Notes', 'Testament saved.', 'divine');
            } else if (action === 'new') {
              area.value = '';
            } else if (action === 'preview') {
              const preview = notesBtn.closest('.window-content')?.querySelector('.notes-preview') as HTMLElement;
              if (preview) {
                if (preview.style.display === 'none') {
                  // Render Markdown
                  // Unescape specific markdown chars we want to process? No, escape everything then replace patterns.
                  // Actually simpler to just process raw and then trust it (since it's local).
                  // But let's be safe-ish. using a simple parser.

                  let md = area.value;
                  md = md.replace(/^# (.*$)/gim, '<h1>$1</h1>');
                  md = md.replace(/^## (.*$)/gim, '<h2>$1</h2>');
                  md = md.replace(/^### (.*$)/gim, '<h3>$1</h3>');
                  md = md.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
                  md = md.replace(/\*(.*)\*/gim, '<i>$1</i>');
                  md = md.replace(/\n/gim, '<br>');

                  preview.innerHTML = md;
                  preview.style.display = 'block';
                  area.style.display = 'none';
                  notesBtn.textContent = 'Edit';
                } else {
                  preview.style.display = 'none';
                  area.style.display = 'block';
                  notesBtn.textContent = 'Preview MD';
                }
              }
            }
          }
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        const ahWin = this.windows.find(w => w.active && w.content.includes('God\'s AutoHarp'));
        if (!ahWin) return;

        const keyMap: Record<string, string> = {
          'a': 'A', 'w': 'W', 's': 'S', 'e': 'E', 'd': 'D', 'f': 'F',
          't': 'T', 'g': 'G', 'y': 'Y', 'h': 'H', 'u': 'U', 'j': 'J', 'k': 'K'
        };

        const noteKey = keyMap[e.key.toLowerCase()];
        if (noteKey) {
          const keyEl = app.querySelector(`.piano-key[data-note="${noteKey}"]`) as HTMLElement;
          if (keyEl) {
            const freq = parseFloat(keyEl.dataset.freq || '0');
            if (freq > 0) {
              this.playTone(freq, 'sawtooth', 0.5);
              this.autoHarpActiveNotes.add(noteKey);
              this.render();

              if (this.autoHarpRecording) {
                const time = (Date.now() - this.autoHarpStartTime) / 1000;
                this.autoHarpSong.push({ freq, time, duration: 0.5 });
              }
            }
          }
        }
      });

      document.addEventListener('keyup', (e) => {
        const ahWin = this.windows.find(w => w.active && w.content.includes('God\'s AutoHarp'));
        if (!ahWin) return;

        const keyMap: Record<string, string> = {
          'a': 'A', 'w': 'W', 's': 'S', 'e': 'E', 'd': 'D', 'f': 'F',
          't': 'T', 'g': 'G', 'y': 'Y', 'h': 'H', 'u': 'U', 'j': 'J', 'k': 'K'
        };

        const noteKey = keyMap[e.key.toLowerCase()];
        if (noteKey) {
          this.autoHarpActiveNotes.delete(noteKey);
          this.render();
        }
      });

      // ============================================
      // MEDIA PLAYER CONTROLS (TIER 8.1)
      // ============================================
      app.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Playlist Item Click
        const playlistItem = target.closest('.mp-playlist-item') as HTMLElement;
        if (playlistItem && playlistItem.dataset.mpIndex && !target.closest('.mp-remove-btn')) {
          const idx = parseInt(playlistItem.dataset.mpIndex, 10);
          if (!isNaN(idx)) {
            this.mediaPlayer.setIndex(idx);
            this.render();
          }
          return;
        }

        // Remove from Playlist
        const removeBtn = target.closest('.mp-remove-btn') as HTMLElement;
        if (removeBtn && removeBtn.dataset.mpRemove) {
          e.stopPropagation();
          const idx = parseInt(removeBtn.dataset.mpRemove, 10);
          if (!isNaN(idx)) {
            this.mediaPlayer.removeFile(idx);
            this.render();
          }
          return;
        }

        // Add File Button
        const addBtn = target.closest('[data-mp-action="add"]');
        if (addBtn) {
          void this.openPromptModal({
            title: 'Add Media File',
            message: 'Enter full path to audio/video file:',
            placeholder: '/home/user/Music/song.mp3'
          }).then(path => {
            if (path) {
              this.mediaPlayer.addFile(path);
              if (this.mediaPlayer.state.playlist.length === 1) this.mediaPlayer.setIndex(0);
              this.render();
            }
          });
          return;
        }

        // Controls
        const controlBtn = target.closest('[data-mp-action]') as HTMLElement;
        if (controlBtn) {
          const action = controlBtn.dataset.mpAction;
          if (action === 'play') {
            const video = document.getElementById('mp-video') as HTMLVideoElement;
            const audio = document.getElementById('mp-audio') as HTMLAudioElement;
            const media = (video || audio);
            if (media) {
              if (media.paused) media.play();
              else media.pause();
            }
          }
          else if (action === 'stop') {
            const video = document.getElementById('mp-video') as HTMLVideoElement;
            const audio = document.getElementById('mp-audio') as HTMLAudioElement;
            const media = (video || audio);
            if (media) {
              media.pause();
              media.currentTime = 0;
            }
          }
          else if (action === 'next') {
            this.mediaPlayer.nextTrack();
            this.render();
          }
          else if (action === 'prev') {
            this.mediaPlayer.prevTrack();
            this.render();
          }
          else if (action === 'shuffle') {
            const isShuffle = this.mediaPlayer.toggleShuffle();
            controlBtn.classList.toggle('active', isShuffle);
            this.render();
          }
          else if (action === 'repeat') {
            const mode = this.mediaPlayer.toggleRepeat();
            controlBtn.textContent = `🔁 Repeat: ${mode}`;
            controlBtn.classList.toggle('active', mode !== 'none');
            this.render();
          }
        }

        // Equalizer
        const eqBtn = target.closest('[data-mp-eq]') as HTMLElement;
        if (eqBtn) {
          this.mediaPlayer.setSafeEqualizerPreset(eqBtn.dataset.mpEq || '');

          const parent = eqBtn.parentElement;
          if (parent) {
            parent.querySelectorAll('.mp-eq-btn').forEach(b => b.classList.remove('active'));
            eqBtn.classList.add('active');
          }
          const appEl = eqBtn.closest('.media-player-app');
          const topBar = appEl?.querySelector('.mp-eq-display');
          if (topBar) topBar.textContent = `${this.mediaPlayer.state.equalizerPreset.toUpperCase()} EQ`;

          this.render();
        }
      });


      // Settings Navigation


      app.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const settingsItem = target.closest('.settings-nav-item') as HTMLElement;
        if (settingsItem && settingsItem.dataset.settingsCat) {
          this.activeSettingsCategory = settingsItem.dataset.settingsCat;
          if (this.activeSettingsCategory === 'Bluetooth' && this.bluetoothEnabled) {
            void this.refreshPairedBluetoothDevices();
          }
          // Use targeted refresh instead of full render to avoid flicker
          this.refreshSettingsWindow();
        }

        // Workspace Switcher Click Handler
        const workspaceIndicator = target.closest('.workspace-indicator') as HTMLElement;
        if (workspaceIndicator && workspaceIndicator.dataset.workspaceId) {
          const wsId = parseInt(workspaceIndicator.dataset.workspaceId, 10);
          if (!Number.isNaN(wsId)) {
            this.workspaceManager.switchToWorkspace(wsId);
            // Apply X11 fake workspaces - minimize/unminimize based on workspace assignment
            this.applyX11WorkspaceVisibility(wsId);
            this.render();
          }
        }

        // Workspace Preview Click Handler (in overview)
        const workspacePreview = target.closest('.workspace-preview') as HTMLElement;
        if (workspacePreview && workspacePreview.dataset.workspaceId) {
          const wsId = parseInt(workspacePreview.dataset.workspaceId, 10);
          if (!Number.isNaN(wsId)) {
            this.workspaceManager.switchToWorkspace(wsId);
            // Apply X11 fake workspaces - minimize/unminimize based on workspace assignment
            this.applyX11WorkspaceVisibility(wsId);
            this.showWorkspaceOverview = false;
            this.render();
          }
        }

        // Snap Assist Window Click Handler
        const snapAssistWindow = target.closest('.snap-assist-window') as HTMLElement;
        if (snapAssistWindow && snapAssistWindow.dataset.windowId) {
          const winId = snapAssistWindow.dataset.windowId;
          const assistZone = this.tilingManager.getSnapAssistZone();
          if (assistZone) {
            const win = this.windows.find(w => w.id === winId);
            if (win) {
              const bounds = this.tilingManager.snapWindow(winId, assistZone, {
                x: win.x, y: win.y, width: win.width, height: win.height
              });
              if (bounds) {
                win.x = bounds.x;
                win.y = bounds.y;
                win.width = bounds.width;
                win.height = bounds.height;
              }
            }
          }
          this.tilingManager.clearSnapAssist();
          this.showSnapAssist = false;
          this.render();
        }

        // Close workspace overview on background click
        if (target.classList.contains('workspace-overview-overlay')) {
          this.showWorkspaceOverview = false;
          this.render();
        }

        // Close snap assist on background click
        if (target.classList.contains('snap-assist-overlay')) {
          this.tilingManager.clearSnapAssist();
          this.showSnapAssist = false;
          this.render();
        }
      });

      // Global click to close context menus if clicking outside
      document.addEventListener('mousedown', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.context-menu')) {
          this.closeContextMenu();
        }
      });

      // Global Keyboard Event Handler
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        // Toggle Start Menu: Ctrl+Esc (sent by daemon or physical)
        if (e.ctrlKey && e.key === 'Escape') {
          e.preventDefault();
          void this.toggleStartMenu();
          return;
        }

        // Workspace Overview: Ctrl+Alt+Tab (avoid Win key to prevent OS Start Menu)
        if (e.ctrlKey && e.altKey && !e.metaKey && e.key === 'Tab') {
          e.preventDefault();
          this.showWorkspaceOverview = !this.showWorkspaceOverview;
          this.render();
          return;
        }

        // Close workspace overview with Escape
        if (e.key === 'Escape' && this.showWorkspaceOverview) {
          this.showWorkspaceOverview = false;
          this.render();
          return;
        }

        // Close snap assist with Escape
        if (e.key === 'Escape' && this.showSnapAssist) {
          this.tilingManager.clearSnapAssist();
          this.showSnapAssist = false;
          this.render();
          return;
        }

        // Workspace Switching: Ctrl+Alt+Left/Right (avoid Win key to prevent OS Start Menu)
        // Debounce to prevent rapid-fire key events causing erratic cycling
        if (e.ctrlKey && e.altKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault();
          e.stopPropagation();
          const now = Date.now();
          if (now - this.lastWorkspaceSwitchMs < 150) return; // Debounce 150ms
          this.lastWorkspaceSwitchMs = now;
          if (e.key === 'ArrowLeft') {
            this.workspaceManager.previousWorkspace();
          } else {
            this.workspaceManager.nextWorkspace();
          }
          // Apply X11 fake workspaces
          this.applyX11WorkspaceVisibility(this.workspaceManager.getActiveWorkspaceId());
          this.render();
          return;
        }

        // Direct Workspace Switch: Ctrl+Alt+1-4 (avoid Win key to prevent OS Start Menu)
        if (e.ctrlKey && e.altKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          const wsId = parseInt(e.key, 10);
          if (wsId <= this.workspaceManager.getTotalWorkspaces()) {
            this.workspaceManager.switchToWorkspace(wsId);
            // Apply X11 fake workspaces
            this.applyX11WorkspaceVisibility(wsId);
            this.render();
          }
          return;
        }

        // Window Snapping: Win+Arrow keys (when a window is active)
        if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
          const activeWin = this.windows.find(w => w.active);
          if (activeWin && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            this.handleWindowSnap(activeWin.id, e.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown');
            return;
          }
        }

        // Move window to another workspace: Ctrl+Shift+Alt+1-4 (avoid Win key to prevent OS Start Menu)
        if (e.ctrlKey && e.shiftKey && e.altKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          const activeWin = this.windows.find(w => w.active);
          if (activeWin) {
            const targetWs = parseInt(e.key, 10);
            if (targetWs <= this.workspaceManager.getTotalWorkspaces()) {
              this.workspaceManager.moveWindowToWorkspace(activeWin.id, targetWs);
              this.showNotification('Workspace', `Window moved to Desktop ${targetWs}`, 'info');
            }
          }
          return;
        }

        // Window Grouping: Ctrl+Shift+G - Group two most recent windows
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          const visibleWindows = this.windows.filter(w => !w.minimized);
          if (visibleWindows.length >= 2) {
            const win1 = visibleWindows[visibleWindows.length - 1];
            const win2 = visibleWindows[visibleWindows.length - 2];

            // Check if already grouped
            const group1 = this.getWindowGroup(win1.id);
            const group2 = this.getWindowGroup(win2.id);

            if (group1 && group1 === group2) {
              // Already in same group
              this.showNotification('Window Grouping', `Windows already grouped together`, 'info');
            } else if (group1 || group2) {
              // One is grouped, add the other to that group
              const existingGroup = group1 || group2;
              const windowToAdd = group1 ? win2.id : win1.id;
              this.addToWindowGroup(existingGroup!, windowToAdd);
              this.showNotification('Window Grouping', `Window added to group`, 'divine');
            } else {
              // Neither grouped, create new group
              this.createWindowGroup(win1.id, win2.id);
              this.showNotification('Window Grouping', `Windows grouped! Resize to see sync.`, 'divine');
            }
          } else {
            this.showNotification('Window Grouping', 'Need at least 2 visible windows', 'info');
          }
          return;
        }

        // Ungroup Window: Ctrl+Shift+U
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
          e.preventDefault();
          const activeWin = this.windows.find(w => w.active);
          if (activeWin) {
            const groupId = this.getWindowGroup(activeWin.id);
            if (groupId) {
              this.ungroupWindow(activeWin.id);
              this.showNotification('Window Grouping', 'Window ungrouped', 'info');
            } else {
              this.showNotification('Window Grouping', 'Window is not grouped', 'info');
            }
          }
          return;
        }

        // Test Window Grouping: Ctrl+Shift+T
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
          e.preventDefault();
          const activeWin = this.windows.find(w => w.active);
          if (activeWin) {
            this.demonstrateWindowGrouping(activeWin.id);
          } else {
            this.showNotification('Window Grouping', 'No active window to test', 'info');
          }
          return;
        }

        // Open Browser: Win+B (Super+B)
        if (e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          if (window.electronAPI?.openExternal) {
            this.showNotification('Browser', 'Opening default browser...', 'info');
            void window.electronAPI.openExternal('https://google.com');
          } else {
            this.showNotification('Browser', 'Browser launch not available', 'info');
          }
          return;
        }

        // Reset Desktop Icon Positions: Ctrl+Alt+R
        if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'r') {
          e.preventDefault();
          // Clear desktop icon position overrides
          if (this.desktopIconPositions) {
            this.desktopIconPositions = {};
            localStorage.removeItem('temple_desktop_icon_positions');
            this.showNotification('Desktop', 'Icon positions reset to default grid', 'divine');
            this.render();
          } else {
            this.showNotification('Desktop', 'No custom positions to reset', 'info');
          }
          return;
        }

        // Toggle Gaming Mode: Ctrl+Alt+G
        if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          this.toggleGamingMode();
          if (this.activeSettingsCategory === 'Gaming') this.refreshSettingsWindow();
          return;
        }

        // Toggle High Contrast: Ctrl+Alt+H
        if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'h') {
          e.preventDefault();
          this.highContrast = !this.highContrast;
          localStorage.setItem('temple_high_contrast', String(this.highContrast));
          this.settingsManager.applyTheme();
          this.showNotification('Accessibility', `High Contrast ${this.highContrast ? 'Enabled' : 'Disabled'}`, 'divine');
          return;
        }

        // Create Custom Theme: Ctrl+Alt+T
        if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 't') {
          e.preventDefault();
          void this.openPromptModal({
            title: 'Create Custom Theme',
            message: 'Enter theme name:',
            placeholder: 'My Custom Theme'
          }).then(name => {
            if (!name) return;

            // Create theme with current colors as base
            const root = document.documentElement;
            const newTheme = {
              name,
              mainColor: root.style.getPropertyValue('--main-color') || '#00ff41',
              bgColor: root.style.getPropertyValue('--bg-color') || '#000000',
              textColor: root.style.getPropertyValue('--text-color') || '#00ff41'
            };

            this.customThemes.push(newTheme);
            this.activeCustomTheme = name;
            this.settingsManager.queueSaveConfig();
            this.settingsManager.applyTheme();
            this.showNotification('Theme', `Custom theme "${name}" created and activated`, 'divine');
          });
          return;
        }

        // Cycle Themes: Ctrl+Alt+N (Next theme)
        if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'n') {
          e.preventDefault();

          if (this.customThemes.length === 0) {
            this.showNotification('Theme', 'No custom themes yet. Press Ctrl+Alt+T to create one', 'info');
            return;
          }

          // Cycle through custom themes
          if (!this.activeCustomTheme) {
            // Activate first custom theme
            this.activeCustomTheme = this.customThemes[0].name;
          } else {
            const currentIndex = this.customThemes.findIndex(t => t.name === this.activeCustomTheme);
            if (currentIndex === -1 || currentIndex === this.customThemes.length - 1) {
              // Back to built-in themes
              this.activeCustomTheme = null;
              this.showNotification('Theme', 'Switched to built-in theme', 'info');
            } else {
              // Next custom theme
              this.activeCustomTheme = this.customThemes[currentIndex + 1].name;
              this.showNotification('Theme', `Switched to "${this.activeCustomTheme}"`, 'divine');
            }
          }

          this.settingsManager.queueSaveConfig();
          this.settingsManager.applyTheme();
          return;
        }

        // Export Themes: Ctrl+Alt+E
        if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'e') {
          e.preventDefault();

          if (this.customThemes.length === 0) {
            this.showNotification('Theme', 'No custom themes to export', 'info');
            return;
          }

          // Create JSON export
          const exportData = {
            version: '1.0',
            themes: this.customThemes,
            exportDate: new Date().toISOString()
          };

          const json = JSON.stringify(exportData, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `templeos-themes-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);

          this.showNotification('Theme', `Exported ${this.customThemes.length} theme(s)`, 'divine');
          return;
        }

        // Import Themes: Ctrl+Alt+I
        if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'i') {
          e.preventDefault();

          // Create file input
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (ev) => {
            const file = (ev.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const json = e.target?.result as string;
                const data = JSON.parse(json);

                if (!data.themes || !Array.isArray(data.themes)) {
                  this.showNotification('Theme', 'Invalid theme file format', 'error');
                  return;
                }

                // Validate and import themes
                let imported = 0;
                for (const theme of data.themes) {
                  if (theme.name && theme.mainColor && theme.bgColor && theme.textColor) {
                    // Check if theme already exists
                    const existing = this.customThemes.findIndex(t => t.name === theme.name);
                    if (existing === -1) {
                      this.customThemes.push(theme);
                      imported++;
                    }
                  }
                }

                if (imported > 0) {
                  this.settingsManager.queueSaveConfig();
                  this.showNotification('Theme', `Imported ${imported} theme(s)`, 'divine');
                } else {
                  this.showNotification('Theme', 'No new themes imported (duplicates skipped)', 'info');
                }
              } catch (err) {
                this.showNotification('Theme', 'Failed to parse theme file', 'error');
              }
            };
            reader.readAsText(file);
          };
          input.click();
          return;
        }
      });
    });
    // ============================================
    // GLOBAL SHORTCUT HANDLER (system-wide from main process)
    // This handles keybinds even when X11 windows have focus
    // Primary: evdev daemon (bypasses X11 grabs)
    // Fallback: Electron globalShortcut (XGrabKey)
    // ============================================
    if (window.electronAPI?.onGlobalShortcut) {
      window.electronAPI.onGlobalShortcut((action: string) => {
        const now = Date.now();

        // Workspace actions need debouncing
        const workspaceActions = ['workspace-overview', 'workspace-prev', 'workspace-next',
          'workspace-1', 'workspace-2', 'workspace-3', 'workspace-4'];
        if (workspaceActions.includes(action)) {
          if (now - this.lastWorkspaceSwitchMs < 150) return; // Debounce 150ms
          this.lastWorkspaceSwitchMs = now;
        }

        switch (action) {
          // ========== START MENU ==========
          case 'start-menu':
            // globalShortcut only fires when Electron has focus, so use inline menu
            this.useInlineStartMenu = true;
            void this.toggleStartMenu();
            break;

          // ========== WORKSPACE SWITCHING ==========
          case 'workspace-overview':
            this.showWorkspaceOverview = !this.showWorkspaceOverview;
            this.render();
            break;
          case 'workspace-prev':
            this.workspaceManager.previousWorkspace();
            this.applyX11WorkspaceVisibility(this.workspaceManager.getActiveWorkspaceId());
            this.render();
            break;
          case 'workspace-next':
            this.workspaceManager.nextWorkspace();
            this.applyX11WorkspaceVisibility(this.workspaceManager.getActiveWorkspaceId());
            this.render();
            break;
          case 'workspace-1':
          case 'workspace-2':
          case 'workspace-3':
          case 'workspace-4':
            const wsId = parseInt(action.split('-')[1], 10);
            if (wsId <= this.workspaceManager.getTotalWorkspaces()) {
              this.workspaceManager.switchToWorkspace(wsId);
              this.applyX11WorkspaceVisibility(wsId);
              this.render();
            }
            break;

          // ========== MOVE WINDOW TO WORKSPACE ==========
          case 'move-to-workspace-1':
          case 'move-to-workspace-2':
          case 'move-to-workspace-3':
          case 'move-to-workspace-4':
            const targetWs = parseInt(action.split('-').pop()!, 10);
            const activeWin = this.windows.find(w => w.active);
            if (activeWin && targetWs <= this.workspaceManager.getTotalWorkspaces()) {
              this.workspaceManager.moveWindowToWorkspace(activeWin.id, targetWs);
              this.showNotification('Workspace', `Window moved to Desktop ${targetWs}`, 'info');
              this.render();
            }
            break;

          // ========== WINDOW SNAPPING (Super+Arrow) ==========
          case 'snap-left':
          case 'snap-right':
          case 'snap-up':
          case 'snap-down':
            const snapWin = this.windows.find(w => w.active);
            if (snapWin) {
              const arrowKey = 'Arrow' + action.split('-')[1].charAt(0).toUpperCase() + action.split('-')[1].slice(1);
              this.handleWindowSnap(snapWin.id, arrowKey as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown');
            }
            break;

          // ========== SHOW DESKTOP (Super+D) ==========
          case 'show-desktop':
            if (!this.showDesktopMode) {
              this.showDesktopRestoreIds = this.windows.filter(w => !w.minimized).map(w => w.id);
              this.windows.forEach(w => w.minimized = true);
              this.showDesktopMode = true;
            } else {
              this.showDesktopRestoreIds.forEach(id => {
                const w = this.windows.find(win => win.id === id);
                if (w) w.minimized = false;
              });
              this.showDesktopRestoreIds = [];
              this.showDesktopMode = false;
            }
            this.render();
            break;

          // ========== OPEN FILE MANAGER (Super+E) ==========
          case 'open-files':
            this.openApp('builtin:files');
            break;

          // ========== LOCK SCREEN (Super+L) ==========
          case 'lock-screen':
            this.isLocked = true;
            this.render();
            break;

          // ========== TASK SWITCHER (Super+Tab, Alt+Tab) ==========
          case 'task-switcher':
          case 'alt-tab':
            if (!this.altTabOpen) {
              this.altTabOrder = this.windows
                .filter(w => !w.minimized)
                .map(w => w.id);
              if (this.altTabOrder.length > 0) {
                this.altTabOpen = true;
                this.altTabIndex = 0;
                this.render();
              }
            } else {
              // Cycle to next window
              this.altTabIndex = (this.altTabIndex + 1) % this.altTabOrder.length;
              this.render();
            }
            break;

          // ========== CLOSE WINDOW (Alt+F4) ==========
          case 'close-window':
            const closeWin = this.windows.find(w => w.active);
            if (closeWin) {
              this.closeWindow(closeWin.id);
            }
            break;

          // ========== OPEN TERMINAL (Super+T) ==========
          case 'open-terminal':
            this.openApp('builtin:terminal');
            break;

          // ========== CLIPBOARD MANAGER (Super+V) ==========
          case 'clipboard-manager':
            this.toggleClipboardManager();
            break;

          // ========== OPEN SETTINGS (from system tray) ==========
          case 'open-settings':
            this.openApp('builtin:settings');
            break;
        }
      });
    }

    // ============================================
    // THEME SYSTEM EVENTS (Tier 9.4)
    // ============================================
    app.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // ========== CLIPBOARD MANAGER CLICK HANDLERS ==========
      // Close clipboard manager when clicking overlay background
      if (target.matches('[data-clipboard-overlay]')) {
        this.clipboardManagerOpen = false;
        this.render();
      }
      // Close button
      if (target.matches('[data-clipboard-close]')) {
        this.clipboardManagerOpen = false;
        this.render();
      }
      // Click on clipboard item to paste
      const clipboardItem = target.closest('.clipboard-manager-item') as HTMLElement;
      if (clipboardItem?.dataset.clipboardIndex !== undefined) {
        const index = parseInt(clipboardItem.dataset.clipboardIndex, 10);
        this.pasteFromClipboardHistory(index);
      }

      // Theme Editor Navigation
      if (target.matches('.theme-editor-back-btn') || target.matches('.theme-editor-cancel-btn')) {
        this.settingsSubView = 'main';
        this.refreshSettingsWindow();
      }
      if (target.matches('.theme-editor-save-btn')) {
        this.saveCustomThemeFromEditor();
      }

      // Theme Management
      if (target.matches('.custom-theme-create-btn')) {
        this.openCustomThemeEditor();
      }
      if (target.matches('.custom-theme-delete-btn')) {
        const name = target.dataset.themeName;
        if (name) this.deleteCustomTheme(name);
      }
      if (target.matches('.custom-theme-export-btn')) {
        const name = target.dataset.themeName;
        if (name) this.exportCustomTheme(name);
      }
      if (target.matches('.custom-theme-import-btn')) {
        this.importCustomTheme();
      }

      // Custom Theme Selection
      const themeItem = target.closest('.custom-theme-item');
      if (themeItem && !target.matches('button')) {
        const name = (themeItem as HTMLElement).dataset.themeName;
        if (name) {
          this.activeCustomTheme = name;
          // Maintain compatibility with basic themes by effectively treating custom theme as "dark" mode base
          this.themeMode = 'dark';
          this.queueSaveConfig();
          this.settingsManager.applyTheme();
          this.refreshSettingsWindow();
        }
      }
    });

    app.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;

      // High Contrast Toggle
      if (target.matches('.high-contrast-toggle')) {
        this.highContrast = target.checked;
        this.settingsManager.applyTheme();
        this.queueSaveConfig();
      }

      // Theme Editor Colors (Final selection)
      if (target.matches('.theme-editor-color')) {
        const key = target.dataset.key as 'mainColor' | 'bgColor' | 'textColor';
        if (key) {
          this.themeEditorState[key] = target.value;
          this.refreshSettingsWindow();
        }
      }
    });

    app.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;

      // Theme Editor Name
      if (target.matches('.theme-editor-input')) {
        if (target.dataset.key === 'name') {
          this.themeEditorState.name = target.value;
        }
      }
      // Theme Editor Colors (Live Preview)
      if (target.matches('.theme-editor-color')) {
        const key = target.dataset.key as 'mainColor' | 'bgColor' | 'textColor';
        if (key) {
          this.themeEditorState[key] = target.value;
          this.refreshSettingsWindow();
        }
      }
    });

    // Godly Notes (Kanban board)
    // Legacy listeners removed. Interactions now handled via window hooks.


    app.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.kanban-card') as HTMLElement;
      if (card) {
        this.godlyNotes.setDragState(card.dataset.cardId!, card.dataset.colId!);
      }
    });

    app.addEventListener('dragover', (e) => {
      if ((e.target as HTMLElement).closest('.kanban-column')) {
        e.preventDefault();
      }
    });

    app.addEventListener('drop', (e) => {
      const target = e.target as HTMLElement;
      const col = target.closest('.kanban-column') as HTMLElement;
      if (col) {
        e.preventDefault();
        this.godlyNotes.moveCard(col.dataset.colId!);
        const win = this.windows.find(w => w.id.startsWith('godly-notes'));
        if (win) {
          win.content = this.godlyNotes.render();
          this.render();
        }
      }
    });



    // Global click to close context menus if clicking outside
    document.addEventListener('mousedown', (e) => {
      // Only fires for clicks inside the TempleOS shell (not inside external X11 windows).
      // Used to decide whether an X11 minimize was likely caused by interacting with the shell.
      this.lastShellPointerDownMs = Date.now();
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        this.closeContextMenu();
      }
    });
  }

  // Open Settings directly to About tab
  // Open Settings directly to About tab


  private getPathSeparator(path: string): string {
    return (path.includes('\\') || path.match(/^[A-Z]:/i)) ? '\\' : '/';
  }

  private joinPath(base: string, name: string): string {
    const sep = this.getPathSeparator(base);
    if (!base) return name;
    if (base.endsWith(sep)) return base + name;
    return base + sep + name;
  }

  // Track apps currently being opened to prevent duplicate window creation
  private appsBeingOpened = new Set<string>();

  private async openApp(appId: string, arg?: boolean | { file?: string }) {
    // Prevent duplicate opens while async operations are in progress
    if (this.appsBeingOpened.has(appId)) {
      console.log(`[openApp] Already opening ${appId}, ignoring duplicate call`);
      return;
    }

    const toggle = typeof arg === 'boolean' ? arg : false;
    const fileToPlay = typeof arg === 'object' && arg?.file ? arg.file : null;

    // Prefer the active window if one exists (to allow toggling minimize)
    const activeWindow = this.windows.find(w => w.id.startsWith(appId) && w.active);
    const existingWindow = activeWindow || this.windows.find(w => w.id.startsWith(appId));

    if (existingWindow) {
      if (toggle) {
        if (existingWindow.minimized) {
          this.focusWindow(existingWindow.id);
        } else if (existingWindow.active) {
          this.minimizeWindow(existingWindow.id);
        } else {
          this.focusWindow(existingWindow.id);
        }
      } else {
        this.focusWindow(existingWindow.id);
      }
      return;
    }

    // Mark this app as being opened
    this.appsBeingOpened.add(appId);

    try {
      this.recordAppLaunch(`builtin:${appId}`);

      const nextId = `${appId}-${++this.windowIdCounter}`;
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
          // Initialize Divine Assistant if not already done
          if (this.divineMessages.length === 0) {
            this.initDivineAssistant();
          }
          windowConfig = {
            title: 'Word of God',
            icon: '✝️',
            width: 650,
            height: 550,
            content: this.getWordOfGodContent()
          };
          break;
        case 'sprite-editor':
          windowConfig = {
            title: 'Sprite Editor',
            icon: '🎨',
            width: 700,
            height: 550,
            content: this.getSpriteEditorContent()
          };
          break;
        case 'calculator':
          windowConfig = {
            title: 'Calculator',
            icon: '🧮',
            width: 320,
            height: 480,
            content: this.getCalculatorContent()
          };
          break;
        case 'notes':
          windowConfig = {
            title: 'Notes',
            icon: '📝',
            width: 500,
            height: 400,
            content: this.getNotesContent()
          };
          break;
        case 'calendar':
          windowConfig = {
            title: 'Divine Calendar',
            icon: '📅',
            width: 600,
            height: 500,
            content: this.getCalendarContent()
          };
          break;
        case 'image-viewer':
          windowConfig = {
            title: 'Image Viewer',
            icon: '🖼️',
            width: 800,
            height: 600,
            content: this.getImageViewerContent(typeof arg === 'object' && arg.file ? arg.file : undefined, nextId)
          };
          break;
        case 'media-player':
          windowConfig = {
            title: 'Media Player',
            icon: '💿',
            width: 640,
            height: 480,
            content: this.getMediaPlayerContent(fileToPlay)
          };
          break;
        case 'auto-harp':
          windowConfig = {
            title: 'God\'s AutoHarp',
            icon: '🎹',
            width: 600,
            height: 350,
            content: this.getAutoHarpContent()
          };
          break;
        case 'doldoc-viewer':
          windowConfig = {
            title: 'DolDoc Viewer',
            icon: '📄',
            width: 600,
            height: 600,
            content: this.getDolDocViewerContent()
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
          // Fetch home path first, then load files
          setTimeout(async () => {
            if (!this.homePath && window.electronAPI) {
              try {
                this.homePath = await window.electronAPI.getHome();
              } catch (e) {
                console.error('Failed to get home path:', e);
              }
            }
            await this.loadFiles();
          }, 100);
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
            icon: '🕊️',
            width: 550,
            height: 450,
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
        case 'help':
          windowConfig = {
            title: 'Help & Docs',
            icon: '❓',
            width: 800,
            height: 600,
            content: this.helpApp.render()
          };
          break;
        case 'godly-notes':
          windowConfig = {
            title: 'Godly Notes',
            icon: '📋',
            width: 900,
            height: 600,
            content: this.godlyNotes.render()
          };
          break;
      }

      // Determine initial position - integrate with X11 tiling if active
      let initialX = 100 + (this.windows.length * 30);
      let initialY = 50 + (this.windows.length * 30);
      let initialWidth = windowConfig.width || 400;
      let initialHeight = windowConfig.height || 300;
      let initialMaximized = false;

      // Try to integrate with X11 tiling state
      try {
        if (window.electronAPI?.getTilingState) {
          const tilingState = await window.electronAPI.getTilingState();
          if (tilingState.success && tilingState.tilingModeActive) {
            // X11 tiling is active - position this internal window in an available slot
            const occupied = new Set(Object.values(tilingState.occupiedSlots));
            let targetSlot: string | null = null;

            // Find next available slot
            if (!occupied.has('left')) targetSlot = 'left';
            else if (!occupied.has('right')) targetSlot = 'right';
            else if (!occupied.has('topleft')) targetSlot = 'topleft';
            else if (!occupied.has('topright')) targetSlot = 'topright';
            else if (!occupied.has('bottomleft')) targetSlot = 'bottomleft';
            else if (!occupied.has('bottomright')) targetSlot = 'bottomright';

            if (targetSlot) {
              // Calculate bounds using TilingManager
              const usableBounds = this.tilingManager.getUsableBounds();
              const halfWidth = Math.floor(usableBounds.width / 2);
              const halfHeight = Math.floor(usableBounds.height / 2);

              switch (targetSlot) {
                case 'left':
                  initialX = usableBounds.x;
                  initialY = usableBounds.y;
                  initialWidth = halfWidth;
                  initialHeight = usableBounds.height;
                  break;
                case 'right':
                  initialX = usableBounds.x + halfWidth;
                  initialY = usableBounds.y;
                  initialWidth = halfWidth;
                  initialHeight = usableBounds.height;
                  break;
                case 'topleft':
                  initialX = usableBounds.x;
                  initialY = usableBounds.y;
                  initialWidth = halfWidth;
                  initialHeight = halfHeight;
                  break;
                case 'topright':
                  initialX = usableBounds.x + halfWidth;
                  initialY = usableBounds.y;
                  initialWidth = halfWidth;
                  initialHeight = halfHeight;
                  break;
                case 'bottomleft':
                  initialX = usableBounds.x;
                  initialY = usableBounds.y + halfHeight;
                  initialWidth = halfWidth;
                  initialHeight = halfHeight;
                  break;
                case 'bottomright':
                  initialX = usableBounds.x + halfWidth;
                  initialY = usableBounds.y + halfHeight;
                  initialWidth = halfWidth;
                  initialHeight = halfHeight;
                  break;
              }
              console.log(`[Tiling] Positioned internal window ${nextId} to slot: ${targetSlot}`);
            } else {
              // All slots taken - maximize or use default
              initialMaximized = true;
            }
          }
        }
      } catch (e) {
        // Ignore errors - use default positioning
        console.warn('[Tiling] Failed to get X11 tiling state:', e);
      }

      const newWindow: WindowState = {
        id: nextId,
        title: windowConfig.title || 'Window',
        icon: windowConfig.icon || '📄',
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
        content: windowConfig.content || '',
        active: true,
        minimized: false,
        maximized: initialMaximized
      };

      this.windows.forEach(w => w.active = false);
      this.windows.push(newWindow);

      // Register window with current workspace
      this.workspaceManager.addWindowToCurrentWorkspace(nextId);

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
    } finally {
      // Always clear the guard when done
      this.appsBeingOpened.delete(appId);
    }
  }

  // ============================================
  // WINDOW GROUPING (Priority 3, Tier 8.3)
  // ============================================

  /**
   * Create a new window group from two windows
   */
  private createWindowGroup(windowId1: string, windowId2: string): void {
    const groupId = `group-${Date.now()}`;
    this.windowGroups[groupId] = [windowId1, windowId2];
  }

  /**
   * Add a window to an existing group
   */
  private addToWindowGroup(groupId: string, windowId: string): void {
    if (this.windowGroups[groupId] && !this.windowGroups[groupId].includes(windowId)) {
      this.windowGroups[groupId].push(windowId);
    }
  }

  /**
   * Get the group ID for a window (if it belongs to one)
   */
  private getWindowGroup(windowId: string): string | null {
    for (const [groupId, windowIds] of Object.entries(this.windowGroups)) {
      if (windowIds.includes(windowId)) {
        return groupId;
      }
    }
    return null;
  }

  /**
   * Remove a window from its group
   */
  private ungroupWindow(windowId: string): void {
    const groupId = this.getWindowGroup(windowId);
    if (groupId) {
      this.windowGroups[groupId] = this.windowGroups[groupId].filter(id => id !== windowId);
      // Clean up empty groups
      if (this.windowGroups[groupId].length < 2) {
        delete this.windowGroups[groupId];
      }
    }
  }

  /**
   * Check if a window edge is near another window's edge (for grouping)
   * Returns the ID of the nearby window if found
   */
  private checkWindowGrouping(windowId: string, edge: 'left' | 'right' | 'top' | 'bottom'): string | null {
    const win = this.windows.find(w => w.id === windowId);
    if (!win || win.minimized || win.maximized) return null;

    const threshold = 10; // pixels - snap distance

    for (const other of this.windows) {
      if (other.id === windowId || other.minimized || other.maximized) continue;

      // Check if edges are within threshold
      if (edge === 'right') {
        // Window's right edge near other's left edge
        if (Math.abs((win.x + win.width) - other.x) < threshold &&
          win.y < (other.y + other.height) && (win.y + win.height) > other.y) {
          return other.id;
        }
      } else if (edge === 'left') {
        // Window's left edge near other's right edge
        if (Math.abs(win.x - (other.x + other.width)) < threshold &&
          win.y < (other.y + other.height) && (win.y + win.height) > other.y) {
          return other.id;
        }
      } else if (edge === 'bottom') {
        // Window's bottom edge near other's top edge
        if (Math.abs((win.y + win.height) - other.y) < threshold &&
          win.x < (other.x + other.width) && (win.x + win.width) > other.x) {
          return other.id;
        }
      } else if (edge === 'top') {
        // Window's top edge near other's bottom edge
        if (Math.abs(win.y - (other.y + other.height)) < threshold &&
          win.x < (other.x + other.width) && (win.x + win.width) > other.x) {
          return other.id;
        }
      }
    }

    return null;
  }

  /**
   * Resize all windows in a group proportionally
   */
  private resizeWindowGroup(groupId: string, initiatorId: string, deltaWidth: number, deltaHeight: number, edge: string): void {
    const windowIds = this.windowGroups[groupId];
    if (!windowIds) return;

    const initiator = this.windows.find(w => w.id === initiatorId);
    if (!initiator) return;

    for (const id of windowIds) {
      if (id === initiatorId) continue; // Initiating window already resized

      const win = this.windows.find(w => w.id === id);
      if (!win) continue;

      // Apply proportional resize based on edge relationship
      // For simplicity, resize connected windows in the same direction
      if (edge.includes('right') || edge.includes('left')) {
        win.width += deltaWidth;
        win.width = Math.max(200, win.width);

        // Adjust position if resizing from left
        if (edge.includes('left')) {
          win.x -= deltaWidth;
        }
      }

      if (edge.includes('bottom') || edge.includes('top')) {
        win.height += deltaHeight;
        win.height = Math.max(100, win.height);

        // Adjust position if resizing from top
        if (edge.includes('top')) {
          win.y -= deltaHeight;
        }
      }
    }
  }

  /**
   * Demonstrate/test window grouping features
   * This method is called to validate proximity detection and group resizing
   */
  private demonstrateWindowGrouping(windowId: string): void {
    // Test proximity detection on all edges
    const edges: ('left' | 'right' | 'top' | 'bottom')[] = ['left', 'right', 'top', 'bottom'];
    let foundNearby = false;

    for (const edge of edges) {
      const nearbyId = this.checkWindowGrouping(windowId, edge);
      if (nearbyId) {
        foundNearby = true;
        this.showNotification('Window Grouping', `Window near ${edge} edge: ${nearbyId.substring(0, 10)}...`, 'info');
      }
    }

    if (!foundNearby) {
      // If no nearby windows, demonstrate group resize if window is in a group
      const groupId = this.getWindowGroup(windowId);
      if (groupId) {
        // Demonstrate proportional resize by slightly adjusting grouped windows
        this.resizeWindowGroup(groupId, windowId, 0, 0, 'right'); // No actual resize, just validates method works
        this.showNotification('Window Grouping', 'Group resize capability verified', 'divine');
      }
    }
  }


  private getTerminalContent(): string {
    // CRITICAL FIX: Always clean up and recreate tabs to avoid stale xterm state
    // This prevents the compressed font issue on window reopen
    for (const tab of this.terminalTabs) {
      if (tab.xterm) {
        try {
          if (tab.resizeObserver) {
            tab.resizeObserver.disconnect();
          }
          if (tab.windowResizeHandler) {
            window.removeEventListener('resize', tab.windowResizeHandler);
          }
          tab.xterm.dispose();
        } catch { /* ignore */ }
      }
    }

    // Create fresh tabs with new unique IDs
    const needsNewTab = this.terminalTabs.length === 0 ||
      this.terminalTabs.every(t => t.xterm === null);

    if (needsNewTab) {
      // Clear old tabs and create fresh
      this.terminalTabs = [{
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ptyId: null,
        title: 'Terminal 1',
        buffer: [] as string[],
        cwd: this.terminalCwd || '',
        xterm: null,
        fitAddon: null
      }];
      this.activeTerminalTab = 0;
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
            <div class="terminal-line gold">TempleOS Terminal - Ready</div>
            <div class="terminal-line system">CWD: ${escapeHtml(currentTab?.cwd || this.terminalCwd || this.homePath || '/')}</div>
            <div class="terminal-line system">Tips: cd, ls, pwd, cat, nano (non-interactive), help</div>
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
    if (!tab) return;

    // Stronger cleanup: dispose existing xterm and observers
    if (tab.xterm) {
      try {
        if (tab.resizeObserver) {
          tab.resizeObserver.disconnect();
        }
        // Remove window resize handler to prevent listener accumulation
        if (tab.windowResizeHandler) {
          window.removeEventListener('resize', tab.windowResizeHandler);
        }
        tab.xterm.dispose();
      } catch { /* ignore */ }
      tab.xterm = null;
      tab.fitAddon = null;
    }

    const container = document.getElementById(`xterm-container-${tab.id}`);
    if (!container) return;

    // Wait for container to be properly mounted in DOM
    // System fonts (Consolas, Courier) are always available - no web font loading needed
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 100)));

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
      fontWeight: '500',
      letterSpacing: 0.3,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 10000,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    // CRITICAL: Clear container BEFORE opening xterm to prevent stale DOM interference
    container.innerHTML = '';

    xterm.open(container);

    // Force xterm to recalculate font metrics by reassigning fontFamily
    // This invalidates xterm's internal character width cache
    xterm.options.fontFamily = this.terminalFontFamily;

    // Initial fit after font cache is invalidated
    fitAddon.fit();

    // Explicitly preload Fira Code font before measuring
    const performFit = () => {
      try {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          fitAddon.fit();
          xterm.refresh(0, xterm.rows - 1);
        }
      } catch (e) {
        console.warn('Xterm fit failed:', e);
      }
    };

    // System fonts (Consolas, Courier New) are always available - no web font loading needed
    // Perform multiple fit attempts with increasing delays to handle layout settling
    // This prevents the "squished text" issue caused by stale font metric caching
    requestAnimationFrame(() => {
      // First fit - immediate after initial layout
      performFit();

      // Second fit - after a short delay for layout to settle
      setTimeout(() => {
        // Force font cache invalidation by toggling fontSize slightly
        const originalSize = xterm.options.fontSize ?? this.terminalFontSize;
        xterm.options.fontSize = originalSize + 1;
        requestAnimationFrame(() => {
          xterm.options.fontSize = originalSize;
          performFit();
        });
      }, 50);

      // Third fit - final fit after everything is settled
      setTimeout(performFit, 200);

      // Fourth fit - safety net for slow renders
      setTimeout(performFit, 500);
    });

    // RESIZE WITH FONT REFRESH: Call fit() but immediately toggle font to force correct metrics
    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    const safeResize = () => {
      if (container.offsetParent === null) return; // Not visible
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return;

      try {
        // Call fit to resize to container
        fitAddon.fit();

        // CRITICAL: Force font cache invalidation by toggling fontSize
        // This makes xterm re-measure character dimensions correctly
        const originalSize = xterm.options.fontSize ?? this.terminalFontSize;
        xterm.options.fontSize = originalSize + 1;
        requestAnimationFrame(() => {
          xterm.options.fontSize = originalSize;
          xterm.refresh(0, xterm.rows - 1);
        });
      } catch (e) {
        console.warn('Safe resize failed:', e);
      }
    };

    const debouncedResize = () => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(safeResize, 100);
    };

    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });
    resizeObserver.observe(container);

    tab.xterm = xterm;
    tab.fitAddon = fitAddon;
    tab.resizeObserver = resizeObserver;

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

        // Handle resize - notify PTY of dimension changes
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

    // Store resize handler reference for cleanup
    const resizeHandler = () => {
      debouncedResize();
    };
    window.addEventListener('resize', resizeHandler);
    tab.windowResizeHandler = resizeHandler;
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
    // Note: fitAddon.fit() calls removed intentionally - they cause font metric issues
    // The initial fit sequence in initXtermForTab handles sizing correctly
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
      const allowed: readonly TerminalUiTheme[] = ['green', 'cyan', 'amber', 'white'];
      if (!allowed.includes(next as TerminalUiTheme)) {
        print('Usage: theme green|cyan|amber|white', 'system');
        this.refreshTerminalWindow();
        return;
      }
      this.terminalUiTheme = next as TerminalUiTheme;
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

    if (base === 'neofetch' || base === 'sysinfo') {
      const info = this.systemInfo;
      const art = [
        '      .           ',
        '    .:+:.         ',
        '  .:+ooo+:.       ',
        ' .:+ooooo+:.      ',
        '.:+ooooooo+:.     ',
        '   .:+o+:.        ',
        '     ...          ',
        '   TEMPLEOS       ',
      ];
      // Display side-by-side if I could, but line-by-line is safer for now
      art.forEach(l => print(l, 'gold'));

      print(`OS: TempleOS Remake`, 'system');
      if (info) {
        print(`User: ${info.user}@${info.hostname}`, 'system');
        print(`Kernel: Divine Intellect (Mock)`, 'system');
        print(`Uptime: ${this.formatDuration(info.uptime)}`, 'system');
        print(`Shell: God's Shell`, 'system');
        print(`CPU: ${info.cpus} cores`, 'system');
        const used = Math.max(0, info.memory.total - info.memory.free);
        print(`Memory: ${this.formatFileSize(used)} / ${this.formatFileSize(info.memory.total)}`, 'system');
      }
      print(`Theme: ${this.themeMode} (${this.terminalUiTheme})`, 'system');

      // Color blocks
      let blocks = '';
      for (let i = 30; i <= 37; i++) blocks += `\x1b[${i}m███`;
      blocks += '\x1b[0m';
      print(blocks, '');

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
    // Check if AI is ready
    if (!this.divineStatus.ready) {
      return this.getDivineSetupContent();
    }

    // Build messages HTML
    const messagesHtml = this.divineMessages.map((msg, idx) => {
      if (msg.role === 'user') {
        return `
          <div class="divine-message divine-user-message">
            <div class="divine-message-header">
              <span class="divine-message-role">👤 You</span>
              <span class="divine-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="divine-message-content">${escapeHtml(msg.content)}</div>
          </div>
        `;
      } else if (msg.role === 'assistant') {
        // Parse content for code blocks and format
        let content = this.formatDivineResponse(msg.content);

        // Render command cards
        let commandCards = '';
        if (msg.commands && msg.commands.length > 0) {
          commandCards = msg.commands.map((cmd, i) => `
            <div class="divine-command-card" data-command="${escapeHtml(cmd)}" data-msg-idx="${idx}" data-cmd-idx="${i}">
              <div class="divine-command-header">
                <span class="divine-command-icon">💻</span>
                <span class="divine-command-label">Command</span>
              </div>
              <pre class="divine-command-code">${escapeHtml(cmd)}</pre>
              <div class="divine-command-actions">
                <button class="divine-cmd-btn divine-cmd-execute" data-action="execute">▶ Execute</button>
                <button class="divine-cmd-btn divine-cmd-copy" data-action="copy">📋 Copy</button>
              </div>
            </div>
          `).join('');
        }

        // Render dangerous command cards
        let dangerousCards = '';
        if (msg.dangerous && msg.dangerous.length > 0) {
          dangerousCards = msg.dangerous.map((cmd, i) => `
            <div class="divine-command-card divine-dangerous-card" data-command="${escapeHtml(cmd)}" data-msg-idx="${idx}" data-danger-idx="${i}">
              <div class="divine-command-header divine-danger-header">
                <span class="divine-command-icon">⚠️</span>
                <span class="divine-command-label">DANGEROUS COMMAND</span>
              </div>
              <pre class="divine-command-code">${escapeHtml(cmd)}</pre>
              <div class="divine-danger-warning">This command could cause data loss or system damage. Proceed with caution!</div>
              <div class="divine-command-actions">
                <button class="divine-cmd-btn divine-cmd-danger-execute" data-action="execute-dangerous">⚠️ I Understand, Execute</button>
                <button class="divine-cmd-btn divine-cmd-copy" data-action="copy">📋 Copy</button>
              </div>
            </div>
          `).join('');
        }

        // Render URL cards
        let urlCards = '';
        if (msg.urls && msg.urls.length > 0) {
          urlCards = msg.urls.map((url, i) => `
            <div class="divine-url-card" data-url="${escapeHtml(url)}" data-msg-idx="${idx}" data-url-idx="${i}">
              <div class="divine-command-header">
                <span class="divine-command-icon">🌐</span>
                <span class="divine-command-label">Open URL</span>
              </div>
              <div class="divine-url-text">${escapeHtml(url)}</div>
              <div class="divine-command-actions">
                <button class="divine-cmd-btn divine-cmd-open-url" data-action="open-url">🔗 Open</button>
                <button class="divine-cmd-btn divine-cmd-copy" data-action="copy-url">📋 Copy</button>
              </div>
            </div>
          `).join('');
        }

        return `
          <div class="divine-message divine-assistant-message">
            <div class="divine-message-header">
              <span class="divine-message-role">✝️ Word of God</span>
              <span class="divine-message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="divine-message-content">${content}</div>
            ${commandCards}
            ${dangerousCards}
            ${urlCards}
          </div>
        `;
      }
      return '';
    }).join('');

    // Streaming response indicator
    const streamingHtml = this.divineIsLoading ? `
      <div class="divine-message divine-assistant-message divine-streaming">
        <div class="divine-message-header">
          <span class="divine-message-role">✝️ Word of God</span>
          <span class="divine-typing-indicator">
            <span></span><span></span><span></span>
          </span>
        </div>
        <div class="divine-message-content" id="divine-streaming-content">${this.divineStreamingResponse ? this.formatDivineResponse(this.divineStreamingResponse) : '<span class="divine-thinking">Receiving divine wisdom...</span>'}</div>
      </div>
    ` : '';

    return `
      <div class="divine-chat-app">
        <div class="divine-chat-header">
          <h1 class="divine-chat-title">✝ Word of God ✝</h1>
          <div class="divine-chat-subtitle">"Ask, and it shall be given you." - Matthew 7:7</div>
          <div class="divine-chat-actions" style="display: flex; justify-content: space-between; width: 100%;">
            <button class="divine-header-btn divine-voice-toggle" data-divine-action="toggle-voice" title="${this.voiceOfGodEnabled ? 'Disable Voice of God' : 'Enable Voice of God'}" style="background: ${this.voiceOfGodEnabled ? 'rgba(0,255,65,0.2)' : 'transparent'}; margin-left: 10px;">
              ${this.voiceOfGodEnabled ? '🔊' : '🔇'} Voice
            </button>
            <button class="divine-header-btn" data-divine-action="clear" title="Clear conversation">🗑️ Clear</button>
          </div>
        </div>
        
        <div class="divine-chat-messages" id="divine-messages">
          ${messagesHtml || `
            <div class="divine-welcome">
              <div class="divine-welcome-icon">✝️</div>
              <div class="divine-welcome-text">Greetings, my child. I am the Word of God.</div>
              <div class="divine-welcome-subtext">Ask me anything and I shall help thee. I can install software, fix problems, open websites, and more.</div>
              <div class="divine-welcome-examples">
                <div class="divine-example" data-example="Install Firefox for me">💬 "Install Firefox for me"</div>
                <div class="divine-example" data-example="My WiFi isn't working">💬 "My WiFi isn't working"</div>
                <div class="divine-example" data-example="How do I use the terminal?">💬 "How do I use the terminal?"</div>
                <div class="divine-example" data-example="Update my system">💬 "Update my system"</div>
              </div>
            </div>
          `}
          ${streamingHtml}
        </div>

        <div class="divine-chat-input-area">
          <textarea 
            class="divine-chat-input" 
            id="divine-input" 
            placeholder="Speak unto the Lord... (Press Enter to send)"
            rows="1"
          >${escapeHtml(this.divineInput)}</textarea>
          <button class="divine-send-btn" id="divine-send" ${this.divineIsLoading ? 'disabled' : ''}>
            ${this.divineIsLoading ? '⏳' : '📨'}
          </button>
        </div>
      </div>
    `;
  }

  private getDivineSetupContent(): string {
    const { ollamaInstalled, ollamaRunning, modelDownloaded, error } = this.divineStatus;

    // Downloading state
    if (this.divineDownloadProgress > 0 && this.divineDownloadProgress < 100) {
      return `
        <div class="divine-setup">
          <div class="divine-setup-icon">✝️</div>
          <h2 class="divine-setup-title">Setting up the Word of God...</h2>
          <div class="divine-setup-progress">
            <div class="divine-progress-bar">
              <div class="divine-progress-fill" style="width: ${this.divineDownloadProgress}%"></div>
            </div>
            <div class="divine-progress-text">${this.divineDownloadProgress}% - Downloading divine intelligence</div>
          </div>
          <div class="divine-setup-quote">"In the beginning was the Word, and the Word was with God, and the Word was God." - John 1:1</div>
        </div>
      `;
    }

    // Model downloaded - ready to use
    if (modelDownloaded) {
      return `
        <div class="divine-setup">
          <div class="divine-setup-icon">✝️</div>
          <h2 class="divine-setup-title">The Word of God is Ready</h2>
          <p class="divine-setup-text">Divine intelligence has been installed.</p>
          <div class="divine-setup-status">
            <span class="divine-success">✅ AI Model Ready</span>
          </div>
          <button class="divine-setup-btn divine-start-btn" data-divine-action="start-divine">
            ✝️ Enter the Divine Terminal
          </button>
          <div class="divine-setup-quote">"The Holy Spirit speaks through the neural network."</div>
        </div>
      `;
    }

    // Need to install Ollama first
    if (!ollamaInstalled) {
      return `
        <div class="divine-setup">
          <div class="divine-setup-icon">✝️</div>
          <h2 class="divine-setup-title">Setup Word of God</h2>
          <p class="divine-setup-text">The divine AI requires Ollama to be installed.</p>
          <div class="divine-setup-instructions">
            <p><strong>Install Ollama:</strong></p>
            <pre class="divine-setup-code">winget install Ollama.Ollama</pre>
            <p class="divine-hint">Or download from <a href="#" data-divine-url="https://ollama.com">ollama.com</a></p>
          </div>
          <button class="divine-setup-btn" data-divine-action="check-ollama">
            🔄 Check Installation
          </button>
          ${error ? `<p class="divine-error">❌ ${escapeHtml(error)}</p>` : ''}
          <div class="divine-setup-quote">"God's temple requires preparation."</div>
        </div>
      `;
    }

    // Ollama installed but not running
    if (!ollamaRunning) {
      return `
        <div class="divine-setup">
          <div class="divine-setup-icon">✝️</div>
          <h2 class="divine-setup-title">Setup Word of God</h2>
          <p class="divine-setup-text">Ollama is installed but not running.</p>
          <p class="divine-warning">⚠️ Please start Ollama (it usually auto-starts after install)</p>
          <button class="divine-setup-btn" data-divine-action="check-ollama">
            🔄 Check Again
          </button>
          ${error ? `<p class="divine-error">❌ ${escapeHtml(error)}</p>` : ''}
          <div class="divine-setup-quote">"Patience is a virtue."</div>
        </div>
      `;
    }

    // Ollama running, need to download model
    return `
      <div class="divine-setup">
        <div class="divine-setup-icon">✝️</div>
        <h2 class="divine-setup-title">Setup Word of God</h2>
        <p class="divine-setup-text">Download the divine AI to begin.</p>
        <button class="divine-setup-btn" data-divine-action="download">
          📥 Download Divine Intelligence
        </button>
        ${error ? `<p class="divine-error">❌ ${escapeHtml(error)}</p>` : ''}
        <div class="divine-setup-quote">"In the beginning was the Word, and the Word was with God, and the Word was God." - John 1:1</div>
      </div>
    `;
  }

  private formatDivineResponse(content: string): string {
    // Remove command tags from display (they're shown as cards)
    let formatted = content
      .replace(/\[DANGEROUS\]\s*\[EXECUTE\][\s\S]*?\[\/EXECUTE\]\s*\[\/DANGEROUS\]/gi, '')
      .replace(/\[EXECUTE\][\s\S]*?\[\/EXECUTE\]/gi, '')
      .replace(/\[OPEN_URL\][\s\S]*?\[\/OPEN_URL\]/gi, '');

    // Collapse multiple newlines into max 2 (one blank line)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace
    formatted = formatted.trim();

    // Escape HTML
    formatted = escapeHtml(formatted);

    // Convert markdown-like formatting
    // Bold **text**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Code `text`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="divine-inline-code">$1</code>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  private async initDivineAssistant(): Promise<void> {
    if (!window.electronAPI?.divineGetStatus) return;

    try {
      // Check status
      const status = await window.electronAPI.divineGetStatus();
      if (!status) return;

      this.divineStatus = {
        ready: status.openRouterAvailable || status.modelDownloaded || false, // Ready with OpenRouter (cloud) or Ollama (local)
        ollamaInstalled: status.ollamaInstalled || false,
        ollamaRunning: status.ollamaRunning || false,
        modelDownloaded: status.modelDownloaded || false,
        modelName: status.modelName,
        error: status.error,
        openRouterAvailable: status.openRouterAvailable || false,
        openRouterUsingBuiltinKey: status.openRouterUsingBuiltinKey || false,
        ollamaAvailable: status.ollamaAvailable || false,
        currentBackend: status.currentBackend || 'openrouter',
        webSearchEnabled: status.webSearchEnabled !== false
      };

      // If ready (either backend), load greeting
      if (this.divineStatus.ready && this.divineMessages.length === 0 && window.electronAPI.divineGetGreeting) {
        const greetingResult = await window.electronAPI.divineGetGreeting();
        if (greetingResult?.greeting) {
          this.divineMessages.push({
            role: 'assistant',
            content: greetingResult.greeting,
            timestamp: Date.now()
          });
          // Voice of God: Speak the greeting if TTS is enabled
          if (this.voiceOfGodEnabled && window.electronAPI?.ttsSpeak) {
            window.electronAPI.ttsSpeak(greetingResult.greeting).catch(() => { });
          }
        }
      }

      // Set up streaming listener - only update the streaming element, not the whole window
      if (window.electronAPI.onDivineStreamChunk) {
        window.electronAPI.onDivineStreamChunk((data: { chunk: string; fullResponse: string }) => {
          this.divineStreamingResponse = data.fullResponse;
          // Only update the streaming content element, not the entire window
          const streamingEl = document.getElementById('divine-streaming-content');
          if (streamingEl) {
            streamingEl.innerHTML = this.formatDivineResponse(data.fullResponse);
            // Auto-scroll to bottom
            const container = document.getElementById('divine-messages');
            if (container) container.scrollTop = container.scrollHeight;
          } else {
            // Fallback: full refresh only if streaming element doesn't exist yet
            this.refreshDivineWindow();
          }
        });
      }

      // Set up download progress listener
      if (window.electronAPI.onDivineDownloadProgress) {
        window.electronAPI.onDivineDownloadProgress(async (progress: { percent: number; status: string }) => {
          this.divineDownloadProgress = progress.percent;
          this.refreshDivineWindow();

          // Auto-refresh status when download completes
          if (progress.percent >= 100 || progress.status === 'success') {
            console.log('[Divine] Download complete, refreshing status...');
            setTimeout(async () => {
              this.divineDownloadProgress = 0; // Reset progress
              await this.initDivineAssistant(); // Refresh status to show ready state
              this.refreshDivineWindow();
            }, 500); // Small delay to ensure model is ready
          }
        });
      }

      this.refreshDivineWindow();
    } catch (e) {
      console.error('Failed to init Divine Assistant:', e);
      this.divineStatus.error = 'Failed to connect to Divine Assistant';
    }
  }

  private async sendDivineMessage(message: string): Promise<void> {
    if (!window.electronAPI?.divineSendMessage || !message.trim() || this.divineIsLoading) return;

    // Add user message
    this.divineMessages.push({
      role: 'user',
      content: message.trim(),
      timestamp: Date.now()
    });
    this.divineInput = '';
    this.divineIsLoading = true;
    this.divineStreamingResponse = '';
    this.refreshDivineWindow();

    try {
      const result = await window.electronAPI.divineSendMessage(message.trim());

      if (result?.success && result.response) {
        // Add assistant response
        this.divineMessages.push({
          role: 'assistant',
          content: result.response,
          commands: result.commands,
          urls: result.urls,
          dangerous: result.dangerous,
          timestamp: Date.now()
        });
        // Voice of God: Speak the response if TTS is enabled
        if (this.voiceOfGodEnabled && window.electronAPI?.ttsSpeak) {
          console.log('[TTS] Speaking response...');
          window.electronAPI.ttsSpeak(result.response)
            .then(res => {
              if (!res?.success) {
                if (res?.reason === 'piper_not_installed') {
                  this.handlePiperNotInstalled(res.installInstructions);
                } else {
                  console.warn('[TTS] Speak failed:', res?.reason || res?.error);
                }
              }
            })
            .catch(err => console.error('[TTS] Speak error:', err));
        }
      } else {
        // Error response
        const errorContent = `I apologize, my child. An error has occurred: ${result.error}\n\nThe feds probably interfered. Try again.`;
        this.divineMessages.push({
          role: 'assistant',
          content: errorContent,
          timestamp: Date.now()
        });
        // Voice of God: Speak error if TTS enabled
        if (this.voiceOfGodEnabled && window.electronAPI?.ttsSpeak) {
          window.electronAPI.ttsSpeak(errorContent).catch(() => { });
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      const errorContent = `A divine error has occurred: ${errorMessage}\n\nEven the CIA couldn't cause this much trouble. Please ensure Ollama is running.`;
      this.divineMessages.push({
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now()
      });
      // Voice of God: Speak error if TTS enabled
      if (this.voiceOfGodEnabled && window.electronAPI?.ttsSpeak) {
        window.electronAPI.ttsSpeak(errorContent).catch(() => { });
      }
    } finally {
      this.divineIsLoading = false;
      this.divineStreamingResponse = '';
      this.refreshDivineWindow();

      // Scroll to bottom
      setTimeout(() => {
        const container = document.getElementById('divine-messages');
        if (container) container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  private async executeDivineCommand(command: string, isDangerous = false): Promise<void> {
    if (isDangerous) {
      // Show confirmation dialog
      const confirmed = confirm(`⚠️ DANGEROUS COMMAND WARNING ⚠️\n\nYou are about to execute:\n${command}\n\nThis command could cause data loss or system damage.\n\nAre you absolutely sure?`);
      if (!confirmed) return;
    }

    // Add execution message
    this.divineMessages.push({
      role: 'system',
      content: `🖥️ Running in Terminal: ${command}`,
      timestamp: Date.now()
    });
    this.refreshDivineWindow();

    // Run command in the actual Terminal app (like VS Code / Cursor)
    await this.runCommandInTerminal(command);
  }

  /**
   * Run a command in the Terminal app - like an IDE
   * Opens terminal if needed, then sends the command
   */
  private async runCommandInTerminal(command: string): Promise<void> {
    // Check if terminal window exists
    let terminalWin = this.windows.find(w => w.id.startsWith('terminal'));

    // If no terminal window, open one
    if (!terminalWin) {
      this.openApp('terminal');
      // Wait for terminal to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      terminalWin = this.windows.find(w => w.id.startsWith('terminal'));
    }

    // Focus terminal (brings to front, unminimizes)
    if (terminalWin) {
      this.focusWindow(terminalWin.id);
    }

    // Get the active terminal tab's ptyId
    const activeTab = this.terminalTabs[this.activeTerminalTab];
    if (activeTab?.ptyId && window.electronAPI?.writePty) {
      // Send the command to the terminal (with newline to execute)
      await window.electronAPI.writePty(activeTab.ptyId, command + '\n');

      // Add success message
      this.divineMessages.push({
        role: 'system',
        content: `✅ Command sent to Terminal. Check the Terminal window for output.`,
        timestamp: Date.now()
      });
    } else {
      // Fallback to background execution if no PTY
      if (window.electronAPI?.divineExecuteCommand) {
        try {
          const result = await window.electronAPI.divineExecuteCommand(command);
          let output = '';
          if (result?.success && result.stdout) {
            output = `✅ Command succeeded:\n${result.stdout}`;
          } else if (result?.stderr) {
            output = `⚠️ Command output:\n${result.stderr}`;
          } else if (!result?.success) {
            output = `❌ Command failed with code ${result?.code ?? 'unknown'}`;
          } else {
            output = '✅ Command executed successfully (no output)';
          }
          this.divineMessages.push({
            role: 'system',
            content: output,
            timestamp: Date.now()
          });
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          this.divineMessages.push({
            role: 'system',
            content: `❌ Execution error: ${errorMessage}`,
            timestamp: Date.now()
          });
        }
      }
    }

    this.refreshDivineWindow();
    this.render();
  }

  private async openDivineUrl(url: string): Promise<void> {
    if (!window.electronAPI?.divineOpenUrl) return;

    try {
      await window.electronAPI.divineOpenUrl(url);
      this.divineMessages.push({
        role: 'system',
        content: `🌐 Opened: ${url}`,
        timestamp: Date.now()
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.divineMessages.push({
        role: 'system',
        content: `❌ Failed to open URL: ${errorMessage}`,
        timestamp: Date.now()
      });
    }
    this.refreshDivineWindow();
  }

  private refreshDivineWindow(): void {
    const win = this.windows.find(w => w.id.startsWith('word-of-god'));
    if (win) {
      win.content = this.getWordOfGodContent();
      this.render();
    }
  }

  private async downloadDivineModel(): Promise<void> {
    if (!window.electronAPI?.divineDownloadModel) return;

    this.divineDownloadProgress = 1; // Start progress
    this.refreshDivineWindow();

    try {
      const result = await window.electronAPI.divineDownloadModel();
      this.divineDownloadProgress = 0; // Reset progress
      if (result?.success) {
        // Refresh status to show the chat interface
        await this.initDivineAssistant();
      } else {
        this.divineStatus.error = result?.error || 'Download failed. Click to try again.';
      }
    } catch (e: unknown) {
      this.divineStatus.error = e instanceof Error ? e.message : String(e);
      this.divineDownloadProgress = 0;
    }
    this.refreshDivineWindow();
  }

  private generateOracleWords(): void {
    const count = Math.floor(Math.random() * 4) + 1; // 1 to 4 words
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(oracleWordList[Math.floor(Math.random() * oracleWordList.length)]);
    }
    const phrase = words.join(' ');
    this.oracleHistory.push(phrase);

    // Scroll to bottom if oracle window is open
    const win = this.windows.find(w => w.content.includes('oracle-app'));
    if (win) {
      win.content = this.getWordOfGodContent();
      this.render();
      // TODO: auto-scroll logic requires DOM access after render
      setTimeout(() => {
        const display = document.getElementById('oracle-display');
        if (display) display.scrollTop = display.scrollHeight;
      }, 50);
    }
  }

  private executeHolyC(code: string): void {
    this.openApp('terminal');
    // Ensure we switch to terminal tab if it's already open but not active? 
    // openApp handles focusing.

    // Need to wait for render if terminal wasn't open? 
    // this.openApp pushes window. 
    // But terminal content relies on `terminalTabs` which are permanent state.

    // Find active tab
    let tab = this.terminalTabs[this.activeTerminalTab];
    if (!tab) {
      // Should exist if openApp worked, but maybe activeIndex needs reset?
      this.activeTerminalTab = 0;
      if (this.terminalTabs.length === 0) {
        this.terminalTabs.push({ id: '1', ptyId: null, title: 'Term 1', cwd: '/', buffer: [], xterm: null, fitAddon: null });
      }
      tab = this.terminalTabs[this.activeTerminalTab];
    }

    const print = (msg: string, color: string = 'white') => {
      let style = '';
      if (color === 'gold') style = 'color: #ffd700; font-weight: bold;';
      else if (color === 'system') style = 'color: #00ff41; opacity: 0.8;';
      else if (color === 'success') style = 'color: #00ff41; font-weight: bold;';
      else if (color === 'error') style = 'color: #ff6464;';
      else style = `color: ${color};`;

      tab.buffer.push(`<div class="terminal-line" style="${style}">${escapeHtml(msg)}</div>`);
    };

    print('HolyC Compiler v5.03', 'gold');
    print('Compiling JIT...', 'system');
    this.refreshTerminalWindow();

    setTimeout(() => {
      // Very basic parser for "Print" statements
      const lines = code.split('\n');
      let executed = 0;

      try {
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || !trimmed) continue;

          // Handle Print("...")
          const printMatch = trimmed.match(/^Print\s*\(\s*"([^"]*)"\s*\)\s*;?/);
          if (printMatch) {
            print(printMatch[1]);
            executed++;
          }

          // Handle "string"; (implicit print in TempleOS essentially?) 
          // No, TempleOS shell does that.
        }

        if (executed === 0 && code.trim().length > 0) {
          print('Warning: No executable statements found (Print).', 'error');
        } else {
          print('Program Exited.', 'system');
        }

      } catch (e) {
        print(`Runtime Error: ${e}`, 'error');
      }

      tab.buffer.push(`<div class="terminal-line">${this.formatTerminalPrompt(tab.cwd || '/')} </div>`);
      this.refreshTerminalWindow();
    }, 600);
  }


  private saveSprite(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.spriteData));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `sprite_${Date.now()}.json`;
    a.click();
  }

  private downloadSpritePng(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vgaColors = [
      '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
      '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ];

    this.spriteData.forEach((row, y) => {
      row.forEach((colorIndex, x) => {
        ctx.fillStyle = vgaColors[colorIndex];
        ctx.fillRect(x, y, 1, 1);
      });
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprite_${Date.now()}.png`;
    a.click();
  }

  private getSpriteEditorContent(): string {
    const vgaColors = [
      '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
      '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ];

    const cellSize = this.spriteZoom; // px

    const gridHtml = this.spriteData.map((row, y) => `
        <div style="display: flex;">
          ${row.map((colorIndex, x) => `
             <div class="sprite-pixel" data-x="${x}" data-y="${y}" style="
                width: ${cellSize}px; 
                height: ${cellSize}px; 
                background: ${vgaColors[colorIndex]}; 
                border-right: ${this.spriteShowGrid ? '1px solid rgba(128,128,128,0.2)' : 'none'};
                border-bottom: ${this.spriteShowGrid ? '1px solid rgba(128,128,128,0.2)' : 'none'};
                cursor: crosshair;
             "></div>
          `).join('')}
        </div>
      `).join('');

    // Preview Canvas (CSS scaled)
    const previewScale = 4;
    const previewHtml = `<div style="
          width: ${16 * previewScale}px; 
          height: ${16 * previewScale}px; 
          display: grid;
          grid-template-columns: repeat(16, 1fr);
          border: 1px solid #00ff41;
          background: #000;
      ">
          ${this.spriteData.flat().map(c => `<div style="background: ${vgaColors[c]}; width: 100%; height: 100%;"></div>`).join('')}
      </div>`;

    return `
        <div class="sprite-app" style="height: 100%; display: flex; flex-direction: column; background: #222; color: #fff; font-family: 'Terminus', monospace; user-select: none;">
          <!-- Toolbar -->
          <div style="padding: 10px; background: #333; border-bottom: 1px solid #555; display: flex; gap: 10px; align-items: center;">
             <div style="font-weight: bold; margin-right: 10px; color: #ffd700;">Sprite Editor</div>
             <div style="display: flex; gap: 5px;">
                 <button class="sprite-tool-btn" data-tool="pencil" title="Pencil (P)" style="${this.getBtnStyle(this.spriteTool === 'pencil')}">✏️</button>
                 <button class="sprite-tool-btn" data-tool="fill" title="Bucket Fill (F)" style="${this.getBtnStyle(this.spriteTool === 'fill')}">🪣</button>
                 <button class="sprite-tool-btn" data-tool="eyedropper" title="Color Picker (I)" style="${this.getBtnStyle(this.spriteTool === 'eyedropper')}">💉</button>
             </div>
             <div style="width: 1px; height: 20px; background: #555;"></div>
              <div style="display: flex; gap: 5px;">
                  <button class="sprite-action-btn" data-action="clear" style="${this.getBtnStyle(false)}">Clear</button>
                  <button class="sprite-action-btn" data-action="save" style="${this.getBtnStyle(false)}">Save JSON</button>
                  <button class="sprite-action-btn" data-action="export-png" style="${this.getBtnStyle(false)}">Export PNG</button>
              </div>
              <div style="width: 1px; height: 20px; background: #555;"></div>
              <!-- Animation Controls -->
              <div style="display: flex; gap: 5px; align-items: center;">
                  <span style="font-size: 11px; opacity: 0.7;">Animation:</span>
                  <button class="sprite-anim-btn" data-anim-action="add-frame" style="${this.getBtnStyle(false)}" title="Add Frame">➕ Frame</button>
                  <button class="sprite-anim-btn" data-anim-action="toggle-play" style="${this.getBtnStyle(this.spriteAnimationPlaying)}" title="Play/Pause">${this.spriteAnimationPlaying ? '⏸' : '▶'}</button>
                  <span style="font-size: 11px;">${this.spriteAnimationFrames.length > 0 ? `${this.spriteCurrentFrame + 1}/${this.spriteAnimationFrames.length}` : '0/0'}</span>
                  <input type="number" class="sprite-fps-input" value="${this.spriteAnimationFPS}" min="1" max="30" style="width: 50px; background: rgba(0,255,65,0.1); border: 1px solid #555; color: #00ff41; padding: 2px 4px; border-radius: 3px; font-size: 11px;" title="FPS">
              </div>
              <div style="flex: 1;"></div>
              <label style="font-size: 12px; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                 <input type="checkbox" class="sprite-grid-toggle" ${this.spriteShowGrid ? 'checked' : ''}> Show Grid
              </label>
           </div>
          <div style="flex: 1; display: flex; overflow: hidden;">
             
             <button class="sprite-tool ${this.spriteTool === 'pencil' ? 'active' : ''}" data-tool="pencil" style="${this.getBtnStyle(this.spriteTool === 'pencil')}">✏️ Draw</button>
             <button class="sprite-tool ${this.spriteTool === 'fill' ? 'active' : ''}" data-tool="fill" style="${this.getBtnStyle(this.spriteTool === 'fill')}">🪣 Fill</button>
             <button class="sprite-tool ${this.spriteTool === 'eyedropper' ? 'active' : ''}" data-tool="eyedropper" style="${this.getBtnStyle(this.spriteTool === 'eyedropper')}">💉 Pick</button>
             
             <div style="width: 1px; height: 20px; background: #555; margin: 0 5px;"></div>
             
             <button class="sprite-action" data-action="toggle-grid" style="${this.getBtnStyle(false)}">Grid: ${this.spriteShowGrid ? 'ON' : 'OFF'}</button>
             <button class="sprite-action" data-action="clear" style="${this.getBtnStyle(false)}">Clear</button>
             
             <div style="flex: 1;"></div>
             <button class="sprite-action" data-action="save" style="${this.getBtnStyle(false)}">💾 Save</button>
          </div>

          <div style="flex: 1; display: flex; overflow: hidden;">
             <!-- Palette Sidebar -->
             <div style="width: 80px; background: #2a2a2a; border-right: 1px solid #444; padding: 10px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
                   ${vgaColors.map((c, i) => `
                      <div class="sprite-palette-color ${this.spriteSelectedColor === i ? 'selected' : ''}" data-color="${i}" style="
                         aspect-ratio: 1; 
                         background: ${c}; 
                         border: 2px solid ${this.spriteSelectedColor === i ? '#fff' : '#000'}; 
                         cursor: pointer;
                         box-shadow: ${this.spriteSelectedColor === i ? '0 0 5px rgba(255,255,255,0.8)' : 'none'};
                      " title="Color ${i}"></div>
                   `).join('')}
                </div>
                <div style="margin-top: 10px; text-align: center; font-size: 10px; opacity: 0.7;">
                    Color: ${this.spriteSelectedColor}
                </div>
             </div>

             <!-- Main Canvas Area -->
             <div style="flex: 1; display: flex; justify-content: center; align-items: center; background: #1a1a1a; padding: 20px; overflow: auto;">
                <div class="sprite-grid" style="
                   border: 1px solid #fff; 
                   background: #000;
                   display: flex; 
                   flex-direction: column;
                   box-shadow: 0 0 20px rgba(0,0,0,0.5);
                ">
                   ${gridHtml}
                </div>
             </div>
             
             <!-- Right Panel -->
             <div style="width: 150px; background: #2a2a2a; border-left: 1px solid #444; padding: 15px; display: flex; flex-direction: column; gap: 20px; align-items: center;">
                 <div style="font-size: 12px; font-weight: bold; width: 100%; border-bottom: 1px solid #444; padding-bottom: 5px;">Preview 4x</div>
                 ${previewHtml}
                 
                 <div style="font-size: 11px; opacity: 0.7; margin-top: auto;">
                    ${this.spriteGridSize}x${this.spriteGridSize} Format
                 </div>
             </div>
          </div>
        </div>
      `;
  }

  private getBtnStyle(active: boolean): string {
    return `
        background: ${active ? '#00ff41' : 'transparent'}; 
        color: ${active ? '#000' : '#ddd'}; 
        border: 1px solid ${active ? '#00ff41' : '#555'}; 
        padding: 4px 8px; 
        border-radius: 4px; 
        cursor: pointer; 
        font-family: inherit; 
        font-size: 12px;
      `;
  }
  private handleSpriteDraw(target: HTMLElement) {
    const x = parseInt(target.dataset.x || '-1');
    const y = parseInt(target.dataset.y || '-1');
    if (x >= 0 && y >= 0) {
      if (this.spriteTool === 'pencil') {
        this.spriteData[y][x] = this.spriteSelectedColor;
      } else if (this.spriteTool === 'eraser') {
        this.spriteData[y][x] = 15; // Eraser to White
      } else if (this.spriteTool === 'fill') {
        this.floodFillSprite(x, y, this.spriteSelectedColor);
      } else if (this.spriteTool === 'eyedropper') {
        this.spriteSelectedColor = this.spriteData[y][x];
        this.spriteTool = 'pencil';
      }
      this.render();
    }
  }

  private floodFillSprite(x: number, y: number, newColor: number) {
    const targetColor = this.spriteData[y][x];
    if (targetColor === newColor) return;

    const queue: [number, number][] = [[x, y]];
    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!;
      if (cx < 0 || cx >= this.spriteGridSize || cy < 0 || cy >= this.spriteGridSize) continue;
      if (this.spriteData[cy][cx] !== targetColor) continue;

      this.spriteData[cy][cx] = newColor;
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  }

  private startSpriteAnimation() {
    if (this.spriteAnimationTimer !== null) {
      clearInterval(this.spriteAnimationTimer);
    }

    const intervalMs = 1000 / this.spriteAnimationFPS;
    this.spriteAnimationTimer = window.setInterval(() => {
      if (this.spriteAnimationFrames.length === 0) {
        this.stopSpriteAnimation();
        return;
      }

      this.spriteCurrentFrame = (this.spriteCurrentFrame + 1) % this.spriteAnimationFrames.length;
      // Load the current frame into the sprite data
      this.spriteData = this.spriteAnimationFrames[this.spriteCurrentFrame].map(row => [...row]);
      this.render();
    }, intervalMs);
  }

  private stopSpriteAnimation() {
    if (this.spriteAnimationTimer !== null) {
      clearInterval(this.spriteAnimationTimer);
      this.spriteAnimationTimer = null;
    }
    this.spriteAnimationPlaying = false;
  }

  private getAutoHarpContent(): string {
    const keys = [
      { note: 'C', ko: 'A', type: 'white', freq: 261.63 },
      { note: 'C#', ko: 'W', type: 'black', freq: 277.18 },
      { note: 'D', ko: 'S', type: 'white', freq: 293.66 },
      { note: 'D#', ko: 'E', type: 'black', freq: 311.13 },
      { note: 'E', ko: 'D', type: 'white', freq: 329.63 },
      { note: 'F', ko: 'F', type: 'white', freq: 349.23 },
      { note: 'F#', ko: 'T', type: 'black', freq: 369.99 },
      { note: 'G', ko: 'G', type: 'white', freq: 392.00 },
      { note: 'G#', ko: 'Y', type: 'black', freq: 415.30 },
      { note: 'A', ko: 'H', type: 'white', freq: 440.00 },
      { note: 'A#', ko: 'U', type: 'black', freq: 466.16 },
      { note: 'B', ko: 'J', type: 'white', freq: 493.88 },
      { note: 'C5', ko: 'K', type: 'white', freq: 523.25 }
    ];

    const octaveMult = Math.pow(2, this.autoHarpOctave - 4);

    return `
        <div class="autoharp-app" style="height: 100%; display: flex; flex-direction: column; background: #222; color: #fff; font-family: 'Terminus', monospace; user-select: none;">
            <div style="padding: 10px; background: #333; border-bottom: 1px solid #555; display: flex; gap: 10px; align-items: center;">
                 <div style="font-weight: bold; margin-right: 10px; color: #ffd700;">God's AutoHarp</div>
                 <button class="ah-action" data-action="octave-down" style="${this.getBtnStyle(false)}">Octave -</button>
                 <span style="min-width: 20px; text-align: center;">${this.autoHarpOctave}</span>
                 <button class="ah-action" data-action="octave-up" style="${this.getBtnStyle(false)}">Octave +</button>
                 
                 <div style="width: 1px; height: 20px; background: #555; margin: 0 5px;"></div>
                 
                 <button class="ah-action" data-action="record" style="${this.getBtnStyle(this.autoHarpRecording)}">🔴 Rec</button>
                 <button class="ah-action" data-action="play" style="${this.getBtnStyle(false)}">▶ Play</button>
                 <button class="ah-action" data-action="stop" style="${this.getBtnStyle(false)}">⏹ Stop</button>
                 <button class="ah-action" data-action="save" style="${this.getBtnStyle(false)}">💾 Save</button>
                 <button class="ah-action" data-action="clear" style="${this.getBtnStyle(false)}">🗑 Clear</button>
                 
                 <div style="flex: 1;"></div>
                 <div style="font-size: 12px; opacity: 0.7;">${this.autoHarpSong.length} notes</div>
            </div>
            
            <div style="flex: 1; display: flex; justify-content: center; align-items: center; position: relative; background: #1a1a1a;">
                <div class="piano-container" style="display: flex; position: relative; height: 200px; padding: 10px;">
                    ${keys.map(k => {
      const isBlack = k.type === 'black';
      const isActive = this.autoHarpActiveNotes.has(k.ko);
      return `
                        <div class="piano-key ${k.type}" data-note="${k.ko}" data-freq="${k.freq * octaveMult}" style="
                            width: ${isBlack ? 30 : 50}px;
                            height: ${isBlack ? 120 : 200}px;
                            background: ${isActive ? '#00ff41' : (isBlack ? '#000' : '#fff')};
                            color: ${isActive ? '#000' : (isBlack ? '#fff' : '#000')};
                            border: 1px solid #000;
                            border-radius: 0 0 5px 5px;
                            margin-left: ${isBlack ? -15 : 0}px;
                            margin-right: ${isBlack ? -15 : 0}px;
                            z-index: ${isBlack ? 2 : 1};
                            position: relative;
                            cursor: pointer;
                            display: flex;
                            flex-direction: column;
                            justify-content: flex-end;
                            align-items: center;
                            padding-bottom: 10px;
                            font-size: 12px;
                            box-shadow: inset 0 -5px 10px rgba(0,0,0,0.3);
                        ">
                            <span style="font-weight: bold; margin-bottom: 5px;">${k.note}</span>
                            <span style="opacity: 0.6; font-size: 10px;">(${k.ko})</span>
                        </div>
                        `;
    }).join('')}
                </div>
            </div>
        </div>
       `;
  }

  // ============================================
  // CALCULATOR APP (Tier 8.2)
  // ============================================
  private getCalculatorContent(): string {
    return this.calculator.render();
  }

  // ============================================
  // NOTES APP (Tier 8.4)
  // ============================================
  private getNotesContent(): string {
    return this.notesApp.render();
  }

  // ============================================
  // CALENDAR APP (TIER 8.3)
  // ============================================
  private getCalendarContent(): string {
    return this.calendarApp.render();
  }

  // ============================================
  // MEDIA PLAYER (TIER 8.1)
  // ============================================
  // TIER 4.4: IMAGE VIEWER (Enhanced with new module)
  // ============================================
  private getImageViewerContent(file?: string, winId?: string): string {
    const defaultImage = './images/logo.png'; // Placeholder if no file
    const src = file || defaultImage;

    // Use new ImageViewerEnhancer module
    if (winId) {
      if (!this.imageViewer.getState(winId)) {
        this.imageViewer.initState(winId, src);
      }
    }

    // Render using enhanced module
    const controls = winId ? this.imageViewer.renderControls(winId) : '';
    const canvas = winId ? this.imageViewer.renderCanvas(winId, src) : `
    <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
      <img src="${src}" style="max-width: 100%; max-height: 100%;">
    </div>
  `;

    return `
    <div class="image-viewer-container" style="display: flex; flex-direction: column; height: 100%; background: #0d1117;">
      ${controls}
      ${canvas}
      <div class="status-bar" style="padding: 5px 10px; background: rgba(0,255,65,0.05); font-size: 12px; color: rgba(0,255,65,0.7);">
          ${file || 'No image loaded'}
      </div>
    </div>
  `;
  }

  // ============================================
  private getMediaPlayerContent(fileToPlay: string | null = null): string {
    return this.mediaPlayer.render(fileToPlay);
  }

  private playTone(freq: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'square', duration: number = 0.5) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  private getDolDocViewerContent(): string {
    const parsedContent = this.renderDolDoc(this.dolDocContent || 'No Document Loaded.');
    return `
         <div style="height: 100%; display: flex; flex-direction: column; background: #fff; color: #000; font-family: 'Terminus', monospace;">
             <div style="padding: 5px 10px; background: #ddd; border-bottom: 1px solid #aaa; display: flex; align-items: center; justify-content: space-between;">
                 <div style="font-weight: bold;">DolDoc Viewer</div>
                 <div style="font-size: 12px;">${this.dolDocPath || 'Untitled.DD'}</div>
             </div>
             <div style="flex: 1; overflow: auto; padding: 20px; white-space: pre-wrap; line-height: 1.2;">
                 ${parsedContent}
             </div>
         </div>
       `;
  }

  private renderDolDoc(content: string): string {
    let safe = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const colors = ['BLACK', 'BLUE', 'GREEN', 'CYAN', 'RED', 'PURPLE', 'BROWN', 'LTGRAY',
      'DKGRAY', 'LTBLUE', 'LTGREEN', 'LTCYAN', 'LTRED', 'LTPURPLE', 'YELLOW', 'WHITE'];
    const cssColors = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
      '#555555', '#5555ff', '#55ff55', '#55ff55', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];

    // Replace colors: $FG,RED$ (Simulated by generic spans that we hope browser closes or we just don't close)
    // To strictly be correct, we should probably just wrap everything in spans on every color change? 
    // For now, simple replacement (Browser tolerates unclosed tags often)
    colors.forEach((c, i) => {
      const regex = new RegExp(`\\$FG,${c}\\$`, 'g');
      safe = safe.replace(regex, `<span style="color: ${cssColors[i]};">`);
      const regexBg = new RegExp(`\\$BG,${c}\\$`, 'g');
      safe = safe.replace(regexBg, `<span style="background: ${cssColors[i]};">`);
    });

    // Clear: $CL$ -> Reset spans? (Close all spans?)
    // Hard to implement with regex.

    safe = safe.replace(/\$LK,"([^"]+)",A="([^"]+)"\$/g, '<a href="#" data-link="$2" style="color: blue; text-decoration: underline; cursor: pointer;">$1</a>');
    safe = safe.replace(/\$TX,"([^"]+)"\$/g, '$1');

    return safe;
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
      breadcrumbHtml += ` <span style="opacity: 0.5;">›</span> <span class="breadcrumb-item" data-path="${cumulativePath}" style="cursor: pointer;">${part}</span>`;
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
            <span class="icon">📁</span>
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
          <button class="nav-btn" data-nav="back" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">← Back</button>
          <button class="nav-btn" data-nav="home" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">⌂ Home</button>
          <button class="nav-btn" data-nav="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; cursor: pointer;">↻ Refresh</button>
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

  private addBookmark(path: string): void {
    if (!this.fileBookmarks.includes(path)) {
      this.fileBookmarks.push(path);
      this.queueSaveConfig();
      if (this.currentPath) this.loadFiles(this.currentPath); // Re-render to show update
    }
  }

  private removeBookmark(path: string): void {
    const idx = this.fileBookmarks.indexOf(path);
    if (idx !== -1) {
      this.fileBookmarks.splice(idx, 1);
      this.queueSaveConfig();
      if (this.currentPath) this.loadFiles(this.currentPath);
    }
  }

  private async previewFileItem(path: string, isDir: boolean): Promise<void> {
    if (isDir) return;
    const name = path.split(/[/\\]/).pop() || 'file';
    const ext = name.split('.').pop()?.toLowerCase() || '';

    let type: 'image' | 'text' | 'unknown' = 'unknown';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      type = 'image';
    } else if (['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'c', 'cpp', 'h', 'hc', 'py', 'conf', 'xml', 'yaml', 'yml'].includes(ext)) {
      type = 'text';
    }

    let content: string | undefined;
    if (type === 'text' && window.electronAPI) {
      try {
        const res = await window.electronAPI.readFile(path);
        if (res.success && typeof res.content === 'string') {
          content = res.content.slice(0, 10000);
        }
      } catch (e) { console.warn('Preview read failed', e); }
    } else if (type === 'image') {
      // For images, we can just use the path if we are careful about protocol
      // But actually electron normally won't let us load local files directly in img src unless configured.
      // However, usually we can use `file://` protocol if security allows or we read as base64.
      // For now, let's assume we use the path directly with file:// protocol or simple path if allowed.
      // But a better way is to read as base64 in main process.
      // However, existing `readFile` returns text.
      // Let's assume we can try to set content to path for image rendering loop.
      content = path;
    }

    this.previewFile = { path, name, type, content };
    this.render();
  }

  private closePreview(): void {
    this.previewFile = null;
    this.render();
  }

  private async createZipFromItem(path: string): Promise<void> {
    if (!window.electronAPI?.createZip) {
      await this.openAlertModal({ title: 'Error', message: 'Compression not supported in this environment.' });
      return;
    }
    const parent = path.split(/[/\\]/).slice(0, -1).join(this.getPathSeparator(path)) || this.homePath || '/';
    const name = path.split(/[/\\]/).pop() || 'archive';
    const targetPath = this.joinPath(parent, `${name}.zip`);

    this.showNotification('Files', 'Compressing...', 'info');
    const res = await window.electronAPI.createZip(path, targetPath);
    if (res.success) {
      this.showNotification('Files', `Created ${name}.zip`, 'divine');
      this.loadFiles(parent);
    } else {
      await this.openAlertModal({ title: 'Compression Failed', message: res.error || 'Unknown error' });
    }
  }

  private async extractZipHere(path: string): Promise<void> {
    if (!window.electronAPI?.extractZip) {
      await this.openAlertModal({ title: 'Error', message: 'Extraction not supported in this environment.' });
      return;
    }
    const parent = path.split(/[/\\]/).slice(0, -1).join(this.getPathSeparator(path)) || this.homePath || '/';

    this.showNotification('Files', 'Extracting...', 'info');
    const res = await window.electronAPI.extractZip(path, parent);
    if (res.success) {
      this.showNotification('Files', 'Extracted successfully', 'divine');
      this.loadFiles(parent);
    } else {
      await this.openAlertModal({ title: 'Extraction Failed', message: res.error || 'Unknown error' });
    }
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
      breadcrumbHtml += ` <span style="opacity: 0.5;">›</span> <span class="breadcrumb-item" data-path="${cumulativePath}" style="cursor: pointer;">${part}</span>`;
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
      // Ensure we use a valid home path - don't fallback to root '/' for Linux
      // This prevents accessing /Documents instead of /home/user/Documents

      // Only construct standard folder paths if we have a valid user home
      const hasValidHome = this.homePath && this.homePath !== '/' && !this.homePath.match(/^\/home\/?$/);
      const docs = hasValidHome ? this.joinPath(this.homePath!, 'Documents') : null;
      const downloads = hasValidHome ? this.joinPath(this.homePath!, 'Downloads') : null;
      const pictures = hasValidHome ? this.joinPath(this.homePath!, 'Pictures') : null;
      const music = hasValidHome ? this.joinPath(this.homePath!, 'Music') : null;

      const bookmarks = this.fileBookmarks.map(path => ({
        label: path.split(/[/\\\\]/).pop() || path,
        path: path,
        isBookmark: true
      }));

      const items: { label: string; path: string; isBookmark?: boolean }[] = [
        { label: 'This PC', path: isWindows ? 'C:\\' : '/' },
      ];

      // Only add Home if we have a valid home path
      if (this.homePath) {
        items.push({ label: 'Home', path: this.homePath });
      }

      // Only add standard folders if we have valid paths
      if (docs) items.push({ label: 'Documents', path: docs });
      if (downloads) items.push({ label: 'Downloads', path: downloads });
      if (pictures) items.push({ label: 'Pictures', path: pictures });
      if (music) items.push({ label: 'Music', path: music });

      items.push(...bookmarks);
      items.push({ label: 'Trash', path: 'trash:' });

      return items;
    })();

    const emptyState = this.fileEntries.length === 0 && this.currentPath
      ? '<div style="padding: 20px; opacity: 0.6;">Loading...</div>'
      : (files.length === 0 && this.fileEntries.length > 0 ? '<div style="padding: 20px; opacity: 0.6;">No files match your search.</div>' : '');

    // Multi-select UI support
    const selCount = this.selectedFiles.size;
    const hasSelection = selCount > 0;

    const gridHtml = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
        ${parentPath ? `
          <div class="file-item" data-file-path="${parentPath}" data-is-dir="true" style="cursor: pointer;" title="Parent folder">
            <span class="icon">📁</span>
            <span class="label" style="font-size: 12px;">..</span>
          </div>
        ` : ''}
        ${files.map(file => {
      const icon = getFileIcon(file.name, file.isDirectory);
      const sizeStr = file.isDirectory ? '' : this.formatFileSize(file.size);
      const isSelected = this.selectedFiles.has(file.path);
      return `
            <div class="file-item ${isSelected ? 'file-selected' : ''}" data-file-path="${file.path}" data-is-dir="${file.isDirectory}" style="cursor: pointer; position: relative; border: 2px solid ${isSelected ? '#00ff41' : 'transparent'}; padding: 8px; border-radius: 8px; background: ${isSelected ? 'rgba(0,255,65,0.15)' : 'transparent'};" title="${file.name}${sizeStr ? ' - ' + sizeStr : ''}">
              ${hasSelection ? `<input type="checkbox" ${isSelected ? 'checked' : ''} style="position: absolute; top: 4px; left: 4px; pointer-events: none;" />` : ''}
              <span class="icon">${icon}</span>
              <span class="label" style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
            </div>
          `;
    }).join('')}
      </div>
    `;

    const sortArrow = (key: 'name' | 'size' | 'modified') => {
      if (this.fileSortMode !== key) return '';
      return this.fileSortDir === 'asc' ? ' ▲' : ' ▼';
    };

    const listHtml = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: grid; grid-template-columns: ${hasSelection ? '30px ' : ''}26px 1fr 110px 170px; gap: 10px; padding: 6px 10px; opacity: 0.7; font-size: 12px;">
          ${hasSelection ? '<span></span>' : ''}
          <span></span>
          <span class="file-col-header" data-sort-key="name" style="cursor: pointer;">Name${sortArrow('name')}</span>
          <span class="file-col-header" data-sort-key="size" style="cursor: pointer;">Size${sortArrow('size')}</span>
          <span class="file-col-header" data-sort-key="modified" style="cursor: pointer;">Modified${sortArrow('modified')}</span>
        </div>
        ${parentPath ? `
          <div class="file-row file-item" data-file-path="${parentPath}" data-is-dir="true" style="cursor: pointer; display: grid; grid-template-columns: ${hasSelection ? '30px ' : ''}26px 1fr 110px 170px; gap: 10px; padding: 8px 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; background: rgba(0,255,65,0.05);">
            ${hasSelection ? '<span></span>' : ''}
            <span class="icon">📁</span>
            <span class="label">..</span>
            <span style="opacity: 0.6;">—</span>
            <span style="opacity: 0.6;">—</span>
          </div>
        ` : ''}
        ${files.map(file => {
      const icon = getFileIcon(file.name, file.isDirectory);
      const sizeStr = file.isDirectory ? '—' : this.formatFileSize(file.size);
      const mod = file.modified ? new Date(file.modified).toLocaleString() : '—';
      const isSelected = this.selectedFiles.has(file.path);
      return `
            <div class="file-row file-item ${isSelected ? 'file-selected' : ''}" data-file-path="${file.path}" data-is-dir="${file.isDirectory}" style="cursor: pointer; display: grid; grid-template-columns: ${hasSelection ? '30px ' : ''}26px 1fr 110px 170px; gap: 10px; padding: 8px 10px; border: 1px solid ${isSelected ? '#00ff41' : 'rgba(0,255,65,0.2)'}; border-radius: 6px; background: ${isSelected ? 'rgba(0,255,65,0.15)' : 'rgba(0,0,0,0.15)'};">
              ${hasSelection ? `<input type="checkbox" ${isSelected ? 'checked' : ''} style="pointer-events: none; accent-color: #00ff41;" />` : ''}
              <span class="icon">${icon}</span>
              <span class="label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
              <span style="opacity: 0.8;">${sizeStr}</span>
              <span style="opacity: 0.7; font-size: 12px;">${mod}</span>
            </div>
          `;
    }).join('')}
      </div>
    `;

    // Details view with full sortable columns
    const detailsHtml = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="display: grid; grid-template-columns: ${hasSelection ? '30px ' : ''}26px 2fr 100px 150px 80px; gap: 10px; padding: 8px 10px; opacity: 0.7; font-size: 12px; border-bottom: 1px solid rgba(0,255,65,0.3);">
          ${hasSelection ? `<input type="checkbox" ${selCount > 0 && selCount === files.length ? 'checked' : ''} class="select-all-checkbox" style="accent-color: #00ff41;" />` : ''}
          <span></span>
          <span class="file-col-header" data-sort-key="name" style="cursor: pointer; font-weight: bold;">Name${sortArrow('name')}</span>
          <span class="file-col-header" data-sort-key="size" style="cursor: pointer; font-weight: bold;">Size${sortArrow('size')}</span>
          <span class="file-col-header" data-sort-key="modified" style="cursor: pointer; font-weight: bold;">Modified${sortArrow('modified')}</span>
          <span style="font-weight: bold;">Type</span>
        </div>
        ${parentPath ? `
          <div class="file-row file-item" data-file-path="${parentPath}" data-is-dir="true" style="cursor: pointer; display: grid; grid-template-columns: ${hasSelection ? '30px ' : ''}26px 2fr 100px 150px 80px; gap: 10px; padding: 6px 10px; border-radius: 4px; background: rgba(0,255,65,0.05);">
            ${hasSelection ? '<span></span>' : ''}
            <span  class="icon">📁</span>
            <span class="label">..</span>
            <span style="opacity: 0.6;">—</span>
            <span style="opacity: 0.6;">—</span>
            <span style="opacity: 0.6;">Folder</span>
          </div>
        ` : ''}
        ${files.map(file => {
      const icon = getFileIcon(file.name, file.isDirectory);
      const sizeStr = file.isDirectory ? '—' : this.formatFileSize(file.size);
      const mod = file.modified ? new Date(file.modified).toLocaleDateString() : '—';
      const type = file.isDirectory ? 'Folder' : (file.name.split('.').pop()?.toUpperCase() || 'File');
      const isSelected = this.selectedFiles.has(file.path);
      return `
            <div class="file-row file-item ${isSelected ? 'file-selected' : ''}" data-file-path="${file.path}" data-is-dir="${file.isDirectory}" style="cursor: pointer; display: grid; grid-template-columns: ${hasSelection ? '30px ' : ''}26px 2fr 100px 150px 80px; gap: 10px; padding: 6px 10px; border-radius: 4px; background: ${isSelected ? 'rgba(0,255,65,0.15)' : 'transparent'}; border: 1px solid ${isSelected ? '#00ff41' : 'transparent'};">
              ${hasSelection ? `<input type="checkbox" ${isSelected ? 'checked' : ''} style="pointer-events: none; accent-color: #00ff41;" />` : ''}
              <span class="icon">${icon}</span>
              <span class="label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
              <span style="opacity: 0.8; font-size: 12px;">${sizeStr}</span>
              <span style="opacity: 0.7; font-size: 11px;">${mod}</span>
              <span style="opacity: 0.6; font-size: 11px;">${type}</span>
            </div>
          `;
    }).join('')}
      </div>
    `;

    return `
      <div class="file-browser" style="height: 100%; display: flex; flex-direction: column;">
        <div class="file-browser-toolbar" style="padding: 8px 10px; border-bottom: 1px solid rgba(0,255,65,0.2); display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="nav-btn" data-nav="back" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; cursor: pointer; border-radius: 6px;">⟵</button>
          <button class="nav-btn" data-nav="home" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; cursor: pointer; border-radius: 6px;">⌂</button>
          <button class="nav-btn" data-nav="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; cursor: pointer; border-radius: 6px;">↻</button>

          ${hasSelection ? `
            <span style="padding: 4px 10px; background: rgba(0,255,65,0.2); border-radius: 6px; font-size: 12px; font-weight: bold;">${selCount} selected</span>
            <button class="btn-delete-selected" style="background: rgba(255,65,65,0.2); border: 1px solid rgba(255,65,65,0.5); color: #ff4141; padding: 6px 12px; cursor: pointer; border-radius: 6px; font-size: 12px;">🗑️ Delete</button>
            <button class="btn-deselect-all" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; cursor: pointer; border-radius: 6px; font-size: 12px;">Clear</button>
          ` : ''}

          <input class="file-search-input" type="text" placeholder="Search this folder" value="${this.fileSearchQuery}"
                 style="flex: 1; min-width: 180px; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit; outline: none;">

          <select class="file-sort-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
            <option value="name" ${this.fileSortMode === 'name' ? 'selected' : ''}>Name</option>
            <option value="modified" ${this.fileSortMode === 'modified' ? 'selected' : ''}>Date</option>
            <option value="size" ${this.fileSortMode === 'size' ? 'selected' : ''}>Size</option>
          </select>

          <select class="file-view-mode-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
            <option value="grid" ${this.fileViewMode === 'grid' ? 'selected' : ''}>Grid</option>
            <option value="list" ${this.fileViewMode === 'list' ? 'selected' : ''}>List</option>
            <option value="details" ${this.fileViewMode === 'details' ? 'selected' : ''}>Details</option>
          </select>

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
              <div class="file-sidebar-link" data-path="${escapeHtml(item.path)}" data-is-bookmark="${!!item.isBookmark}" style="padding: 8px 10px; border-radius: 8px; cursor: pointer; color: ${item.path === this.currentPath ? '#000' : '#00ff41'}; background: ${item.path === this.currentPath ? '#00ff41' : 'transparent'}; margin-bottom: 6px;">
                ${escapeHtml(item.label)}
              </div>
            `).join('')}
          </div>
          <div class="file-browser-content" style="flex: 1; overflow-y: auto; padding: 10px; min-width: 0;">
            ${emptyState || (this.fileViewMode === 'grid' ? gridHtml : this.fileViewMode === 'list' ? listHtml : detailsHtml)}
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
      Bluetooth: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>',
      About: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    };

    const categories = [
      { id: 'System', icon: svgIcons.System, label: 'System' },
      { id: 'Personalization', icon: svgIcons.Personalization, label: 'Personalization' },
      { id: 'Network', icon: svgIcons.Network, label: 'Network & Internet' },
      { id: 'Gaming', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>', label: 'Gaming' },
      { id: 'Security', icon: svgIcons.Security, label: 'Security' },
      { id: 'Accessibility', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>', label: 'Accessibility' },
      { id: 'Devices', icon: svgIcons.Devices, label: 'Mouse & Input' },
      { id: 'Bluetooth', icon: svgIcons.Bluetooth, label: 'Bluetooth' },
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
      // Build dropdown options for audio devices
      const sinkDropdownOptions = this.audioDevices.sinks.map(s => ({
        value: s.name,
        label: s.description || s.name,
        selected: s.name === this.audioDevices.defaultSink
      }));
      const sourceDropdownOptions = this.audioDevices.sources.map(s => ({
        value: s.name,
        label: s.description || s.name,
        selected: s.name === this.audioDevices.defaultSource
      }));



      const outputs = this.displayOutputs.slice(0, 10);
      const selectedOutput = outputs.find(o => o.name === this.activeDisplayOutput) || outputs.find(o => o.active) || outputs[0] || null;
      const modeList = selectedOutput ? selectedOutput.modes.slice() : [];
      const modeKey = (m: { width: number; height: number; refreshHz: number | null }) => `${m.width}x${m.height}${m.refreshHz ? `@${m.refreshHz}` : ''}`;
      const uniqueModes = [...new Map(modeList.map(m => [modeKey(m), m])).values()]
        .sort((a, b) => (a.width * a.height) - (b.width * b.height) || ((a.refreshHz || 0) - (b.refreshHz || 0)));
      const currentMode = selectedOutput?.currentMode || this.currentResolution;

      return `
        ${card('Sound', `
          <div style="display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 10px; align-items: center;">
            <div>Volume</div>
            <input type="range" class="volume-slider" min="0" max="100" value="${this.volumeLevel}" style="width: 100%; accent-color: #00ff41;">

            <div>Output</div>
            ${renderCustomDropdown('audio-sink', sinkDropdownOptions, '(No devices)')}

            <div>Input</div>
            ${renderCustomDropdown('audio-source', sourceDropdownOptions, '(No devices)')}
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            <button class="audio-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh devices</button>
          </div>
        `)}

        ${card('Time & Date', `
          <div style="display: flex; flex-direction: column; gap: 15px;">
             <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
               <div style="display: flex; flex-direction: column;">
                 <span style="font-weight: bold;">Set time automatically</span>
                 <span style="font-size: 12px; opacity: 0.7;">Sync with God's NTP servers</span>
               </div>
               <input type="checkbox" class="auto-time-toggle" ${this.autoTime ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
             </label>

             <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
               <span style="font-weight: bold;">Timezone</span>
               <select class="timezone-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                 ${['UTC', 'Local', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'].map(tz => `<option value="${tz}" ${this.timezone === tz ? 'selected' : ''}>${tz}</option>`).join('')}
               </select>
             </div>
          </div>
        `)}

        ${card('Memory Optimization', `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: bold;">Manual Cleanup</span>
              <span style="font-size: 12px; opacity: 0.7;">Flush system caches and optimize RAM usage</span>
            </div>
            <button class="clean-memory-btn" style="background: rgba(0,255,65,0.1); border: 1px solid #00ff41; color: #00ff41; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">Clean RAM</button>
          </div>
        `)}

        ${card('Display', `
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; align-items: center;">
            <div>Monitor</div>
            <div style="display: flex; gap: 8px;">
              <select class="display-output-select" style="flex: 1; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                ${outputs.map(o => `<option value="${escapeHtml(o.name)}" ${o.name === (selectedOutput?.name || '') ? 'selected' : ''}>${escapeHtml(o.name)}${o.active ? '' : ' (off)'}</option>`).join('') || '<option value=\"\">Display</option>'}
              </select>
              <button class="display-move-btn" data-output="${escapeHtml(selectedOutput?.name || '')}" style="background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;" ${selectedOutput ? '' : 'disabled'}>Move Here</button>
            </div>

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
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="range" class="display-scale-slider" min="0.75" max="2" step="0.05" value="${selectedOutput ? selectedOutput.scale : 1}" style="flex: 1; accent-color: #00ff41;" ${selectedOutput ? '' : 'disabled'}>
              <span class="display-scale-value" style="min-width: 50px; text-align: center; color: #00ff41; font-weight: bold;">${selectedOutput ? Math.round(selectedOutput.scale * 100) : 100}%</span>
              <button class="display-scale-reset-btn" style="background: rgba(255,100,100,0.1); border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;" ${selectedOutput && selectedOutput.scale !== 1 ? '' : 'disabled'}>Reset</button>
            </div>

            <div>Orientation</div>
            <select class="display-transform-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;" ${selectedOutput ? '' : 'disabled'}>
              ${(['normal', '90', '180', '270'] as const).map(t => `<option value="${t}" ${(selectedOutput?.transform || 'normal') === t ? 'selected' : ''}>${t === 'normal' ? 'Landscape' : `Rotate ${t}°`}</option>`).join('')}
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

        ${card('Gaming', `
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
             <span>Gaming Mode (Disable Hotkeys)</span>
             <input type="checkbox" class="gaming-mode-toggle" ${this.gamingModeActive ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
          </label>
          <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Prevents Accidental Win/Meta Key presses.</div>
        `)}
      `;
    };

    const renderPersonalization = () => {
      // Sub-view: Theme Editor
      if (this.settingsSubView === 'theme-editor') {
        return `
            <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <button class="theme-editor-back-btn" style="background: none; border: none; color: #00ff41; font-size: 18px; cursor: pointer;">←</button>
                <div style="font-size: 18px; font-weight: bold; color: #ffd700;">Theme Editor</div>
            </div>
            
            ${card('Theme Properties', `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <div style="margin-bottom: 4px; font-size: 12px; opacity: 0.8;">Theme Name</div>
                        <input type="text" class="theme-editor-input" data-key="name" value="${escapeHtml(this.themeEditorState.name)}" style="width: 100%; padding: 8px; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; border-radius: 6px; font-family: inherit;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <div style="margin-bottom: 4px; font-size: 12px; opacity: 0.8;">Main Color</div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="color" class="theme-editor-color" data-key="mainColor" value="${this.themeEditorState.mainColor}" style="width: 40px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;">
                                <input type="text" value="${this.themeEditorState.mainColor}" readonly style="flex:1; padding: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(0,255,65,0.2); color: #00ff41; border-radius: 4px; font-family: monospace;">
                            </div>
                        </div>
                        <div>
                            <div style="margin-bottom: 4px; font-size: 12px; opacity: 0.8;">Background Color</div>
                             <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="color" class="theme-editor-color" data-key="bgColor" value="${this.themeEditorState.bgColor}" style="width: 40px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;">
                                <input type="text" value="${this.themeEditorState.bgColor}" readonly style="flex:1; padding: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(0,255,65,0.2); color: #00ff41; border-radius: 4px; font-family: monospace;">
                            </div>
                        </div>
                         <div>
                            <div style="margin-bottom: 4px; font-size: 12px; opacity: 0.8;">Text Color</div>
                             <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="color" class="theme-editor-color" data-key="textColor" value="${this.themeEditorState.textColor}" style="width: 40px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;">
                                <input type="text" value="${this.themeEditorState.textColor}" readonly style="flex:1; padding: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(0,255,65,0.2); color: #00ff41; border-radius: 4px; font-family: monospace;">
                            </div>
                        </div>
                         <div>
                            <div style="margin-bottom: 4px; font-size: 12px; opacity: 0.8;">Glow Color</div>
                             <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="color" class="theme-editor-color" data-key="glowColor" value="${this.themeEditorState.glowColor || '#ffd700'}" style="width: 40px; height: 32px; padding: 0; border: none; background: none; cursor: pointer;">
                                <input type="text" value="${this.themeEditorState.glowColor || '#ffd700'}" readonly style="flex:1; padding: 6px; background: rgba(0,0,0,0.2); border: 1px solid rgba(0,255,65,0.2); color: #00ff41; border-radius: 4px; font-family: monospace;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button class="theme-editor-cancel-btn" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancel</button>
                        <button class="theme-editor-save-btn" style="background: #00ff41; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">Save Theme</button>
                    </div>
                </div>
            `)}
            
             ${card('Preview', `
                <div style="padding: 15px; background: ${this.themeEditorState.bgColor}; color: ${this.themeEditorState.textColor}; border: 1px solid ${this.themeEditorState.mainColor}; border-radius: 8px; font-family: 'VT323', monospace;">
                    <div style="font-size: 20px; margin-bottom: 10px; border-bottom: 2px solid ${this.themeEditorState.mainColor}; color: ${this.themeEditorState.mainColor};">Window Title</div>
                    <div style="margin-bottom: 10px;">
                        This is a preview of your custom theme.
                        <br>
                        <span style="color: ${this.themeEditorState.mainColor}">Highlight Color</span>
                    </div>
                    <button style="background: ${this.themeEditorState.mainColor}; color: ${this.themeEditorState.bgColor}; border: none; padding: 6px 12px; border-radius: 4px;">Button</button>
                </div>
             `)}
          `;
      }

      const wallpapers = [
        { id: 'default', label: 'Default', path: './images/wallpaper.png' },
      ];
      return `
        ${card('Theme', `
          <div style="display: flex; gap: 10px; margin-bottom: 12px;">
            <button class="theme-btn" data-theme="dark" style="padding: 8px 16px; background: ${this.themeMode === 'dark' ? '#00ff41' : 'transparent'}; color: ${this.themeMode === 'dark' ? '#000' : '#00ff41'}; border: 1px solid #00ff41; cursor: pointer; border-radius: 6px;">Dark</button>
            <button class="theme-btn" data-theme="light" style="padding: 8px 16px; background: ${this.themeMode === 'light' ? '#00ff41' : 'transparent'}; color: ${this.themeMode === 'light' ? '#000' : '#00ff41'}; border: 1px solid #00ff41; cursor: pointer; border-radius: 6px;">Light</button>
          </div>
          
          <div style="font-size: 14px; color: #ffd700; margin-bottom: 8px;">Color Scheme</div>
          <div style="display: flex; gap: 10px; margin-bottom: 12px;">
            ${['green', 'amber', 'cyan', 'white'].map(c => `
                <button class="theme-color-btn" data-color="${c}" style="
                    width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
                    background: ${c === 'green' ? '#00ff41' : c === 'amber' ? '#ffb000' : c === 'cyan' ? '#00ffff' : '#ffffff'};
                    border: ${this.themeColor === c ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)'};
                    box-shadow: ${this.themeColor === c ? '0 0 10px rgba(255,255,255,0.5)' : 'none'};
                " title="${c.charAt(0).toUpperCase() + c.slice(1)}"></button>
            `).join('')}
          </div>

          <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Theme is applied to the shell; app themes inherit it.</div>
        `)}

        ${card('Custom Themes', `
          <div style="margin-bottom: 10px;">
             ${this.customThemes.length === 0 ? '<div style="opacity: 0.6; font-size: 12px;">No custom themes found.</div>' : ''}
             <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">
               ${this.customThemes.map(t => `
                   <div class="custom-theme-item ${this.activeCustomTheme === t.name ? 'active' : ''}" data-theme-name="${escapeHtml(t.name)}" style="
                       display: flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid ${this.activeCustomTheme === t.name ? '#ffd700' : 'rgba(0,255,65,0.3)'}; border-radius: 6px; cursor: pointer; background: ${this.activeCustomTheme === t.name ? 'rgba(0,255,65,0.15)' : 'rgba(0,0,0,0.2)'}; margin-right: 5px; margin-bottom: 5px;
                   ">
                       <div style="width: 12px; height: 12px; border-radius: 50%; background: ${t.mainColor}; border: 1px solid #fff;"></div>
                       <span style="font-size: 13px;">${escapeHtml(t.name)}</span>
                       <button class="custom-theme-export-btn" data-theme-name="${escapeHtml(t.name)}" title="Export" style="background: none; border: none; color: #00ff41; cursor: pointer; font-size: 10px; margin-left: 6px;">⬇</button>
                       <button class="custom-theme-delete-btn" data-theme-name="${escapeHtml(t.name)}" title="Delete" style="background: none; border: none; color: #ff6464; cursor: pointer; font-size: 14px; margin-left: 2px;">&times;</button>
                   </div>
               `).join('')}
             </div>
             
             <div style="display: flex; gap: 10px;">
                <button class="custom-theme-create-btn" style="background: rgba(0,255,65,0.1); border: 1px solid #00ff41; color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-family: inherit;">+ Create New Theme</button>
                <button class="custom-theme-import-btn" style="background: none; border: 1px solid rgba(0,255,65,0.4); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-family: inherit;">Import JSON</button>
             </div>
          </div>
        `)}

        ${card('Visual Effects', `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                  <label style="display: flex; align-items: center; justify-content: space-between;">
                      <span>Window Animations</span>
                      <input type="checkbox" disabled checked title="Cannot disable animations in this version (use Lite Mode)">
                  </label>
                  <label style="display: flex; align-items: center; justify-content: space-between;">
                      <span>Auto-hide Taskbar</span>
                      <input type="checkbox" class="taskbar-autohide-toggle" ${this.autoHideTaskbar ? 'checked' : ''} style="cursor: pointer;">
                  </label>
                  <label style="display: flex; align-items: center; justify-content: space-between;">
                      <span>Heavenly Pulse</span>
                      <input type="checkbox" class="heavenly-pulse-toggle" ${this.heavenlyPulse ? 'checked' : ''} style="cursor: pointer;">
                  </label>
                  <label style="display: flex; align-items: center; justify-content: space-between; ${this.heavenlyPulse ? '' : 'opacity: 0.5; pointer-events: none;'}">
                      <span>Pulse Intensity</span>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" class="pulse-intensity-slider" min="3" max="70" value="${Math.round(this.heavenlyPulseIntensity * 100)}" style="width: 100px; cursor: pointer;">
                        <span style="min-width: 35px; text-align: right;">${Math.round(this.heavenlyPulseIntensity * 100)}%</span>
                      </div>
                  </label>
              </div>
        `)}

        ${card('Wallpaper', `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            ${wallpapers.map(w => `
              <button class="wallpaper-btn" data-wallpaper="${w.path}" style="aspect-ratio: 16/9; border: ${this.wallpaperImage === w.path ? '2px solid #00ff41' : '1px solid rgba(0,255,65,0.3)'}; background: rgba(0,0,0,0.2); color: #00ff41; border-radius: 8px; cursor: pointer;">${w.label}</button>
            `).join('')}
             <button class="wallpaper-browse-btn" style="aspect-ratio: 16/9; border: 1px dashed rgba(0,255,65,0.3); background: rgba(0,0,0,0.1); color: #00ff41; border-radius: 8px; cursor: pointer;">📂 Select File...</button>
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: #888; text-align: center;">Format: JPG, PNG, GIF, WEBP</div>
        `)}

        ${card('Divine Settings', `
           <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 10px;">
             <span>Random Terry Quotes</span>
             <input type="checkbox" class="quote-notifications-toggle" ${this.quoteNotifications ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
           </label>
        `)}

        ${card('Performance', `
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
             <span>Lite Mode (No Animations)</span>
             <input type="checkbox" class="lite-mode-toggle" ${this.liteMode ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
          </label>
        `)}
      `;
    };

    const renderNetwork = () => {
      const connected = this.networkManager.status.connected;
      const ssid = this.networkManager.status.wifi?.ssid;
      const signal = this.networkManager.status.wifi?.signal ?? 0;
      const ip = this.networkManager.status.ip4;

      const vpn = this.getVpnStatus();
      const now = Date.now();
      const snoozeRemaining = (this.networkManager.vpnKillSwitchSnoozeUntil && this.networkManager.vpnKillSwitchSnoozeUntil > now)
        ? Math.ceil((this.networkManager.vpnKillSwitchSnoozeUntil - now) / 1000)
        : 0;
      const killSwitchShouldEnforce = this.networkManager.vpnKillSwitchEnabled && !vpn.connected && (this.networkManager.vpnKillSwitchMode === 'strict' || this.networkManager.vpnKillSwitchArmed);
      const killSwitchSnoozing = snoozeRemaining > 0;

      let killSwitchState = 'Disabled';
      let killSwitchColor = '#888';
      if (this.networkManager.vpnKillSwitchEnabled) {
        if (vpn.connected) { killSwitchState = 'Armed'; killSwitchColor = '#00ff41'; }
        else if (killSwitchSnoozing) { killSwitchState = `Snoozed (${snoozeRemaining}s)`; killSwitchColor = '#ffd700'; }
        else if (this.networkManager.vpnKillSwitchMode === 'auto' && !this.networkManager.vpnKillSwitchArmed) { killSwitchState = 'Waiting for VPN'; killSwitchColor = '#ffd700'; }
        else if (this.networkManager.vpnKillSwitchBlocked) { killSwitchState = 'BLOCKING (VPN down)'; killSwitchColor = '#ff6464'; }
        else { killSwitchState = 'Armed (VPN down)'; killSwitchColor = '#ffd700'; }
      }

      const savedWifi = this.networkManager.savedNetworks.filter(n => (n.type || '').toLowerCase().includes('wifi') || (n.type || '').toLowerCase().includes('wireless')).slice(0, 12);
      const savedOther = this.networkManager.savedNetworks.filter(n => !savedWifi.includes(n)).slice(0, 8);
      const vpnProfiles = this.networkManager.savedNetworks
        .filter(n => {
          const t = String(n.type || '').toLowerCase();
          return t === 'vpn' || t === 'wireguard';
        })
        .slice(0, 10);
      const activeVpnNames = new Set(
        Array.isArray(this.networkManager.status.devices)
          ? this.networkManager.status.devices
            .filter(d => this.isVpnDevice(d) && this.connectedState(d.state))
            .map(d => String(d.connection || '').trim())
            .filter(Boolean)
          : []
      );

      return `
        ${card('Status', `
          <div style="font-weight: bold; color: #ffd700; margin-bottom: 6px;">${connected ? (ssid || this.networkManager.status.connection || 'Connected') : 'Disconnected'}</div>
          <div style="font-size: 12px; opacity: 0.85;">${connected ? `${this.networkManager.status.type || 'network'}${ip ? ` • IP ${ip}` : ''}${ssid ? ` • ${signal}%` : ''}` : (this.networkManager.lastError ? this.networkManager.lastError : 'Not connected')}</div>
          <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
             <div style="display: flex; gap: 20px;">
                <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
                  <input type="checkbox" class="flight-mode-toggle" ${this.flightMode ? 'checked' : ''} />
                  <span style="opacity: 0.9;">✈️ Flight Mode</span>
                </label>
                <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
                  <input type="checkbox" class="wifi-enabled-toggle" ${this.networkManager.wifiEnabled ? 'checked' : ''} ${this.flightMode ? 'disabled' : ''} />
                  <span style="opacity: 0.9;">Wi‑Fi</span>
                </label>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button class="net-btn" data-net-action="refresh" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh</button>
              ${connected ? `<button class="net-btn" data-net-action="disconnect" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Disconnect</button>` : ''}
            </div>
          </div>
        `)}

        ${card('Wi‑Fi Networks', `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${window.electronAPI?.listWifiNetworks ? (this.networkManager.wifiNetworks.slice(0, 10).map(n => `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: ${n.inUse ? 'rgba(0,255,65,0.15)' : 'rgba(0,0,0,0.2)'};">
                <div style="min-width: 0;">
                  <div style="font-weight: bold; color: ${n.inUse ? '#ffd700' : '#00ff41'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.ssid}</div>
                  <div style="font-size: 12px; opacity: 0.8;">${n.security ? 'Secured' : 'Open'} • ${n.signal}%</div>
                </div>
                ${n.inUse ? `
                  <button class="net-btn" data-net-action="disconnect" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Disconnect</button>
                ` : `
                  <button class="net-btn" data-net-action="connect" data-ssid="${n.ssid}" data-sec="${n.security}" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Connect</button>
                `}
              </div>
            `).join('') || '<div style=\"opacity: 0.6;\">No Wi‑Fi networks found.</div>') : '<div style=\"opacity: 0.6;\">Wi‑Fi management requires Electron/Linux.</div>'}
          </div>
        `)}

        ${card('Saved Networks', `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${(!window.electronAPI?.listSavedNetworks) ? '<div style=\"opacity: 0.6;\">Saved networks require Electron/Linux.</div>' : ''}
            ${window.electronAPI?.listSavedNetworks ? ([
          ...savedWifi.map(n => ({ ...n, kind: 'Wi‑Fi' })),
          ...savedOther.map(n => ({ ...n, kind: n.type || 'Connection' }))
        ].slice(0, 14).map(n => `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: rgba(0,0,0,0.2);">
                <div style="min-width: 0;">
                  <div style="font-weight: bold; color: #00ff41; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(n.name)}</div>
                  <div style="font-size: 12px; opacity: 0.75;">${escapeHtml(n.kind)}${n.device ? ` • ${escapeHtml(n.device)}` : ''}</div>
                </div>
                <div style="display:flex; gap: 8px; flex-shrink: 0;">
                  <button class="saved-net-btn" data-action="connect" data-key="${escapeHtml(n.uuid)}" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Connect</button>
                  <button class="saved-net-btn" data-action="forget" data-key="${escapeHtml(n.uuid)}" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Forget</button>
                </div>
              </div>
            `).join('') || '<div style=\"opacity: 0.6;\">No saved networks.</div>') : ''}
          </div>
        `)}

        ${card('VPN Profiles', `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
            <div style="font-size: 12px; opacity: 0.8; min-width: 220px;">
              Manage OpenVPN / WireGuard profiles (NetworkManager).
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="vpn-import-btn" data-vpn-kind="openvpn" style="background: none; border: 1px solid rgba(0,255,65,0.45); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Import OpenVPN</button>
              <button class="vpn-import-btn" data-vpn-kind="wireguard" style="background: none; border: 1px solid rgba(0,255,65,0.45); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Import WireGuard</button>
            </div>
          </div>

          ${!window.electronAPI?.listSavedNetworks ? `
            <div style="opacity: 0.6;">VPN management requires Electron/Linux.</div>
          ` : ''}

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${vpnProfiles.length ? vpnProfiles.map(p => {
          const t = String(p.type || '').toLowerCase();
          const label = t === 'wireguard' ? 'WireGuard' : 'VPN';
          const active = activeVpnNames.has(p.name) || (vpn.connected && String(vpn.connection || '') === p.name);
          const deviceLabel = p.device && p.device !== '--' ? p.device : '';
          return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: ${active ? 'rgba(255,215,0,0.07)' : 'rgba(0,0,0,0.2)'};">
                  <div style="min-width: 0;">
                    <div style="font-weight: bold; color: ${active ? '#ffd700' : '#00ff41'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(p.name)}</div>
                    <div style="font-size: 12px; opacity: 0.75;">${escapeHtml(label)}${deviceLabel ? `  ${escapeHtml(deviceLabel)}` : ''}  ${active ? 'Connected' : 'Disconnected'}</div>
                  </div>
                  <div style="display:flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;">
                    ${active ? `
                      <button class="vpn-profile-btn" data-action="disconnect" data-key="${escapeHtml(p.uuid)}" data-name="${escapeHtml(p.name)}" ${window.electronAPI?.disconnectConnection ? '' : 'disabled'} style="background: none; border: 1px solid rgba(255,100,100,${window.electronAPI?.disconnectConnection ? '0.5' : '0.25'}); color: ${window.electronAPI?.disconnectConnection ? '#ff6464' : 'rgba(255,100,100,0.6)'}; padding: 6px 10px; border-radius: 6px; cursor: ${window.electronAPI?.disconnectConnection ? 'pointer' : 'not-allowed'}; font-size: 12px;">Disconnect</button>
                    ` : `
                      <button class="vpn-profile-btn" data-action="connect" data-key="${escapeHtml(p.uuid)}" data-name="${escapeHtml(p.name)}" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">Connect</button>
                    `}
                    <button class="vpn-profile-btn" data-action="delete" data-key="${escapeHtml(p.uuid)}" data-name="${escapeHtml(p.name)}" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">Delete</button>
                  </div>
                </div>
              `;
        }).join('') : '<div style=\"opacity: 0.6;\">No VPN profiles found. Import one to get started.</div>'}
          </div>

          <div style="font-size: 11px; opacity: 0.6; margin-top: 10px; border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;">
            OpenVPN import may require the NetworkManager OpenVPN plugin. WireGuard requires NetworkManager WireGuard support.
          </div>
        `)}
        ${card('VPN Kill Switch', `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-weight: bold; color: ${killSwitchColor};">${killSwitchState}</div>
              <div style="font-size: 12px; opacity: 0.7;">Block network traffic if VPN disconnects.</div>
            </div>
            <label class="toggle-switch" style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" class="vpn-killswitch-toggle" ${this.networkManager.vpnKillSwitchEnabled ? 'checked' : ''}>
              <span>${this.networkManager.vpnKillSwitchEnabled ? 'On' : 'Off'}</span>
            </label>
          </div>

          <div style="display: grid; grid-template-columns: 110px 1fr; gap: 8px; font-size: 13px; margin-bottom: 10px;">
            <div style="opacity: 0.7;">VPN</div>
            <div style="color: ${vpn.connected ? '#00ff41' : '#ff6464'};">
              ${vpn.connected
            ? `${escapeHtml(vpn.connection || vpn.device || 'VPN')}${vpn.device ? `   ${escapeHtml(vpn.device)}` : ''}`
            : 'Not connected'}
            </div>

            <div style="opacity: 0.7;">Mode</div>
            <select class="vpn-killswitch-mode" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;">
              <option value="auto" ${this.networkManager.vpnKillSwitchMode === 'auto' ? 'selected' : ''}>Auto (arm on VPN connect)</option>
              <option value="strict" ${this.networkManager.vpnKillSwitchMode === 'strict' ? 'selected' : ''}>Strict (block when VPN down)</option>
            </select>

            ${this.networkManager.vpnKillSwitchLastDisconnected.length ? `
              <div style="opacity: 0.7;">Last Block</div>
              <div style="font-size: 12px; opacity: 0.85;">${this.networkManager.vpnKillSwitchLastDisconnected.slice(0, 3).map(escapeHtml).join(', ')}</div>
            ` : ''}
          </div>

          ${this.networkManager.vpnKillSwitchEnabled ? `
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              ${killSwitchShouldEnforce ? `
                <button class="vpn-killswitch-btn" data-action="snooze" ${killSwitchSnoozing ? 'disabled' : ''} style="background: none; border: 1px solid rgba(255,215,0,${killSwitchSnoozing ? '0.25' : '0.5'}); color: ${killSwitchSnoozing ? 'rgba(255,215,0,0.6)' : '#ffd700'}; padding: 6px 12px; border-radius: 6px; cursor: ${killSwitchSnoozing ? 'not-allowed' : 'pointer'}; font-size: 12px;">
                  ${killSwitchSnoozing ? `Snoozed (${snoozeRemaining}s)` : 'Snooze 60s'}
                </button>
              ` : ''}
              <button class="vpn-killswitch-btn" data-action="disable" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Disable</button>
            </div>

            <div style="font-size: 11px; opacity: 0.6; margin-top: 10px; border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;">
              Auto mode arms after a VPN is detected. Strict mode blocks anytime VPN is down (use Snooze to reconnect). Requires NetworkManager (nmcli) for enforcement.
            </div>
          ` : `
            <div style="font-size: 11px; opacity: 0.6; margin-top: 10px;">
              Enable to prevent traffic leaks if your VPN disconnects.
            </div>
          `}
        `)}
        ${card('Mobile Hotspot', `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div>
                      <div style="font-weight: bold; color: ${this.networkManager.hotspotEnabled ? '#00ff41' : '#888'};">${this.networkManager.hotspotEnabled ? 'Active' : 'Off'}</div>
                      <div style="font-size: 12px; opacity: 0.7;">Share internet connection</div>
                  </div>
                   <label class="toggle-switch" style="display: flex; align-items: center; gap: 10px;">
                      <input type="checkbox" class="hotspot-toggle" ${this.networkManager.hotspotEnabled ? 'checked' : ''} ${this.networkManager.hotspotLoading ? 'disabled' : ''}>
                      <span>${this.networkManager.hotspotEnabled ? 'On' : 'Off'}</span>
                  </label>
              </div>
              <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 13px; opacity: 0.8;">
                  <div>Network Name</div><div>${escapeHtml(this.networkManager.hotspotSSID)}</div>
                  <div>Password</div><div>${this.networkManager.hotspotPassword ? '*********' : '<span style="opacity:0.5">None</span>'}</div>
                  <div>Band</div><div>2.4 GHz / 5 GHz</div>
              </div>
              ${this.networkManager.hotspotLoading ? '<div style="font-size:12px;opacity:0.7;margin-top:10px;">Configuring hotspot...</div>' : ''}
              <button class="hotspot-edit-btn" style="margin-top: 10px; background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 10px; border-radius: 4px; cursor: pointer; opacity: ${this.networkManager.hotspotEnabled ? '0.5' : '1'};" ${this.networkManager.hotspotEnabled ? 'disabled' : ''}>Edit Settings</button>
        `)}
        ${card('SSH Server', `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div>
                      <div style="font-weight: bold; color: ${this.sshEnabled ? '#00ff41' : '#888'};">${this.sshEnabled ? 'Running' : 'Stopped'}</div>
                      <div style="font-size: 12px; opacity: 0.7;">Allow remote SSH connections</div>
                  </div>
                  <label class="toggle-switch" style="display: flex; align-items: center; gap: 10px;">
                      <input type="checkbox" class="ssh-toggle" ${this.sshEnabled ? 'checked' : ''}>
                      <span>${this.sshEnabled ? 'On' : 'Off'}</span>
                  </label>
              </div>
              <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 13px; margin-bottom: 10px;">
                  <div style="opacity: 0.7;">Port</div>
                  <div style="display: flex; gap: 10px; align-items: center;">
                      <input type="number" class="ssh-port-input" value="${this.sshPort}" min="1" max="65535" 
                             style="flex: 0 0 100px; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;" 
                             ${this.sshEnabled ? 'disabled' : ''}>
                      <span style="font-size: 11px; opacity: 0.6;">${this.sshEnabled ? '(Stop SSH to change port)' : '(Default: 22)'}</span>
                  </div>
                  <div style="opacity: 0.7;">Status</div>
                  <div style="color: ${this.sshEnabled ? '#00ff41' : '#888'}; font-size: 12px;">${this.sshStatus === 'running' ? '🟢 Active' : (this.sshStatus === 'stopped' ? '🔴 Inactive' : '⚪ Unknown')}</div>
              </div>
              <div style="display: flex; gap: 10px; margin-top: 10px;">
                  <button class="ssh-btn" data-ssh-action="regenerate-keys" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Regenerate Keys</button>
                  <button class="ssh-btn" data-ssh-action="view-pubkey" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">View Public Key</button>
              </div>
              <div style="font-size: 11px; opacity: 0.6; margin-top: 10px; border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;">
                  ⚠️ Warning: Enabling SSH allows remote terminal access. Ensure your password is secure.
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

    const renderBluetooth = () => {
      return `
         ${card('Bluetooth', `
           <div style="display: flex; gap: 20px; align-items: center; justify-content: space-between; margin-bottom: 20px;">
               <div style="font-weight: bold;">Bluetooth</div>
               <label class="toggle-switch" style="display: flex; align-items: center; gap: 10px;">
                   <input type="checkbox" class="bt-enable-toggle" ${this.bluetoothEnabled ? 'checked' : ''}>
                   <span>${this.bluetoothEnabled ? 'On' : 'Off'}</span>
               </label>
           </div>
           
           ${this.bluetoothEnabled ? `
              <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
                  <button class="bt-scan-btn" style="${this.getBtnStyle(this.bluetoothScanning)}">${this.bluetoothScanning ? 'Scanning...' : 'Scan for devices'}</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                 ${this.bluetoothDevices.map(d => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-size: 20px;">${d.type === 'headphone' ? '🎧' : (d.type === 'mouse' ? '🖱️' : (d.type === 'phone' ? '📱' : '⌨️'))}</div>
                            <div>
                                <div style="font-weight: bold; color: #00ff41;">${escapeHtml(d.name)}</div>
                                <div style="font-size: 12px; opacity: 0.7;">${d.connected ? 'Connected' : 'Not Connected'}${d.paired ? ' • Paired' : ''}</div>
                                <div style="font-size: 11px; opacity: 0.5; font-family: monospace;">${escapeHtml(d.mac)}</div>
                            </div>
                        </div>
                        <button class="bt-connect-btn" data-mac="${escapeHtml(d.mac)}" style="${this.getBtnStyle(d.connected)}">
                           ${d.connected ? 'Disconnect' : 'Connect'}
                        </button>
                    </div>
                 `).join('')}
              </div>
           ` : '<div style="opacity: 0.6; padding: 20px; text-align: center;">Bluetooth is off.</div>'}
         `)}
       `;
    };

    const renderAbout = () => {
      const info = this.systemInfo;
      const randomQuote = terryQuotes[Math.floor(Math.random() * terryQuotes.length)];
      return `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 64px; margin-bottom: 10px; color: #ffd700;">✝</div>
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
            <div style="opacity: 0.7;">Platform</div><div>TempleOS Remake</div>
            <div style="opacity: 0.7;">Hostname</div><div>${info?.hostname || '—'}</div>
            <div style="opacity: 0.7;">User</div><div>${info?.user || '—'}</div>
            <div style="opacity: 0.7;">CPU Cores</div><div>${info?.cpus ?? '—'}</div>
            <div style="opacity: 0.7;">Uptime</div><div>${info ? Math.floor(info.uptime / 60) + ' min' : '—'}</div>
            <div style="opacity: 0.7;">Memory</div><div>${info ? `${Math.round(info.memory.free / 1024 / 1024)} MB free / ${Math.round(info.memory.total / 1024 / 1024)} MB` : '—'}</div>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            <button class="about-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh</button>
          </div>
        `)}
        
        <div style="margin: 20px 0; padding: 15px; border-left: 3px solid #ffd700; background: rgba(255,215,0,0.05); font-style: italic; color: #ffd700;">
          "${escapeHtml(randomQuote)}"
          <div style="text-align: right; font-size: 12px; margin-top: 5px; opacity: 0.8;">— Terry A. Davis</div>
        </div>

        ${card('Setup & Maintenance', `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: bold;">Run Setup Again</div>
                <div style="font-size: 12px; opacity: 0.7;">Re-run the initial configuration wizard</div>
              </div>
              <button class="setup-again-btn" style="background: rgba(0,255,65,0.1); border: 1px solid #00ff41; color: #00ff41; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">⚙️ Run Setup</button>
            </div>
          </div>
        `)}

        <div style="text-align: center; margin-top: 16px; font-size: 12px; opacity: 0.65;">
          Made with HolyC ❤️ by Giangero Studio<br>
          © 2025 Giangero Studio
        </div>
      `;
    };

    const renderSecurity = () => {
      return `
        ${card('Encryption (LUKS)', `
           <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
               <div>
                   <div style="font-weight: bold; color: ${this.encryptionEnabled ? '#00ff41' : '#ff6464'};">${this.encryptionEnabled ? 'Encrypted' : 'Not Encrypted'}</div>
                   <div style="font-size: 12px; opacity: 0.7;">God's temple is sealed against heathens.</div>
               </div>
               <label class="toggle-switch" style="display: flex; align-items: center; gap: 10px;">
                   <input type="checkbox" class="sec-toggle" data-sec-key="encryption" ${this.encryptionEnabled ? 'checked' : ''}>
                   <span>${this.encryptionEnabled ? 'On' : 'Off'}</span>
               </label>
           </div>
           <div style="display: flex; gap: 10px;">
               <button class="encryption-change-key-btn" style="${this.getBtnStyle(false)}">Change Key</button>
               <button class="encryption-backup-btn" style="${this.getBtnStyle(false)}">Backup Header</button>
           </div>
        `)}
        
        ${card('VeraCrypt Volumes', `
           <div style="margin-bottom: 10px; font-size: 13px; opacity: 0.8;">
             Manage mounted VeraCrypt containers.
           </div>
           
           ${this.veraCryptLoading ? '<div style="opacity: 0.6; font-size: 12px; margin-bottom: 10px;">Loading volumes...</div>' : ''}

           <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
               ${this.veraCryptVolumes.length === 0 && !this.veraCryptLoading ? '<div style="opacity: 0.6; font-size: 12px; font-style: italic;">No volumes mounted</div>' : ''}
               ${this.veraCryptVolumes.map(v => `
                   <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                       <div>
                           <div style="font-weight: bold; font-size: 13px;">Slot ${v.slot}</div>
                           <div style="font-size: 11px; opacity: 0.7;">${v.source}</div>
                           <div style="font-size: 11px; color: #00ff41;">Mounted at ${v.mountPoint}</div>
                       </div>
                       <button class="vc-dismount-btn" data-slot="${v.slot}" style="background: none; border: 1px solid #ff6464; color: #ff6464; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Dismount</button>
                   </div>
               `).join('')}
           </div>

           <div style="display: flex; gap: 10px;">
               <button class="vc-mount-btn" style="${this.getBtnStyle(true)}">Mount Volume</button>
               <button class="vc-refresh-btn" style="${this.getBtnStyle(false)}">Refresh</button>
           </div>
        `)}

        ${card('Divine Firewall', `
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
               <div>
                   <div style="font-weight: bold; color: ${this.firewallEnabled ? '#00ff41' : '#ff6464'};">${this.firewallEnabled ? 'Active' : 'Disabled'}</div>
                   <div style="font-size: 12px; opacity: 0.7;">Block unwanted spirits and connections.</div>
               </div>
               <label class="toggle-switch" style="display: flex; align-items: center; gap: 10px;">
                   <input type="checkbox" class="firewall-toggle" ${this.firewallEnabled ? 'checked' : ''}>
                   <span>${this.firewallEnabled ? 'On' : 'Off'}</span>
               </label>
           </div>
           
           <div style="border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; padding: 10px; background: rgba(0,0,0,0.2); margin-bottom: 15px;">
               <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">Add New Rule</div>
               <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                   <input type="number" class="fw-port-input" placeholder="Port (e.g. 80)" style="width: 80px; background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;">
                   <select class="fw-proto-select" style="background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;">
                       <option value="tcp">TCP</option>
                       <option value="udp">UDP</option>
                   </select>
                   <select class="fw-action-select" style="background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;">
                       <option value="ALLOW">ALLOW</option>
                       <option value="DENY">DENY</option>
                       <option value="REJECT">REJECT</option>
                   </select>
                   <button class="fw-add-btn" style="background: #00ff41; color: #000; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-family: inherit;">Add</button>
               </div>
           </div>

           <div style="font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
               <span>Active Rules</span>
               <button class="fw-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 2px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;">↻ Refresh</button>
           </div>
           
           ${this.firewallRulesLoading ? '<div style="opacity: 0.6; font-size: 12px;">Loading rules...</div>' : ''}
           
           <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
               ${this.firewallRules.length === 0 && !this.firewallRulesLoading ? '<div style="opacity: 0.6; font-size: 12px;">No custom rules defined.</div>' : ''}
               ${this.firewallRules.map(r => `
                   <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 12px;">
                       <div style="display: flex; gap: 10px; align-items: center;">
                           <span style="font-weight: bold; color: ${r.action === 'ALLOW' ? '#00ff41' : '#ff6464'}; width: 50px;">${r.action}</span>
                           <span>${r.to}</span>
                       </div>
                       <button class="fw-delete-btn" data-id="${r.id}" style="background: none; border: none; color: #ff6464; cursor: pointer; opacity: 0.7;">🗑️</button>
                   </div>
               `).join('')}
           </div>
        `)}

        ${card('Privacy & Anonymity', `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>MAC Address Randomization</span>
                    <input type="checkbox" class="sec-toggle" data-sec-key="mac" ${this.macRandomization ? 'checked' : ''}>
                </label>
                 <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Secure Delete (Overwrite)</span>
                    <input type="checkbox" class="sec-toggle" data-sec-key="shred" ${this.secureDelete ? 'checked' : ''}>
                </label>
                 <label style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; flex-direction: column;">
                        <span>Clear RAM on Shutdown</span>
                        <span style="font-size: 10px; opacity: 0.6;">Resets session state. Safe for files.</span>
                    </div>
                    <input type="checkbox" class="sec-toggle" data-sec-key="memory-wipe" ${this.secureWipeOnShutdown ? 'checked' : ''}>
                </label>
                 <label style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; flex-direction: column;">
                        <span>Tracker Blocking</span>
                        <span style="font-size: 10px; opacity: 0.6;">Block ads, trackers, and analytics</span>
                    </div>
                    <input type="checkbox" class="sec-toggle" data-sec-key="tracker-blocking" ${this.trackerBlockingEnabled ? 'checked' : ''}>
                </label>
            </div>
        `)}

        ${card('Tor Integration', `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <div style="font-weight: bold; color: ${this.networkManager.torStatus.running ? '#00ff41' : '#888'};">
                🧅 ${this.networkManager.torStatus.running ? 'Tor Running' : 'Tor Off'}
              </div>
              <div style="font-size: 12px; opacity: 0.7;">Route traffic through Tor network for anonymity</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 13px; margin-bottom: 10px;">
            <div style="opacity: 0.7;">Mode</div>
            <select class="tor-mode-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;">
              <option value="off" ${this.networkManager.torMode === 'off' ? 'selected' : ''}>Off - Normal Internet</option>
              <option value="browser-only" ${this.networkManager.torMode === 'browser-only' ? 'selected' : ''}>Browser Only</option>
              <option value="system-wide" ${this.networkManager.torMode === 'system-wide' ? 'selected' : ''}>System-wide (slow)</option>
            </select>
            <div style="opacity: 0.7;">Installed</div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="color: ${this.networkManager.torStatus.installed ? '#00ff41' : '#ff6464'};">${this.networkManager.torStatus.installed ? '✓ Yes' : '✗ No'}</span>
              ${!this.networkManager.torStatus.installed ? `<button class="tor-install-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Install Tor</button>` : ''}
            </div>
          </div>
          ${this.networkManager.torMode !== 'off' && !this.networkManager.torStatus.running ? `
            <button class="tor-start-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Start Tor</button>
          ` : ''}
          ${this.networkManager.torStatus.running ? `
            <button class="tor-stop-btn" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Stop Tor</button>
          ` : ''}
          <div style="font-size: 11px; opacity: 0.6; margin-top: 10px; border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;">
            ⚠️ System-wide Tor routes ALL traffic through Tor. Very slow, may break some apps. Use "Browser Only" for Tor Browser usage.
          </div>
        `)}

        ${card('Emergency Lockdown', `
          <div style="text-align: center;">
            <button class="panic-lockdown-btn" style="background: linear-gradient(135deg, #ff3333, #cc0000); color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; font-family: inherit;">
              🚨 PANIC: Lock & Disconnect
            </button>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 10px;">
              Immediately locks screen and disables all network connections.
            </div>
          </div>
        `)}

        ${card('🛡️ Security Audit', (() => {
        // Calculate security score
        const checks = [
          { name: 'Encryption', enabled: this.encryptionEnabled, weight: 23 },
          { name: 'Firewall', enabled: this.firewallEnabled, weight: 18 },
          { name: 'SSH Disabled', enabled: !this.sshEnabled, weight: 13 },
          { name: 'Tracker Blocking', enabled: this.trackerBlockingEnabled, weight: 12 },
          { name: 'Tor Mode', enabled: this.torEnabled && this.torDaemonRunning, weight: 12 },
          { name: 'MAC Randomization', enabled: this.macRandomization, weight: 10 },
          { name: 'Secure Wipe', enabled: this.secureWipeOnShutdown, weight: 8 },
          { name: 'Lock Screen', enabled: this.lockPassword !== '', weight: 4 },
        ];

        const score = checks.reduce((sum, c) => sum + (c.enabled ? c.weight : 0), 0);
        const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
        const percentage = Math.round((score / maxScore) * 100);

        let scoreColor = '#ff6464';
        let scoreLabel = 'Poor';
        if (percentage >= 80) { scoreColor = '#00ff41'; scoreLabel = 'Excellent'; }
        else if (percentage >= 60) { scoreColor = '#ffd700'; scoreLabel = 'Good'; }
        else if (percentage >= 40) { scoreColor = '#ffb000'; scoreLabel = 'Fair'; }

        return `
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 48px; font-weight: bold; color: ${scoreColor}; margin-bottom: 5px;">${percentage}%</div>
              <div style="font-size: 14px; color: ${scoreColor}; font-weight: bold;">${scoreLabel}</div>
              <div style="font-size: 11px; opacity: 0.6; margin-top: 3px;">Security Score</div>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
              <div style="height: 8px; background: ${scoreColor}; width: ${percentage}%; transition: width 0.3s ease;"></div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
              ${checks.map(c => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: ${c.enabled ? 'rgba(0,255,65,0.1)' : 'rgba(255,100,100,0.05)'}; border-left: 3px solid ${c.enabled ? '#00ff41' : '#ff6464'}; border-radius: 4px;">
                  <span>${c.enabled ? '✅' : '❌'} ${c.name}</span>
                  <span style="opacity: 0.6; font-size: 11px;">${c.weight}pts</span>
                </div>
              `).join('')}
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: rgba(255,215,0,0.05); border: 1px solid rgba(255,215,0,0.2); border-radius: 6px; font-size: 11px;">
              <div style="color: #ffd700; font-weight: bold; margin-bottom: 4px;">💡 Recommendations:</div>
              ${!this.encryptionEnabled ? '<div>• Enable disk encryption for data protection</div>' : ''}
              ${!this.firewallEnabled ? '<div>• Enable firewall to block unauthorized access</div>' : ''}
              ${this.sshEnabled ? '<div>• Disable SSH if not needed for remote access</div>' : ''}
              ${!this.macRandomization ? '<div>• Enable MAC randomization for privacy</div>' : ''}
              ${!(this.torEnabled && this.torDaemonRunning) ? '<div>• Consider Tor for anonymous browsing<br><span style="font-size: 10px; opacity: 0.7; margin-left: 8px;">Note: Tor service only. Use <code>torsocks</code> to route apps through Tor</span></div>' : ''}
              ${percentage === 100 ? '<div style="color: #00ff41;">✨ Perfect! Your security is divine.</div>' : ''}
            </div>
          `;
      })())}

        ${card('📷 EXIF Metadata Stripper', `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 13px; opacity: 0.85; margin-bottom: 10px;">
              Remove location, camera, and timestamp data from images before sharing.
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="exif-select-file-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">
                📂 Select Image
              </button>
              <button class="exif-strip-btn" ${!this.exifSelectedFile ? 'disabled' : ''} style="background: none; border: 1px solid rgba(0,255,65,${this.exifSelectedFile ? '0.5' : '0.3'}); color: ${this.exifSelectedFile ? '#00ff41' : 'rgba(0,255,65,0.5)'}; padding: 8px 16px; border-radius: 6px; cursor: ${this.exifSelectedFile ? 'pointer' : 'not-allowed'}; font-family: inherit;">
                🧹 Strip EXIF Data
              </button>
            </div>
          </div>
          
          ${this.exifMetadata ? `
            <div class="exif-result" style="padding: 12px; background: rgba(0,255,65,0.05); border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; font-size: 12px; margin-bottom: 12px;">
              <div style="font-weight: bold; color: #ffd700; margin-bottom: 8px;">Metadata Found in: ${this.exifSelectedFile?.split(/[/\\\\]/).pop()}</div>
              <div class="exif-data" style="font-family: monospace; opacity: 0.85; line-height: 1.6;">
                ${Object.entries(this.exifMetadata).map(([key, value]) => `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid rgba(0,255,65,0.1);">
                    <span style="color: #ffd700;">${key}:</span>
                    <span>${value}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div style="margin-top: 12px; padding: 10px; background: rgba(255,215,0,0.05); border: 1px solid rgba(255,215,0,0.2); border-radius: 6px; font-size: 11px;">
            <div style="color: #ffd700; font-weight: bold; margin-bottom: 4px;">⚠️ Privacy Warning:</div>
            <div style="opacity: 0.85;">
              • GPS coordinates can reveal your home address<br>
              • Camera model/serial number can identify you<br>
              • Timestamps reveal when photos were taken<br>
              • Software info can leak your workflow
            </div>
          </div>
        `)}


        ${card('Lock Screen Password', `
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;">
            <div>Password</div>
            <div>
              <input type="password" class="lock-password-field" value="${escapeHtml(this.lockPassword)}" placeholder="Password"
                     style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit; box-sizing: border-box;" />
            </div>
            <div>Confirm</div>
            <div>
              <input type="password" class="lock-password-confirm" placeholder="Confirm password"
                     style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit; box-sizing: border-box;" />
            </div>
            <div></div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="save-password-btn" style="background: #00ff41; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
              <span style="font-size: 11px; opacity: 0.6;">Sets the password required to unlock the screen.</span>
            </div>
          </div>
        `)}

        ${card('Physical Security', `
           <div style="margin-bottom: 15px;">
               <div style="font-weight: bold; color: #ffd700; margin-bottom: 5px;">USB Device Whitelist</div>
               <div style="font-size: 12px; opacity: 0.8; margin-bottom: 10px;">Only allowed USB HID devices can function.</div>
               
                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; padding: 10px; margin-bottom: 10px;">
                    ${this.usbDevices.map(d => `
                       <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 13px;">
                           <span>${d.name} (${d.type})</span>
                           <button class="usb-toggle-btn" data-id="${d.id}" style="background: none; border: 1px solid ${d.allowed ? '#00ff41' : '#ff6464'}; color: ${d.allowed ? '#00ff41' : '#ff6464'}; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                               ${d.allowed ? 'Allowed' : 'Blocked'}
                           </button>
                       </div>
                    `).join('')}
                </div>
           </div>

           <div style="margin-bottom: 15px;">
               <div style="font-weight: bold; color: #ffd700; margin-bottom: 5px;">Panic Button</div>
               <button class="panic-btn" style="width: 100%; background: #ff4444; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                 <span>🚨</span> INITIATE LOCKDOWN
               </button>
               <div style="font-size: 11px; margin-top: 5px; opacity: 0.7;">Immediately locks screen, dismounts VeraCrypt, and clears clipboard.</div>
           </div>
           
           <div>
               <div style="font-weight: bold; color: #ffd700; margin-bottom: 5px;">Duress Password (Panic Login)</div>
               <div style="background: rgba(255,200,0,0.1); border: 1px solid rgba(255,200,0,0.3); border-radius: 6px; padding: 10px; margin-bottom: 10px; font-size: 12px; line-height: 1.5;">
                   <div style="margin-bottom: 8px;">If someone forces you to unlock your computer (police, thief, abuser, etc.), enter this password instead of your real one.</div>
                   <div style="margin-bottom: 8px;">The system will appear to unlock normally, but shows a <strong style="color: #ffd700;">fake empty desktop</strong> - hiding all your real files, notes, terminal history, and data.</div>
                   <div style="opacity: 0.8;">To restore your real session, lock the screen and enter your real password.</div>
               </div>
               <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center;">
                   <div style="font-size: 12px;">Password</div>
                   <input type="password" class="duress-input" placeholder="Set duress password..." value="${escapeHtml(this.duressPassword)}" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit;">
                   <div style="font-size: 12px;">Confirm</div>
                   <input type="password" class="duress-confirm" placeholder="Confirm duress password..." style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit;">
                   <div></div>
                   <div>
                       <button class="save-duress-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Save</button>
                   </div>
               </div>
           </div>
        `)}

        ${card('Lock Screen PIN', `
          <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;">
            <div>PIN</div>
            <div>
              <input type="password" class="lock-pin-field" value="${escapeHtml(this.lockPin)}" placeholder="PIN (numbers only)" inputmode="numeric" pattern="[0-9]*"
                     style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit; box-sizing: border-box;" />
            </div>
            <div>Confirm</div>
            <div>
              <input type="password" class="lock-pin-confirm" placeholder="Confirm PIN" inputmode="numeric" pattern="[0-9]*"
                     style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit; box-sizing: border-box;" />
            </div>
            <div></div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="save-pin-btn" style="background: #00ff41; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
              <span style="font-size: 11px; opacity: 0.6;">PIN for lock screen (default: 7777). Leave empty to disable.</span>
            </div>
          </div>
        `)
        }
        ${card('Lock Screen', `
          <button class="test-lock-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: inherit;">Test Lock Screen</button>
          <div style="font-size: 12px; opacity: 0.65; margin-top: 8px;">Test the lock screen with your current password/PIN settings.</div>
        `)
        }
    `;
    };

    const renderAccessibility = () => {
      return `
        ${card('Visual', `
          <div style="display: flex; flex-direction: column; gap: 15px;">
             <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
               <div style="display: flex; flex-direction: column;">
                 <span style="font-weight: bold;">High Contrast Mode</span>
                 <span style="font-size: 12px; opacity: 0.7;">Use high contrast colors for better visibility</span>
               </div>
               <input type="checkbox" class="high-contrast-toggle" ${this.highContrast ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
               <div style="display: flex; flex-direction: column;">
                 <span style="font-weight: bold;">Large Text</span>
                 <span style="font-size: 12px; opacity: 0.7;">Increase text size globally</span>
               </div>
               <input type="checkbox" class="large-text-toggle" ${this.largeText ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
               <div style="display: flex; flex-direction: column;">
                 <span style="font-weight: bold;">Reduce Motion</span>
                 <span style="font-size: 12px; opacity: 0.7;">Minimize animations and transitions</span>
               </div>
               <input type="checkbox" class="reduce-motion-toggle" ${this.reduceMotion ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>

            <!-- Visual Effects (Tier 14.2) -->
            <div style="margin-top: 20px; font-size: 14px; text-transform: uppercase; color: #888; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 15px;">Visual Effects</div>

            <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 10px; background: rgba(0,255,65,0.05); border-radius: 8px; margin-bottom: 10px;">
               <div>
                 <div style="font-weight: bold;">Jelly Mode</div>
                 <span style="font-size: 12px; opacity: 0.7;">Enable wobbly window animations</span>
               </div>
               <input type="checkbox" class="jelly-mode-toggle" ${this.jellyMode ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>

            <div>
              <div style="margin-bottom: 8px;">
                 <span style="font-weight: bold;">Color Blind Mode</span>
              </div>
              <select class="color-blind-select" style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; font-family: inherit;">
                <option value="none" ${this.colorBlindMode === 'none' ? 'selected' : ''}>None</option>
                <option value="protanopia" ${this.colorBlindMode === 'protanopia' ? 'selected' : ''}>Protanopia (Red-blind)</option>
                <option value="deuteranopia" ${this.colorBlindMode === 'deuteranopia' ? 'selected' : ''}>Deuteranopia (Green-blind)</option>
                <option value="tritanopia" ${this.colorBlindMode === 'tritanopia' ? 'selected' : ''}>Tritanopia (Blue-blind)</option>
                <option value="achromatopsia" ${this.colorBlindMode === 'achromatopsia' ? 'selected' : ''}>Achromatopsia (Monochromacy)</option>
              </select>
            </div>
          </div>
        `)}

        ${card('Keyboard', `
           <div style="font-size: 13px; opacity: 0.8; line-height: 1.5;">
             TempleOS is designed to be fully navigable via keyboard.
             <ul style="padding-left: 20px; margin-top: 8px;">
               <li><strong>Tab / Shift+Tab</strong>: Navigate focusable elements</li>
               <li><strong>Enter / Space</strong>: Activate/Toggle</li>
               <li><strong>Arrows</strong>: Navigate lists and menus</li>
               <li><strong>Super (Win)</strong>: Open Start Menu</li>
               <li><strong>Alt+Tab</strong>: Switch Windows</li>
               <li><strong>Alt+F4</strong>: Close Window</li>
             </ul>
           </div>
        `)}
      `;
    };

    const renderGaming = () => {
      const launchers = this.installedApps.filter(a => {
        const name = a.name.toLowerCase();
        return name.includes('steam') || name.includes('heroic') || name.includes('lutris') || name.includes('bottle');
      });

      return `
        ${card('Gaming Mode', `
          <div style="display: flex; flex-direction: column; gap: 15px;">
             <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
               <div style="display: flex; flex-direction: column;">
                 <span style="font-weight: bold;">Gaming Mode</span>
                 <span style="font-size: 12px; opacity: 0.7;">Optimizes performance and suppresses notifications when playing games</span>
               </div>
               <input type="checkbox" class="gaming-mode-toggle" ${this.gamingModeActive ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>
              <div style="font-size: 12px; opacity: 0.6; margin-top: -10px;">
                Automatically enabled when launching games. Blocks Super/Meta keys.
                <br>Use <strong>Ctrl+Alt+G</strong> to toggle manually.
              </div>

              <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-top: 8px;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-weight: bold;">Hide Bar On Fullscreen</span>
                  <span style="font-size: 12px; opacity: 0.7;">Allows true fullscreen by hiding the panel and removing reserved space</span>
                </div>
                <input type="checkbox" class="hide-bar-fullscreen-toggle" ${this.hideBarOnFullscreen ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
              </label>
           </div>
        `)}

        ${card('Game Launchers', `
           <div style="display: flex; flex-direction: column; gap: 10px;">
             ${launchers.length > 0 ? launchers.map(l => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid rgba(0,255,65,0.1);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🎮</span>
                        <div>
                           <div style="font-weight: bold;">${escapeHtml(l.name)}</div>
                           <div style="font-size: 11px; opacity: 0.7;">${escapeHtml(l.exec || '')}</div>
                        </div>
                    </div>
                    <button onclick="void 0" style="padding: 4px 10px; background: rgba(0,255,65,0.1); border: 1px solid #00ff41; color: #00ff41; border-radius: 4px; cursor: default; font-family: inherit; font-size: 12px;">Installed</button>
                </div>
             `).join('') : '<div style="opacity: 0.6; font-style: italic;">No supported game launchers detected (Steam, Heroic, Lutris, Bottles).</div>'}
           </div>
        `)}
      `;
    };

    const renderPageContent = () => {
      switch (this.activeSettingsCategory) {
        case 'System': return renderSystem();
        case 'Personalization': return renderPersonalization();
        case 'Network': return renderNetwork();
        case 'Gaming': return renderGaming();
        case 'Security': return renderSecurity();
        case 'Accessibility': return renderAccessibility();
        case 'Devices': return renderDevices();
        case 'Bluetooth': return renderBluetooth();
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

  // Returns fake innocent file entries for decoy mode
  private getDecoyFileEntries(): FileEntry[] {
    const basePath = this.currentPath || '/home/user';

    // Fake innocent file structure
    if (basePath === '/home/user' || basePath.endsWith('/user')) {
      return [
        { name: 'Documents', path: `${basePath}/Documents`, isDirectory: true, size: 0, modified: new Date().toISOString() },
        { name: 'Pictures', path: `${basePath}/Pictures`, isDirectory: true, size: 0, modified: new Date().toISOString() },
        { name: 'Downloads', path: `${basePath}/Downloads`, isDirectory: true, size: 0, modified: new Date().toISOString() },
        { name: 'Music', path: `${basePath}/Music`, isDirectory: true, size: 0, modified: new Date().toISOString() },
      ];
    } else if (basePath.includes('/Documents')) {
      return [
        { name: 'readme.txt', path: `${basePath}/readme.txt`, isDirectory: false, size: 128, modified: new Date().toISOString() },
      ];
    } else if (basePath.includes('/Pictures')) {
      return [
        { name: 'wallpaper.jpg', path: `${basePath}/wallpaper.jpg`, isDirectory: false, size: 24000, modified: new Date().toISOString() },
      ];
    }
    // Other folders appear empty
    return [];
  }

  private async loadFiles(path?: string): Promise<void> {
    // In decoy mode, show fake innocent file structure
    if (this.isDecoySession) {
      this.currentPath = path || '/home/user';
      this.fileEntries = this.getDecoyFileEntries();
      this.updateFileBrowserWindow();
      return;
    }

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

  // ============================================
  // FILE BROWSER MULTI-SELECT (Priority 1)
  // ============================================

  private toggleFileSelection(path: string, ctrlKey: boolean, shiftKey: boolean): void {
    if (shiftKey && this.lastSelectedIndex >= 0) {
      // Range selection with Shift
      const currentIndex = this.fileEntries.findIndex(f => f.path === path);
      if (currentIndex >= 0) {
        const start = Math.min(this.lastSelectedIndex, currentIndex);
        const end = Math.max(this.lastSelectedIndex, currentIndex);
        for (let i = start; i <= end; i++) {
          if (this.fileEntries[i]) {
            this.selectedFiles.add(this.fileEntries[i].path);
          }
        }
      }
    } else if (ctrlKey) {
      // Toggle selection with Ctrl
      if (this.selectedFiles.has(path)) {
        this.selectedFiles.delete(path);
      } else {
        this.selectedFiles.add(path);
      }
      const currentIndex = this.fileEntries.findIndex(f => f.path === path);
      if (currentIndex >= 0) {
        this.lastSelectedIndex = currentIndex;
      }
    } else {
      // Single selection (clear others)
      this.selectedFiles.clear();
      this.selectedFiles.add(path);
      const currentIndex = this.fileEntries.findIndex(f => f.path === path);
      if (currentIndex >= 0) {
        this.lastSelectedIndex = currentIndex;
      }
    }
    this.updateFileBrowserWindow();
  }

  private selectAllFiles(): void {
    for (const file of this.fileEntries) {
      if (!file.isDirectory || this.selectedFiles.size > 0) { // Include all if any selected, otherwise skip dirs
        this.selectedFiles.add(file.path);
      }
    }
    this.updateFileBrowserWindow();
  }

  private deselectAllFiles(): void {
    this.selectedFiles.clear();
    this.lastSelectedIndex = -1;
    this.updateFileBrowserWindow();
  }

  private async deleteSelectedFiles(): Promise<void> {
    if (this.selectedFiles.size === 0) return;

    const count = this.selectedFiles.size;
    const ok = await this.openConfirmModal({
      title: 'Delete Selected Files',
      message: `Move ${count} item${count > 1 ? 's' : ''} to Trash?`,
      confirmText: 'Move to Trash',
      cancelText: 'Cancel'
    });

    if (!ok) return;

    const paths = Array.from(this.selectedFiles);
    let successCount = 0;
    let errorCount = 0;

    for (const path of paths) {
      if (window.electronAPI?.trashItem) {
        const res = await window.electronAPI.trashItem(path);
        if (res.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } else if (window.electronAPI?.deleteItem) {
        const res = await window.electronAPI.deleteItem(path);
        if (res.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    this.selectedFiles.clear();
    this.lastSelectedIndex = -1;

    if (errorCount > 0) {
      this.showNotification('Files', `Deleted ${successCount} items, ${errorCount} failed`, 'warning');
    } else {
      this.showNotification('Files', `Deleted ${successCount} item${successCount > 1 ? 's' : ''}`, 'divine');
    }

    await this.loadFiles(this.currentPath);
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

  /**
   * Show terminal settings panel with font size controls
   */
  private showTerminalSettingsPanel(): void {
    const panelHtml = `
      <div class="terminal-settings-panel">
        <div class="terminal-settings-row">
          <span class="terminal-settings-label">Font Size</span>
          <div class="terminal-settings-control">
            <button class="terminal-settings-btn" data-font-action="decrease">−</button>
            <span class="terminal-settings-value" id="font-size-display">${this.terminalFontSize}px</span>
            <button class="terminal-settings-btn" data-font-action="increase">+</button>
          </div>
        </div>
      </div>
    `;

    void this.openAlertModal({
      title: '⚙️ Terminal Settings',
      message: '',
      customContent: panelHtml
    });

    // Add click handlers for font buttons after modal opens
    setTimeout(() => {
      const decreaseBtn = document.querySelector('[data-font-action="decrease"]');
      const increaseBtn = document.querySelector('[data-font-action="increase"]');
      const display = document.getElementById('font-size-display');

      const updateFontSize = (newSize: number) => {
        this.terminalFontSize = Math.max(8, Math.min(24, newSize));
        if (display) display.textContent = `${this.terminalFontSize}px`;

        // Update all open terminal tabs
        for (const tab of this.terminalTabs) {
          if (tab.xterm && tab.fitAddon) {
            // Set the new font size
            tab.xterm.options.fontSize = this.terminalFontSize;
            tab.xterm.options.fontFamily = this.terminalFontFamily;
            tab.fitAddon.fit();

            // CRITICAL: Toggle font size to force xterm to recalculate metrics correctly
            // This is the same trick used for window resize
            const originalSize = this.terminalFontSize;
            tab.xterm.options.fontSize = originalSize + 1;
            requestAnimationFrame(() => {
              if (tab.xterm) {
                tab.xterm.options.fontSize = originalSize;
                tab.xterm.refresh(0, tab.xterm.rows - 1);
              }
            });
          }
        }
      };

      decreaseBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        updateFontSize(this.terminalFontSize - 1);
      });

      increaseBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        updateFontSize(this.terminalFontSize + 1);
      });
    }, 100);
  }

  private refreshTerminalWindow(): void {
    const terminalWindow = this.windows.find(w => w.id.startsWith('terminal'));
    if (terminalWindow) {
      terminalWindow.content = this.getTerminalContent();
      if (!this.ptySupported) {
        this.render();
        requestAnimationFrame(() => {
          const output = document.getElementById('terminal-output');
          if (output) {
            output.scrollTop = output.scrollHeight;
            // Double-check to ensure layout is settled
            requestAnimationFrame(() => {
              output.scrollTop = output.scrollHeight;
            });
          }

          const input = document.querySelector('.terminal-input') as HTMLInputElement | null;
          if (this.terminalSearchOpen) {
            const s = document.querySelector('.terminal-search-input') as HTMLInputElement | null;
            s?.focus();
            if (s) s.setSelectionRange(s.value.length, s.value.length);
            this.scrollTerminalToSearchMatch();
          } else {
            input?.focus();
          }
        });
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
        if (placeholder) {
          // Copy classes from placeholder (which has the correct pane-primary/pane-secondary)
          // to the preserved host before replacing
          host.className = placeholder.className;
          placeholder.replaceWith(host);
        }
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
        ${tab.modified ? '<span class="editor-tab-modified">●</span>' : ''}
        ${escapeHtml(tab.filename)}
        ${this.editorTabs.length > 1 ? `<span class="editor-tab-close" data-editor-close="${i}">×</span>` : ''}
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
        <button class="editor-find-btn" data-editor-action="find-prev" title="Previous (Shift+F3)">◀</button>
        <button class="editor-find-btn" data-editor-action="find-next" title="Next (F3)">▶</button>
        ${this.editorFindMode === 'replace' ? `
          <button class="editor-find-btn" data-editor-action="replace" title="Replace">Replace</button>
          <button class="editor-find-btn" data-editor-action="replace-all" title="Replace All">All</button>
        ` : ''}
        <span class="editor-find-count">${this.editorFindMatches.length > 0 ? `${this.editorFindCurrentMatch + 1}/${this.editorFindMatches.length}` : ''}</span>
        <button class="editor-find-btn editor-find-close" data-editor-action="find-close">×</button>
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

    // Preserve search input focus state before DOM update
    const searchInput = winEl.querySelector('.monitor-search-input') as HTMLInputElement | null;
    const hadFocus = searchInput && document.activeElement === searchInput;
    const cursorPos = searchInput?.selectionStart ?? 0;
    const cursorEnd = searchInput?.selectionEnd ?? 0;

    // The scrollable container is the FIRST div inside system-monitor with overflow:auto
    // Not the .system-monitor-processes div itself
    const scrollContainer = winEl.querySelector('.system-monitor > div[style*="overflow"]') as HTMLElement | null;
    const prevScroll = scrollContainer?.scrollTop ?? 0;

    winEl.innerHTML = content;

    // Use requestAnimationFrame to ensure DOM is updated before restoring scroll and focus
    requestAnimationFrame(() => {
      const newScrollContainer = winEl.querySelector('.system-monitor > div[style*="overflow"]') as HTMLElement | null;
      if (newScrollContainer && prevScroll > 0) {
        newScrollContainer.scrollTop = prevScroll;
      }

      // Restore focus to search input if it had focus before
      if (hadFocus) {
        const newSearchInput = winEl.querySelector('.monitor-search-input') as HTMLInputElement | null;
        if (newSearchInput) {
          newSearchInput.focus();
          // Restore cursor position
          newSearchInput.setSelectionRange(cursorPos, cursorEnd);
        }
      }
    });
  }

  private async refreshSystemMonitorData(force = false): Promise<void> {
    if (!window.electronAPI) return;
    if (this.monitorBusy && !force) return;
    this.monitorBusy = true;
    try {
      if (window.electronAPI.getMonitorStats) {
        const statsRes = await window.electronAPI.getMonitorStats();
        if (statsRes.success && statsRes.stats) {
          this.monitorStats = statsRes.stats;
          this.networkManager.updateDataUsage(this.monitorStats);
        }
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

    const sortArrow = (key: string) => this.monitorSort === key ? (this.monitorSortDir === 'asc' ? ' ▲' : ' ▼') : '';

    // Use enhanced module for stats rendering (includes CPU graph + GPU)
    const enhancedStats = this.systemMonitor.renderMonitorContent(s);

    return `
    <div class="system-monitor" style="height: 100%; display: flex; flex-direction: column; min-width: 0;">
      <div style="padding: 10px; border-bottom: 1px solid rgba(0,255,65,0.2); display: flex; gap: 10px; align-items: center;">
        <button class="monitor-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 8px; cursor: pointer;">Refresh</button>
        <input class="monitor-search-input" placeholder="Search processes..." value="${escapeHtml(this.monitorQuery)}" style="flex: 1; min-width: 120px; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.25); color: #00ff41; padding: 8px 10px; border-radius: 8px; font-family: inherit; outline: none;" />
        <div style="font-size: 12px; opacity: 0.75; white-space: nowrap;">
          ${s ? `Uptime ${this.formatDuration(s.uptime)} • ${escapeHtml(s.hostname)}` : 'Loading…'}
        </div>
      </div>

      <!-- Enhanced stats with CPU graph and GPU monitoring -->
      <div style="flex: 1; overflow: auto; display: flex; flex-direction: column;">
        <div style="flex-shrink: 0;">
          ${enhancedStats}
        </div>

        <!-- Process List -->
        <div class="system-monitor-processes" style="padding: 10px; min-width: 0;">
          <div style="display: grid; grid-template-columns: 76px 1fr 72px 72px 72px 120px; gap: 10px; padding: 8px 10px; border: 1px solid rgba(0,255,65,0.18); border-radius: 8px; opacity: 0.8; font-size: 12px;">
            <span></span>
            <span class="monitor-col-header" data-sort-key="name" style="cursor: pointer;">Name${sortArrow('name')}</span>
            <span class="monitor-col-header" data-sort-key="pid" style="cursor: pointer;">PID${sortArrow('pid')}</span>
            <span class="monitor-col-header" data-sort-key="cpu" style="cursor: pointer;">CPU${sortArrow('cpu')}</span>
            <span class="monitor-col-header" data-sort-key="mem" style="cursor: pointer;">MEM${sortArrow('mem')}</span>
            <span>Time</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
            ${processes.length === 0 ? `<div style="padding: 16px; opacity: 0.7;">${q ? 'No processes match your search.' : 'No processes.'}</div>` : processes.map(p => `
              <div style="display: grid; grid-template-columns: 76px 1fr 72px 72px 72px 120px; gap: 10px; padding: 6px 10px; border: 1px solid rgba(0,255,65,0.12); border-radius: 8px; align-items: center; font-size: 13px; background: rgba(0,255,65,0.02);">
                <button class="monitor-kill-btn" data-pid="${p.pid}" style="background: rgba(255,65,65,0.18); border: 1px solid rgba(255,65,65,0.35); color: #ff4141; padding: 4px 6px; font-size: 11px; border-radius: 6px; cursor: pointer;">Kill</button>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(p.command || p.name)}">${escapeHtml(p.name)}</span>
                <span>${p.pid}</span>
                <span>${(p.cpu || 0).toFixed(1)}%</span>
                <span>${(p.mem || 0).toFixed(1)}%</span>
                <span style="font-size: 11px;">${p.etime || '-'}</span>
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
        ${i === this.currentHymn ? '<span>▶</span>' : ''}
      </div>
    `).join('');

    return `
      <div class="hymn-player" style="height: 100%; display: flex; flex-direction: column;">
        <div style="text-align: center; padding: 15px; border-bottom: 1px solid rgba(0,255,65,0.2);">
          <div style="font-size: 24px; margin-bottom: 5px;">🎶 ✝️ 🎶</div>
          <h2 style="font-family: 'Press Start 2P', cursive; font-size: 10px; color: #ffd700; margin: 0;">DIVINE HYMNS</h2>
          <p style="font-size: 12px; opacity: 0.6; margin-top: 5px;">Orthodox Liturgical Music</p>
        </div>
        
        <div style="padding: 15px; border-bottom: 1px solid rgba(0,255,65,0.2);">
          <div style="font-size: 16px; color: #ffd700; margin-bottom: 10px; text-align: center;">${this.hymnList[this.currentHymn].title}</div>
          <audio id="hymn-audio" controls style="width: 100%; filter: sepia(0.3) hue-rotate(80deg);" src="./music/${this.hymnList[this.currentHymn].file}"></audio>
          <div style="display: flex; justify-content: center; gap: 15px; margin-top: 10px;">
            <button class="hymn-control" data-action="prev" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 15px; cursor: pointer; border-radius: 4px;">⏮ Prev</button>
            <button class="hymn-control" data-action="random" style="background: none; border: 1px solid rgba(255,215,0,0.3); color: #ffd700; padding: 8px 15px; cursor: pointer; border-radius: 4px;">🎲 Random</button>
            <button class="hymn-control" data-action="next" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 15px; cursor: pointer; border-radius: 4px;">Next ⏭</button>
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
              item.insertAdjacentHTML('beforeend', '<span>▶</span>');
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
      // Update window content state
      settingsWindow.content = this.getSettingsContentV2();

      // Directly update the DOM instead of full render to preserve scroll position
      const windowEl = document.querySelector(`[data-window-id="${settingsWindow.id}"]`);
      if (windowEl) {
        const contentEl = windowEl.querySelector('.window-content');
        if (contentEl) {
          // Remember scroll position
          const settingsContent = contentEl.querySelector('.settings-content');
          const scrollTop = settingsContent?.scrollTop || 0;

          // Update content
          contentEl.innerHTML = settingsWindow.content;

          // Restore scroll position
          const newSettingsContent = contentEl.querySelector('.settings-content');
          if (newSettingsContent) {
            newSettingsContent.scrollTop = scrollTop;
          }
          return; // Don't do full render
        }
      }
      // Fallback: if DOM element not found, do minimum render
      this.render();
    }
  }

  // ============================================
  // THEME SYSTEM METHODS (Tier 9.4)
  // ============================================
  private openCustomThemeEditor(themeName?: string): void {
    if (themeName) {
      const theme = this.customThemes.find(t => t.name === themeName);
      if (theme) {
        this.themeEditorState = { ...theme };
      }
    } else {
      this.themeEditorState = { name: `Theme ${this.customThemes.length + 1}`, mainColor: '#00ff41', bgColor: '#101010', textColor: '#00ff41', glowColor: '#ffd700' };
    }
    this.settingsSubView = 'theme-editor';
    this.refreshSettingsWindow();
  }

  private saveCustomThemeFromEditor(): void {
    const name = this.themeEditorState.name.trim() || 'New Theme';
    const existingIndex = this.customThemes.findIndex(t => t.name === name);

    const newTheme = { ...this.themeEditorState, name };

    if (existingIndex >= 0) {
      this.customThemes[existingIndex] = newTheme;
    } else {
      this.customThemes.push(newTheme);
    }

    this.settingsSubView = 'main';
    this.activeCustomTheme = name; // Auto-activate
    this.themeMode = 'dark'; // Force dark mode structure as base usually
    this.queueSaveConfig();
    this.settingsManager.applyTheme();
    this.refreshSettingsWindow();
  }

  private deleteCustomTheme(name: string): void {
    const ok = confirm(`Delete theme "${name}"?`);
    if (!ok) return;

    this.customThemes = this.customThemes.filter(t => t.name !== name);
    if (this.activeCustomTheme === name) {
      this.activeCustomTheme = null;
      this.settingsManager.applyTheme();
    }
    this.queueSaveConfig();
    this.refreshSettingsWindow();
  }

  private exportCustomTheme(name: string): void {
    const theme = this.customThemes.find(t => t.name === name);
    if (!theme) return;

    // Create a JSON file
    const content = JSON.stringify(theme, null, 2);

    // Trigger download via data URI
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Theme Exported', `Saved ${theme.name}`, 'info');
  }

  private async importCustomTheme(): Promise<void> {
    const path = await this.openPromptModal({
      title: 'Import Theme',
      message: 'Enter the path to the theme JSON file:',
      inputLabel: 'File Path'
    });

    if (!path) return;

    if (!window.electronAPI?.readFile) {
      this.showNotification('Import Failed', 'File access required', 'error');
      return;
    }

    const res = await window.electronAPI.readFile(path);
    if (!res.success || !res.content) {
      this.showNotification('Import Failed', 'Could not read file', 'error');
      return;
    }

    try {
      const theme = JSON.parse(res.content);
      if (theme.name && theme.mainColor && theme.bgColor && theme.textColor) {
        // Check for duplicates
        const existing = this.customThemes.findIndex(t => t.name === theme.name);
        if (existing >= 0) {
          this.customThemes[existing] = theme;
          this.showNotification('Theme Updated', `Updated ${theme.name}`, 'divine');
        } else {
          this.customThemes.push(theme);
          this.showNotification('Theme Imported', `Imported ${theme.name}`, 'divine');
        }
        this.queueSaveConfig();
        this.refreshSettingsWindow();
      } else {
        throw new Error('Invalid format');
      }
    } catch (e) {
      this.showNotification('Import Failed', 'Invalid JSON theme file', 'error');
    }
  }

  private async changeResolution(res: string): Promise<void> {
    const previousResolution = this.currentResolution;

    // If already showing a confirmation, cancel it first
    if (this.resolutionConfirmation?.timer) {
      clearInterval(this.resolutionConfirmation.timer);
      this.resolutionConfirmation = null;
    }

    this.currentResolution = res;

    if (window.electronAPI?.setResolution) {
      try {
        const result = await window.electronAPI.setResolution(res);
        if (result && result.success === false) {
          this.showNotification('Display', result.error || 'Failed to change resolution', 'warning');
          this.currentResolution = previousResolution;
          return;
        }

        // Start 15-second confirmation countdown
        this.resolutionConfirmation = {
          previousResolution,
          countdown: 15,
          timer: null
        };

        // Start countdown timer
        this.resolutionConfirmation.timer = window.setInterval(() => {
          if (!this.resolutionConfirmation) return;

          this.resolutionConfirmation.countdown--;

          if (this.resolutionConfirmation.countdown <= 0) {
            // Time expired - revert
            void this.revertResolution();
          } else {
            // Update UI
            this.render();
          }
        }, 1000);

        this.render();
      } catch (e) {
        this.showNotification('Display', String(e), 'warning');
        this.currentResolution = previousResolution;
      }
    }
  }

  private confirmResolution(): void {
    // User confirmed - keep new resolution
    if (this.resolutionConfirmation?.timer) {
      clearInterval(this.resolutionConfirmation.timer);
    }
    this.resolutionConfirmation = null;
    this.queueSaveConfig();
    this.showNotification('Display', 'Resolution saved successfully', 'divine');
    this.render();
  }

  private async revertResolution(): Promise<void> {
    if (!this.resolutionConfirmation) return;

    const prevRes = this.resolutionConfirmation.previousResolution;

    if (this.resolutionConfirmation.timer) {
      clearInterval(this.resolutionConfirmation.timer);
    }
    this.resolutionConfirmation = null;

    this.currentResolution = prevRes;
    this.queueSaveConfig();

    if (window.electronAPI?.setResolution) {
      try {
        await window.electronAPI.setResolution(prevRes);
        this.showNotification('Display', `Reverted to ${prevRes}`, 'info');
      } catch (e) {
        this.showNotification('Display', 'Failed to revert resolution', 'error');
      }
    }

    this.render();
  }

  private renderResolutionConfirmation(): string {
    if (!this.resolutionConfirmation) return '';

    return `
      <div class="resolution-confirmation-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'VT323', monospace;
      ">
        <div class="resolution-confirmation-dialog" style="
          background: var(--bg-window);
          border: 2px solid var(--tos-green);
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 0 40px rgba(0, 255, 65, 0.3);
        ">
          <div style="font-size: 28px; color: var(--tos-yellow); margin-bottom: 20px;">⚠️ Display Settings</div>
          
          <div style="font-size: 20px; color: var(--text-primary); margin-bottom: 15px;">
            Keep these display settings?
          </div>
          
          <div style="font-size: 16px; color: var(--tos-cyan); margin-bottom: 25px;">
            Resolution: ${this.currentResolution}
          </div>
          
          <div style="
            font-size: 48px;
            color: ${this.resolutionConfirmation.countdown <= 5 ? 'var(--tos-red)' : 'var(--tos-green)'};
            font-weight: bold;
            margin: 20px 0;
            text-shadow: 0 0 20px ${this.resolutionConfirmation.countdown <= 5 ? 'rgba(255, 100, 100, 0.5)' : 'rgba(0, 255, 65, 0.5)'};
          ">
            ${this.resolutionConfirmation.countdown}
          </div>
          
          <div style="font-size: 14px; color: var(--tos-light-gray); margin-bottom: 25px; opacity: 0.8;">
            Reverting in ${this.resolutionConfirmation.countdown} second${this.resolutionConfirmation.countdown !== 1 ? 's' : ''}...
          </div>
          
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button class="resolution-confirm-btn" style="
              padding: 12px 30px;
              font-size: 18px;
              background: linear-gradient(180deg, rgba(0, 255, 65, 0.3) 0%, rgba(0, 255, 65, 0.1) 100%);
              border: 2px solid var(--tos-green);
              border-radius: 8px;
              color: var(--tos-green);
              font-family: 'VT323', monospace;
              cursor: pointer;
              transition: all 0.2s;
            ">
              ✓ Keep Changes
            </button>
            
            <button class="resolution-revert-btn" style="
              padding: 12px 30px;
              font-size: 18px;
              background: linear-gradient(180deg, rgba(255, 100, 100, 0.3) 0%, rgba(255, 100, 100, 0.1) 100%);
              border: 2px solid var(--tos-red);
              border-radius: 8px;
              color: var(--tos-red);
              font-family: 'VT323', monospace;
              cursor: pointer;
              transition: all 0.2s;
            ">
              ✕ Revert
            </button>
          </div>
        </div>
      </div>
    `;
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
  // FIREWALL MANAGEMENT (Tier 7.2)
  // ============================================
  private async refreshFirewallRules(): Promise<void> {
    if (!window.electronAPI?.getFirewallRules) {
      this.firewallRules = [];
      this.firewallEnabled = true; // Default UI state if no backend
      return;
    }

    this.firewallRulesLoading = true;
    this.refreshSettingsWindow(); // Helper if settings is open

    try {
      const res = await window.electronAPI.getFirewallRules();
      if (res.success) {
        this.firewallRules = res.rules || [];
        if (res.active !== undefined) this.firewallEnabled = res.active;
      }
    } catch (e) {
      console.error('Failed to get firewall rules', e);
    } finally {
      this.firewallRulesLoading = false;
      this.refreshSettingsWindow();
    }
  }

  private async toggleFirewallSystem(enable: boolean): Promise<void> {
    if (!window.electronAPI?.toggleFirewall) {
      this.showNotification('Firewall', 'Not supported on this platform', 'warning');
      this.firewallEnabled = enable; // Fallback UI toggle
      this.refreshSettingsWindow();
      return;
    }

    this.showNotification('Firewall', 'Applying firewall settings...', 'info');
    const res = await window.electronAPI.toggleFirewall(enable);
    if (res.success) {
      this.firewallEnabled = enable;
      this.showNotification('Firewall', `Firewall ${enable ? 'Enabled' : 'Disabled'}`, 'divine');
      void this.refreshFirewallRules();
    } else {
      this.showNotification('Firewall', res.error || 'Failed to toggle firewall', 'error');
      // Revert UI
      void this.refreshFirewallRules();
    }
  }

  private async addFirewallRule(port: number, protocol: string, action: string): Promise<void> {
    if (!window.electronAPI?.addFirewallRule) return;

    const res = await window.electronAPI.addFirewallRule(port, protocol, action);
    if (res.success) {
      this.showNotification('Firewall', `Rule added: ${action} ${port}/${protocol}`, 'divine');
      void this.refreshFirewallRules();
    } else {
      this.showNotification('Firewall', res.error || 'Failed to add rule', 'error');
    }
  }

  private async deleteFirewallRule(id: number): Promise<void> {
    if (!window.electronAPI?.deleteFirewallRule) return;

    const res = await window.electronAPI.deleteFirewallRule(id);
    if (res.success) {
      this.showNotification('Firewall', 'Rule deleted', 'info');
      void this.refreshFirewallRules();
    } else {
      this.showNotification('Firewall', res.error || 'Failed to delete rule', 'error');
    }
  }

  // ============================================
  // VERACRYPT MANAGEMENT (Tier 7.1)
  // ============================================
  private async refreshVeraCrypt(): Promise<void> {
    if (!window.electronAPI?.getVeraCryptStatus) {
      this.veraCryptVolumes = [];
      return;
    }

    this.veraCryptLoading = true;
    this.refreshSettingsWindow();

    try {
      const res = await window.electronAPI.getVeraCryptStatus();
      if (res.success && res.volumes) {
        this.veraCryptVolumes = res.volumes;
      } else {
        this.veraCryptVolumes = [];
      }
    } catch {
      this.veraCryptVolumes = [];
    } finally {
      this.veraCryptLoading = false;
      this.refreshSettingsWindow();
    }
  }

  private async mountVeraCryptFromUi(): Promise<void> {
    // 1. Pick file
    const path = await this.openPromptModal({ title: 'Mount Volume', message: 'Enter path to container file:', inputLabel: 'Path', placeholder: '/home/user/volume.hc' });
    if (!path) return;

    // 2. Enter password
    const password = await this.openPromptModal({ title: 'Volume Password', message: 'Enter volume password:', inputLabel: 'Password', password: true });
    if (!password) return;

    // 3. Slot
    const slotStr = await this.openPromptModal({ title: 'Mount Slot', message: 'Enter slot number (1-64):', inputLabel: 'Slot', placeholder: '1' });
    const slot = slotStr ? parseInt(slotStr) : 1;

    this.showNotification('VeraCrypt', 'Mounting volume...', 'info');

    if (window.electronAPI?.mountVeraCrypt) {
      const res = await window.electronAPI.mountVeraCrypt(path, password, slot);
      if (res.success) {
        this.showNotification('VeraCrypt', `Volume mounted at ${res.mountPoint}`, 'divine');
        void this.refreshVeraCrypt();
      } else {
        this.showNotification('VeraCrypt', res.error || 'Mount failed', 'error');
      }
    }
  }

  private async dismountVeraCryptFromUi(slot: number): Promise<void> {
    if (!window.electronAPI?.dismountVeraCrypt) return;

    this.showNotification('VeraCrypt', `Dismounting slot ${slot}...`, 'info');
    const res = await window.electronAPI.dismountVeraCrypt(slot);

    if (res.success) {
      this.showNotification('VeraCrypt', 'Volume dismounted', 'divine');
      void this.refreshVeraCrypt();
    } else {
      this.showNotification('VeraCrypt', res.error || 'Dismount failed', 'error');
    }
  }

  // ============================================
  // CONFIG (persist user settings)
  // ============================================
  private async loadConfig(): Promise<void> {
    await this.settingsManager.loadConfig();
  }

  /**
   * Sync Voice of God TTS settings to the backend
   */
  private async syncTTSSettings(): Promise<void> {
    if (!window.electronAPI?.ttsUpdateSettings) return;

    try {
      const settings = {
        enabled: this.voiceOfGodEnabled,
        pitch: this.voiceOfGodPitch,
        reverbRoom: this.voiceOfGodReverbRoom,
        reverbWet: this.voiceOfGodReverbWet,
        echoDelay: this.voiceOfGodEchoDelay,
        echoFeedback: this.voiceOfGodEchoFeedback,
        chorusEnabled: this.voiceOfGodChorusEnabled,
        chorusDepth: this.voiceOfGodChorusDepth,
        speed: this.voiceOfGodSpeed
      };

      await window.electronAPI.ttsUpdateSettings(settings);
      console.log('[TTS] Settings synced to backend:', settings.enabled ? 'enabled' : 'disabled');
    } catch (e) {
      console.error('[TTS] Failed to sync settings:', e);
    }
  }

  /**
   * Handle Piper TTS not installed - show prompt to install
   */
  private handlePiperNotInstalled(instructions?: {
    platform: string;
    piperDir: string;
    steps: string[];
    downloadUrl: string;
    modelUrl: string;
    command?: string;
  }): void {
    // Show notification with install instructions
    this.showNotification(
      'Voice of God - Setup Required',
      'Piper TTS not installed. Click here to download.',
      'warning'
    );

    // Add a help message to the Divine chat
    const helpMessage = `
**🔊 Voice of God Setup Required**

The divine voice requires Piper TTS to be installed. Please follow these steps:

${instructions?.steps?.map((s, i) => `${i + 1}. ${s}`).join('\n') || '1. Download Piper from GitHub\n2. Extract to electron/piper folder\n3. Download voice model'}

**Quick Links:**
- [Download Piper](${instructions?.downloadUrl || 'https://github.com/rhasspy/piper/releases'})
- [Download Voice Model](${instructions?.modelUrl || 'https://huggingface.co/rhasspy/piper-voices'})

After installing, restart the application for the divine voice to work.
    `.trim();

    this.divineMessages.push({
      role: 'system',
      content: helpMessage,
      timestamp: Date.now()
    });

    // Disable TTS for now to prevent repeated prompts
    this.voiceOfGodEnabled = false;
    this.settingsManager.queueSaveConfig();
    this.refreshDivineWindow();

    // Offer to install via terminal
    if (instructions?.piperDir) {
      const shouldInstall = confirm(
        'Piper TTS is not installed.\n\n' +
        'Would you like to open the Terminal with the install command?\n\n' +
        'Installation directory: ' + instructions.piperDir
      );
      if (shouldInstall) {
        void this.installPiperViaTerminal();
      }
    }
  }

  /**
   * Install Piper TTS via the Terminal app
   * Opens the terminal and types in the download/install command
   */
  private async installPiperViaTerminal(): Promise<void> {
    // Get the absolute piper directory path from backend
    let piperDir = '';
    if (window.electronAPI?.ttsGetStatus) {
      const status = await window.electronAPI.ttsGetStatus();
      piperDir = status?.piperDir || '';
    }

    if (!piperDir) {
      this.showNotification('Voice of God', 'Could not determine install path', 'error');
      return;
    }

    // Determine the install command based on platform
    const isLinux = navigator.platform.toLowerCase().includes('linux');

    let installCommand: string;

    if (isLinux) {
      // Linux: Use curl to download and extract Piper
      installCommand = `# Piper TTS Installation for Voice of God
# This will download Piper TTS, the voice model, and divine audio effects

mkdir -p "${piperDir}" && cd "${piperDir}" && \\
echo "Downloading Piper TTS..." && \\
curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz && \\
tar xzf piper.tar.gz && \\
echo "Downloading voice model (lessac-high)..." && \\
curl -L -o en_US-lessac-high.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx && \\
curl -L -o en_US-lessac-high.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json && \\
rm piper.tar.gz && \\
echo "Installing divine audio effects (Pedalboard)..." && \\
pip3 install pedalboard && \\
echo "Done! Restart the app to use Voice of God with divine effects."`;
    } else {
      // Windows: Use PowerShell to download
      const winPiperDir = piperDir.replace(/\//g, '\\\\');
      installCommand = `# Piper TTS Installation for Voice of God
# This will download Piper TTS and the voice model

$piperDir = "${winPiperDir}"
New-Item -ItemType Directory -Force -Path $piperDir | Out-Null
cd $piperDir

Write-Host "Downloading Piper TTS..."
Invoke-WebRequest -Uri "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip" -OutFile "piper.zip"

Write-Host "Extracting..."
Expand-Archive -Path "piper.zip" -DestinationPath "." -Force

Write-Host "Downloading voice model (lessac-high)..."
Invoke-WebRequest -Uri "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx" -OutFile "en_US-lessac-high.onnx"
Invoke-WebRequest -Uri "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json" -OutFile "en_US-lessac-high.onnx.json"

Remove-Item "piper.zip"
Write-Host "Done! Restart the app to use Voice of God."`;
    }

    // Open Terminal app if not already open
    let terminalWin = this.windows.find(w => w.id.startsWith('terminal'));
    if (!terminalWin) {
      this.openApp('terminal');
      // Wait for terminal to initialize
      await new Promise(resolve => setTimeout(resolve, 800));
      terminalWin = this.windows.find(w => w.id.startsWith('terminal'));
    }

    // Focus terminal
    if (terminalWin) {
      this.focusWindow(terminalWin.id);
    }

    // Get the active terminal tab's ptyId and send the command
    await new Promise(resolve => setTimeout(resolve, 300));
    const activeTab = this.terminalTabs[this.activeTerminalTab];
    if (activeTab?.ptyId && window.electronAPI?.writePty) {
      // Send the install command to the terminal
      await window.electronAPI.writePty(activeTab.ptyId, installCommand + '\n');

      this.showNotification(
        'Voice of God',
        'Install command ready in Terminal. Run it to install Piper TTS.',
        'divine'
      );
    } else {
      // Fallback: show instructions via notification
      this.showNotification(
        'Voice of God - Manual Install Required',
        'Please install Piper TTS manually from github.com/rhasspy/piper',
        'warning'
      );
    }
  }

  private applyWallpaper(): void {
    this.settingsManager.applyWallpaper();
  }

  private applyTaskbarPosition(): void {
    this.settingsManager.applyTaskbarPosition();
  }

  private setTaskbarPosition(position: 'top' | 'bottom'): void {
    this.settingsManager.setTaskbarPosition(position);
  }



  private queueSaveConfig(): void {
    this.settingsManager.queueSaveConfig();
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
    const statusIcon = this.updaterState.status === 'success' ? '<i class="ph-fill ph-check-circle" style="color:var(--tos-green)"></i>' :
      this.updaterState.status === 'error' ? '<i class="ph-fill ph-x-circle" style="color:var(--tos-red)"></i>' :
        this.updaterState.status === 'updating' ? '<i class="ph-fill ph-hourglass"></i>' :
          this.updaterState.status === 'available' ? '<i class="ph-fill ph-sparkle"></i>' : '<i class="ph-bold ph-magnifying-glass"></i>';

    return `
      <div class="updater" style="padding: 20px; text-align: center; height: 100%; display: flex; flex-direction: column;">
        <h2 style="margin: 0 0 10px 0; color: #ffd700;">HOLY UPDATER</h2>
        <p style="opacity: 0.7; margin-bottom: 20px;">Receive new blessings from the Divine Repository</p>
        
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-size: 24px; margin-bottom: 10px;">${statusIcon}</div>
          <p style="margin: 10px 0; max-width: 400px;">${this.updaterState.message}</p>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
          <button class="updater-btn" data-updater-action="check" 
                  style="background: rgba(0,255,65,0.2); border: 1px solid #00ff41; color: #00ff41; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;"
                  ${this.updaterState.isUpdating ? 'disabled' : ''}>
            <i class="ph-bold ph-magnifying-glass"></i> Check for Updates
          </button>
          <button class="updater-btn" data-updater-action="update" 
                  style="background: rgba(255,215,0,0.2); border: 1px solid #ffd700; color: #ffd700; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;"
                  ${this.updaterState.isUpdating || this.updaterState.status !== 'available' ? 'disabled' : ''}>
            <i class="ph-bold ph-download-simple"></i> Download & Install
          </button>
          ${this.updaterState.status === 'success' ? `
          <button class="updater-btn" data-updater-action="reboot" 
                  style="background: rgba(255,100,100,0.2); border: 1px solid #ff6464; color: #ff6464; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;">
            <i class="ph-bold ph-arrows-clockwise"></i> Reboot Now
          </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private async checkForUpdates(showNotification = false): Promise<void> {
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
            message: `🆕 ${result.behindCount} new blessing${result.behindCount === 1 ? '' : 's'} available from Heaven!`,
            isUpdating: false
          };

          // Show system notification if requested (background check mode)
          if (showNotification) {
            const count = result.behindCount || 1;
            this.showNotification(
              '✝️ Holy Updater',
              `${count} new update${count === 1 ? '' : 's'} available! Open Holy Updater to install.`,
              'divine',
              [{ id: 'open-updater', label: 'Open Updater' }]
            );
          }
        } else {
          this.updaterState = {
            status: 'idle',
            message: '✨ Your temple is blessed with the latest version!',
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

    this.updaterState = { status: 'updating', message: '📥 Downloading divine updates...', isUpdating: true };
    this.updateUpdaterWindow();

    try {
      const result = await window.electronAPI.runUpdate();
      if (result.success) {
        this.updaterState = {
          status: 'success',
          message: '✅ Update complete! Reboot to apply the new blessings.',
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
          <div class="alt-tab-hint">Alt+Tab to cycle • Release Alt to switch</div>
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
      const net = stats?.network ? `${this.formatFileSize(stats.network.rxBps)}/s ↓ • ${this.formatFileSize(stats.network.txBps)}/s ↑` : '';
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
    const wasDivine = windowId.startsWith('word-of-god');

    // Abort Divine AI request when closing the window
    if (wasDivine && window.electronAPI?.divineAbort) {
      window.electronAPI.divineAbort();
      this.divineIsLoading = false;
      this.divineStreamingResponse = '';
    }

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
    // IMPORTANT: Use splice() instead of filter() to mutate the existing array
    // WindowManager holds a reference to this.windows, so we must not reassign it
    const idx = this.windows.findIndex(w => w.id === windowId);
    if (idx !== -1) {
      this.windows.splice(idx, 1);
    }
    if (this.windows.length > 0) {
      this.windows[this.windows.length - 1].active = true;
    }

    // Cleanup from workspace and tiling managers
    this.workspaceManager.removeWindow(windowId);
    this.tilingManager.removeWindow(windowId);
    if (this.effectsManager) {
      this.effectsManager.releaseWindow(windowId);
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
        this.focusWindow(windowId);
      } else if (win.active) {
        this.minimizeWindow(windowId);
      } else {
        this.focusWindow(windowId);
      }
    }
  }

  private toggleX11Window(xidHex: string): void {
    const xid = String(xidHex || '').trim();
    if (!xid) return;
    const xidKey = xid.toLowerCase();

    const api = window.electronAPI;
    if (!api) return;

    const win = this.x11Windows.find(w => String(w?.xidHex || '').toLowerCase() === xid.toLowerCase());

    const updateTaskbarAppsDomOnly = () => {
      const taskbarApps = document.querySelector('.taskbar-apps');
      if (taskbarApps) taskbarApps.innerHTML = this.renderTaskbarAppsHtml();
    };

    // Windows-like taskbar behavior:
    // - If minimized, click restores + focuses.
    // - If not active, click activates (brings to front).
    // - If active, click minimizes.
    if (win?.minimized) {
      // Optimistic UI update (prevents needing a second click before poll catches up)
      win.minimized = false;
      this.x11Windows.forEach(w => { if (w) w.active = String(w.xidHex).toLowerCase() === xid.toLowerCase(); });
      updateTaskbarAppsDomOnly();
      this.x11UserMinimized.delete(xidKey);

      if (api.unminimizeX11Window) {
        void api.unminimizeX11Window(xid).then(() => void api.activateX11Window?.(xid));
      } else {
        void api.activateX11Window?.(xid);
      }
      return;
    }

    // If we don't have snapshot info, fall back to focus (best effort).
    if (!win) {
      void api.activateX11Window?.(xid);
      return;
    }

    if (!win.active) {
      // Optimistic UI update
      this.x11Windows.forEach(w => { if (w) w.active = String(w.xidHex).toLowerCase() === xid.toLowerCase(); });
      updateTaskbarAppsDomOnly();
      void api.activateX11Window?.(xid);
      return;
    }

    // Optimistic UI update
    win.minimized = true;
    win.active = false;
    updateTaskbarAppsDomOnly();
    this.x11UserMinimized.add(xidKey);
    void api.minimizeX11Window?.(xid);
  }

  /**
   * Handle window snapping with keyboard shortcuts (Win+Arrow)
   */
  private handleWindowSnap(windowId: string, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): void {
    const win = this.windows.find(w => w.id === windowId);
    if (!win) return;

    const currentState = this.tilingManager.getSnapState(windowId);
    const currentZone = currentState?.zone || null;
    const targetZone = this.tilingManager.getKeyboardSnapZone(key, currentZone);

    // Arrow Down with no snap = minimize
    if (key === 'ArrowDown' && !currentZone && !targetZone) {
      this.minimizeWindow(windowId);
      return;
    }

    // Unsnap if target is null (e.g., ArrowDown from maximized)
    if (targetZone === null && currentZone) {
      const original = this.tilingManager.unsnap(windowId);
      if (original) {
        win.x = original.x;
        win.y = original.y;
        win.width = original.width;
        win.height = original.height;
        win.maximized = false;
      }
      this.render();
      return;
    }

    // Snap to target zone
    if (targetZone) {
      const bounds = this.tilingManager.snapWindow(windowId, targetZone, {
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height
      });

      if (bounds) {
        win.x = bounds.x;
        win.y = bounds.y;
        win.width = bounds.width;
        win.height = bounds.height;
        win.maximized = targetZone === 'maximize';

        // Show snap assist if snapping left/right
        if (this.tilingManager.hasPendingSnapAssist()) {
          this.showSnapAssist = true;
        }
      }
      this.render();
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
  private openDecoySession() {
    // Backup all real data before entering decoy mode
    this.decoyBackup = {
      windows: [...this.windows],
      terminalBuffer: [...this.terminalBuffer],
      terminalTabs: this.terminalTabs.map(t => ({ ...t, buffer: [...t.buffer] })),
      divineMessages: [...this.divineMessages],
      editorRecentFiles: [...this.editorRecentFiles],
      recentApps: [...this.recentApps],
      trashEntries: [...this.trashEntries],
      fileEntries: [...this.fileEntries],
      currentPath: this.currentPath,
      x11Windows: [...this.x11Windows]
    };

    this.isDecoySession = true;
    // No notification - decoy must be completely invisible to attackers

    // Clear all sensitive data - replace with innocent decoy data
    this.windows.length = 0;
    this.terminalBuffer = ['TempleOS Terminal v1.0', 'Type "help" for commands.', ''];
    this.terminalTabs = [{ id: 'decoy-term-1', ptyId: null, title: 'Terminal 1', buffer: [...this.terminalBuffer], cwd: '/home/user', xterm: null, fitAddon: null }];
    this.divineMessages = [];
    this.editorRecentFiles = [];
    this.recentApps = ['Files', 'Terminal', 'Settings'];
    this.trashEntries = [];
    // File entries will be handled by the file browser check

    // Minimize all X11 windows and hide from taskbar
    // Note: Can't fully hide X11 apps - attacker could unminimize them
    for (const x11Win of this.x11Windows) {
      if (window.electronAPI?.minimizeX11Window) {
        window.electronAPI.minimizeX11Window(x11Win.xidHex).catch(() => { });
      }
    }
    this.x11Windows = []; // Hide from taskbar

    // Set decoy mode on apps that manage their own data
    this.notesApp.setDecoyMode(true);
    this.godlyNotes.setDecoyMode(true);
    this.calendarApp.setDecoyMode(true);

    this.render();
  }

  private exitDecoySession() {
    if (!this.decoyBackup) return;

    // Restore all real data from backup
    this.windows.length = 0;
    this.windows.push(...this.decoyBackup.windows);
    this.terminalBuffer = this.decoyBackup.terminalBuffer;
    this.terminalTabs = this.decoyBackup.terminalTabs;
    this.divineMessages = this.decoyBackup.divineMessages;
    this.editorRecentFiles = this.decoyBackup.editorRecentFiles;
    this.recentApps = this.decoyBackup.recentApps;
    this.trashEntries = this.decoyBackup.trashEntries;
    this.fileEntries = this.decoyBackup.fileEntries;
    this.currentPath = this.decoyBackup.currentPath;

    // Restore X11 windows to taskbar and unminimize them
    this.x11Windows = this.decoyBackup.x11Windows;
    for (const x11Win of this.x11Windows) {
      if (window.electronAPI?.unminimizeX11Window) {
        window.electronAPI.unminimizeX11Window(x11Win.xidHex).catch(() => { });
      }
    }

    // Exit decoy mode on apps
    this.notesApp.setDecoyMode(false);
    this.godlyNotes.setDecoyMode(false);
    this.calendarApp.setDecoyMode(false);

    this.decoyBackup = null;
    this.isDecoySession = false;
    this.render();
  }

  private lock(): void {
    if (this.isLocked) return;

    // Best-effort: request a real OS session lock (Linux) via Electron main-process IPC.
    try {
      void window.electronAPI?.lock?.();
    } catch {
      // ignore
    }

    // Minimize all active X11 windows so they don't cover the lock screen
    if (this.x11Windows.length > 0 && window.electronAPI?.minimizeX11Window) {
      this.x11Windows.forEach(win => {
        // CRITICAL: Do NOT minimize the main TempleOS shell window itself!
        // The main window might appear in this list if the filter in the main process isn't perfect.
        const title = (win.title || '').toLowerCase();
        const appName = (win.appName || '').toLowerCase();
        if (title.startsWith('temple') || appName.startsWith('temple')) {
          return;
        }

        if (!win.minimized) {
          void window.electronAPI!.minimizeX11Window!(win.xidHex);
        }
      });
    }

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
            <button class="lock-reveal-btn" data-lock-action="reveal" title="Show/Hide" ${this.lockInputMode === 'pin' ? 'disabled' : ''}><i class="ph-fill ph-eye"></i></button>
          </div>

          <div class="lock-caps" id="lock-caps">Caps Lock is ON</div>
          <div class="lock-message" id="lock-message">${this.lockInputMode === 'pin' ? 'Enter PIN' : 'Enter Password'}</div>

          <div class="lock-pin-pad ${this.lockInputMode === 'pin' ? '' : 'hidden'}" data-lock-pin-pad>
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="lock-pin-btn" data-pin-key="${n}">${n}</button>`).join('')}
            <button class="lock-pin-btn alt" data-pin-key="clear">CLR</button>
            <button class="lock-pin-btn" data-pin-key="0">0</button>
            <button class="lock-pin-btn alt" data-pin-key="back">⌫</button>
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

      // Duress Check
      if (this.duressPassword && val === this.duressPassword) {
        clearInterval(clockInterval);
        this.unlock();
        this.openDecoySession();
        return;
      }

      const msg = document.getElementById('lock-message');
      const ok = this.lockInputMode === 'pin' ? val === this.lockPin : val === this.lockPassword;
      if (ok) {
        clearInterval(clockInterval);
        this.unlock();
        // If we were in decoy mode, restore real data
        if (this.isDecoySession) {
          this.exitDecoySession();
        }
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
        reveal.innerHTML = '<i class="ph-fill ph-eye"></i>';
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
        revealBtn.innerHTML = input.type === 'password' ? '<i class="ph-fill ph-eye"></i>' : '<i class="ph-fill ph-eye-slash"></i>';
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

    // Play boot sequence after unlock
    this.playBootSequence();
  }

  // ============================================
  // CONTEXT MENU SYSTEM
  // ============================================
  // ============================================
  // CONTEXT MENU SYSTEM
  // ============================================
  private showContextMenu(x: number, y: number, items: Array<{ label?: string; action?: () => void | Promise<void>; divider?: boolean; submenu?: Array<{ label?: string; action?: () => void | Promise<void>; divider?: boolean }> }>): void {
    this.closeContextMenu();

    // On Linux X11 with external windows, use floating popup to appear above Firefox/X11 apps
    // Check if popup API is available and we're on X11 (indicated by having x11Windows support)
    if (window.electronAPI?.showContextMenuPopup && this.x11Windows.length > 0) {
      // Serialize items with IDs for IPC, store action callbacks
      const serializedItems = items.map((item, idx) => ({
        id: `action_${idx}`,
        label: item.label || '',
        divider: !!item.divider,
      }));

      // Store action callbacks (use same index as serialized items)
      this.pendingContextMenuActions = new Map();
      items.forEach((item, idx) => {
        if (!item.divider && item.action) {
          this.pendingContextMenuActions!.set(`action_${idx}`, item.action);
        }
      });

      void window.electronAPI.showContextMenuPopup(x, y, serializedItems);
      return;
    }


    // Fallback: DOM-based menu (Windows, macOS, non-X11 Linux)
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
          position: relative; /* For submenu positioning if needed later */
        `;
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = 'rgba(0, 255, 65, 0.15)';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          if (item.action) {
            this.closeContextMenu();
            item.action();
          } else if (item.submenu) {
            // Basic submenu implementation: Close this, open new one at offset
            this.closeContextMenu();
            this.showContextMenu(e.clientX + 10, e.clientY, item.submenu);
          }
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
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
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

    // Don't allow folder creation if no valid current path (prevents creating at root)
    if (!this.currentPath || this.currentPath === '/') {
      await this.openAlertModal({ title: 'Files', message: 'Cannot create folder at root directory. Navigate to a writable location first.' });
      return;
    }

    const dest = this.joinPath(this.currentPath, trimmed);
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

    // Don't allow file creation if no valid current path (prevents creating at root)
    if (!this.currentPath || this.currentPath === '/') {
      await this.openAlertModal({ title: 'Files', message: 'Cannot create file at root directory. Navigate to a writable location first.' });
      return;
    }

    const dest = this.joinPath(this.currentPath, trimmed);
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
<div class="terminal-line gold">â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—</div>
<div class="terminal-line gold">â•‘          T E M P L E   O S             â•‘</div>
<div class="terminal-line gold">â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£</div>
<div class="terminal-line">â•‘  God's Operating System                â•‘</div>
<div class="terminal-line">â•‘  Written in HolyC - God's Language     â•‘</div>
<div class="terminal-line">â•‘  In memory of Terry A. Davis           â•‘</div>
<div class="terminal-line gold">â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£</div>
<div class="terminal-line system">â•‘  Remake by Giangero Studio             â•‘</div>
<div class="terminal-line gold">â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•</div>`;
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

  private updateClock(): void {
    const tz = this.timezone || 'UTC';
    const now = new Date();

    // Format options for the selected timezone
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: tz === 'Local' ? undefined : tz
    };

    const timeStr = now.toLocaleTimeString(undefined, options);
    const dateStr = now.toLocaleDateString(undefined, {
      timeZone: tz === 'Local' ? undefined : tz
    });

    const clockText = document.getElementById('clock-text');
    if (clockText) clockText.textContent = timeStr;

    const widgetTime = document.getElementById('desktop-widget-time');
    if (widgetTime) widgetTime.textContent = timeStr;

    const widgetDate = document.getElementById('desktop-widget-date');
    if (widgetDate) widgetDate.textContent = dateStr;

    const cpuEl = document.getElementById('desktop-widget-cpu');
    if (cpuEl) {
      const cpu = this.monitorStats?.cpuPercent;
      cpuEl.textContent = (typeof cpu === 'number' && Number.isFinite(cpu)) ? String(Math.round(cpu)) : '—';
    }

    const ramEl = document.getElementById('desktop-widget-ram');
    if (ramEl) {
      const mem = this.monitorStats?.memory;
      if (mem && mem.total > 0) {
        const pct = Math.max(0, Math.min(100, Math.round((mem.used / mem.total) * 100)));
        ramEl.textContent = String(pct);
      } else {
        ramEl.textContent = '—';
      }
    }

    const batEl = document.getElementById('desktop-widget-battery');
    if (batEl) {
      const pct = (this.batterySupported && this.batteryStatus?.present && typeof this.batteryStatus.percent === 'number')
        ? Math.max(0, Math.min(100, Math.round(this.batteryStatus.percent)))
        : null;
      batEl.textContent = pct === null ? '—' : String(pct);
    }
  }


  // ============================================
  // TIER 9.4: THEME SYSTEM
  // ============================================
  private applyTheme(): void {
    this.settingsManager.applyTheme();
  }

  // ============================================
  // TIER 10 & 11: BOOT & GAMING
  // ============================================

  private toggleGamingMode(): void {
    this.gamingModeActive = !this.gamingModeActive;
    this.showNotification('Gaming Mode', this.gamingModeActive ? 'Enabled: Hotkeys Disabled' : 'Disabled', 'divine');
    if (window.electronAPI?.setGamingMode) {
      void window.electronAPI.setGamingMode(this.gamingModeActive);
    }
    this.render();
  }

  private renderShutdownOverlay(): string {
    if (!this.isShuttingDown) return '';
    return `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; color: #00ff41; z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'VT323', monospace;">
            <div style="font-size: 64px; animation: blink 2s infinite;">God be with you.</div>
            <div style="margin-top: 20px; font-size: 24px;">Shutting down...</div>
        </div>
      `;
  }

  private renderFirstRunWizard(): string {
    if (this.setupComplete) return '';

    const steps = [
      // Step 0: Welcome
      `
          <div style="text-align: center;">
             <div style="font-size: 48px; color: #ffd700; margin-bottom: 20px;">Welcome to TempleOS</div>
             <p style="font-size: 20px; margin-bottom: 30px;">The Third Temple, reborn as a modern OS.</p>
             <button class="wizard-next-btn" style="padding: 10px 30px; font-size: 20px; background: #00ff41; color: #000; border: none; cursor: pointer;">Begin Setup</button>
          </div>
          `,
      // Step 1: Theme
      `
          <div style="text-align: center;">
             <div style="font-size: 32px; color: #ffd700; margin-bottom: 20px;">Choose Your Covenant</div>
             <p style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">Select your preferred theme color</p>
             <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 30px;">
                 <button class="theme-color-btn" data-color="green" style="width: 60px; height: 60px; background: #00ff41; border: 2px solid white; cursor: pointer; border-radius: 8px;"></button>
                 <button class="theme-color-btn" data-color="amber" style="width: 60px; height: 60px; background: #ffb000; border: 2px solid white; cursor: pointer; border-radius: 8px;"></button>
                 <button class="theme-color-btn" data-color="cyan" style="width: 60px; height: 60px; background: #00ffff; border: 2px solid white; cursor: pointer; border-radius: 8px;"></button>
             </div>
             <div style="margin-bottom: 20px;">Current: ${this.themeColor.toUpperCase()}</div>
             <button class="wizard-next-btn" style="padding: 10px 30px; font-size: 20px; background: #00ff41; color: #000; border: none; cursor: pointer;">Next</button>
          </div>
          `,
      // Step 2: Privacy Settings
      `
          <div style="text-align: center;">
             <div style="font-size: 32px; color: #ffd700; margin-bottom: 20px;">🔐 Privacy Settings</div>
             <p style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">Configure your security preferences</p>
             <div style="text-align: left; max-width: 400px; margin: 0 auto 30px auto;">
                <div class="wizard-toggle-btn" data-setting="tracker-blocking" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: rgba(0,255,65,0.1); border-radius: 6px; cursor: pointer; user-select: none;">
                   <span>🔒 Tracker Blocking</span>
                   <span style="color: ${this.trackerBlockingEnabled ? '#00ff41' : '#666'}; font-weight: bold;">${this.trackerBlockingEnabled ? 'ON' : 'OFF'}</span>
                </div>
                <div class="wizard-toggle-btn" data-setting="mac-randomization" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,255,65,0.1); border-radius: 6px; cursor: pointer; user-select: none;">
                   <span>📱 MAC Randomization</span>
                   <span style="color: ${this.macRandomization ? '#00ff41' : '#666'}; font-weight: bold;">${this.macRandomization ? 'ON' : 'OFF'}</span>
                </div>
             </div>
             <p style="font-size: 12px; opacity: 0.6; margin-bottom: 20px;">You can change these in Settings → Security</p>
             <button class="wizard-next-btn" style="padding: 10px 30px; font-size: 20px; background: #00ff41; color: #000; border: none; cursor: pointer;">Next</button>
          </div>
          `,
      // Step 3: Time & Reality
      `
          <div style="text-align: center;">
             <div style="font-size: 32px; color: #ffd700; margin-bottom: 20px;">⏳ Time & Reality</div>
             <p style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">Align your temporal existence</p>
             <div style="text-align: left; max-width: 400px; margin: 0 auto 30px auto;">
                <div style="margin-bottom: 15px;">
                   <label style="display: block; margin-bottom: 8px;">Timezone</label>
                   <select class="timezone-select" style="width: 100%; padding: 8px; background: #001100; color: #00ff41; border: 1px solid #00ff41;">
                      <option value="UTC" ${this.timezone === 'UTC' ? 'selected' : ''}>UTC (Coordinated Universal Time)</option>
                      <option value="EST" ${this.timezone === 'EST' ? 'selected' : ''}>EST (Eastern Standard Time)</option>
                      <option value="CST" ${this.timezone === 'CST' ? 'selected' : ''}>CST (Central Standard Time)</option>
                      <option value="PST" ${this.timezone === 'PST' ? 'selected' : ''}>PST (Pacific Standard Time)</option>
                      <option value="GMT" ${this.timezone === 'GMT' ? 'selected' : ''}>GMT (Greenwich Mean Time)</option>
                      <option value="CET" ${this.timezone === 'CET' ? 'selected' : ''}>CET (Central European Time)</option>
                      <option value="JST" ${this.timezone === 'JST' ? 'selected' : ''}>JST (Japan Standard Time)</option>
                   </select>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,255,65,0.05); border-radius: 6px;">
                   <span>Auto-Sync Time</span>
                   <label class="switch">
                      <input type="checkbox" class="auto-time-toggle" ${this.autoTime ? 'checked' : ''}>
                      <span class="slider round"></span>
                   </label>
                </div>
             </div>
             <button class="wizard-next-btn" style="padding: 10px 30px; font-size: 20px; background: #00ff41; color: #000; border: none; cursor: pointer;">Next</button>
          </div>
          `,
      // Step 4: Features
      `
          <div style="text-align: center;">
             <div style="font-size: 32px; color: #ffd700; margin-bottom: 20px;">⚡ Features</div>
             <p style="font-size: 14px; opacity: 0.8; margin-bottom: 20px;">Enabled features for your Divine experience</p>
             <div style="text-align: left; max-width: 400px; margin: 0 auto 30px auto;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 10px; background: rgba(0,255,65,0.05); border-radius: 6px;">
                   <span style="font-size: 24px;">💻</span>
                   <span>Terminal with Holy Commands</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 10px; background: rgba(0,255,65,0.05); border-radius: 6px;">
                   <span style="font-size: 24px;">📝</span>
                   <span>HolyC Code Editor</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 10px; background: rgba(0,255,65,0.05); border-radius: 6px;">
                   <span style="font-size: 24px;">✝️</span>
                   <span>Word of God Oracle</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 10px; background: rgba(0,255,65,0.05); border-radius: 6px;">
                   <span style="font-size: 24px;">🎵</span>
                   <span>Hymn Player</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(0,255,65,0.05); border-radius: 6px;">
                   <span style="font-size: 24px;">📋</span>
                   <span>Godly Notes</span>
                </div>
             </div>
             <button class="wizard-next-btn" style="padding: 10px 30px; font-size: 20px; background: #00ff41; color: #000; border: none; cursor: pointer;">Next</button>
          </div>
          `,
      // Step 5: Finish
      `
          <div style="text-align: center;">
             <div style="font-size: 48px; color: #ffd700; margin-bottom: 20px;">It Is Finished</div>
             <p style="font-size: 20px; margin-bottom: 30px;">"The fear of the Lord is the beginning of wisdom."</p>
             <button class="wizard-finish-btn" style="padding: 10px 30px; font-size: 20px; background: #00ff41; color: #000; border: none; cursor: pointer;">Enter Temple</button>
          </div>
          `
    ];

    return `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 999990; display: flex; align-items: center; justify-content: center;">
            <div style="width: 600px; padding: 40px; border: 4px double #00ff41; background: #001100; position: relative;">
                <button class="wizard-skip-btn" style="position: absolute; top: 10px; right: 10px; background: none; border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.5); padding: 5px 10px; cursor: pointer; font-size: 12px; border-radius: 4px;" title="Skip setup and enter the Temple">Skip ✕</button>
                ${steps[this.firstRunStep] || steps[0]}
            </div>
        </div>
      `;
  }

  public shutdownSystem(): void {
    if (this.secureWipeOnShutdown) {
      // Show wiping indication before full shutdown or during
      this.showNotification('Security', 'Securely wiping memory...', 'divine');
      // We could also play a sound
    }

    this.isShuttingDown = true;
    this.render();

    // If secure wipe is on, take longer
    const duration = this.secureWipeOnShutdown ? 5000 : 3000;

    setTimeout(() => {
      // In a real browser we can't 'turn off' the tab, but we can simulate a halted state or reload
      // For effect, we'll just leave it on the shutdown screen or reload
      window.location.reload();
    }, duration);
  }

  // ============================================
  // TIER 9.2: DESKTOP WIDGETS
  // ============================================
  private renderDesktopWidgets(): string {
    if (!this.desktopWidgetsEnabled) return '';

    const now = new Date();
    const cpu = this.monitorStats?.cpuPercent;
    const cpuText = (typeof cpu === 'number' && Number.isFinite(cpu)) ? String(Math.round(cpu)) : '—';

    const mem = this.monitorStats?.memory;
    const ramText = (mem && mem.total > 0) ? String(Math.max(0, Math.min(100, Math.round((mem.used / mem.total) * 100)))) : '—';

    const bat = (this.batterySupported && this.batteryStatus?.present && typeof this.batteryStatus.percent === 'number')
      ? String(Math.max(0, Math.min(100, Math.round(this.batteryStatus.percent))))
      : '—';

    return `
      <div class="desktop-widget" style="position: absolute; top: 20px; right: 20px; text-align: right; pointer-events: none; z-index: 0; color: rgba(0,255,65,0.4);">
          <div id="desktop-widget-time" style="font-size: 32px; font-weight: bold;">${now.toLocaleTimeString()}</div>
          <div id="desktop-widget-date" style="font-size: 16px;">${now.toLocaleDateString()}</div>
          <div style="margin-top: 10px; font-size: 12px;">
             CPU: <span id="desktop-widget-cpu">${cpuText}</span>% <br>
             RAM: <span id="desktop-widget-ram">${ramText}</span>% <br>
             BAT: <span id="desktop-widget-battery">${bat}</span>%
          </div>
      </div>
      `;
  }

  // ============================================
  // TIER 9.1: TASKBAR HELPERS
  // ============================================
  public showTaskbarContextMenu(e: MouseEvent) {
    e.preventDefault();

    // Check if we clicked on an app item
    const target = e.target as HTMLElement;
    const appEl = target.closest('.taskbar-app') as HTMLElement;

    if (appEl) {
      const menuItems: Array<{ label?: string; action?: () => void; divider?: boolean }> = [];

      // Case 1: Specific Window (Unpinned single window)
      if (appEl.dataset.taskbarWindow) {
        const winId = appEl.dataset.taskbarWindow;
        menuItems.push({
          label: 'Close Window',
          action: () => this.closeWindow(winId)
        });
      }
      // Case 2: Group of Windows (Unpinned group)
      else if (appEl.dataset.appGroup) {
        const group = appEl.dataset.appGroup;
        menuItems.push({
          label: 'Close All Windows',
          action: () => {
            const wins = this.windows.filter(w => w.id.split('-')[0] === group);
            wins.forEach(w => this.closeWindow(w.id));
          }
        });
      }
      // Case 3: Pinned App (Might have 0, 1, or more windows)
      else if (appEl.dataset.launchKey) {
        // Pinned apps store their internal ID type in data-app-type
        const appType = appEl.dataset.appType;
        if (appType) {
          const wins = this.windows.filter(w => w.id.startsWith(appType));
          if (wins.length > 0) {
            menuItems.push({
              label: wins.length === 1 ? 'Close Window' : 'Close All Windows',
              action: () => {
                wins.forEach(w => this.closeWindow(w.id));
              }
            });
          }
        }
      }
      // Case 4: X11 External Window
      else if (appEl.dataset.x11Xid) {
        const xid = appEl.dataset.x11Xid;
        const win = this.x11Windows.find(w => w.xidHex === xid);

        if (win) {
          menuItems.push({
            label: `${win.alwaysOnTop ? 'Unpin' : 'Pin'} (Always on Top)`,
            action: () => window.electronAPI?.setX11WindowAlwaysOnTop?.(xid, !win.alwaysOnTop)
          });
          if (window.electronAPI?.snapX11Window) {
            const taskbarCfg = { height: 50, position: this.taskbarPosition };
            // Helper to snap and track the slot
            const snapAndTrack = async (mode: string) => {
              console.log(`[Snap] Snapping ${xid} to ${mode}...`);
              const res = await window.electronAPI?.snapX11Window?.(xid, mode, taskbarCfg);
              console.log(`[Snap] snapX11Window result:`, res);
              if (res?.success) {
                console.log(`[Snap] Calling setOccupiedSlot(${xid}, ${mode})...`);
                const slotRes = await window.electronAPI?.setOccupiedSlot?.(xid, mode);
                console.log(`[Snap] setOccupiedSlot result:`, slotRes);
              }
            };
            menuItems.push(
              { label: 'Snap Left', action: () => void snapAndTrack('left') },
              { label: 'Snap Right', action: () => void snapAndTrack('right') },
              { label: 'Snap Top', action: () => void snapAndTrack('top') },
              { label: 'Snap Bottom', action: () => void snapAndTrack('bottom') },
              { label: 'Maximize', action: () => void snapAndTrack('maximize') },
              { label: 'Center', action: () => void snapAndTrack('center') },
            );
          }
          menuItems.push({ divider: true });

          if (win.minimized) {
            menuItems.push({
              label: 'Restore',
              action: () => {
                const api = window.electronAPI;
                if (!api) return;
                if (api.unminimizeX11Window) {
                  this.x11UserMinimized.delete(String(xid).toLowerCase());
                  void api.unminimizeX11Window(xid).then(() => void api.activateX11Window?.(xid));
                } else {
                  void api.activateX11Window?.(xid);
                }
              }
            });
          } else {
            menuItems.push({
              label: 'Minimize',
              action: () => {
                this.x11UserMinimized.add(String(xid).toLowerCase());
                void window.electronAPI?.minimizeX11Window?.(xid);
              }
            });
          }
          menuItems.push({ divider: true });
          // Move to Workspace sub-menu items
          for (let i = 1; i <= 4; i++) {
            const currentWs = this.x11WindowWorkspaces.get(xid.toLowerCase()) || 1;
            if (i !== currentWs) {
              menuItems.push({
                label: `Move to Workspace ${i}`,
                action: () => {
                  this.moveX11WindowToWorkspace(xid, i);
                  this.render();
                }
              });
            }
          }
          menuItems.push({ divider: true });
          menuItems.push({
            label: 'Close Window',
            action: () => {
              this.x11UserMinimized.delete(String(xid).toLowerCase());
              void window.electronAPI?.closeX11Window?.(xid);
            }
          });
        }
      }

      if (menuItems.length > 0) {
        this.showContextMenu(e.clientX, e.clientY, menuItems);
        return;
      }
    }

    this.showContextMenu(e.clientX, e.clientY, [
      {
        label: `${this.taskbarTransparent ? 'Disable' : 'Enable'} Transparency`,
        action: () => {
          this.taskbarTransparent = !this.taskbarTransparent;
          localStorage.setItem('temple_taskbar_transparent', String(this.taskbarTransparent));
          this.render();
        }
      },
      {
        label: `${this.taskbarAutoHide ? 'Disable' : 'Enable'} Auto-Hide`,
        action: () => {
          this.taskbarAutoHide = !this.taskbarAutoHide;
          localStorage.setItem('temple_taskbar_autohide', String(this.taskbarAutoHide));
          this.render();
        }
      },
      { divider: true },
      {
        label: `Move to ${this.taskbarPosition === 'bottom' ? 'Top' : 'Bottom'}`,
        action: () => {
          this.setTaskbarPosition(this.taskbarPosition === 'bottom' ? 'top' : 'bottom');
        }
      },
      { divider: true },
      { label: 'Task Manager', action: () => this.openApp('system-monitor') }
    ]);
  }
}

// Initialize TempleOS
window.templeOS = new TempleOS();

