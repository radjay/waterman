ForecastComparison from waterman. Use via `window.Waterman.ForecastComparison` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface ForecastComparisonProps {
forecastSlots: unknown; sport: string;
}
```

## Examples

### Default

```jsx
() => (
  <div className="max-w-2xl">
    <ForecastComparison forecastSlots={[epicSlot]} sport="wingfoil" />
  </div>
)
```

### MultipleSlots

```jsx
() => (
  <div className="max-w-2xl">
    <ForecastComparison
      forecastSlots={[epicSlot, idealSlot, fadingSlot]}
      sport="wingfoil"
    />
  </div>
)
```

### WindOnly

```jsx
() => (
  <div className="max-w-2xl">
    <ForecastComparison
      forecastSlots={[
        {
          _id: 'fs_brouwersdam_1200',
          timestamp: new Date('2026-07-30T12:00:00').getTime(),
          speed: 24,
          gust: 29,
          direction: 70,
          score: {
            value: 78,
            reasoning: 'Flat-water WSW on the Brouwersdam inside — consistent all session.',
          },
        },
      ]}
      sport="kitesurfing"
    />
  </div>
)
```

### NoForecastData

```jsx
() => (
  <div className="max-w-2xl">
    <ForecastComparison forecastSlots={[]} sport="surfing" />
  </div>
)
```
