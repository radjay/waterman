VerifyingMagicLink from waterman. Use via `window.Waterman.VerifyingMagicLink` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface VerifyingMagicLinkProps {
message?: string;
}
```

## Examples

### Default

```jsx
() => (
  <div className="w-full max-w-md">
    <Card variant="elevated" className="bg-white p-8">
      <VerifyingMagicLink />
    </Card>
  </div>
);

// The only prop is `message`, so that is the variant axis.
```

### Messages

```jsx
() => (
  <div className="flex flex-col gap-4 w-full max-w-md">
    <Card variant="elevated" className="bg-white p-6">
      <VerifyingMagicLink message="Signing you in as jeroen@example.com…" />
    </Card>
    <Card variant="elevated" className="bg-white p-6">
      <VerifyingMagicLink message="Restoring your spots and journal…" />
    </Card>
  </div>
);

// Full-page framing, as /auth/verify renders it inside the Suspense fallback.
```

### VerifyPage

```jsx
() => (
  <div className="w-full max-w-md">
    <div className="text-center mb-6">
      <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
      <Text variant="muted" className="text-sm">Scheveningen Noord · 19 kt NW</Text>
    </div>
    <Card variant="elevated" className="bg-white p-8">
      <VerifyingMagicLink />
    </Card>
  </div>
)
```
