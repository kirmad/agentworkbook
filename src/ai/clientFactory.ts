/**
 * Factory for creating AI task clients with configuration management
 */

import { ITaskClient, ClientType, ClientConfig, ClientError } from './clientTypes';
import { SuperCodeClient } from './supercodeClient';
import { RooCodeClient } from './rooCodeClient';
import { IClineController } from './controller';

/**
 * Factory class for creating and managing AI task clients
 */
export class ClientFactory {
    private static instance: ClientFactory;
    
    private rooController?: IClineController;
    private supercodeUrl?: string;
    private defaultConfig: ClientConfig = {
        timeout: 30000,
        maxRetries: 3
    };
    
    // Cache clients to reuse them
    private clientCache: Map<string, ITaskClient> = new Map();

    private constructor() {}

    /**
     * Get the singleton instance of ClientFactory
     */
    static getInstance(): ClientFactory {
        if (!ClientFactory.instance) {
            ClientFactory.instance = new ClientFactory();
        }
        return ClientFactory.instance;
    }

    /**
     * Initialize the factory with RooCode controller
     */
    setRooController(controller: IClineController): void {
        this.rooController = controller;
    }

    /**
     * Set the SuperCode TUI API base URL
     */
    setSuperCodeUrl(url: string): void {
        if (!url || typeof url !== 'string') {
            throw new Error('SuperCode URL must be a non-empty string');
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`Invalid SuperCode URL format: ${url}`);
        }

        // Clear cached SuperCode clients when URL changes
        if (this.supercodeUrl !== url) {
            this.clearSuperCodeClientCache();
        }

        this.supercodeUrl = url;
        console.log(`SuperCode URL set to: ${url}`);
    }

    /**
     * Get the current SuperCode URL
     */
    getSuperCodeUrl(): string | undefined {
        return this.supercodeUrl;
    }

    /**
     * Create a client for the specified type
     */
    createClient(clientType: ClientType, overrideConfig?: ClientConfig): ITaskClient {
        const config = { ...this.defaultConfig, ...overrideConfig };
        
        switch (clientType) {
            case 'roo':
            case 'copilot':
                return this.createRooCodeClient();
                
            case 'supercode':
                return this.createSuperCodeClient(config);
                
            default:
                throw new ClientError(`Unknown client type: ${clientType}`, clientType);
        }
    }

    /**
     * Create a cached client for the specified type and configuration
     */
    getCachedClient(clientType: ClientType, overrideConfig?: ClientConfig): ITaskClient {
        const cacheKey = this.getCacheKey(clientType, overrideConfig);
        
        let client = this.clientCache.get(cacheKey);
        if (!client) {
            client = this.createClient(clientType, overrideConfig);
            this.clientCache.set(cacheKey, client);
        }
        
        return client;
    }

    /**
     * Create RooCode client
     */
    private createRooCodeClient(): RooCodeClient {
        if (!this.rooController) {
            throw new ClientError('RooCode controller not initialized', 'roo');
        }
        
        return new RooCodeClient(this.rooController);
    }

    /**
     * Create SuperCode client
     */
    private createSuperCodeClient(config: ClientConfig): SuperCodeClient {
        const url = config.supercodeUrl || this.supercodeUrl;
        
        if (!url) {
            throw new ClientError('SuperCode URL not configured. Use setSuperCodeUrl() or provide supercodeUrl in config', 'supercode');
        }

        return new SuperCodeClient(url, config.timeout, config.maxRetries);
    }

    /**
     * Generate cache key for client configuration
     */
    private getCacheKey(clientType: ClientType, config?: ClientConfig): string {
        if (clientType === 'supercode' && config?.supercodeUrl) {
            // For SuperCode with custom URL, include URL in cache key
            return `${clientType}:${config.supercodeUrl}:${config.timeout || this.defaultConfig.timeout}`;
        }
        return `${clientType}:${config?.timeout || this.defaultConfig.timeout}`;
    }

    /**
     * Clear cached SuperCode clients (called when URL changes)
     */
    private clearSuperCodeClientCache(): void {
        const keysToDelete = Array.from(this.clientCache.keys()).filter(key => key.startsWith('supercode:'));
        for (const key of keysToDelete) {
            const client = this.clientCache.get(key);
            if (client && client.dispose) {
                client.dispose().catch(error => {
                    console.warn('Error disposing SuperCode client:', error);
                });
            }
            this.clientCache.delete(key);
        }
    }

    /**
     * Validate that a client type is supported
     */
    static isValidClientType(clientType: string): clientType is ClientType {
        return ['roo', 'copilot', 'supercode'].includes(clientType);
    }

    /**
     * Get available client types
     */
    static getAvailableClientTypes(): ClientType[] {
        return ['roo', 'copilot', 'supercode'];
    }

    /**
     * Test connection to SuperCode server
     */
    async testSuperCodeConnection(url?: string): Promise<boolean> {
        const testUrl = url || this.supercodeUrl;
        if (!testUrl) {
            throw new Error('No SuperCode URL to test');
        }

        try {
            const testClient = new SuperCodeClient(testUrl, 5000, 1); // Short timeout for testing
            
            // Try to get status to test connection
            const response = await fetch(`${testUrl}/tui/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await testClient.dispose();
            return true;
        } catch (error) {
            console.error('SuperCode connection test failed:', error);
            return false;
        }
    }

    /**
     * Dispose all cached clients and clean up resources
     */
    async dispose(): Promise<void> {
        const disposePromises = Array.from(this.clientCache.values())
            .filter(client => client.dispose)
            .map(client => client.dispose!().catch(error => {
                console.warn('Error disposing client:', error);
            }));

        await Promise.all(disposePromises);
        this.clientCache.clear();
    }
}