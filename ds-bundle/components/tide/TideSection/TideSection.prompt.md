TideSection from waterman. Use via `window.Waterman.TideSection` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface TideSectionProps {
slots: unknown[]; className?: string;
}
```

## Examples

### FullDay

```jsx
() => (
  <div className="max-w-[320px]">
    <TideSection
      slots={[
        slot('Early', 'high', at(3, 6, 40), 1.4),
        slot('Midday', 'low', at(3, 12, 55), 0.2),
        slot('Evening', 'high', at(3, 19, 10), 1.5),
        slot('Night', 'low', at(4, 1, 20), 0.3),
      ]}
    />
  </div>
)
```

### PartialDay

```jsx
() => (
  <div className="max-w-[320px]">
    <TideSection
      slots={[
        slot('Morning', null, null, null),
        slot('Afternoon', 'low', at(3, 12, 55), 0.2),
        slot('Evening', 'high', at(3, 19, 10), 1.5),
      ]}
    />
  </div>
)
```

### InSpotCard

```jsx
() => (
  <div className="max-w-[340px] rounded-card border border-ink/15 bg-newsprint p-4 shadow-card">
    <div className="font-headline text-lg font-bold text-ink">Scheveningen Noord</div>
    <div className="font-data text-sm text-faded-ink mb-3">19 kt NW · 0.8 m · 17°C</div>
    <TideSection
      slots={[
        slot('Early', 'high', at(3, 6, 40), 1.4),
        slot('Midday', 'low', at(3, 12, 55), 0.2),
        slot('Evening', 'high', at(3, 19, 10), 1.5),
      ]}
    />
  </div>
)
```
