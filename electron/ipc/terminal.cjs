/**
 * Terminal IPC handlers
 * Handles terminal:* IPC channels (basic exec and PTY)
 */

const { ipcMain } = require('electron');
const { execAsync, shEscape, os, ipcSuccess, ipcError } = require('./utils.cjs');

// PTY support (for real terminal)
let pty = null;
try {
    pty = require('node-pty');
} catch (e) {
    console.warn('node-pty not available, PTY terminal disabled:', e.message);
}
const ptyProcesses = new Map(); // id -> { pty, cwd }

function registerTerminalHandlers(getMainWindow) {
    ipcMain.handle('terminal:exec', async (event, command, cwd) => {
        if (typeof command !== 'string') return ipcError('Invalid command');

        const isLinux = process.platform === 'linux';
        const safeCwd = (typeof cwd === 'string' && cwd.trim()) ? cwd : (isLinux ? os.homedir() : process.cwd());

        const cmd = isLinux
            ? `bash -lc "${shEscape(command)}"`
            : command;

        const res = await execAsync(cmd, { cwd: safeCwd });
        if (res.error) {
            return { success: false, error: res.stderr || res.error.message, stdout: res.stdout, stderr: res.stderr };
        }
        return ipcSuccess({ stdout: res.stdout, stderr: res.stderr });
    });

    ipcMain.handle('terminal:createPty', (event, options = {}) => {
        if (!pty) return ipcError('PTY not available');

        const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
        const cwd = options.cwd || os.homedir();
        const cols = options.cols || 80;
        const rows = options.rows || 24;

        const id = `pty-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols,
            rows,
            cwd,
            env: process.env
        });

        ptyProcesses.set(id, { pty: ptyProcess, cwd });

        // Forward data to renderer
        ptyProcess.onData((data) => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('pty:data', { id, data });
            }
        });

        ptyProcess.onExit(({ exitCode }) => {
            const mainWindow = getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('pty:exit', { id, exitCode });
            }
            ptyProcesses.delete(id);
        });

        return ipcSuccess({ id });
    });

    ipcMain.handle('terminal:writePty', (event, { id, data }) => {
        const entry = ptyProcesses.get(id);
        if (!entry) return ipcError('PTY not found');
        entry.pty.write(data);
        return ipcSuccess();
    });

    ipcMain.handle('terminal:resizePty', (event, { id, cols, rows }) => {
        const entry = ptyProcesses.get(id);
        if (!entry) return ipcError('PTY not found');
        entry.pty.resize(cols, rows);
        return ipcSuccess();
    });

    ipcMain.handle('terminal:destroyPty', (event, { id }) => {
        const entry = ptyProcesses.get(id);
        if (!entry) return ipcError('PTY not found');
        entry.pty.kill();
        ptyProcesses.delete(id);
        return ipcSuccess();
    });

    ipcMain.handle('terminal:isPtyAvailable', () => {
        return ipcSuccess({ available: !!pty });
    });

    console.log('[IPC] Terminal handlers registered');
}

module.exports = { registerTerminalHandlers };
