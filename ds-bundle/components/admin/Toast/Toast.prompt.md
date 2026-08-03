Toast from waterman. Use via `window.Waterman.Toast` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface ToastProps {
message: unknown; type?: string; onClose: (...args: any[]) => void; duration?: number;
}
```

## Examples

### Success

```jsx
() => (
  <Stage height={120}>
    <Toast
      type="success"
      duration={0}
      onClose={noop}
      message="Wingfoil thresholds saved for Scheveningen Noord"
    />
  </Stage>
)
```

### ErrorState

```jsx
() => (
  <Stage height={120}>
    <Toast
      type="error"
      duration={0}
      onClose={noop}
      message="Could not reach the forecast service"
    />
  </Stage>
)
```

### LongMessage

```jsx
() => (
  <Stage height={140}>
    <Toast
      type="error"
      duration={0}
      onClose={noop}
      message="Windguru station 48291 returned no data for the last 3 hours — live wind is stale for Wijk aan Zee."
    />
  </Stage>
)
```

### OverAdminPanel

```jsx
() => (
  <Stage height={260}>
    <div className="p-6 flex flex-col gap-3 max-w-[520px]">
      <Heading level={3}>Spot configuration</Heading>
      <Text variant="muted">Brouwersdam · Windguru station 48291</Text>
      <Divider weight="light" />
      <div className="flex items-center justify-between">
        <Text variant="body">Min wind speed</Text>
        <Text variant="muted">14 kt</Text>
      </div>
      <div className="flex items-center justify-between">
        <Text variant="body">Wind direction window</Text>
        <Text variant="muted">180° – 360°</Text>
      </div>
    </div>
    <Toast
      type="success"
      duration={0}
      onClose={noop}
      message="Configuration updated"
    />
  </Stage>
)
```

## Related

`ToastProvider`
