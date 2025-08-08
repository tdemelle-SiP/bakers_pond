/* js/data.js
 * Builds the events[] array from the Markdown table shipped with the page.
 * Exported as an async function so render.js can await it.
 * Tabs for indentation, verbose comments, no placeholders.
 */

export async function loadEvents() {
	// --- 1. fetch the markdown table ------------------------------------
	// The table lives in the parent directory as !!42_Mill_St_Timeline_Overview.md
	const res = await fetch('../!!42_Mill_St_Timeline_Overview.md?v=' + Date.now());
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
		let documentUrl = null;
		let documentTitle = document;
		const linkMatch = document.match(/\[([^\]]+)\]\(([^)]+)\)/);
		if (linkMatch) {
			documentTitle = linkMatch[1];
			documentUrl = linkMatch[2];
		} else {
			// Try simpler format without URL
			const simpleLinkMatch = document.match(/\[([^\]]+)\]/);
			if (simpleLinkMatch) {
				documentTitle = simpleLinkMatch[1];
			}
		}
		
		// Clean up title
		documentTitle = documentTitle.replace(/_/g, ' ')
			.replace(/MISSING:/g, '❌ ')
			.replace(/\.txt$/g, '')
			.replace(/\.pdf$/g, '');

		// Check for label override in procedural text
		let proceduralLabel = null;
		const labelMatch = procedural.match(/\*\*([^*]+)\*\*/);
		if (labelMatch) {
			proceduralLabel = labelMatch[1];
		}
		
		// Extract display detail (remove bold markers, trim to 100 chars)
		const displayDetail = procedural.replace(/\*\*/g, '').trim().substring(0, 100);
		
		// Determine if this is a timeline event (has 🟢)
		const isTimelineEvent = markers.includes('🟢');
		
		// Find main emoji for caseline events (not 🔒, ❌, or 🟢)
		const emojiRegex = /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2B00}-\u{2BFF}]|[\u{23F0}-\u{23FF}])[\u{FE0F}]?/gu;
		const allEmojis = markers.match(emojiRegex);
		const caselineEmoji = allEmojis ? allEmojis.find(e => e !== '🔒' && e !== '❌' && e !== '🟢') : null;
		
		// Determine event class
		let eventClass = '';
		if (isTimelineEvent) {
			eventClass = markers.includes('🔒') ? 'tracked-event-priv' : 'tracked-event';
		} else if (caselineEmoji) {
			eventClass = 'case-procedural';
		}
		
		events.push({
			date,					// Date object
			dateStr,				// "2024-05-07"
			title: documentTitle,	// Clean title for display
			document,				// Full markdown link or plain text
			documentTitle,			// Just the title
			documentUrl,			// URL if exists
			caseNumber: caseNumber.trim(),	// Clean case number
			markers,				// "🟢🐢", etc.
			procedural,				// Procedural step text
			proceduralLabel,		// Override label from **text**
			detail: procedural.trim(),	// Full detail text
			displayDetail,			// Shortened display version
			environmental,			// Environmental/Strategic analysis
			notes,					// Notes column
			eventClass,				// Event classification
			caselineEmoji,			// Main emoji for caseline events
			
			// Computed flags for easy filtering
			isContinuance: markers.includes('🐢'),
			isPrivate: markers.includes('🔒'),
			hasMissingDoc: markers.includes('❌'),
			isTimelineEvent,
			isApproved: markers.includes('✅') || markers.includes('🟢'),
			isDenied: markers.includes('⛔'),
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