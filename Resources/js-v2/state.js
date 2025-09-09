// state.js  
// - Loads and parses data
// - Manages application state
// - Handles filter updates
// - Triggers rendering

import { render } from './render.js';
import { getEmojiArray, getEmojiConfig } from './emoji-config.js';

// Constants
const DEFAULT_SCALE = 0.8;
const TIMELINE_LEFT_OFFSET = 0;
const TIMELINE_RIGHT_PADDING = 50;
const STORAGE_PREFIX = 'timeline-';

// Storage keys
const STORAGE_KEYS = {
    START_DATE: STORAGE_PREFIX + 'start-date',
    END_DATE: STORAGE_PREFIX + 'end-date',
    SELECTED_CASES: STORAGE_PREFIX + 'selected-cases',
    SCALE: STORAGE_PREFIX + 'scale',
    FIT_TO_WINDOW: STORAGE_PREFIX + 'fit-to-window',
    EMOJI_VISIBILITY: STORAGE_PREFIX + 'emoji-visibility',
    FOCUS_DATE: STORAGE_PREFIX + 'focus-date'
};

// State object - structure from existing state-manager.js
const state = {
    allEvents: [],
    filteredEvents: [],
    caseNumbers: [],
    casesData: [],  // Metadata about cases from markdown
    scale: 0.8,
    fitToWindow: false,
    emojiVisibility: {},
    filters: {
        startDate: null,
        endDate: null,
        selectedCases: [],
        manualDateOverride: false
    },
    focusDate: null,  // Date that should be centered after refresh
    // Coordinate system - derived from filteredEvents and scale
    coordinateSystem: null
};

// Load data and saved preferences
export async function loadData() {
    try {
        // COHORT 1: timelineData - Load and parse markdown in one pass
        const markdownText = await loadTableData();
        const parsedData = parseMarkdown(markdownText);
        
        // Store parsed data in state
        state.allEvents = parsedData.events;
        state.casesData = parsedData.casesData;
        state.caseNumbers = parsedData.caseNumbers;
        
        // COHORT 2: uiData - Load all UI state in one localStorage access
        const uiState = loadAllUIState();
        const savedFocusDate = loadFocusDate();
        
        // Apply saved preferences
        // Use saved cases only if the array exists and has items; otherwise fall back to defaults.
        const hasSavedCases = Array.isArray(uiState.filters?.selectedCases) && uiState.filters.selectedCases.length > 0;
        state.filters.selectedCases = hasSavedCases ? [...uiState.filters.selectedCases] : getDefaultCases();
        
        if (uiState.filters?.startDate) state.filters.startDate = uiState.filters.startDate;
        if (uiState.filters?.endDate) state.filters.endDate = uiState.filters.endDate;
        
        state.scale = uiState.scale || 0.8;
        state.fitToWindow = uiState.fitToWindow || false;
        state.emojiVisibility = uiState.emojiVisibility || {};
        state.focusDate = savedFocusDate;
        
        // COHORT 3: stateExport - Combine timeline and UI data
        state.filteredEvents = applyFilters(state.allEvents, state.filters);
        state.coordinateSystem = calculateCoordinateSystem(state.filteredEvents, state.scale);
        state.hasActiveFilters = hasActiveFilters(state);
        
        // Call render with state
        render(state);
        
    } catch (error) {
        console.error('Failed to load data:', error);
        throw error;
    }
}

// Calculate coordinate system from filtered events and scale
function calculateCoordinateSystem(events, scale) {
    if (!events || events.length === 0) {
        return null;
    }
    
    // Calculate date range
    const dates = events.map(e => e.date);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Add 60-day padding
    const startDate = new Date(minDate.getTime() - (60 * 24 * 60 * 60 * 1000));
    const endDate = new Date(maxDate.getTime() + (60 * 24 * 60 * 60 * 1000));
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    
    // Calculate timeline width
    const contentWidth = totalDays * scale + TIMELINE_RIGHT_PADDING;
    const viewportWidth = window.innerWidth - 40;
    const timelineWidth = Math.max(contentWidth, viewportWidth, 1200);
    
    return {
        dateRange: { startDate, endDate, totalDays, minDate, maxDate },
        pixelsPerDay: scale,
        timelineWidth: timelineWidth,
        // Function to convert date to x position
        getXPosition: (date) => {
            const daysFromStart = (date - startDate) / (1000 * 60 * 60 * 24);
            return TIMELINE_LEFT_OFFSET + (daysFromStart * scale);
        },
        // Function to convert x position to date
        getDateFromX: (x) => {
            const daysFromStart = x / scale;
            return new Date(startDate.getTime() + (daysFromStart * 1000 * 60 * 60 * 24));
        }
    };
}

// Get default cases based on defaultVisible from cases data
function getDefaultCases() {
    // Build a map of case visibility
    const visibilityMap = {};
    state.casesData.forEach(caseData => {
        // Handle Historical special case
        if (caseData.caseNumber === '-' || caseData.title.toLowerCase() === 'historical') {
            visibilityMap['Historical'] = caseData.defaultVisible;
        } else {
            visibilityMap[caseData.caseNumber] = caseData.defaultVisible;
        }
    });
    
    // Filter case numbers to only those with defaultVisible = true
    return state.caseNumbers.filter(caseNum => {
        return visibilityMap.hasOwnProperty(caseNum) ? visibilityMap[caseNum] : true;
    });
}

// Update state based on user input
export function update(type, data) {
    switch(type) {
        case 'dateFilter':
            state.filters.startDate = data.startDate || null;
            state.filters.endDate = data.endDate || null;
            state.filters.manualDateOverride = true; // User manually set dates
            saveFilterState(state.filters);
            break;
            
        case 'scale':
            state.scale = data.scale;
            state.fitToWindow = false;
            saveScaleState(state.scale, state.fitToWindow);
            break;
            
        case 'fit':
            state.fitToWindow = data.fitToWindow;
            if (data.fitToWindow) {
                // Calculate scale to fit window
                const width = window.innerWidth - 200;
                // Calculate based on actual date range
                if (state.filteredEvents.length > 0) {
                    const dates = state.filteredEvents.map(e => new Date(e.date));
                    const minDate = new Date(Math.min(...dates));
                    const maxDate = new Date(Math.max(...dates));
                    const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
                    state.scale = Math.min(3, Math.max(0.2, width / days));
                }
            } else {
                // Reset to default scale when unchecked
                state.scale = DEFAULT_SCALE;
            }
            saveScaleState(state.scale, state.fitToWindow);
            break;
            
        case 'reset':
            state.filters.selectedCases = getDefaultCases();
            state.filters.startDate = null;
            state.filters.endDate = null;
            state.filters.manualDateOverride = false;
            state.emojiVisibility = {};
            state.scale = 0.8;
            state.fitToWindow = false;
            state.focusDate = null;  // Clear focus date on reset
            
            saveFilterState(state.filters);
            saveEmojiVisibility(state.emojiVisibility);
            saveScaleState(state.scale, state.fitToWindow);
            clearFocusDate();  // Clear from localStorage too
            break;
            
        case 'caseToggle':
            state.filters.selectedCases = data.selectedCases || [];
            saveFilterState(state.filters);
            break;
            
        case 'emojiToggle':
            state.emojiVisibility[data.emoji] = data.visible;
            saveEmojiVisibility(state.emojiVisibility);
            break;
            
        case 'isolate':
            // Save current state before isolation
            const previousState = {
                selectedCases: [...state.filters.selectedCases],
                emojiVisibility: {...state.emojiVisibility}
            };
            
            if (data.type === 'case') {
                state.filters.selectedCases = [data.target];
                setIsolationMode('case', data.target, previousState);
            } else if (data.type === 'emoji') {
                // Get all emoji classes from config
                const caselineEmojis = getEmojiArray();
                
                // Set all emojis to false except the target
                caselineEmojis.forEach(item => {
                    state.emojiVisibility[item.class] = item.class === data.target;
                });
                setIsolationMode('emoji', data.target, previousState);
            }
            
            saveFilterState(state.filters);
            saveEmojiVisibility(state.emojiVisibility);
            break;
            
        case 'exitIsolation':
            const isolation = getIsolationMode();
            if (isolation.previousState) {
                state.filters.selectedCases = isolation.previousState.selectedCases;
                state.emojiVisibility = isolation.previousState.emojiVisibility;
                
                saveFilterState(state.filters);
                saveEmojiVisibility(state.emojiVisibility);
                clearIsolationMode();
            }
            break;
    }
    
    // Re-apply filters if needed
    if (['dateFilter', 'caseToggle', 'reset', 'isolate', 'exitIsolation'].includes(type)) {
        state.filteredEvents = applyFilters(state.allEvents, state.filters);
        
        // Recalculate fit-to-window scale if enabled
        if (state.fitToWindow && state.filteredEvents.length > 0) {
            const width = window.innerWidth - 200;
            const dates = state.filteredEvents.map(e => new Date(e.date));
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
            state.scale = Math.min(3, Math.max(0.2, width / days));
            saveScaleState(state.scale, state.fitToWindow);
        }
    }
    
    // Recalculate coordinate system if events or scale changed
    if (['dateFilter', 'caseToggle', 'reset', 'isolate', 'exitIsolation', 'scale', 'fit'].includes(type)) {
        state.coordinateSystem = calculateCoordinateSystem(state.filteredEvents, state.scale);
    }
    
    // Calculate whether filters are active and add to state
    state.hasActiveFilters = hasActiveFilters(state);
    
    // Call render with state
    render(state);
}

// Export helper to check isolation state
export function checkIsolation(type, target) {
    return isIsolating(type, target);
}

// Save focus date based on scroll position
export function saveFocus(scrollLeft, clientWidth) {
    if (!state.coordinateSystem) return;
    
    // Calculate center position of viewport
    const centerX = scrollLeft + (clientWidth / 2);
    
    // Convert pixel position to date using coordinate system
    const focusDate = state.coordinateSystem.getDateFromX(centerX);
    state.focusDate = focusDate;
    
    // Persist to localStorage
    if (focusDate) {
        saveState(STORAGE_KEYS.FOCUS_DATE, focusDate.toISOString());
    }
}

// Helper function to check if arrays are equal
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every(val => b.includes(val)) && b.every(val => a.includes(val));
}

/**
 * Calculate emoji statistics for caseline events
 * @param {Array} events - Array of event objects
 * @param {Object} emojiVisibility - Optional emoji visibility state
 * @returns {Object} Statistics object with emoji counts
 */
export function calculateStats(events, emojiVisibility = null) {
    // Initialize counters for each emoji that has metricDisplay
    const emojiStats = {};
    
    events.forEach(event => {
        // Only count caseline events
        if (event.eventType === 'caseline') {
            // Count ALL emoji metrics in the event (handles multi-emoji)
            if (event.caselineEmojis && event.caselineEmojis.length > 0) {
                // Count each emoji in the array
                event.caselineEmojis.forEach(emoji => {
                    const config = getEmojiConfig(emoji);
                    
                    // Skip counting this emoji if it's hidden
                    const isHidden = emojiVisibility && config && config.class && 
                                    emojiVisibility[config.class] === false;
                    
                    if (!isHidden && config && config.metricDisplay !== undefined) {
                        if (!emojiStats[emoji]) {
                            emojiStats[emoji] = 0;
                        }
                        emojiStats[emoji]++;
                    }
                });
            }
        }
    });
    
    return { emojiStats };
}

// Check if any filters are active (non-default)
export function hasActiveFilters(state) {
    const defaults = {
        scale: 0.8,
        fitToWindow: false,
        startDate: null,
        endDate: null,
        cases: getDefaultCases()
    };
    
    return (
        state.scale !== defaults.scale ||
        state.fitToWindow !== defaults.fitToWindow ||
        state.filters.startDate !== defaults.startDate ||
        state.filters.endDate !== defaults.endDate ||
        !arraysEqual(state.filters.selectedCases, defaults.cases) ||
        (state.emojiVisibility && Object.values(state.emojiVisibility).some(v => v === false))
    );
}

/**
 * Parse all data from markdown in a single pass
 * @param {string} markdownText - Raw markdown content
 * @returns {Object} Combined parsing results
 */
function parseMarkdown(markdownText) {
    const lines = markdownText.split('\n');
    const result = {
        tableData: null,
        casesData: [],
        events: [],
        caseNumbers: []
    };
    
    // Find main table header
    const headerIndex = lines.findIndex(line => 
        line.startsWith('|') && line.toLowerCase().includes('date')
    );
    
    if (headerIndex === -1) {
        throw new Error('No table header found in markdown');
    }
    
    // Extract main table data
    const headerLine = lines[headerIndex];
    const headers = headerLine.split('|').slice(1, -1).map(s => s.trim());
    const tableRows = [];
    
    for (let i = headerIndex + 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || !line.startsWith('|')) break;
        
        const parts = line
            .split('|')
            .slice(1, -1)
            .map(p => p.trim());
        
        if (parts.length === headers.length) {
            tableRows.push(parts);
        }
    }
    
    result.tableData = { headers, rows: tableRows };
    
    // Find cases section and extract cases data
    const casesIndex = lines.findIndex(line => line.trim() === '## Cases');
    
    if (casesIndex !== -1) {
        let casesHeaderIndex = -1;
        for (let i = casesIndex + 1; i < lines.length && i < casesIndex + 5; i++) {
            if (lines[i].includes('| Case Number |')) {
                casesHeaderIndex = i;
                break;
            }
        }
        
        if (casesHeaderIndex !== -1) {
            for (let i = casesHeaderIndex + 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || !line.startsWith('|')) break;
                
                const parts = line
                    .split('|')
                    .slice(1, -1)
                    .map(p => p.trim());
                
                if (parts.length >= 4) {
                    result.casesData.push({
                        caseNumber: parts[0],
                        year: parts[1],
                        title: parts[2],
                        defaultVisible: parts[3].toUpperCase() !== 'FALSE',
                        depNumber: parts[4] || ''
                    });
                }
            }
        }
    }
    
    // Parse events and extract case numbers in one pass
    const caseSet = new Set();
    result.events = parseEventsOptimized(result.tableData, caseSet);
    result.caseNumbers = Array.from(caseSet).sort();
    
    return result;
}

// ----------------------------------------------------------------------------
// From data-loader.js
// ----------------------------------------------------------------------------

/**
 * Fetches the timeline markdown file
 * @returns {Promise<string>} Raw markdown text
 */
async function loadTableData() {
    // Cache busting is important - prevents browser from serving stale timeline data
    const response = await fetch('../!!42_Mill_St_Timeline_Overview.md?v=' + Date.now());
    
    if (!response.ok) {
        throw new Error(`Failed to load timeline data: ${response.status}`);
    }
    
    return response.text();
}

// REMOVED: extractTableRows() - replaced by parseMarkdown()
// (deleted to avoid comment block issues)

// REMOVED: extractCasesTable() - replaced by parseMarkdown()
// (deleted to avoid comment block issues)

// ----------------------------------------------------------------------------
// OPTIMIZED: parseEvents that also extracts case numbers  
// ----------------------------------------------------------------------------

/**
 * Parse events from table data and extract case numbers in one pass
 * @param {Object} tableData - Object with headers and rows arrays
 * @param {Set} caseSet - Set to collect unique case numbers
 * @returns {Object[]} Array of parsed event objects
 */
function parseEventsOptimized(tableData, caseSet) {
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
    
    // Map column names to indices
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
        
        // Add case number to set if it exists
        if (caseNumber && caseNumber.trim()) {
            caseSet.add(caseNumber.trim());
        }
        
        // Parse date
        const [year, month, day] = dateStr.split('-');
        const date = new Date(year, parseInt(month) - 1, day);
        
        // Parse document link
        let title = document;
        let documentUrl = null;
        
        if (cols.documentUrl !== -1 && row[cols.documentUrl]) {
            documentUrl = row[cols.documentUrl];
        } else {
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
        let labelEmphasis = null;
        
        const highEmphasisMatch = procedural.match(/!\*\*([^*]+)\*\*!/);
        if (highEmphasisMatch) {
            proceduralLabel = highEmphasisMatch[1];
            labelEmphasis = 'high';
        } else {
            const labelMatch = procedural.match(/\*\*([^*]+)\*\*/);
            if (labelMatch) {
                proceduralLabel = labelMatch[1];
            }
        }
        
        // Extract display detail
        const displayDetail = procedural
            .replace(/!\*\*[^*]+\*\*!/g, '')
            .replace(/\*\*[^*]+\*\*/g, '')
            .trim()
            .substring(0, 100);
        
        // Basic flags
        const isPrivate = markers.includes('🔒');
        const hasMissingDoc = markers.includes('❌');
        
        // Find ALL caseline emojis (excluding special markers)
        const emojiRegex = /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2B00}-\u{2BFF}]|[\u{23F0}-\u{23FF}]|[\u{2190}-\u{21FF}])[\u{FE0F}]?/gu;
        const allEmojis = markers.match(emojiRegex) || [];
        const caselineEmojis = allEmojis.filter(e => e !== '🔒' && e !== '❌' && e !== '🟢');
        
        // Only create caseline events (v2 doesn't use timeline events)
        if (caselineEmojis.length > 0) {
            events.push({
                date,
                dateStr,
                title,
                documentUrl,
                caseNumber: caseNumber.trim(),
                markers,
                procedural,
                proceduralLabel,
                labelEmphasis,
                displayDetail,
                isPrivate,
                hasMissingDoc,
                caselineEmojis,
                eventType: 'caseline',
                eventClass: 'case-procedural',
                caselineEmoji: caselineEmojis[0]
            });
        }
    });
    
    // Sort by date
    return events.sort((a, b) => a.date - b.date);
}

// ----------------------------------------------------------------------------
// From event-parser.js (ORIGINAL - kept for compatibility)
// ----------------------------------------------------------------------------

// REMOVED: parseEvents() - replaced by parseEventsOptimized()
// ----------------------------------------------------------------------------

/**
 * Apply all filters to events
 * @param {Object[]} events - All events
 * @param {Object} filterState - Current filter state
 * @returns {Object[]} Filtered events
 */
function applyFilters(events, filterState) {
    let filtered = events;
    
    // Apply date filter
    if (filterState.startDate || filterState.endDate) {
        filtered = filterByDate(filtered, filterState.startDate, filterState.endDate);
    }
    
    // Apply case filter - always apply it (empty array means show nothing)
    if (filterState.selectedCases !== undefined) {
        filtered = filterByCase(filtered, filterState.selectedCases);
    }
    
    return filtered;
}

/**
 * Filter events by date range
 * @param {Object[]} events - All events
 * @param {Date|null} startDate - Start date filter (null = no filter)
 * @param {Date|null} endDate - End date filter (null = no filter)
 * @returns {Object[]} Filtered events
 */
function filterByDate(events, startDate, endDate) {
    if (!startDate && !endDate) {
        return events;
    }
    
    return events.filter(event => {
        const eventDate = new Date(event.date);
        
        if (startDate && eventDate < startDate) {
            return false;
        }
        
        if (endDate && eventDate > endDate) {
            return false;
        }
        
        return true;
    });
}

/**
 * Filter events by case numbers
 * @param {Object[]} events - All events
 * @param {string[]} selectedCases - Array of selected case numbers (empty = show none)
 * @returns {Object[]} Filtered events
 */
function filterByCase(events, selectedCases) {
    if (!selectedCases || selectedCases.length === 0) {
        return [];  // When no cases selected, show nothing
    }
    
    return events.filter(event => {
        // Events without case numbers are always shown
        if (!event.caseNumber) {
            return true;
        }
        
        // Check if event's case is in selected cases
        return selectedCases.includes(event.caseNumber);
    });
}

/**
 * Load all UI state in a single operation
 * @returns {Object} All saved UI state
 */
function loadAllUIState() {
    return {
        filters: {
            startDate: loadState(STORAGE_KEYS.START_DATE),
            endDate: loadState(STORAGE_KEYS.END_DATE),
            selectedCases: loadState(STORAGE_KEYS.SELECTED_CASES)
        },
        scale: loadState(STORAGE_KEYS.SCALE) || 0.8,
        fitToWindow: loadState(STORAGE_KEYS.FIT_TO_WINDOW) || false,
        emojiVisibility: loadState(STORAGE_KEYS.EMOJI_VISIBILITY) || {}
    };
}

// ----------------------------------------------------------------------------
// Data Persistence
// ----------------------------------------------------------------------------

/**
 * Save a value to localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to save
 */
function saveState(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
}

/**
 * Load a value from localStorage
 * @param {string} key - Storage key
 * @returns {*} Loaded value or null
 */
function loadState(key) {
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    // Parse JSON values
    if (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false') {
        return JSON.parse(value);
    }
    
    // Try to parse as number
    const num = parseFloat(value);
    if (!isNaN(num)) {
        return num;
    }
    
    return value;
}

/**
 * Save filter state
 * @param {Object} filters - Filter state object
 */
function saveFilterState(filters) {
    if (filters.startDate) {
        saveState(STORAGE_KEYS.START_DATE, filters.startDate);
    }
    if (filters.endDate) {
        saveState(STORAGE_KEYS.END_DATE, filters.endDate);
    }
    if (filters.selectedCases) {
        saveState(STORAGE_KEYS.SELECTED_CASES, filters.selectedCases);
    }
}

/**
 * Save scale state
 * @param {number} scale - Scale value
 * @param {boolean} fitToWindow - Fit to window enabled
 */
function saveScaleState(scale, fitToWindow) {
    saveState(STORAGE_KEYS.SCALE, scale);
    saveState(STORAGE_KEYS.FIT_TO_WINDOW, fitToWindow);
}

// REMOVED: loadScaleState() - replaced by loadAllUIState()

/**
 * Save emoji visibility state
 * @param {Object} emojiVisibility - Object with emoji classes as keys and boolean visibility as values
 */
function saveEmojiVisibility(emojiVisibility) {
    saveState(STORAGE_KEYS.EMOJI_VISIBILITY, emojiVisibility);
}

// REMOVED: loadEmojiVisibility() - replaced by loadAllUIState()

/**
 * Isolation mode management - temporary UI state
 */
let isolationMode = {
    type: null,      // 'case' | 'emoji' | null
    target: null,    // case number or emoji class
    previousState: null // snapshot before isolation
};

/**
 * Set isolation mode
 * @param {string} type - 'case' or 'emoji'
 * @param {string} target - The case number or emoji class to isolate
 * @param {Object} previousState - State snapshot before isolation
 */
function setIsolationMode(type, target, previousState) {
    isolationMode = { type, target, previousState };
}

/**
 * Get current isolation mode
 * @returns {Object} Current isolation state
 */
function getIsolationMode() {
    return isolationMode;
}

/**
 * Clear isolation mode
 */
function clearIsolationMode() {
    isolationMode = { type: null, target: null, previousState: null };
}

/**
 * Check if currently isolating a specific target
 * @param {string} type - 'case' or 'emoji'
 * @param {string} target - The case number or emoji class
 * @returns {boolean} Whether this target is currently isolated
 */
function isIsolating(type, target) {
    return isolationMode.type === type && isolationMode.target === target;
}


/**
 * Load focus date
 * @returns {Date|null} Saved focus date or null
 */
function loadFocusDate() {
    const saved = loadState(STORAGE_KEYS.FOCUS_DATE);
    return saved ? new Date(saved) : null;
}

/**
 * Clear focus date from storage
 */
function clearFocusDate() {
    localStorage.removeItem(STORAGE_KEYS.FOCUS_DATE);
}

// Export state for focus date calculation
export { state };