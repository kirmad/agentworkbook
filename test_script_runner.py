#!/usr/bin/env python3
"""
Test script for the Agent Workbook script runner functionality.
This script tests the awb.run() method with various scenarios.
"""

import asyncio
import sys
import os

# Add the resources directory to the Python path so we can import agentworkbook
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'resources'))

# Note: This test script is meant to demonstrate usage
# In actual AgentWorkbook environment, you would just do: import agentworkbook as awb

async def test_script_runner():
    """Test the script runner functionality"""
    
    print("=== Agent Workbook Script Runner Tests ===\n")
    
    # Test 1: JSON output
    print("Test 1: JSON Output")
    print("-" * 30)
    try:
        # This would work in the AgentWorkbook environment
        # result = await awb.run('test_json.py', 'Hello World', '--verbose', '--count', '3', output_format='json')
        print("Would call: await awb.run('test_json.py', 'Hello World', '--verbose', '--count', '3', output_format='json')")
        print("Expected: JSON object with message, timestamp, items array")
    except Exception as e:
        print(f"Error: {e}")
    print()
    
    # Test 2: String output
    print("Test 2: String Output")
    print("-" * 30)
    try:
        # This would work in the AgentWorkbook environment
        # result = await awb.run('test_string.py', 'hello world', '--upper', '--repeat', '2')
        print("Would call: await awb.run('test_string.py', 'hello world', '--upper', '--repeat', '2')")
        print("Expected: String with processed text repeated 2 times in uppercase")
    except Exception as e:
        print(f"Error: {e}")
    print()
    
    # Test 3: Error scenarios
    print("Test 3: Error Scenarios")
    print("-" * 30)
    try:
        # Test script failure
        # result = await awb.run('test_error.py', 'fail')
        print("Would call: await awb.run('test_error.py', 'fail')")
        print("Expected: Exception due to script exit code 1")
    except Exception as e:
        print(f"Expected error: {e}")
    print()
    
    # Test 4: Missing script
    print("Test 4: Missing Script")
    print("-" * 30)
    try:
        # result = await awb.run('nonexistent.py', 'test')
        print("Would call: await awb.run('nonexistent.py', 'test')")
        print("Expected: Exception due to script not found")
    except Exception as e:
        print(f"Expected error: {e}")
    print()
    
    print("=== Usage Examples ===\n")
    
    print("Example 1: Data processing with JSON output")
    print("result = await awb.run('analyze_data.py', 'data.csv', '--format', 'summary', output_format='json')")
    print("print(f\"Found {len(result['items'])} items\")")
    print()
    
    print("Example 2: Text processing with string output")
    print("summary = await awb.run('summarize_text.py', 'document.txt', '--max-words', '100')")
    print("print(summary)")
    print()
    
    print("Example 3: Complex analysis")
    print("analysis = await awb.run('ml_analyze.py', 'dataset.csv', '--model', 'random_forest', '--features', 'all', output_format='json')")
    print("print(f\"Model accuracy: {analysis['metrics']['accuracy']:.2%}\")")
    print()
    
    print("=== Script Requirements ===\n")
    print("Your scripts must:")
    print("1. Accept --out <path> parameter")
    print("2. Write results to the output file path")
    print("3. Return exit code 0 for success")
    print("4. Be placed in .agentworkbook/run_scripts/ folder")


if __name__ == '__main__':
    # Run the tests
    asyncio.run(test_script_runner())