Arrow from waterman. Use via `window.Waterman.Arrow` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface ArrowProps {
direction: unknown; className?: string;
}
```

## Examples

### Bearings

```jsx
() => (
  <div className="flex flex-wrap items-start gap-6">
    {BEARINGS.map((b) => (
      <div key={b.label} className="flex w-10 flex-col items-center gap-1">
        <Arrow direction={b.deg} className="text-2xl leading-none text-ink" />
        <span className="font-data text-[11px] text-faded-ink">{b.label}</span>
        <span className="font-data text-[10px] text-ink/40">{b.deg}°</span>
      </div>
    ))}
  </div>
)
```

### InWindReadings

```jsx
() => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <Arrow direction={315} className="text-lg leading-none text-ink" />
      <span className="w-24 font-data text-sm text-ink">19 kn (26*)</span>
      <span className="font-body text-sm text-faded-ink">Scheveningen Noord</span>
    </div>
    <div className="flex items-center gap-3">
      <Arrow direction={247} className="text-lg leading-none text-ink" />
      <span className="w-24 font-data text-sm text-ink">24 kn (31*)</span>
      <span className="font-body text-sm text-faded-ink">Brouwersdam</span>
    </div>
    <div className="flex items-center gap-3">
      <Arrow direction={200} className="text-lg leading-none text-ink" />
      <span className="w-24 font-data text-sm text-ink">11 kn (15*)</span>
      <span className="font-body text-sm text-faded-ink">Wijk aan Zee</span>
    </div>
  </div>
)
```

### Sizes

```jsx
() => (
  <div className="flex flex-wrap items-center gap-8">
    <Metric icon={<Arrow direction={315} className="mr-1.5 text-xs text-ink/60" />}>19 kt</Metric>
    <Metric icon={<Arrow direction={315} className="mr-1.5 text-base text-ink/70" />}>19 kt</Metric>
    <Metric icon={<Arrow direction={315} className="mr-2 text-2xl leading-none text-ink" />}>19 kt</Metric>
  </div>
)
```

### Tones

```jsx
() => (
  <div className="flex flex-wrap items-center gap-8">
    <Arrow direction={20} className="text-xl leading-none text-ink" />
    <Arrow direction={110} className="text-xl leading-none text-faded-ink" />
    <Arrow direction={200} className="text-xl leading-none text-ink/40" />
    <Arrow direction={290} className="text-xl leading-none text-red-accent" />
  </div>
)
```
