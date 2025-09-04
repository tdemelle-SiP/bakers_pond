/**
 * event-parser.js
 * Converts table rows into structured event objects
 * 
 * REFERENCES:
 * - Original parsing: timeline-auto-generated-old.html lines 505-589
 * - Date parsing: splits on '-', uses new Date(year, month-1, day)
 * - Document parsing: extracts [title](url) markdown links
 * - Timeline events: have 🟢 in markers
 * - Caseline events: have other emojis (not 🟢, 🔒, ❌)
 * - Label overrides: **text** in procedural column
 */

/**
 * Parses all table rows into event objects
 * @param {Object} tableData - {headers: string[], rows: Array<string[]>} from data-loader
 * @returns {Object[]} Array of event objects
 */
export function parseEvents(tableData) {
    const events = [];
    const { headers, rows } = tableData;
    
    // Find column indices by header name (case-insensitive)
    const findColumn = (names) => {
        for (const name of names) {
            const index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
            if (index !== -1) return index;
        }
        return -1;
    };
    
    // Map column names to indices - try multiple possible names
    const cols = {
        date: findColumn(['date']),
        document: findColumn(['document_title', 'document', 'doc']),
        caseNumber: findColumn(['case_num', 'case #', 'case', 'case number']),
        markers: findColumn(['mrkrs', 'mrkr', 'marker', 'markers']),
        procedural: findColumn(['procedural_step', 'procedural step', 'procedural', 'procedure']),
        legal: findColumn(['notes', 'legal']),
        environmental: findColumn(['environmental_analysis', 'environmental/strategic', 'environmental', 'environ', 'strategic']),
        documentUrl: findColumn(['document_url', 'url', 'link'])
    };
    
    // Validate we have minimum required columns
    if (cols.date === -1 || cols.document === -1) {
        throw new Error('Missing required columns: Date and Document');
    }
    
    rows.forEach(row => {
        const dateStr = row[cols.date];
        const document = row[cols.document] || '';
        const caseNumber = cols.caseNumber !== -1 ? row[cols.caseNumber] : '';
        const markers = cols.markers !== -1 ? row[cols.markers] : '';
        const procedural = cols.procedural !== -1 ? row[cols.procedural] : '';
        const legal = cols.legal !== -1 ? row[cols.legal] : '';
        const environmental = cols.environmental !== -1 ? row[cols.environmental] : '';
        
        // Skip rows with empty dates
        if (!dateStr || dateStr.trim() === '') {
            return;
        }
        
        // Parse date
        const [year, month, day] = dateStr.split('-');
        const date = new Date(year, parseInt(month) - 1, day);
        
        
        // Parse document link - check for separate URL column first
        let title = document;
        let documentUrl = null;
        
        // If we have a separate document_url column, use that
        if (cols.documentUrl !== -1 && row[cols.documentUrl]) {
            documentUrl = row[cols.documentUrl];
        } else {
            // Otherwise try to extract from markdown link format
            const linkMatch = document.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                title = linkMatch[1];
                documentUrl = linkMatch[2];
            }
        }
        
        // Clean up title
        title = title.replace(/_/g, ' ')
                    .replace(/MISSING:/g, '❌ ')
                    .replace(/\.txt$/g, '')
                    .replace(/\.pdf$/g, '');
        
        // Check for label override in procedural column
        let proceduralLabel = null;
        let labelEmphasis = null;  // Only set if high emphasis
        
        // Check for high emphasis first (!**text**!)
        const highEmphasisMatch = procedural.match(/!\*\*([^*]+)\*\*!/);
        if (highEmphasisMatch) {
            proceduralLabel = highEmphasisMatch[1];
            labelEmphasis = 'high';
        } else {
            // Check for regular emphasis (**text**)
            const labelMatch = procedural.match(/\*\*([^*]+)\*\*/);
            if (labelMatch) {
                proceduralLabel = labelMatch[1];
            }
        }
        
        // Extract display detail (remove both types of markers)
        const displayDetail = procedural
            .replace(/!\*\*[^*]+\*\*!/g, '')  // Remove high emphasis
            .replace(/\*\*[^*]+\*\*/g, '')    // Remove regular emphasis
            .trim()
            .substring(0, 100);
        
        // Basic flags
        const isPrivate = markers.includes('🔒');
        const hasMissingDoc = markers.includes('❌');
        const isTimelineEvent = markers.includes('🟢');
        
        // Find ALL caseline emojis (not 🔒, ❌, or 🟢)
        const emojiRegex = /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2B00}-\u{2BFF}]|[\u{23F0}-\u{23FF}]|[\u{2190}-\u{21FF}])[\u{FE0F}]?/gu;
        const allEmojis = markers.match(emojiRegex) || [];
        const caselineEmojis = allEmojis.filter(e => e !== '🔒' && e !== '❌' && e !== '🟢');
        
        // Create base event object
        const baseEvent = {
            date,
            dateStr,
            title,
            documentUrl,
            caseNumber: caseNumber.trim(),
            markers,
            procedural,
            proceduralLabel,
            labelEmphasis,  // Add emphasis level
            displayDetail,
            isPrivate,
            hasMissingDoc,
            isTimelineEvent,
            caselineEmojis
        };
        
        // Add timeline event if has 🟢
        if (isTimelineEvent) {
            events.push({
                ...baseEvent,
                eventType: 'timeline',
                eventClass: isPrivate ? 'tracked-event-priv' : 'tracked-event'
            });
        }
        
        // Add caseline event if has other emojis
        if (caselineEmojis.length > 0) {
            events.push({
                ...baseEvent,
                eventType: 'caseline',
                eventClass: 'case-procedural'
            });
        }
    });
    
    // Sort by date
    return events.sort((a, b) => a.date - b.date);
}

/**
 * Gets unique case numbers from events
 * @param {Object[]} events - Array of parsed events
 * @returns {string[]} Sorted array of unique case numbers
 */
export function extractCaseNumbers(events) {
    const cases = new Set();
    events.forEach(event => {
        if (event.caseNumber) {
            cases.add(event.caseNumber);
        }
    });
    return Array.from(cases).sort();
}

/**
 * Gets date range from events
 * @param {Object[]} events - Array of parsed events
 * @returns {Object} {minDate, maxDate}
 */
export function getEventDateRange(events) {
    // Filter out invalid dates
    const validDates = events
        .map(e => e.date)
        .filter(date => date && !isNaN(date.getTime()));
    
    if (validDates.length === 0) {
        console.warn('No valid dates found in events');
        return {
            minDate: new Date(),
            maxDate: new Date()
        };
    }
    
    return {
        minDate: new Date(Math.min(...validDates)),
        maxDate: new Date(Math.max(...validDates))
    };
}