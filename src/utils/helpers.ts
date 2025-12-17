// ============================================
// UTILITY HELPER FUNCTIONS
// ============================================

import { FILE_ICON_MAP, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, AUDIO_EXTENSIONS } from './constants';

/**
 * Get file icon emoji based on file name and type
 */
export function getFileIcon(name: string, isDirectory: boolean): string {
    if (isDirectory) return '📁';

    const ext = name.split('.').pop()?.toLowerCase() || '';
    return FILE_ICON_MAP[ext] || '📄';
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Get base name from path
 */
export function getBaseName(p: string): string {
    const parts = p.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] || '';
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImageFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Check if file is a video
 */
export function isVideoFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Check if file is audio
 */
export function isAudioFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Format uptime seconds to human-readable string
 */
export function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

/**
 * Format memory bytes to human-readable string
 */
export function formatMemory(bytes: number): string {
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)} MB`;
}

/**
 * Generate random ID
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return function (...args: Parameters<T>) {
        if (timeout !== null) clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), wait);
    };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function (...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Get random item from array
 */
export function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Convert ANSI color codes to HTML
 * (Minimal implementation for terminal output)
 */
export function ansiToHtml(line: string): string {
    const FG: Record<number, string> = {
        30: 'var(--tos-black)', 31: 'var(--tos-red)', 32: 'var(--tos-green)',
        33: 'var(--tos-yellow)', 34: 'var(--tos-blue)', 35: 'var(--tos-magenta)',
        36: 'var(--tos-cyan)', 37: 'var(--tos-light-gray)',
        90: 'var(--tos-dark-gray)', 91: 'var(--tos-light-red)',
        92: 'var(--tos-light-green)', 93: 'var(--tos-yellow)',
        94: 'var(--tos-light-blue)', 95: 'var(--tos-light-magenta)',
        96: 'var(--tos-light-cyan)', 97: 'var(--tos-white)',
    };

    const BG: Record<number, string> = {
        40: 'var(--tos-black)', 41: 'var(--tos-red)', 42: 'var(--tos-green)',
        43: 'var(--tos-yellow)', 44: 'var(--tos-blue)', 45: 'var(--tos-magenta)',
        46: 'var(--tos-cyan)', 47: 'var(--tos-light-gray)',
        100: 'var(--tos-dark-gray)', 101: 'var(--tos-light-red)',
        102: 'var(--tos-light-green)', 103: 'var(--tos-yellow)',
        104: 'var(--tos-light-blue)', 105: 'var(--tos-light-magenta)',
        106: 'var(--tos-light-cyan)', 107: 'var(--tos-white)',
    };

    let fg: string | null = null;
    let bg: string | null = null;
    let bold = false;

    const urlRe = /(https?:\/\/[^\s<>"']+)/g;

    const renderChunk = (text: string) => {
        if (!text) return '';
        const escaped = escapeHtml(text);
        const linked = escaped.replace(urlRe, (m) => {
            const safe = escapeHtml(m);
            return `<a class="terminal-link" data-url="${safe}">${safe}</a>`;
        });
        const style: string[] = [];
        if (fg) style.push(`color:${fg}`);
        if (bg) style.push(`background:${bg}`);
        if (bold) style.push('font-weight:700');
        if (style.length) return `<span style="${style.join(';')}">${linked}</span>`;
        return linked;
    };

    let out = '';
    let i = 0;
    let buf = '';

    while (i < line.length) {
        const ch = line[i];
        if (ch === '\x1b' && line[i + 1] === '[') {
            out += renderChunk(buf);
            buf = '';
            const end = line.indexOf('m', i + 2);
            if (end === -1) break;
            const seq = line.slice(i + 2, end);
            const codes = seq.split(';').filter(Boolean).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
            if (codes.length === 0) codes.push(0);

            for (const c of codes) {
                if (c === 0) {
                    fg = null; bg = null; bold = false;
                } else if (c === 1) {
                    bold = true;
                } else if (FG[c]) {
                    fg = FG[c];
                } else if (BG[c]) {
                    bg = BG[c];
                } else if (c === 39) {
                    fg = null;
                } else if (c === 49) {
                    bg = null;
                }
            }

            i = end + 1;
            continue;
        }
        buf += ch;
        i += 1;
    }
    out += renderChunk(buf);
    return out;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Wait for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date to locale string
 */
export function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Get file extension
 */
export function getExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Strip extension from filename
 */
export function stripExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length > 1) {
        parts.pop();
    }
    return parts.join('.');
}
