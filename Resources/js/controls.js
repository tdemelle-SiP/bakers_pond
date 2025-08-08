/* controls.js – UI wiring */

import {
	toggleCaseDropdown, 
	selectAllCases, 
	clearAllCases,
	resetFilters, 
	applyFilters
} from './render.js';

export function initControls() {
	// 🐢 toggle
	const cb = document.getElementById('hide-continuances');
	if (cb) {
		cb.onchange = () => {
			document.documentElement.classList.toggle('hide-continuances', !cb.checked);
			localStorage.setItem('timeline-show-continuances', cb.checked);
		};
		cb.checked = localStorage.getItem('timeline-show-continuances') !== 'false';
		cb.onchange();	// apply saved state
	}

	// existing buttons and sliders
	document.getElementById('case-filter-button')?.addEventListener('click', toggleCaseDropdown);
	document.querySelector('.select-all-btn')?.addEventListener('click', selectAllCases);
	document.querySelector('.clear-all-btn')?.addEventListener('click', clearAllCases);
	document.getElementById('reset-filters')?.addEventListener('click', resetFilters);
	
	// Date filter inputs
	document.getElementById('filter-start-date')?.addEventListener('change', applyFilters);
	document.getElementById('filter-end-date')?.addEventListener('change', applyFilters);
}