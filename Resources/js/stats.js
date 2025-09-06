/**
 * stats.js
 * Calculates and displays event statistics in the header
 */

import { getEmojiConfig, getEmojiArray } from './emoji-config.js';

/**
 * Calculate statistics from events
 * @param {Object[]} events - All parsed events
 * @param {Object} emojiVisibility - Optional emoji visibility state (e.g., {filing: false, hearing: true})
 * @returns {Object} Statistics object
 */
export function calculateStats(events, emojiVisibility = null) {
    const stats = {
        timeline: 0,
        caseline: 0
    };
    
    // Initialize counters for each emoji that has metricDisplay
    const emojiStats = {};
    
    events.forEach(event => {
        // Skip if emoji visibility is hidden for this event
        if (emojiVisibility && event.eventType === 'caseline' && event.caselineEmoji) {
            const config = getEmojiConfig(event.caselineEmoji, 'caseline');
            if (config && config.class && emojiVisibility[config.class] === false) {
                return; // Skip this event in counting
            }
        }
        
        // Count by type
        if (event.eventType === 'timeline') {
            stats.timeline++;
        } else if (event.eventType === 'caseline') {
            stats.caseline++;
            
            // Count emoji metrics
            if (event.caselineEmoji) {
                const config = getEmojiConfig(event.caselineEmoji, 'caseline');
                if (config && config.metricDisplay !== undefined) {
                    if (!emojiStats[event.caselineEmoji]) {
                        emojiStats[event.caselineEmoji] = 0;
                    }
                    emojiStats[event.caselineEmoji]++;
                }
            }
        }
    });
    
    stats.emojiStats = emojiStats;
    return stats;
}

/**
 * Render statistics in the header
 * @param {Object} stats - Statistics object from calculateStats
 * @param {Object} emojiVisibility - Optional emoji visibility state
 */
export function renderStats(stats, emojiVisibility = null) {
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
    
    // Build stats HTML from configuration
    let statsHtml = '';
    
    // Get all emojis with metricDisplay and sort by display order
    const metricsToDisplay = [];
    const caselineEmojis = getEmojiArray('caseline');
    
    caselineEmojis.forEach(item => {
        if (item.metricDisplay !== undefined) {
            // Check visibility
            const isVisible = !emojiVisibility || emojiVisibility[item.class] !== false;
            if (isVisible) {
                metricsToDisplay.push({
                    emoji: item.emoji,
                    order: item.metricDisplay,
                    label: item.metricLabel || item.legendLabel,
                    count: stats.emojiStats?.[item.emoji] || 0
                });
            }
        }
    });
    
    // Sort by display order
    metricsToDisplay.sort((a, b) => a.order - b.order);
    
    // Generate HTML for each metric
    metricsToDisplay.forEach(metric => {
        statsHtml += `
            <div class="stat-item">
                <span class="stat-number">${metric.count}</span>
                <span class="stat-label">${metric.label}</span>
            </div>
        `;
    });
    
    statsContainer.innerHTML = statsHtml;
}

