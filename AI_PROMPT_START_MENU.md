# AI Prompt for Fixing Start Menu Issues

Copy and paste this to your AI:

---

I have 2 critical bugs in the Start Menu that need to be fixed. I've documented them in START_MENU_BUGS.md - please read that file carefully.

## Issues Summary:

1. **Start Menu search does NOT find built-in apps** - When I search for "media" it says "No apps found" even though "Media Player" exists as a built-in app. Only installed apps (.desktop files) are being searched.

2. **Typing in Start Menu causes full UI re-render** - Every keystroke triggers a complete re-render of the entire application, causing annoying flickering and poor UX.

## What I Need:

Follow the implementation details in START_MENU_BUGS.md to:

1. **Fix the search to include built-in apps:**
   - Create a searchable list of all built-in apps (Terminal, Files, Media Player, Calculator, etc.)
   - Modify the search logic in `renderStartMenu()` to search BOTH built-in and installed apps
   - Show built-in apps first in search results, then installed apps

2. **Fix the re-render issue:**
   - Add a specific input event handler for `.start-search-input` in `setupEventListeners()`
   - Create a new `updateStartMenuDom()` method that updates only the Start Menu without calling `this.render()`
   - Pattern after the App Launcher implementation which already does this correctly

## Files to Modify:
- `src/main.ts`

## Key Requirements:
- Built-in apps list should match the apps in `openApp()` switch statement
- The `updateStartMenuDom()` should work like `updateAppLauncherDom()` does
- Input handler must prevent the event from triggering a full render
- Search should be case-insensitive and match on app name
- Test that searching for "media", "terminal", "calc" all work correctly

Please implement these fixes following the detailed instructions in START_MENU_BUGS.md.
