#!/usr/bin/env python3
import csv
import sys

# Read TSV file with UTF-8 BOM (in same directory as script)
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
tsv_path = os.path.join(script_dir, 'timeline-data.tsv')
with open(tsv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter='\t')
    rows = list(reader)

# Read existing markdown file to preserve header content (in repo root)
md_path = os.path.join(script_dir, '..', '..', '!!42_Mill_St_Timeline_Overview.md')
with open(md_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where table starts
table_start = 0
for i, line in enumerate(lines):
    if '| Date | Document | Case # |' in line:
        table_start = i
        break

# Keep everything before table
output = lines[:table_start]

# Add table header
output.append('| Date | Document | Case # | Mrkr | Procedural Step | Environmental/Strategic Analysis | Notes |\n')
output.append('|------|----------|--------|------|-----------------|----------------------------------|-------|\n')

# Convert TSV rows to markdown table (skip header row)
for row in rows[1:]:
    # Ensure we have enough columns
    while len(row) < 8:
        row.append('')
    
    # Extract columns from TSV
    date = row[0]
    doc_title = row[1]
    doc_url = row[2]
    case_num = row[3]
    markers = row[4]
    procedural = row[5]
    environmental = row[6]
    notes = row[7]
    
    # Reconstruct markdown link if URL exists
    if doc_url and doc_url.strip():
        document = f"[{doc_title}]({doc_url})"
    else:
        document = doc_title
    
    # Build markdown table row
    output.append(f"| {date} | {document} | {case_num} | {markers} | {procedural} | {environmental} | {notes} |\n")

# Write back to markdown file
with open(md_path, 'w', encoding='utf-8') as f:
    f.writelines(output)

print(f"✅ Updated !!42_Mill_St_Timeline_Overview.md with {len(rows)-1} rows from timeline-data.tsv")