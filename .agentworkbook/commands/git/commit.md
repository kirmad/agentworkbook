---
description: "Commit changes to git repository with proper message formatting"
argument-hint: "[-m message] [--amend] [--no-verify]"
bash-execution: true
persist-command: false
priority: 20
---

# Git Commit Command

This command helps commit changes to the git repository.

## Usage
```
/git:commit [-m "commit message"] [--amend] [--no-verify]
```

## Arguments
$ARGUMENTS

## Execution
The following git command will be executed:

!`git add -A`
!`git commit $ARGUMENTS`

This will:
1. Stage all changes
2. Commit with the provided arguments
3. Use proper git commit message formatting