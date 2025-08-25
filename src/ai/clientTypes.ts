/**
 * Client abstraction layer for different AI backends (RooCode, SuperCode, etc.)
 */

import { Task, TaskStatus } from '../tasks/manager';

/**
 * Interface for AI task clients that can submit and manage tasks
 */
export interface ITaskClient {
    /**
     * Submit a task for execution
     * @param task The task to submit
     * @returns Promise that resolves when task is successfully submitted (not completed)
     */
    submitTask(task: Task): Promise<void>;
    
    /**
     * Get the current status of a task
     * @param task The task to check
     * @returns Promise that resolves to the current task status
     */
    getTaskStatus(task: Task): Promise<TaskStatus>;
    
    /**
     * Abort a running task
     * @param task The task to abort
     * @returns Promise that resolves when task is successfully aborted
     */
    abortTask(task: Task): Promise<void>;
    
    /**
     * Clean up resources for this client
     * @returns Promise that resolves when cleanup is complete
     */
    dispose?(): Promise<void>;
}

/**
 * Supported AI client types
 */
export type ClientType = 'roo' | 'copilot' | 'supercode';

/**
 * Client configuration options
 */
export interface ClientConfig {
    /** SuperCode TUI API base URL (required for supercode client) */
    supercodeUrl?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Maximum retry attempts for failed requests */
    maxRetries?: number;
}

/**
 * Error thrown by AI clients
 */
export class ClientError extends Error {
    constructor(
        message: string,
        public readonly clientType: ClientType,
        public readonly cause?: Error
    ) {
        super(`${clientType} client error: ${message}`);
        this.name = 'ClientError';
    }
}