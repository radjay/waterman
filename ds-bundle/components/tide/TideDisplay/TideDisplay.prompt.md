TideDisplay from waterman. Use via `window.Waterman.TideDisplay` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Display tide information with icon and formatted time.

Shows exact tide time if a high/low tide occurs within the slot period,
otherwise shows rising/falling trend indicator (no time, no height).

@param {Object} tide - Tide object with {type, time, height, isExactTime, isRising, isFalling}
@param {string} className - Additional CSS classes

## Props

```ts
interface TideDisplayProps {
 /** Tide object with {type, time, height, isExactTime, isRising, isFalling} */ tide: Record<string, unknown>;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### ExactTides

```jsx
() => (
  <div className="flex flex-wrap items-center gap-6">
    <TideDisplay tide={exact('high', 6, 40, 1.4)} />
    <TideDisplay tide={exact('low', 12, 55, 0.2)} />
    <TideDisplay tide={exact('high', 19, 10, 1.5)} />
  </div>
)
```

### Trends

```jsx
() => (
  <div className="flex flex-wrap items-center gap-6">
    <TideDisplay tide={{ isExactTime: false, isRising: true, isFalling: false }} />
    <TideDisplay tide={{ isExactTime: false, isRising: false, isFalling: true }} />
    <TideDisplay tide={{ isExactTime: false, isRising: false, isFalling: false }} />
  </div>
)
```

### InSlotRows

```jsx
() => (
  <div className="max-w-[380px] divide-y divide-ink/15 border border-ink/15 rounded-card bg-newsprint">
    {[
      { slot: 'Morning', wind: '19 kt NW', tide: exact('high', 6, 40, 1.4) },
      {
        slot: 'Midday',
        wind: '22 kt WNW',
        tide: { isExactTime: false, isRising: false, isFalling: true },
      },
      { slot: 'Afternoon', wind: '24 kt WSW', tide: exact('low', 12, 55, 0.2) },
      {
        slot: 'Evening',
        wind: '17 kt W',
        tide: { isExactTime: false, isRising: true, isFalling: false },
      },
    ].map((row) => (
      <div key={row.slot} className="flex items-center justify-between gap-4 px-3 py-2">
        <span className="font-body text-sm text-ink">{row.slot}</span>
        <span className="font-data text-sm text-faded-ink">{row.wind}</span>
        <TideDisplay tide={row.tide} />
      </div>
    ))}
  </div>
)
```
