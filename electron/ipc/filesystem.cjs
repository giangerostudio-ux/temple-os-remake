/**
 * Filesystem IPC handlers
 * Handles fs:* and exif:* IPC channels
 */

const { ipcMain, shell, app } = require('electron');
const {
    fs,
    path,
    os,
    isPathSafe,
    ipcSuccess,
    ipcError,
    moveToLinuxTrash,
    listLinuxTrash,
    restoreLinuxTrash,
    getLinuxTrashPaths,
    ensureLinuxTrash,
    extractExifFromBuffer,
    stripImageMetadata
} = require('./utils.cjs');

// AdmZip for archive operations
let AdmZip = null;
try { AdmZip = require('adm-zip'); } catch (e) { console.warn('adm-zip not found', e); }

function registerFilesystemHandlers() {
    // ============================================
    // FILESYSTEM IPC
    // ============================================

    ipcMain.handle('fs:readdir', async (event, dirPath) => {
        const pathCheck = isPathSafe(dirPath);
        if (!pathCheck.safe) {
            return ipcError(pathCheck.reason);
        }
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

            return ipcSuccess({ entries: results });
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:readFile', async (event, filePath) => {
        const pathCheck = isPathSafe(filePath);
        if (!pathCheck.safe) {
            return ipcError(pathCheck.reason);
        }
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return ipcSuccess({ content });
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
        const pathCheck = isPathSafe(filePath);
        if (!pathCheck.safe) {
            return ipcError(pathCheck.reason);
        }
        try {
            await fs.promises.writeFile(filePath, content, 'utf-8');
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:delete', async (event, itemPath) => {
        const pathCheck = isPathSafe(itemPath);
        if (!pathCheck.safe) {
            return ipcError(pathCheck.reason);
        }
        try {
            const stat = await fs.promises.stat(itemPath);
            if (stat.isDirectory()) {
                await fs.promises.rm(itemPath, { recursive: true });
            } else {
                await fs.promises.unlink(itemPath);
            }
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:trash', async (event, itemPath) => {
        const pathCheck = isPathSafe(itemPath);
        if (!pathCheck.safe) {
            return ipcError(pathCheck.reason);
        }
        try {
            const target = String(itemPath || '');
            if (!target) return ipcError('Invalid path');

            if (process.platform === 'linux') {
                const moved = await moveToLinuxTrash(target);
                return ipcSuccess({ entry: moved });
            }

            if (shell && typeof shell.trashItem === 'function') {
                await shell.trashItem(target);
                return ipcSuccess();
            }

            return ipcError('Trash not supported on this platform');
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:listTrash', async () => {
        try {
            if (process.platform !== 'linux') return ipcSuccess({ entries: [] });
            const entries = await listLinuxTrash();
            return ipcSuccess({ entries });
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:restoreTrash', async (event, payload) => {
        try {
            if (process.platform !== 'linux') return ipcError('Not supported on this platform');
            const trashPath = payload && typeof payload.trashPath === 'string' ? payload.trashPath : '';
            const originalPath = payload && typeof payload.originalPath === 'string' ? payload.originalPath : '';
            const restored = await restoreLinuxTrash(trashPath, originalPath);
            return ipcSuccess({ restored });
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:deleteTrashItem', async (event, trashPath) => {
        try {
            if (process.platform !== 'linux') return ipcError('Not supported on this platform');
            const t = getLinuxTrashPaths();
            const resolvedTrash = path.resolve(String(trashPath || ''));
            const resolvedFiles = path.resolve(t.files);
            if (!resolvedTrash.startsWith(resolvedFiles + path.sep)) throw new Error('Invalid trash path');
            const name = path.basename(resolvedTrash);
            const infoPath = path.join(t.info, `${name}.trashinfo`);
            const stat = await fs.promises.stat(resolvedTrash);
            if (stat.isDirectory()) await fs.promises.rm(resolvedTrash, { recursive: true, force: true });
            else await fs.promises.unlink(resolvedTrash);
            await fs.promises.rm(infoPath, { force: true }).catch((e) => console.warn('[FS] Remove trash info on delete failed:', e.message));
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:emptyTrash', async () => {
        try {
            if (process.platform !== 'linux') return ipcError('Not supported on this platform');
            const t = await ensureLinuxTrash();
            await fs.promises.rm(t.files, { recursive: true, force: true });
            await fs.promises.rm(t.info, { recursive: true, force: true });
            await ensureLinuxTrash();
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:mkdir', async (event, dirPath) => {
        const pathCheck = isPathSafe(dirPath);
        if (!pathCheck.safe) {
            return ipcError(pathCheck.reason);
        }
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
        const oldCheck = isPathSafe(oldPath);
        if (!oldCheck.safe) {
            return ipcError(oldCheck.reason);
        }
        const newCheck = isPathSafe(newPath);
        if (!newCheck.safe) {
            return ipcError(newCheck.reason);
        }
        try {
            await fs.promises.rename(oldPath, newPath);
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:copy', async (event, srcPath, destPath) => {
        const srcCheck = isPathSafe(srcPath);
        if (!srcCheck.safe) {
            return ipcError(srcCheck.reason);
        }
        const destCheck = isPathSafe(destPath);
        if (!destCheck.safe) {
            return ipcError(destCheck.reason);
        }
        try {
            const stat = await fs.promises.stat(srcPath);
            if (stat.isDirectory()) {
                if (fs.promises.cp) {
                    await fs.promises.cp(srcPath, destPath, { recursive: true });
                } else {
                    // Very old Node fallback: simple recursive copy
                    await fs.promises.mkdir(destPath, { recursive: true });
                    const entries = await fs.promises.readdir(srcPath, { withFileTypes: true });
                    for (const entry of entries) {
                        const s = path.join(srcPath, entry.name);
                        const d = path.join(destPath, entry.name);
                        if (entry.isDirectory()) {
                            await fs.promises.mkdir(d, { recursive: true });
                            if (fs.promises.cp) {
                                await fs.promises.cp(s, d, { recursive: true });
                            } else {
                                const queue = [{ s, d }];
                                while (queue.length) {
                                    const { s: qs, d: qd } = queue.pop();
                                    await fs.promises.mkdir(qd, { recursive: true });
                                    const e2 = await fs.promises.readdir(qs, { withFileTypes: true });
                                    for (const e of e2) {
                                        const ss = path.join(qs, e.name);
                                        const dd = path.join(qd, e.name);
                                        if (e.isDirectory()) queue.push({ s: ss, d: dd });
                                        else await fs.promises.copyFile(ss, dd);
                                    }
                                }
                            }
                        } else {
                            await fs.promises.copyFile(s, d);
                        }
                    }
                }
            } else {
                await fs.promises.copyFile(srcPath, destPath);
            }
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    // ============================================
    // ZIP ARCHIVE IPC
    // ============================================

    ipcMain.handle('fs:createZip', async (event, sourcePath, targetZipPath) => {
        if (!AdmZip) return ipcError('adm-zip dependency missing');
        const srcCheck = isPathSafe(sourcePath);
        if (!srcCheck.safe) {
            return ipcError(srcCheck.reason);
        }
        const destCheck = isPathSafe(targetZipPath);
        if (!destCheck.safe) {
            return ipcError(destCheck.reason);
        }
        try {
            const zip = new AdmZip();
            const stat = await fs.promises.stat(sourcePath);
            if (stat.isDirectory()) {
                zip.addLocalFolder(sourcePath);
            } else {
                zip.addLocalFile(sourcePath);
            }
            zip.writeZip(targetZipPath);
            await fs.promises.access(targetZipPath);
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:extractZip', async (event, zipPath, targetDir) => {
        if (!AdmZip) return ipcError('adm-zip dependency missing');
        const zipCheck = isPathSafe(zipPath);
        if (!zipCheck.safe) {
            return ipcError(zipCheck.reason);
        }
        const destCheck = isPathSafe(targetDir);
        if (!destCheck.safe) {
            return ipcError(destCheck.reason);
        }
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(targetDir, true);
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    ipcMain.handle('fs:getHome', () => os.homedir());
    ipcMain.handle('fs:getAppPath', () => app.getAppPath());

    ipcMain.handle('fs:openExternal', async (event, filePath) => {
        try {
            const target = String(filePath || '');
            if (target.startsWith('http://') || target.startsWith('https://')) {
                await shell.openExternal(target);
            } else {
                await shell.openPath(target);
            }
            return ipcSuccess();
        } catch (error) {
            return ipcError(error.message);
        }
    });

    // ============================================
    // EXIF METADATA (best-effort)
    // ============================================

    ipcMain.handle('exif:extract', async (event, imagePath) => {
        try {
            const target = String(imagePath || '').trim();
            if (!target) return ipcError('Invalid image path');

            const buf = await fs.promises.readFile(target);
            const metadata = extractExifFromBuffer(buf);
            if (!metadata || !Object.keys(metadata).length) {
                return ipcError('No EXIF data found in image');
            }
            return ipcSuccess({ metadata });
        } catch (error) {
            return ipcError(error.message || String(error));
        }
    });

    ipcMain.handle('exif:strip', async (event, imagePath) => {
        try {
            const target = String(imagePath || '').trim();
            if (!target) return ipcError('Invalid image path');

            const buf = await fs.promises.readFile(target);
            const stripped = stripImageMetadata(buf);
            if (!stripped) return ipcError('Unsupported image format (supported: JPEG, PNG)');

            // Backup original with ".original" suffix
            const backupBase = `${target}.original`;
            let backupPath = backupBase;
            try {
                await fs.promises.access(backupPath, fs.constants.F_OK);
                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                backupPath = `${backupBase}.${ts}`;
            } catch {
                // ok (does not exist)
            }

            await fs.promises.writeFile(backupPath, buf);

            // Write stripped file (best-effort atomic replace)
            const tmpPath = `${target}.tmp`;
            await fs.promises.writeFile(tmpPath, stripped);
            try {
                await fs.promises.unlink(target);
            } catch {
                // ignore
            }
            await fs.promises.rename(tmpPath, target);

            return ipcSuccess({ outputPath: target });
        } catch (error) {
            return ipcError(error.message || String(error));
        }
    });

    console.log('[IPC] Filesystem handlers registered');
}

module.exports = { registerFilesystemHandlers };
