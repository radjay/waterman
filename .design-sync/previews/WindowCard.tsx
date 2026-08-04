import { WindowCard } from 'waterman';

// One upcoming window, shared by Now and Next so the two lists are identical.
// The score leads as its own column: down a ranked list it is the fastest thing
// to compare.
const HOUR = 3600_000;
const base = Date.UTC(2026, 6, 14, 11, 0);

const slot = (score: number, speed: number, gust: number) => ({
  timestamp: base,
  score,
  speed,
  gust,
  direction: 160,
  waveHeight: 1.2,
  wavePeriod: 9,
  waveDirection: 280,
});

const win = (startHours: number, hours: number, score: number, speed: number, gust: number) => {
  const start = base + startHours * HOUR;
  const peak = { ...slot(score, speed, gust), timestamp: start };
  return { start, end: start + hours * HOUR, peak, score, band: 'good', slots: [peak] };
};

const SPOTS = [
  { _id: 'guincho', name: 'Praia do Guincho' },
  { _id: 'lagoa', name: 'Lagoa da Albufeira' },
  { _id: 'marina', name: 'Marina de Cascais' },
];

const ROWS = [win(1, 6, 92, 18, 24), win(25, 6, 74, 15, 19), win(49, 3, 66, 13, 17)];

// Three across on desktop, one per row on mobile. The first is highlighted
// because it is the one being recommended, not merely the earliest.
export const ThreeUp = () => (
  <div className="grid gap-2 md:grid-cols-3">
    {ROWS.map((window, i) => (
      <WindowCard
        key={SPOTS[i]._id}
        spot={SPOTS[i]}
        window={window}
        sport="wingfoil"
        highlight={i === 0}
      />
    ))}
  </div>
);

// showSpot={false} once the screen already names one spot — repeating it on
// every card says nothing.
export const ScopedToOneSpot = () => (
  <div className="grid gap-2 md:grid-cols-3">
    {ROWS.map((window, i) => (
      <WindowCard
        key={i}
        spot={SPOTS[0]}
        window={window}
        sport="wingfoil"
        showSpot={false}
        highlight={i === 0}
      />
    ))}
  </div>
);

export const Surf = () => (
  <div className="max-w-sm">
    <WindowCard
      spot={{ _id: 'carcavelos', name: 'Carcavelos' }}
      window={{
        ...ROWS[0],
        peak: { ...ROWS[0].peak, waveHeight: 1.6, wavePeriod: 12, speed: 6 },
      }}
      sport="surfing"
      highlight
    />
  </div>
);
