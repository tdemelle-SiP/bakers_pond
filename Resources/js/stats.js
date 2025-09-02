/**
 * stats.js
 * Calculates and displays event statistics in the header
 */

import { getEmojiConfig } from './emoji-config.js';

/**
 * Calculate statistics from events
 * @param {Object[]} events - All parsed events
 * @param {Object} emojiVisibility - Optional emoji visibility state (e.g., {filing: false, hearing: true})
 * @returns {Object} Statistics object
 */
export function calculateStats(events, emojiVisibility = null) {
    const stats = {
        denials: 0,
        plans: 0,
        continued: 0,
        timeline: 0,
        caseline: 0
    };
    
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
        }
        
        // Count denials (⛔ emoji) - only for caseline events
        if (event.eventType === 'caseline' && event.caselineEmoji === '⛔') {
            stats.denials++;
        }
        
        // Count plans (📐 emoji) - only for caseline events
        if (event.eventType === 'caseline' && event.caselineEmoji === '📐') {
            stats.plans++;
        }
        
        // Count continuances - only for caseline events
        if (event.eventType === 'caseline' && event.caselineEmoji === '🐢') {
            stats.continued++;
        }
    });
    
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
    
    // Build stats HTML, hiding stats for hidden emojis
    let statsHtml = '';
    
    // Check visibility for each stat's emoji
    const showDenials = !emojiVisibility || emojiVisibility['denied'] !== false;
    const showPlans = !emojiVisibility || emojiVisibility['plan'] !== false;
    const showContinued = !emojiVisibility || emojiVisibility['continuance'] !== false;
    
    if (showDenials) {
        statsHtml += `
            <div class="stat-item">
                <span class="stat-number">${stats.denials}</span>
                <span class="stat-label">Denials</span>
            </div>
        `;
    }
    
    if (showPlans) {
        statsHtml += `
            <div class="stat-item">
                <span class="stat-number">${stats.plans}</span>
                <span class="stat-label">Plans</span>
            </div>
        `;
    }
    
    if (showContinued) {
        statsHtml += `
            <div class="stat-item">
                <span class="stat-number">${stats.continued}</span>
                <span class="stat-label">Continued</span>
            </div>
        `;
    }
    
    statsContainer.innerHTML = statsHtml;
}

