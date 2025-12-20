import type { NetworkStatus, WifiNetwork, MonitorStats } from '../utils/types';

export class NetworkManager {
    // State
    public status: NetworkStatus = { connected: false };
    public wifiNetworks: WifiNetwork[] = [];
    public lastError: string | null = null;
    public wifiEnabled = true;
    public savedNetworks: Array<{ name: string; uuid: string; type: string; device: string }> = [];

    // VPN Kill Switch
    public vpnKillSwitchEnabled = false;
    public vpnKillSwitchMode: 'auto' | 'strict' = 'auto';
    public vpnKillSwitchArmed = false;
    public vpnKillSwitchBlocked = false;
    public vpnKillSwitchSnoozeUntil: number | null = null;
    public vpnKillSwitchLastDisconnected: string[] = [];
    public vpnKillSwitchLastEnforceAt = 0;

    // Data Usage
    public dataUsageDailyLimit = 0;
    public dataUsageTrackingEnabled = false;
    public dataUsageStartRx = 0;
    public dataUsageStartTx = 0;
    public dataUsageHistory: Array<{ timestamp: number; rx: number; tx: number }> = [];

    // Hotspot
    public hotspotEnabled = false;
    public hotspotSSID = 'TempleOS_Hotspot';
    public hotspotPassword = '';
    public hotspotLoading = false;

    // Tor Integration
    public torMode: 'off' | 'browser-only' | 'system-wide' = 'off';
    public torStatus: { running: boolean; installed: boolean } = { running: false, installed: false };

    // Callbacks
    private onUpdate: () => void = () => { };
    private onNotify: (title: string, msg: string, type: 'info' | 'warning' | 'error' | 'divine', actions?: any[]) => void = () => { };
    private onPrompt: (opts: any) => Promise<string | null> = async () => null;
    private onConfirm: (opts: any) => Promise<boolean> = async () => false;

    constructor() { }

    public setCallbacks(
        onUpdate: () => void,
        onNotify: (title: string, msg: string, type: 'info' | 'warning' | 'error' | 'divine', actions?: any[]) => void,
        onPrompt: (opts: any) => Promise<string | null>,
        onConfirm: (opts: any) => Promise<boolean>
    ) {
        this.onUpdate = onUpdate;
        this.onNotify = onNotify;
        this.onPrompt = onPrompt;
        this.onConfirm = onConfirm;
    }

    public async refreshStatus(): Promise<void> {
        if (!window.electronAPI?.getNetworkStatus) return;

        let shouldUpdate = false;

        try {
            const res = await window.electronAPI.getNetworkStatus();
            if (res.success && res.status) {
                const next = res.status as NetworkStatus;
                // Only trigger update if connection state actually changed
                // (Simple deep comparison for stability)
                if (JSON.stringify(this.status) !== JSON.stringify(next) ||
                    this.lastError !== null) { // if recovering from error, always update
                    this.status = next;
                    this.lastError = null;
                    shouldUpdate = true;
                }
            } else {
                this.lastError = res.error || 'Failed to read network status';
                this.status = { connected: false };
            }
        } catch (e) {
            this.lastError = String(e);
            this.status = { connected: false };
        }

        await this.evaluateVpnKillSwitch();

        const preWifi = JSON.stringify(this.wifiNetworks);
        await this.refreshWifiNetworks();
        if (JSON.stringify(this.wifiNetworks) !== preWifi) shouldUpdate = true;

        const preEnabled = this.wifiEnabled;
        await this.refreshWifiEnabled();
        if (this.wifiEnabled !== preEnabled) shouldUpdate = true;

        const preSaved = JSON.stringify(this.savedNetworks);
        await this.refreshSavedNetworks();
        if (JSON.stringify(this.savedNetworks) !== preSaved) shouldUpdate = true;

        const preTor = JSON.stringify(this.torStatus);
        await this.refreshTorStatus();
        if (JSON.stringify(this.torStatus) !== preTor) shouldUpdate = true;

        if (shouldUpdate) {
            this.onUpdate();
        }
    }

    public async refreshTorStatus(): Promise<void> {
        if (!window.electronAPI?.getTorStatus) {
            this.torStatus = { running: false, installed: false };
            return;
        }

        try {
            const res = await window.electronAPI.getTorStatus();
            if (res.success) {
                this.torStatus = {
                    running: !!res.running,
                    installed: !!(res as any).installed
                };
            } else if ((res as any).unsupported) {
                this.torStatus = { running: false, installed: false };
            }
        } catch {
            // ignore
        }
    }

    private async refreshWifiNetworks(): Promise<void> {
        if (!window.electronAPI?.listWifiNetworks) return;
        try {
            const res = await window.electronAPI.listWifiNetworks();
            if (res.success && res.networks) {
                this.wifiNetworks = res.networks;
            }
        } catch {
            // ignore
        }
    }

    private async refreshWifiEnabled(): Promise<void> {
        if (!window.electronAPI?.getWifiEnabled) return;
        try {
            const res = await window.electronAPI.getWifiEnabled();
            if (res.success) {
                this.wifiEnabled = res.enabled ?? true;
            } else if ((res as any)?.unsupported) {
                this.wifiEnabled = false;
            }
        } catch {
            // ignore
        }
    }

    public async refreshSavedNetworks(): Promise<void> {
        if (!window.electronAPI?.listSavedNetworks) return;
        try {
            const res = await window.electronAPI.listSavedNetworks();
            if (res.success && Array.isArray(res.networks)) {
                this.savedNetworks = (res.networks as any[])
                    .filter(n => n && typeof n.name === 'string' && typeof n.uuid === 'string')
                    .map(n => ({ name: String(n.name), uuid: String(n.uuid), type: String(n.type || ''), device: String(n.device || '') }))
                    .slice(0, 50);
            }
        } catch {
            // ignore
        }
    }

    // VPN Kill Switch Logic
    private async evaluateVpnKillSwitch(): Promise<void> {
        if (!this.vpnKillSwitchEnabled) return;
        if (!window.electronAPI?.disconnectNonVpn) return;

        // Reset snooze if time passed
        if (this.vpnKillSwitchSnoozeUntil && Date.now() > this.vpnKillSwitchSnoozeUntil) {
            this.vpnKillSwitchSnoozeUntil = null;
        }
        if (this.vpnKillSwitchSnoozeUntil) return;

        const vpn = this.status.vpn || { connected: false };
        const isVpnConnected = vpn.connected;

        // Auto mode logic
        if (this.vpnKillSwitchMode === 'auto') {
            if (isVpnConnected) {
                this.vpnKillSwitchArmed = true;
                this.vpnKillSwitchBlocked = false;
            } else {
                if (this.vpnKillSwitchArmed) {
                    this.vpnKillSwitchBlocked = true;
                    // Kill
                    const res = await window.electronAPI.disconnectNonVpn();
                    if (res.success && res.disconnected && res.disconnected.length > 0) {
                        this.vpnKillSwitchLastDisconnected = res.disconnected;
                        this.onNotify('VPN Kill Switch', `Blocked traffic on: ${res.disconnected.join(', ')}`, 'warning', [
                            { id: 'open-settings', label: 'Settings' }
                        ]);
                    }
                }
            }
        } else {
            // Strict mode
            if (!isVpnConnected) {
                this.vpnKillSwitchBlocked = true;
                const res = await window.electronAPI.disconnectNonVpn();
                if (res.success && res.disconnected && res.disconnected.length > 0) {
                    // Check if we already notified recently to avoid spam?
                    // For now just notify
                    if (Date.now() - (this.vpnKillSwitchLastEnforceAt || 0) > 5000) {
                        this.vpnKillSwitchLastDisconnected = res.disconnected;
                        this.onNotify('VPN Kill Switch', `Strict mode: Blocked traffic on ${res.disconnected.join(', ')}`, 'warning', [
                            { id: 'open-settings', label: 'Settings' }
                        ]);
                        this.vpnKillSwitchLastEnforceAt = Date.now();
                    }
                }
            } else {
                this.vpnKillSwitchBlocked = false;
            }
        }
    }

    public async snoozeVpnKillSwitch(seconds: number): Promise<void> {
        const sec = Math.max(5, Math.min(600, Math.floor(seconds)));
        this.vpnKillSwitchSnoozeUntil = Date.now() + sec * 1000;
        await this.restoreConnections(this.vpnKillSwitchLastDisconnected);

        this.onNotify('VPN Kill Switch', `Snoozed for ${sec}s. Reconnect your VPN now.`, 'warning', [
            { id: 'open-settings', label: 'Open Settings' }
        ]);

        this.onUpdate();
        // Refresh status shortly after to accept connections
        setTimeout(() => this.refreshStatus(), 750);
    }

    public async restoreConnections(keys: string[]): Promise<void> {
        const unique = Array.from(new Set(keys.map(k => String(k || '').trim()).filter(Boolean))).slice(0, 6);
        if (!unique.length) return;
        if (!window.electronAPI?.connectSavedNetwork) return;

        for (const key of unique) {
            try {
                await window.electronAPI.connectSavedNetwork(key);
            } catch {
                // ignore
            }
        }
    }

    // Connect WiFi
    public async connectWifi(ssid: string, security: string): Promise<void> {
        if (!window.electronAPI?.connectWifi) return;

        // Easter egg
        if (ssid === 'CIA_SURVEILLANCE_VAN_7') {
            const pw = await this.onPrompt({
                title: '🕵️ CLASSIFIED NETWORK',
                message: 'This network requires authorization. Enter access code:',
                inputLabel: 'Access Code',
                placeholder: 'Enter the year of divine creation...',
                password: true,
                confirmText: 'Authenticate',
                cancelText: 'Abort'
            });
            if (pw === null) return;

            if (pw === '1969') {
                this.onNotify('CIA', 'Identity Confirmed. Have a nice day, Mr. Davis.', 'divine');
                // Could open window here but we prefer decoupling. 
                // We'll leave the window opening logic for now or implement via callback if needed.
                return;
            } else {
                this.onNotify('CIA', 'ACCESS DENIED. DISPATCHING UNIT.', 'error');
                return;
            }
        }

        let password = '';
        if (security && security !== '--') {
            const pw = await this.onPrompt({
                title: `Connect to ${ssid}`,
                message: 'Enter Wi-Fi Password:',
                inputLabel: 'Password',
                password: true,
                confirmText: 'Connect',
                cancelText: 'Cancel'
            });
            if (pw === null) return;
            password = pw;
        }

        this.onNotify('Network', `Connecting to ${ssid}...`, 'info');
        try {
            const res = await window.electronAPI.connectWifi(ssid, password);
            if (res.success) {
                this.onNotify('Network', `Connected to ${ssid}`, 'divine');
            } else {
                this.onNotify('Network', res.error || `Failed to connect to ${ssid}`, 'error');
            }
        } catch (e) {
            this.onNotify('Network', String(e), 'error');
        }

        await this.refreshStatus();
    }

    public async toggleHotspot(enable: boolean): Promise<void> {
        if (!window.electronAPI?.createHotspot) {
            this.hotspotEnabled = false;
            this.onNotify('Hotspot', 'Hotspot control not available.', 'warning');
            this.onUpdate();
            return;
        }

        this.hotspotLoading = true;
        this.hotspotEnabled = enable;
        this.onUpdate();

        try {
            if (enable) {
                const res = await window.electronAPI.createHotspot(this.hotspotSSID, this.hotspotPassword);
                if (res.success) {
                    this.onNotify('Hotspot', `Hotspot active: ${this.hotspotSSID}`, 'divine');
                } else {
                    this.hotspotEnabled = false;
                    this.onNotify('Hotspot', res.error || 'Failed to start hotspot', 'error');
                }
            } else if (window.electronAPI?.stopHotspot) {
                const res = await window.electronAPI.stopHotspot();
                if (!res.success) {
                    this.onNotify('Hotspot', res.error || 'Failed to stop hotspot', 'warning');
                }
            }
        } catch (e) {
            this.hotspotEnabled = !enable;
            this.onNotify('Hotspot', `Error: ${e}`, 'error');
        } finally {
            this.hotspotLoading = false;
            this.onUpdate();
            await this.refreshStatus();
        }
    }

    public async editHotspotSettings(): Promise<void> {
        const ssid = await this.onPrompt({
            title: 'Hotspot Settings',
            message: 'Enter Network Name (SSID):',
            defaultValue: this.hotspotSSID,
            placeholder: 'TempleOS_Hotspot'
        });
        if (ssid === null) return;

        const pwd = await this.onPrompt({
            title: 'Hotspot Settings',
            message: 'Enter Password (min 8 chars, leave empty for open):',
            defaultValue: this.hotspotPassword,
            placeholder: '********'
        });
        if (pwd === null) return;

        this.hotspotSSID = ssid || 'TempleOS_Hotspot';
        this.hotspotPassword = pwd;
        // Config saving should happen in main (via onUpdate trigger -> serialization)
        // We'll rely on global state saving for this.

        this.onUpdate();

        if (this.hotspotEnabled) {
            const confirm = await this.onConfirm({
                title: 'Restart Hotspot?',
                message: 'Settings changed. Restart hotspot to apply?',
                confirmText: 'Restart',
                cancelText: 'Later'
            });
            if (confirm) {
                await this.toggleHotspot(false);
                await this.toggleHotspot(true);
            }
        }
    }

    public updateDataUsage(stats: MonitorStats | null) {
        if (!this.dataUsageTrackingEnabled || !stats?.network) return;

        const rx = stats.network.rxBytes || 0;
        const tx = stats.network.txBytes || 0;

        // Current totals for the session deltas
        if (this.dataUsageStartRx === 0 && rx > 0) this.dataUsageStartRx = rx;
        if (this.dataUsageStartTx === 0 && tx > 0) this.dataUsageStartTx = tx;

        const deltaRx = Math.max(0, rx - this.dataUsageStartRx);
        const deltaTx = Math.max(0, tx - this.dataUsageStartTx);

        const now = Date.now();
        const dayStart = now - (now % 86400000);

        let today = this.dataUsageHistory.find(d => d.timestamp >= dayStart);
        if (!today) {
            today = { timestamp: dayStart, rx: 0, tx: 0 };
            this.dataUsageHistory.push(today);
            // Limit history to 30 days
            if (this.dataUsageHistory.length > 30) this.dataUsageHistory.shift();
        }

        // We store the total for the day. Since it's cumulative since session start,
        // we just update it. In a real OS we'd add session deltas to persisted historical data.
        today.rx = deltaRx;
        today.tx = deltaTx;

        // Check limit
        if (this.dataUsageDailyLimit > 0 && (deltaRx + deltaTx) > this.dataUsageDailyLimit) {
            // We could trigger a notification here if we haven't already today
        }

        this.onUpdate();
    }

    public resetDataUsage() {
        this.dataUsageHistory = [];
        this.dataUsageStartRx = this.status.wifi?.signal || 0; // fallback if monitor not active
        // Better: reset start offsets to current values
        this.dataUsageStartRx = 0; // Will be set on next update
        this.dataUsageStartTx = 0;
        this.onUpdate();
        this.onNotify('Data Usage', 'Usage statistics reset', 'info');
    }

    public async importVpnProfile(kind: 'openvpn' | 'wireguard'): Promise<void> {
        if (!window.electronAPI?.importVpnProfile) {
            this.onNotify('VPN', 'VPN import requires Electron/Linux integration.', 'warning');
            return;
        }

        const title = kind === 'wireguard' ? 'Import WireGuard Profile' : 'Import OpenVPN Profile';
        const placeholder = kind === 'wireguard' ? '/home/user/wg0.conf' : '/home/user/vpn.ovpn';

        const filePath = await this.onPrompt({
            title,
            message: 'Enter the full path to the VPN config file:',
            placeholder,
            confirmText: 'Import',
            cancelText: 'Cancel'
        });

        if (!filePath) return;

        try {
            this.onNotify('VPN', 'Importing profile...', 'info');
            const res = await window.electronAPI.importVpnProfile(kind, filePath);
            if (!res.success) {
                this.onNotify('VPN', res.error || 'Import failed', 'error');
                return;
            }
            this.onNotify('VPN', 'Profile imported successfully.', 'info');
            await this.refreshSavedNetworks();
            await this.refreshStatus();
        } catch (e) {
            this.onNotify('VPN', `Import failed: ${String(e)}`, 'error');
        }
    }
}
