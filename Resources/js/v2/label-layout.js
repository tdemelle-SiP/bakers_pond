/**
 * label-layout.js
 * Handles label collision detection and leader lines for caseline labels
 * Based on the original implementation's bidirectional collision algorithm
 */

/**
 * Split label text into multiple lines for better layout
 * @param {string} text - Label text
 * @returns {string} Text with newlines inserted
 */
export function splitLabel(text) {
    const words = text.split(' ');
    if (words.length <= 1) return text;
    
    // Split into two lines as evenly as possible
    const midpoint = Math.floor(words.length / 2);
    const line1 = words.slice(0, midpoint).join(' ');
    const line2 = words.slice(midpoint).join(' ');
    return line1 + '\n' + line2;
}

/**
 * Measure actual rendered dimensions of a label
 * @param {string} text - Label text (may include newlines)
 * @param {boolean} isPrivate - Whether this is a private event
 * @returns {Object} {width, height} in pixels
 */
export function measureLabel(text, isPrivate) {
    const el = document.createElement('div');
    el.className = `node-label ${isPrivate ? 'node-label-below' : 'node-label-above'}`;
    el.style.position = 'absolute';
    el.style.visibility = 'hidden';
    el.style.transform = 'none';
    el.style.whiteSpace = 'pre-line';
    el.style.textAlign = 'center';
    el.textContent = text;
    document.body.appendChild(el);
    const { width, height } = el.getBoundingClientRect();
    document.body.removeChild(el);
    return { 
        width: Math.ceil(width), 
        height: Math.ceil(height) 
    };
}

/**
 * Apply collision detection to labels
 * Uses bidirectional order-preserving algorithm from original
 * @param {Object[]} labelData - Array of label data objects
 * @returns {Object[]} Updated label data with adjusted positions
 */
export function resolveCollisions(labelData) {
    const minGap = 3; // horizontal breathing room between labels
    
    // Process each band (public/private) separately
    [false, true].forEach(isPrivate => {
        // Get labels for this band, sorted by node position
        const bandLabels = labelData
            .filter(ld => ld.isPrivate === isPrivate)
            .sort((a, b) => a.nodeX - b.nodeX);
        
        if (bandLabels.length === 0) return;
        
        // Start all labels at their ideal positions
        bandLabels.forEach(label => {
            label.x = label.baseX;
        });
        
        // Find and resolve overlaps
        let hasOverlap = true;
        let iterations = 0;
        const minLeftBound = 20; // Minimum left position to keep labels on screen
        
        while (hasOverlap && iterations < 30) {
            hasOverlap = false;
            
            for (let i = 1; i < bandLabels.length; i++) {
                const prev = bandLabels[i - 1];
                const curr = bandLabels[i];
                
                const overlap = (prev.x + prev.width + minGap) - curr.x;
                
                if (overlap > 0) {
                    hasOverlap = true;
                    
                    // Split the overlap - move both labels
                    prev.x -= overlap * 0.5;
                    curr.x += overlap * 0.5;
                }
            }
            
            // Ensure no labels go off the left edge
            for (let i = 0; i < bandLabels.length; i++) {
                if (bandLabels[i].x < minLeftBound) {
                    const shift = minLeftBound - bandLabels[i].x;
                    // Push this label and all to its right
                    for (let j = i; j < bandLabels.length; j++) {
                        bandLabels[j].x += shift;
                    }
                }
            }
            
            iterations++;
        }
    });
    
    return labelData;
}

/**
 * Create and position labels with collision detection
 * @param {Object[]} nodeData - Caseline node data from renderCaselineNodes
 * @param {HTMLElement} container - Container element
 * @returns {HTMLElement[]} Created label elements
 */
export function createLabelsWithCollisionDetection(nodeData, container) {
    const labelElements = [];
    const labelData = [];
    
    // First pass: prepare label data
    nodeData.forEach(node => {
        if (!node.label || node.label === '') {
            return; // Skip nodes without labels
        }
        
        // Skip labels for continuance events
        if (node.emoji === '🐢') {
            return;
        }
        
        // Split multi-word labels
        const labelText = splitLabel(node.label);
        
        // Measure the label
        const { width, height } = measureLabel(labelText, node.isPrivate);
        
        // Calculate base positions
        const baseX = node.x - width / 2;
        let baseY;
        
        // Get the caseline section height for percentage calculations
        const caselineSection = document.getElementById('caseline-section');
        const sectionHeight = caselineSection ? caselineSection.offsetHeight : 300;
        
        // Calculate node Y positions (matching the CSS with title offset)
        const nodeY = node.isPrivate ? 
            (sectionHeight * 0.5 + 35 + 20) :  // Private: center + title offset + 20px
            (sectionHeight * 0.5 + 35 - 20);   // Public: center + title offset - 20px
        
        if (node.isPrivate) {
            // Labels below: top edge at fixed distance (30px) from node
            baseY = nodeY + 30;
        } else {
            // Labels above: center the label vertically around a fixed point
            const singleLineHeight = 20; // Approximate height of single line label
            const centerPoint = nodeY - 25 - (singleLineHeight / 2);
            baseY = centerPoint - (height / 2);
        }
        
        labelData.push({
            node: node,
            text: labelText,
            width: width,
            height: height,
            baseX: baseX,
            baseY: baseY,
            x: baseX, // Will be adjusted by collision detection
            y: baseY,
            nodeX: node.x,
            isPrivate: node.isPrivate
        });
    });
    
    // Apply collision detection
    resolveCollisions(labelData);
    
    // Create and position label elements
    labelData.forEach(ld => {
        const label = document.createElement('div');
        label.className = `node-label ${ld.isPrivate ? 'node-label-below' : 'node-label-above'}`;
        
        // Add status coloring
        if (ld.node.color === '#f44336') {
            label.classList.add('status-denied');
        } else if (ld.node.color === '#4caf50') {
            label.classList.add('status-approved');
        } else if (ld.node.color === '#ffd700') {
            label.classList.add('status-pending');
        }
        
        label.style.whiteSpace = 'pre-line';
        label.style.textAlign = 'center';
        label.textContent = ld.text;
        label.title = `${ld.node.event.title} - ${ld.node.event.dateStr}`;
        
        // Make clickable if has URL
        if (ld.node.event.documentUrl) {
            label.style.cursor = 'pointer';
            label.onclick = () => {
                window.open(ld.node.event.documentUrl, '_blank');
            };
        }
        
        // Position the label using resolved coordinates
        label.style.left = ld.x + 'px';
        label.style.top = ld.y + 'px';
        label.style.transform = 'none';
        label.style.position = 'absolute';
        
        container.appendChild(label);
        labelElements.push(label);
        
        // Draw leader line if label is displaced
        const nodeCenter = ld.node.x;
        const labelCenter = ld.x + ld.width / 2;
        
        if (Math.abs(nodeCenter - labelCenter) > 5) {
            drawLeaderLine(container, ld.node, ld);
        }
    });
    
    return labelElements;
}

/**
 * Draw a leader line from label to node
 * @param {HTMLElement} container - Container element
 * @param {Object} node - Node data
 * @param {Object} labelData - Label position data
 */
function drawLeaderLine(container, node, labelData) {
    const nodeCenter = node.x;
    const labelCenter = labelData.x + labelData.width / 2;
    
    // Calculate node Y position based on percentage (matching CSS)
    const caselineSection = document.getElementById('caseline-section');
    const sectionHeight = caselineSection ? caselineSection.offsetHeight : 300;
    
    // Node center Y with emoji center offset (8px) and title offset
    const nodeCenterY = labelData.isPrivate ? 
        (sectionHeight * 0.5 + 35 + 20 + 8) : // Private: center + title offset + 20px + emoji center
        (sectionHeight * 0.5 + 35 - 20 + 8); // Public: center + title offset - 20px + emoji center
    
    const labelEdgeY = labelData.isPrivate ? 
        labelData.y : // Top edge for labels below
        labelData.y + labelData.height; // Bottom edge for labels above
    
    // Create SVG for the leader line
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = Math.min(nodeCenter, labelCenter) + 'px';
    svg.style.top = Math.min(nodeCenterY, labelEdgeY) + 'px';
    svg.style.width = Math.abs(nodeCenter - labelCenter) + 'px';
    svg.style.height = Math.abs(nodeCenterY - labelEdgeY) + 'px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '8';  // Leader lines below nodes but above connection lines
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', nodeCenter < labelCenter ? '0' : Math.abs(nodeCenter - labelCenter));
    line.setAttribute('y1', nodeCenterY < labelEdgeY ? '0' : Math.abs(nodeCenterY - labelEdgeY));
    line.setAttribute('x2', nodeCenter > labelCenter ? '0' : Math.abs(nodeCenter - labelCenter));
    line.setAttribute('y2', nodeCenterY > labelEdgeY ? '0' : Math.abs(nodeCenterY - labelEdgeY));
    line.setAttribute('stroke', '#999');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-opacity', '0.7');
    
    svg.appendChild(line);
    container.appendChild(svg);
}