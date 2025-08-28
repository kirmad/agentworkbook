#!/usr/bin/env python3
"""
Test script to verify JSON parsing works in Python layer.
This simulates what would happen in the AgentWorkbook environment.
"""

import json
import sys
import os

# Add the resources directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'resources'))

def test_json_parsing():
    """Test JSON parsing functionality"""
    
    print("=== JSON Parsing Test ===\n")
    
    # Test 1: Valid JSON string
    print("Test 1: Valid JSON Parsing")
    json_string = '{"message": "Hello World", "count": 42, "success": true}'
    print(f"Raw JSON: {json_string}")
    
    try:
        parsed = json.loads(json_string)
        print(f"Parsed successfully: {parsed}")
        print(f"Type: {type(parsed)}")
        print(f"Can re-serialize: {json.dumps(parsed)}")
    except Exception as e:
        print(f"Error: {e}")
    
    print()
    
    # Test 2: Invalid JSON string
    print("Test 2: Invalid JSON Handling")
    invalid_json = "This is not JSON"
    print(f"Invalid JSON: {invalid_json}")
    
    try:
        parsed = json.loads(invalid_json)
        print(f"Unexpectedly parsed: {parsed}")
    except json.JSONDecodeError as e:
        print(f"Correctly caught JSONDecodeError: {e}")
    
    print()
    
    # Test 3: Complex JSON with nested objects
    print("Test 3: Complex JSON")
    complex_json = '''
    {
        "statistics": {
            "mean": 23.5,
            "median": 20.0,
            "count": 100
        },
        "items": [
            {"id": 1, "value": 10},
            {"id": 2, "value": 20}
        ],
        "metadata": {
            "timestamp": "2025-08-27T22:35:00Z",
            "version": "1.0"
        }
    }
    '''
    
    try:
        parsed = json.loads(complex_json)
        print(f"Parsed complex JSON successfully")
        print(f"Mean value: {parsed['statistics']['mean']}")
        print(f"Item count: {len(parsed['items'])}")
        print(f"Re-serializable: {len(json.dumps(parsed)) > 0}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n=== All Tests Complete ===")


if __name__ == '__main__':
    test_json_parsing()