# Technology Stack

## Core Runtime
- **Platform**: Electron (v33+)
- **Target OS**: Linux (Ubuntu-based), Windows (Dev only).
- **Window Management**: Custom implementation handling `_NET_WM_STATE` hints (e.g. `_NET_WM_STATE_BELOW` for desktop).

## Frontend
- **Framework**: Vite + Vanilla HTML/CSS (Architecture mimics HolyC simplicity).
- **Language**: TypeScript (Strict Mode).
- **Styling**: Raw CSS Variables for theming (No Tailwind, unless requested).
- **Editor Component**: CodeMirror 6 with custom syntax highlighting.
- **Terminal Component**: xterm.js + node-pty.

## Backend / System
- **Node.js**: 20+
- **IPC**: Heavily used for X11 window control (resizing, snapping, focusing).
- **Scripts**: Bash (`start-templeos.sh`) for session management.

## Key Libraries
- `@codemirror/*`: For the "Holy" code editor.
- `@xterm/xterm`: For the system terminal.
- `electron-builder`: For creating the distributable / ISO assets.

## User Protocols
- **"Ultrathink"**: When active, prioritize architectural depth, performance (reflow/repaint), and custom implementations over generics.
- **"Zero Fluff"**: Default mode. Concise, active code solutions. No lectures.
