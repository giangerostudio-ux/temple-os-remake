# Start Menu Bugs - Fixed

## Date: 2025-12-19

## Summary of Fixes

Both critical Start Menu bugs have been successfully fixed:

### ✅ Bug #1: Start Menu Search Now Finds Built-in Apps
**Status:** FIXED

**What was changed:**
1. Added a comprehensive `builtinApps` list in `renderStartMenu()` that includes all 17 built-in applications:
   - Terminal, Word of God, Files, HolyC Editor, Hymn Player
   - Holy Updater, Help & Docs, Godly Notes, Calculator
   - Divine Calendar, Image Viewer, Media Player, God's AutoHarp
   - Notes, Sprite Editor, Task Manager, Settings

2. Created a `searchFilteredBuiltin()` function to search built-in apps by name

3. Modified search logic to combine both built-in and installed app results:
   - Built-in apps appear FIRST in search results
   - Followed by installed apps (.desktop files)

4. Updated the rendering logic to display both types of apps correctly in the search results

**Testing:**
- Searching for "media" now finds "Media Player" ✓
- Searching for "terminal" finds "Terminal" ✓  
- Searching for "calc" finds "Calculator" ✓
- Built-in apps appear before installed apps in results ✓

---

### ✅ Bug #2: Typing in Start Menu No Longer Causes Full UI Re-render
**Status:** FIXED

**What was changed:**
1. Added a dedicated input event handler for `.start-search-input` in `setupEventListeners()`
   - Handler updates `this.startMenuSearchQuery`
   - Calls `this.updateStartMenuDom()` instead of `this.render()`
   - Returns early to prevent full app re-render

2. Created new `updateStartMenuDom()` method (similar to `updateAppLauncherDom()`)
   - Updates only the Start Menu container DOM
   - No flickering or loss of focus
   - Maintains smooth typing experience

**Testing:**
- Type in Start Menu search box - no visible flickering ✓
- Input focus remains stable ✓
- Search is smooth and responsive ✓

---

## Files Modified

- `src/main.ts`:
  - Line ~2735-2803: Added built-in apps list and updated search filtering logic
  - Line ~2840-2877: Updated results rendering to display both built-in and installed apps
  - Line ~2845-2851: Added `updateStartMenuDom()` method
  - Line ~4549-4556: Added `.start-search-input` event handler

---

## Technical Details

### Search Implementation
The search now uses a union type `SearchResult` that can represent either:
- `{ isBuiltin: true; builtin: BuiltinApp }` for built-in apps
- `{ isBuiltin: false; installed: InstalledApp }` for installed apps

This allows the rendering logic to differentiate between the two types and render them appropriately.

### Performance
The partial DOM update approach (used by App Launcher) has been successfully applied to the Start Menu:
- Only updates `#start-menu-container` innerHTML
- No full application re-render on keystroke
- Maintains focus and prevents visual artifacts

---

## Verification Steps

To verify the fixes work correctly:

1. **Test built-in app search:**
   ```
   - Click TEMPLE button to open Start Menu
   - Type "media" → Should show "Media Player"
   - Type "terminal" → Should show "Terminal"
   - Type "calc" → Should show "Calculator"
   - Clear and type "help" → Should show "Help & Docs"
   ```

2. **Test no flickering:**
   ```
   - Open Start Menu
   - Type quickly in search box
   - Observe: No screen flicker, smooth typing
   - Input focus remains stable
   ```

3. **Test built-in apps appear first:**
   ```
   - Search for a term that matches both builtin and installed apps
   - Verify built-in apps appear at the top of results
   - Installed apps appear below built-in apps
   ```

---

## Notes

- The built-in apps list matches the apps available in the `openApp()` switch statement
- Non-search views (Recent, Frequent, Category filtered) still only show installed apps for backwards compatibility
- The search is case-insensitive for both built-in and installed apps
- All built-in apps include proper categorization (System, Multimedia, Office, Development, Utilities)

