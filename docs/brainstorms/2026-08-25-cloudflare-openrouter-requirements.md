---
date: 2026-08-25
topic: cloudflare-openrouter
---

# Move hosting and LLMs to Cloudflare and OpenRouter

## Problem Frame

Waterman runs a Next.js app and six jobs on Render, scores conditions with Groq, and stores everything in Convex. The goal is to leave Render and Groq, and to run on Cloudflare plus OpenRouter.

Convex stays. It is cheap at this scale. A D1 move is a backend rewrite. Nested score and forecast documents, plus scheduled LLM retries, fit Convex better than D1.

## Requirements

**Vendors**
- R1. Keep Convex as the database, function layer, and scheduler.
- R2. Do not migrate data or queries to D1, Durable Objects, or KV as part of this work.
- R3. Replace Groq with OpenRouter for all condition scoring.
- R4. Host the Next.js app on Cloudflare (Pages or Workers).
- R5. Remove every Render service once the Cloudflare and Convex paths are live, including `waterman-recorder`.
- R6. Keep the Cloudflare Email Worker. The R2 recordings bucket is only for the recorder; delete app use of it with the recorder.

**Scoring**
- R7. Call OpenRouter from the existing Convex scoring actions (`spots.scoreSingleSlot`, `spots.scoreForecastSlots`, `personalization.scorePersonalizedSlot` and the batch wrappers).
- R8. Keep the current prompt, temperature 0.3, token limit, and retry cadence. Use strict JSON schema. Do not enable model reasoning. Default OpenRouter model is `openai/gpt-5.6-luna`.
- R9. Store the provider and model name on score rows so provenance stays accurate after the swap.

**Jobs**
- R10. Forecast scrape, station poll, and scoring fan-out must keep running without Render.
- R11. Prefer Convex crons and actions for jobs that already have a Convex path.
- R12. Forecast-experiment ingest (Open-Meteo, labels, predictions, nowcast) must keep running. Planning chooses Convex cron vs Cloudflare Cron Trigger per job, based on runtime limits.

**Convex reads**
- R13. Keep Convex as the place that stays under the 32,000-document / 16MB query limits. Do not move those queries to D1.
- R14. Finish the remaining query-shape and retention work so hot reads (`getReportData`, `getDashboardData`, `getCamsData`, calendar feed) stay well under the limits as spots and scrapes grow.
- R15. Do not re-do the score write-path re-key. `saveConditionScore` already keys on `(spotId, sport, timestamp)` and drains duplicates. Build on that.

**Recorder**
- R16. Remove the webcam recording feature, including the Render worker, Next.js start/stop routes, `/recordings` page, `RecordButton`, Convex `recordings` module and table, and the `@aws-sdk` / `express` dependencies that exist only for it.

**Unchanged sources**
- R17. Keep Windy.app, Windguru, Open-Meteo, IPMA, Quanteec, and IOL Beachcam as external data or media sources.

## Success Criteria

- Production at `watermanreport.com` (or the chosen canonical host) serves from Cloudflare, not Render.
- A scrape still writes slots and system scores.
- Personalized scoring still runs after a scrape and after a profile edit.
- Magic-link email still sends through the Cloudflare Email Worker.
- No Groq key is required in Convex.
- Convex remains the only application database.
- Hot Convex queries no longer approach the 32k-document or 16MB limits on a full report/dashboard load.
- Users cannot start a recording. No recorder process runs. No `/recordings` route.

## Scope Boundaries

- No Convex → D1 (or other Cloudflare database) migration.
- No rewrite of screen data fetching off `ConvexHttpClient` / `ConvexReactClient`.
- No change to sport rules, score meaning, or forecast geometry.
- No Python training move. LightGBM training stays local.
- Resend stays retired.
- Do not keep a stub recording UI. Remove the feature.

## Key Decisions

- Keep Convex: cost is not the problem; the data model and scheduler already match the workload. Revisit D1 only if Convex cost jumps, read limits stay unfixable after this query-shape work, or a new workload needs edge SQL.
- The known Convex document-read limits are a query-shape problem. Fix those in Convex. (see origin: `docs/plans/2026-04-10-003-fix-convex-query-document-read-limits-plan.md` and `docs/plans/2026-08-05-006-fix-condition-scores-read-amplification-plan.md`)
- OpenRouter replaces Groq in place, inside Convex actions, rather than a new Worker scoring service.
- “Entirely Cloudflare” means hosting, email, and jobs — not the database.
- Remove the recorder feature including the worker. ffmpeg does not move. R2 recordings go with it.

## Dependencies / Assumptions

- OpenRouter serves a model that can return structured JSON at similar quality to `openai/gpt-oss-120b` (same slug or an explicit substitute).
- Next.js 16 with `cacheComponents` can run on Cloudflare via OpenNext, or the app drops that flag if the adapter cannot support it.
- Convex action time limits can cover scrape and most fx jobs. Jobs that cannot fit move to Cloudflare Cron Triggers that write through Convex.

## Outstanding Questions

### Resolve Before Planning

(none)

### Deferred to Planning

- [Affects R7][Technical] Direct OpenRouter from Convex vs Cloudflare AI Gateway in front.
- [Affects R4][Technical] OpenNext adapter vs Cloudflare Pages Node; Next 16 `cacheComponents` support.
- [Affects R12][Technical] Which fx jobs fit Convex action limits, and which need a Cron Trigger.
- [Affects R8][Needs research] Whether OpenRouter’s `openai/gpt-oss-120b` matches Groq’s behaviour enough to keep the slug.
- [Affects R14][Technical] Whether `pruneDuplicateConditionScores` has already been applied in production; measure current `getReportData` document reads before pruning again.

## Next Steps

Plan: `docs/plans/2026-08-25-001-refactor-cloudflare-openrouter-plan.md`
