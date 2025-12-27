# Phase 5: Error Handling & Logging

**Worker Assignment:** Any AI  
**Estimated Time:** 1-2 hours  
**Dependencies:** None  
**Risk Level:** LOW

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify `.catch()` handlers and add logging** - don't refactor logic
> - **Ignore TypeScript/build errors unrelated to your task** - another worker may have introduced temporary issues
> - Focus only on `electron/main.cjs` for error handling fixes
> - When done, commit your changes to a branch named `phase-5-error-handling`

---

## Context

The codebase has:
- **28 silent error catches** (`.catch(() => {})`) that hide problems
- **183+ console.log statements** that should use proper logging
- No consistent error handling pattern

---

## Task 5.1: Fix Silent Error Catches

### Location: `electron/main.cjs`

Search for: `.catch(() => {})`

**Bad (current):**
```javascript
void wmctrlSetState(xid, 'add', 'below,skip_taskbar,skip_pager').catch(() => { });
```

**Good (fix to):**
```javascript
void wmctrlSetState(xid, 'add', 'below,skip_taskbar,skip_pager').catch((e) => {
  console.warn('[X11] wmctrlSetState failed:', e.message);
});
```

### Full list to fix (main.cjs):

```
Line 750: .catch(() => { })
Line 802: .catch(() => { });
Line 874: .catch(() => { });
Line 875: .catch(() => { });
Line 880: .catch(() => { });
Line 883: .catch(() => { });
Line 899: .catch(() => { });
Line 946: .catch(() => { });
Line 992: .catch(() => { });
Line 1109: .catch(() => { });
Line 1127: .catch(() => { });
... (continue searching)
```

### Pattern for fixes:

Based on context, add meaningful log messages:

```javascript
// For X11 operations
.catch((e) => console.warn('[X11]', methodName, 'failed:', e.message));

// For file operations
.catch((e) => console.warn('[FS]', operation, 'failed:', e.message));

// For network operations  
.catch((e) => console.warn('[Network]', operation, 'failed:', e.message));
```

---

## Task 5.2: Create Logging Utility (Optional)

Create `electron/logger.cjs`:

```javascript
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLevel = LOG_LEVELS.INFO;

const logger = {
  setLevel(level) {
    currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
  },
  
  debug(tag, ...args) {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG][${tag}]`, ...args);
    }
  },
  
  info(tag, ...args) {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(`[INFO][${tag}]`, ...args);
    }
  },
  
  warn(tag, ...args) {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(`[WARN][${tag}]`, ...args);
    }
  },
  
  error(tag, ...args) {
    console.error(`[ERROR][${tag}]`, ...args);
  }
};

module.exports = { logger, LOG_LEVELS };
```

Then use it in main.cjs:

```javascript
const { logger } = require('./logger.cjs');

// Instead of: console.log('[X11] Main Window XID:', xid);
logger.info('X11', 'Main Window XID:', xid);

// Instead of: console.warn('[X11] Failed:', e.message);
logger.warn('X11', 'Failed:', e.message);
```

---

## Task 5.3: Standardize IPC Error Responses

All IPC handlers should return consistent error format:

**Current (inconsistent):**
```javascript
// Some return this
return { success: false, error: 'message' };

// Some return this
return { error: true, message: 'something' };

// Some throw
throw new Error('something');

// Some just return undefined on error
return undefined;
```

**Standard format:**
```javascript
// Success
return { success: true, data: result };

// Error
return { success: false, error: 'Human-readable error message' };
```

### Create helper function in main.cjs:

```javascript
// Add near the top of main.cjs
function ipcSuccess(data) {
  return { success: true, ...data };
}

function ipcError(message) {
  return { success: false, error: message };
}

// Usage:
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return ipcSuccess({ content });
  } catch (e) {
    return ipcError(`Failed to read file: ${e.message}`);
  }
});
```

---

## Verification

1. `npm run build` - no errors
2. Run the app and check console output is cleaner
3. Trigger some errors (e.g., disconnect WiFi, invalid paths)
4. Verify errors are logged, not swallowed

---

## Success Criteria

- [ ] No more `.catch(() => {})` - all have logging
- [ ] Optional: Logger utility created
- [ ] IPC error format consistent
- [ ] App still works, but logs are more useful
