// TEST SCRIPT - Window Grouping Demo
// Run this in browser console when TempleOS is loaded to test window grouping

// Step 1: Open two windows first (e.g., Terminal and Notes)

// Step 2: Group them with Ctrl+Shift+G keyboard shortcut

// Step 3: You can test the proximity detection manually:
// const win1 = templeOS.windows[0];
// const nearby = templeOS.check WindowGrouping(win1.id, 'right');
// console.log('Nearby window:', nearby);

// Step 4: You can test proportional resize:
// const groupId = templeOS.getWindowGroup(win1.id);
// if (groupId) {
//   templeOS.resizeWindowGroup(groupId, win1.id, 50, 30, 'right');
// }

// Keyboard Shortcuts Added:
// - Ctrl+Shift+G: Group two most recent windows
// - Ctrl+Shift+U: Ungroup active window

// Note: Full window resizing with auto-sync would require integration into
// the window resize handlers, which may need to be implemented first if not present.
