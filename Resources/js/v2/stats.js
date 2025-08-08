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
        private: 0,
        continued: 0,
        timeline: 0,
        caseline: 0,
        public: 0
    };
    
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
        
        // Count missing documents
        if (event.hasMissingDoc) {
            stats.missing++;
        }
        
        // Count continuances
        if (event.caselineEmoji === '🐢') {
            stats.continued++;
        }
    });
    
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
    
    // Build stats HTML matching original simple format
    const statsHtml = `
        <div class="stat-item">
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
}