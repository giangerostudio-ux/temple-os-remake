/**
 * Standalone File Manager Window for Popout
 * This runs in a separate BrowserWindow with full electronAPI access
 */

interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    modified?: string | null;
}

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

// State
let currentPath = '/';
let homeDir = '/';
let fileEntries: FileEntry[] = [];
let selectedFiles = new Set<string>();

// UI Elements
const breadcrumb = document.getElementById('breadcrumb')!;
const fileGrid = document.getElementById('file-grid')!;
const sidebar = document.getElementById('sidebar')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const backBtn = document.getElementById('back-btn')!;
const upBtn = document.getElementById('up-btn')!;
const homeBtn = document.getElementById('home-btn')!;

// Navigation history
const navHistory: string[] = [];
let navHistoryIndex = -1;

// Helper: Get file icon
function getFileIcon(name: string, isDir: boolean): string {
    if (isDir) return '📁';
    const ext = name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
        'txt': '📄', 'md': '📝', 'pdf': '📕',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
        'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
        'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬',
        'zip': '📦', 'tar': '📦', 'gz': '📦', 'rar': '📦',
        'js': '📜', 'ts': '📜', 'py': '📜', 'java': '📜', 'cpp': '📜', 'c': '📜',
        'html': '🌐', 'css': '🎨', 'json': '⚙️'
    };
    return iconMap[ext || ''] || '📄';
}

// Load directory contents
async function loadDirectory(path: string) {
    if (!window.electronAPI?.readDir) {
        fileGrid.innerHTML = '<div style="padding: 20px; color: #ff4444;">API not available</div>';
        return;
    }

    try {
        const result = await window.electronAPI.readDir(path);

        if (!result.success || !result.entries) {
            fileGrid.innerHTML = '<div style="padding: 20px; color: #ff4444;">Failed to load directory</div>';
            return;
        }

        currentPath = path;
        fileEntries = result.entries;
        selectedFiles.clear();

        // Update navigation history
        if (navHistoryIndex === -1 || navHistory[navHistoryIndex] !== path) {
            navHistory.splice(navHistoryIndex + 1);
            navHistory.push(path);
            navHistoryIndex = navHistory.length - 1;
        }

        renderBreadcrumb();
        renderFileGrid();
    } catch (e) {
        console.error('[Files Window] Load error:', e);
        fileGrid.innerHTML = '<div style="padding: 20px; color: #ff4444;">Error loading directory</div>';
    }
}

// Render breadcrumb navigation
function renderBreadcrumb() {
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const parts = currentPath.split(separator).filter(p => p);
    const isWindows = currentPath.includes('\\') || currentPath.match(/^[A-Z]:/i);

    let html = `<span class="breadcrumb-item" data-path="${isWindows ? 'C:\\' : '/'}">This PC</span>`;
    let cumPath = isWindows ? '' : '';

    for (const part of parts) {
        cumPath += (isWindows ? (cumPath ? '\\' : '') : '/') + part;
        html += ` <span style="opacity: 0.5;">›</span> <span class="breadcrumb-item" data-path="${cumPath}">${part}</span>`;
    }

    breadcrumb.innerHTML = html;

    // Add click handlers
    breadcrumb.querySelectorAll('.breadcrumb-item').forEach(el => {
        el.addEventListener('click', () => {
            const path = el.getAttribute('data-path');
            if (path) void loadDirectory(path);
        });
    });
}

// Render file grid
function renderFileGrid() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = fileEntries.filter(f => !query || f.name.toLowerCase().includes(query));

    // Sort: directories first, then files alphabetically
    const sorted = filtered.slice().sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });

    // Add parent directory if not at root
    const isRoot = currentPath === '/' || currentPath.match(/^[A-Z]:\\?$/i);
    const parentPath = !isRoot ? currentPath.split(/[/\\]/).slice(0, -1).join(currentPath.includes('\\') ? '\\' : '/') || '/' : null;

    let html = '';

    if (parentPath) {
        html += `
      <div class="file-item" data-path="${parentPath}" data-is-dir="true">
        <div class="file-icon">📁</div>
        <div class="file-name">..</div>
      </div>
    `;
    }

    for (const file of sorted) {
        const isSelected = selectedFiles.has(file.path);
        html += `
      <div class="file-item ${isSelected ? 'selected' : ''}" data-path="${file.path}" data-is-dir="${file.isDirectory}">
        <div class="file-icon">${getFileIcon(file.name, file.isDirectory)}</div>
        <div class="file-name">${file.name}</div>
      </div>
    `;
    }

    if (sorted.length === 0 && !parentPath) {
        html = '<div style="padding: 20px; opacity: 0.6;">No files found</div>';
    }

    fileGrid.innerHTML = html;

    // Add click handlers
    fileGrid.querySelectorAll('.file-item').forEach(el => {
        const path = el.getAttribute('data-path');
        const isDir = el.getAttribute('data-is-dir') === 'true';

        el.addEventListener('click', (e: any) => {
            if (e.ctrlKey || e.metaKey) {
                // Multi-select
                if (path) {
                    if (selectedFiles.has(path)) {
                        selectedFiles.delete(path);
                    } else {
                        selectedFiles.add(path);
                    }
                    renderFileGrid();
                }
            } else if (isDir && path) {
                void loadDirectory(path);
            }
            // Note: Don't open files with openExternal (causes freeze)
            // User can use context menu for file operations
        });

        // Context menu
        el.addEventListener('contextmenu', (e: any) => {
            e.preventDefault();
            if (path) {
                void showContextMenu(e.clientX, e.clientY, path, isDir);
            }
        });
    });
}

// Render sidebar
async function renderSidebar() {
    if (!window.electronAPI?.getHome) return;

    try {
        const home = await window.electronAPI.getHome();
        homeDir = home;

        const isWindows = typeof navigator !== 'undefined' && navigator.platform.indexOf('Win') > -1;

        const items = [
            { label: 'This PC', path: isWindows ? 'C:\\' : '/' },
            { label: 'Home', path: home },
            { label: 'Documents', path: home + (isWindows ? '\\Documents' : '/Documents') },
            { label: 'Downloads', path: home + (isWindows ? '\\Downloads' : '/Downloads') },
            { label: 'Pictures', path: home + (isWindows ? '\\Pictures' : '/Pictures') },
            { label: 'Music', path: home + (isWindows ? '\\Music' : '/Music') }
        ];

        sidebar.innerHTML = items.map(item => `
      <div class="sidebar-item ${item.path === currentPath ? 'active' : ''}" data-path="${item.path}">
        ${item.label}
      </div>
    `).join('');

        sidebar.querySelectorAll('.sidebar-item').forEach(el => {
            el.addEventListener('click', () => {
                const path = el.getAttribute('data-path');
                if (path) void loadDirectory(path);
            });
        });
    } catch (e) {
        console.error('[Files Window] Sidebar error:', e);
    }
}

// Context menu
async function showContextMenu(x: number, y: number, _filePath: string, isDir: boolean) {
    if (!window.electronAPI?.showContextMenuPopup) return;

    const items = [
        { id: 'open', label: isDir ? 'Open' : 'Open with default app' },
        { id: 'delete', label: 'Delete' },
        { id: 'rename', label: 'Rename' }
    ];

    try {
        await window.electronAPI.showContextMenuPopup(x, y, items);
        // Note: Actions would be handled by electron backend
    } catch (e) {
        console.error('[Files Window] Context menu error:', e);
    }
}

// Toolbar buttons
backBtn.addEventListener('click', () => {
    if (navHistoryIndex > 0) {
        navHistoryIndex--;
        void loadDirectory(navHistory[navHistoryIndex]);
    }
});

upBtn.addEventListener('click', () => {
    const isRoot = currentPath === '/' || currentPath.match(/^[A-Z]:\\?$/i);
    if (!isRoot) {
        const parent = currentPath.split(/[/\\]/).slice(0, -1).join(currentPath.includes('\\') ? '\\' : '/') || '/';
        void loadDirectory(parent);
    }
});

homeBtn.addEventListener('click', () => {
    void loadDirectory(homeDir);
});

searchInput.addEventListener('input', () => {
    renderFileGrid();
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        upBtn.click();
    } else if (e.key === 'F5') {
        void loadDirectory(currentPath);
    }
});

// Initialize
async function init() {
    if (!window.electronAPI?.getHome) {
        fileGrid.innerHTML = '<div style="padding: 20px; color: #ff4444;">API not available</div>';
        return;
    }

    try {
        const home = await window.electronAPI.getHome();
        homeDir = home;
        await renderSidebar();
        await loadDirectory(home);
        console.log('[Files Window] Initialized');
    } catch (e) {
        console.error('[Files Window] Init error:', e);
        fileGrid.innerHTML = '<div style="padding: 20px; color: #ff4444;">Initialization failed</div>';
    }
}

void init();
