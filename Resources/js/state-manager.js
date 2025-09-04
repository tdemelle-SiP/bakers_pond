/**
 * state-manager.js
 * Central state management for the timeline application
 * Single source of truth for all application state
 */

import { getDefaultFilterState } from './filters.js';
import { DEFAULT_SCALE } from './date-scale.js';
import { initializeState, saveFilterState, saveScaleState } from './state-persistence.js';

// Initialize state with saved values or defaults
const savedState = initializeState();

// Application state - single source of truth
export const state = {
    allEvents: [],
    filteredEvents: [],
    caseNumbers: [],
    casesData: [],  // Metadata about cases from markdown
    caselineNodes: [],
    scale: savedState.scale || DEFAULT_SCALE,
    fitToWindow: savedState.fitToWindow || false,
    emojiVisibility: savedState.emojiVisibility || {},
    filters: { ...getDefaultFilterState(), ...savedState.filters },
    focusDate: savedState.focusDate || null
};

/**
 * Update state and persist changes
 * @param {Object} updates - Partial state updates
 */
export function updateState(updates) {
    // Update filters
    if (updates.filters) {
        Object.assign(state.filters, updates.filters);
        saveFilterState(state.filters);
    }
    
    // Update scale/fitToWindow
    if (updates.scale !== undefined) {
        state.scale = typeof updates.scale === 'number' ? updates.scale : parseFloat(updates.scale);
        saveScaleState(state.scale, state.fitToWindow);
    }
    
    if (updates.fitToWindow !== undefined) {
        state.fitToWindow = updates.fitToWindow;
        saveScaleState(state.scale, state.fitToWindow);
    }
    
    // Update other state properties
    if (updates.allEvents) state.allEvents = updates.allEvents;
    if (updates.filteredEvents) state.filteredEvents = updates.filteredEvents;
    if (updates.caseNumbers) state.caseNumbers = updates.caseNumbers;
    if (updates.casesData) state.casesData = updates.casesData;
    if (updates.caselineNodes) state.caselineNodes = updates.caselineNodes;
    if (updates.emojiVisibility) state.emojiVisibility = updates.emojiVisibility;
    if (updates.focusDate !== undefined) state.focusDate = updates.focusDate;
}

/**
 * Get current state (read-only)
 * @returns {Object} Current state
 */
export function getState() {
    return { ...state };
}

/**
 * Get default cases based on defaultVisible from cases data
 * @returns {string[]} Default case selection
 */
export function getDefaultCases() {
    const casesData = state.casesData || [];
    
    // Build a map of case visibility
    const visibilityMap = {};
    casesData.forEach(caseData => {
        // Handle Historical special case
        if (caseData.caseNumber === '-' || caseData.title.toLowerCase() === 'historical') {
            visibilityMap['Historical'] = caseData.defaultVisible;
        } else {
            visibilityMap[caseData.caseNumber] = caseData.defaultVisible;
        }
    });
    
    // Filter case numbers to only those with defaultVisible = true
    return state.caseNumbers.filter(caseNum => {
        // If we have visibility data, use it; otherwise default to true
        return visibilityMap.hasOwnProperty(caseNum) ? visibilityMap[caseNum] : true;
    });
}