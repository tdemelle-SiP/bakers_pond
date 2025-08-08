/**
 * filters.js
 * Handles date and case filtering for events
 */

/**
 * Filter events by date range
 * @param {Object[]} events - All events
 * @param {Date|null} startDate - Start date filter (null = no filter)
 * @param {Date|null} endDate - End date filter (null = no filter)
 * @returns {Object[]} Filtered events
 */
export function filterByDate(events, startDate, endDate) {
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
 * @param {string[]} selectedCases - Array of selected case numbers (empty = show all)
 * @returns {Object[]} Filtered events
 */
export function filterByCase(events, selectedCases) {
    if (!selectedCases || selectedCases.length === 0) {
        return events;
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
 * Apply all filters to events
 * @param {Object[]} events - All events
 * @param {Object} filterState - Current filter state
 * @returns {Object[]} Filtered events
 */
export function applyFilters(events, filterState) {
    let filtered = events;
    
    // Apply date filter
    if (filterState.startDate || filterState.endDate) {
        filtered = filterByDate(filtered, filterState.startDate, filterState.endDate);
    }
    
    // Apply case filter
    if (filterState.selectedCases && filterState.selectedCases.length > 0) {
        filtered = filterByCase(filtered, filterState.selectedCases);
    }
    
    return filtered;
}

/**
 * Get visible date range from filtered events
 * @param {Object[]} filteredEvents - Filtered events
 * @returns {Object} Date range with startDate and endDate
 */
export function getVisibleDateRange(filteredEvents) {
    if (filteredEvents.length === 0) {
        const now = new Date();
        return {
            startDate: now,
            endDate: now
        };
    }
    
    const dates = filteredEvents.map(e => new Date(e.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return {
        startDate: minDate,
        endDate: maxDate
    };
}

/**
 * Check if filters are active
 * @param {Object} filterState - Current filter state
 * @returns {boolean} True if any filters are active
 */
export function hasActiveFilters(filterState) {
    return !!(
        filterState.startDate ||
        filterState.endDate ||
        (filterState.selectedCases && filterState.selectedCases.length > 0)
    );
}

/**
 * Reset all filters to default state
 * @returns {Object} Clean filter state
 */
export function getDefaultFilterState() {
    return {
        startDate: null,
        endDate: null,
        selectedCases: []
    };
}