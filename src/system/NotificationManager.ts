
export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    type: 'info' | 'warning' | 'error' | 'divine';
    actions?: Array<{ id: string; label: string }>;
}

export class NotificationManager {
    private notifications: Notification[] = [];
    private activeToasts: Notification[] = [];
    private doNotDisturb = false;
    private recentNotificationKeyTimestamps = new Map<string, number>();
    private onChangeCallback: (() => void) | null = null;
    private onPlaySoundCallback: ((type: string) => void) | null = null;

    constructor() {
        // No persistence needed for now as per original code, or could add localstorage
    }

    public setOnChangeCallback(callback: () => void) {
        this.onChangeCallback = callback;
    }

    public setOnPlaySoundCallback(callback: (type: string) => void) {
        this.onPlaySoundCallback = callback;
    }

    public setDoNotDisturb(enabled: boolean) {
        this.doNotDisturb = enabled;
        // If enabling DND, maybe clear toasts? Original code doesn't specify, but let's leave them or clear them.
        // If enabling DND, existing toasts might stay until timeout. 
        this.triggerChange();
    }

    public getDoNotDisturb(): boolean {
        return this.doNotDisturb;
    }

    public getNotifications(): Notification[] {
        return this.notifications;
    }

    public getUnreadCount(): number {
        return this.notifications.filter(n => !n.read).length;
    }

    public markAllRead() {
        this.notifications.forEach(n => n.read = true);
        this.triggerChange();
    }

    public markAsRead(id: string) {
        const n = this.notifications.find(n => n.id === id);
        if (n && !n.read) {
            n.read = true;
            this.triggerChange();
        }
    }

    public show(
        title: string,
        message: string,
        type: 'info' | 'warning' | 'error' | 'divine' = 'info',
        actions?: Array<{ id: string; label: string }>
    ) {
        const normalizedTitle = title.trim().toLowerCase();
        const normalizedMessage = message.trim().toLowerCase();

        // Suppress legacy debug spam
        if (normalizedTitle === 'system' && (
            normalizedMessage === 'menu active' ||
            normalizedMessage === 'context menu active' ||
            normalizedMessage === 'context menu closed' ||
            normalizedMessage === 'menu closed'
        )) {
            return;
        }

        // Deduplication (debounce 2s)
        const key = `${normalizedTitle}|${normalizedMessage}`;
        const lastTime = this.recentNotificationKeyTimestamps.get(key) || 0;
        const now = Date.now();
        if (now - lastTime < 2000) {
            return;
        }
        this.recentNotificationKeyTimestamps.set(key, now);

        // Limit history to 50
        if (this.notifications.length >= 50) {
            this.notifications.pop();
        }

        const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification: Notification = {
            id,
            title,
            message,
            timestamp: now,
            read: false,
            type,
            actions
        };

        // Add to history
        this.notifications.unshift(notification);

        if (!this.doNotDisturb) {
            // Add to active toasts
            this.activeToasts.push(notification);

            // Play sound
            if (this.onPlaySoundCallback) {
                this.onPlaySoundCallback(type);
            }

            // Auto dismiss toast after 5 seconds
            setTimeout(() => {
                this.dismissToast(id);
            }, 5000);
        }

        this.triggerChange();
    }

    public dismissToast(id: string) {
        const initialLen = this.activeToasts.length;
        this.activeToasts = this.activeToasts.filter(t => t.id !== id);
        if (this.activeToasts.length !== initialLen) {
            this.triggerChange();
        }
    }

    public dismissNotification(id: string) {
        // Also remove from toasts if present
        this.dismissToast(id);

        this.notifications = this.notifications.filter(n => n.id !== id);
        this.triggerChange();
    }

    public clickNotification(id: string) {
        // Mark the notification as read when clicked
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.triggerChange();
        }
    }

    public renderToasts(): string {
        if (this.activeToasts.length === 0) return '';

        return this.activeToasts.map(toast => `
            <div class="toast ${toast.type}" data-toast-id="${toast.id}">
              <div class="toast-header">
                <span style="color: ${this.getNotificationColor(toast.type)}">${toast.title}</span>
                <button class="toast-close" data-toast-action="dismiss" data-toast-id="${toast.id}" style="background: none; border: none; font: inherit;">x</button>
              </div>
              <div class="toast-body">${toast.message}</div>
              ${toast.actions && toast.actions.length ? `
                <div style="display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end;">
                  ${toast.actions.map(a => `
                    <button class="toast-action-btn" data-toast-action="action" data-toast-id="${toast.id}" data-action-id="${a.id}" style="background: none; border: 1px solid rgba(0,255,65,0.35); color: #00ff41; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px;">${a.label}</button>
                  `).join('')}
                </div>
              ` : ''}
            </div>
        `).join('');
    }

    public renderPopup(): string {
        const unread = this.notifications.filter(n => !n.read).length;
        return `
            <div class="tray-popup notification-popup" style="
              position: absolute;
              bottom: 40px;
              right: 40px;
              width: 320px;
              max-height: 420px;
              overflow-y: auto;
              background: rgba(13,17,23,0.96);
              border: 2px solid #ffd700;
              z-index: 10000;
              padding: 10px;
              font-family: 'VT323', monospace;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            ">
              <div style="border-bottom: 1px solid rgba(255,215,0,0.25); padding-bottom: 6px; margin-bottom: 10px; font-weight: bold; color: #ffd700; display: flex; justify-content: space-between; align-items: center;">
                <span>Divine Messages ${unread ? `(${unread})` : ''}</span>
                <button class="dnd-btn" style="background: none; border: none; cursor: pointer; font-size: 16px;" title="${this.doNotDisturb ? 'Turn OFF Do Not Disturb' : 'Turn ON Do Not Disturb'}">
                  ${this.doNotDisturb ? '🔕' : '🔔'}
                </button>
              </div>

              <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <button class="notif-btn" data-notif-action="mark-all-read" style="flex: 1; background: none; border: 1px solid rgba(255,215,0,0.35); color: #ffd700; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Mark all read</button>
                <button class="notif-btn" data-notif-action="clear" style="flex: 1; background: none; border: 1px solid rgba(255,215,0,0.35); color: #ffd700; padding: 6px 10px; border-radius: 6px; cursor: pointer;">Clear</button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${this.notifications.length === 0 ? `
                  <div style="text-align: center; padding: 20px; opacity: 0.7;">
                    <div style="font-size: 24px; margin-bottom: 10px;">🕊️</div>
                    <div>No new revelations.</div>
                    <div style="font-size: 12px; color: #00ff41; font-style: italic;">"Be still, and know that I am God."</div>
                  </div>
                ` : this.notifications.map(n => `
                  <div class="notification-item ${!n.read ? 'unread' : ''}" data-notif-id="${n.id}" style="cursor: pointer;">
                    <div style="font-weight: bold; color: ${this.getNotificationColor(n.type)}">${n.title}</div>
                    <div style="font-size: 14px;">${n.message}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                      <span class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</span>
                      <button class="notif-btn" data-notif-action="dismiss" data-notif-id="${n.id}" style="background: none; border: 1px solid rgba(255,215,0,0.25); color: #ffd700; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">Dismiss</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
        `;
    }

    public clearAll() {
        this.notifications = [];
        this.triggerChange();
    }

    private triggerChange() {
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
    }

    private getNotificationColor(type: string): string {
        switch (type) {
            case 'divine': return '#00ff41';
            case 'error': return '#ff0000';
            case 'warning': return '#ffff00';
            default: return '#fff';
        }
    }
}
