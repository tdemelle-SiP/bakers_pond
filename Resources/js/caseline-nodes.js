/**
 * caseline-nodes.js
 * Renders caseline events (emoji nodes) with labels and tooltips
 * 
 * REFERENCES:
 * - Original: lines 985-1046 for caseline rendering
 * - Emoji config: lines 87-98
 * - Caseline Y position: ~265px (between public and private)
 * - Label overrides: **text** in procedural column
 */

import { getXPosition } from './date-scale.js';
import { getEmojiConfig } from './emoji-config.js';

/**
 * Determine the caseline color based on multiple emojis
 * Priority: Red > Green > Yellow > Inherit > Bypass
 * Bypass is cancelled if paired with any other emoji
 */
function determineCaselineColor(emojis) {
    if (!emojis || emojis.length === 0) return '#999999';
    
    // Get all configs
    const configs = emojis.map(emoji => getEmojiConfig(emoji, 'caseline')).filter(c => c);
    if (configs.length === 0) return '#999999';
    
    // If only one emoji and it's bypass, return bypass
    if (emojis.length === 1 && configs[0].caselineColor === 'bypass') {
        return 'bypass';
    }
    
    // Check for red colors (denials, expired)
    const redConfig = configs.find(c => c.caselineColor === '#f44336');
    if (redConfig) return '#f44336';
    
    // Check for green colors (approvals, extended)
    const greenConfig = configs.find(c => c.caselineColor === '#4caf50');
    if (greenConfig) return '#4caf50';
    
    // Check for yellow colors (filings, plans, appeals)
    const yellowConfig = configs.find(c => c.caselineColor === '#ffd700');
    if (yellowConfig) return '#ffd700';
    
    // Check for inherit
    const inheritConfig = configs.find(c => c.caselineColor === 'inherit');
    if (inheritConfig) return 'inherit';
    
    // Default
    return '#999999';
}

/**
 * Render caseline nodes (emoji markers)
 * @param {Object[]} events - Caseline events only (eventType === 'caseline')
 * @param {Object} dateRange - From calculateDateRange
 * @param {number} pixelsPerDay - Scale factor
 * @returns {Object[]} Array of caseline node data for connections and labels
 */
export function renderCaselineNodes(events, dateRange, pixelsPerDay) {
    const caselineData = [];
    const caseGroups = {};
    
    // Use the caseline container
    const container = document.getElementById('caseline-container');
    
    // Filter to caseline events only
    const caselineEvents = events.filter(e => e.eventType === 'caseline');
    
    caselineEvents.forEach(event => {
        const x = getXPosition(event.date, dateRange.startDate, pixelsPerDay);
        
        // Handle multiple emojis
        const emojis = event.caselineEmojis || [];
        if (emojis.length === 0) return; // Skip if no emojis
        
        // Get first emoji config for label and positioning
        const primaryConfig = getEmojiConfig(emojis[0], 'caseline') || {};
        const caselineColor = determineCaselineColor(emojis);
        
        // Get label - prefer bold override from procedural column
        const nodeLabel = event.proceduralLabel || primaryConfig.displayLabel || '';
        
        // Create node element
        const node = document.createElement('div');
        node.className = 'caseline-node';
        
        // Add positioning classes
        // Only use bypass positioning if it's the ONLY emoji
        if (emojis.length === 1 && primaryConfig.caselineColor === 'bypass') {
            // Bypass nodes are centered on the timeline
            node.classList.add('centered');
        } else if (event.isPrivate) {
            // Private nodes below the line
            node.classList.add('private');
            node.classList.add('case-procedural-below');
        } else {
            // Public nodes above the line
            node.classList.add('public');
            node.classList.add('case-procedural-above');
        }
        
        // Add emoji-specific data attributes
        if (emojis.length > 1) {
            node.classList.add('multi-emoji');
            // For multi-emoji, create HTML structure with superscript
            const primaryEmoji = document.createElement('span');
            primaryEmoji.className = 'primary-emoji';
            primaryEmoji.textContent = emojis[0];
            
            const secondaryEmoji = document.createElement('span');
            secondaryEmoji.className = 'secondary-emoji';
            secondaryEmoji.textContent = emojis.slice(1).join('');
            
            node.appendChild(primaryEmoji);
            node.appendChild(secondaryEmoji);
        } else {
            // Single emoji - just set text content
            node.textContent = emojis[0] || '';
        }
        
        // Use primary emoji's class for filtering
        if (primaryConfig.class) {
            node.dataset.emojiType = primaryConfig.class;
        }
        
        node.style.left = x + 'px'; // Absolute positioning
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'event-tooltip';
        tooltip.innerHTML = `
            <div class="event-date">${event.caseNumber || 'No Case'}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-detail">${event.dateStr}</div>
        `;
        node.appendChild(tooltip);
        
        // Make clickable if has URL
        if (event.documentUrl) {
            node.style.cursor = 'pointer';
            node.onclick = () => window.open(event.documentUrl, '_blank');
        }
        
        container.appendChild(node);
        
        // Store data for labels and connections
        const isBypassPositioned = emojis.length === 1 && primaryConfig.caselineColor === 'bypass';
        const nodeData = {
            x: x,
            y: isBypassPositioned ? 127.5 : (event.isPrivate ? 140 : 115), // Centered for bypass, else original positions
            node: node,
            emojis: emojis,
            displayEmoji: emojis.join(''),
            label: nodeLabel,
            caselineColor: caselineColor,  // Can be 'inherit', 'bypass', or a color value
            emojiType: primaryConfig.class || null,  // Data attribute value for filtering
            isPrivate: isBypassPositioned ? false : event.isPrivate,  // Bypass nodes are neither public nor private
            caseNumber: event.caseNumber,
            date: event.date,
            event: event
        };
        
        caselineData.push(nodeData);
        
        // Group by case for connection lines
        if (event.caseNumber) {
            if (!caseGroups[event.caseNumber]) {
                caseGroups[event.caseNumber] = [];
            }
            caseGroups[event.caseNumber].push(nodeData);
        }
    });
    
    return { nodes: caselineData, caseGroups: caseGroups };
}

