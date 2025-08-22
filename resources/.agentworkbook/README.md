# AgentWorkbook Resources

This directory contains templates, scripts, and flags that can be installed into your workspace using the AgentWorkbook extension.

## Installation

You can install these resources using the VS Code Command Palette:

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Choose one of the following commands:
   - **AgentWorkbook: Install Resources (Flags, Scripts, Templates)** - Installs everything
   - **AgentWorkbook: Install Flags** - Installs only flags
   - **AgentWorkbook: Install Scripts** - Installs only scripts  
   - **AgentWorkbook: Install Templates** - Installs only templates

The resources will be copied to a `.agentworkbook` directory in your workspace root.

## Directory Structure

```
.agentworkbook/
├── flags/          # Configuration flags
├── scripts/        # Automation scripts (.awbscript files)
└── templates/      # Notebook templates (.awbtemplate files)
    ├── basic/
    ├── data-science/
    └── web-development/
```

## Usage

Once installed in your workspace:

- **Flags**: Configuration files that control AgentWorkbook behavior
- **Scripts**: Reusable automation scripts that can be executed in notebooks
- **Templates**: Pre-built notebook templates for different use cases

## Requirements

- VS Code with AgentWorkbook extension installed
- An open workspace folder
- RooCode extension (dependency)