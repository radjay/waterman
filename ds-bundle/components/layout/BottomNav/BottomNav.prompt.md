BottomNav from waterman. Use via `window.Waterman.BottomNav` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

BottomNav — floating pill-shaped bottom tab bar for mobile.
Matches the desktop ViewToggle pill aesthetic.
Hidden on md+ (desktop uses ViewToggle in the header).

## Examples

### Default

```jsx
() => (
  <PhoneStage height={560}>
    <div className="px-4 pt-4">
      <Section title="Coming up">
        <div className="flex flex-col gap-3">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Text variant="label">Scheveningen Noord</Text>
                <Text variant="caption">Saturday 07:00 – 09:15 · 19 kt NW</Text>
              </div>
              <ScorePill score={87} sport="wingfoil" size="sm" />
            </div>
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Text variant="label">Wijk aan Zee</Text>
                <Text variant="caption">Saturday 11:00 – 13:30 · 24 kt WSW</Text>
              </div>
              <ScorePill score={72} sport="kitesurfing" size="sm" />
            </div>
          </Card>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Text variant="label">Brouwersdam</Text>
                <Text variant="caption">Sunday 06:40 – 08:20 · 0.8 m @ 6 s</Text>
              </div>
              <ScorePill score={64} sport="surfing" size="sm" />
            </div>
          </Card>
        </div>
      </Section>
    </div>
    <BottomNav />
  </PhoneStage>
)
```

### OverScrolledContent

```jsx
() => (
  <PhoneStage height={250}>
    <div className="px-4 pt-3 flex flex-col gap-2">
      <Heading level={3}>Sunday 19 May</Heading>
      <Text variant="muted">Ijmuiden · 21 kt SW · 1.1 m @ 7 s</Text>
      <Text variant="muted">Zandvoort · 18 kt WNW · 0.9 m @ 6 s</Text>
      <Text variant="muted">Brouwersdam · 16 kt W · 0.6 m @ 5 s</Text>
    </div>
    <BottomNav />
  </PhoneStage>
)
```
