OnboardingModal from waterman. Use via `window.Waterman.OnboardingModal` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface OnboardingModalProps {
onComplete: (...args: any[]) => void; onDismiss: (...args: any[]) => void; isDismissible?: boolean;
}
```

## Examples

### Default

```jsx
() => (
  <Stage height={540}>
    <OnboardingModal onComplete={noop} onDismiss={noop} isDismissible />
  </Stage>
)
```

### Required

```jsx
() => (
  <Stage height={540}>
    <OnboardingModal onComplete={noop} onDismiss={noop} isDismissible={false} />
  </Stage>
)
```
