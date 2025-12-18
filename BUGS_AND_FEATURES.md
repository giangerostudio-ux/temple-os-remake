# Bugs and Features Tracker

**Created:** 2025-12-18  
**Status:** Documented, awaiting implementation

---

## 🐛 Bugs to Fix

### Bug #1: Initial Load Responsiveness Issue
**Priority:** High  
**Description:**  
When the OS loads, there's a delay before the following interactions work:
- Right-clicking on the desktop
- Using hotkeys with the Windows button
- Clicking settings in the settings tab

**Workaround:**  
Spam-clicking the Temple button (bottom left) "unbugs" the system and makes it responsive.

**Observed Behavior:**  
System appears frozen for UI interactions but becomes responsive after Temple button interaction.

**Potential Causes:**
- Initialization race condition
- Event listeners not being attached in time
- Focus/z-index issues preventing click events from registering
- Async initialization blocking the main thread

**Research Notes:**
- Check `main.ts` initialization order
- Verify event listener attachment timing
- Look for blocking operations during startup
- Investigate if Temple button click triggers something that should happen automatically

---

### Bug #2: Folder Context Menu Shows Wrong Options
**Priority:** High  
**Description:**  
Right-clicking on an **existing folder** in the file manager shows "New Folder" option instead of folder-specific context menu options.

**Expected Behavior:**  
Should show options like: Open, Rename, Delete, Copy, Cut, Properties, etc.

**Actual Behavior:**  
Shows the same context menu as right-clicking on empty space (New Folder, New File, etc.)

**Screenshot:**
![Folder context menu bug](file:///C:/Users/Oswald Mosley/.gemini/antigravity/brain/12f30d2a-e768-49d9-83d3-e5ffc3858e2d/uploaded_image_1766078083028.png)

**Potential Causes:**
- Context menu not detecting click target properly
- Missing conditional logic for folder vs empty space
- Event bubbling issue
- Incorrect element selection in context menu handler

**Research Notes:**
- Check FileManager context menu implementation
- Verify event.target detection
- Look for context menu differentiation logic

---

### Bug #3: Virtual Workspace Cycling Incomplete
**Priority:** Medium  
**Description:**  
The 4 virtual workspaces don't cycle correctly when using keyboard shortcuts. Currently only cycles between workspace 1 and 3, skipping workspaces 2 and 4.

**Expected Behavior:**  
- Should cycle through all 4 workspaces (1→2→3→4→1)
- Left keybind: cycles left (4→3→2→1→4)
- Right keybind: cycles right (1→2→3→4→1)

**Actual Behavior:**  
Only switches between workspace 1 and 3.

**Potential Causes:**
- Off-by-one error in cycling logic
- Incorrect modulo arithmetic
- Missing workspace indices in the cycle array
- Keybind handler using wrong increment value

**Research Notes:**
- Locate WorkspaceManager or similar component
- Check keyboard shortcut handlers
- Verify workspace index calculations

---

## ✨ Features to Implement

### Feature #1: Reduce Divine Intellect Notification Spam
**Priority:** Medium  
**Description:**  
Divine Intellect notifications are currently too frequent and annoying.

**Requested Improvement:**  
Make notifications less spammy and more user-friendly.

**Implementation Ideas:**
- Add notification cooldown/throttling (e.g., max 1 notification per 30 seconds)
- Implement notification batching (group multiple notifications)
- Add user settings for notification frequency
- Create notification priority levels (only show important ones)
- Add "Do Not Disturb" mode
- Implement fade-out animations instead of abrupt dismissals

**Research:**
- Check how notification system currently works
- Look into notification queue management
- Research best practices for non-intrusive notifications

---

### Feature #2: Draggable Desktop Icons
**Priority:** High  
**Description:**  
Currently unable to drag and reposition desktop icons.

**Requirements:**
- Icons should be draggable around the desktop
- Positions should persist after restart
- Should snap to grid (optional)
- Should not overlap (optional, could allow free positioning)

**Implementation Approach:**
1. Add drag event listeners to desktop icons
2. Track icon positions (x, y coordinates)
3. Store positions in localStorage or settings
4. Load saved positions on startup
5. Update CSS to use absolute positioning
6. Handle drag boundaries (keep icons within desktop bounds)

**Technical Considerations:**
- Use HTML5 Drag and Drop API or pointer events
- Store positions as percentages for responsiveness
- Implement collision detection (optional)
- Add visual feedback during drag
- Handle multi-monitor setups

**Research:**
- HTML5 dragstart, drag, dragend events
- CSS position: absolute with transform
- LocalStorage for persistence
- Similar implementations in other OS projects

---

### Feature #3: Easy Wallpaper Selection
**Priority:** Medium  
**Description:**  
Currently, the wallpaper setting just shows "default" with no way to choose custom images from computer files.

**Requirements:**
- Browse and select images from local file system
- Preview wallpaper before applying
- Support common image formats (PNG, JPG, WEBP, GIF)
- Remember selected wallpaper across sessions
- Option to fit/fill/stretch/center wallpaper

**Implementation Approach:**
1. Add file picker button in wallpaper settings
2. Use Electron's dialog API to browse files
3. Validate selected file is an image
4. Copy/reference image to app storage
5. Update CSS background-image
6. Save wallpaper path in settings
7. Add wallpaper display mode dropdown (cover, contain, stretch, center)

**Technical Details:**
```javascript
// Use Electron's dialog
const { dialog } = require('electron')
dialog.showOpenDialog({
  properties: ['openFile'],
  filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp'] }]
})
```

**Research:**
- Electron dialog.showOpenDialog API
- Image file validation
- CSS background-size and background-position properties
- File path storage and loading

---

### Feature #4: Advanced Holy Notes App (Trello-like)
**Priority:** High  
**Description:**  
Current Holy Notes app is too basic. Need to add advanced features similar to Trello.

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

### Phase 1 - Critical Bugs
1. Bug #1: Initial load responsiveness
2. Bug #2: Folder context menu

### Phase 2 - Important Features
1. Feature #2: Draggable desktop icons
2. Feature #4: Advanced Holy Notes

### Phase 3 - Polish
1. Bug #3: Workspace cycling
2. Feature #1: Divine Intellect notifications
3. Feature #3: Wallpaper selection

---

## 🔍 Next Steps

1. ✅ Document all bugs and features
2. ⏳ Research implementation approaches (in progress)
3. ⏳ Prioritize and create implementation plan
4. ⏳ Fix bugs one by one
5. ⏳ Implement features one by one
6. ⏳ Test and verify all fixes

---

**Notes:**  
All items documented as requested. Ready for systematic implementation once you give the go-ahead to start coding fixes.
