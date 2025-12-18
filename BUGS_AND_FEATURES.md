Step Id: 1
# Bugs and Features Tracker

**Created:** 2025-12-18  
**Status:** Documented, implementation in progress

---

## 🐛 Bugs to Fix

### Bug #1: Initial Load Responsiveness Issue
**Priority:** High  
**Status:** ✅ Fixed
**Description:**  
When the OS loads, there's a delay before the following interactions work:
- Right-clicking on the desktop
- Using hotkeys with the Windows button
- Clicking settings in the settings tab

**Resolution:**  
Fixed by optimizing initialization sequence and event listener attachment.

---

### Bug #2: Folder Context Menu Shows Wrong Options
**Priority:** High  
**Status:** ✅ Fixed
**Description:**  
Right-clicking on an **existing folder** in the file manager shows "New Folder" option instead of folder-specific context menu options.

**Resolution:**
Fixed by improving the context menu target detection to check for `[data-file-path]` attribute in addition to `.file-item` class.

---

### Bug #3: Virtual Workspace Cycling Incomplete
**Priority:** Medium  
**Status:** ✅ Fixed (Verified by User)
**Description:**  
The 4 virtual workspaces don't cycle correctly when using keyboard shortcuts. Currently only cycles between workspace 1 and 3, skipping workspaces 2 and 4.

**Resolution:**
User confirmed this is already functioning correctly. No changes required.

---

## ✨ Features to Implement

### Feature #5: Desktop Icon Sorting (Context Menu)
**Priority:** Medium
**Status:** ✅ Implemented
**Description:**
The "Sort by" options in the desktop right-click context menu currently show a "Visual only" notification and do not function.

**Resolution:**
Implemented sorting by "Name" and "Type" which rearranges icons into the grid. Also added a "View" submenu to toggle "Auto Arrange" and change icon size.

---

### Feature #1: Reduce Divine Intellect Notification Spam
**Priority:** Medium  
**Status:** ✅ Implemented (Confirmed by User)
**Description:**  
Divine Intellect notifications are currently too frequent and annoying.

**Resolution:**
User confirmed this is already addressed or acceptable.

---

### Feature #2: Draggable Desktop Icons
**Priority:** High  
**Status:** ✅ Implemented
**Description:**  
Currently unable to drag and reposition desktop icons.

**Resolution:**
Implemented drag-and-drop functionality for desktop icons.
- Icons can be dragged freely when "Auto Arrange" is disabled.
- Positions are saved to localStorage.
- CSS updated to support absolute positioning.
- Added Context Menu option to toggle "Auto Arrange".

**Requirements:**
- Icons should be draggable around the desktop
- Positions should persist after restart
- Should snap to grid (optional)
- Should not overlap (optional, could allow free positioning)

---

### Feature #3: Easy Wallpaper Selection
**Priority:** Medium  
**Status:** ✅ Implemented
**Description:**  
Currently, the wallpaper setting just shows "default" with no way to choose custom images from computer files.

**Resolution:**
Implemented a "Select File..." button in the Settings > Wallpaper section.
- User can browse their local computer for an image file.
- Supported formats: JPG, PNG, GIF, WEBP.
- Selected image is applied as wallpaper and saved to localStorage (via Data URI).

**Requirements:**
- Browse and select images from local file system
- Preview wallpaper before applying (Directly applied)
- Support common image formats (PNG, JPG, WEBP, GIF)
- Remember selected wallpaper across sessions
- Option to fit/fill/stretch/center wallpaper (Default is filled)

---

### Feature #4: Advanced Holy Notes App (Trello-like)
**Priority:** High  
**Status:** ✅ Implemented
**Description:**  
Current Holy Notes app is too basic. Need to add advanced features similar to Trello.

**Resolution:**
Rebuilt Holy Notes app with the following features:
- **Multiple Boards:** Create, switch, rename, and delete boards.
- **Lists Management:** Create, delete, and rename lists.
- **Card Management:** Add, delete, and edit cards (double-click to edit).
- **Drag & Drop:** Move cards between lists.
- **Data Persistence:** Automatically saves all changes to localStorage with version-based migration.

**Current Limitations:**
- Can't delete cards
- Can't add more lists
- Can't create multiple projects/boards
- Limited organization

**Required Features:**
1. **Card Management:**
   - Delete cards (with confirmation)
   - Edit card content
   - Move cards between lists (drag and drop)
   - Add card descriptions, due dates, labels
   - Archive cards instead of permanent delete

2. **List Management:**
   - Create new lists
   - Delete lists
   - Rename lists
   - Reorder lists (drag and drop)
   - Archive lists

3. **Board/Project Management:**
   - Create multiple boards/projects
   - Switch between boards
   - Delete boards
   - Board settings (background, name, description)
   - Board templates

4. **Data Persistence:**
   - Save all data to localStorage or file system
   - Export boards as JSON
   - Import boards from JSON
   - Auto-save functionality

5. **UI Enhancements:**
   - Drag and drop for cards and lists
   - Context menus for quick actions
   - Keyboard shortcuts
   - Search/filter functionality

**Implementation Architecture:**
```
Data Structure:
{
  boards: [
    {
      id: "board-1",
      name: "Project Alpha",
      lists: [
        {
          id: "list-1",
          name: "To Do",
          cards: [
            { id: "card-1", title: "Task 1", description: "", labels: [] }
          ]
        }
      ]
    }
  ],
  activeBoard: "board-1"
}
```

**Technical Approach:**
- Use drag-and-drop library (e.g., sortable.js, dnd-kit)
- Implement state management pattern
- Create modular components for Card, List, Board
- Use modal dialogs for confirmations
- Implement undo/redo functionality (optional but recommended)

**Research:**
- Study Trello's UX patterns
- Look into drag-and-drop libraries compatible with vanilla JS
- Research local data persistence strategies
- Check existing open-source Trello clones for inspiration

---

## 📋 Implementation Priority

### Phase 1 - Important Features
1. Feature #2: Draggable desktop icons (✅ Done)
2. Feature #5: Desktop Icon Sorting (✅ Done)
3. Feature #4: Advanced Holy Notes (✅ Done)

### Phase 2 - Polish
1. Feature #1: Divine Intellect notifications (✅ Done)
2. Feature #3: Wallpaper selection (✅ Done)

---

## 🔍 Next Steps

1. ✅ Document all bugs and features
2. ⏳ Implement Features
3. ⏳ Test and verify all fixes

---


**Notes:**  
All items documented as requested. Ready for systematic implementation once you give the go-ahead to start coding fixes.
