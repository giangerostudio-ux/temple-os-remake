# Phase 4: TypeScript Type Safety

**Worker Assignment:** Any AI with TypeScript knowledge  
**Estimated Time:** 2-3 hours  
**Dependencies:** None  
**Risk Level:** LOW (adding types doesn't change runtime)

---

> ⚠️ **PARALLEL WORK NOTICE**
> 
> Another AI worker may be working on a different phase at the same time.
> - **Only modify type annotations** - don't refactor logic or move code
> - **Ignore TypeScript/build errors unrelated to `any` types** - another worker may have introduced temporary issues
> - If a function signature was changed by another worker, add types to the NEW signature
> - When done, commit your changes to a branch named `phase-4-type-safety`

---

## Context

The codebase has **214 occurrences** of `any` type usage, defeating TypeScript's benefits. This phase replaces them with proper types.

---

## Files to Fix (Priority Order)

| File | `any` Count | Priority |
|------|-------------|----------|
| `src/main.ts` | 97 | HIGH |
| `src/system/NetworkManager.ts` | 10 | MEDIUM |
| `src/system/SettingsManager.ts` | 8 | MEDIUM |
| `src/panel.ts` | 3 | LOW |
| `src/utils/helpers.ts` | 2 | LOW |
| Other files | ~15 | LOW |

---

## Common Patterns to Fix

### Pattern 1: Event Handlers

**Before:**
```typescript
.addEventListener('click', (e: any) => {
```

**After:**
```typescript
.addEventListener('click', (e: MouseEvent) => {
```

### Pattern 2: IPC Response Types

**Before:**
```typescript
const res = await window.electronAPI.getNetworkStatus();
const status = (res as any).status;
```

**After:**
```typescript
interface NetworkStatusResponse {
  success: boolean;
  status?: NetworkStatus;
  error?: string;
}
const res: NetworkStatusResponse = await window.electronAPI.getNetworkStatus();
const status = res.status;
```

### Pattern 3: Array Map/Filter

**Before:**
```typescript
devices.filter((d: any) => d.connected)
```

**After:**
```typescript
interface BluetoothDevice {
  mac: string;
  name: string;
  connected: boolean;
}
devices.filter((d: BluetoothDevice) => d.connected)
```

### Pattern 4: localStorage

**Before:**
```typescript
private themeColor = (localStorage.getItem('temple_theme_color') as any) || 'green';
```

**After:**
```typescript
type ThemeColor = 'green' | 'amber' | 'cyan' | 'white';
private themeColor: ThemeColor = (localStorage.getItem('temple_theme_color') as ThemeColor) || 'green';
```

### Pattern 5: Callback Types

**Before:**
```typescript
private onNotify: (title: string, msg: string, type: any, actions?: any[]) => void
```

**After:**
```typescript
type NotificationType = 'info' | 'warning' | 'error' | 'divine';
interface NotificationAction {
  label: string;
  action: () => void;
}
private onNotify: (title: string, msg: string, type: NotificationType, actions?: NotificationAction[]) => void
```

---

## Step-by-Step Instructions

### Step 1: Check existing types

First, look at `src/utils/types.ts` - many types already exist:

```typescript
// Already defined in types.ts - USE THESE
export interface WindowState { ... }
export interface NetworkStatus { ... }
export interface WifiNetwork { ... }
export interface MonitorStats { ... }
export interface BatteryStatus { ... }
export interface FileEntry { ... }
export interface DisplayOutput { ... }
// etc.
```

### Step 2: Search and replace in main.ts

Run these searches:
```
: any
as any
any[]
any>
```

For each occurrence:
1. Look at what the value actually is
2. Find or create a matching interface
3. Replace `any` with the proper type

### Step 3: Add missing types to types.ts

If you need new types, add them to `src/utils/types.ts`:

```typescript
// Add missing types
export interface PromptOptions {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
}

export interface ConfirmOptions {
  title?: string;
  message?: string;
}

export interface ContextMenuItem {
  label?: string;
  action?: () => void | Promise<void>;
  divider?: boolean;
  submenu?: ContextMenuItem[];
}
```

### Step 4: Enable strict mode (optional, advanced)

Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,           // Add this
    "noImplicitAny": true,    // Already implied by strict
    "strictNullChecks": true  // Already implied by strict
  }
}
```

Then fix resulting errors.

---

## Files to Reference

- `src/utils/types.ts` - Existing type definitions
- `electron/preload.cjs` - API signatures (for return types)

---

## Verification

```bash
npm run build
```

Should compile with NO errors and NO `any` warnings.

---

## Success Criteria

- [ ] `any` count reduced from 214 to <20
- [ ] New types added to `src/utils/types.ts`
- [ ] No TypeScript errors
- [ ] App still works correctly

---

## Priority Fixes (Do These First)

1. **NetworkManager.ts lines 39-49** - Callback types
2. **SettingsManager.ts line 249** - Config typing
3. **main.ts** - Event handler types (MouseEvent, KeyboardEvent, etc.)
4. **main.ts** - IPC response types
