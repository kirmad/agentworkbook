# AgentWorkbook Architecture Guide

## Overview

AgentWorkbook is a VS Code extension that creates a notebook-based interface for managing AI-powered tasks. It combines several technologies to provide a seamless experience for executing AI tasks, managing Python code, and visualizing results.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VS Code Extension Host                    │
├─────────────────────────────────────────────────────────────────┤
│  Extension Core                    │  Notebook System            │
│  ├─ AgentWorkbook                 │  ├─ Serializer             │
│  ├─ Extension Activation          │  ├─ Controller             │
│  └─ Command Registration          │  └─ Templates              │
├────────────────────────┬──────────┴──────────────┬──────────────┤
│   Task Management      │   AI Integration        │   Python      │
│   ├─ Task Queue       │   ├─ RooCode API       │   Runtime     │
│   ├─ Worker Pool      │   ├─ AI Controller     │   ├─ Pyodide  │
│   └─ Status Manager   │   └─ Message Handler   │   └─ WASM     │
├────────────────────────┴───────────────────────┬─────────────────┤
│              Renderer System                   │    Utilities     │
│              ├─ React UI                       │    ├─ Telemetry │
│              ├─ Task Visualization             │    ├─ Hooks     │
│              └─ Drag & Drop                    │    └─ Flags     │
└────────────────────────────────────────────────┴─────────────────┘
```

## Core Components

### 1. Extension Core (`src/extension.ts`)

The main entry point that:
- Initializes the extension context
- Validates AI extension availability (RooCode and/or Copilot)
- Registers VS Code commands
- Sets up the notebook serializer
- Manages extension lifecycle

**Key Responsibilities:**
- Extension activation/deactivation
- Dependency validation
- Command registration
- Component initialization

### 2. AgentWorkbook Class (`src/agentworkbook.ts`)

Central coordinator that:
- Manages global state
- Handles renderer messaging
- Coordinates task execution
- Manages hooks and events

**Key Features:**
- Singleton pattern for global access
- Event-driven architecture
- Renderer communication hub
- Hook system for extensibility

### 3. Task Management System

#### Task Manager (`src/tasks/manager.ts`)
- Maintains task queue
- Manages task lifecycle states
- Handles task operations (submit, cancel, archive)
- Emits events for UI updates

**Task States:**
```
prepared → queued → running → completed
                 ↓           ↓
              asking     aborted/error
```

#### Worker (`src/tasks/worker.ts`)
- Processes tasks from the queue
- Manages AI controller interactions
- Handles task lifecycle execution
- Implements retry logic

**Worker Flow:**
1. Pick task from queue
2. Initialize AI conversation
3. Execute task with hooks
4. Update task status
5. Handle completion/error

### 4. AI Integration Layer

#### Controller Interface (`src/ai/controller.ts`)
- Abstracts AI provider communication
- Manages conversation state
- Handles message streaming
- Provides uniform API for both RooCode and Copilot

**Message Flow:**
```
Task → Controller → AI Provider (RooCode/Copilot)
  ↑                              ↓
  ←──── Response Processing ←────
```

### 5. Notebook System

#### Serializer (`src/notebook/serializer.ts`)
- Handles `.agentworkbook` file format
- Serializes/deserializes notebook data
- Manages notebook metadata
- Preserves task state

#### Templates (`src/notebook/templates/`)
- Provides code snippet templates
- Manages template categories
- Supports custom templates
- Quick insertion workflow

### 6. Python Integration

#### Python Controller (`src/python/controller.ts`)
- Manages Pyodide runtime
- Executes Python code cells
- Handles Python errors
- Manages execution state

**Pyodide Integration:**
- WebAssembly-based Python runtime
- Runs in VS Code's webview context
- Supports standard library
- Async execution model

### 7. Renderer System

#### React Components (`src/renderer/`)
- Task list visualization
- Drag-and-drop interface
- Real-time status updates
- Interactive controls

**Component Hierarchy:**
```
index.tsx (Root)
├── TaskList
│   └── Task
│       ├── Draggable
│       ├── Selectable
│       └── Buttons
└── SelectionState
```

### 8. Utility Systems

#### Flag Processor (`src/utils/flagProcessor.ts`)
- Parses YAML frontmatter
- Extracts task configuration
- Validates flag syntax
- Applies task modifiers

#### Hook System (`src/utils/hooks.ts`)
- Lifecycle event handling
- Custom script execution
- Task modification points
- Extensibility framework

#### Telemetry (`src/utils/telemetry.ts`)
- Usage analytics
- Performance monitoring
- Error tracking
- Anonymous data collection

## Data Flow

### Task Creation Flow
```
1. User writes in notebook cell
2. Flag processor parses frontmatter
3. Task created with configuration
4. Task added to queue
5. UI updates via event emission
```

### Task Execution Flow
```
1. Worker picks queued task
2. Initializes AI controller (RooCode or Copilot)
3. Sends prompt to AI provider
4. Streams response
5. Updates task conversation
6. Executes hooks
7. Updates task status
8. Notifies UI
```

### Python Execution Flow
```
1. User writes Python code
2. Controller initializes Pyodide
3. Code sent to Python runtime
4. Results captured
5. Output displayed in cell
6. Errors handled gracefully
```

## Communication Patterns

### Extension ↔ Renderer
- Uses VS Code's webview messaging API
- Bidirectional communication
- Type-safe message contracts
- Event-driven updates

### Extension ↔ AI Provider
- Async/await patterns
- Stream handling for responses
- Error boundaries
- Retry mechanisms

### Extension ↔ Python Runtime
- Promise-based execution
- Result serialization
- Error propagation
- State management

## State Management

### Global State
- Managed by AgentWorkbook singleton
- Task queue in Tasks manager
- Worker state in Worker class
- Python state in controller

### Notebook State
- Serialized to `.agentworkbook` files
- Includes task data and metadata
- Preserves execution history
- Supports versioning

### UI State
- React component state
- Selection management
- Drag-and-drop state
- Real-time updates via messaging

## Security Considerations

### API Key Management
- Stored in VS Code settings
- Never included in notebooks
- Accessed via configuration API
- User-controlled

### Code Execution
- Python runs in sandboxed WASM
- No filesystem access by default
- Limited network capabilities
- User-initiated execution only

### Data Privacy
- Telemetry is opt-in
- Anonymous usage data only
- No personal information collected
- Local execution where possible

## Performance Optimizations

### Task Queue
- Efficient queue operations
- Lazy loading of task data
- Debounced UI updates
- Worker pooling ready

### Rendering
- React virtual DOM
- Optimized re-renders
- Lazy component loading
- Efficient drag-and-drop

### Python Runtime
- Pyodide cached locally
- Shared runtime instance
- Async execution model
- Memory management

## Extension Points

### Hooks
- Task lifecycle hooks
- Custom script execution
- Event-based extensibility
- User-defined workflows

### Templates
- Custom template support
- Category organization
- Quick insertion
- Snippet management

### Renderer
- Custom MIME types
- Pluggable visualizations
- Theme support
- Accessibility features

## Future Architecture Considerations

### Scalability
- Multi-worker support planned
- Distributed task execution
- Cloud integration possibilities
- Performance monitoring

### Extensibility
- Plugin system for providers
- Custom task types
- Additional language support
- Third-party integrations

### Reliability
- Enhanced error recovery
- Task persistence
- Offline support
- Backup mechanisms

## Development Guidelines

### Code Organization
- Feature-based structure
- Clear separation of concerns
- Type-safe interfaces
- Comprehensive testing

### Best Practices
- Use TypeScript strictly
- Follow VS Code guidelines
- Implement error boundaries
- Write unit tests

### Contributing
- Understand component boundaries
- Maintain backward compatibility
- Document API changes
- Follow coding standards