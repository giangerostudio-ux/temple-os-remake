const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

// PTY support (for real terminal)
let pty = null;
try {
    pty = require('node-pty');
} catch (e) {
    console.warn('node-pty not available, PTY terminal disabled:', e.message);
}
const ptyProcesses = new Map(); // id -> { pty, cwd }

let mainWindow;
let lastCpuTotals = null; // { idle: number, total: number }
let lastNetTotals = null; // { rx: number, tx: number }
let lastNetAt = 0;


function execAsync(command, options = {}) {
    return new Promise((resolve) => {
        exec(command, { maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
            resolve({ error, stdout: stdout || '', stderr: stderr || '' });
        });
    });
}

function shEscape(value) {
    // Safe-ish for wrapping in double quotes in sh.
    // (Not a full shell-escape; good enough for SSIDs/passwords/ids passed to nmcli/pactl/etc.)
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildSwayEnvPrefix() {
    if (process.env.SWAYSOCK) return `SWAYSOCK="${shEscape(process.env.SWAYSOCK)}"`;
    if (process.env.XDG_RUNTIME_DIR) return `SWAYSOCK=$(ls "${shEscape(process.env.XDG_RUNTIME_DIR)}"/sway*.sock 2>/dev/null | head -1)`;
    return '';
}

function cpuTotals() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
        const t = cpu.times || {};
        idle += t.idle || 0;
        total += (t.user || 0) + (t.nice || 0) + (t.sys || 0) + (t.irq || 0) + (t.idle || 0);
    }
    return { idle, total };
}

async function linuxNetTotals() {
    const raw = await fs.promises.readFile('/proc/net/dev', 'utf-8');
    let rx = 0;
    let tx = 0;
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Inter-') || trimmed.startsWith('face')) continue;
        const parts = trimmed.split(':');
        if (parts.length < 2) continue;
        const iface = parts[0].trim();
        if (!iface || iface === 'lo') continue;
        const fields = parts[1].trim().split(/\s+/);
        if (fields.length < 9) continue;
        const rxBytes = parseInt(fields[0], 10);
        const txBytes = parseInt(fields[8], 10);
        if (Number.isFinite(rxBytes)) rx += rxBytes;
        if (Number.isFinite(txBytes)) tx += txBytes;
    }
    return { rx, tx };
}

async function listRatbagDevices() {
    if (process.platform !== 'linux') return [];
    const res = await execAsync('ratbagctl list 2>/dev/null');
    if (res.error || !res.stdout) return [];
    const devices = [];
    for (const line of res.stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const m = trimmed.match(/^([^:]+):\s*(.+)$/);
        if (!m) continue;
        devices.push({ id: m[1].trim(), name: m[2].trim() });
    }
    return devices;
}

function getLinuxTrashPaths() {
    const base = path.join(os.homedir(), '.local', 'share', 'Trash');
    return {
        base,
        files: path.join(base, 'files'),
        info: path.join(base, 'info')
    };
}

async function ensureLinuxTrash() {
    const t = getLinuxTrashPaths();
    await fs.promises.mkdir(t.files, { recursive: true });
    await fs.promises.mkdir(t.info, { recursive: true });
    return t;
}

function isoTrashTimestamp(date = new Date()) {
    // Use local time, ISO-like (freedesktop format uses ISO-ish)
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function trashInfoText(originalPath, deletionDate) {
    // Path should be URI-escaped per spec; use encodeURI to keep slashes.
    const encoded = encodeURI(originalPath);
    return `[Trash Info]\nPath=${encoded}\nDeletionDate=${deletionDate}\n`;
}

async function moveToLinuxTrash(itemPath) {
    const t = await ensureLinuxTrash();
    const stat = await fs.promises.stat(itemPath);
    const baseName = path.basename(itemPath);

    let name = baseName;
    let destPath = path.join(t.files, name);
    let counter = 1;
    while (true) {
        try {
            await fs.promises.access(destPath);
            const ext = path.extname(baseName);
            const stem = ext ? baseName.slice(0, -ext.length) : baseName;
            name = `${stem}_${Date.now()}_${counter}${ext}`;
            destPath = path.join(t.files, name);
            counter++;
        } catch {
            break;
        }
    }

    const deletionDate = isoTrashTimestamp(new Date());
    const infoPath = path.join(t.info, `${name}.trashinfo`);

    // Try rename first; fall back to copy+delete for cross-device moves.
    try {
        await fs.promises.rename(itemPath, destPath);
    } catch (e) {
        if (stat.isDirectory()) {
            if (fs.promises.cp) await fs.promises.cp(itemPath, destPath, { recursive: true });
            else throw e;
            await fs.promises.rm(itemPath, { recursive: true, force: true });
        } else {
            await fs.promises.copyFile(itemPath, destPath);
            await fs.promises.unlink(itemPath);
        }
    }

    await fs.promises.writeFile(infoPath, trashInfoText(itemPath, deletionDate), 'utf-8');
    return { name, trashPath: destPath, originalPath: itemPath, deletionDate };
}

async function listLinuxTrash() {
    const t = await ensureLinuxTrash();
    const files = await fs.promises.readdir(t.files).catch(() => []);
    const results = [];

    for (const name of files) {
        const trashPath = path.join(t.files, name);
        const infoPath = path.join(t.info, `${name}.trashinfo`);
        let originalPath = '';
        let deletionDate = '';

        try {
            const raw = await fs.promises.readFile(infoPath, 'utf-8');
            const mPath = raw.match(/^Path=(.+)$/m);
            const mDate = raw.match(/^DeletionDate=(.+)$/m);
            if (mPath) originalPath = decodeURI(mPath[1].trim());
            if (mDate) deletionDate = mDate[1].trim();
        } catch {
            // ignore
        }

        let stat = null;
        try { stat = await fs.promises.stat(trashPath); } catch { }
        results.push({
            name,
            trashPath,
            originalPath,
            deletionDate,
            isDirectory: stat ? stat.isDirectory() : false,
            size: stat ? stat.size : 0
        });
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
}

async function restoreLinuxTrash(trashPath, originalPath) {
    const t = getLinuxTrashPaths();
    const resolvedTrash = path.resolve(trashPath || '');
    const resolvedFiles = path.resolve(t.files);
    if (!resolvedTrash.startsWith(resolvedFiles + path.sep)) {
        throw new Error('Invalid trash path');
    }
    const name = path.basename(resolvedTrash);
    const infoPath = path.join(t.info, `${name}.trashinfo`);

    const dest = originalPath ? path.resolve(originalPath) : null;
    if (!dest) throw new Error('Missing original path');

    await fs.promises.mkdir(path.dirname(dest), { recursive: true }).catch(() => { });

    let finalDest = dest;
    try {
        await fs.promises.access(finalDest);
        const ext = path.extname(finalDest);
        const stem = ext ? finalDest.slice(0, -ext.length) : finalDest;
        finalDest = `${stem}.restored_${Date.now()}${ext}`;
    } catch {
        // ok
    }

    await fs.promises.rename(resolvedTrash, finalDest);
    await fs.promises.rm(infoPath, { force: true }).catch(() => { });
    return { restoredPath: finalDest };
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: false,           // Custom title bar
        fullscreen: false,      // Start windowed
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    // Load Vite dev server or built files
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message} (${sourceId}:${line})`);
    });
}

app.whenReady().then(createWindow);

// ============================================
// WINDOW CONTROL IPC
// ============================================
ipcMain.handle('close-window', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

// ============================================
// FILESYSTEM IPC
// ============================================
ipcMain.handle('fs:readdir', async (event, dirPath) => {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const results = [];

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            let size = 0;
            let modified = null;

            try {
                const stats = await fs.promises.stat(fullPath);
                size = stats.size;
                modified = stats.mtime.toISOString();
            } catch (e) {
                // Permission denied or other error
            }

            results.push({
                name: entry.name,
                isDirectory: entry.isDirectory(),
                path: fullPath,
                size,
                modified
            });
        }

        // Sort: directories first, then files, alphabetically
        results.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return { success: true, entries: results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:delete', async (event, itemPath) => {
    try {
        const stat = await fs.promises.stat(itemPath);
        if (stat.isDirectory()) {
            await fs.promises.rm(itemPath, { recursive: true });
        } else {
            await fs.promises.unlink(itemPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:trash', async (event, itemPath) => {
    try {
        const target = String(itemPath || '');
        if (!target) return { success: false, error: 'Invalid path' };

        if (process.platform === 'linux') {
            const moved = await moveToLinuxTrash(target);
            return { success: true, entry: moved };
        }

        if (shell && typeof shell.trashItem === 'function') {
            await shell.trashItem(target);
            return { success: true };
        }

        return { success: false, error: 'Trash not supported on this platform' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:listTrash', async () => {
    try {
        if (process.platform !== 'linux') return { success: true, entries: [] };
        const entries = await listLinuxTrash();
        return { success: true, entries };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:restoreTrash', async (event, payload) => {
    try {
        if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
        const trashPath = payload && typeof payload.trashPath === 'string' ? payload.trashPath : '';
        const originalPath = payload && typeof payload.originalPath === 'string' ? payload.originalPath : '';
        const restored = await restoreLinuxTrash(trashPath, originalPath);
        return { success: true, restored };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:deleteTrashItem', async (event, trashPath) => {
    try {
        if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
        const t = getLinuxTrashPaths();
        const resolvedTrash = path.resolve(String(trashPath || ''));
        const resolvedFiles = path.resolve(t.files);
        if (!resolvedTrash.startsWith(resolvedFiles + path.sep)) throw new Error('Invalid trash path');
        const name = path.basename(resolvedTrash);
        const infoPath = path.join(t.info, `${name}.trashinfo`);
        const stat = await fs.promises.stat(resolvedTrash);
        if (stat.isDirectory()) await fs.promises.rm(resolvedTrash, { recursive: true, force: true });
        else await fs.promises.unlink(resolvedTrash);
        await fs.promises.rm(infoPath, { force: true }).catch(() => { });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:emptyTrash', async () => {
    try {
        if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
        const t = await ensureLinuxTrash();
        await fs.promises.rm(t.files, { recursive: true, force: true });
        await fs.promises.rm(t.info, { recursive: true, force: true });
        await ensureLinuxTrash();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:mkdir', async (event, dirPath) => {
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
    try {
        await fs.promises.rename(oldPath, newPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:copy', async (event, srcPath, destPath) => {
    try {
        const stat = await fs.promises.stat(srcPath);
        if (stat.isDirectory()) {
            if (fs.promises.cp) {
                await fs.promises.cp(srcPath, destPath, { recursive: true });
            } else {
                // Very old Node fallback: simple recursive copy
                await fs.promises.mkdir(destPath, { recursive: true });
                const entries = await fs.promises.readdir(srcPath, { withFileTypes: true });
                for (const entry of entries) {
                    const s = path.join(srcPath, entry.name);
                    const d = path.join(destPath, entry.name);
                    if (entry.isDirectory()) {
                        await fs.promises.mkdir(d, { recursive: true });
                        // recurse by re-invoking handler logic
                        if (fs.promises.cp) {
                            await fs.promises.cp(s, d, { recursive: true });
                        } else {
                            // naive: call self recursively via stack
                            const queue = [{ s, d }];
                            while (queue.length) {
                                const { s: qs, d: qd } = queue.pop();
                                await fs.promises.mkdir(qd, { recursive: true });
                                const e2 = await fs.promises.readdir(qs, { withFileTypes: true });
                                for (const e of e2) {
                                    const ss = path.join(qs, e.name);
                                    const dd = path.join(qd, e.name);
                                    if (e.isDirectory()) queue.push({ s: ss, d: dd });
                                    else await fs.promises.copyFile(ss, dd);
                                }
                            }
                        }
                    } else {
                        await fs.promises.copyFile(s, d);
                    }
                }
            }
        } else {
            await fs.promises.copyFile(srcPath, destPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:getHome', () => os.homedir());
ipcMain.handle('fs:getAppPath', () => app.getAppPath());

ipcMain.handle('fs:openExternal', async (event, filePath) => {
    try {
        const target = String(filePath || '');
        if (target.startsWith('http://') || target.startsWith('https://')) {
            await shell.openExternal(target);
        } else {
            await shell.openPath(target);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// SYSTEM IPC
// ============================================
ipcMain.handle('system:shutdown', () => {
    exec('systemctl poweroff');
});

ipcMain.handle('system:restart', () => {
    exec('systemctl reboot');
});

ipcMain.handle('system:lock', () => {
    // Lock screen - this will be handled by the UI
    mainWindow.webContents.send('lock-screen');
});

ipcMain.handle('system:info', () => ({
    platform: os.platform(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    memory: {
        total: os.totalmem(),
        free: os.freemem()
    },
    cpus: os.cpus().length,
    user: os.userInfo().username
}));

ipcMain.handle('monitor:getStats', async () => {
    try {
        let cpuPercent = null;
        try {
            const now = cpuTotals();
            if (lastCpuTotals && now.total > lastCpuTotals.total) {
                const idleDelta = now.idle - lastCpuTotals.idle;
                const totalDelta = now.total - lastCpuTotals.total;
                if (totalDelta > 0) cpuPercent = Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
            }
            lastCpuTotals = now;
        } catch {
            // ignore
        }

        const memTotal = os.totalmem();
        const memFree = os.freemem();
        const memUsed = Math.max(0, memTotal - memFree);

        let disk = null;
        if (process.platform !== 'win32') {
            const df = await execAsync('df -kP / 2>/dev/null');
            const lines = (df.stdout || '').trim().split('\n').filter(Boolean);
            if (lines.length >= 2) {
                const fields = lines[1].trim().split(/\s+/);
                const totalKb = parseInt(fields[1], 10);
                const usedKb = parseInt(fields[2], 10);
                const availKb = parseInt(fields[3], 10);
                const usePctStr = fields[4] || '';
                const usePct = parseInt(usePctStr.replace('%', ''), 10);
                if (Number.isFinite(totalKb) && totalKb > 0) {
                    disk = {
                        total: totalKb * 1024,
                        used: (Number.isFinite(usedKb) ? usedKb : 0) * 1024,
                        avail: (Number.isFinite(availKb) ? availKb : 0) * 1024,
                        percent: Number.isFinite(usePct) ? usePct : null
                    };
                }
            }
        }

        let network = null;
        if (process.platform === 'linux') {
            try {
                const nowAt = Date.now();
                const totals = await linuxNetTotals();
                let rxBps = 0;
                let txBps = 0;
                if (lastNetTotals && lastNetAt) {
                    const dt = Math.max(0.001, (nowAt - lastNetAt) / 1000);
                    rxBps = Math.max(0, (totals.rx - lastNetTotals.rx) / dt);
                    txBps = Math.max(0, (totals.tx - lastNetTotals.tx) / dt);
                }
                lastNetTotals = totals;
                lastNetAt = nowAt;
                network = { rxBps, txBps, rxBytes: totals.rx, txBytes: totals.tx };
            } catch {
                // ignore
            }
        }

        return {
            success: true,
            stats: {
                platform: os.platform(),
                hostname: os.hostname(),
                uptime: os.uptime(),
                loadavg: os.loadavg(),
                cpuPercent,
                cpuCores: os.cpus().length,
                memory: { total: memTotal, free: memFree, used: memUsed },
                disk,
                network
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('process:list', async () => {
    if (process.platform !== 'linux') {
        return { success: true, processes: [], unsupported: true };
    }

    const cmd = 'LC_ALL=C ps -eo pid=,comm=,%cpu=,%mem=,rss=,etime=,args= --sort=-%cpu | head -n 200';
    const res = await execAsync(cmd);
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'ps failed' };

    const processes = [];
    for (const line of (res.stdout || '').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const m = trimmed.match(/^(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\S+)(?:\s+(.*))?$/);
        if (!m) continue;
        const pid = parseInt(m[1], 10);
        const name = m[2] || '';
        const cpu = parseFloat(m[3]);
        const mem = parseFloat(m[4]);
        const rssKb = parseInt(m[5], 10);
        const etime = m[6] || '';
        const command = (m[7] || '').trim();
        if (!Number.isFinite(pid)) continue;
        processes.push({
            pid,
            name,
            cpu: Number.isFinite(cpu) ? cpu : 0,
            mem: Number.isFinite(mem) ? mem : 0,
            rssKb: Number.isFinite(rssKb) ? rssKb : 0,
            etime,
            command
        });
    }

    return { success: true, processes };
});

ipcMain.handle('process:kill', async (event, payload) => {
    if (process.platform !== 'linux') {
        return { success: false, error: 'Unsupported on this platform' };
    }

    const pid = Number(payload && payload.pid);
    const signal = String((payload && payload.signal) || 'TERM').toUpperCase();
    if (!Number.isFinite(pid) || pid <= 1) return { success: false, error: 'Invalid PID' };
    if (pid === process.pid) return { success: false, error: 'Refusing to kill TempleOS UI process' };
    if (!['TERM', 'KILL'].includes(signal)) return { success: false, error: 'Invalid signal' };

    const res = await execAsync(`kill -${signal} ${Math.floor(pid)}`);
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'kill failed' };
    return { success: true };
});

// ============================================
// CONFIG IPC (persist settings)
// ============================================
const configPath = path.join(app.getPath('userData'), 'templeos.config.json');

ipcMain.handle('config:load', async () => {
    try {
        const raw = await fs.promises.readFile(configPath, 'utf-8');
        const data = JSON.parse(raw);
        return { success: true, config: data };
    } catch (error) {
        return { success: true, config: {} };
    }
});

ipcMain.handle('config:save', async (event, config) => {
    try {
        await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
        const tmp = configPath + '.tmp';
        await fs.promises.writeFile(tmp, JSON.stringify(config || {}, null, 2), 'utf-8');
        await fs.promises.rename(tmp, configPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('system:setVolume', (event, level) => {
    // Clamp level between 0 and 100
    const safeLevel = Math.max(0, Math.min(100, parseInt(level)));

    // Command depends on OS
    let command = '';
    if (process.platform === 'linux') {
        // amixer is standard on Ubuntu/Linux
        // -q = quiet, set Master 
        command = `amixer -q set Master ${safeLevel}%`;
    } else if (process.platform === 'win32') {
        // Windows needs nircmd or powershell script. For now, we skip.
        console.log(`[Windows] Mock volume set to ${safeLevel}%`);
        return;
    } else {
        return;
    }

    exec(command, (error) => {
        if (error) console.error(`Failed to set volume: ${error.message}`);
    });
});

// ============================================
// AUDIO DEVICES (PulseAudio / PipeWire via pactl)
// ============================================
ipcMain.handle('audio:listDevices', async () => {
    if (process.platform !== 'linux') {
        return { success: true, sinks: [], sources: [], defaultSink: null, defaultSource: null };
    }

    const info = await execAsync('pactl info 2>/dev/null');
    const sinks = await execAsync('pactl list sinks short 2>/dev/null');
    const sources = await execAsync('pactl list sources short 2>/dev/null');

    if (sinks.error && sources.error) {
        return { success: false, error: 'pactl not available' };
    }

    const parseShort = (txt) => txt
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => {
            const parts = l.split('\t');
            return {
                id: parts[0] || '',
                name: parts[1] || '',
                driver: parts[2] || '',
                state: parts[4] || '',
                description: parts[1] || ''
            };
        });

    const defaultSink = (info.stdout.match(/^Default Sink:\s*(.+)$/m) || [])[1] || null;
    const defaultSource = (info.stdout.match(/^Default Source:\s*(.+)$/m) || [])[1] || null;

    return {
        success: true,
        sinks: parseShort(sinks.stdout),
        sources: parseShort(sources.stdout),
        defaultSink,
        defaultSource
    };
});

ipcMain.handle('audio:setDefaultSink', async (event, sinkName) => {
    if (process.platform !== 'linux') return { success: true };
    const { error } = await execAsync(`pactl set-default-sink "${shEscape(sinkName)}" 2>/dev/null`);
    return error ? { success: false, error: error.message } : { success: true };
});

ipcMain.handle('audio:setDefaultSource', async (event, sourceName) => {
    if (process.platform !== 'linux') return { success: true };
    const { error } = await execAsync(`pactl set-default-source "${shEscape(sourceName)}" 2>/dev/null`);
    return error ? { success: false, error: error.message } : { success: true };
});

ipcMain.handle('audio:setVolume', async (event, level) => {
    const safeLevel = Math.max(0, Math.min(100, parseInt(level)));
    if (process.platform !== 'linux') return { success: true };

    // Prefer pactl when available; fall back to amixer.
    const pactlResult = await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${safeLevel}% 2>/dev/null`);
    if (!pactlResult.error) return { success: true };

    const amixerResult = await execAsync(`amixer -q set Master ${safeLevel}% 2>/dev/null`);
    return amixerResult.error ? { success: false, error: amixerResult.error.message } : { success: true };
});

// ============================================
// NETWORK (NetworkManager via nmcli)
// ============================================
ipcMain.handle('network:getStatus', async () => {
    if (process.platform !== 'linux') {
        return { success: true, status: { connected: false } };
    }

    const devStatus = await execAsync('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION dev status 2>/dev/null');
    if (devStatus.error) return { success: false, error: devStatus.error.message };

    const rows = devStatus.stdout.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = rows.map(r => {
        const [device, type, state, connection] = r.split(':');
        return { device, type, state, connection };
    });

    const active = parsed.find(p => p.state === 'connected') || parsed.find(p => p.state === 'connected (externally)');
    if (!active) return { success: true, status: { connected: false, devices: parsed } };

    let ip4 = null;
    const ipRes = await execAsync(`nmcli -t -f IP4.ADDRESS dev show "${shEscape(active.device)}" 2>/dev/null`);
    if (!ipRes.error) {
        const match = ipRes.stdout.match(/^IP4\\.ADDRESS\\[[0-9]+\\]:(.+)$/m);
        if (match) ip4 = match[1].trim();
    }

    let wifi = null;
    if (active.type === 'wifi') {
        const wifiRes = await execAsync('nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan no 2>/dev/null');
        if (!wifiRes.error) {
            const inUse = wifiRes.stdout.split('\n').map(l => l.trim()).find(l => l.startsWith('*:'));
            if (inUse) {
                const parts = inUse.split(':');
                wifi = {
                    ssid: (parts[1] || '').replace(/\\\\:/g, ':'),
                    signal: parseInt(parts[2] || '0', 10) || 0,
                    security: parts[3] || ''
                };
            }
        }
    }

    return {
        success: true,
        status: {
            connected: true,
            device: active.device,
            type: active.type,
            connection: active.connection,
            ip4,
            wifi,
            devices: parsed
        }
    };
});

ipcMain.handle('network:listWifi', async () => {
    if (process.platform !== 'linux') return { success: true, networks: [] };

    const res = await execAsync('nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan yes 2>/dev/null');
    if (res.error) return { success: false, error: res.error.message };

    const networks = res.stdout
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split(':');
            return {
                inUse: parts[0] === '*',
                ssid: (parts[1] || '').replace(/\\\\:/g, ':'),
                signal: parseInt(parts[2] || '0', 10) || 0,
                security: parts[3] || ''
            };
        })
        .filter(n => n.ssid);

    return { success: true, networks };
});

ipcMain.handle('network:connectWifi', async (event, ssid, password) => {
    if (process.platform !== 'linux') return { success: true };

    const pw = password ? ` password "${shEscape(password)}"` : '';
    const cmd = `nmcli dev wifi connect "${shEscape(ssid)}"${pw} 2>/dev/null`;
    const res = await execAsync(cmd);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true, output: res.stdout };
});

ipcMain.handle('network:disconnect', async () => {
    if (process.platform !== 'linux') return { success: true };

    const status = await execAsync('nmcli -t -f DEVICE,STATE dev status 2>/dev/null');
    if (status.error) return { success: false, error: status.error.message };

    const connected = status.stdout
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => l.split(':'))
        .find(parts => parts[1] === 'connected');

    if (!connected) return { success: true };

    const dev = connected[0];
    const res = await execAsync(`nmcli dev disconnect "${shEscape(dev)}" 2>/dev/null`);
    return res.error ? { success: false, error: res.stderr || res.error.message } : { success: true };
});

ipcMain.handle('network:getWifiEnabled', async () => {
    if (process.platform !== 'linux') return { success: true, enabled: true };
    const res = await execAsync('nmcli -t -f WIFI radio 2>/dev/null');
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    const raw = (res.stdout || '').trim().toLowerCase();
    const enabled = raw.includes('enabled') || raw === 'enabled' || raw === 'on';
    return { success: true, enabled };
});

ipcMain.handle('network:setWifiEnabled', async (event, enabled) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const on = !!enabled;
    const res = await execAsync(`nmcli radio wifi ${on ? 'on' : 'off'} 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

ipcMain.handle('network:listSaved', async () => {
    if (process.platform !== 'linux') return { success: true, networks: [] };
    const res = await execAsync('nmcli -t -f NAME,UUID,TYPE,DEVICE connection show 2>/dev/null');
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    const networks = [];
    for (const line of (res.stdout || '').split('\n')) {
        if (!line.trim()) continue;
        const [name, uuid, type, device] = line.split(':');
        if (!name || !uuid) continue;
        networks.push({ name, uuid, type: type || '', device: device || '' });
    }
    return { success: true, networks };
});

ipcMain.handle('network:connectSaved', async (event, nameOrUuid) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const key = String(nameOrUuid || '').trim();
    if (!key) return { success: false, error: 'Invalid network' };
    const res = await execAsync(`nmcli connection up "${shEscape(key)}" 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true, output: res.stdout };
});

ipcMain.handle('network:forgetSaved', async (event, nameOrUuid) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const key = String(nameOrUuid || '').trim();
    if (!key) return { success: false, error: 'Invalid network' };
    const res = await execAsync(`nmcli connection delete "${shEscape(key)}" 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

// ============================================
// MOUSE / POINTER SETTINGS (best-effort)
// ============================================
ipcMain.handle('mouse:apply', async (event, settings) => {
    if (process.platform !== 'linux') return { success: true };

    const speed = typeof settings?.speed === 'number' ? Math.max(-1, Math.min(1, settings.speed)) : 0;
    const raw = !!settings?.raw;
    const naturalScroll = !!settings?.naturalScroll;

    const errors = [];

    // GNOME / similar (Wayland-friendly)
    const g1 = await execAsync(`gsettings set org.gnome.desktop.peripherals.mouse speed ${speed} 2>/dev/null`);
    if (g1.error) errors.push(g1.error.message);
    const accelProfile = raw ? 'flat' : 'adaptive';
    const g2 = await execAsync(`gsettings set org.gnome.desktop.peripherals.mouse accel-profile '${accelProfile}' 2>/dev/null`);
    if (g2.error) errors.push(g2.error.message);
    const g3 = await execAsync(`gsettings set org.gnome.desktop.peripherals.mouse natural-scroll ${naturalScroll ? 'true' : 'false'} 2>/dev/null`);
    if (g3.error) errors.push(g3.error.message);

    // X11 fallback (xinput + libinput)
    const list = await execAsync('xinput list 2>/dev/null');
    if (!list.error && list.stdout) {
        const ids = [...list.stdout.matchAll(/id=(\\d+)\\s+\\[slave\\s+pointer\\s+\\(2\\)\\]/g)].map(m => m[1]);
        for (const id of ids) {
            const p1 = await execAsync(`xinput --set-prop ${id} 'libinput Accel Speed' ${speed} 2>/dev/null`);
            if (p1.error) errors.push(p1.error.message);
            const profile = raw ? '0 1' : '1 0';
            const p2 = await execAsync(`xinput --set-prop ${id} 'libinput Accel Profile Enabled' ${profile} 2>/dev/null`);
            if (p2.error) errors.push(p2.error.message);
            const p3 = await execAsync(`xinput --set-prop ${id} 'libinput Natural Scrolling Enabled' ${naturalScroll ? 1 : 0} 2>/dev/null`);
            if (p3.error) errors.push(p3.error.message);
        }
    }

    // Sway fallback (if running)
    const sway = await execAsync('swaymsg -t get_inputs 2>/dev/null');
    if (!sway.error && sway.stdout) {
        try {
            const inputs = JSON.parse(sway.stdout);
            for (const input of inputs) {
                if (input?.type !== 'pointer') continue;
                const ident = input.identifier;
                await execAsync(`swaymsg input "${shEscape(ident)}" pointer_accel ${speed} 2>/dev/null`);
                await execAsync(`swaymsg input "${shEscape(ident)}" accel_profile ${accelProfile} 2>/dev/null`);
                await execAsync(`swaymsg input "${shEscape(ident)}" natural_scroll ${naturalScroll ? 'enabled' : 'disabled'} 2>/dev/null`);
            }
        } catch (e) {
            // ignore parse error
        }
    }

    return { success: true, warnings: [...new Set(errors)].slice(0, 10) };
});

// ============================================
// TERMINAL (basic command execution)
// ============================================
ipcMain.handle('terminal:exec', async (event, command, cwd) => {
    if (typeof command !== 'string') return { success: false, error: 'Invalid command' };

    const isLinux = process.platform === 'linux';
    const safeCwd = (typeof cwd === 'string' && cwd.trim()) ? cwd : (isLinux ? os.homedir() : process.cwd());

    // Use bash -lc on Linux to behave like a shell (aliases / expansions / etc.)
    const cmd = isLinux
        ? `bash -lc "${shEscape(command)}"`
        : command;

    const res = await execAsync(cmd, { cwd: safeCwd });
    if (res.error) {
        return { success: false, error: res.stderr || res.error.message, stdout: res.stdout, stderr: res.stderr };
    }
    return { success: true, stdout: res.stdout, stderr: res.stderr };
});

// ============================================
// DISPLAY (multi-monitor / refresh / scale)
// ============================================
ipcMain.handle('display:getOutputs', async () => {
    if (process.platform !== 'linux') {
        return {
            success: true,
            outputs: [
                {
                    name: 'Display',
                    active: true,
                    scale: 1,
                    transform: 'normal',
                    currentMode: '1920x1080@60',
                    modes: [{ width: 1920, height: 1080, refreshHz: 60 }]
                }
            ]
        };
    }

    const prefix = buildSwayEnvPrefix();
    const waylandCmd = `${prefix ? prefix + ' ' : ''}swaymsg -t get_outputs 2>/dev/null`;
    const wayland = await execAsync(waylandCmd);
    if (!wayland.error && wayland.stdout) {
        try {
            const outputs = JSON.parse(wayland.stdout);
            if (Array.isArray(outputs)) {
                const mapped = outputs.map(o => {
                    const modes = Array.isArray(o.modes)
                        ? o.modes.map(m => ({
                            width: m.width,
                            height: m.height,
                            refreshHz: m.refresh ? Math.round((m.refresh / 1000) * 100) / 100 : null
                        })).filter(m => m.width && m.height)
                        : [];
                    const cm = o.current_mode
                        ? {
                            width: o.current_mode.width,
                            height: o.current_mode.height,
                            refreshHz: o.current_mode.refresh ? Math.round((o.current_mode.refresh / 1000) * 100) / 100 : null
                        }
                        : null;
                    const currentMode = cm ? `${cm.width}x${cm.height}${cm.refreshHz ? `@${cm.refreshHz}` : ''}` : '';
                    return {
                        name: o.name,
                        active: !!o.active,
                        make: o.make || '',
                        model: o.model || '',
                        serial: o.serial || '',
                        scale: typeof o.scale === 'number' ? o.scale : 1,
                        transform: o.transform || 'normal',
                        currentMode,
                        modes
                    };
                });
                return { success: true, backend: 'swaymsg', outputs: mapped };
            }
        } catch (e) {
            // fall through
        }
    }

    // X11 fallback
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync('xrandr --query 2>/dev/null', { env });
    if (!xr.error && xr.stdout) {
        const lines = xr.stdout.split('\n');
        const outputs = [];
        let current = null;

        for (const line of lines) {
            const header = line.match(/^(\S+)\s+(connected|disconnected)\b/);
            if (header) {
                if (current) outputs.push(current);
                current = { name: header[1], active: header[2] === 'connected', scale: 1, transform: 'normal', currentMode: '', modes: [] };
                continue;
            }
            if (current) {
                const mode = line.match(/^\s+(\d+)x(\d+)\s+(.+)$/);
                if (mode) {
                    const w = parseInt(mode[1], 10);
                    const h = parseInt(mode[2], 10);
                    const rates = (mode[3].match(/\d+(\.\d+)?/g) || []).map(r => parseFloat(r)).filter(n => Number.isFinite(n));
                    for (const hz of rates) current.modes.push({ width: w, height: h, refreshHz: hz });
                    if (line.includes('*')) current.currentMode = `${w}x${h}@${(rates[0] || 60)}`;
                }
            }
        }
        if (current) outputs.push(current);
        return { success: true, backend: 'xrandr', outputs };
    }

    return { success: false, error: 'Failed to read display outputs' };
});

ipcMain.handle('display:setMode', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
    const mode = payload && typeof payload.mode === 'string' ? payload.mode : '';
    if (!outputName || !mode) return { success: false, error: 'Invalid request' };

    const m = mode.match(/^(\d{2,5})x(\d{2,5})(?:@(\d+(\.\d+)?))?/);
    if (!m) return { success: false, error: 'Invalid mode' };
    const width = parseInt(m[1], 10);
    const height = parseInt(m[2], 10);
    const hz = m[3] ? parseFloat(m[3]) : null;

    const prefix = buildSwayEnvPrefix();
    const swayArg = hz ? `${width}x${height}@${hz}Hz` : `${width}x${height}`;
    const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" mode ${swayArg} 2>/dev/null`);
    if (!sway.error) return { success: true, backend: 'swaymsg' };

    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --mode ${width}x${height}${hz ? ` --rate ${hz}` : ''} 2>/dev/null`, { env });
    if (!xr.error) return { success: true, backend: 'xrandr' };

    return { success: false, error: sway.stderr || (sway.error ? sway.error.message : '') || xr.stderr || (xr.error ? xr.error.message : '') };
});

ipcMain.handle('display:setScale', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
    const scale = payload && typeof payload.scale === 'number' ? payload.scale : NaN;
    if (!outputName || !Number.isFinite(scale) || scale <= 0) return { success: false, error: 'Invalid request' };

    const prefix = buildSwayEnvPrefix();
    const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" scale ${scale} 2>/dev/null`);
    if (!sway.error) return { success: true, backend: 'swaymsg' };
    return { success: false, error: 'Scale control requires Wayland/Sway' };
});

ipcMain.handle('display:setTransform', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
    const transform = payload && typeof payload.transform === 'string' ? payload.transform : '';
    if (!outputName || !transform) return { success: false, error: 'Invalid request' };

    const prefix = buildSwayEnvPrefix();
    const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" transform ${shEscape(transform)} 2>/dev/null`);
    if (!sway.error) return { success: true, backend: 'swaymsg' };

    const rotateMap = { normal: 'normal', '90': 'left', '180': 'inverted', '270': 'right' };
    const rot = rotateMap[transform] || null;
    if (!rot) return { success: false, error: 'Unsupported transform on X11' };
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --rotate ${rot} 2>/dev/null`, { env });
    if (!xr.error) return { success: true, backend: 'xrandr' };

    return { success: false, error: sway.stderr || (sway.error ? sway.error.message : '') || xr.stderr || (xr.error ? xr.error.message : '') };
});

ipcMain.handle('system:setResolution', async (event, resolution) => {
    const m = String(resolution || '').trim().match(/^(\d{2,5})x(\d{2,5})$/);
    if (!m) return { success: false, error: 'Invalid resolution format (expected 1920x1080)' };
    const width = parseInt(m[1], 10);
    const height = parseInt(m[2], 10);

    if (process.platform !== 'linux') {
        return { success: false, error: 'Resolution change not supported on this platform' };
    }

    const errors = [];

    // Wayland (sway)
    const prefix = buildSwayEnvPrefix();
    const waylandCmd = `${prefix ? prefix + ' ' : ''}swaymsg output '*' mode ${width}x${height} 2>/dev/null`;
    const waylandRes = await execAsync(waylandCmd);
    if (!waylandRes.error) return { success: true, backend: 'swaymsg' };
    errors.push(waylandRes.stderr || waylandRes.error.message);

    // X11 (xrandr)
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync('xrandr 2>/dev/null', { env });
    if (!xr.error && xr.stdout) {
        const connected = xr.stdout.split('\n').find(l => /\sconnected\b/.test(l));
        const outputName = connected ? connected.trim().split(/\s+/)[0] : null;
        if (outputName) {
            const setRes = await execAsync(`xrandr --output "${shEscape(outputName)}" --mode ${width}x${height} 2>/dev/null`, { env });
            if (!setRes.error) return { success: true, backend: 'xrandr' };
            errors.push(setRes.stderr || setRes.error.message);
        } else {
            errors.push('xrandr: no connected output found');
        }
    } else {
        errors.push(xr.stderr || (xr.error ? xr.error.message : 'xrandr failed'));
    }

    return { success: false, error: errors.filter(Boolean).slice(0, 2).join(' | ') || 'Failed to set resolution' };
});

ipcMain.handle('system:getResolutions', async () => {
    if (process.platform !== 'linux') {
        return { success: true, resolutions: ['1920x1080', '1280x720', '1024x768', '800x600'], current: '1920x1080' };
    }

    // Wayland (sway)
    const prefix = buildSwayEnvPrefix();
    const waylandCmd = `${prefix ? prefix + ' ' : ''}swaymsg -t get_outputs 2>/dev/null`;
    const wayland = await execAsync(waylandCmd);
    if (!wayland.error && wayland.stdout) {
        try {
            const outputs = JSON.parse(wayland.stdout);
            if (Array.isArray(outputs) && outputs.length > 0) {
                const output = outputs[0];
                const modes = Array.isArray(output.modes) ? output.modes : [];
                const resolutions = modes.map(m => `${m.width}x${m.height}`);
                const current = output.current_mode ? `${output.current_mode.width}x${output.current_mode.height}` : (resolutions[0] || '1024x768');
                const common = ['1920x1080', '1280x720', '1024x768', '800x600'];
                common.forEach(r => { if (!resolutions.includes(r)) resolutions.push(r); });
                return { success: true, resolutions: [...new Set(resolutions)].sort(), current };
            }
        } catch (e) {
            // fall through
        }
    }

    // X11 (xrandr)
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync('xrandr 2>/dev/null', { env });
    if (!xr.error && xr.stdout) {
        const lines = xr.stdout.split('\n');
        const resolutions = [];
        let current = '1024x768';

        for (const line of lines) {
            const match = line.match(/^\s+(\d+x\d+)/);
            if (match) {
                resolutions.push(match[1]);
                if (line.includes('*')) current = match[1];
            }
        }
        const common = ['1920x1080', '1280x720', '1024x768', '800x600'];
        common.forEach(r => { if (!resolutions.includes(r)) resolutions.push(r); });
        return { success: true, resolutions: [...new Set(resolutions)].sort(), current };
    }

    return { success: true, resolutions: ['1920x1080', '1280x720', '1024x768', '800x600'], current: '1024x768' };
});

// ============================================
// MOUSE DPI (libratbag / ratbagctl) - optional
// ============================================
ipcMain.handle('mouse:getDpiInfo', async () => {
    const devices = await listRatbagDevices();
    if (!devices.length) return { success: true, supported: false, devices: [] };

    const deviceId = devices[0].id;
    const dpiGet = await execAsync(`ratbagctl dpi get "${shEscape(deviceId)}" 2>/dev/null`);
    const dpiAll = await execAsync(`ratbagctl dpi get-all "${shEscape(deviceId)}" 2>/dev/null`);

    const current = dpiGet.stdout.match(/\d+/)?.[0] ? parseInt(dpiGet.stdout.match(/\d+/)[0], 10) : null;
    const values = (dpiAll.stdout.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => Number.isFinite(n));

    return {
        success: true,
        supported: true,
        devices,
        deviceId,
        currentDpi: current,
        dpiValues: [...new Set(values)].sort((a, b) => a - b)
    };
});

ipcMain.handle('mouse:setDpi', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const dpi = payload && typeof payload.dpi === 'number' ? Math.round(payload.dpi) : NaN;
    if (!Number.isFinite(dpi) || dpi <= 0) return { success: false, error: 'Invalid DPI' };

    const devices = await listRatbagDevices();
    if (!devices.length) return { success: false, error: 'ratbagctl not available (install ratbagd/libratbag-tools)' };

    const requested = payload && typeof payload.deviceId === 'string' && payload.deviceId.trim() ? payload.deviceId.trim() : devices[0].id;
    const ok = devices.find(d => d.id === requested) ? requested : devices[0].id;
    const res = await execAsync(`ratbagctl dpi set ${dpi} "${shEscape(ok)}" 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

const projectRoot = path.resolve(__dirname, '..');

// ============================================
// APP DISCOVERY IPC (for Start Menu)
// ============================================

// Simple INI-style parser for .desktop files
function parseDesktopFile(content) {
    const result = {};
    let currentSection = null;

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Section header [Desktop Entry]
        const sectionMatch = trimmed.match(/^\[(.+)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            continue;
        }

        // Key=Value
        const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (kvMatch && currentSection === 'Desktop Entry') {
            result[kvMatch[1].trim()] = kvMatch[2].trim();
        }
    }

    return result;
}

ipcMain.handle('apps:getInstalled', async () => {
    if (process.platform !== 'linux') {
        // On Windows/Mac, return mock apps
        return {
            success: true,
            apps: [
                { name: 'Firefox', icon: 'firefox', exec: 'firefox', categories: ['Network', 'WebBrowser'] },
                { name: 'Terminal', icon: 'terminal', exec: 'gnome-terminal', categories: ['System', 'TerminalEmulator'] },
            ]
        };
    }

    const appDirs = [
        '/usr/share/applications',
        path.join(os.homedir(), '.local/share/applications')
    ];

    const apps = [];
    const seenNames = new Set();

    for (const dir of appDirs) {
        try {
            const files = await fs.promises.readdir(dir);

            for (const file of files) {
                if (!file.endsWith('.desktop')) continue;

                try {
                    const content = await fs.promises.readFile(path.join(dir, file), 'utf-8');
                    const parsed = parseDesktopFile(content);

                    // Skip hidden apps and those without names
                    if (!parsed.Name || parsed.NoDisplay === 'true' || parsed.Hidden === 'true') continue;

                    // Blacklist confusing system apps/terminals
                    const blacklist = new Set([
                        'Foot', 'Foot Client', 'Foot Server', 'Zutty',
                        'XTerm', 'UXTerm', 'Debian Info', 'Debian HTML',
                        'Avahi SSH Server Browser', 'Avahi VNC Server Browser',
                        'Bvs' // various x11 utils
                    ]);
                    if (blacklist.has(parsed.Name)) continue;

                    // Skip duplicate names
                    if (seenNames.has(parsed.Name)) continue;
                    seenNames.add(parsed.Name);

                    apps.push({
                        name: parsed.Name,
                        icon: parsed.Icon || 'application-x-executable',
                        exec: parsed.Exec ? parsed.Exec.replace(/%[a-zA-Z]/g, '').trim() : '',
                        categories: parsed.Categories ? parsed.Categories.split(';').filter(c => c) : [],
                        comment: parsed.Comment || '',
                        desktopFile: path.join(dir, file)
                    });
                } catch (e) {
                    // Skip files we can't read
                }
            }
        } catch (e) {
            // Directory doesn't exist or can't be read
        }
    }

    // Sort alphabetically
    apps.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, apps };
});

// Launch an application by its .desktop file or exec command
ipcMain.handle('apps:launch', async (event, app) => {
    if (process.platform !== 'linux') {
        console.log(`[Windows/Mac] Would launch: ${app.name}`);
        return { success: true };
    }

    try {
        // Use gtk-launch if we have the desktop file, otherwise exec directly
        let command;
        if (app.desktopFile) {
            const baseName = path.basename(app.desktopFile);
            command = `gtk-launch ${baseName}`;
        } else if (app.exec) {
            command = app.exec;
        } else {
            return { success: false, error: 'No executable found' };
        }

        exec(command, { detached: true, stdio: 'ignore' });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// HOLY UPDATER IPC
// ============================================
ipcMain.handle('updater:check', async () => {
    return new Promise((resolve) => {
        // Check for updates by doing git fetch and comparing
        // On Windows, use 'git fetch' then check rev-list
        const command = `cd "${projectRoot}" && git fetch origin main && git rev-list HEAD...origin/main --count`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                // If dev environment or no git, just mock success for now to avoid crashing user experience
                if (process.env.NODE_ENV === 'development') {
                    resolve({
                        success: true,
                        updatesAvailable: false,
                        behindCount: 0,
                        message: "Dev Mode: No updates"
                    });
                    return;
                }
                resolve({ success: false, error: error.message });
                return;
            }
            const behindCount = parseInt(stdout.trim()) || 0;
            resolve({
                success: true,
                updatesAvailable: behindCount > 0,
                behindCount
            });
        }
        );
    });
});

ipcMain.handle('updater:update', async () => {
    return new Promise((resolve) => {
        // Pull updates, install deps, rebuild, and prepare for reboot
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        // Note: --ignore-optional skips node-pty if it fails to compile
        const updateScript = `cd "${projectRoot}" && git pull origin main && ${npmCmd} install --ignore-optional && ${npmCmd} run build -- --base=./`;


        exec(updateScript, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    success: false,
                    error: error.message,
                    output: stdout + '\n' + stderr
                });
                return;
            }
            resolve({
                success: true,
                output: stdout,
                message: 'Update complete! Reboot to apply changes.'
            });
        });
    });
});

// ============================================
// PTY TERMINAL IPC
// ============================================
ipcMain.handle('terminal:createPty', (event, options = {}) => {
    if (!pty) {
        return { success: false, error: 'PTY not available' };
    }

    const id = `pty-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const shell = process.platform === 'win32'
        ? process.env.COMSPEC || 'cmd.exe'
        : process.env.SHELL || '/bin/bash';

    try {
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: options.cols || 80,
            rows: options.rows || 24,
            cwd: options.cwd || os.homedir(),
            env: { ...process.env, TERM: 'xterm-256color' }
        });

        ptyProcess.onData((data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('terminal:data', { id, data });
            }
        });

        ptyProcess.onExit(({ exitCode }) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('terminal:exit', { id, exitCode });
            }
            ptyProcesses.delete(id);
        });

        ptyProcesses.set(id, { pty: ptyProcess, cwd: options.cwd || os.homedir() });
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('terminal:writePty', (event, { id, data }) => {
    const entry = ptyProcesses.get(id);
    if (!entry) return { success: false, error: 'PTY not found' };
    try {
        entry.pty.write(data);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('terminal:resizePty', (event, { id, cols, rows }) => {
    const entry = ptyProcesses.get(id);
    if (!entry) return { success: false, error: 'PTY not found' };
    try {
        entry.pty.resize(cols, rows);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('terminal:destroyPty', (event, { id }) => {
    const entry = ptyProcesses.get(id);
    if (entry) {
        try {
            entry.pty.kill();
        } catch (e) {
            // ignore
        }
        ptyProcesses.delete(id);
    }
    return { success: true };
});

ipcMain.handle('terminal:isPtyAvailable', () => {
    return { success: true, available: pty !== null };
});

// ============================================
// APP LIFECYCLE
// ============================================

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
