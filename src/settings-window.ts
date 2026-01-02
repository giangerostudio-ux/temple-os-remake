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

// Load settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('templeos-settings');
        if (saved) {
            state = { ...state, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('[Settings] Failed to load settings:', e);
    }
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem('templeos-settings', JSON.stringify(state));
    } catch (e) {
        console.error('[Settings] Failed to save settings:', e);
    }
}

// Render sidebar
function renderSidebar() {
    sidebar.innerHTML = categories.map(cat => `
        <div class="settings-category ${cat === state.activeCategory ? 'active' : ''}" data-category="${cat}">
            ${cat}
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

function renderSystemSettings() {
    return `
        <div class="settings-card">
            <h3>Display</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Resolution
                    <small>Current display resolution</small>
                </div>
                <select id="resolution-select">
                    <option>1920x1080</option>
                    <option>1366x768</option>
                    <option>2560x1440</option>
                </select>
            </div>
        </div>

        <div class="settings-card">
            <h3>Taskbar</h3>
            <div class="setting-row">
                <div class="setting-label">
                    Position
                    <small>Where to show the taskbar</small>
                </div>
                <select id="taskbar-position">
                    <option ${state.taskbarPosition === 'Bottom' ? 'selected' : ''}>Bottom</option>
                    <option ${state.taskbarPosition === 'Top' ? 'selected' : ''}>Top</option>
                </select>
            </div>
            <div class="setting-row">
                <div class="setting-label">
                    Auto-hide taskbar
                    <small>Hide when not in use</small>
                </div>
                <input type="checkbox" id="taskbar-autohide" ${state.taskbarAutohide ? 'checked' : ''} />
            </div>
        </div>
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
function init() {
    loadSettings();
    renderSidebar();
    renderContent();
    attachSidebarHandlers();
    attachContentHandlers();
    console.log('[Settings Window] Initialized with interactive controls');
}

void init();
