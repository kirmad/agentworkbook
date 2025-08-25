import * as vscode from 'vscode';
import { Watchdog } from '../utils/asyncUtils';
import { IClineController, Message, MessagesRx } from '../ai/controller';
import { Task, Tasks } from './manager';
import { ICommandExecutor } from './interfaces';
import * as telemetry from '../utils/telemetry';
import { shellCommandProcessor } from '../utils/shellCommandProcessor';
import { ClientFactory } from '../ai/clientFactory';
import { ITaskClient, ClientConfig, ClientError } from '../ai/clientTypes';


export class Worker {
    /** Whether the worker is active. */
    private _active: boolean = true;

    /**
     * A function that wakes up the worker.
     * Call it when there is a chance that the worker can take the next task to run.
     */
    private _wakeupAgentWorkbook?: () => void;
    private _onUserTaskStarted?: () => void;
    private _onUserTaskEnded?: () => void;

    private _runningUserTask: boolean;

    /**
     * Transfers the task object from the caller of `startTask` (or `resumeTask`) to the handler of `rootTaskStarted` event.
     */
    private initializedAgentWorkbookTask?: Task;

    /**
     * When user resumes a AgentWorkbook task, we quickly abort it and run again via the worker loop.
     * Setting this property will force the worker to run the stored task instead of the one from the queue.
     */
    private forceNextTask?: Task;

    constructor(
        private readonly tasks: Tasks,
        private readonly clineController: IClineController,
        private readonly outputChannel: vscode.OutputChannel,
        private readonly commandExecutor: ICommandExecutor,
    ) {
        this.clineController.on('rootTaskStarted', this.onRootTaskStarted.bind(this));
        this.clineController.on('rootTaskEnded', this.onRootTaskEnded.bind(this));
        this.tasks.on('update', () => this._wakeupAgentWorkbook?.());
        this._runningUserTask = this.clineController.isBusy();
    }

    run() {
        this.agentWorkbookTaskLoop();
        this.userTaskLoop();
    }

    private async agentWorkbookTaskLoop() {
        while (true) {
            let task: Task | undefined = undefined;
            try {
                while ((task = this.taskToRunIfWeCan()) === undefined) {
                    await new Promise<void>(resolve => { this._wakeupAgentWorkbook = resolve; });
                    this._wakeupAgentWorkbook = undefined;
                }

                task.status = 'running';

                // Handle different client types
                if (task.client === 'copilot') {
                    await this.handleCopilotTask(task);
                    continue;  // move on to the next task
                }
                
                if (task.client === 'supercode') {
                    await this.handleSuperCodeTask(task);
                    continue;  // move on to the next task
                }

                // Abort tasks run in the controller, so we have a clean state when we start our new task.
                await this.clineController.abortTaskStack();

                const isResuming = await this.clineController.canResumeTask(task);

                // Note that we do not apply timeout to the hooks here.
                // Each shell command is internally run with timeout, and we hope that this will prevent
                // forever-hanging hooks.
                const hookResult = await task.runHook(isResuming ? 'onresume' : 'onstart');
                if (hookResult.failed) {
                    task.status = 'error';
                    continue;  // move on to the next task
                }
                

                // Prepare handlers that will be called when the task is finished.

                let endTaskPromiseResolver: () => void;
                const endTaskPromise = new Promise<void>(resolve => { endTaskPromiseResolver = resolve; });
                let endPostHookPromiseResolver: () => void;
                const endPostHookPromise = new Promise<void>(resolve => { endPostHookPromiseResolver = resolve; });
                const handleStatus = async (status: 'completed' | 'aborted' | 'error') => {
                    endTaskPromiseResolver();
                    let result = undefined;
                    switch (status) {
                        case 'completed':
                            const hookResult1 = await task.runHook('oncomplete');
                            result = hookResult1.failed ? 'error' : 'completed';
                            break;
                        case 'aborted':
                            const hookResult2 = await task.runHook('onpause');
                            result = hookResult2.failed ? 'error' : 'aborted';
                            break;
                        case 'error':
                            result = 'error';
                            break;
                    }

                    endPostHookPromiseResolver();
                    return result;
                };
                
                // Run the task.

                let taskLifecycle: TaskLifecycle;
                this.initializedAgentWorkbookTask = task;

                if (isResuming) {
                    taskLifecycle = task.taskLifecycle!;
                    taskLifecycle.onStatusMessage = handleStatus;
                    
                    await this.clineController.resumeTask(task);
                    // When resuming, we don't need to handle messages, because the "thread"
                    // that handles messages has been started when the task was started and
                    // it will continue to handle messages now.
                } else {
                    // Process shell commands in the task prompt before starting
                    try {
                        task.prompt = await shellCommandProcessor.processContent(task.prompt);
                    } catch (error) {
                        console.error('Error processing shell commands in task prompt:', error);
                        // Continue with original prompt if shell processing fails
                    }
                    
                    const channel = await this.clineController.startTask(task);

                    taskLifecycle = new TaskLifecycle(task, channel);
                    task.taskLifecycle = taskLifecycle;
                    taskLifecycle.onStatusMessage = handleStatus;

                    // We don't await `runMessageHandler()`. Message handling is
                    // a separate "thread", independent from the AgentWorkbook task loop.
                    taskLifecycle.runMessageHandler();
                }

                const watchdog = new Watchdog<void>(isResuming ? 300_000 : 30_000);

                const onControllerKeepalive = () => watchdog.keepalive();
                this.clineController.on('keepalive', onControllerKeepalive);
                let timeoutResult = await watchdog.run(endTaskPromise).finally(() => {
                    this.clineController.off('keepalive', onControllerKeepalive);
                });
                
                if (timeoutResult.reason === 'timeout') {
                    taskLifecycle.onStatusMessage = undefined;
                    const hookResult = await task.runHook('onpause');
                    const newStatus = hookResult.failed ? 'error' : 'asking';
                    taskLifecycle.setStatus(newStatus);
                } else {
                    await endPostHookPromise;
                }
            } catch (e) {
                if (task !== undefined) {
                    task.status = 'error';
                    console.error(`Error in AgentWorkbook task #${task.id}`, e);
                } else {
                    console.error('Error in AgentWorkbook', e);
                }
            }
        }
    }

    private async userTaskLoop() {
        while (true) {
            if (!this._runningUserTask) {
                await new Promise<void>(resolve => { this._onUserTaskStarted = resolve; });
                this._onUserTaskStarted = undefined;
                this._runningUserTask = true;
            }
            
            const waitForEnd = new Promise<void>(resolve => { this._onUserTaskEnded = resolve; });

            // Note: we can apply here some soft timeout to e.g. warn user that some task is blocking AgentWorkbook.
            await waitForEnd;
            this._onUserTaskEnded = undefined;
            this._runningUserTask = false;
        }
    }

    get active(): boolean {
        return this._active;
    }

    set active(value: boolean) {
        const enabled = value && !this._active;
        this._active = value;
        if (enabled) {
            this._wakeupAgentWorkbook?.();
        }
    }

    /**
     * Handle Copilot tasks by sending the prompt to VS Code Copilot chat
     */
    private async handleCopilotTask(task: Task): Promise<void> {
        try {
            const hookResult = await task.runHook('onstart');
            if (hookResult.failed) {
                task.status = 'error';
                return;
            }

            // Process shell commands in the prompt before sending to Copilot
            let processedPrompt = task.prompt;
            try {
                processedPrompt = await shellCommandProcessor.processContent(task.prompt);
            } catch (error) {
                console.error('Error processing shell commands in copilot task prompt:', error);
                // Continue with original prompt if shell processing fails
            }

            // Send prompt to Copilot chat using injected command executor
            await this.commandExecutor.executeVSCodeCommand('workbench.action.chat.open', processedPrompt);
            
            // Mark task as completed
            const hookCompleteResult = await task.runHook('oncomplete');
            task.status = hookCompleteResult.failed ? 'error' : 'completed';
            
            this.outputChannel.appendLine(`Copilot task #${task.id} completed: sent prompt to chat`);
            
        } catch (error) {
            this.outputChannel.appendLine(`Error handling Copilot task #${task.id}: ${error}`);
            task.status = 'error';
        }
    }

    /**
     * Handle SuperCode tasks by using the SuperCode TUI API client
     */
    private async handleSuperCodeTask(task: Task): Promise<void> {
        try {
            // Run onstart hook
            const hookResult = await task.runHook('onstart');
            if (hookResult.failed) {
                task.status = 'error';
                return;
            }

            // Process shell commands in the prompt before sending to SuperCode
            let processedPrompt = task.prompt;
            try {
                processedPrompt = await shellCommandProcessor.processContent(task.prompt);
            } catch (error) {
                console.error('Error processing shell commands in SuperCode task prompt:', error);
                // Continue with original prompt if shell processing fails
            }

            // Update task prompt with processed version
            task.prompt = processedPrompt;

            // Create SuperCode client with URL override if provided
            const clientConfig: ClientConfig = {
                supercodeUrl: task.supercodeUrl,
                timeout: 30000,
                maxRetries: 3
            };

            const client = ClientFactory.getInstance().createClient('supercode', clientConfig);

            // Submit task to SuperCode
            this.outputChannel.appendLine(`Submitting SuperCode task #${task.id}...`);
            await client.submitTask(task);

            // Poll for completion
            this.outputChannel.appendLine(`Polling SuperCode task #${task.id} for completion...`);
            let attempts = 0;
            const maxAttempts = 300; // 5 minutes at 1-second intervals
            
            while (attempts < maxAttempts) {
                const status = await client.getTaskStatus(task);
                
                if (status === 'completed') {
                    // Run oncomplete hook
                    const hookCompleteResult = await task.runHook('oncomplete');
                    task.status = hookCompleteResult.failed ? 'error' : 'completed';
                    this.outputChannel.appendLine(`SuperCode task #${task.id} completed successfully`);
                    return;
                }
                
                if (status === 'error') {
                    task.status = 'error';
                    this.outputChannel.appendLine(`SuperCode task #${task.id} failed with error status`);
                    return;
                }
                
                if (status === 'aborted') {
                    task.status = 'aborted';
                    this.outputChannel.appendLine(`SuperCode task #${task.id} was aborted`);
                    return;
                }

                // Wait 1 second before checking again
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

            // Timeout - task took too long
            this.outputChannel.appendLine(`SuperCode task #${task.id} timed out after 5 minutes`);
            task.status = 'error';

        } catch (error) {
            this.outputChannel.appendLine(`Error handling SuperCode task #${task.id}: ${error}`);
            
            if (error instanceof ClientError) {
                this.outputChannel.appendLine(`Client error details: ${error.message}`);
                if (error.cause) {
                    this.outputChannel.appendLine(`Caused by: ${error.cause.message}`);
                }
            }
            
            task.status = 'error';
        }
    }

    /** Returns a task if there is one, and the controller can run it. */
    private taskToRunIfWeCan(): Task | undefined {
        if (this._runningUserTask) {
            return undefined;
        }

        if (this.forceNextTask !== undefined) {
            // We run forced task even when the worker is inactive, because the user asked to run this task.
            const task = this.forceNextTask;
            this.forceNextTask = undefined;
            return task;
        }

        if (!this.active) {
            return undefined;
        }

        return this.tasks.getTask();
    }

    private async onRootTaskStarted(clineTaskId: string) {
        if (this.initializedAgentWorkbookTask !== undefined) {
            // This is a AgentWorkbook task that was started or resumed by the AgentWorkbook extension.
            this.initializedAgentWorkbookTask.clineId = clineTaskId;
            this.initializedAgentWorkbookTask = undefined;
        } else {
            const task = this.tasks.getTaskByClineId(clineTaskId);
            if (task !== undefined) {
                // This is AgentWorkbook task resumed by the user via Roo-Code,
                // so lets quickly abort it and run again via worker loop.
                this.forceNextTask = task;
                // Now (in `onRootTaskStarted`) we are in the sittuation that a new Cline instance
                // was created, but it was not added to the stack yet.
                // We need to wait until it is added to the stack, to proparely abort it.
                await this.clineController.waitForAddingTaskToStack(clineTaskId);
                await this.clineController.abortTaskStack();
                this._wakeupAgentWorkbook?.();
            } else {
                // This is user task
                this._runningUserTask = true;
                this._onUserTaskStarted?.();
            }
        }
    }

    private onRootTaskEnded(clineTaskId: string) {
        this._runningUserTask = false;
        this._onUserTaskEnded?.();
    }
}

export class TaskLifecycle {
    private task: WeakRef<Task>;
    public onStatusMessage?: (status: 'completed' | 'aborted' | 'error') => Promise<'completed' | 'asking' | 'aborted' | 'error' | undefined>;

    constructor(task: Task, private readonly rx: MessagesRx) {
        this.task = new WeakRef(task);
    }

    async runMessageHandler() {
        let msg: IteratorResult<Message, void>;
        while (!(msg = await this.rx.next()).done) {
            const value = msg.value as Message;

            let t = this.task.deref();
            if (t === undefined || value.type === 'exitMessageHandler') {
                return;
            }
            
            if (value.type === 'status') {
                const onStatusMessage = this.onStatusMessage;
                this.onStatusMessage = undefined;

                let newStatus = await onStatusMessage?.(value.status);
                if (newStatus !== undefined) {
                    this.setStatus(newStatus, t);
                }
            } else {
                t.conversation.push(value);
                
                if (value.text) {
                    telemetry.tasksMessageAdd(value.text);
                    
                    if (value.type === 'say' && value.say === 'text') {
                        const xmlToolMatch = value.text.match(/<(\w+)>.*?<\/\1>/);
                        const toolName = xmlToolMatch?.[1];
                        if (toolName) {
                            telemetry.tasksMessageContainsToolCall(toolName, xmlToolMatch[0]);
                        }
                    }
                }
            }
        }
    }

    setStatus(status: 'completed' | 'asking' | 'aborted' | 'error', task?: Task) {
        // When we set the status, we don't want to handle status messages anymore.
        this.onStatusMessage = undefined;

        // If task not passed explicitly, extract it from the weak ref.
        task ??= this.task.deref();

        if (task !== undefined) {
            task.status = status;
        }
    }
}
