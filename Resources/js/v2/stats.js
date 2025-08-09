/**
 * stats.js
 * Calculates and displays event statistics in the header
 */

/**
 * Calculate statistics from events
 * @param {Object[]} events - All parsed events
 * @returns {Object} Statistics object
 */
export function calculateStats(events) {
    const stats = {
        total: events.length,
        missing: 0,
        missingDocuments: [], // Store details of missing docs
        private: 0,
        continued: 0,
        timeline: 0,
        caseline: 0,
        public: 0
    };
    
    // Track unique missing documents to avoid duplicates
    const uniqueMissingDocs = new Map();
    
    events.forEach(event => {
        // Count by type
        if (event.eventType === 'timeline') {
            stats.timeline++;
        } else if (event.eventType === 'caseline') {
            stats.caseline++;
        }
        
        // Count private
        if (event.isPrivate) {
            stats.private++;
        } else {
            stats.public++;
        }
        
        // Count and collect missing documents (deduplicated)
        if (event.hasMissingDoc) {
            // Create unique key from date, title, and case number
            const key = `${event.dateStr}|${event.title}|${event.caseNumber}`;
            
            if (!uniqueMissingDocs.has(key)) {
                uniqueMissingDocs.set(key, {
                    date: event.dateStr,
                    title: event.title,
                    caseNumber: event.caseNumber || 'N/A'
                });
            }
        }
        
        // Count continuances
        if (event.caselineEmoji === '🐢') {
            stats.continued++;
        }
    });
    
    // Convert unique missing documents to array
    stats.missingDocuments = Array.from(uniqueMissingDocs.values());
    stats.missing = stats.missingDocuments.length;
    
    return stats;
}

/**
 * Render statistics in the header
 * @param {Object} stats - Statistics object from calculateStats
 */
export function renderStats(stats) {
    // Find or create stats container
    let statsContainer = document.getElementById('stats-container');
    if (!statsContainer) {
        const navTopRow = document.querySelector('.nav-top-row');
        if (!navTopRow) return;
        
        // Look for existing stats or create new
        const existingStats = navTopRow.querySelector('.stats-container');
        if (existingStats) {
            statsContainer = existingStats;
        } else {
            statsContainer = document.createElement('div');
            statsContainer.id = 'stats-container';
            statsContainer.className = 'stats-container';
            
            // Insert after title
            const title = navTopRow.querySelector('.nav-title');
            if (title && title.nextSibling) {
                navTopRow.insertBefore(statsContainer, title.nextSibling);
            } else {
                navTopRow.appendChild(statsContainer);
            }
        }
    }
    
    // Store missing documents data globally for the click handler
    window.missingDocumentsData = stats.missingDocuments;
    
    // Build stats HTML matching original simple format
    const statsHtml = `
        <div class="stat-item clickable-stat" id="missing-stat">
            <span class="stat-number">${stats.missing}</span>
            <span class="stat-label">Missing</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${stats.private}</span>
            <span class="stat-label">Private</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${stats.continued}</span>
            <span class="stat-label">Continued</span>
        </div>
        <div class="stat-item">
            <span class="stat-number">${stats.total}</span>
            <span class="stat-label">Total</span>
        </div>
    `;
    
    statsContainer.innerHTML = statsHtml;
    
    // Add click handler for missing stat
    const missingStat = document.getElementById('missing-stat');
    if (missingStat && stats.missing > 0) {
        missingStat.addEventListener('click', showMissingDocumentsPopup);
    }
}

/**
 * Show popup with missing documents details
 */
function showMissingDocumentsPopup() {
    // Check if popup already exists
    let popup = document.getElementById('missing-docs-popup');
    if (popup) {
        popup.remove();
    }
    
    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.id = 'missing-docs-overlay';
    overlay.className = 'popup-overlay';
    
    // Create popup container
    popup = document.createElement('div');
    popup.id = 'missing-docs-popup';
    popup.className = 'popup-container';
    
    // Get missing documents data
    const missingDocs = window.missingDocumentsData || [];
    
    // Sort by date
    missingDocs.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Build content
    let content = `
        <div class="popup-header">
            <h3>Missing Documents (${missingDocs.length})</h3>
            <div class="popup-header-actions">
                <button class="copy-button" onclick="copyMissingDocsList()">Copy to Clipboard</button>
                <button class="popup-close" onclick="document.getElementById('missing-docs-overlay').remove()">✕</button>
            </div>
        </div>
        <div class="popup-content">
            <div class="missing-docs-list">
    `;
    
    missingDocs.forEach(doc => {
        content += `
            <div class="missing-doc-item">
                <span class="missing-doc-date">${doc.date}</span>
                <span class="missing-doc-case">[${doc.caseNumber}]</span>
                <span class="missing-doc-title">${doc.title}</span>
            </div>
        `;
    });
    
    content += `
            </div>
        </div>
    `;
    
    popup.innerHTML = content;
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Export function for copy button
window.copyMissingDocsList = function() {
    const missingDocs = window.missingDocumentsData || [];
    let text = 'Missing Documents:\n\n';
    
    missingDocs.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    missingDocs.forEach(doc => {
        text += `${doc.date}\t[${doc.caseNumber}]\t${doc.title}\n`;
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const button = document.querySelector('.copy-button');
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
};