# Quality, security, and risk register

## 1. Verification performed

All commands were run on 2026-08-03 from `main` at `f5d8ded`.

| Check | Result |
| --- | --- |
| `git status --short --branch` | `main` matched `origin/main`; unrelated untracked local directories/files were present and left untouched. |
| `npm run build` without env | **Failed** during page-data collection because module-level Convex clients received an undefined deployment URL. |
| `NEXT_PUBLIC_CONVEX_URL=https://placeholder.convex.cloud npm run build` | **Exited 0**, compiled all routes, but logged failed server prefetches and `ReferenceError: location is not defined` from `/journal/new`. |
| `npm test` | **Failed by definition**: package script prints “Error: no test specified.” |
| direct `node --test` on present tests | **Failed**: missing `@testing-library/react`; the slug test also imports `../spotSlug` without an ESM file extension. |
| `npm run lint` | **Failed**: `next lint` is not a Next 16 lint command. |
| `npm audit --omit=dev --json` | **Failed audit:** 8 production vulnerabilities (1 critical, 6 high, 1 moderate). |
| `npm ls --depth=0` | Installed tree resolved without missing top-level dependencies. |

There is no checked-in `.github/workflows` CI, ESLint configuration, type-check script, test runner configuration, coverage configuration, route smoke test, or `.env.example`.

## 2. Priority definitions

- **P0:** active security/data/cost exposure; fix before normal development or public operation.
- **P1:** likely production failure, data-integrity problem, or release blocker.
- **P2:** significant reliability/maintainability issue that should be scheduled early.
- **P3:** cleanup, documentation, or lower-impact product debt.

## 3. P0 findings

### SEC-01 — Public unauthenticated Convex mutation surface

**Evidence:** functions are declared with public `mutation`/`action`, accept no trusted secret/session, and are reachable through the public Convex deployment URL.

Examples include:

- write or delete forecast data: `saveForecastSlots`, `saveTides`, `removeTodayScrapes`;
- modify topology: `updateWindySpotId`, `updateSpotCoordinates`, `addSpot`, `addWebcamSpot`, `addSpotCoordinates`;
- inject/replace scores and prompts: `saveConditionScore`, `updateSystemSportPrompt`, `updateScoringPrompt`;
- run completed migrations: `removeSystemPromptField`, `removeTideFieldsFromSlots`, `addKitesurfingToSpots`, seed mutations, and archived migration modules;
- delete auth records by document ID: `auth.deleteMagicLink`, `auth.deleteSession`;
- write fake personalization activity: `personalization.logScoringEvent`.

**Impact:** unauthorized data insertion/deletion, forged scores, prompt poisoning, forced migrations, account session invalidation, database/cost exhaustion, and loss of trust in all derived conditions.

**Required direction:** convert machine-only operations to `internalMutation`/`internalAction`, call them only from trusted scheduled/actions, or require a scoped ingest/admin credential with constant-time verification. Remove completed migrations from the deployed function graph. Add authorization tests that enumerate every public write function.

### SEC-02 — Public cost-incurring Groq actions

**Evidence:** `spots.scoreSingleSlot`, `spots.scoreForecastSlots`, `personalization.scorePersonalizedSlot`, and `personalization.scorePersonalizedSlotsAfterScrape` are public. Several accept IDs/context directly and do not verify a session or trusted caller.

**Impact:** an attacker can repeatedly trigger expensive LLM calls, create score/log volume, consume Groq quota, and degrade scoring availability. Personalized actions can be invoked with forged context/user identifiers.

**Required direction:** make scheduler-only and nested scoring actions internal; expose one user-facing rescore action that derives user ID/context from a verified session and enforces quotas/idempotency.

### SEC-03 — Personalized score IDOR/privacy boundary

**Evidence:** public `getDashboardData`, `getCamsData`, `getReportData`, `getConditionScores`, and `getConditionScoreBySlot` accept an arbitrary `userId` and return matching personalized score/reasoning without validating that the caller owns that user ID.

**Impact:** a caller who obtains/guesses a Convex user document ID can query personalized reasoning that may reflect private skill or spot notes. It also bypasses the intended session-token ownership boundary.

**Required direction:** create authenticated variants that accept `sessionToken`, derive the user internally, and keep anonymous variants system-score-only. Never accept caller-chosen user IDs on public product reads.

### SEC-04 — Admin password is the persistent browser session

**Evidence:** `admin.authenticate` returns `ADMIN_PASSWORD` itself; the browser stores it in localStorage; all admin functions compare it directly.

**Impact:** any XSS, browser extension, shared machine access, or accidental logging leaks the durable backend password. There is no expiry, rotation overlap, revocation by session, identity/audit attribution, or rate limit on login attempts.

**Required direction:** replace with short-lived, revocable server-side admin sessions or a real identity/role system. Store credentials in secure, HTTP-only, same-site cookies where possible. Rotate the existing password after migration.

### SEC-05 — Known vulnerable production dependency tree

`npm audit --omit=dev` reported:

- 1 critical: `basic-ftp` through Puppeteer proxy dependencies;
- 6 high: including direct `next@16.0.7`, plus `form-data`, `js-yaml`, `postcss`, `sharp`, and `ws` paths;
- 1 moderate: `ip-address`.

`next@16.0.7` is far behind fixes reported by the audit. Several Puppeteer-chain issues can likely disappear entirely by removing the obsolete browser dependency.

**Required direction:** upgrade Next/React through a tested patch path, update transitive dependencies, remove Puppeteer if no fallback is retained, rerun audit, and record any residual advisories with applicability analysis.

## 4. P1 findings

### REL-01 — Invalid scrape can become the active report dataset

`saveForecastSlots` inserts rows even when validation fails. `_getForecastSlotsForSpot` then takes the maximum of the latest successful timestamp and all recent slot scrape timestamps. A newer failed scrape wins, has no scheduled scores, and can make “Best” reports empty.

**Fix:** either do not insert invalid rows into the active dataset, or select strictly from a successful scrape record and retain invalid payloads separately for diagnostics.

### REL-02 — Report hides backend failures as “No conditions”

Verified in `HomeContent` and tracked as RAD-59. The catch block only logs; loading becomes false; empty state renders. This masks read-limit, network, auth, and deployment errors.

**Fix:** explicit error state, retry, freshness context, and preservation of last known data.

### REL-03 — Multi-sport report failure remains open

RADX RAD-58 reports reproducible empty results for multiple sports. The current batched query may be a partial fix for the documented Convex read-limit cause, but the item is still open and no automated test covers it.

**Fix:** reproduce against a development dataset, assert OR semantics and best-per-timestamp behavior, verify read counts, and add backend plus UI coverage.

### REL-04 — Broken public endpoints

- `/api/calendar/[sport]` references nonexistent `calendar.getIdealSlots`.
- `/api/conditions/[sport]/[filter]` creates score-map keys incompatible with `enrichSlots`.
- `/api/scrape` has no handler despite documentation.

**Fix:** choose canonical routes, repair with integration tests, and return explicit 404/410 for retired endpoints.

### REL-05 — Build can pass while prerender throws

With a placeholder Convex URL, the build exits 0 while logging `ReferenceError: location is not defined`. `/journal/new` calls `router.push` during render when no session token exists.

**Fix:** redirect in an effect or server-auth boundary, and add a build-log/route-smoke gate that fails on runtime errors.

### OPS-01 — Render cron blueprint has a broken build command

`buildCommand: npm install && tes` is invalid. Repository docs also install unnecessary Chrome and disagree on schedule.

**Fix:** reconcile with the live dashboard, switch to deterministic install, remove obsolete browser setup, and validate the blueprint in a staging service.

### DATA-01 — Incomplete spot deletion cascade

Admin deletion omits user favorites, spot contexts, journal references, score/prompt history, and scoring logs. It can leave orphans/dangling IDs and destroy forecast slots referenced from journals.

**Fix:** replace immediate delete with archive/deactivate for normal use. If hard delete is required, implement a complete dependency inventory, dry-run count, backup gate, and batched internal cleanup.

### OPS-02 — Convex cleanup cron likely has visibility mismatch

`cleanupExpiredMagicLinks` and `cleanupExpiredSessions` call `internal.auth.getExpired*` and `internal.auth.delete*`, but those helpers are declared as public `query`/`mutation`, not `internalQuery`/`internalMutation`. The checked-in generated API filters public and internal references separately. Next build does not type-check Convex deployment code in this repo configuration.

**Impact:** a fresh Convex typecheck/deploy may fail, or the crons may reference unavailable internal functions. Independently, the public delete helpers are a security issue.

**Fix:** declare helpers internal, regenerate Convex API types, run Convex typecheck/deploy in CI, and test the scheduled functions.

## 5. P2 findings

### QUAL-01 — No executable automated test system

The repository has a tracked hook test and an untracked slug test, but:

- package test script is a placeholder;
- testing-library packages are absent;
- no DOM test environment/runner is configured;
- Node ESM import style breaks the slug test;
- Convex functions have no authorization/data-flow tests;
- no route integration or browser smoke coverage exists.

### QUAL-02 — Lint/typecheck gap

The lint script is obsolete. Frontend code is mostly JavaScript, so the “Running TypeScript” phase gives limited coverage. Convex TypeScript is not covered by an explicit repo typecheck command. Large client pages can contain runtime-only problems that compilation misses.

### DATA-02 — Unbounded storage and duplicated scoring provenance

Forecasts, scores, logs, and histories have no retention. Batch scoring stores the same full prompt/raw response once per slot. Personalized scoring adds a user multiplier. Recent query cutoffs mask rather than solve growth.

### COST-01 — Personalized scoring scales multiplicatively

Each scrape scans all users for each spot, then serially scores every daylight slot for every eligible user/sport. No job deduplication, concurrency limit, daily quota, token budget, or global kill switch is modeled.

### AUTH-01 — User session/browser token hardening

User session tokens are stored in localStorage and have fixed 30-day expiry. Multiple sessions accumulate, there is no “log out all devices,” no rolling/idle semantics despite comments, and no token hashing at rest. This is less severe than admin password exposure but should be redesigned with it.

### AUTH-02 — Verification brute-force and delivery feedback

Magic-link issuance is limited per email, but six-digit verification attempts are not. Email delivery failure is asynchronous and not reflected in the request response. A user can be told that mail was sent when `RESEND_API_KEY` is missing or Resend fails.

**Production verification, 2026-08-03:** two live `auth:sendMagicLinkEmail` executions returned Resend HTTP 401 `validation_error: API key is invalid`, while the browser displayed “We sent a sign-in link.” The failed requests still inserted magic-link records and consumed issuance attempts. See `docs/e2e/2026-08-03-production-smoke-test.md`.

### PERF-01 — Full-table and fan-out paths remain

- most spot lists collect the whole `spots` table;
- interactive Calendar performs several requests per spot;
- journal forecast linking collects all slots for a spot;
- personalized post-scrape selection collects all users;
- some admin queries use full scans/filters;
- missing retention increases the impact over time.

### UX-01 — Filter persistence has ambiguous empty state

`usePersistedState` initializes to `[]`; `[]` also means “all sports”; the authenticated favorite-sport sync treats it as “nothing selected.” Hydration and user resolution can race, tracked as RAD-60.

### UX-02 — Placeholder submission claims success

Request a Spot does not persist/send its data but shows “Request Submitted!” and promises review. This should be disabled/labeled or wired to a real destination.

### DATA-03 — Calendar token caching/privacy

Tokenized personalized ICS responses set `Cache-Control: public, max-age=3600`. Shared proxy/CDN behavior should be reviewed; personalized bearer-token resources usually require private/no-store or carefully keyed caching.

### DATA-04 — User score replacement/deduplication is implicit

Personalized scores insert repeatedly. Selection relies on map overwrite order rather than an explicit latest-row comparison or unique current-score key.

### CODE-01 — Duplicated report implementations

`HomeContent` and `SportFilterContent` duplicate hundreds of lines of fetching, enrichment, filtering, grouping, daylight logic, scrolling, and rendering. Fixes can land in one and not the other.

### CODE-02 — Oversized modules

Examples:

- `convex/spots.ts` >2,100 lines;
- `convex/personalization.ts` >1,400 lines;
- `convex/admin.ts` >1,300 lines;
- `app/admin/scoring-debug/page.js` >700 lines;
- several pages >500 lines.

Security boundaries, domain logic, migrations, and UI orchestration are interleaved.

## 6. P3 findings

### DOC-01 — Core docs are materially stale

- `planning/architecture.md` says four tables; current schema has 20.
- README component/tree instructions omit Dashboard, auth, personalization, journal, admin breadth, caching, and newer sports.
- README says Node 18+ and port 3000; installed Next needs 20.9+ and dev script uses 3010.
- scripts docs say scraping requires Puppeteer/Chrome; current scraper uses `fetch`.
- Render docs describe a scraper API route and secret that do not exist.
- changelog ends before April changes.
- production URL is still a placeholder in SOP while code/docs use multiple domains.

### DOC-02 — RADX/repository recording mismatch

Recording work is described as shipped/open in RADX, but no implementation is present in this checkout or inspected refs. This must be reconciled before planning against it.

### REPO-01 — Branch clutter/drift

Several local/remote branches contain commits ahead of `main`. Patch-equivalence checks show some are already integrated under different hashes, while `origin/perf/client-orchestration-and-cams-query` has two non-equivalent commits even though analogous functionality exists on main. Do not merge stale branches blindly; archive after comparison.

### REPO-02 — Ignored tracked deployment file

`render.yaml` is tracked but also ignored by `.gitignore`, which can confuse future adds/status expectations.

### CODE-03 — Dead dependencies/files and generated artifacts

Puppeteer/Chrome setup appears obsolete. Legacy criteria utilities, old calendar endpoint, archived Convex migrations, old UI components, and planning refactor targets need a reachability audit before removal.

## 7. Security boundary inventory

| Boundary | Current control | Assessment |
| --- | --- | --- |
| Anonymous forecast reads | Public Convex queries | Appropriate for public product data, but personalized `userId` must not be caller-chosen. |
| User writes/reads | Raw session token argument, ownership checks | Generally present in auth/personalization/journal/calendar; should be centralized and hardened. |
| Forecast ingestion | No auth on public mutations | Critical exposure. |
| System/personalized LLM jobs | Several public actions | Critical cost and integrity exposure. |
| Admin | Shared password returned/stored as token | Critical credential design weakness. |
| Calendar subscription | Random bearer token in URL | Acceptable pattern if caching, rotation, logging, and secrecy are handled. |
| Live wind | Public proxy | Expected public data; validate/rate-limit input. |
| Webcam streams | Browser accesses external URLs/IDs | Availability/privacy depends on providers; no server authorization. |

## 8. What is currently trustworthy

- Git history and current source snapshot are internally inspectable.
- Next compilation succeeds when a syntactically valid Convex URL exists.
- Core forecast parsing and slot enrichment are explicit and understandable.
- High-traffic batched queries have indexes and recent-data cutoffs.
- User-owned journal and personalization CRUD paths mostly enforce session ownership.
- Score/prompt provenance exists in the model.

## 9. What is not yet verified

- live production domain, deploy state, and commit;
- live Convex schema/function version;
- live data correctness and table volumes;
- current cron success and freshness;
- email deliverability;
- Groq model availability, costs, and scoring quality;
- webcam/HLS availability;
- Render blueprint parity;
- calendar subscription behavior in real calendar clients;
- authenticated mobile/PWA flows;
- whether April changes fixed RAD-58 in production;
- any recording deployment outside this repository.
