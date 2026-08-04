import { TideChart } from 'waterman';

// Tide extremes for Scheveningen Noord, expressed as local-time timestamps.
const at = (day: number, hour: number, minute: number) =>
  new Date(2026, 7, day, hour, minute).getTime();

const pad = (n: number) => String(n).padStart(2, '0');
const label = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`;

const extreme = (day: number, hour: number, minute: number, height: number) => ({
  time: at(day, hour, minute),
  height,
  timeStr: label(hour, minute),
  type: height > 0.8 ? 'high' : 'low',
});

export const Today = () => (
  <div className="max-w-[420px]">
    <div className="font-headline text-sm font-bold text-ink mb-1 uppercase">
      Scheveningen Noord — Monday
    </div>
    <TideChart
      tides={[
        extreme(3, 0, 30, 0.3),
        extreme(3, 6, 40, 1.4),
        extreme(3, 12, 55, 0.2),
        extreme(3, 19, 10, 1.5),
      ]}
    />
  </div>
);

export const SingleCycle = () => (
  <div className="max-w-[420px]">
    <TideChart
      tides={[
        extreme(3, 6, 40, 1.4),
        extreme(3, 12, 55, 0.2),
        extreme(3, 19, 10, 1.5),
      ]}
    />
  </div>
);

export const TwoDayOutlook = () => (
  <div className="max-w-[420px]">
    <div className="font-headline text-sm font-bold text-ink mb-1 uppercase">
      Brouwersdam — 48 hours
    </div>
    <TideChart
      tides={[
        extreme(3, 6, 40, 1.4),
        extreme(3, 12, 55, 0.2),
        extreme(3, 19, 10, 1.5),
        extreme(4, 1, 20, 0.3),
        extreme(4, 7, 25, 1.6),
        extreme(4, 13, 40, 0.1),
      ]}
    />
  </div>
);
