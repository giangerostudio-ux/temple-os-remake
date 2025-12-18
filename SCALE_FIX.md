# Quick Fix: Reset Display Scale via Console

## Immediate Solution

If you can't click properly due to scaling issues, **press `Ctrl+Shift+I`** to open DevTools and paste this into the Console:

```javascript
// IMMEDIATE RESET - Paste this in the console (Ctrl+Shift+I)
// This will reset your display scale to 1.0 (100%)

// Reset any CSS-based scaling
document.documentElement.style.zoom = "100%";
document.body.style.zoom = "100%";
document.body.style.transform = "scale(1)";

// Find and reset the slider value
const scaleSlider = document.querySelector('.display-scale-slider');
if (scaleSlider) {
  scaleSlider.value = "1";
}

// Try to call the backend to reset the actual display scale
if (window.electronAPI?.setDisplayScale) {
  // Get the active output name
  const outputSelect = document.querySelector('.display-output-select');
  const outputName = outputSelect ? outputSelect.value : '';
  
  if (outputName) {
    window.electronAPI.setDisplayScale(outputName, 1.0).then(() => {
      console.log('Display scale reset to 1.0');
      // Reload to apply changes
      setTimeout(() => location.reload(), 500);
    }).catch(err => {
      console.error('Failed to reset scale:', err);
      alert('Scale reset failed. Try restarting the app or your display manager.');
    });
  }
}

// If all else fails, just reload
console.log('If the UI is still broken, try: location.reload()');
```

## Alternative: Edit Config File Directly

If the console doesn't work, you can edit the config file directly:

**Windows/Linux**: Find and edit `~/.config/templeos/config.json`

Look for display-related settings and remove or reset them, then restart the app.

## Prevention Going Forward

The issue will be fixed in the code to:
1. Add better min/max limits (0.5 to 2.0 instead of 1 to 2)
2. Add a reset button
3. Show the current scale percentage
4. Debounce scale changes to prevent accidental drags

## If Nothing Works

Restart your app completely or run:
```bash
# Reset display scale via command line (Ubuntu/Wayland)
wlr-randr --output <YOUR-OUTPUT> --scale 1.0

# Or for Sway
swaymsg output <YOUR-OUTPUT> scale 1
```
