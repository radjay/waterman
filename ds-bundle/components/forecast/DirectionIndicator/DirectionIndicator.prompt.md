DirectionIndicator from waterman. Use via `window.Waterman.DirectionIndicator` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface DirectionIndicatorProps {
direction: unknown; className?: string;
}
```

## Examples

### Compass

```jsx
() => (
  <div className="flex flex-wrap items-start" style={{ rowGap: 20, columnGap: 8, maxWidth: 372 }}>
    <Bearing deg={0} label="0°" />
    <Bearing deg={45} label="45°" />
    <Bearing deg={90} label="90°" />
    <Bearing deg={135} label="135°" />
    <Bearing deg={180} label="180°" />
    <Bearing deg={225} label="225°" />
    <Bearing deg={270} label="270°" />
    <Bearing deg={315} label="315°" />
  </div>
)
```

### OffAxisBearings

```jsx
() => (
  <div className="flex flex-wrap items-start" style={{ rowGap: 20, columnGap: 8, maxWidth: 372 }}>
    <Bearing deg={22} label="22°" />
    <Bearing deg={67} label="67°" />
    <Bearing deg={113} label="113°" />
    <Bearing deg={158} label="158°" />
    <Bearing deg={203} label="203°" />
    <Bearing deg={248} label="248°" />
    <Bearing deg={293} label="293°" />
    <Bearing deg={338} label="338°" />
  </div>
)
```

### InForecastRow

```jsx
() => (
  <div
    className="flex flex-col border-t border-ink/20 font-data text-[0.95rem] text-ink"
    style={{ maxWidth: 420 }}
  >
    {[
      { hour: '08:00', speed: 14, dir: 42 },
      { hour: '11:00', speed: 19, dir: 135 },
      { hour: '14:00', speed: 24, dir: 247 },
      { hour: '17:00', speed: 21, dir: 315 },
    ].map((row) => (
      <div
        key={row.hour}
        className="flex items-center justify-between gap-4 py-3 px-2 border-b border-ink/20"
      >
        <span className="font-bold">{row.hour}</span>
        <span>{row.speed} kn</span>
        <DirectionIndicator direction={row.dir} />
      </div>
    ))}
  </div>
)
```
