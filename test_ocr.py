#!/usr/bin/env python
"""
Test script for OCR functionality.
This script allows you to test the OCR functionality directly,
without going through the API.

Usage:
  python test_ocr.py <image_path>
"""

import sys
import os
import json

# Add the project root to the path so we can import from lib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from lib.receipt_processor import process_receipt
except ImportError:
    # Fallback: if import fails, try running as script
    import subprocess
    def process_receipt(image_path):
        script_path = os.path.join(os.path.dirname(__file__), "lib", "receipt_processor.py")
        result = subprocess.run(
            [sys.executable, script_path, image_path],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {"error": result.stderr or "Processing failed"}

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_ocr.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        sys.exit(1)
    
    print(f"Processing image: {image_path}")
    print(f"File size: {os.path.getsize(image_path)} bytes")
    
    # Process the receipt
    result = process_receipt(image_path)
    
    if result:
        print("\n=== OCR Results ===")
        print(json.dumps(result, indent=2))
        
        # Print a summary
        print("\n=== Summary ===")
        print(f"Print Date: {result.get('printDate', 'Not found')}")
        print(f"Pump Serial Number: {result.get('pumpSerialNumber', 'Not found')}")
        print(f"Model: {result.get('model', 'Not found')}")
        
        if 'nozzles' in result and result['nozzles']:
            print(f"\nNozzles: {len(result['nozzles'])}")
            for i, nozzle in enumerate(result['nozzles']):
                print(f"\nNozzle {nozzle.get('nozzle', i+1)}:")
                print(f"  A: {nozzle.get('a', 'Not found')}")
                print(f"  V: {nozzle.get('v', 'Not found')}")
                print(f"  Total Sales: {nozzle.get('totSales', 'Not found')}")
        else:
            print("\nNo nozzle data found.")
    else:
        print("Failed to process receipt")
        sys.exit(1)

if __name__ == "__main__":
    main() 