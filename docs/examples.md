# AgentWorkbook Examples & Usage Guide

## Getting Started

### Basic Task Creation

The simplest way to create a task is to write a prompt in a notebook cell:

```
Write a Python function that calculates the factorial of a number
```

### Choosing AI Provider

AgentWorkbook supports both RooCode and VS Code Copilot:

```python
# Use RooCode (default)
tasks = awb.create_tasks(["Generate a REST API"], mode="code")

# Use VS Code Copilot
tasks = awb.create_tasks(["Generate a REST API"], mode="code", client="copilot")

# Multiple tasks with specific client
tasks = awb.create_tasks([
    "Create user model",
    "Implement CRUD operations",
    "Add authentication middleware"
], mode="code", client="copilot")

# Specify in YAML frontmatter
---
mode: code
client: copilot
---
Create a user authentication system
```

### Waiting for Task Completion

```python
import agentworkbook as awb
import asyncio

# Create and submit tasks
tasks = awb.create_tasks([
    "Create a data processing pipeline --python --async",
    "Write comprehensive tests --testing:unit --coverage"
], mode="code", client="roo")

# Submit tasks
awb.submit_tasks(task_ids=[t.id for t in tasks])

# Method 1: Wait for all tasks
results = await awb.wait_for_tasks(tasks)
for task, result in zip(tasks, results):
    print(f"Task {task.id} completed with status: {task.status}")

# Method 2: Wait for specific task with timeout
try:
    result = await awb.wait_for_task(tasks[0], timeout=600)  # 10 minutes
    print(f"Task completed: {result}")
except TimeoutError:
    print("Task exceeded timeout")
    awb.cancel_task(tasks[0].id)

# Method 3: Poll task status
async def monitor_task(task):
    while task.status in ["prepared", "queued", "running"]:
        print(f"Task {task.id} status: {task.status}")
        await asyncio.sleep(2)
    return task.status

final_status = await monitor_task(tasks[0])

# Method 4: Wait with callback
async def on_task_update(task):
    print(f"Task {task.id} updated: {task.status}")
    if task.status == "asking":
        # Handle user input request
        response = input(task.question)
        awb.respond_to_task(task.id, response)

# Monitor with callback
await awb.wait_for_task(tasks[0], callback=on_task_update)
```

### Using Flags and Metadata

Add YAML frontmatter to configure task behavior:

```yaml
---
mode: code
flags:
  - verbose
  - python
timeout: 120
---
Create a REST API endpoint for user authentication using Flask
```

### Using Multiple Inline Flags

Combine multiple flags in your prompts to layer different instructions:

```
# Basic multi-flag usage
Create a web scraper --python --async --error-handling --logging

# Mix flag types
Build a dashboard --frontend:react:component --charts:d3 --responsive --accessible --testing:visual

# Complex multi-flag with parameters
Implement payment system --backend:api:rest --payment:stripe(USD, subscription) --auth:jwt --testing:integration --monitoring:sentry(production) --secure --pci-compliant
```

## Common Use Cases

### 1. Code Generation Tasks

#### Python Function with Tests
```yaml
---
mode: code
flags:
  - tests
  - documentation
---
Write a Python class for managing a shopping cart with methods for:
- Adding items
- Removing items
- Calculating total
- Applying discounts
Include unit tests and docstrings
```

#### React Component
```yaml
---
mode: code
flags:
  - typescript
  - react
---
Create a React component for a searchable dropdown with:
- Async data loading
- Keyboard navigation
- Accessibility support
- TypeScript interfaces
```

### 2. Data Analysis Tasks

#### CSV Processing
```yaml
---
mode: code
flags:
  - python
  - pandas
---
Load the sales_data.csv file and:
1. Clean missing values
2. Calculate monthly revenue trends
3. Create a visualization showing top products
4. Export summary statistics
```

#### SQL Query Generation
```yaml
---
mode: code
flags:
  - sql
  - explain
---
Write an optimized SQL query to find customers who:
- Made purchases in the last 30 days
- Have a lifetime value > $1000
- Haven't opened recent emails
Include query explanation
```

### 3. Debugging and Troubleshooting

#### Bug Investigation
```yaml
---
mode: analyze
flags:
  - debug
  - verbose
---
The user authentication is failing intermittently. 
Check the auth_service.py module and identify potential race conditions or timing issues.
```

#### Performance Analysis
```yaml
---
mode: analyze
flags:
  - performance
  - profile
---
Analyze the data_processor.py script for performance bottlenecks.
Suggest optimizations for functions taking > 100ms.
```

### 4. Documentation Tasks

#### API Documentation
```yaml
---
mode: documentation
flags:
  - openapi
  - examples
---
Generate OpenAPI documentation for the user service endpoints in routes/user.py
Include request/response examples and error codes
```

#### README Generation
```yaml
---
mode: documentation
flags:
  - markdown
  - comprehensive
---
Create a README.md for this project including:
- Project overview
- Installation instructions
- Usage examples
- API reference
- Contributing guidelines
```

### 5. Refactoring Tasks

#### Code Modernization
```yaml
---
mode: refactor
flags:
  - modern
  - type-hints
---
Refactor the legacy_utils.py file to:
- Use modern Python 3.10+ syntax
- Add type hints
- Replace deprecated functions
- Improve error handling
```

## Working with Hooks

### Task Lifecycle Hooks

Execute custom scripts at different stages of task execution:

```yaml
---
mode: code
hooks:
  onstart: "echo 'Starting code generation task...'"
  oncomplete: "npm run lint && npm test"
  onerror: "git checkout -- ."
---
Generate a new API endpoint for product search
```

### Environment Setup Hooks

Prepare the environment before task execution:

```yaml
---
mode: code
hooks:
  onstart: |
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
---
Implement the data migration script
```

## Python Cell Examples

### Data Visualization

```python
# Cell 1: Import libraries
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Cell 2: Load and explore data
df = pd.read_csv('data/sales.csv')
df.head()
df.info()

# Cell 3: Create visualization
plt.figure(figsize=(10, 6))
sns.lineplot(data=df, x='date', y='revenue')
plt.title('Revenue Trend Over Time')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()
```

### Interactive Analysis

```python
# Cell 1: Define analysis functions
def analyze_customer_segments(df):
    segments = df.groupby('segment').agg({
        'revenue': ['sum', 'mean'],
        'customer_id': 'count'
    })
    return segments

# Cell 2: Run analysis
results = analyze_customer_segments(customer_df)
print(results)

# Cell 3: Export results
results.to_excel('segment_analysis.xlsx')
```

## Template Usage

### Inserting Code Templates

1. Click the template button in the notebook toolbar
2. Select a category (e.g., "Python Patterns", "API Endpoints")
3. Choose a specific template
4. Customize the inserted code

### Common Templates

#### FastAPI Endpoint
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class ItemModel(BaseModel):
    id: int
    name: str
    price: float
    description: Optional[str] = None

@router.get("/items/{item_id}", response_model=ItemModel)
async def get_item(item_id: int):
    # TODO: Implement database query
    pass

@router.post("/items", response_model=ItemModel)
async def create_item(item: ItemModel):
    # TODO: Implement item creation
    pass
```

#### Data Processing Pipeline
```python
import pandas as pd
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class DataPipeline:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
    def extract(self, source: str) -> pd.DataFrame:
        """Extract data from source"""
        logger.info(f"Extracting data from {source}")
        # TODO: Implement extraction logic
        pass
        
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform the data"""
        logger.info("Transforming data")
        # TODO: Implement transformation logic
        pass
        
    def load(self, df: pd.DataFrame, destination: str) -> None:
        """Load data to destination"""
        logger.info(f"Loading data to {destination}")
        # TODO: Implement loading logic
        pass
```

## Advanced Patterns

### Client Selection Strategies

#### Project-Based Client Selection
```python
# Use Copilot for quick code generation
ui_tasks = awb.create_tasks([
    "Create React button component",
    "Add hover animations",
    "Make it responsive"
], mode="code", client="copilot")

# Use RooCode for complex reasoning
architecture_tasks = awb.create_tasks([
    "Design microservices architecture --think --cs:architecture",
    "Plan database schema with relationships",
    "Create API contract specifications"
], mode="code", client="roo")

# Submit and wait for both sets
awb.submit_tasks(task_ids=[t.id for t in ui_tasks + architecture_tasks])
all_results = await awb.wait_for_tasks(ui_tasks + architecture_tasks)
```

#### Mixed Client Workflow
```python
# Initial implementation with Copilot
impl_task = awb.create_tasks(["Implement quick sort algorithm"], 
                            mode="code", client="copilot")[0]
awb.submit_tasks([impl_task.id])
impl_result = await awb.wait_for_task(impl_task)

# Review and optimize with RooCode
review_task = awb.create_tasks(
    [f"Review and optimize this code for performance:\n{impl_result}"], 
    mode="code", 
    client="roo"
)[0]
awb.submit_tasks([review_task.id])
optimized_result = await awb.wait_for_task(review_task)
```

### Parallel Task Execution

Create multiple related tasks that can run in parallel:

```yaml
---
mode: code
flags:
  - parallel
  - independent
---
Task 1: Create user authentication module
```

```yaml
---
mode: code
flags:
  - parallel
  - independent
---
Task 2: Create product catalog module
```

```yaml
---
mode: code
flags:
  - parallel
  - independent
---
Task 3: Create order management module
```

### Chained Tasks

Create tasks that depend on previous results:

```yaml
---
mode: analyze
flags:
  - chain-start
---
Analyze the current database schema and identify optimization opportunities
```

```yaml
---
mode: code
flags:
  - chain-continue
  - use-previous
---
Based on the analysis above, generate SQL migration scripts
```

### Batch Processing

Process multiple files or items:

```yaml
---
mode: code
flags:
  - batch
  - files: "src/**/*.py"
---
Add type hints to all Python files in the src directory
```

## Text-to-Speech Examples

### Reading Analysis Results

```yaml
---
mode: analyze
flags:
  - voice-output
  - summary
---
Analyze the project structure and provide a verbal summary of:
- Main components
- Dependencies
- Potential issues
```

### Code Review Narration

```yaml
---
mode: review
flags:
  - voice-output
  - detailed
---
Review the changes in the last commit and explain:
- What was changed
- Why it was changed
- Potential impacts
```

## Best Practices

### 1. Clear and Specific Prompts
```yaml
# Good
Create a Python function that validates email addresses using regex, 
handles common edge cases, and returns detailed error messages

# Less effective
Make an email validator
```

### 2. Use Appropriate Modes
- `code`: For generating new code
- `analyze`: For understanding existing code
- `refactor`: For improving code structure
- `documentation`: For creating docs
- `debug`: For troubleshooting issues

### 3. Leverage Flags Effectively
```yaml
---
mode: code
flags:
  - tests          # Include unit tests
  - types          # Add type annotations
  - docs           # Generate docstrings
  - error-handling # Robust error handling
  - logging        # Add logging statements
---
```

### 4. Organize Tasks Logically
- Group related tasks together
- Use clear task descriptions
- Archive completed tasks regularly
- Use task priorities effectively

### 5. Monitor Task Performance
- Check task execution times
- Review AI responses for accuracy
- Validate generated code
- Use hooks for automated testing

## Troubleshooting Common Issues

### Task Stuck in Queue
```yaml
---
mode: debug
timeout: 60  # Set shorter timeout
flags:
  - verbose
  - trace
---
Check why previous task is not completing
```

### Python Execution Errors
```python
# Cell 1: Debug Python environment
import sys
print(f"Python version: {sys.version}")
print(f"Available modules: {list(sys.modules.keys())[:10]}")

# Cell 2: Test basic functionality
try:
    import pandas as pd
    print("Pandas imported successfully")
except ImportError as e:
    print(f"Import error: {e}")
```

### Memory Issues
```yaml
---
mode: code
flags:
  - memory-efficient
  - streaming
---
Process large CSV file without loading entire dataset into memory
```

### Complete Workflow Example

Here's a complete example showing client selection, task creation, and waiting:

```python
import agentworkbook as awb
import asyncio

async def build_feature():
    # 1. Design phase with RooCode (better at architecture)
    design_tasks = awb.create_tasks([
        "Design a real-time chat system architecture --think --architecture:microservices",
        "Create database schema for chat messages --db:postgres"
    ], mode="code", client="roo")
    
    # 2. Implementation with Copilot (faster for boilerplate)
    impl_prompts = [
        "Implement WebSocket server for chat",
        "Create message queue handler",
        "Build user authentication service"
    ]
    impl_tasks = awb.create_tasks(impl_prompts, mode="code", client="copilot")
    
    # 3. Submit all tasks
    all_tasks = design_tasks + impl_tasks
    awb.submit_tasks(task_ids=[t.id for t in all_tasks])
    
    # 4. Wait for design tasks first (they inform implementation)
    design_results = await awb.wait_for_tasks(design_tasks)
    print("Design phase completed")
    
    # 5. Wait for implementation with progress monitoring
    for task in impl_tasks:
        print(f"Waiting for: {task.prompt[:50]}...")
        try:
            result = await awb.wait_for_task(task, timeout=300)
            print(f"✓ Completed: {task.id}")
        except TimeoutError:
            print(f"✗ Timed out: {task.id}")
            awb.cancel_task(task.id)
    
    # 6. Testing phase with RooCode (better at test scenarios)
    test_task = awb.create_tasks([
        "Create comprehensive test suite for the chat system --testing:e2e --testing:unit"
    ], mode="code", client="roo")[0]
    
    awb.submit_tasks([test_task.id])
    test_result = await awb.wait_for_task(test_task)
    
    return {
        "design": design_results,
        "implementation": [t.conversation for t in impl_tasks if t.status == "completed"],
        "tests": test_result
    }

# Run the workflow
result = asyncio.run(build_feature())
```

Remember: The more specific and detailed your prompts, the better the results!