/**
 * date-scale.js
 * Handles all date-to-pixel conversions and timeline scaling
 * 
 * REFERENCES:
 * - Original: lines 693-771 for date range and positioning
 * - 60-day padding before/after events
 * - TIMELINE_LEFT_OFFSET = 155px
 * - Default pixelsPerDay = 0.8
 */

// Constants from original
export const TIMELINE_LEFT_OFFSET = 0; // Nodes positioned relative to container which is already at 50px
export const TIMELINE_RIGHT_PADDING = 50;
export const DEFAULT_SCALE = 0.8;

/**
 * Calculate date range with padding
 * @param {Object[]} events - Array of events with date properties
 * @returns {Object} {startDate, endDate, totalDays, minDate, maxDate}
 */
export function calculateDateRange(events) {
    const dates = events.map(e => e.date);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Add 60-day padding
    const startDate = new Date(minDate.getTime() - (60 * 24 * 60 * 60 * 1000));
    const endDate = new Date(maxDate.getTime() + (60 * 24 * 60 * 60 * 1000));
    
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    
    return { startDate, endDate, totalDays, minDate, maxDate };
}

/**
 * Convert date to X coordinate
 * @param {Date} date - Date to position
 * @param {Date} startDate - Timeline start date
 * @param {number} pixelsPerDay - Scale factor
 * @returns {number} X coordinate
 */
export function getXPosition(date, startDate, pixelsPerDay) {
    const daysFromStart = (date - startDate) / (1000 * 60 * 60 * 24);
    return TIMELINE_LEFT_OFFSET + (daysFromStart * pixelsPerDay);
}

/**
 * Get date from X position
 * @param {number} x - X coordinate 
 * @param {Date} startDate - Start date of timeline
 * @param {number} pixelsPerDay - Scale factor
 * @returns {Date} Date at that position
 */
export function getDateFromX(x, startDate, pixelsPerDay) {
    const daysFromStart = (x - TIMELINE_LEFT_OFFSET) / pixelsPerDay;
    return new Date(startDate.getTime() + (daysFromStart * 1000 * 60 * 60 * 24));
}

/**
 * Calculate timeline width
 * @param {number} totalDays - Total days in range
 * @param {number} pixelsPerDay - Scale factor
 * @returns {number} Timeline width in pixels
 */
export function calculateTimelineWidth(totalDays, pixelsPerDay) {
    // Calculate content width
    const contentWidth = totalDays * pixelsPerDay + TIMELINE_RIGHT_PADDING;
    // Ensure it's at least as wide as the viewport
    const viewportWidth = window.innerWidth - 40; // Account for container padding
    return Math.max(contentWidth, viewportWidth, 1200);
}

/**
 * Calculate year marker positions (v2 - returns data only, no DOM manipulation)
 * @param {Object} dateRange - From calculateDateRange
 * @param {number} pixelsPerDay - Scale factor
 * @returns {Array} Array of year marker data objects
 */
export function calculateYearMarkers(dateRange, pixelsPerDay) {
    const { startDate, endDate, minDate, maxDate, totalDays } = dateRange;
    const timelineWidth = calculateTimelineWidth(totalDays, pixelsPerDay);
    const markers = [];
    
    const firstEventYear = minDate.getFullYear();
    const lastEventYear = maxDate.getFullYear();
    
    // Determine if we should show decade markers instead of yearly markers
    const useDecadeMarkers = pixelsPerDay < 0.2;
    
    for (let year = startDate.getFullYear(); year <= lastEventYear; year++) {
        const yearStart = new Date(year, 0, 1);
        const yearStartDays = Math.max(0, (yearStart - startDate) / (1000 * 60 * 60 * 24));
        const yearStartX = TIMELINE_LEFT_OFFSET + (yearStartDays * pixelsPerDay);
        
        // Only process years that are at least partially visible
        if (yearStartX >= TIMELINE_LEFT_OFFSET && yearStartX <= timelineWidth + TIMELINE_LEFT_OFFSET) {
            const isDecadeYear = year % 10 === 0;
            
            if (useDecadeMarkers && !isDecadeYear) {
                // In decade mode, only show small ticks for non-decade years
                markers.push({
                    type: 'tick',
                    x: yearStartX,
                    year: year,
                    label: null
                });
            } else {
                // Show full line and label for all years in normal mode, or decades in decade mode
                markers.push({
                    type: 'line',
                    x: yearStartX,
                    year: year,
                    label: year.toString()
                });
            }
        }
    }
    
    return markers;
}


/**
 * Set container dimensions
 * @param {HTMLElement} container - Timeline container
 * @param {number} width - Width in pixels
 */
export function setContainerWidth(container, width) {
    container.style.width = width + 'px';
    if (container.parentElement) {
        container.parentElement.style.width = (width + 80) + 'px';
    }
}