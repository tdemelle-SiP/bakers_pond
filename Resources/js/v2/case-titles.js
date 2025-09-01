/**
 * case-titles.js
 * Renders case title elements above the caseline
 * Shows year + name and DEP number for each visible case
 */

// Case information mapping
const CASE_INFO = {
    'Historical': { year: '', name: 'Historical' },
    '338-0303': { year: '2001', name: 'Initial' },
    '338-0594': { year: '2014', name: 'House' },
    '338-0706': { year: '2020', name: 'House' },
    '338-0756': { year: '2023', name: 'Dam' }
};

// Case colors (matching original)
const CASE_COLORS = {
    'Historical': '#999999',
    '338-0303': '#2196f3',
    '338-0594': '#37A0F4',  // Bright blue per user request
    '338-0706': '#4caf50',
    '338-0756': '#ff9800'
};

/**
 * Create case title container if it doesn't exist
 * @returns {HTMLElement} The case titles container
 */
function getCaseTitlesContainer() {
    let container = document.getElementById('case-titles-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'case-titles-container';
        container.style.position = 'absolute';
        container.style.top = '35px'; // Lower to avoid header border overlap
        container.style.left = '0';
        container.style.right = '0';
        container.style.height = '50px'; // More height for titles
        container.style.zIndex = '25';
        
        const caselineContainer = document.getElementById('caseline-container');
        if (caselineContainer) {
            caselineContainer.appendChild(container);
        }
    }
    return container;
}

/**
 * Render case titles for visible cases
 * @param {Object} caseGroups - Groups of caseline nodes by case number
 * @param {string[]} visibleCases - Array of currently visible case numbers
 */
export function renderCaseTitles(caseGroups, visibleCases = null) {
    const container = getCaseTitlesContainer();
    
    // Clear existing titles
    container.innerHTML = '';
    
    // Process each case group
    Object.entries(caseGroups).forEach(([caseNumber, nodes]) => {
        // Skip if case is filtered out
        if (visibleCases && !visibleCases.includes(caseNumber)) {
            return;
        }
        
        // Skip if no nodes for this case
        if (!nodes || nodes.length === 0) {
            return;
        }
        
        // Get the first node to position the label
        const firstNode = nodes.reduce((min, node) => 
            node.x < min.x ? node : min
        , nodes[0]);
        
        // Get case info
        const info = CASE_INFO[caseNumber];
        const color = CASE_COLORS[caseNumber] || '#666666';
        
        if (info) {
            // Create year + name label (top)
            const titleLabel = document.createElement('div');
            titleLabel.className = 'case-title';
            titleLabel.style.position = 'absolute';
            titleLabel.style.left = (firstNode.x + 90) + 'px';
            titleLabel.style.top = '0';
            titleLabel.style.color = color;
            titleLabel.style.fontSize = '22px'; // Much bigger like original
            titleLabel.style.fontWeight = '900'; // Much bolder
            titleLabel.style.whiteSpace = 'nowrap';
            titleLabel.style.cursor = 'pointer';
            titleLabel.textContent = `${info.year} ${info.name}`.trim();
            titleLabel.dataset.caseNumber = caseNumber;
            container.appendChild(titleLabel);
            
            // Create DEP number label (bottom)
            const depLabel = document.createElement('div');
            depLabel.className = 'case-label';
            depLabel.style.position = 'absolute';
            depLabel.style.left = (firstNode.x + 90) + 'px';
            depLabel.style.top = '28px'; // Adjusted spacing for same-size text
            depLabel.style.color = color;
            depLabel.style.fontSize = '22px'; // Same size as main title
            depLabel.style.whiteSpace = 'nowrap';
            depLabel.style.cursor = 'pointer';
            depLabel.dataset.caseNumber = caseNumber;
            
            const depText = caseNumber === 'Historical' ? 
                'Historical Records' : 
                `DEP #${caseNumber}`;
            depLabel.textContent = depText;
            container.appendChild(depLabel);
            
            // Add double-click handler to both labels
            [titleLabel, depLabel].forEach(label => {
                label.addEventListener('dblclick', () => {
                    if (window.isolateCase) {
                        window.isolateCase(caseNumber);
                    }
                });
            });
        }
    });
}

/**
 * Update case titles visibility based on filters
 * @param {string[]} visibleCases - Array of currently visible case numbers
 */
export function updateCaseTitlesVisibility(visibleCases) {
    const container = getCaseTitlesContainer();
    
    // Hide all titles first
    container.querySelectorAll('.case-title, .case-label').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show titles for visible cases
    // This is a simplified approach - you may want to track which labels belong to which case
    // For now, we'll re-render when visibility changes
}