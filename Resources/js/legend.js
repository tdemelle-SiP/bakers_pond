/* legend.js - Legend initialization module */

export function initLegend() {
	const el = document.getElementById('nav-legend');
	if (!el) return;
	
	// Check if there's a legend template
	const template = document.getElementById('legend-template');
	if (template) {
		el.innerHTML = template.innerHTML;
		return;
	}
	
	// Fallback: create legend programmatically if no template
	el.innerHTML = ''; // Clear existing legend items
	el.style.display = 'flex';
	el.style.gap = '20px';
	el.style.alignItems = 'center';
	
	// Caseline legend (left side)
	const caselineDiv = document.createElement('div');
	caselineDiv.style.paddingRight = '20px';
	caselineDiv.style.borderRight = '2px solid #546e7a';
	const caselineTable = document.createElement('table');
	caselineTable.style.borderCollapse = 'collapse';
	caselineTable.style.color = 'white';
	caselineTable.style.fontSize = '12px';
	
	const caselineRow1 = document.createElement('tr');
	caselineRow1.innerHTML = `
		<td style="padding: 2px 10px 2px 0; font-weight: bold; white-space: nowrap; vertical-align: top;" rowspan="2">Caseline:</td>
		<td style="padding: 2px 12px;">⭐ Filing</td>
		<td style="padding: 2px 12px;">✅ Approved</td>
		<td style="padding: 2px 12px;">⛔ Denied</td>
		<td style="padding: 2px 12px;">📐 Plan</td>
		<td style="padding: 2px 12px;">🔍 Review</td>
	`;
	caselineTable.appendChild(caselineRow1);
	
	const caselineRow2 = document.createElement('tr');
	caselineRow2.innerHTML = `
		<td style="padding: 2px 12px;">
			<label style="cursor: pointer;">
				<input type="checkbox" id="hide-continuances" style="margin-right: 4px; cursor: pointer;" checked>
				🐢 Continued
			</label>
		</td>
		<td style="padding: 2px 12px;">🏛️ Hearing</td>
		<td style="padding: 2px 12px;">⏰ Expired</td>
		<td style="padding: 2px 12px;">♻️ Extended</td>
		<td style="padding: 2px 12px;">🔒 Private</td>
	`;
	caselineTable.appendChild(caselineRow2);
	caselineDiv.appendChild(caselineTable);
	
	// Timeline legend (right side)
	const timelineDiv = document.createElement('div');
	const timelineTable = document.createElement('table');
	timelineTable.style.borderCollapse = 'collapse';
	timelineTable.style.color = 'white';
	timelineTable.style.fontSize = '12px';
	
	const timelineRow = document.createElement('tr');
	timelineRow.innerHTML = `
		<td style="padding: 2px 10px 2px 0; font-weight: bold; white-space: nowrap;">Timeline:</td>
		<td style="padding: 2px 12px;"><span style="display: inline-block; width: 10px; height: 10px; background: #4caf50; border: 1px solid #388e3c; margin-right: 5px;"></span>Public Event</td>
		<td style="padding: 2px 12px;"><span style="display: inline-block; width: 10px; height: 10px; background: #f44336; border: 1px solid #d32f2f; margin-right: 5px;"></span>Private Event</td>
		<td style="padding: 2px 12px;">❌ Missing Document</td>
	`;
	timelineTable.appendChild(timelineRow);
	timelineDiv.appendChild(timelineTable);
	
	el.appendChild(caselineDiv);
	el.appendChild(timelineDiv);
}

// Auto-initialize on DOM ready if this module is loaded
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initLegend);
} else {
	// DOM already loaded
	initLegend();
}