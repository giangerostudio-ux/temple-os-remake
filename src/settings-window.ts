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
    secureDelete: boolean;
    secureWipeOnShutdown: boolean;
    trackerBlockingEnabled: boolean;
    torMode: 'off' | 'browser-only' | 'system-wide';
    torRunning: boolean;
    torInstalled: boolean;
    duressPassword: string;
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
    // Network
    autoTime: boolean;
    timezone: string;
    colorScheme: string;
    heavenlyPulse: boolean;
    pulseIntensity: number;
    terryQuotes: boolean;
    liteMode: boolean;
    flightMode: boolean;
    vpnKillSwitch: boolean;
    hotspotEnabled: boolean;
    sshEnabled: boolean;
    // Display
    activeDisplayOutput: string;
    windowAnimations: boolean;
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
    secureDelete: false,
    secureWipeOnShutdown: false,
    trackerBlockingEnabled: false,
    torMode: 'off' as const,
    torRunning: false,
    torInstalled: false,
    duressPassword: '',
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    jellyMode: false,
    audioOutput: 'Default',
    audioInput: 'Default',
    mouseSpeed: 5,
    bluetoothEnabled: false,
    autoTime: true,
    timezone: 'Local',
    colorScheme: 'green',
    heavenlyPulse: true,
    pulseIntensity: 20,
    terryQuotes: true,
    liteMode: false,
    flightMode: false,
    vpnKillSwitch: false,
    hotspotEnabled: false,
    sshEnabled: false,
    activeDisplayOutput: '',
    windowAnimations: true
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
            const config = result.config as Record<string, unknown>;

            // Parse effects
            const effects = config.effects as { heavenlyPulse?: boolean; heavenlyPulseIntensity?: number; jellyMode?: boolean } | undefined;
            if (effects) {
                if (typeof effects.heavenlyPulse === 'boolean') state.heavenlyPulse = effects.heavenlyPulse;
                if (typeof effects.heavenlyPulseIntensity === 'number') state.pulseIntensity = effects.heavenlyPulseIntensity;
                if (typeof effects.jellyMode === 'boolean') state.jellyMode = effects.jellyMode;
            }

            // Parse theme
            if (config.themeMode === 'light' || config.themeMode === 'dark') {
                state.theme = config.themeMode as string;
            }
            if (typeof config.themeColor === 'string') {
                state.colorScheme = config.themeColor;
            }

            // Parse accessibility
            const accessibility = config.accessibility as { reduceMotion?: boolean; largeText?: boolean; highContrast?: boolean } | undefined;
            if (accessibility) {
                if (typeof accessibility.reduceMotion === 'boolean') {
                    state.liteMode = accessibility.reduceMotion;
                    state.reduceMotion = accessibility.reduceMotion;
                }
                if (typeof accessibility.largeText === 'boolean') state.largeText = accessibility.largeText;
                if (typeof accessibility.highContrast === 'boolean') state.highContrast = accessibility.highContrast;
            }

            // Parse security
            const security = config.security as {
                firewallEnabled?: boolean;
                encryptionEnabled?: boolean;
                macRandomization?: boolean;
                secureDelete?: boolean;
                secureWipeOnShutdown?: boolean;
                trackerBlockingEnabled?: boolean;
                torMode?: 'off' | 'browser-only' | 'system-wide';
                duressPassword?: string;
            } | undefined;
            if (security) {
                if (typeof security.firewallEnabled === 'boolean') state.firewallEnabled = security.firewallEnabled;
                if (typeof security.encryptionEnabled === 'boolean') state.encryptionEnabled = security.encryptionEnabled;
                if (typeof security.macRandomization === 'boolean') state.macRandomization = security.macRandomization;
                if (typeof security.secureDelete === 'boolean') state.secureDelete = security.secureDelete;
                if (typeof security.secureWipeOnShutdown === 'boolean') state.secureWipeOnShutdown = security.secureWipeOnShutdown;
                if (typeof security.trackerBlockingEnabled === 'boolean') state.trackerBlockingEnabled = security.trackerBlockingEnabled;
                if (security.torMode) state.torMode = security.torMode;
                if (typeof security.duressPassword === 'string') state.duressPassword = security.duressPassword;
            }

            // Parse lock screen and network (top-level)
            if (typeof config.lockPassword === 'string') state.lockPassword = config.lockPassword;
            if (typeof config.lockPin === 'string') state.lockPin = config.lockPin;
            if (typeof config.sshEnabled === 'boolean') state.sshEnabled = config.sshEnabled;

            console.log('[Settings] Loaded config, security state:', {
                firewallEnabled: state.firewallEnabled,
                encryptionEnabled: state.encryptionEnabled,
                trackerBlockingEnabled: state.trackerBlockingEnabled,
                macRandomization: state.macRandomization
            });
        }
    } catch (e) {
        console.error('[Settings] Failed to load settings:', e);
    }
}

// Note: Popout settings only saves to config and broadcasts changes.
// Visual effects (pulse, theme, colors) are applied by the main window when it receives the config.

// Save settings to IPC config (broadcasts to all windows)
// Converts flat state to nested format expected by SettingsManager
async function saveSettings() {
    try {
        if (!window.electronAPI?.saveConfig) {
            console.warn('[Settings] electronAPI.saveConfig not available');
            return;
        }

        // Convert flat state to nested format expected by main window's SettingsManager
        const nestedConfig = {
            // Theme
            themeMode: (state.theme === 'light' ? 'light' : 'dark') as 'light' | 'dark',
            themeColor: (state.colorScheme || 'green') as 'green' | 'amber' | 'cyan' | 'white',
            highContrast: state.highContrast || false,

            // Lock screen
            lockPassword: state.lockPassword || '',
            lockPin: state.lockPin || '',

            // Effects (this is what main window uses for pulse)
            effects: {
                heavenlyPulse: state.heavenlyPulse,
                heavenlyPulseIntensity: state.pulseIntensity,
                jellyMode: state.jellyMode || false
            },

            // Time
            time: {
                timezone: state.timezone,
                autoTime: state.autoTime
            },

            // Accessibility  
            accessibility: {
                reduceMotion: state.reduceMotion || state.liteMode,
                largeText: state.largeText || false,
                highContrast: state.highContrast || false
            },

            // Mouse
            mouse: {
                speed: state.mouseSpeed ? state.mouseSpeed / 10 : 0.5,
                raw: false,
                naturalScroll: false
            },

            // Network
            network: {
                vpnKillSwitchEnabled: state.vpnKillSwitch
            },

            // Security
            security: {
                firewallEnabled: state.firewallEnabled,
                encryptionEnabled: state.encryptionEnabled,
                macRandomization: state.macRandomization,
                secureDelete: state.secureDelete,
                secureWipeOnShutdown: state.secureWipeOnShutdown,
                trackerBlockingEnabled: state.trackerBlockingEnabled,
                torMode: state.torMode,
                duressPassword: state.duressPassword
            }
        };

        await window.electronAPI.saveConfig(nestedConfig);
    } catch (e) {
        console.error('[Settings] Failed to save settings:', e);
    }
}

// Listen for settings changes from other windows
if (window.electronAPI?.onConfigChanged) {
    window.electronAPI.onConfigChanged((config: Record<string, unknown>) => {
        console.log('[Settings] Config changed from another window:', config);

        // Translate nested config back to flat state format
        const effects = config.effects as { heavenlyPulse?: boolean; heavenlyPulseIntensity?: number } | undefined;
        if (effects) {
            if (typeof effects.heavenlyPulse === 'boolean') {
                state.heavenlyPulse = effects.heavenlyPulse;
            }
            if (typeof effects.heavenlyPulseIntensity === 'number') {
                state.pulseIntensity = effects.heavenlyPulseIntensity;
            }
        }

        if (config.themeMode === 'light' || config.themeMode === 'dark') {
            state.theme = config.themeMode as string;
        }
        if (typeof config.themeColor === 'string') {
            state.colorScheme = config.themeColor;
        }

        const accessibility = config.accessibility as { reduceMotion?: boolean; largeText?: boolean; highContrast?: boolean } | undefined;
        if (accessibility) {
            if (typeof accessibility.reduceMotion === 'boolean') {
                state.liteMode = accessibility.reduceMotion;
                state.reduceMotion = accessibility.reduceMotion;
            }
            if (typeof accessibility.largeText === 'boolean') {
                state.largeText = accessibility.largeText;
            }
            if (typeof accessibility.highContrast === 'boolean') {
                state.highContrast = accessibility.highContrast;
            }
        }

        // Parse security section
        const security = config.security as {
            firewallEnabled?: boolean;
            encryptionEnabled?: boolean;
            macRandomization?: boolean;
            secureDelete?: boolean;
            secureWipeOnShutdown?: boolean;
            trackerBlockingEnabled?: boolean;
            torMode?: 'off' | 'browser-only' | 'system-wide';
            duressPassword?: string;
        } | undefined;
        if (security) {
            if (typeof security.firewallEnabled === 'boolean') state.firewallEnabled = security.firewallEnabled;
            if (typeof security.encryptionEnabled === 'boolean') state.encryptionEnabled = security.encryptionEnabled;
            if (typeof security.macRandomization === 'boolean') state.macRandomization = security.macRandomization;
            if (typeof security.secureDelete === 'boolean') state.secureDelete = security.secureDelete;
            if (typeof security.secureWipeOnShutdown === 'boolean') state.secureWipeOnShutdown = security.secureWipeOnShutdown;
            if (typeof security.trackerBlockingEnabled === 'boolean') state.trackerBlockingEnabled = security.trackerBlockingEnabled;
            if (security.torMode) state.torMode = security.torMode;
            if (typeof security.duressPassword === 'string') state.duressPassword = security.duressPassword;
        }

        // Parse lock screen credentials (top-level)
        if (typeof config.lockPassword === 'string') state.lockPassword = config.lockPassword;
        if (typeof config.lockPin === 'string') state.lockPin = config.lockPin;
        if (typeof config.sshEnabled === 'boolean') state.sshEnabled = config.sshEnabled;

        renderContent(); // This now calls attachContentHandlers() internally
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

    // Re-attach event handlers after DOM update
    attachContentHandlers();
}

// Attach content event handlers - comprehensive implementation
function attachContentHandlers() {
    // ===== SYSTEM CATEGORY =====

    // Volume slider
    const volumeSlider = content.querySelector('.volume-slider') as HTMLInputElement;
    if (volumeSlider) {
        volumeSlider.addEventListener('input', async (e) => {
            const value = parseInt((e.target as HTMLInputElement).value);
            if (window.electronAPI?.setSystemVolume) {
                await window.electronAPI.setSystemVolume(value);
            }
        });
    }

    // Audio refresh button
    const audioRefreshBtn = content.querySelector('.audio-refresh-btn');
    if (audioRefreshBtn) {
        audioRefreshBtn.addEventListener('click', async () => {
            if (window.electronAPI?.listAudioDevices) {
                const result = await window.electronAPI.listAudioDevices();
                // Populate output dropdown
                const outputSelect = content.querySelector('.audio-output-select') as HTMLSelectElement;
                if (outputSelect && result?.sinks) {
                    outputSelect.innerHTML = result.sinks.map((s: { name: string; description?: string }) =>
                        `<option value="${s.name}">${s.description || s.name}</option>`
                    ).join('');
                }
                // Populate input dropdown
                const inputSelect = content.querySelector('.audio-input-select') as HTMLSelectElement;
                if (inputSelect && result?.sources) {
                    inputSelect.innerHTML = result.sources.map((s: { name: string; description?: string }) =>
                        `<option value="${s.name}">${s.description || s.name}</option>`
                    ).join('');
                }
            }
        });
    }

    // Audio output selection
    const audioOutputSelect = content.querySelector('.audio-output-select') as HTMLSelectElement;
    if (audioOutputSelect) {
        audioOutputSelect.addEventListener('change', async (e) => {
            const sinkName = (e.target as HTMLSelectElement).value;
            if (window.electronAPI?.setDefaultSink) {
                await window.electronAPI.setDefaultSink(sinkName);
            }
        });
    }

    // Audio input selection
    const audioInputSelect = content.querySelector('.audio-input-select') as HTMLSelectElement;
    if (audioInputSelect) {
        audioInputSelect.addEventListener('change', async (e) => {
            const sourceName = (e.target as HTMLSelectElement).value;
            if (window.electronAPI?.setDefaultSource) {
                await window.electronAPI.setDefaultSource(sourceName);
            }
        });
    }

    // Auto-time toggle
    const autoTimeToggle = content.querySelector('.auto-time-toggle') as HTMLInputElement;
    if (autoTimeToggle) {
        autoTimeToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.autoTime = checked;
            await saveSettings();
        });
    }

    // Timezone select
    const timezoneSelect = content.querySelector('.timezone-select') as HTMLSelectElement;
    if (timezoneSelect) {
        timezoneSelect.addEventListener('change', async (e) => {
            const value = (e.target as HTMLSelectElement).value;
            state.timezone = value;
            await saveSettings();
        });
    }

    // Clean RAM button
    const cleanMemoryBtn = content.querySelector('.clean-memory-btn');
    if (cleanMemoryBtn) {
        cleanMemoryBtn.addEventListener('click', () => {
            // Show feedback that cleanup was triggered
            const btn = cleanMemoryBtn as HTMLButtonElement;
            btn.textContent = 'Cleaning...';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = 'Clean RAM';
                btn.disabled = false;
            }, 1500);
        });
    }

    // Display refresh button - populates display outputs
    const displayRefreshBtn = content.querySelector('.display-refresh-btn');
    if (displayRefreshBtn) {
        displayRefreshBtn.addEventListener('click', async () => {
            if (window.electronAPI?.getDisplayOutputs) {
                const result = await window.electronAPI.getDisplayOutputs();
                if (result?.outputs && Array.isArray(result.outputs)) {
                    // Store first output as active
                    if (result.outputs.length > 0) {
                        state.activeDisplayOutput = result.outputs[0].name;
                    }
                    // Populate display dropdown if exists
                    const displaySelect = content.querySelector('.display-output-select') as HTMLSelectElement;
                    if (displaySelect) {
                        displaySelect.innerHTML = result.outputs.map((o: { name: string; current?: string }) =>
                            `<option value="${o.name}">${o.name}${o.current ? ` (${o.current})` : ''}</option>`
                        ).join('');
                    }
                }
            }
        });
    }

    // Display scale slider with debounced IPC call
    const displayScaleSlider = content.querySelector('.display-scale-slider') as HTMLInputElement;
    const displayScaleValue = content.querySelector('.display-scale-value');
    let scaleChangeTimer: number | null = null;
    if (displayScaleSlider && displayScaleValue) {
        displayScaleSlider.addEventListener('input', (e) => {
            const scale = parseFloat((e.target as HTMLInputElement).value);
            displayScaleValue.textContent = Math.round(scale * 100) + '%';

            // Debounce the IPC call
            if (scaleChangeTimer) clearTimeout(scaleChangeTimer);
            scaleChangeTimer = window.setTimeout(async () => {
                if (window.electronAPI?.setDisplayScale) {
                    // Use first display output or default
                    const outputName = state.activeDisplayOutput || 'default';
                    await window.electronAPI.setDisplayScale(outputName, scale);
                }
            }, 300);
        });
    }

    // Display scale reset button
    const displayScaleResetBtn = content.querySelector('.display-scale-reset-btn');
    if (displayScaleResetBtn && displayScaleSlider) {
        displayScaleResetBtn.addEventListener('click', async () => {
            displayScaleSlider.value = '1';
            if (displayScaleValue) displayScaleValue.textContent = '100%';
            if (window.electronAPI?.setDisplayScale) {
                const outputName = state.activeDisplayOutput || 'default';
                await window.electronAPI.setDisplayScale(outputName, 1);
            }
        });
    }

    // Gaming mode toggle
    const gamingModeToggle = content.querySelector('.gaming-mode-toggle') as HTMLInputElement;
    if (gamingModeToggle) {
        gamingModeToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.gamingMode = checked;
            if (window.electronAPI?.setGamingMode) {
                await window.electronAPI.setGamingMode(checked);
            }
            await saveSettings();
        });
    }

    // ===== PERSONALIZATION CATEGORY =====

    // Theme buttons (Dark/Light)
    content.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const theme = (e.target as HTMLElement).dataset.theme;
            if (!theme) return;
            state.theme = theme;
            // Apply theme to popout window DOM
            document.documentElement.dataset.themeMode = theme;
            if (theme === 'light') {
                document.body.style.background = '#f5f5f5';
                document.body.style.color = '#000000';
                document.documentElement.style.setProperty('--bg-color', '#f5f5f5');
            } else {
                document.body.style.background = '#000000';
                document.body.style.color = state.colorScheme === 'green' ? '#00ff41' :
                    state.colorScheme === 'amber' ? '#ffb000' :
                        state.colorScheme === 'cyan' ? '#00ffff' : '#ffffff';
                document.documentElement.style.setProperty('--bg-color', '#000000');
            }
            await saveSettings();
            renderContent();
        });
    });

    // Color scheme buttons
    content.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const color = (e.target as HTMLElement).dataset.color;
            if (!color) return;
            state.colorScheme = color;
            // Apply color to popout window
            const colors: Record<string, string> = {
                green: '#00ff41', amber: '#ffb000', cyan: '#00ffff', white: '#ffffff'
            };
            const mainColor = colors[color] || colors.green;
            document.documentElement.style.setProperty('--main-color', mainColor);
            document.documentElement.style.setProperty('--text-color', mainColor);
            document.documentElement.style.setProperty('--temple-glow-color', mainColor);
            document.body.style.color = mainColor;
            await saveSettings();
            renderContent();
        });
    });

    // Custom theme create button
    const customThemeCreateBtn = content.querySelector('.custom-theme-create-btn');
    if (customThemeCreateBtn) {
        customThemeCreateBtn.addEventListener('click', () => {
            const btn = customThemeCreateBtn as HTMLButtonElement;
            const originalText = btn.textContent;
            btn.textContent = 'Coming Soon...';
            setTimeout(() => btn.textContent = originalText, 1500);
        });
    }

    // Custom theme import button
    const customThemeImportBtn = content.querySelector('.custom-theme-import-btn');
    if (customThemeImportBtn) {
        customThemeImportBtn.addEventListener('click', () => {
            const btn = customThemeImportBtn as HTMLButtonElement;
            const originalText = btn.textContent;
            btn.textContent = 'Coming Soon...';
            setTimeout(() => btn.textContent = originalText, 1500);
        });
    }

    // Taskbar autohide toggle
    const taskbarAutohideToggle = content.querySelector('.taskbar-autohide-toggle') as HTMLInputElement;
    if (taskbarAutohideToggle) {
        taskbarAutohideToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.taskbarAutohide = checked;
            if (window.electronAPI?.setHideBarOnFullscreen) {
                await window.electronAPI.setHideBarOnFullscreen(checked);
            }
            await saveSettings();
        });
    }

    // Heavenly pulse toggle
    const heavenlyPulseToggle = content.querySelector('.heavenly-pulse-toggle') as HTMLInputElement;
    if (heavenlyPulseToggle) {
        heavenlyPulseToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.heavenlyPulse = checked;
            // Save config - main window will apply the effect
            await saveSettings();
            renderContent(); // Re-render to show/hide intensity slider
        });
    }

    // Pulse intensity slider
    const pulseIntensitySlider = content.querySelector('.pulse-intensity-slider') as HTMLInputElement;
    if (pulseIntensitySlider) {
        pulseIntensitySlider.addEventListener('input', async (e) => {
            const sliderValue = parseInt((e.target as HTMLInputElement).value); // 3-70
            const intensity = sliderValue / 100; // Convert to 0.03-0.70
            const valueSpan = (e.target as HTMLElement).parentElement?.querySelector('span:last-child');
            if (valueSpan) valueSpan.textContent = sliderValue + '%';
            state.pulseIntensity = intensity;
            // Save config - main window will apply the intensity
            await saveSettings();
        });
    }

    // Wallpaper browse button
    const wallpaperBrowseBtn = content.querySelector('.wallpaper-browse-btn');
    if (wallpaperBrowseBtn) {
        wallpaperBrowseBtn.addEventListener('click', () => {
            // TODO: Implement file picker dialog for wallpaper selection
            const btn = wallpaperBrowseBtn as HTMLButtonElement;
            const originalText = btn.textContent;
            btn.textContent = 'Coming Soon...';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1500);
        });
    }

    // Terry quotes toggle
    const quoteToggle = content.querySelector('.quote-notifications-toggle') as HTMLInputElement;
    if (quoteToggle) {
        quoteToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.terryQuotes = checked;
            await saveSettings();
        });
    }

    // Lite mode toggle
    const liteModeToggle = content.querySelector('.lite-mode-toggle') as HTMLInputElement;
    if (liteModeToggle) {
        liteModeToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.liteMode = checked;
            // Apply lite mode to local window
            if (checked) {
                document.body.classList.add('lite-mode');
                document.documentElement.classList.add('reduce-motion');
            } else {
                document.body.classList.remove('lite-mode');
                document.documentElement.classList.remove('reduce-motion');
            }
            await saveSettings();
        });
    }

    // ===== NETWORK CATEGORY =====

    // Flight mode toggle
    const flightModeToggle = content.querySelector('.flight-mode-toggle') as HTMLInputElement;
    if (flightModeToggle) {
        flightModeToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.flightMode = checked;
            // Disable WiFi toggle when in flight mode
            const wifiToggle = content.querySelector('.wifi-enabled-toggle') as HTMLInputElement;
            if (wifiToggle) {
                wifiToggle.disabled = checked;
                if (checked) {
                    wifiToggle.checked = false;
                    state.wifiEnabled = false;
                    if (window.electronAPI?.setWifiEnabled) {
                        await window.electronAPI.setWifiEnabled(false);
                    }
                }
            }
            await saveSettings();
            renderContent();
        });
    }

    // WiFi enabled toggle
    const wifiToggle = content.querySelector('.wifi-enabled-toggle') as HTMLInputElement;
    if (wifiToggle) {
        wifiToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.wifiEnabled = checked;
            if (window.electronAPI?.setWifiEnabled) {
                await window.electronAPI.setWifiEnabled(checked);
            }
            await saveSettings();
        });
    }

    // Network refresh button
    const netRefreshBtn = content.querySelector('.net-refresh-btn');
    if (netRefreshBtn) {
        netRefreshBtn.addEventListener('click', async () => {
            if (window.electronAPI?.getNetworkStatus) {
                await window.electronAPI.getNetworkStatus();
                // Re-render to show updated status
                renderContent();
            }
        });
    }

    // Network disconnect button
    const netDisconnectBtn = content.querySelector('.net-disconnect-btn');
    if (netDisconnectBtn) {
        netDisconnectBtn.addEventListener('click', async () => {
            if (window.electronAPI?.disconnectNetwork) {
                await window.electronAPI.disconnectNetwork();
                // Re-render to show disconnected status
                renderContent();
            }
        });
    }

    // VPN Kill Switch toggle
    const vpnKillswitchToggle = content.querySelector('.vpn-killswitch-toggle') as HTMLInputElement;
    if (vpnKillswitchToggle) {
        vpnKillswitchToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.vpnKillSwitch = checked;
            await saveSettings();
        });
    }

    // Hotspot toggle
    const hotspotToggle = content.querySelector('.hotspot-toggle') as HTMLInputElement;
    if (hotspotToggle) {
        hotspotToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.hotspotEnabled = checked;
            if (checked && window.electronAPI?.createHotspot) {
                await window.electronAPI.createHotspot('TempleOS_Hotspot');
            } else if (!checked && window.electronAPI?.stopHotspot) {
                await window.electronAPI.stopHotspot();
            }
            await saveSettings();
        });
    }

    // SSH toggle
    const sshToggle = content.querySelector('.ssh-toggle') as HTMLInputElement;
    if (sshToggle) {
        sshToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.sshEnabled = checked;
            if (window.electronAPI?.sshControl) {
                await window.electronAPI.sshControl(checked ? 'start' : 'stop');
            }
            await saveSettings();
        });
    }

    // ===== GAMING CATEGORY =====

    // Gaming mode toggle
    const gamingModeToggle2 = content.querySelector('#gaming-mode') as HTMLInputElement;
    if (gamingModeToggle2) {
        gamingModeToggle2.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.gamingMode = checked;
            if (window.electronAPI?.setGamingMode) {
                await window.electronAPI.setGamingMode(checked);
            }
            await saveSettings();
        });
    }

    // Hide taskbar in fullscreen toggle
    const hideTaskbarFullscreenToggle = content.querySelector('#hide-taskbar-fullscreen') as HTMLInputElement;
    if (hideTaskbarFullscreenToggle) {
        hideTaskbarFullscreenToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.hideBarOnFullscreen = checked;
            if (window.electronAPI?.setHideBarOnFullscreen) {
                await window.electronAPI.setHideBarOnFullscreen(checked);
            }
            await saveSettings();
        });
    }

    // ===== SECURITY CATEGORY =====

    // Firewall toggle (config only - no IPC)
    const firewallToggle = content.querySelector('#firewall-enabled') as HTMLInputElement;
    if (firewallToggle) {
        firewallToggle.addEventListener('change', async (e) => {
            state.firewallEnabled = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // Encryption toggle (config only - no IPC)
    const encryptionToggle = content.querySelector('#encryption-enabled') as HTMLInputElement;
    if (encryptionToggle) {
        encryptionToggle.addEventListener('change', async (e) => {
            state.encryptionEnabled = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // Lock password input
    const lockPasswordInput = content.querySelector('#lock-password') as HTMLInputElement;
    if (lockPasswordInput) {
        lockPasswordInput.addEventListener('change', async (e) => {
            state.lockPassword = (e.target as HTMLInputElement).value;
            await saveSettings();
        });
    }

    // Lock PIN input
    const lockPinInput = content.querySelector('#lock-pin') as HTMLInputElement;
    if (lockPinInput) {
        lockPinInput.addEventListener('change', async (e) => {
            state.lockPin = (e.target as HTMLInputElement).value;
            await saveSettings();
        });
    }

    // MAC Randomization toggle
    const macRandomizationToggle = content.querySelector('#mac-randomization') as HTMLInputElement;
    if (macRandomizationToggle) {
        macRandomizationToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.macRandomization = checked;
            await saveSettings();
        });
    }

    // Secure Delete toggle
    const secureDeleteToggle = content.querySelector('#secure-delete') as HTMLInputElement;
    if (secureDeleteToggle) {
        secureDeleteToggle.addEventListener('change', async (e) => {
            state.secureDelete = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // Secure Wipe on Shutdown toggle
    const secureWipeToggle = content.querySelector('#secure-wipe-shutdown') as HTMLInputElement;
    if (secureWipeToggle) {
        secureWipeToggle.addEventListener('change', async (e) => {
            state.secureWipeOnShutdown = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // Tracker Blocking toggle
    const trackerBlockingToggle = content.querySelector('#tracker-blocking') as HTMLInputElement;
    if (trackerBlockingToggle) {
        trackerBlockingToggle.addEventListener('change', async (e) => {
            state.trackerBlockingEnabled = (e.target as HTMLInputElement).checked;
            if (window.electronAPI?.setTrackerBlocking) {
                await window.electronAPI.setTrackerBlocking(state.trackerBlockingEnabled);
            }
            await saveSettings();
        });
    }

    // Tor Mode select
    const torModeSelect = content.querySelector('.tor-mode-select') as HTMLSelectElement;
    if (torModeSelect) {
        torModeSelect.addEventListener('change', async (e) => {
            state.torMode = (e.target as HTMLSelectElement).value as 'off' | 'browser-only' | 'system-wide';
            await saveSettings();
            renderContent(); // Re-render to show/hide start/stop buttons
        });
    }

    // Tor Install button
    const torInstallBtn = content.querySelector('.tor-install-btn');
    if (torInstallBtn) {
        torInstallBtn.addEventListener('click', async () => {
            if (window.electronAPI?.installTor) {
                await window.electronAPI.installTor();
                state.torInstalled = true;
                renderContent();
            }
        });
    }

    // Tor Start button
    const torStartBtn = content.querySelector('.tor-start-btn');
    if (torStartBtn) {
        torStartBtn.addEventListener('click', async () => {
            if ((window.electronAPI as any)?.startTor) {
                await (window.electronAPI as any).startTor();
                state.torRunning = true;
                renderContent();
            }
        });
    }

    // Tor Stop button
    const torStopBtn = content.querySelector('.tor-stop-btn');
    if (torStopBtn) {
        torStopBtn.addEventListener('click', async () => {
            if ((window.electronAPI as any)?.stopTor) {
                await (window.electronAPI as any).stopTor();
                state.torRunning = false;
                renderContent();
            }
        });
    }

    // Emergency Lockdown / Panic button
    const panicLockdownBtn = content.querySelector('.panic-lockdown-btn');
    if (panicLockdownBtn) {
        panicLockdownBtn.addEventListener('click', async () => {
            if ((window.electronAPI as any)?.emergencyLockdown) {
                await (window.electronAPI as any).emergencyLockdown();
            }
        });
    }

    // Save Password button
    const savePasswordBtn = content.querySelector('.save-password-btn');
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', async () => {
            const passwordInput = content.querySelector('#lock-password') as HTMLInputElement;
            const confirmInput = content.querySelector('.lock-password-confirm') as HTMLInputElement;
            if (passwordInput && confirmInput) {
                if (passwordInput.value !== confirmInput.value) {
                    alert('Passwords do not match');
                    return;
                }
                state.lockPassword = passwordInput.value;
                await saveSettings();
                confirmInput.value = '';
            }
        });
    }

    // Save Duress Password button
    const saveDuressBtn = content.querySelector('.save-duress-btn');
    if (saveDuressBtn) {
        saveDuressBtn.addEventListener('click', async () => {
            const duressInput = content.querySelector('.duress-input') as HTMLInputElement;
            const confirmInput = content.querySelector('.duress-confirm') as HTMLInputElement;
            if (duressInput && confirmInput) {
                if (duressInput.value !== confirmInput.value) {
                    alert('Duress passwords do not match');
                    return;
                }
                if (duressInput.value === state.lockPassword || duressInput.value === state.lockPin) {
                    alert('Duress password cannot be the same as your real password or PIN!');
                    return;
                }
                state.duressPassword = duressInput.value;
                await saveSettings();
                confirmInput.value = '';
            }
        });
    }

    // Save PIN button
    const savePinBtn = content.querySelector('.save-pin-btn');
    if (savePinBtn) {
        savePinBtn.addEventListener('click', async () => {
            const pinInput = content.querySelector('#lock-pin') as HTMLInputElement;
            const confirmInput = content.querySelector('.lock-pin-confirm') as HTMLInputElement;
            if (pinInput && confirmInput) {
                if (pinInput.value !== confirmInput.value) {
                    alert('PINs do not match');
                    return;
                }
                state.lockPin = pinInput.value;
                await saveSettings();
                confirmInput.value = '';
            }
        });
    }

    // Test Lock Screen button
    const testLockBtn = content.querySelector('.test-lock-btn');
    if (testLockBtn) {
        testLockBtn.addEventListener('click', async () => {
            if ((window.electronAPI as any)?.lockScreen) {
                await (window.electronAPI as any).lockScreen();
            }
        });
    }

    // ===== ACCESSIBILITY CATEGORY =====

    // High contrast toggle
    const highContrastToggle = content.querySelector('#high-contrast') as HTMLInputElement;
    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', async (e) => {
            state.highContrast = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // Large text toggle
    const largeTextToggle = content.querySelector('#large-text') as HTMLInputElement;
    if (largeTextToggle) {
        largeTextToggle.addEventListener('change', async (e) => {
            state.largeText = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // Reduce motion toggle
    const reduceMotionToggle = content.querySelector('#reduce-motion') as HTMLInputElement;
    if (reduceMotionToggle) {
        reduceMotionToggle.addEventListener('change', async (e) => {
            state.reduceMotion = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // Jelly mode toggle
    const jellyModeToggle = content.querySelector('#jelly-mode') as HTMLInputElement;
    if (jellyModeToggle) {
        jellyModeToggle.addEventListener('change', async (e) => {
            state.jellyMode = (e.target as HTMLInputElement).checked;
            await saveSettings();
        });
    }

    // ===== DEVICES CATEGORY =====

    // Audio output select
    const audioOutputSelectDev = content.querySelector('#audio-output') as HTMLSelectElement;
    if (audioOutputSelectDev) {
        audioOutputSelectDev.addEventListener('change', async (e) => {
            const value = (e.target as HTMLSelectElement).value;
            state.audioOutput = value;
            if (window.electronAPI?.setDefaultSink) {
                await window.electronAPI.setDefaultSink(value);
            }
            await saveSettings();
        });
    }

    // Audio input select
    const audioInputSelectDev = content.querySelector('#audio-input') as HTMLSelectElement;
    if (audioInputSelectDev) {
        audioInputSelectDev.addEventListener('change', async (e) => {
            const value = (e.target as HTMLSelectElement).value;
            state.audioInput = value;
            if (window.electronAPI?.setDefaultSource) {
                await window.electronAPI.setDefaultSource(value);
            }
            await saveSettings();
        });
    }

    // Mouse speed input
    const mouseSpeedInput = content.querySelector('#mouse-speed') as HTMLInputElement;
    if (mouseSpeedInput) {
        mouseSpeedInput.addEventListener('change', async (e) => {
            const value = parseInt((e.target as HTMLInputElement).value) || 5;
            state.mouseSpeed = Math.max(1, Math.min(10, value));
            if (window.electronAPI?.applyMouseSettings) {
                await window.electronAPI.applyMouseSettings({ speed: state.mouseSpeed / 10, raw: false, naturalScroll: false });
            }
            await saveSettings();
        });
    }

    // ===== BLUETOOTH CATEGORY =====

    // Bluetooth enabled toggle
    const bluetoothToggle = content.querySelector('#bluetooth-enabled') as HTMLInputElement;
    if (bluetoothToggle) {
        bluetoothToggle.addEventListener('change', async (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            state.bluetoothEnabled = checked;
            if (window.electronAPI?.setBluetoothEnabled) {
                await window.electronAPI.setBluetoothEnabled(checked);
            }
            await saveSettings();
        });
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
        ${card('Theme', `
            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                <button class="theme-btn" data-theme="dark" style="padding: 8px 16px; background: transparent; color: #00ff41; border: 1px solid #00ff41; cursor: pointer; border-radius: 6px;">Dark</button>
                <button class="theme-btn" data-theme="light" style="padding: 8px 16px; background: transparent; color: #00ff41; border: 1px solid #00ff41; cursor: pointer; border-radius: 6px;">Light</button>
            </div>
            
            <div style="font-size: 14px; color: #ffd700; margin-bottom: 8px;">Color Scheme</div>
            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                ${['green', 'amber', 'cyan', 'white'].map(c => `
                    <button class="theme-color-btn" data-color="${c}" style="
                        width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
                        background: ${c === 'green' ? '#00ff41' : c === 'amber' ? '#ffb000' : c === 'cyan' ? '#00ffff' : '#ffffff'};
                        border: 1px solid rgba(255,255,255,0.3);
                    " title="${c.charAt(0).toUpperCase() + c.slice(1)}"></button>
                `).join('')}
            </div>

            <div style="opacity: 0.65; margin-top: 8px; font-size: 12px;">Theme is applied to the shell; app themes inherit it.</div>
        `)}

        ${card('Custom Themes', `
            <div style="margin-bottom: 10px;">
                <div style="opacity: 0.6; font-size: 12px;">No custom themes found.</div>
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <button class="custom-theme-create-btn" style="background: rgba(0,255,65,0.1); border: 1px solid #00ff41; color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-family: inherit;">+ Create New Theme</button>
                    <button class="custom-theme-import-btn" style="background: none; border: 1px solid rgba(0,255,65,0.4); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-family: inherit;">Import JSON</button>
                </div>
            </div>
        `)}

        ${card('Visual Effects', `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Window Animations</span>
                    <input type="checkbox" disabled checked title="Cannot disable animations in this version (use Lite Mode)">
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Heavenly Pulse</span>
                    <input type="checkbox" class="heavenly-pulse-toggle" ${state.heavenlyPulse ? 'checked' : ''} style="cursor: pointer;">
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Pulse Intensity</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="range" class="pulse-intensity-slider" min="3" max="70" value="${Math.round(state.pulseIntensity * 100)}" style="width: 100px; cursor: pointer; accent-color: #00ff41;">
                        <span style="min-width: 35px; text-align: right;">${Math.round(state.pulseIntensity * 100)}%</span>
                    </div>
                </label>
            </div>
        `)}

        ${card('Color Scheme', `
            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                ${['green', 'amber', 'cyan', 'white'].map(c => `
                    <button class="theme-color-btn" data-color="${c}" style="
                        width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
                        background: ${c === 'green' ? '#00ff41' : c === 'amber' ? '#ffb000' : c === 'cyan' ? '#00ffff' : '#ffffff'};
                        border: ${state.colorScheme === c ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)'};
                        box-shadow: ${state.colorScheme === c ? '0 0 10px rgba(255,255,255,0.5)' : 'none'};
                    " title="${c.charAt(0).toUpperCase() + c.slice(1)}"></button>
                `).join('')}
            </div>
            <div style="opacity: 0.65; font-size: 12px;">Theme is applied to the shell; app themes inherit it.</div>
        `)}

        ${card('Divine Settings', `
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 10px;">
                <span>Random Terry Quotes</span>
                <input type="checkbox" class="quote-notifications-toggle" ${state.terryQuotes ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>
        `)}

        ${card('Performance', `
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <span>Lite Mode (No Animations)</span>
                <input type="checkbox" class="lite-mode-toggle" ${state.liteMode ? 'checked' : ''} style="transform: scale(1.2); accent-color: #00ff41;">
            </label>
        `)}
    `;
}

function renderNetworkSettings() {
    return `
        ${card('Status', `
            <div style="font-weight: bold; color: #ffd700; margin-bottom: 6px;">netplan-enp0s3</div>
            <div style="font-size: 12px; opacity: 0.85;">ethernet</div>
            <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                <div style="display: flex; gap: 20px;">
                    <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
                        <input type="checkbox" class="flight-mode-toggle" />
                        <span style="opacity: 0.9;">✈️ Flight Mode</span>
                    </label>
                    <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
                        <input type="checkbox" class="wifi-enabled-toggle" checked />
                        <span style="opacity: 0.9;">Wi‑Fi</span>
                    </label>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="net-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Refresh</button>
                    <button class="net-disconnect-btn" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Disconnect</button>
                </div>
            </div>
        `)}

        ${card('Wi‑Fi Networks', `
            <div style="opacity: 0.6;">No Wi‑F

i networks found.</div>
        `)}

        ${card('Saved Networks', `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: rgba(0,0,0,0.2);">
                    <div style="min-width: 0;">
                        <div style="font-weight: bold; color: #00ff41;">netplan-enp0s3</div>
                        <div style="font-size: 12px; opacity: 0.75;">802-3-ethernet • enp0s3</div>
                    </div>
                    <div style="display:flex; gap: 8px;">
                        <button style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Connect</button>
                        <button style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Forget</button>
                    </div>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(0,255,65,0.2); border-radius: 8px; background: rgba(0,0,0,0.2);">
                    <div style="min-width: 0;">
                        <div style="font-weight: bold; color: #00ff41;">lo</div>
                        <div style="font-size: 12px; opacity: 0.75;">loopback • lo</div>
                    </div>
                    <div style="display:flex; gap: 8px;">
                        <button style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Connect</button>
                        <button style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Forget</button>
                    </div>
                </div>
            </div>
        `)}

        ${card('VPN Profiles', `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                <div style="font-size: 12px; opacity: 0.8;">Manage OpenVPN / WireGuard profiles (NetworkManager).</div>
                <div style="display: flex; gap: 10px;">
                    <button style="background: none; border: 1px solid rgba(0,255,65,0.45); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Import OpenVPN</button>
                    <button style="background: none; border: 1px solid rgba(0,255,65,0.45); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Import WireGuard</button>
                </div>
            </div>
            <div style="opacity: 0.6;">No VPN profiles found. Import one to get started.</div>
            <div style="font-size: 11px; opacity: 0.6; margin-top: 10px; border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;">
                OpenVPN import may require the NetworkManager OpenVPN plugin. WireGuard requires NetworkManager WireGuard support.
            </div>
        `)}

        ${card('VPN Kill Switch', `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <div style="font-weight: bold; color: #888;">Disabled</div>
                    <div style="font-size: 12px; opacity: 0.7;">Block network traffic if VPN disconnects.</div>
                </div>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="vpn-killswitch-toggle">
                    <span>Off</span>
                </label>
            </div>
            <div style="display: grid; grid-template-columns: 110px 1fr; gap: 8px; font-size: 13px; margin-bottom: 10px;">
                <div style="opacity: 0.7;">VPN</div>
                <div style="color: #ff6464;">Not connected</div>
                <div style="opacity: 0.7;">Mode</div>
                <select style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;">
                    <option value="auto" selected>Auto (arm on VPN connect)</option>
                    <option value="strict">Strict (block when VPN down)</option>
                </select>
            </div>
            <div style="font-size: 11px; opacity: 0.6; margin-top: 10px;">Enable to prevent traffic leaks if your VPN disconnects.</div>
        `)}

        ${card('Mobile Hotspot', `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <div style="font-weight: bold; color: #888;">Off</div>
                    <div style="font-size: 12px; opacity: 0.7;">Share internet connection</div>
                </div>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="hotspot-toggle">
                    <span>Off</span>
                </label>
            </div>
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 13px; opacity: 0.8;">
                <div>Network Name</div><div>TempleOS_Hotspot</div>
                <div>Password</div><div><span style="opacity:0.5">None</span></div>
                <div>Band</div><div>2.4 GHz / 5 GHz</div>
            </div>
            <button style="margin-top: 10px; background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 10px; border-radius: 4px; cursor: pointer;">Edit Settings</button>
        `)}

        ${card('SSH Server', `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <div style="font-weight: bold; color: #888;">Stopped</div>
                    <div style="font-size: 12px; opacity: 0.7;">Allow remote SSH connections</div>
                </div>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="ssh-toggle">
                    <span>Off</span>
                </label>
            </div>
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 13px; margin-bottom: 10px;">
                <div style="opacity: 0.7;">Port</div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" value="22" min="1" max="65535" style="flex: 0 0 100px; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px; font-family: inherit;">
                    <span style="font-size: 11px; opacity: 0.6;">(Default: 22)</span>
                </div>
                <div style="opacity: 0.7;">Status</div>
                <div style="color: #888; font-size: 12px;">⚪ Unknown</div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Regenerate Keys</button>
                <button style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">View Public Key</button>
            </div>
            <div style="font-size: 11px; opacity: 0.6; margin-top: 10px; border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;">
                ⚠️ Warning: Enabling SSH allows remote terminal access. Ensure your password is secure.
            </div>
        `)}
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
    // Security score calculation
    const checks = [
        { name: 'Encryption', enabled: state.encryptionEnabled, weight: 23 },
        { name: 'Firewall', enabled: state.firewallEnabled, weight: 18 },
        { name: 'SSH Disabled', enabled: !state.sshEnabled, weight: 13 },
        { name: 'Tracker Blocking', enabled: state.trackerBlockingEnabled, weight: 12 },
        { name: 'Tor Mode', enabled: state.torMode !== 'off' && state.torRunning, weight: 12 },
        { name: 'MAC Randomization', enabled: state.macRandomization, weight: 10 },
        { name: 'Secure Wipe', enabled: state.secureWipeOnShutdown, weight: 8 },
        { name: 'Lock Screen', enabled: state.lockPassword !== '', weight: 4 },
    ];
    const score = checks.reduce((sum, c) => sum + (c.enabled ? c.weight : 0), 0);
    const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
    const percentage = Math.round((score / maxScore) * 100);
    let scoreColor = '#ff6464';
    let scoreLabel = 'Poor';
    if (percentage >= 80) { scoreColor = '#00ff41'; scoreLabel = 'Excellent'; }
    else if (percentage >= 60) { scoreColor = '#ffd700'; scoreLabel = 'Good'; }
    else if (percentage >= 40) { scoreColor = '#ffb000'; scoreLabel = 'Fair'; }

    return `
        ${card('Encryption (LUKS)', `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <div style="font-weight: bold; color: ${state.encryptionEnabled ? '#00ff41' : '#ff6464'};">${state.encryptionEnabled ? 'Encrypted' : 'Not Encrypted'}</div>
                    <div style="font-size: 12px; opacity: 0.7;">God's temple is sealed against heathens.</div>
                </div>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="encryption-enabled" ${state.encryptionEnabled ? 'checked' : ''}>
                    <span>${state.encryptionEnabled ? 'On' : 'Off'}</span>
                </label>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="encryption-change-key-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Change Key</button>
                <button class="encryption-backup-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Backup Header</button>
            </div>
        `)}

        ${card('Divine Firewall', `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <div style="font-weight: bold; color: ${state.firewallEnabled ? '#00ff41' : '#ff6464'};">${state.firewallEnabled ? 'Active' : 'Disabled'}</div>
                    <div style="font-size: 12px; opacity: 0.7;">Block unwanted spirits and connections.</div>
                </div>
                <label style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="firewall-enabled" ${state.firewallEnabled ? 'checked' : ''}>
                    <span>${state.firewallEnabled ? 'On' : 'Off'}</span>
                </label>
            </div>
            <div style="border: 1px solid rgba(0,255,65,0.2); border-radius: 6px; padding: 10px; background: rgba(0,0,0,0.2); margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">Add New Rule</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <input type="number" class="fw-port-input" placeholder="Port" style="width: 70px; background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px;">
                    <select class="fw-proto-select" style="background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px;">
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                    </select>
                    <select class="fw-action-select" style="background: rgba(0,255,65,0.1); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px;">
                        <option value="ALLOW">ALLOW</option>
                        <option value="DENY">DENY</option>
                    </select>
                    <button class="fw-add-btn" style="background: #00ff41; color: #000; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">Add</button>
                </div>
            </div>
            <div style="font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>Active Rules</span>
                <button class="fw-refresh-btn" style="background: none; border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 2px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;">↻ Refresh</button>
            </div>
            <div style="opacity: 0.6; font-size: 12px;">No custom rules defined.</div>
        `)}

        ${card('Privacy & Anonymity', `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>MAC Address Randomization</span>
                    <input type="checkbox" id="mac-randomization" ${state.macRandomization ? 'checked' : ''}>
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Secure Delete (Overwrite)</span>
                    <input type="checkbox" id="secure-delete" ${state.secureDelete ? 'checked' : ''}>
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; flex-direction: column;">
                        <span>Clear RAM on Shutdown</span>
                        <span style="font-size: 10px; opacity: 0.6;">Resets session state. Safe for files.</span>
                    </div>
                    <input type="checkbox" id="secure-wipe-shutdown" ${state.secureWipeOnShutdown ? 'checked' : ''}>
                </label>
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; flex-direction: column;">
                        <span>Tracker Blocking</span>
                        <span style="font-size: 10px; opacity: 0.6;">Block ads, trackers, and analytics</span>
                    </div>
                    <input type="checkbox" id="tracker-blocking" ${state.trackerBlockingEnabled ? 'checked' : ''}>
                </label>
            </div>
        `)}

        ${card('Tor Integration', `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <div style="font-weight: bold; color: ${state.torRunning ? '#00ff41' : '#888'};">
                        🧅 ${state.torRunning ? 'Tor Running' : 'Tor Off'}
                    </div>
                    <div style="font-size: 12px; opacity: 0.7;">Route traffic through Tor network for anonymity</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; font-size: 13px; margin-bottom: 10px;">
                <div style="opacity: 0.7;">Mode</div>
                <select class="tor-mode-select" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 4px 8px; border-radius: 4px;">
                    <option value="off" ${state.torMode === 'off' ? 'selected' : ''}>Off - Normal Internet</option>
                    <option value="browser-only" ${state.torMode === 'browser-only' ? 'selected' : ''}>Browser Only</option>
                    <option value="system-wide" ${state.torMode === 'system-wide' ? 'selected' : ''}>System-wide (slow)</option>
                </select>
                <div style="opacity: 0.7;">Installed</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: ${state.torInstalled ? '#00ff41' : '#ff6464'};">${state.torInstalled ? '✓ Yes' : '✗ No'}</span>
                    ${!state.torInstalled ? '<button class="tor-install-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Install Tor</button>' : ''}
                </div>
            </div>
            ${state.torMode !== 'off' && !state.torRunning ? '<button class="tor-start-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Start Tor</button>' : ''}
            ${state.torRunning ? '<button class="tor-stop-btn" style="background: none; border: 1px solid rgba(255,100,100,0.5); color: #ff6464; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Stop Tor</button>' : ''}
            <div style="font-size: 11px; opacity: 0.6; margin-top: 10px; border-top: 1px solid rgba(0,255,65,0.1); padding-top: 8px;">
                ⚠️ System-wide Tor routes ALL traffic through Tor. Very slow, may break some apps.
            </div>
        `)}

        ${card('Emergency Lockdown', `
            <div style="text-align: center;">
                <button class="panic-lockdown-btn" style="background: linear-gradient(135deg, #ff3333, #cc0000); color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    🚨 PANIC: Lock & Disconnect
                </button>
                <div style="font-size: 12px; opacity: 0.7; margin-top: 10px;">
                    Immediately locks screen and disables all network connections.
                </div>
            </div>
        `)}

        ${card('🛡️ Security Audit', `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 48px; font-weight: bold; color: ${scoreColor}; margin-bottom: 5px;">${percentage}%</div>
                <div style="font-size: 14px; color: ${scoreColor}; font-weight: bold;">${scoreLabel}</div>
                <div style="font-size: 11px; opacity: 0.6; margin-top: 3px;">Security Score</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
                <div style="height: 8px; background: ${scoreColor}; width: ${percentage}%; transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
                ${checks.map(c => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: ${c.enabled ? 'rgba(0,255,65,0.1)' : 'rgba(255,100,100,0.05)'}; border-left: 3px solid ${c.enabled ? '#00ff41' : '#ff6464'}; border-radius: 4px;">
                        <span>${c.enabled ? '✅' : '❌'} ${c.name}</span>
                        <span style="opacity: 0.6; font-size: 11px;">${c.weight}pts</span>
                    </div>
                `).join('')}
            </div>
        `)}

        ${card('Lock Screen Password', `
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; align-items: center;">
                <div>Password</div>
                <input type="password" id="lock-password" value="${state.lockPassword}" placeholder="Password" style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; box-sizing: border-box;">
                <div>Confirm</div>
                <input type="password" class="lock-password-confirm" placeholder="Confirm password" style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; box-sizing: border-box;">
                <div></div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="save-password-btn" style="background: #00ff41; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Save</button>
                    <span style="font-size: 11px; opacity: 0.6;">Sets the password required to unlock the screen.</span>
                </div>
            </div>
        `)}

        ${card('Duress Password (Panic Login)', `
            <div style="background: rgba(255,200,0,0.1); border: 1px solid rgba(255,200,0,0.3); border-radius: 6px; padding: 10px; margin-bottom: 10px; font-size: 12px; line-height: 1.5;">
                <div style="margin-bottom: 8px;">If someone forces you to unlock your computer, enter this password instead of your real one.</div>
                <div style="margin-bottom: 8px;">The system will appear to unlock normally, but shows a <strong style="color: #ffd700;">fake empty desktop</strong> - hiding all your real files.</div>
            </div>
            <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center;">
                <div style="font-size: 12px;">Password</div>
                <input type="password" class="duress-input" placeholder="Set duress password..." value="${state.duressPassword}" style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px;">
                <div style="font-size: 12px;">Confirm</div>
                <input type="password" class="duress-confirm" placeholder="Confirm duress password..." style="background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px;">
                <div></div>
                <button class="save-duress-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Save</button>
            </div>
        `)}

        ${card('Lock Screen PIN', `
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; align-items: center;">
                <div>PIN</div>
                <input type="password" id="lock-pin" value="${state.lockPin}" placeholder="PIN (numbers only)" inputmode="numeric" style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; box-sizing: border-box;">
                <div>Confirm</div>
                <input type="password" class="lock-pin-confirm" placeholder="Confirm PIN" inputmode="numeric" style="width: 100%; background: rgba(0,255,65,0.08); border: 1px solid rgba(0,255,65,0.3); color: #00ff41; padding: 8px 12px; border-radius: 6px; box-sizing: border-box;">
                <div></div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="save-pin-btn" style="background: #00ff41; color: #000; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Save</button>
                    <span style="font-size: 11px; opacity: 0.6;">PIN for lock screen (default: 7777). Leave empty to disable.</span>
                </div>
            </div>
        `)}

        ${card('Lock Screen', `
            <button class="test-lock-btn" style="background: none; border: 1px solid rgba(0,255,65,0.5); color: #00ff41; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Test Lock Screen</button>
            <div style="font-size: 12px; opacity: 0.65; margin-top: 8px;">Test the lock screen with your current password/PIN settings.</div>
        `)}
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
    renderContent(); // This now calls attachContentHandlers() internally
    attachSidebarHandlers();
    console.log('[Settings Window] Initialized with IPC config sync');
}

void init();
