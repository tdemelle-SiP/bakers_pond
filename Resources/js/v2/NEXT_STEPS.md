# IMMEDIATE NEXT STEPS FOR TIMELINE V2

## Context for Next AI Session
You're taking over a partially working timeline refactor. The data loads and parses correctly, but visual positioning is completely broken.

## THE MAIN PROBLEM
We tried to be clever with HTML structure (separate containers for caseline/public/private sections) but it broke the absolute positioning math. Everything needs to be positioned absolutely from a single origin point.

## Quick Fixes Needed (30 min)

### 1. Fix Container Structure
All nodes should append to `#timeline-container`, NOT to `#caseline-container`, `#public-container`, or `#private-container`.

**Files to fix:**
- `timeline-nodes.js` line 44: Change back to `document.getElementById('timeline-container')`
- `caseline-nodes.js` line 40: Same change

### 2. Fix Y Positioning in CSS
Current CSS has wrong Y values. Should be:
```css
.caseline-node { top: 100px; }
.tracked-event { top: 185px; }  /* public/green */
.tracked-event-priv { top: 215px; } /* private/red */
.timeline-line { top: 200px; }
```

### 3. Test Positioning
After fixes, you should see:
- Caseline emojis in a row at Y=100px
- Green dots above the line at Y=185px  
- Black line at Y=200px
- Red dots below the line at Y=215px

## Remaining Work (2-3 hours)

### Priority 1: Get Continuance Toggle Working
This was the ORIGINAL GOAL that started this whole refactor!

1. Create `controls.js` module
2. Add continuance checkbox to legend
3. Toggle `hide-continuances` class on body
4. CSS already exists: `.hide-continuances .continuance { display: none }`

### Priority 2: Implement Filters
- Date range filtering (inputs exist in HTML)
- Case number filtering (dropdown exists)
- Update `main.js` to use filters

### Priority 3: Legend & Stats
- Show emoji key in header
- Show event counts

## What's Working Well
- **Module structure** is good - each file has single responsibility
- **Data pipeline** works perfectly (load → parse → events)
- **CSS organization** is clean and maintainable
- **Event identification** correctly separates timeline vs caseline

## What Failed
- **Over-engineering the HTML** - tried to be too clever with containers
- **Mixing positioning systems** - some absolute, some relative
- **Not testing incrementally** - built too much before checking positioning

## Architecture Decision
Keep the modular JS architecture but use SIMPLE HTML:
- One container for everything
- All absolute positioning
- Fixed Y coordinates for each row
- X calculated from dates

## Testing Checklist
- [ ] Timeline nodes appear at correct Y position
- [ ] Caseline nodes appear at correct Y position
- [ ] Connection lines connect the right nodes
- [ ] Year markers align with events
- [ ] Tooltips appear on hover
- [ ] Missing doc indicators (❌) show
- [ ] Date labels don't overlap too much
- [ ] Continuance toggle hides 🐢 nodes

## Remember
The original monolithic code WORKED. We're refactoring for AI comprehension, not to make it "better." Keep it simple, make it work, then optimize.