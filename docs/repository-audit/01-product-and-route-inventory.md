# Product and route inventory

## 1. Product summary

Waterman answers three practical questions for watersports users around Portugal/Cascais:

1. **Where and when are conditions worth going out?** Forecast slots are scored for wingfoil, kitesurfing, and surfing, filtered to usable daylight hours, and presented as a concise report.
2. **What is happening visually and right now?** Webcam tiles and Windguru live readings supplement the forecast.
3. **How do conditions relate to one user's preferences and experience?** Accounts store favorite spots/sports, skill/context notes, personalized scores, calendar feeds, and session journal entries.

The interface is optimized around a narrow, newspaper-like mobile layout. `/dashboard` is the default landing page; the rest of the product is reached from a persistent bottom navigation and account menus.

## 2. User-facing routes

| Route | What exists now | Data and state | Assessment |
| --- | --- | --- | --- |
| `/` | Server redirect to `/dashboard`. | None. | Complete. |
| `/dashboard` | “Home” overview with current/best slots, relevant webcams, upcoming conditions, share/navigation affordances, score details, and first-visit onboarding footer/modal behavior. | Cached anonymous `getDashboardData`, then client re-fetch using favorites and personalized-score setting. Anonymous preferences use localStorage. | Substantial and recently performance-optimized. Error state is still mostly console-only. |
| `/report` | Multi-sport forecast report grouped by day and spot, with Best/All condition filtering, score modal, tides, daylight filtering, ideal-slot marking, live wind in spot sections, footer freshness, deep-link scroll, and sport override behavior. | `getReportData`; localStorage keys `waterman_report_sports`, `waterman_show_filter`; optional `?sport=` and `?day=`. | Core product, but three open RADX bugs affect multi-sport results, errors, and persistence. |
| `/wing/best`, `/wing/all`, `/kite/*`, `/surf/*` | Shareable single-sport/single-filter version of the report. Invalid sport falls back to wingfoil; invalid filter falls back to Best. Optional `day` and `slot` query parameters scroll/highlight. | Cached `getReportData([sport])`, then optional personalized re-fetch. | Functional but duplicates most `/report` transformation/rendering code. |
| `/report/[spot]` | Shareable spot-specific report using a normalized spot-name slug; can switch supported sports. Metadata resolves the spot name server-side. | Server spot lookup for metadata/initial spot plus client `getReportData`. | Recently added. Slug collision handling is not explicit; spot resolution is a two-phase client flow. |
| `/cams` | Webcam grid, current/next condition attachment, favorites, sport filter, full-screen navigation, score modal, and desktop TV mode. | Cached anonymous `getCamsData`, then user/sport re-fetch. | Feature-rich. Media health depends on external streams and client HLS behavior. |
| `/calendar` | Interactive calendar view across forecast slots with sport/spot navigation. | Legacy per-spot Convex query fan-out. | Functional intent is clear, but it has not been migrated to batched reads and is more exposed to read limits/latency. |
| `/journal` | Authenticated list of personal sessions with sport filter and empty state. | `journal.listEntries`; token from AuthProvider. | Implemented for wingfoil/surfing. |
| `/journal/new` | Authenticated session form with known/custom location, date/time, duration, rating, notes, and forecast preview. | `journal.getForecastSlotsForTimeWindow`, `spots.getConditionScores`, `journal.createEntry`. | Implemented, but redirects during render and produces a build-time `location is not defined` error. Kitesurfing is not supported by backend validation or the form. |
| `/journal/[id]` | View/edit/delete a session and compare linked forecast data. | Ownership-checked journal functions. | Implemented. Forecast links can become dangling if admin spot/slot cleanup is expanded without coordination. |
| `/auth/login` | Email entry and magic-link/code flow. | `auth.requestMagicLink` through child components. | Implemented. |
| `/auth/verify` | Token verification from email link and post-login onboarding handling. | `auth.verifyMagicLink`, AuthProvider login. | Implemented. |
| `/profile` | Authenticated display/edit of name and account email. | `auth.updateUser`. | Implemented. |
| `/settings` | Favorite sports/spots, account preferences, personalized-scoring toggle/status, and links to personalization setup. | Multiple auth, spots, and personalization functions. | Implemented but large and orchestration-heavy. |
| `/profile/sport/[sport]` | Skill level and free-form sport context; saves and triggers personalized rescoring. | Personalization profile functions and Groq action. | Implemented for whitelisted sports in the page; costs and progress are not centrally observable. |
| `/profile/spots` | Notes per favorite spot/sport and optional expert-input flag; triggers rescoring. | Personalization context functions. | Implemented. |
| `/subscribe` | Creates, regenerates, copies, and deletes per-sport calendar subscription URLs; includes setup instructions. | Calendar subscription mutations/queries. | Implemented. Feed URLs are bearer credentials. |
| `/subscribe/preview` | Browser preview of a sport/token/spot-filtered calendar feed. | `calendar.getSportFeed`. | Implemented. |
| `/request-spot` | Two-step spot request form with a success confirmation. | Browser component state only. | **Placeholder:** submission only calls `console.log`; nothing reaches a backend or human queue. The success message is misleading. |
| `/changelog` | Server-reads and renders repository `CHANGELOG.md`. | Local filesystem at runtime/build. | Implemented, but changelog stops at 2026-03-01 while code continued through 2026-04-05. |
| `/ui-kit` | Internal visual inventory for typography, controls, cards, scores, sections, and data displays. | Static examples. | Useful development surface; publicly routable unless hosting controls it. |

## 3. Admin routes

All `/admin/*` pages are client-gated by `app/admin/layout.js`, which reads `admin_session_token` from localStorage and calls `admin.verifyAdminSession`. The gate hides pages from normal navigation, but the real authorization boundary is each Convex function.

| Route | Capability |
| --- | --- |
| `/admin/login` | Accepts the shared admin password and stores the same password as the session token. |
| `/admin` | KPI dashboard for spots, scrape status, scoring, and activity. |
| `/admin/spots` | List and delete spots; navigate to editing/creation. |
| `/admin/spots/[id]` | Create/edit spot metadata and supported sports. Sport-specific criteria use `SpotConfigForm`. |
| `/admin/prompts` | List/create/update/delete system and spot-sport prompts. Prompt updates archive prior versions. |
| `/admin/expert-inputs` | Review user-provided expert spot context. |
| `/admin/logs` | View scrape and scoring logs. |
| `/admin/scoring-debug` | Filter scores/logs by spot, sport, time, user, and scrape; inspect raw LLM provenance. |
| `/admin/operations` | Manually trigger scraping or scoring for selected/all spots. |

The admin UI is operationally useful, but its authentication design should be treated as a temporary prototype. See the security register.

## 4. HTTP/API routes

### 4.1 `GET /api/conditions/[sport]/[filter]`

Public CORS-enabled JSON endpoint. Valid sports are `wingfoil`, `kitesurfing`, and `surfing`; filters are `best` or `all`. It lists spots and fans out slots, tides, and scores per spot.

**Current defect:** it creates `scoresMap` keys as `${score.slotId}_${sport}`, but `enrichSlots` looks up `${slot.timestamp}_${sport}`. Scores therefore do not attach to slots. For `best`, this can remove every forecast slot because no slot reaches `score >= 60`.

### 4.2 `GET /api/calendar/[sport]`

Legacy downloadable ICS endpoint.

**Current defect:** it calls `api.calendar.getIdealSlots`, which does not exist in `convex/calendar.ts`. This was already noted in the historical `planning/refactor/02.md`, but remains unresolved in current code. The route should be removed or redirected to the working feed route unless a compatible query is implemented.

### 4.3 `GET /api/calendar/[sport]/feed.ics`

Current calendar feed endpoint. Accepts optional `token` and comma-separated `spots`. It calls `calendar.getSportFeed`, applies a frontend daylight filter, and generates ICS through `lib/ics.js`. Authenticated subscriptions embed their random token in the URL.

### 4.4 `GET /api/live-wind/[stationId]`

Unauthenticated proxy to Windguru's station endpoint. It normalizes speed/gust (already in knots), direction, temperature, and timestamps. Missing wind fields are intentionally interpreted as calm (`0`), and responses advertise a 60-second public cache even though the upstream `fetch` uses `no-store`.

The route interpolates `stationId` into an upstream URL without a numeric/allowlist validation. This is not arbitrary-host SSRF, but input should still be constrained to expected station IDs and rate-limited.

### 4.5 `/api/scrape`

The route file is one blank line and exports no HTTP handlers. README, Render setup, and architecture docs describe a protected/manual scraper endpoint that no longer exists. Next still lists the path in its route manifest, but it has no implemented behavior.

## 5. Forecast presentation rules

The currently implemented score semantics are:

- `0–39`: poor;
- `40–59`: marginal;
- `60–74`: good and included by the Report “Best” filter;
- `75–89`: ideal/excellent candidate;
- `90–100`: epic.

For every slot timestamp and spot, `enrichSlots` searches scores for all relevant selected sports and attaches only the highest one. A multi-sport report does not display one independent row per sport; it effectively shows the best sport interpretation of each weather slot. This is an important product behavior to confirm before fixing RAD-58—“show all selected sports” could mean combined best-per-time (current intent) or separate sport-specific rows.

Daylight logic adds a contextual slot around sunrise/sunset, removes clear nighttime (22:00–06:00), and normally hides after-sunset slots. One highest `score >= 75` non-context slot is marked ideal per spot/day.

## 6. User preference hierarchy

There are three different preference stores:

1. **Browser localStorage:** anonymous onboarding, dashboard spots/sports, report sports, report Best/All, filter expansion, auth tokens, and possibly other UI state.
2. **User document:** favorite spots, favorite sports, name, onboarding completion, and personalized-score toggle.
3. **URL state:** single-sport path routes, `?sport=` report override, day/slot scrolling, calendar feed tokens, and explicit spot filters.

The hierarchy is not centrally defined. `/report` attempts to hydrate local storage, then sync user favorite sports only once when the local array appears empty. Because an empty array also intentionally means “all sports,” the code cannot distinguish “no persisted choice loaded yet,” “user explicitly selected all,” and “valid stored empty array.” This ambiguity is central to RAD-60.

## 7. Feature completeness gaps

### Confirmed by current code

- Request-a-Spot submission is not persisted or sent.
- Journal excludes kitesurfing even though the main product supports it.
- The old calendar route is broken.
- The conditions JSON endpoint cannot attach scores correctly.
- `/api/scrape` is unimplemented.
- Changelog and general architecture docs do not cover April performance/report work.
- No recording code, tables, routes, or components exist in this checkout.

### RADX/repository drift

RADX marks “Webcam session recording — record cam stream to MP4 for playback” done and has an open follow-up referring to `convex/recordings.ts` and a worker that supports five concurrent recordings. Neither that file nor any recording implementation appears anywhere on `main`, local branches, or fetched `origin/*` refs examined during the audit. Before acting on RAD-55, locate the missing repository/branch/deployment or correct the RADX item scope.

## 8. Open Waterman work in RADX

At audit time, six items were in `next`:

| Ref | Priority | Summary | Current-code relationship |
| --- | --- | --- | --- |
| RAD-58 | High | Report is empty when multiple sports are selected. | Core `/report` path. Record mentions Convex read-limit failure; current batched code may be a partial attempted fix, but the item remains open. |
| RAD-57 | High | Pre-filter scoring dealbreakers, reduce tokens, improve voice/spot knowledge. | Current batch scorer still sends every daylight/context slot and can request up to 16k output tokens per day batch. |
| RAD-59 | Medium | Report swallows Convex errors and shows “No conditions.” | Verified in `HomeContent`: catch logs only; no error state or retry. |
| RAD-60 | Medium | Report sport filters fail to persist reliably. | Likely hydration/user-sync ambiguity in `usePersistedState` + `HomeContent`. |
| RAD-54 | Medium | Sport override / “Back to saved” UX is confusing. | Current amber override UI remains present. |
| RAD-55 | Low | Allow concurrent webcam recordings. | Refers to a subsystem absent from this repository snapshot. |

## 9. Product decisions needed before implementation resumes

1. For multi-sport report mode, should one timestamp show the highest selected-sport score, or separate sport rows/scores?
2. Is anonymous “empty sports array = all” still desirable, or should “all” be stored explicitly?
3. Should deep links temporarily scope a report without changing saved preferences, or simply change the active saved filter?
4. Is Request a Spot intended to create RADX work, email the team, or write a dedicated Convex table?
5. Is kitesurfing intentionally excluded from the journal, or is that unfinished migration work?
6. Which calendar endpoint is canonical, and can the legacy route be retired?
7. Where does the recording implementation live, if it is still part of Waterman?
