# Backend Implementation Specification
## For TempleOS Remake (Electron/Ubuntu)

**Objective:** Implement missing backend logic in `electron/main.cjs` to make the frontend settings functional.
**Safety Warning:** properties defined in `preload.cjs` often wrap arguments into objects. The backend must match these signatures exactly to avoid runtime errors.

---

## 1. Accessibility (Visual)
**Status:** ✅ **Fully Functional**
- Frontend handlers implemented.
- Backend logic (`applyTheme`) is CSS-based and works.
- **Action:** None.

---

## 2. Audio System
**Frontend Status:** ✅ Wired
**Missing Backend IPCs:**
| Channel | Preload Signature (What Frontend Sends) | Expected Backend Handler Signature | Implementation Hint |
| :--- | :--- | :--- | :--- |
| `audio:setVolume` | `invoke('audio:setVolume', level)` | `async (event, level)` | `wpctl set-volume @DEFAULT_AUDIO_SINK@ {level}%` |
| `audio:setDefaultSink` | `invoke('audio:setDefaultSink', sinkName)` | `async (event, sinkName)` | `wpctl set-default {sinkName}` |
| `audio:setDefaultSource` | `invoke('audio:setDefaultSource', sourceName)` | `async (event, sourceName)` | `wpctl set-default {sourceName}` |

---

## 3. Display System
**Frontend Status:** ✅ Wired
**Missing Backend IPCs:**
| Channel | Preload Signature | Expected Backend Handler Signature | Implementation Hint |
| :--- | :--- | :--- | :--- |
| `display:setMode` | `invoke(..., { outputName, mode })` | `async (event, { outputName, mode })` | `xrandr --output {outputName} --mode {mode}` |
| `display:setScale` | `invoke(..., { outputName, scale })` | `async (event, { outputName, scale })` | `xrandr --output {outputName} --scale {scale}x{scale}` |
| `display:setTransform`| `invoke(..., { outputName, transform })` | `async (event, { outputName, transform })` | `xrandr --output {outputName} --rotate {transform}` |

> **Note:** `system:setResolution` is also mapped but `display:setMode` is the preferred modern implementation used by the frontend.

---

## 4. Mouse & Input
**Frontend Status:** ✅ Wired
**Missing Backend IPCs:**
| Channel | Preload Signature | Expected Backend Handler Signature | Implementation Hint |
| :--- | :--- | :--- | :--- |
| `mouse:apply` | `invoke('mouse:apply', settings)` | `async (event, settings)` | Apply speed/natural scroll using `xinput` properties |
| `mouse:setDpi` | `invoke(..., { deviceId, dpi })` | `async (event, { deviceId, dpi })` | Vendor-specific (ratbagd) or `xinput` scaling hack |

---

## 5. Bluetooth
**Frontend Status:** ⚠️ Partial (Missing Scan Button Handler)
**Missing Backend IPCs:**
| Channel | Preload Signature | Expected Backend Handler Signature | Implementation Hint |
| :--- | :--- | :--- | :--- |
| `bluetooth:setEnabled`| `invoke(..., enabled)` | `async (event, enabled)` | `rfkill {block|unblock} bluetooth` |
| `bluetooth:scan` | `invoke('bluetooth:scan')` | `async (event)` | `bluetoothctl scan on`, gather output |
| `bluetooth:connect` | `invoke(..., mac)` | `async (event, mac)` | `bluetoothctl connect {mac}` |

> **Frontend Task:** You must also add a click event listener for `.bt-scan-btn` in `src/main.ts` to trigger the scan.

---

## 6. Network & Internet
**Frontend Status:** ✅ Wired
**Missing Backend IPCs:**
| Channel | Preload Signature | Expected Backend Handler Signature | Implementation Hint |
| :--- | :--- | :--- | :--- |
| `network:setWifiEnabled`| `invoke(..., enabled)` | `async (event, enabled)` | `nmcli radio wifi {on|off}` |
| `network:connectWifi` | `invoke(..., ssid, password)` | `async (event, ssid, password)` | `nmcli dev wifi connect {ssid} password {password}` |

---

## 7. Security
**Frontend Status:** ✅ Wired
**Missing Backend IPCs:**
| Channel | Preload Signature | Expected Backend Handler Signature | Implementation Hint |
| :--- | :--- | :--- | :--- |
| `security:toggleFirewall`| `invoke(..., enable)` | `async (event, enable)` | `ufw {enable|disable}` |

---

## Implementation Strategy for AI
1.  **Read `electron/main.cjs`** to identify the correct place to insert new `ipcMain.handle` calls.
2.  **Use the Signatures Above:** Copy the **Expected Backend Handler Signature** exactly. If you mismatch args (e.g. `(event, outputName, mode)` instead of `(event, {outputName, mode})`), the frontend will pass `undefined` values.
3.  **Use `execAsync`:** The `electron/main.cjs` already has a helper `execAsync`. Use it for running shell commands.

