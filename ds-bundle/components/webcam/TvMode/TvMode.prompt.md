TvMode from waterman. Use via `window.Waterman.TvMode` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

TvMode component - Fullscreen dark theme view with 3-column grid and no spacing.
Designed for displaying all webcams simultaneously on a TV or large display.
Clicking a webcam focuses on it in fullscreen.

@param {Array} webcams - Array of webcam spot objects
@param {Function} onClose - Callback when TV mode is exited

## Props

```ts
interface TvModeProps {
 /** Array of webcam spot objects */ webcams: unknown[];  /** Callback when TV mode is exited */ onClose: (...args: any[]) => void;
}
```

## Examples

### CamWall

```jsx
() => (
  <Stage height={620}>
    <TvMode
      onClose={noop}
      webcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Zandvoort', 'Zandvoort aan Zee'),
        cam('Wijk aan Zee', 'Beverwijk'),
        cam('Ijmuiden', 'Velsen'),
        cam('Brouwersdam', 'Ouddorp'),
        cam('Domburg', 'Veere'),
      ]}
    />
  </Stage>
)
```

### SingleRow

```jsx
() => (
  <Stage height={340}>
    <TvMode
      onClose={noop}
      webcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Wijk aan Zee', 'Beverwijk'),
        cam('Brouwersdam', 'Ouddorp'),
      ]}
    />
  </Stage>
)
```

### NineUp

```jsx
() => (
  <Stage height={640}>
    <TvMode
      onClose={noop}
      webcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Scheveningen Zuid', 'Den Haag'),
        cam('Zandvoort', 'Zandvoort aan Zee'),
        cam('Wijk aan Zee', 'Beverwijk'),
        cam('Ijmuiden', 'Velsen'),
        cam('Bloemendaal', 'Bloemendaal aan Zee'),
        cam('Brouwersdam', 'Ouddorp'),
        cam('Domburg', 'Veere'),
        cam('Hoek van Holland', 'Rotterdam'),
      ]}
    />
  </Stage>
)
```
