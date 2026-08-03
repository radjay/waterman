TideTable from waterman. Use via `window.Waterman.TideTable` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface TideTableProps {
tides: unknown; spotName: unknown; className?: string;
}
```

## Examples

### DayTides

```jsx
() => (
  <div className="max-w-[360px]">
    <TideTable
      spotName="Scheveningen Noord"
      tides={[
        row(3, 6, 40, 'high', 1.4),
        row(3, 12, 55, 'low', 0.2),
        row(3, 19, 10, 'high', 1.5),
        row(4, 1, 20, 'low', 0.3),
      ]}
    />
  </div>
)
```

### TwoDays

```jsx
() => (
  <div className="max-w-[360px]">
    <TideTable
      spotName="Brouwersdam"
      tides={[
        row(3, 6, 40, 'high', 1.4),
        row(3, 12, 55, 'low', 0.2),
        row(3, 19, 10, 'high', 1.5),
        row(4, 1, 20, 'low', 0.3),
        row(4, 7, 25, 'high', 1.6),
        row(4, 13, 40, 'low', 0.1),
        row(4, 19, 55, 'high', 1.5),
      ]}
    />
  </div>
)
```

### MissingHeights

```jsx
() => (
  <div className="max-w-[360px]">
    <TideTable
      spotName="Wijk aan Zee"
      tides={[
        row(3, 7, 5, 'high', 1.3),
        row(3, 13, 20, 'low', null),
        row(3, 19, 35, 'high', 1.4),
        row(4, 1, 45, 'low', null),
      ]}
    />
  </div>
)
```

### SideBySide

```jsx
() => (
  <div className="flex flex-wrap gap-6">
    <div className="w-[300px]">
      <TideTable
        spotName="Zandvoort"
        tides={[
          row(3, 6, 50, 'high', 1.4),
          row(3, 13, 5, 'low', 0.2),
          row(3, 19, 20, 'high', 1.5),
        ]}
      />
    </div>
    <div className="w-[300px]">
      <TideTable
        spotName="Ijmuiden"
        tides={[
          row(3, 6, 15, 'high', 1.5),
          row(3, 12, 30, 'low', 0.2),
          row(3, 18, 45, 'high', 1.6),
        ]}
      />
    </div>
  </div>
)
```
