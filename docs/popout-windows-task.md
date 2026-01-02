# Popout Windows Implementation Task

## 🎯 Objective
Implement popout versions of **Files**, **Settings**, and **Tray Options** that work like the Terminal popout.

## 📋 Background: Why Popout Windows?

When **X11 applications** (Firefox, Steam, etc.) are opened from the TempleOS Start Menu, they take over the main Electron window. The inline apps (Terminal, Files, Settings) that were rendered inside the main window can no longer be accessed.

**Solution:** Create standalone popout `BrowserWindow` instances for each app that:
1. Open as separate Electron windows
2. Have full functionality (not just read-only)
3. Work independently from the main window
4. Can be accessed while X11 apps are running in the background

## ✅ Already Completed: Terminal Popout

The Terminal popout is fully implemented with:
- Multi-tab support
- Find/Search  
- Split view (vertical/horizontal)
- Settings modal (font size, theme, scrollback)
- Tab context menu
- localStorage persistence

**Reference files:**
- `terminal-window.html` - HTML + CSS
- `src/terminal-window.ts` - Logic
- `src/popout-terminal-manager.ts` - Tab/PTY management

## 🔨 TODO: Implement These Popouts

### 1. Files Popout (`files-window.html`)
Currently exists but may need feature parity with inline version:
- File browser functionality
- Navigation (back, forward, up, home)
- File operations (create, delete, rename, copy, paste)
- Context menu
- Breadcrumb path bar
- Grid/List view toggle
- Search functionality

**Inline version location:** `src/main.ts` → look for file manager code

### 2. Settings Popout
Does not exist yet. Needs:
- All system settings from inline Settings app
- Theme selection
- Desktop customization
- System info display
- Any other settings currently in inline version

**Inline version location:** `src/main.ts` → look for settings/preferences code

### 3. Tray Options Popout (if applicable)
System tray functionality that might need popout access:
- Quick settings
- Notifications
- Status indicators

## 🏗️ Architecture Pattern (Follow Terminal Example)

```
1. HTML file: [app]-window.html
   - Self-contained HTML with inline CSS
   - Script tag loading the TS module
   
2. TypeScript: src/[app]-window.ts  
   - Window initialization
   - Event handlers
   - DOM manipulation
   
3. Manager (if complex): src/popout-[app]-manager.ts
   - State management
   - Complex logic
   
4. Main process: electron/main.cjs
   - IPC handlers for the app
   - Window creation in createPopoutWindow()
```

## 📁 Key Files to Reference

```
# Completed Terminal (use as template)
terminal-window.html
src/terminal-window.ts
src/popout-terminal-manager.ts

# Existing Files popout (may need updates)
files-window.html
src/files-window.ts

# Main process - IPC handlers
electron/main.cjs

# Inline versions (source of truth for features)
src/main.ts
```

## 🎨 Design Guidelines

- **Green theme**: `#00ff00` for text, `#0d1117` for background
- **Fira Code font**: Monospace everywhere
- **Neon glow**: Box shadows with green rgba
- **Consistent toolbar**: Match Terminal toolbar style
- **Glass effect**: Backdrop blur on modals

## 🔧 Build & Test

```bash
cd "d:\temple os recreation"
npm run build
# Then test in app by clicking popout buttons
```

## 📌 Notes

- The inline apps in `src/main.ts` are the "source of truth" for features
- Popout versions should have feature parity with inline versions
- Use localStorage for persistence where applicable
- Ensure IPC handlers exist in `electron/main.cjs` for any backend operations
