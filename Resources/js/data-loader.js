/**
 * data-loader.js
 * Responsible for fetching the markdown table data
 * Single responsibility: Get raw table text from the markdown file
 * 
 * KEY INSIGHTS FROM EXISTING CODE:
 * - Uses cache busting (?v=Date.now()) to prevent stale data
 * - Path is '../' relative to Resources folder
 * - Table header includes '| Date | Document | Case # | Mrkr |'
 * - Must handle empty cells (parts.length !== 7 continues)
 * - Table ends at first non-pipe line or empty line
 * - Uses slice(1, -1) to remove leading/trailing empty strings from split('|')
 */

/**
 * Fetches the timeline markdown file
 * @returns {Promise<string>} Raw markdown text
 */
export async function loadTableData() {
    // Cache busting is important - prevents browser from serving stale timeline data
    const response = await fetch('../!!42_Mill_St_Timeline_Overview.md?v=' + Date.now());
    
    if (!response.ok) {
        throw new Error(`Failed to load timeline data: ${response.status}`);
    }
    
    return response.text();
}

/**
 * Extracts and parses table rows from markdown text
 * @param {string} markdownText - Raw markdown content
 * @returns {Object} {headers: string[], rows: Array<string[]>}
 */
export function extractTableRows(markdownText) {
    const lines = markdownText.split('\n');
    
    // Find any table header (starts with | and contains Date)
    const headerIndex = lines.findIndex(line => 
        line.startsWith('|') && line.toLowerCase().includes('date')
    );
    
    if (headerIndex === -1) {
        throw new Error('No table header found in markdown');
    }
    
    // Parse header row to get column names
    const headerLine = lines[headerIndex];
    const headers = headerLine.split('|').slice(1, -1).map(s => s.trim());
    
    const tableRows = [];
    
    // Start after header and divider line
    for (let i = headerIndex + 2; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Stop at first non-table line
        if (!line || !line.startsWith('|')) break;
        
        // Parse the row
        const parts = line
            .split('|')
            .slice(1, -1)
            .map(p => p.trim());
        
        // Skip if wrong number of columns
        if (parts.length !== headers.length) {
            console.warn(`Skipping row with ${parts.length} columns (expected ${headers.length})`);
            continue;
        }
        
        tableRows.push(parts);
    }
    
    return { headers, rows: tableRows };
}

/**
 * Gets column names for reference
 * @returns {string[]} Array of column names in order
 */
export function getColumnNames() {
    return ['Date', 'Document', 'Case #', 'Mrkr', 'Procedural', 'Legal', 'Environmental'];
}