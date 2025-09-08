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
    
    // For multi-emoji, use the superscript (second) emoji's color
    if (emojis.length > 1) {
        const superscriptConfig = getEmojiConfig(emojis[1], 'caseline');
        if (superscriptConfig && superscriptConfig.caselineColor) {
            return superscriptConfig.caselineColor;
        }
    }
    
    // For single emoji, use its color
    const config = getEmojiConfig(emojis[0], 'caseline');
    if (!config) return '#999999';
    
    return config.caselineColor || '#999999';
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
    
    // Use the nodes container
    const container = document.getElementById('nodes-container');
    
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
        // Use bypass positioning if all emojis are bypass
        const allBypass = emojis.length > 1 ? 
            emojis.every(emoji => {
                const config = getEmojiConfig(emoji, 'caseline');
                return config && config.caselineColor === 'bypass';
            }) :
            primaryConfig.caselineColor === 'bypass';
            
        if (allBypass) {
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
            // Create a container for the multi-emoji structure
            const emojiContainer = document.createElement('div');
            emojiContainer.className = 'emoji-container';
            
            const primaryEmoji = document.createElement('span');
            primaryEmoji.className = 'primary-emoji';
            primaryEmoji.textContent = emojis[0];
            
            const secondaryEmoji = document.createElement('span');
            secondaryEmoji.className = 'secondary-emoji';
            secondaryEmoji.textContent = emojis.slice(1).join('');
            
            emojiContainer.appendChild(primaryEmoji);
            emojiContainer.appendChild(secondaryEmoji);
            node.appendChild(emojiContainer);
        } else {
            // Single emoji - just set text content
            node.textContent = emojis[0] || '';
        }
        
        // For multi-emoji, store both emoji types for visibility filtering
        if (emojis.length > 1) {
            const secondaryConfig = getEmojiConfig(emojis[1], 'caseline');
            node.dataset.emojiType = primaryConfig.class || '';
            node.dataset.emojiType2 = secondaryConfig?.class || '';
        } else if (primaryConfig.class) {
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
        
        // Determine vertical position: 'public', 'private', or 'inline'
        let verticalPosition;
        if (isBypassPositioned) {
            verticalPosition = 'inline';
        } else if (event.isPrivate) {
            verticalPosition = 'private';
        } else {
            verticalPosition = 'public';
        }
        
        // Get secondary emoji type for multi-emoji nodes
        const secondaryConfig = emojis.length > 1 ? getEmojiConfig(emojis[1], 'caseline') : null;
        
        const nodeData = {
            x: x,
            y: isBypassPositioned ? 127.5 : (event.isPrivate ? 140 : 115), // Centered for bypass, else original positions
            node: node,
            emojis: emojis,
            displayEmoji: emojis.join(''),
            label: nodeLabel,
            labelEmphasis: event.labelEmphasis,  // Pass emphasis level through (null or 'high')
            caselineColor: caselineColor,  // Can be 'inherit', 'bypass', or a color value
            emojiType: primaryConfig.class || null,  // Data attribute value for filtering
            emojiType2: secondaryConfig?.class || null,  // Secondary emoji type for multi-emoji
            verticalPosition: verticalPosition,  // 'public', 'private', or 'inline'
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

