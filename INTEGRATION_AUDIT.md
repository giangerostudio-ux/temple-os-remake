# Integration Audit (IPC Backend)

Date: 2025-12-17

Scope / what I actually scanned:
- IPC handlers: `electron/main.cjs` (this repo does not currently have a separate "backend TypeScript" IPC layer; the IPC handlers live in this CommonJS file).
- IPC exposure layer: `electron/preload.cjs` (confirms what the renderer can actually call).

High-level honesty check:
- There is **no separate "Ubuntu server backend"** in this codebase. The renderer talks to the Electron **main process** via IPC, and the main process runs **local** OS commands on Linux (e.g., `nmcli`, `pactl`, `ufw`, `systemctl`).
- ✅ "Lock" now triggers the UI overlay **and** attempts a real OS session lock on Linux (best-effort via `loginctl`/`xdg-screensaver`/`dm-tool`/DBus).
- ✅ Battery-status IPC now exists (`system:getBattery`, exposed as `getBatteryStatus` in preload) using `upower`/`acpi` on Linux, and the UI shows a taskbar battery indicator.

## IPC Feature Table

Implementation Status meanings (per your request):
- **REAL** = executes a real OS/library call (or attempts a real Linux command) rather than returning a hardcoded demo string.
- **MOCK/PLACEHOLDER** = does not touch the OS for that feature (or returns hardcoded demo data as the primary behavior).

| Feature Name | Implementation Status | Actual Command / Library Function |
|---|---|---|
| Close Window (`close-window`) | REAL | <code>mainWindow.close()</code> (`electron/main.cjs:656`) |
| Minimize Window (`minimize-window`) | REAL | <code>mainWindow.minimize()</code> (`electron/main.cjs:660`) |
| Maximize / Restore Window (`maximize-window`) | REAL | <code>mainWindow.maximize()</code> / <code>mainWindow.unmaximize()</code> (`electron/main.cjs:664`) |
| Move / Resize Window (`window:setBounds`) | REAL | <code>mainWindow.setBounds(bounds)</code> (`electron/main.cjs:674`) |
| List Directory (`fs:readdir`) | REAL | <code>fs.promises.readdir(dirPath, { withFileTypes: true })</code> + <code>fs.promises.stat(fullPath)</code> (`electron/main.cjs:685`) |
| Read File (`fs:readFile`) | REAL | <code>fs.promises.readFile(filePath, 'utf-8')</code> (`electron/main.cjs:725`) |
| Write File (`fs:writeFile`) | REAL | <code>fs.promises.writeFile(filePath, content, 'utf-8')</code> (`electron/main.cjs:734`) |
| Delete File/Folder (`fs:delete`) | REAL | <code>fs.promises.rm(itemPath, { recursive: true })</code> / <code>fs.promises.unlink(itemPath)</code> (`electron/main.cjs:743`) |
| Move to Trash (`fs:trash`) | REAL | Linux: internal trash impl (rename/copy into <code>~/.local/share/Trash</code>)<br>Non-Linux: <code>shell.trashItem(target)</code> (`electron/main.cjs:757`) |
| List Trash (`fs:listTrash`) | REAL | Linux: internal trash listing via <code>fs.promises.readdir</code> + parsing <code>.trashinfo</code> (`electron/main.cjs:778`) |
| Restore Trash Item (`fs:restoreTrash`) | REAL | Linux: internal restore via <code>fs.promises.rename</code> (+ collision rename) (`electron/main.cjs:788`) |
| Permanently Delete Trash Item (`fs:deleteTrashItem`) | REAL | Linux: <code>fs.promises.rm(...)</code>/<code>unlink(...)</code> + delete <code>.trashinfo</code> (`electron/main.cjs:800`) |
| Empty Trash (`fs:emptyTrash`) | REAL | Linux: <code>fs.promises.rm(trash/files)</code> + <code>fs.promises.rm(trash/info)</code> (`electron/main.cjs:819`) |
| Create Directory (`fs:mkdir`) | REAL | <code>fs.promises.mkdir(dirPath, { recursive: true })</code> (`electron/main.cjs:832`) |
| Rename (`fs:rename`) | REAL | <code>fs.promises.rename(oldPath, newPath)</code> (`electron/main.cjs:841`) |
| Copy (`fs:copy`) | REAL | <code>fs.promises.cp(srcPath, destPath, { recursive: true })</code> (fallback: manual copy loop) (`electron/main.cjs:850`) |
| Create Zip (`fs:createZip`) | REAL | <code>new AdmZip()</code> + <code>zip.addLocalFolder</code>/<code>zip.addLocalFile</code> + <code>zip.writeZip(targetZipPath)</code> (`electron/main.cjs:903`) |
| Extract Zip (`fs:extractZip`) | REAL | <code>new AdmZip(zipPath).extractAllTo(targetDir, true)</code> (`electron/main.cjs:922`) |
| Get Home Dir (`fs:getHome`) | REAL | <code>os.homedir()</code> (`electron/main.cjs:933`) |
| Get App Path (`fs:getAppPath`) | REAL | <code>app.getAppPath()</code> (`electron/main.cjs:934`) |
| Open External URL/Path (`fs:openExternal`) | REAL | <code>shell.openExternal(url)</code> or <code>shell.openPath(path)</code> (`electron/main.cjs:936`) |
| Extract EXIF (`exif:extract`) | REAL | <code>fs.promises.readFile(target)</code> + <code>extractExifFromBuffer(buf)</code> (custom parser) (`electron/main.cjs:953`) |
| Strip EXIF/Metadata (`exif:strip`) | REAL | <code>stripImageMetadata(buf)</code> (custom) + write backup + overwrite file (`electron/main.cjs:969`) |
| Shutdown (`system:shutdown`) | REAL | <code>exec('systemctl poweroff')</code> (`electron/main.cjs:1010`) |
| Restart (`system:restart`) | REAL | <code>exec('systemctl reboot')</code> (`electron/main.cjs:1014`) |
| Lock Screen (`system:lock`) | REAL (best-effort) | <code>mainWindow.webContents.send('lock-screen')</code> + best-effort OS lock on Linux via <code>loginctl</code>/<code>xdg-screensaver</code>/<code>dm-tool</code>/DBus. (`electron/main.cjs`) |
| Battery Status (`system:getBattery`) | REAL | Linux: <code>upower -e</code> + <code>upower -i &lt;device&gt;</code> (fallback: <code>acpi -b</code>); non-Linux returns <code>supported: false</code>. (`electron/main.cjs`) |
| Get System Info (`system:info`) | REAL | <code>os.platform()</code>, <code>os.hostname()</code>, <code>os.uptime()</code>, <code>os.totalmem()</code>, <code>os.freemem()</code>, <code>os.cpus()</code>, <code>os.userInfo()</code> (`electron/main.cjs:1023`) |
| System Monitor Stats (`monitor:getStats`) | REAL | CPU: <code>os.cpus()</code> sampling<br>Disk: <code>df -kP / 2&gt;/dev/null</code><br>Network: read <code>/proc/net/dev</code> (`electron/main.cjs:1035`) |
| List Processes (`process:list`) | REAL | <code>LC_ALL=C ps -eo pid=,comm=,%cpu=,%mem=,rss=,etime=,args= --sort=-%cpu &#124; head -n 200</code> (`electron/main.cjs:1115`) |
| Kill Process (`process:kill`) | REAL | <code>kill -TERM &lt;pid&gt;</code> or <code>kill -KILL &lt;pid&gt;</code> (`electron/main.cjs:1152`) |
| Load Config (`config:load`) | REAL | <code>fs.promises.readFile(configPath, 'utf-8')</code> + <code>JSON.parse</code> (`electron/main.cjs:1173`) |
| Save Config (`config:save`) | REAL | <code>fs.promises.writeFile(tmp, JSON.stringify(...))</code> + <code>fs.promises.rename(tmp, configPath)</code> (`electron/main.cjs:1183`) |
| Set System Volume (`system:setVolume`) | REAL | Linux: <code>amixer -q set Master &lt;level&gt;%</code> (non-Linux returns <code>unsupported</code>) (`electron/main.cjs:1195`) |
| List Audio Devices (`audio:listDevices`) | REAL | <code>pactl info</code><br><code>pactl list sinks short</code><br><code>pactl list sources short</code> (`electron/main.cjs:1221`) |
| Set Default Sink (`audio:setDefaultSink`) | REAL | <code>pactl set-default-sink "&lt;sinkName&gt;" 2&gt;/dev/null</code> (`electron/main.cjs:1261`) |
| Set Default Source (`audio:setDefaultSource`) | REAL | <code>pactl set-default-source "&lt;sourceName&gt;" 2&gt;/dev/null</code> (`electron/main.cjs:1267`) |
| Set Audio Volume (`audio:setVolume`) | REAL | <code>pactl set-sink-volume @DEFAULT_SINK@ &lt;level&gt;% 2&gt;/dev/null</code> (fallback: <code>amixer -q set Master &lt;level&gt;%</code>) (`electron/main.cjs:1273`) |
| Get Network Status (`network:getStatus`) | REAL | <code>nmcli -t -f DEVICE,TYPE,STATE,CONNECTION dev status</code><br><code>nmcli -t -f IP4.ADDRESS dev show "&lt;device&gt;"</code><br>(WiFi active): <code>nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan no</code> (non-Linux returns <code>unsupported</code>) (`electron/main.cjs:1288`) |
| List WiFi (`network:listWifi`) | REAL | <code>nmcli -t -f IN-USE,SSID,SIGNAL,SECURITY dev wifi list --rescan no 2&gt;/dev/null</code> (`electron/main.cjs:1342`) |
| Connect WiFi (`network:connectWifi`) | REAL | <code>nmcli dev wifi connect "&lt;ssid&gt;" password "&lt;password&gt;" 2&gt;/dev/null</code> (password omitted if empty) (`electron/main.cjs:1367`) |
| Disconnect Network (`network:disconnect`) | REAL | <code>nmcli -t -f DEVICE,STATE dev status</code> then <code>nmcli dev disconnect "&lt;device&gt;"</code> (`electron/main.cjs:1377`) |
| Disconnect Non-VPN Network (`network:disconnectNonVpn`) | REAL | <code>nmcli -t -f DEVICE,TYPE,STATE,CONNECTION dev status</code> then one or more <code>nmcli dev disconnect "&lt;device&gt;"</code> (`electron/main.cjs:1397`) |
| Create Hotspot (`network:createHotspot`) | REAL | <code>nmcli -t -f DEVICE,TYPE,STATE dev status</code> then<br><code>nmcli device wifi hotspot "&lt;ifname&gt;" "TempleOS_Hotspot" "&lt;ssid&gt;" "&lt;password&gt;"</code> (`electron/main.cjs:1445`) |
| Stop Hotspot (`network:stopHotspot`) | REAL | <code>nmcli connection down "TempleOS_Hotspot" 2&gt;/dev/null</code> (note: handler returns success regardless of command result) (`electron/main.cjs:1478`) |
| Get WiFi Enabled (`network:getWifiEnabled`) | REAL | <code>nmcli -t -f WIFI radio 2&gt;/dev/null</code> (non-Linux returns <code>unsupported</code>) (`electron/main.cjs:1485`) |
| Set WiFi Enabled (`network:setWifiEnabled`) | REAL | <code>nmcli radio wifi on</code> / <code>nmcli radio wifi off</code> (`electron/main.cjs:1494`) |
| List Saved Networks (`network:listSaved`) | REAL | <code>nmcli -t -f NAME,UUID,TYPE,DEVICE connection show</code> (`electron/main.cjs:1502`) |
| Connect Saved Network (`network:connectSaved`) | REAL | <code>nmcli connection up "&lt;nameOrUuid&gt;"</code> (`electron/main.cjs:1516`) |
| Disconnect Connection (`network:disconnectConnection`) | REAL | <code>nmcli connection down "&lt;nameOrUuid&gt;"</code> (`electron/main.cjs:1525`) |
| Forget Saved Network (`network:forgetSaved`) | REAL | <code>nmcli connection delete "&lt;nameOrUuid&gt;"</code> (`electron/main.cjs:1534`) |
| Import VPN Profile (`network:importVpnProfile`) | REAL | <code>nmcli connection import type openvpn&#124;wireguard file "&lt;path&gt;"</code> (`electron/main.cjs:1543`) |
| SSH Server Control (`ssh:control`) | REAL | Status: <code>systemctl is-active &lt;ssh/sshd&gt;</code><br>Start/Stop: <code>pkexec&#124;sudo -n sh -lc 'systemctl start&#124;stop &lt;service&gt;'</code><br>Port write: privileged <code>cp</code>/<code>chmod</code> to <code>/etc/ssh/sshd_config*</code><br>Regen keys: privileged <code>rm -f /etc/ssh/ssh_host_* &amp;&amp; ssh-keygen -A</code><br>User key gen (if missing): <code>ssh-keygen -t ed25519 -N "" -f "&lt;keyBase&gt;" -q</code> (`electron/main.cjs:1687`) |
| Tracker Blocking (`security:trackerBlocking`) | REAL | Linux: privileged hosts edit via<br><code>sed -i '/&lt;start&gt;/,/&lt;end&gt;/d' /etc/hosts</code> and<br><code>printf "&lt;blocklist&gt;\n" &#124; tee -a /etc/hosts &gt;/dev/null</code><br>Non-Linux returns <code>unsupported</code> (no mock success). (`electron/main.cjs:1781`) |
| Tor Status (`security:getTorStatus`) | REAL | Linux: <code>systemctl is-active tor</code>/<code>tor@default</code> (fallback: <code>pgrep -x tor</code>) + <code>tor --version</code>; non-Linux returns <code>supported: false</code>. (`electron/main.cjs`) |
| Get Firewall Rules (`security:getFirewallRules`) | REAL | <code>pkexec&#124;sudo -n sh -lc 'ufw status numbered'</code> (`electron/main.cjs:1834`) |
| Add Firewall Rule (`security:addFirewallRule`) | REAL | <code>pkexec&#124;sudo -n sh -lc 'ufw allow&#124;deny&#124;reject &lt;port&gt;/tcp&#124;udp'</code> (`electron/main.cjs:1883`) |
| Delete Firewall Rule (`security:deleteFirewallRule`) | REAL | <code>pkexec&#124;sudo -n sh -lc 'ufw --force delete &lt;id&gt;'</code> (`electron/main.cjs:1904`) |
| Toggle Firewall (`security:toggleFirewall`) | REAL | <code>pkexec&#124;sudo -n sh -lc 'ufw enable'</code> / <code>... 'ufw disable'</code> (`electron/main.cjs:1918`) |
| VeraCrypt Status (`security:getVeraCryptStatus`) | REAL | <code>veracrypt -t -l</code> (`electron/main.cjs:1929`) |
| Mount VeraCrypt (`security:mountVeraCrypt`) | REAL | <code>mkdir -p /mnt/veracrypt&lt;slot&gt;</code> then privileged<br><code>veracrypt -t --non-interactive --password="&lt;pw&gt;" --pim="0" --keyfiles="" --protect-hidden="no" --slot=&lt;slot&gt; "&lt;path&gt;" "/mnt/veracrypt&lt;slot&gt;"</code> (`electron/main.cjs:1966`) |
| Dismount VeraCrypt (`security:dismountVeraCrypt`) | REAL | privileged <code>veracrypt -t -d --slot=&lt;slot&gt;</code> (slot optional) (`electron/main.cjs:1986`) |
| Apply Mouse Settings (`mouse:apply`) | REAL | GNOME: <code>gsettings set org.gnome.desktop.peripherals.mouse ...</code><br>X11: <code>xinput --set-prop ...</code><br>Sway: <code>swaymsg input ...</code> (`electron/main.cjs:2003`) |
| Exec Terminal Command (`terminal:exec`) | REAL | Linux: <code>bash -lc "&lt;command&gt;"</code> (via `execAsync`) (`electron/main.cjs:2059`) |
| Get Displays (`display:getOutputs`) | REAL | Linux: <code>swaymsg -t get_outputs</code> (Wayland/Sway) or <code>xrandr --query</code> (X11) (includes <code>bounds</code>). Non-Linux uses <code>screen.getAllDisplays()</code> (no hardcoded fallback on error). (`electron/main.cjs:2080`) |
| Set Display Mode (`display:setMode`) | REAL | <code>swaymsg output "&lt;output&gt;" mode &lt;WxH@Hz&gt;</code> or <code>xrandr --output "&lt;output&gt;" --mode WxH [--rate Hz]</code> (`electron/main.cjs:2197`) |
| Set Display Scale (`display:setScale`) | REAL | <code>swaymsg output "&lt;output&gt;" scale &lt;scale&gt;</code> (fails with "requires Wayland/Sway" otherwise) (`electron/main.cjs:2221`) |
| Set Display Transform (`display:setTransform`) | REAL | <code>swaymsg output "&lt;output&gt;" transform &lt;transform&gt;</code> or <code>xrandr --output "&lt;output&gt;" --rotate left&#124;right&#124;inverted&#124;normal</code> (`electron/main.cjs:2233`) |
| Set Resolution (`system:setResolution`) | REAL | <code>swaymsg output '*' mode WxH</code> or <code>xrandr --output "&lt;connected&gt;" --mode WxH</code> (`electron/main.cjs:2253`) |
| Get Resolutions (`system:getResolutions`) | REAL | Tries <code>swaymsg -t get_outputs</code> then <code>xrandr</code>; returns a hardcoded fallback list if both fail. (`electron/main.cjs:2292`) |
| Mouse DPI Info (`mouse:getDpiInfo`) | REAL | <code>ratbagctl list</code> + <code>ratbagctl dpi get</code> + <code>ratbagctl dpi get-all</code> (`electron/main.cjs:2344`) |
| Set Mouse DPI (`mouse:setDpi`) | REAL | <code>ratbagctl dpi set &lt;dpi&gt; "&lt;deviceId&gt;"</code> (`electron/main.cjs:2365`) |
| List Installed Apps (`apps:getInstalled`) | REAL | Linux: reads <code>/usr/share/applications</code> and <code>~/.local/share/applications</code>, parses <code>.desktop</code> files. Non-Linux returns an empty list with <code>unsupported</code> flagged. (`electron/main.cjs:2412`) |
| Launch App (`apps:launch`) | REAL | Linux: <code>gtk-launch &lt;desktop-file&gt;</code> or <code>exec(app.exec)</code>. Non-Linux returns <code>unsupported</code> (no mock "would launch"). (`electron/main.cjs:2483`) |
| Update Check (`updater:check`) | REAL | <code>cd "&lt;projectRoot&gt;" &amp;&amp; git fetch origin main &amp;&amp; git rev-list HEAD...origin/main --count</code> (returns <code>unsupported</code> if git/repo isn't available; no dev-mode mock) (`electron/main.cjs:2511`) |
| Run Update (`updater:update`) | REAL | <code>cd "&lt;projectRoot&gt;" &amp;&amp; git fetch origin main &amp;&amp; git reset --hard origin/main &amp;&amp; npm install --ignore-optional &amp;&amp; npm run build -- --base=./</code> (`electron/main.cjs:2543`) |
| Create PTY (`terminal:createPty`) | REAL | <code>pty.spawn(shell, [], { cols, rows, cwd, env })</code> (`electron/main.cjs:2572`) |
| Write PTY (`terminal:writePty`) | REAL | <code>entry.pty.write(data)</code> (`electron/main.cjs:2611`) |
| Resize PTY (`terminal:resizePty`) | REAL | <code>entry.pty.resize(cols, rows)</code> (`electron/main.cjs:2622`) |
| Destroy PTY (`terminal:destroyPty`) | REAL | <code>entry.pty.kill()</code> (`electron/main.cjs:2633`) |
| PTY Availability (`terminal:isPtyAvailable`) | REAL | <code>pty !== null</code> (`electron/main.cjs:2646`) |

## Immediate Flags: Hardcoded / Mock / Placeholder Behavior Found

1) **Lock is now best-effort real OS lock on Linux**
- `system:lock` still triggers the renderer overlay event, and on Linux attempts a real session lock via (in order): `loginctl lock-session` (using `XDG_SESSION_ID`), `loginctl lock-sessions`, `xdg-screensaver lock`, `dm-tool lock`, `gnome-screensaver-command -l`, DBus ScreenSaver lock.

2) **Non-Linux demo fallbacks were replaced with explicit `unsupported` behavior**
- `display:getOutputs` no longer returns a hardcoded fallback display on non-Linux failures.
- `apps:getInstalled` returns an empty list with `unsupported` on non-Linux (no mock apps).
- `apps:launch` returns `unsupported` on non-Linux (no "would launch" success).
- `updater:check` returns `unsupported` when git/repo isn't available (no "Dev Mode: No updates").
- `system:setVolume` returns `unsupported` on non-Linux (no mock logging).
- `security:trackerBlocking` returns `unsupported` on non-Linux (no pretend success).
- `network:getStatus` and `network:getWifiEnabled` return `unsupported` on non-Linux (no hardcoded placeholder states).

3) **Battery status IPC added**
- New `system:getBattery` IPC returns battery status via `upower` (preferred) or `acpi` (fallback) on Linux.

Remaining note:
- `system:getResolutions` still includes a fallback list if both sway and xrandr detection fail (kept as a usability fallback).
