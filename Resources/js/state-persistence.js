/**
 * state-persistence.js
 * Handles saving and loading UI state to/from localStorage
 */

const STORAGE_PREFIX = 'timeline-';

const STORAGE_KEYS = {
    START_DATE: STORAGE_PREFIX + 'start-date',
    END_DATE: STORAGE_PREFIX + 'end-date',
    SELECTED_CASES: STORAGE_PREFIX + 'selected-cases',
    SCALE: STORAGE_PREFIX + 'scale',
    FIT_TO_WINDOW: STORAGE_PREFIX + 'fit-to-window',
    EMOJI_VISIBILITY: STORAGE_PREFIX + 'emoji-visibility',
    FOCUS_DATE: STORAGE_PREFIX + 'focus-date'
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
}

/**
 * Load filter state
 * @returns {Object} Saved filter state
 */
export function loadFilterState() {
    return {
        startDate: loadState(STORAGE_KEYS.START_DATE),
        endDate: loadState(STORAGE_KEYS.END_DATE),
        selectedCases: loadState(STORAGE_KEYS.SELECTED_CASES)
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
    const savedScale = loadState(STORAGE_KEYS.SCALE);
    return {
        scale: savedScale ? parseFloat(savedScale) : 0.8,
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
 * Isolation mode management - temporary UI state
 */
let isolationMode = {
    type: null,      // 'case' | 'emoji' | null
    target: null,    // case number or emoji class
    previousState: null // snapshot before isolation
};

/**
 * Set isolation mode
 * @param {string} type - 'case' or 'emoji'
 * @param {string} target - The case number or emoji class to isolate
 * @param {Object} previousState - State snapshot before isolation
 */
export function setIsolationMode(type, target, previousState) {
    isolationMode = { type, target, previousState };
}

/**
 * Get current isolation mode
 * @returns {Object} Current isolation state
 */
export function getIsolationMode() {
    return isolationMode;
}

/**
 * Clear isolation mode
 */
export function clearIsolationMode() {
    isolationMode = { type: null, target: null, previousState: null };
}

/**
 * Check if currently isolating a specific target
 * @param {string} type - 'case' or 'emoji'
 * @param {string} target - The case number or emoji class
 * @returns {boolean} Whether this target is currently isolated
 */
export function isIsolating(type, target) {
    return isolationMode.type === type && isolationMode.target === target;
}

/**
 * Save focus date
 * @param {Date} focusDate - Date at center of viewport
 */
export function saveFocusDate(focusDate) {
    saveState(STORAGE_KEYS.FOCUS_DATE, focusDate.toISOString());
}

/**
 * Load focus date
 * @returns {Date|null} Saved focus date or null
 */
export function loadFocusDate() {
    const saved = loadState(STORAGE_KEYS.FOCUS_DATE);
    return saved ? new Date(saved) : null;
}

/**
 * Initialize state from localStorage on page load
 * @returns {Object} Complete saved state
 */
export function initializeState() {
    const filters = loadFilterState();
    const scale = loadScaleState();
    const emojiVisibility = loadEmojiVisibility();
    const focusDate = loadFocusDate();
    
    return {
        filters,
        ...scale,
        emojiVisibility,
        focusDate
    };
}