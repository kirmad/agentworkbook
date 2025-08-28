#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///
"""
Test script that demonstrates error handling.
This script can succeed or fail based on input parameters.
Compatible with uv and uvx.
"""

import argparse
import json
import sys
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description='Test script for error scenarios')
    parser.add_argument('action', choices=['success', 'fail', 'no-output'], 
                       help='Action to perform')
    parser.add_argument('--message', default='Test message', help='Message to include')
    parser.add_argument('--out', required=True, help='Output file path')
    
    args = parser.parse_args()
    
    print(f"Running test_error.py with action: {args.action}")
    
    if args.action == 'fail':
        print("Simulating script failure", file=sys.stderr)
        sys.exit(1)
    elif args.action == 'no-output':
        print("Script executed but will not create output file")
        # Intentionally don't create the output file
        sys.exit(0)
    elif args.action == 'success':
        print("Script executing successfully")
        
        output_data = {
            "status": "success",
            "message": args.message,
            "timestamp": datetime.now().isoformat(),
            "action": args.action
        }
        
        try:
            with open(args.out, 'w') as f:
                json.dump(output_data, f, indent=2)
            print(f"Success! Output written to {args.out}")
        except Exception as e:
            print(f"Error writing output file: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == '__main__':
    main()