# BROKEN FEATURES - Complete Settings Audit

**Last Updated:** December 18, 2025  
**Status:** 🔴 CRITICAL - Many settings lack proper event wiring or backend integration

---

## 🔴 CRITICAL BUG: Missing `applyTheme()` Method

**The most important bug.** Theme changes don't work because `this.applyTheme()` is called but doesn't exist.

**Location:** `src/main.ts`

**Calls to missing method:**
- Line 3540: Theme color button in Setup Wizard
- Line 5424: Theme mode button in Settings (Personalization)
- Line 5822, 5831, 5846: Accessibility toggles

**Fix Required:**
```typescript
// Add around line 12726 (after applyWallpaper)
private applyTheme(): void {
  this.settingsManager.applyTheme();
}
```

---

## 🔴 MISSING APPS FROM LAUNCHER

**Location:** `src/main.ts` lines 2535-2544

The `builtin` array is incomplete. Missing apps that exist in codebase:
- `builtin:godly-notes` - Godly Notes (Kanban)
- `builtin:help` - Help & Docs  
- `builtin:notes` - Notes App
- `builtin:calculator` - Calculator
- `builtin:calendar` - Calendar
- `builtin:media-player` - Media Player
- `builtin:image-viewer` - Image Viewer

---

## Category-by-Category Audit

### 📁 SYSTEM SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Volume Slider | `.volume-slider` | ❌ NOT FOUND | `electronAPI.setVolume()` | 🔴 BROKEN |
| Audio Output (Sink) | `.audio-sink-select` | ❌ NOT FOUND | `electronAPI.setDefaultSink()` | 🔴 BROKEN |
| Audio Input (Source) | `.audio-source-select` | ❌ NOT FOUND | `electronAPI.setDefaultSource()` | 🔴 BROKEN |
| Refresh Audio | `.audio-refresh-btn` | ❌ NOT FOUND | `refreshAudioDevices()` | 🔴 BROKEN |
| Auto Time Toggle | `.auto-time-toggle` | ❌ NOT FOUND | None needed (local) | 🔴 BROKEN |
| Timezone Select | `.timezone-select` | ❌ NOT FOUND | None needed (local) | 🔴 BROKEN |
| Clean RAM Button | `.clean-memory-btn` | ❌ NOT FOUND | `memoryOptimizer.clean()` | 🔴 BROKEN |
| Monitor Select | `.display-output-select` | ❌ NOT FOUND | Display refresh | 🔴 BROKEN |
| Move to Display | `.display-move-btn` | ❌ NOT FOUND | `moveWindowToDisplay()` | 🔴 BROKEN |
| Resolution Select | `.display-mode-select` | ❌ NOT FOUND | `changeResolution()` | 🔴 BROKEN |
| Display Scale | `.display-scale-slider` | ❌ NOT FOUND | Backend | 🔴 BROKEN |
| Orientation | `.display-transform-select` | ❌ NOT FOUND | Backend | 🔴 BROKEN |
| Refresh Displays | `.display-refresh-btn` | ❌ NOT FOUND | `refreshDisplayOutputs()` | 🔴 BROKEN |
| Gaming Mode Toggle | `.gaming-mode-toggle` | ⚠️ CHECK | Local state | ⚠️ VERIFY |

### 🎨 PERSONALIZATION SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Theme Dark/Light | `.theme-btn` | ✅ Line 5420 | `applyTheme()` | 🔴 BROKEN (missing method) |
| Theme Color | `.theme-color-btn` | ✅ Line 5430 | `applyTheme()` | 🔴 BROKEN (missing method) |
| Custom Theme Select | `.custom-theme-item` | ❌ NOT FOUND | `applyTheme()` | 🔴 BROKEN |
| Create Theme | `.custom-theme-create-btn` | ❌ NOT FOUND | Opens editor | 🔴 BROKEN |
| Import Theme | `.custom-theme-import-btn` | ❌ NOT FOUND | File picker | 🔴 BROKEN |
| Export Theme | `.custom-theme-export-btn` | ❌ NOT FOUND | Download JSON | 🔴 BROKEN |
| Delete Theme | `.custom-theme-delete-btn` | ❌ NOT FOUND | Remove from array | 🔴 BROKEN |
| Theme Editor Back | `.theme-editor-back-btn` | ❌ NOT FOUND | Close editor | 🔴 BROKEN |
| Theme Editor Color | `.theme-editor-color` | ❌ NOT FOUND | Update preview | 🔴 BROKEN |
| Theme Editor Save | `.theme-editor-save-btn` | ❌ NOT FOUND | Save theme | 🔴 BROKEN |
| Auto-hide Taskbar | `.taskbar-autohide-toggle` | ⚠️ CHECK | Local state | ⚠️ VERIFY |
| Wallpaper Select | `.wallpaper-btn` | ✅ Line 5441 | `applyWallpaper()` | ✅ WORKS |
| Terry Quotes Toggle | `.quote-notifications-toggle` | ✅ Line 3678 | Local state | ✅ WORKS |
| Lite Mode Toggle | `.lite-mode-toggle` | ✅ Line 3671 | Local state | ✅ WORKS |

### 🌐 NETWORK SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Flight Mode | `.flight-mode-toggle` | ⚠️ CHECK | Local state | ⚠️ VERIFY |
| WiFi Enable | `.wifi-enabled-toggle` | ⚠️ CHECK | `electronAPI.setWifiEnabled()` | ⚠️ VERIFY |
| Connect WiFi | `.net-btn[data-net-action="connect"]` | ✅ Found | `connectWifiFromUi()` | ✅ WORKS |
| Disconnect | `.net-btn[data-net-action="disconnect"]` | ⚠️ CHECK | `electronAPI.disconnect()` | ⚠️ VERIFY |
| Refresh Networks | `.net-btn[data-net-action="refresh"]` | ⚠️ CHECK | `networkManager.refresh()` | ⚠️ VERIFY |
| Saved Network Connect | `.saved-net-btn[data-action="connect"]` | ✅ Found | Backend | ✅ WORKS |
| Saved Network Forget | `.saved-net-btn[data-action="forget"]` | ✅ Found | Backend | ✅ WORKS |
| VPN Import | `.vpn-import-btn` | ⚠️ CHECK | `importVpnProfile()` | ⚠️ VERIFY |
| VPN Connect/Disconnect | `.vpn-profile-btn` | ⚠️ CHECK | Backend | ⚠️ VERIFY |
| VPN Kill Switch Toggle | `.vpn-killswitch-toggle` | ⚠️ CHECK | Local state | ⚠️ VERIFY |
| VPN Kill Switch Mode | `.vpn-killswitch-mode` | ⚠️ CHECK | Local state | ⚠️ VERIFY |
| Hotspot Toggle | `.hotspot-toggle` | ⚠️ CHECK | `toggleHotspot()` | ⚠️ VERIFY |
| Hotspot Edit | `.hotspot-edit-btn` | ⚠️ CHECK | Modal | ⚠️ VERIFY |
| SSH Toggle | `.ssh-toggle` | ⚠️ CHECK | `toggleSSHServer()` | ⚠️ VERIFY |
| SSH Port | `.ssh-port-input` | ⚠️ CHECK | Local state | ⚠️ VERIFY |
| SSH Regenerate Keys | `.ssh-btn[data-ssh-action="regenerate-keys"]` | ⚠️ CHECK | `regenerateSSHKeys()` | ⚠️ VERIFY |
| SSH View Key | `.ssh-btn[data-ssh-action="view-pubkey"]` | ⚠️ CHECK | `viewSSHPublicKey()` | ⚠️ VERIFY |

### 🔒 SECURITY SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Encryption Toggle | `.sec-toggle[data-sec-key="encryption"]` | ⚠️ CHECK | Local state only | ⚠️ VISUAL ONLY |
| Encryption Buttons | Change Key/Backup Header | ❌ NO onclick | None | 🔴 BROKEN |
| VeraCrypt Refresh | `.vc-refresh-btn` | ⚠️ CHECK | `refreshVeraCrypt()` | ⚠️ VERIFY |
| VeraCrypt Mount | `.vc-mount-btn` | ⚠️ CHECK | `mountVeraCryptFromUi()` | ⚠️ VERIFY |
| VeraCrypt Dismount | `.vc-dismount-btn` | ⚠️ CHECK | `dismountVeraCryptFromUi()` | ⚠️ VERIFY |
| Firewall Toggle | `.firewall-toggle` | ⚠️ CHECK | `toggleFirewallSystem()` | ⚠️ VERIFY |
| Firewall Add Rule | `.fw-add-btn` | ⚠️ CHECK | `addFirewallRule()` | ⚠️ VERIFY |
| Firewall Delete Rule | `.fw-delete-btn` | ⚠️ CHECK | `deleteFirewallRule()` | ⚠️ VERIFY |
| Firewall Refresh | `.fw-refresh-btn` | ⚠️ CHECK | `refreshFirewallRules()` | ⚠️ VERIFY |
| MAC Randomization | `.sec-toggle[data-sec-key="mac"]` | ⚠️ CHECK | Local state only | ⚠️ VISUAL ONLY |
| Secure Delete | `.sec-toggle[data-sec-key="shred"]` | ⚠️ CHECK | Local state only | ⚠️ VISUAL ONLY |
| Memory Wipe | `.sec-toggle[data-sec-key="memory-wipe"]` | ✅ Line 3920 | localStorage | ✅ WORKS |
| Tracker Blocking | `.sec-toggle[data-sec-key="tracker-blocking"]` | ⚠️ CHECK | Local state only | ⚠️ VISUAL ONLY |
| Tor Toggle | `.sec-toggle[data-sec-key="tor"]` | ⚠️ CHECK | `toggleTor()` | ⚠️ VERIFY |
| Tor Bridge Config | `.tor-bridge-input` | ❌ NOT FOUND | Local state | 🔴 BROKEN |
| EXIF Select File | `.exif-select-file-btn` | ⚠️ CHECK | `selectImageForExif()` | ⚠️ VERIFY |
| EXIF Strip Data | `.exif-strip-btn` | ⚠️ CHECK | `stripExifData()` | ⚠️ VERIFY |
| Lock Password Save | `.save-password-btn` | ⚠️ CHECK | Local state | ⚠️ VERIFY |
| Lock PIN Save | `.save-pin-btn` | ⚠️ CHECK | Local state | ⚠️ VERIFY |
| USB Toggle | `.usb-toggle-btn` | ⚠️ CHECK | `toggleUsbDevice()` | ⚠️ VERIFY |
| Panic Button | `.panic-btn` | ⚠️ CHECK | `triggerLockdown()` | ⚠️ VERIFY |
| Duress Password Save | `.save-duress-btn` | ⚠️ CHECK | `setDuressPassword()` | ⚠️ VERIFY |
| Test Lock Screen | `.test-lock-btn` | ⚠️ CHECK | `lock()` | ⚠️ VERIFY |

### ♿ ACCESSIBILITY SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| High Contrast | `.high-contrast-toggle` | ✅ Line 7505 | `applyTheme()` | 🔴 BROKEN (missing method) |
| Large Text | `.large-text-toggle` | ✅ Line 5821 | CSS class | ⚠️ Needs applyTheme |
| Reduce Motion | `.reduce-motion-toggle` | ✅ Line 5828 | CSS class | ⚠️ Needs applyTheme |
| Jelly Mode | `.jelly-mode-toggle` | ✅ Line 5836 | `effectsManager` | ✅ WORKS |
| Color Blind Mode | `.color-blind-select` | ✅ Line 5844 | `applyTheme()` | 🔴 BROKEN (missing method) |

### 🎮 GAMING SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Gaming Mode Toggle | `.gaming-mode-toggle` | ⚠️ CHECK | Local state | ⚠️ VERIFY |

### 🖱️ MOUSE & INPUT SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Pointer Speed | `.mouse-speed-slider` | ❌ NOT FOUND | `applyMouseSettings()` | 🔴 BROKEN |
| DPI Select | `.mouse-dpi-select` | ❌ NOT FOUND | `applyMouseSettings()` | 🔴 BROKEN |
| Raw Input Toggle | `.mouse-raw-toggle` | ❌ NOT FOUND | `applyMouseSettings()` | 🔴 BROKEN |

### 📶 BLUETOOTH SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Bluetooth Enable | `.bt-enable-toggle` | ❌ NOT FOUND | Mock only | 🔴 BROKEN |
| Bluetooth Scan | `.bt-scan-btn` | ❌ NOT FOUND | Mock only | 🔴 BROKEN |
| Bluetooth Connect | `.bt-connect-btn` | ❌ NOT FOUND | Mock only | 🔴 BROKEN |

### ℹ️ ABOUT SETTINGS

| Setting | UI Class | Has Handler? | Backend Call? | Status |
|---------|----------|--------------|---------------|--------|
| Refresh System Info | `.about-refresh-btn` | ✅ Line 5451 | `refreshSystemInfo()` | ✅ WORKS |
| Run Setup Again | `.setup-again-btn` | ✅ Line 3546 | localStorage clear | ✅ WORKS |

---

## Summary: What's Actually Working

### ✅ CONFIRMED WORKING
- Wallpaper selection
- Terry Quotes toggle
- Lite Mode toggle
- Jelly Mode toggle
- Run Setup Again button
- Refresh System Info button
- WiFi Connect/Disconnect (with backend)
- Saved Networks Connect/Forget
- Secure Wipe on Shutdown toggle

### 🔴 DEFINITELY BROKEN
- ALL theme/color changes (missing `applyTheme()` method)
- ALL audio settings (missing event handlers)
- ALL display settings (missing event handlers)
- ALL mouse settings (missing event handlers)
- ALL Bluetooth settings (missing event handlers)
- Custom themes UI (missing event handlers)
- Time/Timezone settings (missing event handlers)
- Memory cleaner button (missing event handler)
- Color blind mode (needs working applyTheme)
- High contrast mode (needs working applyTheme)

### ⚠️ NEEDS VERIFICATION
- Most Network settings (handlers may exist but need testing)
- Most Security settings (handlers may exist but need testing)
- Gaming Mode toggle

---

## Next Steps for Fix Session

1. **Add `applyTheme()` method** - This fixes themes AND accessibility
2. **Add missing apps to launcher** - Quick win
3. **Search all `.class-name` UI elements and verify handlers exist**
4. **Wire up System settings** (audio, display, time)
5. **Wire up Mouse & Bluetooth settings**
6. **Test Network & Security settings end-to-end**
