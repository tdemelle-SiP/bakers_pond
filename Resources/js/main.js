/**
 * main.js
 * Bootstrap only - loads data, initializes state, wires up UI
 */

import { loadTableData, extractTableRows, extractCasesTable } from './data-loader.js';
import { parseEvents, extractCaseNumbers, getEventDateRange } from './event-parser.js';
import { initLegend } from './legend.js';
import { initAllControls } from './controls.js';
import { state } from './state-manager.js';
import { 
    initializeApp,
    handleFilterUpdate, 
    handleScaleUpdate, 
    calculateFitToWindowScale,
    initRender,
    refreshTimelineData
} from './timeline-actions.js';
import { render } from './timeline-renderer.js';

// Wire up render function
initRender(render);

/**
 * Bootstrap the application
 */
async function init() {
    // Load and parse data
    const markdown = await loadTableData();
    const tableData = extractTableRows(markdown);
    const events = parseEvents(tableData);
    const caseNumbers = extractCaseNumbers(events);
    const eventDateRange = getEventDateRange(events);
    
    // Load cases metadata from markdown
    const casesData = extractCasesTable(markdown);
    
    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('timeline-content').style.display = 'block';
    
    // Initialize application state and do first render
    initializeApp(events, caseNumbers, casesData);
    
    // Initialize UI components
    initLegend();
    
    initAllControls({
        caseNumbers: caseNumbers,
        eventDateRange: eventDateRange,
        initialScale: state.scale,
        initialFitToWindow: state.fitToWindow,
        initialFilters: state.filters,
        onFilterUpdate: handleFilterUpdate,
        onScaleUpdate: handleScaleUpdate,
        calculateFitScale: calculateFitToWindowScale
    });
    
    // Add refresh button handler
    const refreshButton = document.getElementById('refresh-timeline');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            refreshButton.disabled = true;
            refreshButton.textContent = '⟳';  // Show spinning icon
            
            try {
                // Reload data and re-render
                const newMarkdown = await loadTableData();
                const newTableData = extractTableRows(newMarkdown);
                const newEvents = parseEvents(newTableData);
                const newCaseNumbers = extractCaseNumbers(newEvents);
                const newCasesData = extractCasesTable(newMarkdown);
                
                // Delegate state updates to actions layer (maintains architecture)
                refreshTimelineData(newEvents, newCaseNumbers, newCasesData);
                
                // Flash success feedback
                refreshButton.textContent = '✓';
                setTimeout(() => {
                    refreshButton.textContent = '↻';
                }, 1000);
            } catch (error) {
                console.error('Refresh failed:', error);
                refreshButton.textContent = '✗';
                setTimeout(() => {
                    refreshButton.textContent = '↻';
                }, 2000);
            } finally {
                refreshButton.disabled = false;
            }
        });
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}