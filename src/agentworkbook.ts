import * as vscode from 'vscode';
import { IClineController } from './ai/controller';
import { processPromptsWithFlags, parseFlags, processPromptWithFlags } from './utils/flagProcessor';
import { Hooks, HookRun } from './utils/hooks';
import { MessageFromRenderer, MessageToRenderer, RendererInitializationData, RendererTask } from './renderer/interface';
import { CommandRun, shell_command } from './utils/shellCommand';
import { Task, Tasks } from './tasks/manager';
import { ICommandExecutor } from './tasks/interfaces';
import * as telemetry from './utils/telemetry';
import { Worker } from './tasks/worker';
import { COMMANDS, UI_REPAINT_TIMEOUTS, TIMEOUTS } from './core/constants';

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

    createTasks(prompts: string[], mode: string, hooks?: Hooks, client: string = 'roo'): Task[] {
        this.showRooCodeSidebar();

        // Process prompts with flags
        const processedPrompts = processPromptsWithFlags(prompts, this.workingDirectory);
        
        const clientTyped = client === 'copilot' ? 'copilot' : 'roo';
        const tasks = processedPrompts.map(prompt => new Task(prompt, mode, hooks, clientTyped));
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
