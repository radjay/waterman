# PRD 06: Sunrise/Sunset Time Slot Filtering

**Version**: 2.1  
**Created**: 2026-01-29  
**Updated**: 2026-01-29  
**Status**: Draft

---

## Overview

Watersports should only be done during daylight hours. Currently, the scraper uses hardcoded hours (9 AM - 6 PM) to filter time slots, which doesn't account for actual sunrise/sunset times that vary by location and season.

This feature:
1. **Stores all timeslots** to the database (removes hardcoded filter from scraper)
2. **Filters at query/display time** using accurate sunrise/sunset calculations based on each spot's geographic coordinates
3. **Only scores and displays** timeslots that fall within daylight hours

---

## Problem Statement

### Current Behavior
- Scraper filters slots to 9 AM - 6 PM hardcoded hours (`lib/scraper.js` lines 96-103)
- Slots outside this range are **not stored** in the database
- This is inaccurate:
  - In summer, sunrise is ~6:00 AM and sunset ~9:00 PM (missing 5+ usable hours)
  - In winter, sunrise is ~7:45 AM and sunset ~5:30 PM (showing unusable dark hours)
- No consideration of spot location (all spots use the same hours)
- Historical data is lost for non-daylight hours

### Desired Behavior
- **Store all timeslots** to the database (remove hardcoded filter from scraper)
- **Filter at query/display time** - primarily show and score slots between sunrise and sunset
- Sunrise/sunset should be calculated per-spot based on coordinates
- "Best" slot selection should only consider daylight slots
- Scoring should only run on daylight slots
- Preserve all forecast data for potential future use (e.g., historical analysis)

### Display Rules for Contextual Slots

To provide useful temporal context, show one additional slot beyond daylight hours:

**For Windsports (wingfoiling, kitesurfing, etc.):**
- Show **one slot after sunset** (e.g., if sunset is 17:45, show the 18:00 slot)
- This helps users see the wind trend continuing into evening
- **Never mark this slot as "Best" or "Ideal"** - it's for context only
- Only show if there's a slot available immediately after sunset

**For Surfing:**
- Show **one slot before sunrise** (e.g., if sunrise is 7:45, show the 7:00 slot)
- This helps users see conditions leading into the morning session
- **Never mark this slot as "Best" or "Ideal"** - it's for context only
- Only show if there's a slot available immediately before sunrise

**Implementation Notes:**
- These contextual slots should be visually distinct: **50% opacity, 100% opacity on hover**
- They should not be included in "best" or "ideal" calculations
- **They should be scored**, but with sunrise/sunset information included in the scoring prompt to lower the score
- Contextual slot selection depends on selected sport(s):
  - If both surfing and windsports are selected: show both pre-sunrise (surfing) and post-sunset (windsports) slots
  - If only surfing is selected: show only pre-sunrise slot
  - If only windsports is selected: show only post-sunset slot
- Always exclude contextual slots from calendar feeds (only daylight slots in feeds)
- Show the **closest slot** to sunrise/sunset regardless of distance (not limited to 1-hour window)

---

## Data Requirements

### Spot Coordinates

Currently, 4 forecast spots are missing latitude/longitude:
| Spot | Windy ID | Status |
|------|----------|--------|
| Marina de Cascais | 8512151 | Missing coords |
| Lagoa da Albufeira | 8512085 | Missing coords |
| Carcavelos | 8512111 | Missing coords |
| Praia do Guincho | 20914 | Missing coords |

All 10 webcam-only spots already have coordinates.

### Coordinates to Add

| Spot | Latitude | Longitude |
|------|----------|-----------|
| Marina de Cascais | 38.6919 | -9.4203 |
| Lagoa da Albufeira | 38.5058 | -9.1728 |
| Carcavelos | 38.6775 | -9.3383 |
| Praia do Guincho | 38.7333 | -9.4733 |

---

## Technical Approach

### Option A: Filter at Scrape Time
Filter slots during scraping, before saving to database.

**Pros:**
- Less data stored in database
- No changes needed to frontend/API

**Cons:**
- Need to re-scrape to apply changes
- Spots without coordinates can't be filtered
- Historical data is lost
- Can't change filtering logic without re-scraping

### Option B: Filter at Query Time (Recommended)
Store all slots, filter when querying and scoring.

**Pros:**
- Historical data preserved
- Can change filtering logic without re-scraping
- More flexible for future features
- Scoring only runs on relevant slots (daylight hours)
- Can analyze patterns across all hours if needed

**Cons:**
- More data stored (acceptable trade-off)
- Need to update query paths (frontend, API, calendar, scoring)
- Slightly more complex

### Recommendation
**Option B** - Filter at query time. This preserves all forecast data and allows for more flexible filtering logic. The additional storage is minimal compared to the benefits of having complete historical data.

---

## Implementation Plan

### Phase 1: Add Missing Coordinates

**Task 1.1: Update spots with coordinates**
- Add `latitude` and `longitude` to the 4 missing spots
- Can be done via admin UI or direct database mutation

**Files affected:**
- None (data-only change)

### Phase 2: Create Sun Times Utility

**Task 2.1: Sun times helper (DONE)**
Already created at `lib/sun.js`:
```javascript
import SunCalc from 'suncalc';

export function getSunTimes(lat, lng, date = new Date()) {
    const times = SunCalc.getTimes(date, lat, lng);
    return {
        sunrise: times.sunrise,
        goldenHour: times.goldenHour,
        sunset: times.sunset,
        dusk: times.dusk,
    };
}
```

**Dependencies:**
- `suncalc` package (already installed)

### Phase 3: Remove Filter from Scraper

**Task 3.1: Remove hardcoded daylight filter from scraper**

Remove the 9 AM - 6 PM filter so all slots are stored to the database.

**Current code** (`lib/scraper.js`):
```javascript
// Check if it's daylight hours (9 AM - 6 PM)
const date = new Date(timestamp);
const hour = date.getHours();
const isDaylight = hour >= 9 && hour <= 18;

if (!isDaylight) {
    continue;
}
```

**New code:**
```javascript
// Remove this entire block - store all slots
// Filtering will happen at query/display time
```

**Files affected:**
- `lib/scraper.js`

### Phase 4: Add Daylight Filtering Utility

**Task 4.1: Create daylight filtering helper**

Create a utility function to check if a slot is within daylight hours.

**New file** (`lib/daylight.js`):
```javascript
import { getSunTimes } from './sun.js';

/**
 * Check if a timestamp falls within daylight hours for a given spot
 * @param {Date} timestamp - The slot timestamp
 * @param {Object} spot - Spot object with latitude/longitude
 * @returns {boolean} True if slot is within daylight hours
 */
export function isDaylightSlot(timestamp, spot) {
    if (!spot.latitude || !spot.longitude) {
        // Fallback: hardcoded 9 AM - 6 PM if no coordinates
        const hour = timestamp.getHours();
        return hour >= 9 && hour <= 18;
    }
    
    const sunTimes = getSunTimes(spot.latitude, spot.longitude, timestamp);
    return timestamp >= sunTimes.sunrise && timestamp <= sunTimes.sunset;
}

/**
 * Check if a slot should be shown as a contextual slot (one before sunrise for surfing, one after sunset for windsports)
 * @param {Date} timestamp - The slot timestamp
 * @param {Object} spot - Spot object with latitude/longitude
 * @param {string} sport - The sport type ('surfing' or 'wingfoil'/'kitesurfing' etc.)
 * @param {Array} allSlots - All slots for the day (to find adjacent slots)
 * @returns {boolean} True if this is a contextual slot
 */
export function isContextualSlot(timestamp, spot, sport, allSlots) {
    if (!spot.latitude || !spot.longitude) {
        return false; // No contextual slots if no coordinates
    }
    
    const sunTimes = getSunTimes(spot.latitude, spot.longitude, timestamp);
    const isSurfing = sport === 'surfing';
    
    if (isSurfing) {
        // For surfing: show the closest slot before sunrise (regardless of distance)
        const slotsBeforeSunrise = allSlots.filter(s => 
            new Date(s.timestamp) < sunTimes.sunrise
        );
        
        if (slotsBeforeSunrise.length === 0) return false;
        
        // Find the slot closest to sunrise (latest slot before sunrise)
        const closestBeforeSunrise = slotsBeforeSunrise.reduce((closest, current) => {
            return new Date(current.timestamp) > new Date(closest.timestamp) ? current : closest;
        });
        
        return new Date(closestBeforeSunrise.timestamp).getTime() === timestamp.getTime();
    } else {
        // For windsports: show the closest slot after sunset (regardless of distance)
        const slotsAfterSunset = allSlots.filter(s => 
            new Date(s.timestamp) > sunTimes.sunset
        );
        
        if (slotsAfterSunset.length === 0) return false;
        
        // Find the slot closest to sunset (earliest slot after sunset)
        const closestAfterSunset = slotsAfterSunset.reduce((closest, current) => {
            return new Date(current.timestamp) < new Date(closest.timestamp) ? current : closest;
        });
        
        return new Date(closestAfterSunset.timestamp).getTime() === timestamp.getTime();
    }
}
```

**Files affected:**
- `lib/daylight.js` (new file)

### Phase 5: Update Scoring to Filter by Daylight

**Task 5.1: Filter slots before scoring**

Only score slots that are within daylight hours, plus contextual slots.

**Files affected:**
- `convex/spots.ts` (scoring functions)
- `convex/crons.ts` (scoring cron jobs)

**Task 5.2: Update scoring queries**

Modify scoring queries to process daylight slots and contextual slots.

**Task 5.3: Include sunrise/sunset in scoring prompt for contextual slots**

When scoring contextual slots, include sunrise/sunset times in the prompt to inform the LLM that conditions are outside daylight hours, which should lower the score.

**Implementation:**
- For pre-sunrise slots: Include sunrise time in prompt with note that slot is before daylight
- For post-sunset slots: Include sunset time in prompt with note that slot is after daylight
- This allows the LLM to appropriately penalize non-daylight conditions

**Files affected:**
- `convex/spots.ts` (scoring prompt generation)

### Phase 6: Update Query Functions

**Task 6.1: Filter slots in Convex queries**

Update all Convex queries that return slots to filter by daylight hours.

**Files affected:**
- `convex/spots.ts` (getForecastSlots, etc.)
- `convex/calendar.ts` (getSportFeed)

**Task 6.2: Filter slots in frontend**

Update frontend components to filter slots by daylight (as backup, though backend should handle this).

**Files affected:**
- `app/HomeContent.js`
- `app/[sport]/[filter]/page.js`
- `app/calendar/page.js`

**Task 6.3: Implement contextual slot display**

Add logic to show one contextual slot (pre-sunrise for surfing, post-sunset for windsports) and ensure they're never marked as "Best" or "Ideal".

**Implementation:**
- Use `isContextualSlot()` helper to identify contextual slots (per sport)
- For multi-sport spots: if both surfing and windsports selected, show both contextual slots
- Mark contextual slots with a flag (e.g., `isContextual: true`)
- Exclude contextual slots from ideal/best calculations in `markIdealSlots()`
- Style contextual slots: **50% opacity, 100% opacity on hover**
- Contextual slots are scored (with sunrise/sunset info in prompt to lower score) but excluded from ideal/best
- Always exclude contextual slots from calendar feeds

**Files affected:**
- `lib/slots.js` (markIdealSlots function)
- `components/forecast/DaySection.js` (display logic)
- `components/forecast/ForecastSlot.js` (styling for contextual slots - opacity)

### Phase 7: Testing

**Task 7.1: Verify sun times calculation**
- Test script already exists at `scripts/test-sunrise.mjs`
- Verify times match expected values for Portugal

**Task 7.2: Test scraping stores all slots**
- Manually trigger scrape
- Verify all timeslots (including night hours) are stored in database
- Check database to confirm slots outside 9 AM - 6 PM are present

**Task 7.3: Test daylight filtering**
- Verify slots are filtered correctly at query time
- Check edge cases (early morning, late evening)
- Verify scoring runs on daylight slots and contextual slots (new scrapes only)

**Task 7.4: Verify frontend display**
- Confirm no dark-hour slots appear in UI (except contextual slots)
- Confirm "best" slots are within daylight
- Verify calendar feeds only include daylight slots (no contextual slots)
- Verify contextual slots have 50% opacity, 100% on hover

**Task 7.5: Test contextual slots**
- Verify one slot after sunset appears for windsports (closest slot regardless of distance)
- Verify one slot before sunrise appears for surfing (closest slot regardless of distance)
- Test multi-sport spots: verify both contextual slots appear when both sports selected
- Test single-sport spots: verify only appropriate contextual slot appears
- Confirm contextual slots are never marked as "Best" or "Ideal"
- Verify contextual slots are scored with sunrise/sunset info in prompt
- Test edge cases: no slot available, slots far from sunrise/sunset

---

## Edge Cases

### 1. Spot Without Coordinates
**Behavior:** Fall back to hardcoded 9 AM - 6 PM filter  
**Future:** Require coordinates for all forecast spots

### 2. Polar Regions (24-hour daylight/darkness)
**Behavior:** Not applicable (all spots are in Portugal)  
**Future:** Handle gracefully if expanding to other regions

### 3. Slots Exactly at Sunrise/Sunset
**Behavior:** Include slots at or after sunrise, exclude slots at or after sunset  
**Rationale:** Sunset is when darkness begins, so activity should end before

### 4. DST Transitions
**Behavior:** `suncalc` handles timezone automatically via JavaScript Date  
**Note:** Spots have timezone stored (`Europe/Lisbon`)

### 5. Contextual Slots Edge Cases
**No slot available before/after:**
- If no slot exists before sunrise (for surfing) or after sunset (for windsports), don't show any contextual slot
- Show the closest slot regardless of distance (could be 1 hour, 2 hours, or more away)

**Multiple slots before/after:**
- Show only the closest slot to sunrise (for surfing) or sunset (for windsports)
- Closest = latest slot before sunrise, or earliest slot after sunset

**Multi-sport spots:**
- If both surfing and windsports are selected: show both pre-sunrise (surfing) and post-sunset (windsports) contextual slots
- If only one sport is selected: show only the appropriate contextual slot for that sport

**Contextual slot scoring:**
- Contextual slots are scored with sunrise/sunset information in the prompt (to lower score)
- Must be excluded from ideal/best calculations
- Should never appear in calendar feeds (only daylight slots)

---

## API Impact

### Changes Required
The filtering happens at query time, so all query paths need to filter by daylight:

**Backend Changes:**
- `/api/conditions/[sport]/[filter]` - Filter slots by daylight, include contextual slots based on selected sport(s)
  - If both sports selected: include both pre-sunrise (surfing) and post-sunset (windsports) contextual slots
  - If only one sport: include only the appropriate contextual slot
- `/api/calendar/[sport]/feed.ics` - Only include daylight slots (always exclude contextual slots)
- Convex queries (`convex/spots.ts`) - Filter slots in all query functions, include contextual slots per sport
- Scoring functions - Score daylight slots and contextual slots (with sunrise/sunset info in prompt for contextual), exclude contextual from ideal/best

**Frontend Changes:**
- Frontend components should also filter as a safety measure (though backend handles primary filtering)
- Display logic should respect daylight filtering and show contextual slots based on selected sport(s)
- Contextual slots should be styled with **50% opacity, 100% opacity on hover**
- Contextual slots should be excluded from ideal/best calculations

All downstream consumers will receive correctly filtered data, but the filtering logic is now centralized in query functions rather than at scrape time.

---

## Database Changes

### Schema Changes
None required. `latitude` and `longitude` fields already exist in spots table.

### Data Changes
Add coordinates to 4 spots (one-time data migration).

---

## Rollout Plan

1. **Add coordinates** to missing spots (data change only)
2. **Deploy code changes**:
   - Remove filter from scraper (store all slots)
   - Add daylight filtering utility
   - Update scoring to filter by daylight (include contextual slots with sunrise/sunset in prompt)
   - Update all query functions to filter by daylight and include contextual slots
3. **Trigger manual scrape** to populate database with all timeslots
4. **Verify** in UI that:
   - All slots are stored in database
   - Only daylight slots (plus contextual slots) are displayed
   - Only daylight slots and contextual slots are scored (new scrapes only)
   - Calendar feeds only include daylight slots (no contextual slots)
   - Contextual slots have 50% opacity styling

## Migration Notes

**Scoring Strategy:**
- **Only new scrapes** will be scored going forward
- No retroactive scoring of existing slots
- Existing slots in database will remain as-is (scored or unscored)
- New scrapes will score all daylight slots plus contextual slots

**Historical Data:**
- All existing slots remain in database
- Previously filtered slots (outside 9 AM - 6 PM) will not be retroactively scored
- New scrapes will include all timeslots and score appropriately

---

## Success Criteria

1. ✅ All forecast spots have latitude/longitude coordinates
2. ✅ Scraper stores **all** timeslots to database (no filtering at scrape time)
3. ✅ Query functions filter slots based on actual sunrise/sunset times
4. ✅ Scoring only runs on daylight slots
5. ✅ Primary display shows slots between sunrise and sunset
6. ✅ **Contextual slots are shown:**
   - One slot after sunset for windsports (wind trend context) - closest slot regardless of distance
   - One slot before sunrise for surfing (conditions context) - closest slot regardless of distance
   - If both sports selected: show both contextual slots
   - If only one sport: show only the appropriate contextual slot
7. ✅ **Contextual slots are never marked as "Best" or "Ideal"**
8. ✅ Contextual slots are visually distinct: **50% opacity, 100% opacity on hover**
9. ✅ Contextual slots are scored with sunrise/sunset info in prompt (to lower score)
10. ✅ Contextual slots are always excluded from calendar feeds
11. ✅ "Best" slot calculations only consider daylight hours
12. ✅ Summer shows more available hours than winter
13. ✅ Fallback works for spots without coordinates (hardcoded 9 AM - 6 PM)
14. ✅ All historical forecast data is preserved in database
15. ✅ Only new scrapes are scored (no retroactive scoring of existing slots)

---

## Future Enhancements

### Display Sun Times in UI
Show sunrise/sunset times in the forecast view header for each day.

### Golden Hour Highlighting
Mark slots during golden hour (before sunset) as particularly scenic.

### Dawn Patrol Support
Optionally include pre-sunrise slots for early morning surfers (civil twilight).

---

## Appendix

### Sun Times for Cascais (Reference)

| Month | Sunrise | Sunset | Daylight Hours |
|-------|---------|--------|----------------|
| January | ~7:45 | ~17:30 | ~9h 45m |
| April | ~7:00 | ~20:15 | ~13h 15m |
| July | ~6:15 | ~21:00 | ~14h 45m |
| October | ~7:45 | ~18:45 | ~11h 00m |

### Dependency
- `suncalc` npm package (MIT license, widely used, well-maintained)
