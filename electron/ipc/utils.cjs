/**
 * Shared utilities for IPC handlers
 * Extracted from main.cjs for modularity
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================
// IPC Response Helpers
// ============================================

function ipcSuccess(data = {}) {
    return { success: true, ...data };
}

function ipcError(message) {
    return { success: false, error: message };
}

// ============================================
// Command Execution
// ============================================

function execAsync(command, options = {}) {
    const timeoutMs = options.timeout || 3000; // Default 3s timeout to prevent hangs in VMs
    return new Promise((resolve) => {
        let settled = false;
        let timer = null;
        const child = exec(command, { maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            resolve({ error, stdout: stdout || '', stderr: stderr || '' });
        });
        // Kill process if it takes too long (common with nmcli in VMs without WiFi)
        timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            try { child.kill('SIGTERM'); } catch { }
            resolve({ error: new Error('Command timed out'), stdout: '', stderr: '' });
        }, timeoutMs);
    });
}

function shEscape(value) {
    // Safe-ish for wrapping in double quotes in sh.
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ============================================
// PATH SECURITY - Prevent path traversal attacks
// ============================================

const SAFE_BASE_PATHS = [
    os.homedir(),
    '/tmp',
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Pictures'),
    path.join(os.homedir(), 'Music'),
    path.join(os.homedir(), 'Videos'),
    path.join(os.homedir(), '.config'),
    path.join(os.homedir(), '.local/share/Trash'),
    path.join(os.homedir(), '.templeos-remake'),
];

const BLOCKED_PATHS = [
    '/etc/shadow',
    '/etc/passwd',
    '/etc/sudoers',
    '/etc/gshadow',
    path.join(os.homedir(), '.ssh'),
    path.join(os.homedir(), '.gnupg'),
    path.join(os.homedir(), '.aws'),
    path.join(os.homedir(), '.kube'),
    path.join(os.homedir(), '.docker'),
];

function isPathSafe(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') {
        return { safe: false, reason: 'Invalid path' };
    }

    const resolved = path.resolve(targetPath);

    // Block sensitive paths first (higher priority)
    for (const blocked of BLOCKED_PATHS) {
        if (resolved === blocked || resolved.startsWith(blocked + path.sep)) {
            return { safe: false, reason: 'Access to sensitive path blocked' };
        }
    }

    // Allow paths under safe bases
    for (const base of SAFE_BASE_PATHS) {
        if (resolved === base || resolved.startsWith(base + path.sep)) {
            return { safe: true };
        }
    }

    return { safe: false, reason: 'Path outside allowed directories' };
}

// ============================================
// JSON File Helpers
// ============================================

function readJsonArrayFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return null;
        return data.map(x => String(x || '').trim()).filter(Boolean);
    } catch {
        return null;
    }
}

// ============================================
// Image Buffer Detection
// ============================================

function isJpegBuffer(buf) {
    return Buffer.isBuffer(buf) && buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
}

function isPngBuffer(buf) {
    return Buffer.isBuffer(buf) && buf.length >= 8
        && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
        && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;
}

// ============================================
// EXIF Parsing (TIFF format)
// ============================================

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

                if (tag === 0x0001) {
                    const v = readValue(entryOff, type, count, valueOrOff);
                    gps.latRef = v ? String(v).trim().toUpperCase() : null;
                } else if (tag === 0x0003) {
                    const v = readValue(entryOff, type, count, valueOrOff);
                    gps.lonRef = v ? String(v).trim().toUpperCase() : null;
                } else if (tag === 0x0002 && type === 5 && count >= 3) {
                    const r0 = readRational(dataOff, false);
                    const r1 = readRational(dataOff + 8, false);
                    const r2 = readRational(dataOff + 16, false);
                    if (r0 && r1 && r2 && r0.den && r1.den && r2.den) {
                        gps.lat = (r0.num / r0.den) + (r1.num / r1.den) / 60 + (r2.num / r2.den) / 3600;
                    }
                } else if (tag === 0x0004 && type === 5 && count >= 3) {
                    const r0 = readRational(dataOff, false);
                    const r1 = readRational(dataOff + 8, false);
                    const r2 = readRational(dataOff + 16, false);
                    if (r0 && r1 && r2 && r0.den && r1.den && r2.den) {
                        gps.lon = (r0.num / r0.den) + (r1.num / r1.den) / 60 + (r2.num / r2.den) / 3600;
                    }
                } else if (tag === 0x0005) {
                    const v = readValue(entryOff, type, count, valueOrOff);
                    gps.altRef = v ? String(v).trim() : null;
                } else if (tag === 0x0006 && type === 5 && count === 1) {
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

        if (out.DateTimeOriginal && !out.DateTime) out.DateTime = out.DateTimeOriginal;

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
        let pos = 2;
        while (pos + 4 < buf.length) {
            if (buf[pos] !== 0xFF) { pos++; continue; }
            const marker = buf[pos + 1];
            if (marker === 0xDA) break;
            if (marker === 0xD9) break;
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

// ============================================
// Metadata Stripping
// ============================================

function stripJpegMetadata(buf) {
    if (!isJpegBuffer(buf)) return null;
    const out = [buf.slice(0, 2)];
    let pos = 2;
    while (pos + 1 < buf.length) {
        if (buf[pos] !== 0xFF) {
            out.push(buf.slice(pos));
            break;
        }
        const marker = buf[pos + 1];

        if (marker === 0xDA) {
            out.push(buf.slice(pos));
            break;
        }
        if (marker === 0xD9) {
            out.push(buf.slice(pos, pos + 2));
            break;
        }
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
            if (head29 === 'http://ns.adobe.com/xap/1.0/') drop = true;
        }
        if (marker === 0xFE) drop = true;
        if (marker === 0xED) drop = true;

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

// ============================================
// System Helpers
// ============================================

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

// ============================================
// Linux Trash Helpers
// ============================================

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
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function trashInfoText(originalPath, deletionDate) {
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

    await fs.promises.mkdir(path.dirname(dest), { recursive: true }).catch((e) => console.warn('[FS] mkdir for restore failed:', e.message));

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
    await fs.promises.rm(infoPath, { force: true }).catch((e) => console.warn('[FS] Remove trash info failed:', e.message));
    return { restoredPath: finalDest };
}

module.exports = {
    // Response helpers
    ipcSuccess,
    ipcError,

    // Command execution
    execAsync,
    shEscape,

    // Path security
    isPathSafe,
    SAFE_BASE_PATHS,
    BLOCKED_PATHS,

    // JSON helpers
    readJsonArrayFile,

    // Image utilities
    isJpegBuffer,
    isPngBuffer,
    parseTiffExif,
    extractExifFromBuffer,
    stripJpegMetadata,
    stripPngMetadata,
    stripImageMetadata,

    // System helpers
    buildSwayEnvPrefix,
    cpuTotals,
    linuxNetTotals,
    listRatbagDevices,

    // Linux trash
    getLinuxTrashPaths,
    ensureLinuxTrash,
    moveToLinuxTrash,
    listLinuxTrash,
    restoreLinuxTrash,

    // Re-exports
    fs,
    path,
    os,
    exec,
    spawn
};
