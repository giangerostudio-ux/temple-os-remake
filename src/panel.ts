import './style.css';

import type { InstalledApp } from './utils/types';
import type { SearchIndexEntry } from './utils/appSearch';
import { buildSearchIndex, searchIndex } from './utils/appSearch';

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
  private installedApps: InstalledApp[] = [];
  private searchEntries: SearchIndexEntry<InstalledApp>[] = [];
  private x11Windows: X11Window[] = [];
  private menuOpen = false;
  private searchQuery = '';

  constructor() {
    this.init().catch(() => { /* ignore */ });
  }

  private async init(): Promise<void> {
    await this.refreshInstalledApps();
    await this.refreshX11Windows();

    if (window.electronAPI?.onAppsChanged) {
      window.electronAPI.onAppsChanged(() => void this.refreshInstalledApps());
    }
    if (window.electronAPI?.onX11WindowsChanged) {
      window.electronAPI.onX11WindowsChanged((payload: any) => {
        const wins = Array.isArray(payload?.windows) ? payload.windows : [];
        this.x11Windows = wins;
        this.render();
      });
    }

    setInterval(() => this.renderClock(), 1000);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.menuOpen) {
        e.preventDefault();
        this.menuOpen = false;
        this.render();
      }
    }, { capture: true });

    this.render();
  }

  private async refreshInstalledApps(): Promise<void> {
    if (!window.electronAPI?.getInstalledApps) return;
    const res = await window.electronAPI.getInstalledApps();
    if (!res?.success) return;
    this.installedApps = res.apps || [];
    this.searchEntries = buildSearchIndex(this.installedApps);
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

  private async closeWindow(xidHex: string): Promise<void> {
    if (!window.electronAPI?.closeX11Window) return;
    await window.electronAPI.closeX11Window(xidHex);
  }

  private async launchInstalledAppById(appId: string): Promise<void> {
    const app = this.installedApps.find(a => a.id === appId);
    if (!app || !window.electronAPI?.launchApp) return;
    await window.electronAPI.launchApp(app);
  }

  private visibleX11Windows(): X11Window[] {
    const wins = Array.isArray(this.x11Windows) ? this.x11Windows : [];
    return wins
      .filter(w => w && w.xidHex && (w.title || w.appName || w.wmClass))
      .slice(0, 20);
  }

  private renderMenuResults(): string {
    const q = this.searchQuery.trim();
    if (!q) {
      return `<div class="panel-menu-hint">Type to search installed apps...</div>`;
    }
    const results = searchIndex(this.searchEntries, q, 8);
    if (!results.length) return `<div class="panel-menu-hint">No results.</div>`;

    return results.map((app) => {
      const icon = app.iconUrl ? `<img class="panel-app-icon" src="${escapeHtml(app.iconUrl)}" alt="">` : `<div class="panel-app-icon panel-app-icon-fallback"></div>`;
      return `
        <div class="panel-result" data-launch-id="${escapeHtml(app.id || '')}" role="button" tabindex="0">
          ${icon}
          <div class="panel-result-text">
            <div class="panel-result-name">${escapeHtml(app.name || '')}</div>
            <div class="panel-result-sub">${escapeHtml(app.genericName || app.comment || '')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  private wireEvents(): void {
    const startBtn = document.getElementById('panel-start');
    if (startBtn) {
      startBtn.onclick = () => {
        this.menuOpen = !this.menuOpen;
        this.searchQuery = '';
        this.render();
        setTimeout(() => {
          const input = document.getElementById('panel-search') as HTMLInputElement | null;
          input?.focus();
        }, 0);
      };
    }

    const menu = document.getElementById('panel-menu');
    if (menu) {
      menu.onclick = (e) => {
        const t = e.target as HTMLElement;
        const item = t.closest('.panel-result') as HTMLElement | null;
        if (item) {
          const id = item.dataset.launchId || '';
          if (id) {
            void this.launchInstalledAppById(id);
            this.menuOpen = false;
            this.render();
          }
        }
      };
    }

    const search = document.getElementById('panel-search') as HTMLInputElement | null;
    if (search) {
      search.oninput = () => {
        this.searchQuery = search.value;
        const resEl = document.getElementById('panel-results');
        if (resEl) resEl.innerHTML = this.renderMenuResults();
      };
      search.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const first = document.querySelector('.panel-result') as HTMLElement | null;
          const id = first?.dataset.launchId || '';
          if (id) {
            e.preventDefault();
            void this.launchInstalledAppById(id);
            this.menuOpen = false;
            this.render();
          }
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
      x11List.oncontextmenu = (e) => {
        const t = e.target as HTMLElement;
        const item = t.closest('.panel-x11-item') as HTMLElement | null;
        if (!item) return;
        e.preventDefault();
        const xid = item.dataset.xid || '';
        if (!xid) return;
        void this.closeWindow(xid);
      };
    }

    const overlay = document.getElementById('panel-menu-overlay');
    if (overlay) {
      overlay.onclick = () => {
        this.menuOpen = false;
        this.render();
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
        <button class="start-btn ${this.menuOpen ? 'active' : ''}" id="panel-start">TEMPLE</button>
        <div class="panel-sep"></div>
        <div class="panel-x11" id="panel-x11-windows">
          ${x11Html || '<div class="panel-empty">No external windows</div>'}
        </div>
        <div class="taskbar-tray">
          <div id="panel-clock" class="panel-clock">--:--</div>
        </div>
      </div>

      ${this.menuOpen ? `
        <div id="panel-menu-overlay" class="panel-menu-overlay"></div>
        <div id="panel-menu" class="panel-menu">
          <input id="panel-search" class="panel-search" placeholder="Search installed apps..." />
          <div id="panel-results" class="panel-results">
            ${this.renderMenuResults()}
          </div>
          <div class="panel-menu-footer">
            Left click: focus window. Right click: close window.
          </div>
        </div>
      ` : ''}
    `;

    this.renderClock();
    this.wireEvents();
  }
}

new TemplePanel();
