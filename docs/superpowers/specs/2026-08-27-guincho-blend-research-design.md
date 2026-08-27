---
date: 2026-08-27
topic: guincho-blend-research
status: draft
markup_status: not_reviewed
---

# Guincho blend research — six ways to beat a single model

**Related:** [Guincho model skill handover](../../forecast-experiment-guincho-model-skill-handover.md), [Guincho model skill design (stale rank rule)](2026-08-26-guincho-model-skill-design.md)

**This study does not change the live Guincho forecast.** It is a research
exercise, like the study before it. Read the handover first. It tells you
where ICON7 won, where it lost, and why the code no longer matches the old
spec's rank rule.

## Problem

The last study named one winner: ICON7, ranked by session match, at Day −1,
all daytime hours. That study also found two splits the single-winner picture
hides:

- On the nortada slice, ICON7 wins. On other directions, ICON13 wins.
- ECMWF almost never calls a session. GFS calls fewer false sessions than
  ICON7 but misses more real days.

A single named winner cannot use both facts at once. This study asks: does
combining models — by rule, by vote, by weighted average, or by using their
agreement as a signal — call more real sessions than any one model alone?

## Goal

Build six research threads, each a distinct question, most of them reusing
the scoring pipeline from the last study with no changes to that pipeline's
logic:

1. **Router** — pick ICON7 or ICON13 per hour, by direction consensus.
2. **Vote** — call a session hour by majority or by any-one-model rule.
3. **Weighted blend** — average model wind, weighted by past skill per slice.
4. **Agreement signal** — test whether model agreement predicts accuracy.
5. **Gustiness match** — score models on gust-to-speed ratio, not just call.
6. **Analog days** — find similar past days and report their outcome mix.

Threads 1–3 add new "virtual models" that score exactly like a real model.
Threads 4–6 add new questions the existing tables cannot answer.

## Shared architecture

`scoreGuinchoModelSkill` in `lib/forecast-experiment/guinchoModelSkill.js`
builds a single map, `forecastIndex`, keyed by `model:leadDay:validTime`. Every
later step — tables, ranks, slices, scatter, spot checks — reads that map by
model slug. It does not know or care whether a slug came from a real fetch or
from a rule.

This means a virtual model needs only two things:

- A slug and a label (e.g. `router-consensus`, "Router").
- A function that reads the real models' points for one hour and one lead,
  and returns a synthetic point of the same shape: `windSpeedKnots`,
  `windGustKnots`, `windDirectionDeg`.

A new function, `buildVirtualModelPoints(openMeteoPoints)`, runs once before
`indexForecast`. It groups real points by `leadDay:validTime`, computes each
virtual model's synthetic point where all needed real models are present for
that hour, and returns the extra points to concatenate onto
`openMeteoPoints`. Nothing else in the file changes. A virtual model is
missing from an hour only when a real model it depends on is missing from
that hour — the same rule real models already follow.

**Requirements**

- R1. `buildVirtualModelPoints` takes the same `points` shape
  `parsePreviousRunsHourly` already returns (`model`, `leadDay`, `validTime`,
  `windSpeedKnots`, `windGustKnots`, `windDirectionDeg`) and returns more of
  the same shape, one entry per virtual slug per hour per lead.
- R2. Virtual models score at Day 0, Day −1, and Day −2, the same three leads
  as real models. They enter `GUINCHO_MODEL_SLUGS`-style peer lists only where
  a phase's UI needs them, not inside the four-model fetch/missing-model
  check (that check must still name only the four real, fetched models).
- R3. No new archive fetch for threads 1–4. Thread 5 reuses fields
  (`windGustKnots`, `windSpeedKnots`) already in the archive. Thread 6 reuses
  the same joined data; it does not add a new external data source.
- R4. Virtual models carry a `synthetic: true` flag through to the summary
  JSON so the page can badge them ("Rule", not "Open model").

## Thread 1 — Router (direction consensus)

Each real model classifies its own forecast direction, per hour, as nortada
(300°–40°) or other, with the same `classifyWindRegime` helper the station
side already uses. The four models vote. Majority decides the hour's bucket.
On a 2–2 tie, the router follows ICON7's own classification — ICON7 is the
stronger overall model, so its call is the principled tiebreak, not an
arbitrary one.

The router's synthetic point for that hour = ICON7's point if the bucket is
nortada, else ICON13's point (full point: speed, gust, direction all copied
from the chosen model, not just the wind number).

- R5. New slug `router-consensus`, label "Router (direction)".
- R6. Router uses **forecast** direction consensus, never the station's
  observed direction. Using observed direction would leak the answer into
  the test — a real forecast never knows the true station direction in
  advance.
- R7. Tie-break constant: `ROUTER_TIEBREAK_MODEL = "icon-eu"`. Document this
  choice inline; it is a design decision, not a derived fact.

## Thread 2 — Vote (majority / any-one)

Members: ICON7, ICON13, GFS. ECMWF is left out of the vote — it under-calls
so consistently that including it would only pull recall down; this is a
named constant, not hardcoded logic, so it is a one-line change to test
otherwise later.

Each member says go/no-go at the hour level (effective wind ≥ 12 kt).

- `vote-any` — go if **any** member says go. Chases recall.
- `vote-majority` — go if **at least two of three** members say go.

- R8. New slugs `vote-any`, `vote-majority`.
- R9. `GUINCHO_VOTE_MODELS = ["icon-eu", "icon-global", "gfs-global"]`, a
  named constant in `guinchoModelSkillConstants.js`.
- R10. Vote models need a stand-in wind value for `underMae` (a vote is a
  yes/no, not a knot count). Use the **max effective wind among the members
  that voted go** for that hour; on a no-go hour, use the max across all
  three members. This is the one number in this design that is a modelling
  choice, not a derived fact — flagged here for the record.
- R11. Both vote rules score at Day 0 / −1 / −2, same as real models, so the
  small-multiples chart already in the page keeps working unchanged.

## Thread 3 — Weighted blend

Two blend variants, both a plain per-hour average of member models'
effective wind, then scored through the unchanged 12 kt / 4-hour rule:

- `blend-mean3` — equal weight, ICON7 + ICON13 + GFS (same members as the
  vote, ECMWF excluded for the same reason).
- `blend-weighted` — weight per hour by the router's direction bucket for
  that hour, using each model's own **session F1** in that bucket from
  thread 1's slice data as the weight (normalised to sum to 1). This reuses
  the router's consensus-direction call instead of inventing new weights.

- R12. New slugs `blend-mean3`, `blend-weighted`. Both reuse
  `GUINCHO_VOTE_MODELS` (R9) as their member list — one constant for "the
  three models we blend and vote across", not two lists that could drift.
- R13. `blend-weighted`'s per-bucket weights are computed once, from the
  full-series nortada/other slice table's `sessionF1Pct` per model, and
  stored as a small constant table alongside the summary — not recomputed
  live per hour, so the weights are visible and auditable in the output
  JSON.

## Thread 4 — Agreement as a confidence signal

A different question: does model **disagreement** predict a worse call,
independent of which single call was right? If so, "3 of 3 models agree" is
itself a usable product signal, not just noise to average away.

- For each hour, compute an agreement count: how many of ICON7 / ICON13 /
  GFS individually call go (0–3).
- Bucket session days by their modal agreement count across the day's called
  hours (unanimous / 2-of-3 / split).
- For each bucket, compute the same false-call and miss rate already
  computed elsewhere, using the majority vote (thread 2) as the "official"
  call for that bucket.
- Report: does the false-call / miss rate fall as agreement rises?

- R14. New summary section `confidence.byLead[leadDay]`, an array of
  `{ agreementBucket, days, falseGoDayPct, missedPct }`.
- R15. This does not add a rankable "model" — it is a table, not a
  leaderboard row. It answers a yes/no research question:
  "is agreement informative?"

## Thread 5 — Gustiness match

The existing pipeline already computes `gustUnderMae` and `speedUnderMae`
per model (`computeUnderperformance`), and the winner card already reports a
separate best-gust model. The gap: nothing scores **gustiness feel** — how
gusty a session is relative to its mean wind — only raw gust knots.

- Define gustiness ratio = `gust / speed` per hour (station and per model).
- Score each model on mean absolute error of that ratio, on rideable hours
  only (gustiness only matters once a session is called).
- Report as a new column, "Gustiness match", next to the existing session
  table. It does not change `rankTuple` or the named winner — it is an
  auxiliary finding about session feel, not about whether to call the
  session.

- R16. New function `computeGustinessSkill(pairs)`, returns
  `{ gustinessMae, gustinessBias }`, added to each row alongside the
  existing MAE fields, real and virtual models alike.
- R17. Gustiness table filters to rideable hours (station effective wind
  ≥ 12 kt) — a calm hour's gust ratio is noise, not signal.

## Thread 6 — Analog days

Scoped down to what the existing archive already holds — no new synoptic or
pressure-field data source, to keep R3 (no new fetch) true for this thread
too.

- Fingerprint a historical day at Day −1 by: consensus direction bucket
  (thread 1), season (May–Sep / Oct–Apr, already computed by
  `isNortadaSeasonDate`), and each of the four models' own go/no-go call
  that day.
- For a target day, find the **k = 20** nearest historical days by exact
  fingerprint match, falling back to direction + season only if fewer than
  20 exact matches exist.
- Report the empirical share of those analogs that were real session days —
  a probability, not a deterministic call.

- R18. New function `findAnalogDays(fingerprint, allDays, k = 20)`.
- R19. Report shown as a new small block on the Spot Check tab: "N of 20
  similar days were real sessions", next to the existing per-day charts —
  reuses that tab's existing day-detail layout rather than a new page
  section.
- R20. This thread is exploratory. It does not feed `rankTuple` or the
  winner card. Treat its output as a finding to report, not a metric to
  rank models on.

## UI plan

All six threads render inside the existing wide shell at
`/experiment/guincho-model-skill`, reusing kit components already built for
this page (`SkillTable`, `RankingBars`, `DetailsBlock`, `PillToggle`). No new
route.

- Findings tab gains: a "Blend leaderboard" block (threads 1–3, ranked by the
  unchanged `rankTuple`, with a one-line callout: does the best blend beat
  ICON7 alone?), a "Confidence" block (thread 4), and a "Gustiness match"
  column on the existing session table (thread 5).
- Spot Check tab gains: an "Analog days" line per sample day (thread 6).
- Synthetic models (R4) show a "Rule" badge next to their label, so a reader
  never mistakes a router or vote row for an open model Waterman could fetch
  live.
- Every new number is `font-data`. Every new colour is a theme token. Both
  themes, both breakpoints, per the project's existing verification list.

- R21. No new kit primitive is required unless the confidence-by-agreement
  table (thread 4) does not fit `SkillTable`'s existing column shape — check
  first; add a primitive only if nothing close exists.

## Testing

Extend `tests/forecast-experiment/guinchoModelSkill.test.mjs`:

- Router picks ICON7 on a consensus-nortada hour, ICON13 on consensus-other.
- Router tie (2–2) defers to ICON7.
- `vote-any` fires when only one of three members is ≥ 12 kt; `vote-majority`
  does not.
- `blend-mean3` is the plain mean of its three members on a synthetic hour.
- Confidence buckets: a hand-built fixture where unanimous hours have zero
  false calls and split hours have some, to check the bucketing logic itself.
- Gustiness MAE on a fixture with a known gust/speed ratio gap.
- Analog days returns the exact-match set first, then falls back once fixture
  data is thinned below 20.
- All virtual models flow through `rankTuple` with no special-casing (same
  assertion style as the existing "model that misses real sessions loses"
  test).

## Success criteria

- Every thread answers its stated question in the Findings or Spot Check
  tab, in the same run of `npm run fx:analyze:guincho-skill` (no new fetch
  command needed for threads 1–5; thread 6 needs none either).
- The blend leaderboard states, in plain words, whether any blend beats
  ICON7 alone on session F1 — a yes/no finding, not just more rows in a
  table.
- The confidence block states, in plain words, whether agreement predicts a
  lower false-call rate.
- No change to `summary.winner`, to `rankTuple`'s existing behaviour for
  real models, or to the live Guincho forecast.
- Existing tests for the prior study still pass unchanged.

## Sequencing

Implement in this order — later threads reuse earlier ones:

1. Router + Vote (threads 1–2) — new virtual-model plumbing, the highest-value
   test of the already-known direction split.
2. Weighted blend (thread 3) — reuses the router's slice weights.
3. Gustiness match (thread 5) — additive, no dependency on 1–3.
4. Confidence signal (thread 4) — reuses the vote's per-hour agreement count.
5. Analog days (thread 6) — reuses the router's fingerprint and the season
   helper; largest scope, so it goes last.

## Open questions

None blocking. Two modelling choices are recorded above as decisions, not
open items: the router's tie-break (R7) and the vote's `underMae` stand-in
value (R10). Revisit both only if a later finding shows they hide a real
effect — for example, if `vote-any`'s `underMae` looks better than its
false-call rate suggests it should.
