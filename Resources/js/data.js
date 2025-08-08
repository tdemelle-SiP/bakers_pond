/* js/data.js
 * Builds the events[] array from the Markdown table shipped with the page.
 * Exported as an async function so render.js can await it.
 * Tabs for indentation, verbose comments, no placeholders.
 */

export async function loadEvents() {
	// --- 1. fetch the markdown table ------------------------------------
	// The table lives in the root directory as !!42_Mill_St_Timeline_Overview.md
	const res = await fetch('/!!42_Mill_St_Timeline_Overview.md');
	if (!res.ok) throw new Error('Timeline markdown missing');
	const md = await res.text();

	// --- 2. split into lines, find the table header ----------------------
	const lines = md.split(/\r?\n/);
	const startIdx = lines.findIndex(l => l.includes('| Date | Document | Case #'));
	if (startIdx === -1) throw new Error('Timeline table header not found');

	const events = [];

	// --- 3. parse each table row into an event object --------------------
	for (let i = startIdx + 2; i < lines.length; i++) {		// +2 skips header + divider
		const row = lines[i].trim();
		if (!row || !row.startsWith('|')) continue;		// skip blank or non-table rows

		// Strip leading and trailing '|' then split on '|'
		const cols = row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());

		// Expected columns: Date | Document | Case # | Mrkr | Procedural | Environmental | Notes
		const [dateStr, document, caseNumber, markers, procedural, environmental, notes] = cols;

		// Parse the date
		const dateParts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
		let date = null;
		if (dateParts) {
			date = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]);
		}

		// Extract document URL if it's a markdown link
		let documentUrl = '';
		let documentTitle = document;
		const linkMatch = document.match(/\[([^\]]+)\]\(([^)]+)\)/);
		if (linkMatch) {
			documentTitle = linkMatch[1];
			documentUrl = linkMatch[2];
		}

		events.push({
			date,					// Date object
			dateStr,				// "2024-05-07"
			document,				// Full markdown link or plain text
			documentTitle,			// Just the title
			documentUrl,			// URL if exists
			caseNumber,				// "#338-0706"
			markers,				// "🟢🐢", etc.
			procedural,				// Procedural step text
			environmental,			// Environmental/Strategic analysis
			notes,					// Notes column
			
			// Computed flags for easy filtering
			isContinuance: markers.includes('🐢'),
			isPrivate: markers.includes('🔒'),
			isApproved: markers.includes('✅') || markers.includes('🟢'),
			isDenied: markers.includes('❌'),
			isPending: markers.includes('🟡') || markers.includes('⏰'),
			isHearing: markers.includes('🏛️'),
			isReview: markers.includes('🔍'),
			isExtension: markers.includes('♻️')
		});
	}

	// Sort by date
	events.sort((a, b) => {
		if (!a.date) return 1;
		if (!b.date) return -1;
		return a.date - b.date;
	});

	return events;
}

// Extract unique case numbers for filtering
export function getCaseNumbers(events) {
	const cases = new Set();
	events.forEach(event => {
		if (event.caseNumber && event.caseNumber.trim()) {
			cases.add(event.caseNumber.trim());
		}
	});
	return Array.from(cases).sort();
}

// Get date range of events
export function getDateRange(events) {
	const dates = events.filter(e => e.date).map(e => e.date);
	if (dates.length === 0) return { start: null, end: null };
	
	return {
		start: new Date(Math.min(...dates)),
		end: new Date(Math.max(...dates))
	};
}