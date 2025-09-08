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
 * Draw year markers and labels (v1 - legacy, direct DOM manipulation)
 * @param {HTMLElement} container - Year markers container
 * @param {Object} dateRange - From calculateDateRange
 * @param {number} pixelsPerDay - Scale factor
 */
export function drawYearMarkers(container, dateRange, pixelsPerDay) {
    const { startDate, endDate, minDate, maxDate, totalDays } = dateRange;
    const timelineWidth = calculateTimelineWidth(totalDays, pixelsPerDay);
    
    // Get both sections to position markers on their center lines
    const timelineSection = document.getElementById('timeline-section');
    const caselineSection = document.getElementById('caseline-section');
    if (!timelineSection) return;
    
    const timelineSectionTop = timelineSection.offsetTop;
    const timelineSectionHeight = timelineSection.offsetHeight;
    const timelineCenterY = timelineSectionTop + (timelineSectionHeight * 0.5); // Timeline center line position
    
    const caselineSectionTop = caselineSection ? caselineSection.offsetTop : 0;
    const caselineSectionHeight = caselineSection ? caselineSection.offsetHeight : 0;
    const caselineCenterY = caselineSectionTop + (caselineSectionHeight * 0.5) + 45; // Caseline center with adjusted offset
    
    const firstEventYear = minDate.getFullYear();
    const lastEventYear = maxDate.getFullYear();
    
    // Determine if we should show decade markers instead of yearly markers
    const useDecadeMarkers = pixelsPerDay < 0.2;
    
    for (let year = startDate.getFullYear(); year <= lastEventYear; year++) {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        
        const yearStartDays = Math.max(0, (yearStart - startDate) / (1000 * 60 * 60 * 24));
        const yearEndDays = Math.min(totalDays, (yearEnd - startDate) / (1000 * 60 * 60 * 24));
        
        const yearStartX = TIMELINE_LEFT_OFFSET + (yearStartDays * pixelsPerDay);
        const yearEndX = TIMELINE_LEFT_OFFSET + (yearEndDays * pixelsPerDay);
        
        // Only process years that are at least partially visible
        if (yearEndX > TIMELINE_LEFT_OFFSET && yearStartX < timelineWidth + TIMELINE_LEFT_OFFSET) {
            // Add vertical line at year boundary
            if (yearStartX >= TIMELINE_LEFT_OFFSET && yearStartX <= timelineWidth + TIMELINE_LEFT_OFFSET) {
                const isDecadeYear = year % 10 === 0;
                
                if (useDecadeMarkers) {
                    // In decade mode: show full lines for decades, small ticks for other years
                    if (isDecadeYear) {
                        // Add full vertical line for decade
                        const vertLine = document.createElement('div');
                        vertLine.style.position = 'absolute';
                        vertLine.style.left = yearStartX + 'px';
                        vertLine.style.top = '0px';
                        vertLine.style.width = '1px';
                        vertLine.style.height = '100%';
                        vertLine.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                        vertLine.style.zIndex = '2';
                        container.appendChild(vertLine);
                    } else {
                        // Add small tick marks for interim years on center lines only
                        // Timeline tick
                        const timelineInterimTick = document.createElement('div');
                        timelineInterimTick.className = 'year-tick-small';
                        timelineInterimTick.style.position = 'absolute';
                        timelineInterimTick.style.left = yearStartX + 'px';
                        timelineInterimTick.style.top = (timelineCenterY - 3) + 'px';
                        timelineInterimTick.style.width = '1px';
                        timelineInterimTick.style.height = '6px';
                        timelineInterimTick.style.backgroundColor = 'rgba(52, 73, 94, 0.3)';
                        timelineInterimTick.style.zIndex = '2';
                        container.appendChild(timelineInterimTick);
                        
                        // Caseline tick
                        if (caselineSection) {
                            const caselineInterimTick = document.createElement('div');
                            caselineInterimTick.className = 'year-tick-small';
                            caselineInterimTick.style.position = 'absolute';
                            caselineInterimTick.style.left = yearStartX + 'px';
                            caselineInterimTick.style.top = (caselineCenterY - 3) + 'px';
                            caselineInterimTick.style.width = '1px';
                            caselineInterimTick.style.height = '6px';
                            caselineInterimTick.style.backgroundColor = 'rgba(52, 73, 94, 0.3)';
                            caselineInterimTick.style.zIndex = '2';
                            container.appendChild(caselineInterimTick);
                        }
                        continue; // Skip the rest for interim years
                    }
                } else {
                    // Normal mode: show all year lines
                    const vertLine = document.createElement('div');
                    vertLine.style.position = 'absolute';
                    vertLine.style.left = yearStartX + 'px';
                    vertLine.style.top = '0px';
                    vertLine.style.width = '1px';
                    vertLine.style.height = '100%';
                    vertLine.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                    vertLine.style.zIndex = '2';
                    container.appendChild(vertLine);
                }
                
                // Add tick mark on timeline center line
                const timelineTickMark = document.createElement('div');
                timelineTickMark.className = 'year-tick';
                timelineTickMark.style.position = 'absolute';
                timelineTickMark.style.left = yearStartX + 'px';
                timelineTickMark.style.top = (timelineCenterY - 5) + 'px'; // 5px above and below center
                timelineTickMark.style.width = '1px';
                timelineTickMark.style.height = '10px';
                timelineTickMark.style.backgroundColor = 'rgba(52, 73, 94, 0.7)'; // 70% opacity
                timelineTickMark.style.zIndex = '2'; // Year ticks at bottom
                container.appendChild(timelineTickMark);
                
                // Add tick mark on caseline center line
                if (caselineSection) {
                    const caselineTickMark = document.createElement('div');
                    caselineTickMark.className = 'year-tick';
                    caselineTickMark.style.position = 'absolute';
                    caselineTickMark.style.left = yearStartX + 'px';
                    caselineTickMark.style.top = (caselineCenterY - 5) + 'px'; // 5px above and below center
                    caselineTickMark.style.width = '1px';
                    caselineTickMark.style.height = '10px';
                    caselineTickMark.style.backgroundColor = 'rgba(52, 73, 94, 0.7)'; // 70% opacity
                    caselineTickMark.style.zIndex = '2'; // Year ticks at bottom
                    container.appendChild(caselineTickMark);
                }
            }
            
            // Add year labels if within event range
            if (year >= firstEventYear && year <= lastEventYear) {
                // In decade mode, only show labels for decade years, positioned on the line
                if (useDecadeMarkers && year % 10 !== 0) {
                    continue; // Skip labels for non-decade years in decade mode
                }
                
                const visibleStartX = Math.max(TIMELINE_LEFT_OFFSET, yearStartX);
                const visibleEndX = Math.min(timelineWidth + TIMELINE_LEFT_OFFSET, yearEndX);
                // Center labels on the decade line when in decade mode, otherwise center in year span
                const labelX = useDecadeMarkers ? yearStartX : (visibleStartX + visibleEndX) / 2;
                
                // Timeline year label
                const timelineLabel = document.createElement('div');
                timelineLabel.className = 'year-label';
                timelineLabel.style.position = 'absolute';
                timelineLabel.style.left = labelX + 'px';
                timelineLabel.style.top = timelineCenterY + 'px';
                timelineLabel.style.transform = 'translateX(-50%) translateY(-50%)';
                timelineLabel.style.fontSize = '12px';
                timelineLabel.style.fontWeight = 'bold';
                timelineLabel.style.color = '#34495e';
                timelineLabel.style.background = 'rgba(255,255,255,0.9)';
                timelineLabel.style.padding = '0 6px';
                timelineLabel.style.zIndex = '3'; // Year labels just above lines
                timelineLabel.textContent = year;
                container.appendChild(timelineLabel);
                
                // Caseline year label
                if (caselineSection) {
                    const caselineLabel = document.createElement('div');
                    caselineLabel.className = 'year-label';
                    caselineLabel.style.position = 'absolute';
                    caselineLabel.style.left = labelX + 'px';
                    caselineLabel.style.top = caselineCenterY + 'px';
                    caselineLabel.style.transform = 'translateX(-50%) translateY(-50%)';
                    caselineLabel.style.fontSize = '12px';
                    caselineLabel.style.fontWeight = 'bold';
                    caselineLabel.style.color = '#34495e';
                    caselineLabel.style.background = 'rgba(255,255,255,0.9)';
                    caselineLabel.style.padding = '0 6px';
                    caselineLabel.style.zIndex = '3'; // Year labels just above lines
                    caselineLabel.textContent = year;
                    container.appendChild(caselineLabel);
                }
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