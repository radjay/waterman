Divider from waterman. Use via `window.Waterman.Divider` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Divider component - horizontal separator.

@param {"light"|"medium"|"heavy"} weight
@param {string} className - Additional CSS classes

## Props

```ts
interface DividerProps {
weight?: "light"|"medium"|"heavy";  /** Additional CSS classes */ className?: string;
}
```

## Examples

### Weights

```jsx
() => (
  <div className="flex flex-col gap-4 max-w-md">
    <div>
      <Text variant="caption">light</Text>
      <Divider weight="light" />
    </div>
    <div>
      <Text variant="caption">medium</Text>
      <Divider weight="medium" />
    </div>
    <div>
      <Text variant="caption">heavy</Text>
      <Divider weight="heavy" />
    </div>
  </div>
)
```

### BetweenContent

```jsx
() => (
  <div className="flex flex-col gap-3 max-w-md">
    <Text variant="body">Morning session — 18 kt, clean.</Text>
    <Divider />
    <Text variant="body">Afternoon session — 24 kt, building chop.</Text>
  </div>
)
```
