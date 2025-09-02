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

/**
 * Extracts cases table from markdown text
 * @param {string} markdownText - Raw markdown content
 * @returns {Array<Object>} Array of case objects with caseNumber, year, title, defaultVisible
 */
export function extractCasesTable(markdownText) {
    const lines = markdownText.split('\n');
    
    // Find the ## Cases section
    const casesIndex = lines.findIndex(line => 
        line.trim() === '## Cases'
    );
    
    if (casesIndex === -1) {
        console.warn('No cases section found in markdown');
        return [];
    }
    
    // Find the cases table header (should be a couple lines after ## Cases)
    let headerIndex = -1;
    for (let i = casesIndex + 1; i < lines.length && i < casesIndex + 5; i++) {
        if (lines[i].includes('| Case Number |')) {
            headerIndex = i;
            break;
        }
    }
    
    if (headerIndex === -1) {
        console.warn('No cases table header found');
        return [];
    }
    
    const cases = [];
    
    // Start after header and divider line
    for (let i = headerIndex + 2; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Stop at first non-table line
        if (!line || !line.startsWith('|')) break;
        
        // Parse the row: | Case Number | Year | Title | Default Visible |
        const parts = line
            .split('|')
            .slice(1, -1)
            .map(p => p.trim());
        
        if (parts.length === 4) {
            const caseNumber = parts[0];
            const year = parts[1];
            const title = parts[2];
            const defaultVisible = parts[3].toUpperCase() !== 'FALSE';
            
            cases.push({
                caseNumber,
                year,
                title,
                defaultVisible
            });
        }
    }
    
    return cases;
}