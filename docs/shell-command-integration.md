# Shell Command Integration in Custom Commands

AgentWorkbook's enhanced custom commands support dynamic shell command execution using the `!`command`` syntax. This feature transforms static command templates into interactive, real-time workflows.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Implementation Guide](#implementation-guide)
- [Security](#security)
- [Examples](#examples)
- [Configuration](#configuration)

## Overview

Shell command integration allows custom commands to execute system commands and embed their output directly into command content. This enables dynamic, context-aware workflows that adapt to your project's current state.

### Key Benefits

- **Real-time Data**: Always current project status, branch information, file counts
- **Context Awareness**: Commands adapt to your project's actual state
- **Reduced Manual Work**: Automatic status checking and information gathering
- **Enhanced Workflows**: Combine multiple tools in a single command

### Example Transformation

**Before (Static)**:
```markdown
Current branch: [Please check with git branch]
Status: [Run git status to see changes]
```

**After (Dynamic)**:
```markdown
Current branch: !`git branch --show-current`
Status: !`git status --porcelain | wc -l` files changed
```

**Runtime Output**:
```markdown
Current branch: feature/shell-integration
Status: 3 files changed
```

## Quick Start

### Basic Syntax
Commands use backticks within exclamation marks:
```markdown
!`git status`
!`npm --version`
!`pwd`
```

### Common Patterns
```markdown
Current branch: !`git branch --show-current`
Files changed: !`git status --porcelain | wc -l`
Node version: !`node --version`
Project name: !`basename $(pwd)`
```

## Implementation Guide

### Step 1: Create the Shell Processor

```typescript
// src/utils/shellCommandProcessor.ts
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
    // Check cache first
    const cached = this.cache.get(command);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    
    // Execute command without restrictions
    const result = await shell_command(command, {});
    
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'Command failed');
    }
    
    // Cache result
    this.cache.set(command, {
      result: result.stdout,
      timestamp: Date.now()
    });
    
    return result.stdout;
  }
}
```

### Step 2: Integrate with AgentWorkbook

```typescript
// src/agentworkbook.ts - Add to AgentWorkbook class
import { ShellCommandProcessor } from './utils/shellCommandProcessor';

export class AgentWorkbook implements ICommandExecutor {
  private shellProcessor = new ShellCommandProcessor();
  
  // Modify existing command processing
  async processCustomCommand(commandFile: string): Promise<string> {
    const content = await fs.readFile(commandFile, 'utf8');
    
    // Process shell commands first
    const processedContent = await this.shellProcessor.processContent(content);
    
    // Continue with normal command processing
    return processedContent;
  }
}
```

### Step 3: Add Settings

```json
// package.json - Add to contributes.configuration
{
  "agentworkbook.shellCommands.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable shell command execution in custom commands"
  }
}
```

## All Commands Enabled

No restrictions or limitations:

### Full Command Access
- All commands execute without blocking
- No timeout limitations
- No security filtering
- Full system command access

### Features
- **Unrestricted execution** - Any command can be run
- **No timeouts** - Commands run until completion
- **Error handling** - Failed commands show error messages
- **Full access** - Complete shell command capabilities

## Configuration

Basic VS Code settings for shell commands:

```json
{
  "agentworkbook.shellCommands.enabled": true
}
```

### All Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable/disable shell commands |

### Commands

- `Toggle Shell Commands` - Enable/disable from command palette
- `Clear Cache` - Clear cached command results

## Examples

### Git Workflow Command

```markdown
# Git Status Report

## Current State
- **Branch**: !`git branch --show-current`
- **Status**: !`git status --porcelain | wc -l` files changed
- **Commits ahead**: !`git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0"`
- **Last commit**: !`git log -1 --format='%h %s (%cr)'`

## Changes
!`git status --porcelain`

## Recent Activity
!`git log --oneline -5`

## Branch Information
!`git branch -vv`
```

### Project Overview Command

```markdown
# Project Overview: !`basename $(pwd)`

## Environment
- **Node Version**: !`node --version`
- **NPM Version**: !`npm --version`
- **Working Directory**: !`pwd`

## Dependencies
- **Dependencies**: !`npm list --depth=0 2>/dev/null | grep -c '^[├└]'` packages
- **Dev Dependencies**: !`npm list --depth=0 --dev 2>/dev/null | grep -c '^[├└]'` packages
- **Outdated**: !`npm outdated --depth=0 2>/dev/null | wc -l` packages need updates

## Code Statistics
- **JavaScript Files**: !`find . -name "*.js" -not -path "./node_modules/*" | wc -l`
- **TypeScript Files**: !`find . -name "*.ts" -not -path "./node_modules/*" | wc -l`
- **Total Lines**: !`find . -name "*.js" -o -name "*.ts" | grep -v node_modules | xargs wc -l | tail -1`

## Git Status
- **Branch**: !`git branch --show-current`
- **Modified Files**: !`git status --porcelain | wc -l`
- **Untracked Files**: !`git ls-files --others --exclude-standard | wc -l`
```

### Docker Development Command

```markdown
# Docker Development Status

## Container Status
!`docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`

## Image Information
!`docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10`

## Resource Usage
- **Running Containers**: !`docker ps -q | wc -l`
- **Total Images**: !`docker images -q | wc -l`
- **System Usage**: !`docker system df`

## Recent Logs (if containers running)
!`if [ $(docker ps -q | wc -l) -gt 0 ]; then docker logs --tail 10 $(docker ps -q | head -1); else echo "No running containers"; fi`
```

### Testing Status Command

```markdown
# Test Status Report

## Test Results
!`npm test 2>&1 | tail -10`

## Coverage Report
!`npm run coverage 2>/dev/null | grep -E "(Statements|Branches|Functions|Lines)" || echo "Coverage not available"`

## Test Files
- **Test Files**: !`find . -name "*.test.js" -o -name "*.spec.js" | grep -v node_modules | wc -l`
- **Last Test Run**: !`stat -c %y $(find . -name "coverage" -type d 2>/dev/null | head -1) 2>/dev/null || echo "Never"`

## Quality Checks
- **ESLint Issues**: !`npx eslint . --format=compact 2>/dev/null | grep -c "problem" || echo "0"`
- **TypeScript Errors**: !`npx tsc --noEmit 2>&1 | grep -c "error" || echo "0"`
```

## Best Practices

### Command Design

1. **Keep Commands Simple**: Use straightforward commands that are easy to understand
2. **Handle Errors Gracefully**: Use conditional execution and fallbacks
3. **Limit Output Size**: Use filters to keep output manageable
4. **Cache-Friendly**: Design commands that benefit from caching

### Security Practices

1. **Use Safe Commands**: Prefer read-only operations when possible
2. **Validate Input**: Never pass user input directly to shell commands
3. **Limit Scope**: Use commands that work within the project directory
4. **Regular Review**: Periodically review and update command lists

### Performance Optimization

1. **Cache Repeated Commands**: Identical commands are cached for 5 minutes
2. **Use Filters**: Apply filters to reduce output size and processing time
3. **Avoid Long-Running Commands**: Commands timeout after 30 seconds
4. **Batch Related Information**: Combine related queries in single commands

### Error Handling

1. **Provide Fallbacks**: Use `||` to provide alternative outputs
2. **Check Prerequisites**: Verify tools are available before using them
3. **Graceful Degradation**: Commands should work even if some tools are missing
4. **Clear Error Messages**: Provide helpful error messages for failed commands

## Troubleshooting

### Common Issues

#### Command Not Executing
**Symptoms**: Command appears as `!`command`` instead of output
- **Cause**: Shell commands disabled or syntax error
- **Solution**: Check VS Code settings and syntax

#### Permission Denied
**Symptoms**: Error message about permissions
- **Cause**: Command blocked by security policy
- **Solution**: Add to allowed commands or adjust security level

#### Command Timeout
**Symptoms**: Command stops with timeout error
- **Cause**: Command takes longer than 30 seconds
- **Solution**: Optimize command or increase timeout setting

#### Unexpected Output
**Symptoms**: Command output not as expected
- **Cause**: Different environment or missing dependencies
- **Solution**: Test command manually and adjust for environment

### Debugging Steps

1. **Test Manually**: Run the command in terminal to verify it works
2. **Check Syntax**: Ensure proper `!`command`` syntax
3. **Review Logs**: Check VS Code output panel for error messages
4. **Verify Settings**: Confirm shell commands are enabled
5. **Security Check**: Ensure command is in allowed list

### Performance Issues

#### Slow Command Execution
- **Check Command Complexity**: Simplify complex commands
- **Use Caching**: Leverage automatic caching for repeated commands
- **Optimize Filters**: Use efficient filtering to reduce output

#### High Resource Usage
- **Limit Concurrent Commands**: Reduce parallel execution
- **Monitor Output Size**: Keep output under 10KB limit
- **Review Command Frequency**: Avoid running resource-intensive commands frequently

### Security Concerns

#### Audit Command Usage
1. **Review Security Logs**: Check executed commands regularly
2. **Monitor Blocked Attempts**: Investigate blocked command attempts
3. **Update Security Policies**: Adjust policies based on usage patterns
4. **Team Coordination**: Ensure team members understand security policies

## Advanced Usage

### Environment Variables
Commands can use environment variables:
```markdown
Project: !`echo "${PWD##*/}"`
User: !`echo "$USER"`
Home: !`echo "$HOME"`
```

### Conditional Logic
Use shell conditional logic for smart commands:
```markdown
Git status: !`if git rev-parse --git-dir > /dev/null 2>&1; then git status -s; else echo "Not a git repository"; fi`
```

### Command Chaining
Chain commands for complex workflows:
```markdown
Build and test: !`npm run build && npm test | tail -5`
```

### Custom Filters
Create custom output formatting:
```markdown
Recent commits: !`git log --format='- %h %s (%an, %ar)' -5`
```

## Implementation

For detailed implementation steps, see [shell-command-implementation.md](./shell-command-implementation.md).

**Quick Summary:**
1. Create `ShellCommandProcessor` class (~100 lines)
2. Integrate with command processing (~5 lines)  
3. Add VS Code settings (~20 lines)
4. Add tests (~50 lines)
5. **Total: ~175 lines of code, 5-6 hours work**

Ready to implement!