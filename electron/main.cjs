const { app, BrowserWindow, ipcMain, shell, screen, protocol, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

// ============================================
// MODULAR IPC HANDLERS (Phase 8 Refactoring)
// ============================================
// These modular handlers are ready for use but NOT activated yet to avoid
// duplicate registration with the inline handlers below. To complete the
// migration, remove the inline handlers and uncomment the registration call.
//
// const { registerAllHandlers } = require('./ipc/index.cjs');
// Call in app.whenReady: registerAllHandlers(() => mainWindow);
// ============================================
const { createEwmhBridge, getActiveWindowXidHex, switchToDesktop, getCurrentDesktop, getDesktopCount, moveWindowToDesktop, makeWindowSticky } = require('./x11/ewmh.cjs');

// Divine Assistant (Word of God AI)
const { OllamaManager } = require('./ollama-manager.cjs');
const { DivineAssistant } = require('./divine-assistant.cjs');
const { CommandExecutor } = require('./command-executor.cjs');

// Initialize Divine Assistant components
const ollamaManager = new OllamaManager();
const divineAssistant = new DivineAssistant();
const commandExecutor = new CommandExecutor();

// ============================================
// VOICE OF GOD TTS - Inline Implementation
// ============================================
const ttsState = {
    enabled: false,
    speaking: false,
    currentProcess: null
};

// TTS paths - determined at startup
const ttsConfig = {
    piperDir: path.join(__dirname, 'piper'),
    piperPath: process.platform === 'win32'
        ? path.join(__dirname, 'piper', 'piper', 'piper.exe')
        : path.join(__dirname, 'piper', 'piper', 'piper'),
    modelPath: path.join(__dirname, 'piper', 'en_US-lessac-high.onnx')
};

console.log('[TTS] Piper path:', ttsConfig.piperPath);
console.log('[TTS] Model path:', ttsConfig.modelPath);


// Allow loading local icons even when the renderer is on http:// (dev server).
// Must be declared before app ready.
try {
    protocol.registerSchemesAsPrivileged([
        { scheme: 'temple-icon', privileges: { standard: true, secure: true, supportFetchAPI: true } }
    ]);
} catch {
    // ignore (older/newer Electron may throw if called too late or already registered)
}
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
let isHardFocusing = false; // Block auto-below logic during Hard Focus
let panelWindow;
let contextPopup = null; // Floating context menu popup (alwaysOnTop)
let ewmhBridge = null;
let x11IgnoreXids = new Set();
let mainWindowXid = null; // Store main window XID to protect it from snap operations
let x11SnapLayoutsEnabled = true; // Setting: Enable X11 Snap Layouts (default: ON)
let tilingModeActive = false; // Auto-tiling state
const occupiedSlots = new Map(); // xidHex -> slot ('maximize', 'left', 'right', 'topleft', etc.)
let panelPolicy = {
    hideOnFullscreen: true,
    forceHidden: false,
    hidden: false,
};
let lastCpuTotals = null; // { idle: number, total: number }
let lastNetTotals = null; // { rx: number, tx: number }
let lastNetAt = 0;

// Taskbar Configuration (synced from renderer)
let currentTaskbarPosition = 'bottom'; // 'top' | 'bottom' - Synced from renderer
const TASKBAR_HEIGHT = 60;


// X11 Snap Detector Daemon (Windows 11-style drag-to-edge detection)
let snapDetectorProcess = null;
let snapPreviewWindow = null; // Visual preview for edge snaps

// IPC Response Helpers - Consistent error format across all handlers
function ipcSuccess(data = {}) {
    return { success: true, ...data };
}

function ipcError(message) {
    return { success: false, error: message };
}

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
    // (Not a full shell-escape; good enough for SSIDs/passwords/ids passed to nmcli/pactl/etc.)
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

function createWindow() {
    // Detect X11 before creating window
    const x11Mode = process.platform === 'linux'
        && !!process.env.DISPLAY
        && !process.env.WAYLAND_DISPLAY
        && process.env.XDG_SESSION_TYPE !== 'wayland';

    // FORCE 1024x768 resolution on X11 (VirtualBox stability fix)
    // This prevents VirtualBox from randomly choosing 800x600 on restarts
    if (x11Mode) {
        const exec = require('child_process').exec;
        exec('xrandr --output $(xrandr | grep " connected" | cut -d " " -f1 | head -n 1) --mode 1024x768 2>/dev/null', (err) => {
            if (err) console.warn('[Display] xrandr force-set failed (not critical):', err.message);
            else console.log('[Display] Forced 1024x768 via xrandr');
        });
    }

    // Get screen dimensions for X11 mode (defaulting to 1024x768 instead of 1280x720)
    let initialBounds = { width: 1024, height: 768, x: undefined, y: undefined };
    if (x11Mode) {
        const primary = screen.getPrimaryDisplay();
        if (primary?.bounds) {
            initialBounds = {
                x: primary.bounds.x,
                y: primary.bounds.y,
                width: primary.bounds.width,
                height: primary.bounds.height
            };
        }
    }

    mainWindow = new BrowserWindow({
        width: initialBounds.width,
        height: initialBounds.height,
        x: initialBounds.x,
        y: initialBounds.y,
        frame: false,           // Custom title bar
        fullscreen: false,      // Start windowed
        resizable: !x11Mode,    // Prevent resize in X11 (desktop shell mode)
        movable: !x11Mode,      // Prevent dragging in X11 (desktop shell mode)
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

    mainWindow.webContents.on('did-finish-load', () => {
        // In X11 mode, hide the shell window from task/window lists (panel should track real apps, not itself).
        if (isX11Session()) {
            setTimeout(() => { void applyDesktopHintsToMainWindow().catch((e) => console.warn('[X11] applyDesktopHintsToMainWindow failed:', e.message)); }, 150);

            // CRITICAL: Capture main window XID to protect it from snap operations
            try {
                const handle = mainWindow.getNativeWindowHandle();
                if (Buffer.isBuffer(handle) && handle.length >= 4) {
                    mainWindowXid = '0x' + handle.readUInt32LE(0).toString(16);
                    x11IgnoreXids.add(mainWindowXid.toLowerCase());
                    console.log('[X11] Main Window XID:', mainWindowXid, '(protected from snap operations)');
                }
            } catch (e) {
                console.warn('[X11] Failed to capture main window XID:', e.message);
            }

            // FIX: Force focus capture on X11 to prevent input lockout on boot
            // X11 with _NET_WM_STATE_BELOW can fail to grant proper keyboard/mouse focus
            // until a window manager event occurs. This forces focus at key intervals.
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.focus();
                    mainWindow.webContents.focus();
                    console.log('[X11] Focus capture attempt #1 (500ms)');
                }
            }, 500);
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.focus();
                    console.log('[X11] Focus capture attempt #2 (2000ms)');
                }
            }, 2000);
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.focus();
                    mainWindow.webContents.focus();
                    console.log('[X11] Focus capture attempt #3 (4000ms - post boot screen)');
                }
            }, 4000);
        }
    });




    // Enforce desktop behavior gently on focus (re-apply BELOW state)
    mainWindow.on('focus', () => {
        if (isX11Session()) {
            if (isHardFocusing) {
                // CRITICAL: Do NOT send the window to background if we are actively trying to hard-focus it!
                return;
            }
            // Only re-apply if we suspect we lost the 'below' state. 
            // We just fire-and-forget this to ensure we stay at the bottom.
            void wmctrlSetState(xidHexFromBrowserWindow(mainWindow), 'add', 'below,skip_taskbar,skip_pager').catch((e) => console.warn('[X11] wmctrlSetState on focus failed:', e.message));
        }
    });
}



function resizeMainWindowToWorkArea() {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const primary = screen.getPrimaryDisplay();
        const wa = primary?.workArea;
        if (!wa || !wa.width || !wa.height) return;
        mainWindow.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
    } catch {
        // ignore
    }
}

function isX11Session() {
    if (process.platform !== 'linux') return false;
    if (!process.env.DISPLAY) return false;
    if (process.env.WAYLAND_DISPLAY) return false;
    if (process.env.XDG_SESSION_TYPE === 'wayland') return false;
    // If XDG_SESSION_TYPE is missing (common with startx), treat DISPLAY + no WAYLAND_DISPLAY as X11.
    return true;
}

async function xpropSet(winIdHex, propName, format, value) {
    if (!winIdHex) return { success: false, error: 'Missing window id' };
    if (!(await hasCommand('xprop'))) return { success: false, error: 'xprop not installed' };
    // No user-controlled inputs are passed here; values are computed constants.
    const cmd = `xprop -id ${winIdHex} -f ${propName} ${format} -set ${propName} ${value}`;
    const res = await execAsync(cmd, { timeout: 2000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'xprop failed' };
    return { success: true };
}

async function wmctrlSetState(winIdHex, op, statesCsv) {
    const xid = String(winIdHex || '').trim().toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(xid)) return { success: false, error: 'Invalid window id' };
    if (!(await hasCommand('wmctrl'))) return { success: false, error: 'wmctrl not installed' };

    const mode = (op === 'add' || op === 'remove' || op === 'toggle') ? op : 'add';
    const raw = String(statesCsv || '').trim();
    if (!raw) return { success: false, error: 'Missing state list' };
    const states = raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.replace(/[^a-z0-9_]/gi, ''))
        .filter(Boolean);
    if (states.length === 0) return { success: false, error: 'Missing state list' };

    const cmd = `wmctrl -ir ${xid} -b ${mode},${states.join(',')}`;
    const res = await execAsync(cmd, { timeout: 2000 });
    if (res.error) return { success: false, error: res.stderr || res.error.message || 'wmctrl failed' };
    return { success: true };
}

async function applyDockStrutToPanelWindow() {
    if (!isX11Session()) return;
    if (!panelWindow || panelWindow.isDestroyed()) return;

    const xid = xidHexFromBrowserWindow(panelWindow);
    if (!xid) return;

    const primary = screen.getPrimaryDisplay();
    const width = primary?.bounds?.width || 1920;
    const height = panelWindow.getBounds().height || 60;

    // Dock + always-on-top behavior + skip taskbar/pager.
    await xpropSet(xid, '_NET_WM_WINDOW_TYPE', '32a', '_NET_WM_WINDOW_TYPE_DOCK').catch((e) => console.warn('[X11] xpropSet WINDOW_TYPE failed:', e.message));
    await xpropSet(xid, '_NET_WM_STATE', '32a', '_NET_WM_STATE_ABOVE,_NET_WM_STATE_STICKY,_NET_WM_STATE_SKIP_TASKBAR,_NET_WM_STATE_SKIP_PAGER').catch((e) => console.warn('[X11] xpropSet WM_STATE failed:', e.message));

    // Reserve the bottom strip of the screen.
    // _NET_WM_STRUT_PARTIAL = left, right, top, bottom, left_start_y, left_end_y, right_start_y, right_end_y, top_start_x, top_end_x, bottom_start_x, bottom_end_x
    const strut = `"0, 0, 0, ${height}, 0, 0, 0, 0, 0, 0, 0, ${Math.max(0, width - 1)}"`;
    await xpropSet(xid, '_NET_WM_STRUT_PARTIAL', '32c', strut).catch((e) => console.warn('[X11] xpropSet STRUT_PARTIAL failed:', e.message));

    // Give the WM a moment to apply workarea, then resize the main window so it doesn't cover the panel.
    setTimeout(() => resizeMainWindowToWorkArea(), 120);
}

async function setPanelStrutEnabled(enabled) {
    if (!isX11Session()) return;
    if (!panelWindow || panelWindow.isDestroyed()) return;
    const xid = xidHexFromBrowserWindow(panelWindow);
    if (!xid) return;

    const primary = screen.getPrimaryDisplay();
    const width = primary?.bounds?.width || 1920;
    const height = panelWindow.getBounds().height || 60;

    const value = enabled
        ? `"0, 0, 0, ${height}, 0, 0, 0, 0, 0, 0, 0, ${Math.max(0, width - 1)}"`
        : `"0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0"`;
    await xpropSet(xid, '_NET_WM_STRUT_PARTIAL', '32c', value).catch((e) => console.warn('[X11] xpropSet STRUT_PARTIAL toggle failed:', e.message));

    // Workarea changes when struts change; resize main accordingly.
    setTimeout(() => resizeMainWindowToWorkArea(), 120);
}

async function setPanelHidden(hidden) {
    if (!panelWindow || panelWindow.isDestroyed()) return;
    if (hidden) {
        try { panelWindow.hide(); } catch { }
    } else {
        try {
            // Show without stealing focus from the active fullscreen/game window.
            if (typeof panelWindow.showInactive === 'function') panelWindow.showInactive();
            else panelWindow.show();
        } catch { }
    }
}

async function applyPanelPolicyFromSnapshot(snapshot) {
    if (!panelWindow || panelWindow.isDestroyed()) return;
    const fullscreen = !!snapshot?.activeFullscreen;
    const shouldHide = !!panelPolicy.forceHidden || (!!panelPolicy.hideOnFullscreen && fullscreen);
    if (shouldHide === panelPolicy.hidden) return;

    panelPolicy.hidden = shouldHide;
    if (shouldHide) {
        await setPanelStrutEnabled(false);
        await setPanelHidden(true);
    } else {
        await setPanelHidden(false);
        await applyDockStrutToPanelWindow();
    }
}

async function applyDesktopHintsToMainWindow() {
    if (!isX11Session()) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const xid = xidHexFromBrowserWindow(mainWindow);
    if (!xid) return;

    // Hide the shell window from taskbar/window lists, but keep it interactive/focusable.
    // Avoid setting WINDOW_TYPE=DESKTOP because some WMs treat it as non-focusable.
    // _NET_WM_STATE_BELOW ensures it stays at the bottom of the stack (like a desktop),
    // preventing it from obscuring other windows when clicked/focused.
    // Use wmctrl to request EWMH state changes (more reliable than directly setting _NET_WM_STATE).
    await wmctrlSetState(xid, 'add', 'below,skip_taskbar,skip_pager').catch((e) => console.warn('[X11] wmctrlSetState desktop hints failed:', e.message));

    // CRITICAL: Make the Electron shell appear on ALL X11 desktops (sticky/omnipresent)
    // This ensures the desktop UI is always visible when switching virtual desktops.
    // wmctrl -ir <xid> -t -1 moves window to "all desktops" (-1 = sticky)
    try {
        await makeWindowSticky(xid);
        console.log('[X11 Workspaces] Main window set to sticky (visible on all desktops)');
    } catch (e) {
        console.warn('[X11 Workspaces] Failed to make main window sticky:', e.message);
    }
}

function createPanelWindow() {
    if (!isX11Session()) return;
    if (panelWindow && !panelWindow.isDestroyed()) return;

    const primary = screen.getPrimaryDisplay();
    const barHeight = 58;
    const bounds = primary?.bounds || { x: 0, y: 0, width: 1280, height: 720 };

    panelWindow = new BrowserWindow({
        x: bounds.x,
        y: bounds.y + bounds.height - barHeight,
        width: bounds.width,
        height: barHeight,
        frame: false,
        resizable: false,
        movable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    if (process.env.NODE_ENV === 'development') {
        panelWindow.loadURL('http://localhost:5173/panel.html');
    } else {
        panelWindow.loadFile(path.join(__dirname, '../dist/panel.html'));
    }

    panelWindow.webContents.on('did-finish-load', () => {
        void applyDockStrutToPanelWindow().catch((e) => console.warn('[X11] applyDockStrutToPanelWindow failed:', e.message));
        // Refresh ignore set for the X11 bridge (so the panel doesn't appear as an app).
        const xid = xidHexFromBrowserWindow(panelWindow);
        if (xid) x11IgnoreXids.add(String(xid).toLowerCase());
    });

    panelWindow.on('closed', () => {
        panelWindow = null;
    });
}

function xidHexFromNativeHandle(handle) {
    try {
        if (!Buffer.isBuffer(handle) || handle.length < 4) return null;
        // On Linux X11, Electron returns the XID as a native-endian integer in the buffer.
        // XIDs are 32-bit even on 64-bit systems.
        const n = handle.readUInt32LE(0);
        if (!n) return null;
        return `0x${n.toString(16)}`;
    } catch {
        return null;
    }
}

function xidHexFromBrowserWindow(win) {
    try {
        if (!win || win.isDestroyed()) return null;
        const h = win.getNativeWindowHandle();
        return xidHexFromNativeHandle(h);
    } catch {
        return null;
    }
}

function matchInstalledAppForWmClass(wmClass) {
    const raw = String(wmClass || '').trim();
    if (!raw) return null;

    // wmctrl -x reports "instance.Class" (from WM_CLASS strings). Try both parts + full string.
    const parts = raw.split('.').map(p => p.trim()).filter(Boolean);
    const candidates = [raw, ...parts].map(s => s.toLowerCase());
    for (const c of candidates) {
        const hit = installedAppsByStartupWmClass.get(c);
        if (hit) return hit;
    }
    return null;
}

function enrichX11Snapshot(snapshot) {
    const windows = (snapshot && Array.isArray(snapshot.windows)) ? snapshot.windows : [];
    const active = snapshot ? snapshot.activeXidHex : null;

    // Filter out the TempleOS desktop window from the list
    const filteredWindows = windows.filter(w => {
        const title = (w.title ?? '').toLowerCase();
        const xid = String(w.xidHex || '').toLowerCase();
        // Exclude the main TempleOS desktop window by title (case-insensitive) or by XID
        if (title.startsWith('templeos')) return false;
        if (mainWindowXid && xid === mainWindowXid.toLowerCase()) return false;
        return true;
    });

    return {
        supported: !!snapshot?.supported,
        activeXidHex: active,
        activeFullscreen: !!snapshot?.activeFullscreen,
        windows: filteredWindows.map(w => {
            const app = matchInstalledAppForWmClass(w.wmClass);
            return {
                xidHex: w.xidHex,
                desktop: w.desktop ?? null,
                pid: w.pid ?? null,
                wmClass: w.wmClass ?? null,
                title: w.title ?? '',
                active: !!active && String(active).toLowerCase() === String(w.xidHex).toLowerCase(),
                minimized: !!w.minimized,
                alwaysOnTop: !!w.alwaysOnTop,
                appId: app ? app.id : null,
                appName: app ? app.name : null,
                iconUrl: app ? app.iconUrl : null,
                source: app ? app.source : null,
            };
        }),
    };
}

function broadcastX11WindowsChanged(snapshot) {
    const payload = enrichX11Snapshot(snapshot);
    try {
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win || win.isDestroyed()) continue;
            win.webContents.send('x11:windowsChanged', payload);
        }
    } catch {
        // ignore
    }
}

async function startX11EwmhBridge() {
    if (process.platform !== 'linux') return;
    if (ewmhBridge) return;

    // Ignore our own windows to avoid self-referential taskbar entries.
    x11IgnoreXids = new Set();
    const mainXid = xidHexFromBrowserWindow(mainWindow);
    if (mainXid) x11IgnoreXids.add(String(mainXid).toLowerCase());
    const panelXid = xidHexFromBrowserWindow(panelWindow);
    if (panelXid) x11IgnoreXids.add(String(panelXid).toLowerCase());

    ewmhBridge = await createEwmhBridge({ pollMs: 200, includeHidden: false, ignoreXids: x11IgnoreXids });
    if (!ewmhBridge.supported) {
        ewmhBridge = null;
        return;
    }

    ewmhBridge.onChange((snap) => {
        broadcastX11WindowsChanged(snap);
        void applyPanelPolicyFromSnapshot(snap).catch((e) => console.warn('[X11] applyPanelPolicyFromSnapshot failed:', e.message));
        // Phase 4: Track window closures for auto-tiling
        updateOccupiedSlotsFromSnapshot(snap);
        // Note: Snap layout detection is now handled by the snap-detector.py daemon
        // which uses XQueryPointer polling for real-time drag detection
    });
    ewmhBridge.start();
}

app.whenReady().then(() => {
    registerTempleIconProtocol();
    createWindow();
    if (process.platform === 'linux') {
        startDesktopEntryWatcher();
        void refreshInstalledAppsCache('startup').catch((e) => console.warn('[Apps] Startup cache refresh failed:', e.message));
        if (isX11Session()) {
            // UNIFIED TASKBAR: Panel window is disabled. The main renderer handles X11 windows directly.
            // createPanelWindow();  // Disabled - using unified in-renderer taskbar instead
            void applyDesktopHintsToMainWindow().catch((e) => console.warn('[X11] applyDesktopHintsToMainWindow at ready failed:', e.message));
            // Maximize the main window to fill the screen (since there's no panel strut)
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.maximize();
                    // Capture main window XID for snap layout protection
                    try {
                        const handle = mainWindow.getNativeWindowHandle();
                        // getNativeWindowHandle returns a Buffer with the X11 window ID
                        if (handle && handle.length >= 4) {
                            const xid = handle.readUInt32LE(0);
                            mainWindowXid = '0x' + xid.toString(16);
                            x11IgnoreXids.add(mainWindowXid.toLowerCase());
                            console.log('[X11 Snap Layouts] Captured main window XID:', mainWindowXid);
                            // Start the snap detector daemon now that we have the XID to protect
                            startSnapDetector();
                        }
                    } catch (e) {
                        console.log('[X11 Snap Layouts] Failed to capture main window XID:', e.message);
                        // Still try to start detector without protection
                        startSnapDetector();
                    }
                }
            }, 200);
            void startX11EwmhBridge().catch((e) => console.warn('[X11] EWMH bridge start failed:', e.message));  // Still need this to detect Firefox, etc.
        }
    }
});

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

ipcMain.handle('input-wake-up', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { success: false };

    console.log('[IPC] Executing Hard Focus Sequence (Synthesized)');
    isHardFocusing = true;

    try {
        // 1. Force window to top visual layer (Steal Focus)
        mainWindow.setAlwaysOnTop(true, 'screen-saver');

        // 2. Ensure it's not minimized
        if (mainWindow.isMinimized()) mainWindow.restore();

        // 3. Demand Focus
        mainWindow.show();
        mainWindow.focus();

        // NOTE: Synthetic Tab removed - it causes visible focus ring highlighting.
        // The OS-level xdotool approach below is cleaner and invisible.

        // 3.6. OS-LEVEL FORCE (Linux/X11)
        // Tab key IS REQUIRED for input wake-up. Other methods alone don't work.
        // We use stealth CSS to hide focus rings during the Tab injection.
        if (process.platform === 'linux') {
            // STEP 1: Inject stealth CSS to hide focus rings BEFORE Tab
            mainWindow.webContents.executeJavaScript(`
                const s = document.createElement('style');
                s.id = '__hard_focus_stealth';
                s.textContent = '*:focus, *:focus-visible { outline: none !important; box-shadow: none !important; border-color: inherit !important; }';
                document.head.appendChild(s);
                void 0;
            `).catch((e) => console.warn('[IPC] Stealth CSS injection failed:', e.message));

            // STEP 2: Window activation
            if (mainWindowXid) {
                exec(`wmctrl -i -a ${mainWindowXid}`, (e) => { if (e) console.warn('[IPC] wmctrl failed:', e.message); });
                exec(`xdotool windowactivate ${mainWindowXid}`, (e) => {
                    if (e) console.warn('[IPC] xdotool windowactivate failed:', e.message);
                });
            }

            // STEP 3: Tab key injection (REQUIRED for input wake-up)
            exec('xdotool key Tab', (e) => {
                if (e) console.warn('[IPC] xdotool Tab failed:', e.message);
                else console.log('[IPC] xdotool Tab injection success (Stealthed)');
            });

            // STEP 4: CapsLock toggle (hardware wake)
            exec('xdotool key Caps_Lock Caps_Lock', (e) => {
                if (e) console.warn('[IPC] xdotool CapsLock failed:', e.message);
            });

            // STEP 5: Cleanup - blur focused element + remove stealth CSS
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.executeJavaScript(`
                        document.activeElement?.blur?.();
                        document.getElementById('__hard_focus_stealth')?.remove();
                        void 0;
                    `).catch((e) => console.warn('[IPC] Focus cleanup injection failed:', e.message));
                }
            }, 100);
        }

        // 4. Wait a moment for WM to comply
        await new Promise(resolve => setTimeout(resolve, 100));

        // 5. Release "Always On Top" lock (so user can use other windows)
        mainWindow.setAlwaysOnTop(false);

        // 6. Final Focus Assertion
        mainWindow.focus();

        return { success: true };
    } catch (err) {
        console.error('[IPC] Hard Focus Failed:', err);
        return { success: false, error: err.message };
    } finally {
        setTimeout(() => { isHardFocusing = false; }, 1000);
    }
});

// ============================================
// DIVINE ASSISTANT (WORD OF GOD) IPC
// ============================================

// Get the full status of the Divine Assistant (Ollama + Model + OpenRouter)
ipcMain.handle('divine:getStatus', async () => {
    try {
        const ollamaStatus = await ollamaManager.getFullStatus();
        const backendStatus = await divineAssistant.checkBackendStatus();
        return {
            success: true,
            ...ollamaStatus,
            openRouterAvailable: backendStatus.openrouter,
            openRouterUsingBuiltinKey: backendStatus.openrouterUsingBuiltinKey,
            ollamaAvailable: backendStatus.ollama,
            currentBackend: divineAssistant.backend,
            webSearchEnabled: divineAssistant.useWebSearch
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Configure Divine Assistant backend
ipcMain.handle('divine:configure', async (event, config) => {
    try {
        if (config.backend) {
            divineAssistant.setBackend(config.backend);
        }
        if (config.openRouterApiKey) {
            divineAssistant.setOpenRouterApiKey(config.openRouterApiKey);
        }
        if (config.webSearch !== undefined) {
            divineAssistant.setWebSearch(config.webSearch);
        }
        // Note: useOllamaForRants is now MANDATORY - always enabled
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Download the AI model with progress updates (Ollama only)
ipcMain.handle('divine:downloadModel', async (event) => {
    try {
        console.log('[Divine] Starting model download...');
        const result = await ollamaManager.downloadModel((progress) => {
            // Send progress to renderer
            console.log('[Divine] Download progress:', progress.status, progress.percent + '%');
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('divine:downloadProgress', progress);
            }
        });
        console.log('[Divine] Download complete, result:', result);

        // Double-check model is actually available
        if (result) {
            const modelCheck = await ollamaManager.checkModel();
            console.log('[Divine] Post-download model check:', modelCheck);
            return { success: modelCheck.downloaded };
        }
        return { success: result };
    } catch (error) {
        console.error('[Divine] Download failed:', error.message);
        return { success: false, error: error.message };
    }
});

// Send a message to the Divine Assistant
ipcMain.handle('divine:sendMessage', async (event, message) => {
    try {
        // Update system context before sending (check what's installed)
        const flatpakInstalled = commandExistsSync('flatpak');
        const snapInstalled = commandExistsSync('snap');

        // Check for updates (Holy Updater status)
        let updatesAvailable = false;
        let behindCount = 0;
        try {
            const gitStatus = await execAsync('git fetch origin main && git rev-list HEAD..origin/main --count', {
                cwd: __dirname + '/..',
                timeout: 5000
            });
            if (!gitStatus.error && gitStatus.stdout) {
                behindCount = parseInt(gitStatus.stdout.trim(), 10) || 0;
                updatesAvailable = behindCount > 0;
            }
        } catch (e) {
            // Ignore git errors
        }

        // Set the context in Divine Assistant
        divineAssistant.setSystemContext({
            flatpakInstalled,
            snapInstalled,
            updatesAvailable,
            behindCount
        });

        let lastChunk = '';
        const result = await divineAssistant.sendMessage(message, (chunk, fullResponse) => {
            // Stream chunks to renderer for real-time display
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('divine:streamChunk', { chunk, fullResponse });
            }
            lastChunk = fullResponse;
        });
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Execute a command from the Divine Assistant
ipcMain.handle('divine:executeCommand', async (event, command, options = {}) => {
    try {
        const result = await commandExecutor.execute(command, {
            ...options,
            onOutput: (output) => {
                // Stream output to renderer
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('divine:commandOutput', output);
                }
            }
        });
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Open a URL
ipcMain.handle('divine:openUrl', async (event, url) => {
    try {
        const result = await commandExecutor.openUrl(url);
        return { success: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Check if a command is dangerous
ipcMain.handle('divine:isDangerous', async (event, command) => {
    return { isDangerous: commandExecutor.isDangerous(command) };
});

// Get greeting message
ipcMain.handle('divine:getGreeting', async () => {
    return { greeting: divineAssistant.getGreeting() };
});

// Clear conversation history
ipcMain.handle('divine:clearHistory', async () => {
    divineAssistant.clearHistory();
    return { success: true };
});

// Abort current Divine Assistant request
ipcMain.handle('divine:abort', async () => {
    divineAssistant.abort();
    return { success: true };
});

// Get command history
ipcMain.handle('divine:getCommandHistory', async (event, limit = 50) => {
    return { history: commandExecutor.getHistory(limit) };
});

// Get Ollama install instructions
ipcMain.handle('divine:getInstallInstructions', async () => {
    return ollamaManager.getInstallInstructions();
});

// ============================================
// VOICE OF GOD TTS IPC HANDLERS
// ============================================
let VoiceOfGod = null;
let TTS_DEFAULT_SETTINGS = {};
let voiceOfGod = null;

try {
    const ttsModule = require('./voice-of-god.cjs');
    VoiceOfGod = ttsModule.VoiceOfGod;
    TTS_DEFAULT_SETTINGS = ttsModule.DEFAULT_SETTINGS;
    console.log('[TTS] Voice of God module loaded successfully');
} catch (e) {
    console.error('[TTS] Failed to load voice-of-god.cjs:', e.message);
}

// Initialize VoiceOfGod lazily on first use
function getVoiceOfGod() {
    if (!voiceOfGod && VoiceOfGod) {
        console.log('[TTS] Initializing VoiceOfGod...');
        try {
            voiceOfGod = new VoiceOfGod();
            console.log('[TTS] VoiceOfGod initialized successfully');
        } catch (e) {
            console.error('[TTS] VoiceOfGod initialization failed:', e.message);
            return null;
        }
    }
    return voiceOfGod;
}

ipcMain.handle('tts:getStatus', async () => {
    const vog = getVoiceOfGod();
    if (!vog) return { available: false, error: 'TTS module not loaded' };
    return vog.getStatus();
});

ipcMain.handle('tts:getDefaults', async () => {
    return TTS_DEFAULT_SETTINGS;
});

ipcMain.handle('tts:speak', async (event, text) => {
    console.log('[IPC:TTS] tts:speak called with text length:', text?.length);
    const vog = getVoiceOfGod();
    if (!vog) {
        console.error('[IPC:TTS] VoiceOfGod not available');
        return { success: false, error: 'TTS module not loaded' };
    }
    try {
        const result = await vog.speak(text);
        console.log('[IPC:TTS] speak result:', result);
        return result;
    } catch (error) {
        console.error('[IPC:TTS] Speak error:', error.message);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('tts:speakLong', async (event, text) => {
    try {
        await getVoiceOfGod().speakLong(text, (progress) => {
            // Send progress updates to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('tts:progress', progress);
            }
        });
        return { success: true };
    } catch (error) {
        console.error('[IPC:TTS] SpeakLong error:', error.message);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('tts:stop', async () => {
    getVoiceOfGod().stop();
    return { success: true };
});

ipcMain.handle('tts:isSpeaking', async () => {
    return getVoiceOfGod().isSpeaking();
});

ipcMain.handle('tts:updateSettings', async (event, settings) => {
    getVoiceOfGod().updateSettings(settings);
    return { success: true, settings: getVoiceOfGod().getStatus().settings };
});

ipcMain.handle('tts:setEnabled', async (event, enabled) => {
    getVoiceOfGod().updateSettings({ enabled });
    return { success: true, enabled };
});

ipcMain.handle('tts:test', async () => {
    const testPhrase = "Blessed are those who hear the Word of God and keep it.";
    try {
        return await getVoiceOfGod().speak(testPhrase);
    } catch (error) {
        return { success: false, error: error.message };
    }
});

console.log('[TTS] TTS IPC handlers registered');

// ============================================
// X11 WINDOW BRIDGE IPC (EWMH via wmctrl/xprop)
// ============================================
function isValidXidHex(x) {
    return typeof x === 'string' && /^0x[0-9a-fA-F]+$/.test(x);
}


ipcMain.handle('x11:supported', async () => {
    return { success: true, supported: !!ewmhBridge?.supported };
});

ipcMain.handle('x11:getActiveWindow', async () => {
    if (!ewmhBridge?.supported) return { success: true, supported: false, xidHex: null };
    try {
        const xidHex = await getActiveWindowXidHex().catch(() => null);
        return { success: true, supported: true, xidHex };
    } catch (e) {
        return { success: false, supported: true, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('x11:getWindows', async () => {
    try {
        if (!ewmhBridge) return { success: true, supported: false, snapshot: enrichX11Snapshot({ supported: false, windows: [], activeXidHex: null, activeFullscreen: false }) };
        return { success: true, supported: true, snapshot: enrichX11Snapshot(ewmhBridge.getSnapshot()) };
    } catch (e) {
        return { success: false, supported: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('x11:activateWindow', async (event, xidHex) => {
    if (!ewmhBridge?.supported) return { success: false, unsupported: true, error: 'X11 bridge not available' };
    if (!isValidXidHex(xidHex)) return { success: false, error: 'Invalid X11 window id' };
    try {
        await ewmhBridge.activateWindow(xidHex);
        await ewmhBridge.refreshNow?.().catch((e) => console.warn('[X11] EWMH refresh after activate failed:', e.message));
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('x11:closeWindow', async (event, xidHex) => {
    if (!ewmhBridge?.supported) return { success: false, unsupported: true, error: 'X11 bridge not available' };
    if (!isValidXidHex(xidHex)) return { success: false, error: 'Invalid X11 window id' };
    try {
        await ewmhBridge.closeWindow(xidHex);
        await ewmhBridge.refreshNow?.().catch((e) => console.warn('[X11] EWMH refresh after close failed:', e.message));
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('x11:minimizeWindow', async (event, xidHex) => {
    if (!ewmhBridge?.supported) return { success: false, unsupported: true, error: 'X11 bridge not available' };
    if (!isValidXidHex(xidHex)) return { success: false, error: 'Invalid X11 window id' };
    try {
        await ewmhBridge.minimizeWindow(xidHex);
        await ewmhBridge.refreshNow?.().catch((e) => console.warn('[X11] EWMH refresh after minimize failed:', e.message));
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('x11:unminimizeWindow', async (event, xidHex) => {
    if (!ewmhBridge?.supported) return { success: false, unsupported: true, error: 'X11 bridge not available' };
    if (!isValidXidHex(xidHex)) return { success: false, error: 'Invalid X11 window id' };
    try {
        await ewmhBridge.unminimizeWindow(xidHex);
        await ewmhBridge.refreshNow?.().catch((e) => console.warn('[X11] EWMH refresh after unminimize failed:', e.message));
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('x11:setAlwaysOnTop', async (event, xidHex, enabled) => {
    if (!ewmhBridge?.supported) return { success: false, unsupported: true, error: 'X11 bridge not available' };
    if (!isValidXidHex(xidHex)) return { success: false, error: 'Invalid X11 window id' };
    try {
        await ewmhBridge.setAlwaysOnTop(xidHex, !!enabled);
        await ewmhBridge.refreshNow?.().catch((e) => console.warn('[X11] EWMH refresh after setAlwaysOnTop failed:', e.message));
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

// ============================================
// X11 VIRTUAL DESKTOP (WORKSPACE) IPC
// ============================================

/**
 * Switch to a specific X11 desktop (0-indexed)
 * This actually changes the visible X11 virtual desktop
 */
ipcMain.handle('x11:switchDesktop', async (event, desktopIndex) => {
    if (!isX11Session()) return { success: false, error: 'Not an X11 session' };
    try {
        const idx = Math.max(0, Math.trunc(Number(desktopIndex) || 0));
        await switchToDesktop(idx);
        console.log(`[X11 Workspaces] Switched to desktop ${idx}`);
        return { success: true, desktop: idx };
    } catch (e) {
        console.warn('[X11 Workspaces] Desktop switch failed:', e.message);
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

/**
 * Get the current X11 desktop number (0-indexed)
 */
ipcMain.handle('x11:getCurrentDesktop', async () => {
    if (!isX11Session()) return { success: true, desktop: 0, unsupported: true };
    try {
        const desktop = await getCurrentDesktop();
        return { success: true, desktop };
    } catch (e) {
        return { success: false, desktop: 0, error: e && e.message ? e.message : String(e) };
    }
});

/**
 * Get the total number of X11 desktops configured
 */
ipcMain.handle('x11:getDesktopCount', async () => {
    if (!isX11Session()) return { success: true, count: 4, unsupported: true };
    try {
        const count = await getDesktopCount();
        return { success: true, count };
    } catch (e) {
        return { success: false, count: 4, error: e && e.message ? e.message : String(e) };
    }
});

/**
 * Move an X11 window to a specific desktop
 * @param desktopIndex - 0-indexed desktop number, or -1 for all desktops (sticky)
 */
ipcMain.handle('x11:moveWindowToDesktop', async (event, xidHex, desktopIndex) => {
    if (!isX11Session()) return { success: false, error: 'Not an X11 session' };
    if (!isValidXidHex(xidHex)) return { success: false, error: 'Invalid X11 window id' };
    try {
        const idx = Math.trunc(Number(desktopIndex) || 0);
        await moveWindowToDesktop(xidHex, idx);
        console.log(`[X11 Workspaces] Moved window ${xidHex} to desktop ${idx}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});


// Core snap logic - shared between IPC handler and popup
async function snapX11WindowCore(xidHex, mode, taskbarConfig) {
    if (!ewmhBridge?.supported) return { success: false, unsupported: true, error: 'X11 bridge not available' };
    if (!isValidXidHex(xidHex)) return { success: false, error: 'Invalid X11 window id' };

    // CRITICAL: Protect Electron shell window from being snapped
    const normalizedXid = String(xidHex).toLowerCase();
    if (mainWindowXid && normalizedXid === mainWindowXid.toLowerCase()) {
        console.log('[snapX11WindowCore] BLOCKED: Cannot snap main Electron window');
        return { success: false, error: 'Cannot snap main window' };
    }
    if (x11IgnoreXids.has(normalizedXid)) {
        console.log('[snapX11WindowCore] BLOCKED: XID is in ignore list');
        return { success: false, error: 'Window is in ignore list' };
    }

    const m = String(mode || '').toLowerCase().trim();
    const primary = screen.getPrimaryDisplay();
    const bounds = primary?.bounds;
    const electronWorkArea = primary?.workArea; // Electron's work area (may account for panels)

    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
        return { success: false, error: 'No display bounds' };
    }

    // Calculate work area accounting for taskbar (unified in-renderer taskbar doesn't set X11 struts)
    const taskbarHeight = (taskbarConfig && typeof taskbarConfig.height === 'number') ? taskbarConfig.height : 50;
    const taskbarPosition = (taskbarConfig && (taskbarConfig.position === 'top' || taskbarConfig.position === 'bottom'))
        ? taskbarConfig.position
        : 'bottom';

    console.log(`[snapX11WindowCore] mode=${m}, taskbarHeight=${taskbarHeight}, taskbarPosition=${taskbarPosition}`);
    console.log(`[snapX11WindowCore] screen bounds: x=${bounds.x}, y=${bounds.y}, w=${bounds.width}, h=${bounds.height}`);
    console.log(`[snapX11WindowCore] electron workArea: x=${electronWorkArea?.x}, y=${electronWorkArea?.y}, w=${electronWorkArea?.width}, h=${electronWorkArea?.height}`);

    // Note: wmctrl with gravity 0 (Frame) sets the FRAME size.
    // We no longer need to subtract decorations manually.
    const decorationHeight = 0; // Was 28, set to 0 to rely on Frame gravity

    // SIMPLIFIED: Always calculate work area from screen bounds since our TempleOS
    // renderer-based taskbar does NOT set X11 struts. Ignore Electron's workArea.
    const wa = {
        x: bounds.x,
        y: taskbarPosition === 'top' ? bounds.y + taskbarHeight : bounds.y,
        width: bounds.width,
        height: bounds.height - taskbarHeight
    };

    console.log(`[snapX11WindowCore] final adjusted workArea: x=${wa.x}, y=${wa.y}, w=${wa.width}, h=${wa.height}`);

    // The actual client area height needs to account for decorations
    const clientHeight = wa.height - decorationHeight;

    // For vertically-split windows (top/bottom quarters), we need to split the work area
    // into two equal FRAME heights, then subtract decorations from each
    const halfFrameH = Math.max(1, Math.floor(wa.height / 2));
    const clientHalfH = Math.max(1, halfFrameH - decorationHeight);

    const halfW = Math.max(1, Math.floor(wa.width / 2));

    let x = wa.x;
    let y = wa.y;
    let w = wa.width;
    let h = clientHeight;

    try {
        // Ensure it's visible before snapping (also de-iconifies on most WMs).
        await ewmhBridge.activateWindow(xidHex).catch((e) => console.warn('[X11] activateWindow before snap failed:', e.message));

        if (m === 'maximize') {
            // For maximize, we need to set geometry manually instead of using WM maximize
            // because WM maximize ignores our custom work area
            if (ewmhBridge.setWindowGeometry) {
                // First remove any existing maximized state
                await execAsync(`wmctrl -ir ${xidHex} -b remove,maximized_vert,maximized_horz`, { timeout: 2000 }).catch((e) => console.warn('[X11] wmctrl unmaximize failed:', e.message));
                await ewmhBridge.setWindowGeometry(xidHex, wa.x, wa.y, wa.width, clientHeight);
            } else {
                await ewmhBridge.setMaximized?.(xidHex, true);
            }
        } else {
            switch (m) {
                case 'left':
                    x = wa.x; y = wa.y; w = halfW; h = clientHeight;
                    break;
                case 'right':
                    x = wa.x + (wa.width - halfW); y = wa.y; w = halfW; h = clientHeight;
                    break;
                case 'top':
                    x = wa.x; y = wa.y; w = wa.width; h = clientHalfH;
                    break;
                case 'bottom':
                    // Bottom window starts at the top of the bottom half frame
                    x = wa.x; y = wa.y + halfFrameH; w = wa.width; h = clientHalfH;
                    break;
                case 'topleft':
                    x = wa.x; y = wa.y; w = halfW; h = clientHalfH;
                    break;
                case 'topright':
                    x = wa.x + (wa.width - halfW); y = wa.y; w = halfW; h = clientHalfH;
                    break;
                case 'bottomleft':
                    // Bottom-left: starts at the top of the bottom half frame
                    x = wa.x; y = wa.y + halfFrameH; w = halfW; h = clientHalfH;
                    break;
                case 'bottomright':
                    // Bottom-right: starts at the top of the bottom half frame
                    x = wa.x + (wa.width - halfW); y = wa.y + halfFrameH; w = halfW; h = clientHalfH;
                    break;
                case 'center': {
                    const cw = Math.max(1, Math.floor(wa.width * 0.7));
                    const ch = Math.max(1, Math.floor(clientHeight * 0.8));
                    x = wa.x + Math.floor((wa.width - cw) / 2);
                    y = wa.y + Math.floor((clientHeight - ch) / 2);
                    w = cw;
                    h = ch;
                    break;
                }
                default:
                    return { success: false, error: 'Unknown snap mode' };
            }

            console.log(`[snapX11WindowCore] Setting geometry for ${xidHex}: x=${x}, y=${y}, w=${w}, h=${h}`);
            if (ewmhBridge.setWindowGeometry) {
                await ewmhBridge.setWindowGeometry(xidHex, x, y, w, h);
            } else {
                return { success: false, error: 'Snap not supported' };
            }
        }

        await ewmhBridge.refreshNow?.().catch((e) => console.warn('[X11] EWMH refresh after snap failed:', e.message));
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
}

ipcMain.handle('x11:snapWindow', async (event, xidHex, mode, taskbarConfig) => {
    return snapX11WindowCore(xidHex, mode, taskbarConfig);
});


// ============================================
// X11 SNAP LAYOUTS (Phase 1-4)
// ============================================

// IPC: Get/Set snap layouts enabled setting
ipcMain.handle('x11:getSnapLayoutsEnabled', async () => {
    return { success: true, enabled: x11SnapLayoutsEnabled };
});

ipcMain.handle('x11:setSnapLayoutsEnabled', async (event, enabled) => {
    x11SnapLayoutsEnabled = !!enabled;
    console.log('[X11 Snap Layouts]', enabled ? 'Enabled' : 'Disabled');

    // Start or stop the snap detector daemon
    if (enabled) {
        startSnapDetector();
    } else {
        stopSnapDetector();
        tilingModeActive = false;
        occupiedSlots.clear();
    }
    return { success: true };
});

// IPC: Set taskbar position (synced from renderer)
ipcMain.handle('settings:setTaskbarPosition', async (event, position) => {
    if (position === 'top' || position === 'bottom') {
        currentTaskbarPosition = position;
        console.log('[TaskbarSync] Position updated to:', position);
        return { success: true };
    }
    return { success: false, error: 'Invalid position' };
});

// IPC: Get tiling state for debugging
ipcMain.handle('x11:getTilingState', async () => {
    return {
        success: true,
        tilingModeActive,
        occupiedSlots: Object.fromEntries(occupiedSlots),
        mainWindowXid
    };
});

// IPC: Manually set slot (called when user snaps via right-click or drag)
ipcMain.handle('x11:setOccupiedSlot', async (event, xidHex, slot) => {
    console.log(`[X11 Snap Layouts] setOccupiedSlot called: xid=${xidHex}, slot=${slot}`);
    if (!xidHex) return { success: false, error: 'No XID provided' };
    const normalizedXid = String(xidHex).toLowerCase();

    // Ignore main window
    if (mainWindowXid && normalizedXid === mainWindowXid.toLowerCase()) {
        return { success: false, error: 'Cannot track main window' };
    }

    // Update slot tracking - track ALL slots including maximize
    if (!slot) {
        occupiedSlots.delete(normalizedXid);
        console.log(`[X11 Snap Layouts] Removed ${normalizedXid} from slots (empty slot)`);
    } else {
        occupiedSlots.set(normalizedXid, slot);
        // Activate tiling mode when user manually snaps to ANY slot (including maximize)
        tilingModeActive = true;
        console.log(`[X11 Snap Layouts] Tiling mode activated by user snap: ${slot}, occupiedSlots:`, Object.fromEntries(occupiedSlots));
    }

    return { success: true };
});

// IPC: Get next available slot for auto-tiling
ipcMain.handle('x11:getNextSlot', async () => {
    if (!x11SnapLayoutsEnabled || !tilingModeActive) {
        return { success: true, slot: 'maximize' };
    }

    const occupied = new Set(occupiedSlots.values());

    // Priority: fill halves first, then quadrants
    if (!occupied.has('left')) return { success: true, slot: 'left' };
    if (!occupied.has('right')) return { success: true, slot: 'right' };
    if (!occupied.has('topleft')) return { success: true, slot: 'topleft' };
    if (!occupied.has('topright')) return { success: true, slot: 'topright' };
    if (!occupied.has('bottomleft')) return { success: true, slot: 'bottomleft' };
    if (!occupied.has('bottomright')) return { success: true, slot: 'bottomright' };

    return { success: true, slot: 'maximize' }; // Overflow
});

// Snap Layouts Popup Window (alwaysOnTop to appear above X11 windows)
let snapPopupWindow = null;
let snapPopupXid = null;

function showSnapLayoutsPopup(xidHex) {
    // Close existing popup
    if (snapPopupWindow && !snapPopupWindow.isDestroyed()) {
        snapPopupWindow.close();
    }

    snapPopupXid = xidHex;

    // Get primary display dimensions for centering
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    const popupWidth = 560;   // Wide enough for all buttons (increased from 500)
    const popupHeight = 95;   // Compact height - fits content exactly
    // Ensure popup stays within screen bounds (clamp X position)
    const idealX = Math.round((screenWidth - popupWidth) / 2);
    const popupX = Math.max(10, Math.min(idealX, screenWidth - popupWidth - 10));
    const popupY = 40; // Below the very top so user can see it while dragging

    snapPopupWindow = new BrowserWindow({
        width: popupWidth,
        height: popupHeight,
        x: popupX,
        y: popupY,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    // HTML content for the popup - IMPROVED for drag-and-release
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; }
            body {
                font-family: 'Segoe UI', sans-serif;
                background: rgba(15, 25, 20, 0.98);
                border: 2px solid #00ff41;
                border-radius: 12px;
                padding: 10px 12px;
                color: #00ff41;
                text-align: center;
                user-select: none;
                -webkit-app-region: no-drag;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .title { font-size: 12px; margin-bottom: 8px; opacity: 0.9; font-weight: 500; }
            .grid { display: flex; gap: 10px; justify-content: center; flex-wrap: nowrap; }
            .option {
                width: 55px; height: 35px;
                border: 2px solid #00ff41;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.1s ease;
                background: rgba(0,255,65,0.08);
            }
            .option:hover, .option.active { 
                background: rgba(0,255,65,0.4); 
                transform: scale(1.12);
                border-color: #00ff88;
                box-shadow: 0 0 15px rgba(0,255,65,0.5);
            }
            .option .preview { width: 90%; height: 85%; border-radius: 3px; }
            .full { background: #00ff41; }
            .left { background: linear-gradient(90deg, #00ff41 50%, rgba(0,255,65,0.2) 50%); }
            .right { background: linear-gradient(90deg, rgba(0,255,65,0.2) 50%, #00ff41 50%); }
            .tl { background: linear-gradient(135deg, #00ff41 50%, rgba(0,255,65,0.15) 50%); background-size: 100% 100%; }
            .tr { background: linear-gradient(225deg, #00ff41 50%, rgba(0,255,65,0.15) 50%); background-size: 100% 100%; }
            .bl { background: linear-gradient(45deg, #00ff41 50%, rgba(0,255,65,0.15) 50%); background-size: 100% 100%; }
            .br { background: linear-gradient(315deg, #00ff41 50%, rgba(0,255,65,0.15) 50%); background-size: 100% 100%; }
            .close { position: absolute; top: 6px; right: 10px; cursor: pointer; font-size: 18px; opacity: 0.6; }
            .close:hover { opacity: 1; }
        </style>
    </head>
    <body>
        <div class="close" onclick="window.close()">×</div>
        <div class="title">Choose Snap Layout</div>
        <div class="grid">
            <!-- Order adjusted: Left group, then Maximize (center), then Right group -->
            <div class="option" data-mode="left" title="Left Half"><div class="preview left"></div></div>
            <div class="option" data-mode="topleft" title="Top-Left Quarter"><div class="preview tl"></div></div>
            <div class="option" data-mode="bottomleft" title="Bottom-Left Quarter"><div class="preview bl"></div></div>
            
            <div class="option" data-mode="maximize" title="Maximize"><div class="preview full"></div></div>
            
            <div class="option" data-mode="topright" title="Top-Right Quarter"><div class="preview tr"></div></div>
            <div class="option" data-mode="bottomright" title="Bottom-Right Quarter"><div class="preview br"></div></div>
            <div class="option" data-mode="right" title="Right Half"><div class="preview right"></div></div>
        </div>
        <script>
            const options = document.querySelectorAll('.option');
            
            // Click to select (for non-drag usage)
            options.forEach(opt => {
                opt.addEventListener('click', () => {
                    if (opt.dataset.mode) {
                        window.postMessage({ type: 'snap-select', mode: opt.dataset.mode }, '*');
                    }
                });
            });
            
            // Called from main process with screen coordinates during drag
            function highlightAtScreenPos(screenX, screenY) {
                // Read window position dynamically (was stale when captured at load)
                const winX = window.screenX || 0;
                const winY = window.screenY || 0;
                
                // Convert screen coords to window-relative coords
                const relX = screenX - winX;
                const relY = screenY - winY;
                
                // Find which option the mouse is over
                let foundOpt = null;
                options.forEach(opt => {
                    const rect = opt.getBoundingClientRect();
                    if (relX >= rect.left && relX <= rect.right &&
                        relY >= rect.top && relY <= rect.bottom) {
                        foundOpt = opt;
                    }
                });
                
                // Always clear all active states first
                options.forEach(opt => opt.classList.remove('active'));
                // Then add to found option (if any)
                if (foundOpt) {
                    foundOpt.classList.add('active');
                }
            }
            
            // Escape to close
            document.addEventListener('keydown', e => { if (e.key === 'Escape') window.close(); });
        </script>
    </body>
    </html>`;


    snapPopupWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    snapPopupWindow.once('ready-to-show', () => {
        if (snapPopupWindow && !snapPopupWindow.isDestroyed()) {
            snapPopupWindow.show();
        }
    });

    // Handle snap selection from popup
    snapPopupWindow.webContents.on('console-message', (e, level, msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === 'snap-select' && snapPopupXid) {
                // Perform the snap
                void snapX11WindowCore(snapPopupXid, data.mode, { height: TASKBAR_HEIGHT, position: currentTaskbarPosition }).then(() => {
                    // Track slot
                    if (data.mode !== 'maximize') {
                        tilingModeActive = true;
                    }
                    occupiedSlots.set(snapPopupXid.toLowerCase(), data.mode);
                });
                if (snapPopupWindow && !snapPopupWindow.isDestroyed()) {
                    snapPopupWindow.close();
                }
            }
        } catch { }
    });

    // Handle postMessage from renderer
    snapPopupWindow.webContents.on('did-finish-load', () => {
        if (snapPopupWindow && !snapPopupWindow.isDestroyed()) {
            snapPopupWindow.webContents.executeJavaScript(`
                window.addEventListener('message', e => {
                    if (e.data && e.data.type === 'snap-select') {
                        console.log(JSON.stringify(e.data));
                    }
                });
            `);
        }
    });

    // NOTE: No auto-close timeout - popup stays open until:
    // 1. User releases mouse on an option (snap_apply)
    // 2. User releases mouse outside popup (zone_leave closes it)
    // 3. User presses Escape
    // 4. User clicks the X button

    snapPopupWindow.on('closed', () => {
        snapPopupWindow = null;
        snapPopupXid = null;
    });
}

// ============================================
// X11 SNAP DETECTOR DAEMON (Windows 11 Style)
// ============================================
// Uses XQueryPointer polling to detect drag-to-edge gestures in real-time
// Works even during window manager grabs

function startSnapDetector() {
    if (snapDetectorProcess) return; // Already running
    if (!x11SnapLayoutsEnabled) return;
    if (process.platform !== 'linux') return;

    const scriptPath = path.join(__dirname, '..', 'scripts', 'snap-detector.py');

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
        console.error('[SnapDetector] Script not found:', scriptPath);
        return;
    }

    // Build protected XIDs list (main window)
    const protectedArgs = mainWindowXid ? ['--protected', mainWindowXid] : [];

    console.log('[SnapDetector] Starting daemon...', { scriptPath, protectedArgs });

    snapDetectorProcess = spawn('python3', [scriptPath, ...protectedArgs], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let buffer = '';

    snapDetectorProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
            if (!line.trim()) continue;
            console.log('[SnapDetector RAW]', line.substring(0, 200)); // Log raw input
            try {
                const event = JSON.parse(line);
                handleSnapDetectorEvent(event);
            } catch (e) {
                // Not JSON, probably debug output
                console.log('[SnapDetector] Non-JSON:', line.substring(0, 100));
            }
        }
    });

    snapDetectorProcess.stderr.on('data', (data) => {
        // Debug output from Python script
        console.log('[SnapDetector]', data.toString().trim());
    });

    snapDetectorProcess.on('close', (code) => {
        console.log('[SnapDetector] Process exited with code:', code);
        snapDetectorProcess = null;

        // Restart after delay if still enabled
        if (x11SnapLayoutsEnabled && !app.isQuitting) {
            setTimeout(() => {
                if (x11SnapLayoutsEnabled && !snapDetectorProcess) {
                    startSnapDetector();
                }
            }, 2000);
        }
    });

    snapDetectorProcess.on('error', (err) => {
        console.error('[SnapDetector] Process error:', err.message);
        snapDetectorProcess = null;
    });
}

function stopSnapDetector() {
    if (snapDetectorProcess) {
        snapDetectorProcess.kill();
        snapDetectorProcess = null;
    }
    closeSnapPreview();
}

function handleSnapDetectorEvent(event) {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    console.log(`[SnapDetector] Event received: ${event.event}`, JSON.stringify(event));

    switch (event.event) {
        case 'zone_enter':
            console.log(`[SnapDetector] Zone enter: ${event.zone} (xid: ${event.xid})`);
            if (event.zone === 'top') {
                // Top edge: Show the full snap layouts menu (Windows 11 style)
                showSnapLayoutsPopup(event.xid);
            } else {
                // Other edges: Show visual preview of where window will snap
                showSnapPreview(event.zone);
            }
            break;

        case 'zone_leave':
            console.log('[SnapDetector] Zone leave');
            closeSnapPreview();
            break;

        case 'drag_position':
            // Real-time mouse position while dragging in top zone
            // Forward to popup for hover highlighting
            if (snapPopupWindow && !snapPopupWindow.isDestroyed()) {
                const px = event.x;
                const py = event.y;
                // Execute JS directly in popup to update highlight
                snapPopupWindow.webContents.executeJavaScript(
                    `if (typeof highlightAtScreenPos === 'function') highlightAtScreenPos(${px}, ${py});`
                ).catch((e) => console.warn('[Snap] Popup highlight update failed:', e.message)); // Ignore errors if popup closed
            }
            break;

        case 'snap_apply':
            console.log(`[SnapDetector] Snap apply: ${event.zone} -> ${event.xid}`);
            closeSnapPreview();

            // For TOP zone: Check if mouse is over popup window and which option
            if (event.zone === 'top' && snapPopupWindow && !snapPopupWindow.isDestroyed()) {
                // Get popup bounds
                const popupBounds = snapPopupWindow.getBounds();
                const mouseX = event.x;
                const mouseY = event.y;

                // Check if mouse is inside popup
                if (mouseX >= popupBounds.x && mouseX <= popupBounds.x + popupBounds.width &&
                    mouseY >= popupBounds.y && mouseY <= popupBounds.y + popupBounds.height) {

                    // Calculate which option based on mouse position
                    // Popup layout: 7 options in a single row, centered via flexbox
                    // Popup width = 560px, total options width = 7 * 65px = 455px
                    // Centered offset = (560 - 455) / 2 ≈ 52px
                    const relX = mouseX - popupBounds.x;
                    const relY = mouseY - popupBounds.y;

                    // Options are in a row, check if mouse is in the option area (y: ~40-100px)
                    if (relY >= 30 && relY <= 110) {
                        // Calculate which option (0-6)
                        const popupContentWidth = popupBounds.width - 24; // Account for body padding (12px each side)
                        const optionWidth = 65;   // 55px button + 10px gap
                        const totalOptionsWidth = 7 * optionWidth - 10; // 7 options, minus last gap
                        const optionStartX = 12 + (popupContentWidth - totalOptionsWidth) / 2; // Centered
                        const optionIndex = Math.floor((relX - optionStartX) / optionWidth);

                        const modes = ['left', 'topleft', 'bottomleft', 'maximize', 'topright', 'bottomright', 'right'];
                        if (optionIndex >= 0 && optionIndex < modes.length) {
                            const selectedMode = modes[optionIndex];
                            console.log(`[SnapDetector] Released on popup option: ${selectedMode}`);
                            closeSnapLayoutsPopup();

                            if (event.xid) {
                                snapX11WindowCore(event.xid, selectedMode, { height: TASKBAR_HEIGHT, position: currentTaskbarPosition })
                                    .then(() => {
                                        if (selectedMode !== 'maximize') {
                                            tilingModeActive = true;
                                            console.log(`[SnapDetector Popup] Activated tiling mode for mode: ${selectedMode}`);
                                        }
                                        occupiedSlots.set(event.xid.toLowerCase(), selectedMode);
                                        console.log(`[SnapDetector Popup] Snapped ${event.xid} to ${selectedMode}, occupiedSlots now:`, Object.fromEntries(occupiedSlots), `tilingModeActive: ${tilingModeActive}`);
                                    })
                                    .catch(err => console.error('[SnapDetector] Snap error:', err));
                            }
                            break;  // Don't fall through to default maximize
                        }
                    }
                }

                // Mouse was released in top zone but not on popup - just close popup
                closeSnapLayoutsPopup();
                console.log('[SnapDetector] Released in top zone but not on popup option');
                break;
            }

            closeSnapLayoutsPopup();

            // Map zone names to snap modes (for non-top zones)
            const zoneToMode = {
                'top': 'maximize',
                'left': 'left',
                'right': 'right',
                'topleft': 'topleft',
                'topright': 'topright',
                'bottomleft': 'bottomleft',
                'bottomright': 'bottomright'
            };
            const mode = zoneToMode[event.zone] || 'maximize';

            if (event.xid) {
                console.log(`[SnapDetector] About to snap ${event.xid} to mode ${mode}`);
                // Apply the snap
                snapX11WindowCore(event.xid, mode, { height: TASKBAR_HEIGHT, position: currentTaskbarPosition })
                    .then(() => {
                        // Track slot for tiling - ALWAYS set tilingModeActive for non-maximize
                        if (mode !== 'maximize') {
                            tilingModeActive = true;
                            console.log(`[SnapDetector] Activated tiling mode for mode: ${mode}`);
                        }
                        const normalizedXid = String(event.xid).toLowerCase();
                        occupiedSlots.set(normalizedXid, mode);
                        console.log(`[SnapDetector] SUCCESS: Snapped ${event.xid} (normalized: ${normalizedXid}) to ${mode}`);
                        console.log(`[SnapDetector] occupiedSlots now:`, Object.fromEntries(occupiedSlots));
                        console.log(`[SnapDetector] tilingModeActive: ${tilingModeActive}`);
                    })
                    .catch(err => {
                        console.error('[SnapDetector] Snap FAILED:', err);
                    });
            } else {
                console.log(`[SnapDetector] No XID in event, cannot snap`);
            }
            break;

        case 'drag_end':
            console.log('[SnapDetector] Drag ended (no zone)');
            closeSnapPreview();
            break;

        case 'error':
            console.error('[SnapDetector] Error:', event.message);
            break;
    }
}

// Visual preview window for edge snaps
function showSnapPreview(zone) {
    closeSnapPreview();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds;
    const taskbarHeight = TASKBAR_HEIGHT;
    const taskbarPosition = currentTaskbarPosition;
    // Decoration height - the preview shows where the TOTAL window (including decorations) will be
    const decorationHeight = 28;
    // Work area height (excluding taskbar)
    const workHeight = screenHeight - taskbarHeight;
    // Visual height for preview (where the whole window including decorations will fit)
    const visualHeight = workHeight;
    const halfVisualH = Math.floor(visualHeight / 2);

    // Starting Y position depends on taskbar position
    const workAreaY = taskbarPosition === 'top' ? taskbarHeight : 0;

    // Calculate preview bounds based on zone
    let x = 0, y = workAreaY, w = screenWidth, h = visualHeight;

    switch (zone) {
        case 'left':
            w = Math.floor(screenWidth / 2);
            break;
        case 'right':
            x = Math.floor(screenWidth / 2);
            w = Math.floor(screenWidth / 2);
            break;
        case 'topleft':
            w = Math.floor(screenWidth / 2);
            h = halfVisualH;
            break;
        case 'topright':
            x = Math.floor(screenWidth / 2);
            w = Math.floor(screenWidth / 2);
            h = halfVisualH;
            break;
        case 'bottomleft':
            w = Math.floor(screenWidth / 2);
            y = workAreaY + halfVisualH;
            h = halfVisualH;
            break;
        case 'bottomright':
            x = Math.floor(screenWidth / 2);
            w = Math.floor(screenWidth / 2);
            y = workAreaY + halfVisualH;
            h = halfVisualH;
            break;
    }


    snapPreviewWindow = new BrowserWindow({
        x, y, width: w, height: h,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        resizable: false,
        hasShadow: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    const previewHtml = `<!DOCTYPE html><html><head><style>
        * { margin: 0; padding: 0; }
        body {
            background: rgba(0, 255, 65, 0.15);
            border: 3px solid rgba(0, 255, 65, 0.8);
            border-radius: 8px;
            width: 100vw;
            height: 100vh;
            box-sizing: border-box;
        }
    </style></head><body></body></html>`;

    snapPreviewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHtml));
    snapPreviewWindow.showInactive();

    // Ensure it doesn't steal focus
    snapPreviewWindow.setIgnoreMouseEvents(true);
}

function closeSnapPreview() {
    if (snapPreviewWindow && !snapPreviewWindow.isDestroyed()) {
        try { snapPreviewWindow.destroy(); } catch { }
    }
    snapPreviewWindow = null;
}

function closeSnapLayoutsPopup() {
    if (snapPopupWindow && !snapPopupWindow.isDestroyed()) {
        try { snapPopupWindow.close(); } catch { }
    }
}

// Track previously seen X11 windows for detecting new window arrivals
let previousX11Xids = new Set();
// Cooldown to avoid re-snapping windows that were just snapped (e.g. during rapid open/close)
const recentlySnappedXids = new Map(); // xidHex -> timestamp
const AUTO_SNAP_COOLDOWN_MS = 2000;

// Get next available slot for auto-tiling (same logic as IPC handler)
function getNextAvailableSlot() {
    if (!x11SnapLayoutsEnabled) {
        return 'maximize';
    }

    const slots = Array.from(occupiedSlots.values());

    // If no windows are tracked yet, or ALL existing windows are maximized, new windows should also be maximized
    if (slots.length === 0 || slots.every(s => s === 'maximize')) {
        console.log('[X11 Snap Layouts] All existing windows are maximized (or none tracked), new window will maximize too');
        return 'maximize';
    }

    const occupied = new Set(slots);

    // Priority: fill halves first, then quadrants
    if (!occupied.has('left')) return 'left';
    if (!occupied.has('right')) return 'right';
    if (!occupied.has('topleft')) return 'topleft';
    if (!occupied.has('topright')) return 'topright';
    if (!occupied.has('bottomleft')) return 'bottomleft';
    if (!occupied.has('bottomright')) return 'bottomright';

    return 'maximize'; // Overflow
}

// Infer what slot a window occupies based on its geometry
function inferSlotFromGeometry(w, workArea) {
    if (!w || !workArea) return null;

    const { x, y, width, height } = w;
    const wa = workArea;
    const tolerance = 100; // Generous tolerance for WM decoration differences and manual snapping
    const heightTolerance = 150; // Extra tolerance for height (decorations vary more)
    const titleBarHeight = 30; // Approximate title bar height - client Y will be offset by this

    // Check if near work area edges
    // For X position, client area and frame are usually the same (minimal side borders)
    const nearLeft = Math.abs(x - wa.x) < tolerance;
    const nearRight = Math.abs((x + width) - (wa.x + wa.width)) < tolerance;
    // For Y position, client area starts BELOW title bar, so account for that offset
    const nearTop = (y - titleBarHeight) < wa.y + tolerance && y < wa.y + tolerance + titleBarHeight;
    const nearBottom = Math.abs((y + height) - (wa.y + wa.height)) < heightTolerance;

    const halfWidth = wa.width / 2;
    const halfHeight = wa.height / 2;
    const isHalfWidth = Math.abs(width - halfWidth) < tolerance;
    const isFullWidth = Math.abs(width - wa.width) < tolerance;
    const isHalfHeight = Math.abs(height - halfHeight) < heightTolerance;
    // More lenient check for "full height" - client height will be less than work area due to title bar
    // A snapped window's client height is typically workArea.height - titleBar (~718-28 = 690 for 768-50 work area)
    const expectedClientHeight = wa.height - titleBarHeight;
    const isFullHeight = Math.abs(height - expectedClientHeight) < heightTolerance ||
        Math.abs(height - wa.height) < heightTolerance ||
        height >= (wa.height * 0.80); // At least 80% of work area
    // Also check if window spans most of the vertical area
    const spansVertical = nearTop && (nearBottom || (y + height >= wa.y + wa.height - heightTolerance));

    // Debug: Log geometry comparison
    console.log(`[inferSlot] Window: x=${x}, y=${y}, w=${width}, h=${height}`);
    console.log(`[inferSlot] WorkArea: x=${wa.x}, y=${wa.y}, w=${wa.width}, h=${wa.height}`);
    console.log(`[inferSlot] expectedClientHeight=${expectedClientHeight}, titleBarHeight=${titleBarHeight}`);
    console.log(`[inferSlot] nearLeft=${nearLeft}, nearRight=${nearRight}, nearTop=${nearTop}, nearBottom=${nearBottom}`);
    console.log(`[inferSlot] isHalfWidth=${isHalfWidth}, isFullWidth=${isFullWidth}, isHalfHeight=${isHalfHeight}, isFullHeight=${isFullHeight}, spansVertical=${spansVertical}`);

    // Maximize: full width and height, near top-left
    if (isFullWidth && (isFullHeight || spansVertical) && nearLeft && nearTop) {
        return 'maximize';
    }

    // Left half - window at left edge, half width, spans vertically
    if (isHalfWidth && (isFullHeight || spansVertical) && nearLeft && nearTop) {
        return 'left';
    }

    // Right half - window at right edge, half width, spans vertically
    if (isHalfWidth && (isFullHeight || spansVertical) && nearRight && nearTop) {
        return 'right';
    }

    // Quadrants
    if (isHalfWidth && isHalfHeight) {
        if (nearLeft && nearTop) return 'topleft';
        if (nearRight && nearTop) return 'topright';
        if (nearLeft && nearBottom) return 'bottomleft';
        if (nearRight && nearBottom) return 'bottomright';
    }

    return null; // No recognized snap position
}

// Calculate the actual work area accounting for taskbar (which doesn't set X11 struts)
function getAdjustedWorkArea() {
    const primary = screen.getPrimaryDisplay();
    const bounds = primary?.bounds;

    if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
        return null;
    }

    // SIMPLIFIED: Always use screen bounds since our TempleOS taskbar doesn't set X11 struts
    const taskbarHeight = TASKBAR_HEIGHT;
    const taskbarPosition = currentTaskbarPosition;

    return {
        x: bounds.x,
        y: taskbarPosition === 'top' ? bounds.y + taskbarHeight : bounds.y,
        width: bounds.width,
        height: bounds.height - taskbarHeight
    };
}

// Track window closures AND detect new windows to auto-snap
function updateOccupiedSlotsFromSnapshot(snapshot) {
    if (!snapshot?.windows) return;

    const currentXids = new Set(snapshot.windows.map(w => String(w.xidHex).toLowerCase()));

    // Remove closed windows from tracking
    for (const [xid] of occupiedSlots) {
        if (!currentXids.has(xid)) {
            occupiedSlots.delete(xid);
            console.log('[X11 Snap Layouts] Removed closed window from slots:', xid);
        }
    }

    // Clean up old entries from recentlySnappedXids
    const now = Date.now();
    for (const [xid, timestamp] of recentlySnappedXids) {
        if (now - timestamp > AUTO_SNAP_COOLDOWN_MS) {
            recentlySnappedXids.delete(xid);
        }
    }

    // Debug: Log current state
    console.log(`[X11 Snap Layouts] State check: enabled=${x11SnapLayoutsEnabled}, tilingActive=${tilingModeActive}, occupiedSlots=${JSON.stringify(Object.fromEntries(occupiedSlots))}`);

    // Use our adjusted work area (accounts for Electron taskbar) instead of X11 work area
    const adjustedWorkArea = getAdjustedWorkArea();
    if (adjustedWorkArea) {
        console.log(`[X11 Snap Layouts] Adjusted WorkArea (taskbar-aware): x=${adjustedWorkArea.x}, y=${adjustedWorkArea.y}, w=${adjustedWorkArea.width}, h=${adjustedWorkArea.height}`);
    } else {
        console.log(`[X11 Snap Layouts] WARNING: Could not get adjusted work area!`);
    }

    // Infer slots from window geometry ONLY for windows we've already seen
    // This detects manual snapping by the user (e.g., user drags window to left edge)
    // NEW windows should NOT be processed here - they are handled by the new window detection loop below
    if (x11SnapLayoutsEnabled && adjustedWorkArea) {
        for (const w of snapshot.windows) {
            const xid = String(w.xidHex).toLowerCase();
            if (!xid) continue;

            // Skip main window
            if (mainWindowXid && xid === mainWindowXid.toLowerCase()) continue;

            // IMPORTANT: Skip NEW windows - they should be handled by new window detection, not inference
            // This prevents a new window's initial random position from being "inferred" as a snap slot
            if (!previousX11Xids.has(xid)) continue;

            // Skip minimized windows
            if (w.minimized) continue;

            // Skip windows without geometry
            if (w.x === undefined || w.y === undefined || w.width === undefined || w.height === undefined) {
                console.log(`[X11 Snap Layouts] Window ${xid} (${w.wmClass || w.title}) has no geometry data`);
                continue;
            }

            // Log window geometry for debugging
            console.log(`[X11 Snap Layouts] Window ${xid} (${w.wmClass || w.title}) geometry: x=${w.x}, y=${w.y}, w=${w.width}, h=${w.height}`);

            // Try to infer the slot from the window's current position using taskbar-adjusted work area
            const inferredSlot = inferSlotFromGeometry(w, adjustedWorkArea);
            console.log(`[X11 Snap Layouts] Window ${xid} inferred slot: ${inferredSlot || 'null (no match)'}`);

            if (inferredSlot) {
                const previousSlot = occupiedSlots.get(xid);

                // Update the slot if it changed (user manually moved/snapped the window)
                if (previousSlot !== inferredSlot) {
                    occupiedSlots.set(xid, inferredSlot);
                    console.log(`[X11 Snap Layouts] Window ${xid} (${w.wmClass || w.title}) slot changed: ${previousSlot || 'none'} -> ${inferredSlot}`);

                    // If user manually snapped to a non-maximize position, activate tiling mode
                    if (inferredSlot !== 'maximize') {
                        if (!tilingModeActive) {
                            tilingModeActive = true;
                            console.log(`[X11 Snap Layouts] Tiling mode ACTIVATED by manual snap detection (${inferredSlot})`);
                        }
                    }
                }
            } else if (!occupiedSlots.has(xid)) {
                // Window not in a recognized snap position and not tracked - could be floating
                // Don't track it yet, wait until it's snapped or a new window needs to know
            }
        }
    }

    // Detect NEW windows (not seen in previous snapshot) and auto-snap them
    // By default, new windows maximize. Only use tiling slots if user has manually
    // snapped a window to a half/quarter position (indicating they want tiling).
    if (x11SnapLayoutsEnabled) {
        for (const w of snapshot.windows) {
            const xid = String(w.xidHex).toLowerCase();
            if (!xid) continue;

            // Skip main window
            if (mainWindowXid && xid === mainWindowXid.toLowerCase()) continue;

            // Skip windows we've already seen
            if (previousX11Xids.has(xid)) continue;

            // Skip windows already in occupiedSlots
            if (occupiedSlots.has(xid)) continue;

            // Skip recently snapped windows (cooldown)
            if (recentlySnappedXids.has(xid)) continue;

            // Skip minimized windows
            if (w.minimized) continue;

            // Skip alwaysOnTop windows (popups, menus, dialogs, etc.)
            if (w.alwaysOnTop) {
                console.log(`[X11 Snap Layouts] Skipping alwaysOnTop window: ${xid} (${w.wmClass || w.title})`);
                continue;
            }

            // This is a NEW window - determine what slot to use
            // Use tiling slots if any existing window is in a non-maximize position
            const existingSlots = Array.from(occupiedSlots.values());
            const hasTilingSlots = existingSlots.some(s => s && s !== 'maximize');

            let slot;
            if (hasTilingSlots) {
                // At least one window is in a tiling position - find next available slot
                slot = getNextAvailableSlot();
                console.log(`[X11 Snap Layouts] Tiling detected with slots: ${JSON.stringify(existingSlots)}, next slot: ${slot}`);
            } else {
                // Default: maximize new windows (all existing windows are maximized or none tracked)
                slot = 'maximize';
            }

            console.log(`[X11 Snap Layouts] New window detected: ${xid} (${w.wmClass || w.title}), snapping to: ${slot} (tilingActive=${tilingModeActive}, hasTilingSlots=${hasTilingSlots}, existingSlots=${JSON.stringify(existingSlots)})`);

            // Mark as recently snapped to avoid re-snapping
            recentlySnappedXids.set(xid, now);

            // Delay the snap slightly to let the window fully appear and settle
            const xidToSnap = w.xidHex;
            setTimeout(() => {
                // Snap the window with proper taskbar config
                snapX11WindowCore(xidToSnap, slot, { height: TASKBAR_HEIGHT, position: currentTaskbarPosition })
                    .then((result) => {
                        if (result.success) {
                            // Track the slot
                            occupiedSlots.set(xid, slot);
                            console.log(`[X11 Snap Layouts] Auto-snapped ${xid} to ${slot}`);
                        } else {
                            console.error(`[X11 Snap Layouts] Failed to auto-snap ${xid}:`, result.error);
                        }
                    })
                    .catch((err) => {
                        console.error(`[X11 Snap Layouts] Error auto-snapping ${xid}:`, err.message);
                    });
            }, 300); // 300ms delay for window to settle
        }
    }

    // Update previous XIDs for next comparison
    previousX11Xids = currentXids;

    // If no more slots occupied, disable tiling mode
    if (occupiedSlots.size === 0 && tilingModeActive) {
        tilingModeActive = false;
        console.log('[X11 Snap Layouts] Tiling mode deactivated (no occupied slots)');
    }
}

// Shell policies (panel hide / gaming mode)
ipcMain.handle('shell:getPanelPolicy', async () => {
    return { success: true, policy: { hideOnFullscreen: !!panelPolicy.hideOnFullscreen, forceHidden: !!panelPolicy.forceHidden } };
});

ipcMain.handle('shell:setHideBarOnFullscreen', async (event, enabled) => {
    panelPolicy.hideOnFullscreen = !!enabled;
    try {
        await applyPanelPolicyFromSnapshot(ewmhBridge?.getSnapshot?.() || { activeFullscreen: false });
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('shell:setGamingMode', async (event, enabled) => {
    panelPolicy.forceHidden = !!enabled;
    try {
        await applyPanelPolicyFromSnapshot(ewmhBridge?.getSnapshot?.() || { activeFullscreen: false });
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('shell:hasExternalPanel', async () => {
    // UNIFIED TASKBAR: Panel window is disabled; the in-renderer taskbar handles X11 windows.
    return { success: true, enabled: false };
});

// Panel -> Desktop (forward UI actions to the main window renderer)
ipcMain.handle('panel:toggleStartMenu', async () => {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) return { success: false, error: 'Main window not available' };
        mainWindow.webContents.send('shell:toggleStartMenu', {});
        try { mainWindow.focus(); } catch { }
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

// ============================================
// CONTEXT MENU POPUP (Floating alwaysOnTop window)
// ============================================
let contextPopupBusy = false; // Mutex to prevent multiple popups
let contextPollInterval = null;

function closeContextPopupSync() {
    if (contextPollInterval) {
        clearInterval(contextPollInterval);
        contextPollInterval = null;
    }
    if (contextPopup && !contextPopup.isDestroyed()) {
        try {
            contextPopup.destroy(); // Force destroy, don't wait for close
        } catch { }
    }
    contextPopup = null;
}

function buildContextMenuHtml(items) {
    const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const itemsHtml = items.map((item) => {
        if (item.divider) {
            return `<div class="ctx-divider"></div>`;
        }
        return `<div class="ctx-item" data-action-id="${escapeHtml(item.id)}">${escapeHtml(item.label)}</div>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:rgba(13,17,23,0.98);border:1px solid rgba(0,255,65,0.3);border-radius:6px;overflow:hidden;font-family:'VT323','Noto Color Emoji',monospace;padding:2px 0}
.ctx-item{height:32px;padding:0 14px;display:flex;align-items:center;cursor:pointer;color:#00ff41;font-size:16px;user-select:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background 0.1s}
.ctx-item:hover{background:rgba(0,255,65,0.15)}
.ctx-divider{height:1px;background:rgba(0,255,65,0.2);margin:4px 8px}
</style></head><body>${itemsHtml}</body></html>`;
}

ipcMain.handle('contextmenu:show', async (event, { x, y, items }) => {
    // Prevent multiple simultaneous popups
    if (contextPopupBusy) {
        return { success: false, error: 'Busy' };
    }
    contextPopupBusy = true;

    try {
        // Force-close any existing popup immediately
        closeContextPopupSync();

        if (!items || items.length === 0) {
            contextPopupBusy = false;
            return { success: false, error: 'No items' };
        }

        // Calculate popup size (must match CSS precisely)
        const itemHeight = 32;
        const totalPadding = 10; // 2px border + 4px body-padding + 4px extra safety
        const width = 250;
        const dividerCount = items.filter(i => i.divider).length;
        const height = (items.length - dividerCount) * itemHeight + dividerCount * 9 + totalPadding;

        // Position above click point (taskbar), adjusted for screen bounds
        const primary = screen.getPrimaryDisplay();
        let posX = Math.round(x);
        let posY = Math.round(y - height);

        // Keep on screen
        if (posX + width > primary.bounds.x + primary.bounds.width) {
            posX = primary.bounds.x + primary.bounds.width - width - 10;
        }
        if (posX < primary.bounds.x) posX = primary.bounds.x + 10;
        if (posY < primary.bounds.y) posY = primary.bounds.y + 10;

        contextPopup = new BrowserWindow({
            x: posX,
            y: posY,
            width,
            height,
            frame: false,
            resizable: false,
            movable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            focusable: true,
            show: false,
            transparent: true,
            hasShadow: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        const html = buildContextMenuHtml(items);

        // Use loadURL without waiting for complete load - show immediately
        contextPopup.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Show immediately, don't wait for ready-to-show
        contextPopup.showInactive();
        setTimeout(() => {
            if (contextPopup && !contextPopup.isDestroyed()) {
                contextPopup.focus();
            }
        }, 10);

        // Set up click handling once content is loaded
        contextPopup.webContents.once('did-finish-load', async () => {
            if (!contextPopup || contextPopup.isDestroyed()) return;

            try {
                await contextPopup.webContents.executeJavaScript(`
                    document.body.addEventListener('click', (e) => {
                        const item = e.target.closest('.ctx-item');
                        if (item && item.dataset.actionId) {
                            window.__selectedActionId = item.dataset.actionId;
                        }
                    });
                    true;
                `);
            } catch { }
        });

        // Poll for click with faster interval
        contextPollInterval = setInterval(async () => {
            if (!contextPopup || contextPopup.isDestroyed()) {
                closeContextPopupSync();
                contextPopupBusy = false;
                return;
            }
            try {
                const actionId = await contextPopup.webContents.executeJavaScript('window.__selectedActionId || null');
                if (actionId) {
                    // Broadcast action to main window
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('contextmenu:executeAction', actionId);
                    }
                    closeContextPopupSync();
                    contextPopupBusy = false;
                }
            } catch {
                closeContextPopupSync();
                contextPopupBusy = false;
            }
        }, 16); // ~60fps polling

        // Close on blur (clicking outside)
        contextPopup.on('blur', () => {
            // Small delay so click on menu item can register before blur closes it
            setTimeout(() => {
                closeContextPopupSync();
                contextPopupBusy = false;
            }, 50);
        });

        contextPopup.on('closed', () => {
            closeContextPopupSync();
            contextPopupBusy = false;
        });

        return { success: true };
    } catch (e) {
        closeContextPopupSync();
        contextPopupBusy = false;
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('contextmenu:close', async () => {
    closeContextPopupSync();
    contextPopupBusy = false;
    return { success: true };
});

ipcMain.handle('contextmenu:action', async (event, actionId) => {
    try {
        // Broadcast action to main window
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('contextmenu:executeAction', actionId);
        }
        closeContextPopupSync();
        contextPopupBusy = false;
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

// ============================================
// START MENU POPUP (Floating alwaysOnTop window for X11)
// ============================================
let startMenuPopup = null;
let startMenuPollInterval = null;

function closeStartMenuPopupSync() {
    if (startMenuPollInterval) {
        clearInterval(startMenuPollInterval);
        startMenuPollInterval = null;
    }
    if (startMenuPopup && !startMenuPopup.isDestroyed()) {
        try {
            startMenuPopup.destroy();
        } catch { }
    }
    startMenuPopup = null;
}

function buildStartMenuHtml(config) {
    const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const pinnedApps = config.pinnedApps || [];
    const installedApps = (config.installedApps || []).slice(0, 30);

    const pinnedHtml = pinnedApps.map(app => `
        <div class="sm-app pinned" data-action="launch" data-key="${escapeHtml(app.key)}">
            <span class="sm-icon${app.iconUrl ? ' has-img' : ''}" data-fallback="${escapeHtml(app.icon)}">${app.iconUrl
            ? `<img src="${escapeHtml(app.iconUrl)}" alt="" class="pinned-app-icon-img" draggable="false" onerror="this.style.display='none';this.parentElement.classList.remove('has-img');this.parentElement.textContent=this.parentElement.dataset.fallback||'?';">`
            : escapeHtml(app.icon)}</span>
            <span class="sm-name">${escapeHtml(app.name)}</span>
        </div>
    `).join('');

    const installedHtml = installedApps.map(app => {
        const fallback = escapeHtml(app.icon || app.name.charAt(0).toUpperCase());
        return `
        <div class="sm-app installed" data-action="launch" data-key="${escapeHtml(app.key)}" data-category="${escapeHtml(app.category || 'Utilities')}">
            <span class="sm-icon${app.iconUrl ? ' has-img' : ''}" data-fallback="${fallback}">${app.iconUrl
                ? `<img src="${escapeHtml(app.iconUrl)}" alt="" class="installed-app-icon-img" draggable="false" onerror="this.style.display='none';this.parentElement.classList.remove('has-img');this.parentElement.textContent=this.parentElement.dataset.fallback||'?';">`
                : fallback}</span>
            <div class="sm-app-info">
                <span class="sm-name">${escapeHtml(app.name)}</span>
                <span class="sm-comment">${app.comment ? escapeHtml(app.comment) : 'Application'}</span>
            </div>
        </div>
    `}).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="https://unpkg.com/@phosphor-icons/web"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Noto+Color+Emoji&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
html { background: transparent; height: 100vh; overflow: hidden; }
body {
    background: rgba(8, 20, 12, 0.95);
    border: 1px solid #00ff41;
    border-radius: 8px;
    margin: 15px; /* Space for glow */
    height: calc(100vh - 30px);
    overflow: hidden;
    font-family: 'VT323', 'Noto Color Emoji', monospace;
    color: #00ff41;
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.4), 0 0 10px rgba(0, 255, 65, 0.2) inset;
}
.sm-container { display: flex; height: 100%; }

.sm-left { flex: 1; display: flex; flex-direction: column; border-right: 1px solid rgba(0, 255, 65, 0.2); overflow: hidden; }
.sm-right { width: 200px; display: flex; flex-direction: column; background: rgba(0, 0, 0, 0.2); }

.sm-header { padding: 15px; border-bottom: 1px solid rgba(0, 255, 65, 0.2); }
.sm-search-container { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.sm-search-input {
    flex: 1; padding: 10px 15px; background: rgba(0, 255, 65, 0.1); border: 1px solid rgba(0, 255, 65, 0.3);
    border-radius: 6px; color: #00ff41; font-size: 16px; outline: none; font-family: inherit;
}
.sm-search-input:focus { border-color: #00ff41; box-shadow: 0 0 10px rgba(0, 255, 65, 0.3); }
.sm-search-input::placeholder { color: rgba(0, 255, 65, 0.5); font-style: italic; }

.sm-all-apps-btn {
    padding: 0 15px; height: 40px; background: rgba(0, 255, 65, 0.1); border: 1px solid rgba(0, 255, 65, 0.3);
    border-radius: 6px; color: #00ff41; font-family: inherit; font-size: 14px; cursor: pointer; transition: all 0.15s ease;
    display: flex; align-items: center; gap: 8px; white-space: nowrap;
}
.sm-all-apps-btn:hover { background: rgba(0, 255, 65, 0.2); border-color: #00ff41; box-shadow: 0 0 10px rgba(0, 255, 65, 0.2); }

.sm-dropdowns { display: none !important; } /* Hide dropdowns for cleaner look */

.sm-section { padding: 10px 15px; overflow-y: auto; flex: 1; }
.sm-section::-webkit-scrollbar { width: 8px; }
.sm-section::-webkit-scrollbar-track { background: transparent; }
.sm-section::-webkit-scrollbar-thumb { background: rgba(0, 255, 65, 0.3); border-radius: 4px; }

.sm-section h3 {
    font-size: 12px; color: rgba(0, 255, 65, 0.7); text-transform: uppercase;
    letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid rgba(0, 255, 65, 0.1);
}

.sm-pinned-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px; }
.sm-app { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; color: #c9d1d9; }
.sm-app:hover { background: rgba(0, 255, 65, 0.15); color: #00ff41; }
.sm-app.pinned { flex-direction: column; text-align: center; gap: 6px; }
.sm-app.pinned .sm-icon { font-size: 28px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; }
.sm-app.pinned .sm-icon.has-img { font-size: inherit; }
.sm-app.pinned .sm-name { font-size: 13px; }

/* Pinned app icon images */
.pinned-app-icon-img {
    width: 32px; height: 32px; object-fit: contain; image-rendering: auto; border-radius: 6px;
}

/* Installed app icon images */
.installed-app-icon-img {
    width: 22px; height: 22px; object-fit: contain; image-rendering: auto;
}
.sm-app.installed { border-bottom: 1px solid rgba(0, 255, 65, 0.05); }

/* Force colorful app icons/emojis to monochrome green "holograms" - matches inline menu */
.sm-icon,
.pinned-app-icon-img,
.installed-app-icon-img {
    filter: grayscale(100%) sepia(100%) hue-rotate(90deg) brightness(1.2) contrast(1.1);
    opacity: 0.9;
    transition: all 0.2s ease;
}

.sm-app:hover .sm-icon,
.sm-app:hover .pinned-app-icon-img,
.sm-app:hover .installed-app-icon-img {
    filter: grayscale(100%) sepia(100%) hue-rotate(90deg) brightness(1.5) drop-shadow(0 0 5px rgba(0, 255, 65, 0.5));
    opacity: 1;
}

.sm-icon { font-size: 20px; flex-shrink: 0; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
.sm-app-info { display: flex; flex-direction: column; overflow: hidden; flex: 1; min-width: 0; }
.sm-name { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sm-comment { font-size: 12px; color: rgba(200, 200, 200, 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.sm-user { padding: 20px; text-align: center; border-bottom: 1px solid rgba(0, 255, 65, 0.2); }
.sm-user-avatar { width: 64px; height: 64px; margin: 0 auto 8px auto; border-radius: 50%; overflow: hidden; border: 2px solid #00ff41; box-shadow: 0 0 15px rgba(0, 255, 65, 0.3); }
.sm-user-avatar img, .sm-user-avatar div { width: 100%; height: 100%; object-fit: cover; }
.sm-user-name { font-size: 16px; color: #00ff41; font-weight: bold; }

.sm-quick-links { flex: 1; padding: 10px; overflow-y: auto; }
.sm-quick-link { padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; color: #c9d1d9; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.sm-quick-link:hover { background: rgba(0, 255, 65, 0.15); color: #00ff41; }

.sm-power {
  padding: 10px;
  border-top: 1px solid rgba(0, 255, 65, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-power-btn {
  flex: 1;
  padding: 10px;
  background: rgba(0, 20, 0, 0.6);
  border: 1px solid rgba(0, 255, 65, 0.3);
  color: #E0F7E9;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.sm-power-btn .emoji-icon {
  filter: grayscale(100%) brightness(1.2) sepia(100%) hue-rotate(90deg) saturate(500%) drop-shadow(0 0 2px rgba(0, 255, 65, 0.8));
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-block;
}

.sm-power-btn.lock:hover {
  background: rgba(0, 40, 0, 0.9);
  border-color: #00ff41;
  color: #00ff41;
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
}

.sm-power-btn.restart:hover,
.sm-power-btn.shutdown:hover,
.sm-power-btn.lock:hover {
  background: rgba(0, 40, 0, 0.9);
  border-color: #00ff41;
  color: #00ff41;
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
}

.sm-power-btn:hover .emoji-icon {
  filter: grayscale(100%) brightness(1.7) sepia(100%) hue-rotate(90deg) saturate(800%) drop-shadow(0 0 8px var(--tos-green));
  transform: scale(1.15) translateY(-2px);
  text-shadow: 0 0 10px var(--tos-green);
}

/* Phosphor icons styling */
.sm-quick-link i, .sm-all-apps-btn i {
    font-size: 16px; width: 20px; display: inline-flex; align-items: center; justify-content: center;
}

/* App icon images - match regular start menu styling */
.sm-icon img, .sm-app img {
    filter: drop-shadow(0 0 8px rgba(0, 255, 65, 0.18));
    opacity: 0.95; transition: all 0.2s ease;
}
.sm-app:hover img {
    filter: drop-shadow(0 0 10px rgba(0, 255, 65, 0.4)); opacity: 1;
}

.sm-context-menu {
    position: fixed; z-index: 1000; background: rgba(13, 17, 23, 0.98);
    border: 1px solid #00ff41; border-radius: 6px; padding: 5px 0;
    min-width: 180px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    display: none; flex-direction: column;
}
.sm-ctx-item {
    padding: 8px 15px; cursor: pointer; color: #c9d1d9; font-size: 14px;
    display: flex; align-items: center; gap: 8px; transition: all 0.1s;
}
.sm-ctx-item:hover { background: rgba(0, 255, 65, 0.15); color: #00ff41; }
.sm-ctx-divider { height: 1px; background: rgba(0, 255, 65, 0.2); margin: 4px 0; }
</style></head>
<body>
<div class="sm-container">
    <div class="sm-left">
        <div class="sm-header">
            <div class="sm-search-container">
                <input type="text" class="sm-search-input" placeholder="Search apps..." autofocus>
                <button class="sm-all-apps-btn" onclick="emitAction('open_launcher')">
                    <i class="ph-bold ph-squares-four"></i> All Apps
                </button>
            </div>
            <div class="sm-dropdowns" style="display:none !important;">
                <select class="sm-select" disabled><option>All apps</option></select>
                <select class="sm-select" id="sm-cat-select">
                    <option value="All">All</option>
                    <option value="Games">Games</option>
                    <option value="Internet">Internet</option>
                    <option value="Office">Office</option>
                    <option value="Multimedia">Multimedia</option>
                    <option value="Development">Development</option>
                    <option value="System">System</option>
                    <option value="Utilities">Utilities</option>
                </select>
            </div>
        </div>
        <div class="sm-section">
            <h3 id="pinned-header">Pinned</h3>
            <div class="sm-pinned-grid">${pinnedHtml}</div>
            <h3 id="all-header">All Apps</h3>
            <div class="sm-apps-list">${installedHtml || '<div style="color:#666;padding:8px;">No installed apps found</div>'}</div>
        </div>
    </div>
    <div class="sm-right">
        <div class="sm-user">
            <div class="sm-user-avatar">${config.logoUrl ? `<img src="${config.logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg, #00ff41, #00cc33);display:flex;align-items:center;justify-content:center;font-size:32px;">✝️</div>`}</div>
            <div class="sm-user-name">TempleOS Remake</div>
        </div>
        <div class="sm-quick-links">
            <div class="sm-quick-link" data-action="quicklink" data-path="root"><i class="ph-fill ph-desktop"></i> This PC</div>
            <div class="sm-quick-link" data-action="quicklink" data-path="home"><i class="ph-fill ph-house"></i> Home</div>
            <div class="sm-quick-link" data-action="quicklink" data-path="Documents"><i class="ph-fill ph-file-text"></i> Documents</div>
            <div class="sm-quick-link" data-action="quicklink" data-path="Downloads"><i class="ph-fill ph-download"></i> Downloads</div>
            <div class="sm-quick-link" data-action="quicklink" data-path="Music"><i class="ph-fill ph-music-note"></i> Music</div>
            <div class="sm-quick-link" data-action="quicklink" data-path="Pictures"><i class="ph-fill ph-image"></i> Pictures</div>
            <div class="sm-quick-link" data-action="quicklink" data-path="settings"><i class="ph-fill ph-gear"></i> Settings</div>
        </div>
        <div class="sm-power">
            <button class="sm-power-btn lock" data-action="power" data-power="lock"><span class="emoji-icon">🔒</span> Lock</button>
            <button class="sm-power-btn restart" data-action="power" data-power="restart"><span class="emoji-icon">🔄</span> Restart</button>
            <button class="sm-power-btn shutdown" data-action="power" data-power="shutdown"><span class="emoji-icon">🛑</span> Shutdown</button>
        </div>
    </div>
</div>
<div id="sm-ctx-menu" class="sm-context-menu"></div>
<script>
const searchInput = document.querySelector('.sm-search-input');
const catSelect = document.getElementById('sm-cat-select');
const allApps = Array.from(document.querySelectorAll('.sm-app.installed')); // Only filter installed apps
const pinnedSection = document.querySelector('.sm-pinned-grid');
const pinnedHeader = document.getElementById('pinned-header');

function filterApps() {
    const query = searchInput.value.toLowerCase();
    const cat = catSelect.value;

    allApps.forEach(app => {
        const name = app.querySelector('.sm-name')?.textContent?.toLowerCase() || '';
        const appCat = app.dataset.category || 'Utilities';
        
        const matchesQuery = name.includes(query);
        const matchesCat = cat === 'All' || appCat === cat;

        app.style.display = (matchesQuery && matchesCat) ? 'flex' : 'none';
    });

    // Toggle pinned section based on search/filter
    if (query || cat !== 'All') {
        pinnedSection.style.display = 'none';
        pinnedHeader.style.display = 'none';
    } else {
        pinnedSection.style.display = 'grid';
        pinnedHeader.style.display = 'block';
    }
}

searchInput.addEventListener('input', filterApps);
if (catSelect) catSelect.addEventListener('change', filterApps);

document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'launch') {
        window.__startMenuAction = { type: 'launch', key: el.dataset.key };
    } else if (action === 'quicklink') {
        window.__startMenuAction = { type: 'quicklink', path: el.dataset.path };
    } else if (action === 'power') {
        window.__startMenuAction = { type: 'power', action: el.dataset.power };
    }
});

// Internal Context Menu Logic
const pinnedStartKeys = ${JSON.stringify(config.pinnedApps ? config.pinnedApps.map(a => a.key) : [])};
const pinnedTaskbarKeys = ${JSON.stringify(config.pinnedTaskbar || [])};
const ctxMenu = document.getElementById('sm-ctx-menu');

document.addEventListener('click', (e) => {
    // Hide context menu on any click (unless clicking inside it, but clicking logic usually handles actions)
    if (ctxMenu) ctxMenu.style.display = 'none';
});

document.body.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const app = e.target.closest('.sm-app');
    if (app && app.dataset.key) {
        const key = app.dataset.key;
        const isPinnedStart = pinnedStartKeys.includes(key);
        const isPinnedTaskbar = pinnedTaskbarKeys.includes(key);
        const onDesktop = false; // We don't track desktop status easily here yet, default to false (add only) or generic

        const actions = [
            { label: '🚀 Open', action: 'launch' },
            { divider: true },
            { label: isPinnedStart ? '📌 Unpin from Start' : '📌 Pin to Start', action: isPinnedStart ? 'unpin-start' : 'pin-start' },
            { label: isPinnedTaskbar ? '📌 Unpin from Taskbar' : '📌 Pin to Taskbar', action: isPinnedTaskbar ? 'unpin-taskbar' : 'pin-taskbar' },
            { label: '➕ Add to Desktop', action: 'add-desktop' },
            { divider: true },
            { label: '❌ Uninstall', action: 'uninstall' }
        ];

        ctxMenu.innerHTML = actions.map(act => {
            if (act.divider) return '<div class="sm-ctx-divider"></div>';
            return \`<div class="sm-ctx-item" onclick="emitAppAction('\${act.action}', '\${key}')">\${act.label}</div>\`;
        }).join('');

        // Ensure menu doesn't go off screen
        let x = e.clientX;
        let y = e.clientY;
        const w = 200; // approx width
        const h = actions.length * 35; // approx height
        
        if (x + w > window.innerWidth) x = window.innerWidth - w - 10;
        if (y + h > window.innerHeight) y = window.innerHeight - h - 10;

        ctxMenu.style.left = x + 'px';
        ctxMenu.style.top = y + 'px';
        ctxMenu.style.display = 'flex';
    }
});

function emitAppAction(type, key) {
    if (type === 'launch') {
        window.__startMenuAction = { type: 'launch', key };
    } else {
        // For pin/unpin etc, we just emit the action. 
        // Code in main.ts should handle these without closing popup (except Launch/Uninstall)
        window.__startMenuAction = { type, key };
    }
    // Context menu will hide due to document click listener propagation or implicit blur
}


function emitAction(type) {
    window.__startMenuAction = { type };
}

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.__startMenuAction = { type: 'close' };
    }
});
</script>
</body></html>`;
}

ipcMain.handle('startmenu:show', async (event, config) => {
    try {
        // Close any existing popup
        closeStartMenuPopupSync();

        const primary = screen.getPrimaryDisplay();
        const bounds = primary?.bounds || { x: 0, y: 0, width: 1920, height: 1080 };
        const taskbarHeight = config?.taskbarHeight || 75;
        const taskbarPosition = config?.taskbarPosition || 'bottom';

        const popupWidth = 620;
        const popupHeight = 560;

        // Position at bottom-left or top-left depending on taskbar position
        let posX = bounds.x + 8;
        let posY = taskbarPosition === 'bottom'
            ? bounds.y + bounds.height - taskbarHeight - popupHeight
            : bounds.y + taskbarHeight;

        startMenuPopup = new BrowserWindow({
            x: posX,
            y: posY,
            width: popupWidth,
            height: popupHeight,
            frame: false,
            resizable: false,
            movable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            focusable: true, // Needs to be focusable for clicks to work
            show: false,
            transparent: true,
            hasShadow: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        const html = buildStartMenuHtml(config);
        startMenuPopup.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        startMenuPopup.once('ready-to-show', () => {
            if (startMenuPopup && !startMenuPopup.isDestroyed()) {
                startMenuPopup.show();
                // Don't call focus() to avoid stealing focus from X11 apps
            }
        });

        // Poll for actions
        startMenuPollInterval = setInterval(async () => {
            if (!startMenuPopup || startMenuPopup.isDestroyed()) {
                closeStartMenuPopupSync();
                return;
            }
            try {
                const action = await startMenuPopup.webContents.executeJavaScript('window.__startMenuAction || null');
                if (action) {
                    // Clear action
                    await startMenuPopup.webContents.executeJavaScript('window.__startMenuAction = null');

                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('startmenu:action', action);
                    }

                    // Close popup after action
                    closeStartMenuPopupSync();
                }
            } catch {
                closeStartMenuPopupSync();
            }
        }, 32);

        // Close on blur (but with a longer delay to avoid premature closing on X11)
        // Also check if the popup still exists and wasn't closed by another action
        let blurCloseScheduled = false;
        startMenuPopup.on('blur', () => {
            if (blurCloseScheduled) return;
            blurCloseScheduled = true;
            setTimeout(() => {
                blurCloseScheduled = false;
                // Only close if still open and not destroyed
                if (startMenuPopup && !startMenuPopup.isDestroyed()) {
                    closeStartMenuPopupSync();
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('startmenu:closed', {});
                    }
                }
            }, 300); // Increased delay for X11 focus settling
        });

        startMenuPopup.on('closed', () => {
            closeStartMenuPopupSync();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('startmenu:closed', {});
            }
        });

        return { success: true };
    } catch (e) {
        closeStartMenuPopupSync();
        return { success: false, error: e && e.message ? e.message : String(e) };
    }
});

ipcMain.handle('startmenu:hide', async () => {
    closeStartMenuPopupSync();
    return { success: true };
});

// ============================================
// FILESYSTEM IPC
// ============================================
ipcMain.handle('fs:readdir', async (event, dirPath) => {
    const pathCheck = isPathSafe(dirPath);
    if (!pathCheck.safe) {
        return { success: false, error: pathCheck.reason };
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

        return { success: true, entries: results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
    const pathCheck = isPathSafe(filePath);
    if (!pathCheck.safe) {
        return { success: false, error: pathCheck.reason };
    }
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
    const pathCheck = isPathSafe(filePath);
    if (!pathCheck.safe) {
        return { success: false, error: pathCheck.reason };
    }
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:delete', async (event, itemPath) => {
    const pathCheck = isPathSafe(itemPath);
    if (!pathCheck.safe) {
        return { success: false, error: pathCheck.reason };
    }
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
    const pathCheck = isPathSafe(itemPath);
    if (!pathCheck.safe) {
        return { success: false, error: pathCheck.reason };
    }
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
        await fs.promises.rm(infoPath, { force: true }).catch((e) => console.warn('[FS] Remove trash info on delete failed:', e.message));
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
    const pathCheck = isPathSafe(dirPath);
    if (!pathCheck.safe) {
        return { success: false, error: pathCheck.reason };
    }
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
    const oldCheck = isPathSafe(oldPath);
    if (!oldCheck.safe) {
        return { success: false, error: oldCheck.reason };
    }
    const newCheck = isPathSafe(newPath);
    if (!newCheck.safe) {
        return { success: false, error: newCheck.reason };
    }
    try {
        await fs.promises.rename(oldPath, newPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:copy', async (event, srcPath, destPath) => {
    const srcCheck = isPathSafe(srcPath);
    if (!srcCheck.safe) {
        return { success: false, error: srcCheck.reason };
    }
    const destCheck = isPathSafe(destPath);
    if (!destCheck.safe) {
        return { success: false, error: destCheck.reason };
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
    const srcCheck = isPathSafe(sourcePath);
    if (!srcCheck.safe) {
        return { success: false, error: srcCheck.reason };
    }
    const destCheck = isPathSafe(targetZipPath);
    if (!destCheck.safe) {
        return { success: false, error: destCheck.reason };
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
        // Verify creation
        await fs.promises.access(targetZipPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('fs:extractZip', async (event, zipPath, targetDir) => {
    if (!AdmZip) return { success: false, error: 'adm-zip dependency missing' };
    const zipCheck = isPathSafe(zipPath);
    if (!zipCheck.safe) {
        return { success: false, error: zipCheck.reason };
    }
    const destCheck = isPathSafe(targetDir);
    if (!destCheck.safe) {
        return { success: false, error: destCheck.reason };
    }
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

ipcMain.handle('system:isCommandAvailable', (event, cmd) => {
    // Check if a command exists in PATH (used for gamemoderun check, etc.)
    const command = String(cmd || '').trim();
    if (!command) return { success: true, available: false };

    const available = commandExistsSync(command);
    return { success: true, available };
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
        return { success: false, error: res.stderr || 'Privileged command failed' };
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

function isPrivilegeErrorMessage(msg) {
    const m = String(msg || '');
    return /request dismissed|not authorized|authentication|permission denied|privilege|sudo: a password is required|no tty present|polkit|pkexec/i.test(m);
}

async function runSudoShWithPassword(command, password, options = {}) {
    const timeout = typeof options.timeout === 'number' ? options.timeout : 120000;
    if (!(await hasCommand('sudo'))) return { error: new Error('sudo not available'), stdout: '', stderr: '' };

    return await new Promise((resolve) => {
        let settled = false;
        let stdout = '';
        let stderr = '';

        const child = spawn('sudo', ['-S', '-p', '', 'sh', '-lc', String(command || '')], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, SUDO_PROMPT: '' }
        });

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            try { child.kill('SIGTERM'); } catch { }
            resolve({ error: new Error('Command timed out'), stdout, stderr });
        }, timeout);

        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });

        child.on('error', (e) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ error: e, stdout, stderr });
        });

        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (code === 0) {
                resolve({ error: null, stdout, stderr });
                return;
            }
            const wrongPassword = /sorry, try again|incorrect password/i.test(stderr);
            resolve({ error: new Error(`sudo exited ${code}`), stdout, stderr, wrongPassword });
        });

        try {
            child.stdin.write(String(password || '') + '\n');
            child.stdin.end();
        } catch {
            // ignore
        }
    });
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

// Minimal (but robust-enough) .desktop parser + scanner for freedesktop.org Desktop Entry spec.
// We intentionally scan .desktop files directly instead of relying on GNOME/KDE menu caches.
function parseDesktopFile(content) {
    const result = {};
    let currentSection = null;

    for (const rawLine of String(content || '').split(/\r?\n/)) {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const sectionMatch = trimmed.match(/^\[(.+)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            continue;
        }

        const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (!kvMatch || currentSection !== 'Desktop Entry') continue;

        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        if (!key) continue;
        result[key] = value;
    }

    return result;
}

function parseBool(value) {
    const v = String(value || '').trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
}

function splitSemicolonList(value) {
    return String(value || '')
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);
}

function preferredLocales() {
    // LANG often looks like: en_US.UTF-8 or en_US.UTF-8@modifier
    const raw = (process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '').trim();
    const base = raw.split('.')[0].replace(/@.*$/, '').replace(/-/g, '_');
    const out = [];
    const push = (s) => { if (s && !out.includes(s)) out.push(s); };
    push(base);
    if (base.includes('_')) push(base.split('_')[0]);
    push('C');
    return out;
}

function localizedValue(parsed, key, locales) {
    for (const loc of locales) {
        const exact = parsed[`${key}[${loc}]`];
        if (typeof exact === 'string' && exact.trim()) return exact.trim();
    }
    const fallback = parsed[key];
    return typeof fallback === 'string' ? fallback.trim() : '';
}

function currentDesktops() {
    const raw = String(process.env.XDG_CURRENT_DESKTOP || '').trim();
    if (!raw) return [];
    return raw.split(':').map(s => s.trim()).filter(Boolean);
}

function passesShowInFilters(parsed, desktops) {
    if (!desktops || desktops.length === 0) return true; // custom shell might not set XDG_CURRENT_DESKTOP
    const only = splitSemicolonList(parsed.OnlyShowIn);
    if (only.length && !only.some(x => desktops.includes(x))) return false;
    const not = splitSemicolonList(parsed.NotShowIn);
    if (not.length && not.some(x => desktops.includes(x))) return false;
    return true;
}

function commandExistsSync(cmd, env = process.env) {
    const c = String(cmd || '').trim();
    if (!c) return false;

    // Absolute/relative path
    if (c.includes('/') || c.includes('\\')) {
        try {
            fs.accessSync(c, fs.constants.X_OK);
            return true;
        } catch {
            return false;
        }
    }

    const pathEnv = String(env.PATH || '').split(':').filter(Boolean);
    for (const dir of pathEnv) {
        const full = path.join(dir, c);
        try {
            fs.accessSync(full, fs.constants.X_OK);
            return true;
        } catch {
            // continue
        }
    }
    return false;
}

async function listDesktopFiles(rootDir) {
    const out = [];
    const stack = [rootDir];
    while (stack.length) {
        const dir = stack.pop();
        let ents = [];
        try {
            ents = await fs.promises.readdir(dir, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const ent of ents) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                stack.push(full);
                continue;
            }
            if (ent.isFile() && ent.name.endsWith('.desktop')) out.push(full);
        }
    }
    return out;
}

function desktopFileId(rootDir, filePath) {
    // Spec: ID is the desktop file's relative path with '/' replaced by '-'.
    const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
    return rel.split('/').filter(Boolean).join('-');
}

const iconResolveCache = new Map();
let templeIconProtocolRegistered = false;

function toTempleIconUrl(iconPath) {
    return `temple-icon://icon/${encodeURIComponent(String(iconPath || ''))}`;
}

function registerTempleIconProtocol() {
    if (templeIconProtocolRegistered) return;
    templeIconProtocolRegistered = true;
    if (process.platform !== 'linux') return;

    try {
        protocol.registerFileProtocol('temple-icon', (request, callback) => {
            try {
                const u = new URL(request.url);
                const encoded = String(u.pathname || '').replace(/^\/+/, '');
                const p = decodeURIComponent(encoded);
                const home = os.homedir();
                const allowedRoots = [
                    '/usr/share',
                    '/usr/local/share',
                    '/var/lib/snapd',
                    '/snap', // Snap app icons
                    '/var/lib/flatpak', // Flatpak system icons
                    path.join(home, '.local/share'),
                    path.join(home, '.icons')
                ];

                if (!path.isAbsolute(p) || !allowedRoots.some(r => p === r || p.startsWith(r + path.sep))) {
                    callback({ error: -10 }); // ACCESS_DENIED
                    return;
                }

                callback({ path: p });
            } catch {
                callback({ error: -2 }); // FAILED
            }
        });
    } catch {
        // ignore
    }
}

function resolveIconPath(icon, desktopFilePath) {
    const raw = String(icon || '').trim();
    if (!raw) return null;
    if (iconResolveCache.has(raw)) return iconResolveCache.get(raw);

    const remember = (value) => {
        iconResolveCache.set(raw, value);
        return value;
    };

    const fileExists = (p) => {
        try { return fs.statSync(p).isFile(); } catch { return false; }
    };

    // Absolute (or explicit relative) path
    if (raw.includes('/') || raw.includes('\\')) {
        const direct = path.isAbsolute(raw) ? raw : path.resolve(path.dirname(desktopFilePath || '.'), raw);
        if (fileExists(direct)) return remember(direct);
        return remember(null);
    }

    const base = raw.replace(/\.(png|svg|xpm)$/i, '');
    const candidates = [base, `${base}-symbolic`];
    const exts = ['png', 'svg', 'xpm'];

    // Fast path: /usr/share/pixmaps
    for (const name of candidates) {
        for (const ext of exts) {
            const p = path.join('/usr/share/pixmaps', `${name}.${ext}`);
            if (fileExists(p)) return remember(p);
        }
    }

    // Icon themes (Ubuntu commonly uses Yaru; fall back to hicolor/Adwaita)
    const home = os.homedir();
    const roots = [
        path.join(home, '.local/share/icons'),
        path.join(home, '.icons'), // legacy
        '/usr/local/share/icons',
        '/usr/share/icons'
    ];
    const themeHints = [
        String(process.env.XDG_ICON_THEME || '').trim(),
        String(process.env.GTK_THEME || '').trim().split(':')[0],
        'Yaru',
        'Adwaita',
        'hicolor'
    ].filter(Boolean);
    const themes = Array.from(new Set(themeHints));
    const sizeDirs = [
        'scalable',
        '512x512', '256x256', '192x192', '128x128', '96x96', '72x72', '64x64', '48x48', '32x32', '24x24', '22x22', '16x16'
    ];
    const contexts = ['apps', 'applications', 'mimetypes', 'places', 'categories', 'actions', 'status', 'devices'];

    for (const root of roots) {
        for (const theme of themes) {
            for (const size of sizeDirs) {
                for (const ctx of contexts) {
                    for (const name of candidates) {
                        for (const ext of exts) {
                            const p = path.join(root, theme, size, ctx, `${name}.${ext}`);
                            if (fileExists(p)) return remember(p);
                        }
                    }
                }
            }
        }
    }

    // Snap app icons - search /snap/{appname}/current/meta/gui/ and internal icon dirs
    const snapDirs = [
        `/snap/${base}/current/meta/gui`,
        `/snap/${base}/current/usr/share/icons/hicolor/256x256/apps`,
        `/snap/${base}/current/usr/share/icons/hicolor/128x128/apps`,
        `/snap/${base}/current/usr/share/icons/hicolor/64x64/apps`,
        `/snap/${base}/current/usr/share/icons/hicolor/48x48/apps`,
        `/snap/${base}/current/usr/share/pixmaps`,
    ];
    for (const snapDir of snapDirs) {
        // Check for exact matches with known extensions
        for (const name of candidates) {
            for (const ext of exts) {
                const p = path.join(snapDir, `${name}.${ext}`);
                if (fileExists(p)) return remember(p);
            }
        }
        // Also scan directory for any matching icon file (snap icons sometimes have different names)
        try {
            const files = fs.readdirSync(snapDir);
            for (const name of candidates) {
                const match = files.find(f =>
                    (f.toLowerCase().startsWith(name.toLowerCase()) || f.toLowerCase().includes(name.toLowerCase())) &&
                    /\.(png|svg|xpm)$/i.test(f)
                );
                if (match) {
                    const p = path.join(snapDir, match);
                    if (fileExists(p)) return remember(p);
                }
            }
        } catch { /* directory doesn't exist, skip */ }
    }

    // Flatpak app icons - check exported icon directories
    const flatpakDirs = [
        '/var/lib/flatpak/exports/share/icons/hicolor/512x512/apps',
        '/var/lib/flatpak/exports/share/icons/hicolor/256x256/apps',
        '/var/lib/flatpak/exports/share/icons/hicolor/128x128/apps',
        '/var/lib/flatpak/exports/share/icons/hicolor/64x64/apps',
        '/var/lib/flatpak/exports/share/icons/hicolor/48x48/apps',
        '/var/lib/flatpak/exports/share/icons/hicolor/scalable/apps',
        path.join(home, '.local/share/flatpak/exports/share/icons/hicolor/512x512/apps'),
        path.join(home, '.local/share/flatpak/exports/share/icons/hicolor/256x256/apps'),
        path.join(home, '.local/share/flatpak/exports/share/icons/hicolor/128x128/apps'),
    ];
    for (const flatDir of flatpakDirs) {
        for (const name of candidates) {
            for (const ext of exts) {
                const p = path.join(flatDir, `${name}.${ext}`);
                if (fileExists(p)) return remember(p);
            }
        }
    }

    return remember(null);
}

function splitCommandLine(input) {
    const argv = [];
    let cur = '';
    let mode = 'normal'; // normal | single | double

    const pushCur = () => {
        if (cur.length) argv.push(cur);
        cur = '';
    };

    const s = String(input || '');
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (mode === 'normal') {
            if (/\s/.test(ch)) {
                pushCur();
                continue;
            }
            if (ch === "'") { mode = 'single'; continue; }
            if (ch === '"') { mode = 'double'; continue; }
            if (ch === '\\') {
                i++;
                if (i < s.length) cur += s[i];
                continue;
            }
            cur += ch;
            continue;
        }

        if (mode === 'single') {
            if (ch === "'") { mode = 'normal'; continue; }
            cur += ch;
            continue;
        }

        // mode === 'double'
        if (ch === '"') { mode = 'normal'; continue; }
        if (ch === '\\') {
            i++;
            if (i < s.length) cur += s[i];
            continue;
        }
        cur += ch;
    }
    pushCur();
    return argv;
}

function expandExecTokens(tokens, ctx) {
    const out = [];
    for (const token of tokens) {
        if (token === '%i') {
            if (ctx.icon) out.push('--icon', ctx.icon);
            continue;
        }

        // Keep as a single argv element even if replacements introduce spaces.
        let t = String(token);
        t = t.replace(/%%/g, '%');
        if (ctx.name) t = t.replace(/%c/g, ctx.name);
        if (ctx.desktopFile) t = t.replace(/%k/g, ctx.desktopFile);
        // Strip any remaining field codes (%f, %F, %u, %U, etc.)
        t = t.replace(/%[a-zA-Z]/g, '').trim();
        if (!t) continue;
        out.push(t);
    }
    return out;
}

function argvToExecString(argv) {
    // Used only for display / downstream string manipulation (e.g. gamemoderun prefix).
    // Keep it minimal: quote args with whitespace.
    return argv.map(a => (/\s/.test(a) ? `"${String(a).replace(/\"/g, '\\"')}"` : a)).join(' ');
}

function parseEnvAssignments(argv) {
    const env = {};
    let i = 0;
    for (; i < argv.length; i++) {
        const t = argv[i];
        const m = String(t).match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) break;
        env[m[1]] = m[2];
    }
    return { env, argv: argv.slice(i) };
}

function desktopEntryDirs() {
    const home = os.homedir();
    const xdgDataHome = process.env.XDG_DATA_HOME || path.join(home, '.local/share');
    const xdgDataDirs = String(process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share')
        .split(':')
        .map(s => s.trim())
        .filter(Boolean);

    // Precedence: user entries first so they override system entries with the same ID.
    const ordered = [
        { dir: path.join(xdgDataHome, 'applications'), source: 'user' },
        { dir: path.join(home, '.local/share/flatpak/exports/share/applications'), source: 'flatpak-user' },
        { dir: '/var/lib/snapd/desktop/applications', source: 'snap' },
        { dir: '/var/lib/flatpak/exports/share/applications', source: 'flatpak-system' }
    ];

    for (const d of xdgDataDirs) {
        ordered.push({ dir: path.join(d, 'applications'), source: 'system' });
    }

    // Dedupe by path while keeping first occurrence (highest precedence).
    const seen = new Set();
    return ordered.filter(x => {
        if (seen.has(x.dir)) return false;
        seen.add(x.dir);
        return true;
    });
}

async function scanDesktopEntries(options = {}) {
    const locales = preferredLocales();
    const desktops = currentDesktops();
    const includeTerminal = !!options.includeTerminal;

    const out = [];
    const seenById = new Set();

    for (const { dir, source } of desktopEntryDirs()) {
        const files = await listDesktopFiles(dir);
        for (const filePath of files) {
            let content = '';
            try {
                content = await fs.promises.readFile(filePath, 'utf-8');
            } catch {
                continue;
            }

            const parsed = parseDesktopFile(content);

            // Only real launchable apps
            const type = String(parsed.Type || '').trim();
            if (type && type !== 'Application') continue;
            if (parseBool(parsed.Hidden) || parseBool(parsed.NoDisplay)) continue;
            if (!passesShowInFilters(parsed, desktops)) continue;

            const terminal = parseBool(parsed.Terminal);
            if (terminal && !includeTerminal) continue;

            const name = localizedValue(parsed, 'Name', locales);
            if (!name) continue;
            const genericName = localizedValue(parsed, 'GenericName', locales) || '';

            // Prefer TryExec if provided (explicit "is this runnable?").
            if (parsed.TryExec && !commandExistsSync(parsed.TryExec)) continue;

            const execTokensRaw = splitCommandLine(parsed.Exec || '');
            if (!execTokensRaw.length) continue;

            const iconName = localizedValue(parsed, 'Icon', locales) || parsed.Icon || 'application-x-executable';
            const execTokens = expandExecTokens(execTokensRaw, { name, icon: iconName, desktopFile: filePath });
            if (!execTokens.length) continue;

            // Validate the command exists when possible (avoids showing service stubs / broken entries).
            const { argv: argvSansEnv } = parseEnvAssignments(execTokens);
            const command = argvSansEnv[0];
            if (!command) continue;
            if (!commandExistsSync(command)) continue;

            const id = desktopFileId(dir, filePath);
            if (seenById.has(id)) continue;
            seenById.add(id);

            const iconPath = resolveIconPath(iconName, filePath);
            const iconUrl = iconPath ? toTempleIconUrl(iconPath) : null;

            out.push({
                id,
                name,
                genericName: genericName || undefined,
                startupWmClass: String(parsed.StartupWMClass || '').trim() || undefined,
                icon: iconName,
                iconPath,
                iconUrl,
                exec: argvToExecString(execTokens),
                categories: splitSemicolonList(parsed.Categories),
                keywords: splitSemicolonList(parsed.Keywords),
                comment: localizedValue(parsed, 'Comment', locales) || '',
                desktopFile: filePath,
                source
            });
        }
    }

    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
}

let installedAppsCache = [];
let installedAppsCacheReady = false;
let installedAppsFingerprint = '';
let installedAppsScanPromise = null;
let stopDesktopEntryWatch = null;
let desktopEntryRescanTimer = null;
let installedAppsByStartupWmClass = new Map(); // lower -> app

function rebuildInstalledAppsIndexes(apps) {
    installedAppsByStartupWmClass = new Map();
    for (const a of Array.isArray(apps) ? apps : []) {
        const v = a && a.startupWmClass ? String(a.startupWmClass).trim() : '';
        if (v) installedAppsByStartupWmClass.set(v.toLowerCase(), a);
    }
}

function fingerprintApps(apps) {
    return (Array.isArray(apps) ? apps : [])
        .map(a => `${a.id}\t${a.desktopFile}\t${a.exec}\t${a.icon}\t${a.name}`)
        .sort()
        .join('\n');
}

function broadcastAppsChanged(payload) {
    try {
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win || win.isDestroyed()) continue;
            win.webContents.send('apps:changed', payload || { reason: 'unknown' });
        }
    } catch {
        // ignore
    }
}

// ============================================
// APT UNINSTALL SUPPORT (safe-by-default)
// ============================================
const aptBaselinePath = path.join(__dirname, 'apt-baseline.json');
const aptProtectedPath = path.join(__dirname, 'apt-protected.json');
const snapBaselinePath = path.join(__dirname, 'snap-baseline.json');
const snapProtectedPath = path.join(__dirname, 'snap-protected.json');

let cachedAptBaselineSet = undefined; // Set<string> | null
let cachedAptProtectedSet = undefined; // Set<string>
let cachedAptManualSet = null; // Set<string> | null
let cachedAptManualAt = 0;
let cachedSnapBaselineSet = undefined; // Set<string> | null
let cachedSnapProtectedSet = undefined; // Set<string>

const defaultProtectedAptPackages = new Set([
    // Desktop/session + critical runtime
    'templeos',
    'electron',
    'nodejs',
    'npm',
    'systemd',
    'dbus',
    'policykit-1',
    'polkitd',
    'pkexec',
    'sudo',
    'bash',
    'dash',
    'coreutils',
    'util-linux',
    'mount',
    'login',

    // Display stack / desktop meta packages (very easy to brick by removing)
    'xorg',
    'xserver-xorg',
    'xserver-xorg-core',
    'x11-common',
    'gdm3',
    'lightdm',
    'sddm',
    'ubuntu-desktop',
    'kubuntu-desktop',
    'xubuntu-desktop',
    'lubuntu-desktop',
    'gnome-shell',
    'gnome-session',
    'plasma-desktop',

    // Networking basics
    'network-manager',
    'netplan.io',
    'openssh-server',
]);

const defaultProtectedSnapPackages = new Set([
    'snapd',
    'core',
    'core18',
    'core20',
    'core22',
    'core24',
    'bare',
    'gtk-common-themes',
]);

function normalizeAptPackageName(pkg) {
    return String(pkg || '').trim().toLowerCase().split(':')[0];
}

function normalizeSnapName(name) {
    return String(name || '').trim().toLowerCase();
}

function getAptBaselineSet() {
    if (cachedAptBaselineSet !== undefined) return cachedAptBaselineSet;
    const baseline = readJsonArrayFile(aptBaselinePath);
    if (!baseline) {
        cachedAptBaselineSet = null;
        return cachedAptBaselineSet;
    }
    cachedAptBaselineSet = new Set(baseline.map(normalizeAptPackageName));
    return cachedAptBaselineSet;
}

function getAptProtectedSet() {
    if (cachedAptProtectedSet !== undefined) return cachedAptProtectedSet;
    const fromFile = readJsonArrayFile(aptProtectedPath);
    const merged = new Set(defaultProtectedAptPackages);
    if (Array.isArray(fromFile)) {
        for (const p of fromFile) merged.add(normalizeAptPackageName(p));
    }
    cachedAptProtectedSet = merged;
    return cachedAptProtectedSet;
}

function getSnapBaselineSet() {
    if (cachedSnapBaselineSet !== undefined) return cachedSnapBaselineSet;
    const baseline = readJsonArrayFile(snapBaselinePath);
    if (!baseline || baseline.length === 0) {
        cachedSnapBaselineSet = null;
        return cachedSnapBaselineSet;
    }
    cachedSnapBaselineSet = new Set(baseline.map(normalizeSnapName));
    return cachedSnapBaselineSet;
}

function getSnapProtectedSet() {
    if (cachedSnapProtectedSet !== undefined) return cachedSnapProtectedSet;
    const fromFile = readJsonArrayFile(snapProtectedPath);
    const merged = new Set(defaultProtectedSnapPackages);
    if (Array.isArray(fromFile)) {
        for (const p of fromFile) merged.add(normalizeSnapName(p));
    }
    cachedSnapProtectedSet = merged;
    return cachedSnapProtectedSet;
}

async function getAptManualSet() {
    const now = Date.now();
    if (cachedAptManualSet && (now - cachedAptManualAt) < 60_000) return cachedAptManualSet;
    if (!(await hasCommand('apt-mark'))) {
        cachedAptManualSet = null;
        cachedAptManualAt = now;
        return cachedAptManualSet;
    }
    const res = await execAsync('apt-mark showmanual 2>/dev/null', { timeout: 8000 });
    if (res.error) {
        cachedAptManualSet = null;
        cachedAptManualAt = now;
        return cachedAptManualSet;
    }
    const set = new Set(String(res.stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(normalizeAptPackageName));
    cachedAptManualSet = set;
    cachedAptManualAt = now;
    return cachedAptManualSet;
}

function parseDpkgQuerySearchOutput(stdout) {
    const pkgs = [];
    for (const line of String(stdout || '').split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        const idx = t.indexOf(':');
        if (idx <= 0) continue;
        const pkgField = t.slice(0, idx).trim();
        // dpkg-query -S may output multiarch as "pkg:amd64: /path"
        const base = normalizeAptPackageName(pkgField);
        if (base) pkgs.push(base);
    }
    return pkgs;
}

function parseSnapNameFromDesktopEntry(parsed, desktopFilePath) {
    const direct = normalizeSnapName(parsed && (parsed['X-SnapInstanceName'] || parsed['X-SnapInstance'] || parsed['X-Snap']));
    if (direct) return direct;

    const execLine = String(parsed && parsed.Exec ? parsed.Exec : '').trim();
    if (execLine) {
        const tokens = splitCommandLine(execLine);
        for (let i = 0; i < tokens.length; i++) {
            const t = String(tokens[i] || '');
            const base = path.basename(t);
            const isSnapBin = t === 'snap' || base === 'snap' || t === '/usr/bin/snap' || base === 'snap';
            if (!isSnapBin) continue;
            const maybeRun = String(tokens[i + 1] || '');
            if (maybeRun === 'run') {
                const name = normalizeSnapName(tokens[i + 2]);
                if (name) return name;
            }
        }
    }

    const fallback = normalizeSnapName(path.basename(String(desktopFilePath || ''), '.desktop').split('_')[0]);
    return fallback || '';
}

async function getAptPackageOwningFile(filePath) {
    if (!(await hasCommand('dpkg-query'))) return null;
    const p = String(filePath || '');
    if (!p || !path.isAbsolute(p)) return null;
    const res = await execAsync(`dpkg-query -S ${shQuote(p)} 2>/dev/null`, { timeout: 4000 });
    if (res.error) return null;
    const pkgs = parseDpkgQuerySearchOutput(res.stdout);
    return pkgs.length ? pkgs[0] : null;
}

async function getDpkgPackageMeta(pkg) {
    const safe = normalizeAptPackageName(pkg);
    if (!safe || !/^[a-z0-9][a-z0-9+.-]*$/.test(safe)) return null;
    if (!(await hasCommand('dpkg-query'))) return null;
    const cmd = "dpkg-query -W -f='${Package}\\t${Essential}\\t${Priority}\\t${Status}\\n' " + safe + " 2>/dev/null";
    const res = await execAsync(cmd, { timeout: 4000 });
    if (res.error) return null;
    const line = String(res.stdout || '').trim();
    const [name, essential, priority, status] = line.split('\t');
    return { name: normalizeAptPackageName(name), essential: String(essential || '').trim(), priority: String(priority || '').trim(), status: String(status || '').trim() };
}

async function refreshInstalledAppsCache(reason) {
    if (installedAppsScanPromise) return installedAppsScanPromise;
    installedAppsScanPromise = (async () => {
        const apps = await scanDesktopEntries({ includeTerminal: false });
        const fp = fingerprintApps(apps);
        const changed = fp !== installedAppsFingerprint;
        installedAppsCache = apps;
        rebuildInstalledAppsIndexes(apps);
        installedAppsCacheReady = true;
        installedAppsFingerprint = fp;
        if (changed) broadcastAppsChanged({ reason: reason || 'rescan' });
        return apps;
    })().finally(() => {
        installedAppsScanPromise = null;
    });
    return installedAppsScanPromise;
}

function scheduleInstalledAppsRefresh(reason) {
    if (desktopEntryRescanTimer) clearTimeout(desktopEntryRescanTimer);
    desktopEntryRescanTimer = setTimeout(() => {
        void refreshInstalledAppsCache(reason || 'change').catch((e) => console.warn('[Apps] Scheduled refresh failed:', e.message));
    }, 400);
}

function watchDesktopEntryDirs(onChange) {
    const watchers = [];
    for (const { dir } of desktopEntryDirs()) {
        try {
            const w = fs.watch(dir, { persistent: false }, (eventType, filename) => {
                const name = filename ? filename.toString() : '';
                if (name && !name.endsWith('.desktop')) return;
                onChange({ dir, eventType, filename: name });
            });
            watchers.push(w);
        } catch {
            // dir may not exist (snap/flatpak not installed)
        }
    }
    return () => {
        for (const w of watchers) {
            try { w.close(); } catch { }
        }
    };
}

function startDesktopEntryWatcher() {
    if (process.platform !== 'linux') return;
    if (stopDesktopEntryWatch) return;

    stopDesktopEntryWatch = watchDesktopEntryDirs(() => scheduleInstalledAppsRefresh('fswatch'));

    // Fallback: fs.watch is not recursive on Linux; catch nested dir changes by periodic rescan.
    setInterval(() => scheduleInstalledAppsRefresh('poll'), 60 * 1000);
}

ipcMain.handle('apps:getInstalled', async () => {
    if (process.platform !== 'linux') {
        return { success: true, apps: [], unsupported: true, error: 'App discovery is only supported on Linux' };
    }

    try {
        const apps = installedAppsCacheReady ? installedAppsCache : await refreshInstalledAppsCache('invoke');
        return { success: true, apps };
    } catch (e) {
        return { success: false, apps: [], error: e && e.message ? e.message : String(e) };
    }
});

// Launch an application by its .desktop file or exec command
ipcMain.handle('apps:launch', async (event, app) => {
    if (process.platform !== 'linux') {
        return { success: false, unsupported: true, error: 'Launching apps is only supported on Linux' };
    }

    try {
        // Prefer the provided exec (it may be modified e.g. "gamemoderun ...").
        // Fallback: read Exec from the .desktop file.
        let execLine = app && typeof app.exec === 'string' ? app.exec.trim() : '';
        let cwd = null;

        if ((!execLine || !execLine.length) && app && typeof app.desktopFile === 'string') {
            const filePath = app.desktopFile;
            try {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                const parsed = parseDesktopFile(content);
                const name = parsed.Name || path.basename(filePath);
                const iconName = parsed.Icon || '';
                cwd = parsed.Path || null;
                const tokens = expandExecTokens(splitCommandLine(parsed.Exec || ''), { name, icon: iconName, desktopFile: filePath });
                execLine = argvToExecString(tokens);
            } catch {
                // ignore
            }
        }

        if (!execLine) return { success: false, error: 'No executable found' };

        // Parse to argv for safe spawn (no shell).
        const rawTokens = splitCommandLine(execLine);
        const tokens = expandExecTokens(rawTokens, { name: app?.name, icon: app?.icon, desktopFile: app?.desktopFile });
        const { env: envVars, argv } = parseEnvAssignments(tokens);
        if (!argv.length) return { success: false, error: 'Invalid Exec' };

        const bin = argv[0];
        const args = argv.slice(1);
        const child = spawn(bin, args, {
            detached: true,
            stdio: 'ignore',
            cwd: cwd || undefined,
            env: { ...process.env, ...envVars }
        });
        await new Promise((resolve, reject) => {
            child.once('error', reject);
            child.once('spawn', resolve);
        });
        child.unref();

        // Help the unified taskbar "see" the new app quickly (avoid ~650ms poll delay).
        if (ewmhBridge?.supported && ewmhBridge.refreshNow) {
            const delays = [100, 250, 500, 900];
            for (const ms of delays) {
                setTimeout(() => { void ewmhBridge.refreshNow().catch((e) => console.warn('[X11] Post-launch EWMH refresh failed:', e.message)); }, ms);
            }
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Uninstall an application
async function uninstallAppInternal(app, sudoPassword) {
    try {
        // Safety check: Ensure we have a desktopFile path
        if (!app || !app.desktopFile || typeof app.desktopFile !== 'string') {
            return { success: false, error: 'Cannot uninstall: No desktop file specified' };
        }

        const filePath = app.desktopFile;

        const userHome = os.homedir();
        const userLaunchersDir = path.join(userHome, '.local/share/applications');
        const flatpakUserExportsDir = path.join(userHome, '.local/share/flatpak/exports/share/applications');
        const source = String(app.source || '').toLowerCase();
        const systemLauncherDirs = ['/usr/share/applications', '/usr/local/share/applications'];
        const snapLauncherDir = '/var/lib/snapd/desktop/applications';

        const inDir = (dir) => filePath === dir || filePath.startsWith(dir + path.sep);
        const inUserLaunchers = inDir(userLaunchersDir);
        const inFlatpakUserExports = inDir(flatpakUserExportsDir);
        const inSystemLaunchers = systemLauncherDirs.some(d => inDir(d));
        const inSnapLaunchers = inDir(snapLauncherDir);

        // Safety check: only allow actions on known launcher roots.
        if (!inUserLaunchers && !inFlatpakUserExports && !inSystemLaunchers && !inSnapLaunchers) {
            return { success: false, error: 'Cannot uninstall: Unsupported launcher location' };
        }

        // Check if file exists before attempting to uninstall
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
        } catch {
            return { success: false, error: 'Desktop file not found' };
        }

        // Read desktop file (used for Flatpak/Snap detection + IDs)
        let content = '';
        try {
            content = await fs.promises.readFile(filePath, 'utf-8');
        } catch {
            content = '';
        }

        const parsed = content ? parseDesktopFile(content) : {};
        const desktopFlatpakId = String(parsed['X-Flatpak'] || parsed['X-Flatpak-Application'] || '').trim();
        const isFlatpak = source === 'flatpak-user' || inFlatpakUserExports || !!desktopFlatpakId;

        if (isFlatpak) {
            const fallbackId = path.basename(filePath, '.desktop');
            const flatpakId = desktopFlatpakId || fallbackId;

            if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(flatpakId) || !flatpakId.includes('.')) {
                return { success: false, error: 'Cannot uninstall: Invalid Flatpak application ID' };
            }

            const cmd = `flatpak uninstall --user --noninteractive -y \"${shEscape(flatpakId)}\"`;
            const res = await execAsync(cmd, { timeout: 5 * 60 * 1000 });
            if (res.error) {
                const msg = String((res.stderr || '').trim() || (res.stdout || '').trim() || res.error.message || 'Flatpak uninstall failed');
                return { success: false, error: msg };
            }

            // Flatpak should remove the exported desktop file, but clean up if it's still there.
            if (inFlatpakUserExports) {
                try { await fs.promises.unlink(filePath); } catch { }
            }
        } else if (inSnapLaunchers || source === 'snap') {
            if (!(await hasCommand('snap'))) {
                return { success: false, error: 'Snap not found. Cannot uninstall Snap apps on this system.' };
            }

            const snapName = parseSnapNameFromDesktopEntry(parsed, filePath);
            if (!/^[a-z0-9][a-z0-9-]*$/.test(snapName)) {
                return { success: false, error: 'Cannot uninstall: Invalid Snap package name' };
            }

            const protectedSnaps = getSnapProtectedSet();
            if (protectedSnaps.has(snapName)) {
                return { success: false, error: 'Cannot uninstall: Protected system Snap package' };
            }

            const baseline = getSnapBaselineSet();
            if (baseline && baseline.has(snapName)) {
                return { success: false, error: 'Cannot uninstall: This Snap app is part of the system baseline' };
            }

            const cmd = `snap remove --purge ${snapName}`;
            const res = sudoPassword
                ? await runSudoShWithPassword(cmd, sudoPassword, { timeout: 10 * 60 * 1000 })
                : await runPrivilegedSh(cmd, { timeout: 10 * 60 * 1000 });

            const msg = String((res && (res.stderr || res.stdout)) || (res && res.error && res.error.message) || '').trim();
            if (res && res.error) {
                if (!sudoPassword && isPrivilegeErrorMessage(msg)) {
                    return { success: false, needsPassword: true, error: 'Administrator password required' };
                }
                if (sudoPassword && res.wrongPassword) {
                    return { success: false, wrongPassword: true, error: 'Wrong password' };
                }
                return { success: false, error: msg || 'Snap uninstall failed' };
            }
        } else if (inSystemLaunchers) {
            // System launcher: attempt safe APT uninstall (only for non-baseline, non-protected packages).
            if (!(await hasCommand('apt-get')) && !(await hasCommand('apt'))) {
                return { success: false, error: 'APT not found. Cannot uninstall system packages on this distro.' };
            }

            const pkg = await getAptPackageOwningFile(filePath);
            if (!pkg) {
                return { success: false, error: 'Cannot uninstall: This system app is not APT-managed (maybe Snap/Flatpak/system component).' };
            }

            const meta = await getDpkgPackageMeta(pkg);
            if (!meta || !meta.name) {
                return { success: false, error: 'Cannot uninstall: Failed to inspect package metadata' };
            }
            if (!/install ok installed/i.test(meta.status || '')) {
                return { success: false, error: 'Cannot uninstall: Package is not installed' };
            }

            const baseline = getAptBaselineSet();
            const protectedPkgs = getAptProtectedSet();

            if (protectedPkgs.has(meta.name)) {
                return { success: false, error: 'Cannot uninstall: Protected system package' };
            }

            if (baseline && baseline.has(meta.name)) {
                return { success: false, error: 'Cannot uninstall: This app is part of the system baseline' };
            }

            // If no baseline file is provided, require the package to be "manual" (user-selected) to avoid bricking.
            const manualSet = await getAptManualSet();
            if (!baseline) {
                if (!manualSet) {
                    return { success: false, error: 'Cannot uninstall: APT baseline not configured (missing apt-baseline.json) and apt-mark unavailable' };
                }
                if (!manualSet.has(meta.name)) {
                    return { success: false, error: 'Cannot uninstall: This package does not appear to be user-installed' };
                }
            } else if (manualSet && !manualSet.has(meta.name)) {
                return { success: false, error: 'Cannot uninstall: This package does not appear to be user-installed' };
            }

            const essential = String(meta.essential || '').toLowerCase() === 'yes';
            const priority = String(meta.priority || '').toLowerCase();
            if (essential || priority === 'required' || priority === 'important') {
                return { success: false, error: 'Cannot uninstall: Critical system package' };
            }

            const aptBin = (await hasCommand('apt-get')) ? 'apt-get' : 'apt';
            const removeCmd = `DEBIAN_FRONTEND=noninteractive ${aptBin} remove -y ${meta.name}`;
            const autoremoveCmd = `DEBIAN_FRONTEND=noninteractive ${aptBin} autoremove -y`;
            const fullCmd = `${removeCmd} && ${autoremoveCmd}`;

            const res = sudoPassword
                ? await runSudoShWithPassword(fullCmd, sudoPassword, { timeout: 10 * 60 * 1000 })
                : await runPrivilegedSh(fullCmd, { timeout: 10 * 60 * 1000 });

            const msg = String((res && (res.stderr || res.stdout)) || (res && res.error && res.error.message) || '').trim();
            if (res && res.error) {
                if (!sudoPassword && isPrivilegeErrorMessage(msg)) {
                    return { success: false, needsPassword: true, error: 'Administrator password required' };
                }
                if (sudoPassword && res.wrongPassword) {
                    return { success: false, wrongPassword: true, error: 'Wrong password' };
                }
                if (/could not get lock|unable to acquire the dpkg frontend lock|is another process using it/i.test(msg)) {
                    return { success: false, error: 'Another package manager is running. Close it and try again.' };
                }
                return { success: false, error: msg.substring(0, 300) || 'APT uninstall failed' };
            }
        } else {
            // Remove just the user-owned launcher entry (for AppImages/manual installs/etc.)
            await fs.promises.unlink(filePath);
        }

        // Refresh cache immediately so the renderer's next getInstalledApps() reflects the change.
        await refreshInstalledAppsCache('uninstall');

        return { success: true };
    } catch (error) {
        return { success: false, error: (error && error.message) ? error.message : String(error) };
    }
}

ipcMain.handle('apps:uninstall', async (event, app) => {
    if (process.platform !== 'linux') {
        return { success: false, error: 'Uninstalling apps is only supported on Linux' };
    }

    return await uninstallAppInternal(app, null);
});

ipcMain.handle('apps:uninstallWithPassword', async (event, payload) => {
    if (process.platform !== 'linux') {
        return { success: false, error: 'Uninstalling apps is only supported on Linux' };
    }
    const appObj = payload && payload.app ? payload.app : null;
    const password = payload && typeof payload.password === 'string' ? payload.password : '';
    if (!password || password.length > 512) {
        return { success: false, wrongPassword: true, error: 'Invalid password' };
    }
    return await uninstallAppInternal(appObj, password);
});

// ============================================
// HOLY UPDATER IPC
// ============================================
ipcMain.handle('updater:check', async () => {
    return new Promise((resolve) => {
        // Check for updates by doing git fetch and comparing
        // On Windows, use 'git fetch' then check rev-list
        const command = `git fetch origin main && git rev-list HEAD...origin/main --count`;

        exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
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
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        // Core update script (no sandbox fix - that's done separately)
        const updateScript = `git fetch origin main && git reset --hard origin/main && ${npmCmd} install --ignore-optional && ${npmCmd} run build -- --base=./`;

        const runUpdate = () => {
            exec(updateScript, { cwd: projectRoot, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    // Self-healing: On Linux, if we get EACCES/permission denied, try to reclaim ownership via pkexec
                    if (process.platform === 'linux' && (error.message.includes('EACCES') || error.message.includes('permission denied'))) {
                        console.log('Update failed with permissions error. Attempting to fix ownership via pkexec...');
                        const user = process.env.USER || 'temple';
                        const fixCmd = `pkexec chown -R ${user}:${user} "${projectRoot}"`;

                        exec(fixCmd, (fixErr) => {
                            if (fixErr) {
                                resolve({
                                    success: false,
                                    error: `Permission denied and failed to auto-fix: ${fixErr.message}`,
                                    output: stdout + '\n' + stderr + '\n' + 'Fix attempt failed.'
                                });
                            } else {
                                // Retry update after fixing permissions
                                runUpdate();
                            }
                        });
                        return;
                    }

                    resolve({
                        success: false,
                        error: error.message,
                        output: stdout + '\n' + stderr
                    });
                    return;
                }

                // Update succeeded! Now try to fix sandbox permissions (non-blocking)
                if (process.platform === 'linux') {
                    const sandboxPath = path.join(projectRoot, 'node_modules/electron/dist/chrome-sandbox');
                    const sandboxFixCmd = `sudo chown root:root "${sandboxPath}" && sudo chmod 4755 "${sandboxPath}"`;

                    // Try to fix sandbox in background - don't block on it
                    exec(sandboxFixCmd, { timeout: 5000 }, (sandboxErr) => {
                        if (sandboxErr) {
                            console.warn('[Holy Updater] Sandbox fix failed (may need manual fix):', sandboxErr.message);
                        } else {
                            console.log('[Holy Updater] Sandbox permissions fixed automatically');
                        }
                    });

                    // NEW: Install/Update GTK Theme (non-blocking, user mode)
                    // This ensures any new theme tweaks are applied to X11 apps after update
                    const themeScript = path.join(projectRoot, 'scripts/install-gtk-theme.sh');
                    // Ensure script is executable first
                    const themeCmd = `chmod +x "${themeScript}" && "${themeScript}" user`;

                    exec(themeCmd, { timeout: 15000 }, (themeErr, themeOut) => {
                        if (themeErr) {
                            console.warn('[Holy Updater] GTK Theme update failed:', themeErr.message);
                        } else {
                            console.log('[Holy Updater] GTK Theme updated successfully');
                        }
                    });

                    // NEW: Install/Update Openbox Theme (non-blocking, user mode)
                    const openboxScript = path.join(projectRoot, 'scripts/apply-theme.sh');
                    const openboxCmd = `chmod +x "${openboxScript}" && "${openboxScript}"`;

                    exec(openboxCmd, { timeout: 15000 }, (obErr, obOut) => {
                        if (obErr) {
                            console.warn('[Holy Updater] Openbox Theme update failed:', obErr.message);
                        } else {
                            console.log('[Holy Updater] Openbox Theme updated successfully');
                        }
                    });
                }

                resolve({
                    success: true,
                    output: stdout,
                    message: 'Update complete! Reboot to apply changes.'
                });
            });
        };

        runUpdate();
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
// SECURITY
// ============================================

ipcMain.handle('trigger-lockdown', async () => {
    const { execSync } = require('child_process');
    const results = [];
    try {
        execSync('loginctl lock-session', { timeout: 5000 });
        results.push('Session locked');
    } catch (e) {
        results.push('Lock failed');
    }
    try {
        execSync('nmcli networking off', { timeout: 5000 });
        results.push('Network disabled');
    } catch (e) {
        results.push('Network disable failed');
    }
    return { success: true, actions: results };
});

ipcMain.handle('set-dns', async (event, iface, primary, secondary) => {
    const { execSync } = require('child_process');
    try {
        const servers = [primary, secondary].filter(Boolean).join(' ');
        execSync(`sudo resolvectl dns ${iface || 'eth0'} ${servers}`, { timeout: 10000 });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ============================================
// TOR INTEGRATION
// ============================================

ipcMain.handle('security:setMacRandomization', async (event, enabled) => {
    if (process.platform !== 'linux') {
        return { success: false, error: 'Only supported on Linux' };
    }

    try {
        // Get List of all 802-11-wireless connections
        const res = await execAsync('nmcli -t -f UUID,TYPE connection show');
        if (res.error) throw new Error(res.stderr || 'Failed to list connections');

        const uuids = [];
        const lines = res.stdout.split('\n');
        for (const line of lines) {
            const parts = line.split(':');
            if (parts.length >= 2 && parts[1].trim() === '802-11-wireless') {
                uuids.push(parts[0].trim());
            }
        }

        const mode = enabled ? 'random' : 'permanent';
        // 'permanent' uses the hardware MAC address

        const errors = [];
        let modifiedCount = 0;

        for (const uuid of uuids) {
            const cmd = `nmcli connection modify ${shEscape(uuid)} 802-11-wireless.cloned-mac-address ${mode}`;
            const modifyRes = await execAsync(cmd);
            if (modifyRes.error) {
                errors.push(`Failed for ${uuid}: ${modifyRes.stderr}`);
            } else {
                modifiedCount++;
            }
        }

        console.log(`[Security] MAC Randomization set to ${mode} for ${modifiedCount} connections.`);

        if (errors.length > 0 && modifiedCount === 0) {
            return { success: false, error: errors.join('; ') };
        }

        return { success: true, modifiedCount, errors: errors.length > 0 ? errors : undefined };
    } catch (e) {
        console.error('[Security] Failed to set MAC randomization:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('security:getTorStatus', async () => {
    if (process.platform !== 'linux') {
        return { success: false, unsupported: true, running: false, mode: 'off' };
    }

    // Check if Tor service is running
    const status = await execAsync('systemctl is-active tor 2>/dev/null');
    const running = status.stdout.trim() === 'active';

    // Check if Tor is installed - check common paths directly
    let isInstalled = false;
    const commonPaths = ['/usr/bin/tor', '/usr/sbin/tor', '/bin/tor', '/sbin/tor'];

    // First try 'which' (or 'command -v' which is more standard)
    const whichCheck = await execAsync('command -v tor 2>/dev/null');
    if (!whichCheck.error && whichCheck.stdout.trim().length > 0) {
        isInstalled = true;
    } else {
        // Fallback: check file existence manually
        for (const p of commonPaths) {
            try {
                await fs.promises.access(p, fs.constants.X_OK);
                isInstalled = true;
                break;
            } catch { }
        }
    }

    // Debug logging
    console.log(`[Security] Tor check: running=${running}, installed=${isInstalled}`);

    return { success: true, running, installed: isInstalled };
});

ipcMain.handle('security:setTorEnabled', async (event, enabled) => {
    if (process.platform !== 'linux') {
        return { success: false, error: 'Not supported on this platform' };
    }

    const action = enabled ? 'start' : 'stop';

    // Try without sudo first (in case user has permission)
    const res = await execAsync(`systemctl ${action} tor 2>&1`);
    if (!res.error) {
        return { success: true };
    }

    // Try with pkexec for graphical sudo prompt
    const pkexecRes = await execAsync(`pkexec systemctl ${action} tor 2>&1`, { timeout: 30000 });
    if (!pkexecRes.error) {
        return { success: true };
    }

    return { success: false, error: pkexecRes.stderr || pkexecRes.error?.message || 'Failed to control Tor service' };
});

ipcMain.handle('security:installTor', async () => {
    if (process.platform !== 'linux') {
        return { success: false, error: 'Tor installation only supported on Linux' };
    }

    // Check if already installed
    try {
        const check = await execAsync('which tor 2>/dev/null');
        if (!check.error && check.stdout.trim().length > 0) {
            return { success: true, alreadyInstalled: true };
        }
    } catch (e) {
        // Not installed, continue
    }

    // Check if pkexec is available
    const pkexecCheck = await execAsync('which pkexec 2>/dev/null');
    const hasPkexec = !pkexecCheck.error && pkexecCheck.stdout.trim().length > 0;

    // Check if apt is available
    const aptCheck = await execAsync('which apt 2>/dev/null');
    if (aptCheck.error || aptCheck.stdout.trim().length === 0) {
        return { success: false, error: 'apt package manager not found. Are you on Debian/Ubuntu?' };
    }

    let installResult;

    if (hasPkexec) {
        // Try pkexec first (graphical sudo prompt)
        console.log('[Tor Install] Trying pkexec...');
        installResult = await execAsync('pkexec apt install -y tor 2>&1', { timeout: 120000 });
    } else {
        // Fallback: try sudo (will fail without password, but at least shows what's needed)
        console.log('[Tor Install] pkexec not found, trying sudo...');
        installResult = await execAsync('sudo apt install -y tor 2>&1', { timeout: 120000 });
    }

    if (installResult.error) {
        const errMsg = installResult.stderr || installResult.stdout || installResult.error?.message || 'Unknown error';
        console.error('[Tor Install] Failed:', errMsg);

        // Check for common issues
        if (errMsg.includes('Request dismissed') || errMsg.includes('Not authorized')) {
            return { success: false, error: 'Authentication cancelled or not authorized' };
        }
        if (errMsg.includes('Unable to locate package')) {
            return { success: false, error: 'Tor package not found. Try: sudo apt update first' };
        }
        if (errMsg.includes('Could not get lock')) {
            return { success: false, error: 'Another package manager is running. Close it and try again.' };
        }

        return { success: false, error: errMsg.substring(0, 200) };
    }

    // Verify installation succeeded
    const verifyCheck = await execAsync('which tor 2>/dev/null');
    if (verifyCheck.error || verifyCheck.stdout.trim().length === 0) {
        return { success: false, error: 'Installation completed but tor binary not found' };
    }

    return { success: true };
});

// ============================================
// APP LIFECYCLE
// ============================================

app.on('before-quit', () => {
    app.isQuitting = true;
    stopSnapDetector();
});

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

// ============================================
// GLOBAL SHORTCUTS FOR WORKSPACE KEYBINDS
// Primary: EVDEV daemon (bypasses X11 grabs)
// Fallback: Electron globalShortcut (works when no active X11 grabs)
// ============================================

let keybindDaemon = null;
let keybindFileWatcher = null;
let keybindFilePosition = 0;
const KEYBIND_ACTIONS_FILE = '/tmp/templeos-keybind.sock';
const KEYBIND_DEBUG_FILE = '/tmp/keybind-watcher-debug.txt';

// Debug helper for file watcher
function keybindDebug(msg) {
    try {
        fs.appendFileSync(KEYBIND_DEBUG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
}

/**
 * Start watching the keybind daemon output file.
 * The daemon is started by start-templeos.sh and writes actions to a file.
 * This approach avoids spawn() issues and works reliably.
 */
function startKeybindWatcher() {
    if (process.platform !== 'linux') {
        console.log('[KeybindWatcher] Not on Linux, using globalShortcut fallback only');
        return;
    }

    console.log('[KeybindWatcher] Starting file watcher for:', KEYBIND_ACTIONS_FILE);
    keybindDebug('=== WATCHER STARTING ===');
    keybindDebug(`Actions file: ${KEYBIND_ACTIONS_FILE}`);

    // Clear the file on startup to avoid processing stale actions
    try {
        if (fs.existsSync(KEYBIND_ACTIONS_FILE)) {
            fs.truncateSync(KEYBIND_ACTIONS_FILE, 0);
            keybindFilePosition = 0;
            keybindDebug('Truncated actions file, position reset to 0');
        }
    } catch (e) {
        keybindDebug(`Truncate error: ${e.message}`);
    }

    // Watch for file changes
    const processActions = () => {
        try {
            if (!fs.existsSync(KEYBIND_ACTIONS_FILE)) {
                return;
            }

            const content = fs.readFileSync(KEYBIND_ACTIONS_FILE, 'utf8');
            if (content.length <= keybindFilePosition) {
                return;
            }

            // Get new content since last read
            const newContent = content.substring(keybindFilePosition);
            keybindDebug(`New content (len=${newContent.length}): ${newContent.substring(0, 100)}`);
            keybindFilePosition = content.length;

            // Process each line (each action is a JSON line)
            const lines = newContent.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const msg = JSON.parse(line);
                    if (msg.action && mainWindow && !mainWindow.isDestroyed()) {
                        keybindDebug(`SENDING ACTION: ${msg.action}`);
                        console.log('[KeybindWatcher] Action:', msg.action);
                        mainWindow.webContents.send('global-shortcut', msg.action);
                    } else {
                        keybindDebug(`NOT SENDING: action=${msg.action}, mainWindow=${!!mainWindow}`);
                    }
                } catch (e) {
                    keybindDebug(`JSON parse error: ${e.message}`);
                }
            }
        } catch (e) {
            keybindDebug(`processActions error: ${e.message}`);
        }
    };

    // Use fs.watchFile for polling (more reliable than fs.watch for temp files)
    // Using very fast polling (16ms) for responsive start menu
    fs.watchFile(KEYBIND_ACTIONS_FILE, { interval: 16 }, (curr, prev) => {
        if (curr.mtime > prev.mtime || curr.size !== prev.size) {
            processActions();
        }
    });

    // Also check periodically in case watchFile misses events - faster polling
    keybindFileWatcher = setInterval(processActions, 20);

    keybindDebug('Watcher started with 16ms watchFile + 20ms interval');
    console.log('[KeybindWatcher] Watcher started, polling every 16-20ms');
}

/**
 * Stop the keybind file watcher.
 */
function stopKeybindWatcher() {
    if (keybindFileWatcher) {
        clearInterval(keybindFileWatcher);
        keybindFileWatcher = null;
    }
    try {
        fs.unwatchFile(KEYBIND_ACTIONS_FILE);
    } catch (e) {
        // Ignore
    }
    console.log('[KeybindWatcher] Watcher stopped');
}

app.whenReady().then(() => {
    console.log('[APP] app.whenReady() triggered');

    // ============================================
    // INLINE TTS HANDLERS - Voice of God
    // ============================================
    console.log('[TTS] Registering inline TTS handlers...');
    console.log('[TTS] Piper exists:', fs.existsSync(ttsConfig.piperPath));
    console.log('[TTS] Model exists:', fs.existsSync(ttsConfig.modelPath));

    // Helper: Speak text using Piper TTS
    async function speakWithPiper(text) {
        return new Promise((resolve, reject) => {
            if (ttsState.speaking) {
                reject(new Error('Already speaking'));
                return;
            }

            // Clean text for TTS
            const cleanedText = text
                .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold markdown
                .replace(/\*(.+?)\*/g, '$1')       // Remove italic
                .replace(/`(.+?)`/g, '$1')         // Remove code
                .replace(/#+\s*/g, '')             // Remove headers
                .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links to text
                .replace(/[<>]/g, '')              // Remove HTML-like
                .trim();

            if (!cleanedText) {
                resolve();
                return;
            }

            ttsState.speaking = true;
            console.log('[TTS] Speaking:', cleanedText.substring(0, 50) + '...');

            // Create temp file for audio
            const tempWav = path.join(os.tmpdir(), `tts_${Date.now()}.wav`);

            // Spawn Piper
            const piperArgs = [
                '--model', ttsConfig.modelPath,
                '--output_file', tempWav
            ];

            const piper = spawn(ttsConfig.piperPath, piperArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            ttsState.currentProcess = piper;

            piper.stdin.write(cleanedText);
            piper.stdin.end();

            let stderr = '';
            piper.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            piper.on('close', (code) => {
                if (code !== 0) {
                    ttsState.speaking = false;
                    ttsState.currentProcess = null;
                    console.error('[TTS] Piper failed:', stderr);
                    reject(new Error('Piper failed: ' + stderr));
                    return;
                }

                // Play the audio
                const isLinux = process.platform === 'linux';
                const player = isLinux ? 'aplay' : 'powershell';
                const playerArgs = isLinux
                    ? [tempWav]
                    : ['-c', `(New-Object Media.SoundPlayer '${tempWav}').PlaySync()`];

                const audio = spawn(player, playerArgs);
                ttsState.currentProcess = audio;

                audio.on('close', () => {
                    ttsState.speaking = false;
                    ttsState.currentProcess = null;
                    // Cleanup temp file
                    fs.unlink(tempWav, () => { });
                    resolve();
                });

                audio.on('error', (err) => {
                    ttsState.speaking = false;
                    ttsState.currentProcess = null;
                    fs.unlink(tempWav, () => { });
                    console.error('[TTS] Audio playback error:', err.message);
                    reject(err);
                });
            });

            piper.on('error', (err) => {
                ttsState.speaking = false;
                ttsState.currentProcess = null;
                console.error('[TTS] Piper spawn error:', err.message);
                reject(err);
            });
        });
    }

    // TTS Handler: Speak text
    ipcMain.handle('tts:speak', async (event, text) => {
        console.log('[TTS] tts:speak called, enabled:', ttsState.enabled, 'text length:', text?.length);

        if (!ttsState.enabled) {
            return { success: false, reason: 'disabled' };
        }

        if (!fs.existsSync(ttsConfig.piperPath) || !fs.existsSync(ttsConfig.modelPath)) {
            console.warn('[TTS] Piper not installed');
            return {
                success: false,
                reason: 'piper_not_installed',
                installInstructions: {
                    platform: process.platform,
                    piperDir: ttsConfig.piperDir,
                    downloadUrl: 'https://github.com/rhasspy/piper/releases',
                    modelUrl: 'https://huggingface.co/rhasspy/piper-voices'
                }
            };
        }

        try {
            await speakWithPiper(text);
            return { success: true };
        } catch (err) {
            console.error('[TTS] Speak error:', err.message);
            return { success: false, error: err.message };
        }
    });

    // TTS Handler: Set enabled state
    ipcMain.handle('tts:setEnabled', async (event, enabled) => {
        console.log('[TTS] tts:setEnabled:', enabled);
        ttsState.enabled = enabled;
        return { success: true, enabled };
    });

    // TTS Handler: Update settings (alias for setEnabled for compatibility)
    ipcMain.handle('tts:updateSettings', async (event, settings) => {
        console.log('[TTS] tts:updateSettings:', settings);
        if (typeof settings.enabled === 'boolean') {
            ttsState.enabled = settings.enabled;
        }
        return { success: true, settings: { enabled: ttsState.enabled } };
    });

    // TTS Handler: Get status
    ipcMain.handle('tts:getStatus', async () => {
        const available = fs.existsSync(ttsConfig.piperPath) && fs.existsSync(ttsConfig.modelPath);
        return {
            available,
            enabled: ttsState.enabled,
            speaking: ttsState.speaking,
            piperDir: ttsConfig.piperDir,
            modelLoaded: available,
            modelName: available ? 'en_US-lessac-high' : null,
            effectsAvailable: false,
            settings: { enabled: ttsState.enabled }
        };
    });

    // TTS Handler: Stop speech
    ipcMain.handle('tts:stop', async () => {
        if (ttsState.currentProcess) {
            try {
                ttsState.currentProcess.kill();
            } catch (e) {
                console.warn('[TTS] Failed to kill process:', e.message);
            }
            ttsState.currentProcess = null;
        }
        ttsState.speaking = false;
        return { success: true };
    });

    // TTS Handler: Check if speaking
    ipcMain.handle('tts:isSpeaking', async () => {
        return ttsState.speaking;
    });

    console.log('[TTS] Inline TTS handlers registered successfully');

    createWindow(); // Initial window creation

    // ============================================
    // SYSTEM TRAY (Feature Enhancement)
    // ============================================
    let tray = null;

    // Create tray icon - use a simple green circle as fallback
    const createTrayIcon = () => {
        // Try to load the temple logo, fallback to a generated icon
        const iconPath = path.join(__dirname, '../public/icons/temple-tray.png');
        let icon;

        try {
            if (fs.existsSync(iconPath)) {
                icon = nativeImage.createFromPath(iconPath);
            } else {
                // Create a simple 16x16 green circle as fallback
                icon = nativeImage.createEmpty();
            }
        } catch {
            icon = nativeImage.createEmpty();
        }

        // Resize for tray (16x16 on most systems)
        if (!icon.isEmpty()) {
            icon = icon.resize({ width: 16, height: 16 });
        }

        return icon;
    };

    try {
        const trayIcon = createTrayIcon();
        tray = new Tray(trayIcon);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show TempleOS',
                click: () => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            {
                label: 'Hide',
                click: () => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.hide();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.show();
                        mainWindow.focus();
                        mainWindow.webContents.send('global-shortcut', 'open-settings');
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('TempleOS Desktop');
        tray.setContextMenu(contextMenu);

        // Click on tray icon toggles window visibility
        tray.on('click', () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        });

        console.log('[Tray] System tray created successfully');
    } catch (err) {
        console.warn('[Tray] Failed to create system tray:', err.message);
    }

    // Start file watcher for evdev daemon (daemon started by start-templeos.sh)
    startKeybindWatcher();

    // Register globalShortcut as fallback (secondary - works when daemon unavailable)
    // These use XGrabKey which can be blocked by X11 apps with active grabs

    // Super (Windows key): Toggle Start Menu
    // Note: globalShortcut can't detect bare Super key tap, but daemon handles it
    globalShortcut.register('Super', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-shortcut', 'start-menu');
        }
    });

    // Ctrl+Alt+Tab: Cycle to next workspace (same as Ctrl+Alt+Right)
    const cycleWorkspace = () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-shortcut', 'workspace-next');
        }
    };
    globalShortcut.register('Control+Alt+Tab', cycleWorkspace);
    globalShortcut.register('Control+Alt+O', cycleWorkspace); // Alternate for daemon to bypass X11 Alt-Tab grabs

    // Ctrl+Alt+Left: Previous workspace
    globalShortcut.register('Control+Alt+Left', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-shortcut', 'workspace-prev');
        }
    });

    // Ctrl+Alt+Right: Next workspace
    globalShortcut.register('Control+Alt+Right', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-shortcut', 'workspace-next');
        }
    });

    // Ctrl+Alt+1-4: Direct workspace switch
    for (let i = 1; i <= 4; i++) {
        globalShortcut.register(`Control+Alt+${i}`, () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('global-shortcut', `workspace-${i}`);
            }
        });
    }

    console.log('[GlobalShortcut] Workspace keybinds registered (XGrabKey fallback)');

    // ============================================
    // ADDITIONAL KEYBOARD SHORTCUTS
    // ============================================

    // Super+T: Open Terminal
    globalShortcut.register('Super+T', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-shortcut', 'open-terminal');
        }
    });

    // Alt+F4: Close focused window
    globalShortcut.register('Alt+F4', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-shortcut', 'close-window');
        }
    });

    // Super+V: Open Clipboard Manager
    globalShortcut.register('Super+V', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-shortcut', 'clipboard-manager');
        }
    });

    console.log('[GlobalShortcut] Additional shortcuts registered (Super+T, Alt+F4, Super+V)');
});

// Cleanup on quit
app.on('will-quit', () => {
    stopKeybindDaemon();
    globalShortcut.unregisterAll();
});
