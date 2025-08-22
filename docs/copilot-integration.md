# VS Code Copilot Integration

This document describes the new VS Code GitHub Copilot integration features added to AgentWorkbook.

## Overview

AgentWorkbook now provides Python functions that allow you to interact with VS Code GitHub Copilot chat directly from your notebook cells. This includes both direct chat interaction and a new task system that can route prompts to either RooCode or Copilot based on the `client` parameter.

## New Functions

### Task Functions with Client Parameter

The existing task functions now support a `client` parameter that can be set to either `'roo'` (default) or `'copilot'`.

#### `create_tasks(prompts, mode='code', hooks=None, client='roo')`

Creates tasks that can be routed to different AI clients.

```python
import agentworkbook as awb

# Create RooCode tasks (default behavior)
agent_tasks = awb.create_tasks([
    "Implement a binary search algorithm"
], mode='code', client='roo')

# Create Copilot tasks
copilot_tasks = awb.create_tasks([
    "Write unit tests for binary search",
    "Add error handling to the function"
], mode='code', client='copilot')

# Submit them
for task in agent_tasks + copilot_tasks:
    task.submit()
```

#### `submit_tasks(prompts, mode='code', hooks=None, client='roo')`

Creates and immediately submits tasks to the specified client.

```python
# Submit directly to Copilot
copilot_tasks = awb.submit_tasks([
    'Create a React component for a todo list',
    'Add TypeScript types for the todo item'
], mode='code', client='copilot')

# Submit to RooCode (default)
agent_tasks = awb.submit_tasks([
    'Implement the todo list logic',
    'Add data persistence'
], mode='code', client='roo')
```

### Direct Chat Functions

#### `send_to_copilot(prompt: str)`

A convenience function that opens the VS Code GitHub Copilot chat window with a pre-filled prompt.

```python
# Basic usage
await awb.send_to_copilot("write two sum with test cases in javascript")

# Complex request
await awb.send_to_copilot('''
Create a React component that:
1. Displays a list of todos
2. Allows adding new todos
3. Uses TypeScript and proper typing
''')
```

#### `execute_vscode_command(command: str, *args)`

A generic function that can execute any VS Code command programmatically.

```python
# Open command palette
await awb.execute_vscode_command('workbench.action.showCommands')

# Open Copilot chat with prompt
await awb.execute_vscode_command('workbench.action.chat.open', 'your prompt here')

# Open a file
await awb.execute_vscode_command('vscode.open', 'file:///path/to/file.py')
```

## Implementation Details

### Architecture

The integration works through the following components:

1. **Python API** (`resources/agentworkbook.py`): Provides the user-facing functions
2. **TypeScript Bridge** (`src/agentworkbook.ts`): Implements `executeVSCodeCommand` method
3. **Pyodide Integration** (`src/py_notebook_controller.ts`): Bridges Python and TypeScript

### Data Flow

```
Notebook Cell (Python) 
  ↓ 
agentworkbook.py functions
  ↓
Pyodide bridge (agentworkbook module)
  ↓
AgentWorkbook.executeVSCodeCommand()
  ↓
vscode.commands.executeCommand()
  ↓
VS Code Copilot Chat
```

### Error Handling

- All functions include proper error handling and logging
- Errors are logged to the AgentWorkbook output channel
- Python exceptions are raised if VS Code commands fail
- All API calls are tracked for telemetry

## Usage Examples

### Task-Based Workflow

```python
# Mixed workflow: Use both RooCode and Copilot
agent_tasks = awb.submit_tasks([
    "Create a new Python module for data processing"
], client='roo')

copilot_tasks = awb.submit_tasks([
    "Write comprehensive docstrings for the data processing module",
    "Generate example usage code"
], client='copilot')

print(f"Submitted {len(agent_tasks)} tasks to RooCode")
print(f"Submitted {len(copilot_tasks)} tasks to Copilot")
```

### Basic Code Generation

```python
await awb.send_to_copilot("write a Python function to calculate fibonacci numbers")
```

### Code Review and Optimization

```python
code_to_review = '''
def slow_fibonacci(n):
    if n <= 1:
        return n
    return slow_fibonacci(n-1) + slow_fibonacci(n-2)
'''

await awb.send_to_copilot(f"Optimize this Python code:\\n{code_to_review}")
```

### Multiple Sequential Prompts

```python
prompts = [
    "write a Python function to calculate fibonacci numbers",
    "create unit tests for the fibonacci function", 
    "optimize the fibonacci function for better performance"
]

for prompt in prompts:
    print(f"Sending: {prompt}")
    await awb.send_to_copilot(prompt)
    await asyncio.sleep(1)  # Optional delay
```

### Using Generic VS Code Commands

```python
# Open settings
await awb.execute_vscode_command('workbench.action.openSettings')

# Toggle terminal
await awb.execute_vscode_command('workbench.action.terminal.toggleTerminal')

# Run a specific task
await awb.execute_vscode_command('workbench.action.tasks.runTask', 'build')
```

## Requirements

- VS Code with GitHub Copilot extension installed and activated
- AgentWorkbook extension with the updated codebase
- Valid GitHub Copilot subscription

## Troubleshooting

### Common Issues

1. **"Command not found" errors**: Ensure the VS Code command ID is correct
2. **Copilot not responding**: Check that GitHub Copilot is installed and activated
3. **Permission errors**: Ensure AgentWorkbook has necessary VS Code API permissions

### Debugging

- Check the AgentWorkbook output channel for detailed logs
- All command executions are logged with arguments and results
- Python API calls are tracked for telemetry and debugging

### Logging

The integration includes comprehensive logging:

```
Executing VS Code command: workbench.action.chat.open with args: ["your prompt"]
VS Code command executed successfully
```

## Future Enhancements

Potential future improvements:

1. **Streaming Responses**: Capture Copilot responses back into the notebook
2. **Context Sharing**: Share notebook context with Copilot automatically  
3. **Batch Operations**: Send multiple prompts with intelligent batching
4. **Custom Commands**: Create AgentWorkbook-specific Copilot commands
5. **Integration with RooCode**: Bridge between AgentWorkbook tasks and Copilot suggestions