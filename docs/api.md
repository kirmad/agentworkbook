# AgentWorkbook API Reference

## Core APIs

### AgentWorkbook Class

The main coordinator class that manages the extension's global state and operations.

```typescript
class AgentWorkbook {
    static get(): AgentWorkbook
    globalHooks: Hooks
    currentHookRun?: HookRun
    workingDirectory?: string
    
    constructor(
        extensionContext: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel,
        clineController: IClineController,
        tasks: Tasks
    )
    
    // Methods
    schedule_ui_repaint(): void
    pauseWorker(): void
    resumeWorker(): void
    executeCommand(command: string): Promise<CommandRun>
    moveSelectedTasks(selectedTasks: string[], targetTask: string, position: 'before' | 'after'): void
}
```

#### Static Methods

##### `get(): AgentWorkbook`
Returns the singleton instance of AgentWorkbook.
- **Returns**: The global AgentWorkbook instance
- **Throws**: Error if AgentWorkbook is not initialized

#### Instance Methods

##### `schedule_ui_repaint(): void`
Schedules a UI update for the task renderer.

##### `pauseWorker(): void`
Pauses the task processing worker.

##### `resumeWorker(): void`
Resumes the task processing worker.

##### `executeCommand(command: string): Promise<CommandRun>`
Executes a shell command in the working directory.
- **Parameters**:
  - `command`: The shell command to execute
- **Returns**: Promise resolving to command execution result

### Task Management

#### Task Class

Represents an individual task in the queue.

```typescript
class Task {
    readonly id: string
    prompt: string
    mode: string
    client: TaskClient
    hooks?: Hooks
    status: TaskStatus
    archived: boolean
    previousAttempts: TaskStatus[]
    conversation: Message[]
    hookRuns: HookRun[]
    summary?: string[]
    
    constructor(prompt: string, mode: string, hooks?: Hooks, client?: TaskClient)
    
    // Methods
    submit(verbose?: boolean): void
    cancel(verbose?: boolean): void
    archive(verbose?: boolean): void
    unarchive(verbose?: boolean): void
}
```

##### Properties

- `id`: Unique identifier (5-character UUID)
- `prompt`: The task prompt/instruction
- `mode`: Execution mode (e.g., 'code', 'chat')
- `client`: AI client to use ('roo' or 'copilot')
- `status`: Current task status
- `archived`: Whether task is archived
- `conversation`: Message history with AI
- `summary`: Summarized prompt for display

##### Task Status Types

```typescript
type TaskStatus = 
    | 'prepared'   // Created but not queued
    | 'queued'     // Waiting for execution
    | 'running'    // Currently executing
    | 'completed'  // Successfully finished
    | 'asking'     // Waiting for user input
    | 'aborted'    // Cancelled by user
    | 'error'      // Failed with error
```

#### Tasks Manager

Manages the collection of tasks and emits update events.

```typescript
class Tasks extends Array<Task> {
    on(event: 'update', listener: () => void): void
    emit(event: 'update'): void
    
    // Array methods inherited
    push(...tasks: Task[]): number
    splice(start: number, deleteCount?: number, ...items: Task[]): Task[]
    // ... other Array methods
}
```

### Task Creation and Execution

```typescript
// Create tasks with optional client selection
function create_tasks(
    prompts: string[], 
    mode: string = "code",
    client?: "roo" | "copilot"  // Optional, defaults to "roo"
): Task[]

// Submit tasks for execution
function submit_tasks(task_ids: string[]): void

// Wait for single task completion
async function wait_for_task(
    task: Task, 
    timeout?: number  // Optional timeout in seconds
): Promise<any>

// Wait for multiple tasks to complete
async function wait_for_tasks(
    tasks: Task[]
): Promise<any[]>

// Cancel a running task
function cancel_task(task_id: string): void

// Respond to task asking for input
function respond_to_task(task_id: string, response: string): void
```

#### Usage Examples

```typescript
// Create tasks with RooCode (default)
const tasks = awb.create_tasks(["Implement login"], "code");

// Create tasks with Copilot
const tasks = awb.create_tasks(["Create UI component"], "code", "copilot");

// Submit and wait for completion
awb.submit_tasks(tasks.map(t => t.id));
const results = await awb.wait_for_tasks(tasks);

// Wait with timeout
try {
    const result = await awb.wait_for_task(tasks[0], 300); // 5 minutes
} catch (error) {
    console.error("Task timed out");
}
```

### AI Integration

#### IClineController Interface

Interface for AI controller implementations.

```typescript
interface IClineController {
    say(text: string, sayInInlineChat?: boolean): Promise<void>
    getWebviewUriRoot(): vscode.Uri
    invoke(tx: MessagesTx): void
    abortTask(taskId: string): Promise<void>
    showAskResponse(question: string, askResponse: AskResponse): void
    popPendingMessage(id: string): Message
}
```

#### Message Types

```typescript
interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp?: number
}

interface MessagesTx {
    taskId: string
    messages: Message[]
    onUpdate?: (messages: Message[]) => void
    onComplete?: () => void
    onError?: (error: Error) => void
}
```

### Notebook System

#### AgentWorkbookSerializer

Handles serialization/deserialization of notebook files.

```typescript
class AgentWorkbookSerializer implements vscode.NotebookSerializer {
    async deserializeNotebook(
        content: Uint8Array,
        token: vscode.CancellationToken
    ): Promise<vscode.NotebookData>
    
    async serializeNotebook(
        data: vscode.NotebookData,
        token: vscode.CancellationToken
    ): Promise<Uint8Array>
}
```

#### Notebook Cell Structure

```typescript
interface NotebookCell {
    kind: vscode.NotebookCellKind
    value: string
    languageId: string
    metadata?: {
        mode?: string
        flags?: string[]
        hooks?: Hooks
    }
}
```

### Python Integration

#### PyNotebookController

Manages Python code execution in notebooks.

```typescript
class PyNotebookController {
    constructor(
        context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel,
        agentWorkbook: AgentWorkbook
    )
    
    // Methods
    async executePythonCode(code: string): Promise<ExecutionResult>
    async initializePyodide(): Promise<void>
    handleError(error: PythonError): void
}
```

#### Python Execution Types

```typescript
interface ExecutionResult {
    output?: string
    error?: PythonError
    executionTime: number
}

interface PythonError {
    name: string
    message: string
    stack?: string
    line?: number
    column?: number
}
```

### Renderer Communication

#### Message Protocol

Messages sent between extension and renderer.

```typescript
// Extension → Renderer
interface MessageToRenderer {
    type: 'initialize' | 'update' | 'workerStatus'
    data: RendererInitializationData | TaskUpdate | WorkerStatus
}

// Renderer → Extension
interface MessageFromRenderer {
    type: 'submitTasks' | 'cancelTasks' | 'archiveTasks' | 
          'moveSelectedTasks' | 'pauseWorker' | 'resumeWorker'
    taskIds?: string[]
    selectedTasks?: string[]
    targetTask?: string
    position?: 'before' | 'after'
}
```

### Hook System

#### Hook Types

```typescript
interface Hooks {
    onstart?: string      // Script to run when task starts
    oncomplete?: string   // Script to run when task completes
    onpause?: string      // Script to run when worker pauses
    onresume?: string     // Script to run when worker resumes
}

interface HookRun {
    hook: keyof Hooks
    script: string
    result?: CommandRun
    error?: Error
    timestamp: number
}
```

### Utility APIs

#### Flag Processor

Processes YAML frontmatter in task cells.

```typescript
function processPromptsWithFlags(
    prompts: string[]
): ProcessedPrompts

interface ProcessedPrompts {
    prompts: ProcessedPrompt[]
    globalMetadata?: GlobalMetadata
}

interface ProcessedPrompt {
    text: string
    metadata?: {
        mode?: string
        flags?: string[]
        timeout?: number
        [key: string]: any
    }
}
```

#### Template Manager

Manages code template insertion.

```typescript
class TemplateManager {
    static async showTemplateQuickPick(): Promise<Template | undefined>
    static async insertTemplateIntoNotebook(
        template: Template,
        cellContext?: vscode.NotebookCell
    ): Promise<void>
    static getAvailableTemplates(): Template[]
}

interface Template {
    id: string
    label: string
    description?: string
    content: string
    language: string
    category?: string
}
```

### Telemetry

#### Telemetry Events

```typescript
namespace telemetry {
    function extensionActivated(): void
    function extensionDeactivating(): void
    function tasksCreated(count: number): void
    function tasksStatusChange(from: TaskStatus, to: TaskStatus): void
    function tasksArchive(status: TaskStatus): void
    function tasksUnarchive(status: TaskStatus): void
    function rendererMessageReceived(message: MessageFromRenderer): void
}
```

### Constants

Key constants used throughout the extension.

```typescript
// Extension IDs
const EXTENSION_IDS = {
    ROO_CLINE: 'rooveterinaryinc.roo-cline',
    ROO_CODE: 'rooveterinaryinc.roo-code'
}

// Commands
const COMMANDS = {
    NEW_NOTEBOOK: 'agentworkbook.newNotebook',
    INSERT_TEMPLATE: 'agentworkbook.insertTemplate'
}

// Timeouts (in milliseconds)
const TIMEOUTS = {
    TELEMETRY_INIT: 5000,
    TASK_EXECUTION: 300000,  // 5 minutes
    PYTHON_INIT: 30000       // 30 seconds
}

// UI Repaint
const UI_REPAINT_TIMEOUTS = {
    DELAY: 100,
    MAX_DELAY: 1000
}
```

## Extension API

The extension exports the AgentWorkbook instance for use by other extensions.

```typescript
// In your extension
const agentWorkbookExt = vscode.extensions.getExtension('agentworkbook');
if (agentWorkbookExt) {
    const agentWorkbook: AgentWorkbook = await agentWorkbookExt.activate();
    // Use AgentWorkbook APIs
}
```

## Error Handling

All API methods that can fail will either:
1. Return a Promise that may reject with an Error
2. Throw an Error directly for synchronous operations
3. Use the VS Code window.showErrorMessage for user-facing errors

### Common Error Types

```typescript
class AgentWorkbookError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'AgentWorkbookError';
    }
}

// Error codes
const ERROR_CODES = {
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    TASK_NOT_FOUND: 'TASK_NOT_FOUND',
    INVALID_STATUS: 'INVALID_STATUS',
    PYTHON_INIT_FAILED: 'PYTHON_INIT_FAILED',
    AI_CONNECTION_FAILED: 'AI_CONNECTION_FAILED'
}
```

## Best Practices

### Task Creation
1. Always provide a clear, specific prompt
2. Use appropriate mode for the task type
3. Include necessary flags in frontmatter
4. Handle task lifecycle events properly

### Error Handling
1. Wrap API calls in try-catch blocks
2. Provide meaningful error messages to users
3. Log errors to the output channel
4. Clean up resources on failure

### Performance
1. Avoid creating too many tasks at once
2. Use task archiving to manage memory
3. Batch operations when possible
4. Monitor task execution times

### Security
1. Never expose API keys in code
2. Validate all user inputs
3. Use VS Code's secure storage for sensitive data
4. Follow VS Code extension security guidelines