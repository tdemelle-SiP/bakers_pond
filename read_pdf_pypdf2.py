#!/usr/bin/env python3
import sys
try:
    import PyPDF2
except ImportError:
    print("PyPDF2 not found. Trying to import from Windows Python installation...")
    sys.path.append('/mnt/c/Users/tdeme/AppData/Local/Programs/Python/Python313/Lib/site-packages')
    sys.path.append('/mnt/c/Users/tdeme/AppData/Local/Programs/Python/Python313/Scripts')
    # Try common pip install locations
    import os
    home = os.path.expanduser('~')
    sys.path.append(f'/mnt/c/Users/tdeme/AppData/Roaming/Python/Python313/site-packages')
    try:
        import PyPDF2
    except ImportError:
        print("Error: Could not import PyPDF2. Please check Python path.")
        sys.exit(1)

def read_pdf(pdf_path):
    """Extract text from PDF using PyPDF2."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)
            
            print(f"PDF has {num_pages} pages\n")
            
            all_text = []
            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                if text.strip():
                    all_text.append(f"--- Page {page_num + 1} ---\n{text}")
            
            return '\n\n'.join(all_text) if all_text else "No text could be extracted from PDF"
            
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 read_pdf_pypdf2.py <pdf_file>")
        sys.exit(1)
    
    result = read_pdf(sys.argv[1])
    print(result)