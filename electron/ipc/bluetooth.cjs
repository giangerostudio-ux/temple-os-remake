/**
 * Bluetooth IPC handlers
 * Handles bluetooth:* IPC channels (BlueZ via bluetoothctl)
 */

const { ipcMain } = require('electron');
const { execAsync, shEscape, ipcSuccess, ipcError } = require('./utils.cjs');

function normalizeBluetoothMac(value) {
    const raw = String(value || '').trim();
    if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(raw)) return null;
    return raw.toUpperCase();
}

function parseBluetoothctlDeviceList(text) {
    const devices = [];
    for (const line of String(text || '').split('\n')) {
        const m = line.trim().match(/^Device\s+([0-9A-Fa-f:]{17})\s+(.+?)\s*$/);
        if (!m) continue;
        devices.push({ mac: m[1].toUpperCase(), name: m[2].trim() });
    }
    const seen = new Set();
    return devices.filter(d => {
        if (!d.mac || seen.has(d.mac)) return false;
        seen.add(d.mac);
        return true;
    });
}

async function bluetoothctlInfo(mac) {
    const addr = normalizeBluetoothMac(mac);
    if (!addr) return { connected: null, paired: null, error: 'Invalid MAC address' };
    const info = await execAsync(`bluetoothctl info "${shEscape(addr)}" 2>/dev/null`, { timeout: 3000 });
    if (info.error) return { connected: null, paired: null, error: info.stderr || info.error.message || 'Failed to query device info' };
    const connectedMatch = info.stdout.match(/\bConnected:\s*(yes|no)\b/i);
    const pairedMatch = info.stdout.match(/\bPaired:\s*(yes|no)\b/i);
    return {
        connected: connectedMatch ? connectedMatch[1].toLowerCase() === 'yes' : null,
        paired: pairedMatch ? pairedMatch[1].toLowerCase() === 'yes' : null,
        error: null
    };
}

async function enrichBluetoothDevices(devices, max = 20) {
    const out = [];
    const limited = Array.isArray(devices) ? devices.slice(0, max) : [];
    for (const d of limited) {
        const info = await bluetoothctlInfo(d.mac);
        out.push({
            mac: d.mac,
            name: d.name,
            connected: info.connected === true,
            paired: info.paired === true
        });
    }
    for (const d of (Array.isArray(devices) ? devices.slice(out.length) : [])) {
        out.push({ mac: d.mac, name: d.name, connected: false, paired: false });
    }
    return out;
}

// Privilege escalation helpers
let cachedPrivMethod = undefined;

async function hasCommand(bin) {
    const safe = String(bin || '').trim().replace(/[^a-zA-Z0-9._+-]/g, '');
    if (!safe) return false;
    const res = await execAsync(`command -v ${safe} 2>/dev/null`, { timeout: 1500 });
    return !!String(res.stdout || '').trim();
}

async function getPrivMethod() {
    if (cachedPrivMethod !== undefined) return cachedPrivMethod;
    // Prefer sudo -n over pkexec to prevent GUI dialogs that can hang
    if (await hasCommand('sudo')) { cachedPrivMethod = 'sudo'; return cachedPrivMethod; }
    if (await hasCommand('pkexec')) { cachedPrivMethod = 'pkexec'; return cachedPrivMethod; }
    cachedPrivMethod = null;
    return cachedPrivMethod;
}

async function runPrivilegedSh(command, options = {}) {
    const method = await getPrivMethod();
    const timeout = typeof options.timeout === 'number' ? options.timeout : 120000;
    if (!method) {
        return { error: new Error('No privilege escalation method available'), stdout: '', stderr: '' };
    }
    // Use sudo -n for non-interactive mode to prevent hanging on password prompt
    const wrapped = method === 'pkexec'
        ? `pkexec sh -c '${command.replace(/'/g, "'\\''")}'`
        : `sudo -n sh -c '${command.replace(/'/g, "'\\''")}'`;
    return execAsync(wrapped, { timeout });
}

function registerBluetoothHandlers() {
    ipcMain.handle('bluetooth:setEnabled', async (event, enabled) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const on = !!enabled;
        const errors = [];

        // Try bluetoothctl without elevation first
        const btctl = await execAsync(`bluetoothctl power ${on ? 'on' : 'off'}`, { timeout: 8000 });
        if (!btctl.error) return ipcSuccess({ backend: 'bluetoothctl' });
        errors.push(btctl.stderr || btctl.error.message || 'bluetoothctl failed');

        // Try rfkill with privilege escalation
        const rfkillPriv = await runPrivilegedSh(`rfkill ${on ? 'unblock' : 'block'} bluetooth`, { timeout: 15000 });
        if (!rfkillPriv.error) return ipcSuccess({ backend: 'rfkill', privileged: true });
        errors.push(rfkillPriv.stderr || rfkillPriv.error.message || 'rfkill (privileged) failed');

        // Try rfkill without privileges as last resort
        const rfkill = await execAsync(`rfkill ${on ? 'unblock' : 'block'} bluetooth`, { timeout: 8000 });
        if (!rfkill.error) return ipcSuccess({ backend: 'rfkill' });
        errors.push(rfkill.stderr || rfkill.error.message || 'rfkill failed');

        return { success: false, error: errors.filter(Boolean).join('; ') || 'Failed to toggle Bluetooth', needsPassword: true };
    });

    ipcMain.handle('bluetooth:setEnabledWithPassword', async (event, enabled, password) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const on = !!enabled;
        const pwd = String(password || '');

        if (!pwd) return ipcError('Password is required');

        const cmd = on ? 'rfkill unblock bluetooth' : 'rfkill block bluetooth';
        const escapedPwd = pwd.replace(/'/g, "'\"'\"'");
        const fullCmd = `echo '${escapedPwd}' | sudo -S ${cmd} 2>&1`;

        const res = await execAsync(fullCmd, { timeout: 15000 });

        if (res.error) {
            const errText = (res.stderr || res.stdout || res.error.message || '').toLowerCase();
            if (errText.includes('incorrect password') || errText.includes('sorry') || errText.includes('try again')) {
                return { success: false, error: 'Incorrect password', wrongPassword: true };
            }
            return ipcError(res.stderr || 'Privileged command failed');
        }

        // Also try bluetoothctl to fully power on/off the adapter
        await execAsync(`bluetoothctl power ${on ? 'on' : 'off'} 2>/dev/null`, { timeout: 5000 });

        return ipcSuccess({ backend: 'sudo+rfkill' });
    });

    ipcMain.handle('bluetooth:listPaired', async () => {
        if (process.platform !== 'linux') return ipcSuccess({ devices: [] });
        const res = await execAsync('bluetoothctl paired-devices 2>/dev/null', { timeout: 8000 });
        if (res.error) return { success: false, devices: [], error: res.stderr || res.error.message || 'Failed to list paired devices' };
        const devices = parseBluetoothctlDeviceList(res.stdout).slice(0, 50);
        const enriched = await enrichBluetoothDevices(devices, 25);
        return ipcSuccess({ devices: enriched });
    });

    ipcMain.handle('bluetooth:scan', async () => {
        if (process.platform !== 'linux') return ipcSuccess({ devices: [] });

        // Start scan then list discovered devices
        await execAsync('bluetoothctl scan on 2>/dev/null', { timeout: 2000 });
        await new Promise(r => setTimeout(r, 4500));

        const list = await execAsync('bluetoothctl devices 2>/dev/null', { timeout: 8000 });
        await execAsync('bluetoothctl scan off 2>/dev/null', { timeout: 2000 });

        if (list.error) return { success: false, devices: [], error: list.stderr || list.error.message || 'Failed to scan devices' };
        const devices = parseBluetoothctlDeviceList(list.stdout).slice(0, 50);
        const enriched = await enrichBluetoothDevices(devices, 25);
        return ipcSuccess({ devices: enriched });
    });

    ipcMain.handle('bluetooth:connect', async (event, mac) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const addr = normalizeBluetoothMac(mac);
        if (!addr) return ipcError('Invalid MAC address');

        const res = await execAsync(`bluetoothctl connect "${shEscape(addr)}" 2>/dev/null`, { timeout: 15000 });
        if (res.error) return ipcError(res.stderr || res.error.message || 'Connect failed');

        const info = await bluetoothctlInfo(addr);
        return { success: info.connected === true, connected: info.connected === true, error: info.error || undefined };
    });

    ipcMain.handle('bluetooth:disconnect', async (event, mac) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const addr = normalizeBluetoothMac(mac);
        if (!addr) return ipcError('Invalid MAC address');

        const res = await execAsync(`bluetoothctl disconnect "${shEscape(addr)}" 2>/dev/null`, { timeout: 15000 });
        if (res.error) return ipcError(res.stderr || res.error.message || 'Disconnect failed');

        const info = await bluetoothctlInfo(addr);
        return { success: info.connected === false, connected: info.connected === true, error: info.error || undefined };
    });

    console.log('[IPC] Bluetooth handlers registered');
}

module.exports = { registerBluetoothHandlers };
