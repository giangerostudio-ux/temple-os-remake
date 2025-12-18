# Bug Fix: Responsiveness & Right-Click Issues

## Root Cause Analysis

### 1. Unresponsive System (Boot Screen Overlay)
- **Symptoms**: The system appeared unresponsive for ~1 minute after boot.
- **Cause**: The "Boot Screen" (`.boot-screen`) is an overlay with `z-index: 10000` that covers the entire screen. It was supposed to be hidden by a `setTimeout` after 4.5 seconds. However, if this timer callback failed to run (due to thread locking) or if the element reference was lost, the overlay would remain, blocking all mouse clicks.
- **Why Spamming Worked**: Clicking the "Temple Button" triggers a `render()` call. "Spamming" interaction likely forced the event loop to turn over or triggered a state change that eventually caused the overlay to disappear.
- **The Fix**: Modified the central `render()` function to explicitly check for and remove the `.boot-screen` element if `performance.now() > 5000` (5 seconds). This guarantees the overlay is removed regardless of timer failure.

### 2. Broken Right-Click (Context Menu)
- **Symptoms**: "Cannot right click in the desktop".
- **Cause**: The `contextmenu` event listener was **completely missing** from the `setupEventListeners` function. The code had a `showContextMenu` method defined but never called it.
- **The Fix**: Added a robust `contextmenu` event listener to `setupEventListeners()`. It now properly detects right-clicks on the desktop and shows the custom TempleOS context menu (New Folder, New File, Refresh, etc.).

## Verification
- **Boot**: The system should now be fully interactive immediately after the boot animation (approx 5 seconds).
- **Right-Click**: Right-clicking the desktop should now show the menu.
- **General**: Checks added to ensure context menus close when clicking elsewhere.
