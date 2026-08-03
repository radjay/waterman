EmptyState from waterman. Use via `window.Waterman.EmptyState` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface EmptyStateProps {
className?: string;
}
```

## Examples

### Default

```jsx
() => (
  <div className="w-full max-w-xl">
    <EmptyState />
  </div>
)
```

### InForecastDay

```jsx
() => (
  <div className="flex w-full max-w-2xl flex-col gap-4">
    <div className="flex items-baseline justify-between">
      <Heading level={2}>Saturday 18 May</Heading>
      <span className="font-data text-xs text-faded-ink">High 06:40 · Low 12:55</span>
    </div>
    <Divider weight="medium" />
    <Text variant="caption">Wijk aan Zee · wingfoil · showing best slots only</Text>
    <EmptyState />
    <Text variant="muted">
      Nothing above 60 all day — onshore 9 kt and a 0.3 m windswell.
    </Text>
  </div>
)
```

### Compact

```jsx
() => (
  <div className="flex w-full max-w-sm flex-col gap-3">
    <Text variant="label">Scheveningen Noord</Text>
    <EmptyState className="p-8 text-lg" />
    <Text variant="caption">No slot matches your kitesurfing filters this week.</Text>
  </div>
)
```

### InsideCard

```jsx
() => (
  <div className="w-full max-w-md">
    <Card variant="default">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Heading level={3}>Brouwersdam</Heading>
          <span className="font-data text-xs text-faded-ink">24 kt WSW</span>
        </div>
        <EmptyState className="p-10 text-xl" />
      </div>
    </Card>
  </div>
)
```
