---
title: "feat: make model agreement trustworthy before it leaves Labs"
type: feat
status: draft
date: 2026-08-04
area: labs
blocks: "shipping the model comparison out of Labs"
---

# feat: make model agreement trustworthy before it leaves Labs

## Overview

The model comparison on `/window/[day]/[start]` currently contradicts the screen
it sits on. Verified in the browser on 2026-08-04:

> **Praia do CDS · Tue 16:00–22:00 · kitesurfing**
> Dial **78**. Headline **"Good window"**. Subtitle *"Wind, wave and tide all
> line up."*
> Labs · Model comparison, immediately below: **AGREED 0** and **0**. Not one of
> five models backs it.

Both panels are on one screen, and a rider cannot tell which to believe. The
screen's whole purpose is *"do I believe it?"*, so answering itself in both
directions at once is worse than showing nothing.

This is why the feature is behind Labs, and it is the work that has to happen
before it comes out. **It is not a rendering bug** — the grid draws exactly what
the vote returns. The vote is asking a different question from the scorer.

## Root cause

`thresholdFor(spotConfig, sport, scoredSlots)` resolves the bar a model must
clear, in this order:

1. `calibrateThreshold(scoredSlots)` — learn the bar from the spot's own scores.
2. `spotConfig.minSpeed / minGust` — the stored config.
3. `SPORT_DEFAULT_THRESHOLDS[sport]` — a sport-level fallback.

Wingfoil was fixed during the IA work by adding step 1. Calibration measures
"what wind actually scores well **here**" and asks the models the same question
the scorer answers. It works — wingfoil agreement went from `{0:28, 1:8, 2:4,
3:5, 4:2}` to `{0:15, 1:4, 2:7, 3:5, 4:10, 5:6}`.

Step 1 has a guard: `MIN_CALIBRATION_SAMPLES = 6`. Below six scoring slots it
returns `null` and the resolution falls through to a threshold nobody tuned:

- `spotConfigs.minSpeed` is **15 for every spot**, an untouched default. The
  scorer's real bar is Marina 10.9, Lagoa 12.1, Guincho 13.4, Fonte 15.4.
- `SPORT_DEFAULT_THRESHOLDS.kitesurfing` is `{ minSpeed: 14, minGust: 17 }`,
  seeded by hand from the wingfoil numbers rather than measured.

The observed case is exactly this: **11.3 kt** against a **14 kt** fallback.
Every model votes no, `MARGINAL_TOLERANCE` (0.85 → 11.9 kt) does not reach it
either, and the panel reports unanimous rejection of a window the app scored 78.

So the failure is not random. It is deterministic and it targets the light-wind
end — which is precisely where a rider most wants a second opinion.

## Why it did not show up before

The IA work verified agreement against **wingfoil at spots with a full week of
scored slots**, where calibration always had its six samples. The regression
surface is:

| Condition | Effect |
| --- | --- |
| Fewer than 6 scoring slots for the spot/sport | Falls back to an untuned bar |
| `kitesurfing` anywhere | Fallback is a hand-seeded guess, never measured |
| A spot with no `spotConfigs` row | Same |
| Early in a scrape cycle | Sample count is temporarily low, so the panel is wrong for a while and then silently right |

That last row is the nastiest: the same window can show 0/5 in the morning and
4/5 in the afternoon, with nothing on screen explaining the change.

## What "fixed" means

The gate for leaving Labs is a single property:

> **The model panel and the verdict must never contradict each other without
> saying why.**

Either they agree, or the panel states plainly that it cannot judge this window.
"0 of 5" must mean *the models disagree*, never *we asked the wrong question*.

## Plan

### 1. Never vote against an uncalibrated bar

`thresholdFor` currently degrades silently from measured → stored → guessed. The
grid has no idea which it got. Make the provenance explicit and let the UI
refuse to draw a vote it cannot stand behind.

- Return `source: "calibrated" | "config" | "sport-default"` from `thresholdFor`.
- `ModelGrid` renders the honest-unknown state for anything but `calibrated`,
  rather than a column of grey cells that reads as rejection.

The component already has the right vocabulary for this: `modelVote` returns
`null` for "cannot say", and `BANDS.UNKNOWN` exists. Today an uncalibrated
threshold produces a confident `false` instead of `null`, which is the actual
defect.

### 2. Lower the calibration bar, or widen what feeds it

`MIN_CALIBRATION_SAMPLES = 6` is a reasonable guard against a single lucky slot
setting the threshold, but it is measured per spot **per sport**, which is where
the samples run out. Options, in preference order:

1. **Pool across the sport's wind range at that spot.** Wing and kite want
   similar wind; a spot's "light end of a good day" is largely a property of the
   spot. Calibrate from all wind-sport slots at the spot, not just the selected
   sport's.
2. **Widen the window.** Calibrate over 14 days of scores rather than the
   current forecast horizon.
3. **Lower the guard to 4** and widen `MARGINAL_TOLERANCE` for small samples so
   a thin calibration produces `near` rather than `no`.

Option 1 is most likely to be both correct and sufficient; it should be measured
before being chosen.

### 3. Retire the hand-seeded sport defaults

`SPORT_DEFAULT_THRESHOLDS.kitesurfing = { 14, 17 }` was written from the
wingfoil numbers, not measured. Either derive it from real scores across all
spots that do kite, or delete it and let §1's honest-unknown state handle the
gap. **A guessed threshold that produces confident votes is worse than no
threshold.**

### 4. Fix the two cosmetic defects on the same panel

Both verified in the browser, both trivial:

- **Dangling separator.** The Labs caption is
  `` `${models.length} models · ${agreementSentence(...) ?? ""}` ``, so when
  there is no sentence it renders **"5 models ·"** with nothing after it.
- **Bare hour column headers.** The grid labels columns `16`, `19`; every other
  axis in the app uses `16:00`.

### 5. Only then, consider leaving Labs

The panel is genuinely good when the threshold is right — it is the only place
that shows *why* to trust or distrust a number, and the vertical-stripe reading
works. It should graduate. But it graduates on §1 being true, not on a date.

## Out of scope

- **Surfing.** The grid is hidden for surf on purpose: windy.app serves wave
  data from separate models and it is identical across all five wind models, so
  the grid would claim a consensus nobody measured. `CriteriaPanel` is the surf
  answer and is unaffected by this plan.
- **Model skill scoring.** Weighting models by past accuracy is a much larger
  piece of work and is not required to make the panel honest.
- **The live station.** A separate gap — `useNowData` returns no `station` and
  `stationDelta` is hardcoded `null` — currently being implemented on
  `feat/station-readings-ingest`. Nothing in this plan should assume its shape
  or wait on it.

  One observation from the same browser session belongs to that work, not this
  one: mobile Now rendered a live badge of **`0 (0)`** beside a MAYBE at 12 kn,
  which is a station reporting down. Whatever that branch lands, the display
  rule worth keeping is that **a down station must render as absent or as
  "down", never as a plausible zero** — a 0 kn reading next to a 12 kn forecast
  reads as a real contradiction rather than a missing input.

## Verification

- A regression test asserting that a spot/sport with fewer than
  `MIN_CALIBRATION_SAMPLES` scoring slots yields `source !== "calibrated"` and
  that `ModelGrid` renders the unknown state rather than zero agreement.
- A test pinning the observed case: 11.3 kt kitesurfing at a spot with a sparse
  sample must not report 0 of 5.
- Browser check on `/window/[day]/[start]` for **kite and wing**, at a
  light-wind window and a strong one, confirming the panel and the verdict agree
  or the panel abstains.

## Evidence

Browser session 2026-08-04, `/window/1785798000000/1785855600000`, kitesurfing,
Nightglass: dial 78 / "Good window" / "Wind, wave and tide all line up" above
`AGREED 0 · 0` across five models (ECMWF, GFS, ICON-EU, ICON, LEW). Reasoning
text on the same screen read *"Wind is just shy of the sweet spot at 11.3 kt but
rock-steady…"* — the scorer knew the wind was marginal and still scored it well;
the vote had no way to know that was acceptable here.
