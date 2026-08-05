Heading from waterman. Use via `window.Waterman.Heading` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Heading component - consistent heading styles across the app.

@param {number} level - Heading level (1-4)
@param {React.ReactNode} children
@param {string} className - Additional CSS classes

## Props

```ts
interface HeadingProps {
 /** Heading level (1-4) */ level?: number; children?: React.ReactNode;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### Levels

```jsx
() => (
  <div className="flex flex-col gap-3">
    <Heading level={1}>Today at Scheveningen</Heading>
    <Heading level={2}>Coming up</Heading>
    <Heading level={3}>Afternoon session</Heading>
    <Heading level={4}>Wind and swell</Heading>
  </div>
)
```

### PageTitle

```jsx
() => (
  <div className="flex flex-col gap-1">
    <Heading level={1}>Conditions report</Heading>
    <Heading level={4}>Wingfoiling · next 48 hours</Heading>
  </div>
)
```

### SectionTitle

```jsx
() => (
  <div className="flex flex-col gap-2">
    <Heading level={2}>Session journal</Heading>
    <Heading level={3}>March 2026</Heading>
  </div>
)
```
