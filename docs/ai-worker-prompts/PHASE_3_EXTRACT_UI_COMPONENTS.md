# Phase 3: Extract UI Components (Taskbar, Desktop, ContextMenu)

**Worker Assignment:** Experienced AI  
**Estimated Time:** 2-3 hours  
**Dependencies:** None (can run parallel to Phase 2)  
**Risk Level:** MEDIUM (structural changes)

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify files specified in YOUR phase** (main.ts UI sections, new Taskbar.ts/Desktop.ts/ContextMenu.ts)
> - **Ignore TypeScript/build errors unrelated to your task** - another worker may have introduced temporary issues
> - If you encounter merge conflicts, **your phase's changes take priority** for UI component code
> - When done, commit your changes to a branch named `phase-3-ui-components`

---

## Context

You are helping refactor `src/main.ts` (19,027 lines) by extracting UI components. This phase extracts Taskbar, Desktop, and ContextMenu into separate modules.

---

## Target Files to Create

```
src/ui/
├── Taskbar.ts       (~300-400 lines)
├── Desktop.ts       (~400-500 lines)  
└── ContextMenu.ts   (~200-300 lines)
```

---

## Part A: Extract Taskbar.ts

### Methods to Extract from main.ts

Search for these patterns:
```
renderTaskbar
taskbar
taskbarItem
TaskbarItem
```

Key methods (~lines approximate):
- `renderTaskbar()` - ~line 3200
- `handleTaskbarClick()` - ~line 3300
- `renderTaskbarItem()` - ~line 3350
- Taskbar context menu logic

### Target Structure

```typescript
// src/ui/Taskbar.ts
export interface TaskbarItem {
  id: string;
  title: string;
  icon: string;
  active: boolean;
  minimized: boolean;
}

export interface TaskbarCallbacks {
  onItemClick: (id: string) => void;
  onItemContextMenu: (id: string, x: number, y: number) => void;
  onStartMenuClick: () => void;
}

export class Taskbar {
  private items: TaskbarItem[] = [];
  private callbacks: TaskbarCallbacks;
  
  constructor(callbacks: TaskbarCallbacks) { ... }
  
  setItems(items: TaskbarItem[]): void { ... }
  render(container: HTMLElement): void { ... }
  
  // Private helpers
  private renderItem(item: TaskbarItem): string { ... }
  private handleClick(e: MouseEvent): void { ... }
}
```

---

## Part B: Extract Desktop.ts

### Methods to Extract

Search for:
```
desktop
desktopIcon
DesktopIcon
wallpaper
```

Key methods:
- `renderDesktop()` - ~line 2800
- `handleIconDragStart()` - ~line 2978
- `handleIconDragEnd()` - ~line 3030
- Desktop icon positioning logic
- Wallpaper handling

### Target Structure

```typescript
// src/ui/Desktop.ts
export interface DesktopIcon {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  action: string;
}

export interface DesktopCallbacks {
  onIconClick: (id: string) => void;
  onIconDoubleClick: (id: string) => void;
  onIconContextMenu: (id: string, x: number, y: number) => void;
  onBackgroundClick: () => void;
  onBackgroundContextMenu: (x: number, y: number) => void;
}

export class Desktop {
  private icons: DesktopIcon[] = [];
  private iconSize: 'small' | 'large' = 'small';
  private callbacks: DesktopCallbacks;
  
  constructor(callbacks: DesktopCallbacks) { ... }
  
  setIcons(icons: DesktopIcon[]): void { ... }
  setIconSize(size: 'small' | 'large'): void { ... }
  render(container: HTMLElement): void { ... }
  
  // Icon drag handling
  startIconDrag(id: string, x: number, y: number): void { ... }
  handleIconDrag(x: number, y: number): void { ... }
  endIconDrag(): void { ... }
}
```

---

## Part C: Extract ContextMenu.ts

### Methods to Extract

Search for:
```
contextMenu
ContextMenu  
showContextMenu
hideContextMenu
```

Key methods:
- `showContextMenu()` - ~line 17845
- Context menu rendering
- Menu item click handling

### Target Structure

```typescript
// src/ui/ContextMenu.ts
export interface ContextMenuItem {
  label?: string;
  action?: () => void | Promise<void>;
  divider?: boolean;
  submenu?: ContextMenuItem[];
  disabled?: boolean;
}

export class ContextMenu {
  private visible = false;
  private items: ContextMenuItem[] = [];
  private x = 0;
  private y = 0;
  
  show(x: number, y: number, items: ContextMenuItem[]): void { ... }
  hide(): void { ... }
  render(container: HTMLElement): void { ... }
  
  private handleItemClick(item: ContextMenuItem): void { ... }
  private handleOutsideClick(e: MouseEvent): void { ... }
}
```

---

## Step-by-Step Instructions

### Step 1: Create files

```bash
mkdir -p src/ui
touch src/ui/Taskbar.ts
touch src/ui/Desktop.ts
touch src/ui/ContextMenu.ts
```

### Step 2: Extract each component

For each component:
1. Create the class with empty methods
2. Copy method bodies from main.ts
3. Replace `this.propertyName` with local properties
4. Add callbacks for actions that need main app context
5. Export the class

### Step 3: Update main.ts

```typescript
import { Taskbar } from './ui/Taskbar';
import { Desktop } from './ui/Desktop';
import { ContextMenu } from './ui/ContextMenu';

class TempleOS {
  private taskbar: Taskbar;
  private desktop: Desktop;
  private contextMenu: ContextMenu;
  
  constructor() {
    this.taskbar = new Taskbar({
      onItemClick: (id) => this.handleTaskbarItemClick(id),
      onStartMenuClick: () => this.toggleStartMenu(),
      // ...
    });
    // ...
  }
}
```

---

## Verification

1. `npm run build` - should compile
2. Test each component:
   - Taskbar: Click window items, right-click for context menu
   - Desktop: Drag icons, double-click to open
   - Context Menu: Right-click on desktop, taskbar, files

---

## Success Criteria

- [ ] `src/ui/Taskbar.ts` exists (~300 lines)
- [ ] `src/ui/Desktop.ts` exists (~400 lines)
- [ ] `src/ui/ContextMenu.ts` exists (~200 lines)
- [ ] main.ts reduced by ~900 lines
- [ ] All UI interactions still work
