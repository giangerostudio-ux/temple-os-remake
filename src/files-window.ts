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
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const forwardBtn = document.getElementById('forward-btn') as HTMLButtonElement;
const upBtn = document.getElementById('up-btn') as HTMLButtonElement;
const homeBtn = document.getElementById('home-btn') as HTMLButtonElement;
const viewToggleBtn = document.getElementById('view-toggle-btn') as HTMLButtonElement;
const newFolderBtn = document.getElementById('new-folder-btn') as HTMLButtonElement;
const statusText = document.getElementById('status-text')!;
const statusPath = document.getElementById('status-path')!;

// Navigation history
const navHistory: string[] = [];
let navHistoryIndex = -1;

// View mode
let viewMode: 'grid' | 'list' = 'grid';

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
        updateStatusBar();
        updateNavigationButtons();
    } catch (e) {
        console.error('[Files Window] Load error:', e);
        fileGrid.innerHTML = '<div style="padding: 20px; color: #ff4444;">Error loading directory</div>';
    }
}

// Update navigation button states
function updateNavigationButtons() {
    backBtn.disabled = navHistoryIndex <= 0;
    forwardBtn.disabled = navHistoryIndex >= navHistory.length - 1;
    backBtn.style.opacity = navHistoryIndex <= 0 ? '0.5' : '1';
    forwardBtn.style.opacity = navHistoryIndex >= navHistory.length - 1 ? '0.5' : '1';
}

// Update status bar
function updateStatusBar() {
    const selectedCount = selectedFiles.size;
    const totalCount = fileEntries.length;

    if (selectedCount > 0) {
        statusText.textContent = `${selectedCount} selected of ${totalCount} items`;
    } else {
        statusText.textContent = `${totalCount} items`;
    }

    statusPath.textContent = currentPath;
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
                    updateStatusBar();
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
function showContextMenu(x: number, y: number, filePath: string, isDir: boolean) {
    // Remove existing context menu
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const items = [
        { id: 'open', label: isDir ? '📂 Open Folder' : '📄 Open' },
        { id: 'divider1', label: '' },
        { id: 'delete', label: '🗑️ Delete' },
        { id: 'rename', label: '✏️ Rename' }
    ];

    menu.innerHTML = items.map(item => {
        if (item.id.startsWith('divider')) {
            return '<div class="context-divider"></div>';
        }
        return `<div class="context-item" data-action="${item.id}">${item.label}</div>`;
    }).join('');

    document.body.appendChild(menu);

    // Handle clicks
    menu.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const action = target.getAttribute('data-action');
        if (action) {
            await handleContextAction(action, filePath, isDir);
            menu.remove();
        }
    });

    // Close on outside click
    const closeHandler = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
            menu.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
}

// Handle context menu actions
async function handleContextAction(action: string, filePath: string, isDir: boolean) {
    if (!window.electronAPI) return;

    switch (action) {
        case 'open':
            if (isDir) {
                void loadDirectory(filePath);
            } else {
                // Open file with default application
                if (window.electronAPI.openExternal) {
                    await window.electronAPI.openExternal(filePath);
                }
            }
            break;

        case 'delete':
            const confirmDelete = confirm(`Delete ${filePath.split(/[/\\]/).pop()}?`);
            if (confirmDelete && window.electronAPI.deleteItem) {
                const result = await window.electronAPI.deleteItem(filePath);
                if (result.success) {
                    // Refresh current directory
                    void loadDirectory(currentPath);
                } else {
                    alert('Failed to delete: ' + result.error);
                }
            }
            break;

        case 'rename':
            const newName = prompt('Enter new name:', filePath.split(/[/\\]/).pop());
            if (newName && window.electronAPI.rename) {
                const parent = filePath.split(/[/\\]/).slice(0, -1).join(filePath.includes('\\') ? '\\' : '/');
                const newPath = parent + (parent.endsWith('/') || parent.endsWith('\\') ? '' : (filePath.includes('\\') ? '\\' : '/')) + newName;
                const result = await window.electronAPI.rename(filePath, newPath);
                if (result.success) {
                    void loadDirectory(currentPath);
                } else {
                    alert('Failed to rename: ' + result.error);
                }
            }
            break;
    }
}

// Toolbar buttons
backBtn.addEventListener('click', () => {
    if (navHistoryIndex > 0) {
        navHistoryIndex--;
        void loadDirectory(navHistory[navHistoryIndex]);
    }
});

forwardBtn.addEventListener('click', () => {
    if (navHistoryIndex < navHistory.length - 1) {
        navHistoryIndex++;
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

viewToggleBtn.addEventListener('click', () => {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    viewToggleBtn.textContent = viewMode === 'grid' ? '⊞' : '☰';
    renderFileGrid();
});

newFolderBtn.addEventListener('click', async () => {
    const name = prompt('Enter folder name:');
    if (!name) return;

    const newPath = currentPath + (currentPath.endsWith('/') || currentPath.endsWith('\\') ? '' : '/') + name;

    if (window.electronAPI?.mkdir) {
        const result = await window.electronAPI.mkdir(newPath);
        if (result.success) {
            void loadDirectory(currentPath);
        } else {
            alert('Failed to create folder: ' + result.error);
        }
    }
});

searchInput.addEventListener('input', () => {
    renderFileGrid();
    updateStatusBar();
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
