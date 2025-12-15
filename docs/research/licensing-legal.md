# Licensing and Legal Research

## Overview

Legal considerations for the TempleOS Remake project, including name usage, code licensing, and distribution.

---

## TempleOS Name and Branding

### Is "TempleOS" copyrighted?

**Terry Davis** (creator of TempleOS) placed his work in the **public domain**. However:

| Item | Status |
|------|--------|
| TempleOS source code | Public Domain |
| TempleOS name | Uncertain (no trademark filed) |
| TempleOS logo | Public Domain |
| HolyC name | Public Domain |

### Recommendations

To be safe and respectful:

1. **Use a different name for the final product**
   - "Temple OS Remake" is fine for development
   - Consider: "DivinOS", "TempleDE", "HolyOS", etc.
   
2. **Credit Terry Davis**
   - "Inspired by TempleOS by Terry A. Davis"
   - Include in About section and docs

3. **Don't claim to BE TempleOS**
   - It's a remake/tribute, not the original
   - Make this clear in marketing

---

## Code Licensing

### Our Code (New code we write)

**Recommended: MIT License**

```
MIT License

Copyright (c) 2024 Giangero Studio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software...
```

Why MIT:
- Simple, permissive
- Compatible with most other licenses
- Allows commercial use

### Alpine Linux

- Licensed under various open-source licenses
- Using Alpine is fine for any purpose
- Their packages have individual licenses (mostly GPL, MIT, BSD)

### Electron

- MIT License
- Free for commercial use
- Must include their license notice

### Third-Party Packages

| Package | License | Notes |
|---------|---------|-------|
| Alpine Linux | Various | OK to use and distribute |
| Electron | MIT | Include notice |
| Chromium | BSD-3-Clause | Include notice |
| Node.js | MIT | Include notice |
| Steam | Proprietary | Can bundle installer, not Steam itself |
| Firefox | MPL-2.0 | Can bundle, include license |
| Tor Browser | GPL | Can bundle, provide source |

---

## Distributing Pre-installed Software

### What we CAN bundle

| Software | Can Bundle? | Notes |
|----------|-------------|-------|
| ✅ Firefox | Yes | MPL allows it |
| ✅ Tor Browser | Yes | Must provide source |
| ⚠️ Opera GX | Maybe | Check EULA, may need user download |
| ❌ Steam | No | User must download/install |
| ✅ RetroArch | Yes | GPL |
| ✅ LibreOffice | Yes | MPL |
| ✅ GIMP | Yes | GPL |

### Proprietary Software

For proprietary apps like Steam:
1. Include a **downloader/installer** in our OS
2. User accepts their terms when they run it
3. We don't distribute their code

---

## GPL Compliance

If we include GPL software (like Tor Browser):

1. **Provide source code** or link to it
2. **Include GPL license text** in our distribution
3. **Don't add proprietary restrictions** to GPL code

### How to Comply

Create `/usr/share/licenses/` folder with:
- License text for each GPL package
- Source code links

Example about dialog:
```
TempleOS Remake includes open-source software.
View licenses: /usr/share/licenses/
Source code: github.com/giangerostudio/templeos-remake
```

---

## Trademark Considerations

### Names We Should NOT Use
- "Windows" (Microsoft)
- "macOS" / "Apple" (Apple)
- "Ubuntu" (Canonical)
- "Red Hat" (IBM)
- "Fedora" (Fedora Project)

### Names We CAN Use
- References to "Linux" (fair use)
- "GRUB" (GNU, open)
- "Alpine" (when describing the base)
- "Electron" (when describing technology)

### Our Branding

Should be protected:
- "Giangero Studio" - Our brand
- [Custom OS name] - Our product
- Our logo - Should be original

Consider registering trademark if commercial.

---

## Privacy and Security Claims

### Be Careful With Claims

**DON'T say:**
- "Completely anonymous" (can't guarantee)
- "Unhackable" (nothing is)
- "NSA-proof" (probably not)

**DO say:**
- "Includes privacy tools like Tor"
- "Features encryption for data protection"
- "Security-focused design"

### Disclaimer

Include in documentation:
```
DISCLAIMER: While this OS includes security features, 
no software can guarantee complete security or anonymity. 
Users are responsible for their own security practices.
```

---

## Export Restrictions

Encryption software may have export restrictions:

- **US**: LUKS, Tor are fine for most countries
- **Some countries**: May restrict encryption import
- **Advice**: Add note that users should check local laws

---

## Terms of Service / EULA

For distribution, consider:

### Simple Terms
```
TempleOS Remake EULA

This software is provided "as-is" without warranty.
Use at your own risk.

You may:
- Use this software for any purpose
- Modify the software
- Distribute copies

You must:
- Include this license with distributions
- Give credit to Giangero Studio
- Comply with third-party licenses

The developers are not liable for any damages.
```

---

## Contributor License

If accepting contributions:

### Option 1: CLA (Contributor License Agreement)
- Contributors sign agreement
- Gives you flexibility
- More formal

### Option 2: DCO (Developer Certificate of Origin)
- Simpler, just sign-off on commits
- Linux kernel uses this
- `Signed-off-by: Name <email>`

---

## Revenue / Commercial Use

### Can I sell this?

**Yes**, but:
- MIT license allows commercial use of our code
- Can't sell GPL code directly (but can sell support/services)
- Can't redistribute proprietary software without license

### Business Models

| Model | Legality |
|-------|----------|
| Sell support/consulting | ✅ OK |
| Paid premium features | ⚠️ Careful with GPL |
| Donations | ✅ OK |
| Merchandise | ✅ OK |
| Sell pre-installed USB drives | ⚠️ Check all licenses |

---

## Summary Checklist

- [ ] Choose a unique name (not just "TempleOS")
- [ ] Use MIT license for our code
- [ ] Include license notices for all dependencies
- [ ] Credit Terry Davis appropriately
- [ ] Don't bundle proprietary software directly
- [ ] Provide GPL source code or links
- [ ] Add disclaimers for security features
- [ ] Create simple EULA
- [ ] Consider trademark for our brand
