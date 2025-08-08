#!/usr/bin/env python3
"""
Monitors Google Sheet file for changes and updates timeline
"""
import os
import time
import subprocess
import urllib.request
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Google Sheet published URL
GOOGLE_SHEET_TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQVqVBBUKhpvPp1vcpwJ3Az3TE4n4d3PKEyKIQC91c4SUt6NHGc0jioHluCRHoGKy_yiUzP-Y-yBLns/pub?gid=752809563&single=true&output=tsv"

# Path to your .gsheet file to monitor
GSHEET_FILE = r"E:\My Drive\G-media\Documents\gsheets\bakers-pond-timeline-data.gsheet"

# Local paths
script_dir = os.path.dirname(os.path.abspath(__file__))
inbox_path = os.path.join(script_dir, '..', 'inbox')
tsv_file = os.path.join(inbox_path, 'bakers-pond-timeline-data - gsheet.tsv')

class TimelineUpdateHandler(FileSystemEventHandler):
    """Handler for file system events"""
    def __init__(self):
        self.last_update = 0
        
    def on_modified(self, event):
        # Check if it's our specific file
        if not event.is_directory and event.src_path == GSHEET_FILE:
            # Debounce - ignore multiple events within 2 seconds
            current_time = time.time()
            if current_time - self.last_update < 2:
                return
            self.last_update = current_time
            
            print(f"\n🔔 Change detected at {datetime.now().strftime('%H:%M:%S')}")
            time.sleep(2)  # Wait for sync to complete
            download_and_convert()

def download_and_convert():
    """Download TSV and run conversion"""
    try:
        # Download latest TSV
        print(f"📥 Downloading latest data from Google Sheets...")
        # Use urlopen to handle redirects properly
        with urllib.request.urlopen(GOOGLE_SHEET_TSV_URL) as response:
            tsv_content = response.read()
        with open(tsv_file, 'wb') as f:
            f.write(tsv_content)
        print(f"✅ Downloaded to {os.path.basename(tsv_file)}")
        
        # Run conversion
        print("🔄 Converting to markdown...")
        # Set UTF-8 environment for subprocess
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        result = subprocess.run(
            ['python', 'tsv2md.py'], 
            cwd=script_dir,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            env=env
        )
        if result.returncode == 0:
            print(result.stdout)
            print("✨ Timeline updated successfully!")
            return True
        else:
            print(f"❌ Conversion error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def monitor_changes():
    """Monitor the .gsheet file for changes using file system events"""
    print("=" * 60)
    print("📊 Timeline Monitor Started (using real file system events)")
    print("=" * 60)
    print(f"📁 Watching: {GSHEET_FILE}")
    print(f"🌐 Google Sheet URL configured ✅")
    print("=" * 60)
    
    if not os.path.exists(GSHEET_FILE):
        print(f"❌ File not found: {GSHEET_FILE}")
        print("Make sure the path is correct and Google Drive is syncing")
        return
    
    # Initial update
    print(f"\n⏰ Initial update at {datetime.now().strftime('%H:%M:%S')}")
    download_and_convert()
    
    # Set up file system monitoring
    event_handler = TimelineUpdateHandler()
    observer = Observer()
    
    # Watch the parent directory
    watch_dir = os.path.dirname(GSHEET_FILE)
    observer.schedule(event_handler, watch_dir, recursive=False)
    observer.start()
    
    print("\n✅ File system monitoring active")
    print("👀 Waiting for changes... (Press Ctrl+C to stop)\n")
    print("ℹ️  Edit your Google Sheet and changes will be detected automatically\n")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n\n👋 Monitor stopped")
    observer.join()

if __name__ == "__main__":
    monitor_changes()