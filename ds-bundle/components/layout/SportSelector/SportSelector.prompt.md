SportSelector from waterman. Use via `window.Waterman.SportSelector` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface SportSelectorProps {
onSportsChange: (...args: any[]) => void; value: unknown; className?: string;
}
```

## Examples

### Default

```jsx
() => <SportSelector value="wingfoil" onSportsChange={noop} />
```

### EachSport

```jsx
() => (
  <div className="flex flex-col gap-4 items-start">
    <div className="flex items-center gap-3">
      <SportSelector value="wingfoil" onSportsChange={noop} />
      <Text variant="caption">Scheveningen Noord · 19 kt NW</Text>
    </div>
    <div className="flex items-center gap-3">
      <SportSelector value="kitesurfing" onSportsChange={noop} />
      <Text variant="caption">Wijk aan Zee · 24 kt WSW</Text>
    </div>
    <div className="flex items-center gap-3">
      <SportSelector value="surfing" onSportsChange={noop} />
      <Text variant="caption">Zandvoort · 0.9 m @ 6 s</Text>
    </div>
  </div>
)
```

### InFilterRow

```jsx
() => (
  <div className="w-full max-w-xl flex flex-col gap-3">
    <div className="flex items-end gap-6">
      <FilterGroup label="Sport">
        <SportSelector value="kitesurfing" onSportsChange={noop} />
      </FilterGroup>
      <FilterGroup label="Show">
        <ShowFilter value="best" onFilterChange={noop} />
      </FilterGroup>
    </div>
    <Divider weight="light" />
    <Heading level={3}>Saturday 18 May</Heading>
    <div className="flex items-center justify-between">
      <Text variant="muted">Wijk aan Zee · 11:00 – 13:30 · 24 kt WSW gusting 31 kt</Text>
      <ScorePill score={72} sport="kitesurfing" size="sm" />
    </div>
  </div>
)
```
