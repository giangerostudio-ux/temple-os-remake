// ============================================
// IMAGE VIEWER ENHANCEMENT MODULE
// ============================================

import type { ImageViewerState } from '../utils/types';
import { SLIDESHOW_INTERVAL } from '../utils/constants';
import { isImageFile } from '../utils/helpers';

/**
 * Image Viewer Enhancement Class
 * Handles advanced image viewer features: pan, zoom, slideshow, wallpaper, crop
 */
export class ImageViewerEnhancer {
    private states = new Map<string, ImageViewerState>();
    private slideshowTimers = new Map<string, number>();

    /**
     * Initialize image viewer state for a window
     */
    initState(windowId: string, imageSrc: string): ImageViewerState {
        const state: ImageViewerState = {
            src: imageSrc,
            zoom: 1,
            rotate: 0,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
        };
        this.states.set(windowId, state);
        return state;
    }

    /**
     * Get state for window
     */
    getState(windowId: string): ImageViewerState | undefined {
        return this.states.get(windowId);
    }

    /**
     * Handle zoom in
     */
    zoomIn(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.zoom *= 1.2;
            state.zoom = Math.min(state.zoom, 10); // Max 10x zoom
        }
    }

    /**
     * Handle zoom out
     */
    zoomOut(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.zoom /= 1.2;
            state.zoom = Math.max(state.zoom, 0.1); // Min 0.1x zoom
        }
    }

    /**
     * Handle rotate left (counter-clockwise)
     */
    rotateLeft(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.rotate -= 90;
        }
    }

    /**
     * Handle rotate right (clockwise)
     */
    rotateRight(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.rotate += 90;
        }
    }

    /**
     * Reset view to defaults
     */
    reset(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.zoom = 1;
            state.rotate = 0;
            state.offsetX = 0;
            state.offsetY = 0;
        }
    }

    /**
     * Start panning (mousedown on image)
     */
    startPan(windowId: string, clientX: number, clientY: number): void {
        const state = this.states.get(windowId);
        if (state && state.zoom > 1) {
            state.isDragging = true;
            state.dragStartX = clientX - state.offsetX;
            state.dragStartY = clientY - state.offsetY;
        }
    }

    /**
     * Update pan position (mousemove)
     */
    updatePan(windowId: string, clientX: number, clientY: number): void {
        const state = this.states.get(windowId);
        if (state && state.isDragging && state.dragStartX !== undefined && state.dragStartY !== undefined) {
            state.offsetX = clientX - state.dragStartX;
            state.offsetY = clientY - state.dragStartY;
        }
    }

    /**
     * End panning (mouseup)
     */
    endPan(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.isDragging = false;
            state.dragStartX = undefined;
            state.dragStartY = undefined;
        }
    }

    /**
     * Start slideshow
     */
    startSlideshow(windowId: string, imageFiles: string[], currentIndex: number, onAdvance: (newSrc: string, index: number) => void): void {
        const state = this.states.get(windowId);
        if (!state) return;

        // Stop existing slideshow if any
        this.stopSlideshow(windowId);

        state.slideshow = {
            active: true,
            interval: SLIDESHOW_INTERVAL,
            currentIndex,
            files: imageFiles,
        };

        const timer = window.setInterval(() => {
            const slideshow = state.slideshow;
            if (!slideshow) {
                this.stopSlideshow(windowId);
                return;
            }

            slideshow.currentIndex = (slideshow.currentIndex + 1) % slideshow.files.length;
            const newSrc = slideshow.files[slideshow.currentIndex];
            state.src = newSrc;

            // Reset view for new image
            state.zoom = 1;
            state.rotate = 0;
            state.offsetX = 0;
            state.offsetY = 0;

            onAdvance(newSrc, slideshow.currentIndex);
        }, SLIDESHOW_INTERVAL);

        this.slideshowTimers.set(windowId, timer);
    }

    /**
     * Stop slideshow
     */
    stopSlideshow(windowId: string): void {
        const timer = this.slideshowTimers.get(windowId);
        if (timer) {
            clearInterval(timer);
            this.slideshowTimers.delete(windowId);
        }

        const state = this.states.get(windowId);
        if (state && state.slideshow) {
            state.slideshow.active = false;
        }
    }

    /**
     * Toggle slideshow
     */
    toggleSlideshow(windowId: string, imageFiles: string[], currentIndex: number, onAdvance: (newSrc: string, index: number) => void): boolean {
        const state = this.states.get(windowId);
        if (!state) return false;

        if (state.slideshow?.active) {
            this.stopSlideshow(windowId);
            return false;
        } else {
            this.startSlideshow(windowId, imageFiles, currentIndex, onAdvance);
            return true;
        }
    }

    /**
     * Enable crop mode
     */
    enableCropMode(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.cropMode = true;
            state.cropRect = {
                x: 0,
                y: 0,
                width: 200,
                height: 200,
            };
        }
    }

    /**
     * Disable crop mode
     */
    disableCropMode(windowId: string): void {
        const state = this.states.get(windowId);
        if (state) {
            state.cropMode = false;
            state.cropRect = undefined;
        }
    }

    /**
     * Update crop rectangle
     */
    updateCropRect(windowId: string, x: number, y: number, width: number, height: number): void {
        const state = this.states.get(windowId);
        if (state && state.cropMode) {
            state.cropRect = { x, y, width, height };
        }
    }

    /**
     * Get transform CSS for image
     */
    getTransformCSS(windowId: string): string {
        const state = this.states.get(windowId);
        if (!state) return '';

        return `scale(${state.zoom}) rotate(${state.rotate}deg) translate(${state.offsetX}px, ${state.offsetY}px)`;
    }

    /**
     * Get cursor style based on state
     */
    getCursorStyle(windowId: string): string {
        const state = this.states.get(windowId);
        if (!state) return 'default';

        if (state.isDragging) return 'grabbing';
        if (state.zoom > 1) return 'grab';
        if (state.cropMode) return 'crosshair';
        return 'default';
    }

    /**
     * Render enhanced image viewer controls
     */
    renderControls(windowId: string): string {
        const state = this.states.get(windowId);
        if (!state) return '';

        const zoomPercent = Math.round(state.zoom * 100);
        const isSlideshowActive = state.slideshow?.active || false;
        const slideshowText = isSlideshowActive ? '⏸ Pause' : '▶ Slideshow';

        return `
      <div class="iv-toolbar" style="display: flex; gap: 8px; padding: 8px; background: rgba(0,0,0,0.7); border-bottom: 1px solid rgba(0,255,65,0.3);">
        <button class="iv-btn" data-action="zoom-in" data-window="${windowId}" title="Zoom In">🔍+</button>
        <button class="iv-btn" data-action="zoom-out" data-window="${windowId}" title="Zoom Out">🔍-</button>
        <button class="iv-btn" data-action="rotate-left" data-window="${windowId}" title="Rotate Left">↶</button>
        <button class="iv-btn" data-action="rotate-right" data-window="${windowId}" title="Rotate Right">↷</button>
        <button class="iv-btn" data-action="reset" data-window="${windowId}" title="Reset View">🔄</button>
        <button class="iv-btn" data-action="slideshow" data-window="${windowId}" title="Toggle Slideshow">${slideshowText}</button>
        <button class="iv-btn" data-action="wallpaper" data-window="${windowId}" title="Set as Wallpaper">🖼️ Wallpaper</button>
        <button class="iv-btn" data-action="crop" data-window="${windowId}" title="Crop Image">✂️ Crop</button>
        <span style="margin-left: auto; padding: 4px 8px; color: #00ff41; font-size: 12px;">${zoomPercent}%</span>
        ${state.slideshow?.active ? `<span style="padding: 4px 8px; color: #00ff41; font-size: 12px;">${(state.slideshow.currentIndex + 1)}/${state.slideshow.files.length}</span>` : ''}
      </div>
    `;
    }

    /**
     * Render image canvas with pan support
     */
    renderCanvas(windowId: string, imageSrc: string): string {
        const state = this.states.get(windowId);
        if (!state) return '';

        const transform = this.getTransformCSS(windowId);
        const cursor = this.getCursorStyle(windowId);

        let cropOverlay = '';
        if (state.cropMode && state.cropRect) {
            const { x, y, width, height } = state.cropRect;
            cropOverlay = `
        <div class="crop-overlay" style="
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${width}px;
          height: ${height}px;
          border: 2px dashed #00ff41;
          background: rgba(0,255,65,0.1);
          cursor: move;
        "></div>
      `;
        }

        return `
      <div class="image-canvas" 
           data-window="${windowId}"
           style="
             flex: 1;
             overflow: hidden;
             display: flex;
             align-items: center;
             justify-content: center;
             background: #000;
             position: relative;
             cursor: ${cursor};
           ">
        <img src="${imageSrc}" 
             data-iv-image="${windowId}"
             style="
               max-width: 100%;
               max-height: 100%;
               transform: ${transform};
               transition: transform 0.1s ease-out;
               user-select: none;
             "
             draggable="false">
        ${cropOverlay}
      </div>
    `;
    }

    /**
     * Cleanup state when window closes
     */
    cleanup(windowId: string): void {
        this.stopSlideshow(windowId);
        this.states.delete(windowId);
    }

    /**
     * Get all image files from a directory (helper for slideshow)
     */
    static getImageFilesFromDirectory(files: Array<{ name: string; path: string; isDirectory: boolean }>): Array<{ name: string; path: string }> {
        return files
            .filter(f => !f.isDirectory && isImageFile(f.name))
            .map(f => ({ name: f.name, path: f.path }));
    }
}
