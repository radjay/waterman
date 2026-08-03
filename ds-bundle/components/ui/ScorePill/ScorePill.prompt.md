ScorePill from waterman. Use via `window.Waterman.ScorePill` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

ScorePill component - pill-shaped sport icon + score display.

@param {number} score - Condition score (0-100)
@param {"wingfoil"|"kitesurfing"|"surfing"} sport
@param {"sm"|"md"|"lg"|"xl"} size
@param {boolean} showAll - If true, show scores below 60 too
@param {Function} onClick - Optional click handler (renders as button)
@param {string} className - Additional CSS classes

## Props

```ts
interface ScorePillProps {
 /** Condition score (0-100) */ score: number; sport: "wingfoil"|"kitesurfing"|"surfing"; size?: "sm"|"md"|"lg"|"xl";  /** If true, show scores below 60 too */ showAll?: boolean;  /** Optional click handler (renders as button) */ onClick?: (...args: any[]) => void;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### ScoreRange

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={94} sport="wingfoil" />
    <ScorePill score={81} sport="kitesurfing" />
    <ScorePill score={64} sport="surfing" />
    <ScorePill score={42} sport="wingfoil" showAll />
  </div>
)
```

### Sizes

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={88} sport="wingfoil" size="sm" />
    <ScorePill score={88} sport="wingfoil" size="md" />
    <ScorePill score={88} sport="wingfoil" size="lg" />
    <ScorePill score={88} sport="wingfoil" size="xl" />
  </div>
)
```

### Sports

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={76} sport="wingfoil" size="lg" />
    <ScorePill score={76} sport="kitesurfing" size="lg" />
    <ScorePill score={76} sport="surfing" size="lg" />
  </div>
)
```

### Clickable

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <ScorePill score={91} sport="kitesurfing" size="lg" onClick={() => {}} />
    <ScorePill score={58} sport="surfing" size="lg" showAll onClick={() => {}} />
  </div>
)
```
