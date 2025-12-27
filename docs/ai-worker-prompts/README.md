# AI Worker Prompts - TempleOS Remake Codebase Fixes

This folder contains **modular prompts** for parallel AI workers.
Each phase is independent and can be assigned to different AI assistants simultaneously.

## Quick Reference

| File | Focus | Est. Time | Dependencies |
|------|-------|-----------|--------------|
| `PHASE_1_CLEANUP.md` | Delete dead code, fix obvious bugs | 30 min | None |
| `PHASE_2_EXTRACT_WINDOW_MANAGER.md` | Extract WindowManager from main.ts | 2-3 hrs | None |
| `PHASE_3_EXTRACT_UI_COMPONENTS.md` | Extract Taskbar, Desktop, ContextMenu | 2-3 hrs | None |
| `PHASE_4_TYPE_SAFETY.md` | Replace `any` types, enable strict mode | 2-3 hrs | None |
| `PHASE_5_ERROR_HANDLING.md` | Fix silent catches, add logging | 1-2 hrs | None |
| `PHASE_6_SECURITY.md` | Add path validation, input sanitization | 1-2 hrs | None |
| `PHASE_7_TIMER_CLEANUP.md` | Fix memory leaks from uncleaned timers | 1-2 hrs | None |
| `PHASE_8_MAIN_CJS_REFACTOR.md` | Split main.cjs into modules | 2-3 hrs | None |

## How to Use

1. Open multiple AI chat windows (Claude, ChatGPT, Gemini, etc.)
2. Copy ONE phase prompt to each worker
3. Let them work in parallel - phases have no dependencies
4. Merge their changes via git branches
