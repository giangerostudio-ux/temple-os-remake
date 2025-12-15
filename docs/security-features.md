# TempleOS Security Features

## Overview

This OS takes the best security features from Tails, Whonix, and QubesOS while maintaining usability and **persistent storage** (unlike Tails which wipes everything).

---

## Security Philosophy

```
┌─────────────────────────────────────────────────┐
│              SECURITY LAYERS                    │
├─────────────────────────────────────────────────┤
│  Layer 1: Encryption (LUKS)                     │
│     └─ All user data encrypted at rest          │
├─────────────────────────────────────────────────┤
│  Layer 2: Network Security                      │
│     ├─ Firewall (UFW)                          │
│     ├─ MAC address randomization               │
│     └─ Optional Tor routing                    │
├─────────────────────────────────────────────────┤
│  Layer 3: Application Isolation                │
│     ├─ AppArmor profiles                       │
│     └─ Sandboxed browsers                      │
├─────────────────────────────────────────────────┤
│  Layer 4: Memory Protection                    │
│     ├─ No swap (prevents data leakage)         │
│     └─ Memory wipe on shutdown (optional)      │
└─────────────────────────────────────────────────┘
```

---

## Tails Features We WILL Include

| Feature | Description | Implementation |
|---------|-------------|----------------|
| ✅ **Full Disk Encryption** | LUKS encryption for all user data | Required on first boot |
| ✅ **MAC Randomization** | Changes MAC address on every boot | NetworkManager setting |
| ✅ **Firewall** | Block all incoming, allow outgoing | UFW with strict rules |
| ✅ **Tor Browser** | Anonymous browsing option | Included, not forced |
| ✅ **Memory Wipe** | Clear RAM on shutdown | Optional toggle |
| ✅ **No Swap** | Prevents password/data leakage | Disabled by default |
| ✅ **Secure Boot** | Prevent boot tampering | UEFI Secure Boot |
| ✅ **AppArmor** | Limit what apps can access | Pre-configured profiles |

---

## Tails Features We WON'T Include

| Feature | Why Not |
|---------|---------|
| ❌ **Amnesic System** | We WANT persistent storage |
| ❌ **Forced Tor** | Too slow for gaming, optional instead |
| ❌ **Read-only System** | Need to install/update apps |
| ❌ **Hidden from Host** | We're the main OS, not hiding |

---

## Encryption Details

### LUKS Full Disk Encryption

```
Boot Partition (unencrypted, ~500MB)
├── Bootloader (GRUB)
├── Kernel
└── initramfs

Encrypted Partition (rest of drive)
├── System files
├── User home directory
├── Application data
└── All personal files
```

### First Boot Setup
1. User creates encryption password
2. Optional: Use hardware key (YubiKey)
3. Password required on every boot
4. Can change password later in Settings

### Emergency
- **Password forgotten**: Data is GONE (by design)
- **Hardware key lost**: Backup codes available

---

## Network Security

### Firewall Rules (UFW)

```bash
# Default policy
ufw default deny incoming
ufw default allow outgoing

# Allow specific services (user-configurable)
ufw allow ssh        # Only if enabled
ufw allow 1714:1764  # KDE Connect (optional)
```

### MAC Address Randomization

**What it does**: Changes your network card's hardware ID on every boot, making it harder to track you across networks.

**Implementation**:
```ini
# /etc/NetworkManager/conf.d/99-random-mac.conf
[device]
wifi.scan-rand-mac-address=yes

[connection]
wifi.cloned-mac-address=random
ethernet.cloned-mac-address=random
```

### DNS Security
- Use DNS-over-HTTPS (DoH)
- Default DNS: Cloudflare (1.1.1.1) or Quad9 (9.9.9.9)
- Option to use Tor DNS

---

## Tor Integration

### ⚠️ Important: Tor vs Firewall (What Protects You)

**Common Misconception**: "I need Tor to be protected from hackers"

**Reality**:

| Protection Type | What Does It | What Tool |
|-----------------|--------------|-----------|
| **Hide your identity from websites** | Sites can't see your real IP | 🧅 Tor |
| **Block hackers from attacking you** | Blocks incoming connections | 🔥 Firewall |
| **Hide activity from your ISP** | ISP can't see what you visit | 🧅 Tor |
| **Prevent tracking across networks** | Changes your hardware ID | 📡 MAC Randomization |

```
YOU → visit website.com
      Tor hides YOUR identity from THEM
      (They see Tor exit IP, not yours)

HACKER → tries to attack your PC
         Firewall blocks THEM from YOU
         (Tor doesn't help here!)
```

**Bottom line**: 
- Use **Firewall** to protect from attacks ✅ (always on)
- Use **Tor Browser** only when you want anonymity 🧅 (optional)
- You do NOT need system-wide Tor to be safe!

---

### Tor Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Off** | Normal internet | Gaming, streaming |
| **Browser Only** | Just Tor Browser uses Tor | Casual privacy |
| **System-wide** | All traffic through Tor | Maximum anonymity (very slow) |

### Recommended Setup
- **Firewall**: Always ON ✅
- **MAC Randomization**: Always ON ✅
- **Tor**: OFF for normal use, use Tor Browser when needed

### Tor Browser
- Pre-installed
- Launches from app menu
- Sandboxed (can't access other files)

### System-wide Tor (Optional)
- Toggle in Settings
- Routes ALL traffic through Tor
- ⚠️ Warning: Very slow, breaks many apps (games, streaming)
- Only use if you REALLY need maximum anonymity

---

## Application Isolation

### AppArmor Profiles

Pre-configured profiles for:
- Browsers (can't access ~/Documents, etc.)
- Games (limited system access)
- Electron apps

### Sandboxed Browsers
- Browsers run in Firejail sandbox
- Can't access full filesystem
- Downloads go to ~/Downloads only

---

## Privacy Features

### Tracking Protection
- Block known trackers at firewall level
- Privacy-focused browser defaults
- No telemetry in system

### Metadata Removal
- Built-in tool to strip EXIF from photos
- Remove metadata from documents before sharing

### Secure Delete
- Option to securely wipe deleted files
- Overwrites data multiple times

---

## Boot Security

### Secure Boot
- Signed bootloader
- Prevents boot-time attacks
- Optional (can disable for compatibility)

### Boot Verification
- Show hash of boot files
- Detect tampering

### BIOS Password (Recommended)
- User guide for setting BIOS password
- Prevents booting other OS

---

## Security Settings UI

In the TempleOS Settings panel:

```
┌────────────────────────────────────────────────┐
│              🔒 SECURITY SETTINGS              │
├────────────────────────────────────────────────┤
│                                                │
│  Encryption                                    │
│  ├─ Status: ✅ Enabled                         │
│  └─ [Change Password]                          │
│                                                │
│  Network                                       │
│  ├─ Firewall: ✅ Active                        │
│  ├─ MAC Randomization: ✅ On                   │
│  └─ Tor Mode: [Off ▼]                         │
│                                                │
│  Privacy                                       │
│  ├─ Memory wipe on shutdown: [ ] Off           │
│  ├─ Secure delete: [x] On                      │
│  └─ Block trackers: [x] On                     │
│                                                │
│  Advanced                                      │
│  ├─ [View Firewall Rules]                      │
│  ├─ [AppArmor Status]                          │
│  └─ [Security Audit]                           │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Security Audit Tool

Built-in tool to check security status:

```
╔════════════════════════════════════════════════╗
║            SECURITY AUDIT REPORT               ║
╠════════════════════════════════════════════════╣
║                                                ║
║  ✅ Disk Encryption: Active                    ║
║  ✅ Firewall: Running                          ║
║  ✅ MAC Randomization: Enabled                 ║
║  ✅ System Updates: Current                    ║
║  ⚠️  Tor: Disabled (not required)              ║
║  ✅ No Swap: Confirmed                         ║
║  ✅ AppArmor: Enforcing                        ║
║                                                ║
║  Security Score: 95/100                        ║
║                                                ║
╚════════════════════════════════════════════════╝
```

---

## Comparison to Other Secure Distros

| Feature | Tails | Whonix | QubesOS | TempleOS Remake |
|---------|-------|--------|---------|-----------------|
| Encryption | ✅ | ✅ | ✅ | ✅ |
| Tor | Always | Always | Optional | Optional |
| Persistent | ❌ | ✅ | ✅ | ✅ |
| Gaming | ❌ | ❌ | ❌ | ✅ |
| Easy to use | ✅ | ⚠️ | ❌ | ✅ |
| Live USB | ✅ | ❌ | ❌ | ✅ |

---

## Implementation Priority

### Phase 1 (Essential)
1. LUKS encryption setup
2. Firewall configuration
3. No swap enforcement

### Phase 2 (Important)
4. MAC randomization
5. Tor Browser integration
6. AppArmor profiles

### Phase 3 (Advanced)
7. Memory wipe option
8. Security audit tool
9. System-wide Tor option
10. Metadata removal tools
