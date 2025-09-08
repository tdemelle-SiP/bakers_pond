// render.js
// - Updates controls to reflect state
// - Updates timeline to reflect state
// Pure rendering - receives state, updates DOM

// Import existing rendering functions
import { renderCaselineNodes } from '../js/caseline-nodes.js';
import { drawCaselineConnections } from '../js/connections.js';
import { createLabelsWithCollisionDetection } from './label-layout.js';
import { renderCaseTitles } from './case-titles.js';
import { calculateStats } from '../js/stats.js';
import { calculateDateRange, calculateYearMarkers, calculateTimelineWidth, setContainerWidth, getXPosition } from '../js/date-scale.js';

/**
 * Main render function - updates entire UI to reflect state
 * @param {Object} state - Complete application state
 */
export function render(state) {
    // Hide loading, show caseline container FIRST
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    
    const caselineContainer = document.getElementById('caseline-container');
    if (caselineContainer) caselineContainer.style.display = 'block';
    
    // Update controls to reflect state
    updateControls(state);
    
    // Clear and render timeline
    renderTimeline(state);
}

/**
 * Update control values to reflect current state
 */
function updateControls(state) {
    // Update date inputs
    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');
    
    // Update scale slider
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValue = document.getElementById('scale-value');
    if (scaleSlider) {
        scaleSlider.value = state.scale;
        if (scaleValue) {
            scaleValue.textContent = state.scale.toFixed(1);
        }
    }
    
    // Update fit to window checkbox
    const fitCheckbox = document.getElementById('fit-to-window');
    if (fitCheckbox) {
        fitCheckbox.checked = state.fitToWindow;
    }
    
    // Create case checkboxes if container is empty
    const checkboxContainer = document.getElementById('case-checkboxes');
    if (checkboxContainer && checkboxContainer.children.length === 0 && state.caseNumbers.length > 0) {
        // Just create the checkbox elements - no event handlers
        state.caseNumbers.forEach(caseNum => {
            const label = document.createElement('label');
            label.className = 'case-checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'case-checkbox';
            checkbox.value = caseNum;
            checkbox.checked = state.filters.selectedCases.includes(caseNum);
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(caseNum));
            checkboxContainer.appendChild(label);
        });
    }
    
    // Update existing checkboxes
    const checkboxes = document.querySelectorAll('.case-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = state.filters.selectedCases.includes(cb.value);
    });
    
    // Update case filter button text with smart text
    const filterText = document.getElementById('case-filter-text');
    if (filterText) {
        const selectedCount = state.filters.selectedCases.length;
        const totalCount = state.caseNumbers.length;
        
        if (selectedCount === totalCount) {
            filterText.textContent = 'All Cases';
        } else if (selectedCount === 1) {
            filterText.textContent = '1 Case';
        } else {
            filterText.textContent = `${selectedCount} of ${totalCount} Cases`;
        }
    }
    
    // Update active filter indicator
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.classList.toggle('active-filters', state.hasActiveFilters);
    }
    
    // Update emoji checkbox states
    const emojiCheckboxes = document.querySelectorAll('.emoji-toggle');
    emojiCheckboxes.forEach(checkbox => {
        const emojiClass = checkbox.dataset.emojiClass;
        // If emojiVisibility doesn't have this emoji, default to checked (visible)
        const isVisible = state.emojiVisibility ? state.emojiVisibility[emojiClass] !== false : true;
        checkbox.checked = isVisible;
    });
    
    // Update date inputs to reflect filtered data range
    if (startInput && endInput && state.filteredEvents && state.filteredEvents.length > 0) {
        // Get date range from filtered events
        const dates = state.filteredEvents.map(e => new Date(e.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        // Always update inputs with the filtered data range
        startInput.value = minDate.toISOString().split('T')[0];
        endInput.value = maxDate.toISOString().split('T')[0];
        
        // Update min/max constraints
        startInput.min = minDate.toISOString().split('T')[0];
        startInput.max = maxDate.toISOString().split('T')[0];
        endInput.min = minDate.toISOString().split('T')[0];
        endInput.max = maxDate.toISOString().split('T')[0];
    }
}

/**
 * Render the timeline visualization
 */
function renderTimeline(state) {
    // Get containers
    const nodesContainer = document.getElementById('nodes-container');
    const yearMarkersContainer = document.getElementById('year-markers-container');
    const connectionsContainer = document.getElementById('connections-container');
    
    if (!state.filteredEvents || state.filteredEvents.length === 0) {
        // Show empty state
        if (nodesContainer) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state';
            emptyDiv.textContent = 'No events to display';
            nodesContainer.appendChild(emptyDiv);
        }
        return;
    }
    
    // Calculate date range and scale
    const dateRange = calculateDateRange(state.filteredEvents);
    const pixelsPerDay = state.scale;
    
    // Update container width
    const container = document.getElementById('caseline-container');
    const timelineWidth = calculateTimelineWidth(dateRange.totalDays, pixelsPerDay);
    setContainerWidth(container, timelineWidth);
    
    // Render year markers
    renderYearMarkers(yearMarkersContainer, dateRange, pixelsPerDay);
    
    // Render caseline nodes only
    const caselineData = renderCaselineNodes(state.filteredEvents, dateRange, pixelsPerDay);
    
    // Apply emoji visibility BEFORE label collision detection
    if (state.emojiVisibility) {
        // Handle single emoji nodes
        Object.entries(state.emojiVisibility).forEach(([emojiClass, isVisible]) => {
            const elements = document.querySelectorAll(`[data-emoji-type="${emojiClass}"]:not([data-emoji-type2])`);
            elements.forEach(element => {
                element.style.display = isVisible === false ? 'none' : '';
            });
        });
        
        // Handle multi-emoji nodes with OR logic
        const multiEmojiNodes = document.querySelectorAll('[data-emoji-type2]');
        multiEmojiNodes.forEach(node => {
            const type1Visible = state.emojiVisibility[node.dataset.emojiType] !== false;
            const type2Visible = state.emojiVisibility[node.dataset.emojiType2] !== false;
            // Show if either emoji is visible
            node.style.display = (type1Visible || type2Visible) ? '' : 'none';
        });
    }
    
    // Filter nodes to only include visible ones for label collision detection
    const visibleNodes = caselineData.nodes.filter(node => {
        if (!node.emojiType) return true;
        // For multi-emoji nodes, check if either is visible
        if (node.emojiType2) {
            const type1Visible = state.emojiVisibility?.[node.emojiType] !== false;
            const type2Visible = state.emojiVisibility?.[node.emojiType2] !== false;
            return type1Visible || type2Visible;
        }
        return state.emojiVisibility?.[node.emojiType] !== false;
    });
    
    // Render labels with collision detection
    createLabelsWithCollisionDetection(visibleNodes, nodesContainer);
    
    // Render case titles
    const visibleCases = state.filters.selectedCases && state.filters.selectedCases.length > 0 ?
        state.filters.selectedCases : state.caseNumbers;
    renderCaseTitles(caselineData.caseGroups, visibleCases, state.casesData);
    
    // Draw caseline connections only
    drawCaselineConnections(caselineData.caseGroups, connectionsContainer);
    
    // Calculate stats for legend counts
    const emojiVisibility = state.emojiVisibility || {};
    const stats = calculateStats(state.filteredEvents, emojiVisibility);
    
    // Update legend counts dynamically (only show for visible emojis)
    const emojiCounts = document.querySelectorAll('.emoji-count');
    emojiCounts.forEach(countSpan => {
        const emoji = countSpan.dataset.emoji;
        // The count will already be 0 if emoji is hidden (due to calculateStats logic)
        const count = stats.emojiStats?.[emoji] || 0;
        countSpan.textContent = count > 0 ? `(${count})` : '';
    });
    
    // Restore focus date (center the previously centered date)
    const mainContent = document.querySelector('.main-content');
    if (mainContent && state.focusDate) {
        requestAnimationFrame(() => {
            // Calculate where the focus date is now
            const focusX = getXPosition(state.focusDate, dateRange.startDate, pixelsPerDay);
            // Calculate scroll position to center it
            const scrollLeft = focusX - (mainContent.clientWidth / 2);
            mainContent.scrollLeft = Math.max(0, scrollLeft);
            // Clear focus date after using it
            state.focusDate = null;
        });
    }
}

/**
 * Render year markers on the timeline
 * @param {HTMLElement} container - Year markers container
 * @param {Object} dateRange - Date range from calculateDateRange
 * @param {number} pixelsPerDay - Scale factor
 */
function renderYearMarkers(container, dateRange, pixelsPerDay) {
    if (!container) return;
    
    // Clear existing markers
    container.innerHTML = '';
    
    // Get year marker data from date-scale
    const markers = calculateYearMarkers(dateRange, pixelsPerDay);
    
    // Get container height for dynamic positioning
    const caselineContainer = document.getElementById('caseline-container');
    const containerHeight = caselineContainer ? caselineContainer.offsetHeight : 344;
    const centerY = 60 + (containerHeight - 60) / 2;
    
    markers.forEach(marker => {
        if (marker.type === 'line') {
            // Full vertical line for years/decades
            const line = document.createElement('div');
            line.className = 'year-marker';
            line.style.position = 'absolute';
            line.style.left = marker.x + 'px';
            line.style.top = '0';
            line.style.bottom = '0';
            line.style.width = '1px';
            container.appendChild(line);
            
            // Add tick mark on center line
            const tick = document.createElement('div');
            tick.className = 'year-tick';
            tick.style.position = 'absolute';
            tick.style.left = marker.x + 'px';
            tick.style.top = (centerY - 5) + 'px';
            tick.style.width = '1px';
            tick.style.height = '10px';
            container.appendChild(tick);
            
            // Add year label at bottom
            if (marker.label) {
                const label = document.createElement('div');
                label.className = 'year-label';
                label.style.position = 'absolute';
                label.style.left = marker.x + 'px';
                label.style.bottom = '5px';
                label.textContent = marker.label;
                container.appendChild(label);
            }
        } else if (marker.type === 'tick') {
            // Small tick for non-decade years in decade mode
            const tick = document.createElement('div');
            tick.className = 'year-tick-small';
            tick.style.position = 'absolute';
            tick.style.left = marker.x + 'px';
            tick.style.top = (centerY - 3) + 'px';
            tick.style.width = '1px';
            tick.style.height = '6px';
            container.appendChild(tick);
        }
    });
}

