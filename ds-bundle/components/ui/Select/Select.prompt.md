Select from waterman. Use via `window.Waterman.Select` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Simple controlled select component.
Pure UI component with no business logic.

@param {Array} options - Array of {id, label} objects
@param {string} value - Current selected value (controlled)
@param {Function} onChange - Callback when value changes
@param {string} className - Additional CSS classes

## Props

```ts
interface SelectProps {
 /** Array of {id, label} objects */ options: unknown[];  /** Current selected value (controlled) */ value: string;  /** Callback when value changes */ onChange: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### Default

```jsx
() => (
  <Select options={SHOW_OPTIONS} value="best" onChange={noop} />
)
```

### Selections

```jsx
() => (
  <div className="flex flex-col gap-4 items-start">
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Showing best times</Text>
      <Select options={SHOW_OPTIONS} value="best" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Showing all times</Text>
      <Select options={SHOW_OPTIONS} value="all" onChange={noop} />
    </div>
  </div>
)
```

### SpotPicker

```jsx
() => (
  <div className="flex items-center gap-3">
    <Text variant="label">Spot</Text>
    <Select options={SPOT_OPTIONS} value="wijk-aan-zee" onChange={noop} />
  </div>
)
```
