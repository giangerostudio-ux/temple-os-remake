# Bugs and Features Needed - 2025-12-19

## Bugs

### 1. ✅ FIXED - Task Manager Missing From Taskbar Context Menu
When right clicking on the task bar below right now and you click task manager settings it does not have like in windows all the processes u could close down and pc hardware monitoring like in windows. Research how to implement this easily maybe we can use already made code online instead of making it fully from scratch.

**SOLUTION IMPLEMENTED:**
- ✅ Added "Task Manager" option to taskbar right-click context menu
- ✅ Added Ctrl+Alt+Delete keyboard shortcut (Windows-style)
- ✅ Added shortcut to Help app documentation
- ✅ Existing Ctrl+Shift+Esc shortcut already works

**Task Manager Features (Already Fully Working):**
- CPU usage with real-time graph
- RAM/Memory usage with progress bar
- Disk space usage with progress bar
- Network activity (download/upload speeds)
- GPU monitoring (NVIDIA/AMD)
- Full process list with PID, name, CPU%, Memory%, elapsed time
- Kill process button for each process
- Search/filter processes
- Sort by name/PID/CPU/Memory

### 2. ✅ FIXED - No Easy Way to Uninstall Apps
An easy way to uninstall apps you downloaded like in windows. Also they should not be able to uninstall the system apps we give them - please make sure they can't uninstall those accidentally through this new interface.

**SOLUTION IMPLEMENTED:**
- ✅ Added right-click context menu option "Uninstall" for user-installed apps in Start Menu and App Launcher
- ✅ Backend API implemented to safely delete .desktop files from user directories
- ✅ Safety checks prevent uninstalling system apps (only allows uninstalling from ~/. local/share/applications/)
- ✅ App list automatically refreshes after successful uninstallation
- ✅ Error handling and user notifications for uninstall operations

### 3. ✅ FIXED - Cannot Move Desktop Icons
You cannot move desktop icons in the desktop around. How to implement that?

**SOLUTION IMPLEMENTED:**
- ✅ Changed default state of `desktopAutoArrange` from `true` to `false`
- ✅ Desktop icons can now be freely dragged and repositioned with the mouse
- ✅ Drag & drop event handlers already implemented - just needed to disable auto-arrange by default
- ✅ Icon positions are saved to localStorage for persistence across sessions
- ✅ Users can still enable auto-arrange via desktop right-click context menu if desired
- ✅ Smooth drag animation with visual feedback (opacity, scale, shadow)

### 4. Time Display Seconds Flickering
Fix when clicking on time it keeps hiding the seconds for a second then goes back showing the seconds.

### 5. Desktop Right-Click Options Not Working
Fix all options when right clicking in the desktop they are not working for example big icons small icons etc sort by options don't do anything.

### 6. Context Menu Not Closing After Action
When clicking options with right click context menu like for example settings or open terminal it should close the context menu cause it's blocking ur view with the new window that opened.

### 7. Lock Screen Issues
- When u are in lockscreen the restart and shutdown buttons go off below the screen on the pin tab.
- When you launch ur computer it skips the password or pin even though we have a password enabled it skips through the lockscreen - that should not be happening.

### 8. Taskbar "Enable Transparency" Button Not Working
The "Enable Transparency" button in the taskbar right-click context menu doesn't work.

### 9. Taskbar "Auto-Hide" Toggle Not Working  
The "Disable Auto-Hide" / "Enable Auto-Hide" button in the taskbar right-click context menu doesn't work.

### 10. Desktop Icons Overlap When Taskbar Moved to Top
When you move the taskbar to the top, the desktop icons don't get pushed down and they overlap with the taskbar.
