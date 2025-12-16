# TempleOS Remake - Full OS Implementation Plan

## Project Overview

A bootable, secure Linux-based operating system with a TempleOS-inspired interface. Combines the aesthetic and spirit of Terry Davis's TempleOS with modern security features, gaming support, and usability.

**Created by Giangero Studio**

**GitHub**: https://github.com/giangerostudio-ux/temple-os-remake

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TempleOS Desktop Shell                  │   │
│  │  (Electron App - Your custom UI in full-screen)      │   │
│  │                                                       │   │
│  │  • Window Manager    • Terminal    • File Browser    │   │
│  │  • Word of God       • Settings    • App Launcher    │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Opera GX │ │  Steam   │ │   Tor    │ │ LibreOff │       │
│  │ /Firefox │ │ + Proton │ │ Browser  │ │   ice    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    SECURITY LAYER                           │
│  • Encrypted home directory (persistent storage)            │
│  • AppArmor/SELinux profiles                                │
│  • Firewall (UFW) with strict defaults                      │
│  • Optional Tor routing (toggle in settings)                │
│  • MAC address spoofing on boot                             │
├─────────────────────────────────────────────────────────────┤
│                    BASE SYSTEM                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Ubuntu 24.04 LTS + Gamescope             │   │
│  │  • glibc-based  • Steam native  • 5yr LTS support   │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    HARDWARE                                 │
│  Boots from USB / Installs to disk                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Differences from Tails

| Feature | Tails | Our TempleOS |
|---------|-------|--------------|
| Amnesic (forgets everything) | ✅ Always | ❌ Persistent by default |
| Encrypted storage | ✅ Optional | ✅ Required |
| Tor by default | ✅ Always | ⚙️ Optional toggle |
| Custom desktop | ❌ GNOME | ✅ TempleOS UI |
| Gaming support | ❌ None | ✅ Steam + Proton |
| USB bootable | ✅ Yes | ✅ Yes |

---

## Boot Sequence

```
1. BIOS/UEFI loads bootloader
         ↓
2. Ubuntu Linux kernel loads (~3 seconds)
         ↓
3. Encrypted partition unlock (user enters password)
         ↓
4. TempleOS boot animation plays
   "TempleOS Remake by Giangero Studio"
   "Initializing Divine Computing Environment..."
   etc.
         ↓
5. Electron launches in kiosk mode
         ↓
6. User sees TempleOS desktop!
```

---

## Project Phases

### Phase 1: Browser Prototype (CURRENT - 90% done)
- [x] Window manager
- [x] Terminal with commands
- [x] Word of God
- [x] File browser UI
- [x] HolyC editor UI
- [ ] Polish and additional features

### Phase 2: Electron Desktop App
- [ ] Package as Electron app
- [ ] File system integration (real files)
- [ ] Settings persistence
- [ ] System info display

### Phase 3: Linux Integration
- [ ] Alpine Linux base setup
- [ ] Auto-boot into Electron
- [ ] App launcher (Steam, browsers, etc.)
- [ ] Security hardening

### Phase 4: Bootable USB
- [ ] Create ISO builder
- [ ] Encrypted persistent storage
- [ ] First-run setup wizard
- [ ] USB creation tool

---

## File Structure (Final OS)

```
/
├── boot/                    # Bootloader, kernel
├── etc/
│   ├── templeos/            # Our config files
│   │   ├── settings.json    # User preferences
│   │   ├── theme.json       # UI theme config
│   │   └── security.conf    # Security settings
│   └── ...
├── home/
│   └── temple/              # User home (encrypted)
│       ├── Documents/
│       ├── Downloads/
│       ├── Games/
│       └── .templeos/       # App data
├── opt/
│   └── templeos/            # Our Electron app
│       ├── app/
│       └── resources/
└── usr/
    └── share/
        └── applications/    # .desktop files for apps
```

---

## Security Features (Borrowed from Tails, minus amnesia)

### Included:
- ✅ Full disk encryption (LUKS)
- ✅ MAC address randomization on boot
- ✅ Firewall with strict defaults
- ✅ AppArmor security profiles
- ✅ Tor Browser included (optional use)
- ✅ Secure boot support
- ✅ Memory wiping on shutdown (optional)
- ✅ No swap (prevents data leakage)

### NOT Included (unlike Tails):
- ❌ Amnesic system (we KEEP your data)
- ❌ Forced Tor routing (it's optional)
- ❌ Hidden from host OS (we're persistent)

---

## Next Steps

1. Review the detailed docs:
   - `apps-and-programs.md` - Built-in and launchable apps
   - `gaming-integration.md` - Steam, emulators, etc.
   - `security-features.md` - Detailed security implementation
   - `browser-integration.md` - Opera GX, Tor, etc.

2. Decide on priorities
3. Continue building!
