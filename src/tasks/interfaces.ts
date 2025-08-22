/**
 * Interface for executing VS Code commands
 * 
 * This abstraction eliminates the need for circular dependencies between
 * Worker and AgentWorkbook by using dependency injection instead of dynamic imports.
 * 
 * Benefits:
 * - Eliminates circular dependency issues
 * - Improves testability through interface abstraction
 * - Makes dependencies explicit and clear
 * - Follows dependency inversion principle
 */
export interface ICommandExecutor {
    /**
     * Execute a VS Code command with optional arguments
     * @param command The command to execute
     * @param args Optional arguments to pass to the command
     * @returns Promise resolving to command result
     */
    executeVSCodeCommand(command: string, ...args: any[]): Promise<any>;
}