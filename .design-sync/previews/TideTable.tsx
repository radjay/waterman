import { TideTable } from 'waterman';

const at = (day: number, hour: number, minute: number) =>
  new Date(2026, 7, day, hour, minute).getTime();

const pad = (n: number) => String(n).padStart(2, '0');

const row = (
  day: number,
  hour: number,
  minute: number,
  type: 'high' | 'low',
  height: number | null
) => ({
  time: at(day, hour, minute),
  type,
  height,
  timeStr: `${pad(hour)}:${pad(minute)}`,
});

export const DayTides = () => (
  <div className="max-w-[360px]">
    <TideTable
      spotName="Scheveningen Noord"
      tides={[
        row(3, 6, 40, 'high', 1.4),
        row(3, 12, 55, 'low', 0.2),
        row(3, 19, 10, 'high', 1.5),
        row(4, 1, 20, 'low', 0.3),
      ]}
    />
  </div>
);

export const TwoDays = () => (
  <div className="max-w-[360px]">
    <TideTable
      spotName="Brouwersdam"
      tides={[
        row(3, 6, 40, 'high', 1.4),
        row(3, 12, 55, 'low', 0.2),
        row(3, 19, 10, 'high', 1.5),
        row(4, 1, 20, 'low', 0.3),
        row(4, 7, 25, 'high', 1.6),
        row(4, 13, 40, 'low', 0.1),
        row(4, 19, 55, 'high', 1.5),
      ]}
    />
  </div>
);

export const MissingHeights = () => (
  <div className="max-w-[360px]">
    <TideTable
      spotName="Wijk aan Zee"
      tides={[
        row(3, 7, 5, 'high', 1.3),
        row(3, 13, 20, 'low', null),
        row(3, 19, 35, 'high', 1.4),
        row(4, 1, 45, 'low', null),
      ]}
    />
  </div>
);

export const SideBySide = () => (
  <div className="flex flex-wrap gap-6">
    <div className="w-[300px]">
      <TideTable
        spotName="Zandvoort"
        tides={[
          row(3, 6, 50, 'high', 1.4),
          row(3, 13, 5, 'low', 0.2),
          row(3, 19, 20, 'high', 1.5),
        ]}
      />
    </div>
    <div className="w-[300px]">
      <TideTable
        spotName="Ijmuiden"
        tides={[
          row(3, 6, 15, 'high', 1.5),
          row(3, 12, 30, 'low', 0.2),
          row(3, 18, 45, 'high', 1.6),
        ]}
      />
    </div>
  </div>
);
