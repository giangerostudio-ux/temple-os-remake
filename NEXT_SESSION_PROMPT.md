# TempleOS Remake - Next Session Prompt

## Context
You are continuing work on the **TempleOS Remake** project - a faithful recreation of Terry A. Davis's TempleOS as a modern Electron desktop application. The project follows Terry's vision of divine simplicity and programming truth.

## What Has Been Completed

### ✅ Priority 1: File Browser & Desktop Polish - **COMPLETE**
1. **Multi-File Selection**:
   - Ctrl+Click: Toggle individual file selection
   - Shift+Click: Range selection from last selected
   - Click: Single selection (clears others)
   - Visual feedback: Green border + checkbox + background highlight
   - Keyboard shortcuts: Ctrl+A (select all), Ctrl+D (deselect), Delete (delete selected)

2. **Bulk Actions**:
   - "Delete Selected" button appears when files are selected
   - "Clear Selection" button to deselect all
   - "X selected" counter badge
   - Bulk delete with confirmation modal
   - State management via `selectedFiles: Set<string>` and `lastSelectedIndex: number`

3. **Details View**:
   - Three view modes: Grid, List, **Details** (NEW)
   - Details view includes: Icon, Name, Size, Modified Date, Type
   - View mode dropdown fully functional
   - "Select All" checkbox in details view header

4. **Desktop Icon Dragging**:
   - Click and drag icons to reposition
   - Positions saved to localStorage (`temple_desktop_icon_positions`)
   - Small click (< 5px movement) = launch app
   - Large drag = reposition icon
   - State: `desktopIconPositions` and `draggingIcon`

### ✅ Build Status
- TypeScript compilation: **PASSING**
- Vite build: **SUCCESS**
- No lint errors
- Code pushed to GitHub: `main` branch

### ⬜ Skipped (As Requested)
- Priority 2: Window Manager modularization (too risky - involves extracting ~5,000 lines)
- Tier 12: Mini-games (Snake, Tetris, After Egypt)
- Phase 5: AI Helper / Word of God LLM assistant

---

## Your Mission

Complete the following features **in order of priority**:

### 🎯 PRIORITY 3: Advanced UX Features

#### 1. Window Grouping (Tier 8.3) - Snap Together Resizing
**Goal**: Allow users to snap windows together so they resize as a unit.

**Implementation Steps**:
1. Add state for window groups: `private windowGroups: Record<string, string[]> = {}`
2. When user drags window edge near another window (within 10px), show visual indicator
3. On release, create a group linking the two windows
4. When resizing a grouped window, adjust all connected windows proportionally
5. Add "Ungroup" option in window context menu

**Files to Modify**:
- `src/main.ts`: Add grouping logic to resize handlers (around line 5460-5500)
- Update `renderWindows()` to show group indicators
- Add group management methods

#### 2. Picture-in-Picture Mode (Tier 8.4) - Media Player
**Goal**: Floating mini Media Player window that stays on top.

**Implementation Steps**:
1. Add "PiP" toggle button to Media Player toolbar
2. Create mini player UI (150x100px) with play/pause/close only
3. Set `alwaysOnTop: true` when in PiP mode
4. Position in bottom-right corner
5. Allow dragging mini player
6. Clicking mini player expands back to full size

**Files to Modify**:
- `src/apps/MediaPlayer.ts`: Add `renderPiPMode()` method
- `src/main.ts`: Add PiP state and handlers

---

### 🔧 OPTIONAL ENHANCEMENTS (If Time Permits)

#### Reset Desktop Icon Positions
Add context menu option on desktop to reset all icon positions to default grid.

**Code Snippet**:
```typescript
// In desktop context menu (around line 5875):
{ 
  label: '🔄 Reset Icon Positions', 
  action: () => {
    this.desktopIconPositions = {};
    localStorage.removeItem('temple_desktop_icon_positions');
    this.render();
    this.showNotification('Desktop', 'Icon positions reset', 'info');
  }
}
```

#### File Browser: Sortable Column Headers
Make column headers in Details view clickable to change sort mode.

**Implementation**:
```typescript
// Already partially implemented - just wire up click handler:
const colHeader = target.closest('.file-col-header') as HTMLElement;
if (colHeader && colHeader.dataset.sortKey) {
  const key = colHeader.dataset.sortKey as 'name' | 'size' | 'modified';
  if (this.fileSortMode === key) {
    this.fileSortDir = this.fileSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    this.fileSortMode = key;
    this.fileSortDir = 'desc';
  }
  this.updateFileBrowserWindow();
}
```

---

## Project Structure

```
d:\temple os recreation\
├── src/
│   ├── main.ts              (12,827 lines - core application logic)
│   ├── apps/                (Modular app classes)
│   │   ├── MediaPlayer.ts   ← MODIFY FOR PiP
│   │   ├── Calculator.ts
│   │   ├── Calendar.ts
│   │   ├── Notes.ts
│   │   └── Help.ts
│   ├── system/              (System managers)
│   │   ├── NetworkManager.ts
│   │   ├── NotificationManager.ts
│   │   ├── SettingsManager.ts
│   │   ├── TilingManager.ts
│   │   └── WorkspaceManager.ts
│   └── utils/               (Helper functions)
├── electron/                (Electron main process)
├── TASK.md                  (Master task list)
├── HANDOFF.md              (Project status)
└── IMPLEMENTATION_SUMMARY.md (Recent changes)
```

---

## Important State Variables (src/main.ts)

**File Browser** (Lines 418-439):
```typescript
private selectedFiles: Set<string> = new Set();
private lastSelectedIndex = -1;
private fileViewMode: 'grid' | 'list' | 'details' = 'grid';
private fileSortMode: 'name' | 'size' | 'modified' = 'name';
private fileSortDir: 'asc' | 'desc' = 'asc';
```

**Desktop Icons** (Lines 438-439):
```typescript
private desktopIconPositions: Record<string, {x,y}> = JSON.parse(localStorage.getItem('temple_desktop_icon_positions') || '{}');
private draggingIcon: { key: string; offsetX: number; offsetY: number } | null = null;
```

**Windows** (Lines ~375-392):
```typescript
private windows: WindowState[] = [];
// WindowState interface includes: id, title, icon, x, y, width, height, content, active, minimized, maximized, transparent, alwaysOnTop
```

---

## Key Methods to Know

**File Browser**:
- `loadFiles(path?: string)` - Load directory contents (line ~10000)
- `updateFileBrowserWindow()` - Refresh file browser UI (line ~10070)
- `getFileBrowserContentV2()` - Generate file browser HTML (line ~8900)
- `toggleFileSelection(path, ctrlKey, shiftKey)` - Handle multi-select (line ~10038)
- `deleteSelectedFiles()` - Bulk delete (line ~10089)

**Window Management**:
- `openApp(appId, arg?)` - Open/focus window (line ~7200)
- `closeWindow(id)` - Close window (line ~7500)
- `focusWindow(id)` - Bring to front (line ~7550)
- `renderWindows()` - Generate all window HTML (line ~8600)

**Rendering**:
- `render()` - Main render loop (line ~780)
- `setupEventListeners()` - All event handlers (line ~4100)

---

## Development Workflow

1. **Before Starting**:
   ```powershell
   cd "d:\temple os recreation"
   npm install
   ```

2. **During Development**:
   ```powershell
   npm run dev  # Hot reload dev server
   ```

3. **Testing**:
   ```powershell
   npm run build  # Verify TypeScript compiles
   ```

4. **Completion**:
   ```powershell
   git add .
   git commit -m "feat: Your feature description"
   git push origin main
   ```

---

## Code Style Guidelines

1. **Follow Existing Patterns**:
   - Use `private` methods for internal logic
   - State variables at top of `TempleOS` class
   - Helper methods grouped with comments
   - Event listeners delegated from `setupEventListeners()`

2. **TempleOS Aesthetic**:
   - Green-on-black color scheme (`#00ff41` on `#000`)
   - Monospace fonts (VT323, IBM VGA 8x16)
   - Divine terminology ("Holy", "Divine", Terry references)
   - Keep Terry's vision alive

3. **Error Handling**:
   ```typescript
   if (!window.electronAPI) {
     console.warn('electronAPI not available - running in browser mode');
     return;
   }
   ```

4. **Notifications**:
   ```typescript
   this.showNotification('Title', 'Message', 'divine' | 'info' | 'warning' | 'error');
   ```

---

## Testing Checklist

### Window Grouping:
- [ ] Can snap two windows together by dragging resize edge
- [ ] Visual indicator shows when grouping is possible
- [ ] Resizing one window resizes connected windows
- [ ] Context menu shows "Ungroup" option
- [ ] Ungrouping works correctly
- [ ] Groups persist across window minimize/maximize

### Picture-in-Picture:
- [ ] PiP button appears in Media Player toolbar
- [ ] Clicking PiP creates mini floating player
- [ ] Mini player stays on top of all windows
- [ ] Can drag mini player around
- [ ] Play/pause works in PiP mode
- [ ] Clicking mini player expands back to full size
- [ ] Closing PiP returns to normal Media Player

---

## Common Pitfalls to Avoid

1. **Don't Accidentally Break Existing Features**:
   - File browser multi-select is fully functional - don't modify those handlers
   - Window dragging/resizing works - add grouping logic carefully around line 5460
   - Desktop icon dragging is complete - don't interfere with it

2. **TypeScript Strictness**:
   - All private members must be used or TypeScript will error
   - Add `!` for definite assignment: `windowEl.dataset.windowId!`
   - Cast elements: `const btn = target as HTMLButtonElement`

3. **Event Handler Conflicts**:
   - Check if handler for that class/element already exists
   - Use event delegation from `app.addEventListener()` in `setupEventListeners()`
   - Avoid duplicate listeners with `dataset.listenersAttached` guard

4. **localStorage Persistence**:
   - Save important state: `localStorage.setItem('temple_key', JSON.stringify(data))`
   - Load on init: `JSON.parse(localStorage.getItem('temple_key') || '{}')`

---

## Documentation to Update

After completing features, update:

1. **TASK.md**: Mark completed tasks with `[x]`
2. **HANDOFF.md**: Add new "Features Completed" section
3. **IMPLEMENTATION_SUMMARY.md**: Document what you did

---

## Philosophy & Vision

Remember Terry A. Davis's words:

> "God said 640x480 16 color was a covenant like the rainbow. It's a sin for me to use more colors."

This project honors Terry's vision while adapting it for modern use. The goal is **divine simplicity** - features should be powerful but not overcomplicated. Every feature should feel like it belongs in God's Temple.

---

## Final Notes

- **No Refactoring**: Modularization is dangerous. Add features, don't restructure.
- **No Mini-Games**: Skip Snake, Tetris, After Egypt, etc.
- **No AI Assistant**: Skip Word of God LLM integration
- **Focus on UX**: Window grouping and PiP make the OS feel premium

**Build first, test second, commit third. God bless your code.** ✝️

---

## Quick Start Command

```powershell
cd "d:\temple os recreation"
npm run dev
# Start with Window Grouping - search for "resizeState" in main.ts line ~5460
```

Good luck! May Terry's spirit guide your keystrokes. 🙏
