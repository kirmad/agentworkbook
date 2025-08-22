import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Front-matter metadata for flags
 */
export interface FlagFrontMatter {
    /** Description for completions/suggestions */
    description?: string;
    /** How the flag appears in completions (e.g., "--think", "--flag [value]") */
    signature?: string;
    /** Where to add flag data: before prompt, after prompt, or replace inline */
    placement?: 'before' | 'after' | 'replace';
    /** Whether the flag itself should stay in the prompt or be removed */
    persist_flag?: boolean;
    /** Whether adding the flag multiple times should result in adding the flag doc multiple times */
    allow_multiple?: boolean;
}

/**
 * Represents a discovered flag with metadata
 */
export interface DiscoveredFlag {
    /** The flag name (e.g., 'think', 'cs:think') */
    name: string;
    /** Display label for the flag */
    label: string;
    /** Full file path to the flag file */
    filePath: string;
    /** Flag description from the first line of the file or front-matter */
    description?: string;
    /** Whether this is a hierarchical flag */
    isHierarchical: boolean;
    /** Path components for hierarchical flags */
    pathComponents: string[];
    /** Whether this flag supports parameters */
    isParameterized?: boolean;
    /** Source of the flag (local, global, standard) */
    source: 'local' | 'global' | 'standard';
    /** Front-matter metadata */
    frontMatter?: FlagFrontMatter;
}

/**
 * Service for discovering and managing available flags
 */
export class FlagDiscoveryService {
    private static instance: FlagDiscoveryService;
    private flagsCache: DiscoveredFlag[] = [];
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private fileWatcher?: vscode.FileSystemWatcher;

    private constructor() {}

    public static getInstance(): FlagDiscoveryService {
        if (!FlagDiscoveryService.instance) {
            FlagDiscoveryService.instance = new FlagDiscoveryService();
        }
        return FlagDiscoveryService.instance;
    }

    /**
     * Initialize the service with file watching
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Watch for changes in the flags directory
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }

        // Watch local workspace flags
        const workspaceRoot = this.getWorkspaceRoot();
        if (workspaceRoot) {
            const localFlagsPattern = path.join(workspaceRoot, '.agentworkbook', 'flags', '**', '*.md');
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(localFlagsPattern);
            
            this.fileWatcher.onDidCreate(() => this.invalidateCache());
            this.fileWatcher.onDidChange(() => this.invalidateCache());
            this.fileWatcher.onDidDelete(() => this.invalidateCache());

            context.subscriptions.push(this.fileWatcher);
        }

        // Watch global agentworkbook flags
        const globalFlagsPattern = path.join(os.homedir(), '.agentworkbook', 'flags', '**', '*.md');
        const globalFlagsWatcher = vscode.workspace.createFileSystemWatcher(globalFlagsPattern);
        
        globalFlagsWatcher.onDidCreate(() => this.invalidateCache());
        globalFlagsWatcher.onDidChange(() => this.invalidateCache());
        globalFlagsWatcher.onDidDelete(() => this.invalidateCache());

        context.subscriptions.push(globalFlagsWatcher);
    }

    /**
     * Get all available flags with caching
     */
    public async getAvailableFlags(): Promise<DiscoveredFlag[]> {
        if (this.isCacheValid()) {
            return this.flagsCache;
        }

        this.flagsCache = await this.discoverFlags();
        this.cacheTimestamp = Date.now();
        
        return this.flagsCache;
    }

    /**
     * Get flags that match a partial input
     */
    public async getMatchingFlags(partialInput: string): Promise<DiscoveredFlag[]> {
        const allFlags = await this.getAvailableFlags();
        
        // If no partial input, return all flags sorted by preference
        if (!partialInput?.trim()) {
            return this.sortFlagsByPreference(allFlags);
        }

        const normalizedInput = partialInput.toLowerCase();
        
        return allFlags.filter(flag => {
            const flagName = flag.name.toLowerCase();
            
            // Exact prefix match (highest priority)
            if (flagName.startsWith(normalizedInput)) {
                return true;
            }
            
            // Match against any path component for hierarchical flags
            if (flag.isHierarchical) {
                return flag.pathComponents.some(component => 
                    component.toLowerCase().startsWith(normalizedInput)
                );
            }
            
            // Fallback: contains match
            return flagName.includes(normalizedInput);
        }).sort((a, b) => this.compareFlags(a, b, normalizedInput));
    }

    /**
     * Discover all flags by scanning the file system
     */
    private async discoverFlags(): Promise<DiscoveredFlag[]> {
        const flags: DiscoveredFlag[] = [];
        
        try {
            // Scan local workspace flags
            const workspaceRoot = this.getWorkspaceRoot();
            if (workspaceRoot) {
                const localFlagsDir = path.join(workspaceRoot, '.agentworkbook', 'flags');
                if (fs.existsSync(localFlagsDir)) {
                    await this.scanDirectory(localFlagsDir, flags, [], 'local');
                }
            }
            
            // Scan global agentworkbook flags
            const globalFlagsDir = path.join(os.homedir(), '.agentworkbook', 'flags');
            if (fs.existsSync(globalFlagsDir)) {
                await this.scanDirectory(globalFlagsDir, flags, [], 'global');
            }
            
            return flags;
        } catch (error) {
            console.error('Error discovering flags:', error);
            return [];
        }
    }


    /**
     * Recursively scan a directory for flag files
     */
    private async scanDirectory(dirPath: string, flags: DiscoveredFlag[], pathComponents: string[], source: 'local' | 'global' = 'local'): Promise<void> {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    await this.scanDirectory(fullPath, flags, [...pathComponents, entry.name], source);
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    // Process flag file
                    const flagName = path.basename(entry.name, '.md');
                    const fullFlagName = pathComponents.length > 0 
                        ? `${pathComponents.join(':')}:${flagName}`
                        : flagName;
                    
                    // Parse front-matter and content
                    const { frontMatter, content } = await this.parseFrontMatter(fullPath);
                    
                    // Use front-matter description if available, otherwise extract from content
                    let description = frontMatter?.description;
                    if (!description) {
                        description = this.extractDescriptionFromContent(content);
                    }
                    
                    // Check if parameterized (from content since front-matter doesn't include this)
                    const isParameterized = /\$\$\d+/.test(content);
                    
                    flags.push({
                        name: fullFlagName,
                        label: `--${fullFlagName}`,
                        filePath: fullPath,
                        description,
                        isHierarchical: pathComponents.length > 0,
                        pathComponents: [...pathComponents, flagName],
                        isParameterized,
                        source,
                        frontMatter
                    });
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    /**
     * Extract the first line as description from a flag file
     */
    private async extractFlagDescription(filePath: string): Promise<string | undefined> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return this.extractDescriptionFromContent(content);
        } catch (error) {
            console.error(`Error reading flag file ${filePath}:`, error);
        }
        
        return undefined;
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
     * Check if a flag file contains parameter placeholders
     */
    private async checkIfParameterized(filePath: string): Promise<boolean> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            // Check for $$0, $$1, etc. parameter placeholders
            return /\$\$\d+/.test(content);
        } catch (error) {
            console.error(`Error checking parameterization for ${filePath}:`, error);
            return false;
        }
    }

    /**
     * Parse front-matter from a flag file
     */
    private async parseFrontMatter(filePath: string): Promise<{ frontMatter?: FlagFrontMatter; content: string }> {
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
            console.error(`Error reading flag file ${filePath}:`, error);
            return { content: '' };
        }
    }

    /**
     * Simple YAML parser for front-matter (limited to our needs)
     */
    private parseSimpleYaml(yamlContent: string): FlagFrontMatter {
        const frontMatter: FlagFrontMatter = {};
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
                case 'signature':
                    frontMatter[key] = value;
                    break;
                case 'placement':
                    if (['before', 'after', 'replace'].includes(value)) {
                        frontMatter.placement = value as 'before' | 'after' | 'replace';
                    }
                    break;
                case 'persist_flag':
                case 'allow_multiple':
                    frontMatter[key] = value.toLowerCase() === 'true';
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
        return this.flagsCache.length > 0 && 
               (Date.now() - this.cacheTimestamp) < this.CACHE_TTL;
    }

    /**
     * Sort flags by preference (local > global, then alphabetically)
     */
    private sortFlagsByPreference(flags: DiscoveredFlag[]): DiscoveredFlag[] {
        return flags.sort((a, b) => {
            const sourceOrder = { local: 0, global: 1 };
            const sourceComparison = sourceOrder[a.source] - sourceOrder[b.source];
            return sourceComparison !== 0 ? sourceComparison : a.name.localeCompare(b.name);
        });
    }

    /**
     * Compare flags with scoring for better sorting
     */
    private compareFlags(a: DiscoveredFlag, b: DiscoveredFlag, input: string): number {
        const scoreA = this.getFlagScore(a, input);
        const scoreB = this.getFlagScore(b, input);
        
        return scoreA !== scoreB ? scoreB - scoreA : a.name.localeCompare(b.name);
    }

    /**
     * Calculate priority score for flag matching
     */
    private getFlagScore(flag: DiscoveredFlag, input: string): number {
        const flagName = flag.name.toLowerCase();
        let score = 0;
        
        // Exact prefix match gets highest score
        if (flagName.startsWith(input)) {
            score += 1000;
        }
        
        // Source priority: local > global
        const sourceOrder = { local: 100, global: 50 };
        score += sourceOrder[flag.source];
        
        // Shorter names and non-hierarchical flags get slight bonus
        score += Math.max(0, 20 - flag.name.length);
        if (!flag.isHierarchical) {
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