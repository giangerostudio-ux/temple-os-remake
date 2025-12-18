# TempleOS Remake - Next Session Instructions

## Project Context
You are working on the **TempleOS Remake**, a project that recreates the aesthetic and feeling of TempleOS but runs as a custom frontend on top of a standard **Ubuntu 24.04** installation.

- **Architecture:** Electron + TypeScript (Frontend) communicating with Node.js (Backend) which calls system commands (`wpctl`, `nmcli`, `xrandr`, `bluetoothctl`, etc.).
- **Current State:** The frontend UI for settings is largely complete and "wired" to event listeners, but the backend IPC handlers in `electron/main.cjs` are **MISSING**. This results in a "fake OS" feel where controls move but nothing happens.

## Your Mission
Your goal is to make the settings functional by implementing the missing Backend Logic.

## Critical Resource
**READ THIS FILE FIRST:** `COMPREHENSIVE_AUDIT.md` (Located in the root of this project).
This file contains the **Exact Implementation Specification** for every missing feature. It lists the IPC channel names, the required function signatures, and even the shell commands you need to run.

## Tasks
1.  **Read `COMPREHENSIVE_AUDIT.md`** carefully.
2.  **Edit `electron/main.cjs`**:
    - Implement the missing IPC handlers (Audio, Display, Mouse, Network, Bluetooth).
    - Use the helper function `execAsync` (which already exists in the file) to run the shell commands defined in the audit.
    - **IMPORTANT:** Adhere strictly to the parameter signatures defined in the audit. The frontend (`preload.cjs`) sends arguments in specific ways (sometimes wrapped in objects). Mismatches will cause runtime errors.
3.  **Edit `src/main.ts` (Frontend)**:
    - There is one known missing handler: The **Bluetooth Scan Button** (`.bt-scan-btn`).
    - Add the click event listener for this button to trigger the `bluetooth:scan` IPC call.

## Verification
- After implementing a backend handler (e.g., Audio), verify that the CLI command works on Ubuntu 24.04 (mock it if you can't run it).
- Ensure the IPC response matches what the frontend expects (success/error objects).
