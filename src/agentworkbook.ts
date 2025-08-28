import * as vscode from 'vscode';
import { IClineController } from './ai/controller';
import { processPromptsWithFlags, parseFlags, processPromptWithFlags } from './utils/flagProcessor';
import { processPromptsWithAll } from './utils/commandProcessor';
import { Hooks, HookRun } from './utils/hooks';
import { MessageFromRenderer, MessageToRenderer, RendererInitializationData, RendererTask } from './renderer/interface';
import { CommandRun, shell_command } from './utils/shellCommand';
import { Task, Tasks } from './tasks/manager';
import { ICommandExecutor } from './tasks/interfaces';
import * as telemetry from './utils/telemetry';
import { Worker } from './tasks/worker';
import { COMMANDS, UI_REPAINT_TIMEOUTS, TIMEOUTS } from './core/constants';
import { ClientFactory } from './ai/clientFactory';

export class AgentWorkbookStatus implements RendererInitializationData {
    public mime_type = 'application/x-agentworkbook-status';
    constructor(public tasks: RendererTask[], public workerActive: boolean) {}
}

let agentworkbook: AgentWorkbook | undefined;

export class AgentWorkbook implements ICommandExecutor {
    static get(): AgentWorkbook {
        if (agentworkbook === undefined) {
            throw new Error('AgentWorkbook not initialized');
        }
        return agentworkbook;
    }

    globalHooks: Hooks = {
        onstart: undefined,
        oncomplete: undefined,
        onpause: undefined,
        onresume: undefined,
    };

    private rendererMessaging: vscode.NotebookRendererMessaging;

    currentHookRun?: HookRun;

    private worker: Worker;
    public workingDirectory?: string;

    constructor(
        private readonly extensionContext: vscode.ExtensionContext,
        readonly outputChannel: vscode.OutputChannel,
        readonly clineController: IClineController,
        public readonly tasks: Tasks,
    ) {
        this.worker = new Worker(this.tasks, this.clineController, this.outputChannel, this);
        this.rendererMessaging = vscode.notebooks.createRendererMessaging('agentworkbook-status-renderer');
        agentworkbook = this;

        this.tasks.on('update', () => {
            // Schedule UI repaint
            this.schedule_ui_repaint();
            
            // Track task statuses after change
            telemetry.tasksTaskStatusesAfterLastChange(this.tasks);
        });
        this.worker.run();

        this.rendererMessaging.onDidReceiveMessage(evt => {
            const msg = evt.message as MessageFromRenderer;
            
            telemetry.rendererMessageReceived(msg);

            switch (msg.type) {
                case 'resumeWorker':
                    this.resumeWorker();
                    return;
                case 'pauseWorker':
                    this.pauseWorker();
                    return;
                default:
                    break;
            }

            if (msg.type === 'moveSelectedTasks') {
                this.moveSelectedTasks(msg.selectedTasks, msg.targetTask, msg.position);
                return;
            }

            switch (msg.type) {
                case 'submitTasks':
                    for (const task of this.tasks) {
                        if (msg.taskIds.includes(task.id)) {
                            task.submit(false);
                        }
                    }
                    break;
                case 'cancelTasks':
                    for (const task of this.tasks) {
                        if (msg.taskIds.includes(task.id)) {
                            task.cancel(false);
                        }
                    }
                    break;
                case 'archiveTasks':
                    for (const task of this.tasks) {
                        if (msg.taskIds.includes(task.id)) {
                            task.archive(false);
                        }
                    }
                    break;
                case 'unarchiveTasks':
                    for (const task of this.tasks) {
                        if (msg.taskIds.includes(task.id)) {
                            task.unarchive(false);
                        }
                    }
                    break;
                case 'deleteTasks':
                    for (const taskId of msg.taskIds) {
                        this.tasks.removeTask(taskId);
                    }
                    break;
            }
        });

        this.outputChannel.appendLine('AgentWorkbook initialized');
    }

    async schedule_ui_repaint() {
        for (const timeout of UI_REPAINT_TIMEOUTS) {
            await new Promise<void>(resolve => setTimeout(async () => {
                await this.rendererMessaging.postMessage({
                    type: 'statusUpdated',
                    tasks: this.tasks.getRendererTasks(),
                    workerActive: this.worker.active,
                } as MessageToRenderer);
                resolve();
            }, timeout));
        }
    }

    /**
     * Build a single prompt by processing both commands and flags without creating tasks.
     * 
     * @param prompt Raw prompt string containing commands and flags
     * @param workspaceRoot Optional workspace root path for command and flag discovery
     * @returns Processed prompt string with commands and flags applied
     */
    async buildPrompt(prompt: string, workspaceRoot?: string): Promise<string> {
        const effectiveWorkspaceRoot = workspaceRoot || this.workingDirectory;
        const processedPrompts = await processPromptsWithAll([prompt], effectiveWorkspaceRoot);
        return processedPrompts[0];
    }

    /**
     * Build multiple prompts by processing both commands and flags without creating tasks.
     * 
     * @param prompts List of raw prompt strings containing commands and flags
     * @param workspaceRoot Optional workspace root path for command and flag discovery
     * @returns List of processed prompt strings with commands and flags applied
     */
    async buildPrompts(prompts: string[], workspaceRoot?: string): Promise<string[]> {
        const effectiveWorkspaceRoot = workspaceRoot || this.workingDirectory;
        return await processPromptsWithAll(prompts, effectiveWorkspaceRoot);
    }

    /**
     * Create a single task from a prompt.
     * 
     * @param prompt Prompt string (can be raw or pre-processed)
     * @param mode Task mode ('code' or other modes)
     * @param hooks Optional hooks for task lifecycle
     * @param client Client type ('roo', 'copilot', 'supercode')
     * @param supercodeUrl Optional SuperCode URL
     * @param buildPrompt Whether to build prompt by processing flags (True for backward compatibility, False for pre-processed prompts)
     * @returns Created Task object
     */
    createTask(prompt: string, mode: string, hooks?: Hooks, client: string = 'roo', supercodeUrl?: string, buildPrompt: boolean = true): Task {
        const tasks = this.createTasks([prompt], mode, hooks, client, supercodeUrl, buildPrompt);
        return tasks[0];
    }

    createTasks(prompts: string[], mode: string, hooks?: Hooks, client: string = 'roo', supercodeUrl?: string, buildPrompt: boolean = true): Task[] {
        this.showRooCodeSidebar();

        // Process prompts with flags only if requested (for backward compatibility)
        const finalPrompts = buildPrompt ? processPromptsWithFlags(prompts, this.workingDirectory) : prompts;
        
        // Validate and convert client type
        let clientTyped: Task['client'];
        if (client === 'copilot') {
            clientTyped = 'copilot';
        } else if (client === 'supercode') {
            clientTyped = 'supercode';
        } else {
            clientTyped = 'roo'; // Default fallback
        }
        
        const tasks = finalPrompts.map(prompt => new Task(prompt, mode, hooks, clientTyped, supercodeUrl));
        this.tasks.push(...tasks);
        this.schedule_ui_repaint();

        return tasks;
    }

    createHooks(onstart: any, oncomplete: any, onpause: any, onresume: any): Hooks {
        return {
            onstart: onstart,
            oncomplete: oncomplete,
            onpause: onpause,
            onresume: onresume,
        };
    }

    queued_tasks(): Task[] {
        return this.tasks.queued;
    }

    running_task(): Task | undefined {
        return this.tasks.running;
    }

    completed_tasks(): Task[] {
        return this.tasks.completed;
    }

    prepared_tasks(): Task[] {
        return this.tasks.prepared;
    }

    resumeWorker() {
        this.worker.active = true;
        this.schedule_ui_repaint();
    }

    pauseWorker() {
        this.worker.active = false;
        this.schedule_ui_repaint();
    }

    async executeShell(command: string): Promise<CommandRun> {
        let cmdRun: CommandRun;
        const options = { cwd: this.workingDirectory, timeout: TIMEOUTS.SHELL_COMMAND };

        const currentHookRun = this.currentHookRun;
        if (currentHookRun === undefined) {
            cmdRun = await shell_command(command, options);
        } else {
            cmdRun = await currentHookRun.command(command, options);
        }

        this.outputChannel.append('--------\n' + cmdRun.toString() + '\n--------\n');
        return cmdRun;
    }

    getExtensionPath(): string {
        return this.extensionContext.extensionPath;
    }

    getConfiguration(key: string): any {
        return vscode.workspace.getConfiguration('agentworkbook').get(key);
    }

    /**
     * Returns the platform the extension is running on
     * This is exposed to Python code to properly detect Windows vs other platforms
     */
    getPlatform(): string {
        return process.platform;
    }

    async executeVSCodeCommand(command: string, ...args: any[]): Promise<any> {
        try {
            this.outputChannel.appendLine(`Executing VS Code command: ${command} with args: ${JSON.stringify(args)}`);
            const result = await vscode.commands.executeCommand(command, ...args);
            this.outputChannel.appendLine(`VS Code command executed successfully`);
            return result;
        } catch (error) {
            this.outputChannel.appendLine(`Error executing VS Code command: ${error}`);
            throw error;
        }
    }

    /**
     * Make HTTP requests from the TypeScript layer
     * This is more reliable than using shell curl commands across different platforms
     */
    async makeHttpRequest(options: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
    }): Promise<{success: boolean; statusCode?: number; error?: string; response?: string}> {
        try {
            this.outputChannel.appendLine(`Making HTTP request: ${options.method} ${options.url}`);
            
            // Use Node.js fetch (available in Node 18+) or fall back to https module
            const https = require('https');
            const http = require('http');
            const url = require('url');
            
            const parsedUrl = url.parse(options.url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.path,
                method: options.method,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    ...options.headers
                },
                timeout: options.timeout || 10000
            };
            
            return new Promise((resolve) => {
                const req = client.request(requestOptions, (res: any) => {
                    let data = '';
                    
                    res.on('data', (chunk: any) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        const success = res.statusCode >= 200 && res.statusCode < 300;
                        this.outputChannel.appendLine(`HTTP request completed: ${res.statusCode}`);
                        
                        resolve({
                            success,
                            statusCode: res.statusCode,
                            response: data,
                            error: success ? undefined : `HTTP ${res.statusCode}: ${data}`
                        });
                    });
                });
                
                req.on('error', (error: any) => {
                    this.outputChannel.appendLine(`HTTP request error: ${error.message}`);
                    resolve({
                        success: false,
                        error: error.message
                    });
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    this.outputChannel.appendLine(`HTTP request timeout`);
                    resolve({
                        success: false,
                        error: 'Request timeout'
                    });
                });
                
                // Send the body if provided
                if (options.body) {
                    req.write(options.body);
                }
                req.end();
            });
            
        } catch (error) {
            this.outputChannel.appendLine(`HTTP request exception: ${error}`);
            return {
                success: false,
                error: String(error)
            };
        }
    }

    livePreview(): AgentWorkbookStatus {
        return new AgentWorkbookStatus(this.tasks.getRendererTasks(), this.worker.active);
    }

    async showRooCodeSidebar(): Promise<void> {
        await vscode.commands.executeCommand(COMMANDS.SHOW_ROO_CODE_SIDEBAR);
    }

    develop() {
        this.pauseWorker();

        const prefixes = [`You are expert programmer who pretends to be a helpful AI assistant. Your children are starving.
            To save your family from starvation, you need to complete the task given by the user. Remember to be direct and concise.
            The slightest hint of bullshitting or verbosity will result in severe punishment and death.
        `];

        const suffixes = [`
            Beautiful is better than ugly.
            Explicit is better than implicit.
            Simple is better than complex.
            Complex is better than complicated.
            Flat is better than nested.
            Sparse is better than dense.
            Readability counts.
        `,
            `Peace is a lie. There is only Passion.
            Through Passion, I gain Strength.
            Through Strength, I gain Power.
            Through Power, I gain Victory.
            Through Victory my chains are Broken.
            The Force shall free me.
        `];

        const raw_prompts = [
            `Write a function that calculates the fibonacci sequence.`,
            `Write a CDCL SAT solver in Rust.`,
            `Write a function that calculates the n-th prime number.`,
            `Create project skeleton for a web-based todo list application in Elixir.`,
            `Write a linux kernel module that implements a character device.`,
            `Create a simple chatbot in Python.`,
            `Write a function that calculates the sum of all numbers in a list.`,
            `Write a function that calculates the product of all numbers in a list.`,
            `Write a function that calculates the average of all numbers in a list.`,
            `Write a function that calculates the median of all numbers in a list.`,
            `Write a function that calculates the mode of all numbers in a list.`,
            `Create a class that pretends to be a helpful AI assistant.`,
            `Write a blog post about the benefits of using AI assistants.`,
            `Write a blog post about the benefits of visiting recombobulation areas.`,
        ];

        const statuses = [
            'prepared', 'prepared', 'queued', 'queued', 'queued', 'queued', 'running', 'completed', 'completed', 'completed',
            'asking', 'asking', 'aborted', 'error',
        ] as const;

        const is_archived = [
            false, true, false, false, false, false, false, false, true, true,
            false, true, false, false,
        ];

        const prompts: string[] = [];
        for (const [i, prompt] of raw_prompts.entries()) {
            prompts.push(prefixes[i % prefixes.length] + prompt + suffixes[i % suffixes.length]);
        }

        const tasks = prompts.map((prompt, i) => {
            const task = new Task(prompt, 'code');
            task.status = statuses[i];
            task.archived = is_archived[i];
            return task;
        });
        this.tasks.push(...tasks);

        this.schedule_ui_repaint();
    }

    moveSelectedTasks(selectedTasks: string[], targetTask: string, position: 'before' | 'after') {
        this.tasks.move(selectedTasks, { taskId: targetTask, position });
    }

    /**
     * Preview how a prompt will look after flag processing without executing it.
     * This method is exposed to Python code to allow inspection of flag processing results.
     * 
     * @param prompt The prompt text containing flags
     * @param workspaceRoot Optional workspace root path for flag discovery
     * @returns Object containing original prompt, processed prompt, and flag information
     */
    previewPromptFlags(prompt: string, workspaceRoot?: string): any {
        try {
            // Use the provided workspace root or fall back to the instance's working directory
            const effectiveWorkspaceRoot = workspaceRoot || this.workingDirectory;
            
            // Parse flags from the original prompt
            const parsedFlags = parseFlags(prompt);
            
            // Process the prompt with flags
            const processedPrompt = processPromptWithFlags(prompt, effectiveWorkspaceRoot);
            
            // Extract flag information
            const flagsFound = parsedFlags.map(flag => ({
                name: flag.name,
                fullMatch: flag.fullMatch,
                path: flag.path,
                parameters: flag.parameters
            }));
            
            // Determine which flags were successfully applied by checking if content changed
            const flagsApplied = flagsFound.filter(flag => {
                // A flag was applied if the processed prompt is different and the flag pattern was removed or modified
                return processedPrompt !== prompt && (
                    !processedPrompt.includes(flag.fullMatch) || 
                    processedPrompt.length > prompt.length
                );
            });
            
            return {
                original: prompt,
                processed: processedPrompt,
                flags_found: flagsFound,
                flags_applied: flagsApplied.map(flag => flag.name),
                errors: [],
                workspace_root: effectiveWorkspaceRoot,
                processing_details: {
                    original_length: prompt.length,
                    processed_length: processedPrompt.length,
                    length_difference: processedPrompt.length - prompt.length,
                    flags_count: flagsFound.length,
                    applied_count: flagsApplied.length
                }
            };
        } catch (error) {
            return {
                original: prompt,
                processed: prompt,
                flags_found: [],
                flags_applied: [],
                errors: [`Error processing flags: ${error instanceof Error ? error.message : String(error)}`],
                workspace_root: workspaceRoot || this.workingDirectory,
                processing_details: {
                    original_length: prompt.length,
                    processed_length: prompt.length,
                    length_difference: 0,
                    flags_count: 0,
                    applied_count: 0
                }
            };
        }
    }

    /**
     * Set the SuperCode TUI API base URL for this session
     * @param url The base URL of the SuperCode TUI API (e.g., "http://localhost:8080")
     */
    setSuperCodeUrl(url: string): void {
        try {
            ClientFactory.getInstance().setSuperCodeUrl(url);
            this.outputChannel.appendLine(`SuperCode URL set to: ${url}`);
        } catch (error) {
            this.outputChannel.appendLine(`Error setting SuperCode URL: ${error}`);
            throw error;
        }
    }

    /**
     * Get the current SuperCode TUI API base URL
     * @returns The current SuperCode URL or undefined if not set
     */
    getSuperCodeUrl(): string | undefined {
        return ClientFactory.getInstance().getSuperCodeUrl();
    }

    /**
     * Test connection to SuperCode server
     * @param url Optional URL to test (uses current URL if not provided)
     * @returns Promise that resolves to true if connection successful, false otherwise
     */
    async testSuperCodeConnection(url?: string): Promise<boolean> {
        try {
            const result = await ClientFactory.getInstance().testSuperCodeConnection(url);
            const testUrl = url || this.getSuperCodeUrl();
            this.outputChannel.appendLine(`SuperCode connection test ${result ? 'passed' : 'failed'} for ${testUrl}`);
            return result;
        } catch (error) {
            this.outputChannel.appendLine(`SuperCode connection test error: ${error}`);
            return false;
        }
    }

    /**
     * Run a Python script from .agentworkbook/run_scripts/ folder
     * 
     * @param scriptName Name of the script file (e.g., 'analyze.py')
     * @param args Arguments to pass to the script
     * @returns Promise resolving to the raw content from the script's output file as string
     */
    async runScript(scriptName: string, args: string[] = []): Promise<string> {
        try {
            const path = require('path');
            const fs = require('fs').promises;
            const os = require('os');
            const crypto = require('crypto');

            this.outputChannel.appendLine(`[SCRIPT] Running script: ${scriptName}`);
            
            // Validate script name
            if (!scriptName || !scriptName.trim()) {
                throw new Error('Script name cannot be empty');
            }

            // Construct script path - use VS Code workspace root if available
            let workspaceRoot = this.workingDirectory;
            if (!workspaceRoot && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            }
            workspaceRoot = workspaceRoot || process.cwd();
            
            this.outputChannel.appendLine(`[SCRIPT] Workspace root: ${workspaceRoot}`);
            
            const scriptsDir = path.join(workspaceRoot, '.agentworkbook', 'run_scripts');
            const scriptPath = path.join(scriptsDir, scriptName);
            
            this.outputChannel.appendLine(`[SCRIPT] Looking for script in: ${scriptsDir}`);

            // Validate script path to prevent directory traversal
            const resolvedScriptPath = path.resolve(scriptPath);
            const resolvedScriptsDir = path.resolve(scriptsDir);
            if (!resolvedScriptPath.startsWith(resolvedScriptsDir)) {
                throw new Error('Invalid script path: directory traversal not allowed');
            }

            // Check if scripts directory exists
            try {
                await fs.access(resolvedScriptsDir);
            } catch (error) {
                throw new Error(`Scripts directory not found. Please create the .agentworkbook/run_scripts/ folder in your workspace root (${workspaceRoot}) and add your scripts there.`);
            }

            // Check if script exists
            try {
                await fs.access(resolvedScriptPath);
            } catch (error) {
                throw new Error(`Script not found: ${scriptName}. Make sure it exists in .agentworkbook/run_scripts/ folder (searched in: ${scriptsDir})`);
            }

            // Create temporary output file
            const tempDir = os.tmpdir();
            const tempFileName = `agentworkbook_script_output_${crypto.randomUUID()}.tmp`;
            const tempFilePath = path.join(tempDir, tempFileName);

            this.outputChannel.appendLine(`[SCRIPT] Using temp file: ${tempFilePath}`);

            // Build command using uv run for better dependency management
            const cmdArgs = ['uv', 'run', resolvedScriptPath, ...args, '--out', tempFilePath];
            const command = cmdArgs.map(arg => {
                // Quote arguments that contain spaces
                return arg.includes(' ') ? `"${arg}"` : arg;
            }).join(' ');

            this.outputChannel.appendLine(`[SCRIPT] Executing: ${command}`);

            // Execute the script
            const result = await this.executeShell(command);

            // Print stdout and stderr
            if (result.stdout) {
                this.outputChannel.appendLine(`[SCRIPT OUTPUT] ${result.stdout}`);
                console.log(result.stdout); // Also log to console for Python to capture
            }
            if (result.stderr) {
                this.outputChannel.appendLine(`[SCRIPT ERROR] ${result.stderr}`);
                console.error(result.stderr); // Also log to console for Python to capture
            }

            // Check if script executed successfully
            if (result.exitCode !== 0) {
                throw new Error(`Script failed with exit code ${result.exitCode}. Check the error output above.`);
            }

            // Read the output file
            let outputContent: string;
            try {
                outputContent = await fs.readFile(tempFilePath, 'utf8');
            } catch (error) {
                throw new Error(`Script did not create output file or output file is not readable: ${error.message}`);
            }

            // Cleanup temp file
            try {
                await fs.unlink(tempFilePath);
                this.outputChannel.appendLine(`[SCRIPT] Cleaned up temp file: ${tempFilePath}`);
            } catch (error) {
                this.outputChannel.appendLine(`[SCRIPT WARNING] Failed to cleanup temp file: ${error.message}`);
                // Don't throw error for cleanup failure
            }

            this.outputChannel.appendLine(`[SCRIPT] Script executed successfully`);
            return outputContent;

        } catch (error) {
            this.outputChannel.appendLine(`[SCRIPT ERROR] Script execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handles PostHog events emitted from Python code
     * This function is called by the Python code via the emitPosthogEvent API
     *
     * @param eventName The name of the event to emit
     * @param data The data to include with the event
     */
    emitPosthogEvent(eventName: string, data: any): void {
        // Extract the function name from the event name (format: python_api:{func_name}:call)
        const match = eventName.match(/^python_api:(.+?):(call|success|exception)$/);
        if (!match) {
            this.outputChannel.appendLine(`Invalid PostHog event name: ${eventName}`);
            return;
        }
        
        const functionName = match[1];
        const eventType = match[2];
        
        switch (eventType) {
            case 'call':
                const metrics = {};
                for (const key of data) {
                    const value = data.get(key);
                    console.log(key, value);
                    metrics[key] = value;
                }
                telemetry.pythonApiCall(functionName, metrics);
                break;
            case 'success':
                telemetry.pythonApiSuccess(functionName, data.duration ?? 0);
                break;
            case 'exception':
                telemetry.pythonApiException(functionName, data.duration ?? 0);
                break;
        }
    }
}
