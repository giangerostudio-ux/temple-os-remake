# X11 Snap Layouts - Implementation Plan (v3)

Windows 11-style snap layouts using XQueryPointer polling for real-time drag detection.

---

## Goal

Replicate modern OS window management for X11 apps:
1.  **Snap Layouts Menu**: Visual popup when dragging to top edge.
2.  **Drag-to-Edge Snapping**: Snap windows by dragging to screen edges.
3.  **Auto-Tiling** *(Optional)*: Automatically arrange new windows.

---

## Key Insight (v3 Improvement)

The v2 approach using `wmctrl -lG` polling failed because X11 window managers perform a "pointer grab" during window drags, so window positions are only updated AFTER the drag completes.

**Solution**: Use `XQueryPointer` which returns mouse position AND button state even during WM grabs!

| v2 Approach (Broken) | v3 Approach (Working) |
|----------------------|-----------------------|
| Poll `wmctrl -lG` for window Y | Poll `XQueryPointer` for mouse X/Y + button state |
| Only sees final position | Sees real-time mouse during drag |
| Complex heuristics | Simple: button held + mouse at edge = drag to edge |

---

## Lessons Learned (Previous Issues)

| Problem | Cause | Solution |
|---------|-------|----------|
| Main window resized/zoomed | X11 logic affected Electron window | **Hardcode main window XID exclusion** |
| Ghost windows counted | VS Code, Terminal not filtered | **Whitelist approach** instead of blacklist |
| Auto-tiling race condition | `wmctrl` sent before window ready | **Delay + retry logic** |
| Snap menu didn't appear | wmctrl only sees post-drag position | **XQueryPointer polling daemon** |

---

## Phase 1: Foundation (Safe Mode)

> [!IMPORTANT]
> All new logic will be **opt-in** via a Settings toggle: `Enable X11 Snap Layouts`.

### 1.1 Hardened XID Filtering

**File**: `electron/main.cjs`

```javascript
// Store main window XID on creation (CRITICAL)
let mainWindowXid = null;

// In createWindow():
mainWindow.webContents.once('did-finish-load', async () => {
    const handle = mainWindow.getNativeWindowHandle();
    mainWindowXid = '0x' + handle.readUInt32LE(0).toString(16);
    x11IgnoreXids.add(mainWindowXid.toLowerCase());
    console.log('[X11] Main Window XID:', mainWindowXid, '(protected)');
});
```

### 1.2 Opt-In Setting

**File**: `src/main.ts` (Settings section)

Add toggle: `Enable X11 Snap Layouts` (default: OFF)

---

## Phase 2: Snap Layouts Menu

The **safest** feature to implement first. No auto-tiling, no window manipulation on launch.

### 2.1 Backend: Detect Drag-to-Top

**File**: `electron/main.cjs`

```javascript
// Only runs if setting is enabled
function checkSnapLayoutTrigger(snapshot) {
    if (!settings.x11SnapLayoutsEnabled) return;
    
    const activeWin = snapshot.windows.find(w => w.xidHex === snapshot.activeXidHex);
    if (!activeWin || activeWin.minimized) return;
    
    // CRITICAL: Never touch main window
    if (activeWin.xidHex.toLowerCase() === mainWindowXid?.toLowerCase()) return;
    
    // Wide detection zone (0-80px from top)
    if (activeWin.y >= -20 && activeWin.y <= 80) {
        mainWindow.webContents.send('x11:snapLayouts:suggest', { xid: activeWin.xidHex });
    }
}
```

### 2.2 Frontend: Graphical Menu

**File**: `src/main.ts`

Already implemented in previous session. Shows visual blocks for:
- Maximize
- Left / Right split
- 4 Quadrants

---

## Phase 3: Drag-to-Edge Snapping

After Snap Menu is stable, add edge detection:

| Drag Location | Action |
|---------------|--------|
| Top Edge | Show Snap Menu |
| Left Edge | Snap Left 50% |
| Right Edge | Snap Right 50% |
| Top-Left Corner | Snap Top-Left 25% |
| Top-Right Corner | Snap Top-Right 25% |
| Bottom-Left Corner | Snap Bottom-Left 25% |
| Bottom-Right Corner | Snap Bottom-Right 25% |

---

## Phase 4: Auto-Tiling on Launch

> [!IMPORTANT]
> This feature uses the **existing** `snapX11Window` IPC handler (same as right-click menu).

### Behavior: User Intent Detection

**Default Mode**: All new apps **Maximize**.

**Tiling Mode Activates When**: User manually snaps any app (via right-click or drag).

| Scenario | Action |
|----------|--------|
| No apps snapped yet | New app → **Maximize** |
| User snaps App1 Left | Tiling mode ON. New app → Snap Right |
| User snaps App1 Right | Tiling mode ON. New app → Snap Left |
| 2 apps (L/R) | New app → Top-Left (all resize to quadrants) |
| 3 quadrants filled | New app → Fill remaining quadrant |
| 4 quadrants filled | New app → Maximize (overflow) |
| User closes all snapped apps | Tiling mode OFF. Back to default (Maximize) |

### Logic

```javascript
let tilingModeActive = false;
const occupiedSlots = new Map(); // xidHex -> slot

// When user manually snaps (right-click or drag):
function onUserSnap(xid, mode) {
    if (mode !== 'maximize') {
        tilingModeActive = true;
    }
    occupiedSlots.set(xid, mode);
}

// On new app launch:
function getSlotForNewWindow() {
    if (!tilingModeActive) return 'maximize';
    
    const occupied = new Set(occupiedSlots.values());
    if (!occupied.has('left')) return 'left';
    if (!occupied.has('right')) return 'right';
    if (!occupied.has('top-left')) return 'top-left';
    if (!occupied.has('top-right')) return 'top-right';
    if (!occupied.has('bottom-left')) return 'bottom-left';
    if (!occupied.has('bottom-right')) return 'bottom-right';
    return 'maximize';
}

// When windows close:
function onWindowClose(xid) {
    occupiedSlots.delete(xid);
    if (occupiedSlots.size === 0) tilingModeActive = false;
}
```

### Slot Tracking

The system remembers which positions are "taken":

```javascript
// Track occupied slots
const occupiedSlots = new Map(); // xidHex -> 'maximize' | 'left' | 'right' | 'top-left' | etc.

function getNextAvailableSlot() {
    const occupied = new Set(occupiedSlots.values());
    
    // Priority order
    if (!occupied.has('maximize') && occupied.size === 0) return 'maximize';
    if (!occupied.has('left')) return 'left';
    if (!occupied.has('right')) return 'right';
    if (!occupied.has('top-left')) return 'top-left';
    if (!occupied.has('top-right')) return 'top-right';
    if (!occupied.has('bottom-left')) return 'bottom-left';
    if (!occupied.has('bottom-right')) return 'bottom-right';
    
    return 'maximize'; // Overflow
}
```

### Key Point: Reuse Existing Logic

The actual snapping uses `snapX11Window(xid, mode)` which is the **same function** the right-click menu calls. This ensures consistency:

```javascript
// On new window detected:
const slot = getNextAvailableSlot();
await window.electronAPI.snapX11Window(newXid, slot);
occupiedSlots.set(newXid, slot);

// When user manually snaps via right-click or drag:
occupiedSlots.set(xid, newMode); // Update the tracked slot
```

### When a Window Closes

Free up its slot:

```javascript
ewmhBridge.onChange((snapshot) => {
    // Remove closed windows from tracking
    const currentXids = new Set(snapshot.windows.map(w => w.xidHex.toLowerCase()));
    for (const [xid] of occupiedSlots) {
        if (!currentXids.has(xid)) occupiedSlots.delete(xid);
    }
});
```

---

## Verification Plan

### Phase 1 Verification
- [ ] Main window XID is logged and protected
- [ ] Settings toggle exists and defaults to OFF

### Phase 2 Verification
- [ ] Drag Firefox to top → Menu appears
- [ ] Click layout option → Firefox snaps correctly
- [ ] Main TempleOS window is NEVER affected

### Phase 3 Verification
- [ ] Drag to left edge → Snaps left
- [ ] Drag to corners → Snaps to quadrant

### Phase 4 Verification (Optional)
- [ ] Open Firefox → Maximizes
- [ ] Open 2nd Firefox → Both split 50/50
- [ ] VS Code and Terminal are ignored

---

## Files to Modify

| File | Changes |
|------|---------|
| `electron/main.cjs` | XID protection, snap detection, IPC handlers |
| `electron/preload.cjs` | Expose new IPC events |
| `src/main.ts` | Settings toggle, Snap Menu UI |

---

## Next Steps

1.  **Approve this plan** → I'll implement Phase 1 + 2 only.
2.  **Test thoroughly** → Confirm no regressions.
3.  **Optionally add Phase 3** → Drag-to-edge.
4.  **Consider Phase 4** → Auto-tiling (risky, optional).
