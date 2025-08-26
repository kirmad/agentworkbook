import * as vscode from 'vscode';
import { CommandDiscoveryService, DiscoveredCommand } from './commandDiscovery';

/**
 * Completion provider for custom command autocomplete in AgentWorkbook notebook cells
 */
export class CommandCompletionProvider implements vscode.CompletionItemProvider {
    private commandDiscoveryService: CommandDiscoveryService;

    constructor() {
        this.commandDiscoveryService = CommandDiscoveryService.getInstance();
    }

    /**
     * Provide completion items for custom commands
     */
    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        // Get the current line and check if we should trigger command completion
        const line = document.lineAt(position);
        const textUpToCursor = line.text.substring(0, position.character);
        
        // Check if we're in a position where command completion should trigger
        const commandContext = this.getCommandContext(textUpToCursor);
        if (!commandContext) {
            return [];
        }

        // Get matching commands
        const matchingCommands = await this.commandDiscoveryService.getMatchingCommands(commandContext.partial);
        
        // Convert to completion items
        const completionItems = matchingCommands.map(command => this.createCompletionItem(command, commandContext, position));
        
        // Return as completion list with flag to prevent sorting
        return new vscode.CompletionList(completionItems, false);
    }

    /**
     * Analyze the text to determine if we're in a command context and extract partial input
     */
    private getCommandContext(textUpToCursor: string): { partial: string; startPos: number } | null {
        // Look for patterns like:
        // "/" (just started typing a command - show all commands)
        // "/g" (partial command name - filter to commands starting with 'g')
        // "/git" (more specific partial - filter more precisely)
        // "/git:" (hierarchical command start)
        // "/git:co" (partial hierarchical command)
        
        // Pattern that matches commands at the start of a line or after whitespace
        const commandPattern = /(?:^|[\s])\/([a-zA-Z0-9_:-]*)$/;
        const match = textUpToCursor.match(commandPattern);
        
        if (match) {
            const partial = match[1]; // The part after "/"
            const fullMatch = match[0];
            const startPos = textUpToCursor.length - fullMatch.length;
            
            // Find the actual start position of "/"
            const actualStartPos = startPos + fullMatch.indexOf('/');
            
            return { partial, startPos: actualStartPos };
        }
        
        return null;
    }

    /**
     * Create a completion item for a discovered command
     */
    private createCompletionItem(
        command: DiscoveredCommand, 
        context: { partial: string; startPos: number }, 
        position?: vscode.Position
    ): vscode.CompletionItem {
        const completionItem = new vscode.CompletionItem(command.name, vscode.CompletionItemKind.Function);
        
        // Set the text that will be inserted
        completionItem.insertText = command.name;
        
        // Set the label (what's displayed in the completion list)
        const argumentHint = command.frontMatter?.['argument-hint'] || '';
        const displayLabel = argumentHint ? `${command.name} ${argumentHint}` : command.name;
        
        const labelDescription = [];
        if (command.isHierarchical) {
            labelDescription.push('hierarchical');
        }
        if (command.frontMatter?.['bash-execution']) {
            labelDescription.push('bash');
        }
        if (command.source !== 'local') {
            labelDescription.push(command.source);
        }
        
        completionItem.label = {
            label: displayLabel,
            description: labelDescription.length > 0 ? `(${labelDescription.join(', ')})` : undefined
        };
        
        // Add description (prefer front-matter description)
        const description = command.frontMatter?.description || command.description;
        if (description) {
            completionItem.detail = description;
        }
        
        // Add documentation with more details
        const markdownDoc = new vscode.MarkdownString();
        markdownDoc.appendMarkdown(`**/${displayLabel}**\n\n`);
        
        if (description) {
            markdownDoc.appendMarkdown(`${description}\n\n`);
        }
        
        // Add front-matter metadata if available
        if (command.frontMatter) {
            const fm = command.frontMatter;
            markdownDoc.appendMarkdown(`### Configuration\n\n`);
            
            if (fm['argument-hint']) {
                markdownDoc.appendMarkdown(`- **Arguments**: ${fm['argument-hint']}\n`);
            }
            if (fm['bash-execution'] !== undefined) {
                markdownDoc.appendMarkdown(`- **Bash execution**: ${fm['bash-execution']}\n`);
            }
            if (fm['persist-command'] !== undefined) {
                markdownDoc.appendMarkdown(`- **Persist command**: ${fm['persist-command']}\n`);
            }
            if (fm.priority !== undefined) {
                markdownDoc.appendMarkdown(`- **Priority**: ${fm.priority}\n`);
            }
            markdownDoc.appendMarkdown(`\n`);
        }
        
        if (command.isHierarchical) {
            markdownDoc.appendMarkdown(`*Hierarchical command*: \`${command.pathComponents.join(' → ')}\`\n\n`);
        }
        
        if (command.frontMatter?.['bash-execution']) {
            markdownDoc.appendMarkdown(`*Bash execution enabled*: This command can execute shell commands\n\n`);
        }
        
        markdownDoc.appendMarkdown(`**Usage**: \`/${command.name}\``);
        if (argumentHint) {
            markdownDoc.appendMarkdown(` \`${argumentHint}\``);
        }
        markdownDoc.appendMarkdown(`\n\n`);
        
        markdownDoc.appendMarkdown(`File: \`${command.filePath}\``);
        
        completionItem.documentation = markdownDoc;
        
        // Set sort order - prioritize by priority, then non-hierarchical flags, then shorter names
        const priority = command.frontMatter?.priority || 50;
        const hierarchicalBonus = command.isHierarchical ? '2' : '1';
        completionItem.sortText = `${priority.toString().padStart(3, '0')}_${hierarchicalBonus}_${command.name.length.toString().padStart(3, '0')}_${command.name}`;
        
        // Set filter text for better matching
        completionItem.filterText = command.name;
        
        // Configure how the completion replaces existing text
        if (position) {
            const range = new vscode.Range(
                new vscode.Position(position.line, context.startPos + 1), // +1 to skip the "/"
                new vscode.Position(position.line, context.startPos + 1 + context.partial.length)
            );
            completionItem.range = range;
        }
        
        // Add snippet support for commands with arguments
        if (command.frontMatter?.['argument-hint']) {
            completionItem.insertText = new vscode.SnippetString(`${command.name} \${1:${command.frontMatter['argument-hint']}}`);
            completionItem.kind = vscode.CompletionItemKind.Snippet;
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
 * Completion provider for command arguments
 */
export class CommandArgumentCompletionProvider implements vscode.CompletionItemProvider {
    private commandDiscoveryService: CommandDiscoveryService;

    constructor() {
        this.commandDiscoveryService = CommandDiscoveryService.getInstance();
    }
    
    /**
     * Provide completion items for command arguments
     */
    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const line = document.lineAt(position);
        const textUpToCursor = line.text.substring(0, position.character);
        
        // Check if we're inside command arguments
        const argumentContext = this.getArgumentContext(textUpToCursor);
        if (!argumentContext) {
            return [];
        }
        
        // Get the command to provide contextual argument suggestions
        const command = await this.commandDiscoveryService.getCommand(argumentContext.commandName);
        if (!command) {
            return [];
        }
        
        // Provide contextual argument suggestions
        return this.createArgumentCompletions(command, argumentContext);
    }

    /**
     * Analyze text to determine if we're in an argument context
     */
    private getArgumentContext(textUpToCursor: string): { commandName: string; argumentText: string } | null {
        // Look for patterns like:
        // "/git commit " (after command with space)
        // "/git:commit some args " (hierarchical command with args)
        
        const argumentPattern = /\/([a-zA-Z0-9_:-]+)\s+(.*)$/;
        const match = textUpToCursor.match(argumentPattern);
        
        if (match) {
            const commandName = match[1];
            const argumentText = match[2];
            
            return { commandName, argumentText };
        }
        
        return null;
    }

    /**
     * Create argument completion items based on command and context
     */
    private createArgumentCompletions(
        command: DiscoveredCommand, 
        context: { commandName: string; argumentText: string }
    ): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Use argument hint from front-matter if available
        const argumentHint = command.frontMatter?.['argument-hint'];
        if (argumentHint) {
            // Parse argument hint to provide structured suggestions
            // For example: "[feature-description] [--type component|api|service]"
            const suggestions = this.parseArgumentHint(argumentHint);
            completions.push(...suggestions);
        }
        
        // Provide some common argument patterns
        if (command.name.includes('git')) {
            completions.push(
                this.createArgumentItem('commit -m "message"', 'Git commit with message'),
                this.createArgumentItem('status', 'Git status'),
                this.createArgumentItem('push', 'Git push'),
                this.createArgumentItem('pull', 'Git pull')
            );
        }
        
        // Add generic suggestions based on common patterns
        if (!context.argumentText.trim()) {
            completions.push(this.createArgumentItem('--help', 'Show help for this command'));
        }
        
        return completions;
    }

    /**
     * Parse argument hint to create completion suggestions
     */
    private parseArgumentHint(argumentHint: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Look for patterns like [option1|option2|option3]
        const optionPattern = /\[([^\]]*)\]/g;
        let match;
        
        while ((match = optionPattern.exec(argumentHint)) !== null) {
            const options = match[1];
            
            // Check if it contains options separated by |
            if (options.includes('|')) {
                const optionsList = options.split('|').map(opt => opt.trim());
                for (const option of optionsList) {
                    if (option.startsWith('--')) {
                        completions.push(this.createArgumentItem(option, `Option: ${option}`));
                    } else {
                        completions.push(this.createArgumentItem(option, `Value: ${option}`));
                    }
                }
            } else {
                // Single placeholder
                completions.push(this.createArgumentItem(options, `Argument: ${options}`));
            }
        }
        
        return completions;
    }

    /**
     * Create an argument completion item
     */
    private createArgumentItem(text: string, description: string): vscode.CompletionItem {
        const item = new vscode.CompletionItem(text, vscode.CompletionItemKind.Value);
        item.detail = description;
        item.insertText = text;
        return item;
    }
}