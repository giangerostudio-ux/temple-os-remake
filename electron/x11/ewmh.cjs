const { execFile } = require('child_process');

function execFileAsync(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { ...options, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        const e = new Error(stderr?.toString?.() || err.message || String(err));
        e.code = err.code;
        e.stdout = stdout?.toString?.() || '';
        e.stderr = stderr?.toString?.() || '';
        return reject(e);
      }
      resolve({ stdout: stdout?.toString?.() || '', stderr: stderr?.toString?.() || '' });
    });
  });
}

async function commandExists(cmd) {
  try {
    await execFileAsync('sh', ['-lc', `command -v ${cmd} >/dev/null 2>&1`]);
    return true;
  } catch {
    return false;
  }
}

function parseHexWindowId(text) {
  const m = String(text || '').match(/0x[0-9a-fA-F]+/);
  if (!m) return null;
  const hex = m[0].toLowerCase();
  if (hex === '0x0') return null;
  return hex;
}

function parseWmctrlList(output) {
  const lines = String(output || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  /** @type {Array<{xidHex:string, desktop:number|null, pid:number|null, wmClass:string|null, title:string}>} */
  const out = [];
  for (const line of lines) {
    // Example: 0x03a00007  0  3039 host Firefox.Firefox  Mozilla Firefox
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    const xidHex = parts[0].toLowerCase();
    if (!xidHex.startsWith('0x')) continue;
    const desktop = Number.isFinite(Number(parts[1])) ? Number(parts[1]) : null;
    const pid = Number.isFinite(Number(parts[2])) ? Number(parts[2]) : null;
    const wmClass = parts[4] || null;
    const title = parts.slice(5).join(' ') || '';
    out.push({ xidHex, desktop, pid, wmClass, title });
  }
  return out;
}

async function getActiveWindowXidHex() {
  const { stdout } = await execFileAsync('xprop', ['-root', '_NET_ACTIVE_WINDOW']);
  return parseHexWindowId(stdout);
}

async function getWindowState(xidHex) {
  if (!xidHex) return { fullscreen: false, hidden: false, above: false, skipTaskbar: false, windowType: null };
  const { stdout } = await execFileAsync('xprop', ['-id', xidHex, '_NET_WM_STATE', 'WM_STATE', '_NET_WM_WINDOW_TYPE']);
  const s = stdout || '';
  const fullscreen = /_NET_WM_STATE_FULLSCREEN/.test(s);
  // Some WMs set WM_STATE=Iconic but do not always include _NET_WM_STATE_HIDDEN.
  const hidden = /_NET_WM_STATE_HIDDEN/.test(s) || /WM_STATE\\(WM_STATE\\):\\s*window state:\\s*Iconic/i.test(s);
  const above = /_NET_WM_STATE_ABOVE/.test(s);
  const skipTaskbar = /_NET_WM_STATE_SKIP_TASKBAR/.test(s) || /_NET_WM_WINDOW_TYPE_DOCK/.test(s);
  const windowTypeMatch = s.match(/_NET_WM_WINDOW_TYPE\\(ATOM\\)\\s*=\\s*(.*)$/m);
  const windowType = windowTypeMatch ? windowTypeMatch[1].trim() : null;
  return { fullscreen, hidden, above, skipTaskbar, windowType };
}

async function listClientWindows() {
  // -l list, -p pid, -x WM_CLASS
  const { stdout } = await execFileAsync('wmctrl', ['-lpx']);
  return parseWmctrlList(stdout);
}

async function activateWindow(xidHex) {
  await execFileAsync('wmctrl', ['-ia', xidHex]);
}

async function closeWindow(xidHex) {
  await execFileAsync('wmctrl', ['-ic', xidHex]);
}

async function minimizeWindow(xidHex) {
  await execFileAsync('wmctrl', ['-ir', xidHex, '-b', 'add,hidden']);
}

async function unminimizeWindow(xidHex) {
  // Some WMs iconify windows by setting ICCCM WM_STATE=Iconic without setting
  // _NET_WM_STATE_HIDDEN. In that case, removing "hidden" is a no-op.
  // Activating via wmctrl generally de-iconifies in both cases.
  try {
    await execFileAsync('wmctrl', ['-ir', xidHex, '-b', 'remove,hidden']);
  } catch {
    // ignore
  }
  await execFileAsync('wmctrl', ['-ia', xidHex]);
}

async function setAlwaysOnTop(xidHex, enabled) {
  await execFileAsync('wmctrl', ['-ir', xidHex, '-b', `${enabled ? 'add' : 'remove'},above`]);
}

async function setMaximized(xidHex, enabled) {
  const mode = enabled ? 'add' : 'remove';
  await execFileAsync('wmctrl', ['-ir', xidHex, '-b', `${mode},maximized_vert,maximized_horz`]);
}

async function setWindowGeometry(xidHex, x, y, width, height) {
  const xi = Number.isFinite(x) ? Math.trunc(x) : -1;
  const yi = Number.isFinite(y) ? Math.trunc(y) : -1;
  const wi = Number.isFinite(width) ? Math.max(1, Math.trunc(width)) : -1;
  const hi = Number.isFinite(height) ? Math.max(1, Math.trunc(height)) : -1;

  // If a window is maximized, many WMs ignore manual geometry until maximize is cleared.
  await execFileAsync('wmctrl', ['-ir', xidHex, '-b', 'remove,maximized_vert,maximized_horz']).catch(() => { });
  await execFileAsync('wmctrl', ['-ir', xidHex, '-e', `0,${xi},${yi},${wi},${hi}`]);
}

function fingerprintSnapshot(snap) {
  const ids = (snap?.windows || [])
    .map(w => `${w.xidHex}:${w?.minimized ? '1' : '0'}:${w?.alwaysOnTop ? '1' : '0'}`)
    .sort()
    .join(',');
  return `${ids}|active=${snap?.activeXidHex || ''}|fs=${snap?.activeFullscreen ? '1' : '0'}`;
}

/**
 * @param {{pollMs?:number, includeHidden?:boolean, ignoreXids?:Set<string>}} options
 */
async function createEwmhBridge(options = {}) {
  const pollMs = Number.isFinite(options.pollMs) ? options.pollMs : 750;
  const includeHidden = !!options.includeHidden;
  const ignoreXids = options.ignoreXids || new Set();

  const supported = process.platform === 'linux'
    && !!process.env.DISPLAY
    && !process.env.WAYLAND_DISPLAY
    && process.env.XDG_SESSION_TYPE !== 'wayland'
    && (await commandExists('wmctrl'))
    && (await commandExists('xprop'));

  /** @type {Array<(snap:any)=>void>} */
  const listeners = [];

  let timer = null;
  let lastFingerprint = '';
  let lastSnapshot = { supported, windows: [], activeXidHex: null, activeFullscreen: false };

  async function readSnapshot() {
    if (!supported) return { supported: false, windows: [], activeXidHex: null, activeFullscreen: false };

    const activeXidHex = await getActiveWindowXidHex().catch(() => null);
    const state = activeXidHex ? await getWindowState(activeXidHex).catch(() => ({ fullscreen: false })) : { fullscreen: false };

    const windowsRaw = await listClientWindows().catch(() => []);
    const windows = [];
    for (const w of windowsRaw) {
      if (!w?.xidHex) continue;
      if (ignoreXids.has(w.xidHex)) continue;
      if (!includeHidden) {
        // Best-effort: treat docks and explicit skip-taskbar as non-task windows
        const st = await getWindowState(w.xidHex).catch(() => null);
        if (st?.skipTaskbar) continue;
        // Don't filter hidden (minimized) windows, just mark them
        if (st?.hidden) {
          w.minimized = true;
        }
        if (st?.above) {
          w.alwaysOnTop = true;
        }
      }
      windows.push(w);
    }

    return { supported: true, windows, activeXidHex, activeFullscreen: !!state.fullscreen };
  }

  async function tick() {
    const snap = await readSnapshot().catch(() => ({ supported: false, windows: [], activeXidHex: null, activeFullscreen: false }));
    const fp = fingerprintSnapshot(snap);
    lastSnapshot = snap;
    if (fp === lastFingerprint) return;
    lastFingerprint = fp;
    for (const fn of listeners) {
      try { fn(snap); } catch { /* ignore */ }
    }
  }

  async function refreshNow() {
    if (!supported) return;
    await tick();
  }

  function start() {
    if (!supported) return;
    if (timer) return;
    timer = setInterval(() => { void tick(); }, pollMs);
    void tick();
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  return {
    supported,
    start,
    stop,
    refreshNow,
    getSnapshot: () => lastSnapshot,
    onChange: (fn) => { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    activateWindow,
    closeWindow,
    minimizeWindow,
    unminimizeWindow,
    setAlwaysOnTop,
    setMaximized,
    setWindowGeometry,
  };
}

module.exports = {
  createEwmhBridge,
  parseHexWindowId,
  getActiveWindowXidHex,
};
