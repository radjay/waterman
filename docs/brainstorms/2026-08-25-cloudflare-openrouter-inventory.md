---
date: 2026-08-25
topic: cloudflare-openrouter-inventory
status: inventory
---

# Waterman infra, LLM, and API inventory

This file is the first artifact for a move to Cloudflare and OpenRouter.
It records what the **code** uses today. Stale docs are called out.

Public production frontend observed on 2026-08-03: `https://watermanreport.com`.
Live Convex deployment observed then: `adorable-anteater-323`.

## Topology (current)

```text
Browser / PWA
  |-- Next.js 16 on Render web service (port from Render)
  |     |-- pages, App Router, cacheComponents
  |     |-- Next route handlers (live wind, model grid, ICS, recordings)
  |     `-- ConvexHttpClient / ConvexReactClient
  |
  `-- Convex Cloud
        |-- 36 tables, queries, mutations, actions
        |-- Groq scoring actions (GROQ_API_KEY)
        |-- magic-link email via Cloudflare Email Worker
        |-- crons: auth cleanup + Windguru poll every 5 min

Render cron / workers
  |-- waterman-scraper       (4x daily)  scripts/scrape.mjs
  |-- waterman-recorder      (always on) scripts/recorder-worker.mjs + ffmpeg + R2
  |-- waterman-fx-openmeteo  (hourly)    Open-Meteo ingest
  |-- waterman-fx-labels     (hourly)    labels + skill + predictions
  |-- waterman-fx-observations (loop)    Windguru + IPMA
  `-- waterman-fx-nowcast    (every 20m) nowcast predictions

Already on Cloudflare
  |-- Email Worker (workers/email) + Email Service, sender waterman@radx.dev
  `-- R2 bucket for webcam recordings (S3 API)

Local / offline
  |-- Python LightGBM training (ml/bay-wind)
  `-- Puppeteer Chrome (postinstall + screenshot script; not used by scrape)
```

GitHub repo: `radjay/waterman`. No `.github/workflows`. Render is the intended deploy trigger on push to `main`.

---

## 1. Hosting and compute (replace candidates)

| Service | Role | Evidence | Cloudflare target |
| --- | --- | --- | --- |
| **Render web** `waterman` | Next.js `npm start` | `render.yaml`, `RENDER_SETUP.md` | Pages / Workers via OpenNext |
| **Render cron** `waterman-scraper` | Forecast ingest 00/06/12/18 UTC | `render.yaml`, `scripts/scrape.mjs` | Cron Trigger + Worker |
| **Render web** `waterman-recorder` | Express + ffmpeg HLS→MP4 | `render.yaml`, `scripts/recorder-worker.mjs` | **Hard.** Workers cannot run ffmpeg. Needs Containers, or drop the feature |
| **Render cron** `waterman-fx-openmeteo` | Hourly Open-Meteo single-run fetch | `render.yaml` | Cron Trigger |
| **Render cron** `waterman-fx-labels` | Labels, skill scores, predictions | `render.yaml` | Cron Trigger |
| **Render worker** `waterman-fx-observations` | Poll every 300s | `render.yaml` | Cron Trigger (already duplicated in part by Convex station poll) |
| **Render cron** `waterman-fx-nowcast` | Nowcast every 20 min | `render.yaml` | Cron Trigger |
| **Convex Cloud** | DB, backend functions, scheduler | `convex/`, `NEXT_PUBLIC_CONVEX_URL` | **Keep.** D1 is not a better fit at this scale. See section 10 |
| **GitHub** | Source only. No CI | remote `radjay/waterman` | Pages Git integration or `wrangler` in Actions |
| **npm / Node** | Runtime `>=20.9.0` | Next package engines | Workers + Pages Node compat |

Convex is the whole backend: 36 tables, indexes, actions with 30s–5min LLM retries, and scheduled jobs. Leaving it is a rewrite. This project does not do that rewrite.

---

## 2. Already on Cloudflare (keep)

| Service | Role | Config |
| --- | --- | --- |
| **Email Worker** `waterman-email` | Magic-link send | `workers/email/wrangler.jsonc`, account `1a01a13db2af69babc5d1c3d98826578` |
| **Email Service binding** | Native `EMAIL` send | Allowed sender `waterman@radx.dev` |
| **R2** | Recording MP4 storage | S3 API via `@aws-sdk/client-s3`. Env: `CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (default `waterman-recordings`), `R2_PUBLIC_URL` |

DNS / domains named in code or ops docs (not all verified live):

- `watermanreport.com` — production frontend
- `waterman.app` — AUTH_SETUP canonical URL
- `waterman.radx.dev` — mentioned in the repo audit
- `recordings.watermanreport.com` — example R2 public URL
- `*.convex.cloud` — backend
- `*.workers.dev` — email Worker

---

## 3. LLMs

| Item | Current | Call sites |
| --- | --- | --- |
| **Provider** | Groq (`groq-sdk` `^0.7.0`) | Convex actions only |
| **Key** | `GROQ_API_KEY` (Convex env) | `convex/spots.ts`, `convex/personalization.ts` |
| **Model** | Hard-coded `openai/gpt-oss-120b` | Same files. Temperature `0.3`, `max_tokens` `4000`, `response_format: json_object` |
| **System score** | `spots.scoreSingleSlot`, `spots.scoreForecastSlots` | After each scrape |
| **Personalized score** | `personalization.scorePersonalizedSlot`, `scorePersonalizedSlots`, `scorePersonalizedSlotsAfterScrape` | After scrape and after profile edits |
| **Retries** | 30s / 1m / 5m (system); 30s / 1m (personal) | Same actions |
| **OpenRouter** | Not present | — |
| **Other hosted LLMs** | None in runtime code | No OpenAI, Anthropic, Gemini, or xAI SDK |

`planning/scoring-system-analysis.md` says the model is `qwen/qwen3-32b`. **Code still uses `openai/gpt-oss-120b`.** Trust the code.

Bay-wind “models” (v1–v4, analog, LightGBM JSON) are **local algorithms**, not LLM calls. Training is Python (`ml/bay-wind/train.py`: lightgbm, scikit-learn, pandas, numpy). Inference reads `data/forecast-experiment/*.json`.

---

## 4. External data APIs (keep as sources)

These are weather / media vendors. They do not move to Cloudflare. The **call site** moves with the host.

| API | URL / pattern | Used by | Auth |
| --- | --- | --- | --- |
| **Windy.app widget** | `https://windy.app/widget/data.php?id=wfwindyapp&spotID=…` | `lib/scraper.js`, `scripts/scrape.mjs`, `convex/admin.ts` scrape, `app/api/models/[windySpotId]` | None. Browser-like User-Agent + Referer |
| **Windguru iAPI current** | `https://www.windguru.cz/int/iapi.php?q=station_data_current` | `lib/windguru.js`, Convex `stations.pollStations`, `app/api/live-wind/[stationId]`, fx observations | None. Referer `windguru.cz/station/{id}` |
| **Windguru iAPI history** | `iapi.php?q=station_data` | `lib/forecast-experiment/windguruClient.js`, `scripts/fx-backfill-windguru-history.mjs` | None |
| **Open-Meteo Single Runs** | `https://single-runs-api.open-meteo.com/v1/forecast` | `lib/forecast-experiment/openMeteoClient.js` | None (public) |
| **Open-Meteo Previous Runs** | `https://previous-runs-api.open-meteo.com/v1/forecast` | Same + backfill script | None |
| **IPMA stations** | `https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json` | `lib/forecast-experiment/ipmaClient.js` | None |
| **IPMA observations** | `…/stations/observations.json` | Same + `scripts/fx-fetch-observations.mjs` | None |
| **Quanteec HLS** | `https://deliverys5.quanteec.com/contents/encodings/live/{id}/media_0.m3u8` | Webcam UI, recorder | Public stream URL |
| **IOL Beachcam** | `https://video-auth1.iol.pt/beachcam/{slug}/playlist.m3u8` | Seed, import script, live cams when `webcamStreamSource === "iol"` | Public stream URL. No IOL API key |
| **Google Fonts (build)** | `next/font/google` in `app/layout.js` | Bricolage Grotesque, Space Grotesk, JetBrains Mono | Build-time download. Runtime is self-hosted. No Google account |
| **SunCalc** | npm `suncalc` | `lib/sun.js` | Local library, no network |

Tides come **inside the Windy widget payload**, not a separate tide API.

---

## 5. Email (already migrated off Resend)

| Item | State |
| --- | --- |
| **Current path** | Convex `auth.sendMagicLinkEmail` → `POST` Cloudflare Email Worker → Email Service |
| **Env** | `CLOUDFLARE_EMAIL_WORKER_URL`, `CLOUDFLARE_EMAIL_WORKER_SECRET`, Worker secret `EMAIL_WORKER_SECRET` |
| **Resend** | **Removed from runtime code.** No `resend` package. No `RESEND_API_KEY` reads |
| **Stale docs** | `docs/e2e/2026-08-03-production-smoke-test.md` and `docs/repository-audit/04-operations-and-deployment.md` still describe Resend 401. That was true on 2026-08-03. Code now uses the Worker |

---

## 6. Storage and data

### Convex tables (36)

Product: `users`, `magic_links`, `sessions`, `spots`, `spotConfigs`, `forecast_slots`, `forecast_slots_archive`, `forecast_model_slots`, `station_readings`, `cam_rider_counts`, `tides`, `scrapes`, `condition_scores`, `system_sport_prompts`, `scoring_prompts`, `score_history`, `prompt_history`, `system_prompt_history`, `calendar_subscriptions`, `user_sport_profiles`, `user_spot_context`, `personalization_logs`, `scoring_logs`, `session_entries`, `recordings`.

Forecast experiment: `fx_locations`, `fx_observation_sources`, `fx_worker_runs`, `fx_forecast_runs`, `fx_forecast_points`, `fx_observations`, `fx_user_reports`, `fx_daily_labels`, `fx_model_skill_scores`, `fx_predictions`.

### Convex crons (`convex/crons.ts`)

| Job | Schedule |
| --- | --- |
| Cleanup expired magic links | Daily 03:00 UTC |
| Cleanup expired sessions | Daily 03:30 UTC |
| Poll Windguru stations | Every 5 minutes |

### Object storage

R2 via AWS S3 SDK. Keys live on `recordings` rows (`r2Key`, `r2Url`).

### Not used

No Postgres, Redis, Upstash, Neon, Supabase, Firebase, Sentry, Posthog, Stripe.

---

## 7. Next.js API routes (move with the app)

| Route | Upstream |
| --- | --- |
| `GET /api/live-wind/[stationId]` | Windguru current |
| `GET /api/models/[windySpotId]` | Windy widget, 30 min in-process cache |
| `GET /api/calendar/[sport]/…` | Convex calendar + ICS |
| `GET /api/conditions/[sport]/[filter]` | Convex report data |
| `GET /api/experiment/*` | Convex fx tables |
| `POST /api/recordings/start\|stop` | Convex + `RECORDER_WORKER_URL` |
| `app/api/scrape/route.js` | **Empty file.** README still mentions `SCRAPE_SECRET_TOKEN` |

---

## 8. Environment variables

### Next / Render

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Build fails without it |
| `NEXT_PUBLIC_APP_URL` | Recommended | Defaults disagree (`localhost:3000` vs `watermanreport.com`) |
| `RECORDER_WORKER_URL` | Recorder | Default `http://localhost:4000` |
| `RECORDER_WORKER_SECRET` | Recorder | Shared with worker |
| `NEXT_PUBLIC_FLAG_RIDER_COUNTS` | Optional | Feature flag |
| `NEXT_PUBLIC_FLAG_STATION_EVIDENCE` | Optional | Feature flag |
| `NEXT_PUBLIC_FLAG_MODEL_CONFIDENCE` | Optional | Default `"true"` |
| `NEXT_PUBLIC_FLAG_OVERRIDES_ENABLED` | Optional | Preview overrides |
| `SCRAPE_SECRET_TOKEN` | Dead | README only; scrape route is empty |
| `PUPPETEER_*`, `RENDER` | Dead for scrape | Diagnostics / screenshot only |

### Convex

| Variable | Role |
| --- | --- |
| `GROQ_API_KEY` | Scoring |
| `ADMIN_PASSWORD` | Admin session (password is the token) |
| `NEXT_PUBLIC_APP_URL` | Magic links and calendar URLs |
| `CLOUDFLARE_EMAIL_WORKER_URL` | Email |
| `CLOUDFLARE_EMAIL_WORKER_SECRET` | Email |

### Recorder / R2

`PORT`, `MAX_CONCURRENT_RECORDINGS`, `MAX_RECORDING_DURATION`, `RECORDER_WORKER_SECRET`, `CF_ACCOUNT_ID`, `R2_*`.

### Forecast-experiment scripts

`FX_FORECAST_DAYS`, `FX_PREDICTION_VERSION`, `FX_PREDICTION_LAYERS`, `FX_OBSERVATION_POLL_SECONDS`, `FX_RIDEABILITY_PRESET`, `FX_LABEL_DAYS_BACK`, `FX_SKILL_*`, `FX_BACKFILL_*`, `FX_BACKTEST_*`, `BACKFILL_*`.

No checked-in `.env.example`.

---

## 9. Leftover / unused runtime

| Item | Status |
| --- | --- |
| `puppeteer` + `postinstall` Chrome download | Scraper no longer uses it. `scripts/screenshot.mjs` and `check-puppeteer.mjs` still do |
| `express` | Recorder worker only |
| `@aws-sdk/client-s3` | R2 only (S3-compatible) |
| `app/api/scrape/route.js` | Empty |
| Resend | Docs only |
| GitHub Actions | Absent |

---

## 10. Target after this decision (2026-08-25)

**Decision:** keep Convex. Do not migrate to D1 in this project.

D1 would only be in scope if it were a clear win on cost, fit, or operations. It is not.

### Why Convex stays

| Claim | Reality in this repo |
| --- | --- |
| D1 is cheaper | Convex is already cheap at this scale. The rewrite cost dwarfs the bill. |
| D1 is a better data model | Scores, prompts, logs, and `fx_predictions.probabilityTimeline` are nested documents. Convex stores them as documents. D1 would park JSON in columns and lose inner indexes. |
| Workers replace Convex actions | Scoring already uses `ctx.scheduler.runAfter` plus 30s / 1m / 5m retries. That is a Convex action job, not one Worker request. |
| One vendor is worth it | Every screen talks to Convex over HTTP. There is no second data path. A D1 move is an app rewrite with no user-visible gain. |
| Convex realtime is unused, so leave | True: most screens use `ConvexHttpClient`, not live queries. That weakens Convex’s unique feature. It does **not** make D1 better. The HTTP client is still the data layer. Replacing it is still every call site. |

Known Convex pain (`docs/plans/2026-04-10-003-fix-convex-query-document-read-limits-plan.md`) is a query-shape problem. Fix it in Convex. Do not use it as a reason to leave.

Revisit D1 only if Convex cost jumps, document-read limits stay unfixable, or a new workload needs edge SQL that Convex cannot serve.

### In scope

1. Groq → OpenRouter. Same chat-completions shape. Call it from the existing Convex actions.
2. Render web → Cloudflare Workers via OpenNext. Convex URL stays `NEXT_PUBLIC_CONVEX_URL`.
3. Render jobs → Convex crons where they already fit (scrape and station poll already have Convex paths), else Cloudflare Cron Triggers that write through Convex.
4. Finish remaining Convex document-read query-shape and score retention work.
5. Remove the recorder feature and worker.

### Already done

- Magic-link email on Cloudflare Email Service.
- Score write-path re-key on `(spotId, sport, timestamp)` with duplicate drain.

### Stay as data sources

Windy.app, Windguru, Open-Meteo, IPMA, Quanteec, IOL Beachcam.

### Still awkward on Workers

- Python LightGBM **training** (keep local; inference is JSON in-repo).
- Recorder: **remove** the feature and the Render worker. Do not port ffmpeg.

---

## 11. Warden review (2026-08-18)

Source: `/Users/server/dev/warden/warden-reviews/waterman.md`.
Warden catalog vendors for this repo: Cloudflare, Convex, Groq, Render, Resend.
MASTER treated Open-Meteo, Windguru, and IPMA as catalog gaps. That is correct.

This inventory is one week later. Code is the source of truth.

### Catalog vendors

| Warden vendor | 2026-08-25 status | Migration |
| --- | --- | --- |
| Cloudflare | Live: Email Worker, Email Service, R2 | Keep. Expand |
| Convex | Live: 36 tables, functions, crons | **Keep.** Not D1 |
| Groq | Live: scoring actions | Replace with OpenRouter |
| Render | Live: web + 6 jobs | Replace with Pages / Workers / Cron |
| Resend | **Stale.** Runtime uses the Cloudflare Email Worker. `RESEND_API_KEY` remains only in old docs and `planning/prds/03-email-authentication.md` | Do not restore |

### Bindings Warden listed

| Binding | Live? | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Public Convex URL |
| `CONVEX_URL` | Scripts only | Alias in `scripts/import-webcams.mjs` |
| `CONVEX_DEPLOYMENT` | Not in tracked source | Convex CLI writes this to local `.env`. Not a second vendor |
| `GROQ_API_KEY` | Yes | Convex scoring |
| `ADMIN_PASSWORD` | Yes | Admin session token |
| `CLOUDFLARE_EMAIL_WORKER_URL` / `_SECRET` | Yes | Convex → Worker |
| `EMAIL_WORKER_SECRET` | Yes | Worker binding |
| `CF_ACCOUNT_ID`, `R2_*` | Yes | Recorder uploads |
| `RECORDER_WORKER_SECRET` | Yes | Next.js ↔ recorder |
| `WORKER_SECRET` | Name only | Local alias for `RECORDER_WORKER_SECRET` in `scripts/recorder-worker.mjs` and recording routes. Not a separate env key |
| `RESEND_API_KEY` | No (runtime) | Docs and old PRD only |

### Origins Warden listed

| Origin | Class |
| --- | --- |
| `watermanreport.com`, `www.watermanreport.com`, `waterman.app` | App hosts |
| `adorable-anteater-323.convex.cloud`, `dashboard.convex.dev` | Convex |
| `windy.app` | Forecast source |
| `windguru.cz` / `www.windguru.cz` | Station source |
| `single-runs-api.open-meteo.com`, `previous-runs-api.open-meteo.com` | Fx ingest |
| `api.ipma.pt` | Fx observations |
| `deliverys5.quanteec.com` | Webcam HLS |
| `video-auth1.iol.pt` | IOL Beachcam HLS. Keep as a media source |
| `recordings.watermanreport.com` | Example R2 public URL |
| `fonts.googleapis.com` | Stale as a runtime origin. Fonts now come through `next/font/google` and are self-hosted at runtime |
| `github.com` | Source repo |
| `ds-preview.invalid`, `*.quanteec.invalid`, `cams.scheveningen.invalid`, `cams.wijkaanzee.invalid` | Fixtures / design-sync, not live |
| `www.beachcam.nl` | Not in current source. Dutch cam names exist only as ds-bundle preview fixtures. Live Beachcam URLs are on `video-auth1.iol.pt` |
| `www.w3.org` | XML/SVG namespace, not a vendor |

Warden did not list OpenRouter. There is still no OpenRouter client in this repo.

Warden did not change the migration map. It confirms the same replace set (Render, Convex, Groq) and the same keep-external weather/media set. It adds one named media vendor we should keep: **IOL Beachcam**. It confirms Resend should drop from the catalog for this repo.

## Sources

- `package.json`, `render.yaml`, `convex/schema.ts`, `convex/crons.ts`, `convex/spots.ts`, `convex/personalization.ts`, `convex/auth.ts`, `convex/stations.ts`, `convex/admin.ts`
- `lib/scraper.js`, `lib/windguru.js`, `lib/forecast-experiment/openMeteoClient.js`, `lib/forecast-experiment/ipmaClient.js`
- `workers/email/wrangler.jsonc`, `scripts/recorder-worker.mjs`, `scripts/import-webcams.mjs`, `AUTH_SETUP.md`, `app/layout.js`
- `docs/repository-audit/02-system-architecture.md`, `docs/repository-audit/04-operations-and-deployment.md` (partially stale on Resend)
- Warden: `warden-reviews/waterman.md` (2026-08-18), `warden-reviews/MASTER.md`, `warden-reviews/SECOND-PASS-AUDIT.md`
