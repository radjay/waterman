DaySection from waterman. Use via `window.Waterman.DaySection` (bundle loaded from the root `_ds_bundle.js`). Wrap the tree in `<ConvexProvider>` (full provider chain in README.md — components read theme/i18n from that context).

DaySection component displays forecast slots grouped by day and spot.

Groups forecast data by day, then by spot within each day. Shows webcam
and live report links for spots that have them. Handles tide data display
for surfing spots.

@param {string} day - Day label (e.g., "Monday, January 1")
@param {Array} slots - Legacy slots array (deprecated, use spotsData instead)
@param {Object} spotsData - Object mapping spotId to array of forecast slots
@param {Array<string>} selectedSports - Currently selected sports
@param {Object} spotsMap - Map of spotId to spot metadata
@param {string} showFilter - Filter mode: "best" or "all"
@param {boolean} isAuthenticated - Whether the user is authenticated
@param {string} className - Additional CSS classes

## Props

```ts
interface DaySectionProps {
 /** Day label (e.g., "Monday, January 1") */ day: string;  /** Legacy slots array (deprecated, use spotsData instead) */ slots: unknown[];  /** Object mapping spotId to array of forecast slots */ spotsData: Record<string, unknown>;  /** Currently selected sports */ selectedSports: Array<string>;  /** Map of spotId to spot metadata */ spotsMap?: Record<string, unknown>;  /** Filter mode: "best" or "all" */ showFilter?: string; tidesBySpot?: Record<string, unknown>;  /** Additional CSS classes */ className?: string; id?: string; isHighlighted?: boolean;  /** Whether the user is authenticated */ isAuthenticated?: boolean;
}
```

## Examples

### SingleSpot

```jsx
() => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{ spot_scheveningen_noord: scheveningen }}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      isAuthenticated
    />
  </Report>
)
```

### MultipleSpots

```jsx
() => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{
        spot_scheveningen_noord: scheveningen,
        spot_zandvoort: zandvoort,
      }}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      isAuthenticated
    />
  </Report>
)
```

### SurfingWithTides

```jsx
() => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{ spot_wijk_aan_zee: wijkAanZee }}
      selectedSports={['surfing']}
      spotsMap={spotsMap}
      tidesBySpot={tidesBySpot}
      isAuthenticated
    />
  </Report>
)
```

### ShowAllFilter

```jsx
() => (
  <Report>
    <DaySection
      day="Wednesday, May 15"
      slots={[]}
      spotsData={{ spot_zandvoort: zandvoortUnflagged }}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      showFilter="all"
      isAuthenticated
    />
  </Report>
)
```

### HighlightedFromDeepLink

```jsx
() => (
  <Report>
    <DaySection
      id="day-2024-05-15"
      day="Wednesday, May 15"
      slots={scheveningen}
      spotsData={{}}
      selectedSports={['wingfoil']}
      spotsMap={spotsMap}
      isHighlighted
      isAuthenticated
    />
  </Report>
)
```
