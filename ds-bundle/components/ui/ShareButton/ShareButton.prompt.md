ShareButton from waterman. Use via `window.Waterman.ShareButton` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

ShareButton — triggers the Web Share API or copies the URL to clipboard.

Pass `url` to override what is shared (default: window.location.href).
User-specific pages (dashboard, journal, settings) should pass
`url={window.location.origin}` so the share link points to the app
homepage rather than exposing a personal URL.

@param {string} [url] - URL to share (default: current page URL)
@param {string} [title] - Optional title for the Web Share API
@param {string} [className] - Additional CSS classes

## Props

```ts
interface ShareButtonProps {
 /** URL to share (default: current page URL) */ url: string;  /** Optional title for the Web Share API */ title?: string;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### Default

```jsx
() => (
  <ShareButton url="https://waterman.app/report/scheveningen-noord" title="Scheveningen Noord — 19 kt NW" />
)
```

### InSpotHeader

```jsx
() => (
  <div className="w-full max-w-xl flex items-start justify-between gap-4 border-b border-ink/15 pb-4">
    <div className="flex flex-col gap-1">
      <Heading level={2}>Scheveningen Noord</Heading>
      <Text variant="muted">19 kt NW gusting 26 kt · 0.8 m · water 17°C</Text>
    </div>
    <div className="flex items-center gap-3">
      <ScorePill score={87} sport="wingfoil" size="md" />
      <ShareButton url="https://waterman.app/report/scheveningen-noord" title="Scheveningen Noord" />
    </div>
  </div>
)
```

### OnCard

```jsx
() => (
  <div className="max-w-sm">
    <Card variant="elevated">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Text variant="label">Brouwersdam</Text>
          <Text variant="caption">Saturday 07:00 – 09:15 · 2h 15m</Text>
        </div>
        <ShareButton url="https://waterman.app/report/brouwersdam" title="Brouwersdam session" />
      </div>
    </Card>
  </div>
)
```
