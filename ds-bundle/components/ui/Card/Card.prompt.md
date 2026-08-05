Card from waterman. Use via `window.Waterman.Card` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Card component - general card container.

@param {"default"|"interactive"|"elevated"} variant
@param {React.ReactNode} children
@param {Function} onClick
@param {string} className - Additional CSS classes

## Props

```ts
interface CardProps {
variant?: "default"|"interactive"|"elevated"; children?: React.ReactNode; onClick?: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### Variants

```jsx
() => (
  <div className="flex flex-col gap-4 max-w-md">
    <Card variant="default">
      <Text variant="label">Default</Text>
      <Text variant="body">A plain container for grouped content.</Text>
    </Card>
    <Card variant="interactive" onClick={() => {}}>
      <Text variant="label">Interactive</Text>
      <Text variant="body">Renders as a button and lifts on hover.</Text>
    </Card>
    <Card variant="elevated">
      <Text variant="label">Elevated</Text>
      <Text variant="body">Raised above the page for emphasis.</Text>
    </Card>
  </div>
)
```

### SpotCard

```jsx
() => (
  <div className="max-w-md">
    <Card variant="interactive" onClick={() => {}}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={3}>Scheveningen Noord</Heading>
          <Text variant="muted">19 kt NW · 0.8 m swell · incoming tide</Text>
          <Text variant="caption">Updated 06:12</Text>
        </div>
        <ScorePill score={87} sport="wingfoil" size="lg" />
      </div>
    </Card>
  </div>
)
```

### Compact

```jsx
() => (
  <div className="max-w-xs">
    <Card>
      <Text variant="label">Water temperature</Text>
      <Text variant="body">17°C</Text>
    </Card>
  </div>
)
```
