#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///
"""
Test script that returns JSON output.
This script demonstrates the basic pattern for Agent Workbook scripts.
Compatible with uv and uvx.
"""

import argparse
import json
import sys
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description='Test script that returns JSON output')
    parser.add_argument('message', help='Message to include in output')
    parser.add_argument('--verbose', action='store_true', help='Include verbose output')
    parser.add_argument('--count', type=int, default=1, help='Number of items to generate')
    parser.add_argument('--out', required=True, help='Output file path')
    
    args = parser.parse_args()
    
    # Print some output to stdout (this will be captured by AWB)
    print(f"Processing message: {args.message}")
    if args.verbose:
        print(f"Verbose mode enabled, generating {args.count} items")
    
    # Create output data
    output_data = {
        "message": args.message,
        "timestamp": datetime.now().isoformat(),
        "verbose": args.verbose,
        "count": args.count,
        "items": []
    }
    
    # Generate test items
    for i in range(args.count):
        output_data["items"].append({
            "id": i + 1,
            "name": f"Item {i + 1}",
            "value": (i + 1) * 10
        })
    
    if args.verbose:
        print(f"Generated {len(output_data['items'])} items")
    
    # Write JSON output to the specified file
    try:
        with open(args.out, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"Output written to {args.out}")
    except Exception as e:
        print(f"Error writing output file: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()