# Code Templates in AgentWorkbook

AgentWorkbook now supports code templates that can be quickly inserted into notebooks. Templates are stored as `.awbscript` files in the `.agentworkbook/scripts` directory of your workspace, with support for hierarchical organization in subfolders.

## Using Templates

1. **Insert Template**: 
   - Click the "+" (Insert Code Template) button in the notebook toolbar to insert at the end
   - Click the "+" button that appears after each cell to insert after that specific cell
   - Or use the command palette (`Cmd+Shift+P`) and search for "Insert Code Template"
2. **Navigate Folders**: Browse through folders using the hierarchical picker - folders show with folder icons and item counts
3. **Select Template**: Choose from the available templates in the current folder - templates show with file icons and relative paths
4. **Template Inserted**: The selected template code will be inserted as a new code cell in your notebook at the chosen location

### Hierarchical Navigation
- **Folders**: Displayed with `$(folder)` icons and show the number of contained items
- **Templates**: Displayed with `$(file)` icons and show their relative path
- **Back Navigation**: Use the "Back" option to navigate to parent folders
- **Breadcrumbs**: Current folder path is shown in the picker placeholder

## Template File Format

Templates are stored as YAML files with the `.awbscript` extension in the `.agentworkbook/scripts` directory:

```yaml
name: "Template Name"
description: "Brief description of what this template does"
language: "python"
code: |
  import agentworkbook as awb
  
  # Your template code here
```

### Fields

- **name** (required): Display name for the template
- **description** (optional): Description shown in the template picker
- **language** (optional): Programming language, defaults to "python"
- **code** (required): The actual code content to insert

## Example Templates

### Basic Task Creation
```yaml
name: "Basic Task Creation"
description: "Create a basic AgentWorkbook task"
language: "python"
code: |
  import agentworkbook as awb
  
  # Build prompt with flag processing first
  raw_prompt = "Your task description here --with-tests --docs(api.md)"
  built_prompt = awb.build_prompt(raw_prompt)
  
  # Single task (recommended for simple cases)
  task = awb.submit_task(built_prompt, mode="code", build_prompt=False)
  print(f"Created task: {task.id}")
  
  # Or multiple tasks if needed
  # tasks = awb.submit_tasks([built_prompt], mode="code", build_prompt=False)
  # print(f"Created tasks: {[t.id for t in tasks]}")
```

### Data Analysis Setup
```yaml
name: "Data Analysis Setup"
description: "Setup common libraries for data analysis"
language: "python"
code: |
  import pandas as pd
  import numpy as np
  import matplotlib.pyplot as plt
  
  # Load your data here
  # df = pd.read_csv('your_file.csv')
  # print(df.head())
```

## Creating Your Own Templates

1. Create a `.agentworkbook/scripts` directory in your workspace root (if it doesn't exist)
2. Organize templates in subfolders as needed (e.g., `python/`, `data-analysis/`, `testing/`)
3. Create `.awbscript` files with your template definitions
4. Templates will automatically appear in the hierarchical template picker

## File Organization

```
your-workspace/
├── .agentworkbook/
│   └── scripts/
│       ├── basic-task.awbscript
│       ├── python/
│       │   ├── data-analysis.awbscript
│       │   ├── ml-setup.awbscript
│       │   └── web-scraping.awbscript
│       ├── testing/
│       │   ├── unit-test.awbscript
│       │   └── integration-test.awbscript
│       └── utilities/
│           ├── file-operations.awbscript
│           └── api-client.awbscript
├── your-notebook.agentworkbook
└── other-files...
```

### Benefits of Hierarchical Organization
- **Better Organization**: Group related templates together (e.g., all Python templates in `python/` folder)
- **Easier Discovery**: Navigate through categories instead of searching through a long flat list
- **Scalability**: Support for large collections of templates without UI clutter
- **Intuitive Navigation**: Familiar folder-based browsing with breadcrumb navigation

The template feature enhances productivity by providing quick access to commonly used code patterns in AgentWorkbook notebooks.