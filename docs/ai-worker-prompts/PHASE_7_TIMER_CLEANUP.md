# Phase 7: Timer & Memory Leak Fixes

**Worker Assignment:** Any AI  
**Estimated Time:** 1-2 hours  
**Dependencies:** None  
**Risk Level:** LOW

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify timer-related code** (setTimeout, setInterval, cleanup methods)
> - **Ignore TypeScript/build errors unrelated to timers** - another worker may have introduced temporary issues
> - Focus on `src/main.ts` timer patterns
> - When done, commit your changes to a branch named `phase-7-timer-cleanup`

---

## Context

Memory leak risk identified:
- **82 setTimeout/setInterval calls**
- **Only 18 clearTimeout/clearInterval calls**
- **64+ potential uncleaned timers**

---

## The Problem

```typescript
// BAD - Timer never cleaned up
setTimeout(() => {
    this.doSomething();
}, 5000);

// When window closes or component unmounts, timer still runs!
```

---

## Task 7.1: Create Timer Registry

Add to `src/main.ts` (in TempleOS class):

```typescript
class TempleOS {
    // Add timer registry
    private timers: Set<number> = new Set();
    private intervals: Set<number> = new Set();
    
    // Safe setTimeout wrapper
    private safeTimeout(callback: () => void, ms: number): number {
        const id = window.setTimeout(() => {
            this.timers.delete(id);
            callback();
        }, ms);
        this.timers.add(id);
        return id;
    }
    
    // Safe setInterval wrapper
    private safeInterval(callback: () => void, ms: number): number {
        const id = window.setInterval(callback, ms);
        this.intervals.add(id);
        return id;
    }
    
    // Clear specific timer
    private clearSafeTimeout(id: number): void {
        window.clearTimeout(id);
        this.timers.delete(id);
    }
    
    // Clear specific interval  
    private clearSafeInterval(id: number): void {
        window.clearInterval(id);
        this.intervals.delete(id);
    }
    
    // Cleanup all timers (call on destroy)
    private cleanupAllTimers(): void {
        for (const id of this.timers) {
            window.clearTimeout(id);
        }
        this.timers.clear();
        
        for (const id of this.intervals) {
            window.clearInterval(id);
        }
        this.intervals.clear();
    }
}
```

---

## Task 7.2: Replace All setTimeout/setInterval Calls

### Search Pattern

In `src/main.ts`, search for:
```
setTimeout(
setInterval(
```

### Replace Pattern

**Before:**
```typescript
setTimeout(() => {
    this.render();
}, 500);
```

**After:**
```typescript
this.safeTimeout(() => {
    this.render();
}, 500);
```

**Before:**
```typescript
setInterval(() => {
    this.refreshStats();
}, 1000);
```

**After:**
```typescript
this.safeInterval(() => {
    this.refreshStats();
}, 1000);
```

---

## Task 7.3: Add Cleanup on Window Close

Find the window close handler and add cleanup:

```typescript
// In constructor or init
window.addEventListener('beforeunload', () => {
    this.cleanupAllTimers();
});

// Or if there's an existing cleanup method
private destroy(): void {
    this.cleanupAllTimers();
    // ... other cleanup
}
```

---

## Task 7.4: Per-Window Timer Cleanup

For timers specific to a window:

```typescript
interface WindowState {
    // ... existing properties
    timers?: Set<number>;
}

private closeWindow(id: string): void {
    const win = this.getWindowById(id);
    if (win) {
        // Clean up window-specific timers
        if (win.timers) {
            for (const timerId of win.timers) {
                window.clearTimeout(timerId);
                window.clearInterval(timerId);
            }
            win.timers.clear();
        }
    }
    // ... rest of close logic
}
```

---

## Task 7.5: Fix Specific Problem Areas

### X11 Workspace Visibility (lines ~869-915)

```typescript
// Current (problematic)
setTimeout(() => {
    window.electronAPI.unminimizeX11Window(xid);
}, 50);

// Fixed
this.safeTimeout(() => {
    window.electronAPI.unminimizeX11Window(xid);
}, 50);
```

### Focus Capture Timers

```typescript
// These focus timers in main.cjs are fine (one-shot, early in lifecycle)
// But should still be tracked for completeness
```

### Polling Intervals

```typescript
// System stats polling - make sure it's tracked
this.statsIntervalId = this.safeInterval(() => {
    this.refreshSystemStats();
}, 2000);
```

---

## Verification

1. Open and close many windows
2. Watch memory usage in Task Manager/htop
3. Memory should stay stable, not grow unbounded
4. App should still be responsive

---

## Success Criteria

- [ ] Timer registry implemented
- [ ] All setTimeout replaced with safeTimeout
- [ ] All setInterval replaced with safeInterval
- [ ] Cleanup called on window/app close
- [ ] Memory usage stable over time
