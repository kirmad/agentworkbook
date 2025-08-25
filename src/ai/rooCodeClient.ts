/**
 * RooCode client wrapper that adapts IClineController to ITaskClient interface
 */

import { ITaskClient, ClientError } from './clientTypes';
import { IClineController, MessagesRx, Message } from './controller';
import { Task, TaskStatus } from '../tasks/manager';

/**
 * RooCode client that wraps the existing IClineController
 */
export class RooCodeClient implements ITaskClient {
    private readonly controller: IClineController;
    private activeTaskMessages: Map<string, MessagesRx> = new Map();

    constructor(controller: IClineController) {
        this.controller = controller;
        
        // Listen for task completion events
        this.controller.on('rootTaskEnded', (clineTaskId: string) => {
            this.handleTaskEnded(clineTaskId);
        });
    }

    /**
     * Submit a task using the RooCode controller
     */
    async submitTask(task: Task): Promise<void> {
        try {
            // Check if controller is busy
            if (this.controller.isBusy()) {
                throw new Error('RooCode controller is busy');
            }

            // Start the task using the existing controller
            const messagesRx = await this.controller.startTask(task);
            
            // Store the message receiver for this task
            if (task.clineId) {
                this.activeTaskMessages.set(task.clineId, messagesRx);
                
                // Start consuming messages (but don't await - let it run in background)
                this.consumeMessages(task.clineId, messagesRx);
            }

            console.log(`RooCode task ${task.id} submitted successfully`);
        } catch (error) {
            throw new ClientError(
                `Failed to submit task ${task.id}`,
                task.client === 'copilot' ? 'copilot' : 'roo',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Get the current status of a task
     * Note: For RooCode, the task status is managed by the existing Task object
     */
    async getTaskStatus(task: Task): Promise<TaskStatus> {
        try {
            // For RooCode tasks, we rely on the existing task status system
            // The controller updates the task status through its message handling
            return task.status;
        } catch (error) {
            console.error(`Failed to get status for RooCode task ${task.id}:`, error);
            return 'error';
        }
    }

    /**
     * Abort a running task using the RooCode controller
     */
    async abortTask(task: Task): Promise<void> {
        try {
            await this.controller.abortTaskStack();
            
            // Clean up message receiver if it exists
            if (task.clineId) {
                this.activeTaskMessages.delete(task.clineId);
            }
            
            console.log(`RooCode task ${task.id} aborted`);
        } catch (error) {
            throw new ClientError(
                `Failed to abort task ${task.id}`,
                task.client === 'copilot' ? 'copilot' : 'roo',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Consume messages from a task's message stream
     */
    private async consumeMessages(clineTaskId: string, messagesRx: MessagesRx): Promise<void> {
        try {
            for await (const message of messagesRx) {
                // The existing system handles message processing
                // We just need to consume the messages to prevent backpressure
                this.handleMessage(clineTaskId, message);
                
                // Check if task has ended
                if (message.type === 'status') {
                    break;
                }
                
                if (message.type === 'exitMessageHandler') {
                    break;
                }
            }
        } catch (error) {
            console.error(`Error consuming messages for task ${clineTaskId}:`, error);
        } finally {
            // Clean up
            this.activeTaskMessages.delete(clineTaskId);
        }
    }

    /**
     * Handle individual messages from the task stream
     */
    private handleMessage(clineTaskId: string, message: Message): void {
        // The existing AgentWorkbook system already handles message processing
        // This is just a placeholder for any additional message handling we might need
        
        if (message.type === 'say' && message.say === 'error') {
            console.warn(`RooCode task ${clineTaskId} reported error:`, message.text);
        }
    }

    /**
     * Handle task completion events
     */
    private handleTaskEnded(clineTaskId: string): void {
        // Clean up message receiver when task ends
        this.activeTaskMessages.delete(clineTaskId);
    }

    /**
     * Check if the RooCode controller can resume a task
     */
    async canResumeTask(task: Task): Promise<boolean> {
        try {
            return await this.controller.canResumeTask(task);
        } catch (error) {
            console.error(`Error checking if task ${task.id} can be resumed:`, error);
            return false;
        }
    }

    /**
     * Resume a task using the RooCode controller
     */
    async resumeTask(task: Task): Promise<void> {
        try {
            if (this.controller.isBusy()) {
                throw new Error('RooCode controller is busy');
            }

            await this.controller.resumeTask(task);
            console.log(`RooCode task ${task.id} resumed successfully`);
        } catch (error) {
            throw new ClientError(
                `Failed to resume task ${task.id}`,
                task.client === 'copilot' ? 'copilot' : 'roo',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Check if the controller is currently busy
     */
    isBusy(): boolean {
        return this.controller.isBusy();
    }

    /**
     * Clean up resources
     */
    async dispose(): Promise<void> {
        // Clean up any remaining message receivers
        this.activeTaskMessages.clear();
    }
}