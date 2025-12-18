# FIX: Theme & Appearance Settings

## Problem
Theme changes (dark/light, colors, high contrast, color blind mode) don't work because `applyTheme()` method is missing.

## Root Cause

The TempleOS class calls `this.applyTheme()` in multiple places, but the method **does not exist**:

```
Line 3540: this.applyTheme()  // Setup wizard theme color
Line 5424: this.applyTheme()  // Settings theme mode button
Line 5434: this.applyTheme()  // Settings theme color button
Line 5822+: applyTheme needed after accessibility toggles
```

The `SettingsManager.applyTheme()` method exists and works correctly (lines 72-152 in SettingsManager.ts), but TempleOS class doesn't delegate to it.

## Fix Required (CRITICAL - 1 LINE)

Add this method to the TempleOS class (around line 12726, after `applyWallpaper`):

```typescript
private applyTheme(): void {
  this.settingsManager.applyTheme();
}
```

## What This Fixes

Once `applyTheme()` is added, these will all work:

| Feature | UI Element | Status After Fix |
|---------|-----------|------------------|
| Dark/Light Mode | `.theme-btn` | ✅ Will work |
| Theme Color (green/amber/cyan/white) | `.theme-color-btn` | ✅ Will work |
| High Contrast | `.high-contrast-toggle` | ✅ Will work |
| Color Blind Mode | `.color-blind-select` | ✅ Will work |
| Large Text | `.large-text-toggle` | ✅ Will work |
| Reduce Motion | `.reduce-motion-toggle` | ✅ Will work |

## Existing SettingsManager.applyTheme() Implementation

This method already exists and is fully implemented:

```typescript
// From SettingsManager.ts lines 72-152
public applyTheme(): void {
  const isLight = this.host.themeMode === 'light';
  const root = document.documentElement;

  // Custom theme handling
  if (this.host.activeCustomTheme) { /* ... */ }

  // Built-in theme colors
  const colors = { green: '#00ff41', amber: '#ffb000', cyan: '#00ffff', white: '#ffffff' };
  
  // High contrast mode
  if (this.host.highContrast) {
    root.setAttribute('data-high-contrast', 'true');
  }
  
  // Apply CSS variables
  root.style.setProperty('--main-color', mainColor);
  root.style.setProperty('--bg-color', bgColor);
  root.style.setProperty('--text-color', textColor);
  
  // Accessibility
  if (this.host.largeText) root.classList.add('large-text');
  if (this.host.reduceMotion) root.classList.add('reduce-motion');
  if (this.host.colorBlindMode) root.setAttribute('data-color-blind', this.host.colorBlindMode);
}
```

## Additional Event Handlers Needed

The theme button handlers exist but may need verification:

```typescript
// These handlers exist around line 5419-5437:
const themeBtn = target.closest('.theme-btn');
if (themeBtn && themeBtn.dataset.theme) {
  this.themeMode = themeBtn.dataset.theme === 'light' ? 'light' : 'dark';
  this.applyTheme();  // Will work once method exists
  this.queueSaveConfig();
  this.refreshSettingsWindow();
}

const themeColorBtn = target.closest('.theme-color-btn');
if (themeColorBtn && themeColorBtn.dataset.color) {
  this.themeColor = themeColorBtn.dataset.color;
  this.applyTheme();  // Will work once method exists
  this.queueSaveConfig();
}
```

## Custom Themes UI - Missing Handlers

The custom themes feature has UI but missing handlers:

```
.custom-theme-item        → Select custom theme
.custom-theme-create-btn  → Open theme editor
.custom-theme-import-btn  → Import JSON
.custom-theme-export-btn  → Export JSON
.custom-theme-delete-btn  → Delete theme
.theme-editor-back-btn    → Close editor
.theme-editor-color       → Color picker
.theme-editor-save-btn    → Save theme
.theme-editor-cancel-btn  → Cancel editing
```

Add these handlers:

```typescript
// Custom theme selection
if (target.matches('.custom-theme-item')) {
  const name = target.dataset.themeName;
  this.activeCustomTheme = name;
  this.applyTheme();
  this.queueSaveConfig();
  this.refreshSettingsWindow();
}

// Create new theme
if (target.matches('.custom-theme-create-btn')) {
  this.openCustomThemeEditor();
}

// Import theme
if (target.matches('.custom-theme-import-btn')) {
  this.importCustomTheme();
}

// Export theme
if (target.matches('.custom-theme-export-btn')) {
  const name = target.dataset.themeName;
  if (name) this.exportCustomTheme(name);
}

// Delete theme
if (target.matches('.custom-theme-delete-btn')) {
  const name = target.dataset.themeName;
  if (name) this.deleteCustomTheme(name);
}
```

## Files to Modify

1. **`src/main.ts` line ~12726** - Add `applyTheme()` method (CRITICAL 1-LINE FIX)
2. **`src/main.ts` setupEventListeners** - Verify theme handlers exist, add custom theme handlers

## Priority
🔴 **CRITICAL** - This is a 1-line fix that restores ALL theme and accessibility functionality.
