SpotConfigForm from waterman. Use via `window.Waterman.SpotConfigForm` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface SpotConfigFormProps {
spotId: unknown; sport: string; config: unknown; onSave: (...args: any[]) => void;
}
```

## Examples

### WingfoilThresholds

```jsx
() => (
  <div className="max-w-[640px]">
    <SpotConfigForm
      spotId="spot_scheveningen_noord"
      sport="wingfoil"
      config={wingfoilConfig}
      onSave={noop}
    />
  </div>
)
```

### SurfingThresholds

```jsx
() => (
  <div className="max-w-[640px]">
    <SpotConfigForm
      spotId="spot_wijk_aan_zee"
      sport="surfing"
      config={surfingConfig}
      onSave={noop}
    />
  </div>
)
```

### NotConfigured

```jsx
() => (
  <div className="max-w-[640px]">
    <SpotConfigForm
      spotId="spot_brouwersdam"
      sport="surfing"
      config={null}
      onSave={noop}
    />
  </div>
)
```

### SpotAdminPanel

```jsx
() => (
  <div className="max-w-[640px] flex flex-col gap-2">
    <Heading level={3}>Scheveningen Noord</Heading>
    <Text variant="muted" className="mb-4">
      Netherlands · 52.108° N, 4.275° E · Windguru station 48291
    </Text>
    <SpotConfigForm
      spotId="spot_scheveningen_noord"
      sport="wingfoil"
      config={wingfoilConfig}
      onSave={noop}
    />
    <SpotConfigForm
      spotId="spot_scheveningen_noord"
      sport="surfing"
      config={null}
      onSave={noop}
    />
  </div>
)
```
