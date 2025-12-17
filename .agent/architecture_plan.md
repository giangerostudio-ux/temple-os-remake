# TempleOS Remake - Architecture Refactoring Plan

## Current State
- **Single file**: `main.ts` (462KB, 10,629 lines)
- **Structure**: Monolithic class `TempleOS` with all functionality
- **Problems**:
  - Hard to navigate
  - Difficult to maintain
  - Merge conflicts inevitable
  - No separation of concerns

## Proposed Modular Architecture

```
src/
├── main.ts                 # Entry point & orchestration (< 500 lines)
├── core/
│   ├── TempleOS.ts        # Main OS class (orchestrator only)
│   ├── WindowManager.ts   # Window state & rendering
│   ├── EventBus.ts        # Central event system
│   └── ConfigManager.ts   # Config persistence
├── apps/
│   ├── FileManager.ts     # File browser app
│   ├── Terminal.ts        # Terminal app
│   ├── TextEditor.ts      # Editor app
│   ├── ImageViewer.ts     # Image viewer app ⭐ NEW
│   ├── SystemMonitor.ts   # System monitor app
│   ├── Settings.ts        # Settings app
│   ├── MusicPlayer.ts     # Music/hymn player
│   ├── Calculator.ts      # Calculator app
│   ├── Calendar.ts        # Calendar app
│   ├── Notes.ts           # Notes app
│   ├── Oracle.ts          # Oracle/Talk to God
│   ├── SpriteEditor.ts    # Sprite editor
│   ├── AutoHarp.ts        # AutoHarp music maker
│   └── DolDocViewer.ts    # DolDoc viewer
├── ui/
│   ├── Taskbar.ts         # Taskbar rendering & logic
│   ├── StartMenu.ts       # Start menu
│   ├── Tray.ts            # System tray
│   ├── LockScreen.ts      # Lock screen
│   ├── Notifications.ts   # Notification system
│   ├── AltTab.ts          # Alt-Tab switcher
│   └── ContextMenu.ts     # Context menus
├── system/
│   ├── Network.ts         # Network management
│   ├── Audio.ts           # Audio system
│   ├── Security.ts        # Security features
│   ├── Theme.ts           # Theme system
│   └── FirstRun.ts        # First run wizard
├── utils/
│   ├── helpers.ts         # Utility functions
│   ├── constants.ts       # Constants & data
│   ├── types.ts           # TypeScript interfaces
│   └── ipc.ts             # Electron IPC wrappers
└── style.css              # Keep as is
```

## Migration Strategy

### Phase 1: Extract Interfaces & Types (SAFE - No breaking changes)
- Create `utils/types.ts` with all interfaces
- Import into main.ts
- Keep everything working

### Phase 2: Extract Utilities (SAFE)
- Create `utils/helpers.ts` with pure functions
- Create `utils/constants.ts` with data arrays
- Import into main.ts

### Phase 3: Extract Apps (ONE AT A TIME)
- Start with simpler apps (Calculator, Oracle)
- Each app becomes a class with:
  - `render()` method
  - State management
  - Event handlers

### Phase 4: Extract UI Components
- Taskbar, StartMenu, etc.

### Phase 5: Extract Core Systems
- WindowManager, ConfigManager, etc.

## Benefits
✅ Easier navigation
✅ Better separation of concerns
✅ Parallel development possible
✅ Easier testing
✅ Smaller modules = faster dev experience
✅ Clear responsibility boundaries

## Recommendation for this Session

**DO NOT REFACTOR YET** - Too risky and time-consuming

Instead:
1. Keep main.ts as-is
2. Create NEW modules for NEW features only
3. Import and use them from main.ts
4. Gradually migrate over time

### Example: Image Viewer Enhancement

Instead of editing main.ts directly, create:
```typescript
// src/apps/ImageViewer.ts
export class ImageViewer {
  renderControls() { ... }
  handlePan() { ... }
  handleSlideshow() { ... }
}
```

Then import in main.ts:
```typescript
import { ImageViewer } from './apps/ImageViewer';
```

This way:
- No risk of breaking existing code
- Cleaner additions
- Future-proof architecture
