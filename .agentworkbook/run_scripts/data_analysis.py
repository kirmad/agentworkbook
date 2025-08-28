#!/usr/bin/env -S uv run
# /// script
# dependencies = [
#     "pandas>=2.0.0",
#     "numpy>=1.20.0",
# ]
# ///
"""
Data analysis script with external dependencies.
Demonstrates how to use pandas and numpy in Agent Workbook scripts with uv.
Compatible with uv and uvx.
"""

import argparse
import json
import sys
from datetime import datetime

try:
    import pandas as pd
    import numpy as np
    DEPS_AVAILABLE = True
except ImportError:
    DEPS_AVAILABLE = False


def main():
    parser = argparse.ArgumentParser(description='Data analysis with pandas and numpy')
    parser.add_argument('data_type', choices=['random', 'sequence', 'sample'], 
                       help='Type of data to generate and analyze')
    parser.add_argument('--size', type=int, default=100, help='Size of dataset')
    parser.add_argument('--out', required=True, help='Output file path')
    
    args = parser.parse_args()
    
    print(f"Data analysis script starting...")
    print(f"Data type: {args.data_type}")
    print(f"Size: {args.size}")
    
    if not DEPS_AVAILABLE:
        result = {
            "error": "Dependencies not available",
            "message": "pandas and numpy are required but not installed",
            "success": False,
            "timestamp": datetime.now().isoformat()
        }
    else:
        print(f"Dependencies loaded successfully")
        print(f"Pandas version: {pd.__version__}")
        print(f"NumPy version: {np.__version__}")
        
        # Generate data based on type
        if args.data_type == 'random':
            data = np.random.normal(0, 1, args.size)
        elif args.data_type == 'sequence':
            data = np.arange(args.size) * 0.1
        else:  # sample
            data = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] * (args.size // 10 + 1))[:args.size]
        
        # Create DataFrame and analyze
        df = pd.DataFrame({'values': data})
        
        result = {
            "data_type": args.data_type,
            "size": args.size,
            "statistics": {
                "mean": float(df['values'].mean()),
                "median": float(df['values'].median()),
                "std": float(df['values'].std()),
                "min": float(df['values'].min()),
                "max": float(df['values'].max()),
                "count": len(df)
            },
            "dependencies": {
                "pandas": pd.__version__,
                "numpy": np.__version__
            },
            "success": True,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"Analysis complete:")
        print(f"  Mean: {result['statistics']['mean']:.4f}")
        print(f"  Std:  {result['statistics']['std']:.4f}")
    
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