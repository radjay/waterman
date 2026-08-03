# Restart plan

## Goal

Regain a secure, reproducible, observable development and production baseline before extending the product. The plan deliberately separates “make it safe,” “make it testable,” “confirm production truth,” and “resume product work.”

## Phase 0 — Freeze and establish production truth

**Do before deploying repository changes.**

1. Identify the canonical production URL and verify which Git commit it serves.
2. Identify the production Convex deployment and compare its schema/functions with this checkout.
3. Compare live Render service settings with `render.yaml`; record web/cron service IDs, schedules, Node version, build/start commands, and env names (not secret values).
4. Check the last 14 days of Render cron and Convex logs:
   - per-run start/end/exit;
   - every spot attempted;
   - slot/tide counts;
   - system and personalized score completion;
   - email errors;
   - read-limit or timeout errors.
5. Capture table counts/storage estimates for all 20 Convex tables.
6. Create and verify a production backup; document restore ownership and expected recovery time.
7. Locate the alleged webcam-recording implementation or correct RADX RAD-52/RAD-55 scope.
8. Reproduce RAD-58, RAD-59, RAD-60, and RAD-54 against production or a production-sized development snapshot.

**Exit criteria:** a dated environment/deployment inventory, known production commit, backup checkpoint, current table volumes, and a verified list of active incidents.

## Phase 1 — Close the security boundary

### 1.1 Inventory every Convex function

Generate a machine-readable list classified as:

- anonymous public read;
- authenticated user read/write;
- admin read/write;
- ingest-only internal;
- scheduler-only internal;
- migration/seed (not deployed normally).

Default every write/action to internal unless a documented caller requires public access.

### 1.2 Secure ingestion and scoring

1. Convert `saveForecastSlots`, `saveTides`, scraper metadata updates, scoring actions, and score writes to internal functions.
2. Choose one trusted ingest entry point:
   - preferred: a Convex scheduled/internal action fetches Windy itself; or
   - external Render cron calls one authenticated action using a dedicated rotatable ingest secret.
3. Derive slot IDs, spot sports, user IDs, and personalized context server-side; do not accept these as trusted public arguments.
4. Add idempotency by `(spotId, scrapeTimestamp/source run)` and job status records.
5. Add rate/cost limits and a scoring kill switch.

### 1.3 Fix identity boundaries

1. Replace caller-supplied `userId` on report/dashboard/cams/score reads with a verified session token or separate anonymous/authenticated functions.
2. Replace admin password-as-token with proper expiring sessions and attribution.
3. Move user/admin bearer tokens away from long-lived localStorage where practical.
4. Add verification attempt rate limits and email-delivery status.
5. Make auth cleanup helpers truly internal and verify cron deployment.

### 1.4 Remove public migrations

Move seed and completed migration modules outside the normal deployed function graph or make them internal/admin-gated, time-bounded, and auditable.

**Exit criteria:** authorization tests prove anonymous callers cannot write data, trigger Groq, read another user's personalized score, administer the system, or run migrations.

## Phase 2 — Rebuild the quality gate

### 2.1 Tooling baseline

1. Pin Node (for example `.nvmrc`/`.tool-versions` and package `engines`) to a supported LTS satisfying Next.
2. Use `npm ci` in CI/deploy.
3. Upgrade Next/React and vulnerable dependencies; remove Puppeteer if unused.
4. Add ESLint for Next/React/JavaScript/TypeScript and replace `next lint`.
5. Add an explicit Convex typecheck/codegen check.
6. Add formatting only if the team wants it; do not mix a full reformat with functional fixes.

### 2.2 Test pyramid

**Unit tests**

- spot slug normalization and collision behavior;
- persisted-state hydration semantics;
- direction/daylight/context-slot boundaries;
- slot enrichment for one/multiple sports;
- Best/All and ideal/epic thresholds;
- tide extraction/association;
- ICS escaping/folding.

**Convex tests**

- every public function authorization class;
- valid/invalid scrape selection;
- system/personalized score fallback and newest-row behavior;
- calendar token ownership/spot filtering;
- journal ownership and forecast linkage;
- complete spot archive/delete policy;
- cron helper visibility.

**Route/component tests**

- conditions JSON has attached scores and correct Best output;
- canonical ICS endpoint works; legacy route returns deliberate redirect/retirement response;
- report distinguishes backend error from empty results;
- multi-sport OR semantics;
- Request a Spot persists or does not claim success;
- journal unauthenticated redirect does not run during render.

**Browser smoke tests**

- anonymous Dashboard → Report → Cams;
- report persistence across refresh;
- magic link/code login with a test mail sink;
- preferences and personalized score toggle;
- journal create/edit/delete;
- admin login and one read-only page;
- mobile viewport navigation and webcam modal fallback.

### 2.3 CI

At minimum on every pull request:

1. clean install;
2. dependency audit policy;
3. lint;
4. unit/Convex tests;
5. Convex typecheck/codegen drift;
6. production build with test public env;
7. route smoke tests against the built server.

**Exit criteria:** one documented command and CI workflow produce a reliable red/green signal; no build-time console errors; zero known high/critical applicable vulnerabilities.

## Phase 3 — Repair data correctness and operations

### 3.1 Scrape runs as first-class jobs

Add a run model with overall and per-spot status:

```text
run: scheduled/manual, startedAt, finishedAt, status, source version
spot result: source status, parse status, validation, slot/tide counts, error
scoring job: system/personalized counts, retries, cost/token estimates, status
```

Return nonzero/failure when an expected spot fails. Retain enough raw source metadata (or a short-lived response snapshot) to replay parser failures.

### 3.2 Correct active dataset selection

- Only validated successful scrapes become active.
- Preserve today's rolled-off slots as an explicit merge rule.
- Expose freshness/stale/error separately to clients.
- Make score availability part of readiness, or clearly show “forecast loaded, scoring pending.”

### 3.3 Retention and indexing

Decide retention for:

- raw forecast scrapes;
- current vs historical scores;
- full scoring prompts/responses;
- auth artifacts;
- personalization logs;
- deleted/archive spots and journal references.

Measure before choosing. Batch cleanup and export older provenance rather than adding unbounded full scans.

### 3.4 Deployment pipeline

1. Fix/reconcile `render.yaml`.
2. Remove duplicate Chrome installs.
3. Define Convex vs Next deployment order.
4. Add staging or preview deployment with separate Convex data.
5. Add health/freshness checks and alerting.
6. Make rollback cover both code and schema/data.

**Exit criteria:** a controlled scrape becomes an active scored report, failures alert and fail the job, data freshness is visible, and deploy/rollback is rehearsed.

## Phase 4 — Resolve current product bugs

Recommended order:

1. **RAD-59:** add explicit report error/retry state. This makes every later diagnosis visible.
2. **RAD-58:** reproduce and fix multi-sport semantics/read behavior with production-sized tests.
3. **RAD-60:** model persisted filter state explicitly (`unhydrated`, `all`, selected IDs) and remove the user-sync race.
4. **RAD-54:** decide whether URL sport scope is temporary or saved; simplify copy/controls accordingly.
5. Repair or retire the two broken public API endpoints.
6. Fix `/journal/new` redirect and decide kitesurfing journal support.
7. Wire Request a Spot to a durable destination or disable the false-success flow.
8. Reconcile recording work before touching RAD-55.

For report work, first extract a shared report domain layer/hook used by both `/report` and `/<sport>/<filter>` so bugs are fixed once.

**Exit criteria:** open high/medium Waterman bugs have reproductions and passing regression tests; placeholder/broken routes are no longer misleading.

## Phase 5 — Optimize scoring after correctness

Implement RAD-57 only after job accounting and test fixtures exist.

1. Create a representative fixed forecast corpus with human-reviewed expected dealbreakers/ranges.
2. Deterministically classify obvious skips (daylight, minimum wind, unsafe waves) without an LLM.
3. Send only judgment-requiring slots.
4. Remove unsupported factor fields or supply real tide input.
5. Reduce duplicated prompt text and store one batch log with per-slot result references.
6. Add few-shot voice examples and verified spot-direction knowledge.
7. Compare score quality, false positives/negatives, prompt tokens, completion tokens, latency, and cost against baseline.
8. Roll out behind a version/feature flag and preserve scorer version in provenance.

**Exit criteria:** measured quality is maintained/improved, estimated spend reduction is demonstrated, and every score is attributable to a scorer/prompt version.

## Phase 6 — Resume roadmap work

Only after Phases 1–4 are complete should new product scope be prioritized. Candidate work already implicit in the repository:

- real Request-a-Spot workflow;
- journal kitesurfing support and better actual-vs-forecast learning;
- recording subsystem, if located and intentionally owned;
- notification/alerting features from older planning;
- performance migration of Calendar;
- UI decomposition and accessibility audit;
- product analytics/feedback loops.

## Suggested first pull requests

Keep security and tooling changes reviewable:

1. **PR 1: Baseline tooling** — Node pin, ESLint, test runner, CI skeleton, existing slug/share tests made executable; no product behavior change.
2. **PR 2: Convex surface lockdown** — internalize ingest/migration/auth cleanup helpers; add public-function authorization tests.
3. **PR 3: Authenticated personalized reads** — remove arbitrary public user IDs and add ownership tests.
4. **PR 4: Admin session replacement** — new session table/flow, migration/rotation, audit attribution.
5. **PR 5: Dependency/platform upgrade** — Next patch upgrade, Puppeteer removal, audit cleanup, build/smoke compatibility.
6. **PR 6: Scrape job integrity** — valid-active selection, per-spot failures, nonzero job semantics, freshness/error DTO.
7. **PR 7: Report resilience and shared domain layer** — RAD-59 foundation, then RAD-58/RAD-60 regression tests.

Do not combine all of these into one restart branch; the blast radius and security review would be too large.

## Definition of a solid starting point

The project is ready for ordinary feature work when all are true:

- production commit/environment/data health are known;
- no anonymous caller can mutate core data or incur Groq costs;
- personalized data cannot be read by arbitrary user ID;
- admin credentials are expiring and revocable;
- no applicable high/critical production dependency vulnerabilities remain;
- install, lint, typecheck, tests, build, and route smoke checks pass in CI;
- build logs contain no runtime/prerender exceptions;
- one canonical calendar endpoint and one functioning request workflow are documented;
- scrape/scoring jobs have end-to-end status, freshness, alerts, and retention;
- RAD-58/59/60 are covered by automated regressions;
- current docs match deployed architecture and release procedures.
