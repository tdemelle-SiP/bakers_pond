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
import { renderCaselineNodes, renderCaselineLabels } from './caseline-nodes.js';
import { drawTimelineConnections, drawCaselineConnections } from './connections.js';
import { initLegend } from './legend-v2.js';
import { calculateStats, renderStats } from './stats.js';
import { applyFilters, getDefaultFilterState } from './filters.js';
import { initAllControls } from './controls-v2.js';
import { createLabelsWithCollisionDetection } from './label-layout.js';
import { renderCaseTitles } from './case-titles.js';
import { initializeState, saveFilterState, saveScaleState } from './state-persistence.js';

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
    state.filteredEvents = events;
    
    // Extract metadata
    const caseNumbers = extractCaseNumbers(events);
    console.log('Case numbers:', caseNumbers);
    
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
        initialScale: state.scale,
        initialFitToWindow: state.fitToWindow,
        initialFilters: state.filters,
        onFilterUpdate: handleFilterUpdate,
        onScaleUpdate: handleScaleUpdate,
        calculateFitScale: calculateFitToWindowScale
    });
    
    // All modules now initialized
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
}

/**
 * Calculate scale to fit visible events in window
 */
function calculateFitToWindowScale() {
    const container = document.getElementById('timeline-container');
    const dateRange = calculateDateRange(state.filteredEvents);
    const availableWidth = window.innerWidth - 250; // Account for margins
    
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

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export state for debugging
window.timelineState = state;