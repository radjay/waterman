import { SportSelector, ShowFilter, FilterGroup, Text, Heading, Divider, ScorePill } from 'waterman';

const noop = () => {};

// SportSelector is a controlled select over the three sports the report covers:
// wingfoil ("Wing"), kitesurfing ("Kite"), surfing ("Surf").
export const Default = () => <SportSelector value="wingfoil" onSportsChange={noop} />;

export const EachSport = () => (
  <div className="flex flex-col gap-4 items-start">
    <div className="flex items-center gap-3">
      <SportSelector value="wingfoil" onSportsChange={noop} />
      <Text variant="caption">Scheveningen Noord · 19 kt NW</Text>
    </div>
    <div className="flex items-center gap-3">
      <SportSelector value="kitesurfing" onSportsChange={noop} />
      <Text variant="caption">Wijk aan Zee · 24 kt WSW</Text>
    </div>
    <div className="flex items-center gap-3">
      <SportSelector value="surfing" onSportsChange={noop} />
      <Text variant="caption">Zandvoort · 0.9 m @ 6 s</Text>
    </div>
  </div>
);

export const InFilterRow = () => (
  <div className="w-full max-w-xl flex flex-col gap-3">
    <div className="flex items-end gap-6">
      <FilterGroup label="Sport">
        <SportSelector value="kitesurfing" onSportsChange={noop} />
      </FilterGroup>
      <FilterGroup label="Show">
        <ShowFilter value="best" onFilterChange={noop} />
      </FilterGroup>
    </div>
    <Divider weight="light" />
    <Heading level={3}>Saturday 18 May</Heading>
    <div className="flex items-center justify-between">
      <Text variant="muted">Wijk aan Zee · 11:00 – 13:30 · 24 kt WSW gusting 31 kt</Text>
      <ScorePill score={72} sport="kitesurfing" size="sm" />
    </div>
  </div>
);
