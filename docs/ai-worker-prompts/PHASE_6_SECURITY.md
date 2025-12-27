# Phase 6: Security Hardening

**Worker Assignment:** Security-aware AI  
**Estimated Time:** 1-2 hours  
**Dependencies:** None  
**Risk Level:** MEDIUM (security-critical)

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify security-related code** (path validation, command sanitization)
> - **Ignore TypeScript/build errors unrelated to security** - another worker may have introduced temporary issues
> - Focus on `electron/main.cjs` and `electron/command-executor.cjs`
> - When done, commit your changes to a branch named `phase-6-security`

---

## Context

Security issues found in the codebase:
1. **Path traversal** - No validation on file paths
2. **Shell injection risk** - User input in shell commands
3. **Hardcoded secrets** - Default passwords in code
4. **Missing CSP** - No Content Security Policy

---

## Task 6.1: Add Path Sanitization to fs:* Handlers

### Location: `electron/main.cjs` lines 3307-3631

### Problem

```javascript
// Current - NO VALIDATION
ipcMain.handle('fs:readFile', async (event, filePath) => {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    // Could read /etc/shadow, /etc/passwd, ~/.ssh/id_rsa
});
```

### Solution

Add path validation helper:

```javascript
// Add near top of main.cjs
const SAFE_BASE_PATHS = [
    os.homedir(),
    '/tmp',
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), '.config/templeos'),
];

function isPathSafe(targetPath) {
    const resolved = path.resolve(targetPath);
    
    // Block obvious sensitive paths
    const blockedPaths = [
        '/etc/shadow',
        '/etc/passwd',
        '/etc/sudoers',
        path.join(os.homedir(), '.ssh'),
        path.join(os.homedir(), '.gnupg'),
    ];
    
    for (const blocked of blockedPaths) {
        if (resolved.startsWith(blocked)) {
            return { safe: false, reason: 'Access to sensitive path blocked' };
        }
    }
    
    // Require path to be under a safe base
    for (const base of SAFE_BASE_PATHS) {
        if (resolved.startsWith(base)) {
            return { safe: true };
        }
    }
    
    return { safe: false, reason: 'Path outside allowed directories' };
}
```

Then use it:

```javascript
ipcMain.handle('fs:readFile', async (event, filePath) => {
    const check = isPathSafe(filePath);
    if (!check.safe) {
        return { success: false, error: check.reason };
    }
    
    try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return { success: true, content };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
```

Apply to ALL fs:* handlers:
- `fs:readdir`
- `fs:readFile`
- `fs:writeFile`
- `fs:delete`
- `fs:trash`
- `fs:mkdir`
- `fs:rename`
- `fs:copy`

---

## Task 6.2: Improve Shell Command Safety

### Location: `electron/command-executor.cjs`

### Current (risky)

```javascript
const child = spawn('sh', ['-c', command], { shell: true });
```

### Add command allowlist for AI-executed commands

```javascript
const ALLOWED_AI_COMMANDS = [
    /^ls\s/,
    /^cat\s/,
    /^pwd$/,
    /^whoami$/,
    /^date$/,
    /^df\s/,
    /^free\s/,
    /^uname\s/,
    /^echo\s/,
    // Add more safe patterns
];

function isCommandAllowed(command) {
    const trimmed = command.trim();
    
    // Check against allowlist
    for (const pattern of ALLOWED_AI_COMMANDS) {
        if (pattern.test(trimmed)) {
            return true;
        }
    }
    
    return false;
}
```

### Enhance existing DANGEROUS_PATTERNS

```javascript
const DANGEROUS_PATTERNS = [
    /rm\s+-rf?\s+[\/~]/i,
    /mkfs/i,
    /dd\s+if=/i,
    />\s*\/dev\//i,
    /chmod\s+777/i,
    /curl.*\|\s*(ba)?sh/i,
    /wget.*\|\s*(ba)?sh/i,
    /:(){ :|:& };:/,  // Fork bomb
    /\bsudo\b/i,
    /\bsu\b/i,
    /\bpasswd\b/i,
    /\/etc\/shadow/i,
    /\/etc\/passwd/i,
    /\beval\b/i,
    /\bexec\b/i,
];
```

---

## Task 6.3: Remove Hardcoded Default Passwords

### Location: `src/main.ts`

Search for:
```
lockPassword
lockPin
duressPassword
```

### Current (insecure)

```typescript
private lockPassword = 'temple';
private lockPin = '7777';
```

### Solution

Force user to set password on first run:

```typescript
private lockPassword: string | null = null;  // No default!
private lockPin: string | null = null;       // No default!

// In lock screen render, if no password set:
if (!this.lockPassword && !this.lockPin) {
    // Show "Set Password" form instead of login
    this.renderPasswordSetup();
}
```

Or at minimum, generate random defaults:

```typescript
private lockPassword = crypto.randomBytes(8).toString('hex');
private lockPin = String(Math.floor(1000 + Math.random() * 9000));
```

---

## Task 6.4: Add Content Security Policy (Optional)

### Location: `electron/main.cjs` in `createWindow()`

```javascript
mainWindow = new BrowserWindow({
    // ... existing options
    webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        // Add CSP
        additionalArguments: ['--enable-features=IsolateOrigins,site-per-process']
    }
});

// Add CSP header
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
        responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",  // Needed for inline handlers
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: file:",
                "font-src 'self' data:"
            ].join('; ')
        }
    });
});
```

---

## Verification

1. Try to read `/etc/passwd` via file browser - should be blocked
2. Try dangerous commands in Divine AI - should be blocked
3. Check that normal operations still work

---

## Success Criteria

- [ ] Path validation added to all fs:* handlers
- [ ] Shell command allowlist/blocklist enhanced
- [ ] No hardcoded default passwords
- [ ] Optional: CSP implemented
