# Update Mechanism Research

## Overview

How users will receive updates to their TempleOS installation.

---

## 🔄 System Updater App

A **built-in app** that checks for, downloads, and installs updates.

### Desktop Entry
```
Icon: 🔄 (or ⬆️)
Name: System Updater
Category: System
```

### App UI - Main View

```
┌────────────────────────────────────────────────────────────┐
│ 🔄 System Updater                          [─] [□] [×]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Current Version: 1.0.0                                    │
│  Status: ✅ Your system is up to date                      │
│                                                            │
│  Last checked: Today at 2:30 PM                            │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                     [Check Now]                     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  ⚙️ Settings                                               │
│  ├─ [ ] Check for updates automatically (daily)           │
│  ├─ [ ] Download updates automatically                     │
│  └─ [x] Notify me when updates are available               │
│                                                            │
│  📜 Update History                                         │
│  ├─ v1.0.0 - Installed Jan 15, 2024                       │
│  └─ [View all history]                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### App UI - Update Available

```
┌────────────────────────────────────────────────────────────┐
│ 🔄 System Updater                          [─] [□] [×]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ⬆️ UPDATE AVAILABLE!                                      │
│                                                            │
│  Current: 1.0.0  →  New: 1.1.0                            │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ What's New in v1.1.0:                               │   │
│  │                                                     │   │
│  │ • Fixed terminal crash on special characters        │   │
│  │ • Added new high contrast theme                     │   │
│  │ • Security: Updated encryption libraries            │   │
│  │ • Performance improvements                          │   │
│  │                                                     │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  Download size: 45 MB                                      │
│  Install time: ~2 minutes                                  │
│                                                            │
│  ┌────────────────────┐  ┌────────────────────┐           │
│  │  Download & Install │  │   Remind Later    │           │
│  └────────────────────┘  └────────────────────┘           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### App UI - Downloading

```
┌────────────────────────────────────────────────────────────┐
│ 🔄 System Updater                          [─] [□] [×]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ⬇️ Downloading update v1.1.0...                           │
│                                                            │
│  ████████████████████░░░░░░░░░░░░  62%                    │
│                                                            │
│  28 MB / 45 MB                                             │
│  Speed: 5.2 MB/s                                           │
│  Time remaining: ~3 seconds                                │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │                     [Cancel]                        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ℹ️ You can continue using your system while downloading. │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### App UI - Ready to Install

```
┌────────────────────────────────────────────────────────────┐
│ 🔄 System Updater                          [─] [□] [×]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✅ Download complete!                                     │
│                                                            │
│  Update v1.1.0 is ready to install.                        │
│                                                            │
│  ⚠️ Your system will restart to complete the installation. │
│  Please save all open work before continuing.              │
│                                                            │
│  ┌────────────────────┐  ┌────────────────────┐           │
│  │  Install & Restart  │  │   Install Later   │           │
│  └────────────────────┘  └────────────────────┘           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Notification Popup (Taskbar)

When update is available:
```
┌────────────────────────────────────┐
│ 🔔 Update Available                │
│                                    │
│ Version 1.1.0 is ready to install  │
│                                    │
│ [View Details]  [Remind Tomorrow]  │
└────────────────────────────────────┘
```

### Background Update Service

The app runs a background service:

```javascript
// update-service.js (runs on system start)

const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Daily

async function checkForUpdates() {
  try {
    const response = await fetch('https://updates.templeos.example/current-version.json');
    const latest = await response.json();
    const current = await getLocalVersion();
    
    if (semver.gt(latest.version, current.version)) {
      showNotification({
        title: 'Update Available',
        body: `Version ${latest.version} is ready to install`,
        action: () => openUpdaterApp()
      });
    }
  } catch (err) {
    console.error('Update check failed:', err);
  }
}

// Check on startup and periodically
checkForUpdates();
setInterval(checkForUpdates, CHECK_INTERVAL);
```

| Challenge | Description |
|-----------|-------------|
| Live USB | Can't modify the ISO on the USB |
| Persistence | Only user data persists, not system |
| Security | Must verify updates are authentic |
| Reliability | Must not break the system |
| Rollback | Must be able to undo bad updates |

---

## Update Strategies

### Option 1: Full ISO Re-download (Simplest)

**How it works:**
1. User downloads new ISO
2. Re-flashes USB with new version
3. User data on separate partition preserved

**Pros:**
- Simple to implement
- Fresh system every time
- No partial update issues

**Cons:**
- Large downloads
- User must manually re-flash
- Requires internet for full ISO

### Option 2: A/B Partitions (Android-style)

**How it works:**
```
USB Layout:
├── Partition A: Current system
├── Partition B: Empty or previous
├── User data: Preserved
└── Boot: Points to active partition

Update process:
1. Download update to Partition B
2. Reboot into Partition B
3. If success, B becomes active
4. If failure, boot back to A
```

**Pros:**
- Atomic updates
- Automatic rollback
- Less downtime

**Cons:**
- Needs more space
- More complex implementation

### Option 3: Overlay Updates (Recommended)

**How it works:**
```
Base squashfs (read-only, from ISO)
      ↓
Overlay (writable, contains updates)
      ↓
Merged filesystem view
```

Update process:
1. Download update overlay
2. Apply on top of base
3. Reboot to activate
4. Remove old overlay

**Pros:**
- Smaller downloads (deltas)
- Rollback by removing overlay
- Works with live USB

**Cons:**
- Multiple overlays = complexity
- May accumulate cruft

---

## Recommended Approach

**Hybrid**: Overlay for minor updates, full ISO for major versions

| Update Type | Method | Size |
|-------------|--------|------|
| Security patches | Overlay | ~10-50 MB |
| Feature updates | Overlay | ~50-200 MB |
| Major version | New ISO | ~300-800 MB |

---

## Implementation Details

### Update Server (GitHub Releases)

We use GitHub Releases for distribution:

**Repository**: https://github.com/giangerostudio-ux/temple-os-remake

```
GitHub Releases Structure:
├── v1.0.0/
│   ├── temple-os-1.0.0.AppImage
│   ├── temple-os-1.0.0.iso
│   └── CHANGELOG.md
├── v1.1.0/
│   ├── temple-os-1.1.0.AppImage
│   ├── temple-os-1.1.0.iso
│   └── CHANGELOG.md
└── latest → v1.1.0
```

Check for updates via GitHub API:
```javascript
const response = await fetch(
  'https://api.github.com/repos/giangerostudio-ux/temple-os-remake/releases/latest'
);
const release = await response.json();
// release.tag_name = "v1.1.0"
// release.assets = [{name: "temple-os-1.1.0.AppImage", ...}]
```

### Version Check (Client)

```javascript
// In Electron app
async function checkForUpdates() {
  const current = await getLocalVersion();
  const response = await fetch('https://updates.templeos.example/current-version.json');
  const latest = await response.json();
  
  if (semver.gt(latest.version, current.version)) {
    return {
      hasUpdate: true,
      current: current.version,
      latest: latest.version,
      downloadUrl: latest.downloadUrl,
      size: latest.size,
      changelog: latest.changelog
    };
  }
  return { hasUpdate: false };
}
```

### Update UI

```
┌────────────────────────────────────────────────┐
│              🔄 SYSTEM UPDATE                  │
├────────────────────────────────────────────────┤
│                                                │
│  Current version: 1.0.0                        │
│  Available: 1.1.0                              │
│                                                │
│  What's new:                                   │
│  • Fixed terminal crash bug                    │
│  • Added new themes                            │
│  • Security updates                            │
│                                                │
│  Download size: 45 MB                          │
│                                                │
│  [Download & Install]  [Remind Later]          │
│                                                │
└────────────────────────────────────────────────┘
```

### Download & Install Process

```
1. Check for updates
2. Download update file (show progress)
3. Verify signature (GPG or similar)
4. Apply overlay
5. Mark for activation on reboot
6. Prompt user to reboot (optional: auto-reboot)
```

---

## Security: Signing Updates

### Generate Keys (One-time)

```bash
# Create GPG key for signing
gpg --full-generate-key
# Export public key for distribution
gpg --export --armor update@giangerostudio.com > update-key.asc
```

### Sign Updates

```bash
# Sign the update file
gpg --detach-sign --armor update-1.1.sfs
# Creates update-1.1.sfs.asc
```

### Verify on Client

```bash
# Built into update process
gpg --verify update-1.1.sfs.asc update-1.1.sfs
```

---

## Rollback Mechanism

### Automatic Rollback

```bash
# On boot, check if system is healthy
# /etc/init.d/update-check

if ! systemctl is-active templeos-ui; then
  # Boot failed, rollback
  rm /overlay/current
  ln -s /overlay/previous /overlay/current
  reboot
fi
```

### Manual Rollback

In settings UI:
```
┌────────────────────────────────────────────────┐
│           ⏪ ROLLBACK UPDATE                   │
├────────────────────────────────────────────────┤
│                                                │
│  Current: v1.1.0                               │
│                                                │
│  Previous versions:                            │
│  • v1.0.0 (installed 2024-01-15)              │
│  • v0.9.0 (installed 2024-01-01)              │
│                                                │
│  [Rollback to v1.0.0]                         │
│                                                │
│  ⚠️ This will reboot your system              │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Automatic Updates (Optional)

Settings:
```
Auto-update settings:
[ ] Download updates automatically
[ ] Install updates automatically (security only)
[x] Notify me of available updates
```

---

## Bandwidth Optimization

### Delta Updates

Only download changed files:

```bash
# Create delta
xdelta3 -e -s old.sfs new.sfs delta.patch

# Apply delta on client
xdelta3 -d -s old.sfs delta.patch new.sfs
```

Result: Updates reduced from 300MB to 20-50MB

### CDN Distribution

Use CDN for downloads:
- Cloudflare
- GitHub Releases
- DigitalOcean Spaces
- AWS S3

---

## Update Frequency

| Type | Frequency | Contents |
|------|-----------|----------|
| Security | As needed | Critical fixes |
| Bugfix | Bi-weekly | Bug fixes |
| Feature | Monthly | New features |
| Major | Yearly | Breaking changes |

---

## Implementation Checklist

- [ ] Set up update server
- [ ] Create signing keys
- [ ] Build delta update tool
- [ ] Add version check to UI
- [ ] Implement download with progress
- [ ] Implement signature verification
- [ ] Implement overlay application
- [ ] Add rollback mechanism
- [ ] Add settings UI
- [ ] Test update flow end-to-end
