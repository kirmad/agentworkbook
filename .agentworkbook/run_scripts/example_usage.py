#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///
"""
Example usage script demonstrating the Agent Workbook script runner.
This script shows how to create a simple data processing script.
Compatible with uv and uvx.
"""

import argparse
import json
import sys
import os
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description='Example data processing script')
    parser.add_argument('input_file', help='Input file to process')
    parser.add_argument('--operation', choices=['count', 'summary', 'stats'], 
                       default='summary', help='Operation to perform')
    parser.add_argument('--out', required=True, help='Output file path')
    
    args = parser.parse_args()
    
    print(f"Processing file: {args.input_file}")
    print(f"Operation: {args.operation}")
    
    # Check if input file exists (for demonstration)
    if not os.path.exists(args.input_file):
        print(f"Warning: Input file {args.input_file} does not exist. Creating example output.")
        file_exists = False
    else:
        file_exists = True
    
    # Create example output based on operation
    if args.operation == 'count':
        result = {
            "operation": "count",
            "input_file": args.input_file,
            "file_exists": file_exists,
            "lines": 42 if file_exists else 0,
            "words": 156 if file_exists else 0,
            "characters": 892 if file_exists else 0
        }
    elif args.operation == 'summary':
        result = {
            "operation": "summary",
            "input_file": args.input_file,
            "file_exists": file_exists,
            "summary": "This is an example summary of the processed file.",
            "key_points": [
                "Point 1: File processing completed",
                "Point 2: Data extraction successful",
                "Point 3: Results formatted as JSON"
            ]
        }
    else:  # stats
        result = {
            "operation": "stats",
            "input_file": args.input_file,
            "file_exists": file_exists,
            "statistics": {
                "mean": 23.5,
                "median": 20.0,
                "std_dev": 5.2,
                "min": 15,
                "max": 35
            }
        }
    
    # Add metadata
    result["processed_at"] = datetime.now().isoformat()
    result["success"] = True
    
    # Write output
    try:
        with open(args.out, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Results written to: {args.out}")
    except Exception as e:
        print(f"Error writing output: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()