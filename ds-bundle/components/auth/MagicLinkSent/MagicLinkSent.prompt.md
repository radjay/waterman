MagicLinkSent from waterman. Use via `window.Waterman.MagicLinkSent` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface MagicLinkSentProps {
email: unknown; onBack: (...args: any[]) => void;
}
```

## Examples

### Default

```jsx
() => (
  <div className="w-full max-w-md">
    <MagicLinkSent email="jeroen@example.com" onBack={noop} />
  </div>
);

// The address is echoed back verbatim, so long addresses are the case to check.
```

### LongAddress

```jsx
() => (
  <div className="w-full max-w-md">
    <MagicLinkSent email="jeroen.seghers@scheveningen-watersport.nl" onBack={noop} />
  </div>
);

// How app/auth/login frames it once EmailLoginForm reports success.
```

### LoginPage

```jsx
() => (
  <div className="w-full max-w-md">
    <div className="text-center mb-8">
      <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
    </div>
    <MagicLinkSent email="jeroen@example.com" onBack={noop} />
  </div>
);

// On a white card — the surface used by the verify and onboarding routes.
```

### OnCard

```jsx
() => (
  <div className="w-full max-w-md">
    <Card variant="elevated" className="bg-white p-8">
      <MagicLinkSent email="anouk@example.com" onBack={noop} />
      <Text variant="caption" className="block text-center mt-6">
        Links expire after 15 minutes
      </Text>
    </Card>
  </div>
)
```
