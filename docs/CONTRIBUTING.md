# Contributing & Pushing Updates

This guide explains how to push updates to the TempleOS Remake project.

## Repository

**GitHub**: https://github.com/giangerostudio-ux/temple-os-remake

---

## Quick Commands

### Check status
```bash
git status
```

### Stage all changes
```bash
git add -A
```

### Commit changes
```bash
git commit -m "Description of your changes"
```

### Push to GitHub
```bash
git push origin main
```

---

## Workflow

### Making Changes

1. Make your code changes
2. Test locally with `npm run electron:dev`
3. Stage changes: `git add -A`
4. Commit: `git commit -m "Your message"`
5. Push: `git push origin main`

### Commit Message Guidelines

Use clear, descriptive messages:
- `feat: Add Oracle random word generator`
- `fix: Terminal crash on special characters`
- `docs: Update Phase 3 documentation`
- `style: Improve taskbar hover effects`
- `refactor: Clean up window manager code`

---

## Updating the VM (Ubuntu 24.04 LTS)

Once the code is on GitHub, update the VM:

```bash
# SSH into VM or open terminal
cd /opt/templeos
git pull origin main
npm install  # If dependencies changed
# Restart the app or reboot
```

---

## Creating a Release

1. Update version in `package.json`
2. Commit: `git commit -m "Release v1.x.x"`
3. Tag the release:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. Create GitHub Release with changelog

---

## System Updater (Future)

In Phase 4, the System Updater app will:
- Check GitHub API for new releases
- Download and apply updates
- Show changelog to users
- Auto-update on boot (optional)

Example API check:
```javascript
const response = await fetch(
  'https://api.github.com/repos/giangerostudio-ux/temple-os-remake/releases/latest'
);
const release = await response.json();
console.log(release.tag_name); // "v1.1.0"
```
