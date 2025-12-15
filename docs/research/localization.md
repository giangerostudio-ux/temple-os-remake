# Localization (i18n) Research

## Overview

Supporting multiple languages in the TempleOS UI.

---

## Scope

### Phase 1: English Only (Current)
- All text in English
- Foundation for translation

### Phase 2: Add Translation Support
- Extract strings to locale files
- Implement translation loading
- Add language selector

### Phase 3: Community Translations
- Provide translation template
- Accept community contributions
- Add more languages

---

## Languages to Consider

| Priority | Language | Code | Reason |
|----------|----------|------|--------|
| High | English | en | Default |
| High | Spanish | es | Large user base |
| High | German | de | Strong Linux community |
| Medium | French | fr | Significant market |
| Medium | Portuguese | pt | Brazil market |
| Medium | Russian | ru | Active tech community |
| Medium | Japanese | ja | Gaming market |
| Medium | Chinese | zh | Large market |
| Medium | Greek | el | Developer's preference? |
| Low | Others | * | Community contributed |

---

## Architecture

### Locale Files Structure

```
locales/
├── en/
│   ├── common.json       # Shared strings
│   ├── terminal.json     # Terminal-specific
│   ├── settings.json     # Settings panel
│   └── errors.json       # Error messages
├── es/
│   └── ...
├── de/
│   └── ...
└── index.js              # Locale loader
```

### String Format

```json
// locales/en/common.json
{
  "app": {
    "name": "TempleOS",
    "tagline": "Divine Computing Environment"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm"
  },
  "files": {
    "open": "Open",
    "close": "Close",
    "newFile": "New File",
    "newFolder": "New Folder"
  }
}
```

### Interpolation

```json
{
  "files": {
    "deleteConfirm": "Delete {{filename}}?",
    "itemCount": "{{count}} items",
    "sizeDisplay": "{{size}} {{unit}}"
  }
}
```

---

## Implementation (TypeScript)

### Translation Function

```typescript
// i18n.ts
import en from './locales/en/common.json';

type Locale = 'en' | 'es' | 'de' | 'fr';

let currentLocale: Locale = 'en';
let translations: Record<string, unknown> = en;

export async function setLocale(locale: Locale) {
  currentLocale = locale;
  translations = await import(`./locales/${locale}/common.json`);
  // Trigger UI re-render
  document.dispatchEvent(new CustomEvent('locale-changed'));
}

export function t(key: string, params?: Record<string, string>): string {
  // Get nested key: "files.open" -> translations.files.open
  const keys = key.split('.');
  let value: unknown = translations;
  
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  
  if (typeof value !== 'string') {
    console.warn(`Missing translation: ${key}`);
    return key;
  }
  
  // Replace {{params}}
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] || '');
  }
  
  return value;
}

export function getLocale(): Locale {
  return currentLocale;
}
```

### Usage in Components

```typescript
import { t } from './i18n';

function renderWindow(win: WindowState): string {
  return `
    <div class="window">
      <div class="window-header">
        <span>${win.title}</span>
        <button aria-label="${t('actions.close')}">×</button>
      </div>
    </div>
  `;
}

function confirmDelete(filename: string) {
  const message = t('files.deleteConfirm', { filename });
  // show dialog with message
}
```

---

## Language Detection

### Priority Order

1. User setting (if saved)
2. System/browser language
3. Fallback to English

```typescript
function detectLanguage(): Locale {
  // Check saved preference
  const saved = localStorage.getItem('language') as Locale;
  if (saved && isValidLocale(saved)) return saved;
  
  // Check system language
  const systemLang = navigator.language.split('-')[0];
  if (isValidLocale(systemLang)) return systemLang as Locale;
  
  // Fallback
  return 'en';
}
```

---

## Date/Time/Number Formatting

Use `Intl` API for locale-aware formatting:

```typescript
// Date formatting
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(currentLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

// Number formatting
function formatNumber(n: number): string {
  return new Intl.NumberFormat(currentLocale).format(n);
}

// File size
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size > 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${formatNumber(Math.round(size * 10) / 10)} ${units[unit]}`;
}
```

---

## Right-to-Left (RTL) Support

For Arabic, Hebrew, etc:

```css
/* Base LTR */
html[dir="ltr"] { direction: ltr; }

/* RTL override */
html[dir="rtl"] {
  direction: rtl;
}

html[dir="rtl"] .window-title {
  flex-direction: row-reverse;
}

html[dir="rtl"] .sidebar {
  border-left: none;
  border-right: 1px solid var(--border);
}
```

```typescript
// Set direction based on locale
const rtlLocales = ['ar', 'he', 'fa'];
function setDirection(locale: Locale) {
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
}
```

---

## Language Selector UI

```
┌────────────────────────────────────────────────┐
│           🌐 LANGUAGE                          │
├────────────────────────────────────────────────┤
│                                                │
│  Select language:                              │
│  ┌────────────────────────────────┐           │
│  │ 🇬🇧 English                    ✓│           │
│  │ 🇪🇸 Español                     │           │
│  │ 🇩🇪 Deutsch                     │           │
│  │ 🇫🇷 Français                    │           │
│  │ 🇧🇷 Português                   │           │
│  │ 🇷🇺 Русский                     │           │
│  │ 🇯🇵 日本語                      │           │
│  │ 🇨🇳 中文                        │           │
│  │ 🇬🇷 Ελληνικά                    │           │
│  └────────────────────────────────┘           │
│                                                │
│  Note: Some translations may be incomplete.    │
│  [Help us translate!]                          │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Translation Workflow

### For Developers

1. Add new string to English locale file
2. Use `t()` function in code
3. Document string for translators

### For Translators

1. Fork repository
2. Copy `locales/en/` to `locales/[lang]/`
3. Translate strings
4. Submit pull request

### Translation Template

```json
// locales/TEMPLATE/common.json
{
  "_meta": {
    "language": "Language Name",
    "code": "xx",
    "direction": "ltr",
    "translator": "Your Name",
    "completion": "0%"
  },
  "app": {
    "name": "TempleOS",  // Usually don't translate brand
    "tagline": "[TRANSLATE: Divine Computing Environment]"
  }
}
```

---

## Fallback Strategy

If translation missing:

1. Try parent locale (e.g., `es-MX` → `es`)
2. Fall back to English
3. If still missing, show key name (for debugging)

```typescript
function getTranslation(key: string): string {
  // Try current locale
  let value = translations[currentLocale]?.[key];
  if (value) return value;
  
  // Try parent locale
  const parentLocale = currentLocale.split('-')[0];
  value = translations[parentLocale]?.[key];
  if (value) return value;
  
  // Fallback to English
  value = translations['en']?.[key];
  if (value) return value;
  
  // Return key as last resort (dev mode)
  console.warn(`Missing translation: ${key}`);
  return key;
}
```

---

## Pluralization

Handle different plural forms:

```json
{
  "files": {
    "itemCount_zero": "No items",
    "itemCount_one": "1 item",
    "itemCount_other": "{{count}} items"
  }
}
```

```typescript
function tPlural(key: string, count: number): string {
  const pluralRules = new Intl.PluralRules(currentLocale);
  const rule = pluralRules.select(count);
  const pluralKey = `${key}_${rule}`;
  return t(pluralKey, { count: count.toString() });
}
```

---

## Strings to Translate

Count by category:

| Category | Est. String Count |
|----------|-------------------|
| Common actions | ~30 |
| Window/desktop | ~20 |
| Terminal | ~50 |
| File browser | ~40 |
| Settings | ~80 |
| Error messages | ~30 |
| Word of God | ~10 (UI only) |
| Boot sequence | ~10 |
| **Total** | **~270 strings** |

---

## Implementation Checklist

- [ ] Create locale file structure
- [ ] Implement `t()` translation function
- [ ] Add language detection
- [ ] Create English base locale file
- [ ] Add language selector to settings
- [ ] Extract all hardcoded strings to locale files
- [ ] Implement date/number formatting
- [ ] Add RTL support (if needed)
- [ ] Implement fallback strategy
- [ ] Create translation guide for contributors
- [ ] Add first additional language (Spanish?)
- [ ] Test complete language switch
