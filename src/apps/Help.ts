
import { escapeHtml } from '../utils/helpers';

interface ShortcutCategory {
    name: string;
    shortcuts: Array<{ key: string; desc: string }>;
}

interface FAQItem {
    question: string;
    answer: string;
}

export class HelpApp {
    public currentTab: 'guide' | 'shortcuts' | 'faq' | 'tribute' | 'about' = 'guide';

    // Comprehensive Keyboard Shortcuts organized by category
    private shortcutCategories: ShortcutCategory[] = [
        {
            name: '🪟 Window Management',
            shortcuts: [
                { key: 'Alt + Tab', desc: 'Switch between windows' },
                { key: 'Alt + Shift + Tab', desc: 'Switch windows (reverse)' },
                { key: 'Alt + F4', desc: 'Close active window' },
                { key: 'Win + ↑', desc: 'Maximize window' },
                { key: 'Win + ↓', desc: 'Restore / Minimize' },
                { key: 'Win + ←', desc: 'Snap window to left' },
                { key: 'Win + →', desc: 'Snap window to right' },
                { key: 'Win + D', desc: 'Show desktop (minimize all)' },
            ]
        },
        {
            name: '🖥️ Virtual Desktops',
            shortcuts: [
                { key: 'Ctrl + Win + ←', desc: 'Previous workspace' },
                { key: 'Ctrl + Win + →', desc: 'Next workspace' },
                { key: 'Ctrl + Win + 1-4', desc: 'Switch to workspace 1-4' },
                { key: 'Ctrl + Shift + Win + 1-4', desc: 'Move window to workspace' },
                { key: 'Win + Tab', desc: 'Workspace overview' },
            ]
        },
        {
            name: '📱 App Shortcuts',
            shortcuts: [
                { key: 'Win / Super', desc: 'Open Start Menu' },
                { key: 'Win + T', desc: 'Open Terminal' },
                { key: 'Win + E', desc: 'Open File Browser' },
                { key: 'Win + L', desc: 'Lock screen' },
                { key: 'Ctrl + Shift + Esc', desc: 'Task Manager' },
                { key: 'Win + X', desc: 'Quick link menu' },
            ]
        },
        {
            name: '📝 Editor & Text',
            shortcuts: [
                { key: 'Ctrl + S', desc: 'Save file' },
                { key: 'Ctrl + O', desc: 'Open file' },
                { key: 'Ctrl + N', desc: 'New file' },
                { key: 'Ctrl + Z', desc: 'Undo' },
                { key: 'Ctrl + Y', desc: 'Redo' },
                { key: 'Ctrl + F', desc: 'Find' },
                { key: 'Ctrl + H', desc: 'Find & Replace' },
                { key: 'F5', desc: 'Run HolyC code' },
            ]
        },
        {
            name: '📁 File Browser',
            shortcuts: [
                { key: 'Ctrl + C', desc: 'Copy selected' },
                { key: 'Ctrl + X', desc: 'Cut selected' },
                { key: 'Ctrl + V', desc: 'Paste' },
                { key: 'Delete', desc: 'Delete selected' },
                { key: 'F2', desc: 'Rename' },
                { key: 'Ctrl + H', desc: 'Toggle hidden files' },
                { key: 'Backspace', desc: 'Go to parent folder' },
            ]
        },
        {
            name: '💻 Terminal',
            shortcuts: [
                { key: '↑ / ↓', desc: 'Command history' },
                { key: 'Tab', desc: 'Autocomplete' },
                { key: 'Ctrl + C', desc: 'Cancel command' },
                { key: 'Ctrl + L', desc: 'Clear screen' },
                { key: 'Ctrl + Shift + F', desc: 'Search in output' },
            ]
        },
        {
            name: '🔧 System',
            shortcuts: [
                { key: 'F11', desc: 'Toggle fullscreen' },
                { key: 'Print Screen', desc: 'Screenshot (if supported)' },
            ]
        }
    ];

    // Getting Started Guide
    private guideSteps = [
        {
            title: 'Welcome to TempleOS Remake',
            content: 'This is a faithful recreation of Terry Davis\'s TempleOS, rebuilt as a custom desktop shell for modern Linux systems. It preserves the authentic 16-color aesthetic while providing real system integration and utility.',
            icon: '✝️'
        },
        {
            title: 'The Desktop',
            content: 'The desktop displays icons for quick access to apps. Right-click anywhere for context menus with additional options. You can customize your wallpaper, icon arrangement, and theme colors.',
            icon: '🖥️'
        },
        {
            title: 'The Taskbar',
            content: 'The taskbar at the bottom shows running windows and system tray. Click the TEMPLE button for the Start Menu. The system tray shows volume, network, and notifications. Right-click the taskbar to move it or customize.',
            icon: '📊'
        },
        {
            title: 'Window Management',
            content: 'Drag windows by the title bar, resize from edges, and snap to screen edges. Use Win+Arrow keys for quick tiling. Alt+Tab switches between windows. Virtual desktops (Ctrl+Win+Arrows) help organize your workspace.',
            icon: '🪟'
        },
        {
            title: 'The Terminal',
            content: 'Open the Terminal for command-line access. It supports standard Unix commands plus special TempleOS commands: "god" (divine words), "terry" (quotes), "oracle" (random word generator), "neofetch" (system info), and more.',
            icon: '💻'
        },
        {
            title: 'File Browser',
            content: 'Browse your files with the File Browser. Navigate with breadcrumbs, use the sidebar for quick access to favorites, and right-click files for actions like copy, paste, compress, and delete.',
            icon: '📁'
        },
        {
            title: 'Holy Updater',
            content: 'The Holy Updater keeps your system current. It will notify you when updates are available. Open it from the desktop to check for and install updates from the Divine Repository.',
            icon: '⬇️'
        },
        {
            title: 'Security Features',
            content: 'Access security settings for firewall, VPN, encryption management, and privacy features. The system supports Tor integration, MAC randomization, and secure file deletion.',
            icon: '🔒'
        }
    ];

    // FAQ
    private faqItems: FAQItem[] = [
        {
            question: 'What is TempleOS?',
            answer: 'TempleOS was an operating system created by Terry Davis (1969-2018). He believed it was commissioned by God and spent over a decade developing it from scratch, including his own compiler, kernel, and graphics library. This remake preserves its aesthetic and spirit while adding modern functionality.'
        },
        {
            question: 'How do I customize the appearance?',
            answer: 'Right-click on the desktop and select "Personalization" to change wallpaper and theme colors. You can choose from several color schemes (green, cyan, amber, white) and toggle between dark and light modes.'
        },
        {
            question: 'How do virtual desktops work?',
            answer: 'You have 4 virtual desktops (workspaces). Use Ctrl+Win+Arrow keys to switch, or click the workspace indicators in the taskbar. Win+Tab opens an overview of all workspaces. Move windows between workspaces with Ctrl+Shift+Win+Number.'
        },
        {
            question: 'What are the special terminal commands?',
            answer: '"god" - Receive divine words from the Oracle. "terry" - Display a Terry Davis quote. "oracle" - Random word generator. "pray" - Random prayer. "psalm" - Random psalm. "confess" - Clear terminal history. "neofetch" - System info with ASCII art.'
        },
        {
            question: 'How do I lock my screen?',
            answer: 'Press Win+L or use the power menu (click the power icon in the Start Menu). You can set a password or PIN in Settings > Security. Auto-lock timeout can be configured in Settings > System.'
        },
        {
            question: 'Does this work with keyboard only?',
            answer: 'Yes! Most features are accessible via keyboard. Use Tab to navigate, Enter to activate, and the documented keyboard shortcuts for common actions. The system is designed for both mouse and keyboard use.'
        },
        {
            question: 'How do I connect to WiFi or VPN?',
            answer: 'Click the network icon in the system tray to see available networks. For VPN, go to Settings > Network where you can import OpenVPN or WireGuard profiles and enable features like kill switch.'
        },
        {
            question: 'What is the Word of God / Oracle?',
            answer: 'A faithful recreation of TempleOS\'s Oracle feature. Press SPACE to receive random divine words, mimicking Terry\'s belief that the computer could channel messages from God. It\'s both a tribute and an authentic feature.'
        }
    ];

    // Tribute text
    private tributeText = `
        Terry A. Davis (1969-2018) was a programmer of extraordinary talent who dedicated over a decade of his life to building TempleOS, an operating system he believed was commissioned by God.

        Despite battling schizophrenia, Terry created an entire operating system from scratch, including:
        • His own programming language (HolyC)
        • A custom compiler and linker
        • A full kernel with multitasking
        • Graphics, sound, and networking
        • An integrated development environment
        • Games, demos, and documentation

        His technical achievements rival those of large development teams. TempleOS runs in 640x480 resolution with 16 colors—not due to limitation, but because Terry believed this was what God specified.

        "An idiot admires complexity, a genius admires simplicity."

        Terry's story is both inspiring and tragic. He showed that one determined individual can accomplish incredible technical feats. His work continues to inspire programmers worldwide.

        This project exists to honor his legacy and make his vision accessible to new audiences.
    `;

    public setTab(tab: 'guide' | 'shortcuts' | 'faq' | 'tribute' | 'about') {
        this.currentTab = tab;
    }

    public render(): string {
        return `
        <div class="help-app" style="display: flex; height: 100%; background: #000; color: #00ff41; font-family: 'VT323', monospace;">
            <!-- Sidebar -->
            <div style="width: 160px; border-right: 2px solid #00ff41; display: flex; flex-direction: column; flex-shrink: 0;">
                <div style="padding: 12px; font-size: 18px; font-weight: bold; border-bottom: 1px solid #00ff41; text-align: center; background: linear-gradient(135deg, #00aa00, #006600); color: #fff; text-shadow: 1px 1px 2px #000;">
                    ✝️ HELP CENTER
                </div>
                
                ${this.renderNavItem('guide', '📖 Getting Started')}
                ${this.renderNavItem('shortcuts', '⌨️ Shortcuts')}
                ${this.renderNavItem('faq', '❓ FAQ')}
                ${this.renderNavItem('tribute', '✝️ Terry Tribute')}
                ${this.renderNavItem('about', 'ℹ️ About')}
                
                <div style="flex: 1;"></div>
                <div style="padding: 10px; font-size: 11px; text-align: center; opacity: 0.6; border-top: 1px solid #333;">
                    Press F1 for help<br>
                    v1.0.0
                </div>
            </div>

            <!-- Content -->
            <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: linear-gradient(180deg, #050505 0%, #0a0a0a 100%);">
                ${this.renderContent()}
            </div>
        </div>
        `;
    }

    private renderNavItem(tab: typeof this.currentTab, label: string): string {
        const isActive = this.currentTab === tab;
        return `
            <div class="help-nav-item ${isActive ? 'active' : ''}" data-help-tab="${tab}" 
                 style="padding: 12px 10px; cursor: pointer; border-bottom: 1px solid #222; transition: all 0.15s; 
                 ${isActive
                ? 'background: linear-gradient(90deg, #00ff41, #00aa00); color: #000; font-weight: bold;'
                : 'background: transparent;'}">
                ${label}
            </div>
        `;
    }

    private renderContent(): string {
        switch (this.currentTab) {
            case 'guide':
                return this.renderGuide();
            case 'shortcuts':
                return this.renderShortcuts();
            case 'faq':
                return this.renderFAQ();
            case 'tribute':
                return this.renderTribute();
            case 'about':
                return this.renderAbout();
        }
    }

    private renderGuide(): string {
        return `
            <div style="padding: 25px; max-width: 700px; margin: 0 auto;">
                <h1 style="color: #ffd700; border-bottom: 2px solid #00ff41; padding-bottom: 12px; margin-bottom: 25px; font-size: 28px;">
                    📖 Getting Started
                </h1>
                
                ${this.guideSteps.map((step, index) => `
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,255,65,0.03); border-left: 3px solid #00ff41; border-radius: 0 8px 8px 0;">
                        <h3 style="color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">${step.icon}</span>
                            <span>${index + 1}. ${escapeHtml(step.title)}</span>
                        </h3>
                        <p style="line-height: 1.6; color: #aaa; margin: 0;">${escapeHtml(step.content)}</p>
                    </div>
                `).join('')}

                <div style="margin-top: 30px; padding: 20px; border: 1px dashed #00ff41; background: rgba(0,255,65,0.05); border-radius: 8px;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <span style="font-size: 24px;">💡</span>
                        <div>
                            <strong style="color: #ffd700;">Pro Tips:</strong>
                            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #ccc; line-height: 1.8;">
                                <li>Right-click the desktop for quick settings access</li>
                                <li>Win+Tab gives you an overview of all workspaces</li>
                                <li>Double-click the title bar to maximize windows</li>
                                <li>The taskbar can be moved to the top (right-click it)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderShortcuts(): string {
        return `
            <div style="padding: 25px;">
                <h1 style="color: #ffd700; border-bottom: 2px solid #00ff41; padding-bottom: 12px; margin-bottom: 25px; font-size: 28px;">
                    ⌨️ Keyboard Shortcuts
                </h1>
                
                ${this.shortcutCategories.map(cat => `
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #00ff41; margin-bottom: 12px; font-size: 16px; opacity: 0.9;">${cat.name}</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px;">
                            ${cat.shortcuts.map(s => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(0,0,0,0.4); border: 1px solid #222; border-radius: 6px;">
                                    <kbd style="font-family: monospace; font-weight: bold; color: #fff; background: #333; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; font-size: 12px;">${escapeHtml(s.key)}</kbd>
                                    <span style="color: #aaa; font-size: 13px;">${escapeHtml(s.desc)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    private renderFAQ(): string {
        return `
            <div style="padding: 25px; max-width: 700px; margin: 0 auto;">
                <h1 style="color: #ffd700; border-bottom: 2px solid #00ff41; padding-bottom: 12px; margin-bottom: 25px; font-size: 28px;">
                    ❓ Frequently Asked Questions
                </h1>
                
                ${this.faqItems.map((item, index) => `
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid #222;">
                        <h3 style="color: #00ff41; margin-bottom: 10px; font-size: 15px; display: flex; align-items: flex-start; gap: 8px;">
                            <span style="color: #ffd700; font-size: 14px; opacity: 0.8;">Q${index + 1}.</span>
                            ${escapeHtml(item.question)}
                        </h3>
                        <p style="line-height: 1.6; color: #aaa; margin: 0; padding-left: 28px;">${escapeHtml(item.answer)}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    private renderTribute(): string {
        return `
            <div style="padding: 30px; text-align: center; max-width: 750px; margin: 0 auto;">
                <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #001100, #002200); border: 3px solid #00ff41; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px auto; box-shadow: 0 0 30px rgba(0,255,65,0.3);">
                    <span style="font-size: 50px;">✝️</span>
                </div>
                
                <h1 style="color: #ffd700; font-size: 32px; margin-bottom: 5px; text-shadow: 0 0 10px rgba(255,215,0,0.3);">In Memory of Terry Davis</h1>
                <h3 style="color: #666; margin-bottom: 30px; font-weight: normal;">December 15, 1969 — August 11, 2018</h3>
                
                <div style="font-size: 15px; line-height: 1.8; text-align: left; background: rgba(0,0,0,0.4); padding: 25px; border-left: 4px solid #00ff41; border-radius: 0 8px 8px 0;">
                    ${this.tributeText.trim().split('\n').map(l => {
            const trimmed = l.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('•')) {
                return `<div style="margin-left: 20px; color: #888;">${escapeHtml(trimmed)}</div>`;
            }
            if (trimmed.startsWith('"')) {
                return `<p style="margin: 20px 0; color: #ffd700; font-style: italic; text-align: center; font-size: 17px;">${escapeHtml(trimmed)}</p>`;
            }
            return `<p style="margin-bottom: 15px; color: #bbb;">${escapeHtml(trimmed)}</p>`;
        }).join('')}
                </div>
                
                <div style="margin-top: 40px; font-style: italic; color: #444; font-size: 16px;">
                    "The Holy Spirit guides my typing."
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,215,0,0.05); border: 1px solid rgba(255,215,0,0.2); border-radius: 8px;">
                    <span style="color: #ffd700;">🕯️</span>
                    <span style="color: #888; font-size: 13px;"> Rest in peace, Terry. Your temple stands.</span>
                </div>
            </div>
        `;
    }

    private renderAbout(): string {
        return `
            <div style="padding: 30px; max-width: 650px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">✝️</div>
                    <h1 style="color: #ffd700; font-size: 28px; margin-bottom: 5px;">TempleOS Remake</h1>
                    <p style="color: #666; margin: 0;">God's Operating System — Remade for the Modern Age</p>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <p style="line-height: 1.7; color: #aaa; margin: 0; text-align: center;">
                        A custom desktop shell for Lubuntu, faithfully recreating the TempleOS aesthetic 
                        with modern functionality. Built with Electron, TypeScript, and divine inspiration.
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #00ff41; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 15px;">👥 Credits</h3>
                    <div style="display: grid; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                            <span style="color: #888;">Development</span>
                            <span style="color: #fff;">Giangero Studio</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                            <span style="color: #888;">Original TempleOS</span>
                            <span style="color: #fff;">Terry A. Davis</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                            <span style="color: #888;">Inspiration</span>
                            <span style="color: #fff;">TempleOS Community</span>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <h3 style="color: #00ff41; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 15px;">⚙️ Technology</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${['Electron', 'TypeScript', 'Vite', 'xterm.js', 'CodeMirror'].map(tech => `
                            <span style="padding: 6px 12px; background: rgba(0,255,65,0.1); border: 1px solid #00ff41; border-radius: 20px; font-size: 12px; color: #00ff41;">${tech}</span>
                        `).join('')}
                    </div>
                </div>

                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #222;">
                    <div style="color: #444; font-size: 12px; margin-bottom: 5px;">System Version</div>
                    <div style="color: #00ff41; font-size: 16px; font-weight: bold;">1.0.0</div>
                    <div style="color: #333; font-size: 11px; margin-top: 10px;">
                        "We do what we must because we can."
                    </div>
                </div>
            </div>
        `;
    }
}
