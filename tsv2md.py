#!/usr/bin/env python3
import csv
import sys

# Read TSV file
with open('timeline-data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter='\t')
    rows = list(reader)

# Read existing markdown file to preserve header content
with open('!!42_Mill_St_Timeline_Overview.md', 'r', encoding='utf-8') as f:
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

# Add data rows (skip header row from TSV)
for row in rows[1:]:
    # Ensure we have 7 columns
    while len(row) < 7:
        row.append('')
    output.append('| ' + ' | '.join(row) + ' |\n')

# Write back to markdown file
with open('!!42_Mill_St_Timeline_Overview.md', 'w', encoding='utf-8') as f:
    f.writelines(output)

print(f"Updated !!42_Mill_St_Timeline_Overview.md with {len(rows)-1} rows from timeline-data.csv")