# Decoy Session Enhancement Plan

## Problem
The current decoy session only closes windows. An attacker can open Files, Notes, Terminal, etc. and see all real user data.

## Goal
Make decoy session indistinguishable from a fresh/innocent user's desktop with fake or empty data.

---

## Data Sources That Leak Information

| Category | Storage | Risk | Priority |
|----------|---------|------|----------|
| Files Browser | Memory (`fileEntries`) | CRITICAL | P0 |
| Notes | localStorage (`temple_notes_db`) | CRITICAL | P0 |
| Godly Notes/Kanban | localStorage (`godly_notes_v2_db`) | CRITICAL | P0 |
| Terminal History | Memory (`terminalBuffer`, `terminalTabs`) | CRITICAL | P0 |
| Editor Recent Files | Memory (`editorRecentFiles`) | CRITICAL | P0 |
| Divine Chat History | Memory (`divineMessages`) | CRITICAL | P0 |
| Calendar Reminders | localStorage (`temple_calendar_reminders`) | HIGH | P1 |
| Recent Apps | Memory (`recentApps`) | MEDIUM | P1 |
| Trash Contents | Memory (`trashEntries`) | MEDIUM | P1 |
| Calculator History | Memory (`history`) | LOW | P2 |

---

## Implementation Strategy

### Approach: Shadow State
When `isDecoySession = true`, apps check this flag and return fake/empty data instead of real data.

This is better than:
- Destroying real data (user loses everything)
- Copying to backup (slow, complex)
- Separate user profiles (overkill)

---

## Changes By Component

### 1. Files App (P0)
**File:** `src/main.ts` - File browser rendering

**Current behavior:** Shows real `this.fileEntries`

**Decoy behavior:**
- Show fake home directory with innocent folders: Documents, Pictures, Downloads
- Each folder contains 1-2 innocent placeholder files
- Hide real file paths

```typescript
// In file listing logic
if (this.isDecoySession) {
  return this.getDecoyFileEntries();
}
```

**Fake structure:**
```
/home/user/
  Documents/
    readme.txt
  Pictures/
    wallpaper.jpg
  Downloads/
    (empty)
```

---

### 2. Notes App (P0)
**File:** `src/main.ts` - Notes rendering

**Current behavior:** Reads from `localStorage['temple_notes_db']`

**Decoy behavior:**
- Return empty array or 1 innocent sample note
- Sample: "Welcome to TempleOS Notes"

```typescript
// In notes loading
if (this.isDecoySession) {
  return [{ id: 'decoy', title: 'Welcome', content: 'Your notes appear here.', created: Date.now() }];
}
```

---

### 3. Godly Notes / Kanban (P0)
**File:** `src/main.ts` - Godly Notes rendering

**Current behavior:** Reads from `localStorage['godly_notes_v2_db']`

**Decoy behavior:**
- Return single empty board: "My Tasks"
- Three default columns: To Do, In Progress, Done
- No cards

```typescript
if (this.isDecoySession) {
  return this.getDecoyKanbanData();
}
```

---

### 4. Terminal (P0)
**File:** `src/main.ts` - Terminal state

**Current behavior:**
- `terminalBuffer` shows command history
- `terminalTabs` contains multiple sessions

**Decoy behavior:**
- Clear/reset terminal buffer to fresh welcome message
- Single tab with clean state
- Disable history recall (up arrow)

```typescript
// In openDecoySession()
this.terminalBuffer = ['TempleOS Terminal v1.0', 'Type "help" for commands.', ''];
this.terminalTabs = [{ id: 1, title: 'Terminal', buffer: [...this.terminalBuffer] }];
```

---

### 5. Editor Recent Files (P0)
**File:** `src/main.ts` - Editor state

**Current behavior:** `editorRecentFiles` array shows last 20 files

**Decoy behavior:**
- Empty the recent files list
- Or show 1-2 innocent files: "/home/user/Documents/readme.txt"

```typescript
// In openDecoySession()
this.editorRecentFiles = [];
```

---

### 6. Divine Chat / Word of God (P0)
**File:** `src/main.ts` - Divine messages

**Current behavior:** `divineMessages` shows full chat history

**Decoy behavior:**
- Clear to empty or single welcome message

```typescript
// In openDecoySession()
this.divineMessages = [];
```

---

### 7. Calendar (P1)
**File:** `src/apps/Calendar.ts`

**Current behavior:** Reads from `localStorage['temple_calendar_reminders']`

**Decoy behavior:**
- Return empty reminders array

---

### 8. Recent Apps (P1)
**File:** `src/main.ts`

**Current behavior:** `recentApps` shows last 12 launched apps

**Decoy behavior:**
- Clear or show generic apps: Files, Terminal, Settings

```typescript
// In openDecoySession()
this.recentApps = ['Files', 'Terminal', 'Settings'];
```

---

### 9. Trash (P1)
**File:** `src/main.ts`

**Current behavior:** `trashEntries` shows deleted files

**Decoy behavior:**
- Empty trash entries

```typescript
// In openDecoySession()
this.trashEntries = [];
```

---

## Implementation Order

### Phase 1: Critical (P0)
1. Add `getDecoyFileEntries()` method for fake file listing
2. Add decoy check to Notes loading
3. Add decoy check to Godly Notes loading
4. Clear terminal buffer in `openDecoySession()`
5. Clear `editorRecentFiles` in `openDecoySession()`
6. Clear `divineMessages` in `openDecoySession()`

### Phase 2: High Priority (P1)
7. Add decoy check to Calendar
8. Reset `recentApps` to generic list
9. Clear `trashEntries`

### Phase 3: Low Priority (P2)
10. Calculator history (if time permits)
11. System monitor process names (optional)

---

## Code Location Summary

All changes in `src/main.ts`:

| Feature | Method/Property to Modify |
|---------|--------------------------|
| Files | `renderFileBrowser()` or file entry getter |
| Notes | Notes loading/rendering logic |
| Godly Notes | Godly Notes loading/rendering logic |
| Terminal | `openDecoySession()` + terminal render |
| Editor | `openDecoySession()` |
| Divine | `openDecoySession()` |
| Recent Apps | `openDecoySession()` |
| Trash | `openDecoySession()` |

---

## Testing Checklist

- [ ] Enter decoy password at lock screen
- [ ] Open Files app - should show fake directory
- [ ] Open Notes - should show empty/sample note
- [ ] Open Godly Notes - should show empty board
- [ ] Open Terminal - should have clean buffer
- [ ] Open Editor - Recent files should be empty
- [ ] Open Divine/Word of God - should have no history
- [ ] Check Start Menu - Recent apps should be generic
- [ ] Check Trash - should be empty
- [ ] Lock and unlock with real password - real data should return

---

## Security Note

Real data is preserved in memory/localStorage - it's just hidden when `isDecoySession === true`. When user locks screen again and enters the REAL password, everything returns to normal.

The attacker sees a boring empty desktop. The user's real session is preserved.

---

## UI Improvement: Better Duress Password Explanation

**File:** `src/main.ts` - Settings > Security > Physical Security card

**Current description:**
> "Entering this password at lock screen will open a decoy session."

**Problem:** Users don't understand what "decoy session" means or why they'd use it.

**New description:**
```
Duress Password (Panic Login)

If someone forces you to unlock your computer (police, thief, abuser, etc.),
enter this password instead of your real one. The system will appear to
unlock normally, but shows a fake empty desktop hiding all your real files,
notes, and data.

The attacker thinks they're seeing your real desktop. Your actual data
stays hidden until you lock and re-enter your real password.
```

**Additional UI elements to add:**
- Warning icon or yellow highlight to draw attention
- Maybe a "Learn more" expandable section
- Tooltip on hover explaining the feature

**Location in code:** Around line ~15536 in the Physical Security card, update the `<div style="font-size: 11px;...>` description text.
