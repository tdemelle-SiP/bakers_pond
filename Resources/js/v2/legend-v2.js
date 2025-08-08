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
    
    // Build legend HTML
    let html = '<div style="display: flex; gap: 40px;">';
    
    // Caseline legend
    html += '<div><span style="font-weight: bold; margin-right: 10px;">Caseline:</span>';
    EMOJI_LEGEND.caseline.forEach(item => {
        const hideClass = item.class ? ` class="${item.class}"` : '';
        html += `<span${hideClass} style="margin-right: 12px;">`;
        html += `<span style="font-size: 14px;">${item.emoji}</span> `;
        html += `<span style="font-size: 11px;">${item.label}</span>`;
        html += '</span>';
    });
    
    // Add continuance checkbox
    html += '<label style="margin-left: 10px; font-size: 11px;">';
    html += '<input type="checkbox" id="show-continuances" checked> ';
    html += 'Show Continuances</label>';
    html += '</div>';
    
    // Timeline legend
    html += '<div><span style="font-weight: bold; margin-right: 10px;">Timeline:</span>';
    EMOJI_LEGEND.timeline.forEach(item => {
        html += '<span style="margin-right: 12px;">';
        if (item.emoji === '🟢') {
            html += '<span style="display: inline-block; width: 8px; height: 8px; background: #4caf50; border-radius: 50%; margin-right: 4px;"></span>';
        } else if (item.emoji === '🔴') {
            html += '<span style="display: inline-block; width: 8px; height: 8px; background: #f44336; border-radius: 50%; margin-right: 4px;"></span>';
        } else {
            html += `<span style="font-size: 14px;">${item.emoji}</span> `;
        }
        html += `<span style="font-size: 11px;">${item.label}</span>`;
        html += '</span>';
    });
    html += '</div>';
    
    html += '</div>';
    
    legendContainer.innerHTML = html;
    
    // Set up continuance toggle
    const continuanceCheckbox = document.getElementById('show-continuances');
    if (continuanceCheckbox) {
        continuanceCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.remove('hide-continuances');
            } else {
                document.body.classList.add('hide-continuances');
            }
        });
    }
}