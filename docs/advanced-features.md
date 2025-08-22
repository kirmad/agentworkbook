# AgentWorkbook Advanced Features

This guide covers the advanced features of AgentWorkbook including templates, scripts, and the sophisticated flag system.

## Table of Contents

- [Notebook Templates (.awbtemplate)](#notebook-templates-awbtemplate)
- [Code Scripts (.awbscript)](#code-scripts-awbscript)
- [Hierarchical Flags](#hierarchical-flags)
- [Parameterized Flags](#parameterized-flags)
- [Flag System Architecture](#flag-system-architecture)

## Notebook Templates (.awbtemplate)

Notebook templates allow you to create reusable notebook structures with dynamic content generation through argument substitution.

### What are .awbtemplate Files?

`.awbtemplate` files are JSON-formatted templates that define:
- Metadata about the template
- Arguments that users can provide
- A template structure with cells that can contain placeholders

### Template Structure

```json
{
  "metadata": {
    "title": "Data Analysis Template",
    "description": "A template for data analysis notebooks",
    "author": "Your Name",
    "version": "1.0.0",
    "tags": ["data-science", "analysis", "python"]
  },
  "arguments": {
    "datasetName": {
      "type": "string",
      "label": "Dataset Name",
      "description": "Name of the dataset to analyze",
      "required": true
    },
    "analysisType": {
      "type": "select",
      "label": "Analysis Type",
      "options": ["descriptive", "predictive", "exploratory"],
      "defaultValue": "exploratory"
    },
    "includeVisualization": {
      "type": "bool",
      "label": "Include Visualizations",
      "defaultValue": true
    },
    "sampleSize": {
      "type": "int",
      "label": "Sample Size",
      "description": "Number of samples to analyze",
      "defaultValue": 1000
    }
  },
  "template": {
    "cells": [
      {
        "kind": "markdown",
        "value": "# {{datasetName}} Analysis\n\nAnalysis type: {{analysisType}}",
        "language": "markdown"
      },
      {
        "kind": "code",
        "value": "import pandas as pd\nimport numpy as np\n\n# Load dataset: {{datasetName}}\ndf = pd.read_csv('{{datasetName}}.csv')\nprint(f'Dataset shape: {df.shape}')\n\n# Sample size: {{sampleSize}}\ndf_sample = df.sample(n={{sampleSize}}, random_state=42)",
        "language": "python"
      }
    ]
  }
}
```

### Argument Types

1. **string**: Text input
   ```json
   {
     "type": "string",
     "label": "Project Name",
     "description": "Enter the project name",
     "defaultValue": "MyProject",
     "required": true
   }
   ```

2. **select**: Dropdown selection
   ```json
   {
     "type": "select",
     "label": "Framework",
     "options": ["React", "Vue", "Angular"],
     "defaultValue": "React"
   }
   ```

3. **int**: Integer input
   ```json
   {
     "type": "int",
     "label": "Port Number",
     "defaultValue": 3000
   }
   ```

4. **bool**: Boolean choice
   ```json
   {
     "type": "bool",
     "label": "Enable Debug Mode",
     "defaultValue": false
   }
   ```

### Using Notebook Templates

1. **Create Template Directory**:
   ```
   .agentworkbook/templates/
   ```

2. **Organize Templates**:
   ```
   .agentworkbook/templates/
   ├── data-science/
   │   ├── analysis.awbtemplate
   │   ├── ml-pipeline.awbtemplate
   │   └── visualization.awbtemplate
   ├── web-development/
   │   ├── react-app.awbtemplate
   │   └── api-server.awbtemplate
   └── testing/
       ├── unit-tests.awbtemplate
       └── integration-tests.awbtemplate
   ```

3. **Create New Notebook from Template**:
   - Command Palette: "Create notebook from template"
   - Navigate through folder hierarchy
   - Fill in template arguments
   - Notebook is created with substituted values

### Template Examples

#### Machine Learning Pipeline Template

```json
{
  "metadata": {
    "title": "ML Pipeline Template",
    "description": "Complete machine learning pipeline setup"
  },
  "arguments": {
    "modelType": {
      "type": "select",
      "label": "Model Type",
      "options": ["classification", "regression", "clustering"],
      "required": true
    },
    "dataPath": {
      "type": "string",
      "label": "Data File Path",
      "required": true
    },
    "testSize": {
      "type": "int",
      "label": "Test Set Percentage",
      "defaultValue": 20
    }
  },
  "template": {
    "cells": [
      {
        "kind": "markdown",
        "value": "# {{modelType}} Model Pipeline\n\nData source: `{{dataPath}}`",
        "language": "markdown"
      },
      {
        "kind": "code",
        "value": "# Import libraries\nimport pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\n\n# Load data\ndata = pd.read_csv('{{dataPath}}')\nX = data.drop('target', axis=1)\ny = data['target']\n\n# Split data (test size: {{testSize}}%)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size={{testSize}}/100, random_state=42\n)",
        "language": "python"
      }
    ]
  }
}
```

## Code Scripts (.awbscript)

Code scripts are YAML-formatted files containing reusable code snippets that can be quickly inserted into notebook cells.

### Script Structure

```yaml
name: "Script Name"
description: "What this script does"
language: "python"  # or any supported language
code: |
  # Your code here
  import agentworkbook as awb
  
  # Script content
```

### Script Organization

```
.agentworkbook/scripts/
├── python/
│   ├── data-loading.awbscript
│   ├── task-creation.awbscript
│   └── api-client.awbscript
├── analysis/
│   ├── statistics.awbscript
│   └── visualization.awbscript
└── utilities/
    ├── file-operations.awbscript
    └── logging-setup.awbscript
```

### Script Examples

#### Task Creation Script
```yaml
name: "Parallel Task Creation"
description: "Create multiple tasks to run in parallel"
language: "python"
code: |
  import agentworkbook as awb
  
  # Define parallel tasks
  task_prompts = [
      "Analyze the user authentication module",
      "Review the database schema for optimization",
      "Generate API documentation"
  ]
  
  # Create tasks with parallel flag
  tasks = []
  for prompt in task_prompts:
      task = awb.create_tasks([f"{prompt} --parallel"], mode="code")
      tasks.extend(task)
  
  print(f"Created {len(tasks)} parallel tasks")
  
  # Submit all tasks
  for task in tasks:
      awb.submit_tasks([task.id])
```

#### Data Analysis Setup
```yaml
name: "Comprehensive Data Analysis"
description: "Setup for complete data analysis workflow"
language: "python"
code: |
  import pandas as pd
  import numpy as np
  import matplotlib.pyplot as plt
  import seaborn as sns
  from scipy import stats
  import agentworkbook as awb
  
  # Configure visualization
  plt.style.use('seaborn-v0_8-darkgrid')
  sns.set_palette("husl")
  
  # Helper functions
  def load_and_preview(filename):
      df = pd.read_csv(filename)
      print(f"Dataset: {filename}")
      print(f"Shape: {df.shape}")
      print(f"\nColumns: {list(df.columns)}")
      print(f"\nData types:\n{df.dtypes}")
      print(f"\nFirst 5 rows:\n{df.head()}")
      return df
  
  # Create analysis task
  task = awb.create_tasks([
      "Perform comprehensive analysis of the loaded dataset --think --with-tests"
  ], mode="code")
```

### Using Code Scripts

1. **Insert Script**:
   - Click the "+" button in notebook toolbar
   - Navigate folder hierarchy
   - Select script
   - Code is inserted at cursor position

2. **Script Selection UI**:
   - Folders show with folder icon and item count
   - Scripts show with file icon and relative path
   - Breadcrumb navigation for easy browsing

## Hierarchical Flags

Hierarchical flags allow you to organize flag content in a structured, categorized manner using colon-separated paths.

### Syntax

```
--category:subcategory:flag
```

### Examples

1. **Two-Level Hierarchy**:
   ```
   --cs:think           # Computer Science thinking
   --frontend:component # Frontend component guidelines
   --backend:api       # Backend API patterns
   ```

2. **Three-Level Hierarchy**:
   ```
   --backend:api:rest     # RESTful API patterns
   --frontend:react:hooks # React hooks guidelines
   --data:etl:pipeline   # ETL pipeline patterns
   ```

3. **Deep Hierarchy**:
   ```
   --enterprise:architecture:microservices:patterns
   --testing:integration:api:authentication
   ```

### File Organization

```
.agentworkbook/flags/
├── cs/
│   ├── think.md           # --cs:think
│   └── algorithms.md      # --cs:algorithms
├── frontend/
│   ├── component.md       # --frontend:component
│   ├── react/
│   │   ├── hooks.md      # --frontend:react:hooks
│   │   └── patterns.md   # --frontend:react:patterns
│   └── vue/
│       └── composition.md # --frontend:vue:composition
├── backend/
│   ├── api/
│   │   ├── rest.md       # --backend:api:rest
│   │   └── graphql.md    # --backend:api:graphql
│   └── database/
│       └── optimization.md # --backend:database:optimization
└── testing/
    ├── unit.md            # --testing:unit
    └── integration/
        └── api.md         # --testing:integration:api
```

### Creating Hierarchical Flags

1. **Create Directory Structure**:
   ```bash
   mkdir -p .agentworkbook/flags/frontend/react
   ```

2. **Create Flag File**:
   ```markdown
   # frontend/react/hooks.md
   
   When implementing React hooks:
   - Follow the Rules of Hooks
   - Use custom hooks for reusable logic
   - Implement proper dependency arrays
   - Handle cleanup in useEffect
   - Consider performance with useMemo and useCallback
   ```

3. **Use in Prompt**:
   ```
   Create a custom React hook for data fetching --frontend:react:hooks --with-tests
   ```

## Parameterized Flags

Parameterized flags allow dynamic content generation by passing parameters that get substituted into template placeholders.

### Syntax

```
--flagname(param1, param2, param3)
```

### Parameter Substitution

- `$$0` → First parameter
- `$$1` → Second parameter
- `$$2` → Third parameter
- ... up to `$$9`

### Examples

#### Simple Parameterized Flag

**Flag file** (`.agentworkbook/flags/docs.md`):
```markdown
# Documentation for $$1

Generate comprehensive documentation for the $$1 component.

## File Location
The component is located at: `$$0`

## Requirements
- Document all public methods of $$1
- Include usage examples for $$1
- Add type definitions if applicable
- Create unit test examples
```

**Usage**:
```
Generate documentation --docs(src/components/Button.tsx, Button)
```

**Result**: 
- `$$0` → `src/components/Button.tsx`
- `$$1` → `Button`

#### Hierarchical Parameterized Flag

**Flag file** (`.agentworkbook/flags/api/endpoint.md`):
```markdown
# API Endpoint: $$0

Create a $$1 endpoint for $$0 resource.

## Specifications
- Method: $$1
- Path: /api/$$2/$$0
- Authentication: Required
- Request validation: Yes
- Response format: JSON

## Implementation Requirements
- Input validation for $$1 requests
- Error handling with appropriate status codes
- Logging for debugging
- Rate limiting if applicable
```

**Usage**:
```
Create user management endpoint --api:endpoint(users, POST, v1)
```

**Result**:
- `$$0` → `users`
- `$$1` → `POST`
- `$$2` → `v1`

### Advanced Parameterized Examples

#### Configuration Template

**Flag file** (`.agentworkbook/flags/config/setup.md`):
```markdown
# Configuration Setup for $$0 Environment

## Database Configuration
- Database Type: $$1
- Connection String: $$2
- Pool Size: $$3

## Environment Setup
Set up the $$0 environment with the following:
1. Database: $$1 with connection to $$2
2. Connection pool max size: $$3
3. Enable logging for $$0 environment
4. Configure error handling
```

**Usage**:
```
Setup development environment --config:setup(development, PostgreSQL, localhost:5432/devdb, 10)
```

#### Test Generation

**Flag file** (`.agentworkbook/flags/test/generate.md`):
```markdown
# Generate $$1 Tests for $$0

Create comprehensive $$1 tests for the $$0 module.

## Test Requirements
- Test file location: $$2
- Coverage target: $$3%
- Test framework: $$4

## Test Categories
1. $$1 tests for core functionality
2. Edge case handling
3. Error scenarios
4. Performance benchmarks (if $$3 > 90)
```

**Usage**:
```
Generate tests --test:generate(UserService, integration, tests/integration/user.test.ts, 95, Jest)
```

### Parameter Handling

1. **Spaces in Parameters**:
   ```
   --docs(src/Button Component.tsx, Button Component with Spaces)
   ```

2. **Special Characters**:
   ```
   --api:route(/api/v1/users/:id, GET, user-details)
   ```

3. **Empty Parameters**:
   ```
   --template(value1, , value3)  # $$1 will be empty string
   ```

4. **Template Variables in Parameters**:
   ```
   --generate(Component, $$TEMPLATE_VAR)  # $$TEMPLATE_VAR passed literally
   ```

## Flag System Architecture

### Processing Pipeline

1. **Flag Detection**:
   - Regex pattern: `--[a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)*(?:\([^)]*\))?`
   - Captures hierarchical paths and optional parameters

2. **Path Resolution**:
   - Split flag by `:` for hierarchy
   - Build file path: `.agentworkbook/flags/[path]/[name].md`

3. **Parameter Extraction**:
   - Parse content within parentheses
   - Split by comma and trim whitespace
   - Store as array for substitution

4. **Content Loading**:
   - Read flag file from resolved path
   - Perform parameter substitution
   - Append to original prompt

5. **Deduplication**:
   - Track loaded flags
   - Prevent duplicate content

### Combined Usage Examples

**Important**: Multiple flags can be combined in a single prompt to create comprehensive instructions. Each flag's content is appended to the prompt, allowing you to layer different requirements and guidelines.

#### Example 1: Full-Featured Task
```
Create a React component with Redux integration --frontend:react:component --state:redux(UserProfile, user, SET_USER_PROFILE) --testing:unit --docs(src/components/UserProfile.tsx, UserProfile Component) --accessible --responsive --optimized
```

This loads and combines:
- React component guidelines
- Redux state management template with parameters
- Unit testing requirements
- Documentation template with file path and component name
- Accessibility requirements
- Responsive design guidelines
- Performance optimization instructions

#### Example 2: API Development
```
Implement user authentication API --backend:api:rest --auth:jwt(RS256, 24h, refresh-enabled) --testing:integration:api --docs(api/auth/endpoints.ts, Authentication API) --rate-limited --secure --monitoring --cache:redis
```

Combines:
- RESTful API patterns
- JWT authentication with specific configuration
- Integration testing guidelines
- API documentation template
- Rate limiting implementation
- Security best practices
- Monitoring setup
- Redis caching patterns

#### Example 3: Data Pipeline
```
Build ETL pipeline for customer data --data:etl:pipeline --processing:batch(1000, parallel, 4) --monitoring:datadog(customer-etl, prod) --testing:data:quality --error-handling --retry-logic --audit-trail
```

Layers:
- ETL pipeline architecture
- Batch processing with parameters
- DataDog monitoring configuration
- Data quality testing
- Error handling strategies
- Retry logic implementation
- Audit trail requirements

#### Example 4: Maximum Flag Combination
```
Design and implement a microservices architecture --cs:think --think-hard --architecture:microservices --backend:api:graphql --frontend:react:spa --auth:oauth2(authorization_code, google, facebook) --testing:unit --testing:integration --testing:e2e --monitoring:prometheus --deploy:kubernetes(prod, 3, auto-scaling) --docs(architecture/design.md, Microservices Architecture) --secure --scalable --maintainable --observable
```

This comprehensive example combines:
- Multiple thinking modes
- Architecture patterns
- Backend and frontend specifications
- OAuth2 authentication with providers
- Three levels of testing
- Monitoring setup
- Deployment configuration with parameters
- Documentation requirements
- Multiple quality attributes

### Best Practices

1. **Flag Organization**:
   - Use hierarchical flags for better organization
   - Group related flags by domain
   - Keep flag names descriptive but concise

2. **Parameter Usage**:
   - Use meaningful parameter placeholders
   - Document parameter expectations in flag files
   - Validate parameter count in templates

3. **Content Structure**:
   - Start with clear headings
   - Use markdown formatting
   - Include examples where helpful
   - Keep content focused and actionable

4. **Naming Conventions**:
   - Use lowercase with hyphens for flags
   - Use descriptive names for hierarchical segments
   - Avoid overly deep hierarchies (max 4 levels recommended)

### Troubleshooting

1. **Flag Not Loading**:
   - Check file path matches flag structure
   - Verify `.md` extension
   - Ensure file exists in correct directory

2. **Parameter Substitution Issues**:
   - Count parameters match placeholders
   - Check for typos in `$$0` - `$$9`
   - Verify parentheses are balanced

3. **Hierarchical Path Problems**:
   - Use colons (`:`) not slashes
   - Check directory structure matches
   - Verify no spaces in flag names

## Summary

These advanced features provide powerful ways to enhance productivity:

- **Notebook Templates**: Create complex, reusable notebook structures with dynamic content
- **Code Scripts**: Quick insertion of common code patterns
- **Hierarchical Flags**: Organized, categorized prompt enhancements
- **Parameterized Flags**: Dynamic content generation with parameter substitution

Together, they enable sophisticated workflow automation and standardization across your AgentWorkbook projects.