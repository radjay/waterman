Footer from waterman. Use via `window.Waterman.Footer` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface FooterProps {
className?: string; mostRecentScrapeTimestamp: unknown;
}
```

## Examples

### PageFooter

```jsx
() => (
  <div className="w-full max-w-2xl">
    <Section title="Scheveningen Noord">
      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Saturday 07:00 – 09:15</Text>
              <Text variant="caption">19 kt NW gusting 26 kt · 0.8 m @ 6 s · water 17°C</Text>
            </div>
            <ScorePill score={87} sport="wingfoil" size="md" />
          </div>
        </Card>
      </div>
    </Section>
    <Footer mostRecentScrapeTimestamp={minutesAgo(12)} />
  </div>
)
```

### JustUpdated

```jsx
() => (
  <div className="w-full max-w-2xl">
    <div className="flex flex-col gap-1">
      <Heading level={3}>Live wind</Heading>
      <Text variant="muted">Wijk aan Zee · 24 kt WSW gusting 31 kt</Text>
    </div>
    <Footer mostRecentScrapeTimestamp={minutesAgo(0.4)} />
  </div>
)
```

### StaleForecast

```jsx
() => (
  <div className="w-full max-w-2xl">
    <div className="flex flex-col gap-1">
      <Heading level={3}>Brouwersdam</Heading>
      <Text variant="muted">Last scrape ran before the morning model update.</Text>
    </div>
    <Footer mostRecentScrapeTimestamp={hoursAgo(5)} />
  </div>
)
```

### WithoutTimestamp

```jsx
() => (
  <div className="w-full max-w-2xl">
    <div className="flex flex-col gap-1">
      <Heading level={3}>Ijmuiden</Heading>
      <Text variant="muted">No scrape recorded yet — the footer keeps the page rule only.</Text>
    </div>
    <Footer />
  </div>
)
```
