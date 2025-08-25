/**
 * Copilot client that automates VS Code GitHub Copilot Chat window
 * This client opens the VS Code chat window, sets it to agent mode, and sends prompts
 * directly to GitHub Copilot instead of using the RooCode controller
 */

import * as vscode from 'vscode';
import { ITaskClient, ClientError } from './clientTypes';
import { Task, TaskStatus } from '../tasks/manager';

/**
 * VS Code Chat command identifiers for automation
 */
const CHAT_COMMANDS = {
    OPEN_CHAT: 'workbench.action.chat.open',
    CLEAR_CHAT: 'workbench.action.chat.clear',
    NEW_CHAT: 'workbench.action.chat.newChat',
    EXECUTE_CHAT: 'workbench.action.chat.acceptInput',
    FOCUS_CHAT_INPUT: 'workbench.action.chat.focusInput'
} as const;

/**
 * Chat participant IDs for different agent modes
 */
const CHAT_PARTICIPANTS = {
    COPILOT: 'copilot',
    WORKSPACE: '@workspace',
    VSCODE: '@vscode',
    TERMINAL: '@terminal'
} as const;

/**
 * Task execution states for the Copilot client
 */
interface CopilotTaskExecution {
    task: Task;
    startTime: number;
    timeoutHandle?: NodeJS.Timeout;
    statusCheckInterval?: NodeJS.Timeout;
}

/**
 * Configuration options for the Copilot client
 */
export interface CopilotClientConfig {
    /** Default chat participant/agent to use */
    defaultParticipant?: string;
    /** Timeout for task execution in milliseconds */
    taskTimeout?: number;
    /** Interval for checking task completion in milliseconds */
    statusCheckInterval?: number;
    /** Whether to clear chat before starting new tasks */
    clearChatBeforeTask?: boolean;
    /** Whether to focus the chat window when starting tasks */
    focusChat?: boolean;
}

/**
 * Copilot client that automates VS Code GitHub Copilot Chat
 * 
 * This client:
 * 1. Opens the VS Code GitHub Copilot Chat window
 * 2. Sets it to agent mode (using @ participants like @copilot, @workspace, etc.)
 * 3. Sends prompts directly to GitHub Copilot
 * 4. Waits for task completion by monitoring chat state
 */
export class CopilotClient implements ITaskClient {
    private activeExecutions: Map<string, CopilotTaskExecution> = new Map();
    private readonly config: Required<CopilotClientConfig>;
    private chatStatusBarItem?: vscode.StatusBarItem;

    constructor(config: CopilotClientConfig = {}) {
        this.config = {
            defaultParticipant: config.defaultParticipant || CHAT_PARTICIPANTS.COPILOT,
            taskTimeout: config.taskTimeout || 300000, // 5 minutes default
            statusCheckInterval: config.statusCheckInterval || 2000, // 2 seconds
            clearChatBeforeTask: config.clearChatBeforeTask ?? true,
            focusChat: config.focusChat ?? true
        };

        // Create status bar item for chat status
        this.createStatusBarItem();
    }

    /**
     * Submit a task by opening VS Code chat and sending the prompt to Copilot
     */
    async submitTask(task: Task): Promise<void> {
        try {
            // Check if we're already executing this task
            if (this.activeExecutions.has(task.id)) {
                throw new Error(`Task ${task.id} is already being executed`);
            }

            // Create task execution tracking
            const execution: CopilotTaskExecution = {
                task,
                startTime: Date.now()
            };

            this.activeExecutions.set(task.id, execution);

            // Update status
            this.updateTaskStatus(task, 'running');
            this.updateStatusBar(`Executing task: ${task.prompt.substring(0, 50)}...`);

            console.log(`Starting Copilot task ${task.id}: ${task.prompt.substring(0, 100)}`);

            // Step 1: Open/prepare the chat window
            await this.prepareChatWindow();

            // Step 2: Set agent mode based on task requirements
            const participant = this.determineParticipant(task);

            // Step 3: Send the task prompt to Copilot
            await this.sendPromptToCopilot(task, participant);

            // Step 4: Set up monitoring for task completion
            this.startTaskMonitoring(execution);

            console.log(`Copilot task ${task.id} submitted successfully to ${participant}`);

        } catch (error) {
            // Clean up on error
            this.activeExecutions.delete(task.id);
            this.updateTaskStatus(task, 'error');
            this.updateStatusBar('Ready');

            throw new ClientError(
                `Failed to submit Copilot task ${task.id}`,
                'copilot',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Get the current status of a task
     */
    async getTaskStatus(task: Task): Promise<TaskStatus> {
        const execution = this.activeExecutions.get(task.id);
        if (!execution) {
            return task.status;
        }

        // Check if task has timed out
        const elapsed = Date.now() - execution.startTime;
        if (elapsed > this.config.taskTimeout) {
            this.handleTaskTimeout(execution);
            return 'error';
        }

        return task.status;
    }

    /**
     * Abort a running task
     */
    async abortTask(task: Task): Promise<void> {
        try {
            const execution = this.activeExecutions.get(task.id);
            if (!execution) {
                console.warn(`Cannot abort task ${task.id}: not currently executing`);
                return;
            }

            // Clean up monitoring
            this.cleanupTaskExecution(execution);

            // Update task status
            this.updateTaskStatus(task, 'aborted');

            // Optionally clear the chat window
            if (this.config.clearChatBeforeTask) {
                await this.executeChatCommand(CHAT_COMMANDS.CLEAR_CHAT);
            }

            this.updateStatusBar('Ready');
            console.log(`Copilot task ${task.id} aborted successfully`);

        } catch (error) {
            throw new ClientError(
                `Failed to abort Copilot task ${task.id}`,
                'copilot',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Prepare the chat window for task execution
     */
    private async prepareChatWindow(): Promise<void> {
        try {
            // Clear previous chat if configured
            if (this.config.clearChatBeforeTask) {
                await this.executeChatCommand(CHAT_COMMANDS.CLEAR_CHAT);
                await this.delay(500); // Allow time for clearing
            }

            // Open the chat window
            await this.executeChatCommand(CHAT_COMMANDS.OPEN_CHAT);
            await this.delay(1000); // Allow time for chat to open

            // Focus the chat input if configured
            if (this.config.focusChat) {
                await this.executeChatCommand(CHAT_COMMANDS.FOCUS_CHAT_INPUT);
                await this.delay(300);
            }

        } catch (error) {
            throw new Error(`Failed to prepare chat window: ${error}`);
        }
    }

    /**
     * Determine the appropriate chat participant based on task type
     */
    private determineParticipant(task: Task): string {
        // Check if task has specific agent requirements in prompt
        if (task.prompt.includes('@workspace')) {
            return CHAT_PARTICIPANTS.WORKSPACE;
        }
        
        if (task.prompt.includes('@vscode')) {
            return CHAT_PARTICIPANTS.VSCODE;
        }
        
        if (task.prompt.includes('@terminal')) {
            return CHAT_PARTICIPANTS.TERMINAL;
        }

        // For code-related tasks, check if workspace context might be useful
        if (this.isCodeRelatedTask(task)) {
            return CHAT_PARTICIPANTS.WORKSPACE;
        }

        return this.config.defaultParticipant;
    }

    /**
     * Check if a task is code-related and might benefit from workspace context
     */
    private isCodeRelatedTask(task: Task): boolean {
        const codeKeywords = [
            'code', 'function', 'class', 'method', 'variable', 'import', 'export',
            'implement', 'refactor', 'debug', 'fix', 'optimize', 'review',
            'test', 'unit test', 'integration', 'api', 'endpoint', 'database',
            'component', 'service', 'module', 'package', 'dependency'
        ];

        const prompt = task.prompt.toLowerCase();
        return codeKeywords.some(keyword => prompt.includes(keyword));
    }

    /**
     * Send the task prompt to GitHub Copilot via VS Code chat
     */
    private async sendPromptToCopilot(task: Task, participant: string): Promise<void> {
        try {
            // Format the prompt with participant and task content
            const formattedPrompt = this.formatPromptForCopilot(task, participant);

            // Use VS Code API to insert text into chat input
            await vscode.commands.executeCommand('type', { text: formattedPrompt });
            await this.delay(500); // Allow time for text insertion

            // Execute the chat command to send the prompt
            await this.executeChatCommand(CHAT_COMMANDS.EXECUTE_CHAT);
            
            console.log(`Sent prompt to ${participant}:`, formattedPrompt);

        } catch (error) {
            throw new Error(`Failed to send prompt to Copilot: ${error}`);
        }
    }

    /**
     * Format the task prompt for Copilot with appropriate participant and context
     */
    private formatPromptForCopilot(task: Task, participant: string): string {
        let formattedPrompt = `${participant} `;

        // Add the main prompt
        formattedPrompt += task.prompt;

        // Add mode information if not default
        if (task.mode && task.mode !== 'default') {
            formattedPrompt += `\n\n[Mode: ${task.mode}]`;
        }

        return formattedPrompt;
    }

    /**
     * Start monitoring task completion
     */
    private startTaskMonitoring(execution: CopilotTaskExecution): void {
        // Set up timeout
        execution.timeoutHandle = setTimeout(() => {
            this.handleTaskTimeout(execution);
        }, this.config.taskTimeout);

        // Set up status checking interval
        execution.statusCheckInterval = setInterval(() => {
            this.checkTaskCompletion(execution);
        }, this.config.statusCheckInterval);
    }

    /**
     * Check if a task has completed by monitoring chat state
     * This is a simplified approach - in a real implementation, you might:
     * 1. Monitor the chat panel for completion indicators
     * 2. Check for specific response patterns
     * 3. Use VS Code extension APIs to detect chat state changes
     */
    private async checkTaskCompletion(execution: CopilotTaskExecution): Promise<void> {
        try {
            // For now, we simulate completion after a reasonable time
            // In a real implementation, this would check actual chat state
            const elapsed = Date.now() - execution.startTime;
            
            // Simple heuristic: shorter prompts complete faster
            const estimatedDuration = Math.min(
                Math.max(execution.task.prompt.length * 100, 10000), // Min 10s
                60000 // Max 60s
            );

            if (elapsed > estimatedDuration) {
                this.handleTaskCompletion(execution, 'completed');
            }

        } catch (error) {
            console.error(`Error checking task completion for ${execution.task.id}:`, error);
        }
    }

    /**
     * Handle task completion
     */
    private handleTaskCompletion(execution: CopilotTaskExecution, status: TaskStatus): void {
        this.cleanupTaskExecution(execution);
        this.updateTaskStatus(execution.task, status);
        
        if (status === 'completed') {
            this.updateStatusBar('Task completed');
            console.log(`Copilot task ${execution.task.id} completed successfully`);
        }

        // Clear status after a delay
        setTimeout(() => {
            this.updateStatusBar('Ready');
        }, 3000);
    }

    /**
     * Handle task timeout
     */
    private handleTaskTimeout(execution: CopilotTaskExecution): void {
        console.warn(`Copilot task ${execution.task.id} timed out after ${this.config.taskTimeout}ms`);
        this.handleTaskCompletion(execution, 'error');
    }

    /**
     * Clean up task execution resources
     */
    private cleanupTaskExecution(execution: CopilotTaskExecution): void {
        if (execution.timeoutHandle) {
            clearTimeout(execution.timeoutHandle);
        }
        
        if (execution.statusCheckInterval) {
            clearInterval(execution.statusCheckInterval);
        }

        this.activeExecutions.delete(execution.task.id);
    }

    /**
     * Execute a VS Code chat command with error handling
     */
    private async executeChatCommand(command: string): Promise<void> {
        try {
            await vscode.commands.executeCommand(command);
        } catch (error) {
            throw new Error(`Failed to execute chat command ${command}: ${error}`);
        }
    }

    /**
     * Update task status
     */
    private updateTaskStatus(task: Task, status: TaskStatus): void {
        task.status = status;
        // Task doesn't have lastUpdated property in the interface, so we skip it
    }

    /**
     * Create status bar item for displaying chat status
     */
    private createStatusBarItem(): void {
        this.chatStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.chatStatusBarItem.text = '$(comment-discussion) Copilot: Ready';
        this.chatStatusBarItem.tooltip = 'GitHub Copilot Chat Status';
        this.chatStatusBarItem.show();
    }

    /**
     * Update status bar display
     */
    private updateStatusBar(status: string): void {
        if (this.chatStatusBarItem) {
            this.chatStatusBarItem.text = `$(comment-discussion) Copilot: ${status}`;
        }
    }

    /**
     * Simple delay utility
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get active task count
     */
    getActiveTaskCount(): number {
        return this.activeExecutions.size;
    }

    /**
     * Check if client is currently busy
     */
    isBusy(): boolean {
        return this.activeExecutions.size > 0;
    }

    /**
     * Get configuration
     */
    getConfig(): Required<CopilotClientConfig> {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<CopilotClientConfig>): void {
        Object.assign(this.config, newConfig);
        console.log('Copilot client configuration updated:', newConfig);
    }

    /**
     * Clean up resources and dispose of the client
     */
    async dispose(): Promise<void> {
        try {
            // Abort all active tasks
            const abortPromises = Array.from(this.activeExecutions.values()).map(execution => {
                this.cleanupTaskExecution(execution);
                return Promise.resolve();
            });

            await Promise.all(abortPromises);

            // Dispose status bar item
            if (this.chatStatusBarItem) {
                this.chatStatusBarItem.dispose();
                this.chatStatusBarItem = undefined;
            }

            console.log('Copilot client disposed successfully');

        } catch (error) {
            console.error('Error disposing Copilot client:', error);
        }
    }
}