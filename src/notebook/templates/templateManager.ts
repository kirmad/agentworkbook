import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface CodeTemplate {
    name: string;
    description: string;
    language: string;
    code: string;
    filePath: string;
}

/**
 * Template file info for hierarchical display
 */
export interface TemplateFileInfo {
    name: string;
    path: string;
    relativePath: string;
    isDirectory: boolean;
    children?: TemplateFileInfo[];
}

export class TemplateManager {
    private static async getWorkspaceRoot(): Promise<string | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        return workspaceFolders[0].uri.fsPath;
    }

    private static async getTemplatesDirectory(): Promise<string | undefined> {
        const workspaceRoot = await this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return undefined;
        }
        return path.join(workspaceRoot, '.agentworkbook', 'scripts');
    }

    /**
     * Load all templates as hierarchical file structure
     */
    static async loadTemplateStructure(): Promise<TemplateFileInfo[]> {
        const templatesDir = await this.getTemplatesDirectory();
        if (!templatesDir) {
            return [];
        }

        try {
            await fs.access(templatesDir);
        } catch {
            // Templates directory doesn't exist
            return [];
        }

        return await this.scanDirectory(templatesDir, templatesDir);
    }

    /**
     * Recursively scan directory for templates and subdirectories
     */
    private static async scanDirectory(dirPath: string, basePath: string): Promise<TemplateFileInfo[]> {
        const items: TemplateFileInfo[] = [];

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(basePath, fullPath);

                if (entry.isDirectory()) {
                    const children = await this.scanDirectory(fullPath, basePath);
                    items.push({
                        name: entry.name,
                        path: fullPath,
                        relativePath,
                        isDirectory: true,
                        children
                    });
                } else if (entry.name.endsWith('.awbscript')) {
                    items.push({
                        name: entry.name.replace('.awbscript', ''),
                        path: fullPath,
                        relativePath,
                        isDirectory: false
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }

        return items.sort((a, b) => {
            // Directories first, then files
            if (a.isDirectory && !b.isDirectory) {return -1;}
            if (!a.isDirectory && b.isDirectory) {return 1;}
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Load templates as flat list (legacy method)
     */
    static async loadTemplates(): Promise<CodeTemplate[]> {
        const templateStructure = await this.loadTemplateStructure();
        const templates: CodeTemplate[] = [];
        
        await this.flattenTemplateStructure(templateStructure, templates);
        return templates;
    }

    /**
     * Flatten hierarchical structure into a flat list of templates
     */
    private static async flattenTemplateStructure(items: TemplateFileInfo[], templates: CodeTemplate[]): Promise<void> {
        for (const item of items) {
            if (item.isDirectory && item.children) {
                await this.flattenTemplateStructure(item.children, templates);
            } else if (!item.isDirectory) {
                try {
                    const content = await fs.readFile(item.path, 'utf8');
                    const templateData = yaml.load(content) as any;
                    
                    templates.push({
                        name: templateData.name || item.name,
                        description: templateData.description || '',
                        language: templateData.language || 'python',
                        code: templateData.code || '',
                        filePath: item.path
                    });
                } catch (error) {
                    console.error(`Error loading template ${item.path}:`, error);
                }
            }
        }
    }

    /**
     * Show hierarchical template picker
     */
    static async showTemplateQuickPick(): Promise<CodeTemplate | undefined> {
        const templateStructure = await this.loadTemplateStructure();
        
        if (templateStructure.length === 0) {
            vscode.window.showInformationMessage(
                'No templates found. Create .awbscript files in the .agentworkbook/scripts directory.'
            );
            return undefined;
        }

        return await this.showTemplateSelection(templateStructure, []);
    }

    /**
     * Recursive template selection with folder navigation
     */
    private static async showTemplateSelection(
        items: TemplateFileInfo[], 
        breadcrumb: string[]
    ): Promise<CodeTemplate | undefined> {
        const quickPickItems: vscode.QuickPickItem[] = [];

        // Add back navigation if not at root
        if (breadcrumb.length > 0) {
            quickPickItems.push({
                label: '$(arrow-left) Back',
                description: 'Go back to parent folder',
                detail: breadcrumb.join(' / ')
            });
        }

        // Add items
        for (const item of items) {
            if (item.isDirectory) {
                quickPickItems.push({
                    label: `$(folder) ${item.name}`,
                    description: 'Folder',
                    detail: `${item.children?.length || 0} items`
                });
            } else {
                quickPickItems.push({
                    label: `$(file) ${item.name}`,
                    description: 'Template',
                    detail: item.relativePath
                });
            }
        }

        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: breadcrumb.length > 0 
                ? `Select template from ${breadcrumb.join(' / ')}` 
                : 'Select a code template to insert',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selected) {
            return undefined;
        }

        // Handle back navigation
        if (selected.label === '$(arrow-left) Back') {
            // Go back to parent (remove last breadcrumb)
            const parentBreadcrumb = breadcrumb.slice(0, -1);
            const parentItems = await this.getItemsForBreadcrumb(parentBreadcrumb);
            return await this.showTemplateSelection(parentItems, parentBreadcrumb);
        }

        // Find the selected item
        const itemName = selected.label.replace(/^\$\([^)]+\)\s*/, ''); // Remove icon
        const selectedItem = items.find(item => item.name === itemName);

        if (!selectedItem) {
            return undefined;
        }

        if (selectedItem.isDirectory) {
            // Navigate into folder
            return await this.showTemplateSelection(
                selectedItem.children || [], 
                [...breadcrumb, selectedItem.name]
            );
        } else {
            // Load and return template
            return await this.loadSingleTemplate(selectedItem.path);
        }
    }

    /**
     * Get items for a specific breadcrumb path
     */
    private static async getItemsForBreadcrumb(breadcrumb: string[]): Promise<TemplateFileInfo[]> {
        const allTemplates = await this.loadTemplateStructure();
        
        let currentItems = allTemplates;
        for (const segment of breadcrumb) {
            const folder = currentItems.find(item => item.isDirectory && item.name === segment);
            if (folder && folder.children) {
                currentItems = folder.children;
            } else {
                return [];
            }
        }
        
        return currentItems;
    }

    /**
     * Load a single template from file path
     */
    private static async loadSingleTemplate(templatePath: string): Promise<CodeTemplate | undefined> {
        try {
            const content = await fs.readFile(templatePath, 'utf8');
            const templateData = yaml.load(content) as any;
            
            return {
                name: templateData.name || path.basename(templatePath, '.awbscript'),
                description: templateData.description || '',
                language: templateData.language || 'python',
                code: templateData.code || '',
                filePath: templatePath
            };
        } catch (error) {
            console.error(`Error loading template ${templatePath}:`, error);
            return undefined;
        }
    }

    static async insertTemplateIntoNotebook(template: CodeTemplate, cellContext?: vscode.NotebookCell): Promise<void> {
        const activeNotebook = vscode.window.activeNotebookEditor;
        if (!activeNotebook) {
            vscode.window.showErrorMessage('No active notebook found');
            return;
        }

        if (activeNotebook.notebook.notebookType !== 'agentworkbook') {
            vscode.window.showErrorMessage('Templates can only be inserted into AgentWorkbook notebooks');
            return;
        }

        const newCell = new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            template.code,
            template.language
        );

        let insertIndex: number;
        
        if (cellContext) {
            // Find the index of the context cell and insert after it
            const contextCellIndex = activeNotebook.notebook.getCells().findIndex(cell => cell.index === cellContext.index);
            insertIndex = contextCellIndex >= 0 ? contextCellIndex + 1 : activeNotebook.notebook.cellCount;
        } else {
            // Insert at the end of the notebook if no context
            insertIndex = activeNotebook.notebook.cellCount;
        }
        
        const edit = new vscode.WorkspaceEdit();
        edit.set(activeNotebook.notebook.uri, [
            vscode.NotebookEdit.insertCells(insertIndex, [newCell])
        ]);

        await vscode.workspace.applyEdit(edit);
        
        // Focus the new cell
        await vscode.commands.executeCommand('notebook.cell.edit', {
            index: insertIndex
        });
    }
}