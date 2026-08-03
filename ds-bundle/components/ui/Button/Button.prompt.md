Button from waterman. Use via `window.Waterman.Button` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Button component - all button variants in the app.

@param {"primary"|"secondary"|"ghost"|"danger"|"icon"} variant
@param {"sm"|"md"|"lg"} size
@param {React.ComponentType} icon - Lucide icon component
@param {React.ReactNode} children
@param {Function} onClick
@param {boolean} disabled
@param {boolean} loading - Shows spinner and disables button
@param {boolean} fullWidth - Makes button full width
@param {string} type - Button type (defaults to "button")
@param {string} className - Additional CSS classes

## Props

```ts
interface ButtonProps {
variant?: "primary"|"secondary"|"ghost"|"danger"|"icon"; size?: "sm"|"md"|"lg";  /** Lucide icon component */ icon?: React.ComponentType; children?: React.ReactNode; onClick?: (...args: any[]) => void; disabled?: boolean;  /** Shows spinner and disables button */ loading?: boolean;  /** Makes button full width */ fullWidth?: boolean;  /** Button type (defaults to "button") */ type?: string;  /** Additional CSS classes */ className?: string; [key: string]: unknown;
}
```

## Examples

### Variants

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary">Log a session</Button>
    <Button variant="secondary">View forecast</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="danger">Delete spot</Button>
    <Button variant="icon" icon={Share2} />
  </div>
)
```

### Sizes

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary" size="sm">Small</Button>
    <Button variant="primary" size="md">Medium</Button>
    <Button variant="primary" size="lg">Large</Button>
  </div>
)
```

### WithIcons

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary" icon={Plus}>Add spot</Button>
    <Button variant="secondary" icon={Wind}>Live wind</Button>
    <Button variant="danger" icon={Trash2}>Remove</Button>
  </div>
)
```

### States

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary" loading>Saving</Button>
    <Button variant="primary" disabled>Unavailable</Button>
    <Button variant="secondary" disabled>Disabled</Button>
  </div>
)
```

### FullWidth

```jsx
() => (
  <div className="max-w-sm">
    <Button variant="primary" fullWidth>Continue</Button>
  </div>
)
```
