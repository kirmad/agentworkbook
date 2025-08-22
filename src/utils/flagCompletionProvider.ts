import * as vscode from 'vscode';
import { FlagDiscoveryService, DiscoveredFlag } from './flagDiscovery';

/**
 * Completion provider for flag autocomplete in AgentWorkbook notebook cells
 */
export class FlagCompletionProvider implements vscode.CompletionItemProvider {
    private flagDiscoveryService: FlagDiscoveryService;

    constructor() {
        this.flagDiscoveryService = FlagDiscoveryService.getInstance();
    }

    /**
     * Provide completion items for flags
     */
    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        // Get the current line and check if we should trigger flag completion
        const line = document.lineAt(position);
        const textUpToCursor = line.text.substring(0, position.character);
        
        // Check if we're in a position where flag completion should trigger
        const flagMatch = this.getFlagContext(textUpToCursor);
        if (!flagMatch) {
            return [];
        }

        // Get matching flags
        const matchingFlags = await this.flagDiscoveryService.getMatchingFlags(flagMatch.partial);
        
        // Convert to completion items
        const completionItems = matchingFlags.map(flag => this.createCompletionItem(flag, flagMatch, position));
        
        // Return as completion list with flag to prevent sorting
        return new vscode.CompletionList(completionItems, false);
    }

    /**
     * Analyze the text to determine if we're in a flag context and extract partial input
     */
    private getFlagContext(textUpToCursor: string): { partial: string; startPos: number } | null {
        // Look for patterns like:
        // "--" (just started typing a flag - show all flags)
        // "--t" (partial flag name - filter to flags starting with 't')
        // "--think" (more specific partial - filter more precisely)
        // "--cs:" (hierarchical flag start)
        // "--cs:th" (partial hierarchical flag)
        
        // More precise pattern that ensures we're actually after "--"
        const flagPattern = /(?:^|[\s\(,])--([a-zA-Z0-9_:-]*)$/;
        const match = textUpToCursor.match(flagPattern);
        
        if (match) {
            const partial = match[1]; // The part after "--"
            const fullMatch = match[0];
            const startPos = textUpToCursor.length - fullMatch.length;
            
            // Find the actual start position of "--"
            const actualStartPos = startPos + fullMatch.indexOf('--');
            
            return { partial, startPos: actualStartPos };
        }
        
        return null;
    }

    /**
     * Create a completion item for a discovered flag
     */
    private createCompletionItem(flag: DiscoveredFlag, context: { partial: string; startPos: number }, position?: vscode.Position): vscode.CompletionItem {
        const completionItem = new vscode.CompletionItem(flag.name, vscode.CompletionItemKind.Snippet);
        
        // Set the text that will be inserted
        completionItem.insertText = flag.name;
        
        // Set the label (what's displayed in the completion list)
        // Use front-matter signature if available, otherwise use default label
        const displayLabel = flag.frontMatter?.signature || flag.label;
        const labelDescription = [];
        if (flag.isHierarchical) {
            labelDescription.push('hierarchical');
        }
        if (flag.source !== 'local') {
            labelDescription.push(flag.source);
        }
        
        completionItem.label = {
            label: displayLabel,
            description: labelDescription.length > 0 ? `(${labelDescription.join(', ')})` : undefined
        };
        
        // Add description (prefer front-matter description)
        const description = flag.frontMatter?.description || flag.description;
        if (description) {
            completionItem.detail = description;
        }
        
        // Add documentation with more details
        const markdownDoc = new vscode.MarkdownString();
        markdownDoc.appendMarkdown(`**${displayLabel}**\n\n`);
        
        if (description) {
            markdownDoc.appendMarkdown(`${description}\n\n`);
        }
        
        // Add front-matter metadata if available
        if (flag.frontMatter) {
            const fm = flag.frontMatter;
            markdownDoc.appendMarkdown(`### Configuration\n\n`);
            
            if (fm.placement) {
                markdownDoc.appendMarkdown(`- **Placement**: ${fm.placement}\n`);
            }
            if (fm.persist_flag !== undefined) {
                markdownDoc.appendMarkdown(`- **Persist flag**: ${fm.persist_flag}\n`);
            }
            if (fm.allow_multiple !== undefined) {
                markdownDoc.appendMarkdown(`- **Allow multiple**: ${fm.allow_multiple}\n`);
            }
            markdownDoc.appendMarkdown(`\n`);
        }
        
        if (flag.isHierarchical) {
            markdownDoc.appendMarkdown(`*Hierarchical flag*: \`${flag.pathComponents.join(' → ')}\`\n\n`);
        }
        
        if (flag.isParameterized) {
            markdownDoc.appendMarkdown(`*Supports parameters*: Use \`${flag.label}(param1, param2)\`\n\n`);
        }
        
        markdownDoc.appendMarkdown(`File: \`${flag.filePath}\``);
        
        completionItem.documentation = markdownDoc;
        
        // Set sort order - prioritize non-hierarchical flags and shorter names
        const sortPriority = flag.isHierarchical ? '2' : '1';
        completionItem.sortText = `${sortPriority}_${flag.name.length.toString().padStart(3, '0')}_${flag.name}`;
        
        // Set filter text for better matching
        completionItem.filterText = flag.name;
        
        // Configure how the completion replaces existing text
        if (position) {
            const range = new vscode.Range(
                new vscode.Position(position.line, context.startPos + 2), // +2 to skip the "--"
                new vscode.Position(position.line, context.startPos + 2 + context.partial.length)
            );
            completionItem.range = range;
        }
        
        // Add command to trigger parameter snippet if flag is parameterized
        if (flag.isParameterized) {
            completionItem.command = {
                command: 'editor.action.triggerParameterHints',
                title: 'Trigger Parameter Hints'
            };
        }
        
        return completionItem;
    }

    /**
     * Resolve additional information for a completion item
     */
    public async resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): Promise<vscode.CompletionItem> {
        // Additional resolution can be added here if needed
        return item;
    }
}

/**
 * Completion provider for flag parameters
 */
export class FlagParameterCompletionProvider implements vscode.CompletionItemProvider {
    
    /**
     * Provide completion items for flag parameters
     */
    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const line = document.lineAt(position);
        const textUpToCursor = line.text.substring(0, position.character);
        
        // Check if we're inside flag parameters
        const parameterContext = this.getParameterContext(textUpToCursor);
        if (!parameterContext) {
            return [];
        }
        
        // Provide contextual parameter suggestions
        return this.createParameterCompletions(parameterContext);
    }

    /**
     * Analyze text to determine if we're in a parameter context
     */
    private getParameterContext(textUpToCursor: string): { flagName: string; paramIndex: number } | null {
        // Look for patterns like:
        // "--docs(" (start of parameters)
        // "--docs(file.md, " (between parameters)
        
        const paramPattern = /--([a-zA-Z0-9_:-]+)\(([^)]*)$/;
        const match = textUpToCursor.match(paramPattern);
        
        if (match) {
            const flagName = match[1];
            const paramsText = match[2];
            const paramIndex = paramsText.split(',').length - 1;
            
            return { flagName, paramIndex };
        }
        
        return null;
    }

    /**
     * Create parameter completion items based on context
     */
    private createParameterCompletions(context: { flagName: string; paramIndex: number }): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Provide contextual suggestions based on flag name and parameter index
        if (context.flagName === 'docs') {
            if (context.paramIndex === 0) {
                // First parameter for docs flag - suggest file paths
                completions.push(this.createParameterItem('src/components/', 'Component file path'));
                completions.push(this.createParameterItem('docs/', 'Documentation file path'));
                completions.push(this.createParameterItem('README.md', 'README file'));
            } else if (context.paramIndex === 1) {
                // Second parameter for docs flag - suggest component names
                completions.push(this.createParameterItem('Component Name', 'Display name for the component'));
                completions.push(this.createParameterItem('API Documentation', 'API documentation title'));
            }
        }
        
        // Add generic parameter suggestions
        completions.push(this.createParameterItem('param' + (context.paramIndex + 1), `Parameter ${context.paramIndex + 1}`));
        
        return completions;
    }

    /**
     * Create a parameter completion item
     */
    private createParameterItem(text: string, description: string): vscode.CompletionItem {
        const item = new vscode.CompletionItem(text, vscode.CompletionItemKind.Value);
        item.detail = description;
        item.insertText = text;
        return item;
    }
}