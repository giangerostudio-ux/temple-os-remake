import './style.css';

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
  private hasBooted = false;

  constructor() {
    this.init();
  }

  private init() {
    this.renderInitial();
    this.setupEventListeners();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Mark as booted after animation completes
    setTimeout(() => {
      this.hasBooted = true;
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
        <div class="taskbar-clock" id="clock"></div>
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
          width: 500,
          height: 400,
          content: this.getFileBrowserContent()
        };
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
    const files = [
      { name: 'Home', icon: '🏠', type: 'dir' },
      { name: 'Programs', icon: '📁', type: 'dir' },
      { name: 'Demos', icon: '📁', type: 'dir' },
      { name: 'Adam', icon: '📁', type: 'dir' },
      { name: 'README.TXT', icon: '📄', type: 'file' },
      { name: 'HYMN.HC', icon: '📝', type: 'file' },
      { name: 'TEMPLE.GFX', icon: '🖼️', type: 'file' },
    ];

    return `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; padding: 10px;">
        ${files.map(f => `
          <div class="desktop-icon" style="cursor: pointer;">
            <span class="icon">${f.icon}</span>
            <span class="label" style="font-size: 12px;">${f.name}</span>
          </div>
        `).join('')}
      </div>
    `;
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
        response = `<div class="terminal-line success">♪ Playing "Amazing Grace"... ♪</div>`;
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
