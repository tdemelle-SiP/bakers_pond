/**
 * label-layout.js for v2
 * Creates and positions labels with collision detection for caseline nodes only
 */

/**
 * Split label text into multiple lines for better layout
 * @param {string} text - Label text
 * @returns {string} Text with newlines inserted
 */
function splitLabel(text) {
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
 * @param {string} verticalPosition - 'private', 'public', or 'inline'
 * @returns {Object} {width, height} in pixels
 */
function measureLabel(text, verticalPosition) {
    const el = document.createElement('div');
    el.className = `node-label ${verticalPosition === 'private' ? 'node-label-below' : 'node-label-above'}`;
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
 * Create labels with collision detection
 * @param {Object[]} nodeData - Array of node data from renderCaselineNodes
 * @param {HTMLElement} container - The nodes-container element
 */
export function createLabelsWithCollisionDetection(nodeData, container) {
    const labels = [];
    
    // Process each node that has a label
    nodeData.forEach(node => {
        if (!node.label || node.label === '') return;
        if (node.displayEmoji === '🐢') return; // Skip continuance events
        
        // Split multi-word labels
        const labelText = splitLabel(node.label);
        
        // Measure the label properly
        const { width, height } = measureLabel(labelText, node.verticalPosition);
        
        // Create label element
        const labelEl = document.createElement('div');
        labelEl.className = `node-label ${node.verticalPosition === 'private' ? 'node-label-below' : 'node-label-above'}`;
        
        // Add high emphasis class if needed
        if (node.labelEmphasis === 'high') {
            labelEl.classList.add('node-label-high');
        }
        
        // Add emoji data attribute for filtering
        if (node.emojiType) {
            labelEl.dataset.emojiType = node.emojiType;
        }
        
        // Add status coloring
        if (node.caselineColor === '#f44336') {
            labelEl.classList.add('status-denied');
        } else if (node.caselineColor === '#4caf50') {
            labelEl.classList.add('status-approved');
        } else if (node.caselineColor === '#ffd700') {
            labelEl.classList.add('status-pending');
        }
        
        labelEl.style.whiteSpace = 'pre-line';
        labelEl.style.textAlign = 'center';
        labelEl.textContent = labelText;
        labelEl.title = `${node.event.title} - ${node.event.dateStr}`;
        
        // Make clickable if has URL
        if (node.event.documentUrl) {
            labelEl.style.cursor = 'pointer';
            labelEl.onclick = () => {
                window.open(node.event.documentUrl, '_blank');
            };
        }
        
        // Position based on node position
        const x = node.x - width / 2; // Center on node
        const y = getYPosition(node, height);
        
        // Store label info for collision detection
        labels.push({
            element: labelEl,
            x: x,
            y: y,
            width: width,
            height: height,
            nodeX: node.x,
            nodeY: getNodeY(node),
            node: node
        });
    });
    
    // Resolve collisions
    resolveCollisions(labels);
    
    // Apply final positions and append to DOM
    labels.forEach(label => {
        label.element.style.position = 'absolute';
        label.element.style.left = label.x + 'px';
        label.element.style.top = label.y + 'px';
        label.element.style.transform = 'none';
        
        container.appendChild(label.element);
        
        // Draw leader line if label moved from original position
        if (Math.abs(label.x + label.width/2 - label.nodeX) > 5) {
            drawLeaderLine(container, label);
        }
    });
}

/**
 * Get Y position for label based on node position
 */
function getYPosition(node, labelHeight) {
    const nodeY = getNodeY(node);
    
    if (node.verticalPosition === 'private') {
        // Labels below: top edge at fixed distance (30px) from node
        return nodeY + 30;
    } else if (node.verticalPosition === 'inline') {
        // Inline (bypass) nodes: center label vertically on node
        return nodeY - labelHeight / 2;
    } else {
        // Labels above: bottom edge at fixed distance from node
        return nodeY - 30 - labelHeight;
    }
}

/**
 * Get Y position of node
 */
function getNodeY(node) {
    const containerHeight = document.getElementById('caseline-container').offsetHeight;
    const centerY = containerHeight / 2;
    
    if (node.verticalPosition === 'private') {
        return centerY + 35 + 20;
    } else if (node.verticalPosition === 'inline') {
        return centerY + 35;
    } else {
        return centerY + 35 - 20;
    }
}

/**
 * Resolve label collisions
 * Uses bidirectional order-preserving algorithm from original
 */
function resolveCollisions(labelData) {
    const minGap = 3; // horizontal breathing room between labels
    
    // Process each band (public/private/inline) separately
    ['public', 'private', 'inline'].forEach(position => {
        // Get labels for this band, sorted by node position
        const bandLabels = labelData
            .filter(ld => ld.node.verticalPosition === position)
            .sort((a, b) => a.nodeX - b.nodeX);
        
        if (bandLabels.length === 0) return;
        
        // Find and resolve overlaps
        let hasOverlap = true;
        let iterations = 0;
        const minLeftBound = 0; // No left boundary constraint
        
        while (hasOverlap && iterations < 30) {
            hasOverlap = false;
            
            for (let i = 1; i < bandLabels.length; i++) {
                const prev = bandLabels[i - 1];
                const curr = bandLabels[i];
                
                const overlap = (prev.x + prev.width + minGap) - curr.x;
                
                if (overlap > 0) {
                    hasOverlap = true;
                    
                    // Move labels apart to achieve exactly minGap spacing
                    const targetGap = minGap;
                    const currentGap = curr.x - (prev.x + prev.width);
                    const adjustment = (targetGap - currentGap) / 2;
                    
                    prev.x -= adjustment;
                    curr.x += adjustment;
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
 * Draw leader line from node to label
 */
function drawLeaderLine(container, labelData) {
    const nodeCenter = labelData.nodeX;
    const labelCenter = labelData.x + labelData.width / 2;
    
    // Calculate edge of label to connect to
    const labelEdgeY = labelData.node.verticalPosition === 'private' ? 
        labelData.y : // Top edge for labels below
        labelData.y + labelData.height; // Bottom edge for labels above
    
    // Create SVG for the leader line
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = Math.min(nodeCenter, labelCenter) + 'px';
    svg.style.top = Math.min(labelData.nodeY, labelEdgeY) + 'px';
    svg.style.width = Math.abs(nodeCenter - labelCenter) + 'px';
    svg.style.height = Math.abs(labelData.nodeY - labelEdgeY) + 'px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '8';  // Leader lines below nodes but above connection lines
    
    // Add emoji data attribute for filtering
    if (labelData.node.emojiType) {
        svg.dataset.emojiType = labelData.node.emojiType;
    }
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', nodeCenter < labelCenter ? '0' : Math.abs(nodeCenter - labelCenter));
    line.setAttribute('y1', labelData.nodeY < labelEdgeY ? '0' : Math.abs(labelData.nodeY - labelEdgeY));
    line.setAttribute('x2', nodeCenter > labelCenter ? '0' : Math.abs(nodeCenter - labelCenter));
    line.setAttribute('y2', labelData.nodeY > labelEdgeY ? '0' : Math.abs(labelData.nodeY - labelEdgeY));
    line.setAttribute('stroke', '#999');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-opacity', '0.7');
    
    svg.appendChild(line);
    container.appendChild(svg);
}

// Export for use in render.js
export default { createLabelsWithCollisionDetection };