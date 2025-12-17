# Implementation Session 1: Image Viewer Enhancements

## Completed Features (Already in codebase)
✅ Zoom in/out (lines 2808-2809)
✅ Rotate left/right (lines 2810-2811)  
✅ Reset view (line 2812)

## To Implement

### 1. Pan/Drag for Zoomed Images
**Location**: Add to image viewer event handlers
**Implementation**:
- Add mousedown/mousemove/mouseup listeners to image canvas
- Track drag state (isDragging, startX, startY)
- Update offsetX and offsetY in state during drag
- Apply translate transform

### 2. Slideshow Mode
**Location**: Add new button and timer logic
**Implementation**:
- Add "Slideshow" button to toolbar
- Track current directory and file list  
- Set up interval timer to advance to next image
- Add pause/resume capability
- Show current index (e.g., "3/10")

### 3. Set as Wallpaper
**Location**: Add button to image viewer toolbar  
**Implementation**:
- Add "Set as Wallpaper" button
- Call existing wallpaper setter method
- Show confirmation notification

### 4. Basic Crop Tool
**Location**: Add crop mode to image viewer
**Implementation**:
- Add "Crop" button
- Enable crop mode with draggable resize handles
- Show crop preview overlay
- Save cropped image

## Next: TASK.md Updates
After implementation, update TASK.md:
- [x] 4.4 Image Viewer - Pan/drag
- [x] 4.4 Image Viewer - Slideshow
- [x] 4.4 Image Viewer - Set as wallpaper
- [x] 4.4 Image Viewer - Basic editing (crop)
