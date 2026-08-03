import { Select, Text } from 'waterman';

const noop = () => {};

const SHOW_OPTIONS = [
  { id: 'best', label: 'Best times' },
  { id: 'all', label: 'All times' },
];

const SPOT_OPTIONS = [
  { id: 'scheveningen-noord', label: 'Scheveningen Noord' },
  { id: 'zandvoort', label: 'Zandvoort' },
  { id: 'wijk-aan-zee', label: 'Wijk aan Zee' },
  { id: 'brouwersdam', label: 'Brouwersdam' },
  { id: 'ijmuiden', label: 'Ijmuiden' },
];

export const Default = () => (
  <Select options={SHOW_OPTIONS} value="best" onChange={noop} />
);

export const Selections = () => (
  <div className="flex flex-col gap-4 items-start">
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Showing best times</Text>
      <Select options={SHOW_OPTIONS} value="best" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5 items-start">
      <Text variant="caption">Showing all times</Text>
      <Select options={SHOW_OPTIONS} value="all" onChange={noop} />
    </div>
  </div>
);

export const SpotPicker = () => (
  <div className="flex items-center gap-3">
    <Text variant="label">Spot</Text>
    <Select options={SPOT_OPTIONS} value="wijk-aan-zee" onChange={noop} />
  </div>
);
