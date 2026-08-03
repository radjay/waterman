import { FilterGroup, PillToggle, Select } from 'waterman';

const noop = () => {};

const SPORTS = [
  { id: '', label: 'All' },
  { id: 'wingfoil', label: 'Wing' },
  { id: 'kitesurfing', label: 'Kite' },
  { id: 'surfing', label: 'Surf' },
];

const SHOW = [
  { id: 'best', label: 'Best' },
  { id: 'all', label: 'All' },
];

export const Default = () => (
  <FilterGroup label="Sport">
    <PillToggle name="fg-sport" options={SPORTS} value="wingfoil" onChange={noop} />
  </FilterGroup>
);

export const Stacked = () => (
  <div className="flex flex-col gap-3 items-start rounded-xl bg-ink/[0.04] px-4 py-3">
    <FilterGroup label="Sport">
      <PillToggle name="fg-stack-sport" options={SPORTS} value="kitesurfing" onChange={noop} />
    </FilterGroup>
    <FilterGroup label="Conditions">
      <PillToggle name="fg-stack-show" options={SHOW} value="best" onChange={noop} />
    </FilterGroup>
  </div>
);

export const Inline = () => (
  <div className="flex flex-wrap items-center gap-4">
    <FilterGroup label="Sport">
      <PillToggle name="fg-inline-sport" options={SPORTS} value="surfing" onChange={noop} />
    </FilterGroup>
    <div className="w-px h-4 bg-ink/20" />
    <FilterGroup label="Show">
      <Select
        options={[
          { id: 'best', label: 'Best times' },
          { id: 'all', label: 'All times' },
        ]}
        value="best"
        onChange={noop}
      />
    </FilterGroup>
  </div>
);
