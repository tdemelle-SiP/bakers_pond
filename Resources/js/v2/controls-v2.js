/**
 * controls-v2.js
 * Handles user controls: date filters, case dropdown, scale slider, fit-to-window
 */

/**
 * Initialize date filter controls
 * @param {Function} onUpdate - Callback when dates change
 */
export function initDateControls(onUpdate) {
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
    
    // Clear dates on reset
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            startInput.value = '2014-01-01';
            endInput.value = '2025-12-31';
            onUpdate({
                startDate: null,
                endDate: null
            });
        });
    }
}

/**
 * Initialize case filter dropdown
 * @param {string[]} caseNumbers - Available case numbers
 * @param {Function} onUpdate - Callback when selection changes
 */
export function initCaseControls(caseNumbers, onUpdate) {
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
    caseNumbers.forEach(caseNum => {
        const label = document.createElement('label');
        label.className = 'case-checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'case-checkbox';
        checkbox.value = caseNum;
        checkbox.checked = true; // Start with all selected
        
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
    
    slider.value = initialScale;
    valueDisplay.textContent = initialScale;
    
    slider.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        valueDisplay.textContent = scale.toFixed(1);
        onUpdate({ scale });
    });
}

/**
 * Initialize fit-to-window button
 * @param {Function} calculateFitScale - Function to calculate scale for fitting
 * @param {Function} onUpdate - Callback to apply the calculated scale
 */
export function initFitToWindow(calculateFitScale, onUpdate) {
    const checkbox = document.getElementById('fit-to-window');
    const slider = document.getElementById('scale-slider');
    const valueDisplay = document.getElementById('scale-value');
    
    if (!checkbox) {
        console.warn('Fit-to-window checkbox not found');
        return;
    }
    
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            const fitScale = calculateFitScale();
            if (fitScale && slider && valueDisplay) {
                slider.value = fitScale;
                valueDisplay.textContent = fitScale.toFixed(1);
                onUpdate({ scale: fitScale, fitToWindow: true });
            }
        } else {
            onUpdate({ fitToWindow: false });
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
        onFilterUpdate = () => {},
        onScaleUpdate = () => {},
        calculateFitScale = () => 1.0,
        initialScale = 0.8
    } = options;
    
    // Date filters
    initDateControls((dateFilter) => {
        onFilterUpdate(dateFilter);
    });
    
    // Case filter
    if (caseNumbers.length > 0) {
        initCaseControls(caseNumbers, (caseFilter) => {
            onFilterUpdate(caseFilter);
        });
    }
    
    // Scale controls
    initScaleControls((scaleUpdate) => {
        onScaleUpdate(scaleUpdate);
    }, initialScale);
    
    // Fit to window
    initFitToWindow(calculateFitScale, (fitUpdate) => {
        onScaleUpdate(fitUpdate);
    });
    
    // Mouse wheel scrolling
    initMouseWheelScroll();
}