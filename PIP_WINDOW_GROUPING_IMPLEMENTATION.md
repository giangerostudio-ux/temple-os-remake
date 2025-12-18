# PiP and Window Grouping - Implementation Guide

## STATUS: Partially Complete

### What's Done:
✅ MediaPlayer.ts - Added PiP state and renderPiPMode() method
✅ MediaPlayer.ts - Added PiP toggle button to UI
✅ main.ts - Added windowGroups state variable

### What Needs to be Added to main.ts:

#### 1. Event Handlers for Media Player PIP (Add inside setupEventListeners, around line 4000-5000)

```typescript
// ============================================
// MEDIA PLAYER PICTURE-IN-PICTURE (Priority 3, Tier 8.4)
// ============================================
const mpActionBtn = target.closest('[data-mp-action]') as HTMLElement;
if (mpActionBtn && mpActionBtn.dataset.mpAction) {
  const action = mpActionBtn.dataset.mpAction;
  const mpWin = this.windows.find(w => w.id.startsWith('media-player'));
  
  if (action === 'toggle-pip' && mpWin) {
    // Toggle PiP mode
    this.mediaPlayer.pipMode = !this.mediaPlayer.pipMode;
    
    if (this.mediaPlayer.pipMode) {
      // Resize window to small PiP size and position in bottom-right
      mpWin.width = 200;
      mpWin.height = 150;
      const appEl = document.querySelector('#app') as HTMLElement;
      const taskbarHeight = this.taskbarPosition === 'bottom' ? 40 : 0;
      mpWin.x = (appEl?.offsetWidth || 1024) - 220;
      mpWin.y = (appEl?.offsetHeight || 768) - 170 - taskbarHeight;
      mpWin.alwaysOnTop = true;
      mpWin.content = this.mediaPlayer.renderPiPMode();
    } else {
      // Restore to normal size
      mpWin.width = 640;
      mpWin.height = 480;
      mpWin.x = 100;
      mpWin.y = 50;
      mpWin.alwaysOnTop = false;
      mpWin.content = this.getMediaPlayerContent(null);
    }
    
    this.render();
    return;
  }
  
  if (action === 'expand-pip' && mpWin) {
    // Expand from PiP back to full
    this.mediaPlayer.pipMode = false;
    mpWin.width = 640;
    mpWin.height = 480;
    mpWin.x = 100;
    mpWin.y = 50;
    mpWin.alwaysOnTop = false;
    mpWin.content = this.getMediaPlayerContent(null);
    this.render();
    return;
  }
  
  if (action === 'close-pip' && mpWin) {
    // Close PiP window
    this.closeWindow(mpWin.id);
    return;
  }
  
  // Handle other media player actions (prev, next, play, etc.)
  if (action === 'prev') {
    this.mediaPlayer.prevTrack();
    if (mpWin) {
      mpWin.content = this.mediaPlayer.pipMode 
        ? this.mediaPlayer.renderPiPMode() 
        : this.getMediaPlayerContent(null);
      this.render();
    }
    return;
  }
  
  if (action === 'next') {
    this.mediaPlayer.nextTrack();
    if (mpWin) {
      mpWin.content = this.mediaPlayer.pipMode 
        ? this.mediaPlayer.renderPiPMode() 
        : this.getMediaPlayerContent(null);
      this.render();
    }
    return;
  }
  
  if (action === 'play') {
    // Toggle play/pause for audio element
    const audio = document.querySelector('#mp-audio, #mp-audio-pip') as HTMLAudioElement;
    if (audio) {
      if (audio.paused) {
        audio.play();
        this.mediaPlayer.state.isPlaying = true;
      } else {
        audio.pause();
        this.mediaPlayer.state.isPlaying = false;
      }
    }
    return;
  }
  
  if (action === 'stop') {
    const audio = document.querySelector('#mp-audio') as HTMLAudioElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      this.mediaPlayer.state.isPlaying = false;
    }
    return;
  }
  
  if (action === 'shuffle') {
    this.mediaPlayer.toggleShuffle();
    if (mpWin) {
      mpWin.content = this.getMediaPlayerContent(null);
      this.render();
    }
    return;
  }
  
  if (action === 'repeat') {
    this.mediaPlayer.toggleRepeat();
    if (mpWin) {
      mpWin.content = this.getMediaPlayerContent(null);
      this.render();
    }
    return;
  }
  
  if (action === 'add') {
    // Open file picker for adding media files
    // This would require electron file dialog integration
    this.showNotification('Media Player', 'File picker not yet implemented', 'info');
    return;
  }
}

// Media Player: Playlist item click
const mpPlaylistItem = target.closest('.mp-playlist-item') as HTMLElement;
if (mpPlaylistItem && mpPlaylistItem.dataset.mpIndex) {
  const index = parseInt(mpPlaylistItem.dataset.mpIndex, 10);
  this.mediaPlayer.setIndex(index);
  const mpWin = this.windows.find(w => w.id.startsWith('media-player'));
  if (mpWin) {
    mpWin.content = this.mediaPlayer.pipMode 
      ? this.mediaPlayer.renderPiPMode() 
      : this.getMediaPlayerContent(null);
    this.render();
  }
  return;
}

// Media Player: Remove from playlist
const mpRemoveBtn = target.closest('[data-mp-remove]') as HTMLElement;
if (mpRemoveBtn && mpRemoveBtn.dataset.mpRemove) {
  const index = parseInt(mpRemoveBtn.dataset.mpRemove, 10);
  this.mediaPlayer.removeFile(index);
  const mpWin = this.windows.find(w => w.id.startsWith('media-player'));
  if (mpWin) {
    mpWin.content = this.getMediaPlayerContent(null);
    this.render();
  }
  return;
}

// Media Player: Equalizer preset
const mpEqBtn = target.closest('[data-mp-eq]') as HTMLElement;
if (mpEqBtn && mpEqBtn.dataset.mpEq) {
  this.mediaPlayer.setSafeEqualizerPreset(mpEqBtn.dataset.mpEq);
  const mpWin = this.windows.find(w => w.id.startsWith('media-player'));
  if (mpWin) {
    mpWin.content = this.getMediaPlayerContent(null);
    this.render();
  }
  return;
}
```

#### 2. Window Grouping (Optional - can be done after PiP)

Add these helper methods to the TempleOS class (after closeWindow method, around line 7600):

```typescript
// ============================================
// WINDOW GROUPING (Priority 3, Tier 8.3)
// ============================================
private createWindowGroup(windowId1: string, windowId2: string): void {
  const groupId = `group-${Date.now()}`;
  this.windowGroups[groupId] = [windowId1, windowId2];
}

private addToWindowGroup(groupId: string, windowId: string): void {
  if (this.windowGroups[groupId] && !this.windowGroups[groupId].includes(windowId)) {
    this.windowGroups[groupId].push(windowId);
  }
}

private getWindowGroup(windowId: string): string | null {
  for (const [groupId, windowIds] of Object.entries(this.windowGroups)) {
    if (windowIds.includes(windowId)) {
      return groupId;
    }
  }
  return null;
}

private ungroupWindow(windowId: string): void {
  const groupId = this.getWindowGroup(windowId);
  if (groupId) {
    this.windowGroups[groupId] = this.windowGroups[groupId].filter(id => id !== windowId);
    if (this.windowGroups[groupId].length < 2) {
      delete this.windowGroups[groupId];
    }
  }
}

// Called when resizing windows to check for nearby edges
private checkWindowGrouping(windowId: string, edge: 'left' | 'right' | 'top' | 'bottom'): string | null {
  const win = this.windows.find(w => w.id === windowId);
  if (!win) return null;
  
  const threshold = 10; // pixels
  
  for (const other of this.windows) {
    if (other.id === windowId || other.minimized) continue;
    
    // Check if edges are within threshold
    if (edge === 'right' && Math.abs((win.x + win.width) - other.x) < threshold) {
      return other.id;
    }
    if (edge === 'left' && Math.abs(win.x - (other.x + other.width)) < threshold) {
      return other.id;
    }
    if (edge === 'bottom' && Math.abs((win.y + win.height) - other.y) < threshold) {
      return other.id;
    }
    if (edge === 'top' && Math.abs(win.y - (other.y + other.height)) < threshold) {
      return other.id;
    }
  }
  
  return null;
}

// Resize all windows in a group proportionally
private resizeWindowGroup(groupId: string, deltaWidth: number, deltaHeight: number): void {
  const windowIds = this.windowGroups[groupId];
  if (!windowIds) return;
  
  for (const id of windowIds) {
    const win = this.windows.find(w => w.id === id);
    if (win) {
      win.width += deltaWidth;
      win.height += deltaHeight;
      
      // Enforce min constraints
      win.width = Math.max(200, win.width);
      win.height = Math.max(100, win.height);
    }
  }
}
```

### Testing Instructions:

1. **Test PiP Mode**:
   - Open Media Player
   - Click the "📺 PiP" button
   - Window should shrink to bottom-right corner
   - Should stay on top of other windows
   - Play controls should still work
   - Click expand button (⛶) to restore

2. **Test Window Grouping** (if implemented):
   - Open two windows
   - Resize one window's edge close to another (within 10px)
   - Windows should group together
   - Resizing one should resize both
   - Right-click titlebar → "Ungroup" should separate them

### Next Steps:
- Add the event handlers code above to setupEventListeners
- Test PiP functionality
- (Optional) Implement window grouping if time permits
- Update TASK.md to mark features as complete
- Push changes to git

## Notes:
- PiP window positioning uses taskbar height to avoid overlap
- Always-on-top ensures PiP floats above other windows
- Media player state is preserved when toggling PiP mode
