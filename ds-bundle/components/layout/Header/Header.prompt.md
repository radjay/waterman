Header from waterman. Use via `window.Waterman.Header` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

Header — clean sticky header.

Mobile: masthead only (title + date). Nav is handled by BottomNav.
Desktop: masthead (container-width) + full-width nav bar with auth inside.
Collapses on scroll with smooth Framer Motion animation.

A ShareButton is rendered automatically on every page. User-specific routes
(/dashboard, /journal, /settings, /profile) share the app homepage URL;
all other routes share the current page URL.

## Props

```ts
interface HeaderProps {
className?: string;
}
```

## Examples

### Default

```jsx
() => (
  <PageColumn>
    <Header />
  </PageColumn>
)
```

### OnTheReportPage

```jsx
() => (
  <PageColumn>
    <Header />
    <Section title="Saturday 18 May" divided>
      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Scheveningen Noord</Text>
              <Text variant="caption">07:00 – 09:15 · 19 kt NW gusting 26 kt · 0.8 m @ 6 s</Text>
            </div>
            <ScorePill score={87} sport="wingfoil" size="md" />
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Wijk aan Zee</Text>
              <Text variant="caption">11:00 – 13:30 · 24 kt WSW · 1.1 m @ 7 s</Text>
            </div>
            <ScorePill score={72} sport="kitesurfing" size="md" />
          </div>
        </Card>
      </div>
    </Section>
  </PageColumn>
)
```

### AboveTideSummary

```jsx
() => (
  <PageColumn>
    <Header className="mb-2" />
    <div className="flex flex-col gap-3">
      <Heading level={3}>Brouwersdam</Heading>
      <Divider weight="light" />
      <Text variant="muted">High 06:40 · Low 12:55 · High 19:10 · water 17°C</Text>
      <Text variant="body">
        Cross-shore wind over an incoming tide. The sandbar covers around 07:20, which
        cleans up the inside chop for the rest of the window.
      </Text>
    </div>
  </PageColumn>
)
```
