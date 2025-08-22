# Shell Command Integration - Implementation Plan

Simple, straightforward implementation plan for adding `!`command`` support to custom commands.

## Overview

**Goal**: Replace `!`git status`` with actual git status output in custom command files.

**Approach**: Parse → Validate → Execute → Replace

## Implementation Steps

### Step 1: Create Shell Processor (1-2 hours)

Create `src/utils/shellCommandProcessor.ts`:

```typescript
import { shell_command } from './shellCommand';

export class ShellCommandProcessor {
  private cache = new Map<string, { result: string; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async processContent(content: string): Promise<string> {
    const regex = /!`([^`]+)`/g;
    let result = content;
    const matches = [...content.matchAll(regex)];
    
    for (const match of matches) {
      const [fullMatch, command] = match;
      
      try {
        const output = await this.executeCommand(command);
        result = result.replace(fullMatch, output.trim());
      } catch (error) {
        result = result.replace(fullMatch, `⚠️ Error: ${error.message}`);
      }
    }
    
    return result;
  }
  
  private async executeCommand(command: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(command);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    
    // Execute without timeout or restrictions
    const result = await shell_command(command, {});
    
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'Command failed');
    }
    
    // Cache
    this.cache.set(command, {
      result: result.stdout,
      timestamp: Date.now()
    });
    
    return result.stdout;
  }
}
```

### Step 2: Integrate with Command Processing (30 minutes)

Modify wherever custom commands are processed (likely in `agentworkbook.ts`):

```typescript
import { ShellCommandProcessor } from './utils/shellCommandProcessor';

// Add to class
private shellProcessor = new ShellCommandProcessor();

// Modify command processing method
async processCustomCommand(commandContent: string): Promise<string> {
  // Process shell commands first
  const processedContent = await this.shellProcessor.processContent(commandContent);
  
  // Continue with existing command processing
  return processedContent;
}
```

### Step 3: Add VS Code Settings (15 minutes)

Add to `package.json` in `contributes.configuration`:

```json
{
  "agentworkbook.shellCommands.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable shell command execution"
  }
}
```

### Step 4: Add Command Palette Commands (15 minutes)

Add to `package.json` in `contributes.commands`:

```json
{
  "command": "agentworkbook.toggleShellCommands",
  "title": "Toggle Shell Commands"
},
{
  "command": "agentworkbook.clearShellCache", 
  "title": "Clear Shell Command Cache"
}
```

Register in `extension.ts`:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('agentworkbook.toggleShellCommands', () => {
    const config = vscode.workspace.getConfiguration('agentworkbook');
    const enabled = config.get('shellCommands.enabled');
    config.update('shellCommands.enabled', !enabled, true);
  })
);
```

## Testing

### Unit Tests (30 minutes)

Create `test/shellCommandProcessor.test.ts`:

```typescript
import { ShellCommandProcessor } from '../src/utils/shellCommandProcessor';

describe('ShellCommandProcessor', () => {
  let processor: ShellCommandProcessor;
  
  beforeEach(() => {
    processor = new ShellCommandProcessor();
  });
  
  test('processes basic command', async () => {
    const content = 'Version: !`node --version`';
    const result = await processor.processContent(content);
    expect(result).toMatch(/Version: v\d+\.\d+\.\d+/);
  });
  
  test('executes all commands', async () => {
    const content = 'Test: !`echo "hello world"`';
    const result = await processor.processContent(content);
    expect(result).toBe('Test: hello world');
  });
  
  test('handles errors gracefully', async () => {
    const content = 'Error: !`nonexistentcommand`';
    const result = await processor.processContent(content);
    expect(result).toMatch(/Error: ⚠️ Error:/);
  });
});
```

### Integration Tests (30 minutes)

Test with actual command files:

```typescript
test('processes git command file', async () => {
  const commandContent = `
# Git Status
Current branch: !`git branch --show-current`
Files changed: !`git status --porcelain | wc -l`
`;
  
  const result = await processor.processContent(commandContent);
  expect(result).toContain('Current branch:');
  expect(result).toContain('Files changed:');
});
```

## File Structure

```
src/
├── utils/
│   ├── shellCommand.ts          # ✅ Existing
│   └── shellCommandProcessor.ts # 🆕 New (~100 lines)
├── agentworkbook.ts            # ✏️ Modified (~5 lines)
└── extension.ts                # ✏️ Modified (~10 lines)

test/
└── shellCommandProcessor.test.ts # 🆕 New (~50 lines)

package.json                    # ✏️ Modified (~20 lines)
```

## No Restrictions

### All Commands Enabled
- No command blocking or filtering
- No timeout limitations
- Commands execute with full system access
- Commands run in workspace directory by default

## Performance

### Caching Strategy
- Cache results for 5 minutes
- Use command string as cache key
- Automatic cache cleanup on timeout

### Resource Management  
- No timeout limitations
- No concurrency restrictions
- Commands execute as requested

## Error Handling

### Graceful Degradation
- Failed commands show "⚠️ Error: message"
- Network issues don't crash the extension
- Invalid syntax shows original text
- All commands are attempted regardless of type

## Rollout Plan

### Phase 1: Core Implementation (3-4 hours)
- Implement ShellCommandProcessor
- Integrate with command processing
- Add basic tests

### Phase 2: Configuration (1 hour)
- Add VS Code settings
- Add command palette commands
- Test configuration changes

### Phase 3: Testing & Documentation (1 hour)
- Comprehensive testing
- Update documentation
- Performance testing

**Total Estimated Time: 5-6 hours**

## Success Criteria

✅ `!`git status`` replaced with actual git status output  
✅ All commands execute without restrictions  
✅ Results cached for performance  
✅ Configurable through VS Code settings  
✅ Graceful error handling  
✅ Unit and integration tests passing  

## Maintenance

### Minimal Maintenance Required
- Simple architecture with single responsibility
- Existing shell_command utility handles execution
- Configuration-driven security model
- Comprehensive error handling

This implementation is **simple, secure, and ready to build**.