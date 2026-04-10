---
title: "feat: Add multi-sport filter to Cams and Calendar pages"
type: feat
status: completed
date: 2026-04-10
issues: RAD-32
---

# Add Multi-Sport Filter to Cams and Calendar Pages

## Overview

Port the multi-select sport filter (WING / KITE / SURF toggles) from the Report page to the Cams and Calendar pages. The Report page already has the reference implementation — this is about consistency across all views.

## Problem Statement

- **Cams page** has a single-select sport filter via `PillToggle` — you can only pick one sport at a time or "All". Should be multi-select like Report.
- **Calendar page** has no sport filter at all — it's hardcoded to show all three sports.
- Users expect the same filter behavior across views.

## Proposed Solution

### 1. Extract a reusable `SportFilter` component

The Report page (`HomeContent.js`, lines 428-452) has inline multi-select sport pills. Rather than duplicating that code in three places, extract it into a shared component.

**Create `components/ui/SportFilter.js`:**

```jsx
// Multi-select sport toggle pills
// Props: selectedSports (array), onToggle (sportId => void)
// Empty selectedSports = all sports active (no filter)
// Renders WING / KITE / SURF pill buttons, each toggleable independently
```

Pattern to follow: the inline implementation in `HomeContent.js` lines 428-452.

### 2. Upgrade Cams page from single-select to multi-select

**File:** `app/cams/CamsContent.js`

Changes:
- Replace `selectedSport` (string) state with `usePersistedState("waterman_cams_sports", [])` (array)
- Replace `PillToggle` (single-select) with the new `SportFilter` component (multi-select)
- Update data fetch: `sports: selectedSports.length > 0 ? selectedSports : ALL_SPORT_IDS`
- **Critical per RAD-32:** Changing the sport filter must NOT trigger a full page reload — filter should apply client-side, showing/hiding cam cards reactively

### 3. Add sport filter to Calendar page

**File:** `app/calendar/page.js`

Changes:
- Add `usePersistedState("waterman_calendar_sports", [])` for filter state
- Add `SportFilter` component to the page header/filter area
- Replace hardcoded `selectedSports = ["wingfoil", "kitesurfing", "surfing"]` with the persisted state
- Pass filtered sports to all downstream queries

### 4. Update Report page to use the shared component

**File:** `app/HomeContent.js`

Replace inline sport pill rendering (lines 428-452) with the new `SportFilter` component. Behavior stays identical.

## Technical Considerations

- **No backend changes needed.** All Convex queries (`getCamsData`, `getReportData`, `getForecastSlots`) already accept `sports: v.array(v.string())`.
- **Filter semantics:** Empty array `[]` = "all sports" (no filter). This is consistent with the Report page behavior.
- **Persistence:** Each page gets its own localStorage key so filters are independent per view. Uses existing `usePersistedState` hook from `lib/hooks/usePersistedState.js`.
- **Cams no-reload:** The Cams page currently re-fetches on sport change via `useEffect` dependencies. The multi-select version should do the same — the data fetch is what updates, not a page reload. Need to verify the `useEffect` dependency array handles array comparison correctly (may need a serialized key).

## Acceptance Criteria

- [ ] `SportFilter` component created in `components/ui/`
- [ ] Cams page uses multi-select sport filter (persisted to localStorage)
- [ ] Calendar page has sport filter (persisted to localStorage)
- [ ] Report page uses the shared `SportFilter` component (no behavior change)
- [ ] Selecting all sports = no filter (show everything), consistent across all pages
- [ ] Cams page filter applies client-side without full page reload
- [ ] Filter state persists across sessions per page

## Sources & References

- `app/HomeContent.js:428-452` — inline multi-select sport pills (reference implementation)
- `app/cams/CamsContent.js:273-286` — current single-select PillToggle
- `app/calendar/page.js:24` — hardcoded sports array
- `components/ui/PillToggle.js` — existing single-select component (not reused here)
- `lib/hooks/usePersistedState.js` — localStorage persistence hook
