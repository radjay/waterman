LocationPicker from waterman. Use via `window.Waterman.LocationPicker` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface LocationPickerProps {
sport: string; value: unknown; onChange: (...args: any[]) => void; sessionToken: unknown;
}
```

## Examples

### Default

```jsx
() => (
  <div className="max-w-md">
    <div className="text-sm font-medium text-ink/70 mb-2 font-body">Where did you sail?</div>
    <LocationPicker sport="wingfoil" value={null} onChange={noop} sessionToken="preview-session" />
  </div>
)
```

### CustomLocation

```jsx
() => (
  <div className="max-w-md">
    <LocationPicker
      sport="kitesurfing"
      value={{ type: 'custom', location: 'Grevelingenmeer — north shore' }}
      onChange={noop}
      sessionToken="preview-session"
    />
  </div>
)
```

### InSessionForm

```jsx
() => (
  <div className="max-w-md rounded-card border border-ink/15 bg-newsprint p-5 shadow-card">
    <div className="font-headline text-lg text-ink mb-1">Log a session</div>
    <div className="font-body text-sm text-ink/60 mb-4">Surfing &middot; 3 Aug 2026</div>
    <LocationPicker sport="surfing" value={null} onChange={noop} sessionToken="preview-session" />
  </div>
)
```
