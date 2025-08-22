import { compareVersions } from 'compare-versions';
import * as vscode from 'vscode';

import { IClineController, ClineController } from './ai/controller';
import { AgentWorkbookSerializer } from './notebook/serializer';
import { PyNotebookController } from './python/controller';
import { AgentWorkbook } from './agentworkbook';
import { Task, Tasks } from './tasks/manager';
import { TemplateManager } from './notebook/templates/templateManager';
import { ResourceInstaller } from './resources/installer';
import * as telemetry from './utils/telemetry';
import { timeout } from './utils/asyncUtils';
import { EXTENSION_IDS, MIN_ROO_CODE_VERSION, COMMANDS, TIMEOUTS } from './core/constants';
import { createNewNotebook } from './notebook/creation';
import { FlagDiscoveryService } from './utils/flagDiscovery';
import { FlagCompletionProvider, FlagParameterCompletionProvider } from './utils/flagCompletionProvider';
import { FlagDiagnosticProvider, FlagCodeActionProvider } from './utils/flagDiagnosticProvider';
import { FilePathCompletionProvider } from './utils/filePathCompletionProvider';

export { AgentWorkbook, Task };

export async function activate(context: vscode.ExtensionContext): Promise<AgentWorkbook> {
    // Initialize telemetry
    await timeout(TIMEOUTS.TELEMETRY_INIT, telemetry.TelemetryCollector.init(context));
    
    const outputChannel = vscode.window.createOutputChannel('AgentWorkbook');
    outputChannel.appendLine('AgentWorkbook extension is now running!');

    // Initialize core components
    const clineController = await initializeClineController();
    const tasks = new Tasks();

    const agentWorkbook = new AgentWorkbook(context, outputChannel, clineController, tasks);
    const notebookController = new PyNotebookController(context, outputChannel, agentWorkbook);

    // Register notebook serializer
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer('agentworkbook', new AgentWorkbookSerializer()),
        outputChannel,
        notebookController
    );

    // Register commands
    registerCommands(context, outputChannel);

    // Initialize and register flag completion providers
    await registerFlagCompletionProviders(context);

    // Initialize and register file path completion provider
    await registerFilePathCompletionProvider(context);

    // Initialize and register flag diagnostic provider
    await registerFlagDiagnosticProvider(context);

    telemetry.extensionActivated();
    return agentWorkbook;
}

/**
 * Initialize the Cline controller with version validation
 */
async function initializeClineController(): Promise<IClineController> {
    const ai_extension = vscode.extensions.getExtension(EXTENSION_IDS.ROO_CLINE);
    if (!ai_extension) {
        throw new Error(`AgentWorkbook: RooCode (${EXTENSION_IDS.ROO_CODE}) extension not found`);
    }

    const rooCodeVersion = ai_extension.packageJSON.version;
    
    if (compareVersions(rooCodeVersion, MIN_ROO_CODE_VERSION) >= 0) {
        const ai_api: import('./ai/rooCode').RooCodeAPI = ai_extension.exports;
        return new ClineController(ai_api, true);
    } else {
        throw new Error(`AgentWorkbook: This version requires RooCode ${MIN_ROO_CODE_VERSION} or higher. Current version: ${rooCodeVersion}. Please update your RooCode extension.`);
    }
}

/**
 * Register all VS Code commands
 */
function registerCommands(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): void {
    const resourceInstaller = new ResourceInstaller(context, outputChannel);

    // Register new notebook command
    const newNotebookDisposable = vscode.commands.registerCommand(
        COMMANDS.NEW_NOTEBOOK, 
        createNewNotebook
    );

    // Register template insertion command
    const insertTemplateDisposable = vscode.commands.registerCommand(
        COMMANDS.INSERT_TEMPLATE, 
        async (cellContext?: vscode.NotebookCell) => {
            const template = await TemplateManager.showTemplateQuickPick();
            if (template) {
                await TemplateManager.insertTemplateIntoNotebook(template, cellContext);
            }
        }
    );

    // Register resource installation commands
    const installResourcesDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_RESOURCES,
        () => resourceInstaller.installResources()
    );

    const installFlagsDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_FLAGS,
        () => resourceInstaller.installResourceType('flags')
    );

    const installScriptsDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_SCRIPTS,
        () => resourceInstaller.installResourceType('scripts')
    );

    const installTemplatesDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_TEMPLATES,
        () => resourceInstaller.installResourceType('templates')
    );

    // Register RooCode resource installation commands
    const installRooCodeResourcesDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_ROOCODE_RESOURCES,
        () => resourceInstaller.installRooCodeResources()
    );

    const installRooCodeModesDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_ROOCODE_MODES,
        () => resourceInstaller.installRooCodeResourceType('modes')
    );

    const installRooCodeCommandsDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_ROOCODE_COMMANDS,
        () => resourceInstaller.installRooCodeResourceType('commands')
    );

    const installRooCodeRulesDisposable = vscode.commands.registerCommand(
        COMMANDS.INSTALL_ROOCODE_RULES,
        () => resourceInstaller.installRooCodeResourceType('rules')
    );

    const toggleShellCommandsDisposable = vscode.commands.registerCommand(
        COMMANDS.TOGGLE_SHELL_COMMANDS,
        () => {
            const config = vscode.workspace.getConfiguration('agentworkbook');
            const enabled = config.get('shellCommands.enabled', true);
            config.update('shellCommands.enabled', !enabled, true).then(() => {
                vscode.window.showInformationMessage(
                    `Shell commands ${!enabled ? 'enabled' : 'disabled'}`
                );
            });
        }
    );

    const clearShellCommandCacheDisposable = vscode.commands.registerCommand(
        COMMANDS.CLEAR_SHELL_COMMAND_CACHE,
        async () => {
            const { shellCommandProcessor } = await import('./utils/shellCommandProcessor');
            shellCommandProcessor.clearCache();
            vscode.window.showInformationMessage('Shell command cache cleared');
        }
    );

    context.subscriptions.push(
        newNotebookDisposable,
        insertTemplateDisposable,
        installResourcesDisposable,
        installFlagsDisposable,
        installScriptsDisposable,
        installTemplatesDisposable,
        installRooCodeResourcesDisposable,
        installRooCodeModesDisposable,
        installRooCodeCommandsDisposable,
        installRooCodeRulesDisposable,
        toggleShellCommandsDisposable,
        clearShellCommandCacheDisposable
    );

    // Register create flag command
    const createFlagDisposable = vscode.commands.registerCommand(
        COMMANDS.CREATE_FLAG,
        async (flagName: string) => {
            await createFlagFile(flagName);
        }
    );

    context.subscriptions.push(createFlagDisposable);
}

/**
 * Register flag completion providers for notebook cells
 */
async function registerFlagCompletionProviders(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Initialize the flag discovery service
        const flagDiscoveryService = FlagDiscoveryService.getInstance();
        flagDiscoveryService.initialize(context);

        // Create completion providers
        const flagCompletionProvider = new FlagCompletionProvider();
        const flagParameterCompletionProvider = new FlagParameterCompletionProvider();

        // Define document selector for agentworkbook files and notebook cells
        const documentSelector: vscode.DocumentSelector = [
            {
                notebookType: 'agentworkbook',
                language: '*' // Support all languages in agentworkbook notebooks
            },
            {
                pattern: '**/*.agentworkbook' // Support regular agentworkbook files
            }
        ];

        // Register flag completion provider
        // No trigger characters - let it work on any completion request
        const flagCompletionDisposable = vscode.languages.registerCompletionItemProvider(
            documentSelector,
            flagCompletionProvider
        );

        // Register parameter completion provider
        // Triggers on "(" and "," for flag parameters
        const parameterCompletionDisposable = vscode.languages.registerCompletionItemProvider(
            documentSelector,
            flagParameterCompletionProvider,
            '(', ',' // Trigger characters for parameters
        );

        // Add to subscriptions for proper cleanup
        context.subscriptions.push(
            flagCompletionDisposable,
            parameterCompletionDisposable
        );

    } catch (error) {
        console.error('Error registering flag completion providers:', error);
    }
}

/**
 * Register file path completion provider for notebook cells
 */
async function registerFilePathCompletionProvider(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Create file path completion provider
        const filePathCompletionProvider = new FilePathCompletionProvider();

        // Define document selector for agentworkbook notebook cells
        const documentSelector: vscode.DocumentSelector = {
            notebookType: 'agentworkbook',
            language: '*' // Support all languages in agentworkbook notebooks
        };

        // Register file path completion provider
        // Triggers on "@" character to show file paths
        const filePathCompletionDisposable = vscode.languages.registerCompletionItemProvider(
            documentSelector,
            filePathCompletionProvider,
            '@' // Trigger character for file paths
        );

        // Add to subscriptions for proper cleanup
        context.subscriptions.push(filePathCompletionDisposable);

    } catch (error) {
        console.error('Error registering file path completion provider:', error);
    }
}

/**
 * Register flag diagnostic provider for notebook cells
 */
async function registerFlagDiagnosticProvider(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Create and initialize the diagnostic provider
        const flagDiagnosticProvider = new FlagDiagnosticProvider();
        flagDiagnosticProvider.initialize(context);

        // Create and register the code action provider
        const flagCodeActionProvider = new FlagCodeActionProvider();

        // Define document selector for agentworkbook notebook cells
        const documentSelector: vscode.DocumentSelector = {
            notebookType: 'agentworkbook',
            language: '*' // Support all languages in agentworkbook notebooks
        };

        // Register code action provider for quick fixes
        const codeActionDisposable = vscode.languages.registerCodeActionsProvider(
            documentSelector,
            flagCodeActionProvider,
            {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
            }
        );

        // Add to subscriptions for proper cleanup
        context.subscriptions.push(codeActionDisposable);

    } catch (error) {
        console.error('Error registering flag diagnostic provider:', error);
    }
}

/**
 * Create a new flag file
 */
async function createFlagFile(flagName: string): Promise<void> {
    try {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        // Determine the flag file path
        const pathComponents = flagName.split(':');
        let flagFilePath: string;

        if (pathComponents.length === 1) {
            // Flat flag
            flagFilePath = `${workspaceRoot}/.agentworkbook/flags/${flagName}.md`;
        } else {
            // Hierarchical flag
            const directories = pathComponents.slice(0, -1);
            const fileName = pathComponents[pathComponents.length - 1];
            flagFilePath = `${workspaceRoot}/.agentworkbook/flags/${directories.join('/')}/${fileName}.md`;
        }

        // Check if flag file already exists
        const flagUri = vscode.Uri.file(flagFilePath);
        try {
            await vscode.workspace.fs.stat(flagUri);
            vscode.window.showWarningMessage(`Flag file already exists: ${flagName}`);
            return;
        } catch {
            // File doesn't exist, which is what we want
        }

        // Create directories if needed
        const flagDir = vscode.Uri.file(flagFilePath.substring(0, flagFilePath.lastIndexOf('/')));
        await vscode.workspace.fs.createDirectory(flagDir);

        // Create flag file with template content
        const flagContent = `# ${flagName.charAt(0).toUpperCase() + flagName.slice(1)} Flag
Brief description of what this flag does

Add detailed description of the flag's purpose and usage here.

## Usage
Add \`--${flagName}\` to your prompt to enable this functionality.

## Parameters
${pathComponents.length > 1 ? `This is a hierarchical flag: \`${pathComponents.join(' → ')}\`` : 'This flag does not take parameters.'}
`;

        await vscode.workspace.fs.writeFile(flagUri, Buffer.from(flagContent, 'utf8'));

        // Open the created file for editing
        const document = await vscode.workspace.openTextDocument(flagUri);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(`Flag file created: ${flagName}`);
    } catch (error) {
        console.error('Error creating flag file:', error);
        vscode.window.showErrorMessage(`Failed to create flag file: ${error}`);
    }
}

export async function deactivate() {
    telemetry.extensionDeactivating();
    
    // Dispose of flag discovery service
    const flagDiscoveryService = FlagDiscoveryService.getInstance();
    flagDiscoveryService.dispose();
    
    await timeout(TIMEOUTS.TELEMETRY_INIT, telemetry.TelemetryCollector.dispose());
}
