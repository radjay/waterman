# Waterman — how to build with this design system

Waterman answers one question for a wingfoiler, kitesurfer or surfer on the
Cascais coast: **can I go now, and if not, when?** Every screen is a form of that
answer. Build accordingly — a verdict first, the evidence under it, and the
numbers available but never leading.

The look is **instrument, not dashboard**: a near-black or near-white page, a
single cyan accent spent only on the thing worth acting on, and monospaced
figures for every measurement. Two themes ship — **Nightglass** (dark) and
**Dayglass** (light) — and the app resolves between them from the local sunrise
and sunset. Design for both; never hard-code a colour.

## Current vs Legacy

The library is split, and the split is load-bearing:

- **Current** (`Current · Primitives`, `· Controls`, `· Composites`, `· Layout`,
  `· Context`) — what the live screens are built from. **Compose from these.**
- **Legacy** — only reachable from the older screens (`/report`, spot pages,
  dashboard, calendar, journal, profile). They still work and still follow the
  theme, but they are not the vocabulary for new work. Each has a Current
  equivalent: `ScoreCard`/`ScoreDisplay` → `ScoreDial` (plus `WindowCard` for a
  ranked list), `PillToggle` → `SportFilterChip` or `SportFilter`, `Card` → a
  plain `rounded-card-lg bg-surface border-card` div, `Section` → a heading in
  the screen itself.

## Setup

Components are on `window.Waterman` and styled entirely by the bound
`styles.css`. **No provider is needed for styling** — drop a component in and it
looks right.

Wrap only when a component reads context:

```jsx
<ConvexProvider>            {/* data layer            */}
  <AuthProvider>            {/* useAuth / useUser     */}
    <ThemeProvider>         {/* Nightglass / Dayglass */}
      <SportProvider>       {/* the selected sport    */}
        <FlagProvider>      {/* gates unshipped work  */}
          <App />
```

`SportFilterChip` in particular takes **no props at all** — it reads and writes
`SportProvider`, which is what stops two surfaces disagreeing about the sport.

Put page content inside `MainLayout`. There is one width for every page —
`max-w-[1200px]` with `px-[18px] md:px-8`, exactly matching `TopNav` — and no
`wide` prop. A body narrower than the bar above it reads as a misalignment.

## The styling idiom

Tailwind against a **custom theme**. Use these names for your own layout glue;
they are the design language, not generic Tailwind defaults:

| Family | Real class names |
|---|---|
| Surface | `bg-page`, `bg-surface`, `bg-ink-hover`, `bg-offline-bg` |
| Text | `text-ink`, `text-faded-ink`, `text-dim` |
| Accent | `text-accent` / `bg-accent`, `bg-accent-tint-card`, `border-accent-border`, `bg-accent-mid`, `bg-accent-low`, `bg-track` |
| State | `text-marginal` (models split), `text-caution` (MAYBE), `bg-now` (the chart's now marker) |
| Borders | `border-card`, `border-rule`, `border-nav-border`, plus `border-ink/10` ramps |
| Type | `font-headline` (Bricolage Grotesque), `font-body` (Space Grotesk), `font-data` (JetBrains Mono) |
| Tracking | `tracking-display-tighter` / `-tight` / `display` for headlines; `tracking-label` / `label-wide` for mono labels |
| Radius | `rounded-ui` 8, `rounded-card-sm` 14, `rounded-card` 16, `rounded-card-lg` 18, `rounded-card-xl` 20, `rounded-pill` |
| Motion | `duration-fast` 120ms / `duration-base` 200ms / `duration-slow` 300ms, `ease-smooth` |
| Focus | `focus-ring` |

**`font-data` is a hard convention**: every number a user reads — knots, metres,
degrees, seconds, temperatures, times, scores, durations — is JetBrains Mono,
usually with `tabular-nums`. Prose and labels are `font-body`; headlines are
`font-headline`. Getting this wrong is the fastest way to make output look
un-Waterman.

**Accent is rationed.** On a flat day — the common case, not an edge case — the
verdict card withholds the accent entirely, so the only cyan on screen belongs
to the next window worth driving to. If everything is accented, nothing is.

Prefer composing existing components over restyling them. Reach for raw
utilities for layout (flex, grid, gap, max-w), not to re-skin a control.

## Where the truth is

- **`styles.css` and the files it `@import`s** — the complete token vocabulary.
  Read it before inventing a class; the brand fonts ship locally alongside it.
- **`<Name>.prompt.md`** next to each component — usage and examples.
- **`<Name>.d.ts`** — the prop contract. Trust it over guessing; the variant
  unions are real.

## An idiomatic composition

```jsx
<>
  <VerdictCard
    verdict="GO"
    sport="wingfoil"
    spotName="Praia do Guincho"
    score={92}
    metric={{ value: 18, unit: 'kn', secondary: '(24*)', directionLabel: 'NNW', directionDegrees: 340 }}
    reason="HOLDING UNTIL ABOUT 18:00"
  />

  <section className="pt-5">
    <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-[11px]">NEXT WINDOWS</h2>
    <div className="grid gap-2 md:grid-cols-3">
      {windows.map(({ spot, window }, i) => (
        <WindowCard key={spot._id} spot={spot} window={window} sport="wingfoil" highlight={i === 0} />
      ))}
    </div>
  </section>
</>
```

Library components carry the styling; the `grid`/`gap` glue is yours. Note the
9px mono section label, the score living inside `WindowCard` rather than being
hand-built, and the first card highlighted because it is the recommendation —
not merely the earliest.

## Worth knowing

- Scores are 0–100. `ScoreDial` **renders nothing below 60** unless you pass
  `showAll` — deliberate, so only conditions worth acting on surface. Accent at
  60+, the marginal hue 45–59, dim below.
- On a tinted card, pass `on="card"` to `ScoreDial`, or its inner disc punches a
  page-coloured hole and reads as a sticker.
- Sport values are exactly `"wingfoil" | "kitesurfing" | "surfing"`, and the
  headline metric is sport-specific: wind sports lead with wind, surf leads with
  swell height and keeps wind as context.
- **Direction is stored as the bearing the energy travels TO and displayed as
  where it comes FROM (+180).** `Arrow` and the verdict card's ring rotate by the
  RAW bearing; the conversion lives in the label. Mixing these up silently
  reverses every wind direction in the UI.
- `Badge` is the only pill. Its `overlay` and `accent-solid` variants exist for
  sitting on video, where theme text tokens are wrong by definition.
- `LiveWindIndicator`, `LiveWindRow`, `RecordButton` and `UserMenu` render
  nothing outside the real app (they need a live-wind endpoint or a signed-in
  session). `LiveWindIndicator` takes a `fallback` for slots that must not
  collapse. For static wind values use `WindGroup`, `ConditionLine` or
  `DataGroup`.
- `LabsSection` is where exploratory readouts go — collapsed, clearly labelled,
  never presented as the reason for the verdict above it.
- `Toast` and `SpotConfigForm` are admin surfaces and do **not** follow the
  product palette — don't imitate them for user-facing UI.
