
import { escapeHtml, generateId } from '../utils/helpers';

interface Label {
    id: string;
    text: string;
    color: string;
}

interface Card {
    id: string;
    content: string;
    description?: string;
    labels: Label[];
    dueDate?: number;
    createdAt: number;
}

interface List {
    id: string;
    title: string;
    cards: Card[];
}

interface Board {
    id: string;
    name: string;
    lists: List[];
    createdAt: number;
}

export class GodlyNotes {
    private boards: Board[] = [];
    private activeBoardId: string | null = null;

    // Drag & Drop State
    private draggedCardId: string | null = null;
    private draggedFromListId: string | null = null;

    // Decoy mode support
    private isDecoyMode: boolean = false;
    private realBoardsBackup: { boards: Board[]; activeBoardId: string | null } | null = null;

    // UI State
    // private showBoardMenu: boolean = false;
    // private editingCardId: string | null = null;
    // private cardDetailId: string | null = null; // For showing full details modal

    constructor() {
        this.loadData();
        if (this.boards.length === 0) {
            this.createDefaultBoard();
        }
    }

    // Decoy mode: hide real boards and show empty default board
    public setDecoyMode(isDecoy: boolean) {
        if (isDecoy && !this.isDecoyMode) {
            // Entering decoy mode - backup real boards
            this.realBoardsBackup = {
                boards: JSON.parse(JSON.stringify(this.boards)),
                activeBoardId: this.activeBoardId
            };
            // Create innocent empty board
            const decoyBoard: Board = {
                id: 'decoy-board',
                name: 'My Tasks',
                lists: [
                    { id: 'decoy-todo', title: 'To Do', cards: [] },
                    { id: 'decoy-progress', title: 'In Progress', cards: [] },
                    { id: 'decoy-done', title: 'Done', cards: [] }
                ],
                createdAt: Date.now()
            };
            this.boards = [decoyBoard];
            this.activeBoardId = 'decoy-board';
            this.isDecoyMode = true;
        } else if (!isDecoy && this.isDecoyMode) {
            // Exiting decoy mode - restore real boards
            if (this.realBoardsBackup) {
                this.boards = this.realBoardsBackup.boards;
                this.activeBoardId = this.realBoardsBackup.activeBoardId;
                this.realBoardsBackup = null;
            }
            this.isDecoyMode = false;
        }
    }

    private createDefaultBoard() {
        const board: Board = {
            id: generateId('board'),
            name: 'My Tasks',
            lists: [
                { id: generateId('list'), title: 'To Do', cards: [] },
                { id: generateId('list'), title: 'In Progress', cards: [] },
                { id: generateId('list'), title: 'Done', cards: [] }
            ],
            createdAt: Date.now()
        };
        this.boards.push(board);
        this.activeBoardId = board.id;
        this.saveData();
    }

    private loadData() {
        try {
            const raw = localStorage.getItem('godly_notes_v2_db');
            if (raw) {
                const data = JSON.parse(raw);
                this.boards = data.boards || [];
                this.activeBoardId = data.activeBoardId || (this.boards[0]?.id || null);
            } else {
                // Migrate legacy data
                const legacyRaw = localStorage.getItem('godly_notes_db');
                if (legacyRaw) {
                    const legacyCols = JSON.parse(legacyRaw);
                    interface LegacyCard { id: string; content: string }
                    interface LegacyColumn { id: string; title: string; cards: LegacyCard[] }
                    const board: Board = {
                        id: generateId('board'),
                        name: 'Migrated Board',
                        lists: (legacyCols as LegacyColumn[]).map((c) => ({
                            id: c.id,
                            title: c.title,
                            cards: c.cards.map((card) => ({
                                id: card.id,
                                content: card.content,
                                labels: [],
                                createdAt: Date.now()
                            }))
                        })),
                        createdAt: Date.now()
                    };
                    this.boards.push(board);
                    this.activeBoardId = board.id;
                    this.saveData();
                }
            }
        } catch (e) {
            console.error('Failed to load Godly Notes:', e);
            this.boards = [];
        }
    }

    private saveData() {
        const data = {
            boards: this.boards,
            activeBoardId: this.activeBoardId
        };
        localStorage.setItem('godly_notes_v2_db', JSON.stringify(data));
    }

    private getActiveBoard(): Board | undefined {
        return this.boards.find(b => b.id === this.activeBoardId);
    }

    // ===================================
    // Actions
    // ===================================

    public switchBoard(boardId: string) {
        const board = this.boards.find(b => b.id === boardId);
        if (board) {
            this.activeBoardId = board.id;
            this.saveData();
        }
    }

    public createBoard(name: string) {
        if (!name.trim()) return;
        const board: Board = {
            id: generateId('board'),
            name: name.trim(),
            lists: [],
            createdAt: Date.now()
        };
        this.boards.push(board);
        this.activeBoardId = board.id;
        this.saveData();
    }

    public deleteBoard(boardId: string) {
        this.boards = this.boards.filter(b => b.id !== boardId);
        if (this.activeBoardId === boardId) {
            this.activeBoardId = this.boards[0]?.id || null;
        }
        this.saveData();
    }

    public addList(title: string) {
        const board = this.getActiveBoard();
        if (board && title.trim()) {
            board.lists.push({
                id: generateId('list'),
                title: title.trim(),
                cards: []
            });
            this.saveData();
        }
    }

    public deleteList(listId: string) {
        const board = this.getActiveBoard();
        if (board) {
            board.lists = board.lists.filter(l => l.id !== listId);
            this.saveData();
        }
    }

    public addCard(listId: string, content: string) {
        const board = this.getActiveBoard();
        if (board) {
            const list = board.lists.find(l => l.id === listId);
            if (list && content.trim()) {
                list.cards.push({
                    id: generateId('card'),
                    content: content.trim(),
                    labels: [],
                    createdAt: Date.now()
                });
                this.saveData();
            }
        }
    }

    public deleteCard(listId: string, cardId: string) {
        const board = this.getActiveBoard();
        if (board) {
            const list = board.lists.find(l => l.id === listId);
            if (list) {
                list.cards = list.cards.filter(c => c.id !== cardId);
                this.saveData();
            }
        }
    }

    public renameBoard(boardId: string, newName: string) {
        const board = this.boards.find(b => b.id === boardId);
        if (board && newName.trim()) {
            board.name = newName.trim();
            this.saveData();
        }
    }

    public renameList(listId: string, newTitle: string) {
        const board = this.getActiveBoard();
        if (board) {
            const list = board.lists.find(l => l.id === listId);
            if (list && newTitle.trim()) {
                list.title = newTitle.trim();
                this.saveData();
            }
        }
    }

    public updateCard(listId: string, cardId: string, content: string) {
        const board = this.getActiveBoard();
        if (board) {
            const list = board.lists.find(l => l.id === listId);
            if (list) {
                const card = list.cards.find(c => c.id === cardId);
                if (card) {
                    card.content = content.trim();
                    this.saveData();
                }
            }
        }
    }

    public getCardContent(listId: string, cardId: string): string | null {
        const board = this.getActiveBoard();
        if (board) {
            const list = board.lists.find(l => l.id === listId);
            if (list) {
                const card = list.cards.find(c => c.id === cardId);
                if (card) return card.content;
            }
        }
        return null;
    }

    public setDragState(cardId: string, listId: string) {
        this.draggedCardId = cardId;
        this.draggedFromListId = listId;
    }

    public moveCard(targetListId: string) {
        if (!this.draggedCardId || !this.draggedFromListId) return;
        const board = this.getActiveBoard();
        if (!board) return;

        const sourceList = board.lists.find(l => l.id === this.draggedFromListId);
        const destList = board.lists.find(l => l.id === targetListId);

        if (sourceList && destList) {
            const cardIndex = sourceList.cards.findIndex(c => c.id === this.draggedCardId);
            if (cardIndex !== -1) {
                const [card] = sourceList.cards.splice(cardIndex, 1);
                destList.cards.push(card);
                this.saveData();
            }
        }
        this.draggedCardId = null;
        this.draggedFromListId = null;
    }

    // ===================================
    // Render
    // ===================================

    public render(): string {
        const board = this.getActiveBoard();
        if (!board) {
            return `<div style="padding: 20px; color: #00ff41;">No Board Active. <button onclick="window.createBoardPrompt()">Create Board</button></div>`;
        }

        return `
            <div class="godly-notes-app" style="display: flex; flex-direction: column; height: 100%; background: #0d1117; color: #c9d1d9; font-family: 'Segoe UI', sans-serif;">
                <!-- Header -->
                <div style="padding: 10px 15px; border-bottom: 1px solid rgba(0,255,65,0.3); display: flex; align-items: center; justify-content: space-between; background: rgba(0,20,0,0.3);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px; font-weight: bold; color: #00ff41; cursor: pointer;" 
                              ondblclick="window.renameBoardPrompt('${board.id}', '${escapeHtml(board.name)}')" title="Double-click to rename">
                              ${escapeHtml(board.name)}
                        </span>
                        <select onchange="window.switchBoard(this.value)" style="background: #111; color: #00ff41; border: 1px solid #333; padding: 4px; border-radius: 4px;">
                            ${this.boards.map(b => `<option value="${b.id}" ${b.id === this.activeBoardId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}
                            <option value="new">+ New Board...</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px;">
                         <button onclick="window.deleteBoardPrompt('${board.id}')" title="Delete Board" style="background: transparent; border: 1px solid #ff6464; color: #ff6464; border-radius: 4px; padding: 0 8px; cursor: pointer; font-size: 18px; line-height: 1.2; height: 28px;">×</button>
                    </div>
                </div>

                <!-- Board Content -->
                <div style="flex: 1; overflow-x: auto; padding: 15px; display: flex; align-items: flex-start; gap: 15px;">
                    ${board.lists.map(list => this.renderList(list)).join('')}
                    
                    <!-- Add List Button -->
                    <div style="min-width: 250px; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px;">
                        <input type="text" class="new-list-input" placeholder="+ Add another list" 
                               onkeydown="if(event.key === 'Enter') window.addNoteList(this.value)"
                               style="width: 100%; background: transparent; border: none; color: #fff; outline: none; padding: 5px;">
                    </div>
                </div>
            </div>
        `;
    }

    private renderList(list: List): string {
        return `
            <div class="kanban-column" data-col-id="${list.id}"
                 style="min-width: 280px; width: 280px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; display: flex; flex-direction: column; max-height: 100%;">
                
                <!-- List Header -->
                <div style="padding: 10px 12px; border-bottom: 1px solid #30363d; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #c9d1d9; cursor: pointer;" ondblclick="window.renameListPrompt('${list.id}', '${escapeHtml(list.title)}')" title="Double-click to rename">${escapeHtml(list.title)}</span>
                    <button onclick="window.deleteNoteList('${list.id}')" style="background: none; border: none; color: #8b949e; cursor: pointer; font-size: 16px;">×</button>
                </div>

                <!-- Cards Container -->
                <div class="kanban-cards-container" data-col-id="${list.id}"
                     style="flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 50px;">
                    ${list.cards.map(card => this.renderCard(card, list.id)).join('')}
                </div>

                <!-- Add Card Footer -->
                <div style="padding: 8px; border-top: 1px solid #30363d;">
                    <button class="add-card-btn" onclick="this.nextElementSibling.style.display='block'; this.style.display='none'; this.nextElementSibling.querySelector('input').focus();" 
                            style="width: 100%; text-align: left; background: none; border: none; color: #8b949e; padding: 6px; cursor: pointer; border-radius: 4px;">
                        + Add a card
                    </button>
                    <div style="display: none;">
                        <input type="text" class="kanban-add-input" data-col-id="${list.id}" placeholder="Enter a title for this card..."
                               style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 8px; border-radius: 4px; margin-bottom: 6px; outline: none;">
                        <div style="display: flex; gap: 5px;">
                            <button onclick="window.addNoteCard('${list.id}', this.parentElement.previousElementSibling.value)" 
                                    style="background: #238636; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Add Card</button>
                            <button onclick="this.parentElement.parentElement.style.display='none'; this.parentElement.parentElement.previousElementSibling.style.display='block';" 
                                    style="background: none; border: none; color: #8b949e; cursor: pointer; font-size: 20px;">×</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderCard(card: Card, listId: string): string {
        return `
            <div class="kanban-card" draggable="true" data-card-id="${card.id}" data-col-id="${listId}"
                 ondblclick="window.editNoteCardPrompt('${listId}', '${card.id}')"
                 onmouseenter="const btn = this.querySelector('.kanban-delete-card'); if(btn) btn.style.opacity='1'"
                 onmouseleave="const btn = this.querySelector('.kanban-delete-card'); if(btn) btn.style.opacity='0'"
                 style="background: #21262d; padding: 10px; border: 1px solid #30363d; border-radius: 6px; cursor: grab; position: relative; box-shadow: 0 1px 0 rgba(27,31,35,0.04); user-select: none;"
                 title="Double-click to edit">
                
                <div style="color: #c9d1d9; margin-bottom: 5px; word-wrap: break-word; line-height: 1.4;">${escapeHtml(card.content)}</div>
                
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    ${card.labels.map(l => `<span style="background: ${l.color}; font-size: 10px; padding: 2px 6px; border-radius: 10px; color: #000;">${escapeHtml(l.text)}</span>`).join('')}
                </div>

                <button class="kanban-delete-card" data-card-id="${card.id}" data-col-id="${listId}"
                        onclick="event.stopPropagation(); window.deleteNoteCard('${listId}', '${card.id}')"
                        style="position: absolute; top: 6px; right: 6px; background: transparent; border: none; color: #8b949e; cursor: pointer; opacity: 0; transition: opacity 0.2s; font-size: 18px; line-height: 1;">×</button>
            </div>
        `;
    }
}
