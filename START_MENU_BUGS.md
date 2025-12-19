# Start Menu Search Bugs - Fix Required

## Date: 2025-12-19

## Issues Identified

### Bug #1: Start Menu Search Does NOT Find Built-in Apps
**Severity: High**  
**Status: Not Fixed**

#### Problem Description:
When searching in the Start Menu (the menu that appears when clicking the TEMPLE button on the taskbar), built-in apps like "Media Player", "Terminal", "Files", "Calculator", etc. are NOT included in search results.

For example:
- Searching for "media" returns "No apps found" even though "Media Player" is a built-in app
- Only installed apps (.desktop files from the system) are searched
- This makes the Start Menu search almost useless

#### Root Cause:
In `src/main.ts`, the `renderStartMenu()` function has a `searchFiltered` helper that ONLY searches `InstalledApp[]`:

```typescript
const searchFiltered = (apps: InstalledApp[]) =>
  apps.filter(app =>
    app.name.toLowerCase().includes(query) ||
    app.comment?.toLowerCase().includes(query) ||
    app.categories.some(c => c.toLowerCase().includes(query))
  );
```

Then when applying search:
```typescript
if (query) {
  filteredApps = searchFiltered(this.installedApps);  // ← ONLY searches installed apps!
}
```

The built-in apps are defined as `legacyPinnedApps` but are never included in search results.

#### Required Fix:
1. Create a combined list of both built-in apps and installed apps for searching
2. Built-in apps should be structured similar to installed apps with searchable fields
3. Update `searchFiltered` to search BOTH built-in and installed apps
4. Show built-in apps first in search results, then installed apps

---

### Bug #2: Typing in Start Menu Search Causes Full UI Re-render
**Severity: High (UX Issue)**  
**Status: Not Fixed**

#### Problem Description:
When typing in the Start Menu search box, the ENTIRE application re-renders on every single keystroke. This causes:
- Visible flickering/refresh
- Loss of input focus momentarily
- Annoying typing experience
- Poor performance

#### Root Cause:
There is no specific input event handler for `.start-search-input` in the event listeners setup. This means either:
1. A generic catch-all handler is calling `this.render()` on every input event
2. The change/input event is bubbling and triggering a full render

The App Launcher (Super+A) has the correct implementation - it updates only the grid DOM without full re-render:
```typescript
// App launcher search - CORRECT approach (doesn't call render)
if (target.matches('.launcher-search-input')) {
  this.launcherSearchQuery = target.value;
  this.updateAppLauncherDom(document.getElementById('launcher-overlay-root'));
  return;
}
```

But Start Menu has NO equivalent handler for `.start-search-input`.

#### Required Fix:
1. Add a specific input event handler for `.start-search-input`
2. Create an `updateStartMenuDom()` method (similar to `updateAppLauncherDom()`)
3. The handler should:
   - Update `this.startMenuSearchQuery = target.value`
   - Call `this.updateStartMenuDom()` instead of `this.render()`
   - Return early to prevent other handlers from running

---

## Files to Modify

### Primary File:
- `src/main.ts`

### Locations in main.ts:

1. **renderStartMenu() function** (around line 2693-2843)
   - Add built-in apps to search logic
   - Ensure both builtin and installed apps are searchable

2. **setupEventListeners() function**
   - Add input handler for `.start-search-input`

3. **New method to create:**
   - `updateStartMenuDom()` - updates start menu content without full re-render

---

## Implementation Details

### Step 1: Fix Built-in Apps in Search

Create a searchable structure for built-in apps:

```typescript
const builtinApps = [
  { key: 'builtin:terminal', name: 'Terminal', icon: '💻', category: 'System' },
  { key: 'builtin:word-of-god', name: 'Word of God', icon: '✝️', category: 'Utilities' },
  { key: 'builtin:files', name: 'Files', icon: '📁', category: 'System' },
  { key: 'builtin:editor', name: 'HolyC Editor', icon: '📝', category: 'Development' },
  { key: 'builtin:hymns', name: 'Hymn Player', icon: '🎵', category: 'Multimedia' },
  { key: 'builtin:updater', name: 'Holy Updater', icon: '⬇️', category: 'System' },
  { key: 'builtin:help', name: 'Help & Docs', icon: '❓', category: 'System' },
  { key: 'builtin:godly-notes', name: 'Godly Notes', icon: '📋', category: 'Office' },
  { key: 'builtin:calculator', name: 'Calculator', icon: '🧮', category: 'Utilities' },
  { key: 'builtin:calendar', name: 'Divine Calendar', icon: '📅', category: 'Office' },
  { key: 'builtin:image-viewer', name: 'Image Viewer', icon: '🖼️', category: 'Multimedia' },
  { key: 'builtin:media-player', name: 'Media Player', icon: '💿', category: 'Multimedia' },
  { key: 'builtin:auto-harp', name: 'God\'s AutoHarp', icon: '🎹', category: 'Multimedia' },
  { key: 'builtin:notes', name: 'Notes', icon: '📝', category: 'Office' },
  { key: 'builtin:sprite-editor', name: 'Sprite Editor', icon: '🎨', category: 'Development' },
  { key: 'builtin:system-monitor', name: 'Task Manager', icon: '📊', category: 'System' },
  { key: 'builtin:settings', name: 'Settings', icon: '⚙️', category: 'System' },
];

// Search both builtin and installed apps
const searchFilteredBuiltin = () =>
  builtinApps.filter(app =>
    app.name.toLowerCase().includes(query)
  );

const searchFilteredInstalled = () =>
  this.installedApps.filter(app =>
    app.name.toLowerCase().includes(query) ||
    app.comment?.toLowerCase().includes(query) ||
    app.categories.some(c => c.toLowerCase().includes(query))
  );

if (query) {
  const builtinResults = searchFilteredBuiltin();
  const installedResults = searchFilteredInstalled();
  // Combine results: builtin first, then installed
  filteredApps = [...builtinResults, ...installedResults];
}
```

### Step 2: Create updateStartMenuDom() Method

```typescript
private updateStartMenuDom(): void {
  const container = document.getElementById('start-menu-container');
  if (!container || !this.showStartMenu) return;

  // Replace only the start menu content, not the entire app
  container.innerHTML = this.renderStartMenu();
}
```

### Step 3: Add Input Event Handler

In `setupEventListeners()`, add:

```typescript
// Start Menu Search Input
if (target.matches('.start-search-input')) {
  this.startMenuSearchQuery = target.value;
  this.updateStartMenuDom();
  return; // Prevent full render
}
```

---

## Testing Checklist

After implementing the fix:

- [ ] Open Start Menu and search for "media" - should find "Media Player"
- [ ] Search for "terminal" - should find "Terminal"  
- [ ] Search for "calc" - should find "Calculator"
- [ ] Typing in start menu search should NOT cause visible flickering
- [ ] Search should work smoothly without UI refresh
- [ ] Both built-in and installed apps should appear in results
- [ ] Built-in apps should appear before installed apps in search results

---

## Notes

- The App Launcher (Super+A) already has the correct implementation pattern
- Use it as a reference for the Start Menu fixes
- The issue is that Start Menu was implemented differently and is missing the optimization
