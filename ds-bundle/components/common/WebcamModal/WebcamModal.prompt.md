WebcamModal from waterman. Use via `window.Waterman.WebcamModal` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface WebcamModalProps {
isOpen: boolean; onClose: (...args: any[]) => void; webcamUrl: unknown; spotName: unknown; webcamStreamSource: unknown;
}
```

## Examples

### StillImageUnavailable

```jsx
() => (
  <Stage height={520}>
    <WebcamModal
      isOpen
      onClose={noop}
      spotName="Scheveningen Noord"
      webcamUrl="https://cams.scheveningen.invalid/noord/current.jpg"
      webcamStreamSource="image"
    />
  </Stage>
)
```

### LiveStream

```jsx
() => (
  <Stage height={520}>
    <WebcamModal
      isOpen
      onClose={noop}
      spotName="Brouwersdam · Kabbelaarsbank"
      webcamUrl="https://deliverys5.quanteec.invalid/contents/encodings/live/brouwersdam/media_0.m3u8"
      webcamStreamSource="quanteec"
    />
  </Stage>
)
```

### Compact

```jsx
() => (
  <Stage height={340}>
    <WebcamModal
      isOpen
      onClose={noop}
      spotName="Wijk aan Zee"
      webcamUrl="https://cams.wijkaanzee.invalid/pier/snapshot.jpg"
      webcamStreamSource="image"
    />
  </Stage>
)
```
