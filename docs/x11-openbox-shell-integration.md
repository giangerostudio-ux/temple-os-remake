# X11 + Openbox Integration (Windowed Apps + Always-Visible Bar)

This document is the research + implementation blueprint for making installed GUI apps (Firefox, etc.) feel *native* inside the TempleOS Electron shell on Ubuntu Server.

It focuses on **X11 + Openbox** because:
- It's the fastest path to a polished "desktop shell" experience without writing a Wayland compositor.
- X11 provides mature, standard mechanisms (EWMH/ICCCM) for panels, taskbars, window enumeration, focus, close, minimize, and fullscreen policy.

This doc is intentionally **implementation-oriented** but does **not** execute changes; it's the plan + design you can implement safely with rollback.

---

## 1) Problem Summary (What's Happening Today)

Symptoms you observed:
- Firefox opens "outside" the Electron UI, can cover/hide your bottom bar.
- Firefox can appear oddly placed (e.g., stuck to the right) and may not be movable.
- Your taskbar doesn't show external apps (or can't control them), since it only tracks windows inside your Electron renderer.

Root causes:
1) **Electron is not a window manager.**
   - Electron creates one or more top-level windows as a *client*. It cannot manage other apps' windows by default.

2) Your current GUI session was detected as **Wayland** (`XDG_SESSION_TYPE=wayland`).
   - On Wayland, clients (like Electron) cannot enumerate/control other apps' windows.
   - Only the compositor (Sway/Weston/etc.) can implement global window management UI.

3) Even if you were on X11, if there is **no WM** (or a kiosk/tiling WM), windows may be "unmovable" / behave strangely.

Conclusion:
- For a "custom OS shell" that manages *installed apps* like a real desktop (taskbar entries, focus, close, fullscreen policy, reserved panel space), you want:
  - **Xorg (X11 display server)**
  - **Openbox (floating WM)**
  - **TempleOS Electron shell** as the visible desktop UI
  - An **EWMH bridge** so your taskbar can reflect/control real X11 windows.

---

## 2) Target UX (What "Good" Looks Like)

**Desktop mode**
- Bottom bar is always visible (apps cannot cover it).
- External apps (Firefox, etc.) are movable/resizable and behave normally.
- Taskbar shows *running apps* (external windows) with icons/titles, supports:
  - Focus/raise
  - Minimize/restore
  - Close
  - "Active" highlighting

**Gaming/fullscreen mode**
- When a game (or any fullscreen app) is running, the bar can auto-hide (recommended) to allow true fullscreen.
- After exit/fullscreen ends, restore bar and reserved space.

---

## 3) Why X11 + Openbox (vs Wayland) For This Project

### Why X11 is easier for a custom shell
- You can implement a taskbar/window switcher by reading standard X11 root/window properties:
  - Window list, active window, window titles, window icons, states (fullscreen/minimized), and workspace data.
- You can reserve screen space for a panel using **struts**, so windows never overlap it.

### Why Wayland is harder for this shell architecture
- Wayland intentionally prevents clients from controlling other clients' windows.
- To get "perfect" integration on Wayland you generally need:
  - your own compositor, or
  - compositor-specific protocols/extensions (not portable), and
  - a different architecture where your shell is compositor-integrated.

### Recommendation
- Implement **X11 + Openbox** now for a polished desktop experience.
- Treat Wayland as a later project (if/when you want to become/ship a compositor).

---

## 4) High-Level Architecture

### Boot / session chain (kiosk-style)

1) systemd boots Ubuntu Server
2) auto-login user `temple` on tty1
3) `startx` starts Xorg
4) `.xinitrc` launches:
   - `openbox` (WM)
   - your Electron shell (desktop)

### The "not half-assed" split: 2 Electron windows

To prevent external apps from hiding the bar, the bar must be "real" at the WM level.

**Window A: Desktop**
- Background + icons + start menu + app launcher overlay.
- Sized to X11 work area (screen minus bar strut).

**Window B: Bar (Panel)**
- A dedicated always-visible "panel" window.
- Marked as a dock and reserves screen space (strut).
- Stays on top in desktop mode.

If you keep the bar only as HTML inside Window A, no WM can reserve space for it; Firefox can cover it.

---

## 5) Core X11 Concepts You'll Use (EWMH/ICCCM)

EWMH ("NETWM") is the standard contract between WMs and desktop shells.

You'll rely on:

### 5.1 Docks/Panels and reserved space
- `_NET_WM_WINDOW_TYPE` = `_NET_WM_WINDOW_TYPE_DOCK`
- `_NET_WM_STRUT_PARTIAL` (reserve pixels at screen edges)

This is the key to "bar always visible" in desktop mode.

### 5.2 Window enumeration + taskbar filtering
- `_NET_CLIENT_LIST` and/or `_NET_CLIENT_LIST_STACKING`
- `_NET_WM_STATE` includes:
- `_NET_WM_STATE_SKIP_TASKBAR` (don't show)
  - `_NET_WM_STATE_HIDDEN` (minimized-ish)
  - `_NET_WM_STATE_FULLSCREEN`

### 5.3 Titles, identity, grouping
- `_NET_WM_NAME` (UTF-8 title)
- `WM_CLASS` (class/instance)
- `_NET_WM_PID` (best-effort)
- `_NET_WM_ICON` (ARGB icon list) (optional; you can also map icons via `.desktop`)

### 5.4 Actions
- Focus/raise via `_NET_ACTIVE_WINDOW` client message.
- Close via ICCCM `WM_DELETE_WINDOW` (send WM protocol message).
- Minimize via `_NET_WM_STATE_HIDDEN` or WM-specific conventions (Openbox supports EWMH-style state changes).

---

## 6) Implementation Strategy (Recommended)

### Phase A: Run X11 + Openbox reliably (no DE "leaks")

Packages typically needed:
- `xorg`, `xinit`, `x11-xserver-utils`, `x11-utils`
- `openbox`
- `wmctrl` (for EWMH taskbar bridge MVP)

Repo helper (optional):
- `scripts/setup-x11-openbox.sh` (installs packages + writes `~/.xinitrc`; does not change autologin by default)

Startup:
- Auto-login to tty1
- Start X via `startx` only on tty1
- `.xinitrc` starts Openbox + your Electron app

Security/kiosk hardening:
- Disable Openbox root menu / exit actions
- Disable VT switching and dangerous key combos in production (optional, but recommended)

### Phase B: Create a real panel window (bar)

In Electron main process:
- Create **two** BrowserWindows:
  - Desktop window: borderless, fills workarea
  - Bar window: borderless, always-on-top, fixed height, bottom aligned

Then set X11 properties on the **bar window**:
- Type dock + strut reservation

Important: Electron does not provide first-class APIs for setting EWMH properties.
You'll need one of the following approaches:

**Approach 1 (Best long-term): Node X11 bindings**
- Use an X11 client library to:
  - connect to the X server,
  - get window ids for your Electron windows,
  - set `_NET_WM_WINDOW_TYPE`, `_NET_WM_STRUT_PARTIAL`, `_NET_WM_STATE_ABOVE`,
  - subscribe to property change events.

Pros: robust, event-driven, no external binaries.
Cons: native-ish plumbing and more code.

**Approach 2 (Acceptable MVP): call `xprop`/`wmctrl`**
- Use `BrowserWindow.getNativeWindowHandle()` to get the X11 window id.
- Run commands like:
  - `xprop -id <winid> -f _NET_WM_WINDOW_TYPE 32a -set _NET_WM_WINDOW_TYPE _NET_WM_WINDOW_TYPE_DOCK`
  - `xprop -id <winid> -f _NET_WM_STRUT_PARTIAL 32c -set _NET_WM_STRUT_PARTIAL ...`

Pros: very fast to ship.
Cons: more fragile; depends on binaries and parsing; harder to maintain.

Recommendation:
- Start with Approach 2 if you need immediate progress, but move to Approach 1 for "best version".

### Phase C: Implement an "EWMH window bridge" for taskbar integration

Your Electron shell should maintain a live model of external windows:

Data you want per window:
- `xid` (X11 window id)
- title (`_NET_WM_NAME`)
- class (`WM_CLASS`)
- pid (`_NET_WM_PID`)
- state (fullscreen/minimized/skip-taskbar)
- desktop/workspace (`_NET_WM_DESKTOP`)
- icon:
  - either decode `_NET_WM_ICON`, or
  - map by `.desktop` entry using `StartupWMClass` / `WM_CLASS` + your existing `.desktop` index

Events to watch:
- root property change on `_NET_CLIENT_LIST` and `_NET_ACTIVE_WINDOW`
- per-window property changes on:
  - `_NET_WM_NAME`, `_NET_WM_STATE`, `WM_CLASS`

Actions to implement:
- Focus/raise window
- Close window
- Minimize/restore window

This is what makes installed apps "feel native" in your taskbar.

### Phase D: Desktop vs Gaming mode policy

Recommended UX:
- Desktop mode:
  - bar visible
  - strut active (reserved space)
- Gaming mode / fullscreen:
  - hide bar
  - remove strut so fullscreen uses the entire display

Triggers:
1) If the active window has `_NET_WM_STATE_FULLSCREEN` -> enter fullscreen policy.
2) If the launched app is categorized as "Game" (from `.desktop` Categories) -> enter gaming policy.

Exit condition:
- fullscreen removed / game process exits -> restore bar + strut.

### Phase E: Make "installed apps" appear predictably in your launcher

Reality check:
- Linux launchers are driven by `.desktop` entries, not "whatever is in /usr/bin".
- `apt` GUI apps usually install a `.desktop` entry automatically.
- Many terminal installs are services/CLI tools (no `.desktop`) and should not appear as launchable apps.

Your launcher should index apps by scanning these `.desktop` directories:
- System: `/usr/share/applications`
- User: `~/.local/share/applications`
- Snap: `/var/lib/snapd/desktop/applications` (if you ship snap)
- Flatpak: `/var/lib/flatpak/exports/share/applications` and `~/.local/share/flatpak/exports/share/applications` (if you ship flatpak)

Then keep it live:
- Watch those directories for changes (install/uninstall) and rebuild your launcher/search index.

Fallback for manual installs (AppImage/tarball):
- Provide an "Add to Launcher" action that creates a `.desktop` file in `~/.local/share/applications` and installs an icon into `~/.local/share/icons/hicolor/...`.

---

## 7) Mapping Windows to `.desktop` Entries (Icons + Grouping)

Goal:
- When Firefox is running, show it with the correct icon and a single taskbar group.

Why some apps "don't show up in categories":
- Categories come from `.desktop` `Categories=` and many apps omit it, or use unexpected values.
- Treat categories as best-effort metadata:
  - always keep an "All" view
  - add an "Other" bucket for uncategorized apps
  - optionally apply a small heuristic map (e.g., `WebBrowser` -> Internet, `TerminalEmulator` -> System/Utilities)

Icons (is it easy to have icons for installed apps? mostly yes):
- Most GUI apps provide `Icon=` in their `.desktop` entry.
- `Icon=` is often a theme name, not a file path, so your shell must resolve it via icon theme lookup:
  - `/usr/share/icons` (hicolor, Adwaita, etc.)
  - `/usr/share/pixmaps`
  - `~/.local/share/icons`
- On Ubuntu Server minimal, you may be missing icon themes; without them many apps will fall back to a generic icon.

Best-effort matching strategy:
1) Use `.desktop` `StartupWMClass` if present.
2) Else match `.desktop` `Exec` base command to `WM_CLASS`/window title heuristics.
3) Use `_NET_WM_PID` to inspect `/proc/<pid>/cmdline` (works often on X11; snaps may wrap).
4) Allow a small mapping table for known tricky apps (snap wrappers, Electron apps, Steam, etc.).

Store the resolved mapping:
- Cache `WM_CLASS -> desktopId` once resolved to avoid repeated heuristics.

---

## 8) Verification Checklist (When You Implement)

### Confirm you are truly on X11
Run inside the GUI session terminal:
- `echo "XDG_SESSION_TYPE=$XDG_SESSION_TYPE DISPLAY=$DISPLAY WAYLAND_DISPLAY=$WAYLAND_DISPLAY"`
Expected:
- `XDG_SESSION_TYPE=x11`
- `DISPLAY=:0` (or similar)
- Note: if you run this over SSH (or from a TTY), you'll often see `XDG_SESSION_TYPE=tty` because you're not inside the graphical session.

### Confirm a WM is present
- `xprop -root _NET_SUPPORTING_WM_CHECK`
Expected:
- property exists and points at a WM-owned window.

### Confirm struts/workarea
- `xprop -root _NET_WORKAREA`
Expected:
- workarea height equals screen height minus bar height.

### Confirm taskbar window filtering
Your bar window should not appear as a normal app window.
It should be type DOCK and/or have skip-taskbar states.

---

## 9) Rollback Plan (So It's Not Scary)

Before changing startup:
- Take a VM snapshot.
- Back up:
  - `~/.xinitrc`
  - `~/.bash_profile` / `~/.profile`
  - any custom `systemd` units

Rollback approach:
- If GUI fails to start, you'll still get a TTY login.
- Disable `startx` autostart logic in `~/.bash_profile` (or disable the systemd unit).
- Reboot -> back to console.

---

## 10) Notes on NVIDIA (Pragmatic Guidance)

Why you saw "Wayland feels faster" reports:
- Wayland compositors often provide better frame pacing and tear-free presentation by default.
- Many Wayland setups also default to a compositor that manages fullscreen and input well, while your current shell setup is effectively missing that layer.

Why X11 is still the pragmatic choice for TempleOS shell right now:
- Your #1 requirement is global window management + integration for external apps:
  - enumerate windows for taskbar
  - focus/raise/minimize/close
  - reserve panel space (struts) so apps never cover the bar
- On X11, these are standardized (EWMH/ICCCM) and relatively easy to implement with Openbox.
- On Wayland, you only get this if you ship/adopt a compositor that cooperates with your shell design.

NVIDIA specific (keep it simple):
- X11 + proprietary NVIDIA driver is a very stable baseline for "desktop shell" projects.
- On X11, tearing control is configuration-dependent:
  - if you run *no compositor*, you may see tearing in video scrolling; some users accept this for maximum latency/perf
  - if you run a light compositor (picom), you can reduce tearing but may introduce latency; tune it carefully
- On Wayland, NVIDIA has improved significantly in modern stacks, but "shell integration" is still the bigger architectural challenge for you, not raw driver capability.

---

## 11) High Refresh (240Hz) + Multi-Monitor (X11 Reality Check)

Yes, X11 can drive 1440p @ 240Hz and multi-monitor setups. The "gotchas" are mostly about configuration and compositing.

High refresh basics:
- You must set the monitor mode + refresh rate explicitly (or ensure EDID is detected correctly).
- With X11, you'll typically use `xrandr` to set:
  - resolution (`--mode`)
  - refresh (`--rate`)
  - layout (`--left-of/--right-of/--primary`)

Mixed refresh monitors:
- Xorg itself can run different refresh rates per output.
- If you enable a compositor, many compositors effectively sync to one timing source, and behavior can degrade to the lowest refresh depending on compositor/driver.
- Recommendation for your shell:
  - desktop mode: run with no compositor first (fastest/lowest latency) and add compositor only if tearing/animations are unacceptable
  - gaming mode: disable compositor (or switch to an "unredirect fullscreen" mode) so fullscreen apps are not penalized

Scaling / DPI:
- X11 does not have perfect per-monitor fractional scaling.
- If you need per-monitor scaling later, Wayland usually does this better, but it comes with the compositor integration cost.

---

## 12) Shipping for AMD + NVIDIA Users (What Custom Distros Do)

The practical approach is:
- Ship one "Temple Desktop Mode" (X11 + Openbox) that works on both AMD and NVIDIA.
- On first boot (or installer), detect GPU and install/configure the recommended driver stack.
- Expose user-facing toggles as *policies* (tearing vs latency, gaming mode, compositor on/off), not "AMD mode" vs "NVIDIA mode".

Detection:
- `lspci -nnk | grep -EA3 'VGA|3D|Display'`
- On Ubuntu, `ubuntu-drivers devices` can suggest the recommended NVIDIA package if an NVIDIA GPU is present.

Driver strategy:
- AMD:
  - generally "just works" with the in-kernel driver + Mesa userspace
  - your main tuning knobs are compositor (on/off) and any TearFree options if needed
- NVIDIA:
  - install the proprietary recommended driver (via `ubuntu-drivers` / `apt`)
  - prefer X11 for now to keep shell integration straightforward

UX strategy:
- Provide a Settings panel (or boot-time config file) with:
  - `compositor: off | on`
  - `fullscreenPolicy: hideBar | keepBar`
  - `tearingPolicy: lowestLatency | tearFree`
- Default behavior:
  - desktop mode: bar visible + strut active
  - fullscreen/gaming: auto-hide bar + remove strut + (optionally) disable compositor

---

## 13) Next Decisions (Before Coding)

To proceed cleanly:
1) Confirm current boot path (systemd service vs `.bash_profile startx` vs display manager).
2) Choose implementation approach for X11 control:
   - MVP: `xprop/wmctrl` subprocesses
   - Best: Node X11 library (event-driven)
3) Decide bar behavior:
   - Desktop mode: always visible (dock+strut)
   - Fullscreen/gaming: auto-hide (recommended)

---

## 14) Chat Context Notes (So We Don't Forget)

Observed issues (VM):
- Firefox launched from the TempleOS launcher opened as a separate native window that could cover the bar.
- At one point, Firefox spam-opened many windows/tabs (likely repeated launch events).
- Session detection was confusing: over SSH it showed `XDG_SESSION_TYPE=tty`, but inside the GUI terminal it showed `XDG_SESSION_TYPE=wayland`.

Decisions made:
- Primary implementation target: X11 + Openbox (pragmatic and controllable for a custom desktop shell).
- Bar policy: visible in desktop mode; hide/remove strut for fullscreen and/or Gaming Mode.
- Icons/categories: treat `.desktop` metadata as best-effort; always keep "All" view + fallback buckets.

Gaming scope that must be covered:
- Gaming Mode UX:
  - auto-enable when launching games (based on `.desktop` Categories heuristics)
  - manual toggle hotkey (Ctrl+Alt+G)
  - hides bar + removes strut so fullscreen is real fullscreen
  - optional: disable compositor / enable "unredirect fullscreen" behavior if you ship a compositor later
- Game launcher ecosystem:
  - detect common launchers (Steam, Heroic, Lutris, Bottles)
  - Proton support typically comes via Steam; Heroic uses Wine/Proton builds; Lutris/Bottles manage runners
  - provide "Install recommended gaming stack" guidance in docs/installer, but keep shell integration generic:
    - list launchers in Settings -> Gaming
    - use GameMode (gamemoderun) when launching games if installed
