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

import { loadData, update } from './state.js';
import { getEmojiArray } from '../js/emoji-config.js';

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
    
    // Caseline legend (two-row table)
    html += '<div>';
    html += '<table style="border-collapse: collapse; color: white; font-size: 12px;">';
    
    // Split caseline emojis into two rows (balanced)
    const splitPoint = Math.ceil(caselineEmojis.length / 2);
    const firstRowEmojis = caselineEmojis.slice(0, splitPoint);
    const secondRowEmojis = caselineEmojis.slice(splitPoint);
    
    // Helper function to create emoji cell with checkbox
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
    html += '</div>';
    
    legendContainer.innerHTML = html;
}

function clearContainers() {
    const containers = [
        'legend-container',
        'case-checkboxes',
        'stats-container',
        'caseline-container',
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
    
    const content = document.getElementById('timeline-content');
    if (content) content.style.display = 'none';
}

function setupListeners() {
    // Helper to remove old listeners by cloning element
    function replaceElement(id) {
        const el = document.getElementById(id);
        if (el) {
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
            return newEl;
        }
        return null;
    }
    
    // Date filter
    const applyDateBtn = replaceElement('apply-date-filter');
    if (applyDateBtn) {
        applyDateBtn.addEventListener('click', () => handleInput('dateFilter'));
    }
    
    // Reset button
    const resetBtn = replaceElement('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => handleInput('reset'));
    }
    
    // Scale slider
    const scaleSlider = replaceElement('scale-slider');
    if (scaleSlider) {
        scaleSlider.addEventListener('input', () => handleInput('scale'));
    }
    
    // Fit to window
    const fitCheckbox = replaceElement('fit-to-window');
    if (fitCheckbox) {
        fitCheckbox.addEventListener('change', () => handleInput('fit'));
    }
    
    // Refresh button
    const refreshBtn = replaceElement('refresh-timeline');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => init());
    }
    
    // Case dropdown toggle
    const caseBtn = replaceElement('case-filter-button');
    const caseDropdown = replaceElement('case-filter-dropdown');
    if (caseBtn && caseDropdown) {
        caseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            caseDropdown.style.display = caseDropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        // Remove old document listener by using a named function stored on the element
        if (window.caseDropdownClickHandler) {
            document.removeEventListener('click', window.caseDropdownClickHandler);
        }
        window.caseDropdownClickHandler = () => {
            caseDropdown.style.display = 'none';
        };
        document.addEventListener('click', window.caseDropdownClickHandler);
        
        caseDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Case checkbox event delegation
    const caseCheckboxContainer = replaceElement('case-checkboxes');
    if (caseCheckboxContainer) {
        caseCheckboxContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('case-checkbox')) {
                const checkboxes = document.querySelectorAll('.case-checkbox:checked');
                const selectedCases = Array.from(checkboxes).map(cb => cb.value);
                handleInput('caseToggle', { selectedCases });
            }
        });
    }
    
    // Select/Clear all buttons
    const selectAllBtn = replaceElement('select-all-cases');
    const clearAllBtn = replaceElement('clear-all-cases');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.case-checkbox').forEach(cb => cb.checked = true);
            const checkboxes = document.querySelectorAll('.case-checkbox:checked');
            const selectedCases = Array.from(checkboxes).map(cb => cb.value);
            handleInput('caseToggle', { selectedCases });
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.case-checkbox').forEach(cb => cb.checked = false);
            handleInput('caseToggle', { selectedCases: [] });
        });
    }
    
    // Emoji checkbox event listeners
    const legendContainer = replaceElement('legend-container');
    if (legendContainer) {
        legendContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('emoji-toggle')) {
                const emojiClass = e.target.dataset.emojiClass;
                const isVisible = e.target.checked;
                handleInput('emojiToggle', { emoji: emojiClass, visible: isVisible });
            }
        });
    }
}

function handleInput(type, providedData = null) {
    const data = providedData || {};
    
    if (!providedData) {
        switch(type) {
            case 'dateFilter':
                data.startDate = document.getElementById('filter-start-date').value;
                data.endDate = document.getElementById('filter-end-date').value;
                break;
            case 'scale':
                data.scale = parseFloat(document.getElementById('scale-slider').value);
                break;
            case 'fit':
                data.fitToWindow = document.getElementById('fit-to-window').checked;
                break;
            case 'reset':
                data.reset = true;
                break;
        }
    }
    
    update(type, data);
}

// Export for dynamic event handlers added by render
export { handleInput };