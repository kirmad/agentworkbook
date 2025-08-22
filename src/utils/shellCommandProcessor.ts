import * as vscode from 'vscode';
import { shell_command } from './shellCommand';

/**
 * Processes content containing shell commands in !`command` syntax
 * Executes the commands and replaces them with their output
 */
export class ShellCommandProcessor {
    private cache = new Map<string, { result: string; timestamp: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Process content by finding and executing shell commands
     * @param content The content to process
     * @returns Processed content with shell commands replaced by their output
     */
    async processContent(content: string): Promise<string> {
        // Check if shell commands are enabled
        if (!this.isShellCommandsEnabled()) {
            return content;
        }

        const regex = /!`([^`]+)`/g;
        let result = content;
        const matches = [...content.matchAll(regex)];

        for (const match of matches) {
            const [fullMatch, command] = match;

            try {
                const output = await this.executeCommand(command);
                result = result.replace(fullMatch, output.trim());
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                result = result.replace(fullMatch, `⚠️ Error: ${errorMessage}`);
            }
        }

        return result;
    }

    /**
     * Execute a shell command with caching
     * @param command The command to execute
     * @returns The command output
     */
    private async executeCommand(command: string): Promise<string> {
        // Check cache first
        const cached = this.cache.get(command);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            console.log(`Using cached result for command: ${command}`);
            return cached.result;
        }

        console.log(`Executing shell command: ${command}`);

        // Execute command without restrictions or timeout
        const result = await shell_command(command, {});

        if (result.exitCode !== 0) {
            throw new Error(result.stderr || 'Command failed');
        }

        // Cache the result
        this.cache.set(command, {
            result: result.stdout,
            timestamp: Date.now()
        });

        return result.stdout;
    }

    /**
     * Check if shell commands are enabled in VS Code settings
     * @returns true if enabled, false otherwise
     */
    private isShellCommandsEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('agentworkbook');
        return config.get('shellCommands.enabled', true);
    }

    /**
     * Clear the command cache
     */
    clearCache(): void {
        this.cache.clear();
        console.log('Shell command cache cleared');
    }

    /**
     * Get cache statistics
     * @returns Object with cache statistics
     */
    getCacheStats(): { size: number; oldestEntry: number | null } {
        const now = Date.now();
        let oldestTimestamp: number | null = null;

        for (const entry of this.cache.values()) {
            if (oldestTimestamp === null || entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
            }
        }

        return {
            size: this.cache.size,
            oldestEntry: oldestTimestamp ? now - oldestTimestamp : null
        };
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.CACHE_TTL) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
        }

        if (expiredKeys.length > 0) {
            console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
        }
    }
}

// Export a singleton instance for use across the extension
export const shellCommandProcessor = new ShellCommandProcessor();