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
         setIsolationMode, getIsolationMode, clearIsolationMode, isIsolating } from './state-persistence.js';

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
    
    const tableRows = extractTableRows(markdown);
    console.log('Extracted rows:', tableRows.length);
    
    const events = parseEvents(tableRows);
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
    
    // Calculate and display stats
    const stats = calculateStats(events);
    renderStats(stats);
    console.log('Stats:', stats);
    
    // Store case numbers in state
    state.caseNumbers = caseNumbers;
    
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
    
    // Reset all state to defaults
    state.filters.selectedCases = defaultCases;
    state.filters.startDate = null;
    state.filters.endDate = null;
    state.scale = 0.8;
    state.fitToWindow = false;
    
    // Update UI elements directly without triggering events
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValue = document.getElementById('scale-value');
    const fitCheckbox = document.getElementById('fit-to-window');
    
    if (scaleSlider) {
        scaleSlider.value = 0.8;
        console.log('Reset scale slider to:', scaleSlider.value);
    }
    if (scaleValue) {
        scaleValue.textContent = '0.8';
    }
    if (fitCheckbox) {
        fitCheckbox.checked = false;
        console.log('Reset fit checkbox to:', fitCheckbox.checked);
    }
    
    // Update case checkboxes
    const checkboxes = document.querySelectorAll('.case-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = defaultCases.includes(checkbox.value);
    });
    
    // Update case filter button text
    const caseFilterText = document.getElementById('case-filter-text');
    if (caseFilterText) {
        // Check if we have all cases except Historical
        const hasHistorical = state.caseNumbers.includes('Historical');
        const isDefaultSelection = hasHistorical && 
                                  defaultCases.length === (state.caseNumbers.length - 1);
        
        caseFilterText.textContent = isDefaultSelection 
            ? `${defaultCases.length} of ${state.caseNumbers.length} Cases`
            : 'All Cases';
    }
    
    // Apply filters
    state.filteredEvents = applyFilters(state.allEvents, state.filters);
    
    // Update date range to match the filtered events
    updateDateFilterRange();
    
    // Reset emoji visibility
    if (window.resetEmojiVisibility) {
        window.resetEmojiVisibility();
    }
    
    // Clear any isolation mode
    clearIsolationMode();
    
    // Save the reset state
    saveFilterState(state.filters);
    saveScaleState(state.scale, state.fitToWindow);
    
    // Re-render with the new state
    render();
    
    // Update visual indicators
    checkActiveFilters();
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
        scaleSlider.disabled = state.fitToWindow;
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
    if (startInput) startInput.value = state.filters.startDate || '';
    if (endInput) endInput.value = state.filters.endDate || '';
}

/**
 * Isolate a single case or restore previous state
 * @param {string} caseNumber - Case number to isolate
 */
function isolateCase(caseNumber) {
    if (isIsolating('case', caseNumber)) {
        // Restore previous state
        const isolation = getIsolationMode();
        state.filters.selectedCases = isolation.previousState.selectedCases;
        state.fitToWindow = isolation.previousState.fitToWindow;
        state.scale = isolation.previousState.scale;
        clearIsolationMode();
        
        // Apply filters for restored state
        state.filteredEvents = applyFilters(state.allEvents, state.filters);
    } else {
        // Save current state and isolate
        setIsolationMode('case', caseNumber, {
            selectedCases: [...state.filters.selectedCases],
            fitToWindow: state.fitToWindow,
            scale: state.scale
        });
        
        // Set to only show this case
        state.filters.selectedCases = [caseNumber];
        state.fitToWindow = true;
        
        // Apply filters first to get the correct filtered events
        state.filteredEvents = applyFilters(state.allEvents, state.filters);
        
        // Calculate and apply the fit-to-window scale
        const fitScale = calculateFitToWindowScale();
        state.scale = fitScale;
    }
    
    // Update UI and re-render
    updateUIFromState();
    saveFilterState(state.filters);
    saveScaleState(state.scale, state.fitToWindow);
    render();
    checkActiveFilters();
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
 * Update date filter range based on selected cases
 */
function updateDateFilterRange() {
    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');
    
    if (!startInput || !endInput) return;
    
    // Determine which events to use for date range
    let eventsForDateRange = state.allEvents;
    if (state.filters.selectedCases && state.filters.selectedCases.length > 0) {
        // Filter to only selected cases
        eventsForDateRange = state.allEvents.filter(e => 
            state.filters.selectedCases.includes(e.caseNumber)
        );
    }
    
    // Calculate date range for these events
    if (eventsForDateRange.length > 0) {
        const dateRange = getEventDateRange(eventsForDateRange);
        
        // Check if dates are valid before updating
        if (dateRange.minDate && dateRange.maxDate && 
            !isNaN(dateRange.minDate.getTime()) && !isNaN(dateRange.maxDate.getTime())) {
            
            const minDateStr = dateRange.minDate.toISOString().split('T')[0];
            const maxDateStr = dateRange.maxDate.toISOString().split('T')[0];
            
            // Update date inputs with new range
            startInput.value = minDateStr;
            endInput.value = maxDateStr;
            startInput.min = minDateStr;
            startInput.max = maxDateStr;
            endInput.min = minDateStr;
            endInput.max = maxDateStr;
        }
    }
}

/**
 * Handle filter updates
 */
function handleFilterUpdate(filterUpdate) {
    console.log('Filter update:', filterUpdate);
    
    // Update state
    Object.assign(state.filters, filterUpdate);
    
    // Save to localStorage
    saveFilterState(state.filters);
    
    // Apply filters
    state.filteredEvents = applyFilters(state.allEvents, state.filters);
    
    // Debug: Check for duplicate events with same content but different dates
    if (state.filters.selectedCases && state.filters.selectedCases.length === 1) {
        const caseEvents = state.filteredEvents.filter(e => e.caseNumber === state.filters.selectedCases[0]);
        console.log('Events for case', state.filters.selectedCases[0], ':', 
            caseEvents.map(e => ({date: e.dateStr, title: e.title.substring(0, 20)})));
    }
    
    // Update date filter range if case selection changed
    if (filterUpdate.selectedCases !== undefined) {
        updateDateFilterRange();
    }
    
    // Check if fit-to-window is enabled and recalculate scale
    if (state.fitToWindow) {
        const fitScale = calculateFitToWindowScale();
        state.scale = fitScale;
        
        // Update the scale slider to reflect the new scale
        const scaleSlider = document.getElementById('scale-slider');
        const scaleValue = document.getElementById('scale-value');
        if (scaleSlider && scaleValue) {
            scaleSlider.value = fitScale;
            scaleValue.textContent = fitScale.toFixed(1);
        }
    }
    
    // Re-render
    render();
    
    // Update visual indicators for active filters
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
    
    // Update stats
    const stats = calculateStats(state.filteredEvents);
    renderStats(stats);
}

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