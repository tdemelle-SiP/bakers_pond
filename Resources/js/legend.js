/**
 * legend.js
 * Renders the emoji legend in the header
 */

import { getEmojiArray } from './emoji-config.js';
import { 
    applyEmojiVisibility, 
    resetEmojiVisibility,
    toggleEmojiVisibility,
    isIsolating,
    getIsolationMode,
    clearIsolationMode,
    setIsolationMode,
    saveEmojiVisibility,
    loadEmojiVisibility
} from './timeline-actions.js';

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
        const checked = item.defaultVisible !== false ? 'checked' : '';
        return `<td style="padding: 2px 12px;">
            <label style="cursor: pointer;">
                <input type="checkbox" 
                       class="emoji-toggle" 
                       data-emoji-class="${item.class}" 
                       style="margin-right: 4px; cursor: pointer;" 
                       ${checked}>
                ${item.emoji} ${item.legendLabel}
            </label>
        </td>`;
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
            html += `<td style="padding: 2px 12px;">${item.emoji} ${item.legendLabel}</td>`;
        } else {
            // Public/Private use colored squares
            const borderColor = item.borderColor || item.color;
            html += `<td style="padding: 2px 12px;"><span style="display: inline-block; width: 10px; height: 10px; background: ${item.color}; border: 1px solid ${borderColor}; margin-right: 5px;"></span>${item.legendLabel}</td>`;
        }
    });
    html += '</tr>';
    html += '</table>';
    html += '</div>';
    
    html += '</div>';
    
    legendContainer.innerHTML = html;
    
    // Double-click handler for emoji isolation on table cells
    const emojiCells = legendContainer.querySelectorAll('td');
    emojiCells.forEach(cell => {
        const checkbox = cell.querySelector('.emoji-toggle');
        if (!checkbox) return;
        
        cell.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const emojiClass = checkbox.dataset.emojiClass;
            
            if (isIsolating('emoji', emojiClass)) {
                // Restore previous state
                const isolation = getIsolationMode();
                clearIsolationMode();
                
                // Restore all checkboxes to previous state
                Object.entries(isolation.previousState).forEach(([cls, isChecked]) => {
                    const cb = legendContainer.querySelector(`[data-emoji-class="${cls}"]`);
                    if (cb) cb.checked = isChecked;
                });
            } else {
                // Isolate this emoji type
                
                // Save current state
                const currentState = {};
                const allCheckboxes = legendContainer.querySelectorAll('.emoji-toggle');
                allCheckboxes.forEach(cb => {
                    currentState[cb.dataset.emojiClass] = cb.checked;
                });
                
                setIsolationMode('emoji', emojiClass, currentState);
                
                // Uncheck all except the isolated one
                allCheckboxes.forEach(cb => {
                    cb.checked = cb.dataset.emojiClass === emojiClass;
                });
            }
            
            // Apply the changes
            updateNodeVisibility();
        });
    });
    
    // Set up checkbox handlers
    const toggleCheckboxes = document.querySelectorAll('.emoji-toggle');
    
    // Function to update node visibility based on checkbox states
    function updateNodeVisibility() {
        const visibility = {};
        toggleCheckboxes.forEach(checkbox => {
            visibility[checkbox.dataset.emojiClass] = checkbox.checked;
        });
        
        // Save state
        saveEmojiVisibility(visibility);
        
        // Apply visibility using the shared function
        applyEmojiVisibility();
    }
    
    // Load and apply saved visibility state
    const savedVisibility = loadEmojiVisibility();
    
    Object.entries(savedVisibility).forEach(([emojiClass, isVisible]) => {
        const checkbox = legendContainer.querySelector(`[data-emoji-class="${emojiClass}"]`);
        if (checkbox) {
            checkbox.checked = isVisible !== false;
        }
    });
    
    // Check for emoji isolation mode
    const isolationMode = getIsolationMode();
    if (isolationMode.type === 'emoji') {
        // We're in isolation mode - update checkboxes to match
        toggleCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.dataset.emojiClass === isolationMode.target;
        });
    }
    
    // Apply initial visibility
    updateNodeVisibility();
    
    // Add change handlers
    toggleCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Clear isolation mode when manually changing checkboxes
            const isolation = getIsolationMode();
            if (isolation.type === 'emoji') {
                clearIsolationMode();
                
                // If unchecking the isolated emoji, restore others
                if (!checkbox.checked && checkbox.dataset.emojiClass === isolation.target) {
                    Object.entries(isolation.previousState).forEach(([cls, isChecked]) => {
                        if (cls !== checkbox.dataset.emojiClass) {
                            const cb = legendContainer.querySelector(`[data-emoji-class="${cls}"]`);
                            if (cb) cb.checked = isChecked;
                        }
                    });
                }
            }
            
            updateNodeVisibility();
        });
    });
}

