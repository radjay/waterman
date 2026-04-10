---
title: "fix: Nav tab switching performance and pill animation"
type: fix
status: completed
date: 2026-04-10
issues: RAD-43, RAD-33
---

# Fix: Nav Tab Switching Performance and Pill Animation

## Overview

Two related navigation bugs: tab switching has a 1-2s delay on desktop and mobile (RAD-43), and the Journal tab's active indicator animates from the wrong direction (RAD-33). Both stem from the same root causes — no route prefetching and no optimistic active state.

## Problem Statement

1. **Slow tab switching:** Both `BottomNav` (mobile) and `ViewToggle` (desktop) use `<button>` + `router.push()` instead of `<Link>`. This bypasses Next.js automatic route prefetching, so every tab switch triggers a cold page load.

2. **Broken pill animation:** The Framer Motion `layoutId` pill relies on `usePathname()` to determine active state. During slow transitions, there's a gap where the old pill unmounts but the new one hasn't mounted yet, causing the animation to break or appear from unexpected directions.

3. **Two pages lack server-side data prefetch:** Journal (auth-gated) and Calendar (heavy waterfall of N*M Convex queries) are fully client-rendered, amplifying the delay.

## Proposed Solution

Two independent workstreams that can be implemented in either order:

### Workstream A: `<Link>` Migration for Route Prefetching

Replace `router.push()` with Next.js `<Link>` components in nav tabs so routes are prefetched on viewport intersection.

**Files to change:**

- `components/layout/BottomNav.js` — Convert 4 tabs (Home, Report, Cams, Journal) to `<Link>`. Keep "More" as a `<button>` (it opens a menu, not a route).
- `components/layout/ViewToggle.js` — Convert all 5 tabs (Home, Report, Cams, Journal, Calendar) to `<Link>`.
- `components/layout/MobileMenu.js` — Convert Calendar, Settings, Profile menu items to `<Link>` so Calendar gets prefetched on mobile too (it's only reachable through "More" on mobile).

**Implementation notes:**
- Wrap tab content in `<Link href={path}>` styled as the current button. Use `className` passthrough to preserve existing styles.
- Remove `onClick={() => router.push(path)}` handlers from converted tabs.
- The "More" tab in BottomNav has `path: null` — it must remain a `<button>`.

### Workstream B: Optimistic Active State for Pill Animation

Decouple the pill animation from route completion by updating active state immediately on click, before navigation finishes.

**Files to change:**

- `components/layout/BottomNav.js` — Add `optimisticTab` state. On tab click, set `optimisticTab` immediately. Clear it when `pathname` matches (via `useEffect`). Use `optimisticTab || getActiveTab()` for rendering the pill.
- `components/layout/ViewToggle.js` — Same pattern. Add `optimisticTab` state, set on click, derive active from `optimisticTab ?? pathname`-based detection.

**Implementation pattern:**

```jsx
const [optimisticTab, setOptimisticTab] = useState(null);
const pathname = usePathname();
const activeTab = optimisticTab || getActiveTab(pathname);

// Clear optimistic state once navigation completes
useEffect(() => {
  setOptimisticTab(null);
}, [pathname]);

// On tab press
const handleTabPress = (tab) => {
  if (tab.path) {
    setOptimisticTab(tab.id);
    // <Link> handles the navigation, no router.push needed
  }
};
```

This ensures the pill slides immediately on tap regardless of how long the page takes to load. The `layoutId` animation works because the pill instantly appears at the new position.

## Technical Considerations

### Journal cannot be server-side data prefetched

Journal requires a `sessionToken` for `api.journal.listEntries`. The existing server-prefetch pattern in `lib/convex-cache.js` uses anonymous queries — no auth context is available server-side. Journal gets **bundle-only prefetch** from `<Link>`, which still improves perceived speed (JS loads instantly, data fetches client-side). The loading spinner is acceptable since it's behind auth.

### Calendar needs an aggregated Convex query (separate scope)

Calendar currently fires 1 + N*(2 + 2M) queries in a waterfall. No amount of `<Link>` prefetching fixes a 2-second data fetch. A proper fix requires a `getCalendarData` aggregated Convex query (like `getDashboardData` and `getReportData`). **This is significant backend work and should be scoped as a follow-up task**, not part of this plan.

For now, `<Link>` prefetching ensures the Calendar JS bundle loads instantly, and the optimistic pill animation ensures the nav feels responsive even while Calendar data loads.

### Two independent `layoutId` contexts

BottomNav uses `layoutId="bottom-nav-pill"` (mobile) and ViewToggle uses `layoutId="nav-tab"` (desktop). They're mutually exclusive via responsive breakpoints (`md:`), so they won't interfere with each other.

## Acceptance Criteria

- [ ] All nav tabs (except "More") use `<Link>` instead of `router.push()`
- [ ] MobileMenu navigation items (Calendar, Settings, Profile) use `<Link>`
- [ ] Tab switching feels instant — pill animates immediately on tap
- [ ] Journal tab pill slides horizontally from the previous tab, not from the bottom
- [ ] No regressions in "More" menu behavior (still opens overlay)
- [ ] Active state styling (icon weight, color) updates immediately on tap
- [ ] Works correctly on both mobile (BottomNav) and desktop (ViewToggle)

## Dependencies & Risks

- **Low risk:** `<Link>` migration is a standard Next.js pattern. The existing nav structure (pill + icon + label) wraps cleanly in `<Link>`.
- **Edge case:** If a user taps a tab and then quickly taps another before the first navigation completes, `optimisticTab` should update to the latest tap. This is handled naturally — each click overwrites the state.
- **Follow-up needed:** Calendar data prefetch (aggregated Convex query) is out of scope but will be needed for Calendar to feel truly fast.

## Sources & References

- `components/layout/BottomNav.js` — mobile nav, `layoutId="bottom-nav-pill"`
- `components/layout/ViewToggle.js` — desktop nav, `layoutId="nav-tab"`
- `components/layout/MobileMenu.js` — overflow menu with Calendar link
- `app/dashboard/page.js` — reference implementation of server-side prefetch pattern
- `lib/convex-cache.js` — cached server-side data fetching
- `app/journal/page.js` — auth-gated, client-only
- `app/calendar/page.js` — heavy multi-query waterfall
