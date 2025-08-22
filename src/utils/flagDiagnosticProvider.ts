import * as vscode from 'vscode';
import { FlagDiscoveryService } from './flagDiscovery';
import { parseFlags } from './flagProcessor';

/**
 * Diagnostic provider that validates flags and suppresses errors for known flags
 */
export class FlagDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private flagDiscoveryService: FlagDiscoveryService;

    constructor() {
        this.flagDiscoveryService = FlagDiscoveryService.getInstance();
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('agentworkbook-flags');
    }

    /**
     * Initialize the diagnostic provider
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Register for document changes
        const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
            (event) => this.onDocumentChange(event)
        );

        // Register for document open
        const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument(
            (document) => this.validateDocument(document)
        );

        // Register for document save
        const documentSaveDisposable = vscode.workspace.onDidSaveTextDocument(
            (document) => this.validateDocument(document)
        );

        context.subscriptions.push(
            this.diagnosticCollection,
            documentChangeDisposable,
            documentOpenDisposable,
            documentSaveDisposable
        );

        // Validate all currently open documents
        vscode.workspace.textDocuments.forEach(document => {
            if (this.isAgentWorkbookDocument(document)) {
                this.validateDocument(document);
            }
        });
    }

    /**
     * Handle document changes with debouncing
     */
    private onDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        if (!this.isAgentWorkbookDocument(event.document)) {
            return;
        }

        // Debounce validation to avoid excessive processing
        clearTimeout(this.validationTimeout);
        this.validationTimeout = setTimeout(() => {
            this.validateDocument(event.document);
        }, 500);
    }

    private validationTimeout: NodeJS.Timeout | undefined;

    /**
     * Check if document is an AgentWorkbook notebook cell
     */
    private isAgentWorkbookDocument(document: vscode.TextDocument): boolean {
        return document.uri.scheme === 'vscode-notebook-cell' && 
               document.uri.authority === 'agentworkbook';
    }

    /**
     * Validate a document for flag usage
     */
    private async validateDocument(document: vscode.TextDocument): Promise<void> {
        if (!this.isAgentWorkbookDocument(document)) {
            // Clear diagnostics for non-agentworkbook documents
            this.diagnosticCollection.delete(document.uri);
            return;
        }

        try {
            const diagnostics: vscode.Diagnostic[] = [];
            const text = document.getText();
            
            // Get all available flags
            const availableFlags = await this.flagDiscoveryService.getAvailableFlags();
            const availableFlagNames = new Set(availableFlags.map(flag => flag.name));

            // Parse flags from the document
            const parsedFlags = parseFlags(text);

            // Validate each flag
            for (const flag of parsedFlags) {
                const flagPosition = this.findFlagPosition(text, flag.fullMatch);
                
                if (flagPosition && !availableFlagNames.has(flag.name)) {
                    // Create diagnostic for unknown flag
                    const diagnostic = new vscode.Diagnostic(
                        flagPosition.range,
                        `Unknown flag: --${flag.name}`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    
                    diagnostic.source = 'AgentWorkbook';
                    diagnostic.code = 'unknown-flag';
                    
                    // Add quick fix suggestions
                    diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
                    
                    diagnostics.push(diagnostic);
                }
            }

            // Set diagnostics for the document
            this.diagnosticCollection.set(document.uri, diagnostics);

        } catch (error) {
            console.error('Error validating flags in document:', error);
        }
    }

    /**
     * Find the position of a flag in the document text
     */
    private findFlagPosition(text: string, flagMatch: string): { range: vscode.Range } | null {
        const index = text.indexOf(flagMatch);
        if (index === -1) {
            return null;
        }

        // Convert string index to line/character position
        const lines = text.substring(0, index).split('\n');
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;

        const startPosition = new vscode.Position(line, character);
        const endPosition = new vscode.Position(line, character + flagMatch.length);

        return {
            range: new vscode.Range(startPosition, endPosition)
        };
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }
        this.diagnosticCollection.dispose();
    }
}

/**
 * Code action provider for flag-related quick fixes
 */
export class FlagCodeActionProvider implements vscode.CodeActionProvider {
    private flagDiscoveryService: FlagDiscoveryService;

    constructor() {
        this.flagDiscoveryService = FlagDiscoveryService.getInstance();
    }

    /**
     * Provide code actions for flag diagnostics
     */
    public async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[]> {
        
        const actions: vscode.CodeAction[] = [];

        // Look for flag-related diagnostics
        const flagDiagnostics = context.diagnostics.filter(
            diagnostic => diagnostic.source === 'AgentWorkbook' && diagnostic.code === 'unknown-flag'
        );

        if (flagDiagnostics.length === 0) {
            return [];
        }

        // Get all available flags for suggestions
        const availableFlags = await this.flagDiscoveryService.getAvailableFlags();
        
        for (const diagnostic of flagDiagnostics) {
            const unknownFlagText = document.getText(diagnostic.range);
            const unknownFlagName = unknownFlagText.replace(/^--/, '');

            // Find similar flags
            const similarFlags = this.findSimilarFlags(unknownFlagName, availableFlags);

            // Create quick fix actions for similar flags
            for (const similarFlag of similarFlags.slice(0, 3)) { // Limit to top 3 suggestions
                const action = new vscode.CodeAction(
                    `Replace with --${similarFlag.name}`,
                    vscode.CodeActionKind.QuickFix
                );

                action.edit = new vscode.WorkspaceEdit();
                action.edit.replace(document.uri, diagnostic.range, `--${similarFlag.name}`);
                
                action.diagnostics = [diagnostic];
                action.isPreferred = similarFlags.indexOf(similarFlag) === 0;

                actions.push(action);
            }

            // Add action to create the flag file
            const createAction = new vscode.CodeAction(
                `Create flag file for --${unknownFlagName}`,
                vscode.CodeActionKind.QuickFix
            );

            createAction.command = {
                command: 'agentworkbook.createFlag',
                title: 'Create Flag',
                arguments: [unknownFlagName]
            };

            actions.push(createAction);
        }

        return actions;
    }

    /**
     * Find flags similar to the unknown flag
     */
    private findSimilarFlags(unknownFlag: string, availableFlags: any[]): any[] {
        const similarities = availableFlags.map(flag => ({
            flag,
            similarity: this.calculateSimilarity(unknownFlag.toLowerCase(), flag.name.toLowerCase())
        }));

        return similarities
            .filter(item => item.similarity > 0.3) // Minimum similarity threshold
            .sort((a, b) => b.similarity - a.similarity)
            .map(item => item.flag);
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) {
            return 1;
        }
        
        const distance = this.levenshteinDistance(str1, str2);
        return (maxLength - distance) / maxLength;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    }
}