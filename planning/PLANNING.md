# Waterman Planning

**Last Updated**: 2026-05-29

## Upcoming PRDs

### In Progress

| PRD | Title | Status | Priority |
|-----|-------|--------|----------|
| [09](prds/09-session-journal.md) | Session Journal - Watersports Logbook | Draft | Medium |

### Planned

| PRD | Title | Status | Priority |
|-----|-------|--------|----------|
| - | Email Notifications for Ideal Conditions | Not started | Medium |
| - | Performance Monitoring & Analytics | Not started | Medium |

### Completed

| PRD | Title | Completed |
|-----|-------|-----------|
| [08](prds/08-scoring-debug-provenance.md) | Scoring Debug Page & LLM Provenance Tracking | 2026-01-31 |
| [07](prds/07-personalized-scoring.md) | Personalized Scoring & User Context | 2026-01-30 |
| [06](prds/06-sunrise-sunset-filtering.md) | Sunrise/Sunset Filtering | 2026-01-28 |
| [05](prds/05-calendar-subscriptions.md) | Calendar Subscription Feature | 2026-01-27 |
| [03](prds/03-email-authentication.md) | Email-Based Magic Link Authentication | 2026-01-24 |
| [02](prds/02.md) | LLM-Based Condition Scoring System | 2026-01-20 |
| [01](prds/01.md) | Core Features & MVP | 2026-01-15 |

---

## TODOs

### Bugs

- [x] **Lagoa tide + bottom nav (2026-08-15)** — re-scraped Lagoa/Bico/CDS/Fonte tides (morning marks); Cascais still intact; bottom nav pill measures one of four equal slots.
- [x] **NOW redesign UX regressions (2026-08-15)** — webcam fullscreen on image click; live wind in chart header; column hover tooltip; y-axis label inset; tide scrape kept morning marks; score → `/report/[slug]?sport=`.
- [x] **NOW chart follow-up UX (2026-08-15)** — tooltip below wind band; station-sample hover (e.g. 15:42) not snapped to 3h slot; LIVE badge with TO direction on cam (top-left); whole SCORE column clickable.
- [x] **NOW chart hover marks + touch (2026-08-15)** — selected station/column points marked on the wind plot; mouse hover + touch tap (not pan) to inspect; tap again/outside dismisses.
- [x] **LIVE cam overlays + All spots (2026-08-15)** — LiveStationBadge on every cam with a reading (fullscreen, TV); Windguru/Windy on LIVE cams; SpotPicker “All spots” (full coast) + scrollable desktop grid.

### Near Term (This Week)

- [ ] **Convex query optimization** — Phase 1 implemented locally (shared slot/score helpers, calendar/journal fixes, `npm run verify:convex`). Deployed to dev Convex; commit pending. See [plan](../docs/superpowers/plans/2026-05-29-convex-query-optimization.md).
- [ ] **Deep Links for PWA Authentication**: Investigate iOS Universal Links
  - Requires dedicated domain (e.g., `waterman.app`)
  - Would allow magic links to open directly in PWA instead of Safari
  - Requirements:
    - Apple App Site Association file (`.well-known/apple-app-site-association`)
    - Android Digital Asset Links file (`.well-known/assetlinks.json`)
    - Configure domain with proper certificates
  - Blocked: Need dedicated domain (currently using waterman.radx.dev subdomain)
  - Related: Auth PRD, session token transfer is current workaround

### Later (Backlog)

- [x] **Cascais Bay wind prediction v2 (Phases 1–5)** — live `bay-wind-v2` worker, backtest UI, prediction scoring; v2 day-ahead MAE still trails v1 on Summer 2025 (211 vs 257 min after bias tune) — see [learnings](../docs/forecast-experiment-model-analysis-learnings.md#bay-wind-prediction-v1-vs-v2-summer-2025-backtest)
- [x] **Cascais Bay wind prediction v3 ML (Phase 6)** — v3.5 calibration shipped: MAE ~90 min, false+ 2 @ 12 kt Summer 2025 — see [improvement plan](../docs/superpowers/plans/2026-05-25-bay-wind-prediction-improvements.md)
- [x] **Bay wind v4 rule ensemble** — wired; Summer 2025 @ 12 kt: MAE 133 min, false+ 28 (did not beat v3.5) — see [improvement plan](../docs/superpowers/plans/2026-05-25-bay-wind-prediction-improvements.md)
- [ ] **Bay wind Phase 2** — marina 2026 unusable; LOOCV 2024↔2025, ship v3.5, season hygiene, optional v4.1 — see [phase 2 plan](../docs/superpowers/plans/2026-05-25-bay-wind-prediction-phase-2.md) and [branch work doc](../docs/forecast-experiment-predictions-work-on-branch.md)
- [x] **Bay wind forecast/nowcast split (experiment dashboard)** — day-ahead `bay-wind-forecast-v1`: analog kick-in windows + ML v3 session gate; nowcast: ML timeline + Cabo lag floor; UI shows p25–p75 windows for upcoming days — `lib/forecast-experiment/bayWindForecast.js`, `analogKickIn.js`, `weekOutlook.js`, `todayOutlook.js`
- [ ] **Bay wind analog holdout tuning** — 2024→2025 backtest: analog MAE 219 min vs v3.6 247 min but ±1h 25/100 vs 42/99; tighten false positives (flat regime block, 0.6 session gate) — `npm run fx:backtest:analog-kickin`

---

## Architecture Notes

See [architecture.md](architecture.md) for full system documentation.

### Key Files

- **Schema**: `convex/schema.ts`
- **Scoring**: `convex/spots.ts` (scoreSingleSlot, saveForecastSlots)
- **Prompts**: `convex/prompts.ts` (buildPrompt)
- **Admin**: `app/admin/` (admin pages)

---

## References

- [Architecture](architecture.md) - Full system documentation
- [Forecast experiment — model analysis learnings](../docs/forecast-experiment-model-analysis-learnings.md) - Cascais model skill backtest notes
- [Future Features PRD](prds/04-future-features.md) - Aspirational features list
