---
title: "feat: Nightglass/Dayglass theme and task-led IA"
type: feat
status: draft
date: 2026-08-04
handoff: design_handoff_waterman_rethink
---

# feat: Nightglass/Dayglass theme and task-led IA

## Overview

The design handoff delivers two independently shippable changes:

1. **A new theme** — Nightglass (dark) and Dayglass (light), replacing the newsprint look. Palette, type and component treatment only; no structural change.
2. **A task-led information architecture** — four tabs (Now · Next · Cams · More) reorganised around the three questions a rider actually asks, demoting the score from headline to detail.

This plan ships them as two phases. Phase 1 retokenises the existing app and can go to production on its own. Phase 2 builds the new IA on top of the new tokens.

The redesign's premise is that three assets the current UI does not surface — model disagreement, live station readings, and webcam rider counts — are what turn a forecast into a verdict. Two of the three are buildable today. The third is not, and is flagged accordingly.

## Decisions taken

These were open in the handoff and are now settled:

| Question | Decision |
| --- | --- |
| Multi-model wind data | Use the models the existing Windy.app endpoint already exposes, not the model list in the mockups. |
| Theme switching | Both themes, automatic on local sunrise/sunset. No user toggle in v1. |
| Existing routes | `/report`, `/calendar`, `/dashboard` and `/[sport]/[filter]` are kept, restyled, and reachable under **More**. Nothing is deleted. |
| Delivery | Two phases: theme first, then IA. Each reviewable and shippable on its own. |
| Rider counts | Behind a feature flag, dummy data in non-production, hidden in production. |
| Now's spot | The best-scoring spot right now among the user's favourites; all spots for anonymous visitors. |
| Surf confidence | The model grid is **hidden entirely** for surfing. A surf variant of Screen 03 is needed. |
| Alerts (Screen 05) | **Deferred** to its own plan, built alongside the delivery mechanism that makes it true. |
| Legacy route polish | **Full fidelity** — same bar as the new screens, including empty states and spacing/radius rework. |
| Theme override | Auto (default) / Night / Day in Settings. Auto-only is an accessibility problem. |
| Verdict scope | **Per sport.** Switching sports can flip GO to NO; that is intended. |
| Drive time | **Cut entirely.** Not in the final designs on any screen. No home location is requested. |
| Cam rider counts | Feature deferred. UI built behind the flag against fixtures; a **range** rather than an integer is the preferred representation when it becomes real. |
| Desktop | **In scope.** Every screen, new and legacy, properly adapted. No desktop layouts exist in the handoff, so they are designed here. |
| `spotConfigs` coverage | Incomplete. Model votes need a sport-level threshold fallback (§2.2). |
| Convex environments | **Production and development share one deployment.** There is no production database. |

## Verified finding: the model data already exists

The current scraper calls `https://windy.app/widget/data.php?id=wfwindyapp&spotID=<id>&timelineRange=future` and uses the blended default. The response carries two fields the code ignores:

- `available_models` — for Marina de Cascais: `["gfs27","gfs27_long","ecmwf","iconeuro","iconglobal","uvi","cfs","silam","gfs_wave","lew","gdps","cmems"]`
- `model` — which model produced the returned series (default `gfs27_long`)

The endpoint accepts `&model=<name>`. Probed against spot `8512151` on 2026-08-04, five models return **genuinely distinct** wind series:

| Request | Echoed `model` | Distinct series | Display name |
| --- | --- | --- | --- |
| `ecmwf` | `ecmwf` | yes | ECMWF |
| `gfs27_long` | `gfs27_long` | yes (baseline) | GFS |
| `iconeuro` | `iconeuro` | yes | ICON-EU |
| `iconglobal` | `iconglobal` | yes | ICON |
| `lew` | `lew` | yes | LEW |

Three request values are traps and must be rejected:

- `gdps`, `cfs` — echo `model: "gfs27_long"`. Detectable by comparing the echoed name to the requested one.
- `arome` — echoes `model: "arome"` but returns a series byte-identical to GFS. **The echo check alone is not sufficient**; content deduplication is mandatory.
- `gfs27` — echoes correctly but is identical to `gfs27_long` over this range.

`uvi`, `silam`, `gfs_wave`, `cmems` are UV, air-quality and wave models, not wind models.

**Consequence:** the 5-row model grid, the "4 of 5" agreement bars and the "models split" state can all ship with real data. The copy must name the real models (ECMWF, GFS, ICON-EU, ICON, LEW), not the mockup's AROME/HARMONIE.

### The models differ only in wind

Verified on the same probe: `wavesHeight`, `wavesPeriod` and `wavesDirection` are **byte-identical across all five models**. Windy.app serves wave data from separate models (`gfs_wave`, `cmems`) that the wind-model parameter does not select.

**Consequence:** there is no model spread for surfing. The agreement grid, the agreement bars and the "models split" band carry information for wing and kite only. Screen 03 hides the grid entirely for surf (see §2.9).

Each forecast row also carries a `windModel` field, giving per-row provenance for free.

## Other verified findings

**`spotConfigs` are populated and usable as vote thresholds.** `convex/seed.ts` sets wingfoil `minSpeed: 15`, `minGust: 18`, `directionFrom: 315`, plus surfing configs; `convex/addKitesurfing.ts` creates kitesurfing configs for Guincho, Lagoa da Albufeira and Fonte da Telha. This is what makes deterministic per-model votes (§2.2) viable without LLM calls. **Still to check against the live database:** whether every spot/sport pair that the new IA will offer actually has a config, since a missing one silently makes every model vote meaningless.

**Kitesurfing is only partly first-class.** It is in `VALID_SPORTS` across `HomeContent.js:130`, `DashboardContent.js:33`, `SpotReportContent.js:34` and the conditions API, and has scoring prompts. But `components/auth/OnboardingFlow.js:21` offers only wingfoil and surfing, the journal rejects kite, and `calendar_subscriptions` is documented as wingfoil-or-surfing. A sport selector that switches the whole app's context between WING / KITE / SURF forces these gaps closed — see T2.21b.

**Timezone comes from the spot, not the viewer.** The widget response includes `spotInfo.spotTimezone` (`"Europe/Lisbon"`) and `spotGmtOffset`. Window boundaries, the week strip's hour labels and "Today, 12:00 – 15:00" all render in the spot's local time. A rider checking Guincho from another timezone should see Guincho's hours.

---

# Phase 1 — Theme

## 1.1 Token architecture

Sunrise/sunset switching means values must change at runtime, so the palette lives in CSS custom properties and Tailwind maps onto them.

Two classes of token, because the codebase leans on Tailwind opacity modifiers (`border-ink/10`, `bg-ink/[0.04]`) which only work against bare channel triples:

**Channel-triple tokens** — support `/opacity` modifiers. Defined as `234 244 246`, consumed as `rgb(var(--wm-ink) / <alpha-value>)`.

`--wm-page`, `--wm-ink`, `--wm-accent`, `--wm-marginal`

**Composite tokens** — carry their own alpha, no opacity modifier. Defined as literal `rgba(...)` or hex.

`--wm-surface`, `--wm-border`, `--wm-rule`, `--wm-btn-border`, `--wm-muted`, `--wm-dim`, `--wm-accent-tint-nav`, `--wm-accent-tint-card`, `--wm-accent-border`, `--wm-accent-mid`, `--wm-accent-low`, `--wm-accent-faint`, `--wm-marginal-low`, `--wm-track`, `--wm-nav-bg`, `--wm-nav-border`, `--wm-offline-bg`, `--wm-knob`, `--wm-sport-pill-bg`, `--wm-sport-pill-text`

Values come straight from the `NIGHT` and `DAY` objects in `Rethink.dc.html` (lines 534–559), which match the handoff tables.

**Do not derive one theme from the other.** The accent moves from `#6EE7F0` to `#0E7A85` because cyan on white is ~1.3:1. Same hue, different lightness, chosen for contrast. The filled sport pill needs its own token pair for the same reason — tinted with accent text at night, solid accent with white text in day.

### Naming strategy: keep existing class names where the role survives

57 files reference the current tokens. A full rename is churn without benefit. Repoint the existing names and add new ones:

| Existing class | Becomes | Night | Day |
| --- | --- | --- | --- |
| `newsprint` | page | `#0A1420` | `#F1F4F4` |
| `ink` | primary text/foreground | `#EAF4F6` | `#0A1420` |
| `faded-ink` | muted text | `#84A0AC` | `#4A6270` |
| `warm-highlight` | card surface | `rgba(234,244,246,.05)` | `#FFFFFF` |
| `ink-hover` | hover fill | `rgba(234,244,246,.09)` | `rgba(10,20,32,.06)` |
| `red-accent` | *audit each use* — splits into `accent` or `marginal` | — | — |
| `muted-yellow` | `marginal` | `#FF5D8F` | `#C9366B` |

New: `accent`, `accent-tint`, `accent-border`, `accent-mid`, `accent-low`, `accent-faint`, `marginal`, `dim`, `track`, `rule`, `nav-bg`, `nav-border`, `sport-pill`.

Inverted-button pairs keep working for free: `bg-ink text-newsprint` is light-on-dark in Nightglass and dark-on-light in Dayglass, which is correct in both.

`red-accent` is the one that cannot be mechanically repointed — it currently means both "emphasis" and "warning". Audit every use and split it.

**Note the semantic change:** today `muted-yellow` tints 60–74 as a warning. In both new themes that role is the accent-2 hue, reading as "marginal, look closer" rather than "warning".

### Tasks

- **T1.1** Add `app/theme.css` with `:root` (Nightglass) and `:root[data-theme="day"]` (Dayglass) blocks.
- **T1.2** Rewrite `tailwind.config.js` colors to reference the vars. Set `borderRadius`: `card: 16px`, `card-sm: 14px`, `card-lg: 18px`, `pill: 999px`, `icon: 8px`. Set `boxShadow.card: none` (cards carry no shadow in either theme — separation is by border and fill) and add `shadow-nav` as a var so it can be `0 4px 24px rgba(10,20,32,.14)` in Dayglass and `none` in Nightglass.
- **T1.3** Rewrite `app/globals.css`: drop the newsprint SVG wave texture from `body`; retheme `.is-ideal` (currently `rgba(254,243,199,.33)` + `#ffd700`), `.focus-ring` (hardcoded `#f4f1ea`), and `.loader` (`#808080`).

## 1.2 Type

| Role | Family | Replaces |
| --- | --- | --- |
| Display / headings | Bricolage Grotesque 700–800 | Playfair Display |
| Body / UI | Space Grotesk 400–500 | Inter |
| All numerics | JetBrains Mono 400–700 | Courier Prime |

**The mono-numbers convention survives unchanged.** Every knot, metre, degree, temperature, time, score and duration stays monospaced. Only the face changes.

Sizes: display 52–72px, screen title 25–34px, card title 17–19px, body 13–14px, mono data 10–15px, mono labels 9–11px at `letter-spacing: .16em–.22em` uppercase. Display letter-spacing runs `-.025em` to `-.045em`, tighter as size grows.

**Correction to the handoff:** it says to "self-host as the current app does with Playfair / Inter / Courier Prime". The current app does *not* self-host — `app/globals.css:1` is a render-blocking `@import` from `fonts.googleapis.com`. Use `next/font/google` instead, which self-hosts at build time, emits `font-display: swap`, and removes the blocking import. This is a small performance win alongside the visual change.

Keep the Tailwind family names `font-headline` / `font-body` / `font-data` and swap the underlying families — same minimal-churn argument as the colors.

- **T1.4** Add `next/font/google` loaders in `app/layout.js`, expose as CSS variables, wire into `tailwind.config.js`, delete the `@import` line.
- **T1.5** Add letter-spacing scale utilities for the mono label treatment.

## 1.3 Automatic theme switching

`suncalc` is already a dependency and `lib/sun.js` / `lib/daylight.js` already compute sunrise/sunset.

The hard part is avoiding a hydration mismatch and a flash of the wrong theme. The server cannot know the visitor's local time or coordinates.

**Approach:**

- **T1.6** Add a blocking inline script in `<head>` (the `next-themes` pattern) that computes day/night from local time and the default Cascais coordinates and sets `data-theme` on `<html>` before first paint. `app/layout.js:21` already carries `suppressHydrationWarning`, which is what makes this safe.
- **T1.7** Add `components/theme/ThemeProvider.js` — a client component that recomputes on mount, schedules a `setTimeout` for the next sunrise/sunset boundary so the theme flips mid-session, and re-evaluates on `visibilitychange` for a backgrounded PWA.
- **T1.8** Drive `<meta name="theme-color">` from the active theme. Also revisit `appleWebApp.statusBarStyle: "black-translucent"` in `app/layout.js:14` — it is wrong for Dayglass.
- **T1.9** Add a `?theme=night|day` URL override for screenshots and review. Development only.
- **T1.9b** Add an **Auto / Night / Day** preference under More → Settings, persisted to `waterman_theme`, defaulting to Auto. Auto-only switching is an accessibility problem — riders with light sensitivity, low vision, or a screen they cannot see in daylight need an escape hatch, and a theme that flips itself mid-session with no way to stop it is worse than either fixed theme. When the preference is Night or Day, the sunrise/sunset timer is cancelled rather than left running.

Coordinates: use the app's default region rather than asking for geolocation permission. Spots already carry `latitude`/`longitude`; using a fixed Cascais origin is honest for a Cascais-region product and avoids a permission prompt on first load.

## 1.4 Score dial replaces ScorePill

`components/ui/ScorePill.js` becomes `components/ui/ScoreDial.js`. A conic-gradient ring with the number inside:

```
background: conic-gradient(<accent> 0 <score>%, <track> <score>% 100%)
```

- Inner disc is the page colour, or the card colour when sitting on a tinted card — needs an `on` prop, since `NightglassBadDay.dc.html:56` uses `#0C1B27` for a dial on an accent-tinted card while `:47` uses `#0A1420` on the page.
- Inner disc ≈ 78% of outer diameter.
- Sizes: 44px in lists, 52px in rows, 74px and 104px as a hero.
- Colour: accent at ≥60; marginal below 60; dim text colour below ~45.
- **The `showAll` rule is unchanged** — scores under 60 stay hidden unless the user asks for them.

- **T1.10** Build `ScoreDial` with a `size`, `on`, `showAll` and optional `label` prop (`SCORE` / `BEST` / `PEAK` captions appear in the mockups at 6.5–8px, `.18em–.2em`).
- **T1.11** Replace `ScorePill` usages. Keep `ScorePill` as a thin deprecated re-export for one release so Phase 1 does not have to touch every call site at once.

## 1.5 Component retheme sweep

Mechanically, most of this falls out of the token repoint. These need real attention:

- **T1.12** `components/layout/BottomNav.js` — floating pill at `left/right: 14px`, `bottom: 18px`, `padding: 5px`, with a 96px page-colour gradient fade above it (`to top`, opaque to 48%). Note the existing `bg-gradient-to-t from-newsprint via-newsprint/80` at `:68` and the `shadow-[0_4px_24px_rgba(0,0,0,0.12)]` at `:69` both need to become theme-aware. Nav stays 5 tabs in Phase 1; it becomes 4 in Phase 2.
- **T1.13** `components/ui/` primitives — `Card` (radius 14–18px, no shadow), `Button`, `Badge`, `PillToggle`, `SportBadge`, `Divider`, `FilterBar`.
- **T1.14** Icons stay **lucide-react 0.556.0**, already a dependency. Sizes 11–18px. Active nav items `strokeWidth={2.5}`, inactive `2` — note `BottomNav.js:90` currently uses `1.5` for inactive.
- **T1.15** `app/ui-kit/page.js` — the internal visual inventory. Update it first; it is the fastest way to eyeball the whole token set in both themes.

## 1.6 The bad day is the common case

`NightglassBadDay.dc.html` is the handoff's stress test and it says to read it before implementing. On a summer lull nothing clears 60, so **the empty state is the screen, not a fallback**.

Three states to build:

1. **Default report, nothing clears 60** — a 104px dial reading the best score in dim, "No spot clears 60 today", the next window in an accent-tinted card, and a `SHOW EVERYTHING ANYWAY` outlined pill.
2. **Show everything** — every spot listed with 44–48px dials, all in dim/muted, dropping to `opacity: .55` for the worst.
3. **Spot detail, flat day** — the table with dials in the score column, plus a `NEXT WINDOW HERE` accent card and a `JUMP TO THURSDAY` action.

Two rules the mockup encodes: **dials read near-empty rather than absent**, and **accent is withheld from everything except the one forward-looking row worth acting on**. Magenta stays off entirely — nothing is marginal, it is all low.

- **T1.16** Build these three states against `components/common/EmptyState.js` and the report/spot pages.

## 1.6b Legacy routes get full fidelity

`/report`, `/calendar`, `/dashboard`, `/[sport]/[filter]` and `/report/[spot]` are held to the same bar as the new screens: new empty states, spacing and radius rework, and systematic dual-theme QA — not just a token repoint.

**This roughly doubles Phase 1's component work** and is the single largest cost in the phase. It is worth naming because these are surfaces the new IA deliberately demotes to a submenu. The upside is that nothing looks second-class and Phase 2 inherits no visual debt.

- **T1.20** `/dashboard` — current/best slots, webcam tiles, Coming Up groups, onboarding footer and modal.
- **T1.21** `/report` and `/[sport]/[filter]` — `DaySection`, `ForecastSlot`, `WindGroup`, `WaveGroup`, `LiveWindRow`, `DirectionIndicator`, plus the Best/All filter and score modal. Note `/[sport]/[filter]` duplicates most of `/report`'s rendering, so budget for both.
- **T1.22** `/calendar` — `CalendarView`, still on the legacy per-spot query fan-out. Retheme only; do not attempt the batched-query migration here.
- **T1.23** `/journal`, `/settings`, `/profile*`, `/subscribe*`, `/request-spot`, `/changelog` — the long tail. `SessionCard`, `RatingInput`, `ForecastComparison`, `LocationPicker`, and the tide components.
- **T1.24** `/admin/*` — decide explicitly whether admin is in scope. Recommendation: token repoint only, no empty-state or layout work. It is internal, and `app/admin/` is nine pages plus `SpotConfigForm`.

## 1.7 Phase 1 verification

`npm test` exits 1 by design and `npm run lint` invokes a removed `next lint` command, so there is no working quality gate today (see `docs/repository-audit/05-quality-security-and-risks.md`). There are untracked tests in `lib/__tests__/` and `hooks/__tests__/` that cannot currently run.

- **T1.17** Add Vitest and make the existing untracked tests run. Phase 2 adds pure functions (agreement counting, verdict derivation, window detection) that genuinely need unit tests, so this is groundwork, not a detour.
- **T1.18** Screenshot every route in both themes at 390px **and at desktop width**. The `?theme=` override from T1.9 makes this scriptable. Four images per route — night/day × mobile/desktop — is the grid that catches the token bugs, and the count is why it has to be scripted rather than done by hand.
- **T1.19** Contrast-check the mono labels — the small `.16em–.22em` uppercase text at 9–11px is the treatment most at risk, and the reason Dayglass drops the accent to `#0E7A85`.

---

# Phase 2 — Task-led IA

## 2.0 Feature flags

Build this first — Phase 2 surfaces depend on it.

### Constraint: production and development share one Convex deployment

**There is no production database.** Production runs against the same Convex deployment as development. This constrains the flag design and several other things in this plan:

- **A Convex-side env var cannot gate anything by environment.** One deployment means one set of env vars. The two-sided flag design that would normally apply here — client hides the UI, backend refuses the data — collapses to a single side.
- **Any dummy data written to Convex is written to production.** Seeding fixtures into the shared database would put fabricated rider counts in front of real users.
- **Schema changes land in production the moment they are pushed.** The three new tables in this plan (`forecast_model_slots`, `station_readings`, `cam_rider_counts`) go live for everyone at once.
- **Development ingest writes production data.** Running the multi-model scraper locally writes real rows that production then reads.

### The resulting flag design

Given the shared deployment, the rule is: **fixture data never touches Convex.**

Rider-count dummy data is generated in the Next.js layer from a deterministic fixture module. There is nothing in the database to leak, so nothing needs a backend gate. The environment boundary is the Render service's env vars, which *do* differ between production and preview.

This is a better design than the original two-sided one, not a workaround. The failure mode being avoided — a curious user flipping a localStorage key and seeing fabricated counts under a *"detected with our computer vision model"* footnote — is now impossible by construction, because the fabricated counts only exist in builds where the env var is set.

- **T2.1** `lib/flags.js` — flag definitions, each with a `NEXT_PUBLIC_FLAG_*` env var and a default of `false`.
- **T2.2** `useFlag(name)` hook. The env value is authoritative during SSR; localStorage and `?ff=` overrides apply only after mount, and only when `NEXT_PUBLIC_FLAG_OVERRIDES_ENABLED === "true"`. This keeps overrides out of production and avoids hydration mismatch under `cacheComponents: true`.
- **T2.3** Fixture modules are imported behind the flag check so a production build tree-shakes them out. Verified by T2.55.
- **T2.4** A dev-only flag panel under More, visible only when overrides are enabled.
- **T2.4b** **Never seed fixtures into Convex.** No seed script, no admin action, no "populate demo data" button. The `cam_rider_counts` table is defined but stays empty until the real CV pipeline writes to it.

### Handling the shared deployment elsewhere in this plan

- **T2.4c** All new schema fields are optional and all new tables are additive, so a schema push cannot break the running production app. No field is ever renamed or removed in the same push that adds its replacement.
- **T2.4d** The multi-model scrape and the station-reading cron write real data that production reads. Local development should run against the deployed ingest, not re-run ingest locally, or it will double-write. Document this in the runbook.
- **T2.4e** Retention pruning (T2.9) deletes production rows. It must be introduced with the write path, not bolted on later, so pruning is never running against a table that grew unbounded first.

This is worth flagging beyond this plan: a shared dev/prod database compounds the audit's highest-priority finding, that the Convex write boundary is open and unauthenticated. Together they mean any development mistake is a production incident. Sequencing against `docs/repository-audit/06-restart-plan.md` matters more than this plan's own ordering.

### The flags

| Flag | Covers | Prod at launch | Why |
| --- | --- | --- | --- |
| `riderCounts` | Every rider count, trend, count-history bar chart, the "In the water" evidence card, cam count badges, cam sort order | **off** | No CV pipeline exists. Dummy data only. |
| `stationEvidence` | Station sparkline, "+2 vs forecast" pill, "runs 2–3 kn over" bias line | off initially, on once history accumulates | Needs a few days of `station_readings` before the trailing bias means anything. |
| `modelConfidence` | Model grid, agreement bars, "models split" state | **on** | Real data from day one. Flag exists as a kill switch. |

Three flags, not four — the `alerts` flag disappears with Screen 05 (see §2.11).

- **T2.5** `lib/fixtures/riderCounts.js` — deterministic dummy data seeded from spot id + hour, so screenshots and demos are stable rather than random. Must cover the four cam states: active, quieter, **nobody out**, and offline.

### Designing the real schema now

Even though nothing populates it, define `cam_rider_counts` `{spotId, at, count, sport, source, confidence?}` with a `by_spot_time` index in Phase 2. It costs nothing, it forces the shape question to be answered while the UI is being built, and the fixture module can then match the real query's return shape exactly.

**Carry the handoff's open question forward:** if the count is wrong often it damages trust faster than a bad forecast does, because the whole evidence hierarchy puts it first. Consider showing a range rather than an integer until the model is measured. The copy — *"Estimated with our computer vision model from webcam footage"* — is deliberate and must never present the count as measured fact.

## 2.1 Backend: multi-model ingest

- **T2.6** Extend `lib/scraper.js` with `getForecastForModel(spotId, model)` and `getAvailableModels(spotId)`.
- **T2.7** Model selection, in order:
  1. Read `available_models` from the default response.
  2. Intersect with a wind-model allowlist: `ecmwf`, `gfs27_long`, `iconeuro`, `iconglobal`, `lew`. Excludes UV, air-quality and wave models.
  3. Fetch each with `&model=<name>`.
  4. **Reject if the echoed `model` field does not equal the requested name** — kills `gdps` and `cfs`.
  5. **Reject if the series signature matches one already accepted** — kills `arome`, which echoes correctly but returns GFS data.
- **T2.8** New table `forecast_model_slots` `{spotId, model, timestamp, scrapeTimestamp, speed, gust, direction}`, indexed `by_spot_scrape_model` and `by_spot_model_timestamp`.
- **T2.9** Retention: keep the latest **3** scrapes of model slots per spot, pruned in the same mutation that writes new ones. Without this, storage grows at 81 slots × 5 models × spots × 4/day forever. The audit already flags that nothing prunes forecast data (`docs/repository-audit/03-data-model-and-pipelines.md` §9); do not add a sixth unbounded table.

  Three, not two, because of an interaction that is easy to miss: `_getForecastSlotsForSpot` deliberately supplements the latest scrape with today's timestamps carried forward from *older* scrapes, so a displayed slot can be older than the newest scrape. Pruning too aggressively leaves those slots with no model rows.

- **T2.9b** **A missing agreement lookup must render as "no model data", never as "models split".** Absence of evidence and evidence of disagreement are different answers, and the week strip gives the split state its own dashed band precisely because the design treats disagreement as information. Silently collapsing a lookup miss into that band would manufacture disagreement that no model expressed.
- **T2.10** Fetch models per spot in parallel with a small concurrency cap. The scraper is sequential across spots today and this multiplies request count by 5.
- **T2.11** **The blended default series remains the scored series.** Model slots are additive evidence. If model fetches fail entirely, the existing forecast and scoring path must be unaffected — this is an undocumented endpoint and an undocumented parameter, and it must not become a single point of failure for the core product.

## 2.2 Backend: agreement and confidence

The handoff asks for "per-model, per-hour verdicts rather than one blended score". Running the LLM scorer across 5 models × every slot is not affordable — the audit already flags scoring cost as a live concern (RAD-57).

**Use deterministic thresholds for the model votes and keep the LLM score as the score.** A model either clears the spot's wind threshold for the sport or it does not; that is a threshold question, not a quality judgement. It is cheap, explainable, and it is honestly what the screen claims — the heading is *"WHEN EACH MODEL SAYS GO"*, not "how good each model thinks it is".

### Not every spot/sport pair has a config

Confirmed: `spotConfigs` coverage is incomplete. Since a model vote is a threshold test, a pair with no config has no threshold, and the naive outcome is that every model votes "go" against a zero minimum — turning the agreement bars into a permanent, meaningless "5 of 5".

- **T2.11b** Add **sport-level default thresholds** in `lib/criteria.js`, used when a spot/sport pair has no config. Seed values from the existing configs (wingfoil `minSpeed: 15`, `minGust: 18`; kite and surf equivalents). A sport-level default is a defensible judgement about whether wind is usable at all, which is exactly what the vote asks.
- **T2.11c** **A zero or absent threshold must never produce a vote.** Guard explicitly rather than relying on `|| 0`, which is what `matchesWingfoilCriteria` does today (`lib/criteria.js:37`) and which would silently pass every slot.
- **T2.11d** Surface coverage in admin: a list of spot/sport pairs running on defaults, so the gap is visible and closeable rather than invisible. Cheap, and it is the only way anyone finds out.

- **T2.12** `lib/agreement.js`, pure and unit-tested:
  - `modelVote(slot, threshold, sport)` → boolean, reusing the `lib/criteria.js` direction/speed logic, where `threshold` is the spot config or the sport default.
  - `agreementFor(spotId, sport, timestamp)` → `{agreed, total, models: [{model, vote}], outlier}`.
  - Bands: **GOOD** at `agreed >= ceil(0.8 × total)` (4 of 5); **SPLIT** at 2–3 of 5; **NO** at ≤1.
  - `outlier` = the single dissenting model when `agreed === total - 1`. This drives the plain-language line naming it.
- **T2.13** The **models split** state is a first-class value, not a missing one. Absence of confidence gets its own rendering — the dashed accent-30% band on the week strip and `?` instead of a score — rather than being averaged away.
- **T2.14** Model display names map `gfs27_long`→GFS, `ecmwf`→ECMWF, `iconeuro`→ICON-EU, `iconglobal`→ICON, `lew`→LEW. The mockups' AROME/HARMONIE copy is illustrative and must not ship.

## 2.3 Backend: station history

The 90-minute sparkline, the `+2 vs forecast` pill and the per-spot bias line all need stored readings. Today `app/api/live-wind/[stationId]/route.js` is a passthrough proxy fetched client-side per view — nothing is retained, so none of the three are computable.

- **T2.15** New table `station_readings` `{spotId, stationId, time, speed, gust, direction, tempC?}`, indexed `by_spot_time`.
- **T2.16** A Convex cron every 10 minutes polling Windguru for each spot with a `liveReportUrl`. Station IDs are extracted from that URL today (`components/forecast/DaySection.js:285`).
- **T2.17** `lib/stationBias.js` — trailing mean of `(station − nearest forecast slot)` over N days per spot, producing the "runs 2–3 kn over" line. Only slots with an actual reading contribute, and only those show the second bar in the paired chart.
- **T2.18** Write via `internalMutation` from an action, **not** a public mutation. The audit's highest-priority finding is that the Convex write boundary is already open; do not widen it.

Two notes: 10-minute polling across a handful of spots is modest but is still a third-party endpoint being polled on a schedule — confirm it is acceptable. And the proxy route interpolates `stationId` into the upstream URL without validation; constrain it to known station IDs while touching this code.

## 2.4 Backend: the verdict

- **T2.19** `spots.getVerdict({sport, spotIds})` → `{verdict: "GO"|"MARGINAL"|"NO", spot, reason, wind, agreement, stationDelta}`.

Derived, never stored. The reason string is generated **server-side** so the copy stays consistent with the score — that is the handoff's explicit requirement, and it is what stops the headline and the detail from disagreeing.

Derivation must live in exactly one place, because Now consumes it today and the deferred Alerts plan will consume the same value later. Starting rule, tunable:

- **GO** — blended score ≥75 and `agreed >= 4`
- **MARGINAL** — score ≥60, or score ≥50 with the station reading over forecast
- **NO** — otherwise

Verdict colours: GO uses accent, MARGINAL uses the marginal colour, NO uses dim.

**Open question carried forward:** the verdict is currently per sport, which means switching sports can flip GO to NO. That may be surprising. It is worth watching in testing before it is treated as settled.

## 2.5 Global sport context

The sport selector **switches the whole app's context, including the verdict. It is not a filter on a list.**

This conflicts with today's model. `/report` persists an *array* (`waterman_report_sports`) where empty means "all", and the audit identifies that ambiguity as the root of RAD-60. Dashboard, cams and the `?sport=` deep-link override each layer more state on top.

- **T2.20** `components/SportProvider.js` — a single selected sport (singular), persisted to `waterman_sport`, synced to the user document when signed in.
- **T2.21** New IA screens consume the provider. The legacy report keeps its array for now; the two are bridged rather than merged. Fully resolving the preference hierarchy is RAD-60's job, not this plan's — but do not make it worse.
- **T2.21b** **Close the kitesurfing gaps.** A three-segment WING / KITE / SURF selector that switches whole-app context cannot have a sport that half the app rejects. Add kite to `components/auth/OnboardingFlow.js:21` and `components/onboarding/OnboardingModal.js`, to journal sport validation (backend and form), and to calendar subscriptions. Verify every spot offering kite has a `spotConfigs` row, or its model votes are meaningless.

## 2.6 Navigation

Four tabs, down from five: **Now · Next · Cams · More**, using `zap`, `calendar-clock`, `video`, `ellipsis`.

- Report and Calendar collapse into **Next**
- Journal, Settings and Request-a-Spot move under **More** (Alerts joins them when its own plan lands)

| Route | Screen | Status |
| --- | --- | --- |
| `/` | 01 Now | new (currently redirects to `/dashboard`) |
| `/next` | 02 Next | new |
| `/window/[spot]/[start]` | 03 Confidence | new |
| `/cams` | 04 Cams as evidence | rebuilt |
| `/more` | menu | new |
| `/report`, `/calendar`, `/dashboard`, `/[sport]/[filter]`, `/report/[spot]` | legacy | kept under More, full fidelity (§1.6b) |
| `/alerts` | 05 Alerts | **deferred** to its own plan |

- **T2.22** Rebuild `BottomNav` for four tabs.
- **T2.23** Build `/more` as the entry point to everything demoted. Existing `MobileMenu.js` is the starting point.
- **T2.24** Keep `/dashboard`, `/report`, `/calendar` and `/[sport]/[filter]` working. Shareable `/wing/best` links, `/report/[spot]` deep links and the ICS feeds must not break.

## 2.7 Screen 01 — Now

**Purpose: answer "can I go" before anything else.**

### Which spot Now speaks for

The screen shows one verdict, one cam, one station. The rule: **the best-scoring spot right now among the user's favourite spots**, falling back to all non-webcam-only spots for anonymous visitors — the same fallback `getDashboardData` already uses.

The spot name lives in the caption (`GUINCHO · HOLDING UNTIL ABOUT 15:00`), so it is free to change from hour to hour as conditions move down the coast. That is the intent: Now answers "can I go", not "how is my usual spot".

Two consequences to handle:

- **T2.24b** The spot can change under the rider between visits. The caption must always name it, and the cam and station must belong to the same spot as the verdict — a verdict for Guincho beside Carcavelos' cam would be actively misleading.
- **T2.24c** Ranking needs a current score for every candidate spot. Reuse the existing batched read rather than fanning out per spot.

### Anonymous vs personalized

The architecture constraint from the audit holds: anonymous server-prefetched data must not include personalized scores. Now follows the established pattern — a cached system verdict rendered server-side, then a client re-fetch once auth resolves and `showPersonalizedScores` is true. **The re-fetch can change the verdict and the spot**, so the transition needs to be deliberate rather than a flicker.

- **T2.25 Header** — `padding: 22px 18px 14px`, space-between. Wordmark left (Bricolage 800, 22px, `-.035em`). Sport selector right: pill group, 1px border, three segments `WING / KITE / SURF`, mono 10px, `.08em`, `padding: 6px 12px`. Active segment uses the filled sport pill tokens.
- **T2.26 Verdict card** — accent-tint background, accent border, `border-radius: 20px`, `padding: 15px 16px`.
  - **GO** at Bricolage 800, 52px, `line-height: .82`, `-.045em`, in accent; sport chip right (accent tint pill, `wind` icon + `WING`, mono 10px, `.14em`).
  - Wind row (`margin-top: 11px`, align flex-end): speed at JetBrains Mono 700, 44px, `line-height: .86`; stacked `kn NNW` (13px) over `(33*)` (11px muted); far right a 34px circle with a 1px accent border containing `arrow-up` rotated to the wind bearing.
  - Live cam, `aspect-ratio: 16/9`, `border-radius: 14px`, `margin-top: 15px`, 1px accent border. Two badges top-left 7px apart: a solid accent `LIVE` pill with a 6px dot, and a page-colour pill with `users` icon + count *(flagged)*.
  - Caption at `margin-top: 12px`, mono 11px muted, uppercase.
- **T2.27 Evidence stack** — heading `WHY WE THINK SO` (mono 9px, `.22em`, dim). Three cards, 8px apart, **ordered by how much a rider trusts them**:
  - **In the water** *(flagged)* — accent label, count at mono 700 38px, "wings up", trend line with `trending-up`. Footnote at mono 9px dim: *Estimated with our computer vision model from webcam footage*.
  - **Station** *(flagged until history accumulates)* — label `STATION` with `2 MIN AGO` right-aligned; reading at mono 700 38px; an accent-tint `+2 vs forecast` pill; an 8-bar sparkline 26px tall with 3px gaps ramping accent-low → accent; caption "Last 90 minutes · still building".

    **The `· 1.2 KM` is dropped for now.** Station coordinates are not stored — spots carry a `liveReportUrl` that a Windguru station ID is parsed out of, and nothing gives that station's position. Either add `stationLat`/`stationLon` (or a hand-entered `stationDistanceKm`) to `spots` and the admin form, or omit the distance. Do not estimate it.
  - **Model agreement** — muted label; five 26×7px bars 4px apart, lit for agreeing models and track-coloured otherwise; "4 of 5" beside them; a plain-language line naming the outlier. **Wing and kite only** — see §2.9.
- **T2.27b Degradation.** Most spots have neither a cam nor a live station. The evidence stack must read as complete with only the cards it can fill — model agreement alone for a wing/kite spot with no cam and no station, and the heading stays `WHY WE THINK SO`. An evidence stack with one card is a legitimate screen; a stack with three placeholder skeletons that never resolve is not.
- **T2.28 Actions** — full-width accent `WATCH CAM` button with `video` icon, plus a 48px outlined share button. Reuse `hooks/useShare.js`.
- **T2.29 NO-verdict variant** — the bad-day path. Verdict reads NO in dim, accent is withheld, and the screen pivots to the next window. This is the common case, not an edge case.
- **T2.30 Loading states** — none are designed, and the handoff says each evidence card needs one because station and CV data arrive separately from the forecast. Design them.

## 2.8 Screen 02 — Next

**Purpose: answer "when", as a single answer plus a scannable week.**

- **T2.31 Title** "Next windows" (Bricolage 800, 25px) with a sport filter chip right.
- **T2.32 Hero window card** — accent tint, accent border, 18px radius. `SOONEST GOOD WINDOW` label left, five 13×5px agreement bars right. The answer at Bricolage 800, 30px (*"Today, 12:00 – 15:00"*). Then `GUINCHO · 26 kn NNW` in accent mono 13px. Then one plain line of context.
- **T2.33 Window detection** — `lib/windows.js`, pure and unit-tested. Collapses contiguous qualifying slots into windows with a start, end, peak and spot. This is the core new abstraction; the app's unit stops being the forecast slot.
- **T2.34 Week strip** — the core idea. Header row of hour labels (06/09/12/15/18/21) above six day rows. Each row: 34px day label, then a 26px-tall track (`border-radius: 6px`) with absolutely-positioned bands:
  - accent band = good window
  - marginal band = marginal window
  - dashed accent-30% band = **models split**
  - a 2px page-colour notch marks the peak

  Right-aligned score, `—` for nothing, `?` when split. Legend below: GOOD / MARGINAL / MODELS SPLIT.
- **T2.35 Where, this week** — one row per spot with window count and soonest day. Spots with nothing are dimmed to 55% and say so.
- **T2.36** Tapping a window opens Confidence for that window.

## 2.9 Screen 03 — Confidence

**Purpose: answer "do I believe it".**

- **T2.37 Header** — back arrow + `GUINCHO · MON 12:00–15:00` in mono.
- **T2.38 Verdict row** — 74px `ScoreDial` beside "High confidence" (Bricolage 800, 25px) and a one-line reason. **This is the only place the numeric score appears at any size.**
- **T2.39 Model grid** — the centrepiece. Rows are models, columns are 3-hour slots. Each cell is a 20px-tall rounded block: accent when that model calls the slot good, track when not, marginal-tint for a dissenting model's own window. A final `AGREED` row counts models per column, bolded in accent where the count is high.

  Agreement reads as a vertical stripe. **A rider who has never heard of ICON-EU can still see that everything lines up at 12:00 and one model is alone.** Below, one sentence naming the outlier.

  The mockup's "and it has been running light on nortada all week" claims a per-model track record we will not have at launch. Either omit that clause or build model skill scoring later — do not assert it.

  **Wing and kite only.**
- **T2.39b Surf variant.** With the grid hidden, Screen 03 for surfing loses its centrepiece. There is no mockup, so this is specified here.

  The insight that makes it work: **surf has richer per-slot criteria than wing does.** `spotConfigs` carries `minSwellHeight`, `maxSwellHeight`, `swellDirectionFrom/To`, `minPeriod` and `optimalTide`, and the `tides` table plus `TideChart` already exist. Wing's confidence comes from *who agrees*; surf's comes from *how many conditions line up*. Same question, different evidence.

  Structure, reusing the existing component vocabulary so it reads as the same screen:

  1. **Verdict row** — unchanged. 74px dial, "High confidence", one-line reason.
  2. **`WHAT LINES UP`** — replaces `WHEN EACH MODEL SAYS GO` and occupies the same slot. Four rows, one per criterion — swell height, period, swell direction, tide — each a label plus the actual value plus a 20px-tall bar in accent when inside the spot's configured range, track when outside, marginal when marginal. This deliberately mirrors the model grid's visual language: **a vertical stripe of accent still means "everything agrees", it is just criteria agreeing rather than models.** A final `MATCHED` row counts how many of four are met.
  3. **Wind quality** — the one thing the models *do* disagree about for surf. A single line, not a grid: offshore versus onshore, with the agreement count behind it. This is where the five models still earn their place on a surf screen.
  4. **Forecast vs station**, **cam check** — unchanged from wing.

  **The confidence line must not claim model agreement it cannot show.** For surf it reads from criteria matched and wind quality, never "4 of 5 models".

  Where a spot has no surf config (T2.11b), this section is hidden rather than filled with defaults — a sport-level default swell range is not meaningful the way a sport-level wind minimum is, because swell suitability is almost entirely spot-specific.
- **T2.40 Forecast vs station** *(flagged)* — paired bars per 3-hour slot, forecast in accent and station in accent-low, with a legend and a plain conclusion. **Only slots with an actual reading show the second bar.**
- **T2.41 Cam check row** *(flagged)* — thumbnail, count, chevron into the cam.

## 2.10 Screen 04 — Cams as evidence

**Purpose: ground truth, sorted by relevance rather than name.**

Title "Who's out", TV-mode chip right, with a disclaimer line under it: `RIDER COUNTS ESTIMATED FROM CAM FOOTAGE · UPDATED 11:38` *(flagged)*.

- **T2.42** Cards sorted by activity, not alphabetically. With `riderCounts` off, fall back to the current sort — and note that the screen's whole organising principle is flag-dependent, so both orderings need to look deliberate.
- **T2.43 Active spot** — accent border; solid accent badge top-left with `users` icon and count; wind pill top-right; below the video the spot name, a `6 → 11` trend with `trending-up`, and a 6-bar count history captioned "Riders on the water, last 90 min".
- **T2.44 Quieter spot** — neutral badge, count, conditions, "steady".
- **T2.45 Empty spot** — badge reads `NOBODY OUT` in muted text. **This is a real answer, not an empty state.**
- **T2.46 Offline cam** — `camera-off` icon, `CAM OFFLINE`, and the station reading as a fallback so the card still says something useful.
- **T2.47** Keep the existing `WebcamCard` HLS player. The mockups' `<image-slot>` elements are authoring-only drag-and-drop placeholders; no production image assets are needed. Preserve fullscreen playback, favourites, and desktop TV mode.

## 2.11 Screen 05 — Alerts — deferred

**Deferred to its own plan.** Not built in Phase 2, and the `alerts` flag is dropped.

The screen captures alert rules, but nothing in the repository can deliver an alert — there is no push infrastructure and no scheduled evaluator. Building the settings UI now would mean designing rule storage against an unbuilt delivery mechanism, and shipping a screen that promises to wake a rider up and cannot.

What the follow-up plan inherits, and why it is better positioned than it looks:

- **The confidence gate is already real.** `3+ MODELS AGREE` is the handoff's most interesting alert condition and T2.12 makes it a computable value rather than a decorative toggle. This is the main reason the alerts plan should come *after* Phase 2, not before.
- **The crowd override is not.** "Ping me if 5+ go out" — *Even when the forecast said no* — depends on the CV pipeline. It is the clearest argument for that pipeline existing at all, and it stays blocked on it.
- Delivery is the open decision: web push, or email through the Resend integration that already sends magic links.
- Rule state per sport, when it is built: enabled, wind threshold, model-agreement threshold, spot set, quiet hours, crowd-override flag.

The handoff's framing is worth carrying over verbatim: *the best version of this app is one the rider rarely opens because it told them first.* Deferring the screen does not defer that goal, it just refuses to fake it.

**More** links to alerts only once the follow-up plan lands. No placeholder entry, no "coming soon".

## 2.12 Desktop

Every screen, new and legacy, is properly adapted for desktop.

**No desktop layouts exist in the handoff.** Everything was drawn at 390px; desktop appears only in the earlier newsprint-comparison set, which is the old IA in the new theme. So these are designed here, not transcribed — and that makes desktop the largest undesigned surface in the plan, larger than the surf Confidence variant.

The existing app constrains content to 900px in `MainLayout` and hides `BottomNav` at `md:` in favour of a header `ViewToggle`. That split is the natural starting point: **the four tabs become horizontal navigation in the header on desktop, and the floating pill is mobile-only.**

Expect the 900px constraint to need relaxing for two screens. The week strip (T2.47c) and the model grid (T2.47d) are both wide data displays whose whole value is horizontal resolution; capping them at 900px would spend the desktop work and keep the mobile compression. Decide per screen rather than globally — a wider `MainLayout` everywhere would hurt the reading-width screens.

Per screen, the shape that width actually buys:

- **T2.47b Now** — the verdict card and the evidence stack sit side by side rather than stacked, with the cam larger. The verdict is one short line of text and a number; at 900px wide it looks lost if it simply stretches. Constrain the verdict card and give the freed width to the cam and evidence.
- **T2.47c Next** — **the screen that gains most.** The week strip is compressed at 390px: six rows against six hour columns. With width it becomes a proper grid — more hour columns, finer bands, readable day labels, and the peak notch actually legible. The handoff calls this out as the screen with the most desktop upside.
- **T2.47d Confidence** — the model grid gets more columns, so 3-hour slots can become hourly. This is the one place where desktop shows genuinely more data rather than the same data larger.
- **T2.47e Cams** — a multi-column grid. Desktop TV mode already exists and must keep working.
- **T2.47f More** — a menu designed for thumbs becomes a settings-style layout at width.
- **T2.47g Legacy routes** — `/report`, `/calendar`, `/dashboard`, `/[sport]/[filter]`, `/report/[spot]` all get the same treatment, at the full-fidelity bar set in §1.6b. `NightglassBadDay.dc.html:121–186` is the one genuine desktop reference in the handoff — an 800px-wide spot detail with a six-column data grid and dials in the score column. Use it as the anchor for legacy desktop styling.

- **T2.47h** Breakpoint strategy and the desktop navigation pattern are decided once, in Phase 1, so the legacy retheme and the new screens do not diverge. Phase 1's full-fidelity work already touches every legacy route; doing desktop separately afterwards would mean touching them all twice.

## 2.13 Phase 2 verification

- **T2.52** Unit tests for `lib/agreement.js`, `lib/windows.js`, `lib/stationBias.js`, and verdict derivation. All pure, all load-bearing.
- **T2.53** Model-ingest integration test asserting `gdps`, `cfs` and especially `arome` are rejected. `arome` is the one that would silently produce a fake fifth opinion, inflating every agreement count.
- **T2.53b** A test asserting wave fields are ignored for surf agreement, so nobody later "fixes" the surf grid by wiring in wave data that is identical across models.
- **T2.54** Every screen screenshotted in both themes with each flag on and off — including the bad-day path, and the surf variant of Confidence.
- **T2.55** Verify production builds with all flags off, and that no fixture data reaches the client bundle when `riderCounts` is off.

---

## Scope boundaries

- **No CV pipeline.** Rider counts are fixtures behind a flag; the feature is deferred.
- **Alerts are deferred entirely** — no screen, no rule storage, no flag.
- **No drive time, anywhere.** Not in the final designs on any screen. No home location is requested and none is needed.
- **Two surfaces are designed in this plan rather than transcribed** — the surf variant of Confidence (T2.39b) and desktop across every screen (§2.12). Neither exists in the handoff.
- **No logo.** The wordmark is Bricolage Grotesque 800 as a stand-in. If a real mark exists it replaces the wordmark in every header.
- No changes to the scoring LLM pipeline, scrape cadence, or auth model.
- Transitions use the existing `duration-fast` / `ease-smooth` values. No new animation is specified.

## Risks

1. **Repository baseline, compounded by the shared deployment.** The audit's restart plan flags an open Convex write boundary, 8 production vulnerabilities (1 critical, 6 high), and no functioning quality gate. Production and development now also share one Convex deployment. Together these mean an unauthenticated write path plus no environment isolation: any development mistake is a production incident. This plan adds three tables and two cron jobs on top of that. New write paths must be `internalMutation`, and T1.17 puts a test runner in place, but **the sequencing question belongs to `docs/repository-audit/06-restart-plan.md` and is more urgent than this plan's own ordering.**
2. **Undocumented endpoint.** Both the widget endpoint and its `model` parameter are undocumented. The `arome` behaviour — correct echo, duplicate payload — shows the response cannot be trusted at face value. T2.11's isolation requirement is what keeps a change there from taking down the core forecast.
3. **Storage growth.** Five models multiply forecast volume. T2.9's retention rule is not optional.
4. **Theme flash and hydration.** The blocking inline script is the standard fix, but it interacts with `cacheComponents: true` and the recently-removed `export const dynamic` (commit f5d8ded). Verify against a production build, not just dev.
5. **Trust in the rider count.** The handoff's own first open question. The evidence hierarchy puts the count above the station and the models, so being wrong there costs more than a bad forecast. Consider shipping a range rather than an integer until the model is measured.
6. **Flag combinations.** Three flags, and Screen 04's sort order is itself flag-dependent. Every combination that can reach production needs to look deliberate, not degraded.
7. **Phase 1 is now the larger phase.** Full fidelity on the legacy routes (§1.6b) plus desktop across all of them is more work than the new IA's five screens. If schedule pressure appears, that is where it will show — and dropping back to a token repoint on `/admin` is the cheapest relief valve.
8. **Surfing had been drifting toward second-class** — no model spread, and the sport most likely to be checked on a day the wind app says NO. T2.39b addresses it by giving surf its own confidence evidence rather than a hollowed-out wing screen. Worth checking at review that it reads as an equal, not a fallback.
9. **Desktop is scope, not polish.** Every screen, new and legacy, with no reference designs. It is easy to under-budget because the mobile designs are so complete. T2.47h — deciding the breakpoint and navigation pattern once, in Phase 1 — is what stops it becoming a second pass over every file.

## Open questions

**All resolved.** For the record, and because the reasoning matters more than the answers:

| Question | Resolution |
| --- | --- |
| Now's spot selection | Best-scoring among favourites; all spots for anonymous. |
| Surf model grid | Hidden. Replaced by a criteria-agreement panel (T2.39b). |
| Alerts scope | Deferred to its own plan. |
| Legacy route fidelity | Full, same bar as new screens. |
| Theme escape hatch | Auto / Night / Day in Settings. |
| Station distance label | Dropped until station coordinates exist. |
| Evidence degradation | One card is a legitimate stack. |
| Model-slot retention | 3 scrapes; a miss reads as "no model data", never "split". |
| Timezone | The spot's, from `spotInfo.spotTimezone`. |
| Cam count accuracy | Feature deferred; a range beats an integer when it ships. |
| Verdict scope | Per sport. |
| Drive time | Cut entirely. |
| Desktop | In scope for every screen; designed here (§2.12). |
| `spotConfigs` coverage | Incomplete; sport-level threshold fallback (T2.11b–d). |

Two of these were answered by designing rather than deciding — the surf Confidence variant and desktop — so they carry more implementation risk than the rest of the plan and should be reviewed before they are built.
