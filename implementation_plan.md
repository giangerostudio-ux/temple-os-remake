# Implementation Plan: Missing OS Features

## Overview

Three features need backend integration to complete the OS:

1. **Encryption Buttons** – "Change Key" and "Backup Header" for LUKS
2. **Panic Button** – System lockdown mode  
3. **DNS Settings** – Custom DNS server configuration

---

## 1. Encryption Management (LUKS)

### Linux Commands

```bash
# Change LUKS password
sudo cryptsetup luksChangeKey /dev/sdXn

# Backup LUKS header
sudo cryptsetup luksHeaderBackup /dev/sdXn --header-backup-file /path/to/backup.img
```

### Proposed Changes

#### [MODIFY] [main.cjs](file:///d:/temple%20os%20recreation/electron/main.cjs)

Add two new IPC handlers:

```javascript
ipcMain.handle('luks-change-key', async (event, device) => {
  // Requires password prompts - spawn interactive cryptsetup
  // This is complex - may need pseudo-terminal or GUI prompt
  return { success: false, error: 'LUKS key change requires terminal access' };
});

ipcMain.handle('luks-backup-header', async (event, device, backupPath) => {
  try {
    const { execSync } = require('child_process');
    execSync(`sudo cryptsetup luksHeaderBackup ${device} --header-backup-file ${backupPath}`);
    return { success: true, path: backupPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
```

#### [MODIFY] [preload.cjs](file:///d:/temple%20os%20recreation/electron/preload.cjs)

Expose new IPC methods:

```javascript
luksChangeKey: (device) => ipcRenderer.invoke('luks-change-key', device),
luksBackupHeader: (device, backupPath) => ipcRenderer.invoke('luks-backup-header', device, backupPath),
```

#### [MODIFY] [main.ts](file:///d:/temple%20os%20recreation/src/main.ts)

1. Add CSS classes to buttons in `renderSecurity()`:
   ```html
   <button class="encryption-change-key-btn" style="...">Change Key</button>
   <button class="encryption-backup-btn" style="...">Backup Header</button>
   ```

2. Add event handlers in `setupEventListeners()`:
   ```typescript
   if (target.matches('.encryption-change-key-btn')) {
     this.showNotification('Encryption', 'LUKS key change requires terminal. Use: sudo cryptsetup luksChangeKey /dev/sdXn', 'info');
   }
   if (target.matches('.encryption-backup-btn')) {
     void this.backupLuksHeader();
   }
   ```

3. Add helper method:
   ```typescript
   private async backupLuksHeader(): Promise<void> {
     const path = await this.openPromptModal({
       title: 'Backup LUKS Header',
       message: 'Enter backup file path:',
       defaultValue: '/home/user/luks-header-backup.img'
     });
     if (!path) return;
     // Would need device selection too
     this.showNotification('Encryption', 'Header backup requires sudo. Feature limited.', 'warning');
   }
   ```

> [!WARNING]
> LUKS management requires root privileges and interactive password input. Full implementation would need a terminal-based workflow or polkit integration.

---

## 2. Panic Button (Lockdown Mode)

### Linux Commands

```bash
# Lock the session
loginctl lock-session

# Disable networking immediately
nmcli networking off

# Optional: Clear clipboard, close sensitive apps
xclip -selection clipboard < /dev/null
```

### Proposed Changes

#### [MODIFY] [main.cjs](file:///d:/temple%20os%20recreation/electron/main.cjs)

Add IPC handler:

```javascript
ipcMain.handle('trigger-lockdown', async () => {
  const { execSync } = require('child_process');
  const results = [];
  
  try {
    // 1. Lock session
    execSync('loginctl lock-session', { timeout: 5000 });
    results.push('Session locked');
  } catch (e) {
    results.push('Lock failed: ' + e.message);
  }
  
  try {
    // 2. Disable networking
    execSync('nmcli networking off', { timeout: 5000 });
    results.push('Network disabled');
  } catch (e) {
    results.push('Network disable failed: ' + e.message);
  }
  
  return { success: true, actions: results };
});
```

#### [MODIFY] [preload.cjs](file:///d:/temple%20os%20recreation/electron/preload.cjs)

```javascript
triggerLockdown: () => ipcRenderer.invoke('trigger-lockdown'),
```

#### [MODIFY] [main.ts](file:///d:/temple%20os%20recreation/src/main.ts)

1. Add panic button to Security UI in `renderSecurity()`:
   ```html
   ${card('Emergency', `
     <button class="panic-lockdown-btn" style="background: #ff3333; color: white; ...">
       🚨 PANIC: Lock & Disconnect
     </button>
     <div style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
       Immediately locks screen and disables all network connections.
     </div>
   `)}
   ```

2. Add event handler:
   ```typescript
   if (target.matches('.panic-lockdown-btn')) {
     void this.triggerLockdown();
   }
   ```

3. Update `triggerLockdown()` method to use IPC:
   ```typescript
   private async triggerLockdown(): Promise<void> {
     this.showNotification('LOCKDOWN', 'Initiating emergency lockdown...', 'warning');
     
     if (window.electronAPI?.triggerLockdown) {
       const res = await window.electronAPI.triggerLockdown();
       if (res.success) {
         this.showNotification('LOCKDOWN', res.actions.join(', '), 'info');
       }
     } else {
       // Fallback: Just lock the frontend
       this.lock();
     }
   }
   ```

---

## 3. DNS Settings

### Linux Commands

```bash
# Set DNS for interface
sudo resolvectl dns eth0 8.8.8.8 8.8.4.4

# Verify
resolvectl status
```

### Proposed Changes

#### [MODIFY] [main.cjs](file:///d:/temple%20os%20recreation/electron/main.cjs)

```javascript
ipcMain.handle('set-dns', async (event, iface, primary, secondary) => {
  const { execSync } = require('child_process');
  try {
    const servers = [primary, secondary].filter(Boolean).join(' ');
    execSync(`sudo resolvectl dns ${iface} ${servers}`, { timeout: 10000 });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-dns-status', async () => {
  const { execSync } = require('child_process');
  try {
    const output = execSync('resolvectl status', { encoding: 'utf8', timeout: 5000 });
    return { success: true, status: output };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
```

#### [MODIFY] [preload.cjs](file:///d:/temple%20os%20recreation/electron/preload.cjs)

```javascript
setDns: (iface, primary, secondary) => ipcRenderer.invoke('set-dns', iface, primary, secondary),
getDnsStatus: () => ipcRenderer.invoke('get-dns-status'),
```

#### [MODIFY] [main.ts](file:///d:/temple%20os%20recreation/src/main.ts)

Update the DNS save button handler (around line 4689):
```typescript
const dnsSaveBtn = target.closest('.dns-save-btn') as HTMLElement;
if (dnsSaveBtn) {
  const primary = (document.querySelector('.dns-primary-input') as HTMLInputElement)?.value;
  const secondary = (document.querySelector('.dns-secondary-input') as HTMLInputElement)?.value;
  if (primary) {
    if (window.electronAPI?.setDns) {
      // Need to get active interface - use first from networkManager
      const iface = this.networkManager.status.device || 'eth0';
      const res = await window.electronAPI.setDns(iface, primary, secondary);
      if (res.success) {
        this.showNotification('DNS', `DNS set to ${primary}${secondary ? ', ' + secondary : ''}`, 'info');
      } else {
        this.showNotification('DNS', res.error || 'Failed to set DNS', 'error');
      }
    } else {
      this.showNotification('DNS', 'DNS control requires Electron/Linux', 'warning');
    }
  }
  return;
}
```

---

## Verification Plan

### Manual Testing (User Required)

Since these features require Linux + Electron backend:

1. **DNS Settings**:
   - Open Settings → Network
   - Enter `8.8.8.8` as primary DNS
   - Click Save
   - Verify with `resolvectl status` in terminal

2. **Panic Button**:
   - Open Settings → Security
   - Click the red Panic button
   - Screen should lock and WiFi should disconnect

3. **Encryption Buttons**:
   - Verify buttons are clickable (shows notification)
   - Full LUKS operations require terminal access

> [!IMPORTANT]
> These features require running on actual Ubuntu Linux with Electron. They cannot be tested in browser-only mode.
