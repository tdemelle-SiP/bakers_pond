/**
 * legend-v2.js
 * Renders the emoji legend in the header
 */

import { getEmojiArray } from './emoji-config.js';
import { saveEmojiVisibility, loadEmojiVisibility, 
         setIsolationMode, getIsolationMode, clearIsolationMode, isIsolating } from './state-persistence.js';

/**
 * Initialize legend in the header
 */
export function initLegend() {
    // Find or create legend container in nav
    let legendContainer = document.getElementById('legend-container');
    if (!legendContainer) {
        const navBottomRow = document.querySelector('.nav-bottom-row');
        if (!navBottomRow) return;
        
        legendContainer = document.createElement('div');
        legendContainer.id = 'legend-container';
        legendContainer.className = 'legend';
        navBottomRow.appendChild(legendContainer);
    }
    
    // Get emoji configurations
    const caselineEmojis = getEmojiArray('caseline');
    const timelineEmojis = getEmojiArray('timeline');
    
    // Build legend HTML matching original two-row table format
    let html = '<div style="display: flex; gap: 20px; align-items: center;">';
    
    // Caseline legend (two-row table)
    html += '<div style="padding-right: 20px; border-right: 2px solid #546e7a;">';
    html += '<table style="border-collapse: collapse; color: white; font-size: 12px;">';
    
    // Split caseline emojis into two rows (balanced)
    const splitPoint = Math.ceil(caselineEmojis.length / 2);
    const firstRowEmojis = caselineEmojis.slice(0, splitPoint);
    const secondRowEmojis = caselineEmojis.slice(splitPoint);
    
    // Helper function to create emoji cell with optional checkbox
    const createEmojiCell = (item) => {
        if (item.class) {
            return `<td style="padding: 2px 12px;">
                <label style="cursor: pointer;">
                    <input type="checkbox" id="show-${item.class}" class="emoji-toggle" 
                           data-class="${item.class}" style="margin-right: 4px; cursor: pointer;" checked>
                    ${item.emoji} ${item.label}
                </label>
            </td>`;
        }
        return `<td style="padding: 2px 12px;">${item.emoji} ${item.label}</td>`;
    };
    
    // First row of caseline
    html += '<tr>';
    html += '<td style="padding: 2px 10px 2px 0; font-weight: bold; white-space: nowrap; vertical-align: top;" rowspan="2">Caseline:</td>';
    firstRowEmojis.forEach(item => {
        html += createEmojiCell(item);
    });
    html += '</tr>';
    
    // Second row of caseline
    html += '<tr>';
    secondRowEmojis.forEach(item => {
        html += createEmojiCell(item);
    });
    html += '</tr>';
    html += '</table>';
    html += '</div>';
    
    // Timeline legend (single row)
    html += '<div>';
    html += '<table style="border-collapse: collapse; color: white; font-size: 12px;">';
    html += '<tr>';
    html += '<td style="padding: 2px 10px 2px 0; font-weight: bold; white-space: nowrap;">Timeline:</td>';
    timelineEmojis.forEach(item => {
        if (item.emoji === '❌') {
            // Missing document uses emoji
            html += `<td style="padding: 2px 12px;">${item.emoji} ${item.label}</td>`;
        } else {
            // Public/Private use colored squares
            const borderColor = item.borderColor || item.color;
            html += `<td style="padding: 2px 12px;"><span style="display: inline-block; width: 10px; height: 10px; background: ${item.color}; border: 1px solid ${borderColor}; margin-right: 5px;"></span>${item.label}</td>`;
        }
    });
    html += '</tr>';
    html += '</table>';
    html += '</div>';
    
    html += '</div>';
    
    legendContainer.innerHTML = html;
    
    // Get all toggle checkboxes
    const toggleCheckboxes = document.querySelectorAll('.emoji-toggle');
    
    // Helper function to update node visibility based on checkboxes
    function updateNodeVisibility() {
        const visibility = {};
        
        toggleCheckboxes.forEach(checkbox => {
            const emojiClass = checkbox.dataset.class;
            const isVisible = checkbox.checked;
            visibility[emojiClass] = isVisible;
            
            // Update nodes, labels, and leader lines using data attributes
            const elements = document.querySelectorAll(
                `[data-emoji-type="${emojiClass}"]`
            );
            elements.forEach(element => {
                element.style.display = isVisible ? '' : 'none';
            });
        });
        
        // Save state
        saveEmojiVisibility(visibility);
        
        // Recalculate label collisions with visible nodes
        if (window.refreshCaselineLabels) {
            window.refreshCaselineLabels();
        }
    }
    
    // Load and apply saved visibility state
    const savedVisibility = loadEmojiVisibility();
    
    // Check if we're in emoji isolation mode
    const isolation = getIsolationMode();
    if (isolation.type === 'emoji') {
        // Apply isolation state
        toggleCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.dataset.class === isolation.target;
        });
    } else {
        // Apply normal saved state
        toggleCheckboxes.forEach(checkbox => {
            const emojiClass = checkbox.dataset.class;
            // Default to visible if no saved state
            checkbox.checked = savedVisibility[emojiClass] !== false;
        });
    }
    
    // Apply initial visibility
    updateNodeVisibility();
    
    // Add event listeners
    toggleCheckboxes.forEach(checkbox => {
        const emojiClass = checkbox.dataset.class;
        
        // Single click - just update visibility
        checkbox.addEventListener('change', updateNodeVisibility);
        
        // Double click - isolate/restore
        checkbox.addEventListener('dblclick', (e) => {
            e.preventDefault();
            
            if (isIsolating('emoji', emojiClass)) {
                // Restore previous state
                const isolation = getIsolationMode();
                Object.entries(isolation.previousState).forEach(([cls, checked]) => {
                    const cb = document.querySelector(`[data-class="${cls}"]`);
                    if (cb) cb.checked = checked;
                });
                clearIsolationMode();
            } else {
                // Save current state and isolate
                const previousState = {};
                toggleCheckboxes.forEach(cb => {
                    previousState[cb.dataset.class] = cb.checked;
                });
                
                setIsolationMode('emoji', emojiClass, previousState);
                
                // Set only this emoji as checked
                toggleCheckboxes.forEach(cb => {
                    cb.checked = (cb.dataset.class === emojiClass);
                });
            }
            
            updateNodeVisibility();
        });
    });
    
    // Reset function for the reset button
    window.resetEmojiVisibility = function() {
        // Clear any emoji isolation
        if (getIsolationMode().type === 'emoji') {
            clearIsolationMode();
        }
        
        // Reset all checkboxes to checked
        toggleCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        updateNodeVisibility();
    };
}