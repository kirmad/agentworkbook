#!/usr/bin/env -S uv run
# /// script
# dependencies = []
# ///
"""
Test script that returns string output.
This script demonstrates string output for Agent Workbook scripts.
Compatible with uv and uvx.
"""

import argparse
import sys
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description='Test script that returns string output')
    parser.add_argument('text', help='Text to process')
    parser.add_argument('--upper', action='store_true', help='Convert to uppercase')
    parser.add_argument('--repeat', type=int, default=1, help='Number of times to repeat')
    parser.add_argument('--out', required=True, help='Output file path')
    
    args = parser.parse_args()
    
    # Print some output to stdout (this will be captured by AWB)
    print(f"Processing text: {args.text}")
    print(f"Options: upper={args.upper}, repeat={args.repeat}")
    
    # Process the text
    processed_text = args.text
    if args.upper:
        processed_text = processed_text.upper()
        print("Converted to uppercase")
    
    # Build output content
    output_lines = []
    output_lines.append(f"Processed at: {datetime.now().isoformat()}")
    output_lines.append(f"Original text: {args.text}")
    output_lines.append(f"Processed text: {processed_text}")
    output_lines.append("")
    output_lines.append("Results:")
    
    for i in range(args.repeat):
        output_lines.append(f"{i + 1}. {processed_text}")
    
    output_lines.append("")
    output_lines.append(f"Total repetitions: {args.repeat}")
    
    output_content = "\n".join(output_lines)
    
    # Write string output to the specified file
    try:
        with open(args.out, 'w') as f:
            f.write(output_content)
        print(f"Output written to {args.out}")
    except Exception as e:
        print(f"Error writing output file: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()