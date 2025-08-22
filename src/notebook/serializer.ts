import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';

/**
 * Cell types supported by AgentWorkbook
 */
type CellKind = 'markdown' | 'code';

/**
 * Structure of a AgentWorkbook cell in serialized format
 */
interface AgentWorkbookCell {
    kind: CellKind;
    value: string;
    language: string;
}

/**
 * Structure of a AgentWorkbook notebook in serialized format
 */
interface AgentWorkbookNotebook {
    cells: AgentWorkbookCell[];
    version?: string; // For future compatibility
}

/**
 * Constants for serialization
 */
const SERIALIZATION_CONSTANTS = {
    JSON_INDENT: 2,
    DEFAULT_LANGUAGE: 'python',
    CURRENT_VERSION: '1.0'
} as const;

export class AgentWorkbookSerializer implements vscode.NotebookSerializer {
    async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        const contents = new TextDecoder().decode(content);

        let raw: AgentWorkbookNotebook;
        try {
            raw = JSON.parse(contents);
            
            // Validate the parsed data
            if (!this.isValidNotebook(raw)) {
                console.warn('AgentWorkbook: Invalid notebook structure detected, creating empty notebook');
                raw = { cells: [], version: SERIALIZATION_CONSTANTS.CURRENT_VERSION };
            }
        } catch (error) {
            console.warn('AgentWorkbook: Failed to parse notebook content, creating empty notebook', error);
            raw = { cells: [], version: SERIALIZATION_CONSTANTS.CURRENT_VERSION };
        }

        const cells = raw.cells.map(item => this.createCellData(item));
        return new vscode.NotebookData(cells);
    }

    /**
     * Validates the structure of a deserialized notebook
     */
    private isValidNotebook(data: any): data is AgentWorkbookNotebook {
        return (
            data &&
            typeof data === 'object' &&
            Array.isArray(data.cells) &&
            data.cells.every((cell: any) => this.isValidCell(cell))
        );
    }

    /**
     * Validates the structure of a cell
     */
    private isValidCell(cell: any): cell is AgentWorkbookCell {
        return (
            cell &&
            typeof cell === 'object' &&
            (cell.kind === 'code' || cell.kind === 'markdown') &&
            typeof cell.value === 'string' &&
            typeof cell.language === 'string'
        );
    }

    /**
     * Creates a VS Code notebook cell from a AgentWorkbook cell
     */
    private createCellData(item: AgentWorkbookCell): vscode.NotebookCellData {
        const cellKind = item.kind === 'code' 
            ? vscode.NotebookCellKind.Code 
            : vscode.NotebookCellKind.Markup;
        
        const language = item.language || SERIALIZATION_CONSTANTS.DEFAULT_LANGUAGE;
        
        return new vscode.NotebookCellData(cellKind, item.value, language);
    }

    async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
        try {
            const cells: AgentWorkbookCell[] = data.cells.map(cell => this.createSerializedCell(cell));
            
            const notebook: AgentWorkbookNotebook = { 
                cells,
                version: SERIALIZATION_CONSTANTS.CURRENT_VERSION
            };
            
            const serialized = JSON.stringify(notebook, null, SERIALIZATION_CONSTANTS.JSON_INDENT);
            return new TextEncoder().encode(serialized);
        } catch (error) {
            console.error('AgentWorkbook: Failed to serialize notebook', error);
            // Return minimal valid notebook on serialization failure
            const fallbackNotebook: AgentWorkbookNotebook = { 
                cells: [],
                version: SERIALIZATION_CONSTANTS.CURRENT_VERSION
            };
            return new TextEncoder().encode(JSON.stringify(fallbackNotebook, null, SERIALIZATION_CONSTANTS.JSON_INDENT));
        }
    }

    /**
     * Creates a serialized cell from a VS Code notebook cell
     */
    private createSerializedCell(cell: vscode.NotebookCellData): AgentWorkbookCell {
        return {
            kind: cell.kind === vscode.NotebookCellKind.Code ? 'code' : 'markdown',
            value: cell.value || '',
            language: cell.languageId || SERIALIZATION_CONSTANTS.DEFAULT_LANGUAGE
        };
    }
}
