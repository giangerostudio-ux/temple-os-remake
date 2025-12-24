# TempleOS Remake - Bug Fix Implementation Task

## 🎯 **Your Mission**
Fix 6 broken/incomplete features in the TempleOS Remake project. All features were **claimed to be done but are NOT actually implemented**. You need to implement them from scratch.

---

## 📁 **Project Structure**
- **Frontend:** `src/main.ts` (18,600+ lines) - Main application logic
- **Backend:** `electron/main.cjs` - IPC handlers
- **Preload:** `electron/preload.cjs`  
- **Styles:** `src/style.css` - **DO NOT MODIFY** (separate AI handles CSS)

---

## 🔴 **HIGH PRIORITY FIXES**

### **#1: Fix Slider Click-to-Set (BROKEN)**

**Problem:** Sliders are hard to use. Clicking on track should jump the handle to that position, but current code is broken/corrupted.

**Current State:**
- Code exists around line 6019 in `src/main.ts` but is malformed
- Located in click event handler inside `setupEventListeners()`

**Requirements:**
1. When user clicks on slider TRACK (not handle), jump to that position
2. **CRITICAL:** Must NOT interfere with normal dragging behavior  
3. Use 5% threshold: Only jump if click is >5% away from current thumb position
4. Must work for ALL sliders:
   - Volume slider (taskbar)
   - Volume slider (settings)
   - Display scale slider
   - Mouse speed slider  
   - Pulse intensity slider

**Implementation Details:**
```typescript
// Inside setupEventListeners(), in the click handler:
if (target.matches('input[type="range"]')) {
  const rect = target.getBoundingClientRect();
  const clickX = (e as MouseEvent).clientX - rect.left;
  const clickPercentage = clickX / rect.width;
  
  const min = parseFloat(target.getAttribute('min') || '0');
  const max = parseFloat(target.getAttribute('max') || '100');
  const currentValue = parseFloat(target.value);
  const currentPercentage = (currentValue - min) / (max - min);
  
  // Only jump if click is far from current thumb (>5% away)
  const distanceThreshold = 0.05;
  if (Math.abs(clickPercentage - currentPercentage) > distanceThreshold) {
    const step = parseFloat(target.getAttribute('step') || '1');
    let newValue = min + (max - min) * Math.max(0, Math.min(1, clickPercentage));
    
    // Snap to step
    if (step !== 1) {
      newValue = Math.round(newValue / step) * step;
    }
    
    newValue = Math.max(min, Math.min(max, newValue));
    target.value = String(newValue);
    
    // Trigger input event to update app state
    const inputEvent = new Event('input', { bubbles: true });
    target.dispatchEvent(inputEvent);
  }
}
```

**Location to Edit:**  
Search for `setupEventListeners` method, find the document click handler, add this code.

---

### **#2: Implement 15-Second Resolution Revert Dialog (NOT IMPLEMENTED)**

**Problem:** When user changes display resolution, there's NO confirmation dialog. If they select an unsupported resolution, they get a black screen with no way to recover.

**Current State:**
- State variable EXISTS at line 523: `resolutionConfirmation`
- **NOTHING ELSE EXISTS** - no functions, no UI, no logic

**Requirements:**
Implement a Windows-style resolution confirmation:
1. User changes resolution
2. Modal appears: "Keep these display settings? Reverting in 15..."
3. Countdown from 15→0 (visual display)
4. If user clicks "Keep Changes" → save permanently
5. If timer expires OR user clicks "Revert" → auto-revert to previous resolution

**Implementation Steps:**

#### Step 1: Find the resolution change method
Search for where resolution is set. Look for:
- `setResolution` or `changeResolution` method
- `window.electronAPI.setResolution` calls
- Settings → Display section rendering

#### Step 2: Create helper methods
Add these methods to the `TempleOS` class:

```typescript
private confirmResolution() {
  if (!this.resolutionConfirmation) return;
  
  // User confirmed - clear timer and state
  if (this.resolutionConfirmation.timer !== null) {
    clearInterval(this.resolutionConfirmation.timer);
  }
  this.resolutionConfirmation = null;
  this.render();
  this.showNotification('Display', 'Resolution saved successfully', 'success');
}

private revertResolution() {
  if (!this.resolutionConfirmation) return;
  
  const previous = this.resolutionConfirmation.previousResolution;
  
  // Clear timer
  if (this.resolutionConfirmation.timer !== null) {
    clearInterval(this.resolutionConfirmation.timer);
  }
  this.resolutionConfirmation = null;
  
  // Revert to previous resolution
  this.currentResolution = previous;
  if (window.electronAPI?.setResolution) {
    void window.electronAPI.setResolution(previous);
  }
  
  this.render();
  this.showNotification('Display', `Resolution reverted to ${previous}`, 'info');
}

private renderResolutionConfirmation(): string {
  if (!this.resolutionConfirmation) return '';
  
  const { countdown } = this.resolutionConfirmation;
  const urgency = countdown <= 5;
  
  return `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.8); display: flex; align-items: center; 
                justify-content: center; z-index: 10000;">
      <div style="background: rgba(8, 20, 12, 0.95); border: 2px solid ${urgency ? '#ff6464' : '#00ff41'}; 
                  border-radius: 12px; padding: 30px; max-width: 500px; text-align: center;
                  box-shadow: 0 0 40px rgba(0,255,65,0.3);">
        <div style="font-size: 64px; font-weight: bold; color: ${urgency ? '#ff6464' : '#00ff41'}; 
                    margin-bottom: 20px;">${countdown}</div>
        <div style="font-size: 20px; color: #E0F7E9; margin-bottom: 10px;">
          Keep these display settings?
        </div>
        <div style="font-size: 14px; color: #8FB39D; margin-bottom: 30px;">
          ${urgency ? '⚠️ Reverting soon!' : 'Reverting in ' + countdown + ' seconds...'}
        </div>
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button class="resolution-confirm-keep" 
                  style="background: #00ff41; color: #000; border: none; padding: 12px 30px; 
                         font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
            Keep Changes
          </button>
          <button class="resolution-confirm-revert" 
                  style="background: transparent; color: #ff6464; border: 2px solid #ff6464; 
                         padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; 
                         cursor: pointer;">
            Revert
          </button>
        </div>
      </div>
    </div>
  `;
}
```

#### Step 3: Integrate into resolution change
Find where resolution is changed and modify it:

```typescript
// Inside the method that handles resolution changes:
const previousResolution = this.currentResolution;
this.currentResolution = newResolution;

// Apply resolution
if (window.electronAPI?.setResolution) {
  await window.electronAPI.setResolution(newResolution);
}

// Start countdown
this.resolutionConfirmation = {
  previousResolution,
  countdown: 15,
  timer: null
};

// Create interval
this.resolutionConfirmation.timer = window.setInterval(() => {
  if (!this.resolutionConfirmation) return;
  
  this.resolutionConfirmation.countdown--;
  
  if (this.resolutionConfirmation.countdown <= 0) {
    // Auto-revert on timeout
    this.revertResolution();
  } else {
    this.render();
  }
}, 1000);

this.render();
```

#### Step 4: Add to render output
Find the `renderDesktop()` method and add the confirmation overlay:

```typescript
// Inside renderDesktop(), after other overlays:
${this.resolutionConfirmation ? this.renderResolutionConfirmation() : ''}
```

#### Step 5: Add event listeners
In `setupEventListeners()`, add:

```typescript
// Resolution confirmation buttons
if (target.matches('.resolution-confirm-keep')) {
  this.confirmResolution();
}
if (target.matches('.resolution-confirm-revert')) {
  this.revertResolution();
}
```

---

### **#3: Desktop Icon Collision Detection (NOT IMPLEMENTED)**

**Problem:** Icons can be dragged on top of each other, causing overlap/stacking.

**Requirements:**
1. Detect when dropping an icon would cause overlap
2. Find nearest empty grid cell using spiral search
3. Automatically snap to empty cell

**Location:** Find `handleIconDragEnd` method in `src/main.ts`

**Implementation:**
```typescript
// Inside handleIconDragEnd, before saving position:

// Check for collision
let hasCollision = false;
const ICON_SIZE = this.desktopIconSize === 'large' ? 140 : 100;
const GAP = 10;

for (const [otherKey, otherPos] of Object.entries(this.desktopIconPositions)) {
  if (otherKey === key) continue;
  
  const dx = Math.abs(finalX - otherPos.x);
  const dy = Math.abs(finalY - otherPos.y);
  
  if (dx < ICON_SIZE * 0.5 && dy < ICON_SIZE * 0.5) {
    hasCollision = true;
    break;
  }
}

// If collision, find nearest empty cell using spiral search
if (hasCollision) {
  let found = false;
  const maxSearchRadius = 10;
  
  for (let radius = 1; radius <= maxSearchRadius && !found; radius++) {
    for (let dy = -radius; dy <= radius && !found; dy++) {
      for (let dx = -radius; dx <= radius && !found; dx++) {
        // Only check cells at current radius (border of spiral)
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        
        const testX = finalX + dx * (ICON_SIZE + GAP);
        const testY = finalY + dy * (ICON_SIZE + GAP);
        
        // Check if this position is free
        let isFree = true;
        for (const [otherKey, otherPos] of Object.entries(this.desktopIconPositions)) {
          if (otherKey === key) continue;
          
          const dx2 = Math.abs(testX - otherPos.x);
          const dy2 = Math.abs(testY - otherPos.y);
          
          if (dx2 < ICON_SIZE * 0.5 && dy2 < ICON_SIZE * 0.5) {
            isFree = false;
            break;
          }
        }
        
        if (isFree) {
          finalX = testX;
          finalY = testY;
          found = true;
        }
      }
    }
  }
}
```

---

## 🟡 **MEDIUM PRIORITY FIXES**

### **#4: Remove "(Mock)" from USB Whitelist**

**Location:** Settings → Security → Physical Security → USB Device Whitelist

**Search for:** `"USB Device Whitelist"` or `"Only allowed USB HID devices"`

**Find:** The line that says `"Only allowed USB HID devices can function (Mock)."`

**Change to:** `"Only allowed USB HID devices can function."`

---

### **#5: Add Tor Mode Instructions**

**Location:** Settings → Security → Tor Mode section

**Search for:** The security recommendations area where Tor is mentioned

**Find:** The line that currently says something like:
```
• Consider Tor for anonymous browsing
```

**Change to:**
```
• Consider Tor for anonymous browsing
  Note: Tor service only. Use `torsocks <command>` to route apps through Tor
```

Or add a note near the Tor toggle explaining how to use `torsocks`.

---

### **#6: Remove "Tier 10" Text (Verify First)**

**Location:** Settings → Gaming → Game Launchers

**Search for:** `"Game Launchers (Tier 10)"`

**Change to:** `"Game Launchers"`

**Note:** This might already be fixed. Verify first by searching.

---

## ✅ **Verification Checklist**

After implementing:
1. Run `npm run build` - must complete with 0 errors
2. Test each slider - click track should jump handle
3. Test resolution change - dialog should appear with countdown
4. Test icon dragging - icons should never overlap
5. Check USB/Tor/Tier10 text changes
6. Update KNOWN_ISSUES.md with actual status

---

## 🚫 **CRITICAL RULES**

1. **DO NOT modify** `src/style.css` - separate AI handles CSS
2. **DO NOT claim** something is done if it's not
3. **VERIFY** each fix actually works before saying it's complete
4. **UPDATE** KNOWN_ISSUES.md with HONEST status
5. **TEST** the build after every change

---

## 📝 **When You're Done**

Update KNOWN_ISSUES.md to mark each fix as:
- ✅ **VERIFIED WORKING** (actually tested)
- ⚠️ **PARTIAL** (some issues remain)
- 🔴 **BROKEN** (doesn't work)

**NEVER say something is done unless you can grep/search for it and find the actual code.**

Good luck!
