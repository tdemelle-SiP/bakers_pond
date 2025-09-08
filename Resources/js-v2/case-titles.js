/**
 * case-titles.js (v2)
 * Renders case title labels above the timeline
 * No event handlers - those are managed by main.js
 */

// Case colors (temporary until palette solution)
const CASE_COLORS = {
    'Historical': '#999999',
    '338-0303': '#2196f3',
    '338-0594': '#37A0F4',  // Bright blue per user request
    '338-0706': '#4caf50',
    '338-0756': '#ff9800'
};

/**
 * Get case info from casesData
 * @param {string} caseNumber - The case number to look up
 * @param {Array} casesData - Array of case metadata
 * @returns {Object|null} Case info object with year and name
 */
function getCaseInfo(caseNumber, casesData) {
    casesData = casesData || [];
    
    // Find matching case data
    const caseData = casesData.find(c => {
        // Handle Historical special case
        if (caseNumber === 'Historical' && (c.caseNumber === '-' || c.title.toLowerCase() === 'historical')) {
            return true;
        }
        return c.caseNumber === caseNumber;
    });
    
    if (!caseData) return null;
    
    return {
        year: caseData.year || '',
        name: caseData.title || '',
        depNumber: caseData.depNumber || ''
    };
}

/**
 * Get or create the case titles container
 * @returns {HTMLElement} The container element
 */
function getCaseTitlesContainer() {
    let container = document.getElementById('case-titles-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'case-titles-container';
        container.style.position = 'relative';
        container.style.height = '0';
        container.style.overflow = 'visible';
        
        const nodesContainer = document.getElementById('nodes-container');
        if (nodesContainer) {
            nodesContainer.appendChild(container);
        }
    }
    
    return container;
}

/**
 * Render case titles for all cases in the timeline
 * @param {Object} caseGroups - Groups of events organized by case
 * @param {string[]} visibleCases - Array of visible case numbers
 * @param {Array} casesData - Metadata for cases
 */
export function renderCaseTitles(caseGroups, visibleCases, casesData) {
    const container = getCaseTitlesContainer();
    
    // Clear existing titles
    container.innerHTML = '';
    
    // Process each visible case
    Object.entries(caseGroups).forEach(([caseNumber, events]) => {
        // Skip if case not visible
        if (!visibleCases.includes(caseNumber)) return;
        
        // Find the leftmost (earliest) event for this case
        const firstEvent = events.reduce((earliest, event) => {
            return !earliest || event.x < earliest.x ? event : earliest;
        }, null);
        
        if (firstEvent) {
            // Get case info
            const caseInfo = getCaseInfo(caseNumber, casesData);
            
            // Create title label (showing year and name)
            const titleLabel = document.createElement('div');
            titleLabel.className = 'case-title';
            titleLabel.dataset.caseNumber = caseNumber;
            titleLabel.style.left = (firstEvent.x + 90) + 'px';
            titleLabel.style.top = '0';
            
            // Use case-specific color or default
            const color = CASE_COLORS[caseNumber] || '#666666';
            
            // Build title text
            let titleText = caseNumber;
            if (caseInfo) {
                if (caseInfo.year && caseInfo.name) {
                    titleText = `${caseInfo.year} ${caseInfo.name}`;
                } else if (caseInfo.name) {
                    titleText = caseInfo.name;
                }
            }
            titleLabel.textContent = titleText;
            titleLabel.style.color = color;
            container.appendChild(titleLabel);
            
            // Create DEP label below title
            const depLabel = document.createElement('div');
            depLabel.className = 'case-dep case-label';
            depLabel.dataset.caseNumber = caseNumber;
            depLabel.style.left = (firstEvent.x + 90) + 'px';
            depLabel.style.top = '28px';
            depLabel.style.color = color;
            
            // Build DEP text
            let depText = `Case ${caseNumber}`;
            if (caseInfo && caseInfo.depNumber) {
                depText = `DEP ${caseInfo.depNumber}`;
            }
            depLabel.textContent = depText;
            container.appendChild(depLabel);
            
            // Note: No event handlers added here - v2's main.js handles double-clicks
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
    visibleCases.forEach(caseNumber => {
        container.querySelectorAll(`[data-case-number="${caseNumber}"]`).forEach(el => {
            el.style.display = 'block';
        });
    });
}