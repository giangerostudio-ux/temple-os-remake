/**
 * Standalone File Browser Window for Popout
 * Matches inline File Browser design exactly
 */

// Window controls (polling pattern for floating windows)
const minimizeBtn = document.getElementById('minimize-btn');
const maximizeBtn = document.getElementById('maximize-btn');
const closeBtn = document.getElementById('close-btn');

declare global {
    interface Window {
        __floatingAction?: string | null;
    }
}


interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    modified?: string | null;
}



minimizeBtn?.addEventListener('click', () => { window.__floatingAction = 'minimize'; });
maximizeBtn?.addEventListener('click', () => { window.__floatingAction = 'maximize'; });
closeBtn?.addEventListener('click', () => { window.__floatingAction = 'close'; });

// Check API access
if (!window.electronAPI) {
    document.body.innerHTML = '<div style="color: #ff4444; padding: 20px;">Error: electronAPI not available</div>';
    throw new Error('electronAPI not available');
}

// UI Elements
const breadcrumb = document.getElementById('breadcrumb')!;
const fileGrid = document.getElementById('file-grid')!;
const sidebar = document.getElementById('sidebar')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const upBtn = document.getElementById('up-btn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const selectionBadge = document.getElementById('selection-badge')!;
const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
const viewSelect = document.getElementById('view-select') as HTMLSelectElement;
const showHiddenCheckbox = document.getElementById('show-hidden') as HTMLInputElement;
const statusText = document.getElementById('status-text')!;
const statusPath = document.getElementById('status-path')!;

// State
let currentPath = '/';
// @ts-ignore - homeDir is assigned in init/renderSidebar
let homeDir = '/';
let fileEntries: FileEntry[] = [];
const selectedFiles = new Set<string>();
let lastClickedIndex = -1;
const navHistory: string[] = [];
let navHistoryIndex = -1;
let viewMode: 'grid' | 'list' = 'grid';
let sortBy: 'name' | 'date' | 'size' = 'name';
let showHidden = false;

// SVG Icons
const folderIcon = `<svg viewBox="0 0 48 48" fill="none" stroke="#00ff41" stroke-width="2">
    <path d="M4 10L4 42L44 42L44 14L24 14L20 10L4 10Z"/>
</svg>`;

const fileIcon = `<svg viewBox="0 0 48 48" fill="none" stroke="#00ff41" stroke-width="2">
    <path d="M8 4L8 44L40 44L40 14L30 4L8 4Z"/>
    <path d="M30 4L30 14L40 14"/>
</svg>`;

const parentIcon = `<svg viewBox="0 0 48 48" fill="none" stroke="#00ff41" stroke-width="2">
    <path d="M4 10L4 42L44 42L44 14L24 14L20 10L4 10Z"/>
    <path d="M18 28L24 22L30 28M24 22L24 36"/>
</svg>`;

function getFileIcon(_name: string, isDir: boolean): string {
    if (isDir) return folderIcon;
    return fileIcon;
}

// Load directory
async function loadDirectory(path: string, addToHistory = true) {
    if (!window.electronAPI?.readDir) return;

    try {
        const result = await window.electronAPI.readDir(path);
        if (!result.success || !result.entries) {
            fileGrid.innerHTML = `<div style="color: #ff6666; padding: 20px;">Error: ${result.error || 'Unknown error'}</div>`;
            return;
        }

        fileEntries = result.entries;
        currentPath = path;

        if (addToHistory) {
            if (navHistoryIndex < navHistory.length - 1) {
                navHistory.splice(navHistoryIndex + 1);
            }
            navHistory.push(path);
            navHistoryIndex = navHistory.length - 1;
        }

        renderBreadcrumb();
        renderFileGrid();
        renderSidebar();
        updateUI();
    } catch (e) {
        console.error('[File Browser] Load error:', e);
    }
}

// Render breadcrumb
function renderBreadcrumb() {
    const isWindows = navigator.platform.indexOf('Win') > -1;
    const parts = currentPath.split(/[/\\]/).filter(Boolean);

    let html = `<span class="breadcrumb-item" data-path="${isWindows ? 'C:\\' : '/'}">This PC</span>`;
    let cumPath = isWindows ? '' : '';

    for (const part of parts) {
        cumPath += (isWindows ? (cumPath ? '\\' : '') : '/') + part;
        html += `<span class="breadcrumb-sep">›</span><span class="breadcrumb-item" data-path="${cumPath}">${part}</span>`;
    }

    breadcrumb.innerHTML = html;

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

    let filtered = fileEntries.filter(f => {
        if (!showHidden && f.name.startsWith('.')) return false;
        if (query && !f.name.toLowerCase().includes(query)) return false;
        return true;
    });

    // Sort
    filtered.sort((a, b) => {
        // Directories first
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;

        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'size':
                return (a.size || 0) - (b.size || 0);
            case 'date':
                return (a.modified || '').localeCompare(b.modified || '');
            default:
                return a.name.localeCompare(b.name);
        }
    });

    // Add parent directory if not at root
    const isRoot = currentPath === '/' || currentPath.match(/^[A-Z]:\\?$/i);
    const parentPath = !isRoot ? currentPath.split(/[/\\]/).slice(0, -1).join(currentPath.includes('\\') ? '\\' : '/') || '/' : null;

    let html = '';

    if (parentPath) {
        html += `
        <div class="file-item" data-path="${parentPath}" data-is-dir="true" data-index="-1">
            <div class="file-checkbox"></div>
            <div class="file-icon">${parentIcon}</div>
            <div class="file-name">..</div>
        </div>`;
    }

    for (let i = 0; i < filtered.length; i++) {
        const file = filtered[i];
        const isSelected = selectedFiles.has(file.path);
        html += `
        <div class="file-item ${isSelected ? 'selected' : ''}" 
             data-path="${file.path}" 
             data-is-dir="${file.isDirectory}" 
             data-index="${i}">
            <div class="file-checkbox">${isSelected ? '✓' : ''}</div>
            <div class="file-icon">${getFileIcon(file.name, file.isDirectory)}</div>
            <div class="file-name">${file.name}</div>
        </div>`;
    }

    if (filtered.length === 0 && !parentPath) {
        html = '<div style="padding: 40px; text-align: center; opacity: 0.6;">No files found</div>';
    }

    fileGrid.className = viewMode === 'list' ? 'file-grid list-view' : 'file-grid';
    fileGrid.innerHTML = html;
    attachFileHandlers(filtered);
}

// Attach file click handlers
function attachFileHandlers(files: FileEntry[]) {
    fileGrid.querySelectorAll('.file-item').forEach(el => {
        const path = el.getAttribute('data-path');
        const isDir = el.getAttribute('data-is-dir') === 'true';
        const index = parseInt(el.getAttribute('data-index') || '-1');

        el.addEventListener('click', (e: Event) => {
            const evt = e as MouseEvent;

            if (evt.shiftKey && lastClickedIndex !== -1 && index !== -1) {
                // Shift-click: range selection
                evt.preventDefault();
                const start = Math.min(lastClickedIndex, index);
                const end = Math.max(lastClickedIndex, index);

                for (let i = start; i <= end; i++) {
                    if (files[i]) selectedFiles.add(files[i].path);
                }
                renderFileGrid();
                updateUI();
            } else if (evt.ctrlKey || evt.metaKey) {
                // Ctrl-click: toggle selection
                if (path && index !== -1) {
                    if (selectedFiles.has(path)) {
                        selectedFiles.delete(path);
                    } else {
                        selectedFiles.add(path);
                    }
                    lastClickedIndex = index;
                    renderFileGrid();
                    updateUI();
                }
            } else {
                // Normal click
                selectedFiles.clear();
                if (isDir && path) {
                    void loadDirectory(path);
                } else if (path && index !== -1) {
                    selectedFiles.add(path);
                    lastClickedIndex = index;
                }
                renderFileGrid();
                updateUI();
            }
        });

        el.addEventListener('contextmenu', (e: Event) => {
            e.preventDefault();
            const evt = e as MouseEvent;
            if (path) showContextMenu(evt.clientX, evt.clientY, path, isDir);
        });

        el.addEventListener('dblclick', () => {
            if (isDir && path) {
                void loadDirectory(path);
            } else if (path && window.electronAPI?.openExternal) {
                void window.electronAPI.openExternal(path);
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

        const isWindows = navigator.platform.indexOf('Win') > -1;
        const sep = isWindows ? '\\' : '/';

        const items = [
            { label: 'This PC', path: isWindows ? 'C:\\' : '/', icon: '💻' },
            { label: 'Home', path: home, icon: '🏠' },
            { label: 'Documents', path: home + sep + 'Documents', icon: '📄' },
            { label: 'Downloads', path: home + sep + 'Downloads', icon: '⬇️' },
            { label: 'Pictures', path: home + sep + 'Pictures', icon: '🖼️' },
            { label: 'Music', path: home + sep + 'Music', icon: '🎵' },
            { label: 'Trash', path: '__trash__', icon: '🗑️' }
        ];

        sidebar.innerHTML = `
            <div class="sidebar-header">Favorites</div>
            ${items.map(item => `
                <div class="sidebar-item ${item.path === currentPath ? 'active' : ''}" data-path="${item.path}">
                    ${item.icon} ${item.label}
                </div>
            `).join('')}
        `;

        sidebar.querySelectorAll('.sidebar-item').forEach(el => {
            el.addEventListener('click', () => {
                const path = el.getAttribute('data-path');
                if (path === '__trash__') {
                    // TODO: Load trash
                    alert('Trash view not yet implemented');
                } else if (path) {
                    void loadDirectory(path);
                }
            });
        });
    } catch (e) {
        console.error('[File Browser] Sidebar error:', e);
    }
}

// Context menu
function showContextMenu(x: number, y: number, filePath: string, isDir: boolean) {
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    const count = selectedFiles.size;
    const items = [
        { id: 'open', label: isDir ? '📂 Open' : '📄 Open' },
        { id: 'divider1', label: '' },
        { id: 'delete', label: count > 1 ? `🗑️ Delete ${count} items` : '🗑️ Delete' },
        { id: 'rename', label: '✏️ Rename' }
    ];

    menu.innerHTML = items.map(item => {
        if (item.id.startsWith('divider')) {
            return '<div class="context-divider"></div>';
        }
        return `<div class="context-item" data-action="${item.id}">${item.label}</div>`;
    }).join('');

    document.body.appendChild(menu);

    menu.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const action = target.getAttribute('data-action');
        if (action) {
            await handleContextAction(action, filePath, isDir);
            menu.remove();
        }
    });

    const closeHandler = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
            menu.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
}

// Handle context actions
async function handleContextAction(action: string, filePath: string, isDir: boolean) {
    if (!window.electronAPI) return;

    switch (action) {
        case 'open':
            if (isDir) {
                void loadDirectory(filePath);
            } else if (window.electronAPI.openExternal) {
                await window.electronAPI.openExternal(filePath);
            }
            break;

        case 'delete':
            await deleteSelected(filePath);
            break;

        case 'rename':
            const currentName = filePath.split(/[/\\]/).pop();
            const newName = prompt('Enter new name:', currentName);
            if (newName && window.electronAPI.rename) {
                const sep = filePath.includes('\\') ? '\\' : '/';
                const parent = filePath.split(/[/\\]/).slice(0, -1).join(sep);
                const newPath = parent + sep + newName;
                const result = await window.electronAPI.rename(filePath, newPath);
                if (result.success) {
                    void loadDirectory(currentPath);
                } else {
                    alert('Rename failed: ' + result.error);
                }
            }
            break;
    }
}

// Delete selected files
async function deleteSelected(fallbackPath?: string) {
    if (!window.electronAPI?.deleteItem) return;

    const filesToDelete = selectedFiles.size > 0
        ? Array.from(selectedFiles)
        : (fallbackPath ? [fallbackPath] : []);

    if (filesToDelete.length === 0) return;

    const names = filesToDelete.map(p => p.split(/[/\\]/).pop()).join('\n');
    const confirm = window.confirm(`Delete ${filesToDelete.length} item(s)?\n\n${names}`);

    if (!confirm) return;

    let successCount = 0;
    const errors: string[] = [];

    for (const path of filesToDelete) {
        const result = await window.electronAPI.deleteItem(path);
        if (result.success) {
            successCount++;
        } else {
            errors.push(`${path.split(/[/\\]/).pop()}: ${result.error}`);
        }
    }

    selectedFiles.clear();
    void loadDirectory(currentPath);

    if (errors.length > 0) {
        alert(`Deleted ${successCount} items.\n\nFailed:\n${errors.join('\n')}`);
    }
}

// Update UI state
function updateUI() {
    const count = selectedFiles.size;

    selectionBadge.textContent = `${count} selected`;
    deleteBtn.disabled = count === 0;

    backBtn.disabled = navHistoryIndex <= 0;

    const totalItems = fileEntries.filter(f => showHidden || !f.name.startsWith('.')).length;
    statusText.textContent = count > 0
        ? `${count} selected of ${totalItems} items`
        : `${totalItems} items`;
    statusPath.textContent = currentPath;
}

// Event listeners
backBtn.addEventListener('click', () => {
    if (navHistoryIndex > 0) {
        navHistoryIndex--;
        void loadDirectory(navHistory[navHistoryIndex], false);
    }
});

upBtn.addEventListener('click', () => {
    const isRoot = currentPath === '/' || currentPath.match(/^[A-Z]:\\?$/i);
    if (!isRoot) {
        const sep = currentPath.includes('\\') ? '\\' : '/';
        const parent = currentPath.split(/[/\\]/).slice(0, -1).join(sep) || '/';
        void loadDirectory(parent);
    }
});

refreshBtn.addEventListener('click', () => {
    void loadDirectory(currentPath);
});

deleteBtn.addEventListener('click', () => {
    void deleteSelected();
});

clearBtn.addEventListener('click', () => {
    selectedFiles.clear();
    lastClickedIndex = -1;
    renderFileGrid();
    updateUI();
});

searchInput.addEventListener('input', () => {
    renderFileGrid();
    updateUI();
});

sortSelect.addEventListener('change', () => {
    sortBy = sortSelect.value as 'name' | 'date' | 'size';
    renderFileGrid();
});

viewSelect.addEventListener('change', () => {
    viewMode = viewSelect.value as 'grid' | 'list';
    renderFileGrid();
});

showHiddenCheckbox.addEventListener('change', () => {
    showHidden = showHiddenCheckbox.checked;
    renderFileGrid();
    updateUI();
});

// Keyboard shortcuts
window.addEventListener('keydown', async (e) => {
    if (e.key === 'Backspace') {
        upBtn.click();
    } else if (e.key === 'F5') {
        void loadDirectory(currentPath);
    } else if (e.key === 'Delete' && selectedFiles.size > 0) {
        e.preventDefault();
        await deleteSelected();
    } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // Select all
        fileEntries.forEach(f => {
            if (showHidden || !f.name.startsWith('.')) {
                selectedFiles.add(f.path);
            }
        });
        renderFileGrid();
        updateUI();
    } else if (e.key === 'Escape') {
        selectedFiles.clear();
        renderFileGrid();
        updateUI();
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
        await loadDirectory(home);
        console.log('[File Browser] Initialized');
    } catch (e) {
        console.error('[File Browser] Init error:', e);
    }
}

void init();
