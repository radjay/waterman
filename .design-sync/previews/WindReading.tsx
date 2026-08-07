import { WindReading } from 'waterman';

// The preferred way to print a reading: one big number, the unit and compass
// point sharing its baseline, and the gust tucked just above the unit. No
// direction arrow — the compass label is enough, and an arrow next to a
// cardinal is the same fact twice.
//
// `metric` is exactly what lib/conditions.primaryMetric returns, so a timeslot,
// a station card and the verdict strip all print the same shape.
const wind = {
  value: 21,
  unit: 'kn',
  secondary: '(27*)',
  directionLabel: 'NNW',
};

// md is the timeslot scale: it shares its row with a score dial, and shrinks
// again on phones so the two never collide. Shown in the cell it was sized for
// rather than on its own, where md and lg are a couple of pixels apart.
export const InATimeslot = () => (
  <div className="flex gap-1.5 max-w-[420px]">
    {[
      { time: 'NOW', metric: wind },
      { time: '15:00', metric: { value: 18, unit: 'kn', secondary: '(24*)', directionLabel: 'NNW' } },
    ].map(({ time, metric }) => (
      <div
        key={time}
        className="flex-1 flex flex-col rounded-card-sm border border-card bg-surface px-[18px] py-3 min-w-0"
      >
        <span className="font-data text-[13px] font-bold tracking-label text-faded-ink leading-none">
          {time}
        </span>
        <div className="mt-2.5">
          <WindReading metric={metric} size="md" />
        </div>
      </div>
    ))}
  </div>
);

// lg is the station-card and hero scale — the reading is the only number in
// the block, so it can take the room.
export const AsStationHero = () => (
  <div className="max-w-[420px] rounded-[15px] bg-surface border border-card px-[14px] py-[13px]">
    <div className="font-data text-[10px] tracking-label text-accent mb-[11px]">STATION</div>
    <WindReading metric={wind} size="lg" />
  </div>
);

// The gust is a qualifier, not a second headline: "(27*)" sits above the unit
// row so the eye still lands on 21 first.
export const GustAndSteady = () => (
  <div className="flex items-end gap-10">
    <div>
      <WindReading metric={wind} size="lg" />
      <div className="font-data text-[10px] text-dim mt-2">gusty</div>
    </div>
    <div>
      <WindReading
        metric={{ value: 16, unit: 'kn', secondary: null, directionLabel: 'N' }}
        size="lg"
      />
      <div className="font-data text-[10px] text-dim mt-2">steady — no gust to report</div>
    </div>
  </div>
);

// Surf leads with swell height in metres and carries the wind as a qualifier,
// so the same component prints "1.4 m" with a longer secondary line.
export const Swell = () => (
  <WindReading
    metric={{
      value: 1.4,
      unit: 'm',
      secondary: 'E @ 9 s',
      directionLabel: null,
    }}
    size="lg"
  />
);
