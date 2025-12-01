#!/usr/bin/env python
"""
Receipt OCR Processor for Petrol Pump Management System

This script processes petrol pump receipts using OCR and extracts structured data.
It handles Bharat Petroleum receipts with ETOT-MAIN format.

Usage:
    python lib/receipt_processor.py <image_path>

Output:
    JSON string with extracted receipt data
"""

import sys
import os
import json
import re
from pathlib import Path

try:
    import cv2
    import numpy as np
    from PIL import Image
    import pytesseract
except ImportError as e:
    print(json.dumps({
        "error": f"Missing dependency: {str(e)}",
        "message": "Please install required packages: pip install -r requirements.txt"
    }), file=sys.stderr)
    sys.exit(1)

# Configure Tesseract path for Windows if needed
if sys.platform == "win32":
    tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for path in tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            break


def preprocess_image(image_path):
    """
    Preprocess the image to improve OCR accuracy.
    """
    try:
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image from {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Resize if image is too small (helps OCR)
        height, width = gray.shape
        if width < 800:
            scale = 800 / width
            new_width = int(width * scale)
            new_height = int(height * scale)
            gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Apply denoising
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Increase contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Apply adaptive thresholding for better text extraction
        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Also try Otsu's method as alternative
        _, binary_otsu = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Use the one with more text (more white pixels usually means more text detected)
        if np.sum(binary == 255) > np.sum(binary_otsu == 255):
            cleaned = binary
        else:
            cleaned = binary_otsu
        
        # Apply slight dilation to connect broken characters
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.dilate(cleaned, kernel, iterations=1)
        
        return cleaned
    except Exception as e:
        print(json.dumps({
            "error": f"Image preprocessing failed: {str(e)}"
        }), file=sys.stderr)
        return None


def extract_text_from_image(image_path):
    """
    Extract text from image using Tesseract OCR.
    """
    try:
        # Preprocess image
        processed_img = preprocess_image(image_path)
        if processed_img is None:
            # Fallback to direct OCR on original image
            processed_img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        
        # Configure Tesseract for better accuracy
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:/- '
        
        # Extract text - try multiple PSM modes for better accuracy
        # PSM 6 = Assume uniform block of text
        # PSM 11 = Sparse text
        # PSM 12 = Sparse text with OSD
        text = pytesseract.image_to_string(processed_img, config=custom_config)
        
        # If we get very little text, try alternative PSM
        if len(text.strip()) < 100:
            custom_config_alt = r'--oem 3 --psm 11'
            text_alt = pytesseract.image_to_string(processed_img, config=custom_config_alt)
            if len(text_alt.strip()) > len(text.strip()):
                text = text_alt
        
        return text
    except Exception as e:
        print(json.dumps({
            "error": f"OCR extraction failed: {str(e)}"
        }), file=sys.stderr)
        return None


def extract_receipt_data(text):
    """
    Extract structured data from OCR text using regex patterns.
    """
    if not text:
        return None
    
    # Normalize text - but preserve structure for nozzle extraction
    # Don't collapse all whitespace - keep some structure
    normalized = re.sub(r'\r\n', '\n', text)
    normalized = re.sub(r'\r', '\n', normalized)
    normalized = re.sub(r' {2,}', ' ', normalized)  # Only collapse multiple spaces
    normalized = re.sub(r'\n{3,}', '\n\n', normalized)  # Max 2 newlines
    
    result = {
        "pumpSerialNumber": "",
        "printDate": "",
        "printTime": "",
        "model": "",
        "nozzles": []
    }
    
    # Extract Pump Serial Number (format: 12JB2792V or similar)
    serial_match = re.search(r'(\d{2}[A-Z]{2}\d{4}[A-Z]?)', normalized, re.IGNORECASE)
    if serial_match:
        result["pumpSerialNumber"] = serial_match.group(1).upper()
    
    # Extract Print Date (format: DD-MMM-YYYY or DD-MMM-YY)
    date_patterns = [
        r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',  # DD-MM-YYYY or DD/MM/YYYY
        r'(\d{1,2}[-/][A-Z]{3}[-/]\d{2,4})',  # DD-MMM-YYYY
        r'(\d{1,2}[-/][A-Z]{3}[-/]\d{2,4})',  # DD-MMM-YY
    ]
    for pattern in date_patterns:
        date_match = re.search(pattern, normalized, re.IGNORECASE)
        if date_match:
            date_str = date_match.group(1)
            # Normalize date format
            date_str = date_str.replace('/', '-')
            result["printDate"] = date_str.upper()
            break
    
    # Extract Print Time (format: HH:MM:SS)
    time_match = re.search(r'(\d{1,2}:\d{2}:\d{2})', normalized)
    if time_match:
        result["printTime"] = time_match.group(1)
    
    # Extract Model (usually 4 digits like 2422)
    model_match = re.search(r'MODEL[:\s]+(\d{3,5})', normalized, re.IGNORECASE)
    if not model_match:
        model_match = re.search(r'\b(\d{4})\b', normalized)
    if model_match:
        result["model"] = model_match.group(1)
    
    # Extract nozzle data - ULTRA AGGRESSIVE approach to capture ALL nozzles including #1
    found_nozzles = {}
    
    # CRITICAL: First, find ALL nozzle numbers in the text using multiple methods
    nozzle_numbers_found = set()
    
    # Method 1: Standard NOZZLE pattern
    for match in re.finditer(r'NOZZLE\s*[:\-]?\s*(\d+)', normalized, re.IGNORECASE):
        nozzle_numbers_found.add(match.group(1))
    
    # Method 2: Common OCR errors
    for match in re.finditer(r'NOZLE\s*[:\-]?\s*(\d+)', normalized, re.IGNORECASE):
        nozzle_numbers_found.add(match.group(1))
    
    # Method 3: Look for patterns like "NOZZLE : 1" with colon
    for match in re.finditer(r'NOZZLE\s*:\s*(\d+)', normalized, re.IGNORECASE):
        nozzle_numbers_found.add(match.group(1))
    
    # Method 4: Look for just numbers near "NOZZLE" text (handles spacing issues)
    for match in re.finditer(r'NOZZLE[^\d]*(\d)', normalized, re.IGNORECASE):
        nozzle_numbers_found.add(match.group(1))
    
    # Initialize ALL found nozzles first
    for nozzle_num in sorted(nozzle_numbers_found, key=lambda x: int(x) if x.isdigit() else 999):
        found_nozzles[nozzle_num] = {
            "nozzle": nozzle_num,
            "a": "",
            "v": "",
            "totSales": ""
        }
    
    # Now find all nozzle positions for block extraction
    nozzle_positions = []
    patterns = [
        r'NOZZLE\s*[:\-]?\s*(\d+)',
        r'NOZZLE\s*:\s*(\d+)',
        r'NOZZLE\s+(\d+)',
        r'NOZLE\s*[:\-]?\s*(\d+)',
    ]
    
    for pattern in patterns:
        for match in re.finditer(pattern, normalized, re.IGNORECASE):
            nozzle_num = match.group(1)
            if not any(p['number'] == nozzle_num for p in nozzle_positions):
                nozzle_positions.append({
                    'number': nozzle_num,
                    'start': match.start(),
                    'end': match.end()
                })
    
    # Sort by position
    nozzle_positions.sort(key=lambda x: x['start'])
    
    # IMPORTANT: If we found nozzle numbers but no positions, create positions manually
    if nozzle_numbers_found and not nozzle_positions:
        # Try to find each nozzle number in the text and create a position
        for nozzle_num in nozzle_numbers_found:
            # Look for the number near "NOZZLE" or just the number with A/V/SALES nearby
            pattern = rf'(?:NOZZLE[^\d]*)?{nozzle_num}[\s\S]{{0,100}}A'
            match = re.search(pattern, normalized, re.IGNORECASE)
            if match:
                nozzle_positions.append({
                    'number': nozzle_num,
                    'start': match.start(),
                    'end': match.start() + 200  # Give it a block size
                })
    
    # For each nozzle, extract its data block
    for idx, nozzle_pos in enumerate(nozzle_positions):
        nozzle_num = nozzle_pos['number']
        
        # Ensure this nozzle is in our found_nozzles dict
        if nozzle_num not in found_nozzles:
            found_nozzles[nozzle_num] = {
                "nozzle": nozzle_num,
                "a": "",
                "v": "",
                "totSales": ""
            }
        
        nozzle_data = found_nozzles[nozzle_num]
        
        # Determine the end of this nozzle's block (start of next nozzle or end of text)
        if idx + 1 < len(nozzle_positions):
            block_end = nozzle_positions[idx + 1]['start']
        else:
            # For the last nozzle, look ahead more to catch all data
            block_end = min(nozzle_pos['start'] + 500, len(normalized))
        
        # Extract the block for this nozzle - use larger block for first nozzle
        if idx == 0:
            # For nozzle 1, start from beginning of text or nozzle position, whichever is earlier
            block_start = max(0, nozzle_pos['start'] - 50)  # Look back a bit too
            nozzle_block = normalized[block_start:block_end]
        else:
            nozzle_block = normalized[nozzle_pos['start']:block_end]
        
        # Extract A value - try multiple patterns
        a_patterns = [
            r'A\s*[:\-]?\s*([0-9][0-9.,]*)',
            r'A:\s*([0-9][0-9.,]*)',
            r'A\s+([0-9][0-9.,]*)',
            r'\bA\s*[:\-]?\s*([0-9]+\.[0-9]+)',
        ]
        for pattern in a_patterns:
            a_match = re.search(pattern, nozzle_block, re.IGNORECASE)
            if a_match:
                nozzle_data["a"] = a_match.group(1).replace(',', '').strip()
                break
        
        # Extract V value - try multiple patterns
        v_patterns = [
            r'V\s*[:\-]?\s*([0-9][0-9.,]*)',
            r'V:\s*([0-9][0-9.,]*)',
            r'V\s+([0-9][0-9.,]*)',
            r'\bV\s*[:\-]?\s*([0-9]+\.[0-9]+)',
        ]
        for pattern in v_patterns:
            v_match = re.search(pattern, nozzle_block, re.IGNORECASE)
            if v_match:
                nozzle_data["v"] = v_match.group(1).replace(',', '').strip()
                break
        
        # Extract TOT SALES - try multiple patterns
        sales_patterns = [
            r'TOT\s*SALES\s*[:\-]?\s*([0-9][0-9.,]*)',
            r'TOT\s*SALES:\s*([0-9][0-9.,]*)',
            r'TOT\s*SALES\s+([0-9][0-9.,]*)',
            r'TOT\s*SALES\s*[:\-]?\s*([0-9]+)',
            r'SALES\s*[:\-]?\s*([0-9][0-9.,]*)',
        ]
        for pattern in sales_patterns:
            sales_match = re.search(pattern, nozzle_block, re.IGNORECASE)
            if sales_match:
                nozzle_data["totSales"] = sales_match.group(1).replace(',', '').strip()
                break
        
        # If still missing values, try extracting all numbers and assigning by position
        if not nozzle_data["a"] or not nozzle_data["v"] or not nozzle_data["totSales"]:
            # Find all decimal numbers in the block
            all_numbers = re.findall(r'([0-9]+(?:\.[0-9]+)?)', nozzle_block)
            
            # If we found numbers, try to assign them
            # Typically format is: A: big_number, V: medium_number, TOT SALES: small_number
            if len(all_numbers) >= 3:
                # Sort numbers by size (assuming A is largest, V is medium, TOT SALES is smallest)
                numbers = [float(n.replace(',', '')) for n in all_numbers if '.' in n or len(n) > 3]
                if len(numbers) >= 3:
                    numbers.sort(reverse=True)
                    if not nozzle_data["a"]:
                        nozzle_data["a"] = str(numbers[0])
                    if not nozzle_data["v"] and len(numbers) > 1:
                        nozzle_data["v"] = str(numbers[1])
                    if not nozzle_data["totSales"] and len(numbers) > 2:
                        # TOT SALES is usually the smallest or a round number
                        for n in reversed(numbers):
                            if n < 1000000:  # TOT SALES is usually < 1 million
                                nozzle_data["totSales"] = str(int(n))
                                break
    
    # CRITICAL FIX: For any nozzles we found but didn't extract data for, search the entire text
    for nozzle_num, nozzle_data in found_nozzles.items():
        # If this nozzle has no data, search the entire normalized text for it
        if not nozzle_data["a"] and not nozzle_data["v"] and not nozzle_data["totSales"]:
            # Create a search pattern for this specific nozzle
            search_pattern = rf'NOZZLE\s*[:\-]?\s*{nozzle_num}[\s\S]{{0,300}}'
            match = re.search(search_pattern, normalized, re.IGNORECASE)
            if match:
                block = match.group(0)
                # Try to extract values from this block
                a_match = re.search(r'A\s*[:\-]?\s*([0-9][0-9.,]*)', block, re.IGNORECASE)
                if a_match:
                    nozzle_data["a"] = a_match.group(1).replace(',', '').strip()
                v_match = re.search(r'V\s*[:\-]?\s*([0-9][0-9.,]*)', block, re.IGNORECASE)
                if v_match:
                    nozzle_data["v"] = v_match.group(1).replace(',', '').strip()
                sales_match = re.search(r'TOT\s*SALES\s*[:\-]?\s*([0-9][0-9.,]*)', block, re.IGNORECASE)
                if sales_match:
                    nozzle_data["totSales"] = sales_match.group(1).replace(',', '').strip()
    
    # Convert to sorted list - ALWAYS include ALL found nozzles
    result["nozzles"] = sorted(
        [found_nozzles[key] for key in found_nozzles.keys()],
        key=lambda x: int(x["nozzle"]) if x["nozzle"].isdigit() else 999
    )
    
    # FINAL SAFEGUARD: If we found ANY nozzles but not all 4, check if we missed some
    # This handles cases where OCR might have misread "NOZZLE" text
    if result["nozzles"] and len(result["nozzles"]) < 4:
        found_numbers = {int(n["nozzle"]) for n in result["nozzles"] if n["nozzle"].isdigit()}
        expected_numbers = {1, 2, 3, 4}
        missing_numbers = expected_numbers - found_numbers
        
        # For each missing nozzle, try to find it in the text with alternative patterns
        for missing_num in missing_numbers:
            # Try to find this nozzle number near "NOZZLE" text or in a similar pattern
            # Look for patterns like "1", "2", etc. followed by A/V/TOT SALES patterns
            missing_patterns = [
                rf'\b{missing_num}\b[\s\S]{{0,200}}A\s*[:\-]?\s*([0-9][0-9.,]*)[\s\S]{{0,200}}V\s*[:\-]?\s*([0-9][0-9.,]*)[\s\S]{{0,200}}TOT\s*SALES\s*[:\-]?\s*([0-9][0-9.,]*)',
                rf'NOZZLE[:\s]*{missing_num}[\s\S]{{0,300}}A[:\s]*([0-9][0-9.,]*)[\s\S]{{0,300}}V[:\s]*([0-9][0-9.,]*)[\s\S]{{0,300}}SALES[:\s]*([0-9][0-9.,]*)',
            ]
            
            for pattern in missing_patterns:
                match = re.search(pattern, normalized, re.IGNORECASE | re.DOTALL)
                if match:
                    nozzle_data = {
                        "nozzle": str(missing_num),
                        "a": match.group(1).replace(',', '').strip() if len(match.groups()) > 0 else "",
                        "v": match.group(2).replace(',', '').strip() if len(match.groups()) > 1 else "",
                        "totSales": match.group(3).replace(',', '').strip() if len(match.groups()) > 2 else ""
                    }
                    found_nozzles[str(missing_num)] = nozzle_data
                    break
        
        # Re-sort after adding missing nozzles
        result["nozzles"] = sorted(
            [found_nozzles[key] for key in found_nozzles.keys()],
            key=lambda x: int(x["nozzle"]) if x["nozzle"].isdigit() else 999
        )
    
    return result


def process_receipt(image_path):
    """
    Main function to process a receipt image and return extracted data.
    """
    try:
        # Validate image path
        if not os.path.exists(image_path):
            return {
                "error": f"Image file not found: {image_path}"
            }
        
        # Extract text from image
        text = extract_text_from_image(image_path)
        
        if not text:
            return {
                "error": "Failed to extract text from image"
            }
        
        # Extract structured data
        data = extract_receipt_data(text)
        
        if not data:
            return {
                "error": "Failed to extract receipt data from text"
            }
        
        return data
        
    except Exception as e:
        return {
            "error": f"Error processing receipt: {str(e)}"
        }


def main():
    """
    Main entry point when script is run directly.
    """
    if len(sys.argv) < 2:
        error_result = {
            "error": "Usage: python lib/receipt_processor.py <image_path>"
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Process receipt
    result = process_receipt(image_path)
    
    # Output as JSON
    print(json.dumps(result, indent=2))
    
    # Exit with error code if processing failed
    if "error" in result:
        sys.exit(1)


if __name__ == "__main__":
    main()

