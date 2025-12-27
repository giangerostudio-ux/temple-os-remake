/**
 * System IPC handlers
 * Handles system:*, monitor:*, process:*, config:* IPC channels
 */

const { ipcMain, app } = require('electron');
const {
    fs,
    path,
    os,
    exec,
    execAsync,
    shEscape,
    ipcSuccess,
    ipcError,
    cpuTotals,
    linuxNetTotals
} = require('./utils.cjs');

// Mutable state for CPU/network monitoring
let lastCpuTotals = null;
let lastNetTotals = null;
let lastNetAt = 0;

// Config path
const configPath = path.join(app.getPath('userData'), 'templeos.config.json');

// Command existence check
function commandExistsSync(cmd) {
    const command = String(cmd || '').trim();
    if (!command) return false;
    try {
        const { execSync } = require('child_process');
        execSync(`command -v ${command}`, { encoding: 'utf-8', stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function registerSystemHandlers(getMainWindow) {
    // ============================================
    // SYSTEM IPC
    // ============================================

    ipcMain.handle('system:shutdown', () => {
        exec('systemctl poweroff');
    });

    ipcMain.handle('system:restart', () => {
        exec('systemctl reboot');
    });

    ipcMain.handle('system:lock', async () => {
        // Always trigger the UI overlay (renderer lock screen)
        try {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('lock-screen');
            }
        } catch {
            // ignore
        }

        if (process.platform !== 'linux') {
            return ipcSuccess({ unsupported: true });
        }

        const sessionId = process.env.XDG_SESSION_ID ? String(process.env.XDG_SESSION_ID) : '';
        const candidates = [
            ...(sessionId ? [`loginctl lock-session "${shEscape(sessionId)}" 2>/dev/null`] : []),
            'loginctl lock-sessions 2>/dev/null',
            'xdg-screensaver lock 2>/dev/null',
            'dm-tool lock 2>/dev/null',
            'gnome-screensaver-command -l 2>/dev/null',
            'qdbus org.freedesktop.ScreenSaver /ScreenSaver Lock 2>/dev/null',
            'dbus-send --type=method_call --dest=org.freedesktop.ScreenSaver /ScreenSaver org.freedesktop.ScreenSaver.Lock 2>/dev/null'
        ];

        for (const cmd of candidates) {
            const res = await execAsync(cmd, { timeout: 2500 });
            if (!res.error) return ipcSuccess({ backend: cmd });
        }

        return ipcError('No supported screen locker found');
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

    ipcMain.handle('system:getBattery', async () => {
        if (process.platform !== 'linux') {
            return ipcSuccess({ supported: false, status: { present: false } });
        }

        const parseUPowerTime = (value) => {
            const raw = String(value || '').trim().toLowerCase();
            const m = raw.match(/^(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|minute|minutes|min|mins|second|seconds|sec|secs)\b/);
            if (!m) return null;
            const n = parseFloat(m[1]);
            if (!Number.isFinite(n)) return null;
            const unit = m[2];
            if (unit.startsWith('hour') || unit.startsWith('hr')) return Math.round(n * 3600);
            if (unit.startsWith('min')) return Math.round(n * 60);
            if (unit.startsWith('sec')) return Math.round(n);
            return null;
        };

        const parseHms = (value) => {
            const raw = String(value || '').trim();
            const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (!m) return null;
            const h = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            const sec = m[3] ? parseInt(m[3], 10) : 0;
            if (!Number.isFinite(h) || !Number.isFinite(min) || !Number.isFinite(sec)) return null;
            return h * 3600 + min * 60 + sec;
        };

        // Prefer upower
        const upowerList = await execAsync('upower -e 2>/dev/null', { timeout: 2500 });
        if (!upowerList.error && upowerList.stdout) {
            const lines = upowerList.stdout.split('\n').map(l => l.trim()).filter(Boolean);
            const batteryDev = lines.find(l => /\/battery_/i.test(l) || /battery/i.test(l)) || null;
            if (!batteryDev) {
                return ipcSuccess({ supported: true, status: { present: false, source: 'upower' } });
            }

            const info = await execAsync(`upower -i "${shEscape(batteryDev)}" 2>/dev/null`, { timeout: 2500 });
            if (!info.error && info.stdout) {
                const text = info.stdout;
                const grab = (re) => {
                    const m = text.match(re);
                    return m ? String(m[1]).trim() : null;
                };

                const presentRaw = grab(/^\s*present:\s*(.+)$/mi);
                const present = (presentRaw || '').toLowerCase().includes('yes') || (presentRaw || '').toLowerCase().includes('true');
                const stateRaw = grab(/^\s*state:\s*(.+)$/mi) || 'unknown';
                const state = stateRaw.toLowerCase();
                const percentRaw = grab(/^\s*percentage:\s*(\d+)%/mi);
                const percent = percentRaw ? Math.max(0, Math.min(100, parseInt(percentRaw, 10))) : null;
                const tteRaw = grab(/^\s*time to empty:\s*(.+)$/mi);
                const ttfRaw = grab(/^\s*time to full:\s*(.+)$/mi);
                const timeToEmptySec = tteRaw ? parseUPowerTime(tteRaw) : null;
                const timeToFullSec = ttfRaw ? parseUPowerTime(ttfRaw) : null;
                const isCharging = state.includes('charging') ? true : (state.includes('discharging') || state.includes('fully-charged') || state.includes('full')) ? false : null;

                return ipcSuccess({
                    supported: true,
                    status: { present, percent, state, isCharging, timeToEmptySec, timeToFullSec, source: 'upower' }
                });
            }
        }

        // Fallback: acpi
        const acpi = await execAsync('acpi -b 2>/dev/null', { timeout: 2500 });
        if (!acpi.error && acpi.stdout) {
            const lines = acpi.stdout.split('\n').map(l => l.trim()).filter(Boolean);
            if (!lines.length) {
                return ipcSuccess({ supported: true, status: { present: false, source: 'acpi' } });
            }

            const parsed = lines.map(line => {
                const m = line.match(/:\s*([^,]+),\s*(\d+)%\s*,?\s*(.*)$/i);
                if (!m) return null;
                const state = String(m[1] || '').trim().toLowerCase();
                const percent = Math.max(0, Math.min(100, parseInt(m[2], 10)));
                const tail = String(m[3] || '').trim();
                const seconds = parseHms(tail);
                return { state, percent, seconds };
            }).filter(Boolean);

            if (!parsed.length) {
                return ipcSuccess({ supported: true, status: { present: false, source: 'acpi' } });
            }

            const avg = Math.round(parsed.reduce((sum, p) => sum + p.percent, 0) / parsed.length);
            const primary = parsed[0];
            const isCharging = primary.state.includes('charging') ? true : primary.state.includes('discharging') ? false : null;

            return ipcSuccess({
                supported: true,
                status: {
                    present: true,
                    percent: avg,
                    state: primary.state,
                    isCharging,
                    timeToEmptySec: primary.state.includes('discharging') ? (primary.seconds || null) : null,
                    timeToFullSec: primary.state.includes('charging') ? (primary.seconds || null) : null,
                    source: 'acpi'
                }
            });
        }

        return ipcSuccess({ supported: false, status: { present: false }, error: 'Battery status not available' });
    });

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

            return ipcSuccess({
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
            });
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('process:list', async () => {
        if (process.platform !== 'linux') {
            return ipcSuccess({ processes: [], unsupported: true });
        }

        const cmd = 'LC_ALL=C ps -eo pid=,comm=,%cpu=,%mem=,rss=,etime=,args= --sort=-%cpu | head -n 200';
        const res = await execAsync(cmd);
        if (res.error) return ipcError(res.stderr || res.error.message || 'ps failed');

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

        return ipcSuccess({ processes });
    });

    ipcMain.handle('process:kill', async (event, payload) => {
        if (process.platform !== 'linux') {
            return ipcError('Unsupported on this platform');
        }

        const pid = Number(payload && payload.pid);
        const signal = String((payload && payload.signal) || 'TERM').toUpperCase();
        if (!Number.isFinite(pid) || pid <= 1) return ipcError('Invalid PID');
        if (pid === process.pid) return ipcError('Refusing to kill TempleOS UI process');
        if (!['TERM', 'KILL'].includes(signal)) return ipcError('Invalid signal');

        const res = await execAsync(`kill -${signal} ${Math.floor(pid)}`);
        if (res.error) return ipcError(res.stderr || res.error.message || 'kill failed');
        return ipcSuccess();
    });

    // ============================================
    // CONFIG IPC (persist settings)
    // ============================================

    ipcMain.handle('config:load', async () => {
        try {
            const raw = await fs.promises.readFile(configPath, 'utf-8');
            const data = JSON.parse(raw);
            return ipcSuccess({ config: data });
        } catch (error) {
            return ipcSuccess({ config: {} });
        }
    });

    ipcMain.handle('config:save', async (event, config) => {
        try {
            await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
            const tmp = configPath + '.tmp';
            await fs.promises.writeFile(tmp, JSON.stringify(config || {}, null, 2), 'utf-8');
            await fs.promises.rename(tmp, configPath);
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('system:isCommandAvailable', (event, cmd) => {
        const command = String(cmd || '').trim();
        if (!command) return ipcSuccess({ available: false });
        const available = commandExistsSync(command);
        return ipcSuccess({ available });
    });

    ipcMain.handle('system:setVolume', (event, level) => {
        const safeLevel = Math.max(0, Math.min(100, parseInt(level)));

        if (process.platform === 'linux') {
            exec(`amixer -q set Master ${safeLevel}%`, (error) => {
                if (error) console.error(`Failed to set volume: ${error.message}`);
            });
            return ipcSuccess();
        }

        return ipcError('System volume control not supported on this platform');
    });

    console.log('[IPC] System handlers registered');
}

module.exports = { registerSystemHandlers };
