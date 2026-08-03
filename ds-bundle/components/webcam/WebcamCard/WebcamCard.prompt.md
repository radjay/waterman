WebcamCard from waterman. Use via `window.Waterman.WebcamCard` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

WebcamCard component that displays a webcam video stream with current conditions.

@param {Object} spot - Webcam spot object
@param {boolean} isFocused - Whether this webcam is in focus/fullscreen
@param {boolean} showHoverButtons - Whether to show live/forecast buttons on hover
@param {boolean} isFavorite - Whether this spot is favorited by the user
@param {Function} onToggleFavorite - Callback when favorite button is clicked

## Props

```ts
interface WebcamCardProps {
 /** Webcam spot object */ spot: Record<string, unknown>;  /** Whether this webcam is in focus/fullscreen */ isFocused?: boolean;  /** Whether to show live/forecast buttons on hover */ showHoverButtons?: boolean;  /** Whether this spot is favorited by the user */ isFavorite?: boolean;  /** Callback when favorite button is clicked */ onToggleFavorite: (...args: any[]) => void; forecastData: unknown; onScoreClick: (...args: any[]) => void;
}
```

## Examples

### WithConditions

```jsx
() => (
  <div className="w-full max-w-md">
    <WebcamCard
      spot={spot('Scheveningen Noord', 'Den Haag')}
      forecastData={{
        timestamp: morning,
        speed: 19,
        gust: 26,
        direction: 135,
        waveHeight: 0.8,
        wavePeriod: 6,
        sport: 'wingfoil',
        score: 87,
      }}
      onScoreClick={noop}
    />
  </div>
)
```

### NameOnly

```jsx
() => (
  <div className="w-full max-w-md">
    <WebcamCard spot={spot('Wijk aan Zee', 'Beverwijk')} />
  </div>
)
```

### Focused

```jsx
() => (
  <div className="w-full max-w-md">
    <WebcamCard
      spot={spot('Brouwersdam', 'Ouddorp')}
      isFocused
      forecastData={{
        timestamp: Date.UTC(2024, 4, 18, 14, 0),
        speed: 24,
        gust: 31,
        direction: 67,
        waveHeight: 0.5,
        wavePeriod: 5,
        sport: 'kitesurfing',
        score: 92,
      }}
      onScoreClick={noop}
    />
  </div>
)
```

### CamWall

```jsx
() => (
  <div className="grid w-full grid-cols-2 gap-4">
    <WebcamCard
      spot={spot('Scheveningen Noord', 'Den Haag')}
      forecastData={{
        timestamp: morning,
        speed: 19,
        gust: 26,
        direction: 135,
        waveHeight: 0.8,
        wavePeriod: 6,
        sport: 'wingfoil',
        score: 87,
      }}
      onScoreClick={noop}
    />
    <WebcamCard
      spot={spot('Zandvoort', 'Zandvoort aan Zee')}
      forecastData={{
        timestamp: morning,
        speed: 12,
        gust: 17,
        direction: 100,
        waveHeight: 0.6,
        wavePeriod: 5,
        sport: 'surfing',
        score: 71,
      }}
      onScoreClick={noop}
    />
    <WebcamCard spot={spot('Ijmuiden', 'Velsen')} />
    <WebcamCard
      spot={spot('Brouwersdam', 'Ouddorp')}
      isFavorite
      onToggleFavorite={noop}
      forecastData={{
        timestamp: Date.UTC(2024, 4, 18, 14, 0),
        speed: 24,
        gust: 31,
        direction: 67,
        waveHeight: 0.5,
        wavePeriod: 5,
        sport: 'kitesurfing',
        score: 92,
      }}
      onScoreClick={noop}
    />
  </div>
)
```
