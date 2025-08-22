# Flags Feature Documentation

## Overview

The flags feature allows you to enhance prompts with predefined content by using flags in your prompt text. When you include flags like `--incremental`, `--think`, or `--with-tests` in your prompts, the system will automatically append the corresponding content from markdown files.

## Usage Examples

```python
# Create tasks with flags
tasks = awb.create_tasks(["Your task --incremental"], mode="code")

# Submit tasks with flags
tasks = awb.submit_tasks(["Your task --with-tests"], mode="code")

# Submit tasks with hierarchical flags
tasks = awb.submit_tasks(["Your task --cs:think --frontend:component"], mode="code")

# Submit tasks with parameterized flags
tasks = awb.submit_tasks(["Document the API --docs(api/users.js, User API)"], mode="code")

# Mixed usage - regular, hierarchical, and parameterized flags
tasks = awb.submit_tasks(["Build feature --think --docs(src/component.tsx, Button) --with-tests"], mode="code")

# Wait for tasks to complete
results = await awb.wait_for_tasks(tasks)
```

## How It Works

1. **Flag Detection**: When a task is created, the system scans the prompt for flags that start with `--` followed by alphanumeric characters, hyphens, underscores, or colons. It also detects optional parameters in parentheses.

2. **Content Loading**: For each detected flag, the system looks for a corresponding markdown file:
   - **Flat flags**: `.agentworkbook/flags/[flag-name].md` (e.g., `--think` → `think.md`)
   - **Hierarchical flags**: `.agentworkbook/flags/[path]/[flag-name].md` (e.g., `--cs:think` → `cs/think.md`)
   - **Parameterized flags**: Same file resolution, but with parameter substitution

3. **Parameter Processing**: For parameterized flags, the system replaces template variables `$$0` through `$$9` with the provided parameters.

4. **Content Appending**: If the flag file exists, its content (with parameter substitutions if applicable) is appended to the original prompt with proper formatting.

## Usage

### Basic Usage
```
Create a user authentication system --incremental --think
```

This will append the content from:
- `.agentworkbook/flags/incremental.md`
- `.agentworkbook/flags/think.md`

### Hierarchical Usage
```
Create a React component --cs:think --frontend:component
```

This will append the content from:
- `.agentworkbook/flags/cs/think.md`
- `.agentworkbook/flags/frontend/component.md`

### Multi-Level Hierarchical Usage
```
Build an enterprise system --deep:nested:hierarchy:flag
```

This will append the content from:
- `.agentworkbook/flags/deep/nested/hierarchy/flag.md`

### Parameterized Usage
```
Document the feature --docs(src/components/Button.tsx, Button Component)
```

This will:
1. Load content from `.agentworkbook/flags/docs.md`
2. Replace `$$0` with `src/components/Button.tsx`
3. Replace `$$1` with `Button Component`
4. Append the processed content to the prompt

### Mixed Usage Examples
```
Build feature --think --docs(api/users.js, User API) --with-tests
Create component --cs:think --frontend:component(Button, form-element)
```

These combine regular flags, parameterized flags, and hierarchical flags in a single prompt.

### Flag File Structure

Flag files can be organized in multiple ways:

#### Flat Structure (Original)
```
.agentworkbook/flags/[flag-name].md
```

Examples:
- `.agentworkbook/flags/incremental.md` (accessed via `--incremental`)
- `.agentworkbook/flags/with-tests.md` (accessed via `--with-tests`)
- `.agentworkbook/flags/think.md` (accessed via `--think`)

#### Hierarchical Structure
```
.agentworkbook/flags/[category]/[subcategory]/[flag-name].md
```

Examples:
- `.agentworkbook/flags/cs/think.md` (accessed via `--cs:think`)
- `.agentworkbook/flags/frontend/component.md` (accessed via `--frontend:component`)
- `.agentworkbook/flags/backend/api/rest.md` (accessed via `--backend:api:rest`)
- `.agentworkbook/flags/deep/nested/hierarchy/flag.md` (accessed via `--deep:nested:hierarchy:flag`)

#### Parameterized Flag Templates

Any flag file (flat or hierarchical) can be a template using `$$0` through `$$9` placeholders:

**Example: `.agentworkbook/flags/docs.md`**
```markdown
# Documentation for $$1

Generate documentation for the $$1 component.

## File Path
Located at: `$$0`

## Requirements
- Document $$1 functionality
- Include examples for $$1 usage
```

**Usage:**
```
--docs(src/Button.tsx, Button)
```

**Result:** `$$0` → `src/Button.tsx`, `$$1` → `Button`

## Features

- **Deduplication**: If the same flag appears multiple times in a prompt, its content is only added once
- **Case Sensitive**: Flags are case-sensitive (`--Incremental` ≠ `--incremental`)
- **Multi-Level Hierarchy**: Support unlimited nesting levels (e.g., `--a:b:c:d:e:flag`)
- **Parameterized Templates**: Support for `$$0` through `$$9` parameter substitution
- **Backward Compatible**: Existing flat flags continue to work without changes
- **Mixed Usage**: Can combine flat, hierarchical, and parameterized flags in the same prompt
- **Template Flexibility**: Any flag (flat or hierarchical) can be parameterized
- **Parameter Parsing**: Handles spaces, special characters, and edge cases in parameters
- **No VS Code Dependency**: Works both within VS Code extension context and in standalone testing
- **Flexible Format**: Flag content can include any markdown formatting

## Example Flags

### Flat Flags

#### --incremental
Provides guidance for incremental development approach.

#### --think
Requests analytical thinking before implementation.

#### --with-tests
Specifies that comprehensive tests should be included.

### Hierarchical Flags

#### --cs:think
Computer science specific thinking with algorithm analysis and complexity considerations.

#### --frontend:component
Frontend component development guidelines including accessibility and testing requirements.

#### --backend:api:rest
RESTful API development patterns and best practices.

#### --deep:nested:hierarchy:flag
Demonstrates multi-level hierarchical flag organization.

### Parameterized Flags

#### --docs(file_path, component_name)
Documentation template that generates component-specific documentation with dynamic file paths and names.

#### --template(param1, param2, param3)
Generic template demonstrating multiple parameter substitution.

#### --config:setup(env, database_url)
Hierarchical parameterized flag for environment-specific configuration setup.

## Implementation Details

The feature is implemented in:
- `src/flag_processor.ts`: Core flag parsing and processing logic
- `src/agentworkbook.ts`: Integration into the task creation pipeline

The preprocessing happens in the `createTasks` method before tasks are created, ensuring all prompts are enhanced with flag content before being processed by the AI.