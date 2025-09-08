// main.js
// - Creates DOM structure
// - Sets up event listeners
// - Calls state.js on load
// - Calls state.js on user input

// state.js
// - Loads TSV data
// - Loads saved preferences
// - Updates state
// - Calls render.js

// render.js
// - Updates controls to reflect state
// - Updates timeline to reflect state

import { render } from './render.js';

// Import existing parsing and persistence functions
import { loadTableData, extractTableRows, extractCasesTable } from '../js/data-loader.js';
import { parseEvents } from '../js/event-parser.js';
import { applyFilters } from '../js/filters.js';
import { 
    loadFilterState, 
    saveFilterState,
    loadScaleState,
    saveScaleState,
    loadEmojiVisibility,
    saveEmojiVisibility,
    setIsolationMode,
    getIsolationMode,
    clearIsolationMode,
    isIsolating
} from '../js/state-persistence.js';

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
    focusDate: null  // Date that should be centered after refresh
};

// Load data and saved preferences
export async function loadData() {
    try {
        // Load markdown file using existing data-loader
        const markdownText = await loadTableData();
        
        // Extract timeline table and parse events
        const tableData = extractTableRows(markdownText);
        state.allEvents = parseEvents(tableData);
        
        // Extract cases metadata
        state.casesData = extractCasesTable(markdownText);
        
        // Get unique case numbers from events
        const caseNumbersSet = new Set();
        state.allEvents.forEach(event => {
            if (event.caseNumber) {
                caseNumbersSet.add(event.caseNumber);
            }
        });
        state.caseNumbers = Array.from(caseNumbersSet).sort();
        
        // Load saved preferences using existing persistence functions
        const savedFilters = loadFilterState();
        const savedScale = loadScaleState();
        const savedEmojiVisibility = loadEmojiVisibility();
        
        // Apply saved preferences
        // Use saved cases only if the array exists and has items; otherwise fall back to defaults.
        // This prevents an empty saved array from hiding everything on first load.
        const hasSavedCases = Array.isArray(savedFilters?.selectedCases) && savedFilters.selectedCases.length > 0;
        state.filters.selectedCases = hasSavedCases ? [...savedFilters.selectedCases] : getDefaultCases();
        
        if (savedFilters.startDate) state.filters.startDate = savedFilters.startDate;
        if (savedFilters.endDate) state.filters.endDate = savedFilters.endDate;
        
        state.scale = savedScale.scale || 0.8;
        state.fitToWindow = savedScale.fitToWindow || false;
        state.emojiVisibility = savedEmojiVisibility;
        
        // Apply filters to get filteredEvents
        state.filteredEvents = applyFilters(state.allEvents, state.filters);
        
        // Calculate whether filters are active
        state.hasActiveFilters = hasActiveFilters(state);
        
        // Call render with state
        render(state);
        
    } catch (error) {
        console.error('Failed to load data:', error);
        throw error;
    }
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
            
            saveFilterState(state.filters);
            saveEmojiVisibility(state.emojiVisibility);
            saveScaleState(state.scale, state.fitToWindow);
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
                // Hide all emojis except the target
                Object.keys(state.emojiVisibility).forEach(emoji => {
                    state.emojiVisibility[emoji] = emoji === data.target;
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
    
    // Calculate whether filters are active and add to state
    state.hasActiveFilters = hasActiveFilters(state);
    
    // Call render with state
    render(state);
}

// Export helper to check isolation state
export function checkIsolation(type, target) {
    return isIsolating(type, target);
}

// Helper function to check if arrays are equal
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every(val => b.includes(val)) && b.every(val => a.includes(val));
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
        Object.values(state.emojiVisibility).some(v => v === false)
    );
}

// Export state for focus date calculation
export { state };