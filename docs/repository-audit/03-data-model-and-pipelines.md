# Data model and pipelines

## 1. Convex schema overview

The current schema has 20 tables, not the four described in the old architecture document.

### 1.1 Identity and authentication

| Table | Purpose | Important indexes/behavior |
| --- | --- | --- |
| `users` | Email identity, name, onboarding state, favorite spots/sports, personalized-score toggle. | `by_email`. Favorite IDs are stored as arrays on the user document. |
| `magic_links` | 15-minute, single-use email token plus optional six-digit code. | `by_token`, `by_email`, `by_user`. Used records remain until daily cleanup action deletes expired rows. |
| `sessions` | Raw bearer token, user, fixed expiry, timestamps. | `by_token`, `by_user`. Daily cleanup. No rolling expiry despite `lastActivityAt`. |

### 1.2 Forecast domain

| Table | Purpose | Important indexes/behavior |
| --- | --- | --- |
| `spots` | Spot identity, Windy source, supported sports, webcam/live-report metadata, coordinates. | No indexes. Most callers collect the full table and filter in memory. |
| `spotConfigs` | Per-spot/per-sport legacy numeric criteria. | `by_spot_sport`. Configs still seed prompts and appear in admin, but display matching is score-driven. |
| `forecast_slots` | One forecast time point from one scrape: wind and optional wave data. | `by_spot`, `by_spot_and_scrape_timestamp`, `by_spot_timestamp`. Every scrape inserts new rows. Old tide fields remain optional for migration compatibility. |
| `tides` | High/low tide events for a spot. | `by_spot`, `by_spot_time`, `by_spot_and_scrape_timestamp`. Each new tide save replaces all rows for that spot. |
| `scrapes` | Per-spot scrape validation record. | `by_spot_and_timestamp`, `by_success_timestamp`. Does not capture all external/script failures. |

### 1.3 Scoring and provenance

| Table | Purpose | Important indexes/behavior |
| --- | --- | --- |
| `condition_scores` | Current system (`userId: null`) and personalized scores for a slot/sport. Stores denormalized spot/timestamp/scrape values. | `by_slot_sport`, `by_spot_sport_timestamp`, `by_user_spot_sport`. |
| `system_sport_prompts` | Active general prompt per sport. | `by_sport`. |
| `scoring_prompts` | Active spot-specific and temporal prompts; optionally user-specific. | `by_spot_sport`, `by_user_spot_sport`. |
| `score_history` | Archived score values and prompt snapshots when a system score is replaced. | `by_slot_sport`, `by_spot_timestamp`, `by_replaced_by`. |
| `prompt_history` | Archived spot-prompt versions. | `by_spot_sport`, `by_replaced_by`. |
| `system_prompt_history` | Archived system-prompt versions. | `by_sport`, `by_replaced_by`. |
| `scoring_logs` | Full constructed prompts, raw LLM response, model parameters, duration, and attempt. | `by_score`, `by_slot_sport`, `by_spot_timestamp_sport`, `by_user_spot_sport`. Potentially large/sensitive. |

### 1.4 Personalization, subscriptions, and journal

| Table | Purpose | Important indexes/behavior |
| --- | --- | --- |
| `calendar_subscriptions` | Per-user/per-sport bearer token and activation metadata. | `by_user`, `by_user_sport`, `by_token`. Access counters are modeled but not updated in the read query. |
| `user_sport_profiles` | Skill level and free-form sport context. | `by_user`, `by_user_sport`. |
| `user_spot_context` | Free-form per-user/per-spot/per-sport notes and expert-input flag. | Four indexes including `by_spot_sport_expert`. |
| `personalization_logs` | Context/rescore activity for abuse/usage monitoring. | `by_user`, `by_user_timestamp`. |
| `session_entries` | Personal journal record plus optional links to forecast slots captured at creation. | User/date, user/sport, spot, and user/spot indexes. |

## 2. Forecast ingestion pipeline

### 2.1 Intended schedule

`render.yaml` declares `waterman-scraper` at `0 0,6,12,18 * * *`—midnight, 06:00, noon, and 18:00 UTC. `scripts/scrape.mjs` loads `.env.local`, creates a Convex client, and executes spots sequentially.

### 2.2 Per-spot flow

1. Query `spots.list`. Webcam-only spots are excluded by default.
2. Use `spot.windySpotId` or extract a numeric ID from `spot.url`.
3. If missing, write the extracted ID with `spots.updateWindySpotId`.
4. `lib/scraper.js` requests:
   `https://windy.app/widget/data.php?id=wfwindyapp&spotID=<id>&timelineRange=future`.
5. Extract the `window.wfwindyapp = {...}` assignment with a regex and parse its nested `data` and optional `tides` JSON strings.
6. Drop past forecast rows, convert wind m/s to knots, round to one decimal, and preserve wave values.
7. Derive high/low tide events from the sampled tide curve using a three-point look-behind/look-ahead average and a three-hour event deduplication window.
8. Call `spots.saveForecastSlots` when at least one slot exists.
9. Call `spots.saveTides` when at least one tide event exists.

Puppeteer is no longer involved in this flow. It remains installed, runs a Chrome download during `postinstall`, and appears throughout deployment docs/config, but `lib/scraper.js` uses native `fetch` only.

### 2.3 Scrape validation and activation

`saveForecastSlots` calls `validateScrape`:

- at least 10 slots;
- at least one future slot;
- coverage at least 24 hours into the future.

It records the result in `scrapes`, but **inserts all supplied slots even when validation fails**. Scoring is scheduled only for a valid scrape.

The recent-read helper is supposed to choose the latest successful scrape. Its actual selection is:

```text
target = max(latest successful scrape timestamp, every recent slot scrape timestamp)
```

That means a newer failed/invalid scrape with inserted rows can become the displayed active dataset even though it was not scored. This can surface as empty “Best” conditions and contradicts the function comments. The target should be derived from successful scrape records, with an explicit fallback only when no success record exists.

### 2.4 Failure reporting gaps

- If Windy fetch/parsing throws, the script logs the error and continues; no failed `scrapes` row is inserted.
- If Windy returns zero slots, the script logs “No suitable slots found” and never calls `saveForecastSlots`; no failure row is inserted.
- Per-spot failures do not set a failing process exit code. The cron can appear successful even if every spot failed.
- Scrapes are sequential; one slow external request delays all later spots.
- The parser depends on an undocumented response wrapper and exact nested field names.
- No source response snapshot is retained, so parser regressions are hard to replay.

## 3. System scoring pipeline

### 3.1 Scheduling

A successful slot write schedules `api.spots.scoreForecastSlots` immediately. It also schedules personalized scoring after:

```text
max(slot count × supported sport count × 2.5 seconds, 30 seconds)
```

The estimate was designed for per-slot calls. System scoring now batches a day's slots into one LLM call per sport/day, so the delay is conservative and not tied to actual action completion.

### 3.2 Scorable slots

For every supported sport, system scoring includes daylight slots plus a contextual sunrise/sunset slot. It groups them by UTC calendar date. There is no deterministic pre-filter for obvious poor wind/wave dealbreakers; RAD-57 proposes one.

### 3.3 Prompt construction

For each sport/day batch:

1. load active system sport prompt, falling back to `SYSTEM_SPORT_PROMPTS` in source;
2. load active spot prompt, falling back to a generic one-line spot instruction;
3. load a temporal prompt, falling back to `DEFAULT_TEMPORAL_PROMPT`;
4. query 24 hours of context before the first slot and after the last slot from the same scrape;
5. calculate sunrise/sunset when coordinates are available;
6. call `buildBatchPrompt`.

The Groq request is hard-coded to:

- model `openai/gpt-oss-120b`;
- temperature `0.3`;
- JSON-object response format;
- maximum output `min(day slot count × 600 + 500, 16000)`.

It retries after 30 seconds, 60 seconds, and 300 seconds, with rate-limit text parsing. These long sleeps occur inside the Convex action.

### 3.4 Persistence

Every valid result is rounded and saved through `saveConditionScore`, with reasoning truncated to 500 characters. A `scoring_logs` record stores the entire batch prompt and raw response once **for every slot score**, so the same potentially large batch content is duplicated across multiple rows.

System score replacement checks `(slotId, sport, userId:null)`. Because every scrape creates new slot IDs, a normal new scrape inserts new current scores rather than replacing the previous scrape's scores. Recent reads deduplicate by `(timestamp, sport)` and favor newer creation time.

The history implementation has naming/lineage ambiguity: on an in-place system score update, `replacedByScoreId` is set to the same document ID that is being patched. Prompt snapshots added to the archived old score are supplied from the new scoring call, not necessarily the prompts originally used for the old score.

## 4. Personalized scoring pipeline

Personalized inputs are:

- user skill level;
- free-form sport context;
- free-form user/spot context;
- system and spot prompts;
- forecast/time-series context.

Profile or spot-note changes can call `scorePersonalizedSlots` with a verified session. After each successful scrape, `scorePersonalizedSlotsAfterScrape` scans all users, selects those who favorite the spot and have matching favorite sports/profiles, and then calls `scorePersonalizedSlot` serially for every daylight slot and sport.

Differences from system scoring:

- personalized slots are scored one at a time, not by day batch;
- each call allows up to 4,000 output tokens;
- retry delays are 30 and 60 seconds;
- a 200ms delay is added between calls;
- context is interpolated directly into the LLM prompt;
- every result also stores full prompt/response provenance.

This is potentially expensive at scale: `users × favorite spots × sports × daylight slots` external calls after each scrape. The code scans the full users table for each spot. There are logging primitives but no quota, queue concurrency control, cost budget, or retention policy.

Personalized `condition_scores` are always inserted rather than replaced, because replacement only runs when `userId` is falsy. Recent read logic overwrites a timestamp map while iterating matching rows, but there is no explicit “latest personalized row” comparison.

## 5. Report/read aggregation

### 5.1 Recent slot selection

`_getForecastSlotsForSpot` reads only rows whose scrape timestamp is within the last 48 hours. It selects the target scrape, then supplements it with today's timestamps missing from the latest scrape, taking the newest older row for each missing timestamp. This intentionally preserves earlier slots after an upstream forecast rolls forward.

If no scrape has run for more than 48 hours, the report returns no slots even though older data remains in the database. This is a reasonable freshness fail-closed behavior, but the UI needs a distinct stale/error state.

### 5.2 Score selection

Scores are read with a timestamp cutoff of seven days ago. This includes current and future forecast timestamps. For each spot/sport:

- system mode chooses the newest system row per timestamp;
- personalized mode first builds the system map, then overwrites it with matching user rows.

The batched query returns a `scoresMap` keyed by `${timestamp}_${sport}`. The client selects the highest score among currently selected relevant sports for each raw weather slot.

### 5.3 Tides

Report aggregation reads every tide row for each spot and sorts in memory. `saveTides` fully replaces each spot's tide set, so this is bounded by the latest upstream result. Day sections associate tide events with forecast rows through client utilities.

## 6. Calendar pipeline

`calendar.getSportFeed` accepts one sport and optional subscription token or explicit spot IDs.

Spot selection priority is:

1. explicit `spotIds`;
2. active matching subscription token → user's favorite spots supporting the sport;
3. every spot supporting the sport.

It reads `condition_scores` for the next seven days, keeps `score >= 75`, and can prefer the token owner's personalized scores when `showPersonalizedScores === true`. It joins each score to slot and spot, then returns event DTOs. The Next route applies daylight filtering again and emits ICS.

Important caveats:

- explicit `spotIds` are accepted without checking that they support the requested sport;
- subscription `lastAccessedAt` and `accessCount` are never updated because the feed function is a query;
- feed URLs are bearer tokens and are returned to the browser/copy UI;
- response cache is public for one hour even for tokenized personalized URLs, which deserves a privacy/cache review;
- `NEXT_PUBLIC_APP_URL` fallback values differ across files (`localhost`, `waterman.radx.dev`, and client origin logic).

## 7. Authentication and cleanup pipeline

Magic-link requests are normalized to lowercase and limited to ten active links per email per hour. There is no IP/device rate limit and no verification-attempt counter for the six-digit code. Successful verification creates another session without revoking prior ones.

Convex crons run daily:

- 03:00 UTC: cleanup expired magic links;
- 03:30 UTC: cleanup expired sessions.

No cron cleans old forecast slots, scrapes, scores, logs, history, personalization logs, or journal-linked orphan data.

## 8. Journal linkage

On entry creation, a known spot triggers a query over all its forecast slots. The function finds the latest scrape timestamp and stores slot IDs from one hour before the session through its end. These references are deliberately not recalculated on edit.

The detail view first follows stored slot IDs; fallback logic can re-find overlapping slots by timestamp and spot. Scores are joined by `(slotId, sport)` and prefer system rows.

Known limitations:

- full per-spot slot collections become progressively more expensive as history grows;
- sport validation only permits wingfoil and surfing;
- deleting a spot does not explicitly clean journal entries, and deleting forecast slots can invalidate stored IDs;
- a session edit may substantially change date/duration/location while retaining the old forecast links by design.

## 9. Retention and growth model

The current system retains indefinitely:

- every forecast row from every scrape;
- every scrape record;
- system and personalized scores across scrapes;
- duplicated full prompt and raw response logs;
- score/prompt history;
- personalization activity;
- journal entries.

At four scrapes per day, data volume grows linearly with `spots × forecast slots × sports`, while personalized scoring adds a user multiplier. Recent read cutoffs reduce query pressure but do not control storage. A restart should establish explicit retention periods and export/archival needs before adding more spots/users.

## 10. Referential integrity observations

Convex validates ID types but does not provide relational cascades. `admin.deleteSpot` manually deletes configs, slots, tides, scrapes, prompts, and condition scores, but omits at least:

- score history;
- prompt history;
- scoring logs;
- user spot contexts;
- session entries or their spot references;
- favorite spot IDs embedded in users;
- any calendar behavior depending on those favorites.

Deletion can therefore leave dangling IDs or orphaned historical records. It also queries some tables with filters/full collection rather than all available indexes. Until a complete dependency policy exists, spot deletion should require backup and a dry-run impact report.
