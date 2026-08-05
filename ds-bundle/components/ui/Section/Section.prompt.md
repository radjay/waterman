Section from waterman. Use via `window.Waterman.Section` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Section component - section wrapper with optional title, action, and divider.

@param {string} title - Section heading text
@param {React.ReactNode} action - Action element (e.g. "See All" button)
@param {React.ReactNode} children
@param {boolean} divided - Show divider above section
@param {string} className - Additional CSS classes

## Props

```ts
interface SectionProps {
 /** Section heading text */ title?: string;  /** Action element (e.g. "See All" button) */ action: React.ReactNode; children?: React.ReactNode;  /** Show divider above section */ divided?: boolean;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### WithTitle

```jsx
() => (
  <div className="max-w-lg">
    <Section title="Coming up">
      <Text variant="muted">The next three days that score above your threshold.</Text>
    </Section>
  </div>
)
```

### WithAction

```jsx
() => (
  <div className="max-w-lg">
    <Section title="Session journal" action={<Button variant="ghost" size="sm">See all</Button>}>
      <Card>
        <Text variant="body">2h 15m at Scheveningen Noord</Text>
      </Card>
    </Section>
  </div>
)
```

### Divided

```jsx
() => (
  <div className="max-w-lg">
    <Section title="Tide" divided>
      <Text variant="muted">High 06:40 · Low 12:55 · High 19:10</Text>
    </Section>
  </div>
)
```
