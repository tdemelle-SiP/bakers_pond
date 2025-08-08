/**
 * timeline-nodes.js
 * Renders timeline events (green/red dots) with labels and tooltips
 * 
 * REFERENCES:
 * - Original: lines 804-863 for node rendering
 * - Public nodes: green, Y=115px, labels above
 * - Private nodes: red, Y=140px, labels below
 * - Date labels: mm/dd format with clustering
 * - Missing doc indicator: ❌ symbol
 */

import { getXPosition } from './date-scale.js';

// Y positions from original
const NODE_Y = {
    public: 115,
    private: 140
};

/**
 * Render timeline nodes (green/red dots)
 * @param {Object[]} events - Timeline events only (eventType === 'timeline')
 * @param {Object} dateRange - From calculateDateRange
 * @param {number} pixelsPerDay - Scale factor
 * @returns {Object[]} Array of position data for connections
 */
export function renderTimelineNodes(events, dateRange, pixelsPerDay) {
    const positions = [];
    const dateLabels = { above: [], below: [] };
    const datesWithLabels = { above: new Set(), below: new Set() };
    
    // Get the correct containers
    const publicContainer = document.getElementById('public-container');
    const privateContainer = document.getElementById('private-container');
    
    // Filter to timeline events only
    const timelineEvents = events.filter(e => e.eventType === 'timeline');
    
    timelineEvents.forEach(event => {
        const x = getXPosition(event.date, dateRange.startDate, pixelsPerDay);
        
        // Use the timeline nodes container
        const container = document.getElementById('timeline-nodes-container');
        
        // Create node element
        const node = document.createElement('div');
        node.className = `event timeline-node ${event.eventClass} ${event.isPrivate ? 'event-below' : 'event-above'}`;
        node.style.left = x + 'px'; // Use absolute positioning
        
        // Prepare date label if first event on this date/level
        const labelGroup = event.isPrivate ? 'below' : 'above';
        const dateKey = event.dateStr;
        
        if (!datesWithLabels[labelGroup].has(dateKey)) {
            const monthDay = new Date(event.date).toLocaleDateString('en-US', { 
                month: 'numeric', 
                day: 'numeric' 
            });
            
            const dateLabel = document.createElement('div');
            dateLabel.className = 'event-date-label';
            dateLabel.textContent = monthDay;
            
            dateLabels[labelGroup].push({
                element: dateLabel,
                x: x,
                date: event.date,
                nodeEl: node
            });
            
            datesWithLabels[labelGroup].add(dateKey);
        }
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'event-tooltip';
        tooltip.innerHTML = `
            <div class="event-date">${event.dateStr}</div>
            <div class="event-title">${event.title}</div>
            ${event.displayDetail ? `<div class="event-detail">${event.displayDetail}</div>` : ''}
        `;
        node.appendChild(tooltip);
        
        // Add missing document indicator
        if (event.hasMissingDoc) {
            const missingIndicator = document.createElement('div');
            missingIndicator.className = 'missing-indicator';
            missingIndicator.textContent = '❌';
            node.appendChild(missingIndicator);
        }
        
        // Make clickable if has URL
        if (event.documentUrl) {
            node.style.cursor = 'pointer';
            node.onclick = () => window.open(event.documentUrl, '_blank');
        }
        
        container.appendChild(node);
        
        // Track position for connections
        positions.push({
            x: x,
            y: event.isPrivate ? NODE_Y.private : NODE_Y.public,
            isPrivate: event.isPrivate,
            event: event
        });
    });
    
    // Apply date labels with clustering
    applyDateLabels(dateLabels);
    
    return positions;
}

/**
 * Apply date labels with clustering to avoid overlap
 * @param {Object} dateLabels - {above: [], below: []} arrays of label data
 */
function applyDateLabels(dateLabels) {
    ['above', 'below'].forEach(position => {
        const labels = dateLabels[position];
        if (labels.length === 0) return;
        
        // Sort by x position
        labels.sort((a, b) => a.x - b.x);
        
        // Simple clustering: skip labels that are too close
        let lastShownX = -Infinity;
        labels.forEach(label => {
            if (label.x - lastShownX >= 25) {  // Minimum 25px spacing
                label.nodeEl.appendChild(label.element);
                lastShownX = label.x;
            }
        });
    });
}