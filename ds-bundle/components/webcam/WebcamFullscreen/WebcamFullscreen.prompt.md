WebcamFullscreen from waterman. Use via `window.Waterman.WebcamFullscreen` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Fullscreen webcam modal component with video and metadata.

@param {Object} spot - Webcam spot object
@param {Function} onClose - Callback to close the modal
@param {Array} allWebcams - Array of all available webcams for navigation
@param {Function} onNavigate - Callback to navigate to a different webcam

## Props

```ts
interface WebcamFullscreenProps {
 /** Webcam spot object */ spot: Record<string, unknown>;  /** Callback to close the modal */ onClose: (...args: any[]) => void;  /** Array of all available webcams for navigation */ allWebcams?: unknown[];  /** Callback to navigate to a different webcam */ onNavigate: (...args: any[]) => void;
}
```

## Examples

### Default

```jsx
() => (
  <Stage height={620}>
    <WebcamFullscreen spot={cam('Scheveningen Noord', 'Den Haag')} onClose={noop} />
  </Stage>
)
```

### WithNavigation

```jsx
() => (
  <Stage height={620}>
    <WebcamFullscreen
      spot={cam('Brouwersdam', 'Ouddorp')}
      onClose={noop}
      onNavigate={noop}
      allWebcams={[
        cam('Scheveningen Noord', 'Den Haag'),
        cam('Brouwersdam', 'Ouddorp'),
        cam('Wijk aan Zee', 'Beverwijk'),
      ]}
    />
  </Stage>
)
```
