# Operations and deployment

## 1. Current deployment intent

The checked-in design is:

- **Render web service:** installs dependencies/Chrome, runs `npm run build`, starts `npm start`.
- **Render cron service:** intended to run `node scripts/scrape.mjs` four times daily.
- **Convex Cloud:** stores data and runs backend functions, scheduled cleanup, Groq actions, and Resend email action.
- **GitHub:** push to `main` is described in SOPs as the automatic Render deployment trigger.

The initial repository audit did not have authenticated Render or Convex access, so most of this document describes repository intent rather than live configuration. A subsequent production smoke test on 2026-08-03 identified the live frontend's Convex deployment as `adorable-anteater-323` and read its function logs; see the dated E2E report for that bounded verification.

## 2. Required environment variables

### 2.1 Next.js/Render runtime

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Root provider, server cache helpers, nearly every client page, API routes, scripts | Missing value causes module-evaluation failures during `next build`. Being public is normal for Convex; function authorization must be enforced in Convex. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Subscribe UI and some shared URL construction | Canonical public origin. Fallbacks are inconsistent. |
| `RENDER` | No | Puppeteer diagnostics only | No longer relevant to forecast fetch. |
| `PUPPETEER_EXECUTABLE_PATH`, `PUPPETEER_CACHE_DIR` | No | Diagnostics only | Core scraper no longer uses Puppeteer. |
| `CONVEX_URL` | Optional script alias | Webcam import script | Falls back to `NEXT_PUBLIC_CONVEX_URL`. |

### 2.2 Convex deployment environment

| Variable | Required | Used by | Failure mode |
| --- | --- | --- | --- |
| `GROQ_API_KEY` | Required for scoring | System and personalized actions | Actions log and return empty/null results; forecast slots still save. |
| `RESEND_API_KEY` | Required for email login | `auth.sendMagicLinkEmail` | **Confirmed broken in production on 2026-08-03:** Resend returned HTTP 401 `API key is invalid`. The request mutation still reports “Magic link sent” because email action is fire-and-forget and returns failure only internally. |
| `ADMIN_PASSWORD` | Required for admin | All admin functions | Admin login unavailable if missing. Password doubles as persistent session token. |
| `NEXT_PUBLIC_APP_URL` | Required for correct links | Auth email and calendar subscription functions | Defaults differ by function; a missing value can produce localhost or another unintended host. |

There is no checked-in `.env.example`, startup schema validation, or single canonical environment reference.

## 3. Local setup: what actually works

### Prerequisites

- Node `>=20.9.0` (from installed Next package; the README's Node 18 guidance is stale).
- npm.
- A Convex project/deployment and URL.
- Convex environment secrets for auth/admin/scoring if those features are exercised.

### Recommended reorientation setup

```bash
npm ci
npx convex dev
npm run dev
```

Create `.env.local` with at least:

```dotenv
NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
NEXT_PUBLIC_APP_URL=http://localhost:3010
```

The dev script listens on port `3010`, while README examples say `3000`. Use `http://localhost:3010` unless the script changes.

Set backend secrets with the Convex CLI/dashboard rather than placing server-only values in the public Next environment.

### Build behavior

`npm run build` was exercised twice:

1. **No Convex URL:** compilation completed, then page-data collection failed because module-level `ConvexHttpClient` constructors received `undefined`.
2. **Placeholder Convex URL:** build exited 0 and produced the full route manifest. It also logged failed server prefetches and two `ReferenceError: location is not defined` errors while prerendering `/journal/new`.

Therefore, an exit code of zero is not a sufficient deployment check. Build logs must be scanned, and a post-build smoke suite should request critical routes.

## 4. Package scripts

| Command | Current result | Action needed |
| --- | --- | --- |
| `npm run dev` | Starts Next dev on port 3010 when env is valid. | Keep or align docs/port. |
| `npm run build` | Environment-dependent; can exit 0 with prerender errors. | Add env validation and fail-on-console/smoke checks. |
| `npm start` | Standard `next start`. | Confirm Render passes correct `PORT`. |
| `npm run lint` | Fails: Next interprets `lint` as a project directory because Next 16 removed `next lint`. | Install/configure ESLint and use `eslint .`. |
| `npm test` | Intentionally prints “Error: no test specified” and exits 1. | Choose a runner and make it authoritative. |
| `npm run scrape` | Runs the external-data ingestion script. | Secure the Convex write functions and add operational exit semantics first. |

`postinstall` downloads Chrome through Puppeteer and ignores failure. This adds install time, network dependence, binary footprint, and audit surface for functionality the current scraper does not use.

## 5. Render configuration review

Tracked `render.yaml`:

```yaml
services:
  - type: web
    name: waterman
    buildCommand: npm install && npx puppeteer browsers install chrome && npm run build
    startCommand: npm start
  - type: cron
    name: waterman-scraper
    schedule: "0 0,6,12,18 * * *"
    buildCommand: npm install && tes
    startCommand: node scripts/scrape.mjs
```

Findings:

- The cron build command contains `tes`, which is not a valid command in this repository. A blueprint-created/rebuilt cron should fail its build.
- Both services use `npm install` rather than deterministic `npm ci`.
- The web service and package `postinstall` both install Chrome, duplicating work.
- Chrome/Puppeteer are not needed by the current direct-API scraper.
- Only `NEXT_PUBLIC_CONVEX_URL` is declared. The public app URL is not declared, and Convex-side secrets are necessarily outside this file.
- The file is both tracked and listed in `.gitignore`; future contributors may miss changes/status behavior.
- There is no health-check path or explicit Node version.
- The repository docs disagree on schedule: older setup says twice daily; `render.yaml` and SOP say every six hours.

Before changing the blueprint, compare it with the actual Render dashboard. The live service may have been configured manually and could differ from the tracked file.

## 6. Convex deployment and codegen

The repository checks in `convex/_generated/*`. Typical development requires `npx convex dev`; production backend changes require `npx convex deploy` in addition to deploying Next.js. The SOP says a GitHub push triggers Render, but it does not define who/what deploys Convex functions.

This creates a release-order risk:

- frontend can reference backend functions not yet deployed;
- backend validators/schema can change before a compatible frontend deploy;
- generated API files can drift from the live deployment;
- Render rollback does not roll back Convex code or data.

A restart should define one release pipeline with an explicit order, environment target, migration gate, and rollback procedure.

## 7. Migrations and backups

`scripts/runMigration.mjs` does not create an automatic export. It:

1. instructs the operator to create a backup in the Convex dashboard;
2. blocks on an interactive yes/no confirmation;
3. invokes the requested function with `npx convex run <module:function>`;
4. reports success/failure.

The SOP correctly insists on backups. Remaining concerns:

- migration functions such as `addKitesurfingToSpots` are normal public mutations, not internal/admin-restricted operations;
- archived migrations remain deployable under `convex/_archive/` only if Convex includes that path; they should be checked against actual deployment conventions;
- the manual backup confirmation is honor-based and does not capture a backup ID/timestamp; restore commands should be tested against the installed Convex CLI version;
- there is no migration registry or applied-version table;
- spot deletion is an incomplete manual cascade and should not be treated like an ordinary CRUD operation.

## 8. Scheduled jobs

### Convex cron

- daily 03:00 UTC: expired magic links;
- daily 03:30 UTC: expired sessions.

### Render cron

- intended every six hours: forecast scrape and asynchronous scoring trigger.

Missing scheduled operations:

- no stale-data alert;
- no verification that every spot was ingested;
- no scoring completion/failure alert;
- no retention cleanup;
- no orphan cleanup;
- no periodic dependency or backup verification.

## 9. Observability

### Available

- `scrapes` table and admin scrape list/statistics;
- `condition_scores`, `scoring_logs`, and scoring-debug admin UI;
- `personalization_logs`;
- browser/server console logging;
- Render and Convex platform logs (per SOP);
- footer displays the most recent successful scrape timestamp.

### Missing or misleading

- external fetch failures and zero-slot results may not create scrape records;
- cron process can exit successfully after all per-spot failures;
- email scheduling failure is not returned to the user;
- report data errors are collapsed into “No conditions”;
- no error aggregation service, tracing, metrics, or uptime monitor is configured in the repo;
- no alert for data older than 48 hours, when the report read helper returns empty;
- no cost/token telemetry tied to Groq calls;
- scoring logs duplicate prompt/response payloads but do not provide a compact job-level status model;
- `calendar_subscriptions` contains access fields that are never updated.

## 10. Operational scripts

| Script | Mutates data? | Current purpose/caution |
| --- | --- | --- |
| `scripts/scrape.mjs` | Yes | Main ingest; triggers potentially expensive scoring. |
| `scripts/remove-today-scrapes.mjs` | Destructive | Calls an unauthenticated public deletion mutation. |
| `scripts/seed-prompts.mjs` | Yes | Seeds/updates system and spot prompts. |
| `scripts/add-spot-coordinates.mjs` | Yes | Writes location data. |
| `scripts/import-webcams.mjs` | Yes | Bulk webcam import; review input and environment carefully. |
| `scripts/runMigration.mjs` | Yes | Backup + arbitrary named Convex migration execution. |
| `scripts/check-scores.mjs` | Read-only | Samples score state. |
| `scripts/check-scoring-status.mjs` | Read-only | Checks prompt and score presence. |
| `scripts/debug_filter.mjs` | Read-only | Legacy criteria/filter investigation. |
| `scripts/inspect_db.mjs` | Read-only | Small database inspection. |
| `scripts/check-puppeteer.mjs` | Read-only | Obsolete for the primary ingest path. |

## 11. Release checklist to establish

Before considering the repository operational again, a release should require:

1. clean, reviewed worktree and identified target commit;
2. `npm ci` on a pinned supported Node version;
3. dependency audit reviewed against a recorded allowlist (ideally zero high/critical);
4. generated Convex API/schema checked for drift;
5. lint, unit, backend authorization, and route smoke tests pass;
6. production build runs with validated non-secret public env and no unexpected error logs;
7. Convex deploy and schema/migrations execute in documented order after backup;
8. Render deploy completes and critical routes return expected status/content;
9. manual/authenticated smoke tests cover Dashboard, Report single/multi-sport, Cams, login email/code, journal, calendar feed, and admin;
10. one controlled scrape is observed through system scoring and freshness display;
11. rollback points for both Render and Convex are recorded.

## 12. Production questions that require external verification

- What is the actual public domain: `waterman.radx.dev`, `watermanreport.com`, or another origin?
- Are Render services managed by this blueprint or manually?
- Is the cron currently running, and what was its last all-spots-successful execution?
- Which Convex deployment is production, and when were functions last deployed?
- Are `GROQ_API_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, and canonical app URL set in Convex?
- What is current database size and growth by table?
- Are backups enabled/tested, and what is retention?
- Email is confirmed unhealthy as of 2026-08-03 because the live Resend credential is invalid. Are webcam, Windguru, and Windy endpoints healthy, and has email been reverified after credential rotation?
- Does any deployed recording service exist outside this repository?
