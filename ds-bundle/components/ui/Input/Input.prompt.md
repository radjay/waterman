Input from waterman. Use via `window.Waterman.Input` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Input component - text input or textarea with optional icon.

@param {React.ComponentType} icon - Lucide icon component
@param {string} placeholder
@param {string} value
@param {Function} onChange
@param {string} type - Input type (defaults to "text")
@param {boolean} multiline - Renders textarea instead of input
@param {number} rows - Number of rows for textarea (defaults to 4)
@param {boolean} readOnly - Read-only state
@param {boolean} disabled - Disabled state
@param {string} className - Additional CSS classes

## Props

```ts
interface InputProps {
 /** Lucide icon component */ icon?: React.ComponentType; placeholder?: string; value: string; onChange: (...args: any[]) => void;  /** Input type (defaults to "text") */ type?: string;  /** Renders textarea instead of input */ multiline?: boolean;  /** Number of rows for textarea (defaults to 4) */ rows?: number;  /** Read-only state */ readOnly?: boolean;  /** Disabled state */ disabled?: boolean;  /** Additional CSS classes */ className?: string; [key: string]: unknown;
}
```

## Examples

### Default

```jsx
() => (
  <div className="flex flex-col gap-2 max-w-sm">
    <Text variant="label">Spot</Text>
    <Input value="Scheveningen Noord" onChange={noop} placeholder="Where did you sail?" />
  </div>
)
```

### WithIcon

```jsx
() => (
  <div className="flex flex-col gap-4 max-w-sm">
    <Input icon={Search} value="" onChange={noop} placeholder="Search spots" />
    <Input icon={MapPin} value="Brouwersdam" onChange={noop} placeholder="Spot" />
    <Input icon={Mail} type="email" value="jeroen@seghers.com" onChange={noop} placeholder="you@example.com" />
  </div>
)
```

### States

```jsx
() => (
  <div className="flex flex-col gap-4 max-w-sm">
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Editable</Text>
      <Input value="Wijk aan Zee" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Read only</Text>
      <Input value="19 kt NW · gusts 26 kt" onChange={noop} readOnly />
    </div>
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Disabled</Text>
      <Input value="Zandvoort" onChange={noop} disabled />
    </div>
  </div>
)
```

### Multiline

```jsx
() => (
  <div className="flex flex-col gap-2 max-w-md">
    <Text variant="label">Session notes</Text>
    <Input
      multiline
      rows={4}
      value={
        "2h 15m on the 5m wing at Scheveningen Noord. Cross-shore NW built to 24 kt by high tide, chop cleaned up after the sandbar covered."
      }
      onChange={noop}
      placeholder="How was it out there?"
    />
  </div>
)
```
