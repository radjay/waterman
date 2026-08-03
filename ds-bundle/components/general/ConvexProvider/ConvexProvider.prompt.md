ConvexProvider from waterman. Use via `window.Waterman.ConvexProvider` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface ConvexProviderProps {
children?: React.ReactNode;
}
```

## Examples

### AroundAConsumer

```jsx
() => (
  <ConvexProvider>
    <div className="w-full max-w-md">
      <Card variant="elevated" className="bg-white p-8">
        <div className="mb-6">
          <Heading level={2} className="text-2xl mb-1">Sign in</Heading>
          <Text variant="muted" className="text-sm">
            useMutation / useQuery below this point talk to Convex.
          </Text>
        </div>
        <EmailLoginForm onSuccess={noop} />
      </Card>
    </div>
  </ConvexProvider>
);

// The root nesting from app/layout.js: ConvexProvider → AuthProvider → app.
```

### AppRoot

```jsx
() => (
  <ConvexProvider>
    <AuthProvider>
      <div className="w-full max-w-md text-center">
        <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
        <Text variant="muted" className="text-sm mb-8">
          Wingfoil &amp; surf conditions for the Dutch coast
        </Text>
        <EmailLoginForm onSuccess={noop} />
      </div>
    </AuthProvider>
  </ConvexProvider>
)
```
