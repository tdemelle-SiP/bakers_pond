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

// Wait for DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    setupListeners();
    await loadData();
}

function setupListeners() {
    // Date filter
    const applyDateBtn = document.getElementById('apply-date-filter');
    if (applyDateBtn) {
        applyDateBtn.addEventListener('click', () => handleInput('dateFilter'));
    }
    
    // Reset button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => handleInput('reset'));
    }
    
    // Scale slider
    const scaleSlider = document.getElementById('scale-slider');
    if (scaleSlider) {
        scaleSlider.addEventListener('input', () => handleInput('scale'));
    }
    
    // Fit to window
    const fitCheckbox = document.getElementById('fit-to-window');
    if (fitCheckbox) {
        fitCheckbox.addEventListener('change', () => handleInput('fit'));
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-timeline');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => handleInput('refresh'));
    }
    
    // Case dropdown toggle
    const caseBtn = document.getElementById('case-filter-button');
    const caseDropdown = document.getElementById('case-filter-dropdown');
    if (caseBtn && caseDropdown) {
        caseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            caseDropdown.style.display = caseDropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', () => {
            caseDropdown.style.display = 'none';
        });
        
        caseDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

function handleInput(type) {
    const data = {};
    
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
        case 'refresh':
            data.refresh = true;
            break;
    }
    
    update(type, data);
}

// Export for dynamic event handlers added by render
export { handleInput };