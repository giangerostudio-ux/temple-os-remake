# TempleOS Remake - Quick Reference

## Run the Project
```bash
cd "d:\temple os recreation"
npm run dev
# Opens at http://localhost:5173
```

## File Structure
```
d:\temple os recreation\
├── index.html          # Entry point
├── src/
│   ├── main.ts         # All logic here
│   └── style.css       # All styling here
├── docs/
│   ├── PHASES.md       # 📍 START HERE - Phase tracking
│   ├── SESSION-PROMPT.md # Copy-paste for new AI sessions
│   ├── master-plan.md
│   ├── apps-and-programs.md
│   ├── security-features.md
│   ├── gaming-integration.md
│   ├── browser-integration.md
│   ├── boot-sequence.md
│   └── ideas-and-features.md
└── package.json
```

## Key Classes/Functions in main.ts

| Name | Purpose |
|------|---------|
| `TempleOS` | Main class, manages everything |
| `WindowState` | Interface for window data |
| `windows[]` | Array of open windows |
| `openApp(appId)` | Opens an app window |
| `closeWindow(id)` | Closes a window |
| `minimizeWindow(id)` | Minimizes to taskbar |
| `maximizeWindow(id)` | Toggles fullscreen |
| `focusWindow(id)` | Brings window to front |
| `render()` | Updates DOM (windows + taskbar) |
| `renderBootScreen()` | Boot animation HTML |
| `setupEventListeners()` | All event handlers |
| `handleTerminalCommand()` | Processes terminal input |
| `getWordOfGodContent()` | Random Bible verse |
| `getFileBrowserContent()` | File list UI |
| `getEditorContent()` | Code editor UI |

## CSS Custom Properties

```css
/* VGA Palette - use these! */
--tos-black, --tos-blue, --tos-green, --tos-cyan
--tos-red, --tos-magenta, --tos-yellow, --tos-white
--tos-bright-black, --tos-bright-blue, --tos-bright-green
--tos-bright-cyan, --tos-bright-red, --tos-bright-magenta
--tos-bright-yellow, --tos-bright-white

/* Theme colors */
--bg-primary: #0d1117
--bg-secondary: #161b22
--text-primary: #c9d1d9
--accent-gold: #ffd700
```

## Common Tasks

### Add a new desktop app
1. Add icon to `desktopIcons` array in main.ts
2. Add case to `openApp()` switch
3. Create `get[AppName]Content()` function
4. Add styling in style.css

### Add a terminal command
1. Find `handleTerminalCommand()` in main.ts
2. Add case to the switch statement
3. Append output to terminal-output element

### Add a new window feature
1. Update `WindowState` interface if needed
2. Modify `renderWindow()` for UI
3. Add event handler in `setupEventListeners()`
4. Add supporting method if complex

## Current Phase: 1 - Browser Prototype

See `docs/PHASES.md` for full to-do list and AI prompts.
