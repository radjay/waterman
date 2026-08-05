PillToggle from waterman. Use via `window.Waterman.PillToggle` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

PillToggle — premium single-select pill group with animated sliding indicator.

@param {Array<{id: string, label: string}>} options
@param {string} value - Currently selected option id
@param {Function} onChange - Called with selected option id
@param {string} name - Unique name for animation (each PillToggle on the page needs a different name)
@param {string} className - Additional CSS classes

## Props

```ts
interface PillToggleProps {
options: unknown[];  /** Currently selected option id */ value: string;  /** Called with selected option id */ onChange: (...args: any[]) => void;  /** Unique name for animation (each PillToggle on the page needs a different name) */ name?: string;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### Default

```jsx
() => (
  <PillToggle name="sport-default" options={SPORTS} value="wingfoil" onChange={noop} />
)
```

### Selections

```jsx
() => (
  <div className="flex flex-col gap-4 items-start">
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">All sports</Text>
      <PillToggle name="sport-all" options={SPORTS} value="" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Wingfoil only</Text>
      <PillToggle name="sport-wing" options={SPORTS} value="wingfoil" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Surfing only</Text>
      <PillToggle name="sport-surf" options={SPORTS} value="surfing" onChange={noop} />
    </div>
  </div>
)
```

### TwoOption

```jsx
() => (
  <div className="flex items-center gap-6">
    <PillToggle name="show-best" options={SHOW} value="best" onChange={noop} />
    <PillToggle name="show-all" options={SHOW} value="all" onChange={noop} />
  </div>
)
```
