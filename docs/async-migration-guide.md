# Async Migration Guide

## Overview

With the introduction of the flags feature, several AgentWorkbook Python API functions have become asynchronous to support prompt preprocessing. This guide explains the changes and how to update your code.

## Changed Functions

The following functions are now `async` and must be awaited:

- `awb.create_tasks()` 
- `awb.submit_tasks()`

The `awb.execute_prompt()` function was already async and remains unchanged.

## Migration Examples

### Before (Synchronous)
```python
import agentworkbook as awb

# Old synchronous usage
tasks = awb.create_tasks(["Create a login form"], mode="code")
for task in tasks:
    task.submit()

# Submit multiple tasks at once
submitted_tasks = awb.submit_tasks([
    "Implement user authentication",
    "Add password validation"
], mode="code")
```

### After (Asynchronous)
```python
import agentworkbook as awb

# New asynchronous usage  
tasks = await awb.create_tasks(["Create a login form --incremental"], mode="code")
for task in tasks:
    task.submit()

# Submit multiple tasks at once
submitted_tasks = await awb.submit_tasks([
    "Implement user authentication --with-tests", 
    "Add password validation --think"
], mode="code")
```

## Common Errors and Fixes

### Error: "RuntimeError: await wasn't used with future"
**Cause**: Calling an async function without `await`

```python
# ❌ Wrong
tasks = awb.create_tasks(["task"])

# ✅ Correct  
tasks = await awb.create_tasks(["task"])
```

### Error: "'coroutine' object is not iterable"
**Cause**: Passing a coroutine to a function expecting a list

```python
# ❌ Wrong
tasks = awb.create_tasks(["task"])  # Missing await!
await awb.wait_for_tasks(tasks)     # tasks is a coroutine, not list

# ✅ Correct
tasks = await awb.create_tasks(["task"])  # Now tasks is a list
await awb.wait_for_tasks(tasks)           # Works correctly
```

## Why These Changes Were Made

The flags feature requires preprocessing prompts to:
1. Parse flags like `--incremental`, `--think`, `--with-tests`
2. Load corresponding content from `.agentworkbook/flags/` directory  
3. Append flag content to the original prompt

This preprocessing involves file I/O operations that need to be asynchronous to avoid blocking the VS Code extension UI.

## Benefits

With these changes, you can now enhance your prompts with reusable flag content:

```python
# Flags will automatically append content from markdown files
tasks = await awb.create_tasks([
    "Build a REST API --incremental --with-tests --think"
], mode="code")
```

The `--incremental`, `--with-tests`, and `--think` flags will automatically append their respective guidance content to your prompt.

## Template Updates

All code templates and examples have been updated to use the new async syntax. If you have custom templates, update them to use `await` with task creation functions.