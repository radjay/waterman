Badge from waterman. Use via `window.Waterman.Badge` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface BadgeProps {
children?: React.ReactNode; variant?: "epic" | "default"; className?: string;
}
```

## Examples

### Variants

```jsx
() => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="default">Offshore</Badge>
    <Badge variant="epic">Epic</Badge>
  </div>
)
```

### InContext

```jsx
() => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="epic">Best of the week</Badge>
    <Badge variant="default">Low tide</Badge>
    <Badge variant="default">Gusty</Badge>
    <Badge variant="default">Cross-onshore</Badge>
  </div>
)
```
