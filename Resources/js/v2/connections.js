/**
 * connections.js
 * Draws connection lines between events
 * 
 * REFERENCES:
 * - Timeline connections: lines 916-984
 * - Caseline connections: lines 1299-1416
 * - Green lines for public, red for private
 * - Thicker lines for caseline connections
 */

/**
 * Draw connections between timeline events
 * @param {Object[]} positions - Timeline node positions from renderTimelineNodes
 * @param {HTMLElement} container - Timeline container
 */
export function drawTimelineConnections(positions, container) {
    if (positions.length < 2) return;
    
    // Get timeline section for positioning
    const timelineSection = document.getElementById('timeline-section');
    if (!timelineSection) return;
    
    const sectionHeight = timelineSection.offsetHeight;
    const sectionTop = timelineSection.offsetTop;
    
    // Create SVG for connections
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = sectionTop + 'px';
    svg.style.width = '100%';
    svg.style.height = sectionHeight + 'px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5';
    
    // Draw lines between consecutive events
    for (let i = 0; i < positions.length - 1; i++) {
        const current = positions[i];
        const next = positions[i + 1];
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', current.x);
        // Convert Y to percentage within section
        const y1 = current.isPrivate ? sectionHeight * 0.65 : sectionHeight * 0.35;
        const y2 = next.isPrivate ? sectionHeight * 0.65 : sectionHeight * 0.35;
        line.setAttribute('y1', y1);
        line.setAttribute('x2', next.x);
        line.setAttribute('y2', y2);
        
        // Color based on privacy status (green for public, red for private)
        const strokeColor = current.isPrivate ? '#f44336' : '#4caf50';
        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-opacity', '0.5');
        
        svg.appendChild(line);
    }
    
    // Draw vertical lines for same-day events (public to private)
    const eventsByDate = {};
    positions.forEach(pos => {
        const dateKey = pos.event.dateStr;
        if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(pos);
    });
    
    Object.values(eventsByDate).forEach(dayEvents => {
        const publicEvents = dayEvents.filter(e => !e.isPrivate);
        const privateEvents = dayEvents.filter(e => e.isPrivate);
        
        if (publicEvents.length > 0 && privateEvents.length > 0) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', publicEvents[0].x);
            line.setAttribute('y1', sectionHeight * 0.35); // Public Y
            line.setAttribute('x2', publicEvents[0].x);
            line.setAttribute('y2', sectionHeight * 0.65); // Private Y
            line.setAttribute('stroke', '#666666');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-opacity', '0.3');
            line.setAttribute('stroke-dasharray', '2 2');
            
            svg.appendChild(line);
        }
    });
    
    container.appendChild(svg);
}

/**
 * Draw connections between caseline events
 * @param {Object} caseGroups - Groups of caseline nodes by case number
 * @param {HTMLElement} container - Timeline container
 */
export function drawCaselineConnections(caseGroups, container) {
    // Get caseline section for positioning
    const caselineSection = document.getElementById('caseline-section');
    if (!caselineSection) return;
    
    const sectionHeight = caselineSection.offsetHeight;
    const sectionTop = caselineSection.offsetTop;
    
    // Create SVG for caseline connections
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = sectionTop + 'px';
    svg.style.width = '100%';
    svg.style.height = sectionHeight + 'px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '4';
    
    // Draw connections for each case
    Object.entries(caseGroups).forEach(([caseNumber, nodes]) => {
        if (nodes.length < 2) return;
        
        // Sort by date
        nodes.sort((a, b) => a.date - b.date);
        
        // Draw lines between consecutive events in the same case
        for (let i = 0; i < nodes.length - 1; i++) {
            const current = nodes[i];
            const next = nodes[i + 1];
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', current.x);
            // Convert Y to percentage within caseline section, matching node positions
            // Center is at 50% + 35px offset, nodes are ±20px from center, emoji center is +8px
            const y1 = current.isPrivate ? 
                (sectionHeight * 0.5 + 35 + 20 + 8) : // Private node center with title offset
                (sectionHeight * 0.5 + 35 - 20 + 8);  // Public node center with title offset
            const y2 = next.isPrivate ? 
                (sectionHeight * 0.5 + 35 + 20 + 8) : // Private node center with title offset
                (sectionHeight * 0.5 + 35 - 20 + 8);  // Public node center with title offset
            line.setAttribute('y1', y1);
            line.setAttribute('x2', next.x);
            line.setAttribute('y2', y2);
            
            // Add continuance class if either endpoint is a continuance
            const isContinuance = (current.emoji === '🐢' || next.emoji === '🐢');
            if (isContinuance) {
                line.classList.add('continuance');
            }
            
            // Use the current node's color for the line (following original pattern)
            line.setAttribute('stroke', current.color);
            line.setAttribute('stroke-width', '4');  // Thicker lines per original
            line.setAttribute('stroke-opacity', '0.7'); // Match original opacity
            
            svg.appendChild(line);
        }
    });
    
    container.appendChild(svg);
}

/**
 * Draw leader lines from labels to nodes
 * @param {Object[]} labels - Label data with positions
 * @param {HTMLElement} container - Timeline container
 */
export function drawLeaderLines(labels, container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '400px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '18';
    
    labels.forEach(label => {
        // Only draw leader if label is offset from node
        const labelCenter = label.x;
        const nodeCenter = label.nodeData.x;
        
        if (Math.abs(labelCenter - nodeCenter) > 5) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', nodeCenter);
            line.setAttribute('y1', label.nodeData.y);
            line.setAttribute('x2', labelCenter);
            line.setAttribute('y2', label.nodeData.isPrivate ? 290 : 235);
            line.setAttribute('stroke', '#999999');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-opacity', '0.5');
            
            svg.appendChild(line);
        }
    });
    
    container.appendChild(svg);
}