/**
 * SuperCode TUI API client implementation
 */

import { ITaskClient, ClientError } from './clientTypes';
import { Task, TaskStatus } from '../tasks/manager';

/**
 * Response from SuperCode TUI API status endpoint
 */
interface TUIStatusResponse {
    busy: boolean;
    status: 'ready' | 'processing' | 'error';
    message?: string;
}

/**
 * SuperCode client that communicates via TUI API
 */
export class SuperCodeClient implements ITaskClient {
    private readonly baseUrl: string;
    private readonly timeout: number;
    private readonly maxRetries: number;

    constructor(baseUrl: string, timeout: number = 30000, maxRetries: number = 3) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.timeout = timeout;
        this.maxRetries = maxRetries;
    }

    /**
     * Submit a task using the TUI API workflow
     */
    async submitTask(task: Task): Promise<void> {
        try {
            // Step 1: Wait for TUI to be ready
            await this.waitForReady();

            // Step 2: Clear any existing prompt
            await this.makeRequest('POST', '/tui/clear-prompt', {});

            // Step 3: Append the new prompt
            await this.makeRequest('POST', '/tui/append-prompt', {
                text: task.prompt
            });

            // Step 4: Submit the prompt for processing
            await this.makeRequest('POST', '/tui/submit-prompt', {});

            console.log(`SuperCode task ${task.id} submitted successfully`);
        } catch (error) {
            throw new ClientError(
                `Failed to submit task ${task.id}`,
                'supercode',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Get the current status of a task by polling the TUI API
     */
    async getTaskStatus(task: Task): Promise<TaskStatus> {
        try {
            const status = await this.getStatus();
            
            // Map TUI API status to AgentWorkbook TaskStatus
            if (status.status === 'error') {
                return 'error';
            } else if (status.busy) {
                return 'running';
            } else if (status.status === 'ready') {
                return 'completed';
            } else {
                return 'running'; // Default to running if status is unclear
            }
        } catch (error) {
            console.error(`Failed to get status for task ${task.id}:`, error);
            return 'error';
        }
    }

    /**
     * Abort a running task (if supported by TUI API)
     */
    async abortTask(task: Task): Promise<void> {
        try {
            // Note: TUI API may not have an abort endpoint
            // For now, we'll try to clear the prompt which might interrupt processing
            await this.makeRequest('POST', '/tui/clear-prompt', {});
            console.log(`SuperCode task ${task.id} aborted`);
        } catch (error) {
            throw new ClientError(
                `Failed to abort task ${task.id}`,
                'supercode',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Wait for the TUI API to be ready (not busy)
     */
    private async waitForReady(): Promise<void> {
        let attempts = 0;
        const maxAttempts = this.timeout / 1000; // Check every second

        while (attempts < maxAttempts) {
            const status = await this.getStatus();
            if (!status.busy && status.status === 'ready') {
                return;
            }
            
            await this.sleep(1000);
            attempts++;
        }

        throw new Error(`TUI API not ready after ${this.timeout}ms`);
    }

    /**
     * Get current status from TUI API
     */
    private async getStatus(): Promise<TUIStatusResponse> {
        const response = await this.makeRequest('GET', '/tui/status');
        return response as TUIStatusResponse;
    }

    /**
     * Make an HTTP request to the TUI API with retry logic
     */
    private async makeRequest(method: 'GET' | 'POST', path: string, body?: any): Promise<any> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const url = `${this.baseUrl}${path}`;
                const options: RequestInit = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    signal: AbortSignal.timeout(this.timeout),
                };

                if (method === 'POST' && body) {
                    options.body = JSON.stringify(body);
                }

                const response = await fetch(url, options);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Handle empty responses (common for POST endpoints)
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return {};
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (attempt < this.maxRetries - 1) {
                    console.warn(`SuperCode API request failed (attempt ${attempt + 1}/${this.maxRetries}):`, lastError.message);
                    await this.sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
                }
            }
        }

        throw lastError || new Error('Request failed after all retry attempts');
    }

    /**
     * Sleep for specified milliseconds
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clean up resources
     */
    async dispose(): Promise<void> {
        // Nothing to clean up for HTTP client
    }
}