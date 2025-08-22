# AgentWorkbook Build & Release Guide

Complete guide for building, versioning, and publishing the AgentWorkbook VS Code extension.

## 🛠️ Prerequisites

### Required Tools
- **Node.js**: Version 16.0.0 or higher
- **Yarn**: Package manager (recommended over npm)
- **VS Code Extension Manager**: `vsce` (included in devDependencies)
- **Open VSX CLI**: `ovsx` (included in devDependencies)

### Authentication Setup

**VS Code Marketplace (required):**
```bash
# Create Personal Access Token at: https://dev.azure.com/
# Organization: Visual Studio Marketplace Publishers
# Scope: Marketplace (publish)
vsce login <publisher-name>
```

**Open VSX Registry (optional but recommended):**
```bash
# Create account at: https://open-vsx.org/
# Generate access token in user settings
ovsx create-namespace <namespace>  # First time only
```

## 🚀 Build Commands

### Development Build
```bash
# Quick development build
yarn build

# Development build with file watching
yarn watch
```

### Production Build
```bash
# Full production build with tests and linting
yarn build:prod

# Clean build (removes all generated files first)
yarn clean && yarn build:prod
```

### Testing & Quality Checks
```bash
# Run linting
yarn lint

# Run tests
yarn test

# Combined quality checks (used in production builds)
yarn ci:test
```

## 📦 Package Generation

### Create VSIX Package
```bash
# Generate .vsix package file
yarn package:vsce

# The generated file will be: agentworkbook-<version>.vsix
```

### Install Local Package
```bash
# Install the generated .vsix in VS Code
code --install-extension agentworkbook-<version>.vsix
```

## 🔢 Version Management

### Manual Version Updates
```bash
# Patch version (0.0.1 → 0.0.2)
yarn version:patch

# Minor version (0.0.1 → 0.1.0)
yarn version:minor

# Major version (0.0.1 → 1.0.0)
yarn version:major
```

### Automated Release Process

**Patch Release (Bug fixes):**
```bash
yarn release:patch
```
This will:
1. Increment patch version
2. Run production build with tests
3. Generate VSIX package
4. Publish to VS Code Marketplace

**Minor Release (New features):**
```bash
yarn release:minor
```

**Major Release (Breaking changes):**
```bash
yarn release:major
```

## 🚀 Publishing

### VS Code Marketplace Only
```bash
# Publish current version to marketplace
yarn publish:marketplace
```

### Open VSX Registry Only
```bash
# Publish current version to Open VSX
yarn publish:ovsx
```

### Publish to Both Marketplaces
```bash
# Publish to both VS Code Marketplace and Open VSX
yarn publish:all
```

## 🎯 Complete Release Workflow

### Option 1: Quick Release (Manual versioning)
```bash
# 1. Update version manually in package.json
# 2. Build and publish
yarn build:prod
yarn package:vsce
yarn publish:all
```

### Option 2: Automated Release with Git
```bash
# Complete automated release with git tagging
yarn release:full
```
This will:
1. Run production build with all checks
2. Generate VSIX package
3. Commit changes with release message
4. Create git tag with version
5. Push to remote repository with tags
6. Publish to both marketplaces

### Option 3: Specific Version Release
```bash
# For patch release
yarn release:patch

# For minor release  
yarn release:minor

# For major release
yarn release:major
```

## 🔍 CI/CD Integration

### GitHub Actions Example
```yaml
name: Build and Release
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'yarn'
    
    - name: Install dependencies
      run: yarn ci:build
    
    - name: Run tests
      run: yarn ci:test
    
    - name: Package extension
      run: yarn package:vsce
    
    - name: Publish to marketplaces
      run: yarn publish:all
      env:
        VSCE_PAT: ${{ secrets.VSCE_PAT }}
        OVSX_PAT: ${{ secrets.OVSX_PAT }}
```

## 📋 Build Checklist

### Before Release
- [ ] All tests passing (`yarn test`)
- [ ] Linting clean (`yarn lint`)
- [ ] Documentation updated (README.md, CHANGELOG.md)
- [ ] Version number incremented
- [ ] Dependencies up to date
- [ ] Extension tested in development mode

### Release Steps
- [ ] Run production build (`yarn build:prod`)
- [ ] Generate package (`yarn package:vsce`)
- [ ] Test .vsix installation locally
- [ ] Publish to marketplaces (`yarn publish:all`)
- [ ] Verify marketplace listings
- [ ] Create GitHub release with notes

### Post-Release
- [ ] Update development version for next iteration
- [ ] Monitor marketplace metrics
- [ ] Check for user feedback/issues
- [ ] Plan next release features

## 🐛 Troubleshooting

### Common Build Issues

**"Module not found" errors:**
```bash
yarn clean && yarn install && yarn build
```

**Webpack build failures:**
```bash
# Clear webpack cache
rm -rf node_modules/.cache
yarn build
```

**VSIX generation fails:**
```bash
# Check file permissions and paths
yarn clean
yarn build:prod
```

### Publishing Issues

**Authentication failures:**
```bash
# Re-authenticate with marketplace
vsce logout
vsce login <publisher-name>
```

**Package size warnings:**
```bash
# Check bundled files
vsce package --show-details
```

**Version conflicts:**
```bash
# Ensure version is higher than published
npm version patch
```

## 📊 Build Scripts Reference

| Command | Purpose | Environment |
|---------|---------|-------------|
| `yarn build` | Quick development build | Development |
| `yarn build:prod` | Production build with tests | Production |
| `yarn clean` | Remove generated files | Any |
| `yarn version:patch` | Increment patch version | Any |
| `yarn release:patch` | Full patch release | Production |
| `yarn publish:all` | Publish to both marketplaces | Production |
| `yarn release:full` | Complete release with git | Production |
| `yarn ci:build` | CI-optimized build | CI/CD |
| `yarn dev` | Launch in development mode | Development |

---

**Happy building! 🚀**

For questions or issues, check the [GitHub repository](https://github.com/kirmad/agentworkbook) or create an issue.