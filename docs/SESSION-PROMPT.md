# TempleOS Remake - Current Session Prompt

**Copy this entire block to start a new AI coding session:**

---

## Project Context

I'm building a TempleOS remake - a browser-based (eventually bootable Linux) OS with TempleOS aesthetics.

**Tech Stack:**
- TypeScript + Vite (browser prototype)
- Will become: Electron → Alpine Linux → Bootable USB

**Current Phase:** Phase 1 - Browser Prototype

**Project Location:** `d:\temple os recreation`

**Key Files:**
- `src/main.ts` - Main application logic (window manager, apps, events)
- `src/style.css` - All styling (VGA palette, windows, effects)
- `index.html` - Entry point with Google Fonts

**What's Working:**
- ✅ Window manager (open, close, minimize, maximize, drag, focus)
- ✅ Desktop icons (Terminal, Word of God, Files, HolyC Editor)
- ✅ Taskbar with running apps + clock
- ✅ Boot sequence with Giangero Studio branding
- ✅ Terminal with basic commands
- ✅ Word of God (click anywhere for new verse)
- ✅ File browser (UI only, not functional)
- ✅ HolyC editor (UI only)

**What's NOT Working:**
- ❌ Window resizing (drag corners)
- ❌ Settings panel
- ❌ Keyboard shortcuts
- ❌ Sound effects
- ❌ Terminal command history

**Documentation:**
- `docs/PHASES.md` - Phase tracking and prompts
- `docs/master-plan.md` - Full architecture
- `docs/apps-and-programs.md` - App list
- `docs/security-features.md` - Security implementation
- `docs/gaming-integration.md` - Gaming setup
- `docs/browser-integration.md` - Browser setup
- `docs/boot-sequence.md` - Boot experience
- `docs/ideas-and-features.md` - Future ideas

---

## My Request

[WRITE YOUR REQUEST HERE]

---

## Tips for AI

1. Run `npm run dev` to start the dev server at localhost:5173
2. The project uses Vite hot reload - changes appear instantly
3. Window state is managed in the `TempleOS` class in main.ts
4. All events use delegation on the `#app` element
5. CSS uses custom properties for the VGA color palette
