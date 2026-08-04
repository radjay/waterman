import { TideSection } from 'waterman';

const at = (day: number, hour: number, minute: number) =>
  new Date(2026, 7, day, hour, minute).getTime();

const slot = (
  label: string,
  tideType: string | null,
  time: number | null,
  tideHeight: number | null
) => ({
  label,
  tideType,
  tideTime: time,
  tideHeight,
});

export const FullDay = () => (
  <div className="max-w-[320px]">
    <TideSection
      slots={[
        slot('Early', 'high', at(3, 6, 40), 1.4),
        slot('Midday', 'low', at(3, 12, 55), 0.2),
        slot('Evening', 'high', at(3, 19, 10), 1.5),
        slot('Night', 'low', at(4, 1, 20), 0.3),
      ]}
    />
  </div>
);

export const PartialDay = () => (
  <div className="max-w-[320px]">
    <TideSection
      slots={[
        slot('Morning', null, null, null),
        slot('Afternoon', 'low', at(3, 12, 55), 0.2),
        slot('Evening', 'high', at(3, 19, 10), 1.5),
      ]}
    />
  </div>
);

export const InSpotCard = () => (
  <div className="max-w-[340px] rounded-card border border-ink/15 bg-newsprint p-4 shadow-card">
    <div className="font-headline text-lg font-bold text-ink">Scheveningen Noord</div>
    <div className="font-data text-sm text-faded-ink mb-3">19 kt NW · 0.8 m · 17°C</div>
    <TideSection
      slots={[
        slot('Early', 'high', at(3, 6, 40), 1.4),
        slot('Midday', 'low', at(3, 12, 55), 0.2),
        slot('Evening', 'high', at(3, 19, 10), 1.5),
      ]}
    />
  </div>
);
