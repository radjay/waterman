# Waterman Report - UI/UX Improvement Plan

## Context

Users report the UI is inconsistent and the UX confusing. The core goal is to help watermen **spend less time checking conditions** - see if it's good "now" or when is best in the coming days, across multiple sports. The current UI hides AI scores behind hover interactions, shows raw data without quality indicators, and splits navigation across three disconnected systems.

## Rule: UI Kit First

**All pages must only use components from the UI Kit (`components/ui/`).** When building or modifying any page, import shared components rather than writing inline markup. The UI Kit page at `/ui-kit` is the single source of truth for how components look and behave. To iterate on a component's appearance, change it in the kit - all pages update automatically.

---

## Phase 0: UI Kit Foundation

### 0a. Create/refactor shared components in `components/ui/`

All components below live in `components/ui/`. Every page in the app imports from here - no inline one-off styling for these element types.

---

#### TYPOGRAPHY

**`Heading.js`** - All headings in the app
- Props: `level` (1-4), `children`, `className`
- Renders `<h1>`-`<h4>` with consistent styles:
  - H1: `font-headline text-3xl font-bold text-ink` (page titles)
  - H2: `font-headline text-xl font-bold text-ink` (section titles)
  - H3: `font-headline text-lg font-bold text-ink` (subsection)
  - H4: `font-headline text-base font-bold text-ink` (spot names, labels)

**`Text.js`** - Body text and paragraphs
- Props: `variant` ("body"|"muted"|"caption"|"label"), `as` (tag, defaults to "p"), `children`, `className`
- Variants:
  - body: `font-body text-ink` (default)
  - muted: `font-body text-ink/60`
  - caption: `font-body text-xs text-ink/50`
  - label: `font-body text-sm font-bold uppercase text-ink/60`

---

#### BUTTONS

**`Button.js`** - All buttons in the app
- Props: `variant` ("primary"|"secondary"|"ghost"|"danger"|"icon"), `size` ("sm"|"md"|"lg"), `icon` (Lucide component), `children`, `onClick`, `disabled`, `className`
- Variants:
  - primary: `bg-ink text-newsprint rounded-md hover:bg-ink/90 font-medium transition-colors`
  - secondary: `border border-ink/20 text-ink rounded-md hover:border-ink/30 hover:bg-ink/5 bg-newsprint transition-colors`
  - ghost: `text-ink/60 hover:text-ink transition-colors` (text-only, no border)
  - danger: `border border-red-300 text-red-600 hover:bg-red-50 rounded transition-colors`
  - icon: `border border-ink/30 rounded p-1 bg-newsprint hover:bg-ink/5 transition-colors`
- Sizes: sm = `px-3 py-1.5 text-xs`, md = `px-4 py-2.5 text-sm`, lg = `px-4 py-3 text-base`
- Icon support: renders icon before children with `gap-2`
- Disabled: `opacity-50 cursor-not-allowed`

---

#### DIVIDERS & LAYOUT

**`Divider.js`** - Horizontal separator
- Props: `weight` ("light"|"medium"|"heavy"), `className`
- Variants:
  - light: `border-t border-ink/10`
  - medium: `border-t border-ink/20` (default)
  - heavy: `border-t-2 border-ink`

**`Section.js`** - Section wrapper with optional title and divider
- Props: `title`, `action` (ReactNode, e.g. "See All" button), `children`, `divided` (bool), `className`
- Renders: Optional `Heading` level 2 + optional action in flex row, then children. If `divided`, adds `Divider` before section.

---

#### SCORES & INDICATORS

**`ScoreDisplay.js`** - The single consistent score indicator
- Props: `score` (number), `size` ("sm"|"md"|"lg"), `className`
- Renders: Colored number. 60-74 `text-green-600`, 75-89 `text-green-700 font-bold`, 90+ `text-green-800 font-black`. Returns null if score < 60.
- Sizes: sm = `text-sm`, md = `text-base`, lg = `text-2xl`
- Replaces: FlameRating (delete), raw score rendering on dashboard

**`SportBadge.js`** - Small sport type pill
- Props: `sport` ("wingfoil"|"kitesurfing"|"surfing"), `className`
- Renders: `WING`/`KITE`/`SURF` pill. Style: `text-[0.6rem] font-bold uppercase tracking-wide text-ink/40 border border-ink/15 px-1.5 py-0.5 rounded`

---

#### CONTROLS

**`PillToggle.js`** - Generic single-select pill group
- Props: `options` (array of `{id, label}`), `value`, `onChange`, `className`
- Renders: Inline flex button group. Active = `bg-ink text-newsprint`, inactive = `text-ink hover:bg-ink/5`. Text: `text-xs font-bold uppercase`.
- Replaces: Sport filter pills in Cams, Journal, Report; Show filter in Report

**`Input.js`** - Text input
- Props: `icon` (Lucide component), `placeholder`, `value`, `onChange`, `type`, `className`
- Style: `w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink font-body`
- With icon: `pl-10` + icon positioned absolute left

---

#### CARDS & CONTAINERS

**`Card.js`** - General card container
- Props: `variant` ("default"|"interactive"|"elevated"), `children`, `onClick`, `className`
- Variants:
  - default: `border border-ink/20 rounded-lg p-4 bg-newsprint`
  - interactive: adds `hover:border-ink/30 hover:bg-ink/5 transition-all cursor-pointer`
  - elevated: adds `shadow-md`

**`ScoreCard.js`** - Card with score-based background tinting
- Props: `score`, `children`, `onClick`, `className`
- Renders: `Card` with score-based bg: 90+ `bg-[rgba(134,239,172,0.25)]`, 75-89 `bg-[rgba(134,239,172,0.12)]`, 60-74 default. Left border colored by score range: 60-74 `border-l-4 border-l-green-400`, 75-89 `border-l-4 border-l-green-600`, 90+ `border-l-4 border-l-amber-500`.

---

#### DATA DISPLAY

**`ConditionLine.js`** - Compact one-line wind/wave summary
- Props: `speed`, `gust`, `direction`, `waveHeight`, `wavePeriod`, `sport`, `className`
- Renders: For wind sports: `"12 kn (18*) SSW | 1.4m 8s"`. For surfing: `"1.4m (8s) WNW | 5 kn"`.

---

#### FEEDBACK

**Existing - keep as-is:**
- `Tooltip.js` - hover tooltip
- `Select.js` - styled dropdown (to be phased out by PillToggle)
- `Arrow.js` - rotated direction arrow
- `DataGroup.js` - icon + metric + direction
- `Metric.js` - icon + value pair
- `Icon.js` - span wrapper
- `Badge.js` - revamp to general-purpose pill with color variants

**Existing in `components/common/` - keep as-is, document in kit:**
- `Loader.js` - loading spinner
- `EmptyState.js` - "No conditions" placeholder
- `ScoreModal.js` - score detail modal

**Existing forecast components - keep in place, document in kit:**
- `components/forecast/WindGroup.js`
- `components/forecast/WaveGroup.js`
- `components/forecast/DirectionIndicator.js`
- `components/tide/TideDisplay.js`

---

### 0b. Create UI Kit page at `/app/ui-kit/page.js`

A dedicated page that renders every component with sample data. Organized by section:

```
/ui-kit

## Typography
- Heading: H1, H2, H3, H4 examples
- Text: body, muted, caption, label variants

## Buttons
- Button: primary, secondary, ghost, danger, icon variants
- Button: sm, md, lg sizes
- Button: with icon, disabled state

## Dividers
- Divider: light, medium, heavy

## Scores & Indicators
- ScoreDisplay: sm/md/lg at values 55, 65, 78, 92
- SportBadge: wing, kite, surf

## Controls
- PillToggle: sport selector, filter selector
- Input: plain, with icon
- Select: dropdown (legacy)
- Tooltip: hover examples

## Cards
- Card: default, interactive, elevated
- ScoreCard: at scores 65, 78, 95

## Data Display
- ConditionLine: wind sport, surf examples
- WindGroup: sample data
- WaveGroup: sample data
- DirectionIndicator: N, NE, E, SE, S, SW, W, NW
- TideDisplay: rising, falling, exact event
- Section: with title + action

## Feedback
- Loader
- EmptyState
- ScoreModal: (button to trigger)
```

Each section shows component rendered with sample props + import path below. No auth required.

---

## Phase 1: Score Visibility (uses new kit components)

### H1. Surface Scores on Every Forecast Slot
**Files**: `components/forecast/ForecastSlot.js`

- **Delete FlameRating** (lines 15-29) and all usages.
- **Import** `ScoreDisplay` from `components/ui/ScoreDisplay`.
- Desktop row (lines 97-116): Remove `opacity-0 group-hover:opacity-100` and `pointer-events-none`. Render `<ScoreDisplay score={slot.score.value} />` always visible. ChevronRight stays at `text-ink/30`.
- Mobile card (lines 133-153): Add `<ScoreDisplay score={slot.score.value} />` in the header row.
- Add score-range left border: 60-74 `border-l-4 border-l-green-400`, 75-89 `border-l-4 border-l-green-600`, 90+ `border-l-4 border-l-amber-500`.

### M5. Rename "Sessions" to "Journal"
**Files**: `components/layout/ViewToggle.js` - line 80 text, line 77 aria-label.

### L2. Relative "Last Updated" Time
**Files**: `components/layout/Footer.js` - add `getRelativeTime()` helper, render "Updated X min ago".

### L1. Score Tooltip
Wrap `ScoreDisplay` in `Tooltip` with content `"60-74 Good | 75-89 Excellent | 90+ Epic"`.

---

## Phase 2: Dashboard Redesign

### H2. Dashboard Cards with Actionable Data
**Files**: `app/dashboard/page.js`

- **Import**: `ScoreDisplay`, `SportBadge`, `ConditionLine`, `ScoreCard` from `components/ui/`.
- Replace current card markup (lines 271-288) with `ScoreCard` wrapping:
  - Row 1: `<SportBadge sport={slot.sport} />` + spot name + `<ScoreDisplay score={slot.score.value} size="lg" />`
  - Row 2: `<ConditionLine>` showing time + compact conditions
- Cards sorted by score (already done), with visual hierarchy from ScoreCard backgrounds.

---

## Phase 3: Navigation Unification

### H5. Unify Navigation
**Files**: `components/layout/Header.js`, `MobileMenu.js`, `GlobalNavigation.js`, `app/layout.js`

1. **MobileMenu**: Icon `w-3 h-3` -> `w-4 h-4`, padding `p-1.5` -> `p-2`. Add Settings link.
2. **Move auth into Header**: Remove `GlobalNavigation` from `layout.js`. Header becomes flex: `[Hamburger (mobile)] [Title (center)] [UserAvatar (desktop)]`.
3. Replace absolute MobileMenu positioning (Header.js lines 37-41) with flex child.

### H3. Compact Header
**Files**: `components/layout/Header.js` + 5 page files with sticky offsets

- Scrolled title: `clamp(1.1rem, 3.5vw, 1.8rem)` (from 1.44rem).
- Scrolled padding: 8/8 (from 12/12).
- ViewToggle bar: `py-2 md:py-3` (from `py-3 md:py-4`).
- Update `top-[57px]` in: `dashboard/page.js:236`, `HomeContent.js:364`, `calendar/page.js:233`, `cams/page.js:119`, `journal/page.js:73`.

### M3. Mobile ViewToggle
**Files**: `components/layout/ViewToggle.js`

- Text labels: `hidden sm:inline` (icons-only below 640px).
- Padding: `px-2 sm:px-3`.

---

## Phase 4: Report Polish

### M1. Sport Badge on ForecastSlot
**Files**: `components/forecast/ForecastSlot.js`

- Import `SportBadge` from `components/ui/SportBadge`.
- Add next to hour in desktop (line 77-79) and mobile (line 134-136) layouts.

### M6. Replace Dropdowns with PillToggle
**Files**: `app/HomeContent.js`

- Import `PillToggle` from `components/ui/PillToggle`.
- Replace `SportSelector` and `ShowFilter` with `PillToggle` instances.
- Remove `SlidersHorizontal` mobile toggle - pills are always visible.
- Sport options: `[{id: "wingfoil", label: "Wing"}, {id: "kitesurfing", label: "Kite"}, {id: "surfing", label: "Surf"}]`
- Filter options: `[{id: "best", label: "Best"}, {id: "all", label: "All"}]`

### L4. Update Cams & Journal to use PillToggle
**Files**: `app/cams/page.js`, `app/journal/page.js`

Replace inline pill button markup with `<PillToggle>` component.

---

## Phase 5: Calendar & Cams

### H4. Scores on Calendar Cards
**Files**: `components/calendar/CalendarView.js`

- Import `ScoreDisplay` from `components/ui/ScoreDisplay`.
- Add colored score next to each spot name (wingfoil ~line 287, kite ~352, surf ~423).
- Color-code day card headers by best score.

### L3. Compact Calendar Layout
Replace 2-line wind/wave data per spot with `ConditionLine` component + `ScoreDisplay`. Halves card height.

### M2. Webcam Stream Fallback
**Files**: `components/webcam/WebcamCard.js`

Add `streamStatus` state. Show spinner for loading, "Stream unavailable" + retry for error.

### M4. Score Overlay on Webcam Cards
**Files**: `components/webcam/WebcamCard.js`

Add `ScoreDisplay` overlay in card corner. Score data passed as prop from parent.

---

## Files Modified Summary

**New files:**
- `components/ui/Heading.js` - all headings
- `components/ui/Text.js` - body text variants
- `components/ui/Button.js` - all button variants
- `components/ui/Divider.js` - horizontal separators
- `components/ui/Section.js` - section wrapper with title/action
- `components/ui/ScoreDisplay.js` - colored score number
- `components/ui/SportBadge.js` - sport type pill
- `components/ui/PillToggle.js` - single-select pill group
- `components/ui/Input.js` - text input with optional icon
- `components/ui/Card.js` - general card container
- `components/ui/ScoreCard.js` - score-tinted card
- `components/ui/ConditionLine.js` - compact conditions summary
- `app/ui-kit/page.js` - UI kit showcase page

**Modified files:**
- `components/ui/Badge.js` - revamp variants
- `components/forecast/ForecastSlot.js` - remove FlameRating, add ScoreDisplay + SportBadge + score borders
- `components/layout/ViewToggle.js` - rename Sessions, icons-only mobile
- `components/layout/Header.js` - flex layout, compact sizing, integrate auth
- `components/layout/MobileMenu.js` - larger icon, add Settings
- `components/layout/Footer.js` - relative time
- `components/layout/GlobalNavigation.js` - remove (logic moved to Header)
- `components/calendar/CalendarView.js` - add ScoreDisplay, use ConditionLine
- `components/webcam/WebcamCard.js` - fallback UI, score overlay
- `app/layout.js` - remove GlobalNavigation
- `app/dashboard/page.js` - redesign cards with kit components, update sticky offset
- `app/HomeContent.js` - PillToggle, update sticky offset
- `app/calendar/page.js` - update sticky offset
- `app/cams/page.js` - PillToggle, update sticky offset
- `app/journal/page.js` - PillToggle, update sticky offset

---

## Verification

After each phase:
- Visit `/ui-kit` to verify all components render correctly with sample data
- Check all 5 views (Home, Report, Calendar, Cams, Journal) on desktop (1280px) and mobile (375px)
- Verify colored score numbers visible everywhere (no flames remaining)
- Verify navigation works on mobile (hamburger has Settings) and desktop (auth in header)
- Test with and without authentication
- Test sport switching across all views
- `npm run build` passes with no errors
