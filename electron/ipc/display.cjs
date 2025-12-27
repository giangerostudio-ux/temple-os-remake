/**
 * Display IPC handlers
 * Handles display:*, mouse:*, system:setResolution, system:getResolutions IPC channels
 */

const { ipcMain, screen } = require('electron');
const { execAsync, shEscape, buildSwayEnvPrefix, listRatbagDevices, ipcSuccess, ipcError, os } = require('./utils.cjs');

function registerDisplayHandlers() {
    ipcMain.handle('mouse:apply', async (event, settings) => {
        if (process.platform !== 'linux') return ipcSuccess();

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
                await execAsync(`xinput --set-prop ${id} 'libinput Accel Speed' ${speed} 2>/dev/null`);
                const profile = raw ? '0 1' : '1 0';
                await execAsync(`xinput --set-prop ${id} 'libinput Accel Profile Enabled' ${profile} 2>/dev/null`);
                await execAsync(`xinput --set-prop ${id} 'libinput Natural Scrolling Enabled' ${naturalScroll ? 1 : 0} 2>/dev/null`);
            }
        }

        // Sway fallback
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

        return ipcSuccess({ warnings: [...new Set(errors)].slice(0, 10) });
    });

    ipcMain.handle('display:getOutputs', async () => {
        if (process.platform !== 'linux') {
            try {
                const displays = screen.getAllDisplays();
                const outputs = displays.map(d => {
                    const { width, height } = d.size;
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
                return ipcSuccess({ outputs });
            } catch (error) {
                return ipcError(error.message || String(error));
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
                            ? { width: o.current_mode.width, height: o.current_mode.height, refreshHz: o.current_mode.refresh ? Math.round((o.current_mode.refresh / 1000) * 100) / 100 : null }
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
                    return ipcSuccess({ backend: 'swaymsg', outputs: mapped });
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
            return ipcSuccess({ backend: 'xrandr', outputs });
        }

        return ipcError('Failed to read display outputs');
    });

    ipcMain.handle('display:setMode', async (event, payload) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
        const mode = payload && typeof payload.mode === 'string' ? payload.mode : '';
        if (!outputName || !mode) return ipcError('Invalid request');

        const m = mode.match(/^(\d{2,5})x(\d{2,5})(?:@(\d+(\.\d+)?))?/);
        if (!m) return ipcError('Invalid mode');
        const width = parseInt(m[1], 10);
        const height = parseInt(m[2], 10);
        const hz = m[3] ? parseFloat(m[3]) : null;

        const prefix = buildSwayEnvPrefix();
        const swayArg = hz ? `${width}x${height}@${hz}Hz` : `${width}x${height}`;
        const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" mode ${swayArg} 2>/dev/null`);
        if (!sway.error) return ipcSuccess({ backend: 'swaymsg' });

        const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
        const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --mode ${width}x${height}${hz ? ` --rate ${hz}` : ''} 2>/dev/null`, { env });
        if (!xr.error) return ipcSuccess({ backend: 'xrandr' });

        return ipcError(sway.stderr || xr.stderr || 'Failed to set mode');
    });

    ipcMain.handle('display:setScale', async (event, payload) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
        const scale = payload && typeof payload.scale === 'number' ? payload.scale : NaN;
        if (!outputName || !Number.isFinite(scale) || scale <= 0) return ipcError('Invalid request');

        const prefix = buildSwayEnvPrefix();
        const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" scale ${scale} 2>/dev/null`);
        if (!sway.error) return ipcSuccess({ backend: 'swaymsg' });

        const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
        const scaleStr = String(scale);
        const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --scale ${scaleStr}x${scaleStr} 2>/dev/null`, { env });
        if (!xr.error) return ipcSuccess({ backend: 'xrandr' });

        return ipcError('Failed to set scale');
    });

    ipcMain.handle('display:setTransform', async (event, payload) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const outputName = payload && typeof payload.outputName === 'string' ? payload.outputName : '';
        const transform = payload && typeof payload.transform === 'string' ? payload.transform : '';
        if (!outputName || !transform) return ipcError('Invalid request');

        const prefix = buildSwayEnvPrefix();
        const sway = await execAsync(`${prefix ? prefix + ' ' : ''}swaymsg output "${shEscape(outputName)}" transform ${shEscape(transform)} 2>/dev/null`);
        if (!sway.error) return ipcSuccess({ backend: 'swaymsg' });

        const rotateMap = { normal: 'normal', '90': 'left', '180': 'inverted', '270': 'right' };
        const rot = rotateMap[transform] || null;
        if (!rot) return ipcError('Unsupported transform on X11');
        const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
        const xr = await execAsync(`xrandr --output "${shEscape(outputName)}" --rotate ${rot} 2>/dev/null`, { env });
        if (!xr.error) return ipcSuccess({ backend: 'xrandr' });

        return ipcError('Failed to set transform');
    });

    ipcMain.handle('system:setResolution', async (event, resolution) => {
        const m = String(resolution || '').trim().match(/^(\d{2,5})x(\d{2,5})$/);
        if (!m) return ipcError('Invalid resolution format');
        const width = parseInt(m[1], 10);
        const height = parseInt(m[2], 10);

        if (process.platform !== 'linux') {
            return ipcError('Resolution change not supported on this platform');
        }

        const prefix = buildSwayEnvPrefix();
        const waylandCmd = `${prefix ? prefix + ' ' : ''}swaymsg output '*' mode ${width}x${height} 2>/dev/null`;
        const waylandRes = await execAsync(waylandCmd);
        if (!waylandRes.error) return ipcSuccess({ backend: 'swaymsg' });

        const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };
        const xr = await execAsync('xrandr 2>/dev/null', { env });
        if (!xr.error && xr.stdout) {
            const connected = xr.stdout.split('\n').find(l => /\sconnected\b/.test(l));
            const outputName = connected ? connected.trim().split(/\s+/)[0] : null;
            if (outputName) {
                const setRes = await execAsync(`xrandr --output "${shEscape(outputName)}" --mode ${width}x${height} 2>/dev/null`, { env });
                if (!setRes.error) return ipcSuccess({ backend: 'xrandr' });
            }
        }

        return ipcError('Failed to set resolution');
    });

    ipcMain.handle('system:getResolutions', async () => {
        if (process.platform !== 'linux') {
            return ipcSuccess({ resolutions: ['1920x1080', '1280x720', '1024x768', '800x600'], current: '1920x1080' });
        }

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
                    return ipcSuccess({ resolutions: [...new Set(resolutions)].sort(), current });
                }
            } catch (e) {
                // fall through
            }
        }

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
            return ipcSuccess({ resolutions: [...new Set(resolutions)].sort(), current });
        }

        return ipcSuccess({ resolutions: ['1920x1080', '1280x720', '1024x768', '800x600'], current: '1024x768' });
    });

    ipcMain.handle('mouse:getDpiInfo', async () => {
        const devices = await listRatbagDevices();
        if (!devices.length) return ipcSuccess({ supported: false, devices: [] });

        const deviceId = devices[0].id;
        const dpiGet = await execAsync(`ratbagctl dpi get "${shEscape(deviceId)}" 2>/dev/null`);
        const dpiAll = await execAsync(`ratbagctl dpi get-all "${shEscape(deviceId)}" 2>/dev/null`);

        const current = dpiGet.stdout.match(/\d+/)?.[0] ? parseInt(dpiGet.stdout.match(/\d+/)[0], 10) : null;
        const values = (dpiAll.stdout.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => Number.isFinite(n));

        return ipcSuccess({
            supported: true,
            devices,
            deviceId,
            currentDpi: current,
            dpiValues: [...new Set(values)].sort((a, b) => a - b)
        });
    });

    ipcMain.handle('mouse:setDpi', async (event, payload) => {
        if (process.platform !== 'linux') return ipcError('Not supported on this platform');
        const dpi = payload && typeof payload.dpi === 'number' ? Math.round(payload.dpi) : NaN;
        if (!Number.isFinite(dpi) || dpi <= 0) return ipcError('Invalid DPI');

        const devices = await listRatbagDevices();
        if (!devices.length) return ipcError('ratbagctl not available');

        const requested = payload && typeof payload.deviceId === 'string' && payload.deviceId.trim() ? payload.deviceId.trim() : devices[0].id;
        const ok = devices.find(d => d.id === requested) ? requested : devices[0].id;
        const res = await execAsync(`ratbagctl dpi set ${dpi} "${shEscape(ok)}" 2>/dev/null`);
        if (res.error) return ipcError(res.stderr || res.error.message);
        return ipcSuccess();
    });

    console.log('[IPC] Display handlers registered');
}

module.exports = { registerDisplayHandlers };
