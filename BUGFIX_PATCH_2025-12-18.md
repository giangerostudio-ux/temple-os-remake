# Bug Fix Patch - December 18, 2025

This document tracks all bug fixes applied in this session.

## Issues Identified

### 1. Settings Window Rendering Raw HTML (CRITICAL)
**File:** `src/main.ts`
**Lines:** 11278-11289
**Problem:** The return statement in `getSettingsContentV2()` has broken HTML template syntax with spaces inside angle brackets like `< div class="..."` and `style = "..."` which causes the browser to render them as text instead of HTML elements.
**Fix:** Remove extra spaces inside angle brackets and fix template syntax.
**Status:** ✅ FIXED

### 2. Platform Says "Linux" in About Section
**File:** `src/main.ts`  
**Lines:** 10788
**Problem:** The About page shows `${info?.platform || '—'}` which displays "Linux" on Linux systems. User wants to mask this and show "TempleOS Remake" instead.
**Fix:** Replace platform display with "TempleOS Remake".
**Status:** ✅ FIXED

### 3. Godly Notes Missing from Desktop Icons
**File:** `src/main.ts`
**Lines:** 1646-1652
**Problem:** The Godly Notes app is present in the Start Menu's `legacyPinnedApps` but not in `renderDesktopIcons()`.
**Fix:** Add Godly Notes to the desktop icons array.
**Status:** ✅ FIXED

### 4. Double render() Call Causing Refresh Issues  
**File:** `src/main.ts`
**Lines:** 809-810
**Problem:** Inside `init()`, the workspace manager's onChange callback calls `this.render()` twice consecutively, potentially causing performance issues and flickering.
**Fix:** Remove the duplicate render() call.
**Status:** ✅ FIXED

### 5. Setup Wizard Too Short / Missing Options
**File:** `src/main.ts`
**Lines:** 14015-14057
**Problem:** The setup wizard only has 3 steps (Welcome, Theme, Finish) but should have more options like Privacy settings.
**Fix:** Add additional setup wizard steps including Privacy and Features.
**Status:** ✅ FIXED (Now has 5 steps: Welcome, Theme, Privacy, Features, Finish)

### 6. No "Run Setup Again" Option in Settings
**File:** `src/main.ts`
**Problem:** User requested an option to re-run the initial setup wizard from Settings.
**Fix:** Add a "Run Setup Again" button in the About settings section.
**Status:** ✅ FIXED (Added in Settings > About > Setup & Maintenance section)

### 7. Desktop Icon Dragging Not Working
**File:** `src/main.ts`
**Problem:** Desktop icons cannot be moved/dragged around.
**Fix:** This requires additional investigation - the drag event listeners may need to be implemented.
**Status:** 📋 NEEDS INVESTIGATION

---

## Applied Fixes Summary

| Fix | Description | Lines Changed |
|-----|-------------|---------------|
| 1 | Fixed HTML template syntax in settings window | 11268-11289 |
| 2 | Changed platform display to "TempleOS Remake" | 10788 |
| 3 | Added Godly Notes to desktop icons | 1647 |
| 4 | Removed duplicate render() call | 809-810 |
| 5 | Expanded setup wizard to 5 steps | 14043-14120 |
| 6 | Added "Run Setup Again" button and event handler | 10803-10818, 3520-3533 |

---

## Testing Notes
- After applying patches, run `npm run dev` to test the changes
- Verify Settings window renders correctly (no raw HTML)
- Check that About shows "TempleOS Remake" instead of "Linux"
- Confirm Godly Notes appears on desktop
- Test that windows don't refresh excessively
- Test the expanded setup wizard (5 steps) via Settings > About > "Run Setup Again"
