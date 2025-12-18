
# Next Session Prompt

## 🎯 Current Context & Objectives
The user has requested 3 specific new features to "complete" the OS functionality before moving on to distribution:
1.  **Godly Notes (Kanban Board)**: A Trello-like app integrated into the system (Tier 8).
2.  **Time & Date Management**: Ability to change GMT/Timezone automatically or manually (currently just uses system local time).
3.  **Memory Cleaner**: A "Mem Reduct" clone that cleans RAM when it hits 90% usage (for Linux/Ubuntu Server context).

## 📋 Immediate Action Items (Prioritized)
1.  **Develop "Godly Notes" (Kanban App)**:
    - Create `src/apps/GodlyNotes.ts`.
    - Implement a column-based board (ToDo, Doing, Done).
    - Allow adding cards, dragging cards (using HTML5 Drag & Drop).
    - Persist data to `localStorage`.
    - Add to Start Menu and Desktop.

2.  **Implement Timezone Settings**:
    - Update `SettingsManager` to store `timezone` (e.g., 'UTC', 'America/New_York') and `autoTime` (boolean).
    - Update `TempleOS.updateClock()` to respect the selected timezone using `Intl.DateTimeFormat`.
    - Add UI in Settings > Date & Time.

3.  **Implement Memory Cleaner**:
    - Create `src/system/MemoryOptimizer.ts`.
    - If running in Electron/Node context, use `os` module or `exec` to check memory.
    - Implement a `clean()` method. On Windows, this is limited; on Linux (`os.platform() === 'linux'`), run `sync; echo 3 > /proc/sys/vm/drop_caches` via `sudo` (or assume root/configured sudoers).
    - **Crucial Note**: Since this is likely running in a non-privileged Electron container on Windows for development, mock standard "cleaning" (garbage collection `global.gc()` if available) for the demo, but implement the backend command for Linux.
    - Add a small UI widget or System Tray icon for "Mem Reduct" style manual trigger.

## ⚠️ Constraints & Knowledge
- **Environment**: You are in a Windows VDI content but the target might be a "custom OS" for Ubuntu Server.
- **Tools**: Use `EffectsManager` for visual flair (jelly mode is active!).
- **Style**: Maintain the "Divine" aesthetic (Green/Gold/Black).

## 🚀 Status
- **Basic OS**: Complete.
- **Visuals**: Tier 14 (Jelly Mode) Complete.
- **Next**: These 3 user requests.
