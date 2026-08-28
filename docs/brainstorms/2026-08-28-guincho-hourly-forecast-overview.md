# Hourly forecast resolution at Guincho — overview

**Status:** early brainstorm, not a spec. Written to hand to a planning agent.
Do not treat anything below as decided — the open questions section lists
what still needs a call before this can become a spec.

**Related:** [Guincho blend research handover](../forecast-experiment-guincho-model-skill-handover.md),
[Guincho blend research spec](../superpowers/specs/2026-08-27-guincho-blend-research-design.md)

## The problem, in plain terms

Nortada sometimes fires for only a couple of hours before dying out again.
The live app cannot see anything finer than a 3-hour block, so a short blow
can be invisible in the displayed forecast, or averaged away to look weaker
than it was. A rider checking Waterman may not see a real short session
coming at all.

## What we already know

- **The live Guincho forecast today is not a blend, and not ICON7.** It is
  a single named model — GFS (`gfs27_long`) — served by Windy.app's widget
  when no `model` parameter is given (`lib/scraper.js:34`, `DEFAULT_MODEL`).
  Every spot goes through the same pipeline; Guincho is not special-cased.
- **The blend research on this branch found GFS is the weakest of the three
  usable models**, not the strongest. ICON7 (Open-Meteo `icon_eu`) catches
  the most real sessions (93% vs GFS's 78%) and no blend of models beats it.
  See the linked handover for the full results.
- **Windy's widget is hard-capped at 3-hour resolution.** This is not a
  display choice — the code's own comment says "the data really is two
  numbers per slot and nothing finer" (`lib/dayChart.js`). Confirmed live
  today: pulling Windy's per-model widget data for Cascais and Guincho only
  ever returned 10:00 / 13:00 / 16:00 / 19:00, nothing in between.
- **Open-Meteo already provides true hourly wind data for these same
  models, live (not just backtest).** The blend research used their
  *Previous Runs* endpoint (backtest-only). Their standard forecast
  endpoint (`api.open-meteo.com/v1/forecast`) returns hourly
  `wind_speed_10m` / `wind_gusts_10m` / `wind_direction_10m`, supports the
  same model-selection parameter, and forecasts up to 16 days out. Proven
  working today by pulling live hourly tables for both Guincho and Cascais
  in this session — not hypothetical.
- **A separate, unrelated finding surfaced along the way:** Windy's raw
  wind direction and Open-Meteo's look approximately 180° apart once wind
  is strong enough to have a stable direction (checked across all four
  models, both spots, at 16:00 and 19:00 today — agreement is tight, within
  a few degrees of an exact flip). This is consistent with Windy reporting
  the direction wind blows *toward* while Open-Meteo reports where it blows
  *from*. `lib/scraper.js` stores Windy's raw direction as-is; the app's own
  display layer assumes stored direction is FROM and flips it once for
  display. If Windy's raw number is already TO, that flip could be doubling
  up somewhere live, for every spot that scrapes Windy — not just Guincho.
  **Not confirmed against Windy's own documentation.** This is a live
  correctness question independent of the hourly-resolution idea and
  probably shouldn't block or be bundled into this initiative — flagging it
  here so it isn't lost.

## Blast radius if resolution changes (mapped, not yet acted on)

- `forecast_slots` (Convex schema) is cadence-agnostic — a flat
  `(spotId, timestamp, speed, gust, direction, ...)` time series with no
  slot-count or duration baked in. Hourly rows are structurally just more
  rows of the same shape; no schema change needed.
- Most chart code is already generic over "however many slots exist"
  (`lib/dayChart.js`'s column layout, `WindBand`, `TimeAxis`,
  `ChartColumnHover`) and would silently adapt to more/finer slots.
- Several places hardcode "3 hours" and would need real changes, not a free
  ride: the hover/tooltip slot-matching window (`lib/chartHover.js`), the
  score-strip gradient plateau width (`lib/scoreShade.js`), window
  start/end math (`lib/windows.js`), and how a station reading gets
  attached to its covering forecast slot (`lib/station.js`,
  `components/now/StationWindChart.js`).
- The LLM-based condition score (`convex/spots.ts`, `scoreForecastSlots`)
  already sends a whole day's slots to the model as one time series in one
  prompt. Hourly data means roughly 3x more slots per day in that prompt
  (24 vs ~8 at 3-hour spacing) — more tokens and cost, proportionally, not
  a broken assumption.
- There is already a proven, low-risk pattern in this codebase for a
  second forecast source that never touches the primary path:
  `forecast_model_slots`, written on every scrape purely for model
  comparison, alongside (not instead of) the main `forecast_slots` write. A
  new Open-Meteo ingestion could start in that shape.

## Licensing

Open-Meteo's free tier is for non-commercial use. Waterman has a paid
subscribe flow, so production use likely needs their paid tier. Pricing has
not been checked yet.

## A starting steer, not a decision

Given the blast radius above, the lowest-risk shape is probably staged, not
a single cutover:

1. Stand up Open-Meteo hourly ingestion as a new, parallel data path,
   reusing the `forecast_model_slots` precedent — prove it against real
   Guincho data, visible somewhere, without touching the primary live path
   or any of the hardcoded-3h consumers.
2. Only after that's proven, decide whether and how to migrate the primary
   path, and go update the specific 3h-hardcoded spots listed above.

This is a starting steer for the planning agent to test, not something the
user has committed to — see open questions below, several of which change
the shape of phase 1 itself.

## Open questions (need a decision before this becomes a spec)

- **Scope:** Guincho only, or all spots? The live pipeline has never
  special-cased one spot before — doing Guincho-only would be a first.
  Doing all spots is consistent with the existing "no special-casing"
  pattern but is a bigger commitment (data volume, licensing cost, more
  screens affected).
- **Replace or augment:** does hourly Open-Meteo replace GFS/Windy as the
  primary live source, or run as a second opinion first while Windy stays
  primary?
- **Which model(s):** ICON7 alone (the research's outright winner), or keep
  multiple models live and bring the blend-research thinking (router/vote)
  into the live product at hourly resolution?
- **Budget approval** for Open-Meteo's paid tier, once pricing is checked.
- **The Windy direction-convention question** — worth its own quick,
  separate investigation regardless of this initiative, since it's a
  live-correctness question, not a resolution question.

## Non-goals of this document

This is context for a planning pass, not a spec. It does not decide the
open questions above, does not propose a file-by-file implementation plan,
and does not commit to a timeline. No code has been written for this
initiative.
