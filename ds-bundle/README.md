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

# Waterman (waterman@1.0.0)

This design system is the published waterman React library, bundled as a single
browser global. All 72 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.Waterman`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.Waterman.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Arrow } = window.Waterman;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Arrow />);
```

Wrap the tree in the provider — most components read theme/i18n from context:

```jsx
<ConvexProvider><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></ConvexProvider>
```

## Tokens

62 CSS custom properties from waterman. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (8): `--tw-border-spacing-x`, `--tw-border-spacing-y`, `--tw-ring-offset-color`, …
- **spacing** (3): `--tw-ring-inset`, `--tw-space-x-reverse`, `--tw-space-y-reverse`
- **shadow** (4): `--tw-ring-offset-shadow`, `--tw-ring-shadow`, `--tw-shadow`, …
- **other** (47): `--tw-translate-x`, `--tw-translate-y`, `--tw-rotate`, …

## Components

### ui
- `Arrow`
- `Badge`
- `Button`
- `Card`
- `ConditionLine`
- `DataGroup`
- `Divider`
- `FilterBar`
- `FilterGroup`
- `Heading`
- `Icon`
- `Input`
- `Metric`
- `Modal`
- `PillToggle`
- `ScoreCard`
- `ScoreDisplay`
- `ScorePill`
- `Section`
- `Select`
- `ShareButton`
- `SportBadge`
- `Text`
- `Tooltip`

### auth
- `AuthProvider`
- `EmailLoginForm`
- `MagicLinkSent`
- `OnboardingFlow`
- `UserMenu`
- `VerifyingMagicLink`

### layout
- `BottomNav`
- `Footer`
- `GlobalNavigation`
- `Header`
- `MainLayout`
- `MobileMenu`
- `ShowFilter`
- `SportSelector`
- `ViewToggle`

### calendar
- `CalendarView`

### general
- `ConvexProvider`

### forecast
- `DaySection`
- `DirectionIndicator`
- `ForecastSlot`
- `LiveWindRow`
- `WaveGroup`
- `WindGroup`

### journal
- `DurationDisplay`
- `DurationInput`
- `ForecastComparison`
- `LocationPicker`
- `RatingDisplay`
- `RatingInput`
- `SessionCard`

### common
- `EmptyState`
- `Loader`
- `ScoreModal`
- `WebcamModal`

### wind
- `LiveWindIndicator`

### onboarding
- `OnboardingFooter`
- `OnboardingModal`

### admin
- `SpotConfigForm`
- `Toast`
- `ToastProvider`

### tide
- `TideChart`
- `TideDisplay`
- `TideIndicator`
- `TideSection`
- `TideTable`

### webcam
- `TvMode`
- `WebcamCard`
- `WebcamFullscreen`
