# TempleOS Remake - Implementation Plan

## Current Session Goal
Complete all remaining tasks from TASK.md excluding Tier 12 (Minigames) and Phase 5 (AI Assistant).

## Phase 1: Core Functionality (High Priority)

### 4.4 Image Viewer - Missing Features
**Status**: Partially Complete
**Remaining Items**:
- [ ] Pan/drag functionality for zoomed images
- [ ] Slideshow mode
- [ ] Set as wallpaper button
- [ ] Basic editing (crop)

**Implementation Notes**:
- Need to search for existing image viewer code
- Add pan state tracking (offsetX, offsetY)
- Add mouse drag handlers for panning
- Create slideshow timer
- Wire "Set as Wallpaper" to existing wallpaper setter

### 4.5 File Browser - Remaining Items
**Status**: Mostly Complete
**Note**: Task.md shows these as complete, verify implementation

### 4.6 System Monitor - Missing Features
**Status**: Partially Complete  
**Remaining Items**:
- [ ] Real-time CPU usage graph (has percent + polling, needs graph visualization)
- [ ] GPU usage monitoring (if available)

**Implementation Notes**:
- Create canvas-based CPU graph
- Poll GPU usage (nvidia-smi or rocm-smi)
- Add graph history buffer (last 60 seconds)

---

## Phase 2: TempleOS Authenticity (The Soul)

### 5.1 Oracle / "Talk to God" ✅
**Status**: Complete per TASK.md

### 5.2 Terry's Quotes ✅
**Status**: Complete per TASK.md

### 5.3 System Info (neofetch) ✅  
**Status**: Complete per TASK.md

### 5.5 Sprite Editor
**Status**: Mostly Complete
**Remaining**:
- [ ] Animation preview

### 5.6 AutoHarp ✅
**Status**: Appears complete per TASK.md

### 5.7 DolDoc Viewer ✅
**Status**: Appears complete per TASK.md

---

## Phase 3: System & Security (The Backbone)

### 6.1 Network Manager
**Status**: Mostly Complete
**Remaining**:
- [ ] VPN profiles (OpenVPN, WireGuard)
- [ ] Kill switch (block if VPN drops)
- [ ] DNS settings

### 6.3 SSH Server Toggle  
**Status**: Not Started
- [ ] Enable/disable SSH
- [ ] Port configuration
- [ ] Key management

### 6.4 Hotspot Creation
**Status**: Basic UI done
**Remaining**:
- [ ] Actually create WiFi hotspot (nmcli or create_ap)
- [ ] Password configuration
- [ ] Connected devices list

### 6.5 Data Usage
**Status**: Not Started
- [ ] Usage graph
- [ ] Limit setting
- [ ] Device list

### 7.1 Encryption Management
**Status**: Basic UI done
**Remaining**:
- [ ] VeraCrypt integration (hidden volumes)

### 7.2 Firewall UI
**Status**: Basic done
**Remaining**:
- [ ] Block specific apps
- [ ] Allow specific ports

### 7.3 Privacy Features
**Status**: Basic done
**Remaining**:
- [ ] Block trackers at firewall level
- [ ] Metadata removal tool (EXIF stripper)

### 7.4 Tor Integration
**Status**: Basic toggle done
**Remaining**:
- [ ] Tor circuit visualization
- [ ] Bridge configuration
- [ ] Traffic routing options

### 7.5 Security Audit Tool
**Status**: Not Started
- [ ] Built-in security scanner
- [ ] Check encryption status
- [ ] Check firewall status
- [ ] Check system updates
- [ ] Security score display

### 7.6 Physical Security
**Status**: Not Started
- [ ] USB device whitelist
- [ ] Lockdown mode (panic button)
- [ ] Duress password (opens decoy account)

---

## Phase 4: Advanced Apps & UX Polish

### 8.1 Media Player (Enhanced)
**Status**: Partial
**Remaining**:
- [ ] Playlist support
- [ ] Shuffle/repeat
- [ ] Album art display
- [ ] Equalizer

### 8.2 Calculator
**Status**: Partial
**Remaining**:
- [ ] Programmer mode (hex/bin)
- [ ] History

### 8.3 Calendar App
**Status**: Partial
**Remaining**:
- [ ] Integration with notifications

### 8.4 Notes App
**Status**: Partial
**Remaining**:
- [ ] Categories/folders
- [ ] Search
- [ ] Secure notes (encrypted)

### 8.5 Browser Integration
**Status**: Not Started
All features remain

### 8.6 External App Launchers
**Status**: Not Started
All features remain

### 8.7 Help / Documentation
**Status**: Not Started
All features remain

### 9.1 Taskbar Enhancements
**Status**: Mostly done
**Remaining**:
- [ ] App grouping (combine multiple windows of same app)
- [ ] Taskbar hover previews (show window thumbnail)

### 9.2 Desktop Improvements
**Status**: Partial
**Remaining**:
- [ ] Multiple desktops / workspaces
- [ ] Drag icons to rearrange
- [ ] Icon themes / packs

### 9.3 Window Features
**Status**: Partial
**Remaining**:
- [ ] Multi-monitor support
- [ ] Window grouping
- [ ] Picture-in-picture mode

### 9.4 Theme System
**Status**: Partial
**Remaining**:
- [ ] High contrast mode
- [ ] Custom user themes
- [ ] Import/export themes

### 9.6 Additional Keyboard Shortcuts
**Status**: Partial
**Remaining**:
- [ ] Super+B → Open default browser

### 9.7 Accessibility
**Status**: Not Started
All features remain

---

## Phase 5: Gaming & Boot Experience

### 10.1 Steam + Proton
**Status**: Not Started
All features remain

### 10.2 Game Launchers
**Status**: Not Started
All features remain

### 10.3 Gaming Mode
**Status**: Partial (hotkey disable done)
**Remaining**:
- [ ] Electron shell hides during games
- [ ] Gamescope integration
- [ ] Auto-restore after game exits

### 10.4 Gaming Performance
**Status**: Not Started
All features remain

### 10.5 Retro Gaming
**Status**: Not Started
All features remain

### 11.1 Custom GRUB Theme
**Status**: Not Started
All features remain

### 11.2 Plymouth Boot Splash
**Status**: Not Started
All features remain

### 11.3 First Run Wizard
**Status**: Partial (basic done)
**Remaining**:
- [ ] Encryption password setup
- [ ] User account creation
- [ ] Privacy settings selection

### 11.4 Shutdown Sequence ✅
**Status**: Complete per TASK.md

### 13.1 Easter Eggs ✅
**Status**: Complete per TASK.md

---

## Phase 6: Zorin OS Inspirations (Tier 14)

### 14.1 Advanced Window Tiling
**Status**: Not Started
- [ ] Smart window suggestions (fill empty space)
- [ ] Keyboard-driven tiling (Super+Arrow combos)
- [ ] Tiling presets per application

### 14.2 Visual Effects & Animations
**Status**: Not Started
- [ ] Jelly/wobbly windows effect (optional)
- [ ] Desktop cube for workspace switching (3D effect)
- [ ] Spatial window switcher (3D Alt+Tab)
- [ ] Parallax desktop effect
- [ ] Window open/close animations (fade, zoom, slide)
- [ ] Reduced motion mode (accessibility)
- [ ] "Divine Glow" - special TempleOS themed effects
- [ ] Burn/fire close animation (optional chaos mode 😈)

### 14.3 Windows App Compatibility Layer
**Status**: Not Started
- [ ] One-click Wine installation wizard
- [ ] Curated Windows app compatibility database
- [ ] Right-click .exe → "Run with Wine"
- [ ] Automatic Wine prefix management
- [ ] Proton/Wine-GE toggle for gaming
- [ ] Common Windows app installers (7-Zip, Notepad++, etc.)
- [ ] Compatibility rating display

### 14.4 Panel/Taskbar Flexibility
**Status**: Not Started
- [ ] Panel position (bottom, top, left, right)
- [ ] Panel length adjustment (dock mode)
- [ ] Floating/rounded panel option
- [ ] Panel transparency slider
- [ ] Combine panel with dock
- [ ] Icon-only taskbar mode
- [ ] Panel hide behavior (auto-hide, intellihide)

### 14.5 Lite/Performance Mode
**Status**: Basic CSS toggle done
**Remaining**:
- [ ] Aggressive cleanup of unused resources
- [ ] Startup optimization
- [ ] "Temple Lite" preset for old hardware

---

## Phase 7: Final Polish

### Performance Optimization
- [ ] Optimize animations
- [ ] Memory usage reduction
- [ ] Lazy loading for window content

### Distribution
- [ ] Create build scripts for bootable ISO
- [ ] ISO customization
- [ ] Installer system integration

---

## Implementation Order (Recommended)

1. **Session 1**: Phase 1 (Image Viewer, System Monitor) 
2. **Session 2**: Phase 3 Part 1 (Network - VPN/SSH/Hotspot/Data Usage)
3. **Session 3**: Phase 3 Part 2 (Security - Audit Tool, Physical Security)
4. **Session 4**: Phase 4 Part 1 (Media Player, Calculator enhancements)
5. **Session 5**: Phase 4 Part 2 (Browser Integration, Help Docs)
6. **Session 6**: Phase 4 Part 3 (Taskbar/Desktop/Window UX polish)
7. **Session 7**: Phase 5 (Gaming Integration, Boot Experience)
8. **Session 8**: Phase 6 (Zorin OS Visual Effects)
9. **Session 9**: Phase 6 (Wine Compatibility, Panel Flexibility)
10. **Session 10**: Final Polish (Performance + ISO)

---

## Notes

- Skip Tier 12 (Minigames) entirely
- Skip Phase 5 (AI Assistant / Word of God LLM)
- Verify completed items actually work before checking off
- Update TASK.md as we go
