import * as vscode from 'vscode';
import { NotebookTemplateManager } from './templates/notebookTemplateManager';
import { DEFAULT_NOTEBOOK_HEADER, INITIAL_NOTEBOOK_CODE, EXAMPLE_TASK_CODE } from './templates/initialNotebook';

/**
 * Options for creating a notebook
 */
interface NotebookCreationOptions {
    label: string;
    description: string;
    choice: 'template' | 'blank';
}

/**
 * Creates a new notebook with template selection or blank content
 */
export async function createNewNotebook(): Promise<void> {
    // Check if templates are available
    const templates = await NotebookTemplateManager.loadTemplates();
    const hasTemplates = templates.length > 0;

    if (hasTemplates) {
        const choice = await showNotebookCreationOptions();
        if (!choice) {
            return; // User cancelled
        }

        if (choice.choice === 'template') {
            await NotebookTemplateManager.createNotebookFromTemplate();
            return;
        }
    }

    // Create blank notebook (default behavior)
    await createBlankNotebook();
}

/**
 * Shows quick pick options for notebook creation
 */
async function showNotebookCreationOptions(): Promise<NotebookCreationOptions | undefined> {
    return await vscode.window.showQuickPick([
        {
            label: '$(file-code) Create from Template',
            description: 'Choose from available notebook templates',
            choice: 'template' as const
        },
        {
            label: '$(file-add) Create Blank Notebook',
            description: 'Create a new empty notebook with default content',
            choice: 'blank' as const
        }
    ], {
        placeHolder: 'How would you like to create your notebook?'
    });
}

/**
 * Creates a blank notebook with default content
 */
export async function createBlankNotebook(): Promise<void> {
    const notebookData = new vscode.NotebookData([
        new vscode.NotebookCellData(
            vscode.NotebookCellKind.Markup,
            DEFAULT_NOTEBOOK_HEADER,
            'markdown'
        ),
        new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            INITIAL_NOTEBOOK_CODE,
            'python'
        ),
        new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            EXAMPLE_TASK_CODE,
            'python'
        ),
    ]);
    
    const notebook = await vscode.workspace.openNotebookDocument('agentworkbook', notebookData);
    
    // Show the notebook document in the editor
    await vscode.window.showNotebookDocument(notebook);
}