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
        
        // Use the actual emoji regardless of private status
        const displayEmoji = event.caselineEmoji;
        const config = getEmojiConfig(event.caselineEmoji, 'caseline') || {};
        
        // Get label - prefer bold override from procedural column
        const nodeLabel = event.proceduralLabel || config.displayLabel || '';
        
        // Create node element
        const node = document.createElement('div');
        node.className = 'caseline-node';
        
        // Add public/private class for vertical positioning
        if (event.isPrivate) {
            node.classList.add('private');
            node.classList.add('case-procedural-below');
        } else {
            node.classList.add('public');
            node.classList.add('case-procedural-above');
        }
        
        // Add emoji-specific data attribute if defined
        if (config.class) {
            node.dataset.emojiType = config.class;
        }
        
        node.style.left = x + 'px'; // Absolute positioning
        node.textContent = displayEmoji;
        
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
        const nodeData = {
            x: x,
            y: event.isPrivate ? 140 : 115, // Match original Y positions
            node: node,
            emoji: event.caselineEmoji,
            displayEmoji: displayEmoji,
            label: nodeLabel,
            caselineColor: config.caselineColor || '#999999',  // Can be 'inherit' or a color value
            emojiType: config.class || null,  // Data attribute value for filtering
            isPrivate: event.isPrivate,
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

