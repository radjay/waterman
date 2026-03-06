# Scoring System Analysis

## Overview

Waterman uses LLM-based scoring to rate watersport conditions (0-100) for each forecast time slot at each spot, for each sport. There are two scoring paths: **system scoring** (default, runs for all users) and **personalized scoring** (per-user, based on skill level and preferences).

**Model:** `qwen/qwen3-32b` via Groq API (upgraded from `openai/gpt-oss-120b`)
**Temperature:** 0.3
**Max tokens:** dynamic per batch (system), 1500 (personalized single-slot)
**Response format:** JSON (`{ scores: [{ score, reasoning, factors }, ...] }` for batch, `{ score, reasoning, factors }` for single)

---

## Scoring Pipeline

### Trigger Flow

```
External cron → scripts/scrape.mjs
  → Fetches forecast from Windy API for each spot
  → Calls saveForecastSlots mutation per spot
    → Inserts all forecast slots into DB
    → Schedules scoreForecastSlots (immediate, fire-and-forget)
    → Schedules scorePersonalizedSlotsAfterScrape (delayed by estimated system scoring time)
```

### System Scoring (`spots.ts:scoreForecastSlots`) - BATCHED

1. Loads the spot to determine supported sports
2. Resolves all slot data upfront in a single pass
3. Filters to **daylight-only slots** (via SunCalc) plus one **contextual slot** per sport (before sunrise for surfing, after sunset for wind sports)
4. Groups slots by **calendar day (UTC)**
5. Fetches prompts **once per sport** (not per slot)
6. For each day-batch, sends all slots in a **single LLM call** using `buildBatchPrompt`
7. Time series context fetched once per day-batch using `getTimeSeriesContextRange` with indexed query
8. Each batch returns a `scores` array; individual scores are validated and saved

### Personalized Scoring (`personalization.ts:scorePersonalizedSlotsAfterScrape`)

1. Finds users who have this spot favorited + have a sport profile + have personalization enabled
2. Filters to daylight slots (same as system scoring)
3. For each user, for each sport, for each slot: calls `scorePersonalizedSlot` sequentially with 200ms delay
4. Each call makes 4 DB queries + 1 LLM call + 2 DB writes

---

## Prompt Architecture

Every scoring call assembles a prompt from **4 layers**, 3 of which are stored in the database:

### Layer 1: System Sport Prompt (DB: `system_sport_prompts` table)

Shared across all spots for a given sport. Defines general evaluation criteria and scoring rubric.

**Example (wingfoil):**
```
You are an expert wingfoiler evaluating conditions. Consider:
- Wind speed: 15-25 knots is ideal, but steady wind beats strong gusts
- Gust factor: Clean, consistent wind is much better than gusty conditions
- Wind direction: Cross-onshore or side-shore is ideal for most spots
- Overall: Safety, ride quality, and session enjoyment

Score 0-100:
- 90-100: Excellent conditions, rare day
- 75-89: Very good conditions, well worth it
- 60-74: Decent conditions, enjoyable session
- 40-59: Mediocre, rideable but nothing special
- 0-39: Poor conditions, best to skip

Write concise reasoning in a casual but informative tone. Be direct and practical.
Avoid excessive slang or hype.
```

### Layer 2: Spot-Specific Prompt (DB: `scoring_prompts` table)

Per spot-sport combination. Built from `spotConfigs` data during seeding. Contains local knowledge like min wind speeds, optimal directions, tide preferences.

**Example (Marina de Cascais, wingfoil):**
```
This is Marina de Cascais. For wingfoiling at this spot: Minimum wind speed
required is 15 knots. Minimum gust speed required is 18 knots. Optimal wind
directions are from 315deg to 135deg (wrapping through 0deg if needed). Consider
wind consistency - steady wind is preferred over gusty conditions. Higher wind
speeds (15-25 knots) are ideal, but consistency and direction matter more than
peak speed.
```

### Layer 3: Temporal Prompt (DB: `scoring_prompts` table, `temporalPrompt` field)

Instructions for how to interpret trend data. Currently the same default for all spots:

```
Consider trends in conditions 24 hours before and after the current time slot.
- Improving conditions (getting better) should score higher
- Deteriorating conditions (getting worse) should score lower
- Consistent conditions indicate stability and reliability
- Rapid changes may indicate unstable weather patterns
```

### Layer 4: User Personalization (runtime only, not stored)

Added only for personalized scoring. Appended after the spot prompt:

```
=== USER PERSONALIZATION ===
User Skill Level: INTERMEDIATE

User's Personal Context for this Sport:
[free-text from user profile, e.g. "I ride a 5m wing, need 18+ knots"]

User's Notes for this Spot:
[free-text from user, e.g. "Park at the marina, works best on NW wind"]

IMPORTANT: Evaluate conditions FROM THIS USER'S PERSPECTIVE based on their skill
level and personal context above. A "intermediate" rider will have different
ideal conditions than others. Score what would be ideal for THIS specific user,
not the general population.
```

### Assembled Prompts

**System message** (built by `buildPrompt` in `prompts.ts`):
```
[Layer 1: System Sport Prompt]

Spot: [spot name]
[Layer 2: Spot Prompt]

[Layer 3: Temporal Prompt]
[Optional: contextual slot note about sunrise/sunset]
```

**User message (batch, system scoring):**
```
Score each of the following 12 time slots for this day.

Context (preceding 24h):
  24h before first slot: 2026-03-05 06:00 - Wind: 12.1 knots W (270deg), ...
  12h before first slot: 2026-03-05 18:00 - Wind: 14.5 knots WSW (248deg), ...
  6h before first slot: 2026-03-06 00:00 - Wind: 15.1 knots SW (230deg), ...

Slots to score:
  1. 2026-03-06 06:00 - Wind: 16.8 knots SW (220deg), Gust: 22.0 knots, ... [CONTEXTUAL - outside daylight]
  2. 2026-03-06 07:00 - Wind: 17.2 knots SW (222deg), Gust: 22.5 knots, ...
  ...
  12. 2026-03-06 18:00 - Wind: 14.1 knots W (265deg), Gust: 18.3 knots, ...

Context (following 24h):
  6h after last slot: 2026-03-07 00:00 - Wind: 10.3 knots W (265deg), ...
  12h after last slot: 2026-03-07 06:00 - Wind: 9.1 knots NW (310deg), ...
  24h after last slot: 2026-03-07 18:00 - Wind: 8.0 knots N (350deg), ...

Provide a JSON response with a "scores" array containing exactly 12 objects...
```

**User message (single-slot, personalized/legacy):**
```
Evaluate these conditions:

Current: 2026-03-06 14:00 - Wind: 18.2 knots SW (225deg), Gust: 24.1 knots, ...

Historical context (24h before):
24h ago: 2026-03-05 14:00 - Wind: 16.8 knots SW (220deg), Gust: 22.0 knots, ...
12h ago: 2026-03-06 02:00 - Wind: 15.1 knots SW (230deg), Gust: 20.5 knots, ...

Future context (24h after):
12h ahead: 2026-03-07 02:00 - Wind: 10.3 knots W (265deg), Gust: 14.1 knots, ...
24h ahead: 2026-03-07 14:00 - Wind: 8.0 knots N (350deg), Gust: 11.2 knots, ...
```

### Time Series Context Assembly

**Batch scoring:** `getTimeSeriesContextRange` fetches slots from 24h before the first slot through 24h after the last slot using the `by_spot_timestamp` index. The batch prompt includes up to 3 context reference points before and after the day's slots (-24h, -12h, -6h / +6h, +12h, +24h).

**Single-slot scoring:** `getTimeSeriesContext` fetches slots in a +/-24h window around the slot timestamp using the same index. The prompt selects 2 reference points before (-24h, -12h) and 2 after (+12h, +24h).

---

## Token Economics

### Current Scale
- **Spots:** ~5-6
- **Sports per spot:** 1-3 (average ~2)
- **Slots per scrape:** ~72-168 from Windy API (hourly, ~3-7 day forecast)
- **Daylight slots:** ~10-12 per day x forecast days = ~50-80 per scrape
- **Scrape frequency:** appears to be external cron (likely 2-4x/day based on 2M tokens/day)
- **Current usage:** ~2M tokens/day, ~$0.50/day

### Per-Call Token Estimate
| Component | Tokens (approx) |
|-----------|-----------------|
| System prompt (sport + spot + temporal) | ~350-450 |
| User prompt (current + 5 context slots + instructions) | ~250-350 |
| **Total input** | **~600-800** |
| Output (JSON with score, reasoning, factors) | ~150-300 |
| **Total per call** | **~750-1,100** |

### Current Daily Volume Estimate
With ~2M tokens/day and ~900 tokens/call average: **~2,200 LLM calls/day**

Back-calculating: 5 spots x 2 sports x ~70 daylight slots x ~3 scrapes/day = ~2,100 system calls, which aligns.

---

## Scaling Analysis: 10x Spots (50-60 spots)

### Naive Projection
| Metric | Current (5 spots) | 10x (50 spots) |
|--------|-------------------|-----------------|
| System scoring calls/day | ~2,100 | ~21,000 |
| Tokens/day | ~2M | ~20M |
| Cost/day (Groq) | ~$0.50 | ~$5.00 |
| Personalized (per user, 5 fav spots) | ~700/day | ~700/day (unchanged) |
| Personalized (per user, 20 fav spots) | - | ~2,800/day |

At $5/day (~$150/month) for system scoring alone, this is still manageable. But there are major **latency and reliability concerns** before cost becomes the bottleneck.

### Real Bottlenecks at 10x

1. **Sequential scoring is the killer.** Each slot is scored one-at-a-time with 100ms delay. At 50 spots x 2 sports x 70 slots = 7,000 calls per scrape, at ~1-2s per call + 100ms delay = ~2-3 hours to complete a single scrape's scoring. The next scrape arrives before the previous one finishes.

2. **Redundant DB queries per call.** Each `scoreSingleSlot` call makes 4 separate queries (getSlotById, getSpotById, getTimeSeriesContext, getSystemSportPrompt, getScoringPrompt). For a batch of 70 slots at the same spot, the spot data, system prompt, and spot prompt are identical. That's 3 redundant queries per slot = ~210 wasted queries per spot-sport.

3. **Redundant prompt content.** The system message is identical for every slot at the same spot-sport. Only the user message (current conditions + context) changes. Yet the full prompt is rebuilt and sent for every single call.

4. **`getTimeSeriesContext` is expensive.** It loads ALL forecast_slots for the spot, then filters in memory. At 10x spots with accumulated historical data, this query gets heavier over time.

5. **Personalized scoring delay is a guess.** The delay before personalized scoring is `max(slots * sports * 2500ms, 30000ms)`. This heuristic breaks if system scoring takes longer than expected (rate limits, retries), potentially causing overlap or premature starts.

6. **Provenance logging doubles writes.** Every score saves both to `condition_scores` AND `scoring_logs` (which stores the full prompt text). At scale, `scoring_logs` grows fast and stores enormous redundant prompt text.

---

## Optimization Opportunities

### High Impact, Low Effort

#### 1. Batch slots in a single LLM call
Instead of one LLM call per slot, send **all daylight slots for a spot-sport in one call**. The system prompt is identical; only the conditions data differs. A single call with 70 slots' data in the user message would:
- Reduce calls from ~70 to ~1 per spot-sport
- Eliminate redundant system prompt tokens (saving ~400 tokens x 69 calls = ~27,600 tokens per spot-sport)
- Reduce total latency from ~2 min to ~5-10s per spot-sport
- **Token savings: ~60-70%** (system prompt sent once, not 70 times)
- **Latency savings: ~95%**

Risk: Larger context window needed, output reliability for 70 scores in one response. Mitigate with structured output validation and chunking (e.g., 20 slots per batch).

#### 2. Cache and reuse prompt components
Move spot/system prompt fetching **outside** the per-slot loop. Fetch once per spot-sport, pass into the scoring function. Saves ~210 DB queries per spot-sport per scrape.

#### 3. Parallelize across spots
Score different spots concurrently instead of sequentially. With batched calls (optimization 1), each spot-sport takes one LLM call. 50 spots could be scored in parallel in seconds.

### Medium Impact

#### 4. Deterministic pre-filtering
Many slots can be scored without an LLM at all:
- Wind < 8 knots for any wind sport → score 0-15 deterministically
- Wave height 0m for surfing → score 0-10 deterministically
- Night slots already filtered, but could extend to "obviously bad" conditions
- **Potential to skip 30-50% of LLM calls** for marginal/poor conditions

#### 5. Delta scoring
After the first scrape of the day, subsequent scrapes for the same spot mostly return similar data. Only re-score slots where conditions changed significantly (e.g., wind speed changed >3 knots, direction changed >30 degrees). Could reduce calls by 50-70% on subsequent scrapes.

#### 6. Slim down provenance logging
`scoring_logs` stores the full system and user prompt text for every call. At 21,000 calls/day, that's enormous. Options:
- Store only a hash of the prompt + the prompt version ID (already tracked via `systemPromptId` and `spotPromptId`)
- Log only on errors or score changes
- Use a retention policy (delete logs older than 7 days)

#### 7. Reduce time series context
Currently sends up to 5 reference points from a 72h window. This is useful but:
- 72h lookback is probably overkill; 24h would capture most meaningful trends
- The `getTimeSeriesContext` query loads ALL slots for the spot then filters in memory. Add a timestamp range to the index query.

### Lower Priority / Strategic

#### 8. Model selection
`openai/gpt-oss-120b` on Groq is fast and cheap, but worth evaluating:
- A smaller/faster model for "obvious" conditions (clear good/bad days)
- Groq's pricing tiers as volume increases
- Whether a simpler model (e.g., Llama 3.1 8B) could handle batch scoring with minimal quality loss

#### 9. Precomputed scoring curves
For spots with enough historical data, train simple heuristic models (wind speed curve, direction preference) that can score without LLM. Use LLM only for edge cases or calibration. This is a bigger lift but would reduce LLM dependency to near-zero for system scores.

#### 10. Separate system vs personalized scoring cadence
System scores change based on forecast data (which updates every few hours). Personalized scores only need updating when (a) forecast data changes or (b) user preferences change. Don't re-score personalized if the underlying system score hasn't changed.

---

## Recommended Priorities for 10x Scale

| Priority | Optimization | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | Batch slots per LLM call | Medium | Reduces calls by ~98%, tokens by ~60% |
| 2 | Parallelize across spots | Low | Reduces wall-clock time from hours to minutes |
| 3 | Cache prompt components outside loop | Low | Eliminates ~80% of redundant DB queries |
| 4 | Deterministic pre-filtering | Low | Skips 30-50% of LLM calls entirely |
| 5 | Delta scoring on subsequent scrapes | Medium | Skips 50-70% of re-scoring |
| 6 | Slim provenance logging | Low | Reduces DB storage growth |

With optimizations 1-4, a 10x scale scenario would look like:

| Metric | Current | 10x Naive | 10x Optimized |
|--------|---------|-----------|---------------|
| LLM calls/scrape | ~700 | ~7,000 | ~70-140 |
| Tokens/day | ~2M | ~20M | ~3-5M |
| Cost/day | $0.50 | $5.00 | $0.80-1.50 |
| Scoring time/scrape | ~15 min | ~2-3 hours | ~1-3 min |

---

## Changes Implemented

### 1. Model upgrade to `qwen/qwen3-32b`
- Updated in both `convex/spots.ts` and `convex/personalization.ts`
- Smaller, faster model on Groq; should reduce per-call latency and cost

### 2. Reduced time series context window (72h -> 24h)
- `getTimeSeriesContext` now uses +/-24h window instead of -72h/+12h
- `buildPrompt` reference points changed from -72h/-48h/-24h/-12h/+12h to -24h/-12h/+12h/+24h
- `DEFAULT_TEMPORAL_PROMPT` updated to say "24 hours before and after"
- Added `by_spot_timestamp` index on `forecast_slots` table for efficient range queries
- Both `getTimeSeriesContext` and new `getTimeSeriesContextRange` use the index instead of loading all slots

### 3. Day-batched system scoring
- `scoreForecastSlots` now groups daylight+contextual slots by calendar day
- All slots for a day are scored in **one LLM call** using new `buildBatchPrompt`
- Prompts (system sport prompt, spot prompt) fetched **once per sport**, not per slot
- New `getTimeSeriesContextRange` query fetches context for the full day span in one indexed query
- Response format: `{"scores": [{score, reasoning, factors}, ...]}` with validation per-slot
- Max tokens scaled dynamically: `min(slots * 150 + 200, 8000)`
- `scoreSingleSlot` still exists and is used by personalized scoring and admin rescoring

### Remaining opportunities (not yet implemented)
- Parallelize scoring across spots (currently sequential per scrape trigger, but each spot's scrape triggers independently)
- Deterministic pre-filtering for obviously bad conditions
- Delta scoring to skip unchanged forecasts
- Batch personalized scoring (currently still single-slot per call)
- Slim down provenance logging
