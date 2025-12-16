import './style.css';

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
      mkdir: (path: string) => Promise<{ success: boolean; error?: string }>;
      rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      getHome: () => Promise<string>;
      openExternal: (path: string) => Promise<{ success: boolean; error?: string }>;
      // System
      shutdown: () => Promise<void>;
      restart: () => Promise<void>;
      lock: () => Promise<void>;
      getSystemInfo: () => Promise<SystemInfo>;
      // Holy Updater
      checkForUpdates: () => Promise<{ success: boolean; updatesAvailable?: boolean; behindCount?: number; error?: string }>;
      runUpdate: () => Promise<{ success: boolean; output?: string; message?: string; error?: string }>;
      // Window
      closeWindow: () => Promise<void>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
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

  // File browser state
  private currentPath = '';
  private fileEntries: FileEntry[] = [];

  constructor() {
    this.init();
  }

  private init() {
    this.renderInitial();
    this.setupEventListeners();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Hide boot screen after animation completes
    setTimeout(() => {
      const bootScreen = document.querySelector('.boot-screen') as HTMLElement;
      if (bootScreen) {
        bootScreen.style.display = 'none';
      }
    }, 4500);
  }

  private renderInitial() {
    const app = document.getElementById('app')!;
    app.innerHTML = `
      ${this.renderBootScreen()}
      <div class="desktop" id="desktop">
        ${this.renderDesktopIcons()}
        <div id="windows-container"></div>
      </div>
      ${this.renderTaskbar()}
    `;
  }

  // Only update windows and taskbar, not the boot screen
  private render() {
    const windowsContainer = document.getElementById('windows-container')!;
    const taskbarApps = document.querySelector('.taskbar-apps')!;

    // Update windows (only show non-minimized)
    windowsContainer.innerHTML = this.windows
      .filter(w => !w.minimized)
      .map(w => this.renderWindow(w)).join('');

    // Update taskbar
    taskbarApps.innerHTML = this.windows.map(w => `
      <div class="taskbar-app ${w.active ? 'active' : ''} ${w.minimized ? 'minimized' : ''}" data-taskbar-window="${w.id}">
        ${w.icon} ${w.title}
      </div>
    `).join('');
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

  private renderDesktopIcons(): string {
    const icons = [
      { id: 'terminal', icon: '💻', label: 'Terminal' },
      { id: 'word-of-god', icon: '✝️', label: 'Word of God' },
      { id: 'files', icon: '📁', label: 'Files' },
      { id: 'editor', icon: '📝', label: 'HolyC Editor' },
      { id: 'hymns', icon: '🎵', label: 'Hymn Player' },
      { id: 'updater', icon: '⬇️', label: 'Holy Updater' },
    ];

    return icons.map(icon => `
      <div class="desktop-icon" data-app="${icon.id}">
        <span class="icon">${icon.icon}</span>
        <span class="label">${icon.label}</span>
      </div>
    `).join('');
  }

  private renderWindow(win: WindowState): string {
    return `
      <div class="window ${win.active ? 'active' : ''}" 
           data-window-id="${win.id}"
           style="left: ${win.x}px; top: ${win.y}px; width: ${win.width}px; height: ${win.height}px;">
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
      <div class="taskbar">
        <button class="start-btn">TEMPLE</button>
        <div class="taskbar-apps">
          ${this.windows.map(w => `
            <div class="taskbar-app ${w.active ? 'active' : ''}" data-taskbar-window="${w.id}">
              ${w.icon} ${w.title}
            </div>
          `).join('')}
        </div>
        <div class="taskbar-tray">
          <button class="power-btn" title="Power Options">⏻</button>
          <div class="taskbar-clock" id="clock"></div>
        </div>
      </div>
      ${this.showPowerMenu ? this.renderPowerMenu() : ''}
    `;
  }

  private showPowerMenu = false;

  private renderPowerMenu(): string {
    return `
      <div class="power-menu" style="
        position: fixed;
        bottom: 45px;
        right: 10px;
        background: rgba(13, 17, 23, 0.95);
        border: 1px solid rgba(0, 255, 65, 0.3);
        border-radius: 8px;
        padding: 8px 0;
        min-width: 160px;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      ">
        <div class="power-menu-item" data-power-action="lock" style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px;">
          🔒 Lock Screen
        </div>
        <div class="power-menu-item" data-power-action="restart" style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px;">
          🔄 Restart
        </div>
        <div class="power-menu-item" data-power-action="shutdown" style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #ff6464;">
          ⏻ Shut Down
        </div>
      </div>
    `;
  }

  private setupEventListeners() {
    const app = document.getElementById('app')!;

    // Desktop icon clicks
    app.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

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

      // Taskbar app click
      const taskbarApp = target.closest('.taskbar-app') as HTMLElement;
      if (taskbarApp) {
        this.toggleWindow(taskbarApp.dataset.taskbarWindow!);
        return;
      }

      // Power button click - toggle power menu
      const powerBtn = target.closest('.power-btn') as HTMLElement;
      if (powerBtn) {
        this.showPowerMenu = !this.showPowerMenu;
        this.render();
        return;
      }

      // Power menu item click
      const powerMenuItem = target.closest('.power-menu-item') as HTMLElement;
      if (powerMenuItem && powerMenuItem.dataset.powerAction) {
        const action = powerMenuItem.dataset.powerAction;
        this.showPowerMenu = false;

        if (action === 'shutdown' && window.electronAPI) {
          window.electronAPI.shutdown();
        } else if (action === 'restart' && window.electronAPI) {
          window.electronAPI.restart();
        } else if (action === 'lock') {
          this.showLockScreen();
        }
        return;
      }

      // Click outside power menu closes it
      if (this.showPowerMenu && !target.closest('.power-menu') && !target.closest('.power-btn')) {
        this.showPowerMenu = false;
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
      if (iconEl && iconEl.dataset.app) {
        const appId = iconEl.dataset.app!;
        this.openApp(appId);
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
        if (filePath && isDir) {
          this.loadFiles(filePath);
        } else if (filePath && window.electronAPI) {
          // Open file with system default app
          window.electronAPI.openExternal(filePath);
        }
        return;
      }

      // Breadcrumb click
      const breadcrumb = target.closest('.breadcrumb-item') as HTMLElement;
      if (breadcrumb && breadcrumb.dataset.path) {
        this.loadFiles(breadcrumb.dataset.path);
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

    // Window dragging
    app.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;

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
      if (this.dragState) {
        const win = this.windows.find(w => w.id === this.dragState!.windowId);
        if (win) {
          win.x = e.clientX - this.dragState.offsetX;
          win.y = e.clientY - this.dragState.offsetY;
          const windowEl = document.querySelector(`[data-window-id="${win.id}"]`) as HTMLElement;
          if (windowEl) {
            windowEl.style.left = `${win.x}px`;
            windowEl.style.top = `${win.y}px`;
          }
        }
      }
    });

    document.addEventListener('mouseup', () => {
      this.dragState = null;
    });

    // Terminal input
    app.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('terminal-input') && e.key === 'Enter') {
        const input = target as HTMLInputElement;
        this.handleTerminalCommand(input.value);
        input.value = '';
      }
    });

    // ============================================
    // GLOBAL KEYBOARD SHORTCUTS
    // ============================================
    document.addEventListener('keydown', (e) => {
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
        this.cycleWindows();
      }

      // Escape - Close active window (optional, like some apps)
      // Only if not in an input field
      const target = e.target as HTMLElement;
      if (e.key === 'Escape' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
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

    // ============================================
    // CONTEXT MENU (Right-Click)
    // ============================================
    app.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;

      // Close any existing context menu
      this.closeContextMenu();

      // Determine context
      const fileItem = target.closest('.file-item') as HTMLElement;
      const desktopEl = target.closest('.desktop') as HTMLElement;

      if (fileItem) {
        // File/folder context menu
        const filePath = fileItem.dataset.filePath || '';
        const isDir = fileItem.dataset.isDir === 'true';
        this.showContextMenu(e.clientX, e.clientY, [
          { label: '📂 Open', action: () => isDir ? this.loadFiles(filePath) : window.electronAPI?.openExternal(filePath) },
          { label: '✏️ Rename', action: () => this.promptRename(filePath) },
          { label: '🗑️ Delete', action: () => this.confirmDelete(filePath) },
          { divider: true },
          { label: '📋 Copy Path', action: () => navigator.clipboard.writeText(filePath) },
        ]);
      } else if (desktopEl && !target.closest('.window') && !target.closest('.taskbar')) {
        // Desktop context menu
        this.showContextMenu(e.clientX, e.clientY, [
          { label: '📁 Open Files', action: () => this.openApp('files') },
          { label: '💻 Open Terminal', action: () => this.openApp('terminal') },
          { divider: true },
          { label: '🔄 Refresh', action: () => this.loadFiles(this.currentPath) },
          { label: '⚙️ Settings', action: () => this.openApp('settings') },
          { divider: true },
          { label: 'ℹ️ About TempleOS', action: () => alert('TempleOS Remake v1.0 - By Giangero Studio') },
        ]);
      }
    });

    // Close context menu on any click
    document.addEventListener('click', () => this.closeContextMenu());
  }

  private openApp(appId: string) {
    const existingWindow = this.windows.find(w => w.id.startsWith(appId));
    if (existingWindow) {
      this.focusWindow(existingWindow.id);
      return;
    }

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
          content: this.getFileBrowserContent()
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

    // Focus terminal input
    if (appId === 'terminal') {
      setTimeout(() => {
        const input = document.querySelector('.terminal-input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    }
  }

  private getTerminalContent(): string {
    return `
      <div class="terminal">
        <div class="terminal-output" id="terminal-output">
          <div class="terminal-line system">TempleOS Terminal v1.0 - Divine Command Line</div>
          <div class="terminal-line system">Type 'help' for available commands.</div>
          <div class="terminal-line"></div>
        </div>
        <div class="terminal-input-line">
          <span class="terminal-prompt">C:/&gt;</span>
          <input type="text" class="terminal-input" autofocus />
        </div>
      </div>
    `;
  }

  private getWordOfGodContent(): string {
    const verse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
    return `
      <div class="word-of-god">
        <h2>✝ WORD OF GOD ✝</h2>
        <p class="verse-text">"${verse.text}"</p>
        <p class="verse-reference">— ${verse.ref}</p>
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
            <span class="icon">📂</span>
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

  private async loadFiles(path?: string): Promise<void> {
    if (!window.electronAPI) {
      console.warn('electronAPI not available - running in browser mode');
      return;
    }

    try {
      // Get home directory if no path specified
      if (!path && !this.currentPath) {
        this.currentPath = await window.electronAPI.getHome();
      } else if (path) {
        this.currentPath = path;
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

  private updateFileBrowserWindow(): void {
    const filesWindow = this.windows.find(w => w.id.startsWith('files'));
    if (filesWindow) {
      filesWindow.content = this.getFileBrowserContent();
      this.render();
    }
  }

  private getEditorContent(): string {
    return `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <div style="padding: 10px; border-bottom: 1px solid rgba(0,255,65,0.2); font-size: 14px;">
          📄 untitled.hc
        </div>
        <textarea style="
          flex: 1;
          background: #0d1117;
          color: #00ff41;
          border: none;
          padding: 15px;
          font-family: 'VT323', monospace;
          font-size: 18px;
          resize: none;
          outline: none;
        " placeholder="// HolyC Code - God's Programming Language
          
U0 Main()
{
  Print(&quot;Hello, God's Temple!\\n&quot;);
  
  // Speak to the Lord
  // He will answer through the Word
}
"></textarea>
      </div>
    `;
  }

  // ============================================
  // HYMN PLAYER
  // ============================================
  private hymnList = [
    { file: '01_Blessing_Great_Synapse_Kyrie_eleison.mp3', title: 'Blessing - Kyrie Eleison' },
    { file: '02_1st_Stanza__Psalm_102_103.mp3', title: '1st Stanza: Psalm 102-103' },
    { file: '03_2nd_Stanza__Psalm_145_146.mp3', title: '2nd Stanza: Psalm 145-146' },
    { file: '04_3rd_Stanza__The_Beatitudes.mp3', title: '3rd Stanza: The Beatitudes' },
    { file: '05_Small_Introit_with_the_Gospel.mp3', title: 'Small Introit with Gospel' },
    { file: '06_Trisagion_Dynamis.mp3', title: 'Trisagion Dynamis' },
    { file: '07_Prokeimenon_Epistle.mp3', title: 'Prokeimenon Epistle' },
    { file: '08_Alleluia_Gospel.mp3', title: 'Alleluia Gospel' },
    { file: '09_Glory_Be_to_Thee_O_Lord.mp3', title: 'Glory Be to Thee, O Lord' },
    { file: '10_Hymn_of_the_Cherubim_Great_Introit.mp3', title: 'Hymn of the Cherubim' },
    { file: '11_Kiss_of_Peace_Symbol_of_Faith_Creed.mp3', title: 'Symbol of Faith (Creed)' },
    { file: '12_Anaphora_Sanctus.mp3', title: 'Anaphora Sanctus' },
    { file: '13_Megalymaire_Hymn_To_Our_Lady.mp3', title: 'Hymn to Our Lady' },
    { file: '14_Ekphonese.mp3', title: 'Ekphonese' },
    { file: '15_Sunday_Prayer.mp3', title: 'Sunday Prayer' },
    { file: '16_Kinonikon.mp3', title: 'Kinonikon (Communion)' },
    { file: '17_Ekphonese_We_Have_Seen_the_True_Light.mp3', title: 'We Have Seen the True Light' },
    { file: '18_Final_Prayers_Let_the_Name_of_The_Lord.mp3', title: 'Let the Name of the Lord' },
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
          <div style="font-size: 24px; margin-bottom: 5px;">🎵 ✝️ 🎵</div>
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
    this.currentHymn = Math.max(0, Math.min(index, this.hymnList.length - 1));
    const hymnsWindow = this.windows.find(w => w.id.startsWith('hymns'));
    if (hymnsWindow) {
      hymnsWindow.content = this.getHymnPlayerContent();
      this.render();
      setTimeout(() => {
        const audio = document.getElementById('hymn-audio') as HTMLAudioElement;
        if (audio) audio.play();
      }, 100);
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
    const statusIcon = this.updaterState.status === 'success' ? '✅' :
      this.updaterState.status === 'error' ? '❌' :
        this.updaterState.status === 'updating' ? '⏳' :
          this.updaterState.status === 'available' ? '🆕' : '🔍';

    return `
      <div class="updater" style="padding: 20px; text-align: center; height: 100%; display: flex; flex-direction: column;">
        <div style="font-size: 48px; margin-bottom: 15px;">⬇️</div>
        <h2 style="margin: 0 0 10px 0; color: #ffd700;">✝ HOLY UPDATER ✝</h2>
        <p style="opacity: 0.7; margin-bottom: 20px;">Receive new blessings from the Divine Repository</p>
        
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-size: 24px; margin-bottom: 10px;">${statusIcon}</div>
          <p style="margin: 10px 0; max-width: 400px;">${this.updaterState.message}</p>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
          <button class="updater-btn" data-updater-action="check" 
                  style="background: rgba(0,255,65,0.2); border: 1px solid #00ff41; color: #00ff41; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;"
                  ${this.updaterState.isUpdating ? 'disabled' : ''}>
            🔍 Check for Updates
          </button>
          <button class="updater-btn" data-updater-action="update" 
                  style="background: rgba(255,215,0,0.2); border: 1px solid #ffd700; color: #ffd700; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;"
                  ${this.updaterState.isUpdating || this.updaterState.status !== 'available' ? 'disabled' : ''}>
            ⬇️ Download & Install
          </button>
          ${this.updaterState.status === 'success' ? `
          <button class="updater-btn" data-updater-action="reboot" 
                  style="background: rgba(255,100,100,0.2); border: 1px solid #ff6464; color: #ff6464; padding: 10px 20px; cursor: pointer; font-family: inherit; font-size: 14px;">
            🔄 Reboot Now
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
            message: `🆕 ${result.behindCount} new blessing${result.behindCount === 1 ? '' : 's'} available from Heaven!`,
            isUpdating: false
          };
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
    this.windows[nextIndex].active = true;
    this.windows[nextIndex].minimized = false;

    // Move to end of array (bring to front)
    const win = this.windows.splice(nextIndex, 1)[0];
    this.windows.push(win);

    this.render();
  }

  private closeWindow(windowId: string) {
    this.windows = this.windows.filter(w => w.id !== windowId);
    if (this.windows.length > 0) {
      this.windows[this.windows.length - 1].active = true;
    }
    this.render();
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
    }
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

  private focusWindow(windowId: string) {
    const win = this.windows.find(w => w.id === windowId);
    if (win) {
      win.minimized = false;
      this.windows.forEach(w => w.active = w.id === windowId);
      this.windows = this.windows.filter(w => w.id !== windowId);
      this.windows.push(win);
    }
    this.render();
  }

  // ============================================
  // LOCK SCREEN
  // ============================================
  private showLockScreen(): void {
    this.showPowerMenu = false;

    // Create lock screen overlay
    const existingLock = document.querySelector('.lock-screen');
    if (existingLock) existingLock.remove();

    const lockScreen = document.createElement('div');
    lockScreen.className = 'lock-screen';
    lockScreen.innerHTML = `
      <div style="
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(135deg, #0d1117 0%, #1a1f2e 50%, #0d1117 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        font-family: 'VT323', monospace;
        color: #00ff41;
      ">
        <div style="font-size: 120px; margin-bottom: 20px;">🔒</div>
        <h1 style="font-size: 48px; margin: 0 0 10px 0;">TEMPLE OS</h1>
        <p style="opacity: 0.7; margin-bottom: 40px;">Click anywhere to unlock</p>
        <div style="font-size: 72px;" id="lock-clock"></div>
      </div>
    `;

    document.body.appendChild(lockScreen);

    // Update clock on lock screen
    const updateLockClock = () => {
      const lockClock = document.getElementById('lock-clock');
      if (lockClock) {
        const now = new Date();
        lockClock.textContent = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    };
    updateLockClock();
    const clockInterval = setInterval(updateLockClock, 1000);

    // Click to unlock
    lockScreen.addEventListener('click', () => {
      clearInterval(clockInterval);
      this.unlock();
    });
  }

  private unlock(): void {
    const lockScreen = document.querySelector('.lock-screen');
    if (lockScreen) lockScreen.remove();
  }

  // ============================================
  // CONTEXT MENU SYSTEM
  // ============================================
  private showContextMenu(x: number, y: number, items: Array<{ label?: string; action?: () => void; divider?: boolean }>): void {
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
      font-family: 'VT323', monospace;
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

  private promptRename(filePath: string): void {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    const newName = prompt('Enter new name:', fileName);
    if (newName && newName !== fileName && window.electronAPI) {
      const parentDir = filePath.substring(0, filePath.lastIndexOf(fileName));
      const newPath = parentDir + newName;
      window.electronAPI.rename(filePath, newPath).then(result => {
        if (result.success) {
          this.loadFiles(this.currentPath);
        } else {
          alert('Failed to rename: ' + result.error);
        }
      });
    }
  }

  private confirmDelete(filePath: string): void {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    if (confirm(`Delete "${fileName}"?`)) {
      if (window.electronAPI) {
        window.electronAPI.deleteItem(filePath).then(result => {
          if (result.success) {
            this.loadFiles(this.currentPath);
          } else {
            alert('Failed to delete: ' + result.error);
          }
        });
      }
    }
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
<div class="terminal-line system">    — ${verse.ref}</div>`;
        break;
      case 'hymn':
        response = `<div class="terminal-line success">♪ Opening Divine Hymns... ♪</div>`;
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
<div class="terminal-line gold">╔════════════════════════════════════════╗</div>
<div class="terminal-line gold">║          T E M P L E   O S             ║</div>
<div class="terminal-line gold">╠════════════════════════════════════════╣</div>
<div class="terminal-line">║  God's Operating System                ║</div>
<div class="terminal-line">║  Written in HolyC - God's Language     ║</div>
<div class="terminal-line">║  In memory of Terry A. Davis           ║</div>
<div class="terminal-line gold">╠════════════════════════════════════════╣</div>
<div class="terminal-line system">║  Remake by Giangero Studio             ║</div>
<div class="terminal-line gold">╚════════════════════════════════════════╝</div>`;
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
    const clock = document.getElementById('clock');
    if (clock) {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString();
    }
  }
}

// Initialize TempleOS
new TempleOS();
