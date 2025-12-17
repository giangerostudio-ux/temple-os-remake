
import { escapeHtml } from '../utils/helpers';

export type CalculatorMode = 'basic' | 'scientific' | 'programmer';
export type Base = 'HEX' | 'DEC' | 'OCT' | 'BIN';

interface HistoryItem {
    expression: string;
    result: string;
}

export class CalculatorApp {
    public displayValue: string = '0';
    public history: HistoryItem[] = [];
    public mode: CalculatorMode = 'basic';
    public base: Base = 'DEC';
    private lastResult: boolean = false;

    // UI state
    private showHistory: boolean = false;

    // Key definitions
    private readonly keypads = {
        basic: [
            ['C', '(', ')', '/'],
            ['7', '8', '9', '*'],
            ['4', '5', '6', '-'],
            ['1', '2', '3', '+'],
            ['0', '.', '=', '']
        ],
        scientific: [
            ['sin', 'cos', 'tan', 'log'],
            ['ln', 'sqrt', '^', 'C'],
            ['(', ')', 'pi', '/'],
            ['7', '8', '9', '*'],
            ['4', '5', '6', '-'],
            ['1', '2', '3', '+'],
            ['0', '.', '=', 'e']
        ],
        programmer: [
            ['A', 'B', 'C', 'D'],
            ['E', 'F', '<<', '>>'],
            ['(', ')', 'AND', 'OR'],
            ['7', '8', '9', '/'],
            ['4', '5', '6', '*'],
            ['1', '2', '3', '-'],
            ['0', 'XOR', '=', '+']
        ]
    };

    /**
     * Handle key input
     */
    public pressKey(key: string): void {
        const keyUpper = key.toUpperCase();

        // Base switching (handled via separate UI buttons usually, but if passed here)
        if (['HEX', 'DEC', 'OCT', 'BIN'].includes(keyUpper)) {
            this.setBase(keyUpper as Base);
            return;
        }

        if (key === 'C') {
            this.clear();
            return;
        }

        if (key === '=') {
            this.calculate();
            return;
        }

        // Mode switching shortcuts could be added here

        // Handle input
        if (this.lastResult) {
            if (this.isOperator(key)) {
                this.lastResult = false;
            } else {
                this.displayValue = ''; // Start new number
                this.lastResult = false;
            }
        }

        if (this.displayValue === '0' && !this.isOperator(key) && key !== '.') {
            this.displayValue = key;
        } else {
            this.displayValue += key;
        }
    }

    private isOperator(k: string): boolean {
        return ['+', '-', '*', '/', '^', 'MOD', 'AND', 'OR', 'XOR', '<<', '>>'].includes(k);
    }

    public calculate(): void {
        try {
            const expression = this.displayValue;
            let result: number;

            if (this.mode === 'programmer') {
                // Tokenize and parse based on current base
                const radix = this.getRadix(this.base);
                // Split by operators but keep them
                // Regex: split by operators, keep delimiters
                const parts = expression.split(/([+\-*/&|^~%()]|<<|>>|AND|OR|XOR|NOT|MOD)/).filter(p => p.trim() !== '');

                let evalString = '';
                for (const part of parts) {
                    const p = part.trim();
                    if (this.isOperator(p) || p === '(' || p === ')') {
                        // Map visual operators to JS bitwise
                        let op = p;
                        if (op === 'AND') op = '&';
                        if (op === 'OR') op = '|';
                        if (op === 'XOR') op = '^';
                        if (op === 'NOT') op = '~';
                        if (op === 'MOD') op = '%';
                        evalString += ` ${op} `;
                    } else {
                        // Assume number
                        // If it contains only valid digits for base, parse it
                        // Otherwise (maybe empty?) ignore or 0
                        try {
                            // Check if it's a valid number for the radix
                            // Actually, just parseInt.
                            const val = parseInt(p, radix);
                            if (!isNaN(val)) {
                                evalString += val.toString();
                            } else {
                                evalString += '0';
                            }
                        } catch {
                            evalString += '0';
                        }
                    }
                }

                // Evaluate integer expression
                // Use Function constructor for safety sandbox relative to eval
                result = Math.floor(new Function('return ' + evalString)());

            } else {
                // Standard Scientific
                let safeExpr = expression
                    .replace(/sin/g, 'Math.sin')
                    .replace(/cos/g, 'Math.cos')
                    .replace(/tan/g, 'Math.tan')
                    .replace(/log/g, 'Math.log10')
                    .replace(/ln/g, 'Math.log')
                    .replace(/sqrt/g, 'Math.sqrt')
                    .replace(/pi/gi, 'Math.PI')
                    .replace(/e/gi, 'Math.E')
                    .replace(/\^/g, '**');

                result = new Function('return ' + safeExpr)();
            }

            // Format Result
            let resultStr = '';
            if (this.mode === 'programmer') {
                // Truncate to 32-bit integer often desirable, but JS is doubled
                // Let's keep JS behavior but strictly integer
                const intRes = Math.floor(result);
                const radix = this.getRadix(this.base);
                resultStr = intRes.toString(radix).toUpperCase();
            } else {
                // Limit precision
                resultStr = String(parseFloat(result.toPrecision(12)));
            }

            // Add to history
            this.history.unshift({ expression: this.displayValue, result: resultStr });
            if (this.history.length > 50) this.history.pop();

            this.displayValue = resultStr;
            this.lastResult = true;

        } catch (e) {
            this.displayValue = 'Error';
            this.lastResult = true;
        }
    }

    public clear(): void {
        this.displayValue = '0';
        this.lastResult = false;
    }

    public toggleHistory(): void {
        this.showHistory = !this.showHistory;
    }

    public setMode(m: CalculatorMode): void {
        this.mode = m;
        // Reset to DEC when leaving programmer, or entering? 
        // Usually good to reset to DEC by default
        this.base = 'DEC';
        this.clear();
    }

    public setBase(b: Base): void {
        if (this.mode !== 'programmer') return;

        try {
            // Convert current display value from Old Base to New Base
            // This allows user to type in DEC, see visual in HEX
            const oldRadix = this.getRadix(this.base);
            const val = parseInt(this.displayValue, oldRadix);

            if (!isNaN(val)) {
                this.base = b;
                const newRadix = this.getRadix(b);
                this.displayValue = val.toString(newRadix).toUpperCase();
            } else {
                // If error/NaN, just switch base and clear
                this.base = b;
                this.calculate(); // try calculate first? 
            }
        } catch {
            this.base = b;
            this.clear();
        }
    }

    private getRadix(b: Base): number {
        switch (b) {
            case 'HEX': return 16;
            case 'OCT': return 8;
            case 'BIN': return 2;
            default: return 10;
        }
    }

    /**
     * Delete last character
     */
    public backspace(): void {
        if (this.lastResult) {
            this.clear();
            return;
        }
        if (this.displayValue.length > 1) {
            this.displayValue = this.displayValue.slice(0, -1);
        } else {
            this.displayValue = '0';
        }
    }

    public clearHistory(): void {
        this.history = [];
    }

    public render(): string {
        const keys = this.keypads[this.mode] || this.keypads.basic;

        const historyHtml = this.showHistory ? `
            <div style="width: 200px; background: #0a0a0a; border-right: 1px solid #00ff41; display: flex; flex-direction: column;">
                <div style="padding: 5px; text-align: center; border-bottom: 1px solid #333; font-weight: bold;">TAPE</div>
                <div style="flex: 1; overflow-y: auto; padding: 10px; font-size: 14px;">
                    ${this.history.map(h => `
                        <div style="margin-bottom: 10px; border-bottom: 1px dashed #333; padding-bottom: 5px;">
                            <div style="opacity: 0.7; font-size: 12px;">${escapeHtml(h.expression)}</div>
                            <div style="color: #ffd700;">= ${escapeHtml(h.result)}</div>
                        </div>
                    `).join('')}
                    ${this.history.length === 0 ? '<div style="opacity: 0.5; text-align: center; margin-top: 20px;">Empty</div>' : ''}
                </div>
                <button class="calc-btn-history-clear" data-calc-action="clear-history" style="border-top: 1px solid #333; background: none; color: #ff6464; padding: 5px; cursor: pointer;">Clear Tape</button>
            </div>
        ` : '';

        // Programmer Mode Side Panel (Radix selection)
        let sidePanel = '';
        if (this.mode === 'programmer') {
            sidePanel = `
                <div style="width: 80px; background: #050505; border-right: 1px solid #333; display: flex; flex-direction: column; padding: 5px; gap: 5px;">
                    ${['HEX', 'DEC', 'OCT', 'BIN'].map(b => `
                        <button class="calc-base-btn ${this.base === b ? 'active' : ''}" data-calc-base="${b}" 
                                style="padding: 10px 5px; border: 1px solid ${this.base === b ? '#00ff41' : '#333'}; background: ${this.base === b ? 'rgba(0,255,65,0.1)' : 'transparent'}; color: ${this.base === b ? '#00ff41' : '#666'}; cursor: pointer; font-size: 12px; text-align: center;">
                            ${b}
                        </button>
                    `).join('')}
                </div>
             `;
        }

        const toolbar = `
            <div style="display: flex; gap: 10px; padding: 5px; background: #111; border-bottom: 1px solid #333;">
                <select id="calc-mode-select" class="calc-mode-select" style="background: #000; color: #00ff41; border: 1px solid #333; padding: 2px 5px; font-family: 'VT323';">
                    <option value="basic" ${this.mode === 'basic' ? 'selected' : ''}>Basic</option>
                    <option value="scientific" ${this.mode === 'scientific' ? 'selected' : ''}>Scientific</option>
                    <option value="programmer" ${this.mode === 'programmer' ? 'selected' : ''}>Programmer</option>
                </select>
                <button class="calc-toggle-history ${this.showHistory ? 'active' : ''}" style="margin-left: auto; background: none; border: 1px solid #333; color: #00ff41; cursor: pointer; padding: 0 5px;" data-calc-action="toggle-history">📜 Tape</button>
            </div>
        `;

        return `
            <div class="calculator-app" style="display: flex; height: 100%; background: #000; color: #00ff41; font-family: 'IBM VGA 8x16', monospace;">
                ${historyHtml}
                ${sidePanel}
                <div style="flex: 1; display: flex; flex-direction: column;">
                    ${toolbar}
                    <div class="calc-display" style="flex: 1; max-height: 150px; background: rgba(0,255,65,0.05); display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-end; padding: 20px; overflowing: hidden; word-break: break-all;">
                        <div style="opacity: 0.5; font-size: 14px; min-height: 20px;">${this.history.length > 0 ? escapeHtml(this.history[0].expression + ' =') : ''}</div>
                        <div style="font-size: 32px;">${escapeHtml(this.displayValue)}</div>
                        ${this.mode === 'programmer' ? `<div style="font-size: 12px; opacity: 0.7; margin-top: 5px;">${this.base}</div>` : ''}
                    </div>
                    <div style="flex: 2; display: grid; grid-template-columns: repeat(${keys[0].length}, 1fr); gap: 1px; background: #333;">
                        ${keys.flat().map(key => {
            if (!key) return '<div style="background:#000;"></div>';
            return `
                                <button class="calc-btn" data-key="${key}" style="background: #000; color: #00ff41; border: none; font-family: inherit; font-size: 18px; cursor: pointer; transition: background 0.1s;">
                                    ${key}
                                </button>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
}
