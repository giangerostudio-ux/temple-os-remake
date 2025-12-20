# Planned Features (COMPLETED)

**Both features below have been fully implemented as of 2025-12-20.**

## [COMPLETED] Feature 1: Floating Start Menu for X11

### Problem
Currently, when Firefox or other X11 applications are open, the Start Menu is rendered as part of the main Electron window which has `_NET_WM_STATE_BELOW`. This means the Start Menu can be hidden behind X11 apps, making it inaccessible.

### Solution
Apply the same floating `BrowserWindow` approach used for the context menu popup:
- Create a new `alwaysOnTop` popup window for the Start Menu content
- Trigger it from the main renderer via IPC (`startmenu:show`, `startmenu:hide`)
- The popup renders the same Start Menu HTML but in a separate window that floats above X11 apps
- Handle blur events to auto-close, keyboard navigation, app launching, etc.

### Implementation Notes
- Reuse patterns from `contextmenu:show` in `electron/main.cjs`
- The Start Menu is more complex (search, categories, pinned apps) so the popup will need its own preload or inline JS
- Consider caching the popup instead of creating/destroying each time for faster response

---

## [COMPLETED] Feature 2: Taskbar-Aware Window Snapping

### Problem
When using "Snap Left", "Snap Right", "Snap Top", "Snap Bottom", or "Maximize" on X11 windows (like Firefox), the window resizes to the full screen dimensions and covers the taskbar.

### Solution
Adjust the snap/resize logic to account for the taskbar height and position:
- Query the taskbar height (currently 50px) and position (top or bottom)
- When snapping, calculate the available work area excluding the taskbar
- Send adjusted geometry to the X11 window via `moveResizeX11Window`

### Example Calculations
```
Screen: 1920x1080
Taskbar: bottom, 50px height
Work area: y=0, height=1030

Snap Left:  x=0, y=0, width=960, height=1030
Snap Right: x=960, y=0, width=960, height=1030
Maximize:   x=0, y=0, width=1920, height=1030
```

### Implementation Notes
- Modify `snapX11Window()` in `electron/main.cjs` (or equivalent IPC handler)
- Read taskbar position/height from config or pass as params
- For top taskbar: adjust `y` start position
- For bottom taskbar: adjust `height` to `screenHeight - taskbarHeight`

---

## Reference Screenshot
The attached screenshot shows Firefox snapped left but covering the taskbar at the bottom.

![Snap issue](file:///C:/Users/Oswald%20Mosley/.gemini/antigravity/brain/ed6eac69-5897-467f-b7a5-e11cc0de2df3/uploaded_image_1766259065567.png)
