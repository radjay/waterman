# Waterman repository restart guide

**Audit date:** 2026-08-03  
**Repository snapshot:** `main` at `f5d8ded` (`origin/main`)  
**RADX space:** Waterman  
**Audit work item:** `ks744rxcpn600wwrynnhae9p498brpr0`

This documentation is a ground-up description of the repository as it exists today. It is intended to be the starting point for renewed development, not a restatement of older planning documents. Where code, older docs, and RADX records disagree, these files say so explicitly.

## Read this first

Waterman is a mobile-oriented watersports conditions product for wingfoiling, kitesurfing, and surfing. It combines forecast ingestion from Windy.app, live Windguru readings, webcam streams, LLM-generated condition scores, user personalization, calendar feeds, and a session journal. The application is a Next.js 16 App Router frontend backed by Convex. A Render cron job is intended to ingest forecasts four times per day; Convex actions then score the resulting slots with Groq.

The product is substantial, but the repository is not currently in a safe “resume feature work immediately” state. The most important findings are:

1. **The Convex write boundary is open.** Several destructive or cost-incurring functions are public and have no authentication, including forecast/tide writes, score writes, spot creation/update helpers, deletion of today's scrape data, prompt updates, and Groq scoring actions. This is the highest-priority restart issue.
2. **The deployed dependency set is stale and vulnerable.** `npm audit --omit=dev` reports 8 production vulnerabilities: 1 critical, 6 high, and 1 moderate. The direct `next@16.0.7` dependency is affected by multiple advisories and should be upgraded deliberately.
3. **There is no functioning quality gate.** `npm test` intentionally exits 1, `npm run lint` invokes a removed `next lint` command, the present tests cannot run with installed dependencies, and there is no checked-in CI workflow.
4. **Build success is environment-dependent and misleading.** Without `NEXT_PUBLIC_CONVEX_URL`, `npm run build` fails during module evaluation. With a placeholder URL, it exits 0, but prerender logs `ReferenceError: location is not defined` from `/journal/new` and server-prefetch failures.
5. **Deployment configuration is internally inconsistent.** The tracked `render.yaml` cron build command ends in `&& tes`, the scraper no longer uses Puppeteer although deployment still installs Chrome, and the documented `/api/scrape` endpoint is an empty one-line file.
6. **Two public API routes are broken or incomplete.** `/api/calendar/[sport]` calls a nonexistent `api.calendar.getIdealSlots`; `/api/conditions/[sport]/[filter]` keys scores by slot ID while the enrichment code expects timestamp keys, so scores do not attach correctly.
7. **Some visible features are placeholders.** “Request a Spot” displays success but only logs the request to the browser console. RADX recording work refers to a recording subsystem that is absent from this checkout.
8. **The active report has known regressions.** RADX tracks multi-sport report failure, swallowed backend errors, filter persistence/hydration issues, and confusing deep-link override UX.

## Documentation map

| Document | Purpose |
| --- | --- |
| [Product and route inventory](repository-audit/01-product-and-route-inventory.md) | What users and admins can do; every page and HTTP route; complete, partial, and placeholder features. |
| [System architecture](repository-audit/02-system-architecture.md) | Runtime topology, frontend composition, server/client fetching, caching, and major code boundaries. |
| [Data model and pipelines](repository-audit/03-data-model-and-pipelines.md) | All 20 Convex tables, forecast ingestion, scoring, personalization, calendar, auth, and journal flows. |
| [Operations and deployment](repository-audit/04-operations-and-deployment.md) | Environment variables, local setup, Render/Convex deployment, scheduled jobs, migrations, and observability. |
| [Quality, security, and risk register](repository-audit/05-quality-security-and-risks.md) | Reproducible verification results, security findings, data integrity risks, stale docs, and maintainability issues. |
| [Restart plan](repository-audit/06-restart-plan.md) | A staged plan to regain a trustworthy development and production baseline before adding features. |
| [Production smoke test — 2026-08-03](e2e/2026-08-03-production-smoke-test.md) | Live anonymous onboarding and authentication test; confirmed Resend credential failure, repair steps, and E2E resume point. |

Existing implementation plans remain under [`docs/plans/`](plans/). Older product documents under `planning/` are useful historical context, but several are materially stale; see the risk register before relying on them.

## Snapshot facts

- 277 commits on `main`; the last commit is dated 2026-04-05.
- 209 tracked files.
- Approximately 28,000 lines across `app/`, `components/`, `convex/`, `lib/`, `hooks/`, and `scripts/` (generated Convex files included in that raw count).
- 20 Convex tables.
- 35 application route entry files: 30 pages and 5 API routes (plus framework-generated routes in the build manifest).
- 3 supported forecast sports: `wingfoil`, `kitesurfing`, `surfing`.
- 6 open Waterman items in RADX `next` at audit time, plus the audit task created for this review.
- No local `.env.local` or checked-in `.env.example` was present.
- The worktree contained unrelated untracked content before/during the audit; it was left untouched.

## Evidence and confidence labels

The audit distinguishes:

- **Verified:** observed by reading current code or running a local command.
- **Code-implied:** follows directly from current control flow but was not exercised against production services.
- **RADX-reported:** recorded as open or completed work in the Waterman space; production state was not independently queried.
- **Historical:** described by commit history or older docs and may no longer match the runtime.

No production Convex or Render credentials were available in the checkout, so this review did not mutate or inspect production data, production logs, scheduled-job history, email delivery, Groq usage, or live webcam availability.
