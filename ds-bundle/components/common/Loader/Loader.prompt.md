Loader from waterman. Use via `window.Waterman.Loader` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Examples

### Default

```jsx
() => (
  <div className="flex w-full max-w-xl flex-col rounded-card border border-ink/15 bg-newsprint">
    <FreezeGlyph />
    <Loader />
  </div>
)
```

### InCard

```jsx
() => (
  <div className="w-full max-w-md">
    <FreezeGlyph />
    <Card variant="default">
      <div className="flex flex-col">
        <div className="flex items-baseline justify-between">
          <Heading level={3}>Scheveningen Noord</Heading>
          <span className="font-data text-xs text-faded-ink">wingfoil</span>
        </div>
        <Text variant="caption">Fetching the latest forecast run…</Text>
        <Loader />
      </div>
    </Card>
  </div>
)
```

### PageLoading

```jsx
() => (
  <div className="flex min-h-[560px] w-full max-w-2xl flex-col gap-4">
    <FreezeGlyph />
    <div className="flex items-baseline justify-between">
      <Heading level={1}>Conditions</Heading>
      <span className="font-data text-xs text-faded-ink">Updated 06:40 · water 17°C</span>
    </div>
    <Divider weight="medium" />
    <div className="flex flex-wrap gap-2">
      <span className="rounded-ui border border-ink/15 px-2.5 py-1 font-body text-xs text-faded-ink">Wingfoil</span>
      <span className="rounded-ui border border-ink/15 px-2.5 py-1 font-body text-xs text-faded-ink">Kitesurfing</span>
      <span className="rounded-ui border border-ink/15 px-2.5 py-1 font-body text-xs text-faded-ink">Surfing</span>
    </div>
    <Loader />
  </div>
)
```
