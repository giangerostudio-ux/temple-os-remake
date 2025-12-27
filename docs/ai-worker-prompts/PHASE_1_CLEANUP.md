# Phase 1: Cleanup - Dead Code & Obvious Bugs

**Worker Assignment:** Any AI  
**Estimated Time:** 30 minutes  
**Dependencies:** None  
**Risk Level:** LOW (safe changes)

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify files specified in YOUR phase**
> - **Ignore TypeScript/build errors unrelated to your task** - another worker may have introduced temporary issues
> - If you encounter merge conflicts, **your phase's changes take priority** for the files you're modifying
> - When done, commit your changes to a branch named `phase-1-cleanup`

---

## Context

You are helping refactor a TempleOS-themed desktop environment built with Electron + TypeScript. This phase focuses on quick, safe cleanup tasks that don't affect architecture.

## Project Structure Overview

```
temple os recreation/
├── electron/
│   ├── main.cjs        (7,173 lines - main process)
│   ├── preload.cjs     (302 lines - context bridge)
│   └── ...
├── src/
│   ├── main.ts         (19,027 lines - renderer)
│   ├── main_old.ts     (18,668 lines - DEAD CODE)
│   └── ...
```

---

## Tasks

### Task 1.1: Delete Dead Code File

**File:** `src/main_old.ts`  
**Action:** DELETE this entire file  
**Reason:** 18,668 lines / 1.6MB of dead backup code

```bash
# Just delete this file
rm src/main_old.ts
```

Or if using git:
```bash
git rm src/main_old.ts
```

---

### Task 1.2: Fix Duplicate Function in Preload

**File:** `electron/preload.cjs`  
**Lines:** 9-10

**Current (BUG):**
```javascript
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),  // DUPLICATE - DELETE THIS LINE
```

**Fixed:**
```javascript
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
```

---

### Task 1.3: Remove Excessive Console Logs (Optional)

**File:** `src/main.ts`  
**Action:** Search for and comment out non-essential `console.log` statements

Focus on removing:
- Debug logs like `console.log('[X11 Workspace] ...')`
- Boot logs like `console.log('[BOOT] ...')`
- Keep error logs (`console.error`, `console.warn`)

**Pattern to search for:**
```typescript
console.log('[X11
console.log('[BOOT]
console.log('[Snap]
console.log('[Tiling]
console.log('[Divine]
```

Either:
1. Comment them out
2. Or replace with a proper logger call (if logging system exists)

---

## Verification

After completing tasks:

1. Run `npm run build` to ensure no compilation errors
2. Run `npm run electron:dev` to verify the app still works
3. Check that the file size decreased significantly

---

## Success Criteria

- [ ] `main_old.ts` is deleted
- [ ] No duplicate `maximizeWindow` in preload.cjs
- [ ] Project still builds without errors
- [ ] App still launches correctly

---

## Notes for AI

- This is a LOW RISK phase - you're only deleting dead code
- Don't touch any other files besides the ones mentioned
- If unsure about a console.log, leave it
