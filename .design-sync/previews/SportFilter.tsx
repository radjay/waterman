import { SportFilter } from 'waterman';

// Multi-select, used on Cams where a rider may want two sports at once.
// SportFilterChip is the single-select counterpart everywhere else.
const noop = () => {};

export const OneSelected = () => (
  <SportFilter selectedSports={['wingfoil']} onToggle={noop} />
);

export const TwoSelected = () => (
  <SportFilter selectedSports={['wingfoil', 'kitesurfing']} onToggle={noop} />
);

export const AllSelected = () => (
  <SportFilter selectedSports={['wingfoil', 'kitesurfing', 'surfing']} onToggle={noop} />
);
