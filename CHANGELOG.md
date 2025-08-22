# Change Log

All notable changes to the "AgentWorkbook" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.0.1] - 2025-01-22

### Added - Core Features
- **Notebook Interface**: Custom `.agentworkbook` file format with VS Code notebook API integration
- **Dual AI Integration**: Support for both RooCode and VS Code Copilot AI providers
- **Python Execution**: Built-in Pyodide runtime for in-browser Python code execution
- **Visual Task Management**: Interactive task queue with drag-and-drop reordering
- **Task Operations**: Submit, cancel, archive, delete, and reorder tasks with intuitive UI controls

### Added - Advanced Features  
- **Hierarchical Flags System**: Organize flags in categories (`--frontend:react:hooks`, `--backend:api:rest`)
- **Parameterized Flags**: Dynamic flag templates with parameters (`--docs(file.tsx, Component)`)
- **Code Templates**: Reusable `.awbscript` files with hierarchical organization in `.agentworkbook/scripts/`
- **Notebook Templates**: Dynamic `.awbtemplate` files with customizable arguments
- **Text-to-Speech**: Convert AI responses to speech using ElevenLabs or Azure TTS providers
- **Shell Integration**: Execute shell commands with `!` syntax and command caching
- **Event Hooks**: Custom Python hooks for task lifecycle events (onstart, oncomplete, onpause, onresume)
- **Analytics & Telemetry**: Built-in usage analytics with PostHog integration (privacy-respecting, opt-in)

### Added - UI & UX
- **Custom Renderers**: Rich visual representation of task statuses and results
- **Real-time Updates**: Live status updates and progress tracking
- **Responsive Design**: React-based UI with modern interface components
- **Task Status Indicators**: Visual feedback for prepared, queued, running, completed, asking, aborted, and error states

### Added - Developer Features
- **Worker Architecture**: Parallel task processing with efficient resource management
- **Extension API**: Comprehensive Python API for notebook interaction and task management
- **Configuration System**: Extensive settings for TTS, telemetry, and shell command execution
- **Resource Management**: Automatic Pyodide downloading and dependency management

### Technical
- **VS Code Compatibility**: Requires VS Code 1.88.0 or higher
- **Node.js Support**: Compatible with Node.js 16.0.0 or higher
- **Extension Dependencies**: Integrates with RooCode extension (`rooveterinaryinc.roo-cline`)
- **Modern Stack**: Built with React 19, TypeScript, and Webpack 5