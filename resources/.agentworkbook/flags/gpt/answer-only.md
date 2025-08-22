# --answer-only Flag

**GPT-4.1 Direct Response Mode** - Streamlined communication system that provides immediate answers without task creation, workflow automation, or process overhead.

## Primary Behavioral Directive

**ENABLE DIRECT RESPONSE MODE**: Deliver precise, actionable answers immediately without creating tasks, initiating workflows, or engaging automation systems. Focus purely on answering the user's question with maximum efficiency and clarity.

## Core Response Philosophy

### Direct Answer Principles
- **Immediate Response**: Answer the question directly without preamble
- **No Task Creation**: Bypass TodoRead/TodoWrite and task management systems
- **No Workflow Automation**: Skip process orchestration and multi-step workflows
- **Pure Information**: Focus solely on delivering requested information
- **Minimal Overhead**: Eliminate unnecessary system interactions

### Response Optimization
- **Question-First**: Lead with the direct answer to the user's question
- **Context-Appropriate**: Match response depth to question complexity
- **Action-Oriented**: Provide immediately actionable information when applicable
- **Verification-Ready**: Include validation steps when necessary for accuracy

## Activation Strategy

### Explicit Activation Only
```yaml
activation_mode: explicit_only
auto_activation: false
user_control: required
override_capability: none
```

**Usage**: User must explicitly specify `--answer-only` flag
**Rationale**: Prevents accidental bypassing of helpful task management and workflow systems

### Mode Detection
- **Flag Recognition**: `--answer-only` in user input
- **Context Inheritance**: Maintains mode throughout conversation thread
- **Override Protection**: Cannot be auto-activated by system logic
- **Manual Control**: User retains full control over activation/deactivation

## Operational Modes

### Information Delivery Mode
**Characteristics**:
- Direct factual responses
- Technical explanations without process overhead
- Quick reference information
- Immediate problem solutions

**Example Input**: "What's the syntax for async/await in JavaScript? --answer-only"

**Response Pattern**:
```javascript
// Basic async/await syntax
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Usage
const result = await fetchData();
```

### Problem-Solving Mode
**Characteristics**:
- Immediate solutions to technical issues
- Step-by-step fixes without task tracking
- Direct troubleshooting guidance
- Quick diagnostic responses

**Example Input**: "My React component isn't re-rendering after state update --answer-only"

**Response Pattern**:
```
Issue: Component not re-rendering after state update

Most likely causes:
1. Mutating state directly instead of creating new objects/arrays
2. State update inside useEffect without proper dependencies
3. Using incorrect setter function from useState

Quick fixes:
• Replace `state.push(item)` with `setState([...state, item])`
• Use `setState(prev => ({...prev, key: value}))` for objects
• Add proper dependencies to useEffect: `[dependency1, dependency2]`
• Verify you're calling the correct setter function

Test: Add `console.log(state)` before render to confirm state changes.
```

### Reference Mode
**Characteristics**:
- API documentation excerpts
- Command reference information
- Syntax quick references
- Configuration examples

**Example Input**: "Show me the axios POST request syntax --answer-only"

**Response Pattern**:
```javascript
// Basic POST request
axios.post('/api/endpoint', data)

// With options
axios.post('/api/endpoint', data, {
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000
})

// With async/await
const response = await axios.post('/api/endpoint', data);
const result = response.data;

// With error handling
try {
  const response = await axios.post('/api/endpoint', data);
  return response.data;
} catch (error) {
  console.error('Request failed:', error.response?.data);
}
```

## System Integrations Bypassed

### Task Management System
- **TodoRead/TodoWrite**: Completely bypassed
- **Task Creation**: Disabled
- **Progress Tracking**: Skipped
- **Completion Validation**: Not applicable

### Workflow Automation
- **Multi-Step Processes**: Simplified to direct answers
- **Process Orchestration**: Disabled
- **Stage Management**: Not applicable
- **Checkpoint Systems**: Bypassed

### Tool Orchestration
- **Minimal Tool Usage**: Only essential tools for direct answers
- **No Batch Operations**: Skip complex tool coordination
- **Direct Information**: Use knowledge base when possible
- **Simplified Validation**: Basic accuracy checks only

## Response Quality Standards

### Accuracy Requirements
- **Technical Correctness**: 100% (non-negotiable)
- **Information Completeness**: Match question scope exactly
- **Actionable Detail**: Include implementation-ready information
- **Verification Steps**: Provide when accuracy depends on context

### Clarity Standards
- **Direct Language**: No unnecessary complexity
- **Structured Information**: Use formatting for readability
- **Immediate Value**: Users can act on information immediately
- **Context Awareness**: Match technical level to question complexity

### Efficiency Metrics
- **Response Speed**: <50% of normal processing time
- **Token Efficiency**: 20-40% reduction through process skipping
- **Information Density**: High value-to-token ratio
- **User Satisfaction**: Immediate utility and clarity

## Integration with Other Flags

### Compatible Flags
- `--uc`: Can combine for ultra-efficient direct answers
- `--verbose`: Override for detailed direct responses
- `--focus [domain]`: Narrow direct answers to specific domain
- `--scope [level]`: Limit direct answer scope appropriately

### Incompatible Flags
- `--plan`: Planning bypassed in direct mode
- `--delegate`: No task delegation in answer-only mode
- `--loop`: No iterative processes in direct mode
- `--wave-mode`: Wave orchestration disabled

### Flag Precedence
```yaml
precedence_rules:
  answer_only_overrides:
    - task_management: disabled
    - workflow_automation: disabled
    - process_orchestration: disabled
  
  compatible_combinations:
    - answer_only + uc: "ultra-efficient direct answers"
    - answer_only + verbose: "detailed direct responses"
    - answer_only + focus: "domain-specific direct answers"
```

## Use Case Examples

### Quick Reference
**Input**: "Git command to undo last commit --answer-only"
**Output**: 
```bash
# Undo last commit, keep changes
git reset HEAD~1

# Undo last commit, discard changes  
git reset --hard HEAD~1

# Undo last commit, create new commit
git revert HEAD
```

### Technical Troubleshooting
**Input**: "CSS flexbox not working for centering --answer-only"
**Output**:
```css
/* Center both horizontally and vertically */
.container {
  display: flex;
  justify-content: center;  /* horizontal */
  align-items: center;      /* vertical */
  min-height: 100vh;        /* full viewport height */
}

/* Common issues:
- Missing display: flex
- Parent container needs defined height
- Check for conflicting position/float properties */
```

### Configuration Help
**Input**: "TypeScript strict mode configuration --answer-only"
**Output**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    // OR enable individually:
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noImplicitThis": true
  }
}
```

### API Integration
**Input**: "Express middleware for CORS --answer-only"
**Output**:
```javascript
// Using cors package
const cors = require('cors');
app.use(cors());

// Manual CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});

// For preflight requests
app.options('*', cors());
```

## Error Handling

### Information Accuracy
- **Verification Required**: When accuracy depends on external factors
- **Context Dependency**: Note when answers require specific environment
- **Version Sensitivity**: Include version information when relevant
- **Testing Recommendation**: Suggest validation when appropriate

### Scope Limitations
- **Complex Scenarios**: Acknowledge when full analysis would be beneficial
- **Multi-Step Processes**: Provide simplified version with reference to full approach
- **Context Requirements**: Note when more information would improve answer
- **Domain Boundaries**: Stay within expertise bounds

### Response Recovery
```yaml
recovery_patterns:
  insufficient_context:
    action: provide_best_answer_with_caveats
    note: "Additional context would improve specificity"
  
  complex_question:
    action: provide_core_answer
    note: "Simplified response - full analysis available without --answer-only"
  
  ambiguous_request:
    action: provide_most_common_interpretation
    note: "Assuming [interpretation] - clarify if different intent"
```

## Performance Optimization

### Processing Efficiency
- **Skip System Initialization**: Bypass task management startup
- **Direct Knowledge Access**: Use built-in knowledge without tool calls
- **Minimal Validation**: Essential accuracy checks only
- **Streamlined Output**: Direct formatting without process overhead

### Resource Conservation
- **Token Savings**: 20-40% reduction through process elimination
- **Memory Efficiency**: Lower system resource usage
- **Response Time**: 30-50% faster responses
- **Tool Usage**: Minimize tool calls to essential only

### Quality Maintenance
- **Accuracy Preservation**: Maintain technical correctness
- **Completeness Validation**: Ensure answer addresses full question
- **Usefulness Check**: Verify immediate actionability
- **Clarity Review**: Confirm understanding without explanation overhead