TideChart from waterman. Use via `window.Waterman.TideChart` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface TideChartProps {
tides: unknown; className?: string;
}
```

## Examples

### Today

```jsx
() => (
  <div className="max-w-[420px]">
    <div className="font-headline text-sm font-bold text-ink mb-1 uppercase">
      Scheveningen Noord — Monday
    </div>
    <TideChart
      tides={[
        extreme(3, 0, 30, 0.3),
        extreme(3, 6, 40, 1.4),
        extreme(3, 12, 55, 0.2),
        extreme(3, 19, 10, 1.5),
      ]}
    />
  </div>
)
```

### SingleCycle

```jsx
() => (
  <div className="max-w-[420px]">
    <TideChart
      tides={[
        extreme(3, 6, 40, 1.4),
        extreme(3, 12, 55, 0.2),
        extreme(3, 19, 10, 1.5),
      ]}
    />
  </div>
)
```

### TwoDayOutlook

```jsx
() => (
  <div className="max-w-[420px]">
    <div className="font-headline text-sm font-bold text-ink mb-1 uppercase">
      Brouwersdam — 48 hours
    </div>
    <TideChart
      tides={[
        extreme(3, 6, 40, 1.4),
        extreme(3, 12, 55, 0.2),
        extreme(3, 19, 10, 1.5),
        extreme(4, 1, 20, 0.3),
        extreme(4, 7, 25, 1.6),
        extreme(4, 13, 40, 0.1),
      ]}
    />
  </div>
)
```
