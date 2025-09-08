// main.js
// - Creates DOM structure
// - Sets up event listeners
// - Calls state.js on load
// - Calls state.js on user input

// state.js
// - Loads TSV data
// - Loads saved preferences
// - Updates state
// - Calls render.js

// render.js
// - Updates controls to reflect state
// - Updates timeline to reflect state

import { loadData, update, state, checkIsolation } from './state.js';
import { getEmojiArray } from '../js/emoji-config.js';
import { getDateFromX, calculateDateRange } from '../js/date-scale.js';
import { saveFocusDate as persistFocusDate } from '../js/state-persistence.js';

// Wait for DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    clearContainers();
    setupListeners();
    buildLegend();
    await loadData();
}

function buildLegend() {
    const legendContainer = document.getElementById('legend-container');
    if (!legendContainer) return;
    
    // Get emoji configurations - only caseline for v2
    const caselineEmojis = getEmojiArray('caseline');
    
    // Build legend HTML matching original two-row table format
    let html = '<div style="display: flex; gap: 20px; align-items: center;">';
    
    // Legend table (two-row)
    html += '<div>';
    html += '<table style="border-collapse: collapse; color: white; font-size: 12px;">';
    
    // Split emojis into two rows (balanced)
    const splitPoint = Math.ceil(caselineEmojis.length / 2);
    const firstRowEmojis = caselineEmojis.slice(0, splitPoint);
    const secondRowEmojis = caselineEmojis.slice(splitPoint);
    
    // Helper function to create emoji cell with checkbox
    const createEmojiCell = (item) => {
        const checked = item.defaultVisible !== false ? 'checked' : '';
        return `<td class="legend-cell" style="padding: 2px 12px;">
            <label style="cursor: pointer;">
                <input type="checkbox" 
                       class="emoji-toggle" 
                       data-emoji-class="${item.class}" 
                       style="margin-right: 4px; cursor: pointer;" 
                       ${checked}>
                ${item.emoji} ${item.legendLabel}
                <span class="emoji-count" data-emoji="${item.emoji}" style="opacity: 0.7; margin-left: 4px;"></span>
            </label>
        </td>`;
    };
    
    // First row
    html += '<tr>';
    firstRowEmojis.forEach(item => {
        html += createEmojiCell(item);
    });
    html += '</tr>';
    
    // Second row
    html += '<tr>';
    secondRowEmojis.forEach(item => {
        html += createEmojiCell(item);
    });
    html += '</tr>';
    html += '</table>';
    html += '</div>';
    html += '</div>';
    
    legendContainer.innerHTML = html;
}

function clearContainers() {
    const containers = [
        'legend-container',
        'case-checkboxes',
        'stats-container',
        'nodes-container',
        'year-markers-container',
        'connections-container'
    ];
    
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    });
    
    // Show loading state
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
    
    const caselineContainer = document.getElementById('caseline-container');
    if (caselineContainer) caselineContainer.style.display = 'none';
}

function clearTimelineContainers() {
    const containers = [
        'nodes-container', 
        'year-markers-container',
        'connections-container'
    ];
    
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            // Preserve case titles container if it exists
            if (id === 'nodes-container') {
                const titlesContainer = document.getElementById('case-titles-container');
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
                if (titlesContainer) {
                    container.appendChild(titlesContainer);
                }
            } else {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            }
        }
    });
}

/**
 * Save the date at the center of the viewport
 */
async function handleRefresh() {
    const refreshButton = document.getElementById('refresh-timeline');
    if (!refreshButton) return;
    
    // Disable button and show loading indicator
    refreshButton.disabled = true;
    const originalText = refreshButton.textContent;
    refreshButton.textContent = '⟳';  // Spinning icon
    
    try {
        // Save focus date before refresh
        saveFocusDate();
        
        // Re-initialize (reloads data and re-renders)
        await init();
        
        // Show success feedback
        refreshButton.textContent = '✓';
        setTimeout(() => {
            refreshButton.textContent = originalText;
            refreshButton.disabled = false;
        }, 1000);
    } catch (error) {
        console.error('Refresh failed:', error);
        
        // Show error feedback
        refreshButton.textContent = '✗';
        setTimeout(() => {
            refreshButton.textContent = originalText;
            refreshButton.disabled = false;
        }, 2000);
    }
}

function saveFocusDate() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent || !state.filteredEvents || state.filteredEvents.length === 0) {
        return;
    }
    
    // Calculate center position of viewport
    const centerX = mainContent.scrollLeft + (mainContent.clientWidth / 2);
    
    // Get date range and scale from current state
    const dateRange = calculateDateRange(state.filteredEvents);
    const pixelsPerDay = state.scale;
    
    // Calculate what date is at center
    const focusDate = getDateFromX(centerX, dateRange.startDate, pixelsPerDay);
    state.focusDate = focusDate;
    
    // Persist to localStorage
    persistFocusDate(focusDate);
}

function setupListeners() {
    const mainContent = document.querySelector('.main-content');
    
    // Mousewheel horizontal scrolling
    document.addEventListener('wheel', (e) => {
        if (mainContent && mainContent.contains(e.target)) {
            e.preventDefault();
            mainContent.scrollLeft += e.deltaY;
        }
    }, { passive: false });
    
    // Track focus date and save to localStorage when scrolling
    if (mainContent) {
        let scrollTimeout;
        mainContent.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                saveFocusDate();
            }, 100);
        });
    }
    
    // Single event listener on the nav for all controls
    const nav = document.querySelector('.sticky-nav');
    if (nav) {
        // Click handler for buttons
        nav.addEventListener('click', (e) => {
            const target = e.target;
            
            // Apply Date Filter button
            if (target.id === 'apply-date-filter') {
                handleInput('dateFilter');
            }
            // Reset button
            else if (target.id === 'reset-filters') {
                handleInput('reset');
            }
            // Refresh button
            else if (target.id === 'refresh-timeline') {
                handleRefresh();
            }
            // Case filter dropdown toggle
            else if (target.id === 'case-filter-button' || target.closest('#case-filter-button')) {
                e.stopPropagation();
                const dropdown = document.getElementById('case-filter-dropdown');
                if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                }
            }
            // Select All Cases
            else if (target.id === 'select-all-cases') {
                document.querySelectorAll('.case-checkbox').forEach(cb => cb.checked = true);
                const checkboxes = document.querySelectorAll('.case-checkbox:checked');
                const selectedCases = Array.from(checkboxes).map(cb => cb.value);
                handleInput('caseToggle', { selectedCases });
            }
            // Clear All Cases
            else if (target.id === 'clear-all-cases') {
                document.querySelectorAll('.case-checkbox').forEach(cb => cb.checked = false);
                handleInput('caseToggle', { selectedCases: [] });
            }
            // Stop propagation for dropdown content
            else if (target.closest('#case-filter-dropdown')) {
                e.stopPropagation();
            }
        });
        
        // Double-click handler for isolation
        nav.addEventListener('dblclick', (e) => {
            const target = e.target;
            
            // Emoji legend double-click for isolation
            if (target.closest('.legend-cell')) {
                const checkbox = target.closest('.legend-cell').querySelector('.emoji-toggle');
                if (checkbox) {
                    const emojiClass = checkbox.dataset.emojiClass;
                    if (emojiClass) {
                        // Check if already isolating this emoji
                        if (checkIsolation('emoji', emojiClass)) {
                            handleInput('exitIsolation');
                        } else {
                            handleInput('isolate', { type: 'emoji', target: emojiClass });
                        }
                    }
                }
            }
        });
        
        // Change handler for inputs and checkboxes
        nav.addEventListener('change', (e) => {
            const target = e.target;
            
            // Scale slider
            if (target.id === 'scale-slider') {
                handleInput('scale');
            }
            // Fit to window checkbox
            else if (target.id === 'fit-to-window') {
                handleInput('fit');
            }
            // Case checkboxes
            else if (target.classList.contains('case-checkbox')) {
                const checkboxes = document.querySelectorAll('.case-checkbox:checked');
                const selectedCases = Array.from(checkboxes).map(cb => cb.value);
                handleInput('caseToggle', { selectedCases });
            }
            // Emoji toggles
            else if (target.classList.contains('emoji-toggle')) {
                const emojiClass = target.dataset.emojiClass;
                const isVisible = target.checked;
                handleInput('emojiToggle', { emoji: emojiClass, visible: isVisible });
            }
        });
        
        // Input handler for slider
        nav.addEventListener('input', (e) => {
            if (e.target.id === 'scale-slider') {
                handleInput('scale');
            }
        });
    }
    
    // Document click to close dropdown
    document.addEventListener('click', () => {
        const dropdown = document.getElementById('case-filter-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    });
    
    // Double-click handler for case titles (on main content area)
    if (mainContent) {
        mainContent.addEventListener('dblclick', (e) => {
            const target = e.target;
            
            // Case title double-click for isolation
            if (target.classList.contains('case-title') || target.classList.contains('case-dep')) {
                const caseNumber = target.dataset.caseNumber;
                if (caseNumber) {
                    // Check if already isolating this case
                    if (checkIsolation('case', caseNumber)) {
                        handleInput('exitIsolation');
                    } else {
                        handleInput('isolate', { type: 'case', target: caseNumber });
                    }
                }
            }
        });
    }
    
    // Window resize handler for fit-to-window
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only recalculate if fit-to-window is checked
            const fitCheckbox = document.getElementById('fit-to-window');
            if (fitCheckbox && fitCheckbox.checked) {
                handleInput('fit');
            }
        }, 250);
    });
}

function handleInput(type, providedData = null) {
    const data = providedData || {};
    
    if (!providedData) {
        switch(type) {
            case 'dateFilter':
                data.startDate = document.getElementById('filter-start-date').value;
                data.endDate = document.getElementById('filter-end-date').value;
                clearTimelineContainers();
                break;
            case 'scale':
                data.scale = parseFloat(document.getElementById('scale-slider').value);
                clearTimelineContainers();
                break;
            case 'fit':
                data.fitToWindow = document.getElementById('fit-to-window').checked;
                clearTimelineContainers();
                break;
            case 'reset':
                data.reset = true;
                clearTimelineContainers();
                break;
        }
    } else {
        // For provided data, check if we need to clear
        switch(type) {
            case 'caseToggle':
            case 'isolate':
            case 'exitIsolation':
            case 'emojiToggle':
                clearTimelineContainers();
                break;
        }
    }
    
    update(type, data);
}

// Export for dynamic event handlers added by render
export { handleInput };