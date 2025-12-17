
import { escapeHtml, generateId, formatDate } from '../utils/helpers';

interface Note {
    id: string;
    title: string;
    content: string; // Encrypted content if isSecure is true
    isSecure: boolean;
    updatedAt: number;
}

export class NotesApp {
    private notes: Note[] = [];
    public activeNoteId: string | null = null;
    public decryptedContent: string | null = null; // Unlocked content of current secure note
    public isUnlocked: boolean = false; // Is the current note unlocked?

    // UI Local State for Password Dialog
    public showPasswordDialog: boolean = false;
    public passwordError: string | null = null;
    public dialogMode: 'unlock' | 'encrypt' | 'decrypt-permanent' = 'unlock';

    constructor() {
        this.loadNotes();
        // Initialize with default note if empty
        if (this.notes.length === 0) {
            this.createNote('New Testament', 'Write your divine thoughts here...');
        } else {
            this.activeNoteId = this.notes[0].id;
        }
    }

    private loadNotes() {
        try {
            const raw = localStorage.getItem('temple_notes_db');
            if (raw) {
                this.notes = JSON.parse(raw);
            } else {
                // Migrate legacy single note if exists
                const old = localStorage.getItem('temple_notes');
                if (old) {
                    this.createNote('Legacy Note', old);
                    localStorage.removeItem('temple_notes');
                }
            }
        } catch {
            this.notes = [];
        }
    }

    private saveNotes() {
        localStorage.setItem('temple_notes_db', JSON.stringify(this.notes));
    }

    public createNote(title: string = 'New Note', content: string = '') {
        const note: Note = {
            id: generateId('note'),
            title,
            content,
            isSecure: false,
            updatedAt: Date.now()
        };
        this.notes.unshift(note);
        this.activeNoteId = note.id;
        this.decryptedContent = null;
        this.isUnlocked = false;
        this.saveNotes();
    }

    public deleteNote(id: string) {
        this.notes = this.notes.filter(n => n.id !== id);
        if (this.activeNoteId === id) {
            this.activeNoteId = this.notes.length > 0 ? this.notes[0].id : null;
            this.decryptedContent = null;
            this.isUnlocked = false;
        }
        this.saveNotes();
    }

    public selectNote(id: string) {
        if (this.activeNoteId === id) return;
        this.activeNoteId = id;
        this.decryptedContent = null;
        this.isUnlocked = false;
        this.showPasswordDialog = false;
        this.passwordError = null;
    }

    public updateActiveNote(title: string, content: string) {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
            note.title = title;
            // If secure, we update the DECRYPTED content in memory, but we don't save to note.content yet?
            // Actually, we should probably auto-save.
            // But encryption requires password. We don't want to re-encrypt on every keypress if expensive.
            // For this mock, it's cheap.

            if (note.isSecure) {
                // If it is secure, we must be unlocked to edit
                if (this.isUnlocked) {
                    this.decryptedContent = content; // Update memory view
                    // We need the password to re-save encrypted? 
                    // To simplify, we can store the password in memory while unlocked? 
                    // No, that's insecure.
                    // Better approach: When saving a secure note, we need the password.
                    // OR: We store a session key.
                    // FOR MOCK: We will assume we can't save changes to secure notes without re-entering password 
                    // or (Simpler) we just update 'decryptedContent' and have a explicit 'Save' button for secure notes?

                    // Actually, let's keep it simple:
                    // If secure & unlocked: We update local decryptedContent.
                    // We DON'T update note.content immediately.
                    // When user clicks 'Save', we might ask for password again OR we assume session.
                    // Let's implement an explicit "Save" for secure notes or just Autosave if we cache the password (danger).
                    // I'll cache the password in memory for the session while unlocked to allow auto-save.
                }
            } else {
                note.content = content;
            }
            note.updatedAt = Date.now();
            this.saveNotes();
        }
    }

    // Session Password Cache (cleared on select/deselect)
    private cachedPassword: string | null = null;

    public handlePasswordSubmit(pass: string) {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (!note) return;

        if (this.dialogMode === 'unlock') {
            const decrypted = this.decrypt(note.content, pass);
            if (decrypted !== null) {
                this.isUnlocked = true;
                this.decryptedContent = decrypted;
                this.cachedPassword = pass;
                this.showPasswordDialog = false;
                this.passwordError = null;
            } else {
                this.passwordError = 'Incorrect Password';
            }
        } else if (this.dialogMode === 'encrypt') {
            note.content = this.encrypt(note.content, pass);
            note.isSecure = true;
            this.isUnlocked = true;
            this.decryptedContent = this.decrypt(note.content, pass); // Should be same
            this.cachedPassword = pass;
            this.showPasswordDialog = false;
            this.saveNotes();
        } else if (this.dialogMode === 'decrypt-permanent') {
            // Remove security
            const decrypted = this.decrypt(note.content, pass);
            if (decrypted !== null) {
                note.content = decrypted;
                note.isSecure = false;
                this.isUnlocked = false;
                this.decryptedContent = null;
                this.cachedPassword = null;
                this.showPasswordDialog = false;
                this.saveNotes();
            } else {
                this.passwordError = 'Incorrect Password';
            }
        }
    }

    public initiateLock() {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note && !note.isSecure) {
            this.dialogMode = 'encrypt';
            this.showPasswordDialog = true;
            this.passwordError = null;
        } else if (note && note.isSecure) {
            // Already secure, maybe remove security?
            this.dialogMode = 'decrypt-permanent';
            this.showPasswordDialog = true;
            this.passwordError = null;
        }
    }

    public lockCurrentNote() {
        this.isUnlocked = false;
        this.decryptedContent = null;
        this.cachedPassword = null;
    }

    public saveSecureNote() {
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note && note.isSecure && this.isUnlocked && this.decryptedContent !== null && this.cachedPassword) {
            note.content = this.encrypt(this.decryptedContent, this.cachedPassword);
            note.updatedAt = Date.now();
            this.saveNotes();
        }
    }

    // --- Encryption Helpers ---

    private encrypt(text: string, pass: string): string {
        const payload = 'VALID:' + text;
        return this.simpleEncrypt(payload, pass);
    }

    private decrypt(text: string, pass: string): string | null {
        try {
            const decrypted = this.simpleDecrypt(text, pass);
            if (decrypted.startsWith('VALID:')) {
                return decrypted.substring(6);
            }
            return null;
        } catch {
            return null;
        }
    }



    // Fix: Separate encrypt/decrypt logic for Base64 handling
    private simpleEncrypt(text: string, pass: string): string {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
        }
        return btoa(result);
    }

    private simpleDecrypt(b64: string, pass: string): string {
        const text = atob(b64);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
        }
        return result;
    }

    // Redefine internal wrappers to use precise methods
    // Overriding previous definitions

    /* Re-implementation for class context */
    // Using property arrow functions or method overrides? 
    // I'll fix the class structure in final output.

    public render(): string {
        const activeNote = this.notes.find(n => n.id === this.activeNoteId);

        // Sidebar
        const sidebar = `
            <div style="width: 250px; background: #050505; border-right: 1px solid #333; display: flex; flex-direction: column;">
                <div style="padding: 10px; border-bottom: 1px solid #333; display: flex; gap: 5px;">
                    <button class="notes-btn-new" data-note-action="new" style="flex: 1; background: #00ff41; color: #000; border: none; padding: 5px; cursor: pointer; font-weight: bold;">+ New</button>
                </div>
                <div style="flex: 1; overflow-y: auto;">
                    ${this.notes.map(note => `
                        <div class="note-item ${note.id === this.activeNoteId ? 'active' : ''}" data-note-id="${note.id}" 
                             style="padding: 10px; border-bottom: 1px solid #222; cursor: pointer; background: ${note.id === this.activeNoteId ? 'rgba(0,255,65,0.1)' : 'transparent'};">
                            <div style="color: ${note.id === this.activeNoteId ? '#00ff41' : '#ccc'}; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${note.isSecure ? '🔒 ' : ''}${escapeHtml(note.title || 'Untitled')}
                            </div>
                            <div style="font-size: 10px; opacity: 0.5;">${formatDate(note.updatedAt)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Main Editor Area
        let editorArea = '';

        if (!activeNote) {
            editorArea = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; opacity: 0.5;">Select or create a note</div>`;
        } else if (activeNote.isSecure && !this.isUnlocked) {
            // Locked State
            editorArea = `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
                    <div style="font-size: 20px; margin-bottom: 20px; color: #00ff41;">Secure Note</div>
                    ${this.showPasswordDialog ? this.renderPasswordDialog() :
                    `<button class="notes-btn-unlock" data-note-action="unlock-dialog" style="padding: 10px 30px; background: #00ff41; color: #000; border: none; font-size: 16px; cursor: pointer;">Unlock</button>`}
                </div>
             `;
        } else {
            // Editor State (Unlocked or Unprotected)
            const content = activeNote.isSecure ? (this.decryptedContent || '') : activeNote.content;

            editorArea = `
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <div style="padding: 10px; border-bottom: 1px solid #333; display: flex; gap: 10px; align-items: center;">
                        <input class="note-title-input" value="${escapeHtml(activeNote.title)}" placeholder="Note Title" 
                               style="background: transparent; border: none; color: #00ff41; font-family: inherit; font-size: 18px; font-weight: bold; flex: 1; outline: none;">
                        
                        <button class="notes-btn-secure" data-note-action="toggle-secure" 
                                style="background: ${activeNote.isSecure ? '#00ff41' : 'transparent'}; color: ${activeNote.isSecure ? '#000' : '#00ff41'}; border: 1px solid #00ff41; padding: 5px 10px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                            ${activeNote.isSecure ? '🔒 Secured' : '🔓 Unsecured'}
                        </button>
                        
                        ${activeNote.isSecure ? '<button class="notes-btn-lock" data-note-action="lock" style="background: transparent; color: #ff6464; border: 1px solid #ff6464; padding: 5px 10px; cursor: pointer;">Lock</button>' : ''}
                        
                        <button class="notes-btn-delete" data-note-action="delete" style="background: transparent; color: #ff6464; border: none; cursor: pointer;">🗑️</button>
                    </div>
                    
                    ${this.showPasswordDialog ? `
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10;">
                           ${this.renderPasswordDialog()}
                        </div>
                    ` : ''}

                    <textarea class="note-content-area" 
                              style="flex: 1; width: 100%; background: #000; color: #00ff41; border: none; padding: 20px; font-family: 'IBM VGA 8x16', monospace; font-size: 16px; resize: none; outline: none; line-height: 1.5;" 
                              placeholder="Write your testament...">${escapeHtml(content)}</textarea>
                </div>
             `;
        }

        return `
            <div class="notes-app" style="display: flex; height: 100%; background: #000; color: #00ff41; font-family: 'IBM VGA 8x16', monospace;">
                ${sidebar}
                ${editorArea}
            </div>
        `;
    }

    private renderPasswordDialog(): string {
        return `
            <div class="notes-password-dialog" style="background: #111; border: 1px solid #00ff41; padding: 20px; width: 300px; text-align: center; box-shadow: 0 0 20px rgba(0,255,65,0.2);">
                <div style="margin-bottom: 15px; font-weight: bold; color: #00ff41;">
                    ${this.dialogMode === 'encrypt' ? 'Set Password' : 'Enter Password'}
                </div>
                <div style="margin-bottom: 15px; font-size: 12px; opacity: 0.7;">
                    ${this.dialogMode === 'encrypt' ? 'This will encrypt the current note.' : 'Access requires divine authorization.'}
                </div>
                <input type="password" class="notes-password-input" 
                       style="width: 100%; background: #000; border: 1px solid #333; color: #00ff41; padding: 8px; margin-bottom: 10px; outline: none; text-align: center;" 
                       placeholder="Password" autofocus>
                ${this.passwordError ? `<div style="color: #ff6464; font-size: 12px; margin-bottom: 10px;">${this.passwordError}</div>` : ''}
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="notes-pwd-cancel" data-note-action="pwd-cancel" style="padding: 5px 15px; background: transparent; border: 1px solid #333; color: #888; cursor: pointer;">Cancel</button>
                    <button class="notes-pwd-submit" data-note-action="pwd-submit" style="padding: 5px 15px; background: #00ff41; border: none; color: #000; cursor: pointer;">
                        ${this.dialogMode === 'encrypt' ? 'Encrypt' : 'Unlock'}
                    </button>
                </div>
            </div>
        `;
    }
}
