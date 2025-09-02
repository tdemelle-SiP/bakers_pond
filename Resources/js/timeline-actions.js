/**
 * timeline-actions.js
 * Business logic and actions for the timeline
 * These functions can be imported by any module that needs them
 */

import { state, updateState, getDefaultCases } from './state-manager.js';
import { applyFilters } from './filters.js';
import { getEventDateRange } from './event-parser.js';
import { calculateDateRange } from './date-scale.js';
import { getEmojiArray } from './emoji-config.js';
// Import render dynamically to avoid circular dependency
let render;
import { setIsolationMode, getIsolationMode, clearIsolationMode, isIsolating, loadEmojiVisibility, saveEmojiVisibility } from './state-persistence.js';
import { calculateStats, renderStats } from './stats.js';
import { createLabelsWithCollisionDetection } from './label-layout.js';

/**
 * Initialize render function to avoid circular dependency
 */
export function initRender(renderFunc) {
    render = renderFunc;
}

/**
 * Refresh labels when emoji visibility changes
 */
export function refreshCaselineLabels() {
    // Get nodes from state (stored by renderer)
    if (!state.caselineNodes || state.caselineNodes.length === 0) return;
    
    const caselineContainer = document.getElementById('caseline-container');
    if (!caselineContainer) return;
    
    // Filter to only visible nodes
    const visibleNodes = state.caselineNodes.filter(node => {
        if (!node.emojiType) return true;
        const nodeElement = node.node;
        return nodeElement && nodeElement.style.display !== 'none';
    });
    
    // Remove existing labels and leader lines only
    caselineContainer.querySelectorAll('.node-label, svg[data-emoji-type]').forEach(el => {
        el.remove();
    });
    
    // Re-create labels with updated collision detection
    createLabelsWithCollisionDetection(visibleNodes, caselineContainer);
}

/**
 * Apply saved emoji visibility state to current nodes
 */
export function applyEmojiVisibility() {
    const savedVisibility = loadEmojiVisibility();
    
    Object.entries(savedVisibility).forEach(([emojiClass, isVisible]) => {
        const elements = document.querySelectorAll(`[data-emoji-type="${emojiClass}"]`);
        elements.forEach(element => {
            element.style.display = isVisible === false ? 'none' : '';
        });
    });
    
    // Refresh labels to account for hidden nodes
    refreshCaselineLabels();
    
    // Update stats to reflect visible emojis only
    const stats = calculateStats(state.filteredEvents, savedVisibility);
    renderStats(stats, savedVisibility);
    
    // Store visibility in state for renderer to use
    updateState({ emojiVisibility: savedVisibility });
}

/**
 * Reset emoji visibility to default values from config
 */
export function resetEmojiVisibility() {
    // Clear any emoji isolation
    if (getIsolationMode().type === 'emoji') {
        clearIsolationMode();
    }
    
    // Build default visibility from emoji config
    const defaultVisibility = {};
    const caselineEmojis = getEmojiArray('caseline');
    
    caselineEmojis.forEach(item => {
        // Use defaultVisible property, default to true if not specified
        defaultVisibility[item.class] = item.defaultVisible !== false;
    });
    
    // Save and apply default visibility
    saveEmojiVisibility(defaultVisibility);
    
    // Reset checkboxes to match defaults
    const toggleCheckboxes = document.querySelectorAll('.emoji-toggle');
    toggleCheckboxes.forEach(checkbox => {
        const emojiClass = checkbox.dataset.emojiClass;
        checkbox.checked = defaultVisibility[emojiClass] !== false;
    });
    
    // Apply changes
    applyEmojiVisibility();
}

/**
 * Toggle emoji visibility for a specific type
 */
export function toggleEmojiVisibility(emojiClass, isVisible) {
    const visibility = loadEmojiVisibility();
    visibility[emojiClass] = isVisible;
    saveEmojiVisibility(visibility);
    applyEmojiVisibility();
}

// Re-export state-persistence functions for UI layer
export { 
    isIsolating, 
    getIsolationMode, 
    clearIsolationMode, 
    setIsolationMode,
    saveEmojiVisibility,
    loadEmojiVisibility 
};

/**
 * Initialize application with loaded data
 * This is the ONLY place initial state is set up
 */
export function initializeApp(events, caseNumbers, casesData = []) {
    // Set up all initial state
    updateState({ 
        allEvents: events,
        caseNumbers: caseNumbers,
        casesData: casesData
    });
    
    // Set default case selection if needed (use getDefaultCases which now checks casesData)
    if (!state.filters.selectedCases || state.filters.selectedCases.length === 0) {
        updateState({
            filters: {
                selectedCases: getDefaultCases()
            }
        });
    }
    
    // Apply initial filters
    const filteredEvents = applyFilters(events, state.filters);
    updateState({ filteredEvents });
    
    // Do initial render
    render();
    
    // Update UI to match state
    updateUIFromState();
    
    // Check for active filters
    checkActiveFilters();
}

/**
 * Reset all filters and controls to defaults
 */
export function resetToDefaults() {
    // Get default case selection (all except Historical)
    const defaultCases = getDefaultCases();
    
    // Reset scale to defaults
    updateState({
        scale: 0.8,
        fitToWindow: false
    });
    
    // Clear manual date override flag when resetting
    updateState({
        filters: {
            manualDateOverride: false,
            selectedCases: defaultCases,
            startDate: null,
            endDate: null
        }
    });
    
    // Use centralized filter update (will auto-compute dates)
    handleFilterUpdate({
        selectedCases: defaultCases,
        startDate: null,
        endDate: null
    });
    
    // Clear any isolation mode
    clearIsolationMode();
    
    // Note: Emoji visibility reset is handled by the caller (controls.js)
}

/**
 * Isolate a single case or restore previous state
 * @param {string} caseNumber - Case number to isolate
 */
export function isolateCase(caseNumber) {
    if (isIsolating('case', caseNumber)) {
        // Restore previous state
        const isolation = getIsolationMode();
        clearIsolationMode();
        
        // Restore filters
        updateState({
            fitToWindow: isolation.previousState.fitToWindow,
            scale: isolation.previousState.scale
        });
        
        // Use centralized handler for filter update
        handleFilterUpdate({
            selectedCases: isolation.previousState.selectedCases,
            manualDateOverride: isolation.previousState.manualDateOverride
        });
    } else {
        // Save current state for restore
        setIsolationMode('case', caseNumber, {
            selectedCases: [...state.filters.selectedCases],
            fitToWindow: state.fitToWindow,
            scale: state.scale,
            manualDateOverride: state.filters.manualDateOverride
        });
        
        // Enable fit-to-window for isolation
        updateState({ fitToWindow: true });
        
        // Use centralized handler to isolate case (will auto-compute dates)
        handleFilterUpdate({
            selectedCases: [caseNumber],
            manualDateOverride: false  // Reset to auto-compute for isolated case
        });
    }
}

/**
 * Compute date range for selected cases
 * @returns {Object|null} Object with startDate and endDate, or null if no valid range
 */
export function computeDateRangeForCases(selectedCases) {
    if (!selectedCases || selectedCases.length === 0) return null;
    
    const eventsForCases = state.allEvents.filter(e => 
        selectedCases.includes(e.caseNumber)
    );
    
    if (eventsForCases.length === 0) return null;
    
    const dateRange = getEventDateRange(eventsForCases);
    if (!dateRange.minDate || !dateRange.maxDate) return null;
    
    return {
        startDate: dateRange.minDate,
        endDate: dateRange.maxDate
    };
}

/**
 * Central handler for all filter updates - single source of truth
 * Implements hybrid date filtering: auto-compute from cases unless manually overridden
 */
export function handleFilterUpdate(filterUpdate) {
    const casesChanged = filterUpdate.selectedCases !== undefined;
    const datesChanged = filterUpdate.startDate !== undefined || filterUpdate.endDate !== undefined;
    
    // If dates are being manually set, mark override
    if (datesChanged && filterUpdate.startDate !== null && filterUpdate.endDate !== null) {
        filterUpdate.manualDateOverride = true;
    }
    
    // If resetting (dates set to null), clear override
    if (datesChanged && filterUpdate.startDate === null && filterUpdate.endDate === null) {
        filterUpdate.manualDateOverride = false;
    }
    
    // Update state
    updateState({ filters: filterUpdate });
    
    // Auto-compute dates if:
    // 1. Cases changed AND
    // 2. Dates weren't manually overridden
    if (casesChanged && !state.filters.manualDateOverride) {
        const computedDates = computeDateRangeForCases(state.filters.selectedCases);
        if (computedDates) {
            updateState({
                filters: {
                    startDate: computedDates.startDate,
                    endDate: computedDates.endDate
                }
            });
        }
    }
    
    // Apply filters
    const filteredEvents = applyFilters(state.allEvents, state.filters);
    updateState({ filteredEvents });
    
    // Update scale if fit-to-window
    if (state.fitToWindow) {
        const fitScale = calculateFitToWindowScale();
        updateState({ scale: fitScale });
    }
    
    // Update UI from state (single source of truth)
    updateUIFromState();
    
    // Re-render timeline
    render();
    
    // Update visual indicators
    checkActiveFilters();
}

/**
 * Handle scale updates
 */
export function handleScaleUpdate(scaleUpdate) {
    if (scaleUpdate.scale !== undefined) {
        updateState({ scale: scaleUpdate.scale });
    }
    
    if (scaleUpdate.fitToWindow !== undefined) {
        updateState({ fitToWindow: scaleUpdate.fitToWindow });
    }
    
    // Re-render with new scale
    render();
    
    // Update visual indicators for active filters
    checkActiveFilters();
}

/**
 * Calculate scale to fit visible events in window
 */
export function calculateFitToWindowScale() {
    const dateRange = calculateDateRange(state.filteredEvents);
    // Account for: 155px left offset + 50px right padding + 40px container padding
    const availableWidth = window.innerWidth - 245; 
    
    if (dateRange.totalDays > 0) {
        return Math.min(3.0, availableWidth / dateRange.totalDays);
    }
    
    return 0.8;
}

/**
 * Update all UI elements to match current state
 */
export function updateUIFromState() {
    // Update scale controls
    const fitCheckbox = document.getElementById('fit-to-window');
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValue = document.getElementById('scale-value');
    
    if (fitCheckbox) fitCheckbox.checked = state.fitToWindow;
    if (scaleSlider) {
        scaleSlider.value = state.scale;
    }
    if (scaleValue) scaleValue.textContent = state.scale.toFixed(1);
    
    // Update case checkboxes
    const checkboxes = document.querySelectorAll('.case-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = state.filters.selectedCases.includes(cb.value);
    });
    
    // Update case filter button text
    const caseFilterText = document.getElementById('case-filter-text');
    if (caseFilterText) {
        const selectedCount = state.filters.selectedCases.length;
        const totalCount = state.caseNumbers.length;
        
        if (selectedCount === totalCount) {
            caseFilterText.textContent = 'All Cases';
        } else if (selectedCount === 1) {
            caseFilterText.textContent = `1 Case`;
        } else {
            caseFilterText.textContent = `${selectedCount} of ${totalCount} Cases`;
        }
    }
    
    // Update date inputs
    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');
    if (startInput && endInput) {
        // Format dates for input fields
        if (state.filters.startDate) {
            const startDate = state.filters.startDate;
            if (startDate instanceof Date) {
                startInput.value = startDate.toISOString().split('T')[0];
            } else if (typeof startDate === 'string') {
                // Remove quotes if present and extract date part
                const cleanDate = startDate.replace(/"/g, '').split('T')[0];
                startInput.value = cleanDate;
            } else {
                startInput.value = '';
            }
        } else {
            startInput.value = '';
        }
        
        if (state.filters.endDate) {
            const endDate = state.filters.endDate;
            if (endDate instanceof Date) {
                endInput.value = endDate.toISOString().split('T')[0];
            } else if (typeof endDate === 'string') {
                // Remove quotes if present and extract date part
                const cleanDate = endDate.replace(/"/g, '').split('T')[0];
                endInput.value = cleanDate;
            } else {
                endInput.value = '';
            }
        } else {
            endInput.value = '';
        }
        
        // Update min/max constraints based on available data
        const dateRange = computeDateRangeForCases(state.filters.selectedCases);
        if (dateRange) {
            const minStr = dateRange.startDate.toISOString().split('T')[0];
            const maxStr = dateRange.endDate.toISOString().split('T')[0];
            startInput.min = minStr;
            startInput.max = maxStr;
            endInput.min = minStr;
            endInput.max = maxStr;
        }
    }
}

/**
 * Check if filters are active (non-default state)
 */
export function checkActiveFilters() {
    const resetButton = document.getElementById('reset-filters');
    const caseButton = document.getElementById('case-filter-button');
    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');
    
    // Get defaults
    const defaultCases = getDefaultCases();
    const defaultScale = 0.8;
    
    // Check what's not default
    const hasNonDefaultCases = state.filters.selectedCases.length !== defaultCases.length ||
                               !state.filters.selectedCases.every(c => defaultCases.includes(c));
    const hasNonDefaultScale = state.scale !== defaultScale;
    const hasFitToWindow = state.fitToWindow;
    const hasManualDateOverride = state.filters.manualDateOverride;
    
    // Any non-default is active
    const hasActiveFilters = hasNonDefaultCases || hasNonDefaultScale || hasFitToWindow || hasManualDateOverride;
    
    // Update visual indicators
    if (caseButton) {
        caseButton.classList.toggle('active-filter', hasNonDefaultCases);
    }
    
    if (startInput && endInput) {
        startInput.classList.toggle('active-filter', hasManualDateOverride);
        endInput.classList.toggle('active-filter', hasManualDateOverride);
    }
    
    if (resetButton) {
        resetButton.classList.toggle('active-filters', hasActiveFilters);
    }
}