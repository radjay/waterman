CalendarView from waterman. Use via `window.Waterman.CalendarView` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

CalendarView component displays a 7-day calendar showing which days are best
at which spots for each sport.

@param {Object} grouped - Object mapping day strings to spot data
@param {Array} sortedDays - Sorted array of day strings
@param {Object} spotsMap - Map of spotId to spot metadata
@param {Array<string>} selectedSports - All sports (always ["wingfoil", "surfing"] for calendar)
@param {Function} onDayClick - Callback when a day is clicked (deprecated, use onSpotClick instead)
@param {Function} onSpotClick - Callback when a spot/sport combo is clicked (sport, dayStr)

## Props

```ts
interface CalendarViewProps {
 /** Object mapping day strings to spot data */ grouped: Record<string, unknown>;  /** Sorted array of day strings */ sortedDays: unknown[];  /** Map of spotId to spot metadata */ spotsMap: Record<string, unknown>;  /** All sports (always ["wingfoil", "surfing"] for calendar) */ selectedSports: Array<string>;  /** Callback when a day is clicked (deprecated, use onSpotClick instead) */ onDayClick: (...args: any[]) => void;  /** Callback when a spot/sport combo is clicked (sport, dayStr) */ onSpotClick: (...args: any[]) => void;
}
```

## Examples

### NineDayOutlook

```jsx
() => (
  <CalendarView
    grouped={{
      [dayKey(0)]: {
        scheveningen: [wind('wingfoil', 78, '09:00', 22, 27, 90)],
        wijkaanzee: [surf(64, '07:00', 1.1, 8)],
      },
      [dayKey(1)]: {
        brouwersdam: [wind('kitesurfing', 91, '11:00', 25, 31, 45)],
        zandvoort: [wind('wingfoil', 72, '14:00', 19, 24, 135)],
      },
      [dayKey(3)]: {
        ijmuiden: [wind('wingfoil', 66, '10:00', 17, 22, 90)],
      },
      [dayKey(4)]: {
        scheveningen: [surf(81, '06:00', 1.6, 10)],
        zandvoort: [wind('kitesurfing', 69, '13:00', 18, 25, 45)],
      },
      [dayKey(6)]: {
        brouwersdam: [wind('wingfoil', 74, '12:00', 21, 26, 90)],
      },
      [dayKey(7)]: {
        scheveningen: [wind('wingfoil', 63, '15:00', 16, 21, 135)],
        wijkaanzee: [surf(71, '08:00', 1.3, 9)],
      },
    }}
    sortedDays={[dayKey(0), dayKey(1), dayKey(3), dayKey(4), dayKey(6), dayKey(7)]}
    spotsMap={spotsMap}
    selectedSports={sports}
    onDayClick={noop}
    onSpotClick={noop}
  />
)
```

### SwellWindow

```jsx
() => (
  <CalendarView
    grouped={{
      [dayKey(1)]: {
        wijkaanzee: [surf(83, '07:30', 1.8, 11)],
        scheveningen: [surf(76, '08:00', 1.5, 10)],
      },
      [dayKey(2)]: {
        wijkaanzee: [surf(94, '06:45', 2.1, 12)],
        scheveningen: [surf(88, '07:15', 1.9, 11)],
      },
      [dayKey(3)]: {
        wijkaanzee: [surf(69, '09:00', 1.2, 9)],
      },
      [dayKey(5)]: {
        scheveningen: [wind('wingfoil', 67, '13:00', 18, 23, 90)],
      },
    }}
    sortedDays={[dayKey(1), dayKey(2), dayKey(3), dayKey(5)]}
    spotsMap={spotsMap}
    selectedSports={sports}
    onDayClick={noop}
    onSpotClick={noop}
  />
)
```

### QuietSpell

```jsx
() => (
  <CalendarView
    grouped={{
      [dayKey(5)]: {
        brouwersdam: [wind('wingfoil', 62, '14:00', 16, 20, 45)],
      },
    }}
    sortedDays={[dayKey(5)]}
    spotsMap={spotsMap}
    selectedSports={sports}
    onDayClick={noop}
    onSpotClick={noop}
  />
)
```
