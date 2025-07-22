#!/usr/bin/env python3
import sys
import re

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using basic stream parsing."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_content = file.read()
            
        # Find text between stream/endstream markers
        text_pattern = rb'stream(.*?)endstream'
        streams = re.findall(text_pattern, pdf_content, re.DOTALL)
        
        extracted_text = []
        for stream in streams:
            try:
                # Try to decode as text
                text = stream.decode('utf-8', errors='ignore')
                # Clean up common PDF encoding artifacts
                text = re.sub(r'[^\x20-\x7E\n]', ' ', text)
                text = ' '.join(text.split())
                if len(text) > 20:  # Only keep substantial text
                    extracted_text.append(text)
            except:
                continue
                
        return '\n'.join(extracted_text) if extracted_text else "No readable text found"
        
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 read_pdf.py <pdf_file>")
        sys.exit(1)
        
    result = extract_text_from_pdf(sys.argv[1])
    print(result)