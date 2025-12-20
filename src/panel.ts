import './style.css';

type X11Window = {
  xidHex: string;
  title: string;
  wmClass?: string | null;
  active?: boolean;
  iconUrl?: string | null;
  appName?: string | null;
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

  private async activateWindow(xidHex: string): Promise<void> {
    if (!window.electronAPI?.activateX11Window) return;
    await window.electronAPI.activateX11Window(xidHex);
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
        void this.activateWindow(xid);
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
        <div class="panel-x11-item ${w.active ? 'active' : ''}" data-xid="${escapeHtml(w.xidHex)}" title="${escapeHtml(title)}">
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
    `;

    this.renderClock();
    this.wireEvents();
  }
}

new TemplePanel();
