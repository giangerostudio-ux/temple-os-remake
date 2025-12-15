# Accessibility Research

## Overview

Making TempleOS usable for people with disabilities and different needs.

---

## Accessibility Standards

| Standard | Description |
|----------|-------------|
| **WCAG 2.1** | Web Content Accessibility Guidelines |
| **Section 508** | US federal accessibility law |
| **EN 301 549** | European accessibility standard |

Goal: Aim for WCAG 2.1 Level AA compliance where applicable.

---

## Visual Accessibility

### High Contrast Themes

Already have dark theme, add:

```css
/* High Contrast Theme */
:root[data-theme="high-contrast"] {
  --bg-primary: #000000;
  --text-primary: #ffffff;
  --accent: #ffff00;
  --border: #ffffff;
  /* Remove gradients, add solid borders */
}
```

Theme options:
- Default (green on dark)
- High Contrast (white on black)
- High Contrast Inverse (black on white)
- Yellow on Black (for low vision)

### Font Size Scaling

```css
/* Allow user to scale all text */
html {
  font-size: var(--user-font-size, 16px);
}

/* Settings slider: 12px - 24px */
```

UI:
```
┌────────────────────────────────────────────────┐
│           📐 TEXT SIZE                         │
├────────────────────────────────────────────────┤
│                                                │
│  Smaller  ──────●────────  Larger             │
│                                                │
│  Preview:                                      │
│  The quick brown fox jumps over the lazy dog  │
│                                                │
└────────────────────────────────────────────────┘
```

### Screen Reader Support

For Electron, use proper ARIA roles:

```html
<!-- Example: Window -->
<div role="dialog" 
     aria-labelledby="window-title"
     aria-modal="true">
  <h1 id="window-title">Terminal</h1>
  <!-- content -->
</div>

<!-- Example: Desktop icons -->
<button role="button" 
        aria-label="Open Terminal">
  <span aria-hidden="true">💻</span>
  Terminal
</button>

<!-- Example: Taskbar -->
<nav role="navigation" aria-label="Running applications">
  <button aria-pressed="true">Terminal</button>
</nav>
```

### Screen Reader Testing

Linux screen readers:
- **Orca** - GNOME's screen reader
- **eSpeak** - Text-to-speech engine

```bash
apk add orca espeak
```

### Reduce Motion

For users who get motion sickness:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* Also add manual toggle in settings */
:root[data-reduce-motion="true"] {
  --animation-duration: 0s;
}
```

Setting:
```
[ ] Reduce motion (disable animations)
```

### Color Blind Modes

Don't rely only on color:

```
Bad:  🔴 Error  🟢 Success
Good: ❌ Error  ✅ Success (with labels too)
```

Color blind safe palette options:
- Deuteranopia (red-green, most common)
- Protanopia (red-green)
- Tritanopia (blue-yellow)

---

## Motor/Physical Accessibility

### Full Keyboard Navigation

All features accessible by keyboard:

| Key | Action |
|-----|--------|
| Tab | Next element |
| Shift+Tab | Previous element |
| Enter/Space | Activate |
| Arrow keys | Navigate within component |
| Escape | Close/cancel |
| Alt+F4 | Close window |
| Super | Open app launcher |

### Focus Indicators

```css
/* Clear focus outlines */
:focus {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

/* For mouse users who don't need it */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Sticky Keys

Toggle modifiers instead of holding:

```
┌────────────────────────────────────────────────┐
│           ⌨️ STICKY KEYS                       │
├────────────────────────────────────────────────┤
│                                                │
│  [x] Enable Sticky Keys                        │
│                                                │
│  Press Shift, Ctrl, or Alt once to "hold" it. │
│  Press again to release.                       │
│                                                │
│  [ ] Play sound when modifier is pressed       │
│  [ ] Show status indicator                     │
│                                                │
└────────────────────────────────────────────────┘
```

### Adjustable Double-Click Speed

```
Double-click speed:
Slow ────────●─────── Fast
```

### Mouse Keys

Control mouse pointer with keyboard:

```bash
# Enable mouse keys in X11
setxkbmap -option keypad:pointerkeys
```

---

## Cognitive Accessibility

### Simple Mode

Reduce interface complexity:

```
┌────────────────────────────────────────────────┐
│           🧩 SIMPLE MODE                       │
├────────────────────────────────────────────────┤
│                                                │
│  [ ] Enable Simple Mode                        │
│                                                │
│  Hides advanced features for easier use:       │
│  • Fewer menu options                          │
│  • Larger buttons                              │
│  • Clearer labels                              │
│                                                │
└────────────────────────────────────────────────┘
```

### Clear Labels

Avoid:
- Jargon
- Abbreviations
- Icon-only buttons

Use:
- Plain language
- Full words
- Icons WITH labels

### Confirmation Dialogs

For destructive actions:

```
┌────────────────────────────────────────────────┐
│           ⚠️ DELETE FILE?                      │
├────────────────────────────────────────────────┤
│                                                │
│  Are you sure you want to delete:              │
│  "important-document.txt"                      │
│                                                │
│  This cannot be undone.                        │
│                                                │
│         [Cancel]    [Delete]                   │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Hearing Accessibility

### Visual Notifications

Flash screen or show visual indicator for sounds:

```
[ ] Flash screen for notifications
[ ] Show visual alert for sounds
```

### Captions/Subtitles

For any media playback:
- Enable subtitle display
- Allow subtitle size adjustment

---

## Settings UI

```
┌────────────────────────────────────────────────┐
│           ♿ ACCESSIBILITY                     │
├────────────────────────────────────────────────┤
│                                                │
│  VISION                                        │
│  ├─ Theme: [High Contrast ▼]                  │
│  ├─ Text size: ────●────                      │
│  ├─ [ ] Enable screen reader support           │
│  └─ [ ] Reduce motion                          │
│                                                │
│  MOTOR                                         │
│  ├─ [ ] Sticky Keys                           │
│  ├─ [ ] Mouse Keys                            │
│  └─ Double-click speed: ────●──               │
│                                                │
│  HEARING                                       │
│  ├─ [ ] Flash screen for alerts               │
│  └─ [ ] Visual notification indicator         │
│                                                │
│  COGNITIVE                                     │
│  └─ [ ] Simple Mode                           │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Testing Accessibility

### Manual Testing
- Navigate entire UI with keyboard only
- Use screen reader (Orca)
- Test all color themes
- Disable animations

### Automated Testing
```javascript
// In Electron, use accessibility audit
const { app } = require('electron');
app.on('accessibility-support-changed', (event, enabled) => {
  console.log('Accessibility support:', enabled);
});
```

### Audit Tools
- Chrome DevTools Accessibility panel
- axe-core library
- WAVE browser extension

---

## Implementation Checklist

- [ ] Add high contrast themes
- [ ] Implement font size scaling
- [ ] Add proper ARIA roles to all components
- [ ] Ensure full keyboard navigation
- [ ] Add visible focus indicators
- [ ] Implement sticky keys option
- [ ] Add reduce motion option
- [ ] Add screen flash for notifications
- [ ] Create simple mode (optional)
- [ ] Test with screen reader
- [ ] Test keyboard-only navigation
- [ ] Document accessibility features
