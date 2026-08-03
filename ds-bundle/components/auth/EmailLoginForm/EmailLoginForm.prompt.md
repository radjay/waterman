EmailLoginForm from waterman. Use via `window.Waterman.EmailLoginForm` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface EmailLoginFormProps {
onSuccess: (...args: any[]) => void;
}
```

## Examples

### Default

```jsx
() => (
  <div className="w-full max-w-md">
    <EmailLoginForm onSuccess={noop} />
  </div>
);

// How app/auth/login composes it: centred masthead, muted subtitle, then the form.
```

### LoginPanel

```jsx
() => (
  <div className="w-full max-w-md">
    <div className="text-center mb-8">
      <Heading level={1} className="text-4xl mb-2">Waterman</Heading>
      <Text variant="muted" className="text-sm">
        Sign in to personalize your experience
      </Text>
    </div>
    <EmailLoginForm onSuccess={noop} />
  </div>
);

// On a white card, the way the verify/onboarding surfaces frame auth content.
```

### OnCard

```jsx
() => (
  <div className="w-full max-w-md">
    <Card variant="elevated" className="bg-white p-8">
      <div className="mb-6">
        <Heading level={2} className="text-2xl mb-1">Save your sessions</Heading>
        <Text variant="muted" className="text-sm">
          We&apos;ll email a sign-in link — no password to remember.
        </Text>
      </div>
      <EmailLoginForm onSuccess={noop} />
    </Card>
  </div>
)
```
