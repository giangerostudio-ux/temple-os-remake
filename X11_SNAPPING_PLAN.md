# X11 Window Snapping & Tiling Implementation

## Overview
The goal is to implement intelligent window tiling and snapping for X11 applications within the TempleOS recreation, similar to modern desktop environments (e.g., Zorin OS, Windows).

## Requirements

### 1. Auto-Snapping on Launch
- **Initial State**: When a new X11 application (e.g., Firefox) is opened, it should default to a "Maximized" snapped state.
- **Intelligent Tiling**:
    - **Scenario A (1 App)**: App A launches -> Maximized.
    - **Scenario B (2 Apps)**: App A is snapped Right -> App B launches -> App B snaps Left (automatically creating a split screen).
    - **Scenario C (3+ Apps)**: If apps are already split (Left/Right), launching a third app should trigger a "4 tab setup" (likely Quadrant/2x2 tiling).

### 2. Snap-to-Corner/Edge Dragging
- Current behavior: X11 apps do not snap when dragged.
- Desired behavior:
    - Dragging an X11 window to a screen edge or corner should trigger a visual indicator (preview) and snap the window upon release.
    - Matches implementation of internal "System Apps" (Settings, etc.).

### 3. Context Menu Integration (Visual Reference)
- The user provided an image showing a context menu (Right-click on tab?) with options:
    - Pin (Always on Top)
    - Snap Left
    - Snap Right
    - Snap Top
    - Snap Bottom
    - Maximize
    - Center
    - Minimize
    - Close Window

### 4. Visual Tiling Interface (Visual Reference)
- The user provided an image of a tiling popup/OSD (Heads Up Display) showing layout options (Grid, Columns, etc.). This might be a future target or part of the "snap to corner" visualization.

## Technical Questions to Answer
1. How are internal app windows snapped currently? (Share logic?)
2. How does `electron` / `main.cjs` currently handle X11 window geometries?
3. Can we detect the state of other windows (are they snapped?) to decide the new window's position?
4. How to intercept drag events for X11 windows (often handled by the X server directly unless we wrap them or poll/hook)?

## Plan
1. Core Logic: specific `WindowTilingManager` or similar.
2. Hook into `launchX11App` or window creation events.
3. Implement "Snap State" tracking for windows.
