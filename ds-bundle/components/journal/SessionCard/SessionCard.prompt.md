SessionCard from waterman. Use via `window.Waterman.SessionCard` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface SessionCardProps {
entry: unknown;
}
```

## Examples

### Default

```jsx
() => (
  <div className="max-w-xl">
    <SessionCard entry={scheveningen} />
  </div>
)
```

### SportVariants

```jsx
() => (
  <div className="flex flex-col gap-3 max-w-xl">
    <SessionCard entry={scheveningen} />
    <SessionCard entry={zandvoort} />
    <SessionCard entry={wijkAanZee} />
  </div>
)
```

### WithoutNotes

```jsx
() => (
  <div className="flex flex-col gap-3 max-w-xl">
    <SessionCard
      entry={{
        _id: 'c2d5e8f1g4h7i0j3k6l9m2n5',
        sport: 'wingfoil',
        spotName: 'Brouwersdam',
        sessionDate: '2026-07-19T16:00:00',
        durationMinutes: 105,
        rating: 4,
        hasForecastData: false,
      }}
    />
    <SessionCard
      entry={{
        _id: 'd6e9f2g5h8i1j4k7l0m3n6o9',
        sport: 'kitesurfing',
        customLocation: 'Grevelingenmeer — north shore',
        sessionDate: '2025-09-12T13:15:00',
        durationMinutes: 45,
        rating: 3,
        hasForecastData: false,
      }}
    />
  </div>
)
```

### JournalFeed

```jsx
() => (
  <div className="max-w-xl">
    <div className="font-headline text-xl text-ink mb-1">Recent sessions</div>
    <div className="font-body text-sm text-ink/50 mb-4">
      12 logged this season &middot; 21h 40m on the water
    </div>
    <div className="flex flex-col gap-3">
      <SessionCard entry={scheveningen} />
      <SessionCard entry={zandvoort} />
      <SessionCard entry={wijkAanZee} />
    </div>
  </div>
)
```
