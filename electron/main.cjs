const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

// PTY support (for real terminal)
let pty = null;
try {
    pty = require('node-pty');
} catch (e) {
    console.warn('node-pty not available, PTY terminal disabled:', e.message);
}
const ptyProcesses = new Map(); // id -> { pty, cwd }

let mainWindow;
let lastCpuTotals = null; // { idle: number, total: number }
let lastNetTotals = null; // { rx: number, tx: number }
let lastNetAt = 0;


function execAsync(command, options = {}) {
    const timeoutMs = options.timeout || 3000; // Default 3s timeout to prevent hangs in VMs
    return new Promise((resolve) => {
        const child = exec(command, { maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
            resolve({ error, stdout: stdout || '', stderr: stderr || '' });
        });
        // Kill process if it takes too long (common with nmcli in VMs without WiFi)
        setTimeout(() => {
            try { child.kill('SIGTERM'); } catch { }
            resolve({ error: new Error('Command timed out'), stdout: '', stderr: '' });
        }, timeoutMs);
    });
}

function shEscape(value) {
    // Safe-ish for wrapping in double quotes in sh.
    // (Not a full shell-escape; good enough for SSIDs/passwords/ids passed to nmcli/pactl/etc.)
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function isJpegBuffer(buf) {
    return Buffer.isBuffer(buf) && buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
}

function isPngBuffer(buf) {
    return Buffer.isBuffer(buf) && buf.length >= 8
        && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
        && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;
}

function parseTiffExif(tiffBuf) {
    try {
        if (!Buffer.isBuffer(tiffBuf) || tiffBuf.length < 8) return {};
        const endian = tiffBuf.toString('ascii', 0, 2);
        const le = endian === 'II';
        const be = endian === 'MM';
        if (!le && !be) return {};

        const readU16 = (off) => {
            if (off < 0 || off + 2 > tiffBuf.length) return null;
            return le ? tiffBuf.readUInt16LE(off) : tiffBuf.readUInt16BE(off);
        };
        const readU32 = (off) => {
            if (off < 0 || off + 4 > tiffBuf.length) return null;
            return le ? tiffBuf.readUInt32LE(off) : tiffBuf.readUInt32BE(off);
        };
        const readI32 = (off) => {
            if (off < 0 || off + 4 > tiffBuf.length) return null;
            return le ? tiffBuf.readInt32LE(off) : tiffBuf.readInt32BE(off);
        };

        const magic = readU16(2);
        if (magic !== 0x2A) return {};
        const ifd0Off = readU32(4);
        if (ifd0Off === null) return {};

        const tagMap0 = new Map([
            [0x010F, 'Make'],
            [0x0110, 'Model'],
            [0x0131, 'Software'],
            [0x0132, 'DateTime'],
            [0x010E, 'ImageDescription'],
            [0x013B, 'Artist'],
            [0x8298, 'Copyright'],
            [0x0112, 'Orientation'],
        ]);

        const tagMapExif = new Map([
            [0x9003, 'DateTimeOriginal'],
            [0x9004, 'DateTimeDigitized'],
            [0x829A, 'ExposureTime'],
            [0x829D, 'FNumber'],
            [0x8827, 'ISO'],
            [0x920A, 'FocalLength'],
            [0xA002, 'PixelXDimension'],
            [0xA003, 'PixelYDimension'],
            [0xA405, 'FocalLengthIn35mmFilm'],
        ]);

        const typeSize = (type) => {
            if (type === 1) return 1; // BYTE
            if (type === 2) return 1; // ASCII
            if (type === 3) return 2; // SHORT
            if (type === 4) return 4; // LONG
            if (type === 5) return 8; // RATIONAL
            if (type === 7) return 1; // UNDEFINED
            if (type === 9) return 4; // SLONG
            if (type === 10) return 8; // SRATIONAL
            return 0;
        };

        const safeAscii = (buf) => String(buf || '')
            .replace(/\0/g, '')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
            .trim();

        const readRational = (off, signed) => {
            if (off < 0 || off + 8 > tiffBuf.length) return null;
            const num = signed ? readI32(off) : readU32(off);
            const den = signed ? readI32(off + 4) : readU32(off + 4);
            if (num === null || den === null) return null;
            return { num, den };
        };

        const rationalToString = (r) => {
            if (!r) return '';
            const den = r.den;
            if (!den) return String(r.num);
            const val = r.num / den;
            if (!Number.isFinite(val)) return `${r.num}/${r.den}`;
            // Prefer a fraction-like display for common camera values.
            if (Math.abs(val) < 1 && r.num !== 0 && den <= 1000000) return `${r.num}/${r.den}`;
            if (Number.isInteger(val)) return String(val);
            return String(Math.round(val * 1000000) / 1000000);
        };

        const readValue = (entryOff, type, count, valueOrOff) => {
            const size = typeSize(type);
            if (!size) return null;
            const total = size * count;
            const dataOff = total <= 4 ? (entryOff + 8) : valueOrOff;
            if (dataOff < 0 || dataOff + total > tiffBuf.length) return null;

            if (type === 2) {
                return safeAscii(tiffBuf.slice(dataOff, dataOff + total));
            }
            if (type === 3) {
                if (count === 1) return String(readU16(dataOff) ?? '');
                const vals = [];
                for (let i = 0; i < count; i++) vals.push(readU16(dataOff + i * 2));
                return vals.filter(v => v !== null).join(', ');
            }
            if (type === 4) {
                if (count === 1) return String(readU32(dataOff) ?? '');
                const vals = [];
                for (let i = 0; i < count; i++) vals.push(readU32(dataOff + i * 4));
                return vals.filter(v => v !== null).join(', ');
            }
            if (type === 9) {
                if (count === 1) return String(readI32(dataOff) ?? '');
                const vals = [];
                for (let i = 0; i < count; i++) vals.push(readI32(dataOff + i * 4));
                return vals.filter(v => v !== null).join(', ');
            }
            if (type === 5) {
                if (count === 1) return rationalToString(readRational(dataOff, false));
                const vals = [];
                for (let i = 0; i < count; i++) vals.push(rationalToString(readRational(dataOff + i * 8, false)));
                return vals.filter(Boolean).join(', ');
            }
            if (type === 10) {
                if (count === 1) return rationalToString(readRational(dataOff, true));
                const vals = [];
                for (let i = 0; i < count; i++) vals.push(rationalToString(readRational(dataOff + i * 8, true)));
                return vals.filter(Boolean).join(', ');
            }

            // Fallback: raw bytes
            return safeAscii(tiffBuf.slice(dataOff, dataOff + Math.min(total, 256)));
        };

        const out = {};
        let exifIfdOff = null;
        let gpsIfdOff = null;

        const parseIfd = (ifdOff, tagMap, collectGps) => {
            if (ifdOff === null || ifdOff < 0 || ifdOff + 2 > tiffBuf.length) return;
            const count = readU16(ifdOff);
            if (count === null) return;
            let entryOff = ifdOff + 2;
            for (let i = 0; i < count; i++) {
                if (entryOff + 12 > tiffBuf.length) break;
                const tag = readU16(entryOff);
                const type = readU16(entryOff + 2);
                const num = readU32(entryOff + 4);
                const valueOrOff = readU32(entryOff + 8);
                if (tag === null || type === null || num === null || valueOrOff === null) break;

                // pointers
                if (tag === 0x8769) exifIfdOff = valueOrOff;
                if (tag === 0x8825) gpsIfdOff = valueOrOff;

                const name = tagMap && tagMap.get(tag);
                if (name) {
                    const val = readValue(entryOff, type, num, valueOrOff);
                    if (val !== null && String(val).trim()) out[name] = String(val);
                }

                if (collectGps) {
                    const val = readValue(entryOff, type, num, valueOrOff);
                    // GPS tags handled below via collectGps object.
                    collectGps(tag, type, num, valueOrOff, entryOff, val);
                }

                entryOff += 12;
            }
        };

        // IFD0
        parseIfd(ifd0Off, tagMap0);

        // Exif IFD
        if (exifIfdOff !== null) parseIfd(exifIfdOff, tagMapExif);

        // GPS IFD
        if (gpsIfdOff !== null) {
            const gps = { latRef: null, lonRef: null, lat: null, lon: null, alt: null, altRef: null };

            const collectGps = (tag, type, count, valueOrOff, entryOff) => {
                const size = typeSize(type);
                const total = size * count;
                const dataOff = total <= 4 ? (entryOff + 8) : valueOrOff;

                if (tag === 0x0001) { // LatRef
                    const v = readValue(entryOff, type, count, valueOrOff);
                    gps.latRef = v ? String(v).trim().toUpperCase() : null;
                } else if (tag === 0x0003) { // LonRef
                    const v = readValue(entryOff, type, count, valueOrOff);
                    gps.lonRef = v ? String(v).trim().toUpperCase() : null;
                } else if (tag === 0x0002 && type === 5 && count >= 3) { // Lat
                    const r0 = readRational(dataOff, false);
                    const r1 = readRational(dataOff + 8, false);
                    const r2 = readRational(dataOff + 16, false);
                    if (r0 && r1 && r2 && r0.den && r1.den && r2.den) {
                        gps.lat = (r0.num / r0.den) + (r1.num / r1.den) / 60 + (r2.num / r2.den) / 3600;
                    }
                } else if (tag === 0x0004 && type === 5 && count >= 3) { // Lon
                    const r0 = readRational(dataOff, false);
                    const r1 = readRational(dataOff + 8, false);
                    const r2 = readRational(dataOff + 16, false);
                    if (r0 && r1 && r2 && r0.den && r1.den && r2.den) {
                        gps.lon = (r0.num / r0.den) + (r1.num / r1.den) / 60 + (r2.num / r2.den) / 3600;
                    }
                } else if (tag === 0x0005) { // AltRef
                    const v = readValue(entryOff, type, count, valueOrOff);
                    gps.altRef = v ? String(v).trim() : null;
                } else if (tag === 0x0006 && type === 5 && count === 1) { // Altitude
                    const r = readRational(dataOff, false);
                    if (r && r.den) gps.alt = r.num / r.den;
                }
            };

            parseIfd(gpsIfdOff, new Map(), collectGps);

            if (typeof gps.lat === 'number' && Number.isFinite(gps.lat) && gps.latRef) {
                const sign = gps.latRef === 'S' ? -1 : 1;
                const val = Math.abs(gps.lat) * sign;
                out['GPS Latitude'] = `${Math.round(val * 1000000) / 1000000} ${gps.latRef}`;
            }
            if (typeof gps.lon === 'number' && Number.isFinite(gps.lon) && gps.lonRef) {
                const sign = gps.lonRef === 'W' ? -1 : 1;
                const val = Math.abs(gps.lon) * sign;
                out['GPS Longitude'] = `${Math.round(val * 1000000) / 1000000} ${gps.lonRef}`;
            }
            if (typeof gps.alt === 'number' && Number.isFinite(gps.alt)) {
                const neg = gps.altRef === '1';
                out['GPS Altitude'] = `${Math.round((neg ? -gps.alt : gps.alt) * 100) / 100} m`;
            }
        }

        // Friendly rename for a couple common fields
        if (out.DateTimeOriginal && !out.DateTime) out.DateTime = out.DateTimeOriginal;

        // Cap size
        const limited = {};
        for (const [k, v] of Object.entries(out)) {
            limited[k] = String(v).slice(0, 300);
            if (Object.keys(limited).length >= 80) break;
        }
        return limited;
    } catch (e) {
        return {};
    }
}

function extractExifFromBuffer(buf) {
    if (isJpegBuffer(buf)) {
        // Find APP1 Exif segment
        let pos = 2;
        while (pos + 4 < buf.length) {
            if (buf[pos] !== 0xFF) { pos++; continue; }
            const marker = buf[pos + 1];
            if (marker === 0xDA) break; // SOS
            if (marker === 0xD9) break; // EOI
            if (marker >= 0xD0 && marker <= 0xD7) { pos += 2; continue; }
            if (marker === 0x01) { pos += 2; continue; }
            if (pos + 3 >= buf.length) break;
            const segLen = buf.readUInt16BE(pos + 2);
            if (segLen < 2) break;
            const dataStart = pos + 4;
            const dataEnd = pos + 2 + segLen;
            if (dataEnd > buf.length) break;
            if (marker === 0xE1 && dataEnd - dataStart >= 6) {
                const head = buf.slice(dataStart, dataStart + 6).toString('ascii');
                if (head === 'Exif\0\0') {
                    const tiff = buf.slice(dataStart + 6, dataEnd);
                    return parseTiffExif(tiff);
                }
            }
            pos = dataEnd;
        }
        return null;
    }

    if (isPngBuffer(buf)) {
        let pos = 8;
        while (pos + 12 <= buf.length) {
            const len = buf.readUInt32BE(pos);
            const type = buf.slice(pos + 4, pos + 8).toString('ascii');
            const chunkStart = pos + 8;
            const chunkEnd = chunkStart + len;
            const totalEnd = chunkEnd + 4;
            if (totalEnd > buf.length) break;

            if (type === 'eXIf') {
                let tiff = buf.slice(chunkStart, chunkEnd);
                if (tiff.length >= 6 && tiff.slice(0, 6).toString('ascii') === 'Exif\0\0') {
                    tiff = tiff.slice(6);
                }
                const meta = parseTiffExif(tiff);
                return Object.keys(meta).length ? meta : null;
            }

            if (type === 'IEND') break;
            pos = totalEnd;
        }
        return null;
    }

    return null;
}

function stripJpegMetadata(buf) {
    if (!isJpegBuffer(buf)) return null;
    const out = [buf.slice(0, 2)]; // SOI
    let pos = 2;
    while (pos + 1 < buf.length) {
        if (buf[pos] !== 0xFF) {
            // Unexpected; copy rest
            out.push(buf.slice(pos));
            break;
        }
        const marker = buf[pos + 1];

        // Start of Scan: keep the rest verbatim
        if (marker === 0xDA) {
            out.push(buf.slice(pos));
            break;
        }
        // EOI
        if (marker === 0xD9) {
            out.push(buf.slice(pos, pos + 2));
            break;
        }
        // Standalone markers
        if (marker === 0xD8 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
            out.push(buf.slice(pos, pos + 2));
            pos += 2;
            continue;
        }

        if (pos + 3 >= buf.length) break;
        const segLen = buf.readUInt16BE(pos + 2);
        if (segLen < 2) break;
        const segEnd = pos + 2 + segLen;
        if (segEnd > buf.length) break;

        const dataStart = pos + 4;
        const dataEnd = segEnd;
        const data = buf.slice(dataStart, dataEnd);

        let drop = false;
        if (marker === 0xE1) {
            const head6 = data.length >= 6 ? data.slice(0, 6).toString('ascii') : '';
            if (head6 === 'Exif\0\0') drop = true;
            const head29 = data.length >= 29 ? data.slice(0, 29).toString('ascii') : '';
            if (head29 === 'http://ns.adobe.com/xap/1.0/') drop = true; // XMP
        }
        if (marker === 0xFE) drop = true; // COM
        if (marker === 0xED) drop = true; // APP13 Photoshop

        if (!drop) out.push(buf.slice(pos, segEnd));
        pos = segEnd;
    }
    return Buffer.concat(out);
}

function stripPngMetadata(buf) {
    if (!isPngBuffer(buf)) return null;
    const out = [buf.slice(0, 8)];
    let pos = 8;
    while (pos + 12 <= buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.slice(pos + 4, pos + 8).toString('ascii');
        const total = 12 + len;
        if (pos + total > buf.length) break;

        const drop = type === 'eXIf' || type === 'tEXt' || type === 'iTXt' || type === 'zTXt';
        if (!drop) out.push(buf.slice(pos, pos + total));

        pos += total;
        if (type === 'IEND') break;
    }
    return Buffer.concat(out);
}

function stripImageMetadata(buf) {
    if (isJpegBuffer(buf)) return stripJpegMetadata(buf);
    if (isPngBuffer(buf)) return stripPngMetadata(buf);
    return null;
}

function buildSwayEnvPrefix() {
    if (process.env.SWAYSOCK) return `SWAYSOCK="${shEscape(process.env.SWAYSOCK)}"`;
    if (process.env.XDG_RUNTIME_DIR) return `SWAYSOCK=$(ls "${shEscape(process.env.XDG_RUNTIME_DIR)}"/sway*.sock 2>/dev/null | head -1)`;
    return '';
}

function cpuTotals() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
        const t = cpu.times || {};
        idle += t.idle || 0;
        total += (t.user || 0) + (t.nice || 0) + (t.sys || 0) + (t.irq || 0) + (t.idle || 0);
    }
    return { idle, total };
}

async function linuxNetTotals() {
    const raw = await fs.promises.readFile('/proc/net/dev', 'utf-8');
    let rx = 0;
    let tx = 0;
    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Inter-') || trimmed.startsWith('face')) continue;
        const parts = trimmed.split(':');
        if (parts.length < 2) continue;
        const iface = parts[0].trim();
        if (!iface || iface === 'lo') continue;
        const fields = parts[1].trim().split(/\s+/);
        if (fields.length < 9) continue;
        const rxBytes = parseInt(fields[0], 10);
        const txBytes = parseInt(fields[8], 10);
        if (Number.isFinite(rxBytes)) rx += rxBytes;
        if (Number.isFinite(txBytes)) tx += txBytes;
    }
    return { rx, tx };
}

async function listRatbagDevices() {
    if (process.platform !== 'linux') return [];
    const res = await execAsync('ratbagctl list 2>/dev/null');
    if (res.error || !res.stdout) return [];
    const devices = [];
    for (const line of res.stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const m = trimmed.match(/^([^:]+):\s*(.+)$/);
        if (!m) continue;
        devices.push({ id: m[1].trim(), name: m[2].trim() });
    }
    return devices;
}

function getLinuxTrashPaths() {
    const base = path.join(os.homedir(), '.local', 'share', 'Trash');
    return {
        base,
        files: path.join(base, 'files'),
        info: path.join(base, 'info')
    };
}

async function ensureLinuxTrash() {
    const t = getLinuxTrashPaths();
    await fs.promises.mkdir(t.files, { recursive: true });
    await fs.promises.mkdir(t.info, { recursive: true });
    return t;
}

function isoTrashTimestamp(date = new Date()) {
    // Use local time, ISO-like (freedesktop format uses ISO-ish)
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function trashInfoText(originalPath, deletionDate) {
    // Path should be URI-escaped per spec; use encodeURI to keep slashes.
    const encoded = encodeURI(originalPath);
    return `[Trash Info]\nPath=${encoded}\nDeletionDate=${deletionDate}\n`;
}

async function moveToLinuxTrash(itemPath) {
    const t = await ensureLinuxTrash();
    const stat = await fs.promises.stat(itemPath);
    const baseName = path.basename(itemPath);

    let name = baseName;
    let destPath = path.join(t.files, name);
    let counter = 1;
    while (true) {
        try {
            await fs.promises.access(destPath);
            const ext = path.extname(baseName);
            const stem = ext ? baseName.slice(0, -ext.length) : baseName;
            name = `${stem}_${Date.now()}_${counter}${ext}`;
            destPath = path.join(t.files, name);
            counter++;
        } catch {
            break;
        }
    }

    const deletionDate = isoTrashTimestamp(new Date());
    const infoPath = path.join(t.info, `${name}.trashinfo`);

    // Try rename first; fall back to copy+delete for cross-device moves.
    try {
        await fs.promises.rename(itemPath, destPath);
    } catch (e) {
        if (stat.isDirectory()) {
            if (fs.promises.cp) await fs.promises.cp(itemPath, destPath, { recursive: true });
            else throw e;
            await fs.promises.rm(itemPath, { recursive: true, force: true });
        } else {
            await fs.promises.copyFile(itemPath, destPath);
            await fs.promises.unlink(itemPath);
        }
    }

    await fs.promises.writeFile(infoPath, trashInfoText(itemPath, deletionDate), 'utf-8');
    return { name, trashPath: destPath, originalPath: itemPath, deletionDate };
}

async function listLinuxTrash() {
    const t = await ensureLinuxTrash();
    const files = await fs.promises.readdir(t.files).catch(() => []);
    const results = [];

    for (const name of files) {
        const trashPath = path.join(t.files, name);
        const infoPath = path.join(t.info, `${name}.trashinfo`);
        let originalPath = '';
        let deletionDate = '';

        try {
            const raw = await fs.promises.readFile(infoPath, 'utf-8');
            const mPath = raw.match(/^Path=(.+)$/m);
            const mDate = raw.match(/^DeletionDate=(.+)$/m);
            if (mPath) originalPath = decodeURI(mPath[1].trim());
            if (mDate) deletionDate = mDate[1].trim();
        } catch {
            // ignore
        }

        let stat = null;
        try { stat = await fs.promises.stat(trashPath); } catch { }
        results.push({
            name,
            trashPath,
            originalPath,
            deletionDate,
            isDirectory: stat ? stat.isDirectory() : false,
            size: stat ? stat.size : 0
        });
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    return results;
}

async function restoreLinuxTrash(trashPath, originalPath) {
    const t = getLinuxTrashPaths();
    const resolvedTrash = path.resolve(trashPath || '');
    const resolvedFiles = path.resolve(t.files);
    if (!resolvedTrash.startsWith(resolvedFiles + path.sep)) {
        throw new Error('Invalid trash path');
    }
    const name = path.basename(resolvedTrash);
    const infoPath = path.join(t.info, `${name}.trashinfo`);

    const dest = originalPath ? path.resolve(originalPath) : null;
    if (!dest) throw new Error('Missing original path');

    await fs.promises.mkdir(path.dirname(dest), { recursive: true }).catch(() => { });

    let finalDest = dest;
    try {
        await fs.promises.access(finalDest);
        const ext = path.extname(finalDest);
        const stem = ext ? finalDest.slice(0, -ext.length) : finalDest;
        finalDest = `${stem}.restored_${Date.now()}${ext}`;
    } catch {
        // ok
    }

    await fs.promises.rename(resolvedTrash, finalDest);
    await fs.promises.rm(infoPath, { force: true }).catch(() => { });
    return { restoredPath: finalDest };
}

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

ipcMain.handle('window:setBounds', (event, bounds) => {
    if (mainWindow) {
        mainWindow.setBounds(bounds);
        return { success: true };
    }
    return { success: false, error: 'Window not found' };
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

ipcMain.handle('fs:trash', async (event, itemPath) => {
    try {
        const target = String(itemPath || '');
        if (!target) return { success: false, error: 'Invalid path' };

        if (process.platform === 'linux') {
            const moved = await moveToLinuxTrash(target);
            return { success: true, entry: moved };
        }

        if (shell && typeof shell.trashItem === 'function') {
            await shell.trashItem(target);
            return { success: true };
        }

        return { success: false, error: 'Trash not supported on this platform' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:listTrash', async () => {
    try {
        if (process.platform !== 'linux') return { success: true, entries: [] };
        const entries = await listLinuxTrash();
        return { success: true, entries };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:restoreTrash', async (event, payload) => {
    try {
        if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
        const trashPath = payload && typeof payload.trashPath === 'string' ? payload.trashPath : '';
        const originalPath = payload && typeof payload.originalPath === 'string' ? payload.originalPath : '';
        const restored = await restoreLinuxTrash(trashPath, originalPath);
        return { success: true, restored };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:deleteTrashItem', async (event, trashPath) => {
    try {
        if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
        const t = getLinuxTrashPaths();
        const resolvedTrash = path.resolve(String(trashPath || ''));
        const resolvedFiles = path.resolve(t.files);
        if (!resolvedTrash.startsWith(resolvedFiles + path.sep)) throw new Error('Invalid trash path');
        const name = path.basename(resolvedTrash);
        const infoPath = path.join(t.info, `${name}.trashinfo`);
        const stat = await fs.promises.stat(resolvedTrash);
        if (stat.isDirectory()) await fs.promises.rm(resolvedTrash, { recursive: true, force: true });
        else await fs.promises.unlink(resolvedTrash);
        await fs.promises.rm(infoPath, { force: true }).catch(() => { });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:emptyTrash', async () => {
    try {
        if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
        const t = await ensureLinuxTrash();
        await fs.promises.rm(t.files, { recursive: true, force: true });
        await fs.promises.rm(t.info, { recursive: true, force: true });
        await ensureLinuxTrash();
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

ipcMain.handle('fs:copy', async (event, srcPath, destPath) => {
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
                        // recurse by re-invoking handler logic
                        if (fs.promises.cp) {
                            await fs.promises.cp(s, d, { recursive: true });
                        } else {
                            // naive: call self recursively via stack
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
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// ZIP ARCHIVE IPC
// ============================================
let AdmZip = null;
try { AdmZip = require('adm-zip'); } catch (e) { console.warn('adm-zip not found', e); }

ipcMain.handle('fs:createZip', async (event, sourcePath, targetZipPath) => {
    if (!AdmZip) return { success: false, error: 'adm-zip dependency missing' };
    try {
        const zip = new AdmZip();
        const stat = await fs.promises.stat(sourcePath);
        if (stat.isDirectory()) {
            zip.addLocalFolder(sourcePath);
        } else {
            zip.addLocalFile(sourcePath);
        }
        zip.writeZip(targetZipPath);
        // Verify creation
        await fs.promises.access(targetZipPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:extractZip', async (event, zipPath, targetDir) => {
    if (!AdmZip) return { success: false, error: 'adm-zip dependency missing' };
    try {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(targetDir, true); // true = overwrite
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
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
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// EXIF METADATA (best-effort)
// ============================================
ipcMain.handle('exif:extract', async (event, imagePath) => {
    try {
        const target = String(imagePath || '').trim();
        if (!target) return { success: false, error: 'Invalid image path' };

        const buf = await fs.promises.readFile(target);
        const metadata = extractExifFromBuffer(buf);
        if (!metadata || !Object.keys(metadata).length) {
            return { success: false, error: 'No EXIF data found in image' };
        }
        return { success: true, metadata };
    } catch (error) {
        return { success: false, error: error.message || String(error) };
    }
});

ipcMain.handle('exif:strip', async (event, imagePath) => {
    try {
        const target = String(imagePath || '').trim();
        if (!target) return { success: false, error: 'Invalid image path' };

        const buf = await fs.promises.readFile(target);
        const stripped = stripImageMetadata(buf);
        if (!stripped) return { success: false, error: 'Unsupported image format (supported: JPEG, PNG)' };

        // Backup original with ".original" suffix (or ".original.<timestamp>" if exists)
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

        return { success: true, outputPath: target };
    } catch (error) {
        return { success: false, error: error.message || String(error) };
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

ipcMain.handle('system:lock', async () => {
    // Always trigger the UI overlay (renderer lock screen) as an immediate response.
    try {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('lock-screen');
        }
    } catch {
        // ignore
    }

    // Best-effort: also lock the real OS session on Linux.
    if (process.platform !== 'linux') {
        return { success: true, unsupported: true };
    }

    const sessionId = process.env.XDG_SESSION_ID ? String(process.env.XDG_SESSION_ID) : '';
    const candidates = [
        // Systemd (most distros)
        ...(sessionId ? [`loginctl lock-session "${shEscape(sessionId)}" 2>/dev/null`] : []),
        'loginctl lock-sessions 2>/dev/null',
        // X11/DE fallbacks
        'xdg-screensaver lock 2>/dev/null',
        'dm-tool lock 2>/dev/null',
        'gnome-screensaver-command -l 2>/dev/null',
        // DBus (various environments)
        'qdbus org.freedesktop.ScreenSaver /ScreenSaver Lock 2>/dev/null',
        'dbus-send --type=method_call --dest=org.freedesktop.ScreenSaver /ScreenSaver org.freedesktop.ScreenSaver.Lock 2>/dev/null'
    ];

    for (const cmd of candidates) {
        const res = await execAsync(cmd, { timeout: 2500 });
        if (!res.error) return { success: true, backend: cmd };
    }

    return { success: false, error: 'No supported screen locker found', tried: candidates };
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

ipcMain.handle('system:getBattery', async () => {
    if (process.platform !== 'linux') {
        return { success: true, supported: false, status: { present: false } };
    }

    const parseUPowerTime = (value) => {
        const raw = String(value || '').trim().toLowerCase();
        const m = raw.match(/^(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|minute|minutes|min|mins|second|seconds|sec|secs)\b/);
        if (!m) return null;
        const n = parseFloat(m[1]);
        if (!Number.isFinite(n)) return null;
        const unit = m[2];
        if (unit.startsWith('hour') || unit.startsWith('hr')) return Math.round(n * 3600);
        if (unit.startsWith('min')) return Math.round(n * 60);
        if (unit.startsWith('sec')) return Math.round(n);
        return null;
    };

    const parseHms = (value) => {
        const raw = String(value || '').trim();
        const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (!m) return null;
        const h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const sec = m[3] ? parseInt(m[3], 10) : 0;
        if (!Number.isFinite(h) || !Number.isFinite(min) || !Number.isFinite(sec)) return null;
        return h * 3600 + min * 60 + sec;
    };

    // Prefer upower (common on modern Linux desktops)
    const upowerList = await execAsync('upower -e 2>/dev/null', { timeout: 2500 });
    if (!upowerList.error && upowerList.stdout) {
        const lines = upowerList.stdout.split('\n').map(l => l.trim()).filter(Boolean);
        const batteryDev = lines.find(l => /\/battery_/i.test(l) || /battery/i.test(l)) || null;
        if (!batteryDev) {
            return { success: true, supported: true, status: { present: false, source: 'upower' } };
        }

        const info = await execAsync(`upower -i "${shEscape(batteryDev)}" 2>/dev/null`, { timeout: 2500 });
        if (!info.error && info.stdout) {
            const text = info.stdout;
            const grab = (re) => {
                const m = text.match(re);
                return m ? String(m[1]).trim() : null;
            };

            const presentRaw = grab(/^\s*present:\s*(.+)$/mi);
            const present = (presentRaw || '').toLowerCase().includes('yes') || (presentRaw || '').toLowerCase().includes('true');

            const stateRaw = grab(/^\s*state:\s*(.+)$/mi) || 'unknown';
            const state = stateRaw.toLowerCase();

            const percentRaw = grab(/^\s*percentage:\s*(\d+)%/mi);
            const percent = percentRaw ? Math.max(0, Math.min(100, parseInt(percentRaw, 10))) : null;

            const tteRaw = grab(/^\s*time to empty:\s*(.+)$/mi);
            const ttfRaw = grab(/^\s*time to full:\s*(.+)$/mi);
            const timeToEmptySec = tteRaw ? parseUPowerTime(tteRaw) : null;
            const timeToFullSec = ttfRaw ? parseUPowerTime(ttfRaw) : null;

            const isCharging = state.includes('charging') ? true : (state.includes('discharging') || state.includes('fully-charged') || state.includes('full')) ? false : null;

            return {
                success: true,
                supported: true,
                status: {
                    present,
                    percent,
                    state,
                    isCharging,
                    timeToEmptySec,
                    timeToFullSec,
                    source: 'upower'
                }
            };
        }
    }

    // Fallback: acpi (often installed on laptops / minimal systems)
    const acpi = await execAsync('acpi -b 2>/dev/null', { timeout: 2500 });
    if (!acpi.error && acpi.stdout) {
        const lines = acpi.stdout.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) {
            return { success: true, supported: true, status: { present: false, source: 'acpi' } };
        }

        const parsed = lines.map(line => {
            // Battery 0: Discharging, 74%, 01:52:34 remaining
            const m = line.match(/:\s*([^,]+),\s*(\d+)%\s*,?\s*(.*)$/i);
            if (!m) return null;
            const state = String(m[1] || '').trim().toLowerCase();
            const percent = Math.max(0, Math.min(100, parseInt(m[2], 10)));
            const tail = String(m[3] || '').trim();
            const seconds = parseHms(tail);
            return { state, percent, seconds };
        }).filter(Boolean);

        if (!parsed.length) {
            return { success: true, supported: true, status: { present: false, source: 'acpi' } };
        }

        const avg = Math.round(parsed.reduce((sum, p) => sum + p.percent, 0) / parsed.length);
        const primary = parsed[0];
        const isCharging = primary.state.includes('charging') ? true : primary.state.includes('discharging') ? false : null;

        return {
            success: true,
            supported: true,
            status: {
                present: true,
                percent: avg,
                state: primary.state,
                isCharging,
                timeToEmptySec: primary.state.includes('discharging') ? (primary.seconds || null) : null,
                timeToFullSec: primary.state.includes('charging') ? (primary.seconds || null) : null,
                source: 'acpi'
            }
        };
    }

    return { success: true, supported: false, status: { present: false }, error: 'Battery status not available (upower/acpi missing)' };
});

ipcMain.handle('monitor:getStats', async () => {
    try {
        let cpuPercent = null;
        try {
            const now = cpuTotals();
            if (lastCpuTotals && now.total > lastCpuTotals.total) {
                const idleDelta = now.idle - lastCpuTotals.idle;
                const totalDelta = now.total - lastCpuTotals.total;
                if (totalDelta > 0) cpuPercent = Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
            }
            lastCpuTotals = now;
        } catch {
            // ignore
        }

        const memTotal = os.totalmem();
        const memFree = os.freemem();
        const memUsed = Math.max(0, memTotal - memFree);

        let disk = null;
        if (process.platform !== 'win32') {
            const df = await execAsync('df -kP / 2>/dev/null');
            const lines = (df.stdout || '').trim().split('\n').filter(Boolean);
            if (lines.length >= 2) {
                const fields = lines[1].trim().split(/\s+/);
                const totalKb = parseInt(fields[1], 10);
                const usedKb = parseInt(fields[2], 10);
                const availKb = parseInt(fields[3], 10);
                const usePctStr = fields[4] || '';
                const usePct = parseInt(usePctStr.replace('%', ''), 10);
                if (Number.isFinite(totalKb) && totalKb > 0) {
                    disk = {
                        total: totalKb * 1024,
                        used: (Number.isFinite(usedKb) ? usedKb : 0) * 1024,
                        avail: (Number.isFinite(availKb) ? availKb : 0) * 1024,
                        percent: Number.isFinite(usePct) ? usePct : null
                    };
                }
            }
        }

        let network = null;
        if (process.platform === 'linux') {
            try {
                const nowAt = Date.now();
                const totals = await linuxNetTotals();
                let rxBps = 0;
                let txBps = 0;
                if (lastNetTotals && lastNetAt) {
                    const dt = Math.max(0.001, (nowAt - lastNetAt) / 1000);
                    rxBps = Math.max(0, (totals.rx - lastNetTotals.rx) / dt);
                    txBps = Math.max(0, (totals.tx - lastNetTotals.tx) / dt);
                }
                lastNetTotals = totals;
                lastNetAt = nowAt;
                network = { rxBps, txBps, rxBytes: totals.rx, txBytes: totals.tx };
            } catch {
                // ignore
            }
        }

        return {
            success: true,
            stats: {
                platform: os.platform(),
                hostname: os.hostname(),
                uptime: os.uptime(),
                loadavg: os.loadavg(),
                cpuPercent,
                cpuCores: os.cpus().length,
                memory: { total: memTotal, free: memFree, used: memUsed },
                disk,
                network
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('process:list', async () => {
    if (process.platform !== 'linux') {
        return { success: true, processes: [], unsupported: true };
    }

    const cmd = 'LC_ALL=C ps -eo pid=,comm=,%cpu=,%mem=,rss=,etime=,args= --sort=-%cpu | head -n 200';
    const res = await execAsync(cmd);
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'ps failed' };

    const processes = [];
    for (const line of (res.stdout || '').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const m = trimmed.match(/^(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\S+)(?:\s+(.*))?$/);
        if (!m) continue;
        const pid = parseInt(m[1], 10);
        const name = m[2] || '';
        const cpu = parseFloat(m[3]);
        const mem = parseFloat(m[4]);
        const rssKb = parseInt(m[5], 10);
        const etime = m[6] || '';
        const command = (m[7] || '').trim();
        if (!Number.isFinite(pid)) continue;
        processes.push({
            pid,
            name,
            cpu: Number.isFinite(cpu) ? cpu : 0,
            mem: Number.isFinite(mem) ? mem : 0,
            rssKb: Number.isFinite(rssKb) ? rssKb : 0,
            etime,
            command
        });
    }

    return { success: true, processes };
});

ipcMain.handle('process:kill', async (event, payload) => {
    if (process.platform !== 'linux') {
        return { success: false, error: 'Unsupported on this platform' };
    }

    const pid = Number(payload && payload.pid);
    const signal = String((payload && payload.signal) || 'TERM').toUpperCase();
    if (!Number.isFinite(pid) || pid <= 1) return { success: false, error: 'Invalid PID' };
    if (pid === process.pid) return { success: false, error: 'Refusing to kill TempleOS UI process' };
    if (!['TERM', 'KILL'].includes(signal)) return { success: false, error: 'Invalid signal' };

    const res = await execAsync(`kill -${signal} ${Math.floor(pid)}`);
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'kill failed' };
    return { success: true };
});

// ============================================
// CONFIG IPC (persist settings)
// ============================================
const configPath = path.join(app.getPath('userData'), 'templeos.config.json');

ipcMain.handle('config:load', async () => {
    try {
        const raw = await fs.promises.readFile(configPath, 'utf-8');
        const data = JSON.parse(raw);
        return { success: true, config: data };
    } catch (error) {
        return { success: true, config: {} };
    }
});

ipcMain.handle('config:save', async (event, config) => {
    try {
        await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
        const tmp = configPath + '.tmp';
        await fs.promises.writeFile(tmp, JSON.stringify(config || {}, null, 2), 'utf-8');
        await fs.promises.rename(tmp, configPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

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
        return { success: false, unsupported: true, error: 'System volume control is not supported on this platform' };
    } else {
        return { success: false, unsupported: true, error: 'System volume control is not supported on this platform' };
    }

    exec(command, (error) => {
        if (error) console.error(`Failed to set volume: ${error.message}`);
    });

    return { success: true };
});

// ============================================
// AUDIO DEVICES (PulseAudio / PipeWire via pactl)
// ============================================
function parseWpctlStatusDevices(statusText) {
    const lines = String(statusText || '').split('\n').map(l => l.replace(/\r/g, ''));
    let section = null; // 'sinks' | 'sources' | null

    const sinks = [];
    const sources = [];
    let defaultSink = null;
    let defaultSource = null;

    for (const line of lines) {
        const secMatch = line.match(/\b(Sinks|Sources):\s*$/);
        if (secMatch) {
            section = secMatch[1].toLowerCase();
            continue;
        }

        if (section !== 'sinks' && section !== 'sources') continue;

        // Example: "  * 47. alsa_output.pci-0000_00_1f.3.analog-stereo  [vol: 0.65]"
        const m = line.match(/^\s*(\*)?\s*(\d+)\.\s+(\S+)/);
        if (!m) continue;

        const isDefault = !!m[1];
        const id = m[2];
        const name = m[3];
        const entry = { id, name, driver: 'wpctl', state: '', description: name };

        if (section === 'sinks') {
            sinks.push(entry);
            if (isDefault && !defaultSink) defaultSink = name;
        } else {
            sources.push(entry);
            if (isDefault && !defaultSource) defaultSource = name;
        }
    }

    return { sinks, sources, defaultSink, defaultSource };
}

ipcMain.handle('audio:listDevices', async () => {
    if (process.platform !== 'linux') {
        return { success: true, sinks: [], sources: [], defaultSink: null, defaultSource: null };
    }

    const info = await execAsync('pactl info 2>/dev/null');
    const sinks = await execAsync('pactl list sinks short 2>/dev/null');
    const sources = await execAsync('pactl list sources short 2>/dev/null');

    if (sinks.error && sources.error) {
        // Ubuntu 24.04 / PipeWire: try wpctl (wireplumber) as fallback.
        const wpctl = await execAsync('wpctl status 2>/dev/null');
        if (!wpctl.error && wpctl.stdout) {
            const parsed = parseWpctlStatusDevices(wpctl.stdout);
            return {
                success: true,
                sinks: parsed.sinks,
                sources: parsed.sources,
                defaultSink: parsed.defaultSink,
                defaultSource: parsed.defaultSource,
                backend: 'wpctl'
            };
        }
        return { success: false, error: 'Audio tools not available (pactl/wpctl missing)' };
    }

    const parseShort = (txt) => txt
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => {
            const parts = l.split('\t');
            return {
                id: parts[0] || '',
                name: parts[1] || '',
                driver: parts[2] || '',
                state: parts[4] || '',
                description: parts[1] || ''
            };
        });

    const defaultSink = (info.stdout.match(/^Default Sink:\s*(.+)$/m) || [])[1] || null;
    const defaultSource = (info.stdout.match(/^Default Source:\s*(.+)$/m) || [])[1] || null;

    return {
        success: true,
        sinks: parseShort(sinks.stdout),
        sources: parseShort(sources.stdout),
        defaultSink,
        defaultSource
    };
});

ipcMain.handle('audio:setDefaultSink', async (event, sinkName) => {
    if (process.platform !== 'linux') return { success: true };
    const sink = String(sinkName || '').trim();
    if (!sink) return { success: false, error: 'Invalid sink' };

    // Prefer wpctl on PipeWire; fall back to pactl.
    const wpctlDirect = await execAsync(`wpctl set-default "${shEscape(sink)}" 2>/dev/null`);
    if (!wpctlDirect.error) return { success: true, backend: 'wpctl' };

    // If wpctl doesn't accept the name, try mapping name -> ID from wpctl status.
    const wpctlStatus = await execAsync('wpctl status 2>/dev/null');
    if (!wpctlStatus.error && wpctlStatus.stdout) {
        const parsed = parseWpctlStatusDevices(wpctlStatus.stdout);
        const match = parsed.sinks.find(s => s.name === sink || s.id === sink);
        if (match) {
            const wpctlById = await execAsync(`wpctl set-default "${shEscape(match.id)}" 2>/dev/null`);
            if (!wpctlById.error) return { success: true, backend: 'wpctl' };
        }
    }

    const pactl = await execAsync(`pactl set-default-sink "${shEscape(sink)}" 2>/dev/null`);
    if (!pactl.error) return { success: true, backend: 'pactl' };

    return { success: false, error: (pactl.stderr || wpctlDirect.stderr || (pactl.error ? pactl.error.message : '') || (wpctlDirect.error ? wpctlDirect.error.message : '') || '').trim() || 'Failed to set default sink' };
});

ipcMain.handle('audio:setDefaultSource', async (event, sourceName) => {
    if (process.platform !== 'linux') return { success: true };
    const source = String(sourceName || '').trim();
    if (!source) return { success: false, error: 'Invalid source' };

    const wpctlDirect = await execAsync(`wpctl set-default "${shEscape(source)}" 2>/dev/null`);
    if (!wpctlDirect.error) return { success: true, backend: 'wpctl' };

    const wpctlStatus = await execAsync('wpctl status 2>/dev/null');
    if (!wpctlStatus.error && wpctlStatus.stdout) {
        const parsed = parseWpctlStatusDevices(wpctlStatus.stdout);
        const match = parsed.sources.find(s => s.name === source || s.id === source);
        if (match) {
            const wpctlById = await execAsync(`wpctl set-default "${shEscape(match.id)}" 2>/dev/null`);
            if (!wpctlById.error) return { success: true, backend: 'wpctl' };
        }
    }

    const pactl = await execAsync(`pactl set-default-source "${shEscape(source)}" 2>/dev/null`);
    if (!pactl.error) return { success: true, backend: 'pactl' };

    return { success: false, error: (pactl.stderr || wpctlDirect.stderr || (pactl.error ? pactl.error.message : '') || (wpctlDirect.error ? wpctlDirect.error.message : '') || '').trim() || 'Failed to set default source' };
});

ipcMain.handle('audio:setVolume', async (event, level) => {
    if (process.platform !== 'linux') return { success: false, unsupported: true, error: 'Not supported on this platform' };

    const raw = typeof level === 'number' ? level : parseInt(String(level), 10);
    if (!Number.isFinite(raw)) return { success: false, error: 'Invalid volume level' };
    const safeLevel = Math.max(0, Math.min(100, Math.round(raw)));

    // Ubuntu 24.04 / PipeWire: prefer wpctl; fall back to pactl and amixer.
    // wpctl prefers @DEFAULT_AUDIO_SINK@; keep @DEFAULT_SINK@ for compatibility.
    for (const target of ['@DEFAULT_AUDIO_SINK@', '@DEFAULT_SINK@']) {
        const wpctlResult = await execAsync(`wpctl set-volume ${target} ${safeLevel}% 2>/dev/null`);
        if (!wpctlResult.error) return { success: true, backend: 'wpctl' };
    }

    const pactlResult = await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${safeLevel}% 2>/dev/null`);
    if (!pactlResult.error) return { success: true, backend: 'pactl' };

    const amixerResult = await execAsync(`amixer -q set Master ${safeLevel}% 2>/dev/null`);
    return amixerResult.error ? { success: false, error: amixerResult.error.message } : { success: true, backend: 'amixer' };
});

// ============================================
// NETWORK (NetworkManager via nmcli)
// ============================================
ipcMain.handle('network:getStatus', async () => {
    if (process.platform !== 'linux') {
        return { success: false, unsupported: true, error: 'Not supported on this platform', status: { connected: false } };
    }

    const devStatus = await execAsync('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION dev status 2>/dev/null');
    if (devStatus.error) return { success: false, error: devStatus.error.message };

    const rows = devStatus.stdout.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = rows.map(r => {
        const [device, type, state, connection] = r.split(':');
        return { device, type, state, connection };
    });

    const active = parsed.find(p => p.state === 'connected') || parsed.find(p => p.state === 'connected (externally)');
    if (!active) return { success: true, status: { connected: false, devices: parsed } };

    let ip4 = null;
    const ipRes = await execAsync(`nmcli -t -f IP4.ADDRESS dev show "${shEscape(active.device)}" 2>/dev/null`);
    if (!ipRes.error) {
        const match = ipRes.stdout.match(/^IP4\\.ADDRESS\\[[0-9]+\\]:(.+)$/m);
        if (match) ip4 = match[1].trim();
    }

    let wifi = null;
    if (active.type === 'wifi') {
        const wifiRes = await execAsync('nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan no 2>/dev/null');
        if (!wifiRes.error) {
            const inUse = wifiRes.stdout.split('\n').map(l => l.trim()).find(l => l.startsWith('*:'));
            if (inUse) {
                const parts = inUse.split(':');
                wifi = {
                    ssid: (parts[1] || '').replace(/\\\\:/g, ':'),
                    signal: parseInt(parts[2] || '0', 10) || 0,
                    security: parts[3] || ''
                };
            }
        }
    }

    return {
        success: true,
        status: {
            connected: true,
            device: active.device,
            type: active.type,
            connection: active.connection,
            ip4,
            wifi,
            devices: parsed
        }
    };
});

ipcMain.handle('network:listWifi', async () => {
    if (process.platform !== 'linux') return { success: true, networks: [] };

    // Use --rescan no to avoid 10-20s blocking scan (especially slow in VMs without WiFi hardware)
    const res = await execAsync('nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan no 2>/dev/null', { timeout: 5000 });
    if (res.error) return { success: false, error: res.error.message };

    const networks = res.stdout
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(line => {
            const parts = line.split(':');
            return {
                inUse: parts[0] === '*',
                ssid: (parts[1] || '').replace(/\\\\:/g, ':'),
                signal: parseInt(parts[2] || '0', 10) || 0,
                security: parts[3] || ''
            };
        })
        .filter(n => n.ssid);

    return { success: true, networks };
});

ipcMain.handle('network:connectWifi', async (event, ssid, password) => {
    if (process.platform !== 'linux') return { success: true };

    const pw = password ? ` password "${shEscape(password)}"` : '';
    const cmd = `nmcli dev wifi connect "${shEscape(ssid)}"${pw} 2>/dev/null`;
    const res = await execAsync(cmd);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true, output: res.stdout };
});

ipcMain.handle('network:disconnect', async () => {
    if (process.platform !== 'linux') return { success: true };

    const status = await execAsync('nmcli -t -f DEVICE,STATE dev status 2>/dev/null');
    if (status.error) return { success: false, error: status.error.message };

    const connected = status.stdout
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => l.split(':'))
        .find(parts => parts[1] === 'connected');

    if (!connected) return { success: true };

    const dev = connected[0];
    const res = await execAsync(`nmcli dev disconnect "${shEscape(dev)}" 2>/dev/null`);
    return res.error ? { success: false, error: res.stderr || res.error.message } : { success: true };
});

ipcMain.handle('network:disconnectNonVpn', async () => {
    if (process.platform !== 'linux') return { success: false, disconnected: [], error: 'Not supported on this platform' };

    const status = await execAsync('nmcli -t -f DEVICE,TYPE,STATE,CONNECTION dev status 2>/dev/null');
    if (status.error) return { success: false, disconnected: [], error: status.error.message };

    const rows = (status.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
    const unesc = (v) => String(v || '').replace(/\\:/g, ':');
    const parsed = rows.map(line => {
        const parts = line.split(':');
        const device = unesc(parts[0] || '');
        const type = unesc(parts[1] || '');
        const state = unesc(parts[2] || '');
        const connection = unesc(parts.slice(3).join(':') || '');
        return { device, type, state, connection };
    });

    const isConnected = (s) => {
        const t = String(s || '').toLowerCase();
        return t === 'connected' || t.startsWith('connected');
    };

    const isVpn = (r) => {
        const t = String(r.type || '').toLowerCase();
        const d = String(r.device || '').toLowerCase();
        return t === 'tun' || t === 'vpn' || t.includes('wireguard') || d.startsWith('tun') || d.startsWith('wg');
    };

    const targets = parsed.filter(r => isConnected(r.state) && !isVpn(r));
    if (!targets.length) return { success: true, disconnected: [] };

    const disconnected = [];
    const errors = [];
    for (const t of targets) {
        const res = await execAsync(`nmcli dev disconnect "${shEscape(t.device)}" 2>/dev/null`);
        if (res.error) {
            errors.push(res.stderr || res.error.message);
            continue;
        }
        const label = t.connection && t.connection !== '--' ? t.connection : t.device;
        disconnected.push(label);
    }

    const errMsg = errors.filter(Boolean).join('; ');
    if (errMsg && disconnected.length === 0) return { success: false, disconnected, error: errMsg || 'Disconnect failed' };
    return { success: true, disconnected, error: errMsg || undefined };
});

ipcMain.handle('network:createHotspot', async (event, ssid, password) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };

    // 1. Find wifi device
    const status = await execAsync('nmcli -t -f DEVICE,TYPE,STATE dev status 2>/dev/null');
    if (status.error) return { success: false, error: 'Failed to get network devices' };

    const lines = status.stdout.split('\n');
    let wifiDev = null;
    for (const line of lines) {
        const parts = line.split(':');
        if (parts[1] === 'wifi') {
            wifiDev = parts[0];
            break;
        }
    }

    if (!wifiDev) return { success: false, error: 'No Wi-Fi device found' };

    // 2. Start hotspot
    // Syntax: nmcli device wifi hotspot [ifname] [con-name] [ssid] [password]
    const conName = 'TempleOS_Hotspot';
    const pwArg = password ? `"${shEscape(password)}"` : '';
    const ssidArg = ssid ? `"${shEscape(ssid)}"` : `"${conName}"`;

    const cmd = `nmcli device wifi hotspot "${shEscape(wifiDev)}" "${conName}" ${ssidArg} ${pwArg}`;

    const res = await execAsync(cmd);
    if (res.error) return { success: false, error: res.stderr || res.error.message };

    return { success: true, output: res.stdout };
});

ipcMain.handle('network:stopHotspot', async () => {
    if (process.platform !== 'linux') return { success: true };
    const conName = 'TempleOS_Hotspot';
    const res = await execAsync(`nmcli connection down "${conName}" 2>/dev/null`);
    return { success: true };
});

ipcMain.handle('network:getWifiEnabled', async () => {
    if (process.platform !== 'linux') return { success: false, unsupported: true, error: 'Not supported on this platform' };
    const res = await execAsync('nmcli -t -f WIFI radio 2>/dev/null');
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    const raw = (res.stdout || '').trim().toLowerCase();
    const enabled = raw.includes('enabled') || raw === 'enabled' || raw === 'on';
    return { success: true, enabled };
});

ipcMain.handle('network:setWifiEnabled', async (event, enabled) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const on = !!enabled;
    const res = await execAsync(`nmcli radio wifi ${on ? 'on' : 'off'} 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

ipcMain.handle('network:listSaved', async () => {
    if (process.platform !== 'linux') return { success: true, networks: [] };
    const res = await execAsync('nmcli -t -f NAME,UUID,TYPE,DEVICE connection show 2>/dev/null');
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    const networks = [];
    for (const line of (res.stdout || '').split('\n')) {
        if (!line.trim()) continue;
        const [name, uuid, type, device] = line.split(':');
        if (!name || !uuid) continue;
        networks.push({ name, uuid, type: type || '', device: device || '' });
    }
    return { success: true, networks };
});

ipcMain.handle('network:connectSaved', async (event, nameOrUuid) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const key = String(nameOrUuid || '').trim();
    if (!key) return { success: false, error: 'Invalid network' };
    const res = await execAsync(`nmcli connection up "${shEscape(key)}" 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true, output: res.stdout };
});

ipcMain.handle('network:disconnectConnection', async (event, nameOrUuid) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const key = String(nameOrUuid || '').trim();
    if (!key) return { success: false, error: 'Invalid connection' };
    const res = await execAsync(`nmcli connection down "${shEscape(key)}" 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true, output: res.stdout };
});

ipcMain.handle('network:forgetSaved', async (event, nameOrUuid) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const key = String(nameOrUuid || '').trim();
    if (!key) return { success: false, error: 'Invalid network' };
    const res = await execAsync(`nmcli connection delete "${shEscape(key)}" 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

ipcMain.handle('network:importVpnProfile', async (event, kind, filePath) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };

    const k = String(kind || '').toLowerCase();
    const pathValue = String(filePath || '').trim();
    if (!pathValue) return { success: false, error: 'Invalid file path' };

    const type = k === 'wireguard' ? 'wireguard' : (k === 'openvpn' ? 'openvpn' : null);
    if (!type) return { success: false, error: 'Invalid VPN type' };

    const cmd = `nmcli connection import type ${type} file "${shEscape(pathValue)}" 2>/dev/null`;
    const res = await execAsync(cmd, { timeout: 10000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true, output: res.stdout };
});

// ============================================
// BLUETOOTH (BlueZ via bluetoothctl)
// ============================================
function normalizeBluetoothMac(value) {
    const raw = String(value || '').trim();
    if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(raw)) return null;
    return raw.toUpperCase();
}

function parseBluetoothctlDeviceList(text) {
    const devices = [];
    for (const line of String(text || '').split('\n')) {
        const m = line.trim().match(/^Device\s+([0-9A-Fa-f:]{17})\s+(.+?)\s*$/);
        if (!m) continue;
        devices.push({ mac: m[1].toUpperCase(), name: m[2].trim() });
    }
    // De-dupe by MAC, keep first name
    const seen = new Set();
    return devices.filter(d => {
        if (!d.mac || seen.has(d.mac)) return false;
        seen.add(d.mac);
        return true;
    });
}

async function bluetoothctlInfo(mac) {
    const addr = normalizeBluetoothMac(mac);
    if (!addr) return { connected: null, paired: null, error: 'Invalid MAC address' };
    const info = await execAsync(`bluetoothctl info "${shEscape(addr)}" 2>/dev/null`, { timeout: 3000 });
    if (info.error) return { connected: null, paired: null, error: info.stderr || info.error.message || 'Failed to query device info' };
    const connectedMatch = info.stdout.match(/\bConnected:\s*(yes|no)\b/i);
    const pairedMatch = info.stdout.match(/\bPaired:\s*(yes|no)\b/i);
    return {
        connected: connectedMatch ? connectedMatch[1].toLowerCase() === 'yes' : null,
        paired: pairedMatch ? pairedMatch[1].toLowerCase() === 'yes' : null,
        error: null
    };
}

async function enrichBluetoothDevices(devices, max = 20) {
    const out = [];
    const limited = Array.isArray(devices) ? devices.slice(0, max) : [];
    for (const d of limited) {
        const info = await bluetoothctlInfo(d.mac);
        out.push({
            mac: d.mac,
            name: d.name,
            connected: info.connected === true,
            paired: info.paired === true
        });
    }
    // Add remaining (without expensive info queries)
    for (const d of (Array.isArray(devices) ? devices.slice(out.length) : [])) {
        out.push({ mac: d.mac, name: d.name, connected: false, paired: false });
    }
    return out;
}

ipcMain.handle('bluetooth:setEnabled', async (event, enabled) => {
    if (process.platform !== 'linux') return { success: false, unsupported: true, error: 'Not supported on this platform' };
    const on = !!enabled;
    const errors = [];

    // Try bluetoothctl without elevation first (works in most cases)
    const btctl = await execAsync(`bluetoothctl power ${on ? 'on' : 'off'}`, { timeout: 8000 });
    if (!btctl.error) return { success: true, backend: 'bluetoothctl' };
    errors.push(btctl.stderr || btctl.error.message || 'bluetoothctl failed');

    // Try rfkill with privilege escalation (pkexec will prompt for password)
    const rfkillPriv = await runPrivilegedSh(`rfkill ${on ? 'unblock' : 'block'} bluetooth`, { timeout: 15000 });
    if (!rfkillPriv.error) return { success: true, backend: 'rfkill', privileged: true };
    errors.push(rfkillPriv.stderr || rfkillPriv.error.message || 'rfkill (privileged) failed');

    // Try rfkill without privileges as last resort
    const rfkill = await execAsync(`rfkill ${on ? 'unblock' : 'block'} bluetooth`, { timeout: 8000 });
    if (!rfkill.error) return { success: true, backend: 'rfkill' };
    errors.push(rfkill.stderr || rfkill.error.message || 'rfkill failed');

    return { success: false, error: errors.filter(Boolean).join('; ') || 'Failed to toggle Bluetooth', needsPassword: true };
});

// Bluetooth with password - allows user to provide admin password for privilege escalation
ipcMain.handle('bluetooth:setEnabledWithPassword', async (event, enabled, password) => {
    if (process.platform !== 'linux') return { success: false, unsupported: true, error: 'Not supported on this platform' };
    const on = !!enabled;
    const pwd = String(password || '');

    if (!pwd) return { success: false, error: 'Password is required' };

    // Use echo with sudo -S to provide password via stdin
    // rfkill is the most reliable way to control Bluetooth hardware state
    const cmd = on ? 'rfkill unblock bluetooth' : 'rfkill block bluetooth';

    // Escape the password for shell (handle special chars)
    const escapedPwd = pwd.replace(/'/g, "'\"'\"'");
    const fullCmd = `echo '${escapedPwd}' | sudo -S ${cmd} 2>&1`;

    const res = await execAsync(fullCmd, { timeout: 15000 });

    if (res.error) {
        const errText = (res.stderr || res.stdout || res.error.message || '').toLowerCase();
        if (errText.includes('incorrect password') || errText.includes('sorry') || errText.includes('try again')) {
            return { success: false, error: 'Incorrect password', wrongPassword: true };
        }
        return { success: false, error: res.stderr || res.error.message || 'Failed to toggle Bluetooth' };
    }

    // Also try bluetoothctl to fully power on/off the adapter
    await execAsync(`bluetoothctl power ${on ? 'on' : 'off'} 2>/dev/null`, { timeout: 5000 });

    return { success: true, backend: 'sudo+rfkill' };
});

ipcMain.handle('bluetooth:listPaired', async () => {
    if (process.platform !== 'linux') return { success: true, devices: [] };
    const res = await execAsync('bluetoothctl paired-devices 2>/dev/null', { timeout: 8000 });
    if (res.error) return { success: false, devices: [], error: res.stderr || res.error.message || 'Failed to list paired devices' };
    const devices = parseBluetoothctlDeviceList(res.stdout).slice(0, 50);
    const enriched = await enrichBluetoothDevices(devices, 25);
    return { success: true, devices: enriched };
});

ipcMain.handle('bluetooth:scan', async () => {
    if (process.platform !== 'linux') return { success: true, devices: [] };

    // Start scan (best-effort) then list discovered devices.
    await execAsync('bluetoothctl scan on 2>/dev/null', { timeout: 2000 });
    await new Promise(r => setTimeout(r, 4500));

    const list = await execAsync('bluetoothctl devices 2>/dev/null', { timeout: 8000 });
    await execAsync('bluetoothctl scan off 2>/dev/null', { timeout: 2000 });

    if (list.error) return { success: false, devices: [], error: list.stderr || list.error.message || 'Failed to scan devices' };
    const devices = parseBluetoothctlDeviceList(list.stdout).slice(0, 50);
    const enriched = await enrichBluetoothDevices(devices, 25);
    return { success: true, devices: enriched };
});

ipcMain.handle('bluetooth:connect', async (event, mac) => {
    if (process.platform !== 'linux') return { success: false, unsupported: true, error: 'Not supported on this platform' };
    const addr = normalizeBluetoothMac(mac);
    if (!addr) return { success: false, error: 'Invalid MAC address' };

    const res = await execAsync(`bluetoothctl connect "${shEscape(addr)}" 2>/dev/null`, { timeout: 15000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'Connect failed' };

    const info = await bluetoothctlInfo(addr);
    return { success: info.connected === true, connected: info.connected === true, error: info.error || undefined };
});

ipcMain.handle('bluetooth:disconnect', async (event, mac) => {
    if (process.platform !== 'linux') return { success: false, unsupported: true, error: 'Not supported on this platform' };
    const addr = normalizeBluetoothMac(mac);
    if (!addr) return { success: false, error: 'Invalid MAC address' };

    const res = await execAsync(`bluetoothctl disconnect "${shEscape(addr)}" 2>/dev/null`, { timeout: 15000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'Disconnect failed' };

    const info = await bluetoothctlInfo(addr);
    return { success: info.connected === false, connected: info.connected === true, error: info.error || undefined };
});

// ============================================
// SSH SERVER (OpenSSH) (best-effort)
// ============================================
function shQuote(value) {
    // Single-quote for /bin/sh: foo'bar -> 'foo'"'"'bar'
    return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

let cachedPrivMethod = undefined; // 'pkexec' | 'sudo' | null
async function hasCommand(bin) {
    const safe = String(bin || '').trim().replace(/[^a-zA-Z0-9._+-]/g, '');
    if (!safe) return false;
    const res = await execAsync(`command -v ${safe} 2>/dev/null`, { timeout: 1500 });
    return !!String(res.stdout || '').trim();
}

async function getPrivMethod() {
    if (cachedPrivMethod !== undefined) return cachedPrivMethod;
    if (await hasCommand('pkexec')) { cachedPrivMethod = 'pkexec'; return cachedPrivMethod; }
    if (await hasCommand('sudo')) { cachedPrivMethod = 'sudo'; return cachedPrivMethod; }
    cachedPrivMethod = null;
    return cachedPrivMethod;
}

async function runPrivilegedSh(command, options = {}) {
    const method = await getPrivMethod();
    const timeout = typeof options.timeout === 'number' ? options.timeout : 120000;
    if (!method) return { error: new Error('No privilege escalation tool (pkexec/sudo) available'), stdout: '', stderr: '' };
    const prefix = method === 'pkexec' ? 'pkexec' : 'sudo -n';
    return await execAsync(`${prefix} sh -lc ${shQuote(command)}`, { timeout });
}

async function getSshServiceName() {
    if (!(await hasCommand('systemctl'))) return null;
    const candidates = ['ssh', 'sshd', 'ssh.service', 'sshd.service'];
    for (const name of candidates) {
        const res = await execAsync(`systemctl show -p LoadState --value ${name} 2>/dev/null`, { timeout: 1500 });
        const state = String(res.stdout || '').trim();
        if (state === 'loaded') return name;
    }
    return null;
}

async function getSshServiceStatus(serviceName) {
    if (!serviceName) return 'unknown';
    const res = await execAsync(`systemctl is-active ${serviceName} 2>/dev/null`, { timeout: 1500 });
    const out = String(res.stdout || '').trim().toLowerCase();
    if (out === 'active') return 'running';
    if (out === 'inactive' || out === 'failed' || out === 'deactivating') return 'stopped';
    return 'unknown';
}

async function ensureSshPort(port) {
    const p = Number.isFinite(port) ? Math.floor(port) : parseInt(String(port || ''), 10);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return { success: false, error: 'Invalid SSH port' };

    const sshdConfigPath = '/etc/ssh/sshd_config';
    let sshdConfig = '';
    try {
        sshdConfig = await fs.promises.readFile(sshdConfigPath, 'utf-8');
    } catch {
        sshdConfig = '';
    }

    const hasInclude = /^\s*Include\s+\/etc\/ssh\/sshd_config\.d\/\*\.conf\s*$/mi.test(sshdConfig);
    const hasActivePort = /^\s*Port\s+\d+\s*$/mi.test(sshdConfig);

    const userData = app.getPath('userData');
    if (hasInclude && !hasActivePort) {
        const dropDir = '/etc/ssh/sshd_config.d';
        const dropPath = `${dropDir}/templeos.conf`;
        const tmp = path.join(userData, 'templeos-sshd-port.conf');
        const content = `# Managed by TempleOS Remake\nPort ${p}\n`;
        await fs.promises.writeFile(tmp, content, 'utf-8');

        const cmd = `mkdir -p ${shQuote(dropDir)} && cp ${shQuote(tmp)} ${shQuote(dropPath)} && chmod 0644 ${shQuote(dropPath)}`;
        const res = await runPrivilegedSh(cmd, { timeout: 120000 });
        if (res.error) return { success: false, error: res.stderr || res.error.message || 'Failed to write sshd drop-in config' };
        return { success: true };
    }

    if (!sshdConfig) return { success: false, error: 'sshd_config not readable' };

    const markerStart = '# --- TempleOS Remake ---';
    const markerEnd = '# --- /TempleOS Remake ---';

    const lines = sshdConfig.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let skipping = false;
    for (const line of lines) {
        const trim = line.trim();
        if (trim === markerStart) { skipping = true; continue; }
        if (trim === markerEnd) { skipping = false; continue; }
        if (skipping) continue;
        // Remove active Port directives (so we don't end up listening on multiple ports)
        if (/^\s*Port\s+\d+\s*$/i.test(line)) continue;
        out.push(line);
    }

    out.push('');
    out.push(markerStart);
    out.push(`Port ${p}`);
    out.push(markerEnd);
    out.push('');

    const tmp = path.join(userData, 'templeos-sshd_config.tmp');
    await fs.promises.writeFile(tmp, out.join('\n'), 'utf-8');

    const bak = `${sshdConfigPath}.templeos.bak`;
    const cmd = `cp ${shQuote(sshdConfigPath)} ${shQuote(bak)} 2>/dev/null || true; cp ${shQuote(tmp)} ${shQuote(sshdConfigPath)} && chmod 0644 ${shQuote(sshdConfigPath)}`;
    const res = await runPrivilegedSh(cmd, { timeout: 120000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'Failed to update sshd_config' };
    return { success: true };
}

async function readFirstExistingTextFile(paths) {
    for (const p of paths) {
        try {
            const txt = await fs.promises.readFile(p, 'utf-8');
            const cleaned = String(txt || '').trim();
            if (cleaned) return { path: p, text: cleaned };
        } catch {
            // ignore
        }
    }
    return null;
}

ipcMain.handle('ssh:control', async (event, action, port) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };

    const act = String(action || '').toLowerCase();
    const p = port === undefined || port === null ? null : parseInt(String(port), 10);

    if (!(await hasCommand('systemctl'))) return { success: false, error: 'systemctl not available' };
    const service = await getSshServiceName();
    if (!service) return { success: false, error: 'SSH service not found (ssh/sshd)' };

    if (act === 'status') {
        const status = await getSshServiceStatus(service);
        return { success: true, status };
    }

    if (act === 'start') {
        if (p !== null) {
            const portRes = await ensureSshPort(p);
            if (!portRes.success) return { success: false, error: portRes.error || 'Failed to set SSH port' };
        }

        const res = await runPrivilegedSh(`systemctl start ${service}`, { timeout: 120000 });
        if (res.error) return { success: false, error: res.stderr || res.error.message || 'Failed to start SSH service' };
        const status = await getSshServiceStatus(service);
        return { success: true, status };
    }

    if (act === 'stop') {
        const res = await runPrivilegedSh(`systemctl stop ${service}`, { timeout: 120000 });
        if (res.error) return { success: false, error: res.stderr || res.error.message || 'Failed to stop SSH service' };
        const status = await getSshServiceStatus(service);
        return { success: true, status };
    }

    if (act === 'regenerate-keys') {
        if (!(await hasCommand('ssh-keygen'))) return { success: false, error: 'ssh-keygen not available' };

        const wasRunning = (await getSshServiceStatus(service)) === 'running';
        await runPrivilegedSh(`systemctl stop ${service} 2>/dev/null || true`, { timeout: 120000 });

        const regen = await runPrivilegedSh('rm -f /etc/ssh/ssh_host_* && ssh-keygen -A', { timeout: 120000 });
        if (regen.error) return { success: false, error: regen.stderr || regen.error.message || 'Failed to regenerate host keys' };

        if (wasRunning) {
            await runPrivilegedSh(`systemctl start ${service} 2>/dev/null || true`, { timeout: 120000 });
        }

        return { success: true };
    }

    if (act === 'get-pubkey') {
        const home = os.homedir();
        const userPaths = [
            path.join(home, '.ssh', 'id_ed25519.pub'),
            path.join(home, '.ssh', 'id_rsa.pub'),
            path.join(home, '.ssh', 'id_ecdsa.pub')
        ];
        const hostPaths = [
            '/etc/ssh/ssh_host_ed25519_key.pub',
            '/etc/ssh/ssh_host_rsa_key.pub',
            '/etc/ssh/ssh_host_ecdsa_key.pub'
        ];

        let userKey = await readFirstExistingTextFile(userPaths);
        if (!userKey && await hasCommand('ssh-keygen')) {
            try {
                const sshDir = path.join(home, '.ssh');
                await fs.promises.mkdir(sshDir, { recursive: true });
                const keyBase = path.join(sshDir, 'id_ed25519');
                const gen = await execAsync(`ssh-keygen -t ed25519 -N "" -f "${shEscape(keyBase)}" -q 2>/dev/null`, { timeout: 15000 });
                if (!gen.error) {
                    userKey = await readFirstExistingTextFile([keyBase + '.pub']);
                }
            } catch {
                // ignore
            }
        }

        const hostKey = await readFirstExistingTextFile(hostPaths);
        if (!userKey && !hostKey) return { success: false, error: 'No SSH public keys found' };

        const parts = [];
        if (userKey) parts.push(`# User public key (${userKey.path})\n${userKey.text}`);
        if (hostKey) parts.push(`# Host public key (${hostKey.path})\n${hostKey.text}`);
        return { success: true, pubkey: parts.join('\n\n').trim() };
    }

    return { success: false, error: 'Invalid action' };
});


// ============================================
// TRACKER BLOCKING (Best Effort via /etc/hosts)
// ============================================
ipcMain.handle('security:trackerBlocking', async (event, enabled) => {
    if (process.platform !== 'linux') {
        return { success: false, unsupported: true, error: 'Not supported on this platform' };
    }

    const startMarker = '# --- TempleOS Remake Tracker Blocklist ---';
    const endMarker = '# --- /TempleOS Remake Tracker Blocklist ---';
    const hostsPath = '/etc/hosts';

    if (!enabled) {
        // Remove blocklist
        const cmd = `sed -i '/${startMarker}/,/${endMarker}/d' ${hostsPath}`;
        const res = await runPrivilegedSh(cmd);
        if (res.error) return { success: false, error: res.stderr || res.error.message || 'Failed to remove blocklist' };
        return { success: true };
    }

    // Enable blocklist
    const trackers = [
        'google-analytics.com', 'www.google-analytics.com',
        'doubleclick.net', 'ad.doubleclick.net',
        'facebook.com', 'www.facebook.com', 'graph.facebook.com', 'connect.facebook.net',
        'analytics.twitter.com', 'ads.twitter.com', 'ads-api.twitter.com',
        'telemetry.microsoft.com', 'vortex.data.microsoft.com',
        'adservice.google.com'
    ];

    const lines = [startMarker, ...trackers.map(t => `0.0.0.0 ${t}`), endMarker];
    const content = lines.join('\\n'); // Escaped for printf

    // 1. Remove existing
    // 2. Append new
    const cleanCmd = `sed -i '/${startMarker}/,/${endMarker}/d' ${hostsPath}`;
    const appendCmd = `printf "${content}\\n" | tee -a ${hostsPath} >/dev/null`;
    const fullCmd = `${cleanCmd} && ${appendCmd}`;

    const res = await runPrivilegedSh(fullCmd); // handles sudo/pkexec

    if (res.error) {
        console.error('Tracker block failed:', res.stderr);
        return { success: false, error: res.stderr || res.error.message || 'Failed to apply blocklist' };
    }
    return { success: true };
});

// ============================================
// TOR STATUS (Best-effort: service/process presence)
// ============================================
async function getTorServiceName() {
    if (!(await hasCommand('systemctl'))) return null;
    const candidates = ['tor', 'tor@default', 'tor.service', 'tor@default.service'];
    for (const name of candidates) {
        const res = await execAsync(`systemctl show -p LoadState --value ${name} 2>/dev/null`, { timeout: 1500 });
        const state = String(res.stdout || '').trim();
        if (state === 'loaded') return name;
    }
    return null;
}

ipcMain.handle('security:getTorStatus', async () => {
    if (process.platform !== 'linux') {
        return { success: true, supported: false, running: false };
    }

    let running = false;
    let backend = '';

    // Prefer systemd service state when available
    const services = ['tor', 'tor@default'];
    for (const svc of services) {
        const res = await execAsync(`systemctl is-active ${svc} 2>/dev/null`, { timeout: 2000 });
        if (!res.error) {
            backend = `systemctl:${svc}`;
            running = (res.stdout || '').trim() === 'active';
            break;
        }
    }

    // Fallback to process check if systemctl isn't available or didn't respond
    if (!backend) {
        const res = await execAsync('pgrep -x tor 2>/dev/null', { timeout: 2000 });
        backend = 'pgrep';
        running = !res.error && !!String(res.stdout || '').trim();
    }

    // Optional: read version (best-effort)
    let version = null;
    const ver = await execAsync('tor --version 2>/dev/null | head -n 1', { timeout: 2000 });
    if (!ver.error) {
        const line = String(ver.stdout || '').trim();
        if (line) version = line;
    }

    return { success: true, supported: true, running, backend, version };
});

ipcMain.handle('security:setTorEnabled', async (event, enabled) => {
    if (process.platform !== 'linux') {
        return { success: false, unsupported: true, error: 'Not supported on this platform' };
    }

    const on = !!enabled;
    const service = await getTorServiceName();
    if (!service) return { success: false, error: 'Tor service not found (install tor)' };

    const cmd = `systemctl ${on ? 'start' : 'stop'} ${service}`;
    const res = await runPrivilegedSh(cmd, { timeout: 120000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message || `Failed to ${on ? 'start' : 'stop'} Tor` };

    const status = await execAsync(`systemctl is-active ${service} 2>/dev/null`, { timeout: 2000 });
    const running = !status.error && (String(status.stdout || '').trim() === 'active');
    return { success: true, running, backend: `systemctl:${service}` };
});

// ============================================
// FIREWALL MANAGEMENT (UFW wrapper)
// ============================================
ipcMain.handle('security:getFirewallRules', async () => {
    if (process.platform !== 'linux') {
        return { success: true, active: false, rules: [] };
    }

    // Check status
    const statusRes = await runPrivilegedSh('ufw status numbered');
    if (statusRes.error) {
        // Fallback: Check if ufw is installed
        if ((statusRes.stderr || '').includes('command not found')) {
            return { success: false, error: 'UFW not installed' };
        }
        // If inactive, it might just say "Status: inactive"
        if ((statusRes.stdout || '').includes('Status: inactive')) {
            return { success: true, active: false, rules: [] };
        }
        return { success: false, error: statusRes.stderr || 'Failed to get status' };
    }

    // Parse rules
    // Output format often:
    // Status: active
    //
    //      To                         Action      From
    //      --                         ------      ----
    // [ 1] 22/tcp                     ALLOW IN    Anywhere

    const lines = (statusRes.stdout || '').split('\n');
    const rules = [];
    const active = lines.some(l => l.toLowerCase().includes('status: active'));

    // Scan for rule lines (starting with [ digit ])
    for (const line of lines) {
        // Regex to parse detailed ufw status numbered output
        // [ 1] 22/tcp                     ALLOW IN    Anywhere
        const match = line.match(/^\[\s*(\d+)\] (.+?)\s+(ALLOW|DENY|REJECT)(?: IN)?\s+(.+)$/i);
        if (match) {
            rules.push({
                id: parseInt(match[1], 10),
                to: match[2].trim(),
                action: match[3].toUpperCase(),
                from: match[4].trim()
            });
        }
    }

    return { success: true, active, rules };
});

ipcMain.handle('security:addFirewallRule', async (event, port, protocol, action) => {
    if (process.platform !== 'linux') return { success: true };

    // Validate inputs
    const p = parseInt(port, 10);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return { success: false, error: 'Invalid port' };

    const proto = (protocol || 'tcp').toLowerCase();
    if (!['tcp', 'udp'].includes(proto)) return { success: false, error: 'Invalid protocol' };

    const act = (action || 'allow').toLowerCase();
    if (!['allow', 'deny', 'reject'].includes(act)) return { success: false, error: 'Invalid action' };

    // e.g. "ufw allow 8080/tcp"
    const cmd = `ufw ${act} ${p}/${proto}`;
    const res = await runPrivilegedSh(cmd);

    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

ipcMain.handle('security:deleteFirewallRule', async (event, ruleId) => {
    if (process.platform !== 'linux') return { success: true };

    const id = parseInt(ruleId, 10);
    if (!Number.isFinite(id)) return { success: false, error: 'Invalid rule ID' };

    // "ufw delete <number>" is interactive, need "--force" to suppress confirmation
    const cmd = `ufw --force delete ${id}`;
    const res = await runPrivilegedSh(cmd);

    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

ipcMain.handle('security:toggleFirewall', async (event, enable) => {
    if (process.platform !== 'linux') return { success: true };
    const cmd = enable ? 'ufw enable' : 'ufw disable';
    const res = await runPrivilegedSh(cmd);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

// ============================================
// VERACRYPT INTEGRATION (Tier 7.1)
// ============================================
ipcMain.handle('security:getVeraCryptStatus', async () => {
    if (process.platform !== 'linux') {
        return { success: true, volumes: [] };
    }

    // List mounted volumes: `veracrypt -t -l`
    try {
        const res = await execAsync('veracrypt -t -l');
        if (res.error) {
            if ((res.stderr || '').includes('No volumes mounted') || (res.stdout || '').includes('No volumes mounted') || res.code === 1) {
                return { success: true, volumes: [] };
            }
            if ((res.stderr || '').includes('not found')) {
                return { success: false, error: 'VeraCrypt not installed' };
            }
            return { success: true, volumes: [] };
        }

        const volumes = [];
        const lines = res.stdout.split('\n');
        for (const line of lines) {
            const match = line.match(/^(\d+):\s+(.+?)\s+(.+?)\s+(.+)$/);
            if (match) {
                volumes.push({
                    slot: parseInt(match[1]),
                    source: match[2],
                    mountPoint: match[3],
                    mapper: match[4]
                });
            }
        }
        return { success: true, volumes };
    } catch (e) {
        return { success: false, error: String(e) };
    }
});

ipcMain.handle('security:mountVeraCrypt', async (event, path, password, slot) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };

    // veracrypt -t --non-interactive --password="pass" --pim="0" --keyfiles="" --protect-hidden="no" /path/to/container /mnt/dest
    const slotNum = slot || 1;
    const mountPoint = `/mnt/veracrypt${slotNum}`;

    // Ensure mount point exists
    await execAsync(`mkdir -p ${mountPoint}`);

    const cmd = `veracrypt -t --non-interactive --password="${shEscape(password)}" --pim="0" --keyfiles="" --protect-hidden="no" --slot=${slotNum} "${shEscape(path)}" "${mountPoint}"`;

    const res = await runPrivilegedSh(cmd);

    if (res.error) {
        return { success: false, error: res.stderr || res.stdout || 'Failed to mount volume' };
    }
    return { success: true, mountPoint };
});

ipcMain.handle('security:dismountVeraCrypt', async (event, slot) => {
    if (process.platform !== 'linux') return { success: true };

    const cmd = `veracrypt -t -d ${slot ? '--slot=' + slot : ''}`;
    const res = await runPrivilegedSh(cmd);

    if (res.error) {
        return { success: false, error: res.stderr || 'Failed to dismount' };
    }
    return { success: true };
});



// ============================================
// MOUSE / POINTER SETTINGS (best-effort)
// ============================================
ipcMain.handle('mouse:apply', async (event, settings) => {
    if (process.platform !== 'linux') return { success: true };

    const speed = typeof settings?.speed === 'number' ? Math.max(-1, Math.min(1, settings.speed)) : 0;
    const raw = !!settings?.raw;
    const naturalScroll = !!settings?.naturalScroll;

    const errors = [];

    // GNOME / similar (Wayland-friendly)
    const g1 = await execAsync(`gsettings set org.gnome.desktop.peripherals.mouse speed ${speed} 2>/dev/null`);
    if (g1.error) errors.push(g1.error.message);
    const accelProfile = raw ? 'flat' : 'adaptive';
    const g2 = await execAsync(`gsettings set org.gnome.desktop.peripherals.mouse accel-profile '${accelProfile}' 2>/dev/null`);
    if (g2.error) errors.push(g2.error.message);
    const g3 = await execAsync(`gsettings set org.gnome.desktop.peripherals.mouse natural-scroll ${naturalScroll ? 'true' : 'false'} 2>/dev/null`);
    if (g3.error) errors.push(g3.error.message);

    // X11 fallback (xinput + libinput)
    const list = await execAsync('xinput list 2>/dev/null');
    if (!list.error && list.stdout) {
        const ids = [...list.stdout.matchAll(/id=(\\d+)\\s+\\[slave\\s+pointer\\s+\\(2\\)\\]/g)].map(m => m[1]);
        for (const id of ids) {
            const p1 = await execAsync(`xinput --set-prop ${id} 'libinput Accel Speed' ${speed} 2>/dev/null`);
            if (p1.error) errors.push(p1.error.message);
            const profile = raw ? '0 1' : '1 0';
            const p2 = await execAsync(`xinput --set-prop ${id} 'libinput Accel Profile Enabled' ${profile} 2>/dev/null`);
            if (p2.error) errors.push(p2.error.message);
            const p3 = await execAsync(`xinput --set-prop ${id} 'libinput Natural Scrolling Enabled' ${naturalScroll ? 1 : 0} 2>/dev/null`);
            if (p3.error) errors.push(p3.error.message);
        }
    }

    // Sway fallback (if running)
    const sway = await execAsync('swaymsg -t get_inputs 2>/dev/null');
    if (!sway.error && sway.stdout) {
        try {
            const inputs = JSON.parse(sway.stdout);
            for (const input of inputs) {
                if (input?.type !== 'pointer') continue;
                const ident = input.identifier;
                await execAsync(`swaymsg input "${shEscape(ident)}" pointer_accel ${speed} 2>/dev/null`);
                await execAsync(`swaymsg input "${shEscape(ident)}" accel_profile ${accelProfile} 2>/dev/null`);
                await execAsync(`swaymsg input "${shEscape(ident)}" natural_scroll ${naturalScroll ? 'enabled' : 'disabled'} 2>/dev/null`);
            }
        } catch (e) {
            // ignore parse error
        }
    }

    return { success: true, warnings: [...new Set(errors)].slice(0, 10) };
});

// ============================================
// TERMINAL (basic command execution)
// ============================================
ipcMain.handle('terminal:exec', async (event, command, cwd) => {
    if (typeof command !== 'string') return { success: false, error: 'Invalid command' };

    const isLinux = process.platform === 'linux';
    const safeCwd = (typeof cwd === 'string' && cwd.trim()) ? cwd : (isLinux ? os.homedir() : process.cwd());

    // Use bash -lc on Linux to behave like a shell (aliases / expansions / etc.)
    const cmd = isLinux
        ? `bash -lc "${shEscape(command)}"`
        : command;

    const res = await execAsync(cmd, { cwd: safeCwd });
    if (res.error) {
        return { success: false, error: res.stderr || res.error.message, stdout: res.stdout, stderr: res.stderr };
    }
    return { success: true, stdout: res.stdout, stderr: res.stderr };
});

// ============================================
// DISPLAY (multi-monitor / refresh / scale)
// ============================================
ipcMain.handle('display:getOutputs', async () => {
    if (process.platform !== 'linux') {
        try {
            const displays = screen.getAllDisplays();
            const outputs = displays.map(d => {
                const { width, height } = d.size;
                // Some older Electron versions or OSs might not report frequency, default to 60
                const refresh = 60;
                const modeStr = `${width}x${height}@${refresh}`;

                return {
                    name: d.label || `Display ${d.id}`,
                    id: d.id,
                    active: true,
                    scale: d.scaleFactor,
                    bounds: d.bounds,
                    transform: 'normal',
                    currentMode: modeStr,
                    modes: [{ width, height, refreshHz: refresh }]
                };
            });

            return { success: true, outputs };
        } catch (error) {
            console.error('Failed to get displays:', error);
            return { success: false, error: error.message || String(error) };
        }
    }

    const prefix = buildSwayEnvPrefix();
    const waylandCmd = `${prefix ? prefix + ' ' : ''}swaymsg -t get_outputs 2>/dev/null`;
    const wayland = await execAsync(waylandCmd);
    if (!wayland.error && wayland.stdout) {
        try {
            const outputs = JSON.parse(wayland.stdout);
            if (Array.isArray(outputs)) {
                const mapped = outputs.map(o => {
                    const modes = Array.isArray(o.modes)
                        ? o.modes.map(m => ({
                            width: m.width,
                            height: m.height,
                            refreshHz: m.refresh ? Math.round((m.refresh / 1000) * 100) / 100 : null
                        })).filter(m => m.width && m.height)
                        : [];
                    const cm = o.current_mode
                        ? {
                            width: o.current_mode.width,
                            height: o.current_mode.height,
                            refreshHz: o.current_mode.refresh ? Math.round((o.current_mode.refresh / 1000) * 100) / 100 : null
                        }
                        : null;
                    const currentMode = cm ? `${cm.width}x${cm.height}${cm.refreshHz ? `@${cm.refreshHz}` : ''}` : '';
                    const rect = o.rect && typeof o.rect === 'object' ? o.rect : null;
                    const bounds = rect && Number.isFinite(rect.x) && Number.isFinite(rect.y) && Number.isFinite(rect.width) && Number.isFinite(rect.height)
                        ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                        : undefined;
                    return {
                        name: o.name,
                        active: !!o.active,
                        make: o.make || '',
                        model: o.model || '',
                        serial: o.serial || '',
                        scale: typeof o.scale === 'number' ? o.scale : 1,
                        bounds,
                        transform: o.transform || 'normal',
                        currentMode,
                        modes
                    };
                });
                return { success: true, backend: 'swaymsg', outputs: mapped };
            }
        } catch (e) {
            // fall through
        }
    }

    // X11 fallback
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync('xrandr --query 2>/dev/null', { env });
    if (!xr.error && xr.stdout) {
        const lines = xr.stdout.split('\n');
        const outputs = [];
        let current = null;

        for (const line of lines) {
            const header = line.match(/^(\S+)\s+(connected|disconnected)\b(.*)$/);
            if (header) {
                if (current) outputs.push(current);
                const tail = header[3] || '';
                let bounds = undefined;
                if (header[2] === 'connected') {
                    const geom = tail.match(/(\d+)x(\d+)\+(-?\d+)\+(-?\d+)/);
                    if (geom) {
                        bounds = {
                            x: parseInt(geom[3], 10) || 0,
                            y: parseInt(geom[4], 10) || 0,
                            width: parseInt(geom[1], 10) || 0,
                            height: parseInt(geom[2], 10) || 0
                        };
                    }
                }
                current = { name: header[1], active: header[2] === 'connected', scale: 1, transform: 'normal', bounds, currentMode: '', modes: [] };
                continue;
            }
            if (current) {
                const mode = line.match(/^\s+(\d+)x(\d+)\s+(.+)$/);
                if (mode) {
                    const w = parseInt(mode[1], 10);
                    const h = parseInt(mode[2], 10);
                    const rates = (mode[3].match(/\d+(\.\d+)?/g) || []).map(r => parseFloat(r)).filter(n => Number.isFinite(n));
                    for (const hz of rates) current.modes.push({ width: w, height: h, refreshHz: hz });
                    if (line.includes('*')) current.currentMode = `${w}x${h}@${(rates[0] || 60)}`;
                }
            }
        }
        if (current) outputs.push(current);
        return { success: true, backend: 'xrandr', outputs };
    }

    return { success: false, error: 'Failed to read display outputs' };
});

ipcMain.handle('display:setMode', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
    const mode = payload && typeof payload.mode === 'string' ? payload.mode : '';
    if (!outputName || !mode) return { success: false, error: 'Invalid request' };

    const m = mode.match(/^(\d{2,5})x(\d{2,5})(?:@(\d+(\.\d+)?))?/);
    if (!m) return { success: false, error: 'Invalid mode' };
    const width = parseInt(m[1], 10);
    const height = parseInt(m[2], 10);
    const hz = m[3] ? parseFloat(m[3]) : null;

    const prefix = buildSwayEnvPrefix();
    const swayArg = hz ? `${width}x${height}@${hz}Hz` : `${width}x${height}`;
    const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" mode ${swayArg} 2>/dev/null`);
    if (!sway.error) return { success: true, backend: 'swaymsg' };

    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --mode ${width}x${height}${hz ? ` --rate ${hz}` : ''} 2>/dev/null`, { env });
    if (!xr.error) return { success: true, backend: 'xrandr' };

    return { success: false, error: sway.stderr || (sway.error ? sway.error.message : '') || xr.stderr || (xr.error ? xr.error.message : '') };
});

ipcMain.handle('display:setScale', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
    const scale = payload && typeof payload.scale === 'number' ? payload.scale : NaN;
    if (!outputName || !Number.isFinite(scale) || scale <= 0) return { success: false, error: 'Invalid request' };

    const prefix = buildSwayEnvPrefix();
    const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" scale ${scale} 2>/dev/null`);
    if (!sway.error) return { success: true, backend: 'swaymsg' };

    // X11 fallback (xrandr)
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const scaleStr = String(scale);
    const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --scale ${scaleStr}x${scaleStr} 2>/dev/null`, { env });
    if (!xr.error) return { success: true, backend: 'xrandr' };

    return { success: false, error: sway.stderr || (sway.error ? sway.error.message : '') || xr.stderr || (xr.error ? xr.error.message : '') || 'Failed to set scale' };
});

ipcMain.handle('display:setTransform', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
    const transform = payload && typeof payload.transform === 'string' ? payload.transform : '';
    if (!outputName || !transform) return { success: false, error: 'Invalid request' };

    const prefix = buildSwayEnvPrefix();
    const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" transform ${shEscape(transform)} 2>/dev/null`);
    if (!sway.error) return { success: true, backend: 'swaymsg' };

    const rotateMap = { normal: 'normal', '90': 'left', '180': 'inverted', '270': 'right' };
    const rot = rotateMap[transform] || null;
    if (!rot) return { success: false, error: 'Unsupported transform on X11' };
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --rotate ${rot} 2>/dev/null`, { env });
    if (!xr.error) return { success: true, backend: 'xrandr' };

    return { success: false, error: sway.stderr || (sway.error ? sway.error.message : '') || xr.stderr || (xr.error ? xr.error.message : '') };
});

ipcMain.handle('system:setResolution', async (event, resolution) => {
    const m = String(resolution || '').trim().match(/^(\d{2,5})x(\d{2,5})$/);
    if (!m) return { success: false, error: 'Invalid resolution format (expected 1920x1080)' };
    const width = parseInt(m[1], 10);
    const height = parseInt(m[2], 10);

    if (process.platform !== 'linux') {
        return { success: false, error: 'Resolution change not supported on this platform' };
    }

    const errors = [];

    // Wayland (sway)
    const prefix = buildSwayEnvPrefix();
    const waylandCmd = `${prefix ? prefix + ' ' : ''}swaymsg output '*' mode ${width}x${height} 2>/dev/null`;
    const waylandRes = await execAsync(waylandCmd);
    if (!waylandRes.error) return { success: true, backend: 'swaymsg' };
    errors.push(waylandRes.stderr || waylandRes.error.message);

    // X11 (xrandr)
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync('xrandr 2>/dev/null', { env });
    if (!xr.error && xr.stdout) {
        const connected = xr.stdout.split('\n').find(l => /\sconnected\b/.test(l));
        const outputName = connected ? connected.trim().split(/\s+/)[0] : null;
        if (outputName) {
            const setRes = await execAsync(`xrandr --output "${shEscape(outputName)}" --mode ${width}x${height} 2>/dev/null`, { env });
            if (!setRes.error) return { success: true, backend: 'xrandr' };
            errors.push(setRes.stderr || setRes.error.message);
        } else {
            errors.push('xrandr: no connected output found');
        }
    } else {
        errors.push(xr.stderr || (xr.error ? xr.error.message : 'xrandr failed'));
    }

    return { success: false, error: errors.filter(Boolean).slice(0, 2).join(' | ') || 'Failed to set resolution' };
});

ipcMain.handle('system:getResolutions', async () => {
    if (process.platform !== 'linux') {
        return { success: true, resolutions: ['1920x1080', '1280x720', '1024x768', '800x600'], current: '1920x1080' };
    }

    // Wayland (sway)
    const prefix = buildSwayEnvPrefix();
    const waylandCmd = `${prefix ? prefix + ' ' : ''}swaymsg -t get_outputs 2>/dev/null`;
    const wayland = await execAsync(waylandCmd);
    if (!wayland.error && wayland.stdout) {
        try {
            const outputs = JSON.parse(wayland.stdout);
            if (Array.isArray(outputs) && outputs.length > 0) {
                const output = outputs[0];
                const modes = Array.isArray(output.modes) ? output.modes : [];
                const resolutions = modes.map(m => `${m.width}x${m.height}`);
                const current = output.current_mode ? `${output.current_mode.width}x${output.current_mode.height}` : (resolutions[0] || '1024x768');
                const common = ['1920x1080', '1280x720', '1024x768', '800x600'];
                common.forEach(r => { if (!resolutions.includes(r)) resolutions.push(r); });
                return { success: true, resolutions: [...new Set(resolutions)].sort(), current };
            }
        } catch (e) {
            // fall through
        }
    }

    // X11 (xrandr)
    const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
    const xr = await execAsync('xrandr 2>/dev/null', { env });
    if (!xr.error && xr.stdout) {
        const lines = xr.stdout.split('\n');
        const resolutions = [];
        let current = '1024x768';

        for (const line of lines) {
            const match = line.match(/^\s+(\d+x\d+)/);
            if (match) {
                resolutions.push(match[1]);
                if (line.includes('*')) current = match[1];
            }
        }
        const common = ['1920x1080', '1280x720', '1024x768', '800x600'];
        common.forEach(r => { if (!resolutions.includes(r)) resolutions.push(r); });
        return { success: true, resolutions: [...new Set(resolutions)].sort(), current };
    }

    return { success: true, resolutions: ['1920x1080', '1280x720', '1024x768', '800x600'], current: '1024x768' };
});

// ============================================
// MOUSE DPI (libratbag / ratbagctl) - optional
// ============================================
ipcMain.handle('mouse:getDpiInfo', async () => {
    const devices = await listRatbagDevices();
    if (!devices.length) return { success: true, supported: false, devices: [] };

    const deviceId = devices[0].id;
    const dpiGet = await execAsync(`ratbagctl dpi get "${shEscape(deviceId)}" 2>/dev/null`);
    const dpiAll = await execAsync(`ratbagctl dpi get-all "${shEscape(deviceId)}" 2>/dev/null`);

    const current = dpiGet.stdout.match(/\d+/)?.[0] ? parseInt(dpiGet.stdout.match(/\d+/)[0], 10) : null;
    const values = (dpiAll.stdout.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => Number.isFinite(n));

    return {
        success: true,
        supported: true,
        devices,
        deviceId,
        currentDpi: current,
        dpiValues: [...new Set(values)].sort((a, b) => a - b)
    };
});

ipcMain.handle('mouse:setDpi', async (event, payload) => {
    if (process.platform !== 'linux') return { success: false, error: 'Not supported on this platform' };
    const dpi = payload && typeof payload.dpi === 'number' ? Math.round(payload.dpi) : NaN;
    if (!Number.isFinite(dpi) || dpi <= 0) return { success: false, error: 'Invalid DPI' };

    const devices = await listRatbagDevices();
    if (!devices.length) return { success: false, error: 'ratbagctl not available (install ratbagd/libratbag-tools)' };

    const requested = payload && typeof payload.deviceId === 'string' && payload.deviceId.trim() ? payload.deviceId.trim() : devices[0].id;
    const ok = devices.find(d => d.id === requested) ? requested : devices[0].id;
    const res = await execAsync(`ratbagctl dpi set ${dpi} "${shEscape(ok)}" 2>/dev/null`);
    if (res.error) return { success: false, error: res.stderr || res.error.message };
    return { success: true };
});

const projectRoot = path.resolve(__dirname, '..');

// ============================================
// APP DISCOVERY IPC (for Start Menu)
// ============================================

// Simple INI-style parser for .desktop files
function parseDesktopFile(content) {
    const result = {};
    let currentSection = null;

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // Section header [Desktop Entry]
        const sectionMatch = trimmed.match(/^\[(.+)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            continue;
        }

        // Key=Value
        const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (kvMatch && currentSection === 'Desktop Entry') {
            result[kvMatch[1].trim()] = kvMatch[2].trim();
        }
    }

    return result;
}

ipcMain.handle('apps:getInstalled', async () => {
    if (process.platform !== 'linux') {
        return { success: true, apps: [], unsupported: true, error: 'App discovery is only supported on Linux' };
    }

    const appDirs = [
        '/usr/share/applications',
        path.join(os.homedir(), '.local/share/applications')
    ];

    const apps = [];
    const seenNames = new Set();

    for (const dir of appDirs) {
        try {
            const files = await fs.promises.readdir(dir);

            for (const file of files) {
                if (!file.endsWith('.desktop')) continue;

                try {
                    const content = await fs.promises.readFile(path.join(dir, file), 'utf-8');
                    const parsed = parseDesktopFile(content);

                    // Skip hidden apps and those without names
                    if (!parsed.Name || parsed.NoDisplay === 'true' || parsed.Hidden === 'true') continue;

                    // Blacklist confusing system apps/terminals
                    const blacklist = new Set([
                        'Foot', 'Foot Client', 'Foot Server', 'Zutty',
                        'XTerm', 'UXTerm', 'Debian Info', 'Debian HTML',
                        'Avahi SSH Server Browser', 'Avahi VNC Server Browser',
                        'Bvs' // various x11 utils
                    ]);
                    if (blacklist.has(parsed.Name)) continue;

                    // Skip duplicate names
                    if (seenNames.has(parsed.Name)) continue;
                    seenNames.add(parsed.Name);

                    apps.push({
                        name: parsed.Name,
                        icon: parsed.Icon || 'application-x-executable',
                        exec: parsed.Exec ? parsed.Exec.replace(/%[a-zA-Z]/g, '').trim() : '',
                        categories: parsed.Categories ? parsed.Categories.split(';').filter(c => c) : [],
                        comment: parsed.Comment || '',
                        desktopFile: path.join(dir, file)
                    });
                } catch (e) {
                    // Skip files we can't read
                }
            }
        } catch (e) {
            // Directory doesn't exist or can't be read
        }
    }

    // Sort alphabetically
    apps.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, apps };
});

// Launch an application by its .desktop file or exec command
ipcMain.handle('apps:launch', async (event, app) => {
    if (process.platform !== 'linux') {
        return { success: false, unsupported: true, error: 'Launching apps is only supported on Linux' };
    }

    try {
        // Use gtk-launch if we have the desktop file, otherwise exec directly
        let command;
        if (app.desktopFile) {
            const baseName = path.basename(app.desktopFile);
            command = `gtk-launch ${baseName}`;
        } else if (app.exec) {
            command = app.exec;
        } else {
            return { success: false, error: 'No executable found' };
        }

        exec(command, { detached: true, stdio: 'ignore' });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

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
                resolve({ success: false, unsupported: true, error: (stderr || '').trim() || error.message || 'Update check failed' });
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
        // Pull updates, install deps, rebuild, and prepare for reboot
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        // Reset local changes (e.g. package-lock.json) before pulling to avoid conflicts
        const updateScript = `cd "${projectRoot}" && git fetch origin main && git reset --hard origin/main && ${npmCmd} install --ignore-optional && ${npmCmd} run build -- --base=./`;


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
// PTY TERMINAL IPC
// ============================================
ipcMain.handle('terminal:createPty', (event, options = {}) => {
    if (!pty) {
        return { success: false, error: 'PTY not available' };
    }

    const id = `pty-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const shell = process.platform === 'win32'
        ? process.env.COMSPEC || 'cmd.exe'
        : process.env.SHELL || '/bin/bash';

    try {
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: options.cols || 80,
            rows: options.rows || 24,
            cwd: options.cwd || os.homedir(),
            env: { ...process.env, TERM: 'xterm-256color' }
        });

        ptyProcess.onData((data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('terminal:data', { id, data });
            }
        });

        ptyProcess.onExit(({ exitCode }) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('terminal:exit', { id, exitCode });
            }
            ptyProcesses.delete(id);
        });

        ptyProcesses.set(id, { pty: ptyProcess, cwd: options.cwd || os.homedir() });
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('terminal:writePty', (event, { id, data }) => {
    const entry = ptyProcesses.get(id);
    if (!entry) return { success: false, error: 'PTY not found' };
    try {
        entry.pty.write(data);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('terminal:resizePty', (event, { id, cols, rows }) => {
    const entry = ptyProcesses.get(id);
    if (!entry) return { success: false, error: 'PTY not found' };
    try {
        entry.pty.resize(cols, rows);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('terminal:destroyPty', (event, { id }) => {
    const entry = ptyProcesses.get(id);
    if (entry) {
        try {
            entry.pty.kill();
        } catch (e) {
            // ignore
        }
        ptyProcesses.delete(id);
    }
    return { success: true };
});

ipcMain.handle('terminal:isPtyAvailable', () => {
    return { success: true, available: pty !== null };
});

// ============================================
// APP DISCOVERY (Start Menu)
// ============================================

ipcMain.handle('apps:getInstalled', async () => {
    if (process.platform === 'linux') {
        try {
            const dir = '/usr/share/applications';
            const files = await fs.promises.readdir(dir).catch(() => []);
            const apps = [];
            for (const f of files) {
                if (!f.endsWith('.desktop')) continue;
                try {
                    const content = await fs.promises.readFile(path.join(dir, f), 'utf-8');
                    const nameMatch = content.match(/^Name=(.*)$/m);
                    const execMatch = content.match(/^Exec=(.*)$/m);
                    if (nameMatch && execMatch && !content.includes('NoDisplay=true')) {
                        const catMatch = content.match(/^Categories=(.*)$/m);
                        let exec = execMatch[1].trim();
                        exec = exec.replace(/%[fFuViidck]/g, '').trim();
                        apps.push({
                            name: nameMatch[1].trim(),
                            exec: exec,
                            categories: catMatch ? catMatch[1].split(';').filter(Boolean) : [],
                            desktopFile: path.join(dir, f)
                        });
                    }
                } catch { }
            }
            apps.sort((a, b) => a.name.localeCompare(b.name));
            return apps;
        } catch (e) { console.error('Failed to scan Linux apps:', e); }
    }

    return [
        { name: 'Steam', exec: 'steam', categories: ['Game', 'Network'] },
        { name: 'Heroic Games Launcher', exec: 'heroic', categories: ['Game'] },
        { name: 'Lutris', exec: 'lutris', categories: ['Game', 'Utility'] },
        { name: 'Bottles', exec: 'bottles', categories: ['Game', 'Utility'] },
        { name: 'Firefox', exec: 'firefox', categories: ['Network', 'WebBrowser'] },
        { name: 'Google Chrome', exec: 'google-chrome', categories: ['Network', 'WebBrowser'] },
        { name: 'VLC Media Player', exec: 'vlc', categories: ['AudioVideo', 'Player'] },
        { name: 'VS Code', exec: 'code', categories: ['Development', 'IDE'] },
        { name: 'Terminal', exec: 'gnome-terminal', categories: ['System', 'TerminalEmulator'] },
        { name: 'Discord', exec: 'discord', categories: ['Network', 'Chat'] }
    ];
});

ipcMain.handle('apps:launch', async (event, app) => {
    if (!app || !app.exec) return { success: false, error: 'Invalid app definition' };
    const { spawn } = require('child_process');
    try {
        let cmd = app.exec;
        if (process.platform === 'win32') {
            if (cmd === 'calc') cmd = 'calc.exe';
            if (cmd === 'notepad') cmd = 'notepad.exe';
        }
        const parts = cmd.split(' ').filter(Boolean);
        const bin = parts[0];
        const args = parts.slice(1);
        const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
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
