// render.js
// - All rendering logic consolidated here
// - Uses coordinate system from state
// - Creates all DOM elements for timeline

// Import existing rendering functions
import { createLabelsWithCollisionDetection } from './label-layout.js';
import { renderCaseTitles } from './case-titles.js';
import { calculateStats } from './state.js';
import { getEmojiConfig } from './emoji-config.js';

/**
 * Set container dimensions
 * @param {HTMLElement} container - Timeline container
 * @param {number} width - Width in pixels
 */
function setContainerWidth(container, width) {
    container.style.width = width + 'px';
    if (container.parentElement) {
        container.parentElement.style.width = (width + 80) + 'px';
    }
}

/**
 * Calculate year marker positions - returns data only, no DOM manipulation
 * @param {Object} coordinateSystem - Coordinate system from state
 * @returns {Array} Array of year marker data objects
 */
function calculateYearMarkers(coordinateSystem) {
    if (!coordinateSystem || !coordinateSystem.dateRange) return [];
    
    const { dateRange, pixelsPerDay, timelineWidth, getXPosition } = coordinateSystem;
    const { startDate, minDate, maxDate } = dateRange;
    const markers = [];
    
    const firstEventYear = minDate.getFullYear();
    const lastEventYear = maxDate.getFullYear();
    
    // Determine if we should show decade markers instead of yearly markers
    const useDecadeMarkers = pixelsPerDay < 0.2;
    
    for (let year = startDate.getFullYear(); year <= lastEventYear; year++) {
        const yearStart = new Date(year, 0, 1);
        const yearStartX = getXPosition(yearStart);
        
        // Only process years that are at least partially visible
        if (yearStartX >= 0 && yearStartX <= timelineWidth) {
            const isDecadeYear = year % 10 === 0;
            
            if (useDecadeMarkers && !isDecadeYear) {
                // In decade mode, only show small ticks for non-decade years
                markers.push({
                    type: 'tick',
                    x: yearStartX,
                    year: year,
                    label: null
                });
            } else {
                // Show full line and label for all years in normal mode, or decades in decade mode
                markers.push({
                    type: 'line',
                    x: yearStartX,
                    year: year,
                    label: year.toString()
                });
            }
        }
    }
    
    return markers;
}

/**
 * Determine the caseline color based on multiple emojis
 * For multi-emoji nodes, uses the superscript (second) emoji's color
 */
function determineCaselineColor(emojis) {
    if (!emojis || emojis.length === 0) return '#999999';
    
    // For multi-emoji, use the superscript (second) emoji's color
    if (emojis.length > 1) {
        const superscriptConfig = getEmojiConfig(emojis[1]);
        if (superscriptConfig && superscriptConfig.caselineColor) {
            return superscriptConfig.caselineColor;
        }
    }
    
    // For single emoji, use its color
    const config = getEmojiConfig(emojis[0]);
    if (!config) return '#999999';
    
    return config.caselineColor || '#999999';
}

/**
 * Render caseline nodes (emoji markers)
 * @param {Object[]} events - Caseline events only (eventType === 'caseline')
 * @param {Object} coordinateSystem - Contains dateRange, pixelsPerDay, and getXPosition function
 * @returns {Object[]} Array of caseline node data for connections and labels
 */
function renderCaselineNodes(events, coordinateSystem) {
    const caselineData = [];
    const caseGroups = {};
    
    // Use the nodes container
    const container = document.getElementById('nodes-container');
    
    // Get container height once for all nodes
    const caselineContainer = document.getElementById('caseline-container');
    const containerHeight = caselineContainer ? caselineContainer.offsetHeight : 500;
    const containerCenter = 60 + (containerHeight - 60) / 2; // Match CSS calculation
    
    // Filter to caseline events only
    const caselineEvents = events.filter(e => e.eventType === 'caseline');
    
    caselineEvents.forEach(event => {
        const x = coordinateSystem.getXPosition(event.date);
        
        // Handle multiple emojis
        const emojis = event.caselineEmojis || [];
        if (emojis.length === 0) return; // Skip if no emojis
        
        // Get first emoji config for label and positioning
        const primaryConfig = getEmojiConfig(emojis[0]) || {};
        const caselineColor = determineCaselineColor(emojis);
        
        // Get label - prefer bold override from procedural column
        const nodeLabel = event.proceduralLabel || primaryConfig.displayLabel || '';
        
        // Create node element
        const node = document.createElement('div');
        node.className = 'caseline-node';
        
        // Add positioning classes based on emoji type and privacy
        const allBypass = emojis.length > 1 ? 
            emojis.every(emoji => {
                const config = getEmojiConfig(emoji);
                return config && config.caselineColor === 'bypass';
            }) :
            primaryConfig.caselineColor === 'bypass';
            
        if (allBypass) {
            // Bypass nodes are centered
            node.classList.add('centered');
        } else if (event.isPrivate) {
            // Private nodes below the line
            node.classList.add('private');
            node.classList.add('case-procedural-below');
        } else {
            // Public nodes above the line
            node.classList.add('public');
            node.classList.add('case-procedural-above');
        }
        
        // Add emoji-specific data attributes
        if (emojis.length > 1) {
            node.classList.add('multi-emoji');
            // Multi-emoji structure
            const primaryEmoji = document.createElement('span');
            primaryEmoji.className = 'primary-emoji';
            primaryEmoji.textContent = emojis[0];
            
            const secondaryEmoji = document.createElement('span');
            secondaryEmoji.className = 'secondary-emoji';
            secondaryEmoji.textContent = emojis.slice(1).join('');
            
            node.appendChild(primaryEmoji);
            node.appendChild(secondaryEmoji);
        } else {
            // Single emoji - just set text content
            node.textContent = emojis[0] || '';
        }
        
        // For multi-emoji, store both emoji types for visibility filtering
        if (emojis.length > 1) {
            const secondaryConfig = getEmojiConfig(emojis[1]);
            node.dataset.emojiType = primaryConfig.class || '';
            node.dataset.emojiType2 = secondaryConfig?.class || '';
        } else if (primaryConfig.class) {
            node.dataset.emojiType = primaryConfig.class;
        }
        
        node.style.left = x + 'px'; // Absolute positioning
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'event-tooltip';
        tooltip.innerHTML = `
            <div class="event-date">${event.caseNumber || 'No Case'}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-detail">${event.dateStr}</div>
        `;
        node.appendChild(tooltip);
        
        // Make clickable if has URL
        if (event.documentUrl) {
            node.style.cursor = 'pointer';
            node.onclick = () => window.open(event.documentUrl, '_blank');
        }
        
        container.appendChild(node);
        
        // Store data for labels and connections
        
        // Determine vertical position: 'public', 'private', or 'inline'
        let verticalPosition;
        if (allBypass) {
            verticalPosition = 'inline';
        } else if (event.isPrivate) {
            verticalPosition = 'private';
        } else {
            verticalPosition = 'public';
        }
        
        // Get secondary emoji type for multi-emoji nodes
        const secondaryConfig = emojis.length > 1 ? getEmojiConfig(emojis[1]) : null;
        
        // Y position for label positioning
        let yPosition;
        if (allBypass) {
            yPosition = containerCenter;
        } else if (event.isPrivate) {
            yPosition = containerCenter + 25; // Private nodes 25px below center
        } else {
            yPosition = containerCenter - 25; // Public nodes 25px above center
        }
        
        const nodeData = {
            x: x,
            y: yPosition,
            node: node,
            emojis: emojis,
            displayEmoji: emojis.join(''),
            label: nodeLabel,
            labelEmphasis: event.labelEmphasis,
            caselineColor: caselineColor,
            emojiType: primaryConfig.class || null,
            emojiType2: secondaryConfig?.class || null,
            verticalPosition: verticalPosition,
            caseNumber: event.caseNumber,
            date: event.date,
            event: event
        };
        
        caselineData.push(nodeData);
        
        // Group by case for connection lines
        if (event.caseNumber) {
            if (!caseGroups[event.caseNumber]) {
                caseGroups[event.caseNumber] = [];
            }
            caseGroups[event.caseNumber].push(nodeData);
        }
    });
    
    return { nodes: caselineData, caseGroups: caseGroups };
}

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
    
    if (!state.filteredEvents || state.filteredEvents.length === 0 || !state.coordinateSystem) {
        // Show empty state
        if (nodesContainer) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state';
            emptyDiv.textContent = 'No events to display';
            nodesContainer.appendChild(emptyDiv);
        }
        return;
    }
    
    // Get coordinate system from state
    const coordinateSystem = state.coordinateSystem;
    
    // Update container width
    const container = document.getElementById('caseline-container');
    setContainerWidth(container, coordinateSystem.timelineWidth);
    
    // Render year markers
    renderYearMarkers(yearMarkersContainer, coordinateSystem);
    
    // Render caseline nodes only
    const caselineData = renderCaselineNodes(state.filteredEvents, coordinateSystem);
    
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
            // Calculate where the focus date is now using the coordinate system
            const focusX = coordinateSystem.getXPosition(state.focusDate);
            // Calculate scroll position to center it
            const scrollLeft = focusX - (mainContent.clientWidth / 2);
            mainContent.scrollLeft = Math.max(0, scrollLeft);
            // Note: Focus date is one-time use, will be cleared by state on next update
        });
    }
}

/**
 * Render year markers on the timeline
 * @param {HTMLElement} container - Year markers container
 * @param {Object} coordinateSystem - Coordinate system from state
 */
function renderYearMarkers(container, coordinateSystem) {
    if (!container || !coordinateSystem) return;
    
    // Clear existing markers
    container.innerHTML = '';
    
    // Get year marker data from date-scale
    const markers = calculateYearMarkers(coordinateSystem);
    
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

/**
 * Draw SVG connections between caseline nodes
 * @param {Object} caseGroups - Groups of nodes by case number
 * @param {HTMLElement} container - Container for the SVG
 */
function drawCaselineConnections(caseGroups, container) {
    // Get caseline container for positioning
    const caselineContainer = document.getElementById('caseline-container');
    if (!caselineContainer) return;
    
    const sectionHeight = caselineContainer.offsetHeight;
    const sectionTop = caselineContainer.offsetTop;
    
    // Create SVG for caseline connections
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '50px';  // Match nodes-container left position
    svg.style.top = '0';  // Changed from sectionTop since container is now relative
    svg.style.width = 'calc(100% - 50px)';  // Adjust width to account for left offset
    svg.style.height = sectionHeight + 'px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5';  // Connections below nodes
    
    // Draw connections for each case
    Object.entries(caseGroups).forEach(([caseNumber, nodes]) => {
        if (nodes.length < 2) return;
        
        // Sort by date
        nodes.sort((a, b) => a.date - b.date);
        
        // Track the active color for inheritance
        let activeColor = '#999999'; // Default color
        
        // Draw lines between nodes, skipping bypass nodes
        let lastConnectedIndex = -1;
        
        for (let i = 0; i < nodes.length; i++) {
            const current = nodes[i];
            
            // Update color tracking (but don't draw from bypass nodes)
            if (current.caselineColor === 'bypass') {
                continue; // Skip bypass nodes entirely
            } else if (current.caselineColor === 'inherit') {
                // Keep the previous color
            } else {
                // Use this node's caselineColor and set it as active
                activeColor = current.caselineColor;
            }
            
            // Find the next non-bypass node to connect to
            let nextIndex = i + 1;
            while (nextIndex < nodes.length && nodes[nextIndex].caselineColor === 'bypass') {
                nextIndex++;
            }
            
            if (nextIndex >= nodes.length) break; // No more nodes to connect
            
            const next = nodes[nextIndex];
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', current.x);
            // Calculate Y positions to match CSS positioning
            // Center of space below titles: 60px + (height - 60px) / 2
            // Nodes use translateY(-50%) so they're vertically centered
            const centerY = 60 + (sectionHeight - 60) / 2;
            
            let y1;
            if (current.verticalPosition === 'inline') {
                y1 = centerY; // Centered on line
            } else if (current.verticalPosition === 'private') {
                y1 = centerY + 25; // 25px below center
            } else {
                y1 = centerY - 25; // 25px above center
            }
            
            let y2;
            if (next.verticalPosition === 'inline') {
                y2 = centerY; // Centered on line
            } else if (next.verticalPosition === 'private') {
                y2 = centerY + 25; // 25px below center
            } else {
                y2 = centerY - 25; // 25px above center
            }
            
            line.setAttribute('y1', y1);
            line.setAttribute('x2', next.x);
            line.setAttribute('y2', y2);
            
            // Note: We don't add continuance class to lines anymore
            // Lines should remain visible even when continuance nodes are hidden
            
            // Use the determined color for the line
            line.setAttribute('stroke', activeColor);
            line.setAttribute('stroke-width', '4');  // Thicker lines per original
            line.setAttribute('stroke-opacity', '0.7'); // Match original opacity
            
            svg.appendChild(line);
        }
    });
    
    container.appendChild(svg);
}

