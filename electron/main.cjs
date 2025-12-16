const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: false,           // Custom title bar
        fullscreen: false,      // Start windowed
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    // Load Vite dev server or built files
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message} (${sourceId}:${line})`);
    });
}

app.whenReady().then(createWindow);

// ============================================
// WINDOW CONTROL IPC
// ============================================
ipcMain.handle('close-window', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

// ============================================
// FILESYSTEM IPC
// ============================================
ipcMain.handle('fs:readdir', async (event, dirPath) => {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const results = [];

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            let size = 0;
            let modified = null;

            try {
                const stats = await fs.promises.stat(fullPath);
                size = stats.size;
                modified = stats.mtime.toISOString();
            } catch (e) {
                // Permission denied or other error
            }

            results.push({
                name: entry.name,
                isDirectory: entry.isDirectory(),
                path: fullPath,
                size,
                modified
            });
        }

        // Sort: directories first, then files, alphabetically
        results.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return { success: true, entries: results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:delete', async (event, itemPath) => {
    try {
        const stat = await fs.promises.stat(itemPath);
        if (stat.isDirectory()) {
            await fs.promises.rm(itemPath, { recursive: true });
        } else {
            await fs.promises.unlink(itemPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:mkdir', async (event, dirPath) => {
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
    try {
        await fs.promises.rename(oldPath, newPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:getHome', () => os.homedir());

ipcMain.handle('fs:openExternal', async (event, filePath) => {
    try {
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// SYSTEM IPC
// ============================================
ipcMain.handle('system:shutdown', () => {
    exec('systemctl poweroff');
});

ipcMain.handle('system:restart', () => {
    exec('systemctl reboot');
});

ipcMain.handle('system:lock', () => {
    // Lock screen - this will be handled by the UI
    mainWindow.webContents.send('lock-screen');
});

ipcMain.handle('system:info', () => ({
    platform: os.platform(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    memory: {
        total: os.totalmem(),
        free: os.freemem()
    },
    cpus: os.cpus().length,
    user: os.userInfo().username
}));

ipcMain.handle('system:setVolume', (event, level) => {
    // Clamp level between 0 and 100
    const safeLevel = Math.max(0, Math.min(100, parseInt(level)));

    // Command depends on OS
    let command = '';
    if (process.platform === 'linux') {
        // amixer is standard on Ubuntu/Linux
        // -q = quiet, set Master 
        command = `amixer -q set Master ${safeLevel}%`;
    } else if (process.platform === 'win32') {
        // Windows needs nircmd or powershell script. For now, we skip.
        console.log(`[Windows] Mock volume set to ${safeLevel}%`);
        return;
    } else {
        return;
    }

    exec(command, (error) => {
        if (error) console.error(`Failed to set volume: ${error.message}`);
    });
});

ipcMain.handle('system:setResolution', (event, resolution) => {
    // Parse resolution string (e.g., "1920x1080")
    const [width, height] = resolution.split('x').map(n => parseInt(n));

    if (process.platform === 'linux') {
        // Use xrandr to set resolution
        const command = `DISPLAY=:0 xrandr --output Virtual-1 --mode ${width}x${height}`;
        exec(command, (error) => {
            if (error) {
                console.error(`Failed to set resolution: ${error.message}`);
                // Try adding the mode first
                const addModeCmd = `DISPLAY=:0 xrandr --newmode "${width}x${height}" 0 ${width} ${width + 100} ${width + 200} ${width + 300} ${height} ${height + 3} ${height + 8} ${height + 40} -hsync +vsync 2>/dev/null; DISPLAY=:0 xrandr --addmode Virtual-1 "${width}x${height}" 2>/dev/null; DISPLAY=:0 xrandr --output Virtual-1 --mode "${width}x${height}"`;
                exec(addModeCmd, (e2) => {
                    if (e2) console.error(`Resolution fallback failed: ${e2.message}`);
                });
            }
        });
    } else {
        console.log(`[Windows/Mac] Resolution change not supported: ${width}x${height}`);
    }
});

const projectRoot = path.resolve(__dirname, '..');

// ============================================
// HOLY UPDATER IPC
// ============================================
ipcMain.handle('updater:check', async () => {
    return new Promise((resolve) => {
        // Check for updates by doing git fetch and comparing
        // On Windows, use 'git fetch' then check rev-list
        const command = `cd "${projectRoot}" && git fetch origin main && git rev-list HEAD...origin/main --count`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                // If dev environment or no git, just mock success for now to avoid crashing user experience
                if (process.env.NODE_ENV === 'development') {
                    resolve({
                        success: true,
                        updatesAvailable: false,
                        behindCount: 0,
                        message: "Dev Mode: No updates"
                    });
                    return;
                }
                resolve({ success: false, error: error.message });
                return;
            }
            const behindCount = parseInt(stdout.trim()) || 0;
            resolve({
                success: true,
                updatesAvailable: behindCount > 0,
                behindCount
            });
        }
        );
    });
});

ipcMain.handle('updater:update', async () => {
    return new Promise((resolve) => {
        // Pull updates, rebuild, and prepare for reboot
        // Use npm.cmd on Windows if needed, but 'npm' usually works
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const updateScript = `cd "${projectRoot}" && git pull origin main && ${npmCmd} run build -- --base=./`;

        exec(updateScript, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    success: false,
                    error: error.message,
                    output: stdout + '\n' + stderr
                });
                return;
            }
            resolve({
                success: true,
                output: stdout,
                message: 'Update complete! Reboot to apply changes.'
            });
        });
    });
});

// ============================================
// APP LIFECYCLE
// ============================================
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
