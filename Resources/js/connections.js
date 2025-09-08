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

