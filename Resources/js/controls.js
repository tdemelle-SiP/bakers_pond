/**
 * controls.js
 * Handles user controls: date filters, case dropdown, scale slider, fit-to-window
 */

import { resetToDefaults, resetEmojiVisibility, handleScrollUpdate } from './timeline-actions.js';

/**
 * Initialize date filter controls
 * @param {Function} onUpdate - Callback when dates change
 * @param {Object} eventDateRange - Actual date range from events {min, max}
 */
export function initDateControls(onUpdate, eventDateRange = null) {
    const startInput = document.getElementById('filter-start-date');
    const endInput = document.getElementById('filter-end-date');
    const applyButton = document.getElementById('apply-date-filter');
    
    if (!startInput || !endInput || !applyButton) {
        console.warn('Date filter elements not found');
        return;
    }
    
    // Apply date filter
    applyButton.addEventListener('click', () => {
        const startDate = startInput.value ? new Date(startInput.value) : null;
        const endDate = endInput.value ? new Date(endInput.value) : null;
        
        onUpdate({
            startDate,
            endDate
        });
    });
    
    // Reset button is handled globally - don't add handler here
}

/**
 * Initialize case filter dropdown
 * @param {string[]} caseNumbers - Available case numbers
 * @param {Function} onUpdate - Callback when selection changes
 * @param {string[]} initialSelected - Initially selected cases
 */
export function initCaseControls(caseNumbers, onUpdate, initialSelected = null) {
    const button = document.getElementById('case-filter-button');
    const dropdown = document.getElementById('case-filter-dropdown');
    const checkboxList = document.getElementById('case-checkboxes');
    const selectAllBtn = document.getElementById('select-all-cases');
    const clearAllBtn = document.getElementById('clear-all-cases');
    const filterText = document.getElementById('case-filter-text');
    
    if (!button || !dropdown || !checkboxList) {
        console.warn('Case filter elements not found');
        return;
    }
    
    // Build checkbox list
    checkboxList.innerHTML = '';
    let selectedCases = initialSelected || caseNumbers;
    
    caseNumbers.forEach(caseNum => {
        const label = document.createElement('label');
        label.className = 'case-checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'case-checkbox';
        checkbox.value = caseNum;
        checkbox.checked = selectedCases.includes(caseNum);
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(caseNum));
        checkboxList.appendChild(label);
        
        // Update on change
        checkbox.addEventListener('change', updateCaseFilter);
    });
    
    // Toggle dropdown
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.style.display = 'none';
    });
    
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Select/Clear all buttons
    selectAllBtn.addEventListener('click', () => {
        checkboxList.querySelectorAll('.case-checkbox').forEach(cb => {
            cb.checked = true;
        });
        updateCaseFilter();
    });
    
    clearAllBtn.addEventListener('click', () => {
        checkboxList.querySelectorAll('.case-checkbox').forEach(cb => {
            cb.checked = false;
        });
        updateCaseFilter();
    });
    
    function updateCaseFilter() {
        const selected = Array.from(checkboxList.querySelectorAll('.case-checkbox:checked'))
            .map(cb => cb.value);
        
        // Update button text
        if (selected.length === 0) {
            filterText.textContent = 'No Cases';
        } else if (selected.length === caseNumbers.length) {
            filterText.textContent = 'All Cases';
        } else {
            filterText.textContent = `${selected.length} case(s) selected`;
        }
        
        onUpdate({ selectedCases: selected });
    }
    
    // Initial state
    updateCaseFilter();
}

/**
 * Initialize scale slider
 * @param {Function} onUpdate - Callback when scale changes
 * @param {number} initialScale - Initial scale value
 */
export function initScaleControls(onUpdate, initialScale = 0.8) {
    const slider = document.getElementById('scale-slider');
    const valueDisplay = document.getElementById('scale-value');
    
    if (!slider || !valueDisplay) {
        console.warn('Scale slider elements not found');
        return;
    }
    
    // Ensure initialScale is a number
    const scaleValue = typeof initialScale === 'number' ? initialScale : parseFloat(initialScale) || 0.8;
    
    slider.value = scaleValue;
    valueDisplay.textContent = scaleValue.toFixed(1);
    
    slider.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        valueDisplay.textContent = scale.toFixed(1);
        
        // Uncheck fit-to-window when manually adjusting scale
        const fitCheckbox = document.getElementById('fit-to-window');
        if (fitCheckbox && fitCheckbox.checked) {
            fitCheckbox.checked = false;
        }
        
        onUpdate({ scale, fitToWindow: false });
    });
}

/**
 * Initialize fit-to-window button
 * @param {Function} calculateFitScale - Function to calculate scale for fitting
 * @param {Function} onUpdate - Callback to apply the calculated scale
 */
export function initFitToWindow(calculateFitScale, onUpdate, initialValue = false) {
    const checkbox = document.getElementById('fit-to-window');
    const slider = document.getElementById('scale-slider');
    const valueDisplay = document.getElementById('scale-value');
    
    if (!checkbox) {
        console.warn('Fit-to-window checkbox not found');
        return;
    }
    
    // Set initial value
    checkbox.checked = initialValue;
    
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            const fitScale = calculateFitScale();
            if (fitScale && slider && valueDisplay) {
                slider.value = fitScale;
                valueDisplay.textContent = fitScale.toFixed(1);
                onUpdate({ scale: fitScale, fitToWindow: true });
            }
        } else {
            // Reset to default scale when fit-to-window is turned off
            const defaultScale = 0.8;
            slider.value = defaultScale;
            valueDisplay.textContent = defaultScale.toFixed(1);
            onUpdate({ scale: defaultScale, fitToWindow: false });
        }
    });
}

/**
 * Initialize mouse wheel scrolling
 */
export function initMouseWheelScroll() {
    document.addEventListener('wheel', (e) => {
        const mainContent = document.querySelector('.main-content');
        if (mainContent && mainContent.contains(e.target)) {
            e.preventDefault();
            mainContent.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}

/**
 * Initialize all controls
 * @param {Object} options - Configuration options
 */
export function initAllControls(options = {}) {
    const {
        caseNumbers = [],
        eventDateRange = null,
        onFilterUpdate = () => {},
        onScaleUpdate = () => {},
        calculateFitScale = () => 1.0,
        initialScale = 0.8,
        initialFitToWindow = false,
        initialFilters = {}
    } = options;
    
    // Date filters - just attach handlers, let updateUIFromState handle values
    
    initDateControls((dateFilter) => {
        onFilterUpdate(dateFilter);
    });
    
    // Case filter
    if (caseNumbers.length > 0) {
        initCaseControls(caseNumbers, (caseFilter) => {
            onFilterUpdate(caseFilter);
        }, initialFilters.selectedCases);
        
    }
    
    // Scale controls
    initScaleControls((scaleUpdate) => {
        onScaleUpdate(scaleUpdate);
    }, initialScale);
    
    // Fit to window
    initFitToWindow(calculateFitScale, (fitUpdate) => {
        onScaleUpdate(fitUpdate);
    }, initialFitToWindow);
    
    // Mouse wheel scrolling
    initMouseWheelScroll();
    
    // Track scroll position for persistence
    const timelineContainer = document.getElementById('timeline-container');
    if (timelineContainer) {
        let scrollTimeout;
        timelineContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                handleScrollUpdate(timelineContainer.scrollLeft);
            }, 100);
        });
    }
    
    // Reset button
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetToDefaults();
            resetEmojiVisibility();
        });
    }
}