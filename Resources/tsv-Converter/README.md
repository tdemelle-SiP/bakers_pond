# Timeline Data Conversion System

## What
Automated system that monitors your Google Sheets timeline for changes and updates the markdown file automatically using real file system event monitoring.

## Why
- **Eliminate manual export/import**: No need to manually download TSV files from Google Sheets
- **Preserve emojis**: Google Sheets maintains UTF-8 encoding that Excel loses
- **Real-time updates**: Changes sync automatically when you edit the timeline
- **Data format conversion**: Handles date format conversion and markdown link generation

## How

### Dependencies
- Python 3
- `watchdog` library (for file system monitoring)
- Google Drive desktop sync
- VS Code (for auto-start feature)

### Components

**tsv2md.py**
- Converts TSV to markdown table format
- Converts dates from M/D/YYYY to YYYY-MM-DD
- Combines title and URL columns into markdown links
- Shows what changed between updates

**update_timeline.py**
- Monitors your local Google Drive .gsheet file for changes
- Downloads fresh data from published Google Sheets URL
- Runs tsv2md.py automatically
- Starts automatically when VS Code opens

### Setup (One-Time)

1. **Install watchdog**:
   ```bash
   pip install watchdog
   ```

2. **Publish your Google Sheet**:
   - File → Share → Publish to web
   - Select "Entire Document" and "Tab-separated values (.tsv)"
   - Click Publish
   - URL is already configured in update_timeline.py

3. **Google Drive must be syncing** to:
   `E:\My Drive\G-media\Documents\gsheets\bakers-pond-timeline-data.gsheet`

### Data Flow

1. Edit timeline in Google Sheets (online)
2. Google Drive syncs changes to local .gsheet file
3. update_timeline.py detects the file change
4. Downloads latest TSV from published URL
5. Converts to markdown with change tracking
6. Updates `!!42_Mill_St_Timeline_Overview.md`

### File Structure
```
Resources/
├── tsv-Converter/
│   ├── tsv2md.py (conversion script)
│   └── update_timeline.py (monitor script)
└── inbox/
    └── bakers-pond-timeline-data - gsheet.tsv (downloaded TSV)

Repository Root/
└── !!42_Mill_St_Timeline_Overview.md (final output)
```

### Manual Usage
If needed:
```bash
# Run the monitor manually
python Resources/tsv-Converter/update_timeline.py

# Or just convert existing TSV
python Resources/tsv-Converter/tsv2md.py
```