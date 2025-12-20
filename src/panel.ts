import './style.css';

type X11Window = {
  xidHex: string;
  title: string;
  wmClass?: string | null;
  active?: boolean;
  iconUrl?: string | null;
  appName?: string | null;
  minimized?: boolean;
};

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class TemplePanel {
  private x11Windows: X11Window[] = [];


  constructor() {
    this.init().catch(() => { /* ignore */ });
  }

  private async init(): Promise<void> {
    await this.refreshX11Windows();

    if (window.electronAPI?.onX11WindowsChanged) {
      window.electronAPI.onX11WindowsChanged((payload: any) => {
        const wins = Array.isArray(payload?.windows) ? payload.windows : [];
        this.x11Windows = wins;


        this.render();
      });
    }

    setInterval(() => this.renderClock(), 1000);

    this.render();
  }

  private async refreshX11Windows(): Promise<void> {
    if (!window.electronAPI?.getX11Windows) return;
    const res = await window.electronAPI.getX11Windows();
    if (!res?.success || !res.supported) return;
    const wins = Array.isArray(res.snapshot?.windows) ? res.snapshot.windows : [];
    this.x11Windows = wins;


    this.render();
  }

  private renderClock(): void {
    const el = document.getElementById('panel-clock');
    if (!el) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `${hh}:${mm}`;
  }



  private visibleX11Windows(): X11Window[] {
    const wins = Array.isArray(this.x11Windows) ? this.x11Windows : [];
    return wins
      .filter(w => w && w.xidHex && (w.title || w.appName || w.wmClass))
      .slice(0, 20);
  }

  private wireEvents(): void {
    const startBtn = document.getElementById('panel-start');
    if (startBtn) {
      startBtn.onclick = () => {
        if (window.electronAPI?.panelToggleStartMenu) {
          void window.electronAPI.panelToggleStartMenu();
        }
      };
    }

    const x11List = document.getElementById('panel-x11-windows');
    if (x11List) {
      x11List.onclick = (e) => {
        const t = e.target as HTMLElement;
        const item = t.closest('.panel-x11-item') as HTMLElement | null;
        if (!item) return;
        const xid = item.dataset.xid || '';
        if (!xid) return;

        const win = this.x11Windows.find(w => w.xidHex === xid);
        if (!win) return;

        // Windows-like taskbar behavior:
        // - If minimized, restore + focus.
        // - If not active, activate (bring to front).
        // - If active, minimize.
        if (win.minimized) {
          if (window.electronAPI?.unminimizeX11Window) {
            void window.electronAPI.unminimizeX11Window(xid).then(() => void window.electronAPI?.activateX11Window?.(xid));
          } else if (window.electronAPI?.activateX11Window) {
            void window.electronAPI.activateX11Window(xid);
          }
          return;
        }

        if (!win.active) {
          void window.electronAPI?.activateX11Window?.(xid);
          return;
        }

        void window.electronAPI?.minimizeX11Window?.(xid);
      };

      x11List.oncontextmenu = (e) => {
        e.preventDefault();
        const t = e.target as HTMLElement;
        const item = t.closest('.panel-x11-item') as HTMLElement | null;
        if (!item) return;
        const xid = item.dataset.xid || '';
        if (!xid) return;
        this.showContextMenu(e.clientX, e.clientY, xid);
      };
    }
  }

  render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const x11Wins = this.visibleX11Windows();
    const x11Html = x11Wins.map(w => {
      const icon = w.iconUrl
        ? `<img class="panel-task-icon" src="${escapeHtml(w.iconUrl)}" alt="">`
        : `<div class="panel-task-icon panel-task-icon-fallback"></div>`;
      const title = w.title || w.appName || w.wmClass || 'App';
      return `
        <div class="panel-x11-item ${w.active ? 'active' : ''} ${w.minimized ? 'minimized' : ''}" data-xid="${escapeHtml(w.xidHex)}" title="${escapeHtml(title)}">
          ${icon}
          <div class="panel-task-title">${escapeHtml(title)}</div>
        </div>
      `;
    }).join('');

    app.innerHTML = `
      <div class="taskbar panel-taskbar">
        <button class="start-btn" id="panel-start">TEMPLE</button>
        <div class="panel-sep"></div>
        <div class="panel-x11" id="panel-x11-windows">
          ${x11Html || '<div class="panel-empty">No external windows</div>'}
        </div>
        <div class="taskbar-tray">
          <div id="panel-clock" class="panel-clock">--:--</div>
        </div>
      </div>
      </div>
      <div id="panel-context-menu-container"></div>
    `;

    this.renderClock();
    this.wireEvents();
  }

  private showContextMenu(x: number, _y: number, xid: string): void {
    const container = document.getElementById('panel-context-menu-container');
    if (!container) return;

    // Close existing
    container.innerHTML = '';

    const win = this.x11Windows.find(w => w.xidHex === xid);
    if (!win) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${x}px;
      bottom: 60px; /* Above panel */
      background: rgba(13, 17, 23, 0.98);
      border: 1px solid rgba(0, 255, 65, 0.3);
      border-radius: 6px;
      padding: 6px 0;
      min-width: 160px;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
      font-family: 'VT323', monospace;
    `;

    const items = [
      {
        label: win.minimized ? 'Restore' : (win.active ? 'Minimize' : 'Activate'),
        action: () => {
          if (win.minimized) {
            if (window.electronAPI?.unminimizeX11Window) {
              void window.electronAPI.unminimizeX11Window(xid).then(() => void window.electronAPI?.activateX11Window?.(xid));
            } else if (window.electronAPI?.activateX11Window) {
              void window.electronAPI.activateX11Window(xid);
            }
            return;
          }

          if (!win.active) {
            void window.electronAPI?.activateX11Window?.(xid);
            return;
          }

          if (window.electronAPI?.minimizeX11Window) {
            void window.electronAPI.minimizeX11Window(xid);
          }
        }
      },
      {
        label: 'Close Window',
        action: () => {
          if (window.electronAPI?.closeX11Window) {
            window.electronAPI.closeX11Window(xid);
          }
        }
      }
    ];

    items.forEach(item => {
      const el = document.createElement('div');
      el.textContent = item.label;
      el.style.cssText = `
        padding: 8px 14px;
        cursor: pointer;
        color: #00ff41;
        font-size: 18px;
      `;
      el.onmouseenter = () => el.style.background = 'rgba(0, 255, 65, 0.15)';
      el.onmouseleave = () => el.style.background = 'transparent';
      el.onclick = () => {
        item.action();
        container.innerHTML = '';
      };
      menu.appendChild(el);
    });

    // Close on outside click
    const closer = document.createElement('div');
    closer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
    closer.onclick = () => {
      container.innerHTML = '';
    };

    container.appendChild(closer);
    container.appendChild(menu);
  }
}

new TemplePanel();
