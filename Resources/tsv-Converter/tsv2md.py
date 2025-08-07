#!/usr/bin/env python3
import csv
import sys

# Set UTF-8 encoding for Windows subprocess output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Read TSV/TXT file with UTF-8 BOM from inbox folder
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
inbox_path = os.path.join(script_dir, '..', 'inbox')
tsv_path = os.path.join(inbox_path, 'bakers-pond-timeline-data - gsheet.tsv')

# Check if file exists
if not os.path.exists(tsv_path):
    print(f"❌ Error: Could not find bakers-pond-timeline-data - gsheet.tsv in {inbox_path}")
    sys.exit(1)

# Use UTF-8 encoding for Google Sheets exports
with open(tsv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter='\t')
    rows = list(reader)

# Read existing markdown file to preserve header content (in repo root)
md_path = os.path.join(script_dir, '..', '..', '!!42_Mill_St_Timeline_Overview.md')
with open(md_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where table starts and extract old table data for comparison
table_start = 0
old_table_rows = []
for i, line in enumerate(lines):
    if '| Date | Document | Case # |' in line:
        table_start = i
        # Skip header and separator lines, collect data rows
        for j in range(i+2, len(lines)):
            if lines[j].strip() and lines[j].startswith('|'):
                old_table_rows.append(lines[j].strip())
            else:
                break
        break

# Keep everything before table
output = lines[:table_start]

# Add table header
output.append('| Date | Document | Case # | Mrkr | Procedural Step | Environmental/Strategic Analysis | Notes |\n')
output.append('|------|----------|--------|------|-----------------|----------------------------------|-------|\n')

# Build new table rows and track changes
new_table_rows = []
for row in rows[1:]:
    # Ensure we have enough columns
    while len(row) < 8:
        row.append('')
    
    # Extract columns from TSV
    date_raw = row[0]
    doc_title = row[1]
    doc_url = row[2]
    case_num = row[3]
    markers = row[4]
    procedural = row[5]
    environmental = row[6]
    notes = row[7]
    
    # Convert date from M/D/YYYY to YYYY-MM-DD format
    try:
        if '/' in date_raw:
            # Parse M/D/YYYY format
            month, day, year = date_raw.split('/')
            date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        else:
            # Already in correct format or empty
            date = date_raw
    except:
        # If date parsing fails, use original
        date = date_raw
    
    # Reconstruct markdown link if URL exists
    if doc_url and doc_url.strip():
        document = f"[{doc_title}]({doc_url})"
    else:
        document = doc_title
    
    # Build markdown table row
    new_row = f"| {date} | {document} | {case_num} | {markers} | {procedural} | {environmental} | {notes} |"
    new_table_rows.append(new_row)
    output.append(new_row + '\n')

# Compare old and new rows to log changes
print(f"\nComparing {len(old_table_rows)} old rows with {len(new_table_rows)} new rows:")

# Find changes
changes_found = False
for i, new_row in enumerate(new_table_rows):
    if i < len(old_table_rows):
        if old_table_rows[i] != new_row:
            # Extract date from row for easier identification
            date_part = new_row.split('|')[1].strip()
            print(f"  - Row {i+1} modified (Date: {date_part})")
            
            # Show what changed
            old_parts = old_table_rows[i].split('|')
            new_parts = new_row.split('|')
            for j, (old_part, new_part) in enumerate(zip(old_parts, new_parts)):
                if old_part.strip() != new_part.strip() and j > 0 and j < len(old_parts)-1:
                    column_names = ['', 'Date', 'Document', 'Case #', 'Mrkr', 'Procedural', 'Environmental', 'Notes']
                    if j < len(column_names):
                        # Truncate long text for readability
                        old_text = old_part.strip()[:50] + '...' if len(old_part.strip()) > 50 else old_part.strip()
                        new_text = new_part.strip()[:50] + '...' if len(new_part.strip()) > 50 else new_part.strip()
                        print(f"      {column_names[j]}: '{old_text}' -> '{new_text}'")
            changes_found = True
    else:
        # New row added
        date_part = new_row.split('|')[1].strip()
        doc_part = new_row.split('|')[2].strip()[:30]
        print(f"  + Row {i+1} added (Date: {date_part}, Doc: {doc_part}...)")
        changes_found = True

# Check for deleted rows
if len(old_table_rows) > len(new_table_rows):
    for i in range(len(new_table_rows), len(old_table_rows)):
        date_part = old_table_rows[i].split('|')[1].strip()
        print(f"  - Row {i+1} deleted (Date: {date_part})")
        changes_found = True

if not changes_found:
    print("  [No changes detected in table content]")

# Write back to markdown file
with open(md_path, 'w', encoding='utf-8') as f:
    f.writelines(output)

print(f"\nUpdated !!42_Mill_St_Timeline_Overview.md with {len(rows)-1} rows from Google Sheets TSV")