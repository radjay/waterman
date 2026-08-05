TideIndicator from waterman. Use via `window.Waterman.TideIndicator` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface TideIndicatorProps {
type: string; className?: string;
}
```

## Examples

### Types

```jsx
() => (
  <div className="flex flex-wrap items-center gap-4">
    <TideIndicator type="high" className="bg-ink text-newsprint" />
    <TideIndicator type="low" className="bg-muted-yellow text-ink" />
  </div>
)
```

### Emphasis

```jsx
() => (
  <div className="flex flex-wrap items-center gap-4">
    <TideIndicator type="high" className="text-ink" />
    <TideIndicator type="high" className="border border-ink/30 text-ink" />
    <TideIndicator type="high" className="bg-ink/10 text-ink" />
    <TideIndicator type="high" className="bg-red-accent text-newsprint" />
  </div>
)
```

### InTideList

```jsx
() => (
  <ul className="max-w-[280px] list-none space-y-1 border border-ink/15 rounded-card bg-newsprint px-3 py-2">
    {[
      { type: 'high', time: '06:40', height: '1.4 m' },
      { type: 'low', time: '12:55', height: '0.2 m' },
      { type: 'high', time: '19:10', height: '1.5 m' },
      { type: 'low', time: '01:20', height: '0.3 m' },
    ].map((tide) => (
      <li key={tide.time} className="flex items-center gap-2">
        <TideIndicator
          type={tide.type}
          className={tide.type === 'high' ? 'bg-ink text-newsprint' : 'bg-ink/10 text-ink'}
        />
        <span className="font-data text-sm text-ink">{tide.time}</span>
        <span className="font-data text-sm text-faded-ink ml-auto">{tide.height}</span>
      </li>
    ))}
  </ul>
)
```
