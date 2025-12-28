
import { escapeHtml, generateId } from '../utils/helpers';

interface Reminder {
    id: string;
    day: number;
    month: number;
    year: number;
    text: string;
}

export class CalendarApp {
    private currentDate: Date;
    private reminders: Reminder[] = [];
    private onNotify: (title: string, message: string) => void;

    // UI State
    public selectedDay: number | null = null;
    public showReminderDialog: boolean = false;

    // Decoy mode support
    private isDecoyMode: boolean = false;
    private realRemindersBackup: Reminder[] | null = null;

    // Static Data
    private monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    private holidays: Record<string, string> = {
        '1-1': 'Solemnity of Mary',
        '1-6': 'Epiphany',
        '2-14': 'St. Valentine',
        '3-17': 'St. Patrick',
        '3-19': 'St. Joseph',
        '3-25': 'Annunciation',
        '6-24': 'Nativity of St John',
        '6-29': 'Sts Peter & Paul',
        '8-6': 'Transfiguration',
        '8-15': 'Assumption of Mary',
        '9-29': 'Archangels',
        '11-1': 'All Saints',
        '11-2': 'All Souls',
        '12-8': 'Immaculate Conception',
        '12-25': 'Christmas'
    };

    constructor(onNotify: (title: string, message: string) => void) {
        this.currentDate = new Date();
        this.onNotify = onNotify;
        this.loadReminders();
        this.checkTodayReminders();
    }

    // Decoy mode: hide real reminders
    public setDecoyMode(isDecoy: boolean) {
        if (isDecoy && !this.isDecoyMode) {
            // Entering decoy mode - backup real reminders
            this.realRemindersBackup = [...this.reminders];
            this.reminders = []; // Empty calendar in decoy mode
            this.isDecoyMode = true;
        } else if (!isDecoy && this.isDecoyMode) {
            // Exiting decoy mode - restore real reminders
            if (this.realRemindersBackup) {
                this.reminders = this.realRemindersBackup;
                this.realRemindersBackup = null;
            }
            this.isDecoyMode = false;
        }
    }

    private loadReminders() {
        try {
            const raw = localStorage.getItem('temple_calendar_reminders');
            if (raw) {
                this.reminders = JSON.parse(raw);
            }
        } catch {
            this.reminders = [];
        }
    }

    private saveReminders() {
        localStorage.setItem('temple_calendar_reminders', JSON.stringify(this.reminders));
    }

    public checkTodayReminders() {
        // This could be called on startup or periodically
        const now = new Date();
        const todayReminders = this.reminders.filter(r =>
            r.day === now.getDate() &&
            r.month === now.getMonth() &&
            r.year === now.getFullYear()
        );

        todayReminders.forEach(r => {
            this.onNotify('Calendar', `Reminder: ${r.text}`);
        });
    }

    public changeMonth(delta: number) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.currentDate = new Date(this.currentDate); // trigger update?
        this.selectedDay = null; // deselect
    }

    public selectDay(day: number) {
        this.selectedDay = day;
        this.showReminderDialog = false; // reset dialog
    }

    public openReminderDialog() {
        if (this.selectedDay) {
            this.showReminderDialog = true;
        }
    }

    public addReminder(text: string) {
        if (this.selectedDay && text.trim()) {
            this.reminders.push({
                id: generateId('rem'),
                day: this.selectedDay,
                month: this.currentDate.getMonth(),
                year: this.currentDate.getFullYear(),
                text: text.trim()
            });
            this.saveReminders();
            this.showReminderDialog = false;

            // If it's today, notify instantly for feedback
            const now = new Date();
            if (this.selectedDay === now.getDate() &&
                this.currentDate.getMonth() === now.getMonth() &&
                this.currentDate.getFullYear() === now.getFullYear()) {
                this.onNotify('Calendar', `Remind Reset: ${text}`);
            }
        }
    }

    public deleteReminder(id: string) {
        this.reminders = this.reminders.filter(r => r.id !== id);
        this.saveReminders();
    }

    public render(): string {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const now = new Date();
        const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;

        let daysHtml = '';
        // Empty cells
        for (let i = 0; i < firstDay; i++) {
            daysHtml += `<div style="border: 1px solid #333; background: #050505;"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === now.getDate();
            const isSelected = this.selectedDay === day;

            // Check Reminders
            const dayReminders = this.reminders.filter(r => r.day === day && r.month === month && r.year === year);
            const holidayKey = `${month + 1}-${day}`;
            const holiday = this.holidays[holidayKey];

            daysHtml += `
               <div class="calendar-day ${isSelected ? 'selected' : ''}" 
                    data-cal-day="${day}"
                    style="border: 1px solid ${isSelected ? '#00ff41' : '#222'}; height: 100px; padding: 5px; position: relative; 
                           background: ${isSelected ? 'rgba(0,255,65,0.2)' : (isToday ? 'rgba(0,255,65,0.1)' : 'transparent')}; 
                           cursor: pointer; overflow: hidden; display: flex; flex-direction: column;">
                   
                   <div style="display: flex; justify-content: space-between;">
                      <span style="font-weight: bold; ${isToday ? 'text-decoration: underline;' : ''}">${day}</span>
                      ${dayReminders.length > 0 ? `<span style="font-size: 10px;">🔔 ${dayReminders.length}</span>` : ''}
                   </div>
                   
                   ${holiday ? `<div style="font-size: 10px; color: #ffd700; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(holiday)}</div>` : ''}
                   
                   <div style="flex: 1; overflow-y: auto; margin-top: 4px; font-size: 10px; opacity: 0.8; scrollbar-width: none;">
                        ${dayReminders.map(r => `
                            <div style="background: rgba(0,255,65,0.1); padding: 1px 3px; margin-bottom: 2px;">${escapeHtml(r.text)}</div>
                        `).join('')}
                   </div>
               </div>`;
        }

        return `
      <div class="calendar-app" style="height: 100%; display: flex; flex-direction: column; background: #000; color: #00ff41;">
           <div style="padding: 10px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #00ff41;">
               <button class="cal-nav-btn" data-cal-action="prev" style="background: none; border: 1px solid #00ff41; color: #00ff41; cursor: pointer;">◀</button>
               <div style="font-size: 20px; font-weight: bold; text-align: center;">
                   ${this.monthNames[month]} ${year}
                   <button class="cal-today-btn" data-cal-action="today" style="font-size: 12px; background: none; border: none; color: #ffd700; cursor: pointer; margin-left: 10px;">(Today)</button>
               </div>
               <button class="cal-nav-btn" data-cal-action="next" style="background: none; border: 1px solid #00ff41; color: #00ff41; cursor: pointer;">▶</button>
           </div>
           
           <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; border-bottom: 1px solid #333; padding: 5px; font-weight: bold; background: #111;">
               <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
           </div>
           
           <div style="flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); overflow-y: auto;">
               ${daysHtml}
           </div>

           ${this.renderDialog()}
      </div>
      `;
    }

    private renderDialog(): string {
        if (!this.selectedDay) return '';

        const dayReminders = this.reminders.filter(r => r.day === this.selectedDay && r.month === this.currentDate.getMonth() && r.year === this.currentDate.getFullYear());

        return `
        <div style="padding: 10px; border-top: 2px solid #00ff41; background: #050505; height: 150px; display: flex; flex-direction: column;">
            <div style="margin-bottom: 5px; font-weight: bold; display: flex; justify-content: space-between;">
                <span>${this.monthNames[this.currentDate.getMonth()]} ${this.selectedDay}</span>
                <button class="cal-btn-add" data-cal-action="add-dialog" style="background: #00ff41; color: #000; border: none; padding: 2px 8px; cursor: pointer; font-weight: bold;">+ Add Reminder</button>
            </div>
            
            ${this.showReminderDialog ? `
                <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                    <input class="cal-reminder-input" placeholder="Remind me to..." style="flex: 1; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px;">
                    <button class="cal-btn-save" data-cal-action="save-reminder" style="background: #00ff41; color: #000; border: none; padding: 5px;">Save</button>
                    <button class="cal-btn-cancel" data-cal-action="cancel-reminder" style="background: #333; color: #fff; border: none; padding: 5px;">X</button>
                </div>
            ` : ''}

            <div style="flex: 1; overflow-y: auto;">
                ${dayReminders.length === 0 ? '<div style="opacity: 0.5; font-style: italic;">No reminders for this day.</div>' : ''}
                ${dayReminders.map(r => `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding: 4px 0;">
                        <span>${escapeHtml(r.text)}</span>
                        <button class="cal-btn-del" data-cal-action="delete-reminder" data-cal-id="${r.id}" style="background: none; border: none; color: #ff6464; cursor: pointer;">x</button>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    }
}
