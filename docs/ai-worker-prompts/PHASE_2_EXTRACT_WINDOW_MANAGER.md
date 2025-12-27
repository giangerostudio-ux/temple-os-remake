# Phase 2: Extract WindowManager from main.ts

**Worker Assignment:** Experienced AI  
**Estimated Time:** 2-3 hours  
**Dependencies:** None  
**Risk Level:** MEDIUM (structural changes)

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify files specified in YOUR phase** (main.ts, new WindowManager.ts)
> - **Ignore TypeScript/build errors unrelated to your task** - another worker may have introduced temporary issues in other files
> - If you encounter merge conflicts, **your phase's changes take priority** for WindowManager-related code
> - When done, commit your changes to a branch named `phase-2-window-manager`

---

## Context

You are helping refactor a TempleOS-themed desktop environment. The main file `src/main.ts` is 19,027 lines and needs to be split into modules. This phase extracts window management logic.

## Goal

Extract all window dragging, resizing, snapping, and state management into a new `src/core/WindowManager.ts` module.

---

## Current Structure

The `TempleOS` class in `src/main.ts` contains ~500 methods. Window-related methods include:

```typescript
// Lines to extract (approximate):
private startWindowDrag(...)       // ~line 2600
private handleWindowDrag(...)      // ~line 2650  
private endWindowDrag(...)         // ~line 2700
private startWindowResize(...)     // ~line 2750
private handleWindowResize(...)    // ~line 2800
private endWindowResize(...)       // ~line 2850
private handleWindowSnap(...)      // ~line 2900
private maximizeWindow(...)        // ~line 2950
private minimizeWindow(...)        // ~line 3000
private restoreWindow(...)         // ~line 3050
private closeWindow(...)           // ~line 3100
private bringToFront(...)          // ~line 3150
private getWindowById(...)         // ~line 520
```

---

## Target Architecture

Create: `src/core/WindowManager.ts`

```typescript
import type { WindowState } from '../utils/types';

export interface WindowManagerCallbacks {
  onWindowsChange: () => void;
  onActiveWindowChange: (windowId: string | null) => void;
}

export class WindowManager {
  private windows: WindowState[] = [];
  private activeWindowId: string | null = null;
  private callbacks: WindowManagerCallbacks;
  
  constructor(callbacks: WindowManagerCallbacks) {
    this.callbacks = callbacks;
  }
  
  // Window CRUD
  createWindow(options: Partial<WindowState>): WindowState { ... }
  getWindowById(id: string): WindowState | undefined { ... }
  getAllWindows(): WindowState[] { ... }
  updateWindow(id: string, updates: Partial<WindowState>): void { ... }
  removeWindow(id: string): void { ... }
  
  // Window actions
  minimizeWindow(id: string): void { ... }
  maximizeWindow(id: string): void { ... }
  restoreWindow(id: string): void { ... }
  closeWindow(id: string): void { ... }
  bringToFront(id: string): void { ... }
  
  // Drag & Resize
  startDrag(id: string, x: number, y: number): void { ... }
  handleDrag(x: number, y: number): void { ... }
  endDrag(): void { ... }
  startResize(id: string, x: number, y: number, edge: string): void { ... }
  handleResize(x: number, y: number): void { ... }
  endResize(): void { ... }
  
  // Snapping
  snapWindow(id: string, mode: 'left' | 'right' | 'top' | 'bottom' | 'maximize'): void { ... }
}
```

---

## Step-by-Step Instructions

### Step 1: Create the file structure

```bash
mkdir -p src/core
touch src/core/WindowManager.ts
```

### Step 2: Define the WindowState interface

Check `src/utils/types.ts` for existing `WindowState` type. If it doesn't exist, create it:

```typescript
// In src/utils/types.ts (add if missing)
export interface WindowState {
  id: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  active: boolean;
  minimized: boolean;
  maximized?: boolean;
  opened?: boolean;
  transparent?: boolean;
  alwaysOnTop?: boolean;
  savedBounds?: { x: number; y: number; width: number; height: number };
}
```

### Step 3: Extract methods from main.ts

1. Search for `private.*[Ww]indow` in main.ts to find all window methods
2. Copy each method to WindowManager.ts
3. Convert from `private methodName` to just `methodName` (public)
4. Replace `this.windows` with local `windows` array
5. Replace direct DOM manipulation with callbacks

### Step 4: Update main.ts to use WindowManager

```typescript
// In TempleOS class constructor
import { WindowManager } from './core/WindowManager';

class TempleOS {
  private windowManager: WindowManager;
  
  constructor() {
    this.windowManager = new WindowManager({
      onWindowsChange: () => this.render(),
      onActiveWindowChange: (id) => this.handleActiveWindowChange(id)
    });
  }
  
  // Replace: this.windows -> this.windowManager.getAllWindows()
  // Replace: this.getWindowById(id) -> this.windowManager.getWindowById(id)
  // etc.
}
```

---

## What NOT to Extract

Keep these in main.ts (they depend on too many other systems):
- `openApp()` - depends on app initialization
- `renderWindow()` - depends on DOM/rendering system
- Window content rendering - depends on specific app logic

---

## Verification

1. `npm run build` - should compile without errors
2. `npm run electron:dev` - windows should still work:
   - Drag windows around
   - Resize windows
   - Minimize/maximize/close
   - Snap to edges

---

## Success Criteria

- [ ] `src/core/WindowManager.ts` exists with 300-500 lines
- [ ] All window drag/resize logic moved out of main.ts
- [ ] main.ts reduced by ~500 lines
- [ ] No TypeScript errors
- [ ] Windows still functional in the app

---

## Hints

- The `render()` method should stay in main.ts
- WindowManager should be "headless" - no DOM manipulation
- Use callbacks to trigger re-renders
- Keep the existing `WindowState` type signature
