# AgentWorkbook Quick Reference

## Essential Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `AgentWorkbook: New notebook` | Create new .agentworkbook file | `Ctrl+Shift+P` → search |
| `Insert Code Template` | Add code snippet to cell | Click toolbar button |

## Task Management

### Task States & Actions

```
[Prepared] → Submit → [Queued] → Auto → [Running] → Complete → [Completed]
    ↓                      ↓                  ↓                        ↓
  Cancel                Cancel             Cancel                  Archive
    ↓                      ↓                  ↓                        
[Aborted]              [Aborted]         [Aborted/Error]              
```

### Quick Task Actions
- **Submit**: `Ctrl+Enter` in cell or click ▶️
- **Cancel**: Click ⏹️ on running task
- **Archive**: Click 📁 on completed task
- **Drag & Drop**: Reorder tasks in queue

### Client Selection & Waiting
```python
# Create with client
tasks = awb.create_tasks(["task"], client="roo")     # RooCode
tasks = awb.create_tasks(["task"], client="copilot") # Copilot

# Submit and wait
awb.submit_tasks([t.id for t in tasks])
results = await awb.wait_for_tasks(tasks)            # Wait for all
result = await awb.wait_for_task(tasks[0])          # Wait for one
result = await awb.wait_for_task(tasks[0], timeout=300) # With timeout
```

## Common Task Patterns

### Basic Code Generation
```
Generate a Python function to [specific task]
```

### With Configuration
```yaml
---
mode: code
flags: [tests, docs]
---
Create a REST API endpoint for [resource]
```

### Multiple Flags (Combine as needed)
```
# Basic multiple flags
Create a component --react --typescript --tests --docs

# Hierarchical + parameterized + basic
Build API --backend:api:rest --auth:jwt(RS256) --rate-limited --cached --monitored

# Maximum flag combination
Implement feature --think --cs:algorithms --frontend:react:hooks --backend:node:express --db:postgres(users, jsonb) --testing:unit --testing:e2e --deploy:aws --secure --optimized
```

### Debugging Task
```yaml
---
mode: debug
flags: [verbose, trace]
---
Debug the issue in [file/function]
```

## Flag Quick Reference

### Execution Modes
- `mode: code` - Generate new code
- `mode: analyze` - Analyze existing code
- `mode: debug` - Debug issues
- `mode: refactor` - Improve code
- `mode: documentation` - Create docs

### Common Flags
- `tests` - Include unit tests
- `docs` - Add documentation
- `types` - Add type annotations
- `verbose` - Detailed output
- `parallel` - Allow parallel execution
- `python` - Python-specific features
- `typescript` - TypeScript features

## Python Notebook Cells

### Import and Setup
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
```

### Quick Data Analysis
```python
# Load data
df = pd.read_csv('data.csv')

# Quick exploration
df.head()
df.info()
df.describe()

# Visualize
df.plot(x='date', y='value')
plt.show()
```

## Hooks Reference

### Task Lifecycle
```yaml
hooks:
  onstart: "echo 'Starting task...'"
  oncomplete: "npm test"
  onerror: "git reset --hard"
```

### Environment Setup
```yaml
hooks:
  onstart: |
    python -m venv env
    source env/bin/activate
    pip install -r requirements.txt
```

## Configuration Settings

### Text-to-Speech (ElevenLabs)
```json
{
  "agentworkbook.tts.provider": "elevenlabs",
  "agentworkbook.tts.elevenlabs.apiKey": "your-key",
  "agentworkbook.tts.elevenlabs.voice": "rachel"
}
```

### Text-to-Speech (Azure)
```json
{
  "agentworkbook.tts.provider": "azure",
  "agentworkbook.tts.azure.subscriptionKey": "your-key",
  "agentworkbook.tts.azure.region": "eastus"
}
```

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New Notebook | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Run Cell | `Ctrl+Enter` | `Cmd+Enter` |
| Stop Execution | `Ctrl+C` | `Cmd+C` |
| Save Notebook | `Ctrl+S` | `Cmd+S` |

## Troubleshooting

### Task Stuck
1. Check VS Code Output panel → "AgentWorkbook"
2. Try canceling and resubmitting
3. Restart worker: Pause → Resume

### Python Not Working
1. Check browser console for errors
2. Try: `yarn download-pyodide`
3. Restart VS Code

### Extension Not Loading
1. Check RooCode extension is installed
2. Verify minimum VS Code version
3. Check extension host logs

## Template Categories

- **Python Patterns**: Classes, functions, decorators
- **API Endpoints**: REST, GraphQL, WebSocket
- **Data Processing**: ETL, analysis, visualization
- **Testing**: Unit tests, integration tests
- **Documentation**: Docstrings, README, API docs

## Best Practices Checklist

✅ **Clear Prompts**: Be specific about requirements  
✅ **Use Flags**: Configure behavior with appropriate flags  
✅ **Test Generated Code**: Always verify AI output  
✅ **Archive Old Tasks**: Keep queue manageable  
✅ **Save Notebooks**: Preserve task history  
✅ **Use Templates**: Leverage existing patterns  
✅ **Monitor Performance**: Check execution times  

## Common Patterns

### Sequential Tasks
```yaml
# Task 1: Analysis
---
mode: analyze
---
Analyze the current implementation

# Task 2: Implementation
---
mode: code
flags: [use-previous]
---
Based on analysis above, implement improvements
```

### Parallel Tasks
```yaml
---
flags: [parallel]
---
Task 1: Create user module

---
flags: [parallel]
---
Task 2: Create product module
```

### Batch Processing
```yaml
---
mode: refactor
flags: [batch, files: "src/**/*.py"]
---
Add type hints to all Python files
```

## Quick Links

- [Full Documentation](../README.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Architecture](./architecture.md)
- [Contributing](../CONTRIBUTING.md)

---

**Pro Tip**: Keep this guide handy while working with AgentWorkbook for quick reference to common tasks and patterns!