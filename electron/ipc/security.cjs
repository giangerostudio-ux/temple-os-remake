/**
 * Security IPC handlers
 * Handles security:*, ssh:*, and related IPC channels
 */

const { ipcMain } = require('electron');
const { fs, path, os, execAsync, shEscape, ipcSuccess, ipcError } = require('./utils.cjs');

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
    if (await hasCommand('pkexec')) { cachedPrivMethod = 'pkexec'; return cachedPrivMethod; }
    if (await hasCommand('sudo')) { cachedPrivMethod = 'sudo'; return cachedPrivMethod; }
    cachedPrivMethod = null;
    return cachedPrivMethod;
}

async function runPrivilegedSh(command, options = {}) {
    const method = await getPrivMethod();
    const timeout = typeof options.timeout === 'number' ? options.timeout : 120000;
    if (!method) {
        return { error: new Error('No privilege escalation method available'), stdout: '', stderr: '' };
    }
    const wrapped = method === 'pkexec'
        ? `pkexec sh -c '${command.replace(/'/g, "'\\''")}'`
        : `sudo sh -c '${command.replace(/'/g, "'\\''")}'`;
    return execAsync(wrapped, { timeout });
}

// SSH helpers
async function getSshServiceName() {
    if (!(await hasCommand('systemctl'))) return null;
    const candidates = ['ssh', 'sshd', 'ssh.service', 'sshd.service'];
    for (const name of candidates) {
        const res = await execAsync(`systemctl show -p LoadState --value ${name} 2>/dev/null`, { timeout: 1500 });
        const state = String(res.stdout || '').trim();
        if (state === 'loaded') return name;
    }
    return null;
}

async function getSshServiceStatus(service) {
    const res = await execAsync(`systemctl is-active ${service} 2>/dev/null`, { timeout: 2000 });
    if (res.error) return 'unknown';
    const out = String(res.stdout || '').trim();
    return out === 'active' ? 'running' : 'stopped';
}

async function ensureSshPort(port) {
    const p = parseInt(port, 10);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return { success: false, error: 'Invalid port' };
    const cmd = `sed -i 's/^#\\?Port .*/Port ${p}/' /etc/ssh/sshd_config`;
    const res = await runPrivilegedSh(cmd, { timeout: 15000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
}

async function readFirstExistingTextFile(paths) {
    for (const p of paths) {
        try {
            const txt = await fs.promises.readFile(p, 'utf-8');
            const cleaned = String(txt || '').trim();
            if (cleaned) return { path: p, text: cleaned };
        } catch {
            // ignore
        }
    }
    return null;
}

// Tor helpers
async function getTorServiceName() {
    if (!(await hasCommand('systemctl'))) return null;
    const candidates = ['tor', 'tor@default', 'tor.service', 'tor@default.service'];
    for (const name of candidates) {
        const res = await execAsync(`systemctl show -p LoadState --value ${name} 2>/dev/null`, { timeout: 1500 });
        const state = String(res.stdout || '').trim();
        if (state === 'loaded') return name;
    }
    return null;
}

function registerSecurityHandlers() {
    // ============================================
    // TRACKER BLOCKING (Best Effort via /etc/hosts)
    // ============================================
    ipcMain.handle('security:trackerBlocking', async (event, enabled) => {
        if (process.platform !== 'linux') {
            return ipcError('Not supported on this platform');
        }

        const startMarker = '# --- TempleOS Remake Tracker Blocklist ---';
        const endMarker = '# --- /TempleOS Remake Tracker Blocklist ---';
        const hostsPath = '/etc/hosts';

        if (!enabled) {
            const cmd = `sed -i '/${startMarker}/,/${endMarker}/d' ${hostsPath}`;
            const res = await runPrivilegedSh(cmd);
            if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to remove blocklist');
            return ipcSuccess();
        }

        const trackers = [
            'google-analytics.com', 'www.google-analytics.com',
            'doubleclick.net', 'ad.doubleclick.net',
            'facebook.com', 'www.facebook.com', 'graph.facebook.com', 'connect.facebook.net',
            'analytics.twitter.com', 'ads.twitter.com', 'ads-api.twitter.com',
            'telemetry.microsoft.com', 'vortex.data.microsoft.com',
            'adservice.google.com'
        ];

        const lines = [startMarker, ...trackers.map(t => `0.0.0.0 ${t}`), endMarker];
        const content = lines.join('\\n');

        const cleanCmd = `sed -i '/${startMarker}/,/${endMarker}/d' ${hostsPath}`;
        const appendCmd = `printf "${content}\\n" | tee -a ${hostsPath} >/dev/null`;
        const fullCmd = `${cleanCmd} && ${appendCmd}`;

        const res = await runPrivilegedSh(fullCmd);
        if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to apply blocklist');
        return ipcSuccess();
    });

    // ============================================
    // TOR STATUS
    // ============================================
    ipcMain.handle('security:getTorStatus', async () => {
        if (process.platform !== 'linux') {
            return ipcSuccess({ supported: false, running: false });
        }

        let running = false;
        let backend = '';

        const services = ['tor', 'tor@default'];
        for (const svc of services) {
            const res = await execAsync(`systemctl is-active ${svc} 2>/dev/null`, { timeout: 2000 });
            if (!res.error) {
                backend = `systemctl:${svc}`;
                running = (res.stdout || '').trim() === 'active';
                break;
            }
        }

        if (!backend) {
            const res = await execAsync('pgrep -x tor 2>/dev/null', { timeout: 2000 });
            backend = 'pgrep';
            running = !res.error && !!String(res.stdout || '').trim();
        }

        let version = null;
        const ver = await execAsync('tor --version 2>/dev/null | head -n 1', { timeout: 2000 });
        if (!ver.error) {
            const line = String(ver.stdout || '').trim();
            if (line) version = line;
        }

        return ipcSuccess({ supported: true, running, backend, version });
    });

    ipcMain.handle('security:setTorEnabled', async (event, enabled) => {
        if (process.platform !== 'linux') {
            return ipcError('Not supported on this platform');
        }

        const on = !!enabled;
        const service = await getTorServiceName();
        if (!service) return ipcError('Tor service not found (install tor)');

        const cmd = `systemctl ${on ? 'start' : 'stop'} ${service}`;
        const res = await runPrivilegedSh(cmd, { timeout: 120000 });
        if (res.error) return ipcError(res.stderr || res.error.message || `Failed to ${on ? 'start' : 'stop'} Tor`);

        const status = await execAsync(`systemctl is-active ${service} 2>/dev/null`, { timeout: 2000 });
        const running = !status.error && (String(status.stdout || '').trim() === 'active');
        return ipcSuccess({ running, backend: `systemctl:${service}` });
    });

    ipcMain.handle('security:installTor', async () => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const res = await runPrivilegedSh('apt-get update && apt-get install -y tor', { timeout: 300000 });
        if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to install Tor');
        return ipcSuccess();
    });

    // ============================================
    // FIREWALL MANAGEMENT (UFW wrapper)
    // ============================================
    ipcMain.handle('security:getFirewallRules', async () => {
        if (process.platform !== 'linux') {
            return ipcSuccess({ active: false, rules: [] });
        }

        const statusRes = await runPrivilegedSh('ufw status numbered');
        if (statusRes.error) {
            if ((statusRes.stderr || '').includes('command not found')) {
                return ipcError('UFW not installed');
            }
            if ((statusRes.stdout || '').includes('Status: inactive')) {
                return ipcSuccess({ active: false, rules: [] });
            }
            return ipcError(statusRes.stderr || 'Failed to get status');
        }

        const lines = (statusRes.stdout || '').split('\n');
        const rules = [];
        const active = lines.some(l => l.toLowerCase().includes('status: active'));

        for (const line of lines) {
            const match = line.match(/^\[\s*(\d+)\] (.+?)\s+(ALLOW|DENY|REJECT)(?: IN)?\s+(.+)$/i);
            if (match) {
                rules.push({
                    id: parseInt(match[1], 10),
                    to: match[2].trim(),
                    action: match[3].toUpperCase(),
                    from: match[4].trim()
                });
            }
        }

        return ipcSuccess({ active, rules });
    });

    ipcMain.handle('security:addFirewallRule', async (event, port, protocol, action) => {
        if (process.platform !== 'linux') return ipcSuccess();

        const p = parseInt(port, 10);
        if (!Number.isFinite(p) || p < 1 || p > 65535) return ipcError('Invalid port');

        const proto = (protocol || 'tcp').toLowerCase();
        if (!['tcp', 'udp'].includes(proto)) return ipcError('Invalid protocol');

        const act = (action || 'allow').toLowerCase();
        if (!['allow', 'deny', 'reject'].includes(act)) return ipcError('Invalid action');

        const cmd = `ufw ${act} ${p}/${proto}`;
        const res = await runPrivilegedSh(cmd);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess();
    });

    ipcMain.handle('security:deleteFirewallRule', async (event, ruleId) => {
        if (process.platform !== 'linux') return ipcSuccess();

        const id = parseInt(ruleId, 10);
        if (!Number.isFinite(id)) return ipcError('Invalid rule ID');

        const cmd = `ufw --force delete ${id}`;
        const res = await runPrivilegedSh(cmd);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess();
    });

    ipcMain.handle('security:toggleFirewall', async (event, enable) => {
        if (process.platform !== 'linux') return ipcSuccess();
        const cmd = enable ? 'ufw enable' : 'ufw disable';
        const res = await runPrivilegedSh(cmd);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess();
    });

    // ============================================
    // VERACRYPT INTEGRATION
    // ============================================
    ipcMain.handle('security:getVeraCryptStatus', async () => {
        if (process.platform !== 'linux') {
            return ipcSuccess({ volumes: [] });
        }

        try {
            const res = await execAsync('veracrypt -t -l');
            if (res.error) {
                if ((res.stderr || '').includes('No volumes mounted') || (res.stdout || '').includes('No volumes mounted')) {
                    return ipcSuccess({ volumes: [] });
                }
                if ((res.stderr || '').includes('not found')) {
                    return ipcError('VeraCrypt not installed');
                }
                return ipcSuccess({ volumes: [] });
            }

            const volumes = [];
            const lines = res.stdout.split('\n');
            for (const line of lines) {
                const match = line.match(/^(\d+):\s+(.+?)\s+(.+?)\s+(.+)$/);
                if (match) {
                    volumes.push({
                        slot: parseInt(match[1]),
                        source: match[2],
                        mountPoint: match[3],
                        mapper: match[4]
                    });
                }
            }
            return ipcSuccess({ volumes });
        } catch (e) {
            return ipcError(String(e));
        }
    });

    ipcMain.handle('security:mountVeraCrypt', async (event, volumePath, password, slot) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const slotNum = slot || 1;
        const mountPoint = `/mnt/veracrypt${slotNum}`;

        await execAsync(`mkdir -p ${mountPoint}`);

        const cmd = `veracrypt -t --non-interactive --password="${shEscape(password)}" --pim="0" --keyfiles="" --protect-hidden="no" --slot=${slotNum} "${shEscape(volumePath)}" "${mountPoint}"`;

        const res = await runPrivilegedSh(cmd);
        if (res.error) return ipcError(res.stderr || res.stdout || 'Failed to mount volume');
        return ipcSuccess({ mountPoint });
    });

    ipcMain.handle('security:dismountVeraCrypt', async (event, slot) => {
        if (process.platform !== 'linux') return ipcSuccess();

        const cmd = `veracrypt -t -d ${slot ? '--slot=' + slot : ''}`;
        const res = await runPrivilegedSh(cmd);
        if (res.error) return ipcError(res.stderr || 'Failed to dismount');
        return ipcSuccess();
    });

    // ============================================
    // MAC RANDOMIZATION
    // ============================================
    ipcMain.handle('security:setMacRandomization', async (event, enabled) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const on = !!enabled;
        // Use nmcli to configure MAC randomization
        const mode = on ? 'random' : 'permanent';
        const res = await execAsync(`nmcli connection modify $(nmcli -t -f NAME,UUID connection show | head -1 | cut -d: -f2) 802-11-wireless.cloned-mac-address ${mode} 2>/dev/null`);
        if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to set MAC randomization');
        return ipcSuccess();
    });

    // ============================================
    // DNS SETTINGS
    // ============================================
    ipcMain.handle('set-dns', async (event, iface, primary, secondary) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const dns = [primary, secondary].filter(Boolean).join(' ');
        if (!dns) return ipcError('No DNS servers provided');

        const res = await runPrivilegedSh(`resolvectl dns ${shEscape(iface)} ${dns} 2>/dev/null || nmcli con mod $(nmcli -t -f NAME,DEVICE con show --active | grep ${shEscape(iface)} | cut -d: -f1) ipv4.dns "${dns}" 2>/dev/null`);
        if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to set DNS');
        return ipcSuccess();
    });

    // ============================================
    // LOCKDOWN MODE
    // ============================================
    ipcMain.handle('trigger-lockdown', async () => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        // Disconnect all network connections
        const res = await execAsync('nmcli networking off 2>/dev/null');
        if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to trigger lockdown');
        return ipcSuccess();
    });

    // ============================================
    // SSH SERVER CONTROL
    // ============================================
    ipcMain.handle('ssh:control', async (event, action, port) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const act = String(action || '').toLowerCase();
        const p = port === undefined || port === null ? null : parseInt(String(port), 10);

        if (!(await hasCommand('systemctl'))) return ipcError('systemctl not available');
        const service = await getSshServiceName();
        if (!service) return ipcError('SSH service not found (ssh/sshd)');

        if (act === 'status') {
            const status = await getSshServiceStatus(service);
            return ipcSuccess({ status });
        }

        if (act === 'start') {
            if (p !== null) {
                const portRes = await ensureSshPort(p);
                if (!portRes.success) return ipcError(portRes.error || 'Failed to set SSH port');
            }
            const res = await runPrivilegedSh(`systemctl start ${service}`, { timeout: 120000 });
            if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to start SSH service');
            const status = await getSshServiceStatus(service);
            return ipcSuccess({ status });
        }

        if (act === 'stop') {
            const res = await runPrivilegedSh(`systemctl stop ${service}`, { timeout: 120000 });
            if (res.error) return ipcError(res.stderr || res.error.message || 'Failed to stop SSH service');
            const status = await getSshServiceStatus(service);
            return ipcSuccess({ status });
        }

        if (act === 'regenerate-keys') {
            if (!(await hasCommand('ssh-keygen'))) return ipcError('ssh-keygen not available');

            const wasRunning = (await getSshServiceStatus(service)) === 'running';
            await runPrivilegedSh(`systemctl stop ${service} 2>/dev/null || true`, { timeout: 120000 });

            const regen = await runPrivilegedSh('rm -f /etc/ssh/ssh_host_* && ssh-keygen -A', { timeout: 120000 });
            if (regen.error) return ipcError(regen.stderr || regen.error.message || 'Failed to regenerate host keys');

            if (wasRunning) {
                await runPrivilegedSh(`systemctl start ${service} 2>/dev/null || true`, { timeout: 120000 });
            }

            return ipcSuccess();
        }

        if (act === 'get-pubkey') {
            const home = os.homedir();
            const userPaths = [
                path.join(home, '.ssh', 'id_ed25519.pub'),
                path.join(home, '.ssh', 'id_rsa.pub'),
                path.join(home, '.ssh', 'id_ecdsa.pub')
            ];
            const hostPaths = [
                '/etc/ssh/ssh_host_ed25519_key.pub',
                '/etc/ssh/ssh_host_rsa_key.pub',
                '/etc/ssh/ssh_host_ecdsa_key.pub'
            ];

            let userKey = await readFirstExistingTextFile(userPaths);
            if (!userKey && await hasCommand('ssh-keygen')) {
                try {
                    const sshDir = path.join(home, '.ssh');
                    await fs.promises.mkdir(sshDir, { recursive: true });
                    const keyBase = path.join(sshDir, 'id_ed25519');
                    const gen = await execAsync(`ssh-keygen -t ed25519 -N "" -f "${shEscape(keyBase)}" -q 2>/dev/null`, { timeout: 15000 });
                    if (!gen.error) {
                        userKey = await readFirstExistingTextFile([keyBase + '.pub']);
                    }
                } catch {
                    // ignore
                }
            }

            const hostKey = await readFirstExistingTextFile(hostPaths);
            if (!userKey && !hostKey) return ipcError('No SSH public keys found');

            const parts = [];
            if (userKey) parts.push(`# User public key (${userKey.path})\n${userKey.text}`);
            if (hostKey) parts.push(`# Host public key (${hostKey.path})\n${hostKey.text}`);
            return ipcSuccess({ pubkey: parts.join('\n\n').trim() });
        }

        return ipcError('Invalid action');
    });

    console.log('[IPC] Security handlers registered');
}

module.exports = { registerSecurityHandlers };
