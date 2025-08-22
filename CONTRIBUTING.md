# Contributing to AgentWorkbook

Thank you for your interest in contributing to AgentWorkbook! This guide will help you get started with development, testing, and submitting contributions.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- Node.js 16.0.0 or higher
- VS Code 1.88.0 or higher
- Yarn package manager
- Git

### Initial Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/agentworkbook.git
   cd agentworkbook
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```
   This will automatically download Pyodide dependencies.

3. **Build the Extension**
   ```bash
   yarn run compile
   ```

4. **Open in VS Code**
   ```bash
   code .
   ```

### Development Environment

1. **Install Recommended Extensions**
   - ESLint
   - TypeScript and JavaScript Language Features
   - Prettier (optional but recommended)

2. **Configure VS Code**
   - Use workspace TypeScript version
   - Enable ESLint auto-fix on save

## Project Structure

```
agentworkbook/
├── src/                 # TypeScript source files
│   ├── extension.ts     # Extension entry point
│   ├── agentworkbook.ts # Core functionality
│   ├── ai/             # AI integration layer
│   ├── tasks/          # Task management system
│   ├── notebook/       # Notebook functionality
│   ├── python/         # Python integration
│   ├── renderer/       # React UI components
│   └── utils/          # Utility functions
├── resources/          # Python scripts and assets
├── test/              # Test files
├── docs/              # Documentation
└── dist/              # Compiled output (generated)
```

## Development Workflow

### Running the Extension

1. **Development Mode**
   - Press `F5` in VS Code
   - A new VS Code window will open with the extension loaded
   - Make changes and reload the window to test

2. **Watch Mode**
   ```bash
   yarn run watch
   ```
   Automatically recompiles on file changes.

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow the Development Cycle**
   - Write code following our standards
   - Add/update tests
   - Update documentation
   - Test your changes thoroughly

3. **Common Development Tasks**

   **Adding a New Command:**
   ```typescript
   // In src/core/constants.ts
   export const COMMANDS = {
       // ... existing commands
       YOUR_COMMAND: 'agentworkbook.yourCommand'
   };

   // In src/extension.ts
   const yourCommandDisposable = vscode.commands.registerCommand(
       COMMANDS.YOUR_COMMAND,
       async () => {
           // Command implementation
       }
   );
   context.subscriptions.push(yourCommandDisposable);
   ```

   **Adding a Task Feature:**
   ```typescript
   // In src/tasks/manager.ts
   export class Task {
       // Add new property
       yourFeature?: YourFeatureType;
       
       // Add new method
       yourMethod(): void {
           // Implementation
       }
   }
   ```

   **Adding a Renderer Component:**
   ```tsx
   // In src/renderer/yourComponent/index.tsx
   import React from 'react';
   
   export const YourComponent: React.FC<Props> = ({ prop1, prop2 }) => {
       return (
           <div className="your-component">
               {/* Component JSX */}
           </div>
       );
   };
   ```

## Coding Standards

### TypeScript Guidelines

1. **Use Strict TypeScript**
   - Enable all strict checks
   - Avoid `any` types
   - Define interfaces for all data structures

2. **Naming Conventions**
   - Classes: `PascalCase`
   - Interfaces: `IPascalCase` or `PascalCase`
   - Functions/Methods: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Files: `camelCase.ts` or `kebab-case.ts`

3. **Code Organization**
   ```typescript
   // 1. Imports
   import * as vscode from 'vscode';
   import { Something } from './something';
   
   // 2. Type definitions
   interface IMyInterface {
       property: string;
   }
   
   // 3. Constants
   const MY_CONSTANT = 'value';
   
   // 4. Class/Function implementation
   export class MyClass {
       // Implementation
   }
   ```

### React Guidelines

1. **Component Structure**
   - Use functional components with hooks
   - Keep components focused and small
   - Extract reusable logic into custom hooks

2. **State Management**
   - Use local state for component-specific data
   - Use context for cross-component state
   - Keep state updates immutable

### Documentation

1. **Code Comments**
   ```typescript
   /**
    * Processes a task through the AI pipeline.
    * @param task The task to process
    * @returns Promise resolving when task is complete
    * @throws {AgentWorkbookError} If task processing fails
    */
   async function processTask(task: Task): Promise<void> {
       // Implementation
   }
   ```

2. **README Updates**
   - Update README.md for user-facing changes
   - Update API documentation for new APIs
   - Add examples for new features

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn run watch-tests

# Run linter
yarn lint
```

### Writing Tests

1. **Unit Tests** (in `test/unit/`)
   ```typescript
   import { expect } from 'chai';
   import { YourClass } from '../src/yourClass';
   
   describe('YourClass', () => {
       it('should do something', () => {
           const instance = new YourClass();
           const result = instance.method();
           expect(result).to.equal(expectedValue);
       });
   });
   ```

2. **Integration Tests** (in `test/integration/`)
   ```typescript
   import * as vscode from 'vscode';
   import { expect } from 'chai';
   
   describe('Feature Integration', () => {
       it('should work end-to-end', async () => {
           // Test complete workflows
       });
   });
   ```

### Test Guidelines

- Write tests for all new functionality
- Maintain test coverage above 80%
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies

## Submitting Changes

### Pre-submission Checklist

- [ ] Code follows our standards
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

### Pull Request Process

1. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Provide a detailed description

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   
   ## Screenshots (if applicable)
   Add screenshots for UI changes
   ```

3. **Review Process**
   - Address reviewer feedback promptly
   - Keep PR focused on a single concern
   - Ensure CI checks pass

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/tool changes

**Example:**
```
feat(tasks): add priority support for task queue

- Add priority property to Task class
- Sort queue by priority
- Update UI to show priority indicators

Closes #123
```

## Release Process

### Version Numbering

We follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Steps

1. **Update Version**
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG.md**
   - Add release date
   - List all changes
   - Credit contributors

3. **Build and Package**
   ```bash
   yarn run package
   yarn run package:vsce
   ```

4. **Create GitHub Release**
   - Tag the version
   - Upload .vsix file
   - Copy changelog entry

## Getting Help

### Resources

- [Project Documentation](./docs/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [React Documentation](https://react.dev/)

### Communication

- **Issues**: Use GitHub issues for bugs and features
- **Discussions**: Use GitHub discussions for questions
- **Pull Requests**: For code contributions

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Follow the project's code of conduct

## Advanced Topics

### Debugging

1. **Extension Host Debugging**
   - Set breakpoints in TypeScript files
   - Use VS Code's debugger
   - Check Debug Console for logs

2. **Renderer Debugging**
   - Open Developer Tools in the host VS Code
   - Use React Developer Tools
   - Check console for errors

### Performance Optimization

1. **Lazy Loading**
   - Defer loading of heavy modules
   - Use dynamic imports
   - Implement code splitting

2. **Memory Management**
   - Clean up event listeners
   - Dispose of resources properly
   - Monitor task queue size

### Security Considerations

1. **API Keys**
   - Never commit API keys
   - Use VS Code's secret storage
   - Validate all inputs

2. **Code Execution**
   - Sanitize user inputs
   - Use sandboxed environments
   - Implement timeouts

Thank you for contributing to AgentWorkbook! Your efforts help make this extension better for everyone.