import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Completion provider for file path autocomplete in AgentWorkbook notebook cells
 * Triggered by "@" character to provide relative file paths from workspace root
 */
export class FilePathCompletionProvider implements vscode.CompletionItemProvider {
    private static readonly EXCLUDED_EXTENSIONS = new Set([
        '.pyc', '.pyo', '.pyd', '.so', '.dylib', '.dll', '.exe', '.bin', '.obj', '.o',
        '.class', '.jar', '.war', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
        '.log', '.tmp', '.temp', '.cache', '.lock'
    ]);

    private static readonly EXCLUDED_DIRECTORIES = new Set([
        'node_modules', '.git', '.svn', '.hg', '.vscode', '.idea', 'dist', 'build',
        'out', '__pycache__', '.pytest_cache', '.coverage', '.nyc_output', 'coverage',
        'logs', 'tmp', 'temp', '.DS_Store', 'Thumbs.db'
    ]);

    private static readonly MAX_SEARCH_DEPTH = 10;
    private static readonly MAX_FILES_RETURNED = 100;

    /**
     * Provide completion items for file paths
     */
    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
        
        // Get the current line and check if we should trigger file path completion
        const line = document.lineAt(position);
        const textUpToCursor = line.text.substring(0, position.character);
        
        // Check if we're in a position where file path completion should trigger
        const pathContext = this.getFilePathContext(textUpToCursor);
        if (!pathContext) {
            return [];
        }

        // Get workspace root
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return [];
        }

        // Get matching file paths
        const matchingFiles = await this.getMatchingFiles(workspaceRoot, pathContext.partial);
        
        // Convert to completion items
        const completionItems = matchingFiles.map(filePath => 
            this.createFilePathCompletionItem(filePath, pathContext, workspaceRoot)
        );
        
        // Return as completion list with flag to prevent sorting
        return new vscode.CompletionList(completionItems, false);
    }

    /**
     * Analyze the text to determine if we're in a file path context and extract partial input
     */
    private getFilePathContext(textUpToCursor: string): { partial: string; startPos: number } | null {
        // Look for patterns like:
        // "@" (just started typing a file path)
        // "@src/" (partial directory path)
        // "@src/components/Button" (partial file path)
        
        const pathPattern = /@([^\s]*)$/;
        const match = textUpToCursor.match(pathPattern);
        
        if (match) {
            const partial = match[1]; // The part after "@"
            const startPos = textUpToCursor.length - match[0].length;
            
            return { partial, startPos };
        }
        
        return null;
    }

    /**
     * Get the workspace root directory
     */
    private getWorkspaceRoot(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        return workspaceFolders[0].uri.fsPath;
    }

    /**
     * Get files matching the partial path input
     */
    private async getMatchingFiles(workspaceRoot: string, partial: string): Promise<string[]> {
        const allFiles = await this.getAllWorkspaceFiles(workspaceRoot);
        
        if (!partial) {
            // Show all files with intelligent prioritization for initial display
            return this.prioritizeFilesForInitialDisplay(allFiles);
        }
        
        // Filter files based on partial match
        const matchingFiles = allFiles.filter(filePath => {
            const lowerFilePath = filePath.toLowerCase();
            const lowerPartial = partial.toLowerCase();
            
            // Match if the file path starts with or contains the partial
            return lowerFilePath.startsWith(lowerPartial) || 
                   lowerFilePath.includes('/' + lowerPartial) ||
                   path.basename(lowerFilePath).includes(lowerPartial);
        });

        // Sort by relevance: exact matches first, then prefix matches, then contains
        return matchingFiles
            .sort((a, b) => this.calculateRelevanceScore(b, partial) - this.calculateRelevanceScore(a, partial))
            .slice(0, FilePathCompletionProvider.MAX_FILES_RETURNED);
    }

    /**
     * Prioritize files for initial display when no partial is provided
     * Shows files across entire hierarchy with intelligent organization
     */
    private prioritizeFilesForInitialDisplay(allFiles: string[]): string[] {
        // Add directories for navigation (one per top-level directory)
        const directories = new Set<string>();
        const files = [...allFiles];
        
        for (const filePath of allFiles) {
            const parts = filePath.split('/');
            if (parts.length > 1) {
                directories.add(parts[0] + '/');
            }
        }
        
        // Add top-level directories to the list
        files.push(...Array.from(directories));
        
        // Sort all files and directories by initial display priority
        return files
            .sort((a, b) => this.calculateInitialDisplayScore(b) - this.calculateInitialDisplayScore(a))
            .slice(0, FilePathCompletionProvider.MAX_FILES_RETURNED);
    }

    /**
     * Calculate priority score for initial display (when no partial provided)
     */
    private calculateInitialDisplayScore(filePath: string): number {
        const fileName = path.basename(filePath);
        const lowerFileName = fileName.toLowerCase();
        const lowerFilePath = filePath.toLowerCase();
        const pathDepth = filePath.split('/').length;
        const isDirectory = filePath.endsWith('/');
        
        let score = 0;
        
        // Important root files get highest priority
        const importantRootFiles = [
            'readme.md', 'readme.txt', 'readme',
            'package.json', 'package-lock.json',
            'tsconfig.json', 'jsconfig.json',
            'webpack.config.js', 'vite.config.js',
            'docker-compose.yml', 'dockerfile',
            '.gitignore', '.env', '.env.example',
            'license', 'license.md', 'license.txt',
            'changelog.md', 'contributing.md'
        ];
        
        if (pathDepth === 1 && importantRootFiles.includes(lowerFileName)) {
            score += 1000;
        }
        
        // Top-level directories get high priority for navigation
        if (isDirectory && pathDepth === 1) {
            score += 800;
        }
        
        // Configuration files get high priority
        const configExtensions = ['.json', '.yml', '.yaml', '.toml', '.ini', '.config.js'];
        const hasConfigExt = configExtensions.some(ext => lowerFileName.endsWith(ext));
        if (hasConfigExt && pathDepth <= 2) {
            score += 600;
        }
        
        // Main source files get good priority
        const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java'];
        const hasSourceExt = sourceExtensions.some(ext => lowerFileName.endsWith(ext));
        if (hasSourceExt) {
            score += 400;
        }
        
        // Documentation files get moderate priority
        const docExtensions = ['.md', '.txt', '.rst'];
        const hasDocExt = docExtensions.some(ext => lowerFileName.endsWith(ext));
        if (hasDocExt) {
            score += 300;
        }
        
        // Common entry points get bonus points
        const entryPoints = ['main.ts', 'main.js', 'index.ts', 'index.js', 'app.ts', 'app.js', 'server.ts', 'server.js'];
        if (entryPoints.includes(lowerFileName)) {
            score += 500;
        }
        
        // Prefer shallower paths (each level reduces score)
        score -= (pathDepth - 1) * 100;
        
        // Special directories get bonus
        const importantDirs = ['src/', 'lib/', 'components/', 'utils/', 'docs/', 'test/', 'tests/'];
        if (isDirectory && importantDirs.includes(lowerFilePath)) {
            score += 200;
        }
        
        // Shorter names are generally more important
        score -= fileName.length * 2;
        
        return score;
    }

    /**
     * Calculate relevance score for sorting files by match quality
     */
    private calculateRelevanceScore(filePath: string, partial: string): number {
        const lowerFilePath = filePath.toLowerCase();
        const lowerPartial = partial.toLowerCase();
        const fileName = path.basename(lowerFilePath);
        
        let score = 0;
        
        // Exact match gets highest score
        if (lowerFilePath === lowerPartial) score += 1000;
        
        // Filename exact match
        if (fileName === lowerPartial) score += 800;
        
        // Starts with partial
        if (lowerFilePath.startsWith(lowerPartial)) score += 600;
        
        // Filename starts with partial
        if (fileName.startsWith(lowerPartial)) score += 500;
        
        // Contains partial
        if (lowerFilePath.includes(lowerPartial)) score += 300;
        
        // Filename contains partial
        if (fileName.includes(lowerPartial)) score += 200;
        
        // Prefer shorter paths (closer to root)
        score -= filePath.split('/').length * 10;
        
        // Prefer common file types
        const ext = path.extname(fileName).toLowerCase();
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json', '.yml', '.yaml'].includes(ext)) {
            score += 50;
        }
        
        return score;
    }


    /**
     * Get all files in the workspace, excluding common build/cache directories
     */
    private async getAllWorkspaceFiles(workspaceRoot: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            await this.scanDirectory(workspaceRoot, '', files, 0);
        } catch (error) {
            console.error('Error scanning workspace files:', error);
        }
        
        return files;
    }

    /**
     * Recursively scan directory for files
     */
    private async scanDirectory(
        absoluteBasePath: string, 
        relativePath: string, 
        files: string[], 
        depth: number
    ): Promise<void> {
        if (depth > FilePathCompletionProvider.MAX_SEARCH_DEPTH) {
            return;
        }

        const absolutePath = path.join(absoluteBasePath, relativePath);
        
        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(absolutePath));
            
            for (const [name, type] of entries) {
                // Skip excluded directories and files
                if (FilePathCompletionProvider.EXCLUDED_DIRECTORIES.has(name)) {
                    continue;
                }
                
                const relativeFilePath = relativePath ? `${relativePath}/${name}` : name;
                
                if (type === vscode.FileType.Directory) {
                    // Recursively scan subdirectory
                    await this.scanDirectory(absoluteBasePath, relativeFilePath, files, depth + 1);
                } else if (type === vscode.FileType.File) {
                    // Check if file should be excluded
                    const ext = path.extname(name).toLowerCase();
                    if (!FilePathCompletionProvider.EXCLUDED_EXTENSIONS.has(ext)) {
                        files.push(relativeFilePath);
                    }
                }
            }
        } catch (error) {
            // Skip directories that can't be read (permissions, etc.)
            console.debug(`Skipping directory ${absolutePath}:`, error);
        }
    }

    /**
     * Create a completion item for a file path
     */
    private createFilePathCompletionItem(
        filePath: string, 
        context: { partial: string; startPos: number },
        workspaceRoot: string
    ): vscode.CompletionItem {
        const isDirectory = filePath.endsWith('/');
        const displayPath = filePath;
        const fileName = path.basename(filePath);
        
        const completionItem = new vscode.CompletionItem(
            displayPath, 
            isDirectory ? vscode.CompletionItemKind.Folder : vscode.CompletionItemKind.File
        );
        
        // Set the text that will be inserted
        completionItem.insertText = filePath;
        
        // Set the label with additional info
        completionItem.label = {
            label: displayPath,
            description: isDirectory ? '(directory)' : this.getFileTypeDescription(fileName)
        };
        
        // Add detail showing the file type or directory info
        if (isDirectory) {
            completionItem.detail = 'Directory';
        } else {
            const ext = path.extname(fileName);
            completionItem.detail = ext ? `${ext.substring(1).toUpperCase()} file` : 'File';
        }
        
        // Add documentation with file info
        const markdownDoc = new vscode.MarkdownString();
        markdownDoc.appendMarkdown(`**${displayPath}**\n\n`);
        
        if (isDirectory) {
            markdownDoc.appendMarkdown('Directory in workspace\n\n');
        } else {
            markdownDoc.appendMarkdown(`File: \`${fileName}\`\n\n`);
            const ext = path.extname(fileName);
            if (ext) {
                markdownDoc.appendMarkdown(`Type: ${ext.substring(1).toUpperCase()}\n\n`);
            }
        }
        
        markdownDoc.appendMarkdown(`Relative path: \`${filePath}\``);
        completionItem.documentation = markdownDoc;
        
        // Set sort order - prioritize directories and shorter paths
        let sortPriority = '2'; // Default for files
        if (isDirectory) sortPriority = '1';
        if (filePath.split('/').length === 1) sortPriority = '0'; // Top-level items
        
        completionItem.sortText = `${sortPriority}_${filePath.length.toString().padStart(4, '0')}_${filePath}`;
        
        // Set filter text for better matching
        completionItem.filterText = filePath;
        
        // Configure how the completion replaces existing text
        const range = new vscode.Range(
            new vscode.Position(0, context.startPos + 1), // +1 to skip the "@"
            new vscode.Position(0, context.startPos + 1 + context.partial.length)
        );
        completionItem.range = range;
        
        return completionItem;
    }

    /**
     * Get a human-readable description for file types
     */
    private getFileTypeDescription(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        
        const typeMap: { [key: string]: string } = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript React',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript React',
            '.py': 'Python',
            '.md': 'Markdown',
            '.json': 'JSON',
            '.yml': 'YAML',
            '.yaml': 'YAML',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SASS',
            '.less': 'LESS',
            '.svg': 'SVG',
            '.png': 'PNG Image',
            '.jpg': 'JPEG Image',
            '.jpeg': 'JPEG Image',
            '.gif': 'GIF Image',
            '.txt': 'Text',
            '.xml': 'XML',
            '.csv': 'CSV'
        };
        
        return typeMap[ext] || '';
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