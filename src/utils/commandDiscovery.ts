import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Front-matter metadata for custom commands
 */
export interface CommandFrontMatter {
    /** Description for completions/suggestions */
    description?: string;
    /** Hint for command arguments */
    'argument-hint'?: string;
    /** Whether the command should execute bash commands */
    'bash-execution'?: boolean;
    /** Whether to persist the command in the prompt */
    'persist-command'?: boolean;
    /** Priority for sorting in autocomplete */
    priority?: number;
}

/**
 * Represents a discovered custom command with metadata
 */
export interface DiscoveredCommand {
    /** The command name (e.g., 'git', 'git:commit') */
    name: string;
    /** Display label for the command */
    label: string;
    /** Full file path to the command file */
    filePath: string;
    /** Command description from the first line of the file or front-matter */
    description?: string;
    /** Whether this is a hierarchical command */
    isHierarchical: boolean;
    /** Path components for hierarchical commands */
    pathComponents: string[];
    /** Source of the command (local, global, standard) */
    source: 'local' | 'global' | 'standard';
    /** Front-matter metadata */
    frontMatter?: CommandFrontMatter;
    /** Raw content of the command file */
    content: string;
}

/**
 * Service for discovering and managing available custom commands
 */
export class CommandDiscoveryService {
    private static instance: CommandDiscoveryService;
    private commandsCache: DiscoveredCommand[] = [];
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private fileWatcher?: vscode.FileSystemWatcher;

    private constructor() {}

    public static getInstance(): CommandDiscoveryService {
        if (!CommandDiscoveryService.instance) {
            CommandDiscoveryService.instance = new CommandDiscoveryService();
        }
        return CommandDiscoveryService.instance;
    }

    /**
     * Initialize the service with file watching
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Watch for changes in the commands directory
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }

        // Watch local workspace commands
        const workspaceRoot = this.getWorkspaceRoot();
        if (workspaceRoot) {
            const localCommandsPattern = path.join(workspaceRoot, '.agentworkbook', 'commands', '**', '*.md');
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(localCommandsPattern);
            
            this.fileWatcher.onDidCreate(() => this.invalidateCache());
            this.fileWatcher.onDidChange(() => this.invalidateCache());
            this.fileWatcher.onDidDelete(() => this.invalidateCache());

            context.subscriptions.push(this.fileWatcher);
        }

        // Watch global agentworkbook commands
        const globalCommandsPattern = path.join(os.homedir(), '.agentworkbook', 'commands', '**', '*.md');
        const globalCommandsWatcher = vscode.workspace.createFileSystemWatcher(globalCommandsPattern);
        
        globalCommandsWatcher.onDidCreate(() => this.invalidateCache());
        globalCommandsWatcher.onDidChange(() => this.invalidateCache());
        globalCommandsWatcher.onDidDelete(() => this.invalidateCache());

        context.subscriptions.push(globalCommandsWatcher);
    }

    /**
     * Get all available commands with caching
     */
    public async getAvailableCommands(): Promise<DiscoveredCommand[]> {
        if (this.isCacheValid()) {
            return this.commandsCache;
        }

        this.commandsCache = await this.discoverCommands();
        this.cacheTimestamp = Date.now();
        
        return this.commandsCache;
    }

    /**
     * Get commands that match a partial input
     */
    public async getMatchingCommands(partialInput: string): Promise<DiscoveredCommand[]> {
        const allCommands = await this.getAvailableCommands();
        
        // If no partial input, return all commands sorted by preference
        if (!partialInput?.trim()) {
            return this.sortCommandsByPreference(allCommands);
        }

        const normalizedInput = partialInput.toLowerCase();
        
        return allCommands.filter(command => {
            const commandName = command.name.toLowerCase();
            
            // Exact prefix match (highest priority)
            if (commandName.startsWith(normalizedInput)) {
                return true;
            }
            
            // Match against any path component for hierarchical commands
            if (command.isHierarchical) {
                return command.pathComponents.some(component => 
                    component.toLowerCase().startsWith(normalizedInput)
                );
            }
            
            // Fallback: contains match
            return commandName.includes(normalizedInput);
        }).sort((a, b) => this.compareCommands(a, b, normalizedInput));
    }

    /**
     * Get a specific command by name
     */
    public async getCommand(commandName: string): Promise<DiscoveredCommand | null> {
        const allCommands = await this.getAvailableCommands();
        return allCommands.find(cmd => cmd.name === commandName) || null;
    }

    /**
     * Discover all commands by scanning the file system
     */
    private async discoverCommands(): Promise<DiscoveredCommand[]> {
        const commands: DiscoveredCommand[] = [];
        
        try {
            // Scan local workspace commands
            const workspaceRoot = this.getWorkspaceRoot();
            if (workspaceRoot) {
                const localCommandsDir = path.join(workspaceRoot, '.agentworkbook', 'commands');
                if (fs.existsSync(localCommandsDir)) {
                    await this.scanDirectory(localCommandsDir, commands, [], 'local');
                }
            }
            
            // Scan global agentworkbook commands
            const globalCommandsDir = path.join(os.homedir(), '.agentworkbook', 'commands');
            if (fs.existsSync(globalCommandsDir)) {
                await this.scanDirectory(globalCommandsDir, commands, [], 'global');
            }
            
            return commands;
        } catch (error) {
            console.error('Error discovering commands:', error);
            return [];
        }
    }

    /**
     * Recursively scan a directory for command files
     */
    private async scanDirectory(dirPath: string, commands: DiscoveredCommand[], pathComponents: string[], source: 'local' | 'global' = 'local'): Promise<void> {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    await this.scanDirectory(fullPath, commands, [...pathComponents, entry.name], source);
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    // Process command file
                    const commandName = path.basename(entry.name, '.md');
                    const fullCommandName = pathComponents.length > 0 
                        ? `${pathComponents.join(':')}:${commandName}`
                        : commandName;
                    
                    // Parse front-matter and content
                    const { frontMatter, content } = await this.parseFrontMatter(fullPath);
                    
                    // Use front-matter description if available, otherwise extract from content
                    let description = frontMatter?.description;
                    if (!description) {
                        description = this.extractDescriptionFromContent(content);
                    }
                    
                    commands.push({
                        name: fullCommandName,
                        label: `/${fullCommandName}`,
                        filePath: fullPath,
                        description,
                        isHierarchical: pathComponents.length > 0,
                        pathComponents: [...pathComponents, commandName],
                        source,
                        frontMatter,
                        content
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    /**
     * Extract description from content (first non-empty line)
     */
    private extractDescriptionFromContent(content: string): string | undefined {
        const lines = content.trim().split('\n');
        
        if (lines.length > 0) {
            let firstLine = lines[0].trim();
            
            // Remove markdown heading markers
            firstLine = firstLine.replace(/^#+\s*/, '');
            
            // Limit description length
            if (firstLine.length > 100) {
                firstLine = firstLine.substring(0, 97) + '...';
            }
            
            return firstLine || undefined;
        }
        
        return undefined;
    }

    /**
     * Parse front-matter from a command file
     */
    private async parseFrontMatter(filePath: string): Promise<{ frontMatter?: CommandFrontMatter; content: string }> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for YAML front-matter (starts with ---)
            const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
            const match = content.match(frontMatterRegex);
            
            if (!match) {
                // No front-matter found, return the original content
                return { content };
            }
            
            const [, yamlContent, remainingContent] = match;
            
            try {
                // Simple YAML parser for our specific structure
                const frontMatter = this.parseSimpleYaml(yamlContent);
                return { frontMatter, content: remainingContent };
            } catch (yamlError) {
                console.error(`Error parsing YAML front-matter in ${filePath}:`, yamlError);
                return { content };
            }
        } catch (error) {
            console.error(`Error reading command file ${filePath}:`, error);
            return { content: '' };
        }
    }

    /**
     * Simple YAML parser for front-matter (limited to our needs)
     */
    private parseSimpleYaml(yamlContent: string): CommandFrontMatter {
        const frontMatter: CommandFrontMatter = {};
        const lines = yamlContent.trim().split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue; // Skip empty lines and comments
            }
            
            const colonIndex = trimmedLine.indexOf(':');
            if (colonIndex === -1) {
                continue; // Skip malformed lines
            }
            
            const key = trimmedLine.substring(0, colonIndex).trim();
            let value = trimmedLine.substring(colonIndex + 1).trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            // Parse based on key
            switch (key) {
                case 'description':
                case 'argument-hint':
                    frontMatter[key] = value;
                    break;
                case 'bash-execution':
                case 'persist-command':
                    frontMatter[key] = value.toLowerCase() === 'true';
                    break;
                case 'priority':
                    const priorityNum = parseInt(value, 10);
                    if (!isNaN(priorityNum)) {
                        frontMatter.priority = priorityNum;
                    }
                    break;
            }
        }
        
        return frontMatter;
    }

    /**
     * Get the workspace root directory
     */
    private getWorkspaceRoot(): string | undefined {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
        return undefined;
    }

    /**
     * Check if cache is still valid
     */
    private isCacheValid(): boolean {
        return this.commandsCache.length > 0 && 
               (Date.now() - this.cacheTimestamp) < this.CACHE_TTL;
    }

    /**
     * Sort commands by preference (local > global, then by priority, then alphabetically)
     */
    private sortCommandsByPreference(commands: DiscoveredCommand[]): DiscoveredCommand[] {
        return commands.sort((a, b) => {
            // Source priority: local > global
            const sourceOrder = { local: 0, global: 1 };
            const sourceComparison = sourceOrder[a.source] - sourceOrder[b.source];
            if (sourceComparison !== 0) {
                return sourceComparison;
            }
            
            // Priority from front-matter (higher priority = lower sort order)
            const priorityA = a.frontMatter?.priority || 50;
            const priorityB = b.frontMatter?.priority || 50;
            const priorityComparison = priorityA - priorityB;
            if (priorityComparison !== 0) {
                return priorityComparison;
            }
            
            // Alphabetical
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Compare commands with scoring for better sorting
     */
    private compareCommands(a: DiscoveredCommand, b: DiscoveredCommand, input: string): number {
        const scoreA = this.getCommandScore(a, input);
        const scoreB = this.getCommandScore(b, input);
        
        return scoreA !== scoreB ? scoreB - scoreA : a.name.localeCompare(b.name);
    }

    /**
     * Calculate priority score for command matching
     */
    private getCommandScore(command: DiscoveredCommand, input: string): number {
        const commandName = command.name.toLowerCase();
        let score = 0;
        
        // Exact prefix match gets highest score
        if (commandName.startsWith(input)) {
            score += 1000;
        }
        
        // Source priority: local > global
        const sourceOrder = { local: 100, global: 50 };
        score += sourceOrder[command.source];
        
        // Front-matter priority
        const priority = command.frontMatter?.priority || 50;
        score += Math.max(0, 100 - priority); // Lower priority number = higher score
        
        // Shorter names and non-hierarchical commands get slight bonus
        score += Math.max(0, 20 - command.name.length);
        if (!command.isHierarchical) {
            score += 10;
        }
        
        return score;
    }

    /**
     * Invalidate the cache
     */
    private invalidateCache(): void {
        this.cacheTimestamp = 0;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}