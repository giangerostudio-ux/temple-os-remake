/**
 * Standalone Settings Window for Popout
 * This runs in a separate BrowserWindow with full electronAPI access
 */

// Window controls (use polling pattern for floating windows)
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');

// Declare global action variable for polling
declare global {
    interface Window {
        __floatingAction?: string | null;
    }
}

minimizeBtn?.addEventListener('click', () => {
    window.__floatingAction = 'minimize';
});

maximizeBtn?.addEventListener('click', () => {
    window.__floatingAction = 'maximize';
});

closeBtn?.addEventListener('click', () => {
    window.__floatingAction = 'close';
});

// Check if we have API access
if (!window.electronAPI) {
    document.body.innerHTML = '<div style="color: #ff4444; padding: 20px;">Error: electronAPI not available</div>';
    throw new Error('electronAPI not available in popout window');
}

// UI Elements
const sidebar = document.getElementById('settings-sidebar')!;
const content = document.getElementById('settings-content')!;

// Settings state
interface SettingsState {
    activeCategory: string;
    // System
    taskbarPosition: string;
    taskbarAutohide: boolean;
    // Personalization
    theme: string;
    systemFont: string;
    // Network
    wifiEnabled: boolean;
    torEnabled: boolean;
    // Gaming
    gamingMode: boolean;
    hideBarOnFullscreen: boolean;
    // Security
    firewallEnabled: boolean;
    encryptionEnabled: boolean;
    macRandomization: boolean;
    lockPassword: string;
    lockPin: string;
    // Accessibility
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
    jellyMode: boolean;
    // Devices
    audioOutput: string;
    audioInput: string;
    mouseSpeed: number;
    // Bluetooth
    bluetoothEnabled: boolean;
}

let state: SettingsState = {
    activeCategory: 'System',
    taskbarPosition: 'Bottom',
    taskbarAutohide: false,
    theme: 'TempleOS Green (Default)',
    systemFont: 'Fira Code',
    wifiEnabled: true,
    torEnabled: false,
    gamingMode: false,
    hideBarOnFullscreen: false,
    firewallEnabled: true,
    encryptionEnabled: false,
    macRandomization: false,
    lockPassword: '',
    lockPin: '',
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    jellyMode: false,
    audioOutput: 'Default',
    audioInput: 'Default',
    mouseSpeed: 5,
    bluetoothEnabled: false
};

// Categories
const categories = [
    'System',
    'Personalization',
    'Network',
    'Gaming',
    'Security',
    'Accessibility',
    'Devices',
    'Bluetooth',
    'About'
];

// Load settings from IPC config
async function loadSettings() {
    try {
        if (!window.electronAPI?.loadConfig) {
            console.warn('[Settings] electronAPI.loadConfig not available');
            return;
        }
        const result = await window.electronAPI.loadConfig();
        if (result.success && result.config) {
            state = { ...state, ...result.config };
        }
    } catch (e) {
        console.error('[Settings] Failed to load settings:', e);
    }
}

// Save settings to IPC config (broadcasts to all windows)
async function saveSettings() {
    try {
        if (!window.electronAPI?.saveConfig) {
            console.warn('[Settings] electronAPI.saveConfig not available');
            return;
        }
        await window.electronAPI.saveConfig(state);
    } catch (e) {
        console.error('[Settings] Failed to save settings:', e);
    }
}

// Listen for settings changes from other windows
if (window.electronAPI?.onConfigChanged) {
    window.electronAPI.onConfigChanged((config: Record<string, unknown>) => {
        console.log('[Settings] Config changed from another window:', config);
        state = { ...state, ...config };
        renderContent();
        attachContentHandlers();
    });
}

// SVG Icons for categories
const svgIcons: Record<string, string> = {
    System: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    Personalization: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="19" cy="17" r="2"></circle></svg>',
    Network: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
    Gaming: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>',
    Security: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    Accessibility: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    Devices: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="3" width="12" height="18" rx="6"></rect><line x1="12" y1="7" x2="12" y2="11"></line></svg>',
    Bluetooth: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>',
    About: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
};

// Render sidebar with icons
function renderSidebar() {
    sidebar.innerHTML = categories.map(cat => `
        <div class="settings-category ${cat === state.activeCategory ? 'active' : ''}" data-category="${cat}">
            <span class="icon">${svgIcons[cat] || ''}</span>
            <span class="label">${cat}</span>
        </div>
    `).join('');
}

// Attach sidebar event listeners using event delegation
function attachSidebarHandlers() {
    sidebar.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const categoryEl = target.closest('.settings-category');
        if (categoryEl) {
            const category = categoryEl.getAttribute('data-category');
            if (category) {
                state.activeCategory = category;
                renderSidebar();
                renderContent();
                attachContentHandlers();
            }
        }
    });
}

// Render content based on active category
function renderContent() {
    const header = `
        <div class="settings-header">
            <h2>${state.activeCategory}</h2>
            <p>TempleOS Settings</p>
        </div>
    `;

    let body = '';

    switch (state.activeCategory) {
        case 'System':
            body = renderSystemSettings();
            break;
        case 'Personalization':
            body = renderPersonalizationSettings();
            break;
        case 'Network':
            body = renderNetworkSettings();
            break;
        case 'Gaming':
            body = renderGamingSettings();
            break;
        case 'Security':
            body = renderSecuritySettings();
            break;
        case 'Accessibility':
            body = renderAccessibilitySettings();
            break;
        case 'Devices':
            body = renderDevicesSettings();
            break;
        case 'Bluetooth':
            body = renderBluetoothSettings();
            break;
        case 'About':
            body = renderAboutSettings();
            break;
        default:
            body = '<div>Select a category</div>';
    }

    content.innerHTML = header + body;
}

// Attach content event handlers
function attachContentHandlers() {
    // Checkboxes
    content.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            handleCheckboxChange(target.id, target.checked);
        });
    });

    // Selects
    content.querySelectorAll('select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            handleSelectChange(target.id, target.value);
        });
    });

    // Inputs
    content.querySelectorAll('input[type="number"], input[type="password"], input[type="text"]').forEach(inp => {
        inp.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            handleInputChange(target.id, target.value);
        });
    });

    // Buttons
    content.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLButtonElement;
            handleButtonClick(target.id);
        });
    });
}

// Handle checkbox changes
function handleCheckboxChange(id: string, checked: boolean) {
    console.log('[Settings] Checkbox changed:', id, checked);

    switch (id) {
        case 'taskbar-autohide':
            state.taskbarAutohide = checked;
            break;
        case 'wifi-enabled':
            state.wifiEnabled = checked;
            break;
        case 'tor-enabled':
            state.torEnabled = checked;
            break;
        case 'gaming-mode':
            state.gamingMode = checked;
            break;
        case 'hide-taskbar-fullscreen':
            state.hideBarOnFullscreen = checked;
            break;
        case 'firewall-enabled':
            state.firewallEnabled = checked;
            break;
        case 'encryption-enabled':
            state.encryptionEnabled = checked;
            break;
        case 'mac-randomization':
            state.macRandomization = checked;
            break;
        case 'high-contrast':
            state.highContrast = checked;
            break;
        case 'large-text':
            state.largeText = checked;
            break;
        case 'reduce-motion':
            state.reduceMotion = checked;
            break;
        case 'jelly-mode':
            state.jellyMode = checked;
            break;
        case 'bluetooth-enabled':
            state.bluetoothEnabled = checked;
            break;
    }

    saveSettings();
}

// Handle select changes
function handleSelectChange(id: string, value: string) {
    console.log('[Settings] Select changed:', id, value);

    switch (id) {
        case 'taskbar-position':
            state.taskbarPosition = value;
            break;
        case 'theme-select':
            state.theme = value;
            break;
        case 'font-select':
            state.systemFont = value;
            break;
        case 'audio-output':
            state.audioOutput = value;
            break;
        case 'audio-input':
            state.audioInput = value;
            break;
    }

    saveSettings();
}

// Handle input changes
function handleInputChange(id: string, value: string) {
    console.log('[Settings] Input changed:', id, value);

    switch (id) {
        case 'lock-password':
            state.lockPassword = value;
            break;
        case 'lock-pin':
            state.lockPin = value;
            break;
        case 'mouse-speed':
            state.mouseSpeed = parseInt(value) || 5;
            break;
    }

    saveSettings();
}

// Handle button clicks
function handleButtonClick(id: string) {
    console.log('[Settings] Button clicked:', id);

    switch (id) {
        case 'wallpaper-select-btn':
            alert('Wallpaper selection not yet implemented');
            break;
        case 'vpn-connect-btn':
            alert('VPN connection not yet implemented');
            break;
    }
}

// Card helper for consistent styling
function card(title: string, inner: string): string {
    return `
        <div style="border: 1px solid rgba(0,255,65,0.25); border-radius: 10px; padding: 14px; margin-bottom: 14px; background: rgba(0,0,0,0.18);">
            <div style="font-size: 16px; color: #ffd700; margin-bottom: 10px;">${title}</div>
            ${inner}
        </div>
    `;
}

function renderSystemSettings() {
    return `
        ${card('Sound', `
            <div style="display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 10px; align-items: center;">
                <div>Volume</div>
                <input type="range" class="volume-slider" min="0" max="100" value="50" style="width: 100%; accent-color: #00ff41;">

                <div>Output</div>
                <select class="audio-output-select" style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                    <option value="default">Default</option>
                </select>

                <div>Input</div>
                <select class="audio-input-select" style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                    <option value="default">Default</option>
                </select>
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                <button class="audio-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh devices</button>
            </div>
        `)}

        ${card('Time & Date', `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: bold;">Set time automatically</span>
                        <span style="font-size: 12px; opacity: 0.7;">Sync with God's NTP servers</span>
                    </div>
                    <input type="checkbox" class="auto-time-toggle" checked style="transform: scale(1.2); accent-color: #00ff41;">
                </label>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <span style="font-weight: bold;">Timezone</span>
                    <select class="timezone-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                        <option value="UTC">UTC</option>
                        <option value="Local" selected>Local</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                        <option value="Europe/London">Europe/London</option>
                    </select>
                </div>
            </div>
        `)}

        ${card('Memory Optimization', `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: bold;">Manual Cleanup</span>
                    <span style="font-size: 12px; opacity: 0.7;">Flush system caches and optimize RAM usage</span>
                </div>
                <button class="clean-memory-btn" style="background: rgba(0,255,65,0.1); border: 1px solid #00ff41; color: #00ff41; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">Clean RAM</button>
            </div>
        `)}

        ${card('Display', `
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; align-items: center;">
                <div>Monitor</div>
                <div style="display: flex; gap: 8px;">
                    <select class="display-output-select" style="flex: 1; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                        <option value="default">default</option>
                    </select>
                    <button class="display-move-btn" style="background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Move Here</button>
                </div>

                <div>Mode</div>
                <select class="display-mode-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                    <option value="1024x768@60Hz">1024 x 768 @ 60Hz</option>
                    <option value="1920x1080@60Hz" selected>1920 x 1080 @ 60Hz</option>
                    <option value="2560x1440@60Hz">2560 x 1440 @ 60Hz</option>
                </select>

                <div>Scale</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="range" class="display-scale-slider" min="0.75" max="2" step="0.05" value="1" style="flex: 1; accent-color: #00ff41;">
                    <span class="display-scale-value" style="min-width: 50px; text-align: center; color: #00ff41; font-weight: bold;">100%</span>
                    <button class="display-scale-reset-btn" style="background: rgba(255,100,100,0.1); border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">Reset</button>
                </div>

                <div>Orientation</div>
                <select class="display-transform-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 6px 10px; border-radius: 6px; font-family: inherit;">
                    <option value="normal" selected>Landscape</option>
                    <option value="90">Rotate 90°</option>
                    <option value="180">Rotate 180°</option>
                    <option value="270">Rotate 270°</option>
                </select>
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="display-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh displays</button>
            </div>
            <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Tip: scale works best on Wayland/Sway; on X11 some options may be limited.</div>
        `)}

        ${card('Lock Screen', `
            <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Win+L locks immediately. Password is currently fixed ("temple").</div>
        `)}

        ${card('Gaming', `
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <span>Gaming Mode (Disable Hotkeys)</span>
                <input type="checkbox" class="gaming-mode-toggle" ${state.gamingMode ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>
            <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Prevents Accidental Win/Meta Key presses.</div>
        `)}
    `;
}

function renderPersonalizationSettings() {
    return `
        <div class="settings-card">
            <h3>Theme</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Theme Selection
                    <small>Choose your visual style</small>
                </div>
                <select id="theme-select">
                    <option ${state.theme === 'TempleOS Green (Default)' ? 'selected' : ''}>TempleOS Green (Default)</option>
                    <option ${state.theme === 'Dark' ? 'selected' : ''}>Dark</option>
                    <option ${state.theme === 'Light' ? 'selected' : ''}>Light</option>
                </select>
            </div>
        </div>

        <div class="settings-card">
            <h3>Fonts</h3>
            <div class="setting-row">
                <div class="setting-label">
                    System Font
                    <small>Default font for applications</small>
                </div>
                <select id="font-select">
                    <option ${state.systemFont === 'Fira Code' ? 'selected' : ''}>Fira Code</option>
                    <option ${state.systemFont === 'VT323' ? 'selected' : ''}>VT323</option>
                    <option ${state.systemFont === 'Consolas' ? 'selected' : ''}>Consolas</option>
                </select>
            </div>
        </div>

        <div class="settings-card">
            <h3>Wallpaper</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Current Wallpaper
                    <small>Choose background image</small>
                </div>
                <button id="wallpaper-select-btn">Select Image</button>
            </div>
        </div>
    `;
}

function renderNetworkSettings() {
    return `
        <div class="settings-card">
            <h3>WiFi</h3>
            <div class="setting-row">
                <div class="setting-label">
                    WiFi Enabled
                    <small>Enable/disable WiFi adapter</small>
                </div>
                <input type="checkbox" id="wifi-enabled" ${state.wifiEnabled ? 'checked' : ''} />
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    Connected Network
                    <small>Current WiFi connection</small>
                </div>
                <span style="opacity: 0.7;">Not connected</span>
            </div>
        </div>

        <div class="settings-card">
            <h3>VPN</h3>
            <div class="setting-row">
                <div class="setting-label">
                    VPN Status
                    <small>Virtual Private Network</small>
                </div>
                <button id="vpn-connect-btn">Connect</button>
            </div>
        </div>

        <div class="settings-card">
            <h3>Tor</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Tor Service
                    <small>Anonymous browsing daemon</small>
                </div>
                <input type="checkbox" id="tor-enabled" ${state.torEnabled ? 'checked' : ''} />
            </div>
        </div>
    `;
}

function renderGamingSettings() {
    return `
        <div class="settings-card">
            <h3>Gaming Mode</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Enable Gaming Mode
                    <small>Optimize performance and suppress notifications</small>
                </div>
                <input type="checkbox" id="gaming-mode" ${state.gamingMode ? 'checked' : ''} />
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    Hide Taskbar in Fullscreen
                    <small>Allow true fullscreen experience</small>
                </div>
                <input type="checkbox" id="hide-taskbar-fullscreen" ${state.hideBarOnFullscreen ? 'checked' : ''} />
            </div>
        </div>

        <div class="settings-card">
            <h3>Game Launchers</h3>
            <div style="padding: 10px; opacity: 0.7; font-size: 12px;">
                Detected: Steam, Heroic Games
            </div>
        </div>
    `;
}

function renderSecuritySettings() {
    return `
        <div class="settings-card">
            <h3>Firewall</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Firewall Enabled
                    <small>Block unauthorized network access</small>
                </div>
                <input type="checkbox" id="firewall-enabled" ${state.firewallEnabled ? 'checked' : ''} />
            </div>
        </div>

        <div class="settings-card">
            <h3>Encryption</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Disk Encryption
                    <small>Encrypt your data with VeraCrypt</small>
                </div>
                <input type="checkbox" id="encryption-enabled" ${state.encryptionEnabled ? 'checked' : ''} />
            </div>
        </div>

        <div class="settings-card">
            <h3>Lock Screen</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Lock Screen Password
                    <small>Password to unlock screen</small>
                </div>
                <input type="password" placeholder="Enter password" id="lock-password" value="${state.lockPassword}" />
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    Lock Screen PIN
                    <small>Quick unlock with PIN</small>
                </div>
                <input type="password" placeholder="Enter PIN" id="lock-pin" value="${state.lockPin}" />
            </div>
        </div>

        <div class="settings-card">
            <h3>Privacy</h3>
            <div class="setting-row">
                <div class="setting-label">
                    MAC Randomization
                    <small>Randomize network hardware address</small>
                </div>
                <input type="checkbox" id="mac-randomization" ${state.macRandomization ? 'checked' : ''} />
            </div>
        </div>
    `;
}

function renderAccessibilitySettings() {
    return `
        <div class="settings-card">
            <h3>Visual</h3>
            <div class="setting-row">
                <div class="setting-label">
                    High Contrast Mode
                    <small>Improve visibility with high contrast</small>
                </div>
                <input type="checkbox" id="high-contrast" ${state.highContrast ? 'checked' : ''} />
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    Large Text
                    <small>Increase text size globally</small>
                </div>
                <input type="checkbox" id="large-text" ${state.largeText ? 'checked' : ''} />
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    Reduce Motion
                    <small>Minimize animations</small>
                </div>
                <input type="checkbox" id="reduce-motion" ${state.reduceMotion ? 'checked' : ''} />
            </div>
        </div>

        <div class="settings-card">
            <h3>Visual Effects</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Jelly Mode
                    <small>Enable wobbly window animations</small>
                </div>
                <input type="checkbox" id="jelly-mode" ${state.jellyMode ? 'checked' : ''} />
            </div>
        </div>
    `;
}

function renderDevicesSettings() {
    return `
        <div class="settings-card">
            <h3>Audio</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Output Device
                    <small>Select audio output</small>
                </div>
                <select id="audio-output">
                    <option ${state.audioOutput === 'Default' ? 'selected' : ''}>Default</option>
                    <option ${state.audioOutput === 'Speakers' ? 'selected' : ''}>Speakers</option>
                    <option ${state.audioOutput === 'Headphones' ? 'selected' : ''}>Headphones</option>
                </select>
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    Input Device
                    <small>Select microphone</small>
                </div>
                <select id="audio-input">
                    <option ${state.audioInput === 'Default' ? 'selected' : ''}>Default</option>
                    <option ${state.audioInput === 'Built-in Microphone' ? 'selected' : ''}>Built-in Microphone</option>
                </select>
            </div>
        </div>

        <div class="settings-card">
            <h3>Mouse</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Pointer Speed
                    <small>Adjust mouse sensitivity</small>
                </div>
                <input type="number" min="1" max="10" value="${state.mouseSpeed}" id="mouse-speed" />
            </div>
        </div>
    `;
}

function renderBluetoothSettings() {
    return `
        <div class="settings-card">
            <h3>Bluetooth</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Bluetooth Enabled
                    <small>Turn Bluetooth on/off</small>
                </div>
                <input type="checkbox" id="bluetooth-enabled" ${state.bluetoothEnabled ? 'checked' : ''} />
            </div>
            <div style="padding: 15px; text-align: center; opacity: 0.6; font-size: 12px;">
                No devices paired
            </div>
        </div>
    `;
}

function renderAboutSettings() {
    return `
        <div class="settings-card">
            <h3>System Information</h3>
            <div class="setting-row">
                <div class="setting-label">Operating System</div>
                <span style="opacity: 0.8;">TempleOS v1.0</span>
            </div>
            <div class="setting-row">
                <div class="setting-label">Architecture</div>
                <span style="opacity: 0.8;">x86_64</span>
            </div>
            <div class="setting-row">
                <div class="setting-label">Kernel</div>
                <span style="opacity: 0.8;">Linux 6.x</span>
            </div>
        </div>

        <div class="settings-card">
            <h3>About TempleOS</h3>
            <div style="padding: 15px; line-height: 1.6; opacity: 0.8; font-size: 12px;">
                TempleOS Recreation - A tribute to Terry A. Davis<br>
                Built with Electron + TypeScript<br>
                <br>
                In loving memory of a brilliant programmer.
            </div>
        </div>
    `;
}

// Initialize
async function init() {
    await loadSettings();
    renderSidebar();
    renderContent();
    attachSidebarHandlers();
    attachContentHandlers();
    console.log('[Settings Window] Initialized with IPC config sync');
}

void init();
