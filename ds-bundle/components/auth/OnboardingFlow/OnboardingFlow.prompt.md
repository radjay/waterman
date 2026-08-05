OnboardingFlow from waterman. Use via `window.Waterman.OnboardingFlow` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface OnboardingFlowProps {
onComplete: (...args: any[]) => void;
}
```

## Examples

### Welcome

```jsx
() => (
  <div className="w-full max-w-md">
    <OnboardingFlow onComplete={noop} />
  </div>
);

// How app/auth/verify renders it after a first-time sign-in: on a white card.
```

### OnCard

```jsx
() => (
  <div className="w-full max-w-lg">
    <Card variant="elevated" className="bg-white p-8">
      <OnboardingFlow onComplete={noop} />
    </Card>
  </div>
);

// Full-page framing, centred under the masthead like the verify route.
```

### VerifyPage

```jsx
() => (
  <div className="w-full max-w-lg">
    <div className="text-center mb-6">
      <Heading level={1} className="text-4xl mb-1">Waterman</Heading>
      <Text variant="muted" className="text-sm">
        Wingfoil &amp; surf conditions for the Dutch coast
      </Text>
    </div>
    <Card variant="elevated" className="bg-white p-8">
      <OnboardingFlow onComplete={noop} />
    </Card>
  </div>
)
```
