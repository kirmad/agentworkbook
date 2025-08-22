import * as vscode from 'vscode';
import { PyodideInterface } from 'pyodide';

/**
 * Result of Python code execution
 */
export interface PythonExecutionResult {
    success: boolean;
    result?: any;
    error?: Error;
    executionTime: number;
    outputItems: vscode.NotebookCellOutputItem[];
}

/**
 * Request for cell execution
 */
export interface CellExecutionRequest {
    cell: vscode.NotebookCell;
    callback: () => void;
    timeout?: number;
    retryCount?: number;
}

/**
 * Pyodide initialization configuration
 */
export interface PyodideConfig {
    indexURL: string;
    stdout: (text: string) => void;
    stderr: (text: string) => void;
    packages?: string[];
    env?: Record<string, string>;
}

/**
 * Error information for categorized error handling
 */
export interface ErrorInfo {
    type: 'python_exception' | 'internal_error' | 'timeout_error' | 'import_error' | 'initialization_error';
    message: string;
    stack?: string;
    originalError: Error;
    context?: Record<string, any>;
}

/**
 * Execution context for a cell
 */
export interface CellExecutionContext {
    cell: vscode.NotebookCell;
    execution: vscode.NotebookCellExecution;
    output: vscode.NotebookCellOutput;
    pyodide: PyodideInterface;
    startTime: number;
    timeout: number;
}

/**
 * Performance metrics for cell execution
 */
export interface ExecutionMetrics {
    cellId: string;
    executionOrder: number;
    startTime: number;
    endTime: number;
    duration: number;
    codeLength: number;
    outputSize: number;
    success: boolean;
    errorType?: string;
}

/**
 * State of the notebook controller
 */
export interface ControllerState {
    isInitialized: boolean;
    isInitializing: boolean;
    pyodideInstance?: PyodideInterface;
    executionQueue: CellExecutionRequest[];
    currentExecution?: CellExecutionContext;
    executionOrder: number;
    metrics: ExecutionMetrics[];
}

/**
 * Output formatting options
 */
export interface OutputFormatOptions {
    maxLength?: number;
    includeTimestamp?: boolean;
    includeExecutionOrder?: boolean;
    format?: 'text' | 'html' | 'json' | 'auto';
}

/**
 * Retry configuration for failed operations
 */
export interface RetryConfig {
    maxRetries: number;
    delay: number;
    backoff: 'linear' | 'exponential';
    retryableErrors: string[];
}

/**
 * Initialization progress information
 */
export interface InitializationProgress {
    stage: 'loading' | 'packages' | 'modules' | 'complete';
    message: string;
    progress: number; // 0-100
    details?: string;
}

/**
 * Package loading information
 */
export interface PackageInfo {
    name: string;
    version?: string;
    status: 'pending' | 'loading' | 'loaded' | 'failed';
    error?: string;
    dependencies?: string[];
}

/**
 * Cell execution statistics
 */
export interface ExecutionStats {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    totalExecutionTime: number;
    errorsByType: Record<string, number>;
    packagesLoaded: PackageInfo[];
}

/**
 * Notebook controller interface
 */
export interface INotebookController {
    readonly controllerId: string;
    readonly notebookType: string;
    readonly label: string;
    readonly supportedLanguages: readonly string[];
    
    execute(cells: vscode.NotebookCell[], notebook: vscode.NotebookDocument): Promise<void>;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    getStats(): ExecutionStats;
    dispose(): void;
}

/**
 * Event types for notebook controller
 */
export interface ControllerEvents {
    'initialization-started': InitializationProgress;
    'initialization-progress': InitializationProgress;
    'initialization-completed': void;
    'initialization-failed': Error;
    'cell-execution-started': CellExecutionContext;
    'cell-execution-completed': ExecutionMetrics;
    'cell-execution-failed': { context: CellExecutionContext; error: ErrorInfo };
    'package-loading': PackageInfo;
    'package-loaded': PackageInfo;
    'package-failed': PackageInfo;
}

/**
 * Configuration for the notebook controller
 */
export interface NotebookControllerConfig {
    /** Timeout settings */
    timeouts: {
        initialization: number;
        cellExecution: number;
        packageLoading: number;
    };
    
    /** Retry configuration */
    retry: RetryConfig;
    
    /** Output formatting options */
    output: OutputFormatOptions;
    
    /** Performance monitoring settings */
    performance: {
        enableTelemetry: boolean;
        metricsRetention: number; // number of executions to retain
        enableProfiling: boolean;
    };
    
    /** Resource management */
    resources: {
        maxMemoryUsage: number; // in MB
        cleanupInterval: number; // in ms
        enableGarbageCollection: boolean;
    };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONTROLLER_CONFIG: NotebookControllerConfig = {
    timeouts: {
        initialization: 120_000, // 2 minutes
        cellExecution: 300_000,  // 5 minutes
        packageLoading: 60_000   // 1 minute
    },
    retry: {
        maxRetries: 3,
        delay: 1000,
        backoff: 'exponential',
        retryableErrors: ['NetworkError', 'TimeoutError', 'ImportError']
    },
    output: {
        maxLength: 10_000,
        includeTimestamp: false,
        includeExecutionOrder: true,
        format: 'auto'
    },
    performance: {
        enableTelemetry: true,
        metricsRetention: 100,
        enableProfiling: false
    },
    resources: {
        maxMemoryUsage: 512, // 512 MB
        cleanupInterval: 60_000, // 1 minute
        enableGarbageCollection: true
    }
};