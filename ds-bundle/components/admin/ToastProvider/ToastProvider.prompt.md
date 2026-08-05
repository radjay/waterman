ToastProvider from waterman. Use via `window.Waterman.ToastProvider` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface ToastProviderProps {
children?: React.ReactNode;
}
```

## Examples

### WrapsApplication

```jsx
() => (
  <Stage height={240}>
    <ToastProvider>
      <div className="p-6 flex flex-col gap-3 max-w-[520px]">
        <Heading level={3}>Admin · Spots</Heading>
        <Text variant="muted">
          Every save, delete and scrape result in this panel is announced through the toast layer.
        </Text>
        <Divider weight="light" />
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={noop}>Save configuration</Button>
          <Button variant="ghost" size="sm" onClick={noop}>Discard</Button>
        </div>
      </div>
    </ToastProvider>
  </Stage>
)
```

### NotificationLayer

```jsx
() => (
  <Stage height={260}>
    <ToastProvider>
      <div className="p-6 flex flex-col gap-3 max-w-[520px]">
        <Heading level={3}>Admin · Spots</Heading>
        <Text variant="muted">Scheveningen Noord · wingfoil</Text>
        <Divider weight="light" />
        <div className="flex items-center justify-between">
          <Text variant="body">Min wind speed</Text>
          <Text variant="muted">14 kt</Text>
        </div>
        <div className="flex items-center justify-between">
          <Text variant="body">Min gust</Text>
          <Text variant="muted">18 kt</Text>
        </div>
      </div>
      {/* The provider's queue is imperative-only and exposes no context, so a
          Toast is placed in the tree to show the layer while one is live. */}
      <Toast type="success" duration={0} onClose={noop} message="Configuration saved" />
    </ToastProvider>
  </Stage>
)
```
