import { ForecastComparison } from 'waterman';

const epicSlot = {
  _id: 'fs_scheveningen_1400',
  timestamp: new Date('2026-08-01T14:00:00').getTime(),
  speed: 22,
  gust: 27,
  direction: 135,
  waveHeight: 1.2,
  wavePeriod: 7,
  score: {
    value: 92,
    reasoning:
      'Steady 22 kt NW cross-onshore with only 5 kt of gust spread, and a 1.2 m swell on the mid-tide push — textbook Scheveningen wing conditions.',
  },
};

const idealSlot = {
  _id: 'fs_scheveningen_1600',
  timestamp: new Date('2026-08-01T16:00:00').getTime(),
  speed: 19,
  gust: 24,
  direction: 150,
  waveHeight: 0.9,
  wavePeriod: 6,
  score: {
    value: 81,
    reasoning: 'Wind eases as the sea breeze backs off, still powered on a 5m.',
  },
};

const fadingSlot = {
  _id: 'fs_scheveningen_1800',
  timestamp: new Date('2026-08-01T18:00:00').getTime(),
  speed: 13,
  gust: 18,
  direction: 170,
  waveHeight: 0.6,
  wavePeriod: 5,
  score: {
    value: 54,
    reasoning: 'Dropping under 14 kt — marginal unless you size up to a 6m.',
  },
};

export const Default = () => (
  <div className="max-w-2xl">
    <ForecastComparison forecastSlots={[epicSlot]} sport="wingfoil" />
  </div>
);

export const MultipleSlots = () => (
  <div className="max-w-2xl">
    <ForecastComparison
      forecastSlots={[epicSlot, idealSlot, fadingSlot]}
      sport="wingfoil"
    />
  </div>
);

export const WindOnly = () => (
  <div className="max-w-2xl">
    <ForecastComparison
      forecastSlots={[
        {
          _id: 'fs_brouwersdam_1200',
          timestamp: new Date('2026-07-30T12:00:00').getTime(),
          speed: 24,
          gust: 29,
          direction: 70,
          score: {
            value: 78,
            reasoning: 'Flat-water WSW on the Brouwersdam inside — consistent all session.',
          },
        },
      ]}
      sport="kitesurfing"
    />
  </div>
);

export const NoForecastData = () => (
  <div className="max-w-2xl">
    <ForecastComparison forecastSlots={[]} sport="surfing" />
  </div>
);
