---
title: "fix: Resolve open issues — auth sessions, journal form, time picker, TV mode columns"
type: "fix"
status: "active"
date: "2026-04-13"
markup_reviewed: true
markup_reviewed_at: "2026-04-13T11:06:08.644Z"
markup_status: "changes_requested"
---
# fix: Resolve open issues (RAD-48, RAD-49, RAD-50, RAD-51)

## Overview

Four open issues to resolve, ordered by priority:

1. **RAD-51** (high) — Auth session expires too quickly after domain switch to watermanreport.com
2. **RAD-50** (medium) — Journal new session form retains stale state on back-to-back entries
3. **RAD-49** (low) — Journal time picker uses 1-minute intervals, should be 5-minute
4. **RAD-48** (low) — TV Mode needs configurable column layout (2/3/4 columns)

---

## Unit 1: Fix auth session persistence (RAD-51)

**Priority:** High
**Files:** `convex/auth.ts:636-637`, Render environment variables

**Problem:** Users are forced to re-login multiple times per day. This is a regression after switching to watermanreport.com.

**Root cause:** The session token is stored in `localStorage` (key: `waterman_session_token`, `components/auth/AuthProvider.js:19`), which is domain-scoped. If the domain changed, old tokens are inaccessible. Additionally, magic link emails use `NEXT_PUBLIC_APP_URL` (`convex/auth.ts:636`) to build the verify URL — if this env var points to an old domain, users authenticate on a different origin and the token is stored there, not on watermanreport.com.

**Investigation steps:**
1. Check what `NEXT_PUBLIC_APP_URL` is set to in Render production environment
2. If it's not `https://watermanreport.com`, update it
3. Check `convex/calendar.ts` and `lib/ics.js` which have hardcoded fallbacks to `https://waterman.radx.dev` — update those too
4. Verify the session TTL (currently 30 days at `convex/auth.ts:11`) is not being overridden

**Fix:**
- Update `NEXT_PUBLIC_APP_URL` in Render production env to `https://watermanreport.com`
- Update hardcoded fallback URLs in `convex/calendar.ts` and `lib/ics.js` from `https://waterman.radx.dev` to `https://watermanreport.com`
- Verify session cleanup cron isn't overly aggressive

**Acceptance criteria:**
- [ ] `NEXT_PUBLIC_APP_URL` set to `https://watermanreport.com` in production
- [ ] All hardcoded domain fallbacks updated to watermanreport.com
- [ ] Magic link emails link to watermanreport.com/auth/verify
- [ ] Session persists across browser restarts for 30 days

---

## Unit 2: Fix journal form stale state (RAD-50)

**Priority:** Medium
**File:** `app/journal/new/page.js:105-142`

**Problem:** After submitting a journal entry, clicking "+ New Session" again shows the old form data and a stuck loading button.

**Root cause:** The `handleSubmit` function (line 119) sets `setSaving(true)` but only calls `setSaving(false)` in the error path (line 140). On success, it calls `router.push("/journal")` (line 136) without resetting `saving`. When the user navigates back to `/journal/new`, Next.js may reuse the component with stale state.

**Fix:** Add a `key` prop to force remount, or reset all form state on mount:
```jsx
// Option A: Reset saving state on successful navigation
setSaving(false);
router.push("/journal");

// Option B: Use useEffect to reset form state on mount
useEffect(() => {
  setSaving(false);
  setError("");
  // Reset other form fields if needed
}, []);
```

Option A is simpler — just add `setSaving(false)` before the `router.push`.

**Acceptance criteria:**
- [ ] After submitting an entry, navigating to /journal/new shows a clean form
- [ ] Submit button is in default (not loading) state on fresh visits
- [ ] All form fields are reset

---

## Unit 3: Journal time picker 5-minute intervals (RAD-49)

**Priority:** Low
**File:** `app/journal/new/page.js:201-206`

**Problem:** The native `datetime-local` input uses 1-minute intervals for the time portion, making minute selection tedious.

**Fix:** Add `step="300"` (300 seconds = 5 minutes) to the input:
```jsx
<input
  type="datetime-local"
  step="300"
  value={sessionDate}
  onChange={(e) => setSessionDate(e.target.value)}
  className="w-full px-4 py-2 border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink"
/>
```

**Acceptance criteria:**
- [ ] Time picker shows 5-minute intervals (00, 05, 10, 15, ..., 55)
- [ ] Existing entries with non-5-minute times still display correctly

---

## Unit 4: TV Mode column layout setting (RAD-48)

**Priority:** Low
**File:** `components/webcam/TvMode.js:97`

**Problem:** TV Mode is hardcoded to 3 columns (`grid-cols-3`). Users want to adjust for their screen size.

**Fix:**
1. Add a `columns` state with options 2/3/4, persisted to localStorage
2. Add a simple toggle UI (pill buttons: 2 | 3 | 4) next to the close button
3. Apply the grid class dynamically

```jsx
const STORAGE_KEY = "waterman_tv_columns";
const [columns, setColumns] = useState(() => {
  if (typeof window !== "undefined") {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "3");
  }
  return 3;
});

const gridClass = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[columns];

// In the JSX, near the close button:
<div className="flex gap-1">
  {[2, 3, 4].map(n => (
    <button
      key={n}
      onClick={() => { setColumns(n); localStorage.setItem(STORAGE_KEY, String(n)); }}
      className={`px-2 py-1 rounded text-sm ${columns === n ? "bg-white/30 text-white" : "bg-white/10 text-white/60"}`}
    >
      {n}
    </button>
  ))}
</div>
```

**Acceptance criteria:**
- [ ] TV Mode shows 2, 3, or 4 column options
- [ ] Default is 3 columns
- [ ] Selection persists across sessions via localStorage
- [ ] Grid responds immediately when column count changes

---

## Implementation Order

1. **Unit 1** (auth) — highest priority, investigate env vars first
2. **Unit 2** (journal form reset) — one-line fix
3. **Unit 3** (time picker step) — one attribute addition
4. **Unit 4** (TV mode columns) — small feature addition

## Sources

- Auth system: `convex/auth.ts`, `components/auth/AuthProvider.js`
- Journal form: `app/journal/new/page.js`
- TV Mode: `components/webcam/TvMode.js`
- Issue tracker: RAD-48, RAD-49, RAD-50, RAD-51
<!-- @markup {"id":"E2ODwq-Z_B69XggiPdpyD","type":"inline","anchor":"ol:Check what NEXT_PUBLIC_APP_URL is set to in Render production environment\nIf it","author":"","ts":"2026-04-13T11:04:34.132Z"} This env var isn't set at all on render! -->
<!-- @markup {"id":"zjr86q9L9G9FlroGdFCqb","type":"inline","anchor":"ol:Check what NEXT_PUBLIC_APP_URL is set to in Render production environment\nIf it","author":"","ts":"2026-04-13T11:04:56.089Z"} guess this doesn't need to be reset on the scraper service? -->
<!-- @markup {"id":"cPviIY6BxMd8uy06MX9wk","type":"inline","anchor":"ol:Check what NEXT_PUBLIC_APP_URL is set to in Render production environment\nIf it","author":"","ts":"2026-04-13T11:05:39.091Z"} Interestingly, the ICS urls do use watermanreport though: https://www.watermanreport.com/api/calendar/wingfoil/feed.ics?token=76fdfc51243d413841829ab58943aaf8501fa19a0240db896df201c7e8d7cf8f -->
<!-- @markup {"id":"kMgcpAsviqhs3UphKgVQ3","type":"inline","anchor":"ol:Check what NEXT_PUBLIC_APP_URL is set to in Render production environment\nIf it","author":"","ts":"2026-04-13T11:06:08.320Z"} deploy is still ongoing, so that didn't change it! -->