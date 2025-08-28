#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///
"""
Simple hello world script for testing the Agent Workbook script runner.
Compatible with uv and uvx.
"""

import argparse
import json
import sys
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description='Simple hello world script')
    parser.add_argument('name', nargs='?', default='World', help='Name to greet')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')
    parser.add_argument('--out', required=True, help='Output file path')
    
    args = parser.parse_args()
    
    print(f"Hello script executing...")
    print(f"Greeting: {args.name}")
    print(f"Format: {args.format}")
    
    if args.format == 'json':
        output_data = {
            "greeting": f"Hello, {args.name}!",
            "timestamp": datetime.now().isoformat(),
            "format": args.format,
            "success": True
        }
        
        with open(args.out, 'w') as f:
            json.dump(output_data, f, indent=2)
    else:
        output_text = f"Hello, {args.name}!\nGenerated at: {datetime.now().isoformat()}\nHave a great day!"
        
        with open(args.out, 'w') as f:
            f.write(output_text)
    
    print(f"Output written to: {args.out}")


if __name__ == '__main__':
    main()