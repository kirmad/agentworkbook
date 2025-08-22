import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Resource installer for AgentWorkbook flags, scripts, templates and RooCode modes/commands
 */
export class ResourceInstaller {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
    }

    /**
     * Install all AgentWorkbook resources (flags, scripts, templates) to workspace
     */
    async installResources(): Promise<void> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace folder to install AgentWorkbook resources.');
            return;
        }

        const targetDir = path.join(workspaceFolder.uri.fsPath, '.agentworkbook');
        const resourcesDir = path.join(this.context.extensionPath, 'resources', '.agentworkbook');

        try {
            await this.copyDirectory(resourcesDir, targetDir);
            
            vscode.window.showInformationMessage(
                'AgentWorkbook resources installed successfully!',
                'Open Folder'
            ).then(selection => {
                if (selection === 'Open Folder') {
                    vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetDir));
                }
            });

            this.outputChannel.appendLine(`✅ AgentWorkbook resources installed to: ${targetDir}`);
        } catch (error) {
            const errorMessage = `Failed to install AgentWorkbook resources: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(errorMessage);
            this.outputChannel.appendLine(`❌ ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Install RooCode modes and commands to workspace
     */
    async installRooCodeResources(): Promise<void> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace folder to install RooCode resources.');
            return;
        }

        const targetDir = path.join(workspaceFolder.uri.fsPath, '.roo');
        const resourcesDir = path.join(this.context.extensionPath, 'resources', '.roo');

        try {
            await this.copyDirectory(resourcesDir, targetDir);
            
            vscode.window.showInformationMessage(
                'RooCode modes and commands installed successfully!',
                'Open Folder'
            ).then(selection => {
                if (selection === 'Open Folder') {
                    vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetDir));
                }
            });

            this.outputChannel.appendLine(`✅ RooCode resources installed to: ${targetDir}`);
        } catch (error) {
            const errorMessage = `Failed to install RooCode resources: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(errorMessage);
            this.outputChannel.appendLine(`❌ ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Install specific RooCode resource type (rules, commands, or modes)
     */
    async installRooCodeResourceType(type: 'rules' | 'commands' | 'modes'): Promise<void> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage(`Please open a workspace folder to install RooCode ${type}.`);
            return;
        }

        let targetDir: string;
        let sourceDir: string;

        if (type === 'modes') {
            // Custom modes file goes to root of .roo directory
            targetDir = path.join(workspaceFolder.uri.fsPath, '.roo');
            sourceDir = path.join(this.context.extensionPath, 'resources', '.roo');
            
            try {
                // Only copy the custom_modes.yaml file
                const sourceFile = path.join(sourceDir, 'custom_modes.yaml');
                const targetFile = path.join(targetDir, 'custom_modes.yaml');
                await fs.mkdir(targetDir, { recursive: true });
                await fs.copyFile(sourceFile, targetFile);
                
                vscode.window.showInformationMessage(
                    `RooCode ${type} installed successfully!`,
                    'Open Folder'
                ).then(selection => {
                    if (selection === 'Open Folder') {
                        vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetDir));
                    }
                });

                this.outputChannel.appendLine(`✅ RooCode ${type} installed to: ${targetFile}`);
                return;
            } catch (error) {
                const errorMessage = `Failed to install RooCode ${type}: ${error instanceof Error ? error.message : String(error)}`;
                vscode.window.showErrorMessage(errorMessage);
                this.outputChannel.appendLine(`❌ ${errorMessage}`);
                throw error;
            }
        } else {
            // For rules and commands, copy the entire directory
            targetDir = path.join(workspaceFolder.uri.fsPath, '.roo', type);
            sourceDir = path.join(this.context.extensionPath, 'resources', '.roo', type);
        }

        try {
            await this.copyDirectory(sourceDir, targetDir);
            
            vscode.window.showInformationMessage(
                `RooCode ${type} installed successfully!`,
                'Open Folder'
            ).then(selection => {
                if (selection === 'Open Folder') {
                    vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetDir));
                }
            });

            this.outputChannel.appendLine(`✅ RooCode ${type} installed to: ${targetDir}`);
        } catch (error) {
            const errorMessage = `Failed to install RooCode ${type}: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(errorMessage);
            this.outputChannel.appendLine(`❌ ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Install specific resource type (flags, scripts, or templates)
     */
    async installResourceType(type: 'flags' | 'scripts' | 'templates'): Promise<void> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage(`Please open a workspace folder to install AgentWorkbook ${type}.`);
            return;
        }

        const targetDir = path.join(workspaceFolder.uri.fsPath, '.agentworkbook', type);
        const sourceDir = path.join(this.context.extensionPath, 'resources', '.agentworkbook', type);

        try {
            await this.copyDirectory(sourceDir, targetDir);
            
            vscode.window.showInformationMessage(
                `AgentWorkbook ${type} installed successfully!`,
                'Open Folder'
            ).then(selection => {
                if (selection === 'Open Folder') {
                    vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(targetDir));
                }
            });

            this.outputChannel.appendLine(`✅ AgentWorkbook ${type} installed to: ${targetDir}`);
        } catch (error) {
            const errorMessage = `Failed to install AgentWorkbook ${type}: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(errorMessage);
            this.outputChannel.appendLine(`❌ ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Check if resources are already installed
     */
    async areResourcesInstalled(): Promise<boolean> {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            return false;
        }

        const targetDir = path.join(workspaceFolder.uri.fsPath, '.agentworkbook');
        try {
            const stat = await fs.stat(targetDir);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Get available resource types
     */
    async getAvailableResourceTypes(): Promise<string[]> {
        const resourcesDir = path.join(this.context.extensionPath, 'resources', '.agentworkbook');
        try {
            const items = await fs.readdir(resourcesDir, { withFileTypes: true });
            return items
                .filter(item => item.isDirectory())
                .map(item => item.name);
        } catch (error) {
            this.outputChannel.appendLine(`Warning: Could not read resources directory: ${error}`);
            return [];
        }
    }

    /**
     * Copy directory recursively
     */
    private async copyDirectory(source: string, target: string): Promise<void> {
        try {
            await fs.mkdir(target, { recursive: true });
            const entries = await fs.readdir(source, { withFileTypes: true });

            for (const entry of entries) {
                const sourcePath = path.join(source, entry.name);
                const targetPath = path.join(target, entry.name);

                if (entry.isDirectory()) {
                    await this.copyDirectory(sourcePath, targetPath);
                } else {
                    await fs.copyFile(sourcePath, targetPath);
                    this.outputChannel.appendLine(`📁 Copied: ${entry.name}`);
                }
            }
        } catch (error) {
            throw new Error(`Failed to copy directory from ${source} to ${target}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get the current workspace folder
     */
    private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        // If multiple workspace folders, use the first one
        // TODO: Could add logic to let user choose which folder
        return workspaceFolders[0];
    }
}