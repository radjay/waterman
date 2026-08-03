import { PillToggle, Text } from 'waterman';

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
  <PillToggle name="sport-default" options={SPORTS} value="wingfoil" onChange={noop} />
);

export const Selections = () => (
  <div className="flex flex-col gap-4 items-start">
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">All sports</Text>
      <PillToggle name="sport-all" options={SPORTS} value="" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Wingfoil only</Text>
      <PillToggle name="sport-wing" options={SPORTS} value="wingfoil" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Surfing only</Text>
      <PillToggle name="sport-surf" options={SPORTS} value="surfing" onChange={noop} />
    </div>
  </div>
);

export const TwoOption = () => (
  <div className="flex items-center gap-6">
    <PillToggle name="show-best" options={SHOW} value="best" onChange={noop} />
    <PillToggle name="show-all" options={SHOW} value="all" onChange={noop} />
  </div>
);
