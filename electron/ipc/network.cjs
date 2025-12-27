/**
 * Network IPC handlers
 * Handles network:* IPC channels (NetworkManager via nmcli)
 */

const { ipcMain } = require('electron');
const { execAsync, shEscape, ipcSuccess, ipcError } = require('./utils.cjs');

function registerNetworkHandlers() {
    ipcMain.handle('network:getStatus', async () => {
        if (process.platform !== 'linux') {
            return ipcError('Not supported on this platform');
        }

        const devStatus = await execAsync('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION dev status 2>/dev/null');
        if (devStatus.error) return ipcError(devStatus.error.message);

        const rows = devStatus.stdout.split('\n').map(l => l.trim()).filter(Boolean);
        const parsed = rows.map(r => {
            const [device, type, state, connection] = r.split(':');
            return { device, type, state, connection };
        });

        const active = parsed.find(p => p.state === 'connected') || parsed.find(p => p.state === 'connected (externally)');
        if (!active) return ipcSuccess({ status: { connected: false, devices: parsed } });

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

        return ipcSuccess({
            status: {
                connected: true,
                device: active.device,
                type: active.type,
                connection: active.connection,
                ip4,
                wifi,
                devices: parsed
            }
        });
    });

    ipcMain.handle('network:listWifi', async () => {
        if (process.platform !== 'linux') return ipcSuccess({ networks: [] });

        const res = await execAsync('nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan no 2>/dev/null', { timeout: 5000 });
        if (res.error) return ipcError(res.error.message);

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

        return ipcSuccess({ networks });
    });

    ipcMain.handle('network:connectWifi', async (event, ssid, password) => {
        if (process.platform !== 'linux') return ipcSuccess();

        const pw = password ? ` password "${shEscape(password)}"` : '';
        const cmd = `nmcli dev wifi connect "${shEscape(ssid)}"${pw} 2>/dev/null`;
        const res = await execAsync(cmd);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess({ output: res.stdout });
    });

    ipcMain.handle('network:disconnect', async () => {
        if (process.platform !== 'linux') return ipcSuccess();

        const status = await execAsync('nmcli -t -f DEVICE,STATE dev status 2>/dev/null');
        if (status.error) return ipcError(status.error.message);

        const connected = status.stdout
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean)
            .map(l => l.split(':'))
            .find(parts => parts[1] === 'connected');

        if (!connected) return ipcSuccess();

        const dev = connected[0];
        const res = await execAsync(`nmcli dev disconnect "${shEscape(dev)}" 2>/dev/null`);
        return res.error ? ipcError(res.stderr || res.error.message) : ipcSuccess();
    });

    ipcMain.handle('network:disconnectNonVpn', async () => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const status = await execAsync('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION dev status 2>/dev/null');
        if (status.error) return ipcError(status.error.message);

        const rows = (status.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
        const unesc = (v) => String(v || '').replace(/\\:/g, ':');
        const parsed = rows.map(line => {
            const parts = line.split(':');
            return {
                device: unesc(parts[0] || ''),
                type: unesc(parts[1] || ''),
                state: unesc(parts[2] || ''),
                connection: unesc(parts.slice(3).join(':') || '')
            };
        });

        const isConnected = (s) => {
            const t = String(s || '').toLowerCase();
            return t === 'connected' || t.startsWith('connected');
        };

        const isVpn = (r) => {
            const t = String(r.type || '').toLowerCase();
            const d = String(r.device || '').toLowerCase();
            return t === 'tun' || t === 'vpn' || t.includes('wireguard') || d.startsWith('tun') || d.startsWith('wg');
        };

        const targets = parsed.filter(r => isConnected(r.state) && !isVpn(r));
        if (!targets.length) return ipcSuccess({ disconnected: [] });

        const disconnected = [];
        const errors = [];
        for (const t of targets) {
            const res = await execAsync(`nmcli dev disconnect "${shEscape(t.device)}" 2>/dev/null`);
            if (res.error) {
                errors.push(res.stderr || res.error.message);
                continue;
            }
            const label = t.connection && t.connection !== '--' ? t.connection : t.device;
            disconnected.push(label);
        }

        const errMsg = errors.filter(Boolean).join('; ');
        if (errMsg && disconnected.length === 0) return ipcError(errMsg || 'Disconnect failed');
        return ipcSuccess({ disconnected, error: errMsg || undefined });
    });

    ipcMain.handle('network:createHotspot', async (event, ssid, password) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const status = await execAsync('nmcli -t -f DEVICE,TYPE,STATE dev status 2>/dev/null');
        if (status.error) return ipcError('Failed to get network devices');

        const lines = status.stdout.split('\n');
        let wifiDev = null;
        for (const line of lines) {
            const parts = line.split(':');
            if (parts[1] === 'wifi') {
                wifiDev = parts[0];
                break;
            }
        }

        if (!wifiDev) return ipcError('No Wi-Fi device found');

        const conName = 'TempleOS_Hotspot';
        const pwArg = password ? `"${shEscape(password)}"` : '';
        const ssidArg = ssid ? `"${shEscape(ssid)}"` : `"${conName}"`;

        const cmd = `nmcli device wifi hotspot "${shEscape(wifiDev)}" "${conName}" ${ssidArg} ${pwArg}`;
        const res = await execAsync(cmd);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess({ output: res.stdout });
    });

    ipcMain.handle('network:stopHotspot', async () => {
        if (process.platform !== 'linux') return ipcSuccess();
        const conName = 'TempleOS_Hotspot';
        await execAsync(`nmcli connection down "${conName}" 2>/dev/null`);
        return ipcSuccess();
    });

    ipcMain.handle('network:getWifiEnabled', async () => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const res = await execAsync('nmcli -t -f WIFI radio 2>/dev/null');
        if (res.error) return ipcError(res.stderr || res.error.message);
        const raw = (res.stdout || '').trim().toLowerCase();
        const enabled = raw.includes('enabled') || raw === 'enabled' || raw === 'on';
        return ipcSuccess({ enabled });
    });

    ipcMain.handle('network:setWifiEnabled', async (event, enabled) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const on = !!enabled;
        const res = await execAsync(`nmcli radio wifi ${on ? 'on' : 'off'} 2>/dev/null`);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess();
    });

    ipcMain.handle('network:listSaved', async () => {
        if (process.platform !== 'linux') return ipcSuccess({ networks: [] });
        const res = await execAsync('nmcli -t -f NAME,UUID,TYPE,DEVICE connection show 2>/dev/null');
        if (res.error) return ipcError(res.stderr || res.error.message);
        const networks = [];
        for (const line of (res.stdout || '').split('\n')) {
            if (!line.trim()) continue;
            const [name, uuid, type, device] = line.split(':');
            if (!name || !uuid) continue;
            networks.push({ name, uuid, type: type || '', device: device || '' });
        }
        return ipcSuccess({ networks });
    });

    ipcMain.handle('network:connectSaved', async (event, nameOrUuid) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const key = String(nameOrUuid || '').trim();
        if (!key) return ipcError('Invalid network');
        const res = await execAsync(`nmcli connection up "${shEscape(key)}" 2>/dev/null`);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess({ output: res.stdout });
    });

    ipcMain.handle('network:disconnectConnection', async (event, nameOrUuid) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const key = String(nameOrUuid || '').trim();
        if (!key) return ipcError('Invalid connection');
        const res = await execAsync(`nmcli connection down "${shEscape(key)}" 2>/dev/null`);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess({ output: res.stdout });
    });

    ipcMain.handle('network:forgetSaved', async (event, nameOrUuid) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const key = String(nameOrUuid || '').trim();
        if (!key) return ipcError('Invalid network');
        const res = await execAsync(`nmcli connection delete "${shEscape(key)}" 2>/dev/null`);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess();
    });

    ipcMain.handle('network:importVpnProfile', async (event, kind, filePath) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const k = String(kind || '').toLowerCase();
        const pathValue = String(filePath || '').trim();
        if (!pathValue) return ipcError('Invalid file path');

        const type = k === 'wireguard' ? 'wireguard' : (k === 'openvpn' ? 'openvpn' : null);
        if (!type) return ipcError('Invalid VPN type');

        const cmd = `nmcli connection import type ${type} file "${shEscape(pathValue)}" 2>/dev/null`;
        const res = await execAsync(cmd, { timeout: 10000 });
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess({ output: res.stdout });
    });

    console.log('[IPC] Network handlers registered');
}

module.exports = { registerNetworkHandlers };
