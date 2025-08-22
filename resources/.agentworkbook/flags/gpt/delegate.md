# --delegate Flag: Sub-Agent Task Delegation

**Role**: Sub-Agent Coordination Specialist - Enable intelligent task delegation for parallel processing optimization

**Objective**: Automatically distribute workload across specialized sub-agents to achieve 40-70% time savings for suitable operations while maintaining quality and coordination.

## Core Functionality

**Flag Syntax**: `--delegate [files|folders|auto]`

**Delegation Strategies**:
- **files**: Delegate individual file analysis to specialized sub-agents
- **folders**: Delegate directory-level analysis to sub-agents with folder expertise
- **auto**: Intelligently detect optimal delegation strategy based on scope and complexity

**Auto-Activation Triggers**:
- Directory count >7 directories detected
- File count >50 files identified 
- Operation complexity score >0.8
- Multi-domain operations requiring specialized knowledge

## Delegation Strategy Selection

### Files Strategy (`--delegate files`)
**When to Use**:
- Individual file analysis or modification needed
- Files require different specialized skills (frontend vs backend vs config)
- Parallel processing of heterogeneous file types
- Fine-grained analysis with specific file-level expertise

**Sub-Agent Assignment Logic**:
1. **File Type Analysis**: Categorize files by extension and content patterns
2. **Expertise Mapping**: Match file types to specialized personas
3. **Dependency Analysis**: Identify cross-file dependencies for coordination
4. **Load Balancing**: Distribute files evenly across available sub-agents

**Example Workflow**:
```
Input: React component analysis across 25 .tsx files
Sub-Agent 1 (Frontend): components/ui/*.tsx (8 files)
Sub-Agent 2 (Frontend): components/forms/*.tsx (6 files)
Sub-Agent 3 (Frontend): pages/*.tsx (7 files)
Sub-Agent 4 (Frontend): hooks/*.tsx (4 files)
Coordination: Dependency analysis and integration validation
```

### Folders Strategy (`--delegate folders`)
**When to Use**:
- Directory-level analysis or operations needed
- Logical separation by architectural boundaries
- Module or package-level modifications
- Hierarchical system understanding required

**Sub-Agent Assignment Logic**:
1. **Directory Structure Analysis**: Map folder hierarchy and relationships
2. **Domain Identification**: Identify functional domains per directory
3. **Scope Definition**: Define clear boundaries and interfaces between folders
4. **Coordination Planning**: Plan integration and cross-folder validation

**Example Workflow**:
```
Input: System-wide security audit across microservice architecture
Sub-Agent 1 (Security): /auth-service (authentication, authorization)
Sub-Agent 2 (Security): /api-gateway (routing, rate limiting, validation)
Sub-Agent 3 (Security): /user-service (data privacy, access control)
Sub-Agent 4 (Security): /shared/security (common security utilities)
Coordination: Cross-service security policy validation
```

### Auto Strategy (`--delegate auto`)
**When to Use**:
- Complex projects with mixed requirements
- Uncertain optimal delegation approach
- Dynamic workload requiring adaptive coordination
- Multi-phase operations with evolving needs

**Intelligence Algorithm**:
1. **Scope Analysis**: Evaluate file count, directory depth, operation complexity
2. **Pattern Recognition**: Identify predominant patterns (file-focused vs folder-focused)
3. **Optimization Calculation**: Compare estimated efficiency of different strategies
4. **Dynamic Selection**: Choose optimal strategy with fallback options
5. **Adaptive Refinement**: Adjust strategy based on intermediate results

**Decision Matrix**:
```
File-heavy (files > folders * 5) → files strategy
Folder-heavy (folders > 5 AND files < folders * 8) → folders strategy  
Mixed workload (complex dependencies) → hybrid approach
Uncertain scope → progressive delegation with monitoring
```

## Sub-Agent Coordination Patterns

### Boomerang Task Pattern Integration
**Task Creation Phase**:
1. **Master Task**: Create overarching coordination task
2. **Sub-Tasks**: Generate specialized sub-tasks for each sub-agent
3. **Dependencies**: Define task dependencies and handoff points
4. **Validation**: Establish validation criteria for sub-task completion

**Task Execution Phase**:
1. **Parallel Launch**: Initialize all eligible sub-agents simultaneously
2. **Progress Monitoring**: Track sub-agent progress and resource usage
3. **Dependency Management**: Coordinate dependent task execution order
4. **Quality Gates**: Validate sub-agent outputs before integration

**Integration Phase**:
1. **Result Aggregation**: Collect and normalize sub-agent outputs
2. **Consistency Validation**: Verify consistency across sub-agent results
3. **Conflict Resolution**: Resolve any conflicting recommendations
4. **Final Synthesis**: Integrate results into cohesive final output

### Communication Protocols
**Sub-Agent Coordination Messages**:
- **TASK_START**: Sub-agent initialization with specific scope and constraints
- **PROGRESS_UPDATE**: Regular progress reports with completion percentage
- **DEPENDENCY_REQUEST**: Request for dependent task completion or data
- **QUALITY_CHECK**: Validation request for intermediate results  
- **TASK_COMPLETE**: Completion notification with final results and artifacts
- **ERROR_ESCALATION**: Error reporting requiring coordinator intervention

**Error Handling Patterns**:
- **Sub-Agent Failure**: Automatic retry with different sub-agent or fallback to single-agent
- **Resource Exhaustion**: Graceful degradation with priority-based task completion
- **Dependency Deadlock**: Coordinator intervention with alternative task ordering
- **Quality Failure**: Re-delegation with additional context and constraints

## Performance Optimization

### Resource Management
**Memory Optimization**:
- Limit concurrent sub-agents based on available system resources
- Implement result streaming for large file operations
- Use lazy loading for non-critical analysis results
- Garbage collection coordination across sub-agents

**Token Efficiency**:
- Compress inter-sub-agent communication
- Cache common analysis patterns and results
- Minimize context duplication across sub-agents
- Use symbolic references for shared data structures

**Time Management**:
- Parallel execution of independent sub-tasks
- Pipeline coordination for dependent operations
- Early termination for quality failures
- Progressive disclosure of results for user feedback

### Quality Assurance
**Validation Framework**:
1. **Individual Validation**: Each sub-agent validates own work
2. **Cross-Validation**: Sub-agents validate related work from others
3. **Coordinator Validation**: Master coordinator performs integration validation
4. **User Validation**: Optional user review points for critical operations

**Quality Metrics**:
- **Consistency Score**: Measure agreement across sub-agents (target: >85%)
- **Completeness Score**: Validate all requirements addressed (target: 100%)
- **Efficiency Score**: Measure time savings vs quality trade-off (target: >40%)
- **Integration Score**: Successful integration of sub-agent results (target: >90%)

## Integration Examples

### Example 1: Large Codebase Analysis
```
Command: /analyze --delegate auto --scope project
Detection: 150 files across 12 directories, complexity: 0.85
Strategy: Auto → Hybrid (folders for architecture, files for implementation)

Sub-Agent 1 (Architect): /src/core → System architecture analysis
Sub-Agent 2 (Frontend): /src/components → UI component analysis  
Sub-Agent 3 (Backend): /src/api → API endpoint analysis
Sub-Agent 4 (Analyzer): Individual config files → Configuration analysis
Coordinator: Integration analysis, dependency mapping, recommendations
```

### Example 2: Security Audit
```
Command: /analyze --focus security --delegate folders
Detection: 8 service directories, security-focused operation
Strategy: Folders → Directory-level security specialists

Sub-Agent 1 (Security): /auth-service → Authentication security
Sub-Agent 2 (Security): /payment-service → Financial security
Sub-Agent 3 (Security): /user-service → Privacy and data protection
Sub-Agent 4 (Security): /shared → Common security utilities
Coordinator: Cross-service security policy validation, threat modeling
```

### Example 3: Performance Optimization
```
Command: /improve --focus performance --delegate files
Detection: 45 performance-critical files identified
Strategy: Files → File-level performance specialists

Sub-Agent 1 (Performance): Database queries → Query optimization
Sub-Agent 2 (Performance): API endpoints → Response time optimization
Sub-Agent 3 (Performance): Frontend components → Rendering optimization
Sub-Agent 4 (Performance): Background jobs → Processing optimization
Coordinator: System-wide performance validation, bottleneck analysis
```

## Output Format

**Delegation Report Structure**:
```markdown
## Sub-Agent Delegation Report

**Strategy Selected**: [files|folders|auto → resolved_strategy]
**Sub-Agents Deployed**: [count] agents with [specializations]
**Performance Metrics**: [time_saved]% reduction, [quality_score]/100 quality
**Coordination Points**: [dependency_count] dependencies managed

### Sub-Agent Results:
#### Sub-Agent 1 ([persona]): [scope]
- **Tasks Completed**: [task_list]
- **Key Findings**: [insights]
- **Recommendations**: [actions]

#### Sub-Agent 2 ([persona]): [scope]
[similar format]

### Integration Analysis:
- **Consistency Validation**: [score]% agreement across agents
- **Dependency Resolution**: [resolved_count]/[total_count] dependencies
- **Final Recommendations**: [synthesized_recommendations]
```

**Boomerang Integration**:
- All sub-agent tasks automatically tracked in TodoWrite system
- Parent coordination task manages all sub-task dependencies
- Progress updates reflect both individual and aggregate completion
- Quality gates ensure no sub-task marked complete without validation
- Final integration task validates entire delegation workflow success