
/**
 * Handles visual effects like Jelly Mode (Wobbly Windows), 
 * Divine Glow, and Particle Animations.
 */
export class EffectsManager {
    private jellyModeEnabled = false;
    private activeWindows: Map<string, {
        element: HTMLElement,
        lastX: number,
        lastY: number,
        velX: number,
        velY: number,
        skewX: number,
        skewY: number,
        spring: number,
        friction: number
    }> = new Map();

    private rafId: number | null = null;

    constructor() {
        // Load initial state if needed, though usually set by main.ts loading config
    }

    public setJellyMode(enabled: boolean) {
        this.jellyModeEnabled = enabled;
        if (enabled) {
            this.startLoop();
        } else {
            this.stopLoop();
            this.resetAllTransforms();
        }
    }

    public trackWindow(id: string, element: HTMLElement, x: number, y: number) {
        if (!this.jellyModeEnabled) return;

        // Reset transform to avoid accumulation issues when re-grabbing
        element.style.transform = 'none';

        this.activeWindows.set(id, {
            element,
            lastX: x,
            lastY: y,
            velX: 0,
            velY: 0,
            skewX: 0,
            skewY: 0,
            spring: 0.2,   // Stiffness
            friction: 0.85 // Damping
        });

        if (!this.rafId) this.startLoop();
    }

    public updateWindowPos(id: string, x: number, y: number) {
        const win = this.activeWindows.get(id);
        if (!win) return;

        // Calculate generic velocity
        const dx = x - win.lastX;
        const dy = y - win.lastY;

        win.velX += dx;
        win.velY += dy;

        win.lastX = x;
        win.lastY = y;
    }

    public releaseWindow(id: string) {
        // We keep tracking until it settles, but for now we might just want to let it spring back
        // In a full physics engine we'd keep it in the loop. 
        // For simplicity, we'll keep it in activeWindows until velocity is negligible.
        if (id) { /* keep ts happy */ }
    }

    private startLoop() {
        if (this.rafId) return;
        this.loop();
    }

    private stopLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private loop = () => {
        if (!this.jellyModeEnabled && this.activeWindows.size === 0) {
            this.stopLoop();
            return;
        }

        let hasActive = false;

        for (const [id, win] of this.activeWindows) {
            // Spring physics for skew
            // Target skew is 0. Velocity pushes skew away from 0.

            // Apply spring force towards 0
            const targetSkewX = -win.velX * 0.5; // Velocity induces skew
            const targetSkewY = -win.velY * 0.5;

            // Simple springing: accelerate towards target, dampen velocity
            // Actually, we want the window to skew based on velocity immediately, 
            // then spring back to 0 when velocity stops.

            // Let's model skew as a value that tracks velocity but has inertia
            win.skewX += (targetSkewX - win.skewX) * win.spring;
            win.skewY += (targetSkewY - win.skewY) * win.spring;

            // Dampen velocity (simulating friction of the movement itself)
            win.velX *= win.friction;
            win.velY *= win.friction;

            // Apply transform
            // We only apply skew. Position is handled by the drag handler in main.ts setting top/left
            if (Math.abs(win.skewX) > 0.01 || Math.abs(win.skewY) > 0.01 || Math.abs(win.velX) > 0.1 || Math.abs(win.velY) > 0.1) {
                win.element.style.transform = `skew(${win.skewX}deg, ${win.skewY}deg) scale(1.02)`;
                win.element.style.filter = `blur(${Math.abs(win.skewX + win.skewY) / 10}px)`; // Motion blur!
                hasActive = true;
            } else {
                win.element.style.transform = 'none';
                win.element.style.filter = 'none';
                // If completely stopped and not being dragged (need a flag?), remove?
                // For now, clean up if very low energy
                if (Math.abs(win.velX) < 0.1 && Math.abs(win.velY) < 0.1) {
                    win.element.style.transform = 'none';
                    this.activeWindows.delete(id);
                }
            }
        }

        if (hasActive || this.activeWindows.size > 0) {
            this.rafId = requestAnimationFrame(this.loop);
        } else {
            this.rafId = null;
        }
    }

    private resetAllTransforms() {
        for (const [id, win] of this.activeWindows) {
            win.element.style.transform = 'none';
            win.element.style.filter = 'none';
            if (id) { }
        }
        this.activeWindows.clear();
    }
}
