#!/usr/bin/env node
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { spawnSync } from 'node:child_process';

function usage(msg) {
  if (msg) console.error(msg);
  console.error(`\nUsage:
  add-to-launcher <path-to-executable-or-appimage> --name "App Name" [options]

Options:
  --id <desktop-id>          Override generated id (default: derived from name)
  --icon <path-or-url>       Icon image path or https? URL (png/svg preferred)
  --categories <c1;c2;...>   Desktop Categories list (semicolon-separated)
  --comment <text>           Comment/description
  --make-executable          chmod +x the target path

Examples:
  add-to-launcher ~/Apps/Foo.AppImage --name "Foo" --icon https://example.com/foo.png
  add-to-launcher /opt/bar/bar --name "Bar" --icon ./bar.svg --categories "Utility;Development;"
`);
  process.exit(msg ? 1 : 0);
}

function toId(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'custom-app';
}

function quoteExecArg(arg) {
  const s = String(arg);
  if (!s) return '""';
  if (/[\s"]/g.test(s)) return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  return s;
}

function isHttpUrl(s) {
  return /^https?:\/\//i.test(String(s || '').trim());
}

async function downloadTo(urlStr, destPath, maxRedirects = 3) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const getter = url.protocol === 'https:' ? https.get : http.get;
    const req = getter(url, res => {
      // Redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        downloadTo(next, destPath, maxRedirects - 1).then(resolve, reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const file = fsSync.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length) usage();

  const target = argv[0];
  const opts = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage();
    if (a === '--make-executable') { opts.makeExecutable = true; continue; }
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) usage(`Missing value for ${a}`);
      opts[k] = v;
      i++;
      continue;
    }
    usage(`Unexpected argument: ${a}`);
  }

  const name = String(opts.name || '').trim();
  if (!name) usage('Missing required --name');

  const idBase = String(opts.id || toId(name)).replace(/\.desktop$/i, '');
  const desktopFileName = `${idBase}.desktop`;

  const home = os.homedir();
  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(home, '.local/share');
  const applicationsDir = path.join(xdgDataHome, 'applications');
  const desktopPath = path.join(applicationsDir, desktopFileName);

  const absTarget = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);

  if (opts.makeExecutable) {
    try { await fs.chmod(absTarget, 0o755); } catch (e) { usage(`chmod failed: ${e.message || e}`); }
  }

  // Icon handling: copy/download into ~/.local/share/icons/hicolor/... and reference by name (no extension).
  let iconField = 'application-x-executable';
  const iconArg = String(opts.icon || '').trim();
  if (iconArg) {
    const iconExt = (p) => {
      const m = String(p).toLowerCase().match(/\.(png|svg|xpm)$/);
      return m ? m[1] : 'png';
    };
    const ext = iconExt(iconArg);
    const iconName = idBase; // reference name for theme lookup
    const iconDest = path.join(xdgDataHome, 'icons', 'hicolor', '256x256', 'apps', `${iconName}.${ext}`);
    try {
      if (isHttpUrl(iconArg)) {
        await downloadTo(iconArg, iconDest);
      } else {
        const absIcon = path.isAbsolute(iconArg) ? iconArg : path.resolve(process.cwd(), iconArg);
        await fs.mkdir(path.dirname(iconDest), { recursive: true });
        await fs.copyFile(absIcon, iconDest);
      }
      iconField = iconName;
    } catch (e) {
      console.error(`[add-to-launcher] Warning: failed to set icon (${e.message || e}); using default icon.`);
    }
  }

  const categories = String(opts.categories || '').trim();
  const comment = String(opts.comment || '').trim();

  const desktopText = [
    '[Desktop Entry]',
    'Version=1.0',
    'Type=Application',
    `Name=${name}`,
    comment ? `Comment=${comment}` : null,
    `Exec=${quoteExecArg(absTarget)} %U`,
    `Icon=${iconField}`,
    'Terminal=false',
    categories ? `Categories=${categories.endsWith(';') ? categories : `${categories};`}` : null,
    'StartupNotify=true',
    ''
  ].filter(Boolean).join('\n');

  await fs.mkdir(applicationsDir, { recursive: true });
  await fs.writeFile(desktopPath, desktopText, { encoding: 'utf-8', mode: 0o644 });

  // Best-effort: update desktop database if available (not required for simple launchers that scan .desktop directly).
  try {
    const res = spawnSync('update-desktop-database', [applicationsDir], { stdio: 'ignore' });
    if (res.error) throw res.error;
  } catch {
    // ignore
  }

  console.log(`[add-to-launcher] Created: ${desktopPath}`);
  console.log(`[add-to-launcher] Hint: restart your launcher or wait for it to rescan .desktop files.`);
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});

