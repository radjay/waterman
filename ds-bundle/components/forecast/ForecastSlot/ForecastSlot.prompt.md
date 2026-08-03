ForecastSlot from waterman. Use via `window.Waterman.ForecastSlot` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

ForecastSlot component displays a single forecast time slot.

Shows wind, wave, and tide data for a specific time. Displays differently
on desktop (row layout) vs mobile (card layout).

@param {Object} slot - Forecast slot data with timestamp, speed, gust, direction, wave data, etc.
@param {Object|null} nearbyTide - Nearby tide information (for surfing spots)
@param {boolean} isSurfing - Whether this is a surfing spot
@param {string} showFilter - Filter mode: "best" (only ideal conditions) or "all" (all conditions)
@param {string} spotName - Name of the spot (for score modal)
@param {string} className - Additional CSS classes

## Props

```ts
interface ForecastSlotProps {
 /** Forecast slot data with timestamp, speed, gust, direction, wave data, etc. */ slot: Record<string, unknown>;  /** Nearby tide information (for surfing spots) */ nearbyTide: Record<string, unknown>|null;  /** Whether this is a surfing spot */ isSurfing?: boolean;  /** Filter mode: "best" (only ideal conditions) or "all" (all conditions) */ showFilter?: string;  /** Name of the spot (for score modal) */ spotName?: string;  /** Additional CSS classes */ className?: string;
}
```

## Examples

### IdealSlot

```jsx
() => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '14:00',
        timestamp: at(14),
        speed: 22.6,
        gust: 28.4,
        direction: 247,
        waveHeight: 1.1,
        wavePeriod: 7,
        waveDirection: 288,
        isIdeal: true,
        score: score(88),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
  </Table>
)
```

### ScoreRange

```jsx
() => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '08:00',
        timestamp: at(8),
        speed: 26.9,
        gust: 34.2,
        direction: 232,
        waveHeight: 1.6,
        wavePeriod: 9,
        waveDirection: 271,
        isIdeal: true,
        isEpic: true,
        score: score(94),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
    <ForecastSlot
      slot={slot({
        hour: '11:00',
        timestamp: at(11),
        speed: 21.3,
        gust: 27.1,
        direction: 247,
        isIdeal: true,
        score: score(79),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
    <ForecastSlot
      slot={slot({
        hour: '14:00',
        timestamp: at(14),
        speed: 17.5,
        gust: 21.9,
        direction: 268,
        waveHeight: 0.7,
        wavePeriod: 5,
        waveDirection: 302,
        score: score(64),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
    <ForecastSlot
      slot={slot({
        hour: '17:00',
        timestamp: at(17),
        speed: 11.2,
        gust: 14.6,
        direction: 314,
        waveHeight: 0.4,
        wavePeriod: 4,
        waveDirection: 330,
        score: score(38),
      })}
      nearbyTide={null}
      spotName="Scheveningen Noord"
    />
  </Table>
)
```

### ShowAllFilter

```jsx
() => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '11:00',
        timestamp: at(11),
        speed: 20.8,
        gust: 26.5,
        direction: 251,
        score: score(71),
      })}
      nearbyTide={null}
      showFilter="all"
      spotName="Zandvoort"
    />
    <ForecastSlot
      slot={slot({
        hour: '14:00',
        timestamp: at(14),
        speed: 23.4,
        gust: 29.8,
        direction: 244,
        waveHeight: 1.2,
        wavePeriod: 7,
        waveDirection: 284,
        isIdeal: true,
        score: score(86),
      })}
      nearbyTide={null}
      showFilter="all"
      spotName="Zandvoort"
    />
    <ForecastSlot
      slot={slot({
        hour: '17:00',
        timestamp: at(17),
        speed: 9.6,
        gust: 12.8,
        direction: 22,
        waveHeight: 0.3,
        wavePeriod: 4,
        waveDirection: 12,
        score: score(41),
      })}
      nearbyTide={null}
      showFilter="all"
      spotName="Zandvoort"
    />
  </Table>
)
```

### SurfingWithTide

```jsx
() => (
  <Table>
    <ForecastSlot
      isSurfing
      slot={slot({
        spotId: 'spot_wijk_aan_zee',
        spotName: 'Wijk aan Zee',
        hour: '08:00',
        timestamp: at(8),
        speed: 8.4,
        gust: 11.2,
        direction: 96,
        waveHeight: 1.4,
        wavePeriod: 9,
        waveDirection: 292,
        sport: 'surfing',
        isIdeal: true,
        score: score(83),
      })}
      nearbyTide={{ type: 'high', time: at(8) + 40 * 60 * 1000, height: 1.9, isExactTime: true }}
      spotName="Wijk aan Zee"
    />
    <ForecastSlot
      isSurfing
      slot={slot({
        spotId: 'spot_wijk_aan_zee',
        spotName: 'Wijk aan Zee',
        hour: '11:00',
        timestamp: at(11),
        speed: 10.1,
        gust: 13.5,
        direction: 112,
        waveHeight: 1.2,
        wavePeriod: 8,
        waveDirection: 288,
        sport: 'surfing',
        score: score(68),
      })}
      nearbyTide={{ isRising: false, isFalling: true, isExactTime: false }}
      spotName="Wijk aan Zee"
    />
    <ForecastSlot
      isSurfing
      slot={slot({
        spotId: 'spot_wijk_aan_zee',
        spotName: 'Wijk aan Zee',
        hour: '14:00',
        timestamp: at(14),
        speed: 12.7,
        gust: 16.4,
        direction: 138,
        waveHeight: 0.9,
        wavePeriod: 7,
        waveDirection: 279,
        sport: 'surfing',
        score: score(57),
      })}
      nearbyTide={{ type: 'low', time: at(14) + 55 * 60 * 1000, height: 0.3, isExactTime: true }}
      spotName="Wijk aan Zee"
    />
  </Table>
)
```

### PersonalisedAndFaded

```jsx
() => (
  <Table>
    <ForecastSlot
      slot={slot({
        hour: '11:00',
        timestamp: at(11),
        speed: 20.2,
        gust: 25.7,
        direction: 249,
        isIdeal: true,
        score: score(81, true),
      })}
      nearbyTide={null}
      spotName="Brouwersdam"
    />
    <ForecastSlot
      slot={slot({
        hour: '20:00',
        timestamp: at(17),
        speed: 18.9,
        gust: 23.1,
        direction: 262,
        waveHeight: 0.8,
        wavePeriod: 6,
        waveDirection: 291,
        isContextual: true,
        score: score(66),
      })}
      nearbyTide={null}
      spotName="Brouwersdam"
    />
  </Table>
)
```
