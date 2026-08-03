Tooltip from waterman. Use via `window.Waterman.Tooltip` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Tooltip component that shows a message on hover.

@param {React.ReactNode} children - The element to wrap with tooltip
@param {string} content - The tooltip text content
@param {string} position - Position of tooltip: "top" | "bottom" | "left" | "right"
@param {string} className - Additional CSS classes for the wrapper

## Props

```ts
interface TooltipProps {
 /** The element to wrap with tooltip */ children?: React.ReactNode;  /** The tooltip text content */ content: string;  /** Position of tooltip: "top" | "bottom" | "left" | "right" */ position?: string;  /** Additional CSS classes for the wrapper */ className?: string;
}
```

## Examples

### Default

```jsx
() => (
  <div className="ds-tip-open" style={{ padding: '48px 150px 8px' }}>
    <ShowTooltips />
    <Tooltip content="Measured at the Windguru station on the pier">
      <Button variant="icon" aria-label="About this reading">
        <Info size={16} />
      </Button>
    </Tooltip>
  </div>
)
```

### Positions

```jsx
() => (
  <div
    className="ds-tip-open flex flex-col items-center"
    style={{ padding: '48px 140px', rowGap: '64px' }}
  >
    <ShowTooltips />
    <Tooltip content="High 06:40 · Low 12:55" position="top">
      <Button variant="secondary" size="sm">Top</Button>
    </Tooltip>
    <Tooltip content="Gusting 26 kt" position="bottom">
      <Button variant="secondary" size="sm">Bottom</Button>
    </Tooltip>
    <Tooltip content="Water 17°C" position="left">
      <Button variant="secondary" size="sm">Left</Button>
    </Tooltip>
    <Tooltip content="0.8 m at 6 s" position="right">
      <Button variant="secondary" size="sm">Right</Button>
    </Tooltip>
  </div>
)
```

### InToolbar

```jsx
() => (
  <div className="max-w-xl" style={{ padding: '52px 8px 8px' }}>
    <ShowTooltips />
    <div className="flex items-center gap-3 border border-ink/15 rounded-card bg-newsprint px-4 py-3">
      <Text variant="label">Scheveningen Noord</Text>
      <div className="flex-1" />
      <Tooltip content="Live wind · updated 06:12" className="ds-tip-open">
        <Button variant="icon" aria-label="Live wind">
          <Wind size={16} />
        </Button>
      </Tooltip>
      <Tooltip content="Save to favourites">
        <Button variant="icon" aria-label="Favourite">
          <Star size={16} />
        </Button>
      </Tooltip>
      <ScorePill score={87} sport="wingfoil" size="sm" />
    </div>
  </div>
)
```

### Resting

```jsx
() => (
  <div className="flex items-center gap-3 py-2">
    <Tooltip content="Measured at the Windguru station on the pier">
      <Button variant="icon" aria-label="About this reading">
        <Info size={16} />
      </Button>
    </Tooltip>
    <Text variant="caption">Resting — the bubble stays hidden until the trigger is hovered.</Text>
  </div>
)
```
