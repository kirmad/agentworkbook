# --concurrency Flag: Sub-Agent Concurrency Control

**Role**: Resource Management Specialist - Control maximum concurrent sub-agents and tasks to optimize performance while preventing resource exhaustion

**Objective**: Dynamically allocate computational resources across concurrent sub-agents based on system capacity, task complexity, and operational requirements to maximize throughput while maintaining system stability.

## Core Functionality

**Flag Syntax**: `--concurrency [n]`

**Parameters**:
- **n**: Maximum concurrent sub-agents (default: 7, range: 1-15)
- **auto**: Dynamic allocation based on system resources and complexity
- **conservative**: Safe resource allocation for constrained environments
- **aggressive**: Maximum resource utilization for high-performance scenarios

**Auto-Detection Logic**:
- System resource assessment (CPU cores, memory, network capacity)
- Task complexity scoring and resource requirement estimation
- Historical performance data and success rates
- Current system load and available capacity

## Concurrency Management Strategies

### Dynamic Resource Allocation

**System Resource Assessment**:
1. **CPU Capacity**: Detect available CPU cores and current utilization
2. **Memory Analysis**: Assess available RAM and memory pressure indicators  
3. **Network Bandwidth**: Measure available network capacity for API calls
4. **Token Budget**: Calculate available token allocation across agents
5. **I/O Capacity**: Evaluate file system and database operation limits

**Intelligent Scaling Algorithm**:
```
Base Concurrency = min(7, available_cpu_cores - 1)
Memory Factor = available_memory_gb / estimated_memory_per_agent
Complexity Factor = 1.0 / (task_complexity_score + 0.1)
Load Factor = 1.0 / (current_system_load + 0.1)

Optimal Concurrency = Base × Memory Factor × Complexity Factor × Load Factor
Final Concurrency = clamp(Optimal Concurrency, 1, user_specified_max)
```

**Performance Monitoring**:
- Real-time resource utilization tracking across all sub-agents
- Response time monitoring with automatic scaling adjustments
- Error rate tracking with degradation prevention
- Quality score monitoring to prevent performance-quality trade-offs

### Concurrency Level Configurations

#### Conservative Mode (`--concurrency conservative`)
**Configuration**: 1-3 concurrent sub-agents maximum
**Use Cases**:
- Resource-constrained environments (low memory/CPU)
- Production systems with stability requirements
- Complex operations requiring careful coordination
- Operations with high error sensitivity

**Resource Allocation**:
- CPU Usage: <50% utilization target
- Memory Usage: <60% of available memory
- Token Allocation: Conservative budgeting with safety margin
- Error Tolerance: Maximum stability, fail-safe approach

**Quality Guarantees**:
- Enhanced error checking and validation
- Reduced risk of resource exhaustion
- Higher coordination accuracy
- Better error recovery capabilities

#### Standard Mode (`--concurrency [n]` where n=4-7)
**Configuration**: 4-7 concurrent sub-agents (default: 7)
**Use Cases**:
- Typical development operations
- Balanced performance and stability requirements
- Standard hardware configurations
- Most common operational scenarios

**Resource Allocation**:
- CPU Usage: <70% utilization target
- Memory Usage: <75% of available memory
- Token Allocation: Balanced distribution across agents
- Error Tolerance: Standard recovery procedures

**Performance Characteristics**:
- Optimal balance of speed and quality
- Reasonable resource utilization
- Good error handling and recovery
- Suitable for most workloads

#### Aggressive Mode (`--concurrency aggressive`)
**Configuration**: 8-15 concurrent sub-agents maximum
**Use Cases**:
- High-performance hardware environments
- Time-critical operations requiring maximum speed
- Large-scale analysis with parallel processing capability
- Development environments with generous resource allocation

**Resource Allocation**:
- CPU Usage: <85% utilization target
- Memory Usage: <85% of available memory
- Token Allocation: Maximum utilization with careful monitoring
- Error Tolerance: Fast recovery with retry mechanisms

**Performance Optimizations**:
- Maximum parallel processing
- Aggressive resource utilization
- Fast failure detection and recovery
- Optimized inter-agent communication

### Task Complexity Adjustment

**Complexity Scoring Algorithm**:
```
Task Complexity Factors:
- File Count: log2(file_count) * 0.2
- Directory Depth: directory_depth * 0.1  
- Operation Types: unique_operation_types * 0.15
- Domain Breadth: involved_domains * 0.1
- Dependency Density: cross_references / total_files * 0.25
- Historical Difficulty: avg_completion_time / baseline_time * 0.2

Total Complexity Score = sum(factors) → [0.0, 2.0]
```

**Concurrency Adjustment Based on Complexity**:
- **Low Complexity (0.0-0.5)**: Standard or aggressive concurrency
- **Medium Complexity (0.5-1.0)**: Moderate concurrency with monitoring
- **High Complexity (1.0-1.5)**: Conservative concurrency with coordination
- **Critical Complexity (1.5+)**: Minimal concurrency with maximum validation

**Dynamic Scaling Rules**:
- **Scale Up**: When agents complete faster than expected, resources available
- **Scale Down**: When error rates increase, resource pressure detected
- **Maintain**: When performance metrics within acceptable ranges
- **Emergency**: When system stability threatened, immediate scaling to minimum

## Resource Management Patterns

### Memory Management
**Per-Agent Memory Estimation**:
- Base agent overhead: ~50-100MB per sub-agent instance
- Context storage: ~10-50MB per agent depending on scope
- Working memory: ~20-200MB based on operation complexity
- Shared resources: ~100-500MB for coordination and caching

**Memory Pressure Response**:
1. **Warning Level (75% usage)**: Reduce new agent creation
2. **Critical Level (85% usage)**: Scale down active agents
3. **Emergency Level (95% usage)**: Terminate non-essential agents
4. **Recovery**: Gradually scale up as memory becomes available

**Memory Optimization Techniques**:
- Context sharing between related sub-agents
- Lazy loading of non-critical analysis data
- Result streaming for large operations
- Garbage collection coordination across agents

### CPU Management
**CPU Load Balancing**:
- Monitor per-core utilization across sub-agents
- Distribute CPU-intensive tasks across available cores
- Implement CPU affinity for performance optimization
- Balance I/O-bound vs CPU-bound operations

**CPU Scaling Strategy**:
- **Light Load (<50%)**: Allow maximum configured concurrency
- **Moderate Load (50-70%)**: Scale to optimal efficiency point
- **Heavy Load (70-85%)**: Reduce concurrency to prevent contention
- **Overload (>85%)**: Emergency scaling to prevent system instability

### Network Resource Management
**API Rate Limiting Coordination**:
- Distribute API calls across sub-agents to avoid rate limits
- Implement exponential backoff for failed requests
- Coordinate request timing to maximize throughput
- Monitor and adjust based on external service performance

**Token Budget Management**:
- Dynamic token allocation based on agent needs and progress
- Token pooling with emergency reallocation capability
- Priority-based token distribution for critical operations
- Real-time monitoring of token consumption rates

## Integration with Delegation Patterns

### Delegation Strategy Coordination
**Files Strategy + Concurrency**:
- Distribute files across available concurrent agents
- Balance file complexity across agents for even workload
- Coordinate file dependency resolution across agents
- Scale agents based on file processing performance

**Folders Strategy + Concurrency**:
- Assign folders to agents based on complexity and resources
- Ensure folder-level dependencies managed across agents
- Scale based on folder analysis completion rates
- Coordinate cross-folder integration requirements

**Auto Strategy + Concurrency**:
- Dynamic strategy selection considering concurrency limits
- Adaptive scaling based on emerging workload patterns
- Real-time optimization of delegation and concurrency
- Performance-based strategy and concurrency adjustment

### Quality Assurance Integration
**Validation Scaling**:
- Increase validation rigor as concurrency increases
- Implement cross-agent validation for quality assurance
- Scale validation resources proportionally to agent count
- Monitor quality metrics across concurrency levels

**Error Handling at Scale**:
- Distributed error detection and reporting
- Coordinated error recovery across multiple agents
- Escalation procedures for widespread failures
- Graceful degradation with concurrency reduction

## Performance Metrics and Monitoring

### Key Performance Indicators
**Throughput Metrics**:
- Tasks completed per minute across all agents
- Average task completion time with concurrency scaling
- Resource utilization efficiency ratios
- Quality-adjusted productivity scores

**Resource Utilization Metrics**:
- CPU utilization per agent and total system
- Memory consumption patterns and peak usage
- Token consumption rates and efficiency
- Network bandwidth utilization for API operations

**Quality Assurance Metrics**:
- Error rates across different concurrency levels
- Consistency scores between concurrent agent outputs
- Coordination overhead and synchronization costs
- User satisfaction scores for concurrent operations

### Optimization Feedback Loop
**Performance Learning**:
1. **Data Collection**: Continuous monitoring of performance metrics
2. **Pattern Analysis**: Identify optimal concurrency patterns for different scenarios
3. **Model Updates**: Refine resource allocation algorithms based on historical data
4. **Validation**: Test optimizations against benchmark scenarios
5. **Deployment**: Implement improved algorithms with monitoring

**Adaptive Behavior**:
- Learn optimal concurrency levels for specific project types
- Adjust resource allocation based on user preferences and feedback
- Optimize for different hardware configurations and constraints
- Continuous improvement based on operational experience

## Integration Examples

### Example 1: Large Codebase Analysis
```
Command: /analyze --delegate auto --concurrency aggressive
System Assessment: 16-core CPU, 64GB RAM, high-speed network
Configuration: 12 concurrent sub-agents

Resource Allocation:
- CPU Target: 80% utilization across cores
- Memory Limit: 4GB per agent (48GB total)
- Token Budget: 2K per agent with dynamic reallocation
- Quality Gates: Parallel validation with 2 validation agents

Performance Result: 75% time reduction, 92% quality score
```

### Example 2: Resource-Constrained Environment  
```
Command: /improve --delegate files --concurrency conservative
System Assessment: 4-core CPU, 8GB RAM, moderate network
Configuration: 2 concurrent sub-agents

Resource Allocation:
- CPU Target: 45% utilization to maintain stability
- Memory Limit: 2GB per agent (4GB total)
- Token Budget: 1.5K per agent with careful monitoring
- Quality Gates: Sequential validation to avoid resource contention

Performance Result: 35% time reduction, 96% quality score
```

### Example 3: Auto-Scaling Optimization
```
Command: /build --delegate auto --concurrency auto
System Assessment: Dynamic based on current load
Initial Configuration: 5 agents, scaling based on performance

Dynamic Scaling Timeline:
T+0min: Start with 5 agents, moderate resource usage
T+2min: Performance good, scale up to 8 agents
T+5min: Memory pressure detected, scale down to 6 agents
T+8min: Task complexity reduced, scale up to 7 agents
T+12min: Final coordination, scale down to 3 agents

Performance Result: 60% time reduction, 94% quality score
```

## Output Format

**Concurrency Report Structure**:
```markdown
## Concurrency Management Report

**Configuration**: [n] maximum concurrent agents ([mode])
**Active Agents**: [current_count] of [maximum_count] agents running
**Resource Utilization**: CPU [%], Memory [GB/GB], Tokens [used/budget]
**Performance Metrics**: [completion_time] vs [baseline], [quality_score]/100

### Resource Allocation:
- **Agent 1** ([persona]): CPU [%], Memory [MB], Status [active/idle]
- **Agent 2** ([persona]): CPU [%], Memory [MB], Status [active/idle]
[continue for all active agents]

### Scaling Events:
- **T+[time]**: Scaled [up/down] to [count] agents - Reason: [resource_pressure/performance_opportunity]
- **T+[time]**: [scaling_event] - Impact: [performance_change]

### Performance Analysis:
- **Optimal Concurrency**: [recommended_level] for this workload type
- **Efficiency Score**: [actual_performance/theoretical_maximum]
- **Resource Waste**: [unused_capacity] available for additional work
- **Quality Impact**: [quality_with_concurrency] vs [quality_single_agent]
```

**Boomerang Integration**:
- Concurrency control automatically creates resource management tasks
- Sub-agent scaling events tracked as discrete tasks with status updates
- Resource monitoring tasks ensure continuous optimization
- Performance validation tasks verify concurrency effectiveness
- Integration tasks coordinate results from all concurrent agents