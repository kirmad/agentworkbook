import * as fs from 'fs/promises';
import * as path from 'path';
import process from 'process';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';

import { Channel } from '../utils/asyncUtils';
import { RendererInitializationData } from '../renderer/interface';
import { AgentWorkbook, AgentWorkbookStatus } from '../agentworkbook';
import * as telemetry from '../utils/telemetry';

// Supporting modules
import { CONTROLLER_CONFIG, RESOURCE_PATHS, TIMING_CONFIG, OUTPUT_CONFIG, PYTHON_ENV_CONFIG, CELL_CONFIG } from './constants';
import { 
    CellExecutionRequest, 
    CellExecutionContext, 
    PythonExecutionResult, 
    ControllerState, 
    ExecutionMetrics, 
    INotebookController,
    NotebookControllerConfig,
    DEFAULT_CONTROLLER_CONFIG,
    ControllerEvents
} from './types';
import { NotebookErrorHandler } from './errorHandler';

/**
 * Python notebook controller with error handling,
 * performance monitoring, and resource management
 */
export class PyNotebookController extends EventEmitter implements INotebookController {
    readonly controllerId = CONTROLLER_CONFIG.ID;
    readonly notebookType = CONTROLLER_CONFIG.NOTEBOOK_TYPE;
    readonly label = CONTROLLER_CONFIG.LABEL;
    readonly supportedLanguages = CONTROLLER_CONFIG.SUPPORTED_LANGUAGES;

    private readonly _controller: vscode.NotebookController;
    private readonly _executionRequestChannel: Channel<CellExecutionRequest>;
    private readonly _state: ControllerState;
    private readonly _config: NotebookControllerConfig;

    // Cleanup and resource management
    private _cleanupInterval?: NodeJS.Timeout;
    private _isShuttingDown = false;

    constructor(
        private readonly extContext: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel,
        private readonly agentWorkbook: AgentWorkbook,
        config: Partial<NotebookControllerConfig> = {}
    ) {
        super();
        
        this._config = { ...DEFAULT_CONTROLLER_CONFIG, ...config };
        this._state = {
            isInitialized: false,
            isInitializing: false,
            executionQueue: [],
            executionOrder: CELL_CONFIG.INITIAL_EXECUTION_ORDER,
            metrics: []
        };

        // Create VS Code notebook controller
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this._controller.supportedLanguages = [...this.supportedLanguages];
        this._controller.supportsExecutionOrder = CELL_CONFIG.SUPPORTS_EXECUTION_ORDER;
        this._controller.executeHandler = this.execute.bind(this);

        // Setup execution channel
        const { rx, tx } = Channel.create<CellExecutionRequest>();
        this._executionRequestChannel = tx;
        this._startWorker(rx, () => tx.hasData);

        // Setup resource cleanup
        this._setupResourceManagement();
    }

    /**
     * Execute notebook cells
     */
    async execute(
        cells: vscode.NotebookCell[], 
        notebook: vscode.NotebookDocument
    ): Promise<void> {
        if (this._isShuttingDown) {
            throw new Error('Controller is shutting down');
        }

        return new Promise<void>((resolve) => {
            // Enqueue all cells for execution
            cells.forEach((cell, index) => {
                const isLast = index === cells.length - 1;
                const callback = isLast ? resolve : () => {};
                
                this._executionRequestChannel.send({
                    cell,
                    callback,
                    timeout: this._config.timeouts.cellExecution
                });
            });
        });
    }

    /**
     * Initialize the controller and Pyodide environment
     */
    async initialize(): Promise<void> {
        if (this._state.isInitialized || this._state.isInitializing) {
            return;
        }

        this._state.isInitializing = true;
        this.emit('initialization-started', { 
            stage: 'loading', 
            message: 'Starting initialization...', 
            progress: 0 
        });

        try {
            const pyodide = await this._initializePyodide();
            this._state.pyodideInstance = pyodide;
            this._state.isInitialized = true;
            this._state.isInitializing = false;
            
            this.emit('initialization-completed');
            this.outputChannel.appendLine('PyNotebook controller initialized successfully');
        } catch (error) {
            this._state.isInitializing = false;
            this.emit('initialization-failed', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Shutdown the controller and cleanup resources
     */
    async shutdown(): Promise<void> {
        this._isShuttingDown = true;
        
        // Cancel any running executions
        if (this._state.currentExecution) {
            this._state.currentExecution.execution.end(false);
        }

        // Clear execution queue
        this._state.executionQueue.length = 0;

        // Cleanup resources
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
        }

        // Cleanup Pyodide instance
        if (this._state.pyodideInstance && this._config.resources.enableGarbageCollection) {
            try {
                this._state.pyodideInstance.runPython('import gc; gc.collect()');
            } catch {
                // Ignore cleanup errors during shutdown
            }
        }

        this._state.isInitialized = false;
        this.outputChannel.appendLine('PyNotebook controller shut down');
    }

    /**
     * Get execution statistics
     */
    getStats(): any {
        const metrics = this._state.metrics;
        const totalExecutions = metrics.length;
        const successfulExecutions = metrics.filter(m => m.success).length;
        const failedExecutions = totalExecutions - successfulExecutions;
        
        const executionTimes = metrics.map(m => m.duration);
        const averageExecutionTime = executionTimes.length > 0 
            ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
            : 0;

        return {
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            averageExecutionTime,
            totalExecutionTime: executionTimes.reduce((a, b) => a + b, 0),
            errorsByType: this._getErrorsByType(),
            packagesLoaded: [] // Could be enhanced to track loaded packages
        };
    }

    /**
     * Dispose of the controller
     */
    dispose(): void {
        this.shutdown().catch(error => {
            this.outputChannel.appendLine(`Error during shutdown: ${error}`);
        });
        this._controller.dispose();
        this.removeAllListeners();
    }

    private async _startWorker(
        rx: AsyncGenerator<CellExecutionRequest, void, void>, 
        hasData: () => boolean
    ): Promise<void> {
        // Initialize Pyodide if not already done
        if (!this._state.isInitialized && !this._state.isInitializing) {
            await this.initialize();
        }

        let executeFurtherCells = true;

        for await (const request of rx) {
            if (this._isShuttingDown) {
                request.callback();
                continue;
            }

            const { cell, callback, timeout = this._config.timeouts.cellExecution } = request;
            
            if (!this._state.pyodideInstance) {
                // Try to reinitialize if Pyodide is not available
                try {
                    await this.initialize();
                } catch (error) {
                    this.outputChannel.appendLine(`Failed to initialize Pyodide: ${error}`);
                    callback();
                    continue;
                }
            }

            const execution = this._controller.createNotebookCellExecution(cell);

            if (executeFurtherCells && this._state.pyodideInstance) {
                const context: CellExecutionContext = {
                    cell,
                    execution,
                    output: new vscode.NotebookCellOutput([]),
                    pyodide: this._state.pyodideInstance,
                    startTime: Date.now(),
                    timeout
                };

                this._state.currentExecution = context;
                executeFurtherCells = await this._executeCell(context);
                this._state.currentExecution = undefined;
            } else {
                execution.start();
                execution.end(undefined);
            }

            callback();

            // Reset execution flag if queue is empty
            if (!hasData()) {
                executeFurtherCells = true;
            }
        }
    }

    private async _initializePyodide(): Promise<PyodideInterface> {
        const initStartTime = Date.now();
        
        try {
            this.emit('initialization-progress', { 
                stage: 'loading', 
                message: 'Loading Pyodide...', 
                progress: 10 
            });

            const pyodidePath = path.join(this.extContext.extensionPath, RESOURCE_PATHS.PYODIDE_DIR);

            // Clear Python environment variables
            PYTHON_ENV_CONFIG.ENV_VARS_TO_CLEAR.forEach(envVar => {
                delete process.env[envVar];
            });

            this.emit('initialization-progress', { 
                stage: 'loading', 
                message: 'Configuring Pyodide...', 
                progress: 30 
            });

            const pyodide = await Promise.race([
                loadPyodide({
                    indexURL: pyodidePath,
                    stdout: this._createStdoutHandler(),
                    stderr: this._createStderrHandler()
                }),
                new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Pyodide initialization timeout')), 
                    this._config.timeouts.initialization)
                )
            ]);

            this.emit('initialization-progress', { 
                stage: 'modules', 
                message: 'Loading AgentWorkbook module...', 
                progress: 70 
            });

            // Register AgentWorkbook module
            pyodide.registerJsModule(PYTHON_ENV_CONFIG.AGENTWORKBOOK_MODULE, this.agentWorkbook);

            // Load AgentWorkbook Python module
            const agentworkbookPyPath = path.join(this.extContext.extensionPath, RESOURCE_PATHS.AGENTWORKBOOK_PY);
            const agentworkbookPy = await fs.readFile(agentworkbookPyPath, 'utf8');
            pyodide.FS.writeFile(RESOURCE_PATHS.AGENTWORKBOOK_PY_TARGET, agentworkbookPy);

            this.emit('initialization-progress', { 
                stage: 'complete', 
                message: 'Initialization complete', 
                progress: 100 
            });

            // Note: Success telemetry would be added to telemetry module if needed
            return pyodide;

        } catch (error) {
            telemetry.notebookPyodideLoadingFailed(Date.now() - initStartTime);
            const errorInfo = NotebookErrorHandler.categorizeError(error);
            
            this.outputChannel.appendLine(`Pyodide initialization failed: ${errorInfo.message}`);
            this.outputChannel.appendLine(NotebookErrorHandler.createDetailedErrorReport(errorInfo));
            
            vscode.window.showErrorMessage(
                NotebookErrorHandler.createUserFriendlyMessage(errorInfo),
                'View Details'
            ).then(selection => {
                if (selection === 'View Details') {
                    this.outputChannel.show();
                }
            });

            throw error;
        }
    }

    private async _executeCell(context: CellExecutionContext): Promise<boolean> {
        const { cell, execution, output, pyodide, startTime, timeout } = context;
        
        execution.executionOrder = ++this._state.executionOrder;
        execution.start(startTime);
        execution.replaceOutput([output]);

        this.emit('cell-execution-started', context);

        // Setup telemetry interval
        const telemetryInterval = setInterval(() => {
            telemetry.notebookCellExec10sElapsed(Date.now() - startTime);
        }, TIMING_CONFIG.TELEMETRY_INTERVAL);

        const code = cell.document.getText();
        telemetry.notebookCellExecStart(code);

        try {
            const result = await Promise.race([
                this._runPythonCode(code, context),
                new Promise<PythonExecutionResult>((_, reject) => 
                    setTimeout(() => reject(new Error('Cell execution timeout')), timeout)
                )
            ]);

            clearInterval(telemetryInterval);

            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Create execution metrics
            const metrics: ExecutionMetrics = {
                cellId: cell.document.uri.toString(),
                executionOrder: execution.executionOrder!,
                startTime,
                endTime,
                duration,
                codeLength: code.length,
                outputSize: this._calculateOutputSize(result.outputItems),
                success: result.success,
                errorType: result.error ? NotebookErrorHandler.categorizeError(result.error, pyodide).type : undefined
            };

            this._addMetrics(metrics);
            execution.end(result.success, endTime);

            if (result.success) {
                telemetry.notebookCellExecSuccess(duration);
                this.emit('cell-execution-completed', metrics);
            } else {
                const errorInfo = NotebookErrorHandler.categorizeError(result.error!, pyodide);
                
                if (errorInfo.type === 'python_exception') {
                    telemetry.notebookCellExecException(duration);
                } else {
                    telemetry.notebookCellExecInternalError(duration);
                }

                this.emit('cell-execution-failed', { context, error: errorInfo });
                
                // Show user-friendly error message
                const userMessage = NotebookErrorHandler.createUserFriendlyMessage(errorInfo);
                const suggestions = NotebookErrorHandler.suggestRecoveryActions(errorInfo);
                
                if (suggestions.length > 0) {
                    vscode.window.showErrorMessage(
                        userMessage, 
                        'Show Suggestions'
                    ).then(selection => {
                        if (selection === 'Show Suggestions') {
                            this._showErrorSuggestions(errorInfo);
                        }
                    });
                }
            }

            return result.success;

        } catch (error) {
            clearInterval(telemetryInterval);
            
            const errorInfo = NotebookErrorHandler.categorizeError(error, pyodide);
            const endTime = Date.now();
            
            execution.appendOutputItems([
                vscode.NotebookCellOutputItem.error(errorInfo.originalError)
            ], output);
            
            execution.end(false, endTime);
            
            this.emit('cell-execution-failed', { context, error: errorInfo });
            return false;
        }
    }

    private async _runPythonCode(
        code: string, 
        context: CellExecutionContext
    ): Promise<PythonExecutionResult> {
        const { pyodide, execution, output } = context;
        const outputItems: vscode.NotebookCellOutputItem[] = [];
        
        try {
            // Load packages from imports
            await pyodide.loadPackagesFromImports(code);
            
            // Execute the code
            const result = await pyodide.runPythonAsync(code);
            
            // Process the result and create output items
            const resultOutputItems = this._processExecutionResult(result, pyodide, execution, output);
            outputItems.push(...resultOutputItems);
            
            return {
                success: true,
                result,
                executionTime: Date.now() - context.startTime,
                outputItems
            };
            
        } catch (error) {
            this.outputChannel.appendLine(`Execution error: ${JSON.stringify(error)}`);
            
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                executionTime: Date.now() - context.startTime,
                outputItems
            };
        }
    }

    private _processExecutionResult(
        result: any,
        pyodide: PyodideInterface,
        execution: vscode.NotebookCellExecution,
        output: vscode.NotebookCellOutput
    ): vscode.NotebookCellOutputItem[] {
        const outputItems: vscode.NotebookCellOutputItem[] = [];

        if (result instanceof AgentWorkbookStatus) {
            const data: RendererInitializationData = { 
                tasks: result.tasks, 
                workerActive: result.workerActive 
            };
            const outputItem = vscode.NotebookCellOutputItem.json(data, result.mime_type);
            execution.appendOutputItems(outputItem, output);
            outputItems.push(outputItem);
            return outputItems;
        }
        
        if (result instanceof pyodide.ffi.PyProxy) {
            const isDict = pyodide.globals.get('isinstance')(result, pyodide.globals.get('dict'));
            if (isDict) {
                const jsResult = result.toJs();
                if (jsResult instanceof Map && jsResult.has(OUTPUT_CONFIG.HTML_OUTPUT_KEY)) {
                    const htmlContent = jsResult.get(OUTPUT_CONFIG.HTML_OUTPUT_KEY).toString();
                    const outputItem = vscode.NotebookCellOutputItem.text(htmlContent, 'text/html');
                    
                    execution.replaceOutput([new vscode.NotebookCellOutput([outputItem])]);
                    outputItems.push(outputItem);
                    return outputItems;
                }
            }
        }

        if (result !== undefined) {
            let resultStr: string;
            try {
                resultStr = pyodide.globals.get('str')(result).toString();
            } catch {
                resultStr = String(result);
            }
            
            // Truncate if too long
            if (resultStr.length > OUTPUT_CONFIG.MAX_OUTPUT_LENGTH) {
                resultStr = resultStr.slice(0, OUTPUT_CONFIG.MAX_OUTPUT_LENGTH) + 
                          `\n... (output truncated, showing first ${OUTPUT_CONFIG.MAX_OUTPUT_LENGTH} characters)`;
            }
            
            const outputItem = vscode.NotebookCellOutputItem.stdout(resultStr + '\n');
            execution.appendOutputItems([outputItem], output);
            outputItems.push(outputItem);
        }

        return outputItems;
    }

    private _createStdoutHandler(): (text: string) => void {
        return (text: string) => {
            this.outputChannel.appendLine(`${OUTPUT_CONFIG.STDOUT_PREFIX}: ${text}`);
            if (this._state.currentExecution) {
                const outputItem = vscode.NotebookCellOutputItem.stdout(text + '\n');
                this._state.currentExecution.execution.appendOutputItems(
                    [outputItem], 
                    this._state.currentExecution.output
                );
            }
        };
    }

    private _createStderrHandler(): (text: string) => void {
        return (text: string) => {
            this.outputChannel.appendLine(`${OUTPUT_CONFIG.STDERR_PREFIX}: ${text}`);
            if (this._state.currentExecution) {
                const outputItem = vscode.NotebookCellOutputItem.stderr(text + '\n');
                this._state.currentExecution.execution.appendOutputItems(
                    [outputItem], 
                    this._state.currentExecution.output
                );
            }
        };
    }

    private _setupResourceManagement(): void {
        if (this._config.resources.enableGarbageCollection) {
            this._cleanupInterval = setInterval(() => {
                this._performCleanup();
            }, this._config.resources.cleanupInterval);
        }
    }

    private _performCleanup(): void {
        // Clean up old metrics
        if (this._state.metrics.length > this._config.performance.metricsRetention) {
            this._state.metrics.splice(0, this._state.metrics.length - this._config.performance.metricsRetention);
        }

        // Trigger Python garbage collection if available
        if (this._state.pyodideInstance) {
            try {
                this._state.pyodideInstance.runPython('import gc; gc.collect()');
            } catch {
                // Ignore errors during cleanup
            }
        }
    }

    private _addMetrics(metrics: ExecutionMetrics): void {
        this._state.metrics.push(metrics);
        
        // Limit metrics retention
        if (this._state.metrics.length > this._config.performance.metricsRetention) {
            this._state.metrics.shift();
        }
    }

    private _calculateOutputSize(outputItems: vscode.NotebookCellOutputItem[]): number {
        return outputItems.reduce((total, item) => {
            try {
                return total + JSON.stringify(item.data).length;
            } catch {
                return total;
            }
        }, 0);
    }

    private _getErrorsByType(): Record<string, number> {
        const errorCounts: Record<string, number> = {};
        
        this._state.metrics
            .filter(m => m.errorType)
            .forEach(m => {
                errorCounts[m.errorType!] = (errorCounts[m.errorType!] || 0) + 1;
            });
            
        return errorCounts;
    }

    private async _showErrorSuggestions(errorInfo: any): Promise<void> {
        const suggestions = NotebookErrorHandler.suggestRecoveryActions(errorInfo);
        const detailedReport = NotebookErrorHandler.createDetailedErrorReport(errorInfo);
        
        const document = await vscode.workspace.openTextDocument({
            content: `Error Analysis and Suggestions\n${'='.repeat(35)}\n\n${detailedReport}`,
            language: 'plaintext'
        });
        
        await vscode.window.showTextDocument(document);
    }
}