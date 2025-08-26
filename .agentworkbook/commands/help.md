---
description: "Show help information for custom commands"
argument-hint: "[command-name]"
priority: 5
---

# Custom Commands Help

## Available Commands

### Hierarchical Commands
- `/sc:implement` - Feature implementation with expert guidance
- `/git:commit` - Git commit with automatic staging

### Usage Examples
```
/sc:implement user authentication system --type feature
/git:commit -m "add new feature"
/help sc:implement
```

## Arguments
$ARGUMENTS

## How It Works
1. Commands start with `/` 
2. Hierarchical commands use `:` notation (e.g., `/sc:implement`)
3. Arguments are passed after the command name
4. `$ARGUMENTS` in command files gets replaced with your arguments
5. Commands with `bash-execution: true` can run shell commands

## Directory Structure
Commands are stored in `.agentworkbook/commands/`:
- Flat commands: `commands/help.md` → `/help`
- Hierarchical: `commands/sc/implement.md` → `/sc:implement`