# Agent Workbook Run Scripts

This directory contains custom Python scripts that can be executed using the Agent Workbook script runner.

Scripts are executed using `uv run` for better dependency management, isolation, and performance.

## UV Advantages

- **Fast Execution**: UV is significantly faster than pip for dependency resolution
- **Automatic Dependency Management**: Dependencies listed in script headers are auto-installed
- **Isolation**: Each script runs in its own isolated environment
- **Reproducibility**: Exact dependency versions ensure consistent results
- **No Global Pollution**: Dependencies don't interfere with your system Python

## Usage

Execute scripts from your Agent Workbook notebook using:

```python
import agentworkbook as awb

# Basic usage with string output
result = await awb.run('your_script.py', 'arg1', 'arg2')
print(result)

# With JSON output parsing
data = await awb.run('your_script.py', 'arg1', 'arg2', output_format='json')
print(f"Items found: {len(data['items'])}")
```

## Script Requirements

Your scripts must follow these requirements:

1. **Accept `--out` parameter**: Scripts must accept a `--out <path>` command line argument
2. **Write to output file**: Write results to the file path provided via `--out`
3. **Return proper exit codes**: Return 0 for success, non-zero for failure
4. **Handle arguments properly**: Use `argparse` or similar for argument parsing

## Script Template

### Basic Script (no external dependencies)
```python
#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///
"""
Your script description.
Compatible with uv and uvx.
"""

import argparse
import json
import sys

def main():
    parser = argparse.ArgumentParser(description='Your script description')
    parser.add_argument('input_arg', help='Your input argument')
    parser.add_argument('--option', help='Optional argument')
    parser.add_argument('--out', required=True, help='Output file path')
    
    args = parser.parse_args()
    
    # Your processing logic here
    result = {
        "input": args.input_arg,
        "option": args.option,
        "status": "success"
    }
    
    # Write output (JSON example)
    try:
        with open(args.out, 'w') as f:
            json.dump(result, f, indent=2)
    except Exception as e:
        print(f"Error writing output: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### Script with External Dependencies
```python
#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#     "pandas>=2.0.0",
#     "requests>=2.25.0",
#     "numpy>=1.20.0",
# ]
# ///
"""
Your script with external dependencies.
Compatible with uv and uvx - dependencies are auto-installed.
"""

import argparse
import json
import sys

try:
    import pandas as pd
    import requests
    import numpy as np
    DEPS_AVAILABLE = True
except ImportError as e:
    print(f"Dependencies not available: {e}", file=sys.stderr)
    DEPS_AVAILABLE = False

def main():
    if not DEPS_AVAILABLE:
        print("Required dependencies not installed", file=sys.stderr)
        sys.exit(1)
    
    # Your script logic here using pandas, requests, numpy, etc.
    # ...

if __name__ == '__main__':
    main()
```

## Output Formats

### String Output (default)
- Use `output_format='string'` or omit the parameter
- Write plain text to the output file
- Agent Workbook returns the content as a string

### JSON Output
- Use `output_format='json'`
- Write valid JSON to the output file
- Agent Workbook parses and returns the JSON object

## Example Scripts

This directory includes example scripts:

- `hello.py` - Simple greeting script with JSON/text output options
- `test_json.py` - Demonstrates JSON output with various arguments
- `test_string.py` - Demonstrates string output with text processing
- `test_error.py` - Demonstrates error handling scenarios
- `example_usage.py` - Example data processing with different operations
- `data_analysis.py` - Advanced example with pandas and numpy dependencies

## Best Practices

1. **Print progress to stdout**: Use `print()` to show progress - Agent Workbook captures and displays this
2. **Use stderr for errors**: Write error messages to `sys.stderr`
3. **Validate arguments**: Check inputs and provide helpful error messages
4. **Handle exceptions**: Catch and handle exceptions gracefully
5. **Clean exit codes**: Use `sys.exit(1)` for errors, `sys.exit(0)` for success
6. **Document your scripts**: Add docstrings and help text

## Common Patterns

### Data Processing
```python
# Process CSV/JSON files
result = await awb.run('process_data.py', 'input.csv', '--format', 'summary', output_format='json')
```

### Text Analysis
```python
# Analyze text files
summary = await awb.run('analyze_text.py', 'document.txt', '--sentiment', output_format='json')
```

### File Generation
```python
# Generate reports
report = await awb.run('generate_report.py', 'data.json', '--template', 'summary')
```

## Troubleshooting

- **Script not found**: Ensure script is in `.agentworkbook/run_scripts/` directory
- **Permission errors**: Make scripts executable: `chmod +x script.py`
- **Import errors**: Scripts run in your workspace context - use absolute paths for imports
- **Output file errors**: Ensure your script creates the output file specified by `--out`
- **JSON parsing errors**: Validate JSON output before writing to file

## Error Messages

- `Script not found`: Check file name and location
- `Script failed with exit code X`: Check script logic and error handling
- `Failed to parse output as JSON`: Ensure valid JSON format when using `output_format='json'`
- `Script did not create output file`: Ensure script writes to the `--out` file path