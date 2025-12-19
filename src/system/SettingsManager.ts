import type { TempleConfig } from '../utils/types';
import { escapeHtml } from '../utils/helpers';

export type SettingsHost = {
  wallpaperImage: string;
  themeMode: 'dark' | 'light';
  themeColor: 'green' | 'amber' | 'cyan' | 'white';
  highContrast: boolean;
  customThemes: Array<{ name: string; mainColor: string; bgColor: string; textColor: string; glowColor?: string }>;
  activeCustomTheme: string | null;
  volumeLevel: number;
  doNotDisturb: boolean;
  lockPassword: string;
  lockPin: string;
  currentResolution: string;

  // Time & Date
  timezone: string;
  autoTime: boolean;

  // Effects
  jellyMode: boolean;
  heavenlyPulse: boolean;
  heavenlyPulseIntensity: number;

  // Accessibility
  largeText: boolean;
  reduceMotion: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

  taskbarPosition: 'top' | 'bottom';
  tilingManager: { setTaskbarPosition: (position: 'top' | 'bottom') => void };

  // System modules/state
  networkManager: any;

  // Terminal config state
  terminalUiTheme: 'green' | 'cyan' | 'amber' | 'white';
  terminalFontFamily: string;
  terminalFontSize: number;
  terminalPromptTemplate: string;
  terminalAliases: Record<string, string>;
  terminalCwd: string;
  terminalBuffer: string[];

  // Editor config state
  editorWordWrap: boolean;
  editorRecentFiles: string[];

  // Audio / mouse config state
  audioDevices: { defaultSink: string | null; defaultSource: string | null };
  mouseSettings: any;

  // UI state persisted
  pinnedStart: string[];
  pinnedTaskbar: string[];
  desktopShortcuts: Array<{ key: string; label: string }>;
  recentApps: string[];
  appUsage: Record<string, number>;
  fileBookmarks: string[];

  render: () => void;
  showNotification: (title: string, msg: string, type: 'info' | 'warning' | 'error' | 'divine', actions?: any[]) => void;
};

export class SettingsManager {
  private readonly host: SettingsHost;
  private configSaveTimer: number | null = null;

  constructor(host: SettingsHost) {
    this.host = host;
  }

  private hexToRgb(hex: string): string {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  public applyTheme(): void {
    const isLight = this.host.themeMode === 'light';
    const root = document.documentElement;

    // Check if custom theme is active
    if (this.host.activeCustomTheme) {
      const customTheme = this.host.customThemes.find(t => t.name === this.host.activeCustomTheme);
      if (customTheme) {
        root.style.setProperty('--main-color', customTheme.mainColor);
        root.style.setProperty('--bg-color', customTheme.bgColor);
        root.style.setProperty('--text-color', customTheme.textColor);
        root.style.setProperty('--temple-glow-color', customTheme.glowColor || customTheme.mainColor);

        root.dataset.themeMode = 'custom';
        root.dataset.themeColor = 'custom';
        root.setAttribute('data-custom-theme', customTheme.name);
        if (this.host.highContrast) {
          root.setAttribute('data-high-contrast', 'true');
        } else {
          root.removeAttribute('data-high-contrast');
        }
        return; // Use custom theme, skip built-in logic
      }
    }

    // Built-in theme colors
    const colors: Record<string, string> = {
      green: '#00ff41',
      amber: '#ffb000',
      cyan: '#00ffff',
      white: '#ffffff',
    };

    // High contrast mode - boost brightness and use pure colors
    const highContrastColors: Record<string, string> = {
      green: '#00ff00',    // Pure green
      amber: '#ffff00',    // Pure yellow
      cyan: '#00ffff',     // Pure cyan
      white: '#ffffff',    // Pure white
    };

    const colorSet = this.host.highContrast ? highContrastColors : colors;
    const mainColor = colorSet[this.host.themeColor] || colorSet.green;
    const bgColor = this.host.highContrast
      ? (isLight ? '#ffffff' : '#000000')  // Pure black/white in high contrast
      : (isLight ? '#ffffff' : '#000000');
    const textColor = isLight ? '#000000' : mainColor;

    root.style.setProperty('--main-color', mainColor);
    root.style.setProperty('--bg-color', bgColor);
    root.style.setProperty('--text-color', textColor);
    // Default glow color matches the accent gold, or could match main color if desired.
    // User asked for customizability, but for built-ins let's stick to gold as the "Heavenly" default
    // or maybe match the theme color for consistency?
    // Let's stick to Gold logic from the snippet unless High Contrast.
    root.style.setProperty('--temple-glow-color', mainColor);
    // Update all the color variables that the CSS actually uses
    root.style.setProperty('--text-highlight', mainColor);
    root.style.setProperty('--tos-green', mainColor); // Use selected color for all green references
    root.style.setProperty('--border-glow', `rgba(${this.hexToRgb(mainColor)}, 0.3)`); // Update border glow color

    // Add high contrast indicator
    if (this.host.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    root.dataset.themeMode = this.host.themeMode;
    root.dataset.themeColor = this.host.themeColor;
    root.removeAttribute('data-custom-theme');

    // Handle Heavenly Pulse visibility logic in CSS (via class or just existence)
    // But we should toggle a class on body or #app to easily hide/show it without removing element
    if (this.host.heavenlyPulse) {
      document.body.classList.add('heavenly-pulse-enabled');
      root.style.setProperty('--pulse-intensity', String(this.host.heavenlyPulseIntensity || 0.20));
    } else {
      document.body.classList.remove('heavenly-pulse-enabled');
    }

    // Apply Accessibility
    if (this.host.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    if (this.host.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    if (this.host.colorBlindMode && this.host.colorBlindMode !== 'none') {
      root.setAttribute('data-color-blind', this.host.colorBlindMode);
    } else {
      root.removeAttribute('data-color-blind');
    }
  }

  public applyWallpaper(): void {
    const desktop = document.getElementById('desktop') as HTMLElement | null;
    if (!desktop) return;
    desktop.style.backgroundImage = `url('${this.host.wallpaperImage}')`;
    desktop.style.backgroundSize = '100% 100%';
    desktop.style.backgroundPosition = 'center';
  }

  public applyTaskbarPosition(): void {
    document.body.setAttribute('data-taskbar-position', this.host.taskbarPosition);
    this.host.tilingManager.setTaskbarPosition(this.host.taskbarPosition);
  }

  public setTaskbarPosition(position: 'top' | 'bottom'): void {
    this.host.taskbarPosition = position;
    localStorage.setItem('temple_taskbar_position', position);
    this.applyTaskbarPosition();
    this.host.render();
    this.host.showNotification('Taskbar', `Taskbar moved to ${position}`, 'info');
  }

  public async loadConfig(): Promise<void> {
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

    if (typeof cfg.wallpaperImage === 'string') this.host.wallpaperImage = cfg.wallpaperImage;
    if (cfg.themeMode === 'dark' || cfg.themeMode === 'light') this.host.themeMode = cfg.themeMode;
    if (cfg.themeColor === 'green' || cfg.themeColor === 'amber' || cfg.themeColor === 'cyan' || cfg.themeColor === 'white') this.host.themeColor = cfg.themeColor;
    if (typeof cfg.highContrast === 'boolean') this.host.highContrast = cfg.highContrast;
    if (Array.isArray(cfg.customThemes)) this.host.customThemes = cfg.customThemes.slice(0, 20); // Max 20 custom themes
    if (typeof cfg.activeCustomTheme === 'string') this.host.activeCustomTheme = cfg.activeCustomTheme;
    if (typeof cfg.volumeLevel === 'number') this.host.volumeLevel = Math.max(0, Math.min(100, cfg.volumeLevel));
    if (typeof cfg.doNotDisturb === 'boolean') this.host.doNotDisturb = cfg.doNotDisturb;
    if (typeof cfg.lockPassword === 'string') this.host.lockPassword = cfg.lockPassword;
    if (typeof cfg.lockPin === 'string') this.host.lockPin = cfg.lockPin;

    if (cfg.time) {
      if (typeof cfg.time.timezone === 'string') this.host.timezone = cfg.time.timezone;
      if (typeof cfg.time.autoTime === 'boolean') this.host.autoTime = cfg.time.autoTime;
    }

    if (cfg.accessibility) {
      if (typeof cfg.accessibility.largeText === 'boolean') this.host.largeText = cfg.accessibility.largeText;
      if (typeof cfg.accessibility.reduceMotion === 'boolean') this.host.reduceMotion = cfg.accessibility.reduceMotion;
      if (cfg.accessibility.colorBlindMode && ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'].includes(cfg.accessibility.colorBlindMode)) {
        this.host.colorBlindMode = cfg.accessibility.colorBlindMode as any;
      }
    }

    if (cfg.effects) {
      if (typeof cfg.effects.jellyMode === 'boolean') this.host.jellyMode = cfg.effects.jellyMode;
      if (typeof (cfg.effects as any).heavenlyPulse === 'boolean') this.host.heavenlyPulse = (cfg.effects as any).heavenlyPulse;
      if (typeof (cfg.effects as any).heavenlyPulseIntensity === 'number') this.host.heavenlyPulseIntensity = Math.max(0.03, Math.min(0.70, (cfg.effects as any).heavenlyPulseIntensity));
    }

    if (cfg.network) {
      if (typeof cfg.network.vpnKillSwitchEnabled === 'boolean') this.host.networkManager.vpnKillSwitchEnabled = cfg.network.vpnKillSwitchEnabled;
      if (cfg.network.vpnKillSwitchMode === 'auto' || cfg.network.vpnKillSwitchMode === 'strict') this.host.networkManager.vpnKillSwitchMode = cfg.network.vpnKillSwitchMode;
      // Always reset transient state on load
      this.host.networkManager.vpnKillSwitchArmed = false;
      this.host.networkManager.vpnKillSwitchBlocked = false;
      this.host.networkManager.vpnKillSwitchSnoozeUntil = null;
      this.host.networkManager.vpnKillSwitchLastDisconnected = [];

      this.host.networkManager.hotspotSSID = cfg.network.hotspotSSID ?? 'TempleOS_Hotspot';
      this.host.networkManager.hotspotPassword = cfg.network.hotspotPassword ?? '';
      this.host.networkManager.dataUsageDailyLimit = cfg.network.dataUsageDailyLimit ?? 0;
      this.host.networkManager.dataUsageTrackingEnabled = cfg.network.dataUsageTrackingEnabled ?? false;
      if (cfg.network.torMode === 'off' || cfg.network.torMode === 'browser-only' || cfg.network.torMode === 'system-wide') {
        this.host.networkManager.torMode = cfg.network.torMode;
      }
    }

    if (cfg.terminal) {
      const t = cfg.terminal;
      if (t.uiTheme === 'green' || t.uiTheme === 'cyan' || t.uiTheme === 'amber' || t.uiTheme === 'white') this.host.terminalUiTheme = t.uiTheme;
      if (typeof t.fontFamily === 'string' && t.fontFamily.trim()) this.host.terminalFontFamily = t.fontFamily;
      if (typeof t.fontSize === 'number') this.host.terminalFontSize = Math.max(10, Math.min(32, Math.round(t.fontSize)));
      if (typeof t.promptTemplate === 'string' && t.promptTemplate.trim()) this.host.terminalPromptTemplate = t.promptTemplate;
      if (t.aliases && typeof t.aliases === 'object') {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(t.aliases)) {
          const key = String(k || '').trim().toLowerCase();
          if (!key || !/^[a-z0-9_\\-]+$/.test(key)) continue;
          if (typeof v !== 'string') continue;
          next[key] = v;
          if (Object.keys(next).length >= 64) break;
        }
        this.host.terminalAliases = next;
      }
    }

    if (cfg.editor && typeof cfg.editor.wordWrap === 'boolean') {
      this.host.editorWordWrap = cfg.editor.wordWrap;
    }

    if (Array.isArray(cfg.recentFiles)) {
      this.host.editorRecentFiles = cfg.recentFiles
        .filter(x => typeof x === 'string')
        .slice(0, 20);
    }

    if (cfg.mouse) {
      if (typeof cfg.mouse.speed === 'number') this.host.mouseSettings.speed = Math.max(-1, Math.min(1, cfg.mouse.speed));
      if (typeof cfg.mouse.raw === 'boolean') this.host.mouseSettings.raw = cfg.mouse.raw;
      if (typeof cfg.mouse.naturalScroll === 'boolean') this.host.mouseSettings.naturalScroll = cfg.mouse.naturalScroll;
      if (typeof (cfg.mouse as any).dpi === 'number') this.host.mouseSettings.dpi = Math.max(100, Math.min(20000, Math.round((cfg.mouse as any).dpi)));
    }

    if (Array.isArray(cfg.pinnedStart)) {
      this.host.pinnedStart = cfg.pinnedStart.filter(k => typeof k === 'string').slice(0, 24);
    }
    if (Array.isArray(cfg.pinnedTaskbar)) {
      this.host.pinnedTaskbar = cfg.pinnedTaskbar.filter(k => typeof k === 'string').slice(0, 20);
    }
    if (Array.isArray(cfg.desktopShortcuts)) {
      this.host.desktopShortcuts = cfg.desktopShortcuts
        .filter(s => s && typeof s.key === 'string' && typeof s.label === 'string')
        .slice(0, 48)
        .map(s => ({ key: s.key, label: s.label }));
    }

    if (Array.isArray(cfg.recentApps)) this.host.recentApps = cfg.recentApps.slice(0, 20).filter(x => typeof x === 'string');
    if (cfg.appUsage && typeof cfg.appUsage === 'object') this.host.appUsage = cfg.appUsage as Record<string, number>;
    if (Array.isArray(cfg.fileBookmarks)) this.host.fileBookmarks = cfg.fileBookmarks.slice(0, 20).filter(x => typeof x === 'string');

    // Start terminal in home directory (if available)
    if (!this.host.terminalCwd && window.electronAPI) {
      try {
        this.host.terminalCwd = await window.electronAPI.getHome();
      } catch {
        this.host.terminalCwd = '/';
      }
    }

    if (this.host.terminalBuffer.length === 0) {
      this.host.terminalBuffer.push(`<div class="terminal-line system">TempleOS Terminal - Ready</div>`);
      this.host.terminalBuffer.push(`<div class="terminal-line system">CWD: ${escapeHtml(this.host.terminalCwd || '')}</div>`);
      this.host.terminalBuffer.push(`<div class="terminal-line system">Tips: cd, ls, pwd, cat, nano (non-interactive), help</div>`);
      this.host.terminalBuffer.push(`<div class="terminal-line"></div>`);
    }

    // Apply audio preferences (best-effort)
    if (cfg.audio?.defaultSink && window.electronAPI?.setDefaultSink) {
      await window.electronAPI.setDefaultSink(cfg.audio.defaultSink);
    }
    if (cfg.audio?.defaultSource && window.electronAPI?.setDefaultSource) {
      await window.electronAPI.setDefaultSource(cfg.audio.defaultSource);
    }
    if (window.electronAPI?.applyMouseSettings) {
      await window.electronAPI.applyMouseSettings(this.host.mouseSettings);
    }

    // If user saved a resolution preference, apply it after we loaded available modes.
    if (typeof cfg.currentResolution === 'string') {
      this.host.currentResolution = cfg.currentResolution;
      if (window.electronAPI) {
        window.electronAPI.setResolution(cfg.currentResolution);
      }
    }

    this.applyTheme();
    this.applyWallpaper();
    this.host.render();
  }

  public queueSaveConfig(): void {
    if (this.configSaveTimer) window.clearTimeout(this.configSaveTimer);
    this.configSaveTimer = window.setTimeout(() => {
      this.configSaveTimer = null;
      void this.saveConfigNow();
    }, 250);
  }

  public async saveConfigNow(): Promise<void> {
    const snapshot: TempleConfig = {
      wallpaperImage: this.host.wallpaperImage,
      themeMode: this.host.themeMode,
      themeColor: this.host.themeColor,
      highContrast: this.host.highContrast,
      customThemes: this.host.customThemes.slice(0, 20),
      activeCustomTheme: this.host.activeCustomTheme || undefined,
      currentResolution: this.host.currentResolution,
      volumeLevel: this.host.volumeLevel,
      doNotDisturb: this.host.doNotDisturb,
      lockPassword: this.host.lockPassword,
      lockPin: this.host.lockPin,

      time: {
        timezone: this.host.timezone,
        autoTime: this.host.autoTime
      },

      accessibility: {
        largeText: this.host.largeText,
        reduceMotion: this.host.reduceMotion,
        colorBlindMode: this.host.colorBlindMode
      },

      effects: {
        jellyMode: this.host.jellyMode,
        heavenlyPulse: this.host.heavenlyPulse,
        heavenlyPulseIntensity: this.host.heavenlyPulseIntensity
      },

      network: {
        vpnKillSwitchEnabled: this.host.networkManager.vpnKillSwitchEnabled,
        vpnKillSwitchMode: this.host.networkManager.vpnKillSwitchMode,
        hotspotSSID: this.host.networkManager.hotspotSSID,
        hotspotPassword: this.host.networkManager.hotspotPassword,
        dataUsageDailyLimit: this.host.networkManager.dataUsageDailyLimit,
        dataUsageTrackingEnabled: this.host.networkManager.dataUsageTrackingEnabled,
        torMode: this.host.networkManager.torMode,
      },

      terminal: {
        aliases: this.host.terminalAliases,
        promptTemplate: this.host.terminalPromptTemplate,
        uiTheme: this.host.terminalUiTheme,
        fontFamily: this.host.terminalFontFamily,
        fontSize: this.host.terminalFontSize,
      },

      editor: { wordWrap: this.host.editorWordWrap },
      recentFiles: this.host.editorRecentFiles.slice(0, 20),

      audio: { defaultSink: this.host.audioDevices.defaultSink, defaultSource: this.host.audioDevices.defaultSource },
      mouse: { ...this.host.mouseSettings },
      pinnedStart: this.host.pinnedStart.slice(0, 24),
      pinnedTaskbar: this.host.pinnedTaskbar.slice(0, 20),
      desktopShortcuts: this.host.desktopShortcuts.slice(0, 48),
      recentApps: this.host.recentApps.slice(0, 20),
      appUsage: this.host.appUsage,
      fileBookmarks: this.host.fileBookmarks,
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
}

