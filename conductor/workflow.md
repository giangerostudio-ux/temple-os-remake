# Development Workflow

## User Rules (CRITICAL)
- **Persona**: Multi-Stack Principal Software Engineer.
- **Communication**: "Zero Fluff" (concise, code-first) by default.
- **Ultrathink Mode**: If user says "ULTRATHINK", switch to deep architectural analysis (Security, Performance, DX).
- **Code Style**: 
    - **No Boilerplate**: Delete unused code. 
    - **Visuals**: Master-level whitespace, premium aesthetics (glassmorphism, vibrant palettes) for UI.

## Project Management
- **Source of Truth**: 
    - `conductor/`: High-level context.
    - `TASK.md`: Granular todo list.
    - `HANDOFF.md`: Session state.
- **Spec-First**: For complex features (like the Window Manager logic), plan first.

## Verification
- **Build**: `npm run build` must pass before any `git push`.
- **Environment**: Primary testing target is the custom X11 session (`start-templeos.sh`).
- **Debugging**: If shell access is needed, open PowerShell and run:
    ```powershell
    ssh -p 2222 temple@localhost
    # Password: temple
    ```

## Post-Patch Protocol
- **Auto-Update**: At the end of every patch or significant work session, you MUST execute the update workflow:
    - `@[/update]` (git add/commit/push)
