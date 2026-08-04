import { TideDisplay } from 'waterman';

const at = (hour: number, minute: number) =>
  new Date(2026, 7, 3, hour, minute).getTime();

const pad = (n: number) => String(n).padStart(2, '0');

const exact = (type: 'high' | 'low', hour: number, minute: number, height: number) => ({
  type,
  time: at(hour, minute),
  height,
  timeStr: `${pad(hour)}:${pad(minute)}`,
  isExactTime: true,
  isRising: false,
  isFalling: false,
});

export const ExactTides = () => (
  <div className="flex flex-wrap items-center gap-6">
    <TideDisplay tide={exact('high', 6, 40, 1.4)} />
    <TideDisplay tide={exact('low', 12, 55, 0.2)} />
    <TideDisplay tide={exact('high', 19, 10, 1.5)} />
  </div>
);

export const Trends = () => (
  <div className="flex flex-wrap items-center gap-6">
    <TideDisplay tide={{ isExactTime: false, isRising: true, isFalling: false }} />
    <TideDisplay tide={{ isExactTime: false, isRising: false, isFalling: true }} />
    <TideDisplay tide={{ isExactTime: false, isRising: false, isFalling: false }} />
  </div>
);

export const InSlotRows = () => (
  <div className="max-w-[380px] divide-y divide-ink/15 border border-ink/15 rounded-card bg-newsprint">
    {[
      { slot: 'Morning', wind: '19 kt NW', tide: exact('high', 6, 40, 1.4) },
      {
        slot: 'Midday',
        wind: '22 kt WNW',
        tide: { isExactTime: false, isRising: false, isFalling: true },
      },
      { slot: 'Afternoon', wind: '24 kt WSW', tide: exact('low', 12, 55, 0.2) },
      {
        slot: 'Evening',
        wind: '17 kt W',
        tide: { isExactTime: false, isRising: true, isFalling: false },
      },
    ].map((row) => (
      <div key={row.slot} className="flex items-center justify-between gap-4 px-3 py-2">
        <span className="font-body text-sm text-ink">{row.slot}</span>
        <span className="font-data text-sm text-faded-ink">{row.wind}</span>
        <TideDisplay tide={row.tide} />
      </div>
    ))}
  </div>
);
