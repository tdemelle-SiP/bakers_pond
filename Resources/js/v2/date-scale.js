/**
 * date-scale.js
 * Handles all date-to-pixel conversions and timeline scaling
 * 
 * REFERENCES:
 * - Original: lines 693-771 for date range and positioning
 * - 60-day padding before/after events
 * - TIMELINE_LEFT_OFFSET = 200px
 * - Default pixelsPerDay = 0.8
 */

// Constants from original
export const TIMELINE_LEFT_OFFSET = 200;
export const TIMELINE_RIGHT_PADDING = 300;
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
 * Calculate timeline width
 * @param {number} totalDays - Total days in range
 * @param {number} pixelsPerDay - Scale factor
 * @returns {number} Timeline width in pixels
 */
export function calculateTimelineWidth(totalDays, pixelsPerDay) {
    return Math.max(totalDays * pixelsPerDay + TIMELINE_RIGHT_PADDING, 1200);
}

/**
 * Draw year markers and labels
 * @param {HTMLElement} container - Year markers container
 * @param {Object} dateRange - From calculateDateRange
 * @param {number} pixelsPerDay - Scale factor
 */
export function drawYearMarkers(container, dateRange, pixelsPerDay) {
    const { startDate, endDate, minDate, maxDate, totalDays } = dateRange;
    const timelineWidth = calculateTimelineWidth(totalDays, pixelsPerDay);
    
    const firstEventYear = minDate.getFullYear();
    const lastEventYear = maxDate.getFullYear();
    
    for (let year = startDate.getFullYear(); year <= lastEventYear; year++) {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        
        const yearStartDays = Math.max(0, (yearStart - startDate) / (1000 * 60 * 60 * 24));
        const yearEndDays = Math.min(totalDays, (yearEnd - startDate) / (1000 * 60 * 60 * 24));
        
        const yearStartX = TIMELINE_LEFT_OFFSET + (yearStartDays * pixelsPerDay);
        const yearEndX = TIMELINE_LEFT_OFFSET + (yearEndDays * pixelsPerDay);
        
        // Only process years that are at least partially visible
        if (yearEndX > TIMELINE_LEFT_OFFSET && yearStartX < timelineWidth + TIMELINE_LEFT_OFFSET) {
            // Add marker at year boundary
            if (yearStartX >= TIMELINE_LEFT_OFFSET && yearStartX <= timelineWidth + TIMELINE_LEFT_OFFSET) {
                // Add vertical line
                const vertLine = document.createElement('div');
                vertLine.style.position = 'absolute';
                vertLine.style.left = yearStartX + 'px';
                vertLine.style.top = '0px';
                vertLine.style.width = '1px';
                vertLine.style.height = '100%';
                vertLine.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                vertLine.style.zIndex = '0';
                container.appendChild(vertLine);
            }
            
            // Add year label if within event range
            if (year >= firstEventYear && year <= lastEventYear) {
                const visibleStartX = Math.max(TIMELINE_LEFT_OFFSET, yearStartX);
                const visibleEndX = Math.min(timelineWidth + TIMELINE_LEFT_OFFSET, yearEndX);
                const labelX = (visibleStartX + visibleEndX) / 2;
                
                const label = document.createElement('div');
                label.className = 'year-label';
                label.style.left = labelX + 'px';
                label.style.top = '225px'; // Position at the timeline line
                label.textContent = year;
                container.appendChild(label);
            }
        }
    }
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