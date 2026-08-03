# Waterman — how to build with this design system

Waterman is a watersports conditions app (wingfoiling, kitesurfing, surfing) for
the Dutch coast. Its look is **editorial newsprint**: a warm off-white page, near
black ink, a Playfair Display masthead, and monospaced figures for every
measurement. Build with that register — this is a broadsheet weather report, not
a SaaS dashboard.

## Setup

Components are on `window.Waterman` and styled entirely by the bound
`styles.css` (Tailwind utilities baked from the app's own theme). **No provider
is needed for styling** — drop a component in and it looks right.

Wrap only when a component reads context:

```jsx
<ConvexProvider>          {/* data layer      */}
  <AuthProvider>          {/* useAuth/useUser */}
    <ToastProvider>       {/* useToast        */}
      <App />
```

`useAuth`, `useUser` and `useToast` are exported alongside the components.
Put page content inside `MainLayout`, which supplies the page frame.

## The styling idiom

Tailwind, with a **custom theme**. Use these names for your own layout glue —
they are the design language, not generic Tailwind defaults:

| Family | Real class names |
|---|---|
| Surface / text | `bg-newsprint` (page), `text-ink`, `text-faded-ink`, `bg-warm-highlight`, `bg-ink-hover`, `text-red-accent` (destructive), `bg-muted-yellow` |
| Opacity ramp | `border-ink/10`, `border-ink/15`, `text-ink/50` — hairline borders and secondary text are expressed as ink at low alpha |
| Type | `font-headline` (Playfair Display — headings/mastheads), `font-body` (Inter — prose/UI), `font-data` (Courier Prime) |
| Radius | `rounded-ui` (controls), `rounded-card` (containers) |
| Elevation | `shadow-card`, `shadow-card-hover`, `shadow-elevated` |
| Motion | `duration-fast` / `duration-base` / `duration-slow`, `ease-smooth` |
| Focus | `focus-ring` |

**`font-data` is a hard convention**: every number a user reads — knots, metres,
degrees, temperatures, times, scores, durations — is set in Courier Prime.
Prose and labels are `font-body`; headings are `font-headline`. Getting this
wrong is the fastest way to make output look un-Waterman.

Prefer composing existing components over restyling them. Reach for raw
utilities for layout (flex, gap, max-w), not to re-skin a control.

## Where the truth is

- **`styles.css` and the files it `@import`s** — the complete token vocabulary.
  Read it before inventing a class; the brand fonts ship locally alongside it.
- **`<Name>.prompt.md`** next to each component — usage and examples.
- **`<Name>.d.ts`** — the prop contract. Trust it over guessing; the variant
  unions (`"primary" | "secondary" | "ghost" | "danger" | "icon"`) are real.

## An idiomatic composition

```jsx
<Section title="Coming up" action={<Button variant="ghost" size="sm">See all</Button>}>
  <Card variant="interactive" onClick={openSpot}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <Heading level={3}>Scheveningen Noord</Heading>
        <Text variant="muted">Cross-onshore, building through the afternoon</Text>
        <Text variant="caption">Updated 06:12</Text>
      </div>
      <ScorePill score={87} sport="wingfoil" size="lg" />
    </div>
  </Card>
</Section>
```

Library components carry the styling; the `flex`/`gap` glue is yours. Note the
Playfair heading, muted supporting line, and the score rendered by `ScorePill`
rather than hand-built.

## Worth knowing

- Scores are 0–100. `ScorePill` and `ScoreDisplay` **render nothing below 60**
  unless you pass `showAll` — that is deliberate (only good conditions surface).
- Sport values are exactly `"wingfoil" | "kitesurfing" | "surfing"`.
- `LiveWindRow`, `LiveWindIndicator` and `UserMenu` render nothing outside the
  real app (they need a live-wind endpoint or a signed-in session). For static
  wind values use `WindGroup`, `ConditionLine` or `DataGroup` instead.
- `Toast` and `SpotConfigForm` are admin surfaces and do **not** follow the
  newsprint palette — don't imitate them for user-facing UI.
