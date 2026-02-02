# Product Requirements Document (PRD)

## Session Journal - Watersports Logbook

**Version:** 1.0  
**Date:** 2026-02-02  
**Status:** Draft

---

## Overview

Enable users to log their watersports sessions (wingfoiling and surfing) with details about location, time, duration, rating, and notes. Each journal entry creates a personal record of the session that can be compared against the forecasted conditions (if available). This helps users build a history of their sessions and contributes to understanding how accurate forecasts are for real-world conditions.

The journal serves two purposes:
1. **Personal logbook**: Track sessions, progress, and experiences over time
2. **Live condition reporting**: Document actual conditions that can be compared to forecasts

---

## Goals

1. **Session Logging**: Allow users to record watersports sessions (wingfoiling, surfing) with key details
2. **Multi-Sport Support**: Each entry specifies the sport for proper categorization and filtering
3. **Custom Locations**: Support logging sessions at spots we don't track (custom location entry)
4. **Forecast Comparison**: Show forecasted conditions alongside the entry when available
5. **Condition Reporting**: Capture real-world condition observations for forecast validation
6. **Session History**: Provide a chronological view of past sessions, filterable by sport
7. **Simple UX**: Quick and easy to log a session (< 2 minutes)

---

## Non-Goals (V1)

- Statistics and analytics (average session length, favorite spots, etc.)
- Session sharing or social features
- Photo/video attachments
- Equipment tracking per session
- GPS tracking or automatic session detection
- Forecast accuracy scoring or feedback loop

---

## Key Concepts

### Session Entry

A journal entry records a single watersports session with:
- **Sport**: Which sport (wingfoil or surfing)
- **Location**: Either a known spot from our database or a custom location
- **Date & Time**: When the session started
- **Duration**: How long the session lasted (in minutes)
- **Rating**: Overall session rating (1-5 stars)
- **Session Notes**: Free-form text about how the session went (personal experience)
- **Conditions Notes**: Free-form text about actual conditions observed (wind, chop, swell, etc.)

### Forecast Reference

When a session is logged at a tracked spot, we link to the actual forecast slot(s) from our database for that time window:
- Primary slot: The forecast slot closest to session start time
- Additional slots: Optionally, slots covering the session duration (e.g., if session is 2 hours, include slots within that window)

This creates a reference point for comparing what was predicted vs. what the user experienced. By linking to actual slots (rather than copying data), we:
- Avoid data duplication
- Can display the condition score that was calculated for that slot
- Maintain data integrity with our forecast history

### Custom Locations

Users may session at spots we don't track. For these:
- User enters a location name (free text)
- Optionally: coordinates (lat/lng) for potential future features
- No forecast comparison available

---

## Requirements

### 1. Data Model

#### 1.1 New Table: `session_entries`

```typescript
session_entries: defineTable({
    userId: v.id("users"),
    
    // Sport type
    sport: v.string(), // "wingfoil" | "surfing"
    
    // Location - either a spot reference or custom location
    spotId: v.optional(v.id("spots")), // Reference to known spot (null for custom)
    customLocation: v.optional(v.string()), // Name of custom location (free text)
    
    // Session timing
    sessionDate: v.number(), // Epoch ms of session start
    durationMinutes: v.number(), // Duration in minutes
    
    // Rating (1-5 stars)
    rating: v.number(),
    
    // Notes
    sessionNotes: v.optional(v.string()), // Personal session experience
    conditionNotes: v.optional(v.string()), // Observed conditions (live report)
    
    // Forecast references (links to actual scraped/scored data)
    // Captured at creation time, not updated on edit
    forecastSlotIds: v.optional(v.array(v.id("forecast_slots"))), // Slots covering session time
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "sessionDate"])
    .index("by_user_sport", ["userId", "sport"])
    .index("by_spot", ["spotId"])
    .index("by_user_spot", ["userId", "spotId"]);
```

**Design Decisions:**
- `spotId` is optional to support custom locations
- `customLocation` allows free-text location entry
- `forecastSnapshot` captures forecast at time of entry for historical reference
- Separate notes fields for personal experience vs. condition observations
- Duration in minutes for flexibility (user can enter 45, 90, 120, etc.)

### 2. Backend Implementation

#### 2.1 New Convex Functions

**File: `convex/journal.ts`**

**Mutations:**

```typescript
// Create a new session entry
export const createEntry = mutation({
    args: {
        sessionToken: v.string(),
        // Sport type
        sport: v.string(), // "wingfoil" | "surfing"
        // Location (one of these required)
        spotId: v.optional(v.id("spots")),
        customLocation: v.optional(v.string()),
        // Session details
        sessionDate: v.number(), // Epoch ms
        durationMinutes: v.number(),
        rating: v.number(), // 1-5
        sessionNotes: v.optional(v.string()),
        conditionNotes: v.optional(v.string()),
    },
    returns: v.id("session_entries"),
    handler: async (ctx, args) => {
        // 1. Verify session
        // 2. Validate sport (must be "wingfoil" or "surfing")
        // 3. Validate location (must have spotId OR customLocation)
        // 4. Validate rating (1-5)
        // 5. Validate duration (positive number, max 8 hours)
        // 6. If spotId provided, find forecast slots for session time window
        //    - Call findForecastSlotsForSession(ctx, spotId, sessionDate, durationMinutes)
        //    - Store IDs in forecastSlotIds
        // 7. Create entry
        // 8. Return entry ID
    },
});

// Update an existing session entry
export const updateEntry = mutation({
    args: {
        sessionToken: v.string(),
        entryId: v.id("session_entries"),
        // All fields optional - only update what's provided
        sport: v.optional(v.string()),
        spotId: v.optional(v.id("spots")),
        customLocation: v.optional(v.string()),
        sessionDate: v.optional(v.number()),
        durationMinutes: v.optional(v.number()),
        rating: v.optional(v.number()),
        sessionNotes: v.optional(v.string()),
        conditionNotes: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // 1. Verify session
        // 2. Verify user owns this entry
        // 3. Validate any provided fields
        // 4. NOTE: forecastSlotIds is NOT updated - it stays as captured at creation
        // 5. Update entry with provided fields
        // 6. Update updatedAt timestamp
    },
});

// Delete a session entry
export const deleteEntry = mutation({
    args: {
        sessionToken: v.string(),
        entryId: v.id("session_entries"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // 1. Verify session
        // 2. Verify user owns this entry
        // 3. Delete entry
    },
});
```

**Queries:**

```typescript
// Get all entries for the current user (list view - lightweight)
export const listEntries = query({
    args: {
        sessionToken: v.string(),
        sport: v.optional(v.string()), // Filter by sport (optional)
        limit: v.optional(v.number()), // Default 20
        cursor: v.optional(v.string()), // For pagination
    },
    returns: v.object({
        entries: v.array(v.object({
            _id: v.id("session_entries"),
            sport: v.string(),
            spotId: v.optional(v.id("spots")),
            spotName: v.optional(v.string()), // Denormalized from spot
            customLocation: v.optional(v.string()),
            sessionDate: v.number(),
            durationMinutes: v.number(),
            rating: v.number(),
            sessionNotes: v.optional(v.string()),
            conditionNotes: v.optional(v.string()),
            hasForecastData: v.boolean(), // True if forecastSlotIds has entries
            createdAt: v.number(),
        })),
        nextCursor: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        // 1. Verify session
        // 2. Query entries by user, optionally filter by sport
        // 3. Order by sessionDate desc
        // 4. Join with spots table for spot names
        // 5. Return paginated results (forecast slots fetched only on detail view)
    },
});

// Get a single entry by ID (detail view - includes full forecast data)
export const getEntry = query({
    args: {
        sessionToken: v.string(),
        entryId: v.id("session_entries"),
    },
    returns: v.union(v.object({
        _id: v.id("session_entries"),
        sport: v.string(),
        spotId: v.optional(v.id("spots")),
        spotName: v.optional(v.string()),
        customLocation: v.optional(v.string()),
        sessionDate: v.number(),
        durationMinutes: v.number(),
        rating: v.number(),
        sessionNotes: v.optional(v.string()),
        conditionNotes: v.optional(v.string()),
        createdAt: v.number(),
        // Full forecast data from linked slots
        forecastSlots: v.array(v.object({
            _id: v.id("forecast_slots"),
            timestamp: v.number(),
            speed: v.number(),
            gust: v.number(),
            direction: v.number(),
            waveHeight: v.optional(v.number()),
            wavePeriod: v.optional(v.number()),
            waveDirection: v.optional(v.number()),
            // Condition score for this slot+sport (if exists)
            score: v.optional(v.object({
                value: v.number(),
                reasoning: v.string(),
            })),
        })),
    }), v.null()),
    handler: async (ctx, args) => {
        // 1. Verify session
        // 2. Get entry
        // 3. Verify user owns entry or return null
        // 4. Join with spot if applicable
        // 5. Fetch forecast_slots by IDs in forecastSlotIds
        // 6. For each slot, fetch condition_score for entry.sport
        // 7. Return entry with full forecast data
    },
});

// Get entries for a specific spot
export const listEntriesBySpot = query({
    args: {
        sessionToken: v.string(),
        spotId: v.id("spots"),
    },
    returns: v.array(v.object({
        // ... entry fields
    })),
    handler: async (ctx, args) => {
        // 1. Verify session
        // 2. Query entries by user + spot
        // 3. Return entries
    },
});
```

#### 2.2 Helper: Find Forecast Slots

When creating an entry at a tracked spot, find the relevant forecast slots:

```typescript
async function findForecastSlotsForSession(
    ctx: QueryCtx,
    spotId: Id<"spots">,
    sessionStart: number,
    durationMinutes: number,
): Promise<Id<"forecast_slots">[]> {
    // 1. Calculate session end time: sessionStart + durationMinutes
    // 2. Get forecast slots for this spot that fall within the session window
    //    - Include slots from 1 hour before session start (to show leading conditions)
    //    - Include slots up to session end time
    // 3. Return array of slot IDs (may be empty if no slots found)
}
```

**Time matching logic:**
- Find all slots within the session time window (start - 1hr to end)
- Typically returns 1-2 slots for a 1.5 hour session (slots are 3-hour intervals)
- If no match found (e.g., session was weeks ago, or spot wasn't tracked), return empty array
- The condition_scores for these slots can be fetched separately when displaying

### 3. Frontend Implementation

#### 3.1 New Pages

**`app/journal/page.js`** - Session History (List View)

- Sport filter tabs or dropdown (All / Wingfoiling / Surfing)
- Chronological list of all user's sessions
- Each entry shows:
  - Sport badge/icon
  - Location name (spot or custom)
  - Date and time
  - Duration
  - Rating (stars)
  - Preview of session notes (truncated)
- Tap/click entry to view details
- "Log Session" button (prominent CTA)
- Empty state for new users

**`app/journal/new/page.js`** - New Session Entry Form

Step-by-step form or single scrollable form:

1. **Sport Selection**
   - Toggle or radio buttons: Wingfoiling / Surfing
   - Default to user's primary sport (if set)

2. **Location Selection**
   - Dropdown/search of favorite spots first (filtered by selected sport)
   - All tracked spots searchable (that support selected sport)
   - "Use custom location" option
   - If custom: text input for location name

3. **Date & Time**
   - Date picker (default: today)
   - Time picker (default: current time)
   - Presets: "Morning", "Afternoon", "Evening"

4. **Duration**
   - Number input or preset buttons (30m, 1h, 1.5h, 2h, 2.5h, 3h+)
   - Custom minutes input

5. **Rating**
   - 5-star rating (tap to select)
   - Labels: 1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Epic

6. **Session Notes** (optional)
   - Textarea with placeholder
   - "How was your session? What did you work on?"

7. **Conditions Notes** (optional)
   - Textarea with placeholder
   - "What were the actual conditions like?"

8. **Forecast Preview** (if tracked spot selected)
   - Shows forecasted conditions for selected time
   - Wind, waves, tide info
   - Condition score for selected sport if available
   - Visual comparison opportunity

9. **Submit Button**
   - "Log Session" or "Save Entry"

**`app/journal/[id]/page.js`** - Session Detail View

- Full entry details
- Location with link to spot page (if tracked)
- Date, time, duration
- Rating display
- Full session notes
- Full condition notes
- Forecast comparison (if linked slots exist):
  - "Forecasted Conditions" card showing linked forecast slot(s)
  - Wind speed/gust, direction, waves (from forecast_slots)
  - Condition score and reasoning (from condition_scores)
  - Shows both slots if session spans two time windows
  - Side-by-side with user's condition notes
- Edit button → opens edit form (same as create form, pre-filled)
- Delete button (with confirmation)

**Note on editing**: When editing, the forecast slot links stay as originally captured. This is intentional - they represent what was forecasted at the time you logged the session.

#### 3.2 Access Points

Multiple ways to start logging:

1. **Journal Page**: Main "Log Session" button
2. **Profile Page**: Link to "Session Journal" section
3. **Home/Forecast Page**: Quick action in header menu
4. **Spot Detail** (future): "Log session at this spot"

#### 3.3 Navigation

Add to main navigation:
- New nav item: "Journal" (book/notebook icon)
- Appears for authenticated users only

### 4. User Experience Flows

#### 4.1 Logging a Session at a Known Spot

1. User opens app after a session
2. Taps "Journal" in navigation
3. Taps "Log Session" button
4. Selects sport: "Wingfoiling"
5. Selects "Marina de Cascais" from favorites
6. Adjusts date/time if needed (defaults correct)
7. Selects duration: "1.5h"
8. Rates session: 4 stars
9. Writes session notes: "Great session! Finally nailed my jibes."
10. Writes condition notes: "Wind was gusty 18-22kts, small chop."
11. Sees forecast comparison: "Forecasted: 16-20kts NW, Score: 78"
12. Taps "Log Session"
13. Returns to journal list with new entry visible
14. Total time: ~90 seconds

#### 4.2 Logging a Session at a Custom Location

1. User opens journal
2. Taps "Log Session"
3. Selects sport: "Surfing"
4. Searches for spot, doesn't find it
5. Selects "Use custom location"
6. Types: "Praia de Matosinhos"
7. Fills in session details
8. No forecast preview shown (not a tracked spot)
9. Saves entry
10. Entry appears in journal with custom location name and surfing badge

#### 4.3 Viewing Session History

1. User opens Journal page
2. Sees chronological list of sessions
3. Scrolls through past entries
4. Taps on an entry to see full details
5. Views forecast vs. actual conditions comparison
6. Can delete entry if needed

### 5. UI Components

#### 5.1 New Components

**`components/journal/SessionCard.js`**
- Compact entry card for list view
- Shows: sport icon/badge, location, date, duration, rating, notes preview
- Tap to expand/view details

**`components/journal/RatingInput.js`**
- 5-star input component
- Interactive for input, static for display
- Labels on hover/tap

**`components/journal/DurationInput.js`**
- Quick-select preset buttons + custom input
- Shows time in readable format (1h 30m)

**`components/journal/SportToggle.js`**
- Toggle or radio buttons for sport selection
- Shows sport icons with labels
- Triggers location list filtering when changed

**`components/journal/LocationPicker.js`**
- Searchable spot selector
- Filters spots by selected sport
- Favorites first, then all spots
- Custom location option

**`components/journal/ForecastComparison.js`**
- Displays linked forecast slots with their data
- Shows wind, waves, and condition score for each slot
- Shows both slots if session spans two (e.g., "12pm: 18kts, 3pm: 22kts")
- User's condition notes displayed alongside for comparison
- Empty state if no slots linked or slots no longer available

#### 5.2 Placeholder Text Examples

**Session Notes (Wingfoiling):**
```
e.g., Amazing session! The wind filled in perfectly around 2pm. I practiced my jibes and landed 3 clean ones. Water was warm enough for just a shorty.
```

**Session Notes (Surfing):**
```
e.g., Caught about 15 waves, mostly rights. Worked on my bottom turns and got some nice speed. Waves were super fun and playful. Stayed out for 2 hours!
```

**Condition Notes (Wingfoiling):**
```
e.g., Wind was steady 18-20 knots from NW, occasional gusts to 23. Small wind chop, no real swell. Tide was mid-low and rising. Less crowded than expected.
```

**Condition Notes (Surfing):**
```
e.g., Waves were chest to head high, clean and glassy. Sets coming through every 5-6 minutes with 3-4 waves per set. Light offshore breeze. Mid-tide rising.
```

### 6. Design Considerations

#### 6.1 Visual Style

- Match existing app aesthetic (newsprint theme)
- Stars for rating: filled vs. outline
- Cards for entries with subtle borders
- Forecast comparison: side-by-side panels
- Duration displayed human-readable (1h 30m, not 90 mins)

#### 6.2 Mobile-First

- Large touch targets for rating stars
- Easy date/time pickers (native where possible)
- Collapsible sections if form is long
- Swipe-to-delete on entry cards (optional)

#### 6.3 Empty States

**No sessions yet:**
> "Your session journal is empty. After your next session, come here to log it and track your progress!"
> [Log Your First Session]

**No forecast data:**
> "No forecast data available for this time. This can happen if the session was before we started tracking this spot or if the date is too far in the past."

### 7. Data Privacy

- Journal entries are private to each user
- No sharing or public visibility
- User can delete any entry
- Condition notes may be used (anonymously, aggregated) for forecast validation in future versions

### 8. Data Integrity

- `forecastSlotIds` references actual `forecast_slots` records
- If forecast slots are deleted (e.g., old data cleanup), the entry remains but forecast comparison shows "Forecast data no longer available"
- Condition scores are fetched live from `condition_scores` table, so they reflect any re-scoring

### 9. Technical Considerations

#### 9.1 Forecast Slot Linking

Challenge: Finding the right forecast slots for a past session.

**Approach:**
- Query `forecast_slots` by `spotId` and timestamp range
- Session window: `sessionDate - 1 hour` to `sessionDate + durationMinutes`
- Use `by_spot` index for efficient queries
- For recent sessions (within last 7 days), slots should be available
- For older sessions, slots may have been cleaned up - return empty array
- Accept that some entries won't have forecast data (graceful degradation)

**Benefits of slot references:**
- No data duplication
- Scores are always current (if re-scored)
- Can show multiple slots for longer sessions
- Maintains referential integrity with forecast history

#### 9.2 Performance

- Paginate entry list (20 per page)
- Index on `[userId, sessionDate]` for efficient queries
- List view only checks if `forecastSlotIds` is non-empty (no slot fetching)
- Detail view fetches slots and scores only when viewing single entry

#### 9.3 Data Retention

- Session entries retained indefinitely (user's personal data)
- Forecast slot IDs are stored, but actual slot data may be cleaned up over time
- If referenced slots are deleted, entry still exists but forecast section shows empty state

### 10. Success Criteria

#### V1 Success Metrics

- ✅ Users can create session entries for both wingfoiling and surfing
- ✅ Users can create session entries with sport, location, time, duration, rating, notes
- ✅ Users can select from tracked spots (filtered by sport) or enter custom locations
- ✅ Session history viewable and filterable by sport
- ✅ Forecast comparison displayed for tracked spots when available
- ✅ Entries can be edited (forecast links preserved from creation)
- ✅ Entries can be deleted
- ✅ Average time to log session < 2 minutes

#### Future Metrics (V2+)

- 30%+ of active users log at least one session
- Average user logs 2+ sessions per month
- Condition notes provide valuable forecast validation data

---

## Implementation Plan

### Phase 1: Core Data Model & Backend (Day 1)

1. **Schema changes**:
   - Add `session_entries` table
   - Deploy schema update

2. **Backend functions**:
   - Create `convex/journal.ts`
   - Implement `createEntry` mutation
   - Implement `updateEntry` mutation
   - Implement `listEntries` query
   - Implement `getEntry` query
   - Implement `deleteEntry` mutation
   - Implement `findForecastSlotsForSession` helper

3. **Testing**:
   - Create test entries via Convex dashboard
   - Verify queries return correct data

### Phase 2: Session List Page (Day 2)

1. **Frontend**:
   - Create `app/journal/page.js`
   - Create `SessionCard` component
   - Implement empty state
   - Add navigation link

2. **Testing**:
   - View session list
   - Empty state display
   - Navigation works

### Phase 3: New Session Form (Day 2-3)

1. **Components**:
   - Create `LocationPicker` component
   - Create `RatingInput` component
   - Create `DurationInput` component

2. **Form page**:
   - Create `app/journal/new/page.js`
   - Location selection (spots + custom)
   - Date/time picker
   - Duration input
   - Rating stars
   - Notes textareas
   - Form validation

3. **Testing**:
   - Create entries at tracked spots
   - Create entries at custom locations
   - Validation works correctly

### Phase 4: Forecast Comparison (Day 3)

1. **Backend**:
   - Implement `findForecastForTime` helper
   - Integrate into `createEntry`

2. **Frontend**:
   - Create `ForecastComparison` component
   - Show in new entry form
   - Show in entry detail view

3. **Testing**:
   - Forecast shown for tracked spots
   - Graceful handling when no forecast available

### Phase 5: Entry Detail, Edit & Polish (Day 4)

1. **Detail page**:
   - Create `app/journal/[id]/page.js`
   - Full entry display
   - Forecast comparison
   - Edit functionality (reuse form components, pre-fill data)
   - Delete functionality

2. **Polish**:
   - Loading states
   - Error handling
   - Placeholder text
   - Empty states

3. **Final testing**:
   - Full user flow
   - Edge cases
   - Mobile responsiveness

---

## Decisions

### 1. Should we allow editing entries?

**Decision**: Yes, allow editing. Forecast slot links are captured at creation time and won't be updated on edit - this is fine since they represent "what was forecasted when you logged the session."

### 2. Should custom locations allow coordinates?

**Decision**: No. Just a text field for location name. Keep it simple.

### 3. How far back should forecast slot linking work?

**Decision**: Best effort - query for slots matching the session time window. Older sessions may have no slots if historical data was cleaned up. The entry remains valid; forecast comparison simply shows "No forecast data available."

### 4. Should we notify when forecast was significantly off?

**Decision**: No, not in scope.

---

## Future Enhancements (V2+)

1. **Session Statistics**: Charts showing session frequency, favorite spots, rating trends (filterable by sport)
2. **Equipment Tracking**: Link sessions to specific gear (boards, wings, wetsuits)
3. **Photo/Video Attachments**: Add media to entries
4. **Session Sharing**: Share achievements with friends
5. **Forecast Accuracy Tracking**: Use condition notes to score forecast accuracy
6. **Map View**: Visualize sessions on a map
7. **Export Data**: Download session history as CSV/PDF
8. **Session Reminders**: "Looks like great conditions - remember to log your session!"
9. **Cross-Sport Analysis**: Compare progression across wingfoiling and surfing

---

## References

- [PRD 07: Personalized Scoring](/planning/prds/07-personalized-scoring.md) - User context model
- [Architecture](/planning/architecture.md) - System overview
- [Schema](/convex/schema.ts) - Database schema

---

**Document Maintained By**: Engineering Team  
**Last Updated**: 2026-02-02  
**Status**: Draft - Ready for Review
