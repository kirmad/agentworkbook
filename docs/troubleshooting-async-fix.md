# Troubleshooting: Async API Issue Resolution

## Problem Analysis

### Original Issue
Users encountered the error:
```
TypeError: Expected list of Task objects or strings, but got a coroutine. 
Did you forget to await an async function call?
```

### Root Cause
The initial implementation of the flags feature incorrectly made the entire task creation API asynchronous, which:

1. **Broke backward compatibility** - Existing user code suddenly required `await` keywords
2. **Added unnecessary complexity** - File reading for flags didn't actually require async operations
3. **Created confusion** - Users had to rewrite working code to handle async/await

### Why the Async Approach Was Wrong

The flag processing involves:
- Reading small local markdown files (< 1KB each)
- Simple string concatenation
- No network I/O or complex operations

These operations are perfectly suitable for synchronous execution and don't benefit from being async.

## Solution Implemented

### 1. Made Flag Processing Synchronous

**File**: `src/flag_processor.ts`
- `loadFlagContent()`: Uses `fs.readFileSync()` instead of `fs.readFile()`
- `processPromptWithFlags()`: Removed `async/await`, returns string directly
- `processPromptsWithFlags()`: Synchronous processing of multiple prompts

### 2. Reverted API to Synchronous

**File**: `src/agentworkbook.ts`
- `createTasks()`: Removed `async` keyword, returns `Task[]` instead of `Promise<Task[]>`

**File**: `resources/agentworkbook.py`
- `create_tasks()`: Removed `async` keyword and `await` calls
- `submit_tasks()`: Reverted to synchronous
- `execute_prompt()`: Removed `await` from `create_tasks()` call

### 3. Updated Documentation and Templates

- Removed all `async/await` usage examples
- Updated code templates to use synchronous API
- Simplified documentation without async complexity

## Key Benefits of the Fix

1. **Backward Compatibility**: Existing user code continues to work without changes
2. **Simplicity**: No need for users to understand async/await for basic task creation
3. **Performance**: Synchronous file operations are actually faster for small local files
4. **Maintainability**: Simpler codebase without unnecessary async complexity

## Correct Usage (After Fix)

```python
import agentworkbook as awb

# Simple task creation with flags (synchronous)
tasks = awb.create_tasks([
    "Create authentication system --incremental --with-tests"
], mode="code")

# Submit tasks (synchronous)
submitted_tasks = awb.submit_tasks([
    "Build REST API --think"
], mode="code")

# Only wait_for_tasks remains async (as it should be)
results = await awb.wait_for_tasks(tasks)
```

## Lesson Learned

**Don't make APIs async unless they genuinely need to be.** 

Local file operations for small files (like flag content) should remain synchronous to:
- Maintain simplicity
- Preserve backward compatibility
- Avoid forcing complexity on users
- Keep the mental model simple

The flags feature now works seamlessly without breaking existing user workflows.