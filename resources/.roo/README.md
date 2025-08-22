# RooCode Custom Resources

This directory contains RooCode custom modes, slash commands, and custom instructions that can be installed via the AgentWorkbook extension.

## Directory Structure

```
.roo/
├── custom_modes.yaml        # Custom AI mode definitions
├── commands/                # Slash commands (markdown files)
│   ├── review.md           # /review - Code review command
│   ├── api-endpoint.md     # /api-endpoint - API generation
│   ├── test-suite.md       # /test-suite - Test generation
│   ├── security-audit.md   # /security-audit - Security analysis
│   └── refactor.md         # /refactor - Code refactoring
├── rules/                   # Global custom instructions
│   ├── coding-standards.md # General coding guidelines
│   └── testing-practices.md # Testing best practices
├── rules-tech-lead/         # Tech lead mode specific rules
│   └── architecture-guidance.md
├── rules-python-dev/        # Python developer mode rules
│   └── python-best-practices.md
├── rules-security/          # Security specialist mode rules
│   └── security-guidelines.md
└── README.md               # This documentation
```

## Installation via Extension

Use VS Code Command Palette (`Ctrl+Shift+P`) and search for:

- **Install RooCode Resources** - Install all resources
- **Install RooCode Modes** - Install custom modes only
- **Install RooCode Commands** - Install slash commands only  
- **Install RooCode Rules** - Install custom instructions only

## Custom Modes

Five specialized modes are included:

### 🏗️ Tech Lead
- **Slug**: `tech-lead`
- **Focus**: Architecture decisions, code reviews, technical guidance
- **Tools**: Full access (read, edit, command, mcp)

### 🐍 Python Developer
- **Slug**: `python-dev`
- **Focus**: Python development with PEP 8 compliance
- **Tools**: Code editing and development tools

### 🛡️ Security Specialist
- **Slug**: `security`
- **Focus**: Security audits, vulnerability assessment
- **Tools**: Full access for security analysis

### 📝 Documentation Writer
- **Slug**: `docs-writer`
- **Focus**: Technical writing and documentation
- **Tools**: Limited to documentation files (*.md, *.mdx, *.rst, *.txt)

### ⚙️ DevOps Engineer
- **Slug**: `devops`
- **Focus**: Infrastructure automation, CI/CD, deployment
- **Tools**: Full access for infrastructure tasks

## Slash Commands

Pre-built commands for common development tasks:

- **/review** - Comprehensive code review with security checks
- **/api-endpoint** - Generate REST API endpoints with best practices
- **/test-suite** - Create comprehensive test suites
- **/security-audit** - Perform security vulnerability assessment
- **/refactor** - Systematic code refactoring

## Custom Instructions (Rules)

### Global Rules
- **coding-standards.md** - General coding principles and style guidelines
- **testing-practices.md** - Testing methodology and best practices

### Mode-Specific Rules
- **rules-tech-lead/** - Architecture and leadership guidance
- **rules-python-dev/** - Python-specific development practices  
- **rules-security/** - Security guidelines and threat modeling
- Additional mode-specific directories can be added as needed

## Usage After Installation

1. **Activate Custom Mode**: In RooCode, select your desired mode from the mode selector
2. **Use Slash Commands**: Type `/` in RooCode chat to see available commands
3. **Automatic Rule Loading**: Custom instructions are automatically loaded based on active mode

## Customization

### Adding New Modes
1. Edit `custom_modes.yaml` in your workspace `.roo/` directory
2. Add mode-specific rules in `rules-{slug}/` directory
3. Restart RooCode to load new modes

### Creating New Slash Commands
1. Create new `.md` files in `.roo/commands/` directory
2. Use frontmatter for command metadata:
   ```markdown
   ---
   description: Command description
   argument-hint: [expected arguments]
   ---
   Command content here...
   ```

### Adding Custom Instructions
1. Add `.md` files to `.roo/rules/` for global rules
2. Create mode-specific rules in `.roo/rules-{mode-slug}/` directories
3. Rules are loaded alphabetically and recursively

## File Precedence

RooCode loads configurations in this order:
1. Project-level configurations (`.roo/` in workspace)
2. Global configurations (`~/.roo/` in user home)
3. Default RooCode configurations

Project configurations override global ones, allowing team-specific customizations.

## Best Practices

- Keep modes focused on specific roles or domains
- Use descriptive command names and clear documentation
- Organize rules logically by purpose or mode
- Test custom configurations in development projects first
- Document any team-specific customizations