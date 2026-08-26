# Waterman — working rules

## Design system first (non-negotiable)

**We strive to use and re-use as many components as possible from our ui-kit.**

Before writing any UI:

1. **Look in the kit first.** `components/ui/`, `components/chart/`, `components/spot/`,
   `components/layout/`. Browse `/ui-kit` in the running app — it renders every
   component with fixtures.
2. **If something close exists, extend it.** Add a prop or a variant to the
   existing component rather than writing a second one that looks the same.
   Two components that render the same thing will drift; that is how the app
   ended up with three different score chips.
3. **If nothing fits, add it to the kit** — not to the screen. A new visual
   primitive lives in `components/ui/` (or `components/chart/`), gets a doc
   comment saying what it is for, and gets added to `app/ui-kit/page.js` and its
   fixtures in the same change.
4. **Screens compose, they do not style.** A page file should read as a list of
   kit components with data passed in. Bare Tailwind in a screen is a smell:
   if you are writing `rounded-[18px] border border-card bg-surface` in a page,
   the card belongs in the kit.
5. **Never hard-code a colour.** Every value is a theme token
   (`bg-page`, `text-ink`, `text-accent`, `border-card`, `bg-track`, …) resolved
   from `app/theme.css` through `tailwind.config.js`. Both Nightglass and
   Dayglass have to stay correct, and a literal hex only works in one.
6. **Numbers are `font-data`.** Every number a user reads — knots, metres,
   scores, times, degrees — is JetBrains Mono. All-caps micro labels too.

## Convex

The app uses one Convex deployment: `dev:adorable-anteater-323`
(`https://adorable-anteater-323.convex.cloud`). That is the live database.

Do not use Convex prod (`keen-reindeer-909`). `npx convex deploy` targets
prod. Push functions with `npx convex dev --once` instead.

## Layout / data conventions

- Sport is a single value from `SportProvider` (`"wingfoil" | "kitesurfing" |
  "surfing"`), shared across every surface.
- The selected spot is shared across tabs via `useSelectedSpot()`
  (`lib/hooks/useSelectedSpot.js`) so LIVE on Spot forecast lands on the right
  spot in Now.
- All four screens read one hook, `useCoastData(sport)`
  (`components/data/useCoastData.js`). Do not add a second fetch path — the
  screens' numbers must agree.
- The day chart is a shared geometry: `lib/dayChart.js` owns the 6-slot,
  07→22 scale, the now-line position, and the score/wind bands. Charts render
  that geometry; they do not compute their own.

## Wind direction

Wind direction is stored as the "FROM" direction and DISPLAYED as the "TO"
direction (180° opposite). Use `primaryMetric()` from `lib/conditions.js` or
`getDisplayWindDirection()` from `lib/utils.js`. Never render
`getCardinalDirection(raw)`.

## Verification

Test in the browser before claiming a change works. Check both themes
(`?theme=night` / `?theme=day`), both breakpoints (390px and 1440px), all three
sports, and the edge cases that really exist in the data:

- **Praia do CDS / Fonte da Telha** — no live station and no webcam.
- **Lagoa da Albufeira** — has a station URL but the station is dead (zero
  readings).
- **Surfing** — no station traces at all, swell leads instead of wind.
- Days with no window at all, and spots with no wave data.
