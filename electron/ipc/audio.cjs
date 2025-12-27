/**
 * Audio IPC handlers
 * Handles audio:* IPC channels (PulseAudio / PipeWire via pactl/wpctl)
 */

const { ipcMain } = require('electron');
const { execAsync, shEscape, ipcSuccess, ipcError } = require('./utils.cjs');

function parseWpctlStatusDevices(statusText) {
    const lines = String(statusText || '').split('\n').map(l => l.replace(/\r/g, ''));
    let section = null;

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

function registerAudioHandlers() {
    ipcMain.handle('audio:listDevices', async () => {
        if (process.platform !== 'linux') {
            return ipcSuccess({ sinks: [], sources: [], defaultSink: null, defaultSource: null });
        }

        const info = await execAsync('pactl info 2>/dev/null');
        const sinks = await execAsync('pactl list sinks short 2>/dev/null');
        const sources = await execAsync('pactl list sources short 2>/dev/null');

        if (sinks.error && sources.error) {
            // Try wpctl (wireplumber) as fallback
            const wpctl = await execAsync('wpctl status 2>/dev/null');
            if (!wpctl.error && wpctl.stdout) {
                const parsed = parseWpctlStatusDevices(wpctl.stdout);
                return ipcSuccess({
                    sinks: parsed.sinks,
                    sources: parsed.sources,
                    defaultSink: parsed.defaultSink,
                    defaultSource: parsed.defaultSource,
                    backend: 'wpctl'
                });
            }
            return ipcError('Audio tools not available (pactl/wpctl missing)');
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

        return ipcSuccess({
            sinks: parseShort(sinks.stdout),
            sources: parseShort(sources.stdout),
            defaultSink,
            defaultSource
        });
    });

    ipcMain.handle('audio:setDefaultSink', async (event, sinkName) => {
        if (process.platform !== 'linux') return ipcSuccess();
        const sink = String(sinkName || '').trim();
        if (!sink) return ipcError('Invalid sink');

        // Prefer wpctl on PipeWire
        const wpctlDirect = await execAsync(`wpctl set-default "${shEscape(sink)}" 2>/dev/null`);
        if (!wpctlDirect.error) return ipcSuccess({ backend: 'wpctl' });

        const wpctlStatus = await execAsync('wpctl status 2>/dev/null');
        if (!wpctlStatus.error && wpctlStatus.stdout) {
            const parsed = parseWpctlStatusDevices(wpctlStatus.stdout);
            const match = parsed.sinks.find(s => s.name === sink || s.id === sink);
            if (match) {
                const wpctlById = await execAsync(`wpctl set-default "${shEscape(match.id)}" 2>/dev/null`);
                if (!wpctlById.error) return ipcSuccess({ backend: 'wpctl' });
            }
        }

        const pactl = await execAsync(`pactl set-default-sink "${shEscape(sink)}" 2>/dev/null`);
        if (!pactl.error) return ipcSuccess({ backend: 'pactl' });

        return ipcError('Failed to set default sink');
    });

    ipcMain.handle('audio:setDefaultSource', async (event, sourceName) => {
        if (process.platform !== 'linux') return ipcSuccess();
        const source = String(sourceName || '').trim();
        if (!source) return ipcError('Invalid source');

        const wpctlDirect = await execAsync(`wpctl set-default "${shEscape(source)}" 2>/dev/null`);
        if (!wpctlDirect.error) return ipcSuccess({ backend: 'wpctl' });

        const wpctlStatus = await execAsync('wpctl status 2>/dev/null');
        if (!wpctlStatus.error && wpctlStatus.stdout) {
            const parsed = parseWpctlStatusDevices(wpctlStatus.stdout);
            const match = parsed.sources.find(s => s.name === source || s.id === source);
            if (match) {
                const wpctlById = await execAsync(`wpctl set-default "${shEscape(match.id)}" 2>/dev/null`);
                if (!wpctlById.error) return ipcSuccess({ backend: 'wpctl' });
            }
        }

        const pactl = await execAsync(`pactl set-default-source "${shEscape(source)}" 2>/dev/null`);
        if (!pactl.error) return ipcSuccess({ backend: 'pactl' });

        return ipcError('Failed to set default source');
    });

    ipcMain.handle('audio:setVolume', async (event, level) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');

        const raw = typeof level === 'number' ? level : parseInt(String(level), 10);
        if (!Number.isFinite(raw)) return ipcError('Invalid volume level');
        const safeLevel = Math.max(0, Math.min(100, Math.round(raw)));

        // Ubuntu 24.04 / PipeWire: prefer wpctl
        for (const target of ['@DEFAULT_AUDIO_SINK@', '@DEFAULT_SINK@']) {
            const wpctlResult = await execAsync(`wpctl set-volume ${target} ${safeLevel}% 2>/dev/null`);
            if (!wpctlResult.error) return ipcSuccess({ backend: 'wpctl' });
        }

        const pactlResult = await execAsync(`pactl set-sink-volume @DEFAULT_SINK@ ${safeLevel}% 2>/dev/null`);
        if (!pactlResult.error) return ipcSuccess({ backend: 'pactl' });

        const amixerResult = await execAsync(`amixer -q set Master ${safeLevel}% 2>/dev/null`);
        return amixerResult.error ? ipcError(amixerResult.error.message) : ipcSuccess({ backend: 'amixer' });
    });

    console.log('[IPC] Audio handlers registered');
}

module.exports = { registerAudioHandlers };
