DataGroup from waterman. Use via `window.Waterman.DataGroup` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Reusable data group component for displaying metrics with direction.

@param {ReactNode} icon - Icon component
@param {ReactNode} children - Metric value/content
@param {number} direction - Direction in degrees (optional)
@param {boolean} showDirection - Whether to show direction indicator
@param {string} className - Additional CSS classes

## Props

```ts
interface DataGroupProps {
 /** Icon component */ icon?: ReactNode;  /** Metric value/content */ children?: ReactNode;  /** Direction in degrees (optional) */ direction: number;  /** Whether to show direction indicator */ showDirection?: boolean; gap?: string;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### WindWithDirection

```jsx
() => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-3">
      19 kn <span>(26*)</span>
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={247} gap="gap-3">
      24 kn <span>(31*)</span>
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={20} gap="gap-3">
      11 kn <span>(15*)</span>
    </DataGroup>
  </div>
)
```

### WaveAndWater

```jsx
() => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Waves size={14} className="mr-2 text-ink/50" />} direction={290} gap="gap-3">
      0.8 m
    </DataGroup>
    <DataGroup icon={<Waves size={14} className="mr-2 text-ink/50" />} direction={110} gap="gap-3">
      1.4 m
    </DataGroup>
    <DataGroup icon={<Thermometer size={14} className="mr-2 text-ink/50" />} showDirection={false}>
      17°C
    </DataGroup>
  </div>
)
```

### MissingDirection

```jsx
() => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-3">
      19 kn <span>(26*)</span>
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={null} gap="gap-3">
      — kn
    </DataGroup>
  </div>
)
```

### Gaps

```jsx
() => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-1">
      19 kn
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-3">
      19 kn
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-8">
      19 kn
    </DataGroup>
  </div>
)
```
