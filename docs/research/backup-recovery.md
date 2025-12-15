# Backup and Recovery Research

## Overview

How users will backup their data and recover from system failures.

---

## What Needs Backing Up

| Data | Location | Importance |
|------|----------|------------|
| User documents | `/home/temple/Documents` | Critical |
| Downloads | `/home/temple/Downloads` | Medium |
| Settings | `/home/temple/.templeos/` | High |
| App data | `/home/temple/.config/` | High |
| Game saves | `/home/temple/.local/share/Steam/` | High |
| Browser data | Varies by browser | Medium |

---

## Backup Strategies

### 1. Manual File Copy

**Simplest approach:**
- User copies files to external drive
- File browser shows "backup" option
- Just a folder copy

```
┌────────────────────────────────────────────────┐
│              💾 MANUAL BACKUP                  │
├────────────────────────────────────────────────┤
│                                                │
│  Select folders to backup:                     │
│  [x] Documents          (2.3 GB)              │
│  [x] Downloads          (5.1 GB)              │
│  [x] Settings           (15 MB)               │
│  [x] Game Saves         (1.2 GB)              │
│  [ ] Entire home folder (12.5 GB)             │
│                                                │
│  Backup to: [Select destination...]           │
│                                                │
│  [Start Backup]                               │
│                                                │
└────────────────────────────────────────────────┘
```

### 2. Scheduled Backups

```
┌────────────────────────────────────────────────┐
│          📅 SCHEDULED BACKUPS                  │
├────────────────────────────────────────────────┤
│                                                │
│  Enable automatic backups: [ON]               │
│                                                │
│  Frequency: [Daily ▼]                         │
│  Time: [2:00 AM ▼]                            │
│  Keep backups: [7 days ▼]                     │
│                                                │
│  Destination:                                  │
│  ○ External USB drive                         │
│  ○ Network location (NFS/SMB)                 │
│  ● Cloud sync (Nextcloud)                     │
│                                                │
│  [Configure Cloud]                            │
│                                                │
└────────────────────────────────────────────────┘
```

### 3. Cloud Sync (Optional)

Integration options:
- **Syncthing** - P2P, no cloud server needed
- **Nextcloud** - Self-hosted cloud
- **rclone** - Supports many cloud providers

```bash
# Syncthing (recommended for privacy)
apk add syncthing
syncthing -gui-address=0.0.0.0:8384

# rclone (for Google Drive, Dropbox, etc.)
apk add rclone
rclone config  # Set up providers
rclone sync /home/temple/Documents remote:backup/
```

---

## System Snapshots

### Using Btrfs (If filesystem supports it)

```bash
# Create snapshot before update
btrfs subvolume snapshot /home /home/.snapshots/$(date +%Y%m%d)

# List snapshots
btrfs subvolume list /home/.snapshots

# Restore from snapshot
btrfs subvolume delete /home
btrfs subvolume snapshot /home/.snapshots/20240115 /home
```

### Using rsync for Incremental Backups

```bash
# Incremental backup with hard links
rsync -av --link-dest=/backup/latest \
  /home/temple/ /backup/$(date +%Y%m%d)/
ln -sfn /backup/$(date +%Y%m%d) /backup/latest
```

---

## Recovery Options

### Recovery Mode (GRUB Menu)

```
┌─────────────────────────────────────────────────┐
│            TEMPLEOS RECOVERY                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  → Reset to factory defaults                    │
│    Restore from backup                          │
│    Repair file system                          │
│    Open recovery terminal                      │
│    Reinstall system                            │
│    Boot previous version                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Factory Reset

Wipes settings but keeps user files:

```bash
#!/bin/sh
# factory-reset.sh

# Reset system settings
rm -rf /etc/templeos/*
cp -r /etc/templeos.default/* /etc/templeos/

# Reset user app settings
rm -rf /home/temple/.templeos
rm -rf /home/temple/.config/templeos

# Keep user documents, downloads, etc.

echo "Factory reset complete. Reboot required."
```

### Full System Restore

From backup USB:

```bash
#!/bin/sh
# full-restore.sh

BACKUP_MOUNT="/mnt/backup"

# Mount backup drive
mount /dev/sdb1 $BACKUP_MOUNT

# Restore home directory
rsync -av $BACKUP_MOUNT/home/ /home/

# Restore settings
rsync -av $BACKUP_MOUNT/etc/templeos/ /etc/templeos/

umount $BACKUP_MOUNT
echo "Restore complete. Reboot required."
```

---

## Data Recovery (Deleted Files)

### Trash/Recycle Bin

Implement in file manager:

```
/home/temple/.local/share/Trash/
├── files/          # Deleted files
└── info/           # Metadata (original path, deletion date)
```

### Undelete Tool (Advanced)

For recovery after permanent delete:

```bash
# photorec for file recovery
apk add testdisk
photorec /dev/sda1
```

---

## Encryption Recovery

### Encryption Password Lost

**CANNOT BE RECOVERED** - by design

Show warning during setup:
```
⚠️ IMPORTANT: Write down your encryption password!

If you forget this password, your data CANNOT be recovered.
There is no backdoor, no reset, no recovery option.

Consider:
• Writing it on paper and storing safely
• Using a password manager on another device
• Creating a backup recovery key
```

### LUKS Recovery Key (Optional)

During setup, offer backup key:

```bash
# Add backup key slot
cryptsetup luksAddKey /dev/sda2 /path/to/backup-key

# User saves backup-key to external location
```

---

## Backup UI in Settings

```
┌────────────────────────────────────────────────┐
│              💾 BACKUP & RESTORE               │
├────────────────────────────────────────────────┤
│                                                │
│  BACKUP                                        │
│  ├─ Last backup: Today, 2:00 AM               │
│  ├─ [Backup Now]                              │
│  └─ [Configure Scheduled Backups]             │
│                                                │
│  RESTORE                                       │
│  ├─ [Restore from Backup]                     │
│  └─ [Factory Reset]                           │
│                                                │
│  CLOUD SYNC                                    │
│  ├─ Status: Connected (Nextcloud)             │
│  └─ [Configure Cloud Sync]                    │
│                                                │
│  RECOVERY DRIVE                                │
│  └─ [Create Recovery USB]                     │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Recovery USB Creation

Let users create a recovery drive:

```bash
#!/bin/bash
# create-recovery-usb.sh

USB_DEVICE=$1  # e.g., /dev/sdb

# Confirm
read -p "This will ERASE $USB_DEVICE. Continue? (y/n) " confirm
[ "$confirm" != "y" ] && exit 1

# Write recovery ISO
dd if=/opt/templeos/recovery.iso of=$USB_DEVICE bs=4M status=progress

echo "Recovery USB created!"
```

---

## Implementation Checklist

- [ ] Implement file browser backup option
- [ ] Add trash/recycle bin
- [ ] Create backup script
- [ ] Add scheduled backup service
- [ ] Integrate Syncthing (optional)
- [ ] Create recovery menu in GRUB
- [ ] Implement factory reset
- [ ] Create restore from backup tool
- [ ] Add backup UI to settings
- [ ] Create recovery USB tool
- [ ] Document recovery procedures
