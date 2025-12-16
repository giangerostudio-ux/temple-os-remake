# TempleOS Browser Integration

## Overview

> [!IMPORTANT]
> **Browsers are NOT shipped by default.** Users install them via the Word of God AI assistant.
>
> Example: *"Install Firefox"* → God provides the flatpak install command

This document lists supported browsers that can be installed on demand.

## Primary Browser: Opera GX

### Why Opera GX?

| Feature | Benefit |
|---------|---------|
| **Custom Themes** | Can match TempleOS green/black aesthetic |
| **Gaming Features** | CPU/RAM limiter, Twitch sidebar |
| **GX Corner** | Gaming news and deals |
| **Free VPN** | Basic privacy built-in |
| **Discord/Telegram** | Sidebar integrations |
| **Looks Cool** | Gamer aesthetic fits our vibe |

### Installation
Opera GX is available for Linux:
```bash
# Add Opera repository
wget -qO- https://deb.opera.com/archive.key | sudo apt-key add -
sudo add-apt-repository 'deb https://deb.opera.com/opera-stable/ stable non-free'
sudo apt update
sudo apt install opera-stable
```

### Theming Opera GX to Match TempleOS

**Color Scheme**:
```
Background:    #0d1117 (dark blue-black)
Accent:        #00ff41 (TempleOS green)
Secondary:     #ffd700 (gold for highlights)
Text:          #c9d1d9 (light gray)
```

**Finding/Creating Theme**:
1. Go to Opera GX Mods page
2. Search for "hacker", "matrix", "terminal" themes
3. Or create custom theme with our colors

**Recommended Existing Themes**:
- "Hacker Green"
- "Matrix"
- "Cyberpunk Green"
- "Terminal"

### Opera GX Settings to Configure
```
- Enable dark mode
- Set accent color to #00ff41
- Enable "Force Dark Pages"
- Configure CPU/RAM limiter
- Add sidebar apps (Discord, Telegram, Twitch)
```

---

## Privacy Browser: Tor Browser

### What is Tor?
Tor routes your traffic through multiple encrypted relays, making it very hard to trace back to you.

```
You → Relay 1 → Relay 2 → Relay 3 → Website
         ↑          ↑          ↑
   Can see you  Knows only   Knows only
   but not      Relay 1      Relay 2
   destination              + destination
```

### Installation
```bash
# Download from official source
wget https://www.torproject.org/dist/torbrowser/...
# Or use package manager
sudo apt install torbrowser-launcher
```

### Tor Browser Launcher in TempleOS UI

```
┌──────────────────────────────────────┐
│         🧅 TOR BROWSER               │
├──────────────────────────────────────┤
│                                      │
│  Status: ⚪ Not Connected            │
│                                      │
│  [🚀 Launch Tor Browser]             │
│                                      │
│  ⚠️ Note: Tor is slower than        │
│  regular browsing. Use for           │
│  privacy-sensitive tasks.            │
│                                      │
│  Connection time: ~10-30 seconds     │
│                                      │
└──────────────────────────────────────┘
```

### When to Use Tor
- ✅ Accessing sensitive information
- ✅ Researching private topics
- ✅ Bypassing censorship
- ✅ Anonymous communication
- ❌ Gaming (too slow)
- ❌ Streaming (too slow)
- ❌ Downloads (too slow)

---

## Backup Browser: Firefox

### Why Include Firefox?
- Most privacy-focused mainstream browser
- Extensive customization
- Works with all websites
- Excellent developer tools

### Privacy Configuration
We'll pre-configure Firefox with privacy settings:

```javascript
// user.js - Privacy hardening
user_pref("privacy.trackingprotection.enabled", true);
user_pref("privacy.donottrackheader.enabled", true);
user_pref("network.cookie.cookieBehavior", 1);
user_pref("browser.send_pings", false);
user_pref("geo.enabled", false);
user_pref("media.peerconnection.enabled", false); // Disable WebRTC
```

### Firefox Theme
Apply a custom TempleOS-style theme:
- Dark background
- Green accent color
- Minimal UI

---

## Browser Selection in UI

### App Launcher View
```
┌────────────────────────────────────────────────┐
│              🌐 BROWSERS                       │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ OPERA GX │  │ FIREFOX  │  │   TOR    │     │
│  │    🎮    │  │    🦊    │  │    🧅    │     │
│  │  Gaming  │  │ Standard │  │ Privacy  │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │
│  Default Browser: [Opera GX ▼]                 │
│                                                │
└────────────────────────────────────────────────┘
```

### Quick Access
- Keyboard shortcut: `Super + B` → Open default browser
- Keyboard shortcut: `Super + Shift + B` → Browser selector

---

## Embedded Browser (In TempleOS UI)

For certain features, we can embed a browser directly in the UI:

### Use Cases
- Quick web search in terminal
- Preview URLs without opening external browser
- Built-in documentation viewer
- App store / package manager

### Implementation
Using Electron's `<webview>` or `BrowserView`:

```typescript
// Embedded browser window in TempleOS UI
const webBrowser = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true
  }
});
webBrowser.loadURL('https://duckduckgo.com');
```

---

## Default Search Engine

### Options
| Engine | Privacy | Speed |
|--------|---------|-------|
| **DuckDuckGo** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Startpage** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Brave Search** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **SearXNG** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Google | ⭐ | ⭐⭐⭐⭐⭐ |

**Default**: DuckDuckGo
**Tor Browser**: DuckDuckGo (onion version)

---

## Browser Extensions (Pre-installed)

### For Opera GX / Firefox
| Extension | Purpose |
|-----------|---------|
| **uBlock Origin** | Ad/tracker blocking |
| **Privacy Badger** | Tracker detection |
| **HTTPS Everywhere** | Force HTTPS |
| **Bitwarden** | Password manager |

---

## Browser Settings Panel

In TempleOS Settings:

```
┌────────────────────────────────────────────────┐
│              🌐 BROWSER SETTINGS               │
├────────────────────────────────────────────────┤
│                                                │
│  Default Browser                               │
│  └─ [Opera GX ▼]                              │
│                                                │
│  Default Search Engine                         │
│  └─ [DuckDuckGo ▼]                            │
│                                                │
│  Privacy                                       │
│  ├─ [x] Block trackers                        │
│  ├─ [x] Block ads                             │
│  ├─ [x] Force HTTPS                           │
│  └─ [ ] Clear cookies on exit                 │
│                                                │
│  Tor                                           │
│  └─ [Configure Tor Settings]                  │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Implementation Priority

> [!NOTE]
> Browsers are NOT pre-installed. Users install them via Word of God when needed.

### User-Initiated (via Word of God)
1. Opera GX installation + theming
2. Firefox as backup
3. Tor Browser installation

### Phase 2 (Integration)
4. Browser launcher in UI
5. Default browser setting
6. Pre-configured privacy settings

### Phase 3 (Polish)
7. Custom themes
8. Extension pre-installation
9. Embedded browser widget
