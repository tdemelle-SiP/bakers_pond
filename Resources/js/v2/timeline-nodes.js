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
        
        // Prepare date label for EVERY event (v1 approach)
        const labelGroup = event.isPrivate ? 'below' : 'above';
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
            eventEl: node  // Changed to match v1 naming
        });
        
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
 * Apply date labels with two-pass clustering algorithm from v1
 * @param {Object} dateLabels - {above: [], below: []} arrays of label data
 */
function applyDateLabels(dateLabels) {
    ['above', 'below'].forEach(position => {
        const labels = dateLabels[position];
        if (labels.length === 0) return;
        
        // Sort labels by x position
        labels.sort((a, b) => a.x - b.x);
        
        // PASS 1: Identify clusters of overlapping NODES (5px squares)
        const nodeClusterBoundaries = [];
        let clusterStart = 0;
        
        for (let i = 1; i < labels.length; i++) {
            // If nodes are more than 8px apart, end the current cluster
            if (labels[i].x - labels[i-1].x > 8) {
                nodeClusterBoundaries.push({ start: clusterStart, end: i - 1 });
                clusterStart = i;
            }
        }
        // Add the last cluster
        nodeClusterBoundaries.push({ start: clusterStart, end: labels.length - 1 });
        
        // Mark which labels to keep from node clustering
        const keepFromNodePass = new Set();
        nodeClusterBoundaries.forEach(cluster => {
            keepFromNodePass.add(cluster.start); // Always keep first
            if (cluster.end > cluster.start) {
                keepFromNodePass.add(cluster.end); // Keep last if different
            }
        });
        
        // PASS 2: Remove any date that is within 25 pixels of a previous date
        const finalLabelsToShow = [];
        let lastShownX = -Infinity;
        
        labels.forEach((label, index) => {
            if (!keepFromNodePass.has(index)) return; // Skip if removed in pass 1
            
            if (label.x - lastShownX >= 25) {
                // This label is far enough from the last shown one
                finalLabelsToShow.push(label);
                lastShownX = label.x;
            }
            // Otherwise, skip this label (it's too close to the previous one)
        });
        
        // Apply the final labels
        finalLabelsToShow.forEach(label => {
            label.eventEl.appendChild(label.element);
        });
    });
}