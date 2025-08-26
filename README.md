# AgentWorkbook - AI-Powered Task Management for VS Code

**AgentWorkbook** is a VS Code extension that provides an innovative notebook-based interface for managing AI-powered tasks with integrated Python execution capabilities. Transform your development workflow with intelligent task queuing, visual task management, and seamless AI integration.

**🎯 Perfect for developers who want to:**
- Streamline AI-assisted development workflows
- Manage complex multi-step tasks visually
- Execute Python code directly in notebooks
- Leverage both RooCode and GitHub Copilot simultaneously

## 🌟 Key Features

- **📓 Notebook-Based Task Management**: Create and manage AI tasks in a familiar notebook interface (`.agentworkbook` files)
- **🤖 Dual AI Integration**: Works with both RooCode and VS Code Copilot for intelligent task processing
- **🐍 Python Execution**: Built-in Python runtime using Pyodide for in-browser code execution
- **📋 Visual Task Queue**: Drag-and-drop task management with real-time status updates
- **🗂️ Advanced Task Operations**: Submit, cancel, archive, delete, and reorder tasks with intuitive controls
- **🏗️ Hierarchical Flags System**: Organize flags in categories (`--frontend:react:hooks`, `--backend:api:rest`)
- **⚙️ Parameterized Flags**: Dynamic flag templates with parameters (`--docs(file.tsx, Component Name)`)
- **📝 Code Templates**: Reusable `.awbscript` files with hierarchical organization
- **📋 Notebook Templates**: Dynamic `.awbtemplate` files with customizable arguments
- **🔊 Text-to-Speech**: Convert AI responses to speech using ElevenLabs or Azure TTS
- **⚡ Parallel Execution**: Efficient task processing with worker-based architecture
- **🔗 Shell Integration**: Execute shell commands with `!` syntax and command caching
- **🎯 Event Hooks**: Custom Python hooks for task lifecycle events (onstart, oncomplete, etc.)
- **📊 Analytics & Telemetry**: Built-in usage analytics with PostHog integration (privacy-respecting)
- **🎨 Custom Renderers**: Rich visual representation of task statuses and results

## 📋 Requirements

- **VS Code**: Version 1.88.0 or higher
- **Node.js**: Version 16.0.0 or higher
- **AI Integration** (at least one required):
  - **RooCode Extension**: `rooveterinaryinc.roo-cline`
  - **VS Code Copilot**: GitHub Copilot extension (for Copilot integration)
- **API Keys** (optional): 
  - ElevenLabs API key for text-to-speech
  - Azure Speech Services subscription for Azure TTS

## 🚀 Installation

### From VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "AgentWorkbook"
4. Click **Install** on the AgentWorkbook extension by KiranMadipally
5. **Important**: Install the required RooCode extension: `rooveterinaryinc.roo-cline`

**Or install via Command Palette:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type `Extensions: Install Extensions`
3. Search for "agentworkbook"
4. Install both AgentWorkbook and RooCode extensions

### From VSIX Package

1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/kirmad/agentworkbook/releases)
2. In VS Code, open Command Palette (`Ctrl+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file

### From Source (Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/kirmad/agentworkbook.git
   cd agentworkbook
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Compile the extension:
   ```bash
   yarn run compile
   ```

4. Launch in VS Code:
   - Press `F5` to run the extension in a new VS Code window
   - Or use `Ctrl+F5` for production mode

## ⚡ Quick Start

**Get up and running in 2 minutes:**

1. **Create your first notebook:**
   - Open Command Palette (`Ctrl+Shift+P`)
   - Type "AgentWorkbook: New notebook"
   - A new `.agentworkbook` file opens

2. **Create your first task:**
   ```python
   import agentworkbook as awb
   
   # Single task (recommended for simple cases)
   raw_prompt = "Create a Python function to calculate fibonacci numbers --with-tests"
   built_prompt = awb.build_prompt(raw_prompt)
   task = awb.submit_task(built_prompt, mode="code", build_prompt=False)
   
   # Wait for completion
   result = await awb.wait_for_task(task)
   ```

3. **Watch the magic:**
   - View tasks in the visual task queue at the bottom
   - See real-time status updates as AI processes your request
   - Get the completed code directly in your notebook

**Next Steps:** Explore [advanced features](#advanced-features) like flags, templates, and text-to-speech.

## 🎯 Usage

### Quick Start Examples

#### Basic Task
```python
# Simple task creation
Create a Python function to validate email addresses
```

#### Task with Flags
```python
# Enhanced with thinking and tests
Create a user authentication system --think --with-tests
```

#### Advanced Task with Hierarchical and Parameterized Flags
```python
# Full-featured task
Build a React component --frontend:react:component --docs(src/UserProfile.tsx, UserProfile) --testing:unit
```

### Creating a New Notebook

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "AgentWorkbook: New notebook"
3. A new `.agentworkbook` file will be created

#### From Template
1. Command Palette: "Create notebook from template"
2. Navigate template folders
3. Fill in template arguments
4. Customized notebook is created

### Working with Tasks

#### Choosing AI Provider
AgentWorkbook supports two AI providers:
- **RooCode**: Advanced reasoning and code generation
- **VS Code Copilot**: GitHub Copilot integration

Select your preferred provider when creating tasks:
```python
import agentworkbook as awb

# Default uses RooCode
tasks = awb.create_tasks(["Your task"], mode="code")

# Explicitly specify Copilot
tasks = awb.create_tasks(["Your task"], mode="code", client="copilot")

# Specify client for each task in a list
prompts = [
    "Create a login function",
    "Write unit tests for the login"
]
# All tasks use Copilot
tasks = awb.create_tasks(prompts, mode="code", client="copilot")

# Submit and wait for completion
awb.submit_tasks(task_ids=[t.id for t in tasks])
results = await awb.wait_for_tasks(tasks)

# Or wait for specific task
result = await awb.wait_for_task(tasks[0])
```

#### Adding Tasks
- Type your task prompt in a notebook cell
- Use the task management interface to organize tasks
- Apply flags and parameters using YAML frontmatter

#### Task States
- **Prepared**: Task created but not yet queued
- **Queued**: Task waiting for execution
- **Running**: Task currently being processed
- **Completed**: Task successfully finished
- **Asking**: Task requires user input
- **Aborted**: Task was cancelled
- **Error**: Task encountered an error

#### Managing Tasks
- **Submit**: Move tasks from prepared to queued state
- **Cancel**: Stop running or queued tasks
- **Archive**: Hide completed or cancelled tasks
- **Drag & Drop**: Reorder tasks in the queue

#### Task Execution and Waiting

```python
import agentworkbook as awb

# Create tasks with specific client
tasks = awb.create_tasks([
    "Implement user authentication",
    "Create API endpoints",
    "Add validation logic"
], mode="code", client="roo")  # or client="copilot"

# Submit all tasks
awb.submit_tasks(task_ids=[t.id for t in tasks])

# Wait for all tasks to complete
results = await awb.wait_for_tasks(tasks)

# Check results
for task, result in zip(tasks, results):
    print(f"Task {task.id}: {task.status}")
    if task.status == "completed":
        print(f"Output: {result}")

# Wait for specific task with timeout
try:
    result = await awb.wait_for_task(tasks[0], timeout=300)  # 5 minutes
except TimeoutError:
    print("Task timed out")

# Monitor task progress
task = tasks[0]
while task.status not in ["completed", "error", "aborted"]:
    print(f"Status: {task.status}")
    await asyncio.sleep(1)
```

### Using Code Templates (.awbscript)

Code templates are reusable snippets stored as `.awbscript` files in `.agentworkbook/scripts/`:

1. **Insert Template**: Click the "+" button in notebook toolbar or after any cell
2. **Navigate Folders**: Browse hierarchical template organization
3. **Select Template**: Choose from available templates with descriptions

**Example Template Structure**:
```yaml
name: "Data Analysis Setup"
description: "Common imports for data analysis"
language: "python"
code: |
  import pandas as pd
  import numpy as np
  import matplotlib.pyplot as plt
```

### Advanced Features

#### Notebook Templates (.awbtemplate)

Create reusable notebook structures with dynamic content:

```json
{
  "metadata": {
    "title": "ML Pipeline Template",
    "description": "Complete ML pipeline setup"
  },
  "arguments": {
    "modelType": {
      "type": "select",
      "label": "Model Type",
      "options": ["classification", "regression"]
    }
  },
  "template": {
    "cells": [
      {
        "kind": "code",
        "value": "# {{modelType}} Model\nimport sklearn...",
        "language": "python"
      }
    ]
  }
}
```

Store in `.agentworkbook/templates/` and create notebooks with:
- Command Palette: "Create notebook from template"
- Fill in template arguments
- Get customized notebook

#### Hierarchical Flags

Organize flags in categories using colon-separated paths:

```
--frontend:react:hooks    # Loads: .agentworkbook/flags/frontend/react/hooks.md
--backend:api:rest       # Loads: .agentworkbook/flags/backend/api/rest.md
--testing:unit          # Loads: .agentworkbook/flags/testing/unit.md
```

**File Organization**:
```
.agentworkbook/flags/
├── frontend/
│   └── react/
│       └── hooks.md
├── backend/
│   └── api/
│       └── rest.md
└── testing/
    └── unit.md
```

#### Parameterized Flags

Pass dynamic parameters to flag templates:

```
--docs(src/Button.tsx, Button Component)
--api:endpoint(users, POST, v1)
--test:generate(UserService, unit, 95)
```

**Template with Parameters**:
```markdown
# Documentation for $$1

File location: `$$0`
Component name: $$1

Generate comprehensive documentation...
```

Parameters `$$0` through `$$9` are substituted with provided values.

### Text-to-Speech Configuration

#### ElevenLabs
1. Get your API key from [ElevenLabs](https://elevenlabs.io)
2. In VS Code settings, set:
   - `agentworkbook.tts.provider`: "elevenlabs"
   - `agentworkbook.tts.elevenlabs.apiKey`: Your API key
   - `agentworkbook.tts.elevenlabs.voice`: Choose voice
   - `agentworkbook.tts.elevenlabs.model`: Select model

#### Azure Speech Services
1. Get subscription key from [Azure Portal](https://portal.azure.com)
2. In VS Code settings, set:
   - `agentworkbook.tts.provider`: "azure"
   - `agentworkbook.tts.azure.subscriptionKey`: Your key
   - `agentworkbook.tts.azure.region`: Your region
   - `agentworkbook.tts.azure.voice`: Choose voice

## 🏗️ Architecture

### Core Components

```
AgentWorkbook/
├── Extension Core
│   ├── extension.ts         # Main entry point
│   ├── agentworkbook.ts    # Core AgentWorkbook class
│   └── core/constants.ts   # Configuration constants
├── AI Integration
│   ├── ai/controller.ts    # AI controller for RooCode/Copilot
│   └── ai/rooCode.d.ts    # TypeScript definitions
├── Task Management
│   ├── tasks/manager.ts    # Task queue management
│   ├── tasks/worker.ts     # Task execution worker
│   └── tasks/interfaces.ts # Task type definitions
├── Notebook System
│   ├── notebook/serializer.ts      # .agentworkbook file handling
│   ├── notebook/creation.ts        # Notebook creation logic
│   └── notebook/templates/         # Code templates
├── Python Integration
│   ├── python/controller.ts        # Python execution controller
│   ├── python/errorHandler.ts      # Python error handling
│   └── resources/pyodide/          # Pyodide runtime
├── Renderer
│   ├── renderer/index.tsx          # React-based UI
│   ├── renderer/task/              # Task components
│   └── renderer/taskList/          # Task list view
└── Utilities
    ├── utils/flagProcessor.ts      # Flag parsing
    ├── utils/hooks.ts              # Event hooks
    ├── utils/telemetry.ts          # Usage analytics
    └── utils/promptSummarizer.ts   # Prompt summarization
```

### Data Flow

1. **User Input** → Notebook Cell → Flag Processing → Task Creation
2. **Task Queue** → Worker Selection → AI Controller → RooCode/Copilot API
3. **AI Response** → Task Update → Renderer Update → Visual Feedback
4. **Python Code** → Pyodide Runtime → Result Display

## 🛠️ Development

### Project Structure

- **src/**: TypeScript source code
- **out/**: Compiled JavaScript (generated)
- **dist/**: Webpack bundle for extension
- **dist-renderer/**: Webpack bundle for notebook renderer
- **resources/**: Python scripts and Pyodide runtime
- **test/**: Unit and integration tests
- **.agentworkbook/**: User configuration and templates
  - **flags/**: Flag markdown files (hierarchical structure)
  - **scripts/**: Code templates (.awbscript files)
  - **templates/**: Notebook templates (.awbtemplate files)

### Building

```bash
# Development build with source maps
yarn run compile

# Production build
yarn run package

# Watch mode for development
yarn run watch

# Create VSIX package
yarn run package:vsce
```

### Testing

```bash
# Run all tests
yarn test

# Run linter
yarn lint

# Compile tests
yarn compile-tests
```

### Key Technologies

- **Frontend**: React 19 with TypeScript
- **Backend**: VS Code Extension API
- **Python**: Pyodide (Python in WebAssembly)
- **Build**: Webpack 5
- **Testing**: Mocha, Chai
- **Analytics**: PostHog

## 🔧 Configuration

### Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `agentworkbook.telemetry.enabled` | boolean | true | Enable usage analytics |
| `agentworkbook.tts.provider` | string | "elevenlabs" | TTS provider selection |
| `agentworkbook.tts.elevenlabs.apiKey` | string | "" | ElevenLabs API key |
| `agentworkbook.tts.elevenlabs.voice` | string | "rachel" | ElevenLabs voice selection |
| `agentworkbook.tts.azure.subscriptionKey` | string | "" | Azure subscription key |
| `agentworkbook.tts.azure.region` | string | "eastus" | Azure service region |

### Task Flags

Tasks support various flags for customization through YAML frontmatter and inline flags:

#### YAML Frontmatter
```yaml
---
mode: code
flags:
  - parallel
  - verbose
timeout: 300
---
Your task prompt here
```

#### Inline Flags
Use flags directly in your prompts for enhanced AI guidance. **Multiple flags can be combined in a single prompt** to layer different instructions and contexts:

**Basic Flags** (can use multiple):
```
Create a user authentication system --incremental --think --with-tests
Build a REST API --secure --scalable --with-tests --verbose
```

**Hierarchical Flags** (mix different categories):
```
Build a React component --frontend:react:component --testing:unit --docs
Create an API endpoint --backend:api:rest --auth:jwt --testing:integration
Design a system --cs:think --backend:microservices --frontend:spa
```

**Parameterized Flags** (combine with other flags):
```
Document the feature --docs(src/Button.tsx, Button Component) --markdown --examples
Setup environment --config:setup(dev, PostgreSQL, localhost:5432) --docker --secure
Generate tests --test:generate(UserService, integration, 95, Jest) --ci:github --coverage
```

**Complex Multi-Flag Examples**:
```
# Combines thinking, hierarchical, parameterized, and basic flags
Implement user profile --cs:think --frontend:react:component --state:redux(UserProfile, user) --testing:unit --docs(src/UserProfile.tsx, UserProfile) --accessible --responsive

# API development with multiple concerns
Create payment API --backend:api:rest --auth:oauth2(client_credentials, stripe) --testing:integration --monitoring:datadog --secure --rate-limited

# Full-stack feature with all flag types
Build chat feature --think --frontend:react:websocket --backend:node:socketio --db:schema(messages, postgresql) --testing:e2e --deploy:k8s --monitoring
```

Each flag adds its specific content to the prompt, creating a comprehensive instruction set. Flags are processed from `.agentworkbook/flags/` directory and appended to prompts.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

## 🐛 Troubleshooting

### Common Issues

1. **Extension not activating**
   - Ensure RooCode extension is installed and updated
   - Check VS Code version compatibility

2. **Python execution fails**
   - Pyodide may need to redownload: `yarn download-pyodide`
   - Check browser console for WebAssembly errors

3. **Task queue not updating**
   - Refresh the notebook view
   - Check output channel for errors

### Debug Logs

Enable detailed logging:
1. Open "AgentWorkbook" output channel
2. Set log level in VS Code settings
3. Check browser developer console for renderer issues

## 📚 Resources

- [API Documentation](./docs/api.md) - Complete API reference
- [Examples](./docs/examples.md) - Usage examples and patterns
- [Architecture Guide](./docs/architecture.md) - System design and components
- [Advanced Features](./docs/advanced-features.md) - Templates, scripts, and flags
- [Quick Reference](./docs/quick-reference.md) - Quick lookup guide
- [Code Templates](./docs/code-templates.md) - Using .awbscript files
- [Flags Feature](./docs/flags-feature.md) - Flag system documentation

## 🙏 Acknowledgments

- Integrates with RooCode and VS Code Copilot
- Powered by Pyodide for Python execution
- UI components use React and VS Code's Webview API

---

**Note**: This extension is under active development. Documentation and features are being continuously improved.