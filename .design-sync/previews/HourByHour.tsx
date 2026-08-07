import { HourByHour } from 'waterman';

// A window's shape, as actual numbers. "Do I believe it" is partly a question
// about shape: one that holds for three hours is a different proposition from
// one that spikes for one and collapses.
const HOUR = 3600_000;
const base = Date.UTC(2026, 6, 14, 11, 0);

const slot = (h: number, score: number, speed: number, gust: number) => ({
  timestamp: base + h * HOUR,
  score,
  speed,
  gust,
  direction: 160,
  waveHeight: 1.2,
  wavePeriod: 9,
  waveDirection: 280,
});

// `peakTimestamp` marks the hour the window was scored on, so the row that
// earned the headline score is the one called out rather than left for the
// reader to find by comparing bars.
export const Wind = () => (
  <div className="max-w-md">
    <HourByHour
      slots={[slot(0, 88, 18, 24), slot(3, 92, 21, 27), slot(6, 84, 19, 23)]}
      sport="wingfoil"
      peakTimestamp={base + 3 * HOUR}
    />
  </div>
);

// Tide turns inside a slot's three hours are called out: for surf they change
// the answer, and for wing they explain a spot going soft without the wind
// doing anything.
export const WithTideTurns = () => (
  <div className="max-w-md">
    <HourByHour
      slots={[slot(0, 74, 6, 9), slot(3, 81, 5, 8), slot(6, 69, 8, 12)]}
      sport="surfing"
      tides={[
        { time: base + 1.5 * HOUR, type: 'high' },
        { time: base + 7 * HOUR, type: 'low' },
      ]}
    />
  </div>
);

// An unscored slot says "not scored" rather than drawing an empty bar — the
// scorer skips hours outside daylight, and that is not a zero.
export const PartiallyScored = () => (
  <div className="max-w-md">
    <HourByHour
      slots={[
        slot(0, 88, 18, 24),
        { ...slot(3, 0, 20, 26), score: null },
        slot(6, 84, 19, 23),
      ]}
      sport="wingfoil"
    />
  </div>
);
