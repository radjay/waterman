# System architecture

## 1. Runtime topology

```text
Browser / installed PWA
  |-- Next.js pages and route handlers (Render web service)
  |     |-- server-prefetched anonymous reads (Dashboard, Report, Cams)
  |     |-- client-side Convex HTTP reads/writes
  |     |-- public JSON and ICS endpoints
  |     `-- Windguru live-reading proxy
  |
  `-- Convex deployment
        |-- database (20 tables)
        |-- queries and mutations
        |-- scheduled/internal auth cleanup
        |-- Groq scoring actions
        `-- Resend magic-link email action

Render cron service (intended every 6 hours)
  `-- scripts/scrape.mjs
        |-- Windy.app widget API
        `-- public Convex mutations

External media
  `-- HLS/direct webcam streams rendered in the browser
```

The browser and the scraper both talk to Convex using its public deployment URL. There is no application-owned API gateway or server-side authorization layer in front of most Convex calls. This keeps the system simple, but it means every Convex function's visibility and argument-level authorization is part of the security boundary.

## 2. Technology and versions

| Layer | Current implementation |
| --- | --- |
| UI framework | Next.js `16.0.7`, React/React DOM `19.2.1` |
| Rendering | App Router, React Server Components, client components, Cache Components enabled |
| Styling | Tailwind CSS `3.4.18`, custom newspaper/newsprint theme in `app/globals.css` |
| Backend | Convex `1.30.0` plus `convex-helpers` |
| Forecast source | Direct Windy.app widget HTTP endpoint |
| Live wind | Windguru current-station HTTP endpoint proxied through Next.js |
| Scoring | Groq SDK `0.7.0`, model hard-coded as `openai/gpt-oss-120b` |
| Email | Resend HTTP API from a Convex internal action |
| Webcam playback | HLS.js plus native media playback |
| Animation | Framer Motion and Lottie |
| Hosting intent | Render web service + Render cron; Convex Cloud backend |

The README says Node 18+, but the installed Next package declares `node >=20.9.0`. The audit used Node `24.5.0` and npm `11.5.1`.

## 3. Application composition

### 3.1 Root layout

`app/layout.js` wraps every route in:

1. a broad React `Suspense` boundary;
2. `components/ConvexProvider.js`, which creates a module-level `ConvexReactClient` from `NEXT_PUBLIC_CONVEX_URL`;
3. `components/auth/AuthProvider.js`, which implements custom localStorage-token authentication.

Most product pages then render `MainLayout`, `Header`, page content, and sometimes `Footer`. `MainLayout` constrains content to 900px and always adds `BottomNav`. The desktop account control is handled separately through header/navigation components.

### 3.2 Server-prefetched pages

Dashboard, Report, Cams, and single-sport report routes use server components to prefetch anonymous data through `lib/convex-cache.js`:

- `getCachedDashboardData()` → `api.spots.getDashboardData`
- `getCachedReportData(sports)` → `api.spots.getReportData`
- `getCachedCamsData()` → `api.spots.getCamsData`

Each wrapper uses `"use cache"`, `cacheLife("minutes")`, and a cache tag. The build manifest reports a one-minute revalidation and one-hour expiry for Dashboard, Report, and Cams.

The prefetched response removes the initial blank state for anonymous users. After hydration, client code re-fetches when authentication resolves, a sport changes, or personalized scoring is needed. A `skipFirstFetch` ref prevents an unnecessary anonymous duplicate fetch.

### 3.3 Client fetching model

Despite having `ConvexReactProvider`, most screens do not use reactive `useQuery` hooks. They create or import `ConvexHttpClient` instances and fetch inside `useEffect`. Consequences:

- data is snapshot-based rather than live/reactive;
- each page owns loading, stale-request, error, and re-fetch behavior;
- there is substantial repeated orchestration across `HomeContent`, `SportFilterContent`, Dashboard, Cams, Calendar, admin, profile, settings, and journal pages;
- many module-level clients make a valid `NEXT_PUBLIC_CONVEX_URL` mandatory during build-time module evaluation.

The newer high-traffic screens guard stale async responses with a local boolean set during effect cleanup. Older screens vary in resilience.

### 3.4 Authentication model

User authentication is custom rather than Convex Auth:

1. user submits an email to `auth.requestMagicLink`;
2. Convex creates a user if needed, creates a 15-minute token and six-digit code, and schedules `sendMagicLinkEmail`;
3. Resend sends the link and code;
4. link or code verification marks the magic-link record used and creates a 30-day session record;
5. the raw session token is stored as `waterman_session_token` in browser localStorage;
6. `AuthProvider` resolves the token through `auth.getCurrentUser` on mount.

Protected user operations accept the session token as a function argument and usually verify it with the `sessions.by_token` index. Session lifetime is fixed at 30 days: comments claim “30 days of inactivity,” but read queries cannot update `lastActivityAt`, and no rolling extension is implemented.

Admin authentication is separate. `ADMIN_PASSWORD` is compared directly; on success the password itself is returned as `sessionToken` and stored as `admin_session_token` in localStorage. Every admin query/mutation compares the supplied value back to the environment password.

## 4. Main read paths

### 4.1 Report

`app/report/page.js` prefetches anonymous wingfoil data. `app/HomeContent.js` then determines an effective list of sports from:

1. a valid `?sport=` deep-link override, while active;
2. the persisted `waterman_report_sports` array;
3. all three sports when the persisted array is empty.

It calls `getReportData`, which returns every matching non-webcam-only spot plus recent slots, per-sport configs, score maps, tides, and the most recent successful scrape time. Client code enriches each raw slot, choosing the highest score across selected sports at the same timestamp. It then:

- applies the `best` threshold (`score >= 60`) or shows all;
- groups by local formatted day and spot;
- marks sunrise/sunset context slots;
- removes nighttime/non-daylight slots;
- marks a single ideal slot (`score >= 75`) per spot/day;
- renders `DaySection` groups.

The URL-based `/<sport>/<filter>` route duplicates much of this pipeline for a single sport and makes the filter state shareable in the path.

### 4.2 Dashboard

Dashboard chooses target spots in this order:

- explicit saved IDs for anonymous users;
- the authenticated user's favorites;
- otherwise the first ten non-webcam-only spots in database order.

It reads all three sports, enriches slots, and derives “Right Now” conditions/webcams plus future “Coming Up” groups. Slot cards link to `/report?day=...&sport=...`, activating the report override behavior.

### 4.3 Cams

`getCamsData` selects spots with either `webcamStreamId` or nonempty `webcamUrl`, optionally filters by sport, then attaches forecast/config/score data. The client selects a current daylight slot per spot, or the next upcoming slot today, and shows the best score among candidates. Users can favorite a spot, open fullscreen playback, navigate between cameras, or enter desktop TV mode.

### 4.4 Calendar

The interactive `/calendar` screen uses a legacy multi-query pattern: list spots, then fetch configs, scores, slots, and tides per spot. It is not on the newer batched-query path. Calendar subscriptions use a separate Convex query that builds `score >= 75` events for a sport, with favorite-spot and personalized-score support when a valid subscription token is supplied.

### 4.5 Journal and profiles

Journal functions are session-token protected and enforce entry ownership. Entries may refer to a known spot or custom location and capture forecast slot IDs near the session time. Profile/settings surfaces update account details, favorite sports/spots, personalization settings, sport profiles, and spot notes. Profile changes can trigger new personalized Groq scoring runs.

## 5. Code organization

| Path | Responsibility | Notes |
| --- | --- | --- |
| `app/` | Pages, layouts, route handlers, page-level orchestration | Large client pages mix data fetching, transformation, and rendering. |
| `components/ui/` | Reusable visual primitives | A useful internal UI kit exists at `/ui-kit`. |
| `components/forecast/`, `tide/`, `webcam/` | Domain presentation | Generally presentational with localized media/tide logic. |
| `components/auth/`, `onboarding/` | Token auth and first-run flow | Uses custom localStorage sessions. |
| `convex/` | Schema, public/internal functions, actions, cron | `spots.ts`, `admin.ts`, and `personalization.ts` are very large. |
| `lib/` | Slot/tide/daylight/ICS/scraper/cache helpers | Some helpers are well-factored; route orchestration remains duplicated. |
| `scripts/` | Scrape, seed, inspect, migration, debug operations | Several scripts mutate production-capable Convex functions. |
| `planning/` | Historical PRDs and refactor plans | Not authoritative for current architecture. |
| `docs/plans/` | Recent focused implementation plans | More current than most of `planning/`. |

## 6. Architectural strengths

- The domain model is richer than the old README suggests: provenance, prompt history, personalization, calendar subscriptions, and journal linkage are all represented.
- The latest high-traffic pages use batched Convex queries and anonymous server prefetching, addressing earlier page-flash and round-trip problems.
- Slot processing is mostly centralized in `lib/slots.js`, with separate daylight and tide utilities.
- Score provenance is captured with raw prompts/responses and prompt/score history tables.
- The scraper uses a direct JSON source rather than browser automation, making the core ingest path lighter than its dependency/deployment setup implies.
- User-owned journal and personalization mutations generally perform session and ownership checks.
- Convex indexes cover most recent high-volume read paths.

## 7. Architectural constraints to preserve during cleanup

- Forecast slot IDs change on every scrape; current display matching therefore uses `(timestamp, sport)` rather than slot ID.
- Today's disappeared/past slots are intentionally carried forward from recent scrapes so users can still see earlier conditions.
- Anonymous server-prefetched data must not include personalized scores.
- Personalized scores fall back to system scores per timestamp.
- Calendar subscription tokens are bearer secrets embedded in feed URLs; they cannot depend on browser localStorage sessions.
- Webcam-only spots intentionally bypass forecast scraping/scoring.
- The daylight/context-slot rules are duplicated between frontend and scoring code and must remain behaviorally aligned if refactored.
