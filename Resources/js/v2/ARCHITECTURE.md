# Timeline v2 Architecture & Implementation Plan

## CRITICAL LESSONS LEARNED (2025-08-08)

### What Went Wrong Initially
1. **Container Structure Confusion**: Initial attempt mixed relative and absolute positioning
2. **Misunderstood Layout**: Thought caseline was a separate horizontal band at Y=100px
3. **Coordinate System Mismatch**: Used `left: 200px` on containers, breaking absolute positioning

### What We Learned
1. **Two-Section Layout**: Caseline (55% vertical) and Timeline (45% vertical) are separate sections
2. **Shared Y Positions**: Both sections have public events above and private events below their dividing lines
3. **Public vs Private Story**: The visual separation shows how applicants manipulate filing procedures in non-public forums
4. **Absolute X, Relative Y**: Use absolute positioning for X (dates) but percentage-based Y within sections

### Current State (IN PROGRESS)
- Data loading: ✅ Working (131 events loading correctly)
- Event parsing: ✅ Working (69 timeline, 62 caseline events)
- Visual rendering: ⚠️ IMPROVED - two sections showing, needs Y position refinement
- Legend: ✅ Created and integrated
- Stats: ✅ Created and integrated
- Positioning: ⚠️ Nodes appearing but need better vertical separation from dividing line

### Solution Approach
Use two container sections (caseline and timeline) for vertical composition while maintaining absolute horizontal positioning for all nodes based on dates. Each section has its own dividing line between public/private.

## Overview
Refactoring the monolithic timeline code (1479 lines) into small, focused modules that are AI-friendly and maintainable.

## Source Files to Reference
- **Original monolith**: `/Resources/timeline-auto-generated-old.html` (lines 79-1461)
- **Partially refactored**: `/Resources/js/render.js`, `data.js`, `controls.js`, `legend.js`
- **Styles**: `/Resources/timeline-styles.css`

## Core Requirements (User Specification Summary)

### Key Functionality Overview
- Data source: `!!42 Mill St Timeline Overview.md`
- Two visual sections: Caseline and Public/Private Timeline
- Mouse wheel scrolls timeline horizontally
- Date determines horizontal position on timeline

### Public/Private Timeline
- **Source**: Items with 🟢 in mrkr column
- **Visual representation**:
  - Green dots for public events (above dividing line)
  - Red dots for private events with 🔒 (below dividing line)
  - Shows public vs private meetings to reveal manipulation patterns
- **Labels**: mm/dd format (above for public, below for private)
- **Missing docs**: ❌ indicator positioned with node
- **Interactivity**: Tooltips with document info, clickable links to files

### Caseline
- **Source**: Items with emojis other than 🟢, 🔒, ❌
- **Labels**: Default from emoji config OR **bold text** override from procedural column
- **Features**: Leader lines, collision detection
- **Interactivity**: Tooltips with document title/date, clickable links

### Sticky Header Components
- Back to README link
- Summary data counts
- Emoji key/legend with continuance toggle (🐢 visibility)
- Case # filter dropdown
- Date range filter
- Scale slider for zoom control
- Fit-to-window button (responsive to case filter changes)

## Core Requirements (from original specification)

### Data Flow
1. Data comes from `../!!42_Mill_St_Timeline_Overview.md`
2. Table has columns: `Date | Document | Case # | Mrkr | Procedural | Environmental | Notes`

### Two Visual Sections (Both Show Public vs Private)
1. **Caseline Section (Upper 55%)**
   - Events with procedural emojis (⭐, ✅, ⛔, 📐, 🔍, 🐢, 🏛️, etc.)
   - Shows emoji as node
   - Public events positioned above the section's dividing line
   - Private events (or those with 🔒) positioned below the dividing line
   - Label from emoji config OR **bold text** in procedural column
   - Leader lines from labels to nodes
   - Collision detection for labels
   - Tooltips and document links

2. **Timeline Section (Lower 45%)**
   - Events with 🟢 in mrkr column
   - Green dots (public) above the section's dividing line
   - Red dots (private with 🔒) below the section's dividing line
   - Shows mm/dd labels (clustered to avoid overlap)
   - ❌ indicator for missing documents
   - Tooltips with document info
   - Clickable links to documents

### Controls
- Date range filter
- Case number filter (multi-select dropdown)
- Scale slider (0.2 to 3.0)
- Fit-to-window button
- Continuance (🐢) visibility toggle
- Horizontal scroll with mouse wheel

### Visual Constants
```javascript
TIMELINE_LEFT_OFFSET = 200  // Starting X position for date calculations

// Original absolute Y positions (for reference)
ORIGINAL_Y = {
    public: 115,        // Public events in original
    private: 140,       // Private events in original
}

// New percentage-based Y positions within sections
SECTION_Y = {
    publicPercent: 35,  // 35% down from top of section (well above center)
    privatePercent: 65, // 65% down from top of section (well below center)
    dividerPercent: 50, // Dividing line at center of each section
}

// Label positioning
LABEL_GAPS = {
    above: 25,          // Gap between node and label above
    below: 30           // Gap between node and label below
}
```

## Module Architecture

### 1. `data-loader.js` (~50 lines)
**References**: `data.js` lines 10-13
- `loadTableData()` - Fetches markdown file with cache busting
- `extractTableRows()` - Finds table and returns row strings

### 2. `event-parser.js` (~100 lines)
**References**: `timeline-auto-generated-old.html` lines 483-592, `data.js` lines 20-79
- `parseTableRow(row)` - Converts single row to event object
- `parseEvents(rows)` - Processes all rows
- Extracts: date, document title/URL, case number, markers
- Identifies: timeline events (🟢), caseline events (other emojis)
- Extracts **bold** labels from procedural column
- Returns event objects with all necessary properties

### 3. `timeline-nodes.js` (~150 lines)
**References**: `timeline-auto-generated-old.html` lines 804-863
- `renderTimelineNodes(events, container, scale)`
- Creates green/red dots based on public/private
- Positions using `date-scale.js`
- Adds date labels with clustering (lines 865-914)
- Adds ❌ indicators for missing docs
- Creates tooltips and clickable links

### 4. `caseline-nodes.js` (~150 lines)
**References**: `timeline-auto-generated-old.html` lines 985-1046, 1187-1296
- `renderCaselineNodes(events, container, scale)`
- Renders emoji nodes on caseline
- Extracts label text (emoji config or **bold** override)
- Creates tooltips with document info
- Makes nodes clickable if URL exists
- Adds `.continuance` class for 🐢 nodes

### 5. `label-layout.js` (~100 lines)
**References**: `timeline-auto-generated-old.html` lines 1051-1183
- `layoutLabels(labelElements, container)`
- Collision detection algorithm (bidirectional adjustment)
- `measureLabel(text)` - Gets actual rendered dimensions
- `drawLeaderLine(label, node)` - SVG line from label to node

### 6. `connections.js` (~100 lines)
**References**: `timeline-auto-generated-old.html` lines 916-984, 1299-1416
- `drawTimelineConnections(events, container)` - Lines between timeline events
- `drawCaselineConnections(events, container)` - Lines between case events
- `drawVerticalConnections(events, container)` - Same-day vertical lines
- Different colors for public (green) vs private (red)

### 7. `date-scale.js` (~100 lines)
**References**: `timeline-auto-generated-old.html` lines 693-771
- `calculateDateRange(events)` - Gets min/max with 60-day padding
- `getXPosition(date, startDate, pixelsPerDay)` - Date to X coordinate
- `drawYearMarkers(container, dateRange, scale)` - Year lines and labels

### 8. `filters.js` (~150 lines)
**References**: `timeline-auto-generated-old.html` lines 382-454
- `filterByDate(events, startDate, endDate)`
- `filterByCase(events, selectedCases)`
- `applyFilters(events, filterState)` - Combined filtering
- Returns filtered event array

### 9. `controls.js` (~100 lines)
**References**: `timeline-auto-generated-old.html` lines 304-381, 455-481
- `initDateControls(onUpdate)` - Date range inputs
- `initCaseControls(cases, onUpdate)` - Case dropdown
- `initScaleControls(onUpdate)` - Scale slider
- `initFitToWindow(calculateFn)` - Fit button
- `initContinuanceToggle()` - 🐢 visibility

### 10. `legend.js` (~50 lines)
**References**: `timeline-auto-generated-old.html` lines 605-677
- `renderLegend(container)` - Creates emoji key tables
- Includes continuance checkbox in legend

### 11. `stats.js` (~50 lines)
**References**: `timeline-auto-generated-old.html` lines 1419-1452
- `calculateStats(events)` - Counts by type
- `renderStats(container, stats)` - Updates header display

### 12. `main.js` (~100 lines)
**References**: Overall flow from `timeline-auto-generated-old.html` lines 162-202
- Orchestrates all modules
- Manages application state
- Handles update/render cycle
- Initializes mouse wheel scrolling

## Implementation Strategy

### Phase 1: Core Data Pipeline (Current)
1. ✅ Create HTML structure
2. ⏳ `data-loader.js` - Get markdown
3. ⏹ `event-parser.js` - Parse to events
4. ⏹ `main.js` - Basic orchestration

### Phase 2: Visual Rendering
5. ⏹ `date-scale.js` - Positioning system
6. ⏹ `timeline-nodes.js` - Timeline dots
7. ⏹ `caseline-nodes.js` - Caseline emojis
8. ⏹ `connections.js` - All lines

### Phase 3: Interactivity
9. ⏹ `label-layout.js` - Label positioning
10. ⏹ `filters.js` - Event filtering
11. ⏹ `controls.js` - User controls
12. ⏹ `legend.js` - Legend rendering
13. ⏹ `stats.js` - Statistics

### Phase 4: Testing & Polish
14. ⏹ Test each module independently
15. ⏹ Verify continuance toggle works
16. ⏹ Test all filters
17. ⏹ Performance optimization

## Key Improvements Over Original

1. **Module size**: No file over 150 lines (vs 1479)
2. **Single responsibility**: Each module does ONE thing
3. **Clear interfaces**: Explicit function parameters and returns
4. **AI-friendly**: Each module fits in context window
5. **Testable**: Can verify each piece independently
6. **Maintainable**: Changes isolated to specific modules

## Critical Implementation Notes

### Continuance Toggle (The Original Problem)
```javascript
// In caseline-nodes.js - CLEAR identification
if (event.emoji === '🐢') {
    node.classList.add('continuance');
}

// In controls.js - SIMPLE toggle
document.body.classList.toggle('hide-continuances', !checked);

// CSS already handles hiding
.hide-continuances .continuance { display: none; }
```

### Emoji Configuration
Must preserve the original emoji mappings from line 87-98 of original file.

### Date Clustering Algorithm  
The complex label clustering from lines 865-914 needs careful extraction.

### Case Connection Lines
The case-specific colors and connection logic from lines 1299-1416.

## CRITICAL DESIGN DECISIONS

### The Solution Path
1. **Two-Section Container Approach**: Caseline section (55%) and Timeline section (45%) stack vertically
2. **Hybrid Positioning**: 
   - Absolute positioning for X (dates): `left: getXPosition()` 
   - Percentage-based Y within sections: `top: 35%` (public) or `top: 65%` (private)
3. **Section-Relative Y Positions**:
   - Each section has its own dividing line at 50%
   - Public events: 35% down from section top
   - Private events: 65% down from section top
   - This creates clear visual separation showing public vs private manipulation

### Current Module Status

#### ✅ WORKING MODULES
- `data-loader.js` - Fetches markdown, extracts table rows
- `event-parser.js` - Parses events correctly, identifies timeline vs caseline
- `date-scale.js` - Calculates positions and date ranges
- `legend-v2.js` - Emoji key in header with continuance toggle
- `stats.js` - Event counts in header display

#### ✅ RECENTLY COMPLETED
- `filters.js` - Date/case filtering fully implemented
- `controls-v2.js` - Scale, date inputs, case dropdown, fit-to-window all working

#### ⚠️ IN PROGRESS MODULES  
- `timeline-nodes.js` - Working but Y positioning could be refined
- `caseline-nodes.js` - Working but Y positioning could be refined
- `connections.js` - SVG positioning needs adjustment for two-section layout

#### 📝 NOT YET IMPLEMENTED
- `label-layout.js` - Collision detection for caseline labels

### Key Implementation Details

#### Event Structure (WORKING)
```javascript
{
  eventType: 'timeline' | 'caseline',
  eventClass: 'tracked-event' | 'tracked-event-priv' | 'case-procedural',
  isPrivate: boolean,
  caselineEmoji: '⭐' | '✅' | etc,
  proceduralLabel: "APPROVED" // from **text** in markdown
}
```

#### Positioning Formula (CRITICAL)
```javascript
const x = TIMELINE_LEFT_OFFSET + (daysFromStart * pixelsPerDay);
// TIMELINE_LEFT_OFFSET = 200
// DEFAULT_SCALE = 0.8
```

### The Continuance Toggle (Original Goal)
Implementation status:
1. Nodes get `.continuance` class ✅ (in caseline-nodes.js)
2. CSS rule exists: `.hide-continuances .continuance { display: none }` ✅  
3. Toggle checkbox in legend ✅ (in legend-v2.js)
4. Body class toggling on checkbox change ✅ (in legend-v2.js)

## Success Criteria

1. ✅ Continuance toggle works (implemented in legend-v2.js)
2. ✅ Any single feature change requires editing MAX 2 files
3. ✅ AI can understand any module without additional context
4. ⚠️ Most functionality preserved (filters and controls pending)
5. ✅ No module exceeds 150 lines (all modules under limit)