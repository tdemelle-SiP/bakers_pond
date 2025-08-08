/* js/render.js
 * Renders the timeline visualization from parsed event data
 * Imports data from data.js and builds the DOM
 */

import { loadEvents, getCaseNumbers, getDateRange } from './data.js';
import { initControls } from './controls.js';
import { initLegend } from './legend.js';

// Global state
let events = [];
let filteredEvents = [];

// Marker styles - colour, stroke, and labels for nodes/links
const markerStyles = {
	'✅': { fill: '#4caf50', stroke: '#388e3c', label: 'APPROVED' },
	'❌': { fill: '#f44336', stroke: '#d32f2f', label: 'DENIED' },
	'🟢': { fill: '#4caf50', stroke: '#388e3c', label: 'ISSUED' },
	'🟡': { fill: '#ffd700', stroke: '#ccac00', label: 'PENDING' },
	'📐': { fill: '#2196f3', stroke: '#1976d2', label: 'REVISED' },
	'📝': { fill: '#ffd700', stroke: '#ccac00', label: 'COMMENT' },
	'🔍': { fill: '#ffd700', stroke: '#ccac00', label: 'REVIEW' },
	'🐢': { fill: '#ffd700', stroke: '#ccac00', label: '' },
	'🏛️': { fill: '#ffd700', stroke: '#ccac00', label: 'HEARING' },
	'🔒': { fill: '#f44336', stroke: '#d32f2f', label: 'PRIVATE' },
	'⏰': { fill: '#f44336', stroke: '#d32f2f', label: 'EXPIRED' },
	'♻️': { fill: '#4caf50', stroke: '#388e3c', label: 'EXTENDED' },
	'⭐': { fill: '#0066cc', stroke: '#0066cc', label: 'FILING' },   // caseline
	'⛔': { fill: '#0066cc', stroke: '#0066cc', label: 'DENIED' },
	'🔵': { fill: '#0066cc', stroke: '#0066cc', label: 'PLAN' }
};

// Legacy emojiConfig mapping for compatibility
const emojiConfig = markerStyles;

// Position constants
const TIMELINE_LEFT_OFFSET = 200;          // original value
const RIGHT_MARGIN         = 40;           // original value
const NODE_POSITIONS = {
	public: 120,      // original value
	private: 145,     // original value
	emojiSize: 16,
	emojiCenter: 8,
	labelGapAbove: 25,
	labelGapBelow: 30
};

// Helper functions for node positions
const getNodeY = (isPrivate) => isPrivate ? NODE_POSITIONS.private : NODE_POSITIONS.public;
const getNodeCenterY = (isPrivate) => getNodeY(isPrivate) + NODE_POSITIONS.emojiCenter;

// Global state
let currentDateRange = null;
let pixelsPerDay = 6; // default, overwritten by scale controls

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
	try {
		// Load the event data
		events = await loadEvents();
		console.log(`Loaded ${events.length} events from timeline markdown`);
		
		// Emoji coverage check
		console.log('Missing emoji in emojiConfig:',
			[...new Set(events.flatMap(e=>[...e.markers]))]
				.filter(e=>e && !emojiConfig[e]));
		
		// Initialize UI components
		initializeCaseFilter();
		initializeDateFilter();
		initLegend();
		
		// Apply saved filter states
		loadFilterState();
		
		// Initial render
		applyFilters();
		
		// Show the timeline and hide loading
		revealTimeline();
		
		// Initialize controls (including continuance toggle)
		initControls();
		
	} catch (error) {
		console.error('Failed to load timeline:', error);
		document.getElementById('timeline-container').innerHTML = 
			`<div style="color: red; padding: 20px;">Error loading timeline: ${error.message}</div>`;
	}
});

function initializeCaseFilter() {
	const caseNumbers = getCaseNumbers(events);
	const container = document.getElementById('filter-case');
	
	// Add "Unassigned" option if needed
	const hasUnassigned = events.some(e => !e.caseNumber || e.caseNumber.trim() === '');
	if (hasUnassigned) {
		container.appendChild(createCaseCheckbox('UNASSIGNED', 'Unassigned'));
	}
	
	// Add case number checkboxes
	caseNumbers.forEach(caseNum => {
		const label = caseNum.startsWith('338-') ? `DEP #${caseNum}` : caseNum;
		container.appendChild(createCaseCheckbox(caseNum, label));
	});
	
	updateCaseFilterText();
}

function createCaseCheckbox(value, text) {
	const label = document.createElement('label');
	label.className = 'case-checkbox-label';
	
	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.value = value;
	checkbox.checked = true;
	checkbox.className = 'case-checkbox';
	checkbox.addEventListener('change', () => {
		updateCaseFilterText();
		applyFilters();
		if (document.getElementById('fit-to-window')?.checked) {
			calculateAndApplyFitScale();
		}
		saveFilterState();
	});
	
	label.appendChild(checkbox);
	label.appendChild(document.createTextNode(' ' + text));
	return label;
}

function initializeDateFilter() {
	const range = getDateRange(events);
	if (!range.start || !range.end) return;
	
	const startInput = document.getElementById('filter-start-date');
	const endInput = document.getElementById('filter-end-date');
	
	// Don't override if already has values (from HTML defaults)
	if (!startInput.value) {
		startInput.value = formatDateForInput(range.start);
	}
	if (!endInput.value) {
		endInput.value = formatDateForInput(range.end);
	}
}


function applyFilters() {
	// Get selected cases
	const selectedCases = Array.from(document.querySelectorAll('#filter-case input:checked'))
		.map(cb => cb.value);
	
	// Get date range
	const startDate = new Date(document.getElementById('filter-start-date').value);
	const endDate = new Date(document.getElementById('filter-end-date').value);
	
	// Filter events
	filteredEvents = events.filter(event => {
		// Case filter
		const eventCase = event.caseNumber?.trim() || 'UNASSIGNED';
		if (!selectedCases.includes(eventCase) && !selectedCases.includes('UNASSIGNED')) {
			return false;
		}
		
		// Date filter
		if (event.date) {
			if (event.date < startDate || event.date > endDate) {
				return false;
			}
		}
		
		return true;
	});
	
	// Render timeline
	renderTimeline();
	scrollToFirstEvent();   // Auto-scroll to first event
	initScaleControls();    // Initialize scale and fit controls
	if (document.getElementById('fit-to-window')?.checked) {
		calculateAndApplyFitScale();
	}
}

// Helper function to split labels with multiple words
function splitLabel(text) {
	const words = text.split(' ');
	if (words.length <= 1) return text;
	
	// Split into two lines as evenly as possible
	const midpoint = Math.floor(words.length / 2);
	const line1 = words.slice(0, midpoint).join(' ');
	const line2 = words.slice(midpoint).join(' ');
	return line1 + '\n' + line2;
}

// Helper function to measure actual rendered dimensions
function measureAbbrev(abbrev, isPrivate) {
	const el = document.createElement('div');
	el.className = `node-label ${isPrivate ? 'node-label-below' : 'node-label-above'}`;
	el.style.position = 'absolute';
	el.style.visibility = 'hidden';
	el.style.transform = 'none';
	el.style.whiteSpace = 'pre-line';
	el.style.textAlign = 'center';
	el.textContent = abbrev;
	document.body.appendChild(el);
	const { width, height } = el.getBoundingClientRect();
	document.body.removeChild(el);
	return { width: Math.ceil(width), height: Math.ceil(height) };
}

// Build timeline data structure
function buildTimelineData(events) {
	// Separate events by type
	const timelineEvents = [];
	const caselineEvents = [];
	
	events.forEach(event => {
		// Check if this is a timeline event (has 🟢)
		if (event.isTimelineEvent) {
			timelineEvents.push({
				...event,
				eventClass: event.eventClass || (event.isPrivate ? 'tracked-event-priv' : 'tracked-event')
			});
		}
		
		// ALSO check if this is a caseline event (has any emoji that's not just 🟢/🔒/❌)
		if (event.caselineEmoji) {
			caselineEvents.push({
				...event,
				eventClass: 'case-procedural',
				displayEmoji: event.isPrivate ? '🔒' : event.caselineEmoji,
				originalEmoji: event.caselineEmoji
			});
		}
	});
	
	return { timelineEvents, caselineEvents };
}

// Main rendering function
function renderTimeline(events, scale) {
	// If called with scale parameter, update pixelsPerDay
	if (scale !== undefined) {
		pixelsPerDay = scale;
	}
	// If called with events parameter, use those instead of filteredEvents
	if (events !== undefined) {
		filteredEvents = events;
	}
	const container = document.getElementById('timeline-container');
	if (!container) return;
	
	// Clear existing content
	container.innerHTML = `
		<div class="timeline-section-background public-section"></div>
		<div class="timeline-section-background private-section"></div>
		<div class="section-label public-label">TIMELINE: PUBLIC</div>
		<div class="section-label private-label">TIMELINE: PRIVATE</div>
		<div class="section-label timeline-title">CASELINE</div>
		<div class="timeline-line"></div>
	`;
	
	// Calculate date range
	const dates = filteredEvents.filter(e => e.date).map(e => e.date);
	if (dates.length === 0) return;
	
	const minDate = new Date(Math.min(...dates));
	const maxDate = new Date(Math.max(...dates));
	
	// Add padding to the date range
	const startDate = new Date(minDate.getTime() - (60 * 24 * 60 * 60 * 1000));
	const endDate = new Date(maxDate.getTime() + (60 * 24 * 60 * 60 * 1000));
	
	const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
	
	// Store date range globally
	currentDateRange = { startDate, endDate, totalDays };
	
	const timelineWidth = Math.max(totalDays * pixelsPerDay + RIGHT_MARGIN, 1200);
	
	// Set container width
	container.style.width = timelineWidth + 'px';
	if (container.parentElement) {
		container.parentElement.style.width = (timelineWidth + 80) + 'px';
	}
	
	// Add year markers
	drawYearMarkers(container, startDate, endDate, minDate, maxDate, totalDays, pixelsPerDay, timelineWidth);
	
	// Build and render the timeline
	const { timelineEvents, caselineEvents } = buildTimelineData(filteredEvents);
	
	// Add SVG for caseline
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.style.position = 'absolute';
	svg.style.left = '0';
	svg.style.top = '0';
	svg.style.width = timelineWidth + 'px';
	svg.style.height = '400px';
	svg.style.pointerEvents = 'none';
	svg.style.zIndex = '1';
	
	// Draw caseline - positioned between public and private node rows
	const CASELINE_Y = getNodeY(false) - 20; // Derives to 100 (between 120 and 145)
	const caselineLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	caselineLine.setAttribute('class', 'caseline-line');
	caselineLine.setAttribute('x1', TIMELINE_LEFT_OFFSET);
	caselineLine.setAttribute('x2', timelineWidth + TIMELINE_LEFT_OFFSET);
	caselineLine.setAttribute('y1', CASELINE_Y);
	caselineLine.setAttribute('y2', CASELINE_Y);
	svg.appendChild(caselineLine);
	
	// Add caseline labels
	caselineEvents.forEach(event => {
		const daysFromStart = (event.date - startDate) / (1000 * 60 * 60 * 24);
		const x = TIMELINE_LEFT_OFFSET + (daysFromStart * pixelsPerDay);
		
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('class', 'caseline-label');
		text.setAttribute('x', x);
		text.setAttribute('y', CASELINE_Y - 6);
		text.textContent = event.caseNumber || '';
		svg.appendChild(text);
	});
	
	container.appendChild(svg);
	
	drawSVG({ 
		timelineEvents, 
		caselineEvents, 
		container, 
		startDate, 
		endDate, 
		totalDays, 
		pixelsPerDay 
	});
}

// Draw year markers and labels
function drawYearMarkers(container, startDate, endDate, minDate, maxDate, totalDays, pixelsPerDay, timelineWidth) {
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
				const marker = document.createElement('div');
				marker.className = 'year-marker';
				marker.style.left = yearStartX + 'px';
				container.appendChild(marker);
				
				// Add vertical line
				const vertLine = document.createElement('div');
				vertLine.style.position = 'absolute';
				vertLine.style.left = yearStartX + 'px';
				vertLine.style.top = '0px';
				vertLine.style.width = '1px';
				vertLine.style.height = '305px';
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
				label.textContent = year;
				container.appendChild(label);
			}
		}
	}
}

// Main SVG drawing function
function drawSVG(params) {
	const { timelineEvents, caselineEvents, container, startDate, endDate, totalDays, pixelsPerDay } = params;
	
	// Track positions for connections
	const eventPositions = [];
	const labelPositions = { above: [], below: [] };
	const datesWithLabels = { above: new Set(), below: new Set() };
	const allDateLabels = { above: [], below: [] };
	
	// Track case procedural events
	const caseProceduralEvents = {
		'Historical': [],
		'338-0303': [],
		'338-0594': [],
		'338-0706': [],
		'338-0756': []
	};
	
	// Case info for labels
	const caseInfo = {
		'Historical': { year: '', name: 'Historical' },
		'338-0303': { year: '2001', name: 'Initial' },
		'338-0594': { year: '2014', name: 'House' },
		'338-0706': { year: '2020', name: 'House' },
		'338-0756': { year: '2023', name: 'Dam' }
	};
	
	// PASS 1: Render timeline events
	timelineEvents.forEach((event) => {
		const daysFromStart = (event.date - startDate) / (1000 * 60 * 60 * 24);
		const x = TIMELINE_LEFT_OFFSET + (daysFromStart * pixelsPerDay);
		
		const eventEl = document.createElement('div');
		eventEl.className = `event ${event.eventClass} ${event.isPrivate ? 'event-below' : 'event-above'}`;
		eventEl.style.left = x + 'px';
		
		// Create date label if needed
		const labelGroup = event.isPrivate ? 'below' : 'above';
		const dateKey = event.dateStr;
		const monthDay = new Date(event.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
		
		if (!datesWithLabels[labelGroup].has(dateKey)) {
			const dateLabel = document.createElement('div');
			dateLabel.className = 'event-date-label';
			dateLabel.textContent = monthDay;
			
			allDateLabels[labelGroup].push({
				element: dateLabel,
				x: x,
				date: event.date,
				eventEl: eventEl
			});
			
			datesWithLabels[labelGroup].add(dateKey);
		}
		
		// Create tooltip
		const tooltip = document.createElement('div');
		tooltip.className = 'event-tooltip';
		tooltip.innerHTML = `
			<div class="event-date">${event.dateStr}</div>
			<div class="event-title">${event.title}</div>
			${event.displayDetail ? `<div class="event-detail">${event.displayDetail}</div>` : ''}
		`;
		
		eventEl.appendChild(tooltip);
		
		// Check for missing document marker
		if (event.hasMissingDoc) {
			const missingX = document.createElement('div');
			missingX.className = 'missing-indicator';
			missingX.textContent = '❌';
			eventEl.appendChild(missingX);
		}
		
		container.appendChild(eventEl);
		
		// Track position
		eventPositions.push({
			x: x,
			isPrivate: event.isPrivate,
			event: event
		});
	});
	
	// Process date labels
	processDateLabels(allDateLabels);
	
	// Draw connection lines
	drawConnectionLines(container, eventPositions);
	
	// PASS 2: Collect caseline events
	caselineEvents.forEach(event => {
		const daysFromStart = (event.date - startDate) / (1000 * 60 * 60 * 24);
		const x = TIMELINE_LEFT_OFFSET + (daysFromStart * pixelsPerDay);
		
		const config = markerStyles[event.caselineEmoji] || emojiConfig[event.caselineEmoji];
		const nodeLabel = event.proceduralLabel || (config ? config.label : '');
		const nodeColor = config ? config.fill : '#999999';
		const borderColor = config ? config.stroke : '#666666';
		
		const eventData = {
			x: x,
			date: event.date,
			dateStr: event.dateStr,
			title: event.detail || event.title,
			nodeEmoji: event.displayEmoji,
			originalEmoji: event.caselineEmoji,
			nodeLabel: nodeLabel,
			nodeColor: nodeColor,
			borderColor: borderColor,
			isPrivate: event.isPrivate,
			documentUrl: event.documentUrl,
			markers: event.markers,
			caseNumber: event.caseNumber
		};
		
		if (event.caseNumber && caseProceduralEvents[event.caseNumber]) {
			caseProceduralEvents[event.caseNumber].push(eventData);
		} else {
			// Render standalone event
			renderStandaloneCaselineEvent(container, eventData);
		}
	});
	
	// PASS 3: Render case procedural events
	renderCaseProceduralEvents(container, caseProceduralEvents, caseInfo, startDate, endDate, totalDays, pixelsPerDay);
	
	// Calculate and display stats
	updateTimelineStats(filteredEvents);
}

// Process date labels with clustering
function processDateLabels(allDateLabels) {
	['above', 'below'].forEach(position => {
		const labels = allDateLabels[position];
		if (labels.length === 0) return;
		
		labels.sort((a, b) => a.x - b.x);
		
		// Identify clusters
		const nodeClusterBoundaries = [];
		let clusterStart = 0;
		
		for (let i = 1; i < labels.length; i++) {
			if (labels[i].x - labels[i-1].x > 8) {
				nodeClusterBoundaries.push({ start: clusterStart, end: i - 1 });
				clusterStart = i;
			}
		}
		nodeClusterBoundaries.push({ start: clusterStart, end: labels.length - 1 });
		
		// Mark labels to keep
		const keepFromNodePass = new Set();
		nodeClusterBoundaries.forEach(cluster => {
			keepFromNodePass.add(cluster.start);
			if (cluster.end > cluster.start) {
				keepFromNodePass.add(cluster.end);
			}
		});
		
		// Remove labels too close together
		const finalLabelsToShow = [];
		let lastShownX = -Infinity;
		
		labels.forEach((label, index) => {
			if (!keepFromNodePass.has(index)) return;
			
			if (label.x - lastShownX >= 25) {
				finalLabelsToShow.push(label);
				lastShownX = label.x;
			}
		});
		
		// Apply final labels
		finalLabelsToShow.forEach(label => {
			label.eventEl.appendChild(label.element);
		});
	});
}

// Draw connection lines between events using SVG
function drawConnectionLines(container, eventPositions) {
	// Create a single SVG for all connectors
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.style.position = 'absolute';
	svg.style.left = '0';
	svg.style.top = '0';
	svg.style.width = '100%';
	svg.style.height = '400px';
	svg.style.pointerEvents = 'none';
	svg.style.zIndex = '5';
	
	// Create connector group
	const connectorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	connectorGroup.setAttribute('class', 'connectors');
	
	for (let i = 0; i < eventPositions.length - 1; i++) {
		const current = eventPositions[i];
		const next = eventPositions[i + 1];
		
		const startY = current.isPrivate ? 322 : 288;
		const endY = next.isPrivate ? 322 : 288;
		
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', current.x);
		line.setAttribute('y1', startY);
		line.setAttribute('x2', next.x);
		line.setAttribute('y2', endY);
		
		// Add continuance class if either endpoint is a continuance
		const isContinuance = current.event.isContinuance || next.event.isContinuance;
		line.setAttribute('class', isContinuance ? 'connector continuance' : 'connector');
		
		// Color based on band (public = green, private = red)
		const strokeColor = current.isPrivate ? '#f44336' : '#4caf50';
		line.setAttribute('stroke', strokeColor);
		line.setAttribute('stroke-width', '1');
		
		connectorGroup.appendChild(line);
	}
	
	// Draw vertical lines between same-day events
	const eventsByDate = {};
	eventPositions.forEach(pos => {
		if (!eventsByDate[pos.event.dateStr]) {
			eventsByDate[pos.event.dateStr] = [];
		}
		eventsByDate[pos.event.dateStr].push(pos);
	});
	
	Object.values(eventsByDate).forEach(dayEvents => {
		const publicEvents = dayEvents.filter(e => !e.isPrivate);
		const privateEvents = dayEvents.filter(e => e.isPrivate);
		
		if (publicEvents.length > 0 && privateEvents.length > 0) {
			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('x1', publicEvents[0].x);
			line.setAttribute('y1', 288);
			line.setAttribute('x2', publicEvents[0].x);
			line.setAttribute('y2', 322);
			line.setAttribute('stroke', '#f44336');
			line.setAttribute('stroke-width', '1');
			line.setAttribute('class', 'vertical-connector');
			connectorGroup.appendChild(line);
		}
	});
	
	svg.appendChild(connectorGroup);
	container.appendChild(svg);
}

// Render standalone caseline event
function renderStandaloneCaselineEvent(container, eventData) {
	const procEl = document.createElement('div');
	procEl.className = `event case-procedural ${eventData.isPrivate ? 'case-procedural-below' : 'case-procedural-above'}`;
	
	// Add continuance class if needed
	if (eventData.originalEmoji === '🐢') {
		procEl.classList.add('continuance');
	}
	
	procEl.style.left = eventData.x + 'px';
	procEl.style.backgroundColor = 'transparent';
	procEl.style.border = 'none';
	procEl.style.fontSize = '16px';
	procEl.style.lineHeight = '1';
	procEl.style.width = 'auto';
	procEl.style.height = 'auto';
	procEl.style.transform = 'translateX(-50%)';
	
	// Add emoji as text node
	procEl.appendChild(document.createTextNode(eventData.nodeEmoji));
	
	// Create tooltip
	const tooltip = document.createElement('div');
	tooltip.className = 'event-tooltip';
	tooltip.innerHTML = `
		<div class="event-title">${eventData.title}</div>
		<div class="event-detail">${eventData.dateStr}</div>
	`;
	procEl.appendChild(tooltip);
	
	container.appendChild(procEl);
}

// Render case procedural events with labels and connections
function renderCaseProceduralEvents(container, caseProceduralEvents, caseInfo, startDate, endDate, totalDays, pixelsPerDay) {
	// Collect all events and label data
	const allProcEvents = [];
	const allLabelData = [];
	
	Object.entries(caseProceduralEvents).forEach(([caseNum, caseEvents]) => {
		if (caseEvents.length === 0) return;
		
		// Sort events by date
		caseEvents.sort((a, b) => a.date - b.date);
		
		// Process each event
		caseEvents.forEach((procEvent, idx) => {
			allProcEvents.push({
				caseNum,
				procEvent,
				idx,
				caseEvents
			});
			
			// Skip labels for continuance events
			if (procEvent.originalEmoji === '🐢') return;
			
			// Prepare label
			let abbreviation = splitLabel(procEvent.nodeLabel);
			const { width: labelWidth, height: labelHeight } = measureAbbrev(abbreviation, procEvent.isPrivate);
			const nodeY = getNodeY(procEvent.isPrivate);
			
			let baseY;
			if (procEvent.isPrivate) {
				baseY = nodeY + NODE_POSITIONS.labelGapBelow;
			} else {
				const singleLineHeight = 20;
				const centerPoint = nodeY - NODE_POSITIONS.labelGapAbove - (singleLineHeight / 2);
				baseY = centerPoint - (labelHeight / 2);
			}
			const baseX = procEvent.x - labelWidth / 2;
			
			allLabelData.push({
				caseNum,
				procEvent,
				abbreviation,
				width: labelWidth,
				height: labelHeight,
				nodeY,
				baseX,
				baseY,
				x: baseX,
				y: baseY
			});
		});
	});
	
	// Resolve label overlaps
	resolveLabelOverlaps(allLabelData);
	
	// Render all elements
	renderCaselineElements(container, allProcEvents, allLabelData, caseProceduralEvents, caseInfo, startDate, endDate, pixelsPerDay);
}

// Resolve overlapping labels
function resolveLabelOverlaps(allLabelData) {
	const minGap = 3;
	
	[false, true].forEach(isPrivate => {
		const bandLabels = allLabelData
			.filter(ld => ld.procEvent.isPrivate === isPrivate)
			.sort((a, b) => a.procEvent.x - b.procEvent.x);
		
		if (bandLabels.length === 0) return;
		
		bandLabels.forEach(label => {
			label.x = label.baseX;
		});
		
		let hasOverlap = true;
		let iterations = 0;
		
		while (hasOverlap && iterations < 30) {
			hasOverlap = false;
			
			for (let i = 1; i < bandLabels.length; i++) {
				const prev = bandLabels[i - 1];
				const curr = bandLabels[i];
				
				const overlap = (prev.x + prev.width + minGap) - curr.x;
				
				if (overlap > 0) {
					hasOverlap = true;
					prev.x -= overlap * 0.5;
					curr.x += overlap * 0.5;
				}
			}
			
			iterations++;
		}
	});
}

// Render caseline elements with labels and connections
function renderCaselineElements(container, allProcEvents, allLabelData, caseProceduralEvents, caseInfo, startDate, endDate, pixelsPerDay) {
	// Render nodes
	allProcEvents.forEach(({caseNum, procEvent, idx, caseEvents}) => {
		const procEl = document.createElement('div');
		procEl.className = `event case-procedural case-${caseNum.slice(-4)} ${procEvent.isPrivate ? 'case-procedural-below' : 'case-procedural-above'}`;
		
		// Add continuance class
		if (procEvent.originalEmoji === '🐢') {
			procEl.classList.add('continuance');
		}
		
		procEl.style.left = procEvent.x + 'px';
		procEl.style.backgroundColor = 'transparent';
		procEl.style.border = 'none';
		procEl.style.fontSize = '16px';
		procEl.style.lineHeight = '1';
		procEl.style.width = 'auto';
		procEl.style.height = 'auto';
		procEl.style.transform = 'translateX(-50%)';
		
		// Add emoji as text node
		procEl.appendChild(document.createTextNode(procEvent.nodeEmoji));
		
		// Create tooltip
		const tooltip = document.createElement('div');
		tooltip.className = 'event-tooltip';
		const caseLabel = caseNum === 'Historical' ? 'Historical Records' : `DEP #${caseNum}`;
		tooltip.innerHTML = `
			<div class="event-date">${caseLabel}</div>
			<div class="event-title">${procEvent.title}</div>
			<div class="event-detail">${procEvent.dateStr}</div>
		`;
		procEl.appendChild(tooltip);
		
		// Find label data
		const labelData = allLabelData.find(ld => 
			ld.procEvent === procEvent && 
			ld.caseNum === caseNum
		);
		
		// Render label if exists
		if (labelData) {
			renderCaselineLabel(container, labelData, procEvent);
		}
		
		container.appendChild(procEl);
		
		// Add connections between same-case events
		if (idx > 0) {
			drawCaseConnection(container, caseEvents[idx - 1], procEvent);
		}
	});
	
	// Add case labels
	renderCaseLabels(container, caseProceduralEvents, caseInfo, startDate, endDate, pixelsPerDay);
}

// Render individual caseline label
function renderCaselineLabel(container, labelData, procEvent) {
	const procLabel = document.createElement('div');
	
	// Determine status class based on node color
	let statusClass = '';
	if (procEvent.nodeColor === '#f44336') {
		statusClass = 'status-denied';
	} else if (procEvent.nodeColor === '#4caf50') {
		statusClass = 'status-approved';
	} else if (procEvent.nodeColor === '#ffd700') {
		statusClass = 'status-pending';
	}
	
	procLabel.className = `node-label ${procEvent.isPrivate ? 'node-label-below' : 'node-label-above'} ${statusClass}`;
	procLabel.style.whiteSpace = 'pre-line';
	procLabel.style.textAlign = 'center';
	procLabel.textContent = labelData.abbreviation;
	procLabel.title = `${procEvent.title} - ${procEvent.dateStr}`;
	
	// Make clickable if has URL
	if (procEvent.documentUrl) {
		procLabel.style.cursor = 'pointer';
		procLabel.onclick = () => {
			window.open(procEvent.documentUrl, '_blank');
		};
	}
	
	// Position label
	procLabel.style.left = labelData.x + 'px';
	procLabel.style.top = labelData.y + 'px';
	procLabel.style.transform = 'none';
	
	// Draw leader line if needed
	const nodeCenter = procEvent.x;
	const labelCenter = labelData.x + labelData.width / 2;
	const nodeCenterY = getNodeCenterY(procEvent.isPrivate);
	const labelEdgeY = procEvent.isPrivate ? labelData.y : labelData.y + labelData.height;
	
	if (Math.abs(nodeCenter - labelCenter) > 5) {
		drawLeaderLine(container, nodeCenter, nodeCenterY, labelCenter, labelEdgeY);
	}
	
	container.appendChild(procLabel);
}

// Draw leader line between node and label
function drawLeaderLine(container, nodeX, nodeY, labelX, labelY) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.style.position = 'absolute';
	svg.style.left = Math.min(nodeX, labelX) + 'px';
	svg.style.top = Math.min(nodeY, labelY) + 'px';
	svg.style.width = Math.abs(nodeX - labelX) + 'px';
	svg.style.height = Math.abs(nodeY - labelY) + 'px';
	svg.style.pointerEvents = 'none';
	svg.style.zIndex = '9';
	
	const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	line.setAttribute('x1', nodeX < labelX ? '0' : Math.abs(nodeX - labelX));
	line.setAttribute('y1', nodeY < labelY ? '0' : Math.abs(nodeY - labelY));
	line.setAttribute('x2', nodeX > labelX ? '0' : Math.abs(nodeX - labelX));
	line.setAttribute('y2', nodeY > labelY ? '0' : Math.abs(nodeY - labelY));
	line.setAttribute('stroke', '#999');
	line.setAttribute('stroke-width', '1');
	line.setAttribute('stroke-opacity', '0.7');
	
	svg.appendChild(line);
	container.appendChild(svg);
}

// Draw connection between case events
function drawCaseConnection(container, prevEvent, currEvent) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.style.position = 'absolute';
	svg.style.left = Math.min(prevEvent.x, currEvent.x) + 'px';
	svg.style.width = Math.abs(currEvent.x - prevEvent.x) + 'px';
	svg.style.height = '400px';
	svg.style.top = '0';
	svg.style.pointerEvents = 'none';
	svg.style.overflow = 'visible';
	
	const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	
	const x1 = prevEvent.x < currEvent.x ? 0 : Math.abs(currEvent.x - prevEvent.x);
	const x2 = prevEvent.x < currEvent.x ? Math.abs(currEvent.x - prevEvent.x) : 0;
	const y1 = getNodeCenterY(prevEvent.isPrivate);
	const y2 = getNodeCenterY(currEvent.isPrivate);
	
	line.setAttribute('x1', x1);
	line.setAttribute('y1', y1);
	line.setAttribute('x2', x2);
	line.setAttribute('y2', y2);
	
	// Add continuance class if either endpoint is a continuance
	const isContinuance = (prevEvent.originalEmoji === '🐢' || currEvent.originalEmoji === '🐢');
	if (isContinuance) {
		line.setAttribute('class', 'continuance');
	}
	
	line.setAttribute('stroke', prevEvent.nodeColor);
	line.setAttribute('stroke-width', '4');
	line.setAttribute('stroke-opacity', '0.7');
	
	svg.appendChild(line);
	container.appendChild(svg);
}

// Render case labels
function renderCaseLabels(container, caseProceduralEvents, caseInfo, startDate, endDate, pixelsPerDay) {
	Object.entries(caseProceduralEvents).forEach(([caseNum, caseEvents]) => {
		if (caseEvents.length === 0) return;
		
		const firstEvent = caseEvents[0];
		const caseLabel = document.createElement('div');
		caseLabel.className = 'case-label case-label-above';
		caseLabel.style.left = (firstEvent.x + 90) + 'px';
		
		// Get case color
		const caseColorClass = `case-${caseNum.slice(-4)}`;
		const tempEl = document.createElement('div');
		tempEl.className = caseColorClass;
		document.body.appendChild(tempEl);
		const caseColor = getComputedStyle(tempEl).backgroundColor;
		document.body.removeChild(tempEl);
		caseLabel.style.color = caseColor;
		
		const labelText = caseNum === 'Historical' ? 'Historical Records' : `DEP #${caseNum}`;
		caseLabel.textContent = labelText;
		container.appendChild(caseLabel);
		
		// Add year/name label
		if (caseInfo[caseNum]) {
			const infoLabel = document.createElement('div');
			infoLabel.className = 'case-title';
			infoLabel.style.left = (firstEvent.x + 90) + 'px';
			infoLabel.style.color = caseColor;
			infoLabel.textContent = `${caseInfo[caseNum].year} ${caseInfo[caseNum].name}`;
			container.appendChild(infoLabel);
		}
		
		// Extend line for single ongoing cases
		const lastEvent = caseEvents[caseEvents.length - 1];
		if (caseEvents.length === 1 && caseEvents[0].originalEmoji !== '⏰') {
			const currentDate = new Date();
			const lineEndDate = currentDate > endDate ? endDate : currentDate;
			const daysFromStart = (lineEndDate - startDate) / (1000 * 60 * 60 * 24);
			const currentX = TIMELINE_LEFT_OFFSET + (daysFromStart * pixelsPerDay);
			
			drawExtensionLine(container, firstEvent, currentX);
		}
	});
}

// Draw extension line for ongoing cases
function drawExtensionLine(container, event, endX) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.style.position = 'absolute';
	svg.style.left = event.x + 'px';
	svg.style.width = (endX - event.x) + 'px';
	svg.style.height = '400px';
	svg.style.top = '0';
	svg.style.pointerEvents = 'none';
	svg.style.overflow = 'visible';
	
	const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	line.setAttribute('x1', '0');
	line.setAttribute('x2', (endX - event.x) + 'px');
	
	const y = getNodeCenterY(event.isPrivate);
	line.setAttribute('y1', y);
	line.setAttribute('y2', y);
	line.setAttribute('stroke', event.nodeColor);
	line.setAttribute('stroke-width', '4');
	line.setAttribute('stroke-opacity', '0.7');
	line.setAttribute('stroke-dasharray', '8 4');
	
	svg.appendChild(line);
	container.appendChild(svg);
}

// Update timeline statistics
function updateTimelineStats(events) {
	const stats = {
		criticalMoments: events.filter(e => e.markers && e.markers.includes('🟡')).length,
		missingDocs: events.filter(e => e.markers && e.markers.includes('❌')).length,
		privileged: events.filter(e => e.markers && e.markers.includes('🔒')).length,
		continuances: events.filter(e => e.markers && e.markers.includes('🐢')).length,
		totalEvents: events.length
	};
	
	const statsEl = document.getElementById('nav-stats');
	if (statsEl) {
		statsEl.innerHTML = `
			<div class="stat-item">
				<span class="stat-number">${stats.criticalMoments}</span>
				<span class="stat-label">Critical</span>
			</div>
			<div class="stat-item">
				<span class="stat-number">${stats.missingDocs}</span>
				<span class="stat-label">Missing</span>
			</div>
			<div class="stat-item">
				<span class="stat-number">${stats.privileged}</span>
				<span class="stat-label">Private</span>
			</div>
			<div class="stat-item">
				<span class="stat-number">${stats.continuances}</span>
				<span class="stat-label">Continued</span>
			</div>
			<div class="stat-item">
				<span class="stat-number">${stats.totalEvents}</span>
				<span class="stat-label">Total</span>
			</div>
		`;
	}
}


function updateCaseFilterText() {
	const checkboxes = document.querySelectorAll('#filter-case input[type="checkbox"]');
	const checkedBoxes = document.querySelectorAll('#filter-case input[type="checkbox"]:checked');
	const filterText = document.getElementById('case-filter-text');
	
	if (checkedBoxes.length === 0) {
		filterText.textContent = 'No cases selected';
	} else if (checkedBoxes.length === checkboxes.length) {
		filterText.textContent = 'All Cases';
	} else {
		filterText.textContent = `${checkedBoxes.length} cases selected`;
	}
}

/* --- reveal timeline helper --- */
function revealTimeline() {
	document.getElementById('loading')?.remove();
	document.getElementById('timeline-content')?.style.removeProperty('display');
}

/* --- scroll to first event helper --- */
function scrollToFirstEvent() {
	const cont = document.querySelector('.main-content');
	const first = document.querySelector('.event, .case-procedural');
	if (cont && first) {
		// centre first event with a little left margin
		cont.scrollLeft = Math.max(0, first.offsetLeft - 250);
	}
}

/* width + zoom helpers (from old inline script) */
function calculateAndApplyFitScale() {
    if (filteredEvents.length === 0) return;
    
    // Calculate available width accounting for container padding and timeline offset
    const containerPadding = 80; // 40px padding on each side from .container
    const rightMargin = 40; // Additional right margin
    const availableWidth = window.innerWidth - TIMELINE_LEFT_OFFSET - containerPadding - rightMargin;
    
    // Calculate required scale to fit timeline
    if (currentDateRange) {
        const { startDate, endDate, totalDays } = currentDateRange;
        // We don't need to account for the 300px padding because that's AFTER the timeline content
        const requiredScale = availableWidth / totalDays;
        
        // Clamp to slider range
        const clampedScale = Math.max(0.2, Math.min(3, requiredScale));
        
        // Update slider and render
        const scaleSlider = document.getElementById('scale-slider');
        const scaleValue = document.getElementById('scale-value');
        scaleSlider.value = clampedScale;
        scaleValue.textContent = clampedScale.toFixed(1);
        
        renderTimeline(filteredEvents, clampedScale);
    }
}

function applyScale(scale) {
    // Apply horizontal scale only - vertical height remains unchanged
    pixelsPerDay = scale;
    localStorage.setItem('timeline-scale', scale);
    renderTimeline();
    scrollToFirstEvent();
}

function initScaleControls() {
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValue = document.getElementById('scale-value');
    
    // Load saved scale from localStorage
    const savedScale = localStorage.getItem('timeline-scale');
    if (savedScale) {
        const scale = parseFloat(savedScale);
        scaleSlider.value = scale;
        scaleValue.textContent = scale.toFixed(1);
        pixelsPerDay = scale;
    }
    
    scaleSlider.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        scaleValue.textContent = scale.toFixed(1);
        
        // Save scale to localStorage
        localStorage.setItem('timeline-scale', scale);
        
        // Disable fit-to-window when manually adjusting scale
        document.getElementById('fit-to-window').checked = false;
        localStorage.setItem('timeline-fit-to-window', 'false');
        
        applyScale(scale);  // horizontal scale only - height unchanged
    });
    
    // Fit to window handler
    const fitToWindow = document.getElementById('fit-to-window');
    
    // Load saved fit-to-window preference
    const savedFitToWindow = localStorage.getItem('timeline-fit-to-window') === 'true';
    fitToWindow.checked = savedFitToWindow;
    
    fitToWindow.addEventListener('change', (e) => {
        localStorage.setItem('timeline-fit-to-window', e.target.checked);
        
        if (e.target.checked) {
            calculateAndApplyFitScale();
        } else {
            // Revert to saved scale or default
            const savedScale = localStorage.getItem('timeline-scale');
            const scale = savedScale ? parseFloat(savedScale) : 0.8;
            scaleSlider.value = scale;
            scaleValue.textContent = scale.toFixed(1);
            applyScale(scale);
        }
    });
    
    // Listen for window resize to maintain fit
    window.addEventListener('resize', () => {
        if (fitToWindow.checked) {
            calculateAndApplyFitScale();
        }
    });
}

// Filter control functions - exported for controls.js
function toggleCaseDropdown() {
	const dropdown = document.getElementById('case-filter-dropdown');
	dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function selectAllCases() {
	document.querySelectorAll('#filter-case input[type="checkbox"]').forEach(checkbox => {
		checkbox.checked = true;
	});
	updateCaseFilterText();
	applyFilters();
}

function clearAllCases() {
	document.querySelectorAll('#filter-case input[type="checkbox"]').forEach(checkbox => {
		checkbox.checked = false;
	});
	updateCaseFilterText();
	applyFilters();
}

function resetFilters() {
	// Reset dates
	const range = getDateRange(events);
	document.getElementById('filter-start-date').value = formatDateForInput(range.start);
	document.getElementById('filter-end-date').value = formatDateForInput(range.end);
	
	// Check all cases
	selectAllCases();
	
	// Clear localStorage
	localStorage.removeItem('timeline-filters');
}

// Export all control functions for controls.js
export { 
	toggleCaseDropdown, 
	selectAllCases, 
	clearAllCases, 
	resetFilters, 
	applyFilters,
	applyScale,
	calculateAndApplyFitScale
};

// State persistence
function saveFilterState() {
	const state = {
		cases: Array.from(document.querySelectorAll('#filter-case input:checked')).map(cb => cb.value),
		startDate: document.getElementById('filter-start-date').value,
		endDate: document.getElementById('filter-end-date').value
	};
	localStorage.setItem('timeline-filters', JSON.stringify(state));
}

function loadFilterState() {
	const saved = localStorage.getItem('timeline-filters');
	if (!saved) return;
	
	try {
		const state = JSON.parse(saved);
		
		// Restore case selections
		document.querySelectorAll('#filter-case input').forEach(checkbox => {
			checkbox.checked = state.cases.includes(checkbox.value);
		});
		
		// Restore dates
		if (state.startDate) {
			document.getElementById('filter-start-date').value = state.startDate;
		}
		if (state.endDate) {
			document.getElementById('filter-end-date').value = state.endDate;
		}
		
		updateCaseFilterText();
	} catch (e) {
		console.error('Failed to restore filter state:', e);
	}
}

// Utility functions
function formatDateForInput(date) {
	if (!date) return '';
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// Add mouse wheel horizontal scrolling - scoped to main-content only
document.addEventListener('DOMContentLoaded', () => {
	const mainContent = document.querySelector('.main-content');
	if (mainContent) {
		mainContent.addEventListener('wheel', (e) => {
			if (e.shiftKey) return;          // allow normal shift-wheel scrolling
			// Prevent vertical scrolling
			e.preventDefault();
			
			// Scroll horizontally instead
			mainContent.scrollLeft += e.deltaY;
		}, { passive: false });
	}
});

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
	const container = document.querySelector('.case-filter-container');
	if (container && !container.contains(event.target)) {
		const dropdown = document.getElementById('case-filter-dropdown');
		if (dropdown) dropdown.style.display = 'none';
	}
});