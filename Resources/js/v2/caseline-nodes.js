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
        
        // Determine display emoji (show 🔒 if private, otherwise the main emoji)
        const displayEmoji = event.isPrivate ? '🔒' : event.caselineEmoji;
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
        
        // Add emoji-specific class if defined
        const emojiConfig = getEmojiConfig(event.caselineEmoji, 'caseline');
        if (emojiConfig && emojiConfig.class) {
            node.classList.add(emojiConfig.class);
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
            color: config.color || '#999999',
            borderColor: config.borderColor || '#666666',
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

/**
 * Render labels for caseline nodes
 * @param {Object[]} nodeData - Array of node data from renderCaselineNodes
 * @param {HTMLElement} container - Timeline container
 */
export function renderCaselineLabels(nodeData, container) {
    const labels = [];
    
    nodeData.forEach(data => {
        if (!data.label) return;
        
        const label = document.createElement('div');
        label.className = 'node-label';
        
        // Position above or below based on private status
        if (data.isPrivate) {
            label.classList.add('node-label-below');
        } else {
            label.classList.add('node-label-above');
        }
        
        // Add status color class
        if (data.color === '#4caf50') {
            label.classList.add('status-approved');
        } else if (data.color === '#f44336') {
            label.classList.add('status-denied');
        } else if (data.color === '#ffd700') {
            label.classList.add('status-pending');
        }
        
        label.textContent = data.label;
        label.style.left = data.x + 'px';
        label.style.transform = 'translateX(-50%)';
        
        container.appendChild(label);
        
        labels.push({
            element: label,
            x: data.x,
            width: 0, // Will be measured after rendering
            nodeData: data
        });
    });
    
    return labels;
}