/**
 * main.js
 * Orchestrates the timeline application
 * 
 * This is a minimal version for testing - will be expanded
 */

import { loadTableData, extractTableRows } from './data-loader.js';
import { parseEvents, extractCaseNumbers, getEventDateRange } from './event-parser.js';
import { calculateDateRange, drawYearMarkers, calculateTimelineWidth, setContainerWidth, DEFAULT_SCALE } from './date-scale.js';
import { renderTimelineNodes } from './timeline-nodes.js';
import { renderCaselineNodes } from './caseline-nodes.js';
import { drawTimelineConnections, drawCaselineConnections } from './connections.js';
import { initLegend } from './legend-v2.js';
import { calculateStats, renderStats } from './stats.js';
import { applyFilters, getDefaultFilterState } from './filters.js';
import { initAllControls } from './controls-v2.js';
import { createLabelsWithCollisionDetection } from './label-layout.js';
import { renderCaseTitles } from './case-titles.js';
import { initializeState, saveFilterState, saveScaleState,
         setIsolationMode, getIsolationMode, clearIsolationMode, isIsolating,
         loadEmojiVisibility } from './state-persistence.js';

// Application state - initialize with saved values
const savedState = initializeState();
const state = {
    allEvents: [],
    filteredEvents: [],
    scale: savedState.scale || DEFAULT_SCALE,
    filters: { ...getDefaultFilterState(), ...savedState.filters },
    caseNumbers: [],
    fitToWindow: savedState.fitToWindow || false
};

// Store caseline nodes globally for label recalculation
let allCaselineNodes = [];

/**
 * Initialize the timeline application
 */
async function init() {
    console.log('Timeline v2 initializing...');
    
    // Load and parse data
    const markdown = await loadTableData();
    console.log('Loaded markdown:', markdown.length, 'characters');
    
    const tableData = extractTableRows(markdown);
    console.log('Extracted rows:', tableData.rows.length);
    console.log('Column headers:', tableData.headers);
    
    const events = parseEvents(tableData);
    console.log('Parsed events:', events.length);
    
    // Debug: Check for duplicate dates
    const dateCounts = {};
    events.forEach(e => {
        const dateStr = e.dateStr;
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    });
    const duplicates = Object.entries(dateCounts).filter(([date, count]) => count > 2);
    if (duplicates.length > 0) {
        console.warn('Dates appearing more than twice:', duplicates);
    }
    
    // Store in state
    state.allEvents = events;
    
    // Extract metadata
    const caseNumbers = extractCaseNumbers(events);
    console.log('Case numbers:', caseNumbers);
    
    // If no saved case selection, default to all except Historical
    if (state.filters.selectedCases === null || state.filters.selectedCases === undefined) {
        state.filters.selectedCases = caseNumbers.filter(c => c !== 'Historical');
    }
    
    // Apply initial filters
    state.filteredEvents = applyFilters(events, state.filters);
    
    const eventDateRange = getEventDateRange(events);
    console.log('Date range:', eventDateRange);
    
    // Log sample events for debugging
    const timelineEvent = events.find(e => e.eventType === 'timeline');
    const caselineEvent = events.find(e => e.eventType === 'caseline');
    console.log('Sample timeline event:', timelineEvent);
    console.log('Sample caseline event:', caselineEvent);
    
    // Count event types
    const timelineCount = events.filter(e => e.eventType === 'timeline').length;
    const caselineCount = events.filter(e => e.eventType === 'caseline').length;
    console.log(`Event counts: ${timelineCount} timeline, ${caselineCount} caseline`);
    
    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('timeline-content').style.display = 'block';
    
    // Initialize timeline rendering
    const container = document.getElementById('timeline-container');
    const yearMarkersContainer = document.getElementById('year-markers-container');
    const connectionsContainer = document.getElementById('connections-container');
    const dateRange = calculateDateRange(events);
    const pixelsPerDay = DEFAULT_SCALE;
    
    // Set container dimensions
    const timelineWidth = calculateTimelineWidth(dateRange.totalDays, pixelsPerDay);
    setContainerWidth(container, timelineWidth);
    
    // Draw year markers
    drawYearMarkers(yearMarkersContainer, dateRange, pixelsPerDay);
    
    // Render timeline nodes (they get their own containers internally)
    const nodePositions = renderTimelineNodes(events, dateRange, pixelsPerDay);
    console.log('Rendered timeline nodes:', nodePositions.length);
    console.log('Node X positions:', nodePositions.map(n => ({date: n.event.dateStr, x: Math.round(n.x)})));
    
    // Render caseline nodes (gets its own container internally)
    const caselineData = renderCaselineNodes(events, dateRange, pixelsPerDay);
    console.log('Rendered caseline nodes:', caselineData.nodes.length);
    
    // Store nodes globally for label recalculation
    allCaselineNodes = caselineData.nodes;
    
    // Render caseline labels with collision detection
    const caselineContainer = document.getElementById('caseline-container');
    createLabelsWithCollisionDetection(caselineData.nodes, caselineContainer);
    
    // Render case titles above caseline
    renderCaseTitles(caselineData.caseGroups, state.filters.selectedCases);
    
    // Draw connection lines
    drawTimelineConnections(nodePositions, connectionsContainer);
    drawCaselineConnections(caselineData.caseGroups, connectionsContainer);
    
    // Initialize legend
    initLegend();
    
    // Calculate and display stats with emoji visibility
    const initialVisibility = loadEmojiVisibility();
    const stats = calculateStats(events, initialVisibility);
    renderStats(stats, initialVisibility);
    console.log('Stats:', stats);
    
    // Store case numbers in state
    state.caseNumbers = caseNumbers;
    
    // Set default case selection if no saved filters
    if (!state.filters.selectedCases || state.filters.selectedCases.length === 0) {
        // Default: all cases except Historical
        state.filters.selectedCases = caseNumbers.filter(c => c !== 'Historical');
    }
    
    // Apply initial filters
    state.allEvents = events;
    state.filteredEvents = applyFilters(events, state.filters);
    
    // Initialize controls with saved state
    initAllControls({
        caseNumbers: caseNumbers,
        eventDateRange: eventDateRange,  // Pass actual date range
        initialScale: state.scale,
        initialFitToWindow: state.fitToWindow,
        initialFilters: state.filters,
        onFilterUpdate: handleFilterUpdate,
        onScaleUpdate: handleScaleUpdate,
        calculateFitScale: calculateFitToWindowScale
    });
    
    // Check for active filters on initial load
    checkActiveFilters();
    
    // All modules now initialized
}

/**
 * Reset all filters and controls to defaults
 */
function resetToDefaults() {
    console.log('Resetting to defaults...');
    
    // Get default case selection (all except Historical)
    const defaultCases = state.caseNumbers.filter(c => c !== 'Historical');
    
    // Reset scale to defaults
    state.scale = 0.8;
    state.fitToWindow = false;
    
    // Clear manual date override flag when resetting
    state.filters.manualDateOverride = false;
    
    // Use centralized filter update (will auto-compute dates)
    handleFilterUpdate({
        selectedCases: defaultCases,
        startDate: null,
        endDate: null
    });
    
    // Reset emoji visibility
    if (window.resetEmojiVisibility) {
        window.resetEmojiVisibility();
    }
    
    // Clear any isolation mode
    clearIsolationMode();
    
    // Save scale state
    saveScaleState(state.scale, state.fitToWindow);
}

// Export for use in controls
window.resetToDefaults = resetToDefaults;

/**
 * Update all UI elements to match current state
 */
function updateUIFromState() {
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
            startInput.value = state.filters.startDate instanceof Date 
                ? state.filters.startDate.toISOString().split('T')[0]
                : state.filters.startDate;
        } else {
            startInput.value = '';
        }
        
        if (state.filters.endDate) {
            endInput.value = state.filters.endDate instanceof Date
                ? state.filters.endDate.toISOString().split('T')[0]
                : state.filters.endDate;
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
 * Isolate a single case or restore previous state
 * @param {string} caseNumber - Case number to isolate
 */
function isolateCase(caseNumber) {
    if (isIsolating('case', caseNumber)) {
        // Restore previous state
        const isolation = getIsolationMode();
        clearIsolationMode();
        
        // Restore filters
        state.fitToWindow = isolation.previousState.fitToWindow;
        state.scale = isolation.previousState.scale;
        saveScaleState(state.scale, state.fitToWindow);
        
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
        state.fitToWindow = true;
        
        // Use centralized handler to isolate case (will auto-compute dates)
        handleFilterUpdate({
            selectedCases: [caseNumber],
            manualDateOverride: false  // Reset to auto-compute for isolated case
        });
    }
}

// Export for use in case-titles
window.isolateCase = isolateCase;

/**
 * Check if filters are active (non-default state)
 */
function checkActiveFilters() {
    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');
    const resetButton = document.getElementById('reset-filters');
    const caseButton = document.getElementById('case-filter-button');
    const scaleSlider = document.getElementById('scale-slider');
    const fitCheckbox = document.getElementById('fit-to-window');
    
    // Get default case selection (all except Historical)
    const defaultCases = state.caseNumbers.filter(c => c !== 'Historical');
    
    // Check if we have non-default filters
    let hasActiveFilters = false;
    
    // Check date filters - dates are only "active" if manually changed from the default range for selected cases
    // The default is the date range of the currently selected cases
    const selectedCaseEvents = state.filters.selectedCases && state.filters.selectedCases.length > 0
        ? state.allEvents.filter(e => state.filters.selectedCases.includes(e.caseNumber))
        : state.allEvents.filter(e => defaultCases.includes(e.caseNumber));
    
    if (selectedCaseEvents.length > 0 && startInput && endInput) {
        const defaultRange = getEventDateRange(selectedCaseEvents);
        if (defaultRange.minDate && defaultRange.maxDate) {
            const defaultStart = new Date(defaultRange.minDate).toISOString().split('T')[0];
            const defaultEnd = new Date(defaultRange.maxDate).toISOString().split('T')[0];
            const currentStart = startInput.value;
            const currentEnd = endInput.value;
            
            // Only mark as active if dates differ from the default for selected cases
            if (currentStart !== defaultStart || currentEnd !== defaultEnd) {
                hasActiveFilters = true;
                startInput.classList.add('active-filter');
                endInput.classList.add('active-filter');
            } else {
                startInput.classList.remove('active-filter');
                endInput.classList.remove('active-filter');
            }
        }
    }
    
    // Check case filters - if they differ from default
    const currentCases = state.filters.selectedCases || [];
    const isDefaultCases = defaultCases.length === currentCases.length && 
                          defaultCases.every(c => currentCases.includes(c));
    
    if (!isDefaultCases) {
        hasActiveFilters = true;
        if (caseButton) caseButton.classList.add('active-filter');
    } else {
        if (caseButton) caseButton.classList.remove('active-filter');
    }
    
    // Check scale - default is 0.8
    if (scaleSlider && parseFloat(scaleSlider.value) !== 0.8) {
        hasActiveFilters = true;
    }
    
    // Check fit to window - default is unchecked
    if (fitCheckbox && fitCheckbox.checked) {
        hasActiveFilters = true;
    }
    
    // Update reset button
    if (resetButton) {
        if (hasActiveFilters) {
            resetButton.classList.add('active-filters');
        } else {
            resetButton.classList.remove('active-filters');
        }
    }
}

/**
 * Compute date range for selected cases
 * @returns {Object|null} Object with startDate and endDate, or null if no valid range
 */
function computeDateRangeForCases(selectedCases) {
    if (!selectedCases || selectedCases.length === 0) return null;
    
    const eventsForCases = state.allEvents.filter(e => 
        selectedCases.includes(e.caseNumber)
    );
    
    if (eventsForCases.length === 0) return null;
    
    const dateRange = getEventDateRange(eventsForCases);
    if (!dateRange.minDate || !dateRange.maxDate) return null;
    
    console.log('Computed date range for', eventsForCases.length, 'events:', 
        dateRange.minDate.toISOString().split('T')[0], 'to', 
        dateRange.maxDate.toISOString().split('T')[0]);
    
    return {
        startDate: dateRange.minDate,
        endDate: dateRange.maxDate
    };
}

/**
 * Central handler for all filter updates - single source of truth
 * Implements hybrid date filtering: auto-compute from cases unless manually overridden
 */
function handleFilterUpdate(filterUpdate) {
    console.log('Filter update:', filterUpdate);
    
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
    Object.assign(state.filters, filterUpdate);
    
    // Auto-compute dates if:
    // 1. Cases changed AND
    // 2. Dates weren't manually overridden
    if (casesChanged && !state.filters.manualDateOverride) {
        const computedDates = computeDateRangeForCases(state.filters.selectedCases);
        if (computedDates) {
            state.filters.startDate = computedDates.startDate;
            state.filters.endDate = computedDates.endDate;
        }
    }
    
    // Apply filters
    state.filteredEvents = applyFilters(state.allEvents, state.filters);
    
    // Save state
    saveFilterState(state.filters);
    
    // Update scale if fit-to-window
    if (state.fitToWindow) {
        const fitScale = calculateFitToWindowScale();
        state.scale = fitScale;
        saveScaleState(state.scale, state.fitToWindow);
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
function handleScaleUpdate(scaleUpdate) {
    console.log('Scale update:', scaleUpdate);
    
    if (scaleUpdate.scale !== undefined) {
        state.scale = scaleUpdate.scale;
    }
    
    if (scaleUpdate.fitToWindow !== undefined) {
        state.fitToWindow = scaleUpdate.fitToWindow;
    }
    
    // Save to localStorage
    saveScaleState(state.scale, state.fitToWindow);
    
    // Re-render with new scale
    render();
    
    // Update visual indicators for active filters
    checkActiveFilters();
}

/**
 * Calculate scale to fit visible events in window
 */
function calculateFitToWindowScale() {
    const container = document.getElementById('timeline-container');
    const dateRange = calculateDateRange(state.filteredEvents);
    // Account for: 155px left offset + 50px right padding + 40px container padding
    const availableWidth = window.innerWidth - 245; 
    
    if (dateRange.totalDays > 0) {
        return Math.min(3.0, availableWidth / dateRange.totalDays);
    }
    
    return DEFAULT_SCALE;
}

/**
 * Re-render the timeline with current state
 */
function render() {
    console.log('Rendering with', state.filteredEvents.length, 'filtered events');
    
    // Clear existing content
    const caselineContainer = document.getElementById('caseline-container');
    const timelineContainer = document.getElementById('timeline-nodes-container');
    const yearMarkersContainer = document.getElementById('year-markers-container');
    const connectionsContainer = document.getElementById('connections-container');
    
    if (caselineContainer) {
        // Preserve the case titles container if it exists
        const titlesContainer = document.getElementById('case-titles-container');
        caselineContainer.innerHTML = '';
        if (titlesContainer) {
            caselineContainer.appendChild(titlesContainer);
        }
    }
    if (timelineContainer) timelineContainer.innerHTML = '';
    if (yearMarkersContainer) yearMarkersContainer.innerHTML = '';
    if (connectionsContainer) connectionsContainer.innerHTML = '';
    
    // Recalculate date range and render
    const dateRange = calculateDateRange(state.filteredEvents);
    const pixelsPerDay = state.scale;
    
    // Update container width
    const container = document.getElementById('timeline-container');
    const timelineWidth = calculateTimelineWidth(dateRange.totalDays, pixelsPerDay);
    setContainerWidth(container, timelineWidth);
    
    // Draw year markers
    drawYearMarkers(yearMarkersContainer, dateRange, pixelsPerDay);
    
    // Render nodes
    const nodePositions = renderTimelineNodes(state.filteredEvents, dateRange, pixelsPerDay);
    const caselineData = renderCaselineNodes(state.filteredEvents, dateRange, pixelsPerDay);
    
    // Store for label refresh when emoji visibility changes
    allCaselineNodes = caselineData.nodes;
    
    // Render labels with collision detection  
    createLabelsWithCollisionDetection(caselineData.nodes, caselineContainer);
    
    // Render case titles
    const visibleCases = state.filters.selectedCases && state.filters.selectedCases.length > 0 ?
        state.filters.selectedCases : state.caseNumbers;
    renderCaseTitles(caselineData.caseGroups, visibleCases);
    
    // Draw connections
    drawTimelineConnections(nodePositions, connectionsContainer);
    drawCaselineConnections(caselineData.caseGroups, connectionsContainer);
    
    // Update stats with emoji visibility
    const emojiVisibility = loadEmojiVisibility();
    const stats = calculateStats(state.filteredEvents, emojiVisibility);
    renderStats(stats, emojiVisibility);
    
    // Reapply emoji visibility state after re-rendering
    applyEmojiVisibility();
}

/**
 * Apply saved emoji visibility state to current nodes
 * Called after rendering and made available to legend
 */
function applyEmojiVisibility() {
    const savedVisibility = loadEmojiVisibility();
    
    Object.entries(savedVisibility).forEach(([emojiClass, isVisible]) => {
        const elements = document.querySelectorAll(`[data-emoji-type="${emojiClass}"]`);
        elements.forEach(element => {
            element.style.display = isVisible === false ? 'none' : '';
        });
    });
    
    // Refresh labels to account for hidden nodes
    if (window.refreshCaselineLabels) {
        window.refreshCaselineLabels();
    }
    
    // Update stats to reflect visible emojis only
    const stats = calculateStats(state.filteredEvents, savedVisibility);
    renderStats(stats, savedVisibility);
}

// Make it available to legend
window.applyEmojiVisibility = applyEmojiVisibility;

/**
 * Refresh labels when emoji visibility changes
 * Simply re-runs label collision detection with only visible nodes
 */
window.refreshCaselineLabels = function() {
    if (!allCaselineNodes || allCaselineNodes.length === 0) return;
    
    const caselineContainer = document.getElementById('caseline-container');
    if (!caselineContainer) return;
    
    // Filter to only visible nodes
    const visibleNodes = allCaselineNodes.filter(node => {
        if (!node.emojiType) return true;
        // Check if this emoji type is visible
        const nodeElement = node.node;  // We stored the actual DOM node
        return nodeElement && nodeElement.style.display !== 'none';
    });
    
    // Remove existing labels and leader lines only
    caselineContainer.querySelectorAll('.node-label, svg[data-emoji-type]').forEach(el => {
        el.remove();
    });
    
    // Re-create labels with updated collision detection
    createLabelsWithCollisionDetection(visibleNodes, caselineContainer);
};

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export state for debugging
window.timelineState = state;