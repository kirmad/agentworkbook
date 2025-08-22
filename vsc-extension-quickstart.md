# Welcome to AgentWorkbook! 🎉

**Thank you for installing AgentWorkbook - AI-Powered Task Manager & Notebook for VS Code!**

AgentWorkbook transforms your development workflow with intelligent task queuing, visual task management, and seamless AI integration using both RooCode and GitHub Copilot.

## 🚀 Quick Start (2 minutes to your first AI task)

### 1. **Install Required Dependency**
AgentWorkbook requires the RooCode extension to function:
- Open Extensions (`Ctrl+Shift+X`)
- Search for "roo-cline" 
- Install "Roo Code" by rooveterinaryinc

### 2. **Create Your First Notebook**
- Open Command Palette (`Ctrl+Shift+P`)
- Type "AgentWorkbook: New notebook"
- A new `.agentworkbook` file opens ready for use!

### 3. **Create Your First AI Task**
```python
import agentworkbook as awb

# Create a simple task
tasks = awb.create_tasks([
    "Create a Python function to validate email addresses"
], mode="code")

# Submit and watch the magic happen
awb.submit_tasks(task_ids=[t.id for t in tasks])
result = await awb.wait_for_task(tasks[0])
```

### 4. **Watch Your Task Queue**
- Look at the bottom of VS Code for the visual task queue
- See real-time status updates as AI processes your request
- Tasks progress through: Prepared → Queued → Running → Completed

## ✨ Key Features You Can Use Right Away

- **🎯 Visual Task Management**: Drag and drop tasks to reorder them
- **🤖 Dual AI Support**: Works with both RooCode and GitHub Copilot
- **🐍 Python Execution**: Run Python code directly in notebooks with Pyodide
- **📝 Smart Flags**: Use hierarchical flags like `--frontend:react:hooks`, `--backend:api:rest`
- **⚙️ Parameterized Flags**: Dynamic templates with `--docs(file.tsx, ComponentName)`
- **📋 Code Templates**: Reusable `.awbscript` files for consistent workflows
- **🎭 Notebook Templates**: Dynamic `.awbtemplate` files with customizable arguments
- **🔗 Shell Integration**: Execute commands with `!syntax` for deterministic checks
- **🎯 Event Hooks**: Python hooks for lifecycle events (onstart, oncomplete, etc.)
- **🔊 Text-to-Speech**: Convert AI responses to speech (optional setup)

## 🛠️ Optional Setup

### Install Additional Resources
Run these commands for enhanced functionality:
- `AgentWorkbook: Install Resources` - Install flags, scripts, and templates
- `AgentWorkbook: Install Flags` - Install the advanced flag system
- `AgentWorkbook: Install Templates` - Install code and notebook templates

### Configure Text-to-Speech (Optional)
1. Go to VS Code Settings (`Ctrl+,`)
2. Search "agentworkbook"
3. Configure TTS provider (ElevenLabs or Azure)
4. Add your API keys

## 🎯 Real-World Use Cases & Examples

### 💼 **Enterprise Development Workflows**

**1. Standardized Feature Development:**
```python
# AI creates the feature, scripts validate compliance
tasks = awb.create_tasks([
    "Implement user authentication API --backend:api:rest --security:jwt --with-tests"
], mode="code", hooks=awb.create_hooks(
    oncomplete=lambda task: !security_scan.py && !run_tests.py
))
```

**2. Full-Stack Feature with Validation:**
```python
# Build complete feature with frontend + backend + validation
tasks = awb.create_tasks([
    "Create user profile feature --fullstack --frontend:react:hooks --backend:node:express --db:schema(users, postgresql)"
], mode="code", hooks=awb.create_hooks(
    oncomplete=lambda task: !lint_check.py && !integration_tests.py && !accessibility_audit.py
))
```

### 🏗️ **Template-Driven Development**

**3. Microservice Creation (Using Templates):**
```python
# Create from pre-defined microservice template
notebook = awb.create_from_template("microservice-starter", {
    "serviceName": "payment-service",
    "database": "postgresql", 
    "apiVersion": "v1",
    "framework": "fastapi"
})
```

**4. Component Library Development:**
```python
# Standardized component creation with design system compliance
tasks = awb.create_tasks([
    "Create Button component --component-lib --docs(src/Button.tsx, Button) --storybook --a11y"
], mode="code", hooks=awb.create_hooks(
    oncomplete=lambda task: !design_tokens_check.py && !storybook_build.py
))
```

### 🔄 **Agentic + Deterministic Workflows**

**5. Code Quality Pipeline:**
```python
# AI writes code, deterministic scripts ensure quality
tasks = awb.create_tasks([
    "Refactor legacy payment processing --think --security:payment --performance"
], mode="code", hooks=awb.create_hooks(
    onstart=lambda task: !backup_original.py,
    oncomplete=lambda task: !run_security_scan.py && !performance_benchmark.py && !code_coverage.py
))
```

**6. Documentation Generation with Validation:**
```python
# AI generates docs, scripts validate completeness
tasks = awb.create_tasks([
    "Generate API documentation --docs:openapi --examples --postman"
], mode="code", hooks=awb.create_hooks(
    oncomplete=lambda task: !validate_openapi.py && !test_examples.py && !check_completeness.py
))
```

## 📋 **Creating Custom Templates**

### **Code Templates (.awbscript files)**

Create reusable code snippets in `.agentworkbook/scripts/`:

**Example: `.agentworkbook/scripts/api/crud-endpoint.awbscript`**
```yaml
name: "CRUD API Endpoint"
description: "Complete CRUD endpoint with validation and tests"
language: "python"
code: |
  # Generate CRUD endpoint for {{entity}}
  Create a FastAPI CRUD endpoint for {{entity}} with:
  - GET /{{entity}}s (list with pagination)
  - GET /{{entity}}s/{id} (single item)
  - POST /{{entity}}s (create)
  - PUT /{{entity}}s/{id} (update) 
  - DELETE /{{entity}}s/{id} (delete)
  
  Include:
  - Pydantic models for validation
  - SQLAlchemy models
  - Error handling with proper HTTP codes
  - Unit tests with pytest
  - OpenAPI documentation
```

**Usage:**
- Click "+" in notebook toolbar → Browse to "api" folder → Select "crud-endpoint"
- Replace `{{entity}}` with actual entity name

### **Notebook Templates (.awbtemplate files)**

Create complete notebook structures in `.agentworkbook/templates/`:

**Example: `.agentworkbook/templates/microservice.awbtemplate`**
```json
{
  "metadata": {
    "title": "Microservice Development Template",
    "description": "Complete microservice with API, database, tests, and deployment"
  },
  "arguments": {
    "serviceName": {
      "type": "string",
      "label": "Service Name",
      "placeholder": "payment-service"
    },
    "database": {
      "type": "select", 
      "label": "Database Type",
      "options": ["postgresql", "mongodb", "mysql"],
      "default": "postgresql"
    },
    "framework": {
      "type": "select",
      "label": "API Framework", 
      "options": ["fastapi", "flask", "django"],
      "default": "fastapi"
    }
  },
  "template": {
    "cells": [
      {
        "kind": "markdown",
        "value": "# {{serviceName}} Microservice\n\nFramework: {{framework}}\nDatabase: {{database}}"
      },
      {
        "kind": "code",
        "language": "python",
        "value": "import agentworkbook as awb\n\n# Setup {{serviceName}} with {{framework}} and {{database}}\ntasks = awb.create_tasks([\n    \"Setup {{framework}} project structure for {{serviceName}} --backend:{{framework}} --db:{{database}}\"\n], mode=\"code\", hooks=awb.create_hooks(\n    oncomplete=lambda task: !setup_database.py --db {{database}}\n))"
      },
      {
        "kind": "code", 
        "language": "python",
        "value": "# API Development\ntasks = awb.create_tasks([\n    \"Create REST API endpoints --api:crud --auth:jwt --docs:openapi\"\n], mode=\"code\", hooks=awb.create_hooks(\n    oncomplete=lambda task: !validate_api.py && !run_tests.py\n))"
      },
      {
        "kind": "code",
        "language": "python", 
        "value": "# Testing & Deployment\ntasks = awb.create_tasks([\n    \"Setup comprehensive testing --testing:integration --coverage:90\"\n], mode=\"code\", hooks=awb.create_hooks(\n    oncomplete=lambda task: !security_scan.py && !performance_test.py\n))"
      }
    ]
  }
}
```

**Usage:**
- Command Palette → "Create notebook from template"
- Select "microservice" → Fill arguments → Get customized notebook

## 🔧 **Advanced Flag System**

### **Hierarchical Flags**
Organize flags by domain and context:

```python
# Frontend Development
"Create dashboard --frontend:react:hooks --state:redux --ui:material --responsive"

# Backend Development  
"Build API --backend:node:express --auth:oauth2 --db:postgresql --cache:redis"

# DevOps & Deployment
"Setup deployment --devops:k8s --monitoring:prometheus --logs:elasticsearch"

# Testing & Quality
"Add tests --testing:unit --testing:integration --coverage:90 --performance"
```

### **Parameterized Flags**
Dynamic templates with runtime parameters:

```python
# Documentation with specific details
"Document the API --docs(src/api.py, Payment API, v2.1) --examples --postman"

# Database operations with schema
"Create migration --db:migration(users, add_email_verification, postgresql)"

# Component with props
"Create component --ui:component(UserCard, user:User, onSelect:Function) --typescript"
```

### **Custom Flag Creation**

Create flags in `.agentworkbook/flags/` with hierarchical structure:

**`.agentworkbook/flags/backend/api/rest.md`:**
```markdown
# REST API Development Guidelines

When building REST APIs, ensure:

## Structure
- Use RESTful resource naming (nouns, not verbs)
- Implement proper HTTP methods (GET, POST, PUT, DELETE)
- Use appropriate HTTP status codes

## Security  
- Implement authentication (JWT recommended)
- Add request validation
- Include CORS headers
- Sanitize inputs

## Documentation
- Generate OpenAPI/Swagger documentation
- Include request/response examples
- Document error responses

## Testing
- Unit tests for business logic
- Integration tests for endpoints
- Load testing for performance

## Example Implementation
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class UserCreate(BaseModel):
    name: str
    email: str

@app.post("/users", response_model=User)
async def create_user(user: UserCreate):
    # Implementation here
    pass
```
```

## 🚀 **Shell Integration for Deterministic Checks**

### **Validation Scripts**
Create deterministic validation scripts:

**`security_scan.py`:**
```python
#!/usr/bin/env python3
import subprocess
import sys

def run_security_scan():
    """Run security vulnerability scan"""
    result = subprocess.run(['bandit', '-r', '.'], capture_output=True)
    if result.returncode != 0:
        print("❌ Security vulnerabilities found!")
        sys.exit(1)
    print("✅ Security scan passed")

if __name__ == "__main__":
    run_security_scan()
```

**`code_quality.py`:**
```python
#!/usr/bin/env python3
import subprocess
import sys

def check_quality():
    """Run code quality checks"""
    checks = [
        (['black', '--check', '.'], "Code formatting"),
        (['flake8', '.'], "Linting"),
        (['mypy', '.'], "Type checking"),
        (['pytest', '--cov=.', '--cov-report=term'], "Test coverage")
    ]
    
    for cmd, description in checks:
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            print(f"❌ {description} failed!")
            sys.exit(1)
        print(f"✅ {description} passed")

if __name__ == "__main__":
    check_quality()
```

### **Event Hooks Integration**
Combine AI creativity with deterministic validation:

```python
import agentworkbook as awb

# AI generates code, scripts ensure quality
tasks = awb.create_tasks([
    "Implement payment processing system --backend:api:payments --security:pci"
], mode="code", hooks=awb.create_hooks(
    onstart=lambda task: print("🚀 Starting payment system implementation..."),
    oncomplete=lambda task: (
        !security_scan.py &&           # Security validation
        !pci_compliance_check.py &&    # PCI DSS compliance  
        !performance_test.py &&        # Load testing
        !integration_test.py &&        # API testing
        !code_quality.py               # Code standards
    )
))

# Submit and let the magic happen
awb.submit_tasks(task_ids=[t.id for t in tasks])
```

## 🎭 **Workflow Examples**

### **Complete Feature Development Pipeline**
```python
# 1. Planning Phase
planning_tasks = awb.create_tasks([
    "Analyze requirements for user notification system --think --architecture"
], mode="analysis")

# 2. Implementation Phase  
impl_tasks = awb.create_tasks([
    "Implement notification system --backend:fastapi --frontend:react --db:postgresql --queue:celery"
], mode="code", hooks=awb.create_hooks(
    oncomplete=lambda task: !run_tests.py && !security_scan.py
))

# 3. Documentation Phase
doc_tasks = awb.create_tasks([
    "Generate comprehensive documentation --docs:api --docs:user --examples"
], mode="documentation", hooks=awb.create_hooks(
    oncomplete=lambda task: !validate_docs.py && !spell_check.py
))

# 4. Deployment Phase
deploy_tasks = awb.create_tasks([
    "Setup production deployment --devops:docker --ci:github --monitoring"  
], mode="deployment", hooks=awb.create_hooks(
    oncomplete=lambda task: !deployment_test.py && !health_check.py
))
```

This powerful combination of agentic AI creativity with deterministic validation ensures both innovation and reliability in your development workflows!

## 📚 Need Help?

- **📖 Full Documentation**: [README.md](https://github.com/kirmad/agentworkbook/blob/main/README.md)
- **🛠️ Installation Guide**: [INSTALL.md](https://github.com/kirmad/agentworkbook/blob/main/INSTALL.md)
- **🐛 Report Issues**: [GitHub Issues](https://github.com/kirmad/agentworkbook/issues)
- **💬 Discussion**: [GitHub Discussions](https://github.com/kirmad/agentworkbook/discussions)

## 🎉 You're All Set!

Start by creating a new notebook and experimenting with AI-powered task management. AgentWorkbook will revolutionize how you approach development workflows!

**Happy coding with AI! 🚀**
