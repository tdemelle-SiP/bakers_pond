/**
 * timeline-renderer.js
 * Pure rendering functions for the timeline
 * No state modifications, only visualization
 */

import { state, updateState } from './state-manager.js';
import { renderTimelineNodes } from './timeline-nodes.js';
import { renderCaselineNodes } from './caseline-nodes.js';
import { drawTimelineConnections, drawCaselineConnections } from './connections.js';
import { createLabelsWithCollisionDetection } from './label-layout.js';
import { renderCaseTitles } from './case-titles.js';
import { calculateStats, renderStats } from './stats.js';
import { calculateDateRange, drawYearMarkers, calculateTimelineWidth, setContainerWidth, getXPosition } from './date-scale.js';

/**
 * Re-render the timeline with current state
 */
export function render() {
    // Clear existing content
    const caselineContainer = document.getElementById('caseline-container');
    const timelineContainer = document.getElementById('timeline-nodes-container');
    const yearMarkersContainer = document.getElementById('year-markers-container');
    const connectionsContainer = document.getElementById('connections-container');
    
    if (caselineContainer) {
        // Preserve the case titles container if it exists
        const titlesContainer = document.getElementById('case-titles-container');
        caselineContainer.innerHTML = '';
        if (titlesContainer) {
            caselineContainer.appendChild(titlesContainer);
        }
    }
    if (timelineContainer) timelineContainer.innerHTML = '';
    if (yearMarkersContainer) yearMarkersContainer.innerHTML = '';
    if (connectionsContainer) connectionsContainer.innerHTML = '';
    
    // Recalculate date range and render
    const dateRange = calculateDateRange(state.filteredEvents);
    const pixelsPerDay = state.scale;
    
    // Update container width
    const container = document.getElementById('timeline-container');
    const timelineWidth = calculateTimelineWidth(dateRange.totalDays, pixelsPerDay);
    setContainerWidth(container, timelineWidth);
    
    // Draw year markers
    drawYearMarkers(yearMarkersContainer, dateRange, pixelsPerDay);
    
    // Render nodes
    const nodePositions = renderTimelineNodes(state.filteredEvents, dateRange, pixelsPerDay);
    const caselineData = renderCaselineNodes(state.filteredEvents, dateRange, pixelsPerDay);
    
    // Apply emoji visibility BEFORE creating labels
    if (state.emojiVisibility) {
        Object.entries(state.emojiVisibility).forEach(([emojiClass, isVisible]) => {
            const elements = document.querySelectorAll(`[data-emoji-type="${emojiClass}"]`);
            elements.forEach(element => {
                element.style.display = isVisible === false ? 'none' : '';
            });
        });
    }
    
    // Filter to only visible nodes for label creation
    const visibleNodes = caselineData.nodes.filter(node => {
        if (!node.node) return false;
        return node.node.style.display !== 'none';
    });
    
    // Render labels with collision detection using only visible nodes
    createLabelsWithCollisionDetection(visibleNodes, caselineContainer);
    
    // Render case titles
    const visibleCases = state.filters.selectedCases && state.filters.selectedCases.length > 0 ?
        state.filters.selectedCases : state.caseNumbers;
    renderCaseTitles(caselineData.caseGroups, visibleCases, state.casesData);
    
    // Draw connections
    drawTimelineConnections(nodePositions, connectionsContainer);
    drawCaselineConnections(caselineData.caseGroups, connectionsContainer);
    
    // Update stats with emoji visibility from state
    const emojiVisibility = state.emojiVisibility || {};
    const stats = calculateStats(state.filteredEvents, emojiVisibility);
    renderStats(stats, emojiVisibility);
    
    // Store caseline nodes for label refresh (simple approach from original)
    updateState({ caselineNodes: caselineData.nodes });
    
    // Restore focus date position if exists
    const scrollContainer = document.querySelector('.main-content');
    if (scrollContainer && state.focusDate) {
        const focusX = getXPosition(state.focusDate, dateRange.startDate, pixelsPerDay);
        const scrollPosition = focusX - (scrollContainer.clientWidth / 2);
        requestAnimationFrame(() => {
            scrollContainer.scrollLeft = scrollPosition;
        });
    }
}