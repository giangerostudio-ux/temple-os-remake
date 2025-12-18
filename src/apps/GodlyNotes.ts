
import { escapeHtml, generateId } from '../utils/helpers';

interface Card {
    id: string;
    content: string;
}

interface Column {
    id: string;
    title: string;
    cards: Card[];
}

export class GodlyNotes {
    private columns: Column[] = [];
    private draggedCardId: string | null = null;
    private draggedFromColumnId: string | null = null;

    constructor() {
        this.loadData();
        if (this.columns.length === 0) {
            this.valinit();
        }
    }

    private valinit() {
        this.columns = [
            { id: 'col-todo', title: 'To Do', cards: [] },
            { id: 'col-doing', title: 'Doing', cards: [] },
            { id: 'col-done', title: 'Done', cards: [] },
        ];
        this.saveData();
    }

    private loadData() {
        try {
            const raw = localStorage.getItem('godly_notes_db');
            if (raw) {
                this.columns = JSON.parse(raw);
            }
        } catch {
            this.columns = [];
        }
    }

    private saveData() {
        localStorage.setItem('godly_notes_db', JSON.stringify(this.columns));
    }

    public addCard(columnId: string, content: string) {
        const col = this.columns.find(c => c.id === columnId);
        if (col) {
            col.cards.push({ id: generateId('card'), content });
            this.saveData();
        }
    }

    public deleteCard(columnId: string, cardId: string) {
        const col = this.columns.find(c => c.id === columnId);
        if (col) {
            col.cards = col.cards.filter(c => c.id !== cardId);
            this.saveData();
        }
    }

    // Drag and Drop Logic
    public setDragState(cardId: string, fromColId: string) {
        this.draggedCardId = cardId;
        this.draggedFromColumnId = fromColId;
    }

    public moveCard(targetColumnId: string, targetIndex?: number) {
        if (!this.draggedCardId || !this.draggedFromColumnId) return;

        const sourceCol = this.columns.find(c => c.id === this.draggedFromColumnId);
        const destCol = this.columns.find(c => c.id === targetColumnId);

        if (sourceCol && destCol) {
            const cardIndex = sourceCol.cards.findIndex(c => c.id === this.draggedCardId);
            if (cardIndex !== -1) {
                const [card] = sourceCol.cards.splice(cardIndex, 1);

                if (typeof targetIndex === 'number' && targetIndex >= 0) {
                    destCol.cards.splice(targetIndex, 0, card);
                } else {
                    destCol.cards.push(card);
                }

                this.saveData();
            }
        }

        this.draggedCardId = null;
        this.draggedFromColumnId = null;
    }

    public render(): string {
        return `
      <div class="godly-notes-board" style="display: flex; gap: 10px; padding: 20px; height: 100%; overflow-x: auto; background: #000; color: #00ff41; font-family: 'IBM VGA 8x16', monospace;">
        ${this.columns.map(col => this.renderColumn(col)).join('')}
      </div>
    `;
    }

    private renderColumn(col: Column): string {
        return `
      <div class="kanban-column" data-col-id="${col.id}" 
           style="min-width: 250px; width: 250px; background: #111; border: 1px solid #333; display: flex; flex-direction: column; height: 100%;">
        <div style="padding: 10px; border-bottom: 1px solid #333; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>${escapeHtml(col.title)}</span>
          <span style="font-size: 12px; opacity: 0.7;">${col.cards.length}</span>
        </div>
        <div class="kanban-cards-container" data-col-id="${col.id}" 
             style="flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
          ${col.cards.map(card => this.renderCard(card, col.id)).join('')}
        </div>
        <div style="padding: 10px; border-top: 1px solid #333;">
          <input type="text" class="kanban-add-input" data-col-id="${col.id}" placeholder="+ Add Card" 
                 style="width: 100%; background: #000; border: 1px solid #333; color: #00ff41; padding: 5px; outline: none;">
        </div>
      </div>
    `;
    }

    private renderCard(card: Card, colId: string): string {
        return `
      <div class="kanban-card" draggable="true" data-card-id="${card.id}" data-col-id="${colId}"
           style="background: #222; padding: 10px; border: 1px solid #444; word-wrap: break-word; cursor: grab; position: relative; user-select: none;">
        ${escapeHtml(card.content)}
        <button class="kanban-delete-card" data-card-id="${card.id}" data-col-id="${colId}"
                style="position: absolute; top: 2px; right: 2px; background: transparent; border: none; color: #ff6464; cursor: pointer; display: none; font-size: 10px;">X</button>
      </div>
    `;
    }
}
