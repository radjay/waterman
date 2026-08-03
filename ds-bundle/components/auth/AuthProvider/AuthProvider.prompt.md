AuthProvider from waterman. Use via `window.Waterman.AuthProvider` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface AuthProviderProps {
children?: React.ReactNode;
}
```

## Examples

### SignInSurface

```jsx
() => (
  <AuthProvider>
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
        <Text variant="muted" className="text-sm">
          Sign in to personalize your experience
        </Text>
      </div>
      <EmailLoginForm onSuccess={noop} />
    </div>
  </AuthProvider>
);

// Consumers call useAuth() for `login`, `logout`, `user` and `isAuthenticated`.
// MagicLinkSent is one of them — it calls login(sessionToken) after the code
// check — and it only works inside this provider.
```

### AroundAConsumer

```jsx
() => (
  <AuthProvider>
    <div className="w-full max-w-md">
      <Card variant="elevated" className="bg-white p-8">
        <MagicLinkSent email="jeroen@example.com" onBack={noop} />
      </Card>
      <Text variant="caption" className="block text-center mt-4">
        useAuth() → login · logout · user · isAuthenticated
      </Text>
    </div>
  </AuthProvider>
)
```
