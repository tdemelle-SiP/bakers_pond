/**
 * legend-v2.js
 * Renders the emoji legend in the header
 */

// Emoji configuration
const EMOJI_LEGEND = {
    caseline: [
        { emoji: '⭐', label: 'Filing', color: '#ffd700' },
        { emoji: '✅', label: 'Approved', color: '#4caf50' },
        { emoji: '⛔', label: 'Denied', color: '#f44336' },
        { emoji: '📐', label: 'Plan', color: '#ffd700' },
        { emoji: '🔍', label: 'Review', color: '#2196f3' },
        { emoji: '🐢', label: 'Continued', color: '#ff9800', class: 'continuance' },
        { emoji: '🏛️', label: 'Hearing', color: '#9c27b0' },
        { emoji: '⏰', label: 'Expired', color: '#f44336' },
        { emoji: '♻️', label: 'Extended', color: '#4caf50' },
        { emoji: '🔒', label: 'Private', color: '#f44336' }
    ],
    timeline: [
        { emoji: '🟢', label: 'Public Event', color: '#4caf50' },
        { emoji: '🔴', label: 'Private Event', color: '#f44336' },
        { emoji: '❌', label: 'Missing Document', color: '#ff0000' }
    ]
};

/**
 * Initialize legend in the header
 */
export function initLegend() {
    // Find or create legend container in nav
    let legendContainer = document.getElementById('legend-container');
    if (!legendContainer) {
        const navBottomRow = document.querySelector('.nav-bottom-row');
        if (!navBottomRow) return;
        
        legendContainer = document.createElement('div');
        legendContainer.id = 'legend-container';
        legendContainer.className = 'legend';
        navBottomRow.appendChild(legendContainer);
    }
    
    // Build legend HTML matching original two-row table format
    let html = '<div style="display: flex; gap: 20px; align-items: center;">';
    
    // Caseline legend (two-row table)
    html += '<div style="padding-right: 20px; border-right: 2px solid #546e7a;">';
    html += '<table style="border-collapse: collapse; color: white; font-size: 12px;">';
    
    // First row of caseline
    html += '<tr>';
    html += '<td style="padding: 2px 10px 2px 0; font-weight: bold; white-space: nowrap; vertical-align: top;" rowspan="2">Caseline:</td>';
    html += '<td style="padding: 2px 12px;">⭐ Filing</td>';
    html += '<td style="padding: 2px 12px;">✅ Approved</td>';
    html += '<td style="padding: 2px 12px;">⛔ Denied</td>';
    html += '<td style="padding: 2px 12px;">📐 Plan</td>';
    html += '<td style="padding: 2px 12px;">🔍 Review</td>';
    html += '</tr>';
    
    // Second row of caseline with continuance checkbox
    html += '<tr>';
    html += '<td style="padding: 2px 12px;">';
    html += '<label style="cursor: pointer;">';
    html += '<input type="checkbox" id="show-continuances" style="margin-right: 4px; cursor: pointer;" checked>';
    html += '🐢 Continued';
    html += '</label>';
    html += '</td>';
    html += '<td style="padding: 2px 12px;">🏛️ Hearing</td>';
    html += '<td style="padding: 2px 12px;">⏰ Expired</td>';
    html += '<td style="padding: 2px 12px;">♻️ Extended</td>';
    html += '<td style="padding: 2px 12px;">🔒 Private</td>';
    html += '</tr>';
    html += '</table>';
    html += '</div>';
    
    // Timeline legend (single row)
    html += '<div>';
    html += '<table style="border-collapse: collapse; color: white; font-size: 12px;">';
    html += '<tr>';
    html += '<td style="padding: 2px 10px 2px 0; font-weight: bold; white-space: nowrap;">Timeline:</td>';
    html += '<td style="padding: 2px 12px;"><span style="display: inline-block; width: 10px; height: 10px; background: #4caf50; border: 1px solid #388e3c; margin-right: 5px;"></span>Public Event</td>';
    html += '<td style="padding: 2px 12px;"><span style="display: inline-block; width: 10px; height: 10px; background: #f44336; border: 1px solid #d32f2f; margin-right: 5px;"></span>Private Event</td>';
    html += '<td style="padding: 2px 12px;">❌ Missing Document</td>';
    html += '</tr>';
    html += '</table>';
    html += '</div>';
    
    html += '</div>';
    
    legendContainer.innerHTML = html;
    
    // Set up continuance toggle
    const continuanceCheckbox = document.getElementById('show-continuances');
    if (continuanceCheckbox) {
        // Load saved state
        const savedState = localStorage.getItem('timeline-v2-show-continuances');
        if (savedState !== null) {
            const showContinuances = JSON.parse(savedState);
            continuanceCheckbox.checked = showContinuances;
            if (!showContinuances) {
                document.body.classList.add('hide-continuances');
            }
        }
        
        continuanceCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            if (checked) {
                document.body.classList.remove('hide-continuances');
            } else {
                document.body.classList.add('hide-continuances');
            }
            // Save state
            localStorage.setItem('timeline-v2-show-continuances', JSON.stringify(checked));
        });
    }
}