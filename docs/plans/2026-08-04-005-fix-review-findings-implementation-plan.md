---
title: "fix: act on the Now/Next/Cams review findings"
type: fix
status: draft
date: 2026-08-04
source: browser review of Now, Next, Cams and the window detail, 2026-08-04
---

# fix: act on the Now/Next/Cams review findings

## Overview

Twenty-one findings from the browser review, sequenced into five phases. Each
phase is independently shippable and reviewable; nothing here depends on a
later phase.

The ordering is by **how much a rider's decision changes**, not by effort. The
app answers two questions — *can I go now* and *when is my next session* — and
the first two phases are almost entirely about the first question, because that
is where the current screens lose the thread.

Two findings are excluded because they are already owned:

- **Model agreement contradicting the verdict** →
  `2026-08-04-004-feat-labs-model-agreement-plan.md`, radx
  `ks771gntw5g7c52at34xdytm9s8bt1np`. That plan also owns the Labs caption's
  dangling separator and the grid's bare hour column headers.
- **Live station wiring** (`useNowData` returns no `station`; `stationDelta`
  hardcoded `null`) → in flight on `feat/station-readings-ingest`. Nothing here
  assumes its shape.

## Phase 1 — Things that are simply broken

Small, self-contained, no design questions. Ship first.

### 1.1 The fullscreen cam shows no information on any desktop

`components/webcam/WebcamFullscreen.js:341` carries `landscape:hidden` on the
metadata bar. `landscape:` is an orientation media query, so it matches **every
desktop window** — the `hidden md:flex` desktop row inside it (WindGroup,
WaveGroup, tides) is unreachable code. Verified: opening any cam full screen on
desktop gives video, a RECORD pill and a close X. No spot name, no conditions.

TV mode labels every cell with name and town; the more detailed surface labels
nothing. That asymmetry is the proof this is a bug rather than a decision.

- Remove `landscape:hidden`. On short viewports collapse the bar to one line
  rather than removing it.
- Add the **spot name and score** to the fullscreen view. Arrow-key navigation
  between cams already works (verified) but is unusable without a label — you
  page to a new beach with nothing telling you which.
- Add an `n of m` indicator and visible arrow affordances, since the keyboard
  navigation is currently undiscoverable.

### 1.2 The current session is listed as a "next window"

`lib/windows.js:130` and `:151` filter with `window.end <= fromMs`, so a window
that is **currently active** still qualifies as upcoming. Verified three times:
on a MAYBE at Marina de Cascais the first NEXT WINDOWS card was the same
session the verdict card above described.

Exclude the active window, or label it "on now" rather than listing it as next.

### 1.3 `day` is generated two different ways

`app/NowContent.js:154` routes `/window/${window.start}/${window.start}` —
passing the window start as the `day` segment. `NextContent` passes
`dayStartOf(window.start)`. `ConfidenceContent` only uses `day` for display so
it survives today, but the two callers disagree about the contract and anything
future that reads it (a "back to this day" link, analytics, a shareable day URL)
will be wrong half the time.

Fix `NowContent` to use `dayStartOf`.

### 1.4 The Cams scope picker cannot list spots

`app/cams/CamsContent.js:319` passes `spots={[]}` to `SpotPicker`, so it offers
only *My favorites* / *All spots* — while the visually identical control on Next
lists every spot. Same component, same affordance, different capability.

Either pass the spot list, or give it a distinct appearance so it does not
promise what it cannot do.

### 1.5 Cams routes score taps into a Legacy component

`app/cams/CamsContent.js:367` opens `ScoreModal`, which the rebuilt kit
classifies as Legacy — while `/window/[day]/[start]` answers the same question
far better with `ScoreFactors` plus the scorer's own reasoning.

Route the tap to the window detail for that slot and retire the modal.

## Phase 2 — Make the verdict earn its screen

This is the highest-value phase. Now currently spends its space on the least
useful element and buries the most useful one.

### 2.1 Promote the forecast sentence

The best writing in the product is last on the page, under "WHY WE THINK SO":

> *"Waves are only 0.79 m, well below the 1 m minimum, so skip."*
> *"At 18:00 the wind nudges up to 12.2 kt with 16 kt gusts… The wind will start
> to die off after dark, so grab the session now."*

Each does everything the verdict word, the dial and the metric row are
collectively attempting — plain language, names the threshold, gives the call,
and in the second case states the trajectory. Move it directly under the verdict
word at body size.

### 2.2 Demote the cam on a NO GO

Verified in every state: the cam occupies roughly half the viewport. When the
answer is "don't go", the video is the least useful element and the next window
the most, yet the video comes first. Accent is well rationed; space is not.

Collapse the cam to a strip (or behind a tap) when the verdict is NO GO.

### 2.3 Give Now a trajectory

Now describes a **three-hour block**: at 14:50 you are being told about
12:00–15:00, which is largely over. `HourByHour` proves shape matters but lives
on the detail screen.

Add the current slot plus the next two to the verdict card — three mini-dials or
a three-segment sparkline. It converts "GO" into "GO, and it holds" as a shape
rather than a sentence. **The data already exists**: §2.1's copy is generated
from it, and `holdsUntil` is already computed and folded into `reason`.

### 2.4 Make NO GO productive

Now ranks favourites only; Next defaults to favourites but offers all; Cams has
a third model. A rider seeing NO GO cannot tell whether that means "nothing at
my three beaches" or "nothing on the coast" — completely different decisions.

On a NO GO, say *"Nothing at your 3 spots — 2 windows elsewhere today"* with a
link. This turns the app's most common state from a dead end into its most
useful moment.

### 2.5 Surface the "tomorrow is better" trade-off

Verified on a MAYBE: the verdict was 70 today, and the second next-window card
was **86 at Guincho tomorrow**. That comparison is the most decision-changing
fact on the screen and it renders as an equal-weight card below a large cam.

On a MAYBE, put it in the verdict: *"MAYBE now — but 86 at Guincho tomorrow."*

### 2.6 Resolve the score/verdict disagreement

Verified: **MAYBE** beside a dial reading **70**, while the rest of the app
treats 60+ as good and paints it accent. The divergence is legitimate — the
verdict also weighs agreement — but nothing on screen says so.

Either label the dial with its band word instead of a bare number, or drop it
from the verdict card now that every window card carries one.

### 2.7 Make the verdict card's affordance visible

It routes to `/next?spot=` and has no chevron, underline or hover cue. Nobody
will find it.

### 2.8 Give `reason` its due

`WORTH A LOOK`, `NOTHING ON RIGHT NOW` and `HOLDING UNTIL ABOUT 18:00` are the
most actionable strings on the screen, set in 11px uppercase mono at the card's
bottom edge. Sentence case, body size, directly under the verdict.

## Phase 3 — Make Next answer "when should I plan"

### 3.1 Put duration on the week strip

A 92 lasting one slot and a 74 lasting five are drawn at the same height; only
width differs, and width reads as "the day". Duration is half the planning
decision. Add a duration figure beside the score, or let the band's vertical
extent carry it.

### 3.2 Put quality on the "other spots" rows

Verified in both scope modes: `Lagoa da Albufeira · 10 windows · TODAY`. Ten
windows says nothing about whether to look. `spotSummaries` already computes the
best score — show it.

### 3.3 Tide is absent from Next entirely

`HourByHour` surfaces tide turns on the detail screen and `spotConfigs` carries
optimal tide, but the week strip has no tide layer. For surf, a window at the
wrong tide is not a window.

### 3.4 Extend the horizon

Six days is short for "plan my next session", which often means next weekend.
If the forecast allows, 8–10 days with the far end visibly less certain.

### 3.5 Say when the scope changes under you

Switching sport silently moved the scope from *All spots* to *Marina de
Cascais*, because the persisted spot does not support the new sport and the
fallback is invisible. Say so, or keep the scope and show an empty state.

## Phase 4 — Cams

### 4.1 Move the overlay badges off the broadcaster watermark

The MEO BEACHCAM watermark is baked into the **top-left** of every feed —
exactly where the app places its rider-count and live-wind badges
(`absolute top-2 left-2`). Move them to the top-right, which is free.

### 4.2 Label the hover controls, and show favourite state at rest

Three unlabelled icon buttons appear on hover (heart, gauge, bar chart) with no
tooltips. And favourite state is **only** visible on hover — on a screen that
offers favourites-scoping, it should be visible at rest.

### 4.3 Give TV mode something to decide with

Cells carry spot name and town only. As a shop-wall display that is arguably
right, but it cannot answer "where should I go". One small `ScoreDial` per cell
would fix it without clutter.

### 4.4 Connect Cams to the verdict

Cams is a wall of pictures with condition lines; nothing marks the spot Now
recommended. Highlighting it, and letting a card jump to that spot's week, turns
Cams from a browsing surface into a confirmation step in the decision.

### 4.5 Collapse offline cams

On a coast where several are usually down, a dead feed takes a full grid cell.
Consider a compact row at the bottom.

## Phase 5 — Theme and polish

### 5.1 Dayglass loses the signals Nightglass carries

Verified by flipping the theme on the same screen:

- The **verdict tint nearly vanishes** — `bg-caution/10` over a near-white page
  is a barely perceptible wash, so the orange word carries the whole signal.
- The **recommendation highlight collapses** — `bg-accent-tint-card` on white is
  so pale that the three next-window cards read as equal, losing *this is the
  one*, which is the most important ranking information on the screen.
- **Mono labels sit near the legibility floor** — `text-dim` at 9–11px on
  off-white.

Fill alone is not enough in the light theme. A left accent rule, a border-weight
change, or a small label would all survive.

### 5.2 The NOW pill occludes an axis label

Verified in three states, and worse on mobile where labels sit tighter: the axis
renders `… 16:00 [NOW]00 22:00` — the 19:00 label is swallowed. It will collide
with whichever label is nearest the current time, so it moves through the day.
Suppress labels within ~30px of the marker, or move the pill to its own lane.

### 5.3 The caution/marginal hues clash on one card

Only visible when a MAYBE scores 45–59: the card is `caution` **orange** while
its dial is `marginal` **pink**. Two unrelated warning hues on one card. (At 70
the dial is accent and the clash is hidden, which is why the live MAYBE did not
show it — it appeared in the kit.)

### 5.4 Window-detail polish

- **No action on the screen.** It is the most honest screen in the app —
  factors, hour-by-hour, tide turns, models in Labs — and its only control is
  Back. For "plan my next session", this is where the plan should get committed:
  a reminder, a calendar add, or share-this-window.
- **The header breadcrumb is the smallest text in the app**, on its densest
  screen.
- **Label and dial say the same thing** — "Good window" beside 78.
- **Copy overreaches**: *"Wind, wave and tide all line up"* sat above WIND 70,
  WAVE 85, TIDE 70 — wind and tide are the weakest of the three.

## Verification

Per phase, not at the end:

- **Unit** — Phase 1.2 needs a test pinning that a window spanning `now` is
  excluded from `upcomingWindows`; 1.3 a test that both callers produce the same
  `day` for the same window.
- **Browser, both themes, both widths** — Phases 2 and 5 are visual and cannot
  be verified any other way. The Dayglass findings in 5.1 only appeared on a
  theme flip, and the 5.3 clash only in a specific score band.
- **A GO state.** The review never caught one — no spot scored GO in live data
  across all three sports. Phases 2.1–2.3 change the GO layout most, so they
  need either a windy day or a fixture harness. Worth building the fixture.

## What this plan does not touch

- `/report`, `/calendar`, `/dashboard` and the sport-filter routes. They are
  Legacy in the rebuilt kit, restyled and working; nothing here changes them.
- Alerts, rider counts, model skill scoring — separately deferred.
