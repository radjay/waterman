Text from waterman. Use via `window.Waterman.Text` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Text component - consistent body text styles.

@param {"body"|"muted"|"caption"|"label"} variant
@param {string} as - HTML tag (defaults to "p")
@param {React.ReactNode} children
@param {string} className - Additional CSS classes

## Props

```ts
interface TextProps {
variant?: "body"|"muted"|"caption"|"label";  /** HTML tag (defaults to "p") */ as?: string; children?: React.ReactNode;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### Variants

```jsx
() => (
  <div className="flex flex-col gap-3 max-w-xl">
    <Text variant="body">
      Steady 18–22 knot north-westerly through the afternoon, easing after 17:00. Best window is
      the incoming tide between 13:00 and 16:00.
    </Text>
    <Text variant="muted">
      Forecast updated 4 times daily from Windy.app, with live readings from the Windguru station.
    </Text>
    <Text variant="caption">Last scraped 06:12 · next run 12:00</Text>
    <Text variant="label">Session notes</Text>
  </div>
)
```

### BodyAndMuted

```jsx
() => (
  <div className="flex flex-col gap-2 max-w-xl">
    <Text variant="body">
      Cross-onshore and clean — a good first session on the 5m. Chop builds once the tide turns.
    </Text>
    <Text variant="muted">Recorded at Scheveningen Noord, 2h 15m on the water.</Text>
  </div>
)
```

### LabelledBlock

```jsx
() => (
  <div className="flex flex-col gap-1 max-w-xl">
    <Text variant="label">Conditions</Text>
    <Text variant="body">Wind 19 kt NW · Waves 0.8 m · Water 17°C</Text>
    <Text variant="caption">Scored 82 by the conditions model</Text>
  </div>
)
```

### AsElement

```jsx
() => (
  <div className="flex flex-col gap-2 max-w-xl">
    <Text variant="body" as="span">Rendered as a span</Text>
    <Text variant="muted" as="div">Rendered as a div</Text>
  </div>
)
```
