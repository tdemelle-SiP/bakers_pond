/**
 * state-persistence.js
 * Handles saving and loading UI state to/from localStorage
 */

const STORAGE_PREFIX = 'timeline-v2-';

const STORAGE_KEYS = {
    START_DATE: STORAGE_PREFIX + 'start-date',
    END_DATE: STORAGE_PREFIX + 'end-date',
    SELECTED_CASES: STORAGE_PREFIX + 'selected-cases',
    SCALE: STORAGE_PREFIX + 'scale',
    FIT_TO_WINDOW: STORAGE_PREFIX + 'fit-to-window',
    SHOW_CONTINUANCES: STORAGE_PREFIX + 'show-continuances',
    EMOJI_VISIBILITY: STORAGE_PREFIX + 'emoji-visibility'
};

/**
 * Save a value to localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to save
 */
function saveState(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
}

/**
 * Load a value from localStorage
 * @param {string} key - Storage key
 * @returns {*} Loaded value or null
 */
function loadState(key) {
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    // Parse JSON values
    if (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false') {
        return JSON.parse(value);
    }
    return value;
}

/**
 * Save filter state
 * @param {Object} filters - Filter state object
 */
export function saveFilterState(filters) {
    if (filters.startDate) {
        saveState(STORAGE_KEYS.START_DATE, filters.startDate);
    }
    if (filters.endDate) {
        saveState(STORAGE_KEYS.END_DATE, filters.endDate);
    }
    if (filters.selectedCases) {
        saveState(STORAGE_KEYS.SELECTED_CASES, filters.selectedCases);
    }
    if (filters.showContinuances !== undefined) {
        saveState(STORAGE_KEYS.SHOW_CONTINUANCES, filters.showContinuances);
    }
}

/**
 * Load filter state
 * @returns {Object} Saved filter state
 */
export function loadFilterState() {
    return {
        startDate: loadState(STORAGE_KEYS.START_DATE),
        endDate: loadState(STORAGE_KEYS.END_DATE),
        selectedCases: loadState(STORAGE_KEYS.SELECTED_CASES), // Return null if not saved
        showContinuances: loadState(STORAGE_KEYS.SHOW_CONTINUANCES) ?? true
    };
}

/**
 * Save scale state
 * @param {number} scale - Scale value
 * @param {boolean} fitToWindow - Fit to window enabled
 */
export function saveScaleState(scale, fitToWindow) {
    saveState(STORAGE_KEYS.SCALE, scale);
    saveState(STORAGE_KEYS.FIT_TO_WINDOW, fitToWindow);
}

/**
 * Load scale state
 * @returns {Object} Saved scale state
 */
export function loadScaleState() {
    return {
        scale: loadState(STORAGE_KEYS.SCALE) || 0.8,
        fitToWindow: loadState(STORAGE_KEYS.FIT_TO_WINDOW) || false
    };
}

/**
 * Clear all saved state
 */
export function clearAllState() {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

/**
 * Save emoji visibility state
 * @param {Object} emojiVisibility - Object with emoji classes as keys and boolean visibility as values
 */
export function saveEmojiVisibility(emojiVisibility) {
    saveState(STORAGE_KEYS.EMOJI_VISIBILITY, emojiVisibility);
}

/**
 * Load emoji visibility state
 * @returns {Object} Saved emoji visibility state or empty object
 */
export function loadEmojiVisibility() {
    return loadState(STORAGE_KEYS.EMOJI_VISIBILITY) || {};
}

/**
 * Initialize state from localStorage on page load
 * @returns {Object} Complete saved state
 */
export function initializeState() {
    const filters = loadFilterState();
    const scale = loadScaleState();
    const emojiVisibility = loadEmojiVisibility();
    
    return {
        filters,
        ...scale,
        emojiVisibility
    };
}