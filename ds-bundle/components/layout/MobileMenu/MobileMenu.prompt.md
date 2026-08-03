MobileMenu from waterman. Use via `window.Waterman.MobileMenu` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

## Props

```ts
interface MobileMenuProps {
isOpen: boolean; onOpenChange: (...args: any[]) => void;
}
```

## Examples

### Open

```jsx
() => (
  <Stage width={390} height={620}>
    <div className="px-4 pt-4 flex flex-col gap-3">
      <Heading level={3}>Coming up</Heading>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Text variant="label">Scheveningen Noord</Text>
            <Text variant="caption">07:00 – 09:15 · 19 kt NW</Text>
          </div>
          <ScorePill score={87} sport="wingfoil" size="sm" />
        </div>
      </Card>
    </div>
    <MobileMenu isOpen onOpenChange={noop} />
  </Stage>
)
```

### OverReportList

```jsx
() => (
  <Stage width={620} height={600}>
    <div className="px-6 pt-5 flex flex-col gap-2">
      <Heading level={3}>Saturday 18 May</Heading>
      <Text variant="muted">Scheveningen Noord · 19 kt NW gusting 26 kt · 0.8 m @ 6 s</Text>
      <Text variant="muted">Wijk aan Zee · 24 kt WSW · 1.1 m @ 7 s</Text>
      <Text variant="muted">Ijmuiden · 21 kt SW · High 06:40 · Low 12:55</Text>
    </div>
    <MobileMenu isOpen onOpenChange={noop} />
  </Stage>
)
```
