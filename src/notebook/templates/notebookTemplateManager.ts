import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Argument types supported in notebook templates
 */
export type ArgumentType = 'string' | 'select' | 'int' | 'bool';

/**
 * Definition of a single argument in a template
 */
export interface ArgumentDefinition {
    type: ArgumentType;
    label: string;
    description?: string;
    defaultValue?: any;
    options?: string[]; // For select type
    required?: boolean;
}

/**
 * Collection of argument definitions
 */
export interface TemplateArguments {
    [key: string]: ArgumentDefinition;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
    title: string;
    description: string;
    author?: string;
    version?: string;
    tags?: string[];
}

/**
 * Notebook cell structure (matches the serializer format)
 */
export interface NotebookCell {
    kind: 'markdown' | 'code';
    value: string;
    language: string;
}

/**
 * Template section containing the notebook structure
 */
export interface TemplateNotebook {
    cells: NotebookCell[];
}

/**
 * Complete notebook template structure
 */
export interface NotebookTemplate {
    metadata: TemplateMetadata;
    arguments: TemplateArguments;
    template: TemplateNotebook;
}

/**
 * Collected argument values from user
 */
export interface ArgumentValues {
    [key: string]: any;
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

/**
 * Manager for notebook templates
 */
export class NotebookTemplateManager {
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
        return path.join(workspaceRoot, '.agentworkbook', 'templates');
    }

    /**
     * Load all notebook templates from the templates directory
     */
    static async loadTemplates(): Promise<TemplateFileInfo[]> {
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
                } else if (entry.name.endsWith('.awbtemplate')) {
                    items.push({
                        name: entry.name.replace('.awbtemplate', ''),
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
     * Load a specific template from file
     */
    static async loadTemplate(templatePath: string): Promise<NotebookTemplate | undefined> {
        try {
            const content = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(content) as NotebookTemplate;
            
            // Validate template structure
            if (!this.validateTemplate(template)) {
                console.error(`Invalid template structure in ${templatePath}`);
                return undefined;
            }

            return template;
        } catch (error) {
            console.error(`Error loading template ${templatePath}:`, error);
            return undefined;
        }
    }

    /**
     * Validate template structure
     */
    private static validateTemplate(template: any): template is NotebookTemplate {
        return (
            template &&
            typeof template === 'object' &&
            template.metadata &&
            typeof template.metadata.title === 'string' &&
            template.arguments &&
            typeof template.arguments === 'object' &&
            template.template &&
            Array.isArray(template.template.cells)
        );
    }

    /**
     * Show hierarchical template picker
     */
    static async showTemplateQuickPick(): Promise<{ template: NotebookTemplate; path: string } | undefined> {
        const templates = await this.loadTemplates();
        
        if (templates.length === 0) {
            vscode.window.showInformationMessage(
                'No notebook templates found. Create .awbtemplate files in the .agentworkbook/templates directory.'
            );
            return undefined;
        }

        return await this.showTemplateSelection(templates, []);
    }

    /**
     * Recursive template selection with folder navigation
     */
    private static async showTemplateSelection(
        items: TemplateFileInfo[], 
        breadcrumb: string[]
    ): Promise<{ template: NotebookTemplate; path: string } | undefined> {
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
                : 'Select a notebook template',
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
            const template = await this.loadTemplate(selectedItem.path);
            if (template) {
                return { template, path: selectedItem.path };
            }
            return undefined;
        }
    }

    /**
     * Get items for a specific breadcrumb path
     */
    private static async getItemsForBreadcrumb(breadcrumb: string[]): Promise<TemplateFileInfo[]> {
        const allTemplates = await this.loadTemplates();
        
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
     * Collect argument values from user
     */
    static async collectArgumentValues(template: NotebookTemplate): Promise<ArgumentValues | undefined> {
        const values: ArgumentValues = {};
        const argumentKeys = Object.keys(template.arguments);

        if (argumentKeys.length === 0) {
            return values; // No arguments needed
        }

        for (const key of argumentKeys) {
            const arg = template.arguments[key];
            let value: any;

            switch (arg.type) {
                case 'string':
                    value = await vscode.window.showInputBox({
                        prompt: `${arg.label}${arg.required ? ' (required)' : ''}`,
                        placeHolder: arg.description || `Enter ${arg.label.toLowerCase()}`,
                        value: arg.defaultValue?.toString() || '',
                        validateInput: (input) => {
                            if (arg.required && !input.trim()) {
                                return `${arg.label} is required`;
                            }
                            return undefined;
                        }
                    });
                    break;

                case 'select':
                    if (!arg.options || arg.options.length === 0) {
                        vscode.window.showErrorMessage(`Select argument '${key}' has no options defined`);
                        return undefined;
                    }
                    
                    const selectedOption = await vscode.window.showQuickPick(
                        arg.options.map(option => ({ label: option, value: option })),
                        {
                            placeHolder: `Select ${arg.label}`,
                            canPickMany: false
                        }
                    );
                    value = selectedOption?.value;
                    break;

                case 'int':
                    const intInput = await vscode.window.showInputBox({
                        prompt: `${arg.label}${arg.required ? ' (required)' : ''}`,
                        placeHolder: arg.description || `Enter ${arg.label.toLowerCase()}`,
                        value: arg.defaultValue?.toString() || '',
                        validateInput: (input) => {
                            if (arg.required && !input.trim()) {
                                return `${arg.label} is required`;
                            }
                            if (input.trim() && isNaN(parseInt(input.trim(), 10))) {
                                return `${arg.label} must be a number`;
                            }
                            return undefined;
                        }
                    });
                    value = intInput ? parseInt(intInput, 10) : arg.defaultValue;
                    break;

                case 'bool':
                    const boolChoice = await vscode.window.showQuickPick([
                        { label: 'Yes', value: true },
                        { label: 'No', value: false }
                    ], {
                        placeHolder: `${arg.label}`,
                        canPickMany: false
                    });
                    value = boolChoice !== undefined ? boolChoice.value : arg.defaultValue;
                    break;

                default:
                    vscode.window.showErrorMessage(`Unknown argument type: ${arg.type}`);
                    return undefined;
            }

            // Check if required value was provided
            if (arg.required && (value === undefined || value === null || value === '')) {
                vscode.window.showErrorMessage(`${arg.label} is required`);
                return undefined;
            }

            values[key] = value !== undefined ? value : arg.defaultValue;
        }

        return values;
    }

    /**
     * Render template with provided argument values
     */
    static renderTemplate(template: NotebookTemplate, values: ArgumentValues): TemplateNotebook {
        const templateJson = JSON.stringify(template.template);
        
        // Replace all argument placeholders with values
        let renderedJson = templateJson;
        for (const [key, value] of Object.entries(values)) {
            // Use placeholder format like {{argumentName}}
            const placeholder = `{{${key}}}`;
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            renderedJson = renderedJson.replace(regex, String(value));
        }

        try {
            return JSON.parse(renderedJson) as TemplateNotebook;
        } catch (error) {
            console.error('Error parsing rendered template:', error);
            // Return original template if parsing fails
            return template.template;
        }
    }

    /**
     * Create a new notebook from template
     */
    static async createNotebookFromTemplate(): Promise<void> {
        // Show template selection
        const templateResult = await this.showTemplateQuickPick();
        if (!templateResult) {
            return; // User cancelled
        }

        const { template } = templateResult;

        // Collect argument values
        const values = await this.collectArgumentValues(template);
        if (values === undefined) {
            return; // User cancelled or error occurred
        }

        // Render template
        const renderedTemplate = this.renderTemplate(template, values);

        // Create notebook data
        const cells = renderedTemplate.cells.map(cell => 
            new vscode.NotebookCellData(
                cell.kind === 'code' ? vscode.NotebookCellKind.Code : vscode.NotebookCellKind.Markup,
                cell.value,
                cell.language
            )
        );

        const notebookData = new vscode.NotebookData(cells);
        
        // Create and show notebook
        const notebook = await vscode.workspace.openNotebookDocument('agentworkbook', notebookData);
        await vscode.window.showNotebookDocument(notebook);

        vscode.window.showInformationMessage(`Notebook created from template: ${template.metadata.title}`);
    }
}