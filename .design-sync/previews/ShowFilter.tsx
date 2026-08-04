import { ShowFilter, FilterGroup, Text, Heading, Divider } from 'waterman';

const noop = () => {};

// ShowFilter is a controlled two-option select ("best" | "all") that drives how
// many forecast slots a day section renders.
export const BestTimes = () => <ShowFilter value="best" onFilterChange={noop} />;

export const Options = () => (
  <div className="flex flex-col gap-4 items-start">
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Only slots scoring 60 and above</Text>
      <ShowFilter value="best" onFilterChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Every three-hour slot in the window</Text>
      <ShowFilter value="all" onFilterChange={noop} />
    </div>
  </div>
);

export const InFilterRow = () => (
  <div className="w-full max-w-xl flex flex-col gap-3">
    <div className="flex items-end gap-6">
      <FilterGroup label="Show">
        <ShowFilter value="best" onFilterChange={noop} />
      </FilterGroup>
    </div>
    <Divider weight="light" />
    <Heading level={3}>Saturday 18 May</Heading>
    <Text variant="muted">Scheveningen Noord · 07:00 – 09:15 · 19 kt NW gusting 26 kt</Text>
    <Text variant="muted">Wijk aan Zee · 11:00 – 13:30 · 24 kt WSW · 1.1 m @ 7 s</Text>
  </div>
);
